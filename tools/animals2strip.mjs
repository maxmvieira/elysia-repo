/**
 * Conversor do pack de ANIMAIS da CraftPix -> folhas de criatura do jogo.
 *
 * Entrada: `assets/animals/PNG/Without_shadow/<Nome>_without_shadow.png`
 * Saida:   `client/public/assets/monsters/<tipo>/{walk,idle}.png`
 *
 * ## O layout da CraftPix ja e o do jogo, e isso e sorte, nao projeto
 *
 * Todas as oito folhas tem a MESMA forma: 6 colunas x 8 linhas, com a celula
 * saindo de `largura / 6` (16 px no coelhinho, 32 na cabra, 64 no cavalo).
 *
 *   linha 0..3 = ANDAR, 6 quadros  -> vira `walk.png`
 *   linha 4..7 = PARADO, 4 quadros -> vira `idle.png`
 *   dentro de cada bloco: 0 = sul, 1 = norte, 2 = leste, 3 = oeste
 *
 * 🔴 Essa ordem de direcoes e **exatamente** a `SHEET_ROW` do
 * `client/src/miniworld.ts` (`down, up, right, left`). Nao ha remapeamento a
 * fazer — e foi verificado quadro a quadro, olhando a arte, nao deduzido do
 * nome do arquivo.
 *
 * ## Por que `Without_shadow`
 *
 * 🔴 O pack vem em duas versoes e a com sombra e a errada aqui:
 * `makeMiniActor` (em `main.ts`) ja desenha uma elipse de sombra por baixo de
 * TODO ator. Usar a arte com sombra assada daria duas sombras em cada bicho —
 * uma pintada e uma desenhada, em tamanhos diferentes.
 *
 * ## O que sai no console, e para que serve
 *
 * O conversor MEDE o bounding box de alpha de cada folha e imprime o bloco de
 * configuracao pronto para o `CREATURE_SHEETS`. A linha do pe e o centro do
 * corpo saem de medicao — nao de chute — porque ancora errada faz o bicho
 * flutuar ou afundar no chao, e a 1 px de diferenca ninguem descobre olhando.
 *
 * Uso:  npm run animals:build
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const SRC = 'assets/animals/PNG/Without_shadow';
const OUT = 'client/public/assets/monsters';

/**
 * Nome do arquivo da CraftPix -> tipo da criatura no `CREATURES`.
 *
 * ⚠️ O `rabbit` ja existia no bestiario (Coelho, pacifico) desde muito antes
 * deste pack, e por isso ele NAO ganha entrada nova la — so ganha arte. Os
 * outros sete sao especies novas.
 */
const TIPOS = {
  Rabbit: 'rabbit',
  Rabbit_cub: 'rabbit_cub',
  Goat: 'goat',
  Goatling: 'goatling',
  Goose: 'goose',
  Gosling: 'gosling',
  Horse: 'horse',
  Foal: 'foal',
};

/**
 * Multiplicador de desenho de cada bicho — o unico lugar deste arquivo onde ha
 * gosto em vez de medida.
 *
 * 🔴 **E 2x EM TODOS, e chegar nisso levou tres rodadas com o dono olhando a
 * tela.** Vale registrar o caminho, porque ele tem uma licao:
 *
 *   1. Comecou com multiplicadores variados (1x em sete dos oito). Veredito:
 *      "todos muuuito pequenos" — bichos de 15 a 27 px ao lado de um heroi de 60.
 *   2. Tentou-se levar CADA UM para perto dos 62 px do cavalo, com o inteiro
 *      mais proximo: 3x no coelho, 4x no coelhinho, 3x nos filhotes. Veredito:
 *      "o cabrito ta muito grande, os coelhos muuuito grandes".
 *   3. **A causa dos dois erros era a mesma: perseguir uma ALTURA IGUAL para
 *      todos.** A CraftPix ja desenhou as proporcoes relativas certas dentro do
 *      pack — um coelho ocupa menos da celula que uma cabra porque coelho e
 *      menor mesmo. Um multiplicador unico preserva isso; multiplicadores
 *      diferentes destroem, e foi o que punha filhote maior que adulto.
 *
 * A hierarquia que 2x entrega, sem ninguem escolher numero nenhum:
 *
 *   Cavalo 62 > Potro 54 > Ganso 52 > Cabra 50 > Coelho 42
 *            > Cabrito 36 = Filhote de Ganso 36 > Coelhinho 30
 *
 * 🔴 **A escala tem que ser INTEIRA, e e por isso que "do tamanho da cabra" nao
 * da para atender ao pe da letra.** Com filtragem `nearest`, escala fracionaria
 * faz um pixel do desenho virar 2 na tela e o vizinho virar 3, em faixas
 * alternadas — o defeito que custou a sessao de 10/08 (a historia esta em
 * `client/src/heroes.ts`). O cabrito tem 18 px de conteudo contra 25 da cabra:
 * ou fica menor que ela (2x = 36) ou maior (3x = 54). Nao existe igual.
 */
const ESCALA = {
  horse: 2,      // 31 px de conteudo -> 62
  foal: 2,       // 27 -> 54
  goose: 2,      // 26 -> 52
  goat: 2,       // 25 -> 50
  goatling: 2,   // 18 -> 36
  gosling: 2,    // 18 -> 36
  // ⚠️ OS DOIS COELHOS SAO A EXCECAO AO 2x, por decisao do dono em 29/08: ele
  // pediu o Coelho do tamanho do Coelhinho e o Coelhinho do tamanho do
  // COGUMELO (o no de coleta, desenhado por codigo em `main.ts`, que tem ~11 px
  // de altura). O 1x deixa o Coelho em 21 e o Coelhinho em 15 — os degraus
  // vizinhos seriam 42 e 30, e nao ha nada entre eles porque a escala e
  // inteira. Sao os dois unicos bichos do pack desenhados no proprio tamanho.
  rabbit: 1,     // 21 -> 21
  rabbit_cub: 1, // 15 -> 15, quase a altura do cogumelo
};

const COLS = 6;
const LINHAS_ANDAR = [0, 1, 2, 3];
const LINHAS_PARADO = [4, 5, 6, 7];
/** O bloco parado usa 4 dos 6 quadros. Conferido pela ocupacao de alpha. */
const QUADROS_PARADO = 4;

// --- PNG (mesmo codec de `pixellab2strip.mjs`) ------------------------------

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

// --- Recorte e medida -------------------------------------------------------

/** Copia uma celula (col,row) da folha de origem para (col,row) da de destino. */
function copiaCelula(src, cell, sc, sr, dst, dstW, dc, dr) {
  for (let y = 0; y < cell; y++) {
    const so = ((sr * cell + y) * src.w + sc * cell) * 4;
    const dofs = ((dr * cell + y) * dstW + dc * cell) * 4;
    src.px.copy(dst, dofs, so, so + cell * 4);
  }
}

/** Monta uma folha nova com as linhas pedidas e os primeiros `cols` quadros. */
function extrai(img, cell, linhas, cols) {
  const w = cols * cell, h = linhas.length * cell;
  const px = Buffer.alloc(w * h * 4);
  linhas.forEach((linha, i) => {
    for (let c = 0; c < cols; c++) copiaCelula(img, cell, c, linha, px, w, c, i);
  });
  return { w, h, px };
}

/**
 * Bounding box de alpha UNIDO em todos os quadros da folha.
 *
 * 🔴 A uniao e o ponto. Ancorar pelo quadro parado deixaria o bicho subindo e
 * descendo 1 px no ciclo de passos; ancorar por direcao daria um pulinho toda
 * vez que ele virasse. Uma medida so para a especie inteira nao tem esse defeito
 * — e a mesma licao que `heroes.ts` aprendeu com as quatro classes.
 */
function medeConteudo(img, cell) {
  let topo = cell, base = -1, esq = cell, dir = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.px[(y * img.w + x) * 4 + 3] <= 8) continue;
      const ly = y % cell, lx = x % cell;
      if (ly < topo) topo = ly;
      if (ly > base) base = ly;
      if (lx < esq) esq = lx;
      if (lx > dir) dir = lx;
    }
  }
  return { topo, base, esq, dir, altura: base - topo + 1, largura: dir - esq + 1 };
}

/** Quantos dos `COLS` quadros de uma linha tem pixel — confere o layout. */
function quadrosOcupados(img, cell, linha) {
  let n = 0;
  for (let c = 0; c < COLS; c++) {
    let tem = false;
    for (let y = linha * cell; y < (linha + 1) * cell && !tem; y++) {
      for (let x = c * cell; x < (c + 1) * cell; x++) {
        if (img.px[(y * img.w + x) * 4 + 3] > 8) { tem = true; break; }
      }
    }
    if (tem) n++;
  }
  return n;
}

// --- Programa ---------------------------------------------------------------

const linhasCfg = [];

for (const [nome, tipo] of Object.entries(TIPOS)) {
  const caminho = `${SRC}/${nome}_without_shadow.png`;
  if (!existsSync(caminho)) {
    console.error(`⚠️  ${caminho} nao existe — ${tipo} pulado.`);
    continue;
  }
  const img = decode(caminho);
  const cell = img.w / COLS;

  // 🔴 Travas de formato. O pack e de terceiro e pode vir reexportado com outro
  // layout numa versao futura; falhar alto aqui e muito melhor que gerar uma
  // folha em que o norte virou o leste e ninguem percebe ate ver em tela.
  if (!Number.isInteger(cell)) throw new Error(`${nome}: largura ${img.w} nao divide por ${COLS}`);
  if (img.h !== cell * 8) throw new Error(`${nome}: esperadas 8 linhas de ${cell}px, veio ${img.h}px`);
  for (const l of LINHAS_ANDAR) {
    const n = quadrosOcupados(img, cell, l);
    if (n !== COLS) throw new Error(`${nome}: linha ${l} (andar) tem ${n} quadros, esperados ${COLS}`);
  }
  for (const l of LINHAS_PARADO) {
    const n = quadrosOcupados(img, cell, l);
    if (n !== QUADROS_PARADO) throw new Error(`${nome}: linha ${l} (parado) tem ${n} quadros, esperados ${QUADROS_PARADO}`);
  }

  const andar = extrai(img, cell, LINHAS_ANDAR, COLS);
  const parado = extrai(img, cell, LINHAS_PARADO, QUADROS_PARADO);

  const dir = `${OUT}/${tipo}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/walk.png`, encode(andar.w, andar.h, andar.px));
  writeFileSync(`${dir}/idle.png`, encode(parado.w, parado.h, parado.px));

  const m = medeConteudo(img, cell);
  const escala = ESCALA[tipo] ?? 1;
  // A ancora e a linha logo ABAIXO do ultimo pixel: e ali que o pe assenta.
  const anchorY = (m.base + 1) / cell;
  const anchorX = (m.esq + m.dir + 1) / 2 / cell;
  // A etiqueta de nome sobe a altura desenhada, mais uma folga de 6 px.
  const labelTop = -(m.altura * escala) - 6;

  linhasCfg.push(
    `  ${tipo}: { cell: ${cell}, scale: ${escala}, anchorX: ${anchorX}, anchorY: ${anchorY}, labelTop: ${labelTop} },`
    + ` // ${m.altura}px de conteudo -> ${m.altura * escala}px na tela`,
  );
  console.log(
    `✅ ${tipo.padEnd(11)} cell=${String(cell).padStart(2)}  andar 6q  parado 4q  `
    + `conteudo ${m.largura}x${m.altura}  pe em y=${m.base + 1}  escala ${escala}x -> ${m.altura * escala}px`,
  );
}

console.log('\n--- cole em CREATURE_SHEETS (client/src/miniworld.ts) ---');
console.log(linhasCfg.join('\n'));
