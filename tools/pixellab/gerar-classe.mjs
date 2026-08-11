/**
 * Gerador de arte de classe pelo PixelLab.
 *
 * Produz, por classe, as 4 direcoes paradas e o 2o quadro da caminhada:
 *
 *   arte-fonte/pixellab/<classe>/{south,north,east,west}.png
 *   arte-fonte/pixellab/<classe>/{south,north,east,west}-passo.png
 *
 * 🔴 CADA OPCAO AQUI ESTA NO LUGAR POR CAUSA DE UM ERRO OBSERVADO. Sao 20
 * geracoes de tentativa (2026-08-10), documentadas em `docs/PIXELLAB-RECEITA.md`.
 * Leia antes de "simplificar" qualquer parametro.
 *
 * Custo: 6 geracoes por classe (oeste e ESPELHADO, nao gerado).
 *
 * Uso:
 *   PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs          # as 4
 *   PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs knight   # uma
 *
 * ⚠️ O token NUNCA entra no repositorio: vem do ambiente, e so.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const TOKEN = process.env.PIXELLAB_TOKEN;
if (!TOKEN) {
  console.error('Faltou PIXELLAB_TOKEN. Pegue em pixellab.ai/account, campo "Secret".');
  process.exit(1);
}

const API = 'https://api.pixellab.ai/v1';

/** 🔴 Fixo em 64: `animate-with-text` declara min E max iguais a 64. */
const CELL = 64;

/** Descricoes: saem dos `blurb` de `shared/src/stats.ts` e das cores de `miniworld.ts`. */
const CLASSES = {
  knight:
    'knight in polished steel plate armor with a blue tabard and gold trim, ' +
    'closed helmet with visor, holding a longsword in the right hand and a large ' +
    'blue kite shield with a golden lion emblem in the left hand, full body, standing',
  sorcerer:
    'sorcerer in long flowing purple robes with gold trim and a wide hood, ' +
    'holding a tall wooden staff topped with a glowing violet crystal, ' +
    'slender frame, no armor, full body, standing',
  archer:
    'ranger in light green and brown leather armor with a hooded short cloak ' +
    'and a quiver of arrows on the back, holding a curved longbow in the left hand, ' +
    'lean athletic frame, full body, standing',
  assassin:
    'hooded assassin in dark crimson and black leather with cloth-wrapped forearms ' +
    'and a short torn cape, holding a dagger in each hand in a reverse grip, ' +
    'lean crouched frame, full body, standing',
};

/**
 * Faixa redesenhada no passo: [x0, x1, y0, y1] na celula de 64.
 *
 * 🔴 Ela comeca em y=50, ABAIXO de onde qualquer escudo, capa ou cajado chega.
 * Nao e folga: mascarar mais alto devolve o escudo a regiao redesenhada e ele se
 * perde — foi exatamente assim que a tentativa por esqueleto morreu. O que esta
 * fora da mascara NAO PODE ser perdido, e e essa garantia que faz o metodo valer.
 *
 * O preco e um passo curto, de pe e canela. Tibia classico anda assim.
 */
const FAIXA_PERNAS = [12, 52, 50, 63];

// ---------------------------------------------------------------------------

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

// --- PNG minimo: decodifica RGBA, codifica RGBA e RGB ----------------------
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
  let off = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  const canais = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * canais; const px = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= canais ? cur[x - canais] : 0, b = prev ? prev[x] : 0;
      const c = x >= canais && prev ? prev[x - canais] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px, canais };
}

/** Espelha horizontalmente. E como o OESTE nasce do LESTE, sem gastar geracao. */
function espelha(buf) {
  const img = decode(buf);
  const out = Buffer.alloc(img.px.length);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const de = (y * img.w + x) * img.canais;
    const para = (y * img.w + (img.w - 1 - x)) * img.canais;
    img.px.copy(out, para, de, de + img.canais);
  }
  return encode(img.w, img.h, out, img.canais);
}

function mascara([x0, x1, y0, y1]) {
  const m = Buffer.alloc(CELL * CELL * 3); // preto = preservar
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = (y * CELL + x) * 3; m[o] = m[o + 1] = m[o + 2] = 255; // branco = redesenhar
  }
  return encode(CELL, CELL, m, 3);
}

// ---------------------------------------------------------------------------

const COMUM = {
  image_size: { width: CELL, height: CELL },
  view: 'high top-down',              // 🔴 o angulo do jogo; 'side' nao assenta em mapa top-down
  no_background: true,                // transparencia de verdade
  outline: 'single color black outline',
  detail: 'medium detail',
};

async function gera(cls) {
  const desc = CLASSES[cls];
  if (!desc) throw new Error(`Classe desconhecida: ${cls}. Conhecidas: ${Object.keys(CLASSES).join(', ')}`);
  const dir = join('arte-fonte', 'pixellab', cls);
  mkdirSync(dir, { recursive: true });
  const poses = {};

  // 1. SUL — a referencia de todas as outras.
  console.log(`  ${cls}: sul...`);
  poses.south = daB64((await call('generate-image-pixflux', {
    ...COMUM, description: desc, direction: 'south', seed: 1,
  })).image.base64);

  // 2. NORTE e LESTE — pelo /rotate.
  //
  // 🔴 `generate-image-pixflux` com `direction` NAO VIRA O PERSONAGEM. O campo e
  // documentado como "weakly guiding" e na pratica e ignorado: pedir `north` com
  // ou sem init_image devolve o mesmo sujeito de frente, com o escudo a mostra.
  // Foi o erro que fez a primeira versao deste gerador entregar quatro poses
  // bonitas e UMA direcao so. O /rotate e o unico que vira de verdade.
  //
  // ⚠️ Os numeros sao por tentativa: no leste, guidance 7.5 e o `direction_change:
  // 90` saem com A CABECA DUPLICADA (dois elmos). guidance 5 com seed 5 sai limpo.
  const giros = { north: { g: 7.5, s: 1 }, east: { g: 5, s: 5 } };
  for (const [d, { g, s }] of Object.entries(giros)) {
    console.log(`  ${cls}: ${d}...`);
    poses[d] = daB64((await call('rotate', {
      image_size: { width: CELL, height: CELL },
      from_image: paraB64(poses.south),
      from_direction: 'south', to_direction: d,
      from_view: 'high top-down', to_view: 'high top-down',
      image_guidance_scale: g, seed: s,
    })).image.base64);
  }

  // 3. OESTE = espelho do LESTE. Nao gasta geracao, e garante simetria.
  //    A `SPEC-SPRITES-CLASSES.md` ja autoriza entregar 3 linhas e espelhar.
  poses.west = espelha(poses.east);

  for (const [d, buf] of Object.entries(poses)) writeFileSync(join(dir, `${d}.png`), buf);

  // 4. O PASSO, por inpaint na faixa das pernas. Oeste espelha o leste de novo.
  const msk = mascara(FAIXA_PERNAS);
  for (const d of ['south', 'north', 'east']) {
    console.log(`  ${cls}: passo ${d}...`);
    const r = await call('inpaint', {
      ...COMUM,
      description: `${desc.split(',')[0]}, legs mid-stride, one foot stepping forward`,
      negative_description: 'shield, weapon, extra limbs',
      inpainting_image: paraB64(poses[d]),
      mask_image: paraB64(msk),
      // 🔴 trava a paleta. Sem isto ela pula de ~70 para ~1500 cores.
      color_image: paraB64(poses[d]),
      direction: d,
      text_guidance_scale: 6,
      seed: 21,
    });
    const passo = daB64(r.image.base64);
    writeFileSync(join(dir, `${d}-passo.png`), passo);
    if (d === 'east') writeFileSync(join(dir, 'west-passo.png'), espelha(passo));
  }

  console.log(`  ${cls}: ok — 8 arquivos, 6 geracoes`);
}

const alvo = process.argv[2];
for (const c of alvo ? [alvo] : Object.keys(CLASSES)) await gera(c);
