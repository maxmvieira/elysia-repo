/**
 * Gerador de arte de classe pelo PixelLab.
 *
 * Produz, para uma classe, o pack cru que o `frames2strip.mjs` consome:
 * as 4 direcoes paradas e o ciclo de caminhada de 2 quadros por direcao.
 *
 * 🔴 A RECEITA AQUI SAIU DE 14 GERACOES DE TENTATIVA (2026-08-10). Cada opcao
 * abaixo esta no lugar por causa de um erro observado — ver
 * `docs/PIXELLAB-RECEITA.md` antes de "simplificar" qualquer uma.
 *
 * Uso:
 *   PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs knight
 *
 * ⚠️ O token NUNCA entra no repositorio. Ele vem do ambiente, e so.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const TOKEN = process.env.PIXELLAB_TOKEN;
if (!TOKEN) {
  console.error('Faltou PIXELLAB_TOKEN. Pegue em https://www.pixellab.ai/account (campo "Secret").');
  process.exit(1);
}

const BASE_URL = 'https://api.pixellab.ai/v1';
const CELL = 64;                       // 🔴 fixo: `animate-with-text` so aceita 64
const DIRS = ['south', 'north', 'east', 'west'];

/**
 * O texto de cada classe. Sai dos `blurb` de `shared/src/stats.ts` e das cores
 * de `client/src/miniworld.ts` — identidade que o jogo ja usa.
 */
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
 * Faixa da mascara de pernas, por classe: [x0, x1, y0, y1] na celula de 64.
 *
 * 🔴 O x1 para ANTES do escudo/arma de propósito. Mascarar a faixa inteira faz
 * o modelo redesenhar o escudo e perder o emblema — foi exatamente o que
 * derrubou a tentativa por esqueleto.
 */
const MASCARA_PERNAS = {
  knight: [14, 32, 44, 63],
  sorcerer: [18, 44, 46, 63],
  archer: [18, 44, 44, 63],
  assassin: [18, 44, 44, 63],
};

// ---------------------------------------------------------------------------

async function call(endpoint, body) {
  const r = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${endpoint} ${r.status}: ${txt.slice(0, 300)}`);
  return JSON.parse(txt);
}

const b64 = (buf) => ({ type: 'base64', base64: buf.toString('base64') });
const daB64 = (s) => Buffer.from(String(s).replace(/^data:image\/\w+;base64,/, ''), 'base64');

// --- PNG: encoder RGB minimo, so para a mascara ----------------------------
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };
function encRGB(w, h, px) {
  const s = w * 3; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function mascara([x0, x1, y0, y1]) {
  const m = Buffer.alloc(CELL * CELL * 3); // preto = preservar
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = (y * CELL + x) * 3; m[o] = m[o + 1] = m[o + 2] = 255; // branco = redesenhar
  }
  return encRGB(CELL, CELL, m);
}

// ---------------------------------------------------------------------------

async function gera(cls) {
  const desc = CLASSES[cls];
  if (!desc) throw new Error(`Classe desconhecida: ${cls}. Conhecidas: ${Object.keys(CLASSES).join(', ')}`);
  const dir = join('arte-fonte', 'pixellab', cls);
  mkdirSync(dir, { recursive: true });

  const comum = {
    image_size: { width: CELL, height: CELL },
    view: 'high top-down',          // 🔴 o angulo do jogo. 'side' nao assenta em mapa top-down
    no_background: true,            // fundo transparente de verdade (o ChatGPT nao da isso)
    outline: 'single color black outline',
    detail: 'medium detail',
  };

  // 1. A pose SUL, que vira a referencia de todas as outras.
  console.log(`  ${cls}: pose sul...`);
  const sulResp = await call('generate-image-pixflux', { ...comum, description: desc, direction: 'south', seed: 1 });
  const sul = daB64(sulResp.image.base64);
  writeFileSync(join(dir, 'south.png'), sul);

  // 2. As outras tres direcoes.
  //
  // 🔴 pixflux com `direction` + init_image, NAO o endpoint /rotate: o /rotate
  // duplicou a cabeca em leste e oeste nas duas tentativas.
  const poses = { south: sul };
  for (const d of DIRS.slice(1)) {
    console.log(`  ${cls}: pose ${d}...`);
    const r = await call('generate-image-pixflux', {
      ...comum, description: desc, direction: d,
      init_image: b64(sul), init_image_strength: 120, seed: 1,
    });
    poses[d] = daB64(r.image.base64);
    writeFileSync(join(dir, `${d}.png`), poses[d]);
  }

  // 3. O segundo quadro da caminhada, por INPAINT so na faixa das pernas.
  //
  // 🔴 Caminhada de 2 quadros e decisao, nao limitacao aceita de bracos
  // cruzados: `animate-with-skeleton` anima as pernas mas REGENERA o corpo, e
  // perdeu o escudo do Knight em toda tentativa. O que esta fora da mascara nao
  // pode ser perdido. Tibia classico tambem anda com 2 quadros.
  const msk = mascara(MASCARA_PERNAS[cls] ?? MASCARA_PERNAS.knight);
  for (const d of DIRS) {
    console.log(`  ${cls}: passo ${d}...`);
    const r = await call('inpaint', {
      ...comum,
      description: `${desc.split(',')[0]} legs mid-stride, one leg stepping forward`,
      negative_description: 'shield, weapon, extra limbs',
      inpainting_image: b64(poses[d]),
      mask_image: b64(msk),
      color_image: b64(poses[d]),     // 🔴 trava a paleta: sem isso ela pula de ~70 para ~1500 cores
      direction: d,
      text_guidance_scale: 6,
      seed: 21,
    });
    writeFileSync(join(dir, `${d}-passo.png`), daB64(r.image.base64));
  }

  console.log(`  ${cls}: pronto em ${dir}/ (8 arquivos, 8 geracoes)`);
}

const alvo = process.argv[2];
const alvos = alvo ? [alvo] : Object.keys(CLASSES);
for (const c of alvos) await gera(c);
