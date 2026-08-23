/**
 * Lê a IMAGEM de uma planta e escreve a planta em TEXTO que o jogo usa.
 *
 * Uso:  node tools/cenario/planta-para-texto.mjs <planta.png> <lado-em-tiles>
 *
 * 🔴 **Existe porque desenhar a planta a olho FALHOU.** Em 14/08 eu escrevi as
 * plantas do térreo e do superior olhando a imagem e contando quadradinhos. O
 * resultado, em tela: o dono atravessava móvel, atravessava porta, e a escada
 * ficou **murada** — eu tinha escrito uma parede sem vão, e metade da casa
 * virou inalcançável sem ninguém notar até jogar.
 *
 * A regra que vale aqui é a mesma que já valeu para a pegada da casa e para a
 * moldura do cômodo: **desenho e colisão têm de sair da MESMA fonte.** Aqui a
 * fonte é a imagem.
 *
 * ## Como ele decide
 *
 * O assoalho é a cor que MAIS aparece na planta — é ele que cobre o resto. Para
 * cada célula da grade, o script pega a cor mediana do miolo e pergunta duas
 * coisas:
 *
 * 1. está perto da cor do assoalho?
 * 2. a célula é UNIFORME (desvio baixo)?
 *
 * Chão livre passa nas duas. Parede falha na primeira (é cinza). Móvel falha
 * numa ou noutra: mesa e barril têm cor própria, e a borda escura de qualquer
 * objeto levanta o desvio.
 *
 * ⚠️ Ele **não** distingue parede de móvel — os dois saem como sólido. Quem
 * quiser a planta legível troca `#` por `F` à mão depois; para o jogo dá no
 * mesmo, porque os dois bloqueiam igual.
 *
 * ⚠️ E ele **não** acha porta nem escada: esses são decisão de jogo, não cor.
 * Marque `e`, `>` e `<` à mão sobre o que ele imprimir.
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decode(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0, tipo = 6; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); tipo = d[9]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  const bpp = tipo === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp; const L = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = L.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? L.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
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

const [arquivo, ladoTxt] = process.argv.slice(2);
if (!arquivo || !ladoTxt) {
  console.error('uso: node tools/cenario/planta-para-texto.mjs <planta.png> <lado-em-tiles>');
  process.exit(1);
}
const N = Number(ladoTxt);
const { w, h, px } = decode(arquivo);

const cw = w / N, ch = h / N;
const med = (v) => { const s = [...v].sort((a, b) => a - b); return s[s.length >> 1]; };

/** Cor mediana do miolo de uma célula, e o desvio dentro dela. */
function amostra(cx, cy) {
  const x0 = Math.round(cx * cw + cw * 0.28), x1 = Math.round(cx * cw + cw * 0.72);
  const y0 = Math.round(cy * ch + ch * 0.28), y1 = Math.round(cy * ch + ch * 0.72);
  const rs = [], gs = [], bs = []; let opacos = 0, total = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * 4; total++;
    if (px[i + 3] < 128) continue;
    opacos++; rs.push(px[i]); gs.push(px[i + 1]); bs.push(px[i + 2]);
  }
  if (!opacos) return { vazia: true, fracaoOpaca: 0 };
  const m = [med(rs), med(gs), med(bs)];
  const desvio = Math.sqrt(rs.reduce((s, v) => s + (v - m[0]) ** 2, 0) / rs.length);
  return { cor: m, desvio, fracaoOpaca: opacos / total, vazia: false };
}

/**
 * Cor do assoalho: a MEDIANA das medianas das células.
 *
 * 🔴 Não é "a cor mais frequente da imagem", e a diferença derrubou a primeira
 * versão: arte pintada à mão tem contorno escuro em tudo, e o preto do traço
 * ganhou o histograma. Medido na planta do andar de cima — a cor mais comum era
 * `rgb(40,24,8)` com 42 mil pixels, enquanto o assoalho no centro é
 * `rgb(122,78,32)`. Com o chão errado, quase toda célula virava "sólido".
 *
 * A mediana das células funciona porque a MAIORIA das células é chão, e mediana
 * não se move com o que está nas pontas.
 */
function corDoAssoalho() {
  const rs = [], gs = [], bs = [];
  for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    const a = amostra(cx, cy);
    if (a.vazia || a.fracaoOpaca < 0.9) continue;
    rs.push(a.cor[0]); gs.push(a.cor[1]); bs.push(a.cor[2]);
  }
  return [med(rs), med(gs), med(bs)];
}
const chao = corDoAssoalho();
const linhas = [];
const DIST_MAX = 46;   // quão longe do tom do assoalho ainda conta como chão
const DESVIO_MAX = 26; // acima disto há objeto ou borda na célula

for (let cy = 0; cy < N; cy++) {
  let linha = '';
  for (let cx = 0; cx < N; cx++) {
    const a = amostra(cx, cy);
    // Fora do prédio (transparente) é sólido: o jogador não anda lá.
    if (a.vazia || a.fracaoOpaca < 0.6) { linha += '#'; continue; }
    const dist = Math.hypot(a.cor[0] - chao[0], a.cor[1] - chao[1], a.cor[2] - chao[2]);
    linha += (dist < DIST_MAX && a.desvio < DESVIO_MAX) ? '.' : '#';
  }
  linhas.push(linha);
}

console.log(`# ${arquivo}  ${w}x${h}  grade ${N}x${N}`);
console.log(`# cor do assoalho: rgb(${chao.join(',')})`);
console.log('# marque `e`, `>` e `<` à mão — porta e escada são decisão de jogo, não cor.\n');
for (const l of linhas) console.log(`      '${l}',`);
