/**
 * Prepara as folhas do autosprite.io para o `universal2strip.mjs`.
 *
 * 🔴 **ESTE PASSO ERA FEITO NA MÃO, e é onde o projeto quase se enganou.**
 *
 * O `universal2strip.mjs` diz, em texto, que espera as folhas "já
 * reescalonadas (128 → 80 px por célula, com ffmpeg)". Isso funcionava enquanto
 * TODAS as folhas tinham a mesma célula. As de 07/09 não têm:
 *
 * | folha                    | célula | grade |
 * |--------------------------|--------|-------|
 * | quase todas              | 256    | 8 × n |
 * | `male idle_right`        | **768**| 7 × 4 |
 * | `male idle_up`           | 256    | 8 × 7 · **PNG de PALETA, não RGBA** |
 *
 * Escalar as vinte pelo mesmo fator deixaria uma delas com o personagem TRÊS
 * VEZES maior — a versão adulta da armadilha que o HANDOFF registra ("a sola em
 * 220 contra 110 é o sinal"). Por isso a grade é **medida por arquivo**, nunca
 * suposta pelo nome ou pelo tamanho.
 *
 * ⚠️ A medição é por FAIXA VAZIA de alpha, não por divisão: `2048 / 8 = 256` e
 * `2048 / 16 = 128` são os dois inteiros, e só o desenho diz qual é o certo.
 *
 * ⚠️ O reescalonamento continua no ffmpeg (`flags=lanczos`), de propósito: ele
 * reamostra melhor do que qualquer coisa escrita à mão aqui, e é offline.
 *
 * ## Uso
 *
 *   node tools/universal-fonte.mjs [pasta-de-origem]
 *
 * A origem tem `male/` e `female/`, cada uma com `iddle/` e `walk/`. Sai em
 * `arte-fonte/universal/<sexo>/<anim>_<direcao>.png`, com célula de 80 px.
 */

import { readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

/** Lado da célula que o `universal2strip.mjs` espera. */
const CELL = 80;

const ORIGEM = resolve(process.argv[2] ?? 'C:/Users/ADMIN/Desktop/spritesheet');
const DESTINO = resolve('arte-fonte/universal');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

/**
 * Nome do autosprite → nome do jogo.
 *
 * 🔴 `northeast` é `up_right` e `southeast` é `down_right`. A tradução mora
 * aqui e em nenhum outro lugar: o resto do pipeline só conhece os nomes do
 * jogo, e o contrato de linhas do `heroes.ts` é escrito neles.
 */
const DIRECAO = {
  down: 'down',
  up: 'up',
  right: 'right',
  northeast: 'up_right',
  southeast: 'down_right',
};

/** Decodifica só o suficiente para medir: devolve um mapa de alpha. */
function alphaDe(caminho) {
  const buf = readFileSync(caminho);
  let off = 8, w = 0, h = 0, ct = 0, bd = 0, trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
    else if (t === 'tRNS') trns = d;
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  if (bd !== 8) throw new Error(`${caminho}: bitDepth ${bd} não suportado`);
  const canais = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * canais;
  const px = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const line = raw.subarray(q, q + stride); q += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
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
  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    if (ct === 6) alpha[i] = px[i * 4 + 3];
    else if (ct === 3) alpha[i] = trns ? (trns[px[i]] ?? 255) : 255;
    else alpha[i] = 255;
  }
  return { w, h, ct, alpha };
}

/** Quantas faixas de conteúdo existem ao longo de um eixo. */
function bandas(vazio) {
  let n = 0;
  for (let i = 0; i < vazio.length; i++) if (!vazio[i] && (i === 0 || vazio[i - 1])) n++;
  return n;
}

/**
 * A grade REAL da folha: colunas, linhas e o lado da célula.
 *
 * 🔴 Conta as faixas de conteúdo, e só então divide. É a única leitura que
 * distingue "8 colunas de 256" de "16 colunas de 128" — as duas dividem 2048.
 */
function grade(img) {
  const colVazia = new Array(img.w).fill(true);
  const linVazia = new Array(img.h).fill(true);
  for (let y = 0; y < img.h; y++) {
    const base = y * img.w;
    for (let x = 0; x < img.w; x++) {
      if (img.alpha[base + x] > 8) { colVazia[x] = false; linVazia[y] = false; }
    }
  }
  const cols = bandas(colVazia);
  const lins = bandas(linVazia);
  if (cols === 0 || lins === 0) throw new Error('folha vazia');
  const cell = img.w / cols;
  if (!Number.isInteger(cell)) {
    throw new Error(`largura ${img.w} não divide por ${cols} colunas`);
  }
  /*
   * ⚠️ A ÚLTIMA FILEIRA COSTUMA VIR INCOMPLETA (o autosprite corta onde a
   * animação acaba), então `h / cell` é a contagem confiável de linhas —
   * as faixas de conteúdo dariam o mesmo número só por sorte.
   */
  if (img.h % cell !== 0) {
    throw new Error(`altura ${img.h} não é múltipla da célula ${cell}`);
  }
  return { cols, linhas: img.h / cell, cell, lins };
}

// ---------------------------------------------------------------------------

if (!existsSync(ORIGEM)) {
  console.error(`\n[fonte] origem não existe: ${ORIGEM}\n`);
  process.exit(1);
}

let feitas = 0, pulos = 0;
for (const sexo of ['male', 'female']) {
  for (const [pasta, anim] of [['iddle', 'idle'], ['walk', 'walk']]) {
    const dir = join(ORIGEM, sexo, pasta);
    if (!existsSync(dir)) { console.warn(`[fonte] sem ${sexo}/${pasta}`); continue; }

    for (const arquivo of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
      const m = /-iso_(idle|walk)_([a-z]+)/.exec(arquivo);
      if (!m) { console.warn(`[fonte] nome fora do padrão, pulado: ${arquivo}`); pulos++; continue; }
      const [, animArq, dirArq] = m;
      const destinoDir = DIRECAO[dirArq];
      if (!destinoDir) { console.warn(`[fonte] direção desconhecida: ${dirArq}`); pulos++; continue; }
      if (animArq !== anim) console.warn(`[fonte] ${arquivo} está em ${pasta}/ mas diz ${animArq}`);

      const origem = join(dir, arquivo);
      const img = alphaDe(origem);
      const g = grade(img);
      const alvoW = g.cols * CELL;
      const alvoH = g.linhas * CELL;

      const saidaDir = join(DESTINO, sexo);
      mkdirSync(saidaDir, { recursive: true });
      const saida = join(saidaDir, `${animArq}_${destinoDir}.png`);

      const r = spawnSync(
        FFMPEG,
        ['-y', '-loglevel', 'error', '-i', origem,
          '-vf', `scale=${alvoW}:${alvoH}:flags=lanczos`,
          '-pix_fmt', 'rgba', saida],
        { encoding: 'utf8' },
      );
      if (r.status !== 0) {
        console.error(`[fonte] ✗ ${arquivo}\n${r.stderr ?? ''}${r.error ?? ''}`);
        pulos++;
        continue;
      }
      console.log(
        `[fonte] ✓ ${sexo}/${animArq}_${destinoDir}  ` +
          `${img.w}x${img.h} célula ${g.cell} (${g.cols}x${g.linhas})` +
          ` → ${alvoW}x${alvoH} célula ${CELL}` +
          (img.ct !== 6 ? '  [origem em PALETA]' : ''),
      );
      feitas++;
    }
  }
}

console.log(`\n[fonte] ${feitas} folha(s) em ${DESTINO}${pulos ? `, ${pulos} pulada(s)` : ''}`);
if (pulos) process.exit(1);
