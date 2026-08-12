/**
 * DESARMA o corpo: tira a arma e o escudo, preservando o personagem.
 *
 * 🔴 É a peça-zero do sistema de arma em CAMADA (corpo sem arma + arma
 * desenhada por cima). Sem um corpo desarmado, "trocar de arma aparece
 * andando" e "escudo só se equipado" não existem — a arma está pintada no
 * sprite, e é por isso que hoje o Knight faz o mesmo gesto com qualquer arma.
 *
 * Dos dois caminhos possíveis, este é o barato:
 *
 *   A. `inpaint` apagando a arma do pack que JÁ existe — preserva a identidade
 *      (armadura, elmo, cores), então golpe/morte/passo não precisam renascer.
 *   B. gerar um personagem novo, sem arma, por texto — custa a identidade.
 *
 * O A está provado no sul do Knight em 2026-08-12.
 *
 * ⚠️ Escreve em `arte-fonte/pixellab/_desarmado/<classe>/`, NUNCA por cima do
 * pack. A troca é decisão do dono, como foi a do pack PixelLab.
 *
 * Uso:  node tools/pixellab/desarmar.mjs knight [seed]
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const API = 'https://api.pixellab.ai/v1';
const TOKEN = process.env.PIXELLAB_TOKEN;
if (!TOKEN) throw new Error('PIXELLAB_TOKEN nao esta no ambiente. Carregue do .env no MESMO comando.');

const CELL = 64;

/**
 * As bandas a apagar, POR DIREÇÃO, medidas na silhueta do Knight.
 *
 * 🔴 **Os dois lados abrem JUNTOS, e isso não é preferência.** Mascarar só o
 * escudo devolveu uma GARRA DISFORME no lugar dele (testado, 1 geração). O
 * modelo precisa de contexto simétrico para entender que os dois braços estão
 * vazios; com um lado só, ele inventa um objeto para preencher.
 *
 * ⚠️ O miolo preservado é o TRONCO, e ele não pode entrar na máscara — abrir o
 * tronco é o beco nº 7, e volta outro personagem.
 *
 * Medido: no SUL a espada é a lâmina diagonal em x 7..22 e o escudo o bloco
 * x 33..46 descendo até y≈57. No LESTE, espada 14..19 e escudo 41..53. O NORTE
 * é a vista de costas: os dois trocam de lado, então é o espelho do sul.
 */
const BANDAS = {
  south: [[0, 22, 0, 58], [33, 63, 0, 58]],  // preserva x 23..32
  north: [[0, 30, 0, 58], [41, 63, 0, 58]],  // preserva x 31..40 (espelho do sul)
  east:  [[0, 22, 0, 58], [39, 63, 0, 58]],  // preserva x 23..38
};

/**
 * A descrição do corpo desarmado, por classe.
 *
 * ⚠️ **A arma NUNCA é citada aqui, nem para negá-la.** Foi o beco nº 1: citar a
 * arma no texto é o que fez o Knight criar ASAS. Quem diz o que não voltar é o
 * `negative_description`, e mesmo ele não basta sozinho — ver o aviso da `seed`.
 */
const CORPOS = {
  knight:
    'knight in polished steel plate armor with a blue tabard and gold trim, ' +
    'closed helmet with visor, both arms hanging empty at his sides, ' +
    'open gauntleted hands, full body, standing',
  sorcerer:
    'sorcerer in long flowing purple robes with gold trim and a wide hood, ' +
    'both arms hanging empty at his sides, open hands, ' +
    'slender frame, no armor, full body, standing',
  archer:
    'ranger in light green and brown leather armor with a hooded short cloak, ' +
    'both arms hanging empty at his sides, open hands, ' +
    'lean athletic frame, full body, standing',
  assassin:
    'hooded assassin in dark crimson and black leather with cloth-wrapped forearms ' +
    'and a short torn cape, both arms hanging empty at his sides, open hands, ' +
    'lean crouched frame, full body, standing',
};

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

function decode(buf) {
  let off = 8, w = 0, h = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4; const px = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0, b = prev ? prev[x] : 0;
      const c = x >= 4 && prev ? prev[x - 4] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px };
}

/** Espelha em x. O oeste sai do leste de graça, e sai simétrico por construção. */
function espelha(buf) {
  const im = decode(buf);
  const out = Buffer.alloc(im.px.length);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    im.px.copy(out, (y * im.w + (im.w - 1 - x)) * 4, (y * im.w + x) * 4, (y * im.w + x) * 4 + 4);
  }
  return encode(im.w, im.h, out, 4);
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

const COMUM = {
  image_size: { width: CELL, height: CELL },
  view: 'high top-down',
  no_background: true,
  outline: 'single color black outline',
  detail: 'medium detail',
};

const cls = process.argv[2] || 'knight';
const seed = Number(process.argv[3] || 11);
const desc = CORPOS[cls];
if (!desc) throw new Error(`Classe desconhecida: ${cls}. Conhecidas: ${Object.keys(CORPOS).join(', ')}`);

const src = join('arte-fonte', 'pixellab', cls);
const out = join('arte-fonte', 'pixellab', '_desarmado', cls);
mkdirSync(out, { recursive: true });

/**
 * ⚠️ `SO_DIRECOES=south,north` refaz só as direções pedidas.
 *
 * Existe pela mesma razão do `SO_DIRECOES` do gerador: o desarme é **por
 * tentativa**, e sai limpo em umas direções e sujo em outras na mesma `seed`.
 * Sem isto, consertar uma direção regeraria as boas junto, trocando arte
 * aprovada por outra tirada no dado.
 */
const GERADAS = ['south', 'north', 'east'];
const alvo = process.env.SO_DIRECOES
  ? process.env.SO_DIRECOES.split(',').map((d) => d.trim()).filter(Boolean)
  : GERADAS;
for (const d of alvo) {
  if (!GERADAS.includes(d)) throw new Error(`SO_DIRECOES=${d} invalido. Aceita: ${GERADAS.join(', ')} (o oeste espelha o leste).`);
  console.log(`  ${cls}: desarmando ${d} (seed ${seed})...`);
  const base = readFileSync(join(src, `${d}.png`));
  const r = await call('inpaint', {
    ...COMUM,
    description: desc,
    // 🔴 O negativo é o único lugar que diz o que NÃO deve voltar. Ele sozinho
    // não basta — a espada volta em algumas seeds, e a saída é trocar a seed.
    negative_description: 'sword, shield, weapon, blade, axe, staff, spear, held object, buckler',
    inpainting_image: paraB64(base),
    mask_image: paraB64(mascara(BANDAS[d])),
    color_image: paraB64(base),   // trava a paleta, como no passo e no golpe
    direction: d,
    text_guidance_scale: 7,
    seed,
  });
  const png = daB64(r.image.base64);
  writeFileSync(join(out, `${d}.png`), png);
  if (d === 'east') writeFileSync(join(out, 'west.png'), espelha(png));
}
console.log(`  ${cls}: desarmado em ${out}/ (4 direcoes, o oeste espelhado)`);
