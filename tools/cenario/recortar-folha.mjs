/**
 * Recorta uma FOLHA de peças em PNGs soltos, com fundo transparente.
 *
 * As folhas do `gerar-peca.mjs` vêm com várias peças sobre fundo creme e com
 * sombra projetada. Este script separa as peças, tira fundo e sombra, e grava
 * cada uma no seu arquivo.
 *
 * Uso:
 *   node tools/cenario/recortar-folha.mjs <folha.png> <destino/> <nome1> <nome2> ...
 *
 * Os nomes são atribuídos na ordem em que as peças são encontradas: **coluna
 * por coluna, de cima para baixo**. 🔴 Errar isso já trocou o quarto mobiliado
 * pelo cômodo vazio em 14/08 — confira o resultado antes de confiar.
 *
 * ## 🔴 Os dois critérios que fazem o recorte funcionar, e como foram achados
 *
 * **1. Fundo e sombra são a MESMA coisa.** A sombra projetada é o fundo
 * escurecido de forma NEUTRA — a razão `pixel / fundo` dá quase igual nos três
 * canais. Peça tem cor própria e espalha. Medido em 14/08 na casa: sombra com
 * espalhamento **0,04**, pedra **0,10+**. Separar por BRILHO não funciona
 * (sombra 0,667 contra pedra 0,207 parece fácil, mas os degraus claros caem no
 * meio) e separar por TEXTURA também não (variância local 0,049 contra 0,054).
 *
 * **2. O recorte é por CONECTIVIDADE, não por limiar.** O que some é o que se
 * alcança a partir da borda andando só por fundo. É isso que salva o reboco
 * creme cercado por vigas: ele é quase da cor do fundo, mas não é alcançável de
 * fora. Um limiar puro abriria buracos no meio das peças.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

/**
 * Decodifica PNG de 8 bits, **RGB (tipo 2) ou RGBA (tipo 6)**, e devolve sempre
 * RGBA.
 *
 * 🔴 Aceitar os dois não é zelo: o `gerar-peca.mjs` pede `background:'opaque'`
 * para as FOLHAS (elas querem fundo branco, o recorte é feito aqui), e nesse
 * caso a OpenAI devolve **RGB sem canal alfa**. O decodificador do
 * `tools/pixellab/compor.mjs` assume RGBA e lê tudo deslocado — em 14/08 isso
 * devolveu pixels magenta e alfa 2, e a folha inteira virou uma peça só.
 *
 * ⚠️ O `bpp` também entra no desfiltro: o filtro Paeth compara com o pixel à
 * ESQUERDA, e "à esquerda" são 3 bytes num RGB e 4 num RGBA. Errar isso não
 * quebra, só corrompe devagar.
 */
function decode(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0, tipoCor = 6; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      if (d[8] !== 8) throw new Error(`profundidade ${d[8]} bits não suportada (só 8)`);
      tipoCor = d[9];
      if (tipoCor !== 2 && tipoCor !== 6) {
        throw new Error(`tipo de cor ${tipoCor} não suportado (só 2=RGB e 6=RGBA)`);
      }
    } else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }

  const bpp = tipoCor === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const linhas = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = linhas.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? linhas.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
  }

  // Normaliza para RGBA: o resto do script só lida com 4 canais.
  const px = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    px[p * 4] = linhas[p * bpp];
    px[p * 4 + 1] = linhas[p * bpp + 1];
    px[p * 4 + 2] = linhas[p * bpp + 2];
    px[p * 4 + 3] = bpp === 4 ? linhas[p * bpp + 3] : 255;
  }
  return { w, h, px };
}

function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------

const ESPALHAMENTO_MAX = 0.022; // acima disto o pixel tem cor propria => e peca
const LUZ_MIN = 0.72;           // abaixo disto e escuro demais para ser fundo

/** Mediana por canal de uma moldura de `m` px em volta da folha. */
function corDoFundo(w, h, px, m = 12) {
  const canais = [[], [], []];
  const pega = (x, y) => { const i = (y * w + x) * 4; for (let c = 0; c < 3; c++) canais[c].push(px[i + c]); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (y < m || y >= h - m || x < m || x >= w - m) pega(x, y);
  }
  return canais.map((v) => { v.sort((a, b) => a - b); return v[v.length >> 1] || 1; });
}

/** `true` onde o pixel é fundo ou sombra — ver o cabeçalho. */
function mapaDeFundo(w, h, px, bg) {
  const f = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = px[i] / bg[0], g = px[i + 1] / bg[1], b = px[i + 2] / bg[2];
    const med = (r + g + b) / 3;
    const esp = (Math.abs(r - med) + Math.abs(g - med) + Math.abs(b - med)) / 3;
    f[p] = esp < ESPALHAMENTO_MAX && med > LUZ_MIN ? 1 : 0;
  }
  return f;
}

/** Faixas contíguas de um perfil. `folga` funde vãos curtos. */
function bandas(perfil, minimo, folga) {
  const faixas = []; let i = 0;
  while (i < perfil.length) {
    if (perfil[i] > minimo) {
      let j = i, vazio = 0, k = i;
      while (k < perfil.length) {
        if (perfil[k] > minimo) { j = k; vazio = 0; }
        else if (++vazio > folga) break;
        k++;
      }
      faixas.push([i, j]); i = k;
    } else i++;
  }
  return faixas;
}

/**
 * Preenchimento a partir da borda, em fila (BFS).
 *
 * ⚠️ Fila, não dilatação repetida: a dilatação precisa de uma passada por
 * pixel de distância, e numa peça de 500 px isso são 500 passadas na imagem
 * inteira. A fila visita cada pixel uma vez.
 */
function alcancavelDaBorda(w, h, fundoso) {
  const fora = new Uint8Array(w * h);
  const fila = new Int32Array(w * h);
  let ini = 0, fim = 0;
  const semeia = (p) => { if (fundoso[p] && !fora[p]) { fora[p] = 1; fila[fim++] = p; } };
  for (let x = 0; x < w; x++) { semeia(x); semeia((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { semeia(y * w); semeia(y * w + w - 1); }
  while (ini < fim) {
    const p = fila[ini++]; const x = p % w, y = (p / w) | 0;
    if (x > 0) semeia(p - 1);
    if (x < w - 1) semeia(p + 1);
    if (y > 0) semeia(p - w);
    if (y < h - 1) semeia(p + w);
  }
  return fora;
}

/** Mantém só o componente opaco ligado ao centro — mata manchinhas soltas. */
function maiorComponente(w, h, opaco) {
  let sx = 0, sy = 0, n = 0;
  for (let p = 0; p < w * h; p++) if (opaco[p]) { sx += p % w; sy += (p / w) | 0; n++; }
  if (!n) return opaco;
  const cx = Math.round(sx / n), cy = Math.round(sy / n);
  let semente = cy * w + cx;
  if (!opaco[semente]) { for (let p = 0; p < w * h; p++) if (opaco[p]) { semente = p; break; } }
  const comp = new Uint8Array(w * h); const fila = new Int32Array(w * h);
  let ini = 0, fim = 0; comp[semente] = 1; fila[fim++] = semente;
  const push = (p) => { if (opaco[p] && !comp[p]) { comp[p] = 1; fila[fim++] = p; } };
  while (ini < fim) {
    const p = fila[ini++]; const x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  return comp;
}

// ---------------------------------------------------------------------------

const [folha, destino, ...nomes] = process.argv.slice(2);
if (!folha || !destino || !nomes.length) {
  console.error('uso: node tools/cenario/recortar-folha.mjs <folha.png> <destino/> <nome1> <nome2> ...');
  process.exit(1);
}

const { w, h, px } = decode(folha);
const bg = corDoFundo(w, h, px);
const fundoso = mapaDeFundo(w, h, px, bg);

// Coluna primeiro: as peças separam limpo em x, e as alturas variam.
const perfilX = new Array(w).fill(0);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!fundoso[y * w + x]) perfilX[x]++;

const caixas = [];
for (const [c0, c1] of bandas(perfilX, 2, 20)) {
  const larg = c1 - c0 + 1;
  const perfilY = new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = c0; x <= c1; x++) if (!fundoso[y * w + x]) perfilY[y]++;
  for (const [r0, r1] of bandas(perfilY, Math.max(4, Math.round(larg * 0.06)), 6)) {
    let massa = 0, xmin = c1, xmax = c0, ymin = r1, ymax = r0;
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) if (!fundoso[y * w + x]) {
      massa++; if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y;
    }
    if (massa < 3000) continue;
    caixas.push([xmin, ymin, xmax, ymax]);
  }
}

console.log(`${caixas.length} peças encontradas, ${nomes.length} nomes dados.`);
if (caixas.length !== nomes.length) {
  console.error('🔴 Contagem diferente — nada foi gravado. Caixas:', JSON.stringify(caixas));
  process.exit(1);
}

mkdirSync(destino, { recursive: true });
const M = 16;

caixas.forEach(([x0, y0, x1, y1], k) => {
  const ax0 = Math.max(0, x0 - M), ay0 = Math.max(0, y0 - M);
  const ax1 = Math.min(w - 1, x1 + M), ay1 = Math.min(h - 1, y1 + M);
  const pw = ax1 - ax0 + 1, ph = ay1 - ay0 + 1;

  const sub = new Uint8Array(pw * ph);
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) sub[y * pw + x] = fundoso[(ay0 + y) * w + (ax0 + x)];

  const fora = alcancavelDaBorda(pw, ph, sub);
  const opaco = new Uint8Array(pw * ph);
  for (let p = 0; p < pw * ph; p++) opaco[p] = fora[p] ? 0 : 1;
  const comp = maiorComponente(pw, ph, opaco);

  // Recorta justo no que sobrou.
  let bx0 = pw, by0 = ph, bx1 = 0, by1 = 0;
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (comp[y * pw + x]) {
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
  const fw = bx1 - bx0 + 1, fh = by1 - by0 + 1;
  const saida = Buffer.alloc(fw * fh * 4);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const de = ((ay0 + by0 + y) * w + (ax0 + bx0 + x)) * 4;
    const para = (y * fw + x) * 4;
    saida[para] = px[de]; saida[para + 1] = px[de + 1]; saida[para + 2] = px[de + 2];
    saida[para + 3] = comp[(by0 + y) * pw + (bx0 + x)] ? 255 : 0;
  }
  const arquivo = join(destino, nomes[k] + '.png');
  writeFileSync(arquivo, encode(fw, fh, saida));
  console.log(`  ${nomes[k].padEnd(20)} ${fw}x${fh}  ${arquivo}`);
});
