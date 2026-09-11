/**
 * PNG cru em RGBA, sem dependência: o par decode/encode que os conversores da
 * HUD usam.
 *
 * ⚠️ Mora aqui porque são DOIS conversores agora — `icones2png.mjs`, que corta
 * as folhas do dono, e `magias2png.mjs`, que prepara o pacote de ícones de
 * magia. Duas cópias do mesmo codec é o jeito de uma delas ganhar um conserto
 * que a outra não recebe.
 */

import { inflateSync, deflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
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

function decode(path) {
  const buf = readFileSync(path);
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
  /*
   * 🔴 **RGB (colorType 2) também entra, e sai daqui como RGBA opaco.**
   *
   * Era só RGBA, e a folha vertical do Meteoro (13/09) chegou sem canal alfa —
   * fundo preto chapado, que é como as ferramentas de arte exportam quando o
   * efeito foi desenhado para soma aditiva. Converter o arquivo à mão antes de
   * cortar seria um passo manual a cada folha nova; aceitar os dois formatos
   * aqui resolve para todos os cortadores de uma vez.
   *
   * ⚠️ **O filtro do PNG anda em BYTES DO PIXEL, não em bytes fixos**: em RGBA o
   * vizinho à esquerda está 4 bytes atrás, em RGB são 3. Usar 4 nos dois embaralha
   * a imagem inteira sem erro nenhum.
   */
  if (ct !== 6 && ct !== 2) {
    throw new Error(`${path}: esperado RGBA ou RGB, veio colorType ${ct}`);
  }
  const canais = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * canais;
  const linhas = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = linhas.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? linhas.subarray((y - 1) * stride, y * stride) : null;
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
  if (canais === 4) return { w, h, px: linhas };
  // RGB: alfa cheio em todo pixel — o recorte é problema de quem chamou.
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < linhas.length; i += 3, j += 4) {
    px[j] = linhas[i];
    px[j + 1] = linhas[i + 1];
    px[j + 2] = linhas[i + 2];
    px[j + 3] = 255;
  }
  return { w, h, px };
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

export { decode, encode };
