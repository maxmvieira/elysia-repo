/**
 * Conversor do pack GOLEM BOSS da CraftPix -> folhas de criatura do jogo.
 *
 * Entrada: `assets/GolemBoss/PNG/Golem1/Without_shadow/Golem1_<Anim>_without_shadow.png`
 * Saida:   `client/public/assets/monsters/golem/{walk,idle,attack,hurt,death}.png`
 *
 * ## 🔴 AS LINHAS 2 E 3 VEM TROCADAS, e este e o ponto do arquivo
 *
 * O pack entrega, em cada folha, 4 linhas de 128 px:
 *
 *   linha 0 = de frente   -> `down`
 *   linha 1 = de costas   -> `up`
 *   linha 2 = perfil para a ESQUERDA
 *   linha 3 = perfil para a DIREITA
 *
 * E o jogo espera `SHEET_ROW = { down: 0, up: 1, right: 2, left: 3 }`
 * (`client/src/miniworld.ts`). Ou seja: **as duas ultimas estao invertidas em
 * relacao a tudo o mais neste projeto.**
 *
 * Foi verificado OLHANDO a arte ampliada, quadro a quadro — os olhos amarelos
 * do golem ficam do lado para onde ele anda. Copiar as linhas na ordem em que
 * vem faria o chefe **andar de costas para os lados**, que e exatamente o
 * moonwalk que a fauna teve em 29/08 (aquele por outra causa, no servidor).
 *
 * ⚠️ O pack de ANIMAIS nao precisa disto: nele a ordem ja bate. Nao existe
 * "convencao da CraftPix" — cada pack e de um autor, e a unica forma de saber e
 * olhar. Por isso a inversao mora aqui e nao no carregador do cliente.
 *
 * ## Por que `Without_shadow`
 *
 * `makeMiniActor` desenha a propria elipse de sombra sob todo ator. A pasta
 * `With_shadow` traz uma sombra assada, e as duas juntas dao sombra dupla.
 *
 * ## Golem1 de tres
 *
 * O pack tem Golem1, Golem2 e Golem3 (terra, pedra e lava). ⚠️ **So o Golem1
 * entra**, por decisao do dono em 29/08: "coloque apenas 1 deles". Os outros
 * dois tem exatamente o mesmo formato — para acrescentar, e trocar `QUAL`.
 *
 * Uso:  npm run golem:build
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

/** Qual dos tres golens do pack vira criatura. */
const QUAL = 'Golem1';
const SRC = `assets/GolemBoss/PNG/${QUAL}/Without_shadow`;
const OUT = 'client/public/assets/monsters/golem';

/** Lado da celula. Todas as folhas do pack usam 128. */
const CELL = 128;

/**
 * Animacao do pack -> arquivo que o jogo carrega (`loadCreatureSheets`).
 *
 * ⚠️ `Run` fica de fora de proposito: o motor tem UM ciclo de caminhada por
 * criatura, e chefe que corre nao combina com `moveCooldownMs` de chefe. A arte
 * continua no pack para o dia em que houver estado de perseguicao.
 */
const ANIMS = {
  Walk: 'walk',
  Idle: 'idle',
  Attack: 'attack',
  Hurt: 'hurt',
  Death: 'death',
};

/**
 * 🔴 De onde cada linha da SAIDA vem, na ENTRADA. E a inversao explicada no
 * cabecalho: destino 2 (direita do jogo) le a origem 3, e vice-versa.
 */
const LINHA_ORIGEM = [0, 1, 3, 2];

// --- PNG (mesmo codec dos outros conversores) -------------------------------

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

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

// --- Programa ---------------------------------------------------------------

mkdirSync(OUT, { recursive: true });

/** Bounding box de alpha unido em TODAS as folhas — a âncora é uma só. */
let topo = CELL, base = -1, esq = CELL, dir = -1;

for (const [origem, destino] of Object.entries(ANIMS)) {
  const caminho = `${SRC}/${QUAL}_${origem}_without_shadow.png`;
  if (!existsSync(caminho)) throw new Error(`${caminho} não existe`);
  const img = decode(caminho);

  const cols = img.w / CELL;
  if (!Number.isInteger(cols)) throw new Error(`${origem}: largura ${img.w} não divide por ${CELL}`);
  if (img.h !== CELL * 4) throw new Error(`${origem}: esperadas 4 linhas de ${CELL}px, veio ${img.h}px`);

  const w = img.w, h = img.h;
  const px = Buffer.alloc(w * h * 4);
  LINHA_ORIGEM.forEach((rOrig, rDest) => {
    for (let y = 0; y < CELL; y++) {
      const so = ((rOrig * CELL + y) * w) * 4;
      img.px.copy(px, ((rDest * CELL + y) * w) * 4, so, so + w * 4);
    }
  });

  writeFileSync(`${OUT}/${destino}.png`, encode(w, h, px));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] <= 8) continue;
      const ly = y % CELL, lx = x % CELL;
      if (ly < topo) topo = ly;
      if (ly > base) base = ly;
      if (lx < esq) esq = lx;
      if (lx > dir) dir = lx;
    }
  }
  console.log(`✅ ${destino.padEnd(7)} ${cols} quadros x 4 direções  (linhas 2↔3 invertidas)`);
}

const altura = base - topo + 1;
const largura = dir - esq + 1;
/**
 * 🔴 Escala 2x, e o numero e escolhido: o conteudo tem ~57 px, entao 2x poe o
 * chefe em ~114 px de tela — quase o dobro do heroi (60) e bem acima do Cavalo
 * (62), que era o maior bicho do mapa. Chefe tem que INTIMIDAR de longe.
 * ⚠️ Inteiro, pela regra de sempre: fracionario devolve o serrilhado.
 */
const ESCALA = 2;

console.log(
  `\nconteúdo ${largura}x${altura}  ·  pé em y=${base + 1}  ·  escala ${ESCALA}x`
  + ` -> ${altura * ESCALA}px na tela`,
);
console.log('\n--- cole em CREATURE_SHEETS (client/src/miniworld.ts) ---');
console.log(
  `  golem: { cell: ${CELL}, scale: ${ESCALA}, anchorX: ${(esq + dir + 1) / 2 / CELL},`
  + ` anchorY: ${(base + 1) / CELL}, labelTop: ${-(altura * ESCALA) - 6} },`,
);
