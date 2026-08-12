/**
 * EXPERIMENTO — tirar a arma e o escudo do corpo, preservando o personagem.
 *
 * 🔴 A PERGUNTA QUE ELE RESPONDE, e ela vale ~100 geracoes: o sistema de arma
 * em CAMADA (corpo sem arma + arma desenhada por cima) so existe se houver um
 * corpo sem arma. Ha dois caminhos para consegui-lo, e eles tem custos muito
 * diferentes:
 *
 *   A. `inpaint` mascarando a arma e pedindo o braco vazio. Preserva a
 *      IDENTIDADE do personagem — a armadura, as cores, o elmo, tudo que ja foi
 *      aprovado. 1 geracao por direcao.
 *   B. gerar um Knight novo do zero com uma descricao sem arma. Custa a
 *      identidade: volta outro sujeito, e o pack inteiro (golpe, morte, passo)
 *      teria de nascer de novo em cima dele.
 *
 * Este script testa o A no SUL, que e a direcao de referencia. Se o braco sair
 * limpo, o layering e barato; se sair um toco ou uma arma fantasma, o caminho e
 * o B e o orcamento muda de ordem de grandeza.
 *
 * ⚠️ Escreve em `arte-fonte/pixellab/_experimento/`, NUNCA por cima do pack.
 *
 * Uso:  node tools/pixellab/desarmar.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const API = 'https://api.pixellab.ai/v1';
const TOKEN = process.env.PIXELLAB_TOKEN;
if (!TOKEN) throw new Error('PIXELLAB_TOKEN nao esta no ambiente. Carregue do .env no MESMO comando.');

const CELL = 64;

/**
 * As duas bandas a apagar, medidas na silhueta do Knight ao sul:
 *
 *   espada — lamina diagonal, de x=18/y=34 ate x=7/y=50
 *   escudo — bloco de x 33..46, descendo ate y~57 (a ponta afunilada do kite)
 *
 * ⚠️ Elas param em x=32 e comecam em x=33 para NAO tocar o corpo: o tronco vive
 * em x 23..40, e abrir o tronco e o beco nº 7 — volta outro personagem.
 */
const BANDA_ESPADA = [0, 22, 0, 58];
const BANDA_ESCUDO = [33, 63, 0, 58];

async function call(endpoint, body) {
  const r = await fetch(`${API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${endpoint} ${r.status}: ${txt.slice(0, 300)}`);
  return JSON.parse(txt);
}

const paraB64 = (buf) => ({ type: 'base64', base64: buf.toString('base64') });
const daB64 = (s) => Buffer.from(String(s).replace(/^data:image\/\w+;base64,/, ''), 'base64');

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

function encode(w, h, px, canais) {
  const s = w * canais; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = canais === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function mascara(bandas) {
  const m = Buffer.alloc(CELL * CELL * 3); // preto = preservar
  for (const [x0, x1, y0, y1] of bandas) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const o = (y * CELL + x) * 3; m[o] = m[o + 1] = m[o + 2] = 255; // branco = redesenhar
    }
  }
  return encode(CELL, CELL, m, 3);
}

const dir = join('arte-fonte', 'pixellab', '_experimento');
mkdirSync(dir, { recursive: true });
const base = readFileSync(join('arte-fonte', 'pixellab', 'knight', 'south.png'));

const COMUM = {
  image_size: { width: CELL, height: CELL },
  view: 'high top-down',
  no_background: true,
  outline: 'single color black outline',
  detail: 'medium detail',
};

/**
 * As duas tentativas, e elas testam hipoteses DIFERENTES:
 *
 *  1. `ambos` — apaga espada e escudo de uma vez. E o que o layering quer.
 *  2. `so-escudo` — apaga so o escudo. Se a 1 falhar e a 2 der certo, o caminho
 *     e apagar uma coisa de cada vez, e o custo dobra mas o plano sobrevive.
 */
const TENTATIVAS = [
  {
    nome: 'ambos',
    bandas: [BANDA_ESPADA, BANDA_ESCUDO],
    desc: 'knight in polished steel plate armor with a blue tabard and gold trim, closed helmet with visor, both arms empty at his sides, bare gauntleted hands, no weapon, no shield, full body, standing',
  },
  {
    nome: 'so-escudo',
    bandas: [BANDA_ESCUDO],
    desc: 'knight in polished steel plate armor with a blue tabard and gold trim, closed helmet with visor, right arm empty at his side, bare gauntleted hand, no shield, full body, standing',
  },
];

for (const t of TENTATIVAS) {
  console.log(`  desarmar (${t.nome})...`);
  const r = await call('inpaint', {
    ...COMUM,
    description: t.desc,
    // 🔴 O negativo carrega o peso aqui: e o unico lugar que diz o que NAO voltar.
    negative_description: 'sword, shield, weapon, blade, axe, staff, held object',
    inpainting_image: paraB64(base),
    mask_image: paraB64(mascara(t.bandas)),
    color_image: paraB64(base),   // trava a paleta, como no passo e no golpe
    direction: 'south',
    text_guidance_scale: 7,
    seed: 11,
  });
  writeFileSync(join(dir, `knight-south-${t.nome}.png`), daB64(r.image.base64));
}
console.log(`  ok — ${dir}`);
