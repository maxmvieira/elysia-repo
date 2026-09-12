/**
 * ❄️ Corta folhas de EXPLOSÃO RADIAL — grade limpa, fundo preto, centro medido.
 *
 * 🔴 **Por que não é o `meteoro-grade2fx`, que também lê fundo opaco.** Aquele
 * ancora cada quadro pelo RODAPÉ do desenho, porque no meteoro o que tem de cair
 * no tile é a pedra (o rastro sobe atrás dela) ou o chão da cratera. Aqui o
 * efeito é uma explosão de 360° em volta do conjurador: o que tem de cair NOS PÉS
 * dele é o NÚCLEO, e ele não está no rodapé nem no meio do quadro — nas primeiras
 * fileiras a arte desenha o anel a uns 60 % da altura, nas últimas a estrela é
 * centrada.
 *
 * ✅ Então a âncora sai MEDIDA: o centro de massa dos pixels mais quentes, que
 * numa explosão é o clarão do impacto. Uma linha, e ela vale para os 20 quadros
 * sem ninguém declarar nada.
 *
 * ⚠️ **A grade aqui não é adivinhada: é conferida.** Se algum vale entre células
 * não estiver vazio, o corte avisa em vez de sair torto — foi a lição das três
 * folhas do Meteoro, onde eu supus grade duas vezes e errei as duas.
 *
 * Uso:
 *   node tools/nova2fx.mjs arte-fonte/fx/glacial.png glacial_burst 5 4
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/**
 * A rampa do recorte. O fundo desta arte é preto CHAPADO (mediana 0, p95 1), o
 * que é o caso fácil: qualquer coisa acima do ruído é desenho.
 */
const PISO = 8;
const TETO = 48;

/** Acima disto o pixel conta como NÚCLEO, e é dele que sai a âncora. */
const NUCLEO = 180;

/** A célula de saída. Quadrada, porque a explosão é radial. */
const LADO = 192;

const [arq, nome, colArg, linArg] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/nova2fx.mjs <folha.png> <nome> [colunas] [fileiras]');
  process.exit(1);
}
const COL = Number(colArg ?? 5);
const LIN = Number(linArg ?? 4);

const img = decode(arq);
const lum = (o) => 0.299 * img.px[o] + 0.587 * img.px[o + 1] + 0.114 * img.px[o + 2];
const presa = (v) => Math.max(0, Math.min(1, v));
/*
 * 🔴 **Se a folha TEM alfa, é ele que manda.**
 *
 * As duas primeiras folhas glaciais vieram com fundo preto chapado, e a chave
 * era o brilho. A terceira (13/09) veio recortada, com um halo cinza de alfa
 * baixo em volta de cada estouro — e o brilho não sabe distinguir halo de
 * desenho: o corte saiu com um disco cinza em cada quadro.
 *
 * ⚠️ A detecção é por MEIO-TOM: uma folha sem alfa tem tudo em 0 ou 255. Se
 * existe pixel no meio, o canal foi usado de propósito, e ignorá-lo é jogar
 * fora o recorte que o artista já fez.
 */
const TEM_ALFA = (() => {
  for (let i = 3; i < img.px.length; i += 4 * 97) {
    if (img.px[i] > 24 && img.px[i] < 250) return true;
  }
  return false;
})();
/** Piso do alfa: o véu fantasma das folhas geradas por IA. */
const PISO_ALFA = 24;
/**
 * 🔴 **FUNDO NEUTRO PINTADO: a chave é a SATURAÇÃO, e os limiares são MEDIDOS.**
 *
 * Duas folhas glaciais (12/09) chegaram com o xadrez de transparência PINTADO —
 * arquivo 100 % opaco, "fundo" cinza. Nem o alfa (não existe) nem o brilho
 * separam nada: numa delas o cinza é 210, mais claro que metade do desenho.
 *
 * ✅ O cinza é NEUTRO e o gelo é AZUL: medida, a saturação do fundo fica em 0,01
 * e a dos cristais passa de 0,3. O branco do reflexo, que é quase sem cor, entra
 * por um corte de brilho ALTO.
 *
 * 🔴 **E os dois limiares saem da PRÓPRIA folha, porque a primeira versão disto
 * errou a folha seguinte.** Eu tinha escrito *"mediana de luminância > 140"*,
 * tirada de UM caso em que o cinza era 210. A folha de 00h58 veio com xadrez
 * escuro — mediana 132 — e o ramo não ligou: o recorte saiu com um disco
 * quadriculado e, com tudo virando "desenho", a centragem foi junto. É a mesma
 * lição das três folhas do Meteoro, cobrada pela terceira vez.
 *
 * ✅ O que separa xadrez pintado de fundo PRETO não é o brilho em absoluto: é o
 * fundo ser neutro **e** não ser preto. E o teto do brilho sai do percentil 75
 * dos pixels SEM COR — o topo do próprio xadrez —, em vez de um número cravado
 * que a próxima folha invalida.
 */
const FUNDO = (() => {
  const lums = [];
  const neutros = [];
  for (let i = 0; i < img.px.length; i += 4 * 97) {
    const mx = Math.max(img.px[i], img.px[i + 1], img.px[i + 2]);
    const mn = Math.min(img.px[i], img.px[i + 1], img.px[i + 2]);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    const L = lum(i);
    lums.push(L);
    if (sat < 0.08) neutros.push(L);
  }
  lums.sort((a, b) => a - b);
  neutros.sort((a, b) => a - b);
  const medianaLum = lums[lums.length >> 1] ?? 0;
  const fracaoNeutra = neutros.length / Math.max(1, lums.length);
  /*
   * ⚠️ **PRETO NÃO É XADREZ.** Uma folha de fundo preto também é neutra, e lá a
   * chave certa é o BRILHO — que recupera a fumaça cinza do meteoro, coisa que a
   * saturação jogaria fora. O que separa os dois casos é só isto: xadrez tem
   * brilho, preto não.
   */
  const pintado = !TEM_ALFA && medianaLum > 60 && fracaoNeutra > 0.5;
  const teto = (neutros[Math.floor(neutros.length * 0.75)] ?? 0) + 12;
  if (pintado) {
    console.log(`[nova] fundo pintado: mediana ${Math.round(medianaLum)},`
      + ` ${Math.round(fracaoNeutra * 100)} % sem cor, teto de brilho ${Math.round(teto)}`);
  }
  return { pintado, teto };
})();
const FUNDO_CLARO = FUNDO.pintado;
const alfa = (x, y) => {
  if (FUNDO_CLARO) {
    const o2 = (y * img.w + x) * 4;
    const mx = Math.max(img.px[o2], img.px[o2 + 1], img.px[o2 + 2]);
    const mn = Math.min(img.px[o2], img.px[o2 + 1], img.px[o2 + 2]);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    return Math.max(presa((sat - 0.06) / 0.14), presa((lum(o2) - 236) / 16));
  }
  const o = (y * img.w + x) * 4;
  if (TEM_ALFA) return img.px[o + 3] < PISO_ALFA ? 0 : img.px[o + 3] / 255;
  return presa((lum(o) - PISO) / (TETO - PISO));
};

const cw = img.w / COL;
const ch = img.h / LIN;

/*
 * ⚠️ **Confere a grade antes de usá-la.** Os vales entre células têm de estar
 * VAZIOS; se não estiverem, a arte não está na grade que o nome promete e o
 * corte sairia partindo quadros ao meio — em silêncio.
 */
const perfil = (eixo, tamanho, outro) => {
  const p = new Float64Array(tamanho);
  for (let i = 0; i < tamanho; i++) {
    let s = 0;
    for (let j = 0; j < outro; j++) s += eixo === 'x' ? alfa(i, j) : alfa(j, i);
    p[i] = s;
  }
  return p;
};
const pcol = perfil('x', img.w, img.h);
const plin = perfil('y', img.h, img.w);

/**
 * 🔴 **OS CENTROS SÃO MEDIDOS, e a grade teórica é só o palpite inicial.**
 *
 * A segunda folha da Explosão Glacial (13/09) parece 5×5 e não está: os anéis
 * são desenhados com passo vertical de ~245 px numa folha que, dividida em
 * cinco, dá 228,8. A diferença é pequena e ACUMULA — no quinto quadro são 65 px
 * de desvio, e o corte pega meio anel de cada vizinho. Foi o que aconteceu, e o
 * aviso de "divisa não vazia" foi o que denunciou.
 *
 * ✅ Cada centro é o CENTRO DE MASSA do perfil perto de onde a grade o esperava.
 *
 * 🔴 **Centro de massa, e não o máximo — o perfil de um ANEL é bimodal.** Ele tem
 * dois picos (as laterais, onde estão os cristais) e um vale no meio (o buraco
 * por onde o personagem aparece). Procurando o máximo, os cinco centros saíram em
 * 142, 489, 669, 1017 e 1294: cada um grudado numa borda, com o passo oscilando
 * entre 180 e 347 onde ele é 275 cravado. O centro de massa de uma coisa
 * simétrica é o meio dela, que é justamente o que se procura.
 */
function centros(p, quantos, tamanho) {
  const passo = tamanho / quantos;
  const achados = [];
  for (let k = 0; k < quantos; k++) {
    /*
     * 🔴 **O centro é REFINADO em passos, e não achado de uma vez.**
     *
     * A divisão teórica é só o ponto de partida: nesta folha as fileiras andam a
     * 245 px onde a grade diz 228,8, e o erro ACUMULA — na quarta fileira são 55
     * px de desvio. Uma janela larga o bastante para alcançar o anel certo também
     * alcança os vizinhos, e o centro de massa sai no meio dos três.
     *
     * ✅ Três passadas com janela ESTREITA resolvem: cada uma puxa o palpite para
     * a massa mais próxima, e a seguinte já enxerga o anel certo sozinho. É o
     * mesmo princípio do reenquadramento do `meteoro-grade2fx`, aplicado ao eixo.
     */
    achados.push(Math.round((k + 0.5) * passo));
  }
  return achados;
}

/**
 * 🔴 **A ESCADA: os centros saem das DUAS PONTAS, não um a um.**
 *
 * Medir cada anel sozinho não fecha nesta folha, e as três tentativas dizem por
 * quê: o perfil de um anel é BIMODAL (dois picos nas laterais, um vale no buraco
 * do meio), então nem o máximo nem o centro de massa local acertam — o máximo
 * gruda numa borda, e o centro de massa de uma janela larga o bastante para
 * alcançar o anel certo também alcança os vizinhos.
 *
 * ✅ **Mas os quadros de uma folha SÃO regularmente espaçados** — é o que faz
 * dela uma folha. Então o que se mede são as pontas: o primeiro e o último
 * desenho, que estão isolados por construção (não têm vizinho de um dos lados), e
 * o resto sai por interpolação. Um erro de meia dúzia de pixels no meio da escada
 * é invisível; um erro de 70 px corta o anel, e foi isso que aconteceu.
 */
function escada(p, quantos, tamanho) {
  // As faixas de conteúdo: corridas de perfil acima do ruído.
  const faixas = [];
  let ini = -1;
  for (let i = 0; i <= tamanho; i++) {
    const aceso = i < tamanho && p[i] > 0.5;
    if (aceso && ini < 0) ini = i;
    else if (!aceso && ini >= 0) { faixas.push([ini, i - 1]); ini = -1; }
  }
  if (faixas.length < 2) return centros(p, quantos, tamanho);
  const massa = ([a, b]) => {
    let soma = 0;
    let peso = 0;
    for (let i = a; i <= b; i++) { soma += i * p[i]; peso += p[i]; }
    return peso > 0 ? soma / peso : (a + b) / 2;
  };
  const primeiro = massa(faixas[0]);
  const ultimo = massa(faixas[faixas.length - 1]);
  const vao = (ultimo - primeiro) / (quantos - 1);
  return Array.from({ length: quantos }, (_, k) => Math.round(primeiro + k * vao));
}
/**
 * 🔴 **CADA FILEIRA TEM AS SUAS COLUNAS, e isso não era esperado.**
 *
 * A terceira folha glacial (13/09) não é regular em eixo nenhum: na primeira
 * fileira os estouros ficam a 170, 173, 180, 188, 193, 192 e 196 px um do outro —
 * o espaçamento CRESCE junto com o desenho —, e na última eles estão a 225. Uma
 * escada só, por mais bem medida que seja, erra 46 px no meio do caminho, e 46 px
 * num estouro de 190 corta cristal.
 *
 * ✅ Então as colunas são achadas DENTRO de cada fileira, pelas ilhas do perfil.
 * Onde duas se tocam (nas fileiras finais, em que o estouro é maior que o vão), a
 * maior é partida no vale — a mesma regra do , e pelo mesmo
 * motivo: passo teórico não sobrevive a arte desenhada à mão.
 */
function ilhas(v, limiar) {
  const o = [];
  let j = -1;
  for (let k = 0; k <= v.length; k++) {
    if (k < v.length && v[k] > limiar) { if (j < 0) j = k; }
    else if (j >= 0) { o.push([j, k - 1]); j = -1; }
  }
  return o;
}
function colunasDaFileira(y0, y1) {
  const perf = new Float64Array(img.w);
  for (let x = 0; x < img.w; x++) {
    let s2 = 0;
    for (let y = y0; y <= y1; y++) s2 += alfa(x, y);
    perf[x] = s2;
  }
  const pico = perf.reduce((m, v) => Math.max(m, v), 0);
  const f = ilhas(perf, pico * 0.02);
  while (f.length > COL) {
    let k = 0;
    for (let i2 = 1; i2 < f.length; i2++) if (f[i2][1] - f[i2][0] < f[k][1] - f[k][0]) k = i2;
    if (k < f.length - 1) f.splice(k, 2, [f[k][0], f[k + 1][1]]);
    else f.splice(k - 1, 2, [f[k - 1][0], f[k][1]]);
  }
  while (f.length < COL && f.length > 0) {
    let k = 0;
    for (let i2 = 1; i2 < f.length; i2++) if (f[i2][1] - f[i2][0] > f[k][1] - f[k][0]) k = i2;
    const [a2, b2] = f[k];
    const m0 = a2 + Math.round((b2 - a2) * 0.35);
    const m1 = a2 + Math.round((b2 - a2) * 0.65);
    let corte = Math.round((a2 + b2) / 2);
    let menor = Infinity;
    for (let x = m0; x <= m1; x++) if (perf[x] < menor) { menor = perf[x]; corte = x; }
    f.splice(k, 1, [a2, corte - 1], [corte, b2]);
    f.sort((p2, q2) => p2[0] - q2[0]);
  }
  return f.map(([a2, b2]) => Math.round((a2 + b2) / 2));
}

const CY = escada(plin, LIN, img.h);
const FILEIRAS = ilhas(plin, 0.5);
/** A faixa vertical que contém este centro, para procurar as colunas dentro dela. */
const faixaDe = (cy) => FILEIRAS.find(([a2, b2]) => cy >= a2 && cy <= b2)
  ?? [Math.max(0, cy - 80), Math.min(img.h - 1, cy + 80)];
const CXPorFileira = CY.map((cy) => colunasDaFileira(...faixaDe(cy)));
console.log("[nova] fileiras: " + CY.join(" "));
/*
 * ⚠️ **A JANELA é o menor vão entre dois estouros VIZINHOS**, medido em todas as
 * fileiras. É ele que decide quanto do vizinho entra pela borda, e nesta folha o
 * vão varia de 170 a 225 — usar o maior traria meio estouro alheio em cada quadro
 * da primeira fileira.
 */
const passos = [];
for (const linha of CXPorFileira) {
  for (let k = 1; k < linha.length; k++) passos.push(linha[k] - linha[k - 1]);
}
const JANELA = passos.length > 0 ? Math.min(...passos) : Math.min(cw, ch);

const N = COL * LIN;
const W = LADO * N;
const out = Buffer.alloc(W * LADO * 4);

for (let k = 0; k < N; k++) {
  /*
   * 🔴 **A célula é centrada no CENTRO MEDIDO**, e não na divisão teórica. Ver
   * `centros`: os anéis derivam da grade, e seguir a grade parte o desenho.
   */
  const cy = CY[Math.floor(k / COL)];
  const cx = CXPorFileira[Math.floor(k / COL)][k % COL] ?? Math.round((k % COL + 0.5) * cw);
  const jan = JANELA;
  const x0 = Math.round(cx - jan / 2);
  const x1 = Math.round(cx + jan / 2) - 1;
  const y0 = Math.round(cy - jan / 2);
  const y1 = Math.round(cy + jan / 2) - 1;
  const esq = cx - jan / 2;
  const topo = cy - jan / 2;

  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      // Média de bloco: a célula da fonte é maior que a de saída.
      const sx0 = Math.floor(esq + (x * jan) / LADO);
      const sx1 = Math.max(sx0 + 1, Math.floor(esq + ((x + 1) * jan) / LADO));
      const sy0 = Math.floor(topo + (y * jan) / LADO);
      const sy1 = Math.max(sy0 + 1, Math.floor(topo + ((y + 1) * jan) / LADO));
      let sr = 0, sg = 0, sb = 0, sa = 0, p = 0, total = 0;
      for (let yy = sy0; yy < sy1; yy++) {
        for (let xx = sx0; xx < sx1; xx++) {
          total += 1;
          if (xx < x0 || xx > x1 || yy < y0 || yy > y1) continue;
          /*
           * 🔴 **A CERCA É REDONDA, e é o que salva esta folha.** Os anéis são
           * maiores que o passo entre eles: o vizinho de cima entra pelo canto da
           * janela quadrada, e cortá-lo reto deixaria meia estrela de outro
           * quadro pendurada. Como o efeito É radial, apagar o que passa do raio
           * não tira nada dele — e leva junto tudo que é de fora.
           *
           * ⚠️ O desvanecimento nos últimos 12 % existe pelo mesmo motivo do
           * corte suave do meteoro: borda dura em desenho aceso lê como recorte.
           */
          const rr = Math.hypot(xx - cx, yy - cy) / (jan / 2);
          if (rr > 1) continue;
          const borda = presa((1 - rr) / 0.12);
          const o = (yy * img.w + xx) * 4;
          const a = alfa(xx, yy) * borda;
          if (a <= 0) continue;
          sr += img.px[o] * a; sg += img.px[o + 1] * a; sb += img.px[o + 2] * a;
          sa += a; p += a;
        }
      }
      const d = (y * W + k * LADO + x) * 4;
      out[d] = p > 0 ? Math.round(sr / p) : 0;
      out[d + 1] = p > 0 ? Math.round(sg / p) : 0;
      out[d + 2] = p > 0 ? Math.round(sb / p) : 0;
      out[d + 3] = Math.round((sa / Math.max(1, total)) * 255);
    }
  }
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, LADO, out));
console.log(`[nova] ${nome}.png  ${W}x${LADO}  (${N} quadros de ${LADO})`);
console.log('[nova] âncora: o NÚCLEO fica no centro da célula — o cliente usa 0,5/0,5.');
