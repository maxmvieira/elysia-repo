/**
 * ☄️ Corta a folha VERTICAL do Meteoro — fundo cinza embutido, sem grade.
 *
 * 🔴 **Duas coisas novas aqui, e nenhum dos cinco cortadores anteriores tem as
 * duas.**
 *
 * **1. O fundo NÃO é transparente.** Os outros têm uma chave cada um — croma,
 * alfa existente, brilho sobre preto, chão-ou-nuvem, cabeça-contra-chão. Esta
 * folha chegou (13/09) com um cinza de fumaça OPACO cobrindo a tela: medida, a
 * mediana da luminância é 37,9 e um quarto dos pixels é cinza escuro com alfa
 * acima de 230. A chave é o BRILHO ACIMA DO FUNDO, e a arte já é aditiva.
 *
 * **2. NÃO HÁ GRADE.** Parece 5×5 e não é: medidas as distâncias entre o topo de
 * uma fileira e o da seguinte, dão 211, 333, 470 e 215 px. O gerador desenha os
 * meteoros cada vez maiores e empurra o resto para baixo, e os quadros de uma
 * fileira invadem a de baixo. Tentei divisão exata (o quadro seguinte aparece no
 * rodapé da célula), divisão deslocada por um número medido (quatro pedras
 * decepadas) e divisas medidas com altura presa a ±12 % (três quadros vazios).
 * Nenhuma grade descreve esta folha, porque ela não foi desenhada numa.
 *
 * ✅ **Então cada quadro é achado pelo próprio desenho e reenquadrado.** As
 * COLUNAS separam limpo, e dentro de cada uma os quadros saem das ilhas do
 * perfil de linha.
 *
 * 🔴 **A âncora é o RODAPÉ do desenho, e ela serve para os dois tipos de
 * quadro.** No meteoro caindo o rodapé é a pedra — o rastro sobe atrás dela. No
 * estouro é o chão. Uma regra só, e ela põe no mesmo lugar as duas coisas que
 * têm de cair no tile.
 *
 * ⚠️ **Com os quadros reenquadrados a QUEDA sai do desenho** — cada quadro passa
 * a mostrar o meteoro parado, crescendo — e quem move passa a ser o cliente, pela
 * `trajetoria` vertical. É de propósito: é o que faz a pedra chegar no tile
 * certo em qualquer ponto da tela, em vez de cair dentro do próprio quadro.
 *
 * Uso:
 *   node tools/meteoro-grade2fx.mjs arte-fonte/fx/meteoro_vertical.png meteoro_queda16
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/** Quantas colunas a folha tem, e quantos desenhos há em cada uma. */
const COL = 5;
const POR_COL = 5;

/**
 * Abaixo disto o pixel é FUNDO.
 *
 * ⚠️ 48 e não 12: o fundo desta folha não é preto, é um cinza de fumaça com
 * luminância mediana 37,9. Um piso de preto deixaria a tela inteira acesa a 15 %
 * — um retângulo cinza pairando sobre a grama, que é o defeito que a Descarga
 * Elétrica teve em 12/09.
 */
const PISO = 48;

/** Acima disto o pixel é desenho cheio. Entre os dois, a borda macia. */
const TETO = 132;

/** A janela recortada da FONTE, em pixels dela. Cabe o maior quadro (218×446). */
const JAN_W = 288;
const JAN_H = 512;

/** A célula de saída. Metade da janela: é uma redução, que sai limpa. */
const LARG = 144;
const ALT = 256;

/**
 * Onde o RODAPÉ do desenho fica dentro da célula — e o `ancoraY` do cliente.
 *
 * ⚠️ Não é 1. O estouro espalha brasa ABAIXO do ponto de impacto, e encostar o
 * desenho no rodapé da célula cortaria essa brasa fora.
 */
const ANCORA = 0.88;

const [arq, nome] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/meteoro-grade2fx.mjs <folha.png> <nome-de-saida>');
  process.exit(1);
}

const img = decode(arq);
const lum = (o) => 0.299 * img.px[o] + 0.587 * img.px[o + 1] + 0.114 * img.px[o + 2];
/** Alfa recortado deste pixel: 0 no fundo, 1 no fogo cheio. */
const alfa = (x, y) => Math.max(0, Math.min(1, (lum((y * img.w + x) * 4) - PISO) / (TETO - PISO)));

/** Faixas contíguas acima do limiar. */
function faixas(arr, limiar) {
  const o = [];
  let j = -1;
  for (let i = 0; i <= arr.length; i++) {
    if (i < arr.length && arr[i] > limiar) { if (j < 0) j = i; }
    else if (j >= 0) { o.push([j, i - 1]); j = -1; }
  }
  return o;
}

/*
 * 🔴 **O limiar é RELATIVO ao pico, e não um valor absoluto.**
 *
 * Com limiar perto de zero as cinco colunas saem como UMA ilha só: medido, o vão
 * mais cheio entre duas colunas ainda tem 56 de perfil, contra 6 do mais vazio —
 * é fumaça do fundo que a chave não zera. Oito por cento do pico passa folgado
 * acima dos quatro vãos e bem abaixo das bordas de coluna.
 *
 * ⚠️ E as ilhas achadas assim são MENORES que o quadro — o limiar come as bordas
 * fracas. Por isso a cerca de cada coluna é esticada até o MEIO DO VÃO com a
 * vizinha: achar é uma coisa, recortar é outra.
 */
const perfilCol = new Float64Array(img.w);
for (let x = 0; x < img.w; x++) {
  let s = 0;
  for (let y = 0; y < img.h; y++) s += alfa(x, y);
  perfilCol[x] = s;
}
const picoCol = perfilCol.reduce((m, v) => Math.max(m, v), 0);
const ilhasCol = faixas(perfilCol, picoCol * 0.08);
if (ilhasCol.length !== COL) {
  console.warn(`[meteoro] ⚠️ ${ilhasCol.length} colunas achadas, esperava ${COL}.`);
}
const colunas = ilhasCol.map(([a, b], i) => [
  i === 0 ? 0 : Math.round((ilhasCol[i - 1][1] + a) / 2),
  i === ilhasCol.length - 1 ? img.w - 1 : Math.round((b + ilhasCol[i + 1][0]) / 2),
]);

/** Os desenhos de UMA coluna: ilhas do perfil de linha, com a contagem acertada. */
function desenhosDaColuna(x0, x1) {
  const perfil = new Float64Array(img.h);
  for (let y = 0; y < img.h; y++) {
    let s = 0;
    for (let x = x0; x <= x1; x++) s += alfa(x, y);
    perfil[y] = s;
  }
  const pico = perfil.reduce((m, v) => Math.max(m, v), 0);
  const ilhas = faixas(perfil, pico * 0.06);
  while (ilhas.length > POR_COL) {
    /*
     * ⚠️ Sobrando ilha, junta a menor com a DE BAIXO. Cada meteoro tem uma nuvem
     * de fagulhas destacada no alto do rastro, e ela vira ilha própria; como o
     * rastro é longo, essa nuvem fica mais perto do meteoro ANTERIOR do que do
     * seu. Juntar pela distância erra; juntar para baixo acerta.
     */
    let k = 0;
    for (let i = 1; i < ilhas.length; i++) {
      if (ilhas[i][1] - ilhas[i][0] < ilhas[k][1] - ilhas[k][0]) k = i;
    }
    if (k < ilhas.length - 1) ilhas.splice(k, 2, [ilhas[k][0], ilhas[k + 1][1]]);
    else ilhas.splice(k - 1, 2, [ilhas[k - 1][0], ilhas[k][1]]);
  }
  while (ilhas.length < POR_COL) {
    // Faltando, parte a ilha mais alta no vale mais fundo do miolo dela.
    let k = 0;
    for (let i = 1; i < ilhas.length; i++) {
      if (ilhas[i][1] - ilhas[i][0] > ilhas[k][1] - ilhas[k][0]) k = i;
    }
    const [a, b] = ilhas[k];
    const m0 = a + Math.round((b - a) * 0.3);
    const m1 = a + Math.round((b - a) * 0.7);
    let corte = Math.round((a + b) / 2);
    let menor = Infinity;
    for (let y = m0; y <= m1; y++) if (perfil[y] < menor) { menor = perfil[y]; corte = y; }
    ilhas.splice(k, 1, [a, corte - 1], [corte, b]);
    ilhas.sort((p, q) => p[0] - q[0]);
  }
  return ilhas;
}

/* Uma janela por desenho, agrupadas por coluna. */
const janelas = [];
for (const [cx0, cx1] of colunas) {
  for (const [cy0, cy1] of desenhosDaColuna(cx0, cx1)) {
    let base = cy0;
    let sx = 0;
    let peso = 0;
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        const a = alfa(x, y);
        if (a <= 0.02) continue;
        if (y > base) base = y;
        sx += x * a;
        peso += a;
      }
    }
    janelas.push({
      esq: Math.round((peso > 0 ? sx / peso : (cx0 + cx1) / 2) - JAN_W / 2),
      topo: Math.round(base - JAN_H * ANCORA),
      cx0, cx1, cy0, cy1,
    });
  }
}

/*
 * A folha é lida como texto — primeira linha inteira, depois a segunda. As
 * janelas saíram agrupadas por coluna, então a ordem é transposta aqui.
 */
const ordem = [];
for (let l = 0; l < POR_COL; l++) {
  for (let c = 0; c < colunas.length; c++) ordem.push(janelas[c * POR_COL + l]);
}

/** Desenha uma janela numa célula do buffer de saída. */
function pinta(q, destino, larguraTotal, k) {
  let massa = 0;
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      // Média de bloco: a janela é maior que a célula, então isto é uma redução.
      const sx0 = q.esq + Math.floor((x * JAN_W) / LARG);
      const sx1 = q.esq + Math.max(Math.floor((x * JAN_W) / LARG) + 1,
        Math.floor(((x + 1) * JAN_W) / LARG));
      const sy0 = q.topo + Math.floor((y * JAN_H) / ALT);
      const sy1 = q.topo + Math.max(Math.floor((y * JAN_H) / ALT) + 1,
        Math.floor(((y + 1) * JAN_H) / ALT));
      let sr = 0, sg = 0, sb = 0, sa = 0, peso = 0, total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total += 1;
          // A cerca do quadro: nada do vizinho entra na célula.
          if (sx < q.cx0 || sx > q.cx1 || sy < q.cy0 || sy > q.cy1) continue;
          if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
          const o = (sy * img.w + sx) * 4;
          /*
           * 🔴 O alfa sai do brilho, **E A COR PERDE O FUNDO JUNTO.** Só levantar
           * o alfa deixaria o cinza colado no fogo — a chama sairia lavada, com
           * névoa por dentro. Descontado o piso, o que era fundo volta a ser
           * preto, e em mistura aditiva preto não acrescenta nada.
           */
          const a = Math.max(0, Math.min(1, (lum(o) - PISO) / (TETO - PISO)));
          if (a <= 0) continue;
          const desconto = PISO * 0.9;
          sr += Math.max(0, img.px[o] - desconto) * a;
          sg += Math.max(0, img.px[o + 1] - desconto) * a;
          sb += Math.max(0, img.px[o + 2] - desconto) * a;
          sa += a;
          peso += a;
        }
      }
      const alvo = Math.round((sa / Math.max(1, total)) * 255);
      massa += alvo;
      if (!destino) continue;
      const d = (y * larguraTotal + k * LARG + x) * 4;
      destino[d] = peso > 0 ? Math.round(sr / peso) : 0;
      destino[d + 1] = peso > 0 ? Math.round(sg / peso) : 0;
      destino[d + 2] = peso > 0 ? Math.round(sb / peso) : 0;
      destino[d + 3] = alvo;
    }
  }
  return massa / 255;
}

/*
 * 🔴 **AS NUVENS DE FAGULHA SAEM DA TIRA, e quem as separa é a massa DA SAÍDA.**
 *
 * A folha não tem 25 meteoros: tem meteoros e, entre eles, nuvens de fagulha que
 * o gerador desenhou soltas do rastro. Tentei juntá-las ao quadro a que
 * pertencem de três maneiras e nenhuma fecha — em algumas colunas a nuvem está
 * mais perto do meteoro anterior, em outras é desenho à parte.
 *
 * ✅ Mas depois de recortada e reenquadrada a MEDIDA separa sem ambiguidade:
 * medidas as 25, as fagulhas pesam de 174 a 771 e todo quadro de verdade pesa de
 * 1065 a 8630. Quarenta e cinco por cento da mediana (873) corta no meio desse vão, com folga dos dois
 * lados.
 *
 * ⚠️ **A massa tem de ser medida na SAÍDA, não na fonte.** Na fonte, a faixa de
 * uma fagulha inclui pedaços do meteoro vizinho e o corte não separa nada — foi
 * o que me custou uma rodada: o mesmo critério, medido um passo antes, descartou
 * três quadros em vez de nove.
 */
const massas = ordem.map((q) => pinta(q, null, 0, 0));
const mediana = [...massas].sort((a, b) => a - b)[massas.length >> 1];
const vivos = ordem.filter((_, i) => massas[i] >= mediana * 0.45);

const N = vivos.length;
const W = LARG * N;
const out = Buffer.alloc(W * ALT * 4);
vivos.forEach((q, k) => pinta(q, out, W, k));

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, ALT, out));
console.log(`[meteoro] ${ordem.length - N} nuvens de fagulha descartadas`
  + ` (massa < ${Math.round(mediana * 0.45)})`);
console.log(`[meteoro] ${nome}.png  ${W}x${ALT}  (${N} quadros de ${LARG}x${ALT})`);
console.log(`[meteoro] ancoraY ${ANCORA} — confira o nome: a ficha do cliente`
  + ` precisa dizer ${N} quadros`);
