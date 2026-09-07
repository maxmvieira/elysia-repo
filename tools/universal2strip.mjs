/**
 * Monta a tira do PERSONAGEM UNIVERSAL a partir das folhas do autosprite.io.
 *
 * 🔴 **O que entra é MUITO diferente do que o jogo lê.** As folhas do
 * autosprite vêm com **uma direção por arquivo** e **56 quadros** de 128 px,
 * em 8 colunas × 7 linhas. O motor quer o contrário: **um arquivo** com uma
 * LINHA por direção e **exatamente 4 quadros** por linha.
 *
 * 🔴 **Os 4 quadros não são quatro quaisquer.** `main.ts` rege o passo pelo
 * CHÃO, não por um relógio:
 *
 *     sprite.gotoAndStop((paridade ? 0 : 2) + (contato ? 1 : 0));
 *
 * ou seja, a tira tem de ser, nesta ordem:
 *
 *     [ passagem-A, contato-A, passagem-B, contato-B ]
 *
 * "Contato" é o pé batendo no chão (pernas ABERTAS); "passagem" é o meio do
 * passo (pernas JUNTAS). Pegar quatro quadros igualmente espaçados quebraria a
 * sincronia — o pé tocaria o chão num ritmo e o chão passaria em outro, que é o
 * "deslize" que o dono já relatou uma vez.
 *
 * ⚠️ **Os índices abaixo foram MEDIDOS, não escolhidos.** A abertura dos pés no
 * PERFIL (as 18 linhas de baixo do quadro) varia de 20 px a 57 px ao longo do
 * ciclo, e é o sinal mais limpo que existe: no de frente a altura varia só 3 px
 * e não serve para nada. Ver o bloco `QUADROS`.
 *
 * ## Uso
 *
 *   node tools/universal2strip.mjs
 *
 * Espera as folhas já reescalonadas em `arte-fonte/universal/` (128 → 80 px por
 * célula, com ffmpeg e `flags=lanczos`). O reescalonamento fica FORA daqui de
 * propósito: é offline, acontece uma vez, e ffmpeg reamostra melhor do que
 * qualquer coisa que se escreva à mão aqui.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join } from 'node:path';

/** Lado da célula depois do reescalonamento. */
const CELL = 80;
/** Colunas da folha de origem (o autosprite entrega 8 × 7 = 56). */
const COLS = 8;

/**
 * 🔴 Os quatro quadros do ciclo, na ORDEM QUE O MOTOR LÊ.
 *
 * Medição da abertura dos pés no perfil, ao longo dos 56 quadros:
 *
 *   contato (pés abertos, ~57 px):  0 · 13 · 25 · 48
 *   passagem (pés juntos, ~20 px):  9 · 19 · 32 · 42
 *
 * Um ciclo inteiro tem ~24 quadros e contém DOIS contatos e DUAS passagens —
 * um par por perna. Estes quatro saem todos do primeiro ciclo, para as pernas
 * casarem entre si:
 */
const QUADROS = [
  19, // 0 — passagem, perna A
  0,  // 1 — contato,  perna A
  9,  // 2 — passagem, perna B
  13, // 3 — contato,  perna B
];

/**
 * A linha em que a SOLA tem de cair dentro da célula.
 *
 * 🔴 É o mesmo contrato do `pixellab2strip.mjs`: o conversor garante o pé aqui,
 * e o `heroes.ts` repete o número em `feetY`. **São o mesmo valor em dois
 * arquivos** — mudar um sem o outro enterra ou levita o personagem.
 */
const GROUND_Y = 74;

/** Linha só conta como "chão" com esta massa mínima — evita mirar numa franja. */
const MIN_PX_LINHA = 2;

// ---------------------------------------------------------------------------
// PNG (mesmo par de `pixellab2strip.mjs` — RGBA sem filtro, sem dependências)
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
  if (ct !== 6) throw new Error(`${path}: esperado RGBA, veio colorType ${ct}`);
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

// ---------------------------------------------------------------------------

/** Recorta o quadro `n` da folha (leitura em linha, `COLS` por fileira). */
function recorta(img, n) {
  const cx = (n % COLS) * CELL, cy = Math.floor(n / COLS) * CELL;
  const out = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++) {
    const de = ((cy + y) * img.w + cx) * 4;
    img.px.copy(out, y * CELL * 4, de, de + CELL * 4);
  }
  return out;
}

/** Espelha o quadro na horizontal. É como a direção ESQUERDA nasce. */
function espelha(q) {
  const out = Buffer.alloc(q.length);
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const de = (y * CELL + x) * 4, para = (y * CELL + (CELL - 1 - x)) * 4;
      q.copy(out, para, de, de + 4);
    }
  }
  return out;
}

/** Última linha com massa — a sola. */
function chaoDe(q) {
  for (let y = CELL - 1; y >= 0; y--) {
    let n = 0;
    for (let x = 0; x < CELL; x++) if (q[(y * CELL + x) * 4 + 3] > 8) n++;
    if (n >= MIN_PX_LINHA) return y;
  }
  return -1;
}

/**
 * Escreve o quadro na tira, deslocado para a sola cair em `GROUND_Y`.
 *
 * ⚠️ **O alinhamento é por quadro, não por animação.** Dentro do ciclo o boneco
 * sobe e desce alguns pixels; sem isto ele pisaria em alturas diferentes a cada
 * passo, que é o defeito que faz um sprite parecer "flutuando".
 */
function cola(tira, tiraW, q, col, row) {
  const dy = GROUND_Y - chaoDe(q);
  for (let y = 0; y < CELL; y++) {
    const alvo = y + dy;
    if (alvo < 0 || alvo >= CELL) continue;
    const de = y * CELL * 4;
    const para = ((row * CELL + alvo) * tiraW + col * CELL) * 4;
    q.copy(tira, para, de, de + CELL * 4);
  }
}

/** Mede o que o `heroes.ts` precisa saber para desenhar sem esticar. */
function metricas(px, w, h) {
  let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 8) {
        const ly = y % CELL; if (ly < y0) y0 = ly; if (ly > y1) y1 = ly;
        const lx = x % CELL; if (lx < x0) x0 = lx; if (lx > x1) x1 = lx;
      }
    }
  }
  return { topo: y0, chao: y1, alturaConteudo: y1 - y0 + 1, centroX: (x0 + x1) / 2 };
}

// ---------------------------------------------------------------------------

const ORIGEM = 'arte-fonte/universal';
const DESTINO = 'client/public/assets/classes-universal';

const folhas = {
  down: decode(join(ORIGEM, 'walk_down.png')),
  up: decode(join(ORIGEM, 'walk_up.png')),
  right: decode(join(ORIGEM, 'walk_right.png')),
};

// 🔴 A ORDEM DAS LINHAS É CONTRATO com `heroes.ts`: down, up, right, left.
// Trocar duas faz o personagem andar de costas para onde vai, e o motor não
// tem como perceber.
const LINHAS = ['down', 'up', 'right', 'left'];

const tiraW = CELL * QUADROS.length;
const tiraH = CELL * LINHAS.length;
const tira = Buffer.alloc(tiraW * tiraH * 4);

for (let row = 0; row < LINHAS.length; row++) {
  const dir = LINHAS[row];
  // ⚠️ A ESQUERDA é a direita espelhada. O autosprite entrega cinco direções
  // (as três daqui mais duas diagonais), e nenhuma delas é a esquerda — num
  // conjunto de 8 direções ela seria o espelho da direita, que é o que fazemos.
  const folha = dir === 'left' ? folhas.right : folhas[dir];
  QUADROS.forEach((n, col) => {
    const q = dir === 'left' ? espelha(recorta(folha, n)) : recorta(folha, n);
    cola(tira, tiraW, q, col, row);
  });
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, 'walk.png'), encode(tiraW, tiraH, tira));

/**
 * O `idle` é o quadro de CONTATO da perna A — o índice 1 da tira.
 *
 * 🔴 Sem `idle` o motor congela no quadro 0 do `walk`, que aqui é uma
 * PASSAGEM: o boneco ficaria parado com as pernas no ar, no meio de um passo.
 * Um quadro de contato é a pose de pé.
 */
const idleW = CELL, idleH = CELL * LINHAS.length;
const idle = Buffer.alloc(idleW * idleH * 4);
for (let row = 0; row < LINHAS.length; row++) {
  const dir = LINHAS[row];
  const folha = dir === 'left' ? folhas.right : folhas[dir];
  const q = dir === 'left' ? espelha(recorta(folha, QUADROS[1])) : recorta(folha, QUADROS[1]);
  cola(idle, idleW, q, 0, row);
}
writeFileSync(join(DESTINO, 'idle.png'), encode(idleW, idleH, idle));

/**
 * `pose.png` é o MESMO conteúdo do `idle`, com outro nome.
 *
 * ⚠️ Não é redundância à toa: `heroIconCss` monta o retrato do cartão da tela
 * de criação por CSS, e imagem de CSS que falta **não dá erro** — o cartão só
 * fica vazio. Emitir os dois nomes é mais barato que descobrir isso na tela.
 */
writeFileSync(join(DESTINO, 'pose.png'), encode(idleW, idleH, idle));

const m = metricas(tira, tiraW, tiraH);
console.log(`walk.png  ${tiraW}x${tiraH}  (${QUADROS.length} quadros x ${LINHAS.length} direcoes)`);
console.log(`idle.png  ${idleW}x${idleH}`);
console.log('');
console.log('Para o PACK em client/src/heroes.ts:');
console.log(`  cell: ${CELL}, contentH: ${m.alturaConteudo}, feetY: ${GROUND_Y}, ` +
  `centerX: ${m.centroX}, targetH: ${m.alturaConteudo},`);
console.log('');
console.log(`(topo do conteudo na celula: ${m.topo}; sola garantida em ${GROUND_Y})`);
