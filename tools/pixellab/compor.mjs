/**
 * Compõe corpo + camadas de equipamento, e escreve o resultado.
 *
 * 🔴 É a prova de que a arma em camada funciona: corpo desarmado + espada +
 * escudo tem que devolver algo que se pareça com o sprite armado original. Se
 * parecer, o jogo pode desenhar QUALQUER arma sobre QUALQUER corpo, e as 20
 * combinações classe×arma deixam de exigir 20 folhas.
 *
 * ⚠️ A ordem importa e é por direção: de costas (`north`) o que o personagem
 * segura fica ATRÁS dele, então o corpo é desenhado por último. De frente e de
 * perfil, o equipamento vem por cima.
 *
 * Uso:  node tools/pixellab/compor.mjs <saida.png> <corpo.png> <camada.png>...
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

function decode(path) {
  const buf = readFileSync(path);
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

function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const [saida, ...camadas] = process.argv.slice(2);
const imgs = camadas.map(decode);
const { w, h } = imgs[0];
const out = Buffer.alloc(w * h * 4);

// "over" simples: pixel opaco da camada de cima substitui o de baixo. A arte e
// pixel art com alpha binario (o `no_background` da geracao garante), entao nao
// ha meio-tom para misturar — e mistura inventaria cor que nao esta na paleta.
for (const im of imgs) {
  for (let i = 0; i < w * h; i++) {
    if (im.px[i * 4 + 3] > 0) im.px.copy(out, i * 4, i * 4, i * 4 + 4);
  }
}
writeFileSync(saida, encode(w, h, out));
