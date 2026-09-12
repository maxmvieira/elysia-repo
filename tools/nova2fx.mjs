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
const alfa = (x, y) => presa((lum((y * img.w + x) * 4) - PISO) / (TETO - PISO));

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
const CX = escada(pcol, COL, img.w);
const CY = escada(plin, LIN, img.h);
console.log(`[nova] centros x: ${CX.join(' ')}`);
console.log(`[nova] centros y: ${CY.join(' ')}`);
/*
 * ⚠️ **A JANELA é o menor passo REAL entre centros vizinhos**, e não a célula
 * teórica. É ela que decide quanto do vizinho entra, e na folha nova os anéis
 * (270 px de ponta a ponta) são maiores que o passo vertical: sem medir, o corte
 * ou decepa o anel ou traz metade do de cima.
 */
const passos = [];
for (let k = 1; k < CX.length; k++) passos.push(CX[k] - CX[k - 1]);
for (let k = 1; k < CY.length; k++) passos.push(CY[k] - CY[k - 1]);
const JANELA = Math.min(...passos);

const N = COL * LIN;
const W = LADO * N;
const out = Buffer.alloc(W * LADO * 4);

for (let k = 0; k < N; k++) {
  /*
   * 🔴 **A célula é centrada no CENTRO MEDIDO**, e não na divisão teórica. Ver
   * `centros`: os anéis derivam da grade, e seguir a grade parte o desenho.
   */
  const cx = CX[k % COL];
  const cy = CY[Math.floor(k / COL)];
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
