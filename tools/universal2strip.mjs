/**
 * Monta as tiras do PERSONAGEM UNIVERSAL — **masculino e feminino** — a partir
 * das folhas do autosprite.io.
 *
 * 🔴 **O que entra é MUITO diferente do que o jogo lê.** As folhas do
 * autosprite vêm com **uma direção por arquivo**; o motor quer o contrário:
 * **um arquivo** com uma LINHA por direção.
 *
 * 🔴 **O passo é regido pelo CHÃO, não por um relógio** (`main.ts`): cada tile
 * atravessado consome METADE do ciclo de passos, e a perna alterna a cada
 * tile. É isso que impede o "deslize" que o dono relatou em agosto, e é a
 * razão de a tira precisar conter um ciclo INTEIRO e fechado.
 *
 * ---
 *
 * ## 🔴 O QUE MUDOU EM 2026-09-07, E POR QUE ERA OBRIGATÓRIO
 *
 * A versão anterior tinha o ciclo **cravado em constante**: `CICLO = [0, 25]`,
 * medido à mão numa folha de 56 quadros. As folhas novas quebram essa premissa
 * de três jeitos ao mesmo tempo, e cada um sozinho já daria arte errada em
 * silêncio:
 *
 * | | |
 * |---|---|
 * | **Contagem de quadros varia por FOLHA** | 29 ou 55, e não pelo mesmo motivo |
 * | **Varia entre os SEXOS na mesma direção** | `walk_down` tem 55 no masculino e 29 no feminino |
 * | **Algumas folhas trazem DOIS ciclos** | 55 quadros = duas passadas completas |
 *
 * 🔴 **É o terceiro que mata.** Amostrar 16 quadros ao longo de uma folha de
 * dois ciclos daria **dois passos por tile** atravessado, contra um passo do
 * outro sexo — o personagem feminino andaria com as pernas no dobro da
 * frequência, e o defeito não daria erro nenhum: sairia arte "quase certa".
 *
 * ✅ **A solução é MEDIR, não constar.** A abertura dos pés no perfil desenha a
 * passada: fechada na passagem, aberta no contato. Contando as passagens
 * sai o número de ciclos, e daí o comprimento de UM ciclo. Ver `ciclosDe()`.
 *
 * ⚠️ **Só o PERFIL serve para medir.** Medido nas folhas de 07/09: de lado a
 * abertura vai de 42 a 110 px; **de frente varia 9 px** (31 a 40), porque as
 * pernas se movem em direção à câmera. Por isso o período sai da folha `right`
 * e as outras quatro direções o herdam.
 *
 * ## Uso
 *
 *   node tools/universal-fonte.mjs     # 1. reduz as folhas para 80 px/célula
 *   node tools/universal2strip.mjs     # 2. monta as tiras
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join } from 'node:path';

/** Lado da célula, depois do reescalonamento feito por `universal-fonte.mjs`. */
const CELL = 80;

/** Quadros por ciclo na tira de caminhada. METADE é consumida por tile. */
const N = 16;

/** Quadros na tira de parado. O `idle` é sutil; não precisa da mesma densidade. */
const N_IDLE = 12;

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
  /*
   * ⚠️ Uma das folhas de 07/09 (`male idle_up`) veio em PNG de PALETA, e este
   * decodificador só lê RGBA. Não é caso de ensinar paleta aqui: o
   * `universal-fonte.mjs` já normaliza tudo com `-pix_fmt rgba`. Se este erro
   * aparecer, o passo 1 não foi rodado.
   */
  if (ct !== 6) throw new Error(`${path}: esperado RGBA, veio colorType ${ct} — rode tools/universal-fonte.mjs`);
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
// Folha: a grade e quantos quadros ela realmente tem
// ---------------------------------------------------------------------------

/**
 * Abre uma folha e conta os quadros COM CONTEÚDO.
 *
 * ⚠️ **A última fileira quase sempre vem incompleta** — o autosprite corta onde
 * a animação acaba, não onde a grade fecha. `cols × linhas` daria 56 numa folha
 * de 51 quadros, e os cinco vazios entrariam na tira como buracos.
 */
function abre(caminho) {
  const img = decode(caminho);
  const cols = Math.max(1, Math.round(img.w / CELL));
  const linhas = Math.max(1, Math.round(img.h / CELL));
  let ultimo = -1;
  for (let n = 0; n < cols * linhas; n++) {
    const cx = (n % cols) * CELL, cy = Math.floor(n / cols) * CELL;
    let tem = false;
    for (let y = cy; y < cy + CELL && !tem; y++) {
      for (let x = cx; x < cx + CELL; x++) {
        if (img.px[(y * img.w + x) * 4 + 3] > 8) { tem = true; break; }
      }
    }
    if (tem) ultimo = n;
  }
  if (ultimo < 0) throw new Error(`${caminho}: folha vazia`);
  return { img, cols, linhas, quadros: ultimo + 1, caminho };
}

/** Recorta o quadro `n` da folha (leitura em linha, `f.cols` por fileira). */
function recorta(f, n) {
  const cx = (n % f.cols) * CELL, cy = Math.floor(n / f.cols) * CELL;
  const out = Buffer.alloc(CELL * CELL * 4);
  for (let y = 0; y < CELL; y++) {
    const de = ((cy + y) * f.img.w + cx) * 4;
    f.img.px.copy(out, y * CELL * 4, de, de + CELL * 4);
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
 * Centro horizontal dos PÉS — as `alturaPes` linhas logo acima da sola.
 *
 * 🔴 Existe por causa do ataque. A caminhada podia ser alinhada só na vertical
 * porque o corpo fica sempre no meio da célula; no golpe a ESPADA estende para
 * um lado e desloca a caixa de alpha inteira. Os pés não mentem: eles ficam
 * onde o personagem está.
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

/** Abertura dos pés: largura do conteúdo nas 18 linhas acima da sola. */
function aberturaDosPes(q) {
  const chao = chaoDe(q);
  if (chao < 0) return null;
  let x0 = 1e9, x1 = -1;
  for (let y = Math.max(0, chao - 18); y <= chao; y++) {
    for (let x = 0; x < CELL; x++) {
      if (q[(y * CELL + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    }
  }
  return x1 < 0 ? null : x1 - x0;
}

/**
 * 🔴 **QUANTOS CICLOS DE PASSADA a folha contém.** É a medida que substituiu a
 * constante `CICLO = [0, 25]`.
 *
 * Uma passada completa tem **duas passagens** — uma por perna, o instante em
 * que os pés se cruzam e a abertura é mínima. Contar as passagens e dividir por
 * dois dá o número de ciclos, e daí o comprimento de um.
 *
 * ⚠️ O corte em 35 % da faixa é o que separa "passagem" de "ruído de
 * reamostragem": a abertura cai a menos da metade na passagem, então qualquer
 * corte entre 25 % e 50 % dá o mesmo resultado nas folhas de 07/09. Fora dessa
 * folga o número mudaria, e por isso a contagem é IMPRESSA — quem trocar as
 * folhas confere no log em vez de descobrir em tela.
 *
 * ⚠️ A janela dá a volta: uma passagem pode começar no fim da folha e terminar
 * no começo, porque a folha é um loop fechado.
 */
function ciclosDe(f) {
  const serie = [];
  for (let n = 0; n < f.quadros; n++) serie.push(aberturaDosPes(recorta(f, n)));
  const vals = serie.filter((v) => v !== null);
  if (vals.length < 6) return { ciclos: 1, serie };
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const corte = lo + (hi - lo) * 0.35;
  const baixo = serie.map((v) => v !== null && v <= corte);
  let passagens = 0;
  for (let i = 0; i < baixo.length; i++) {
    const anterior = baixo[(i - 1 + baixo.length) % baixo.length];
    if (baixo[i] && !anterior) passagens++;
  }
  return { ciclos: Math.max(1, Math.round(passagens / 2)), passagens, serie, lo, hi };
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
// Contrato de linhas
// ---------------------------------------------------------------------------

/**
 * 🔴 **A ORDEM DAS LINHAS É CONTRATO com `heroes.ts`.** Trocar duas faz o
 * personagem andar de costas para onde vai, e nada no motor tem como perceber.
 *
 * As quatro cardinais vêm primeiro: é o que uma tira de 4 linhas contém, e o
 * `fatia` decide entre 4 e 8 pela ALTURA da folha.
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

const DIRECOES = ['down', 'up', 'right', 'up_right', 'down_right'];

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

const ORIGEM = 'arte-fonte/universal';
const DESTINO_BASE = 'client/public/assets/classes-universal';

/**
 * Monta as tiras de um sexo.
 *
 * 🔴 O período da passada sai do PERFIL e as outras direções o herdam. Medir
 * cada direção por si daria números diferentes de propósito errado: de frente a
 * abertura dos pés quase não varia, e o corte cairia em ruído.
 */
function monta(sexo) {
  const dir = join(ORIGEM, sexo);
  if (!existsSync(dir)) { console.warn(`[strip] sem folhas para ${sexo}, pulado`); return null; }

  const walk = {};
  const idle = {};
  for (const d of DIRECOES) {
    walk[d] = abre(join(dir, `walk_${d}.png`));
    idle[d] = abre(join(dir, `idle_${d}.png`));
  }

  // --- o período da passada, medido no perfil -------------------------------
  const medida = ciclosDe(walk.right);
  const passoPerfil = walk.right.quadros / medida.ciclos;
  console.log(
    `\n[${sexo}] perfil: ${walk.right.quadros} quadros · abertura ${medida.lo}–${medida.hi}px · ` +
      `${medida.passagens} passagens → ${medida.ciclos} ciclo(s) · passada = ${passoPerfil.toFixed(1)} quadros`,
  );

  /** Os `N` índices de UM ciclo desta folha, amostrados uniformemente. */
  const indicesDe = (f, quantos) => {
    const ciclos = Math.max(1, Math.round(f.quadros / passoPerfil));
    const passo = f.quadros / ciclos;
    return {
      ciclos,
      passo,
      idx: Array.from({ length: quantos }, (_, i) => Math.round((passo * i) / quantos) % f.quadros),
    };
  };

  const destino = join(DESTINO_BASE, sexo);
  mkdirSync(destino, { recursive: true });

  // --- caminhada ------------------------------------------------------------
  const tiraW = CELL * N;
  const tiraH = CELL * LINHAS.length;
  const tira = Buffer.alloc(tiraW * tiraH * 4);
  for (let row = 0; row < LINHAS.length; row++) {
    const [fonte, espelhado] = FONTE[LINHAS[row]];
    const f = walk[fonte];
    const { idx } = indicesDe(f, N);
    idx.forEach((n, col) => {
      const bruto = recorta(f, n);
      cola(tira, tiraW, espelhado ? espelha(bruto) : bruto, col, row);
    });
  }
  writeFileSync(join(destino, 'walk.png'), encode(tiraW, tiraH, tira));

  for (const d of DIRECOES) {
    const { ciclos, passo } = indicesDe(walk[d], N);
    console.log(
      `        walk_${d.padEnd(10)} ${String(walk[d].quadros).padStart(3)} quadros ` +
        `= ${ciclos} ciclo(s) de ${passo.toFixed(1)}`,
    );
  }

  // --- parado ---------------------------------------------------------------
  /*
   * ⚠️ O `idle` é tratado como UM loop fechado ao longo da folha inteira: ele
   * não tem passada para medir (a abertura dos pés é constante — medido 74 px
   * em todos os 56 quadros do `male idle_up`). Se um dia uma folha de idle vier
   * com dois ciclos, a respiração sai no dobro da velocidade — visível, não
   * quebrado, e o log abaixo denuncia pela contagem de quadros.
   */
  const idleW = CELL * N_IDLE;
  const idleH = CELL * LINHAS.length;
  const tiraIdle = Buffer.alloc(idleW * idleH * 4);
  for (let row = 0; row < LINHAS.length; row++) {
    const [fonte, espelhado] = FONTE[LINHAS[row]];
    const f = idle[fonte];
    for (let col = 0; col < N_IDLE; col++) {
      const n = Math.round((f.quadros * col) / N_IDLE) % f.quadros;
      const bruto = recorta(f, n);
      cola(tiraIdle, idleW, espelhado ? espelha(bruto) : bruto, col, row);
    }
  }
  writeFileSync(join(destino, 'idle.png'), encode(idleW, idleH, tiraIdle));
  console.log(`        idle: ${DIRECOES.map((d) => `${d}=${idle[d].quadros}`).join(' ')}`);

  /**
   * `pose.png` é o quadro 0 do `idle`, com uma coluna só.
   *
   * ⚠️ Não é redundância à toa: `heroIconCss` monta o retrato do cartão da tela
   * de criação por CSS, e imagem de CSS que falta **não dá erro** — o cartão só
   * fica vazio. E ele precisa de UMA célula: apontar para a tira animada
   * mostraria os doze quadros lado a lado dentro do retrato.
   */
  const poseW = CELL, poseH = CELL * LINHAS.length;
  const pose = Buffer.alloc(poseW * poseH * 4);
  for (let row = 0; row < LINHAS.length; row++) {
    const [fonte, espelhado] = FONTE[LINHAS[row]];
    const bruto = recorta(idle[fonte], 0);
    cola(pose, poseW, espelhado ? espelha(bruto) : bruto, 0, row);
  }
  writeFileSync(join(destino, 'pose.png'), encode(poseW, poseH, pose));

  // --- golpe ----------------------------------------------------------------
  /*
   * ⚠️ **O GOLPE SÓ EXISTE PARA O MASCULINO, e é herança.** A folha
   * `attack_sword.png` é a de 07/09 de manhã, do personagem antigo, e continua
   * na raiz de `arte-fonte/universal/`. O autosprite ainda não gerou golpe
   * para nenhum dos dois personagens novos.
   *
   * 🔴 Isso significa que o masculino ataca com uma arte que pode não ser
   * exatamente o mesmo boneco da caminhada nova, e o feminino **não ataca**: o
   * `attackPoseFallback` do `heroes.ts` não acha `attack_sword` e o motor cai
   * no pulinho de investida. Está registrado no HANDOFF.
   */
  const golpePath = join(ORIGEM, 'attack_sword.png');
  if (sexo === 'male' && existsSync(golpePath)) {
    const ATAQUE_COLS = 8;
    const ATAQUE_CICLO = [26, 54];
    const ATAQUE_N = 8;
    const idxGolpe = Array.from(
      { length: ATAQUE_N },
      (_, i) => Math.round(ATAQUE_CICLO[0] + ((ATAQUE_CICLO[1] - ATAQUE_CICLO[0]) * i) / (ATAQUE_N - 1)),
    );
    const golpe = decode(golpePath);
    const fGolpe = { img: golpe, cols: ATAQUE_COLS };
    const refPes = centroDosPes(recorta(walk.down, 0));
    const golpeW = CELL * ATAQUE_N, golpeH = CELL * LINHAS.length;
    const tiraGolpe = Buffer.alloc(golpeW * golpeH * 4);
    for (let row = 0; row < LINHAS.length; row++) {
      idxGolpe.forEach((n, col) => {
        const bruto = recorta(fGolpe, n);
        const q = FONTE[LINHAS[row]][1] ? espelha(bruto) : bruto;
        cola(tiraGolpe, golpeW, q, col, row, refPes - centroDosPes(q));
      });
    }
    writeFileSync(join(destino, 'attack_sword.png'), encode(golpeW, golpeH, tiraGolpe));
    console.log(`        attack_sword: ${ATAQUE_N} quadros (herdado da folha antiga, só de perfil)`);
  } else if (sexo === 'female') {
    console.log('        attack_sword: AUSENTE — o autosprite ainda não gerou golpe feminino');
  }

  const m = metricas(tira, tiraW, tiraH);
  console.log(
    `        tiras: walk ${tiraW}x${tiraH} · idle ${idleW}x${idleH} · pose ${poseW}x${poseH}`,
  );
  return m;
}

const medidas = {};
for (const sexo of ['male', 'female']) {
  const m = monta(sexo);
  if (m) medidas[sexo] = m;
}

console.log('\nPara o PACK em client/src/heroes.ts:');
for (const [sexo, m] of Object.entries(medidas)) {
  console.log(
    `  ${sexo.padEnd(7)} cell: ${CELL}, contentH: ${m.alturaConteudo}, feetY: ${GROUND_Y}, ` +
      `centerX: ${m.centroX}, targetH: ${m.alturaConteudo},   (topo do conteudo: ${m.topo})`,
  );
}
