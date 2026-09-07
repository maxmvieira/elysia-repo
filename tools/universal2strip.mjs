/**
 * Monta a tira do PERSONAGEM UNIVERSAL a partir das folhas do autosprite.io.
 *
 * 🔴 **O que entra é MUITO diferente do que o jogo lê.** As folhas do
 * autosprite vêm com **uma direção por arquivo** e **56 quadros** de 128 px,
 * em 8 colunas × 7 linhas. O motor quer o contrário: **um arquivo** com uma
 * LINHA por direção.
 *
 * 🔴 **O passo é regido pelo CHÃO, não por um relógio** (`main.ts`): cada tile
 * atravessado consome META DE do ciclo de passos, e a perna alterna a cada
 * tile. É isso que impede o "deslize" que o dono relatou em agosto, e é a
 * razão de a tira precisar conter um ciclo INTEIRO e fechado — começando e
 * terminando no mesmo ponto da passada.
 *
 * ⚠️ **Onde o ciclo começa e termina foi MEDIDO, não escolhido.** A abertura
 * dos pés no PERFIL (as 18 linhas de baixo do quadro) varia de 20 px a 57 px:
 * contato em 0 e 25, passagem em 9 e 18-19. No quadro de FRENTE a altura varia
 * só 3 px em 93 e não serve para nada — de frente as pernas se movem em direção
 * à câmera. Ver o bloco `QUADROS`.
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
 * 🔴 **A AMOSTRAGEM DO CICLO — e por que ela deixou de ser quatro.**
 *
 * A primeira versão tirava 4 quadros: `[passagem-A, contato-A, passagem-B,
 * contato-B]`. Funcionava e ficava PICADO, porque o motor só tinha **duas
 * poses por tile** atravessado. O dono viu jogando: *"faça a movimentação mais
 * fluida"*.
 *
 * Agora são `N` quadros de um ciclo INTEIRO, e o motor varre continuamente a
 * metade que corresponde ao tile. A sincronia com o chão — o que matou o
 * "deslize" em agosto — fica intacta: **um passo por tile continua sendo um
 * passo por tile**; o que muda é quantas poses cabem dentro dele.
 *
 * ⚠️ **O ciclo da fonte tem 25 quadros.** Medido pela abertura dos pés no
 * perfil: contato em 0 e em 25, passagem em 9 e em 18-19. As duas metades são
 * `[0..12]` e `[13..24]`, cada uma indo de um contato ao contato seguinte.
 *
 * 🔴 **Cada metade termina em CONTATO, e é intencional:** a pisada cai na borda
 * do tile, que é onde o olho a espera. No meio da metade as pernas se cruzam, e
 * é lá que o `bob` de 1 px levanta o tronco.
 */
/** Quadros por ciclo na tira. METADE deles é consumida por tile atravessado. */
const N = 16;
/** Primeiro e último quadro do ciclo na FOLHA de origem (contato a contato). */
const CICLO = [0, 25];

/**
 * Os `N` índices, amostrados uniformemente dentro do ciclo.
 *
 * ⚠️ **Amostragem uniforme é correta AQUI, e não era com quatro.** Com quatro
 * quadros os índices tinham de cair exatamente em passagem e contato, senão a
 * perna não casava com o chão. Com dezesseis a curva inteira é reproduzida, e
 * cada quadro cai onde tem de cair sozinho.
 */
const QUADROS = Array.from(
  { length: N },
  (_, i) => Math.round(CICLO[0] + ((CICLO[1] - CICLO[0]) * i) / N) % 56,
);

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

/**
 * Centro horizontal dos PÉS — as `alturaPes` linhas logo acima da sola.
 *
 * 🔴 Existe por causa do ataque. A caminhada podia ser alinhada só na vertical
 * porque o corpo fica sempre no meio da célula; no golpe a ESPADA estende para
 * um lado e desloca a caixa de alpha inteira. Alinhar pelo centro do conteúdo
 * puxaria o corpo para trás toda vez que a lâmina saísse — o personagem
 * "recuaria" ao atacar. Os pés não mentem: eles ficam onde o personagem está.
 */
function centroDosPes(q, alturaPes = 10) {
  const chao = chaoDe(q);
  if (chao < 0) return CELL / 2;
  let x0 = 1e9, x1 = -1;
  for (let y = Math.max(0, chao - alturaPes); y <= chao; y++) {
    for (let x = 0; x < CELL; x++) {
      if (q[(y * CELL + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    }
  }
  return x1 < 0 ? CELL / 2 : (x0 + x1) / 2;
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
function cola(tira, tiraW, q, col, row, dxPedido = 0) {
  const dy = GROUND_Y - chaoDe(q);
  const dx = Math.round(dxPedido);
  for (let y = 0; y < CELL; y++) {
    const alvo = y + dy;
    if (alvo < 0 || alvo >= CELL) continue;
    // ⚠️ Com `dx` a cópia deixa de ser uma linha inteira: cada pixel pode cair
    // fora da célula, e deixá-lo entrar arrastaria o desenho para a coluna
    // vizinha da tira.
    for (let x = 0; x < CELL; x++) {
      const ax = x + dx;
      if (ax < 0 || ax >= CELL) continue;
      const de = (y * CELL + x) * 4;
      const para = ((row * CELL + alvo) * tiraW + col * CELL + ax) * 4;
      q.copy(tira, para, de, de + 4);
    }
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
  up_right: decode(join(ORIGEM, 'walk_up_right.png')),
  down_right: decode(join(ORIGEM, 'walk_down_right.png')),
};

/**
 * 🔴 **A ORDEM DAS LINHAS É CONTRATO com `heroes.ts`.** Trocar duas faz o
 * personagem andar de costas para onde vai, e nada no motor tem como perceber.
 *
 * As quatro cardinais vêm primeiro: é o que uma tira de 4 linhas contém, e o
 * `fatia` decide entre 4 e 8 pela ALTURA da folha. Assim a mesma ordem serve aos
 * dois formatos.
 */
const LINHAS = [
  'down', 'up', 'right', 'left',
  'up_right', 'up_left', 'down_right', 'down_left',
];

/**
 * De qual folha sai cada linha, e se ela é espelhada.
 *
 * 🔴 **O autosprite entrega só o lado DIREITO**, e é o suficiente: num conjunto
 * de 8 direções o lado esquerdo é o espelho exato do direito. São cinco folhas
 * para oito direções.
 */
const FONTE = {
  down: ['down', false],
  up: ['up', false],
  right: ['right', false],
  left: ['right', true],
  up_right: ['up_right', false],
  up_left: ['up_right', true],
  down_right: ['down_right', false],
  down_left: ['down_right', true],
};

const tiraW = CELL * QUADROS.length;
const tiraH = CELL * LINHAS.length;
const tira = Buffer.alloc(tiraW * tiraH * 4);

for (let row = 0; row < LINHAS.length; row++) {
  const dir = LINHAS[row];
  // ⚠️ A ESQUERDA é a direita espelhada. O autosprite entrega cinco direções
  // (as três daqui mais duas diagonais), e nenhuma delas é a esquerda — num
  // conjunto de 8 direções ela seria o espelho da direita, que é o que fazemos.
  const [fonte, espelhado] = FONTE[dir];
  QUADROS.forEach((n, col) => {
    const bruto = recorta(folhas[fonte], n);
    const q = espelhado ? espelha(bruto) : bruto;
    cola(tira, tiraW, q, col, row);
  });
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, 'walk.png'), encode(tiraW, tiraH, tira));

/**
 * O `idle` é o quadro de CONTATO — o índice 0 do ciclo, onde o pé está no chão.
 *
 * 🔴 Sem `idle` o motor congela no quadro 0 do `walk`, que aqui é uma
 * PASSAGEM: o boneco ficaria parado com as pernas no ar, no meio de um passo.
 * Um quadro de contato é a pose de pé.
 */
const idleW = CELL, idleH = CELL * LINHAS.length;
const idle = Buffer.alloc(idleW * idleH * 4);
for (let row = 0; row < LINHAS.length; row++) {
  const dir = LINHAS[row];
  const [fonte, espelhado] = FONTE[dir];
  const cru = recorta(folhas[fonte], QUADROS[0]);
  const q = espelhado ? espelha(cru) : cru;
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

// ---------------------------------------------------------------------------
// ⚔️ GOLPE DE ESPADA
// ---------------------------------------------------------------------------

/**
 * 🔴 **A folha do golpe vem em 256 px por célula — o DOBRO da caminhada.**
 * Medido: a sola cai em 220 contra 110, e o corpo tem 186 px contra 93. É o
 * mesmo personagem exportado com o dobro de resolução, provavelmente porque a
 * espada estendida não caberia em 128.
 *
 * Por isso a redução para 80 px é de 256 (fator 0,3125) e não de 128 — e o
 * corpo cai nos mesmos ~58 px da caminhada, que é o que faz o golpe não mudar
 * de tamanho no meio da luta.
 */
const ATAQUE_COLS = 8;

/**
 * 🔴 **A janela do golpe, MEDIDA pela extensão horizontal.** Ao longo dos 64
 * quadros a largura do conteúdo (a espada esticando) desenha o gesto:
 *
 *   0–9    ~126–161  parado e recuando para armar
 *   10–25  ~163      espada erguida, PARADA (a folha segura a pose)
 *   26–31  151→202   o golpe começa a descer
 *   32–48  189–216   a lâmina estendida — o impacto
 *   49–55  196→124   recolhendo
 *   56–63  ~161      de volta ao repouso
 *
 * ⚠️ **Os quadros 10 a 25 são descartados de propósito.** São dezesseis quadros
 * de espada parada no ar: no jogo isso seria meio segundo de personagem
 * congelado antes de bater. O golpe útil é a janela abaixo.
 */
const ATAQUE_CICLO = [26, 54];
/** Quantos quadros o golpe leva para a tira. */
const ATAQUE_N = 8;
const ATAQUE_QUADROS = Array.from(
  { length: ATAQUE_N },
  (_, i) => Math.round(ATAQUE_CICLO[0] + ((ATAQUE_CICLO[1] - ATAQUE_CICLO[0]) * i) / (ATAQUE_N - 1)),
);

const golpe = decode(join(ORIGEM, 'attack_sword.png'));

/** Recorta da folha do golpe, que tem `ATAQUE_COLS` colunas. */
function recortaGolpe(n) {
  const cx = (n % ATAQUE_COLS) * CELL, cy = Math.floor(n / ATAQUE_COLS) * CELL;
  const out = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++) {
    const de = ((cy + y) * golpe.w + cx) * 4;
    golpe.px.copy(out, y * CELL * 4, de, de + CELL * 4);
  }
  return out;
}

/**
 * O centro dos pés na CAMINHADA — a referência que o golpe tem de respeitar.
 *
 * 🔴 Sem isto o personagem dá um passo lateral ao atacar: as duas folhas foram
 * exportadas com o corpo em posições um pouco diferentes dentro da moldura, e a
 * diferença só aparece quando as duas animações se alternam.
 */
const REF_PES_X = centroDosPes(recorta(folhas.down, QUADROS[0]));

const golpeW = CELL * ATAQUE_N;
const golpeH = CELL * LINHAS.length;
const tiraGolpe = Buffer.alloc(golpeW * golpeH * 4);

for (let row = 0; row < LINHAS.length; row++) {
  const dir = LINHAS[row];
  ATAQUE_QUADROS.forEach((n, col) => {
    const bruto = recortaGolpe(n);
    /*
     * ⚠️ **A folha do golpe só tem o PERFIL.** As quatro linhas saem dela: a
     * direita como veio, a esquerda espelhada, e cima/baixo **também de
     * perfil** — como placeholder.
     *
     * 🔴 Isto é visível e é a maior limitação deste pack: atacar para cima ou
     * para baixo mostra o personagem de lado. Consertar exige as folhas de
     * frente e de costas do golpe, que o autosprite ainda não gerou. Está no
     * HANDOFF.
     */
    const q = FONTE[dir][1] ? espelha(bruto) : bruto;
    cola(tiraGolpe, golpeW, q, col, row, REF_PES_X - centroDosPes(q));
  });
}
writeFileSync(join(DESTINO, 'attack_sword.png'), encode(golpeW, golpeH, tiraGolpe));

const m = metricas(tira, tiraW, tiraH);
console.log(`walk.png          ${tiraW}x${tiraH}  (${QUADROS.length} quadros x ${LINHAS.length} direcoes)`);
console.log(`idle.png          ${idleW}x${idleH}`);
console.log(`attack_sword.png  ${golpeW}x${golpeH}  (${ATAQUE_N} quadros, dos ${ATAQUE_CICLO[0]}-${ATAQUE_CICLO[1]} da folha)`);
console.log('');
console.log('Para o PACK em client/src/heroes.ts:');
console.log(`  cell: ${CELL}, contentH: ${m.alturaConteudo}, feetY: ${GROUND_Y}, ` +
  `centerX: ${m.centroX}, targetH: ${m.alturaConteudo},`);
console.log('');
console.log(`(topo do conteudo na celula: ${m.topo}; sola garantida em ${GROUND_Y})`);
