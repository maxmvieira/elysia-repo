/**
 * Prepara os RETRATOS DE CLASSE da tela de criação de personagem.
 *
 * 🔴 **O que entra tem fundo, e o cartão precisa de recorte.** Os retratos que
 * o dono gera vêm em 1254 × 1254 com fundo — às vezes cinza chapado **sem canal
 * alfa** (`colorType 2`), às vezes já em RGBA. Colados como estão, cada cartão
 * da tela de criação viraria um quadrado cinza com um bonequinho no meio.
 *
 * 🔴 **O fundo sai por PREENCHIMENTO A PARTIR DA BORDA, não por "apague o
 * cinza".** O personagem tem CABELO PRATEADO, quase da cor do fundo: uma regra
 * por cor comeria a cabeça dele. O alagamento só alcança o que está ligado à
 * moldura, então o cinza preso entre as mechas continua lá.
 *
 * ⚠️ A tolerância é folgada (32 por canal) de propósito: o fundo tem gradiente
 * suave e ruído de compressão. Apertar deixa uma auréola de pixels claros em
 * volta do contorno, que na tela lê como serrilhado sujo.
 *
 * ⚠️ **A redução final é do ffmpeg** (`flags=lanczos`), como em todo o resto do
 * pipeline de arte deste projeto.
 *
 * ## Uso
 *
 *   node tools/retratos2card.mjs [pasta-de-origem]
 *
 * Sai em `client/public/assets/retratos/<sexo>/<classe>.png`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

/** Altura do retrato pronto. O cartão usa 48 px e o HUD 32 — sobra para as duas. */
const ALTURA = 256;
/** Folga em volta do conteúdo, em px da imagem original. */
const FOLGA = 8;
/** Distância máxima por canal para um pixel ainda contar como fundo. */
const TOLERANCIA = 32;

const ORIGEM = resolve(process.argv[2] ?? 'C:/Users/ADMIN/Desktop/spritesheet');
const DESTINO = resolve('client/public/assets/retratos');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

/**
 * Nome do arquivo → classe do jogo.
 *
 * 🔴 **A âncora é o nome INTEIRO, de lista fechada.** Os arquivos vêm em
 * português e no feminino (`MAGA`, `CAVALEIRA KNIGHT`), e "casar por continha"
 * confundiria `ARQUEIRA` com `ASSASSINA` na primeira letra ou `DRUIDA` com
 * `MAGA` no sufixo. É a mesma regra que os packs CraftPix ensinaram em 01/09.
 */
const CLASSE_DO_ARQUIVO = {
  'ARQUEIRA.png': 'archer',
  'ASSASSINA.png': 'assassin',
  'CAVALEIRA KNIGHT.png': 'knight',
  'DRUIDA.png': 'druid',
  'MAGA.png': 'sorcerer',
  'ARQUEIRO.png': 'archer',
  'ASSASSINO.png': 'assassin',
  'ASSASSIN.png': 'assassin',
  'CAVALEIRO KNIGHT.png': 'knight',
  'KNIGHT.png': 'knight',
  'DRUIDA MASCULINO.png': 'druid',
  'DRUID.png': 'druid',
  'MAGO.png': 'sorcerer',
};

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (ty, d) => {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b));
  return Buffer.concat([l, b, c]);
};

/** Decodifica para RGBA, aceitando cinza, RGB, paleta e RGBA. */
function decode(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0, ct = 0, bd = 0, plte = null, trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
    else if (t === 'PLTE') plte = d;
    else if (t === 'tRNS') trns = d;
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  if (bd !== 8) throw new Error(`${path}: bitDepth ${bd} não suportado`);
  const canais = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * canais;
  const bruto = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const line = raw.subarray(q, q + stride); q += stride;
    const cur = bruto.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? bruto.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= canais ? cur[x - canais] : 0, b = prev ? prev[x] : 0;
      const c = x >= canais && prev ? prev[x - canais] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, a = 255;
    if (ct === 6) { r = bruto[i * 4]; g = bruto[i * 4 + 1]; b = bruto[i * 4 + 2]; a = bruto[i * 4 + 3]; }
    else if (ct === 2) { r = bruto[i * 3]; g = bruto[i * 3 + 1]; b = bruto[i * 3 + 2]; }
    else if (ct === 3) {
      const idx = bruto[i];
      r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2];
      a = trns ? (trns[idx] ?? 255) : 255;
    } else if (ct === 4) { r = g = b = bruto[i * 2]; a = bruto[i * 2 + 1]; }
    else { r = g = b = bruto[i]; }
    px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = a;
  }
  return { w, h, px, ct };
}

function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (s + 1)] = 0;
    px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s);
  }
  const i = Buffer.alloc(13);
  i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', i),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

/**
 * Apaga o fundo por alagamento a partir da borda.
 *
 * 🔴 A cor de referência sai dos QUATRO CANTOS, pela mediana de cada canal —
 * um canto sozinho pode cair em cima de um detalhe que encoste na moldura.
 */
function tiraFundo(img) {
  const { w, h, px } = img;
  const cantos = [0, w - 1, (h - 1) * w, h * w - 1];
  const canal = (k) => {
    const v = cantos.map((i) => px[i * 4 + k]).sort((a, b) => a - b);
    return (v[1] + v[2]) / 2;
  };
  const fundo = [canal(0), canal(1), canal(2)];

  const parecido = (i) =>
    Math.abs(px[i * 4] - fundo[0]) <= TOLERANCIA &&
    Math.abs(px[i * 4 + 1] - fundo[1]) <= TOLERANCIA &&
    Math.abs(px[i * 4 + 2] - fundo[2]) <= TOLERANCIA;

  const visto = new Uint8Array(w * h);
  const fila = [];
  for (let x = 0; x < w; x++) { fila.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { fila.push(y * w, y * w + w - 1); }

  let apagados = 0;
  while (fila.length) {
    const i = fila.pop();
    if (visto[i]) continue;
    visto[i] = 1;
    // Já transparente conta como fundo e continua espalhando.
    if (px[i * 4 + 3] > 8 && !parecido(i)) continue;
    if (px[i * 4 + 3] !== 0) { px[i * 4 + 3] = 0; apagados++; }
    const x = i % w, y = (i - x) / w;
    if (x > 0) fila.push(i - 1);
    if (x < w - 1) fila.push(i + 1);
    if (y > 0) fila.push(i - w);
    if (y < h - 1) fila.push(i + w);
  }
  return { fundo, apagados };
}

/** Caixa do que sobrou, com folga. */
function caixa(img) {
  const { w, h, px } = img;
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('nada sobrou depois de tirar o fundo');
  return {
    x0: Math.max(0, x0 - FOLGA), y0: Math.max(0, y0 - FOLGA),
    x1: Math.min(w - 1, x1 + FOLGA), y1: Math.min(h - 1, y1 + FOLGA),
  };
}

function recorta(img, c) {
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const de = ((c.y0 + y) * img.w + c.x0) * 4;
    img.px.copy(out, y * w * 4, de, de + w * 4);
  }
  return { w, h, px: out };
}

// ---------------------------------------------------------------------------

if (!existsSync(ORIGEM)) { console.error(`\n[retratos] origem não existe: ${ORIGEM}\n`); process.exit(1); }

let feitos = 0, pulos = 0;
for (const sexo of ['male', 'female']) {
  const dir = join(ORIGEM, sexo);
  if (!existsSync(dir)) { console.warn(`[retratos] sem ${sexo}/`); continue; }
  const saidaDir = join(DESTINO, sexo);

  for (const arquivo of readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'))) {
    const cls = CLASSE_DO_ARQUIVO[arquivo];
    if (!cls) continue; // folhas de animação e afins moram na mesma pasta
    const img = decode(join(dir, arquivo));
    const { fundo, apagados } = tiraFundo(img);
    const c = caixa(img);
    const cortado = recorta(img, c);

    mkdirSync(saidaDir, { recursive: true });
    const temp = join(saidaDir, `_${cls}.tmp.png`);
    writeFileSync(temp, encode(cortado.w, cortado.h, cortado.px));

    const larguraFinal = Math.max(2, Math.round((cortado.w / cortado.h) * ALTURA / 2) * 2);
    const saida = join(saidaDir, `${cls}.png`);
    const r = spawnSync(
      FFMPEG,
      ['-y', '-loglevel', 'error', '-i', temp,
        '-vf', `scale=${larguraFinal}:${ALTURA}:flags=lanczos`,
        '-pix_fmt', 'rgba', saida],
      { encoding: 'utf8' },
    );
    rmSync(temp, { force: true });
    if (r.status !== 0) {
      console.error(`[retratos] ✗ ${arquivo}\n${r.stderr ?? ''}`);
      pulos++;
      continue;
    }
    console.log(
      `[retratos] ✓ ${sexo}/${cls.padEnd(9)} ${img.w}x${img.h} ct=${img.ct} ` +
        `fundo rgb(${fundo.join(',')}) · ${((100 * apagados) / (img.w * img.h)).toFixed(0)}% apagado ` +
        `→ recorte ${cortado.w}x${cortado.h} → ${larguraFinal}x${ALTURA}`,
    );
    feitos++;
  }
}

console.log(`\n[retratos] ${feitos} retrato(s) em ${DESTINO}${pulos ? `, ${pulos} falha(s)` : ''}`);
if (pulos) process.exit(1);
