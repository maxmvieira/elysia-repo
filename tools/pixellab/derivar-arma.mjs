/**
 * Deriva armas novas a partir da ESPADA extraída, encurtando ou alongando a
 * lâmina em torno do ponto de empunhadura.
 *
 * 🔴 **Por que derivar em vez de desenhar ou gerar.** A espada recortada do pack
 * traz três coisas que são caras de acertar do zero e que uma arma nova precisa
 * ter iguais: a **paleta** (o mesmo aço, o mesmo contorno preto, o mesmo ouro),
 * o **ângulo** em que a arma sai da mão, e a **posição** em relação ao corpo.
 * Uma adaga é uma espada curta — derivá-la herda as três de graça e não depende
 * de sorte de `seed` nem de eu acertar pixel art no escuro.
 *
 * ⚠️ **O que ele NÃO sabe fazer:** machado, maça e cajado, porque neles a ponta
 * é um objeto diferente (cabeça de machado, bola, cristal) e não uma lâmina mais
 * curta. Esses precisam de arte de verdade. Este arquivo cobre a família da
 * lâmina — adaga, espada de duas mãos — e é honesto sobre o resto.
 *
 * O corte é por DISTÂNCIA ao punho, não por linha: a lâmina sai na diagonal, e
 * cortar por `y` deixaria um talho reto atravessado. Distância acompanha o
 * ângulo sozinha, em qualquer direção, sem número afinado à mão por direção.
 *
 * Uso:  node tools/pixellab/derivar-arma.mjs knight
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const CELL = 64;

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

const opaco = (px, x, y) => x >= 0 && y >= 0 && x < CELL && y < CELL && px[(y * CELL + x) * 4 + 3] > 0;

/**
 * O PUNHO: o pixel mais distante da ponta.
 *
 * 🔴 Achado por medição, não por número escrito à mão. A arma é um objeto
 * alongado; seus dois extremos são o punho e a ponta. O punho é o que fica
 * perto da MÃO, e a mão fica perto do corpo — então, dos dois extremos, o punho
 * é o que está mais ao alto (a arma pende para baixo em toda direção do pack).
 * Assim o mesmo código acha o punho no sul, no norte e no perfil.
 */
function punhoDe(px) {
  let melhor = null;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    if (opaco(px, x, y) && (!melhor || y < melhor.y)) melhor = { x, y };
  }
  return melhor;
}

/**
 * Encurta a arma para uma fração do comprimento, afinando a ponta.
 *
 * ⚠️ O afinamento existe porque cortar por distância deixa a lâmina com a
 * largura cheia até o fim — um toco, não uma ponta. As duas últimas camadas
 * perdem os pixels de borda, o que devolve o bico.
 */
function encurta(px, fracao) {
  const punho = punhoDe(px);
  let maxD = 0;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    if (!opaco(px, x, y)) continue;
    const d = Math.hypot(x - punho.x, y - punho.y);
    if (d > maxD) maxD = d;
  }
  const corte = maxD * fracao;

  const out = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    if (!opaco(px, x, y)) continue;
    if (Math.hypot(x - punho.x, y - punho.y) <= corte) {
      const o = (y * CELL + x) * 4;
      px.copy(out, o, o, o + 4);
    }
  }

  // afina: nas duas ultimas camadas, pixel com menos de 3 vizinhos sai
  for (let camada = 0; camada < 2; camada++) {
    const antes = Buffer.from(out);
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
      const o = (y * CELL + x) * 4;
      if (antes[o + 3] === 0) continue;
      if (Math.hypot(x - punho.x, y - punho.y) < corte - 2) continue;
      let viz = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (opaco(antes, x + dx, y + dy)) viz++;
      if (viz < 3) out.writeUInt32BE(0, o);
    }
  }
  return out;
}

/**
 * O que dá para derivar da lâmina, e o que não dá.
 *
 * ⚠️ `espada2m` é a MESMA lâmina: o que separa uma espada de duas mãos de uma
 * de uma mão, neste tamanho, é o punho e a postura — e a postura é do CORPO
 * (`grip.ts`), não da arma. Derivar uma lâmina 15% maior seria fingir precisão
 * que 64 px não têm. Fica como cópia declarada, para o slot existir.
 */
const DERIVADAS = [
  { nome: 'adaga', de: 'espada', fracao: 0.42 },
  { nome: 'espada2m', de: 'espada', fracao: 1.0 },
];

const cls = process.argv[2] || 'knight';
const dir = join('arte-fonte', 'pixellab', '_armas', cls);
mkdirSync(dir, { recursive: true });

for (const d of ['south', 'north', 'east', 'west']) {
  for (const { nome, de, fracao } of DERIVADAS) {
    const src = decode(join(dir, `${de}-${d}.png`));
    const px = fracao >= 1 ? src.px : encurta(src.px, fracao);
    let n = 0;
    for (let i = 0; i < CELL * CELL; i++) if (px[i * 4 + 3] > 0) n++;
    writeFileSync(join(dir, `${nome}-${d}.png`), encode(CELL, CELL, px));
    console.log(`  ${nome.padEnd(9)} ${d.padEnd(6)} ${n} px`);
  }
}
console.log(`\n  derivadas em ${dir}/`);
