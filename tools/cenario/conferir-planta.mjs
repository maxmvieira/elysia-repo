/**
 * Desenha a planta em TEXTO por cima da IMAGEM da planta, para conferir.
 *
 * Uso:  node tools/cenario/conferir-planta.mjs <planta.png> <saida.png> <linha> <linha> ...
 *
 * 🔴 **Existe porque planta escrita a olho ERRA, e o erro não aparece até
 * jogar.** Em 14/08 eu escrevi as duas plantas contando quadradinhos na imagem.
 * Em tela: o dono atravessava móvel, atravessava porta, e a escada ficou
 * **murada** — eu tinha posto parede sem vão numa coluna inteira, e metade da
 * casa virou inalcançável. Nada disso apareceu no typecheck nem nos testes.
 *
 * ⚠️ Tentei primeiro DERIVAR a planta da imagem por cor
 * (`planta-para-texto.mjs`), e ela não fecha sozinha: assoalho de tábua tem
 * veio forte, então o desvio dentro da célula estoura e chão de verdade sai
 * como sólido; e cor não distingue **tapete** (que se pisa) de **mesa** (que
 * não se pisa). O caminho que converge é escrever à mão e OLHAR o resultado
 * sobreposto — o erro salta.
 *
 * Verde = andável. Vermelho = sólido. Azul = porta. Amarelo = escada.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

function decode(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0, tp = 6; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); tp = d[9]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  const bpp = tp === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const st = w * bpp; const L = Buffer.alloc(h * st); let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + st); q += st;
    const cur = L.subarray(y * st, (y + 1) * st);
    const prev = y > 0 ? L.subarray((y - 1) * st, y * st) : null;
    for (let x = 0; x < st; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
  }
  const px = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    px[p * 4] = L[p * bpp]; px[p * 4 + 1] = L[p * bpp + 1];
    px[p * 4 + 2] = L[p * bpp + 2]; px[p * 4 + 3] = bpp === 4 ? L[p * bpp + 3] : 255;
  }
  return { w, h, px };
}
function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const [entrada, saida, ...planta] = process.argv.slice(2);
if (!entrada || !saida || !planta.length) {
  console.error('uso: node tools/cenario/conferir-planta.mjs <planta.png> <saida.png> <linha> ...');
  process.exit(1);
}
const { w, h, px } = decode(entrada);
const N = planta[0].length, M = planta.length;
const cw = w / N, ch = h / M;

const TINTA = {
  '.': [90, 230, 110],
  '#': [235, 70, 70],
  'F': [235, 70, 70],
  'e': [90, 160, 255],
  '>': [255, 215, 60],
  '<': [255, 215, 60],
};

for (let cy = 0; cy < M; cy++) {
  for (let cx = 0; cx < N; cx++) {
    const c = planta[cy][cx];
    const t = TINTA[c] ?? [200, 200, 200];
    const x0 = Math.round(cx * cw), x1 = Math.round((cx + 1) * cw);
    const y0 = Math.round(cy * ch), y1 = Math.round((cy + 1) * ch);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const borda = x < x0 + 2 || x >= x1 - 2 || y < y0 + 2 || y >= y1 - 2;
      const f = borda ? 0.75 : 0.28; // moldura forte, miolo translúcido
      for (let k = 0; k < 3; k++) px[i + k] = Math.round(px[i + k] * (1 - f) + t[k] * f);
      px[i + 3] = 255;
    }
  }
}
writeFileSync(saida, encode(w, h, px));
console.log(`grade ${N}x${M} sobreposta em ${saida}`);
console.log('verde=andável  vermelho=sólido  azul=porta  amarelo=escada');
