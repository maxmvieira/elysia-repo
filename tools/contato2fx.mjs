/**
 * Converte uma FOLHA DE CONTATO de animação numa tira de FX do jogo.
 *
 * 🔴 **Folha de contato não é sprite sheet.** A que o dono gerou traz os quadros
 * numerados, separados por linhas claras e com a grade IRREGULAR — as linhas
 * horizontais caem em 228, 471 e 724, dando fileiras de 224, 243, 253 e 293 px
 * de altura. Um corte por célula fixa pega meio quadro em três das quatro.
 *
 * ✅ O que salva é o fundo: ele é quase PRETO (rgb ≈ 9–14) e sem cor nenhuma
 * (croma ≈ 1). O fogo tem croma de 45 a 113. Então o recorte do fundo é por
 * COR, não por posição — e de quebra isso apaga os números, que são cinzas
 * (croma 0) e cairiam junto com o fundo.
 *
 * ⚠️ **Os quadros são alinhados EMBAIXO**, não centralizados. As fileiras têm
 * alturas diferentes, e o que precisa ficar parado entre um quadro e outro é o
 * CHÃO — o anel do impacto. Alinhar pelo meio faria o anel subir e descer, e
 * esticar cada fileira para a mesma altura faria a animação respirar.
 *
 * ## Uso
 *
 *   node tools/contato2fx.mjs <folha.png> <nome-da-saida>
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/**
 * As bordas de cada célula, MEDIDAS na folha e não calculadas.
 *
 * ⚠️ As colunas são regulares (uma a cada 255 px) mas as fileiras não são. Os
 * números vêm de procurar as linhas claras da folha: o brilho médio de cada
 * linha da imagem sobe onde há separadora.
 */
const COLUNAS = [[6, 254], [262, 508], [517, 764], [772, 1019], [1027, 1275], [1283, 1530]];
const FILEIRAS = [[6, 225], [233, 467], [475, 721], [728, 1016]];

/**
 * O canto onde mora o NÚMERO DO QUADRO, em coordenadas da célula.
 *
 * 🔴 **O filtro de croma não dá conta do rótulo.** A ideia original era que o
 * número cairia junto com o fundo por ser cinza — mas ele é cinza CLARO, e o
 * recorte tem uma segunda porta, pelo brilho, para salvar o núcleo branco do
 * clarão. O número passa por ela. O dono viu isso no jogo: *"estão aparecendo
 * números pequenos, parece que é a contagem de quadros da magia"*.
 *
 * ✅ Então o rótulo sai por POSIÇÃO, não por cor. Medido nos 24 quadros ele cabe
 * inteiro num retângulo de 36×35 no canto superior esquerdo da célula; 46×40 dá
 * folga. E esse canto é seguro: a varredura acha de 0 a 2 pixels COM COR ali em
 * cada quadro (ruído de compressão), contra as centenas do rótulo. O fogo desta
 * folha desce pelo meio da célula e estoura embaixo.
 */
const ROTULO = { larg: 46, alt: 40 };

/** Lado do quadro na tira. Metade do original, que é folgado para um tile. */
const LARG = 128;
const ALT = 148;

const [folha, nome] = process.argv.slice(2);
if (!folha || !nome) { console.error('uso: node tools/contato2fx.mjs <folha.png> <nome>'); process.exit(1); }

const img = decode(folha);

/**
 * Alfa de um pixel do efeito.
 *
 * ⚠️ **Croma é o que separa fogo de fundo E de rótulo.** O fundo é preto sem
 * cor e o número é cinza sem cor; os dois têm croma perto de zero. O único
 * pixel sem cor que precisa sobreviver é o núcleo branco do clarão, e por isso
 * há a segunda porta, pelo brilho.
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

const quadros = [];
for (const [y0, y1] of FILEIRAS) {
  for (const [x0, x1] of COLUNAS) {
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const cel = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = ((y0 + y) * img.w + x0 + x) * 4;
        const d = (y * w + x) * 4;
        const [r, g, b] = [img.px[o], img.px[o + 1], img.px[o + 2]];
        const a = x < ROTULO.larg && y < ROTULO.alt ? 0 : alfaDe(r, g, b);
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
