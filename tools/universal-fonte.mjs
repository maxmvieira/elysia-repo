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

/**
 * Os lotes que a origem pode ter: a pasta, o nome que a animação recebe no
 * jogo, e o padrão do nome de arquivo.
 *
 * 🔴 **O nome do arquivo muda de lote para lote, e não dá para deduzir.** Já
 * apareceram três formas: `-iso_walk_<dir>`, `-iso_custom_bow_atack_<dir>` e
 * `-iso_custom_casting_spell_<dir>`. É a mesma lição dos packs CraftPix
 * registrada em 01/09 — a âncora é o nome INTEIRO, de lista fechada, nunca
 * "casar por continha".
 *
 * ⚠️ A pasta do arco vem com **espaço** no nome (`bow atack`) e com a grafia do
 * autosprite. Nomes de pasta são dados de entrada, não se corrigem aqui.
 */
const LOTES = [
  { pasta: 'iddle', anim: 'idle', re: /-iso_idle_([a-z]+)\b/ },
  { pasta: 'walk', anim: 'walk', re: /-iso_walk_([a-z]+)\b/ },
  /*
   * ⚠️ **`atack` OU `attack`, e as duas grafias são de propósito.** O primeiro
   * lote veio com a animação batizada `bow atack` no autosprite, e o nome do
   * arquivo herda o erro de digitação. Exigir a grafia errada obrigaria quem
   * gera a próxima folha a REPETIR o engano — e escrever certo cairia em "nome
   * fora do padrão, pulado", que é um aviso fácil de não ler.
   */
  { pastas: ['bow atack', 'bow attack'], anim: 'bow', re: /-iso_custom_bow_att?ack_([a-z]+)\b/ },
  { pastas: ['spellcasting', 'casting spell'], anim: 'cast', re: /-iso_custom_casting_spell_([a-z]+)\b/ },
];

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

/** Onde começa cada faixa de conteúdo ao longo de um eixo. */
function inicios(vazio) {
  const out = [];
  for (let i = 0; i < vazio.length; i++) if (!vazio[i] && (i === 0 || vazio[i - 1])) out.push(i);
  return out;
}

/** Quantas faixas de conteúdo existem ao longo de um eixo. */
const bandas = (vazio) => inicios(vazio).length;

/** Mediana de uma lista de números. */
function mediana(xs) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * A grade REAL da folha: colunas, linhas e o lado da célula.
 *
 * 🔴 **CONTAR FAIXAS DE CONTEÚDO NÃO FUNCIONA, e as folhas de 22h provaram
 * isso das duas maneiras possíveis:**
 *
 * - **Para MENOS:** o arco estendido encosta no quadro vizinho e as duas faixas
 *   viram uma. Uma folha de 7 colunas foi lida como tendo menos.
 * - **Para MAIS:** a flecha se separa do corpo e abre um vão DENTRO do quadro,
 *   partindo uma faixa em duas. A mesma folha chegou a ler 10 colunas — número
 *   que nem divide 5376.
 *
 * 🔴 **E "junta vazia" também não serve.** Foi a minha segunda tentativa: numa
 * grade de célula `c`, as colunas onde um quadro acaba e o outro começa
 * deveriam ser transparentes. Nas folhas de arco **nenhum tamanho passa de
 * 50 %** — o arco estendido cruza a borda da célula, então a junta verdadeira
 * tem conteúdo em cima. O teste rejeitava a grade certa.
 *
 * ✅ **O que funciona é o ESPAÇAMENTO entre os começos das faixas.** Cada
 * quadro começa a desenhar a um passo fixo do anterior, mesmo que o desenho
 * transborde a célula. Medido na folha do arco: começos em 237, 1006, 1775,
 * 2542, 3309, 4077, 4845 — diferenças de 769, 769, 767, 767, 768, 768. A
 * **mediana** dá 768, e é a célula.
 *
 * ⚠️ A mediana (não a média, nem o mínimo) porque as duas falhas da contagem
 * ainda acontecem, só que agora são inofensivas: uma fusão de faixas dá uma
 * diferença de ~2c e uma quebra dentro do quadro dá uma bem menor. Enquanto a
 * maioria dos passos estiver certa, a mediana ignora as duas.
 *
 * ⚠️ **Isto importa porque a ambiguidade é real:** as folhas de arco e magia
 * são 5376 × 5376, e **oito** tamanhos de célula dividem esse número
 * (128, 192, 256, 384, 448, 672, 768, 896). Só o desenho decide.
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
  if (colVazia.every(Boolean)) throw new Error('folha vazia');

  const passos = [];
  for (const eixo of [inicios(colVazia), inicios(linVazia)]) {
    for (let i = 1; i < eixo.length; i++) passos.push(eixo[i] - eixo[i - 1]);
  }
  // Folha de uma coluna e uma linha: não há passo para medir, a célula é a folha.
  const estimado = passos.length ? mediana(passos) : Math.min(img.w, img.h);

  /*
   * O passo medido é aproximado (767, 768, 769 na mesma folha), então a célula
   * final é o divisor comum de largura e altura mais próximo dele. Isso
   * arredonda para a grade que realmente fecha, em vez de confiar no pixel.
   */
  let cell = 0, erro = Infinity;
  for (let c = 32; c <= Math.min(img.w, img.h); c++) {
    if (img.w % c !== 0 || img.h % c !== 0) continue;
    const e = Math.abs(c - estimado);
    if (e < erro) { erro = e; cell = c; }
  }
  if (!cell) throw new Error(`nenhuma célula divide ${img.w}x${img.h}`);
  if (erro > estimado * 0.15) {
    throw new Error(
      `passo medido ${estimado} não bate com nenhum divisor (mais perto: ${cell})`,
    );
  }
  /*
   * ⚠️ A ÚLTIMA FILEIRA COSTUMA VIR INCOMPLETA (o autosprite corta onde a
   * animação acaba), então `h / cell` é a contagem confiável de linhas.
   */
  return { cols: img.w / cell, linhas: img.h / cell, cell, lins: bandas(linVazia) };
}

// ---------------------------------------------------------------------------

if (!existsSync(ORIGEM)) {
  console.error(`\n[fonte] origem não existe: ${ORIGEM}\n`);
  process.exit(1);
}

let feitas = 0, pulos = 0;
for (const sexo of ['male', 'female']) {
  for (const { pasta, pastas, anim, re } of LOTES) {
    // A pasta pode ter mais de um nome aceito — ver a nota em `LOTES`.
    const candidatas = pastas ?? [pasta];
    const achada = candidatas.find((c) => existsSync(join(ORIGEM, sexo, c)));
    if (!achada) { console.warn(`[fonte] sem ${sexo}/${candidatas.join(' | ')}`); continue; }
    const dir = join(ORIGEM, sexo, achada);

    for (const arquivo of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
      const m = re.exec(arquivo);
      if (!m) { console.warn(`[fonte] nome fora do padrão, pulado: ${arquivo}`); pulos++; continue; }
      const dirArq = m[1];
      const animArq = anim;
      const destinoDir = DIRECAO[dirArq];
      if (!destinoDir) { console.warn(`[fonte] direção desconhecida: ${dirArq}`); pulos++; continue; }

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
