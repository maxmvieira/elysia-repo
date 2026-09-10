/**
 * Converte uma FOLHA DE CONTATO de animação numa tira de FX do jogo.
 *
 * 🔴 **Folha de contato não é sprite sheet.** As que o dono gera trazem os
 * quadros separados por espaço preto, com a grade IRREGULAR e às vezes com
 * fileiras de contagens diferentes — a do Cold Bolt tem nove células nas duas
 * primeiras fileiras e seis nas duas últimas. Um corte por célula fixa pega
 * meio quadro em quase todas.
 *
 * ✅ O que salva é o fundo: ele é quase PRETO (rgb ≈ 9–14) e sem cor nenhuma
 * (croma ≈ 1). O efeito tem croma de 45 a 113. Então o recorte do fundo é por
 * COR, não por posição.
 *
 * ⚠️ **Os quadros são alinhados EMBAIXO**, não centralizados. As fileiras têm
 * alturas diferentes, e o que precisa ficar parado entre um quadro e outro é o
 * CHÃO — o anel do impacto. Alinhar pelo meio faria o anel subir e descer, e
 * esticar cada fileira para a mesma altura faria a animação respirar.
 *
 * 🔴 **A GRADE É MEDIDA, não adivinhada.** Cada folha tem a sua aqui embaixo,
 * em `FOLHAS`. Os números saem de um perfil da imagem: quanto de pixel
 * não-preto há em cada linha, e em cada coluna DENTRO de cada fileira. Os
 * cortes ficam no meio dos vales.
 *
 * ⚠️ E a grade **não pode ser detectada na hora do corte**, por mais tentador
 * que seja. Nos quadros de dissipação o efeito já se quebrou em fagulhas
 * soltas, e o detector lê cada fagulha como uma célula — na quarta fileira do
 * Cold Bolt ele acha dez onde há seis.
 *
 * ## Uso
 *
 *   node tools/contato2fx.mjs <folha.png> <nome-da-saida>
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/** Os cortes das fileiras de NOVE células do Cold Bolt (passo ≈ 167). */
const CORTES_9 = [0, 182, 350, 517, 683, 850, 1017, 1183, 1354, 1536];

/** Os pares início/fim das seis células de cada fileira do Fire Bolt. */
const PARES_6 = [6, 254, 262, 508, 517, 764, 772, 1019, 1027, 1275, 1283, 1530];

/**
 * As grades, por nome de saída.
 *
 * `fileiras`: para cada faixa de `y`, os CORTES em `x`. Numa fileira de N
 * células há N+1 cortes, do zero à largura da folha.
 *
 * `rotulo`: o canto onde a folha traz o NÚMERO DO QUADRO, quando traz.
 *
 * 🔴 **O rótulo sai por POSIÇÃO, e não pelo filtro de cor.** A ideia original
 * era que o número cairia junto com o fundo por ser cinza — mas ele é cinza
 * CLARO, e o recorte tem uma segunda porta, pelo brilho, para salvar o núcleo
 * branco do clarão. O número passava por ela, e o dono viu no jogo: *"estão
 * aparecendo números pequenos, parece que é a contagem de quadros da magia"*.
 *
 * ⚠️ Medido nos 24 quadros do Fire Bolt, o número cabe inteiro num retângulo de
 * 36×35 no canto superior esquerdo da célula; 46×40 dá folga. E o canto é
 * seguro: a varredura acha de 0 a 2 pixels COM COR ali por quadro (ruído de
 * compressão) contra centenas de pixels de rótulo, porque o efeito desce pelo
 * meio da célula e estoura embaixo.
 */
const FOLHAS = {
  firebolt24: {
    larg: 128,
    alt: 148,
    rotulo: { larg: 46, alt: 40 },
    /*
     * ⚠️ Esta folha veio com SEPARADORAS claras entre as células, e elas não
     * podem entrar no corte. Por isso as colunas são pares início/fim em vez de
     * uma sequência de fronteiras — ver `paresDeColuna`.
     */
    paresDeColuna: true,
    fileiras: [
      { y: [6, 225], x: PARES_6 },
      { y: [233, 467], x: PARES_6 },
      { y: [475, 721], x: PARES_6 },
      { y: [728, 1016], x: PARES_6 },
    ],
  },
  coldbolt30: {
    larg: 128,
    alt: 148,
    /*
     * ⚠️ **As duas primeiras fileiras têm NOVE células e as duas últimas SEIS.**
     * Não é descuido do gerador: a descida cabe num quadro estreito e o estouro
     * não. É por isso que a grade é por fileira, e não uma só para a folha.
     *
     * ⚠️ E as fileiras 3 e 4 têm cortes DIFERENTES entre si, apesar de as duas
     * terem seis células — o estouro cresce da esquerda para a direita e empurra
     * as fronteiras. Os números saem do perfil de cada uma, medido em separado.
     */
    fileiras: [
      { y: [16, 251], x: CORTES_9 },
      { y: [264, 506], x: CORTES_9 },
      { y: [533, 730], x: [0, 210, 423, 669, 945, 1231, 1536] },
      { y: [777, 983], x: [0, 234, 472, 722, 983, 1262, 1536] },
    ],
  },
};

const [folhaArq, nome] = process.argv.slice(2);
if (!folhaArq || !nome) {
  console.error('uso: node tools/contato2fx.mjs <folha.png> <nome>');
  process.exit(1);
}
const grade = FOLHAS[nome];
if (!grade) {
  console.error(`[fx] sem grade medida para "${nome}".`);
  console.error(`[fx] conhecidas: ${Object.keys(FOLHAS).join(', ')}`);
  process.exit(1);
}

const img = decode(folhaArq);

/**
 * Alfa de um pixel do efeito.
 *
 * ⚠️ **Croma é o que separa o efeito do fundo.** O fundo é preto sem cor; o
 * único pixel sem cor que precisa sobreviver é o núcleo branco do clarão, e por
 * isso há a segunda porta, pelo brilho.
 *
 * 🔴 **O que sobra sai com alfa CHEIO, e não graduado pelo brilho.** A primeira
 * versão fazia `alfa = brilho × 1,7`, e o dono viu o resultado: *"a animação
 * está muito escura"*. O motivo é que o jogo desenha isto em mistura ADITIVA —
 * a cor do efeito é SOMADA ao mundo. Nessa conta o alfa é um volume, e baixá-lo
 * nos tons médios apagava justamente o corpo da chama; o preto continua somando
 * zero sozinho, sem precisar de alfa nenhum para sumir.
 */
function alfaDe(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const croma = mx - mn;
  const lum = (r + g + b) / 3;
  if (croma < 8 && lum < 235) return 0;
  return 255;
}

/** As células de uma fileira, como pares [x0, x1] inclusivos. */
function celulasDe(fileira) {
  const xs = fileira.x;
  const out = [];
  if (grade.paresDeColuna) {
    for (let i = 0; i < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
    return out;
  }
  for (let i = 0; i < xs.length - 1; i++) out.push([xs[i], xs[i + 1] - 1]);
  return out;
}

const quadros = [];
for (const fileira of grade.fileiras) {
  const [y0, y1] = fileira.y;
  for (const [x0, x1] of celulasDe(fileira)) {
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const cel = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = ((y0 + y) * img.w + x0 + x) * 4;
        const d = (y * w + x) * 4;
        const [r, g, b] = [img.px[o], img.px[o + 1], img.px[o + 2]];
        const rotulo = grade.rotulo && x < grade.rotulo.larg && y < grade.rotulo.alt;
        const a = rotulo ? 0 : alfaDe(r, g, b);
        cel[d] = r; cel[d + 1] = g; cel[d + 2] = b; cel[d + 3] = a;
      }
    }
    quadros.push({ px: cel, w, h });
  }
}

/*
 * A caixa comum: a mais larga e a mais alta de todas, para nenhum quadro perder
 * pedaço. Os menores entram nela alinhados embaixo e centrados na horizontal.
 */
const LARG = grade.larg;
const ALT = grade.alt;
const W0 = Math.max(...quadros.map((q) => q.w));
const H0 = Math.max(...quadros.map((q) => q.h));
const W = LARG * quadros.length;
const out = Buffer.alloc(W * ALT * 4);

quadros.forEach((q, k) => {
  const dx = Math.floor((W0 - q.w) / 2);
  const dy = H0 - q.h;
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      /*
       * ⚠️ Redução por MÉDIA de bloco, ponderada pelo alfa. Amostrar um pixel a
       * cada dois apagaria metade das fagulhas, que têm um pixel de largura; e
       * somar a cor de pixel transparente sujaria a borda com lixo, porque num
       * pixel invisível a cor guardada não quer dizer nada.
       */
      const sx0 = Math.floor((x * W0) / LARG) - dx;
      const sy0 = Math.floor((y * H0) / ALT) - dy;
      const sx1 = Math.floor(((x + 1) * W0) / LARG) - dx;
      const sy1 = Math.floor(((y + 1) * H0) / ALT) - dy;
      let r = 0, g = 0, b = 0, a = 0, n = 0, total = 0;
      for (let sy = sy0; sy < Math.max(sy0 + 1, sy1); sy++) {
        for (let sx = sx0; sx < Math.max(sx0 + 1, sx1); sx++) {
          total += 1;
          if (sx < 0 || sy < 0 || sx >= q.w || sy >= q.h) continue;
          const o = (sy * q.w + sx) * 4;
          const peso = q.px[o + 3] / 255;
          r += q.px[o] * peso; g += q.px[o + 1] * peso; b += q.px[o + 2] * peso;
          a += q.px[o + 3]; n += peso;
        }
      }
      const d = (y * W + k * LARG + x) * 4;
      out[d] = n ? Math.round(r / n) : 0;
      out[d + 1] = n ? Math.round(g / n) : 0;
      out[d + 2] = n ? Math.round(b / n) : 0;
      out[d + 3] = Math.round(a / Math.max(1, total));
    }
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, ALT, out));
console.log(`[fx] ${nome}.png  ${W}x${ALT}  (${quadros.length} quadros de ${LARG}x${ALT})`);
