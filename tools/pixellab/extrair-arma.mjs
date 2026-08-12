/**
 * Extrai ESPADA e ESCUDO do Knight, comparando o pack armado com o desarmado.
 *
 * 🔴 **A arma que o jogo precisa já está desenhada — só está grudada no corpo.**
 * `knight/south.png` tem espada e escudo; `_desarmado/knight/south.png` não tem.
 * O que existe num e não no outro é, por definição, o equipamento. Extrair sai
 * de graça, no estilo exato do resto, e já na posição certa em relação ao corpo.
 *
 * ⚠️ **O critério é ALPHA, não diferença de cor.** O desarme regenerou o corpo,
 * então comparar cor acusaria o tronco inteiro como "mudou". Já "opaco no
 * armado E transparente no desarmado" só pode ser coisa que o corpo não ocupa —
 * e é exatamente a silhueta do equipamento.
 *
 * ⚠️ **O preço, e ele é honesto:** a parte da arma que ficava POR CIMA do corpo
 * se perde, porque ali o desarmado também é opaco. Num escudo, que cobre o
 * peito, isso é bastante. O recorte serve como peça de partida, não como arte
 * final — e o que sai é medido no fim para o tamanho do buraco ficar registrado.
 *
 * A separação espada/escudo é por LADO, usando as mesmas bandas do desarme: no
 * Knight a espada mora à esquerda da tela e o escudo à direita (o norte é a
 * vista de costas, e lá os dois trocam).
 *
 * Uso:  node tools/pixellab/extrair-arma.mjs knight
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const CELL = 64;

/** Onde cada peça mora, por direção. Espelha no norte, que é a vista de costas. */
const LADOS = {
  south: { espada: [0, 31], escudo: [32, 63] },
  east:  { espada: [0, 31], escudo: [32, 63] },
  west:  { espada: [32, 63], escudo: [0, 31] },
  north: { espada: [32, 63], escudo: [0, 31] },
};

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

/**
 * Tira o que sobra numa faixa de x: opaco no armado, transparente no desarmado.
 *
 * ⚠️ Descarta ilha de 1–2 px solta: o contorno preto do corpo se desloca um
 * pouco quando o modelo redesenha, e sem isto vem uma poeira de pixels de borda
 * junto com a arma.
 */
function recorta(armado, desarmado, [x0, x1]) {
  const out = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++) for (let x = x0; x <= x1; x++) {
    const o = (y * CELL + x) * 4;
    if (armado.px[o + 3] > 0 && desarmado.px[o + 3] === 0) {
      armado.px.copy(out, o, o, o + 4);
    }
  }
  /**
   * CRESCE para dentro do corpo, e é isto que recupera o miolo do escudo.
   *
   * 🔴 O teste de alpha sozinho deixa o escudo OCO: onde ele cobre o peito, o
   * desarmado também é opaco, e o pixel é descartado. Mas ali quem está à vista
   * no armado é o ESCUDO — ele está na frente do corpo. O pixel é bom; o que
   * faltava era um critério para reconhecê-lo.
   *
   * O critério: partindo do aro (que o alpha já garantiu ser equipamento),
   * cresce para vizinhos que **discordam do desarmado**. Onde o armado e o
   * desarmado mostram a mesma coisa, o corpo reapareceu e a borda do objeto
   * acabou. É a mesma ideia do alpha, medida por cor em vez de por buraco.
   */
  const dist = (i, j) => Math.abs(armado.px[i] - desarmado.px[j])
    + Math.abs(armado.px[i + 1] - desarmado.px[j + 1])
    + Math.abs(armado.px[i + 2] - desarmado.px[j + 2]);

  let fila = [];
  for (let y = 0; y < CELL; y++) for (let x = x0; x <= x1; x++) {
    if (out[(y * CELL + x) * 4 + 3] > 0) fila.push([x, y]);
  }
  const DISCORDA = 60; // soma RGB; abaixo disto os dois desenham a mesma coisa
  while (fila.length) {
    const proxima = [];
    for (const [x, y] of fila) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < x0 || nx > x1 || ny < 0 || ny >= CELL) continue;
        const o = (ny * CELL + nx) * 4;
        if (out[o + 3] > 0 || armado.px[o + 3] === 0) continue;
        if (dist(o, o) < DISCORDA) continue;  // aqui o corpo reapareceu
        armado.px.copy(out, o, o, o + 4);
        proxima.push([nx, ny]);
      }
    }
    fila = proxima;
  }

  // limpeza: pixel sem nenhum vizinho opaco e ruido de contorno, nao arma
  const limpo = Buffer.from(out);
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const o = (y * CELL + x) * 4;
    if (out[o + 3] === 0) continue;
    let viz = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= CELL || ny >= CELL) continue;
      if (out[(ny * CELL + nx) * 4 + 3] > 0) viz++;
    }
    if (viz === 0) limpo.writeUInt32BE(0, o);
  }
  return limpo;
}

const caixa = (px) => {
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    if (px[(y * CELL + x) * 4 + 3] > 0) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return n ? { x0, x1, y0, y1, n } : null;
};

const cls = process.argv[2] || 'knight';
const armadoDir = join('arte-fonte', 'pixellab', cls);
const desarmadoDir = join('arte-fonte', 'pixellab', '_desarmado', cls);
const out = join('arte-fonte', 'pixellab', '_armas', cls);
mkdirSync(out, { recursive: true });

for (const d of ['south', 'north', 'east', 'west']) {
  const a = decode(join(armadoDir, `${d}.png`));
  const b = decode(join(desarmadoDir, `${d}.png`));
  for (const [peca, faixa] of Object.entries(LADOS[d])) {
    const px = recorta(a, b, faixa);
    const c = caixa(px);
    writeFileSync(join(out, `${peca}-${d}.png`), encode(CELL, CELL, px));
    console.log(
      c
        ? `  ${peca.padEnd(6)} ${d.padEnd(6)} x ${String(c.x0).padStart(2)}..${c.x1}  y ${String(c.y0).padStart(2)}..${c.y1}  ${c.n} px`
        : `  ${peca.padEnd(6)} ${d.padEnd(6)} VAZIO — nada sobrou`,
    );
  }
}
console.log(`\n  recortes em ${out}/`);
