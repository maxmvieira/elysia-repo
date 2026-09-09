/**
 * Recorta as peças de JANELA da folha de interface em pixel art.
 *
 * 🔴 **A folha tem QUATRO variantes da mesma janela**, e o jogo usa uma só: a
 * toda-marrom. As outras três têm miolo de pergaminho creme e barra de título
 * verde, e ao lado do painel dourado e do minimapa da HUD elas gritariam. A
 * escolha foi do dono; o que este arquivo registra é ONDE a variante mora.
 *
 * ⚠️ **A barra de título e o corpo são recortes SEPARADOS**, apesar de estarem
 * colados na folha. Não é capricho: `border-image` não aceita conteúdo dentro
 * da borda, e o título é texto com um botão de fechar ao lado. Como duas peças,
 * cada uma vira um `border-image` próprio e o texto mora na caixa, não na
 * moldura.
 *
 * ⚠️ **Ampliado por 4 com vizinho-mais-próximo**, e o número é inteiro de
 * propósito: a arte é de pixel, e um fator quebrado deixaria uns pixels com o
 * dobro da largura dos outros na mesma borda.
 *
 * ## Uso
 *
 *   node tools/hud/janela2png.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './png.mjs';

const ORIGEM = 'arte-fonte/hud-ui/Main_tiles.png';
const DESTINO = 'client/public/assets/hud/janela';
const ESCALA = 4;

/**
 * As peças, medidas na folha de 384×304.
 *
 * ⚠️ As três fileiras de cima da folha são o MESMO conjunto em três tamanhos —
 * a de baixo (y=96..132) é a maior, e é a que tem borda grossa o bastante para
 * sobreviver a virar `border-image`. Nas menores a borda tem 2 px, e uma fatia
 * de 2 não desenha canto nenhum.
 */
const PECAS = [
  { nome: 'janela_titulo', x0: 101, y0: 96, x1: 138, y1: 109 },
  { nome: 'janela_corpo', x0: 103, y0: 110, x1: 136, y1: 132 },
  /*
   * ⚠️ O botão de fechar tem retângulo CRAVADO, e não aparado: ele divide o
   * bloco com a aba que fica logo à direita, e a aparação por alfa engolia as
   * duas juntas — o corte saía com um rabo de madeira colado no canto.
   */
  { nome: 'janela_fechar', x0: 160, y0: 112, x1: 173, y1: 127 },
];

const img = decode(ORIGEM);
mkdirSync(DESTINO, { recursive: true });

for (const p of PECAS) {
  let [x0, y0, x1, y1] = [p.x0, p.y0, p.x1, p.y1];
  if (p.apara) {
    let [ax, ay, bx, by] = [x1, y1, x0, y0];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (img.px[(y * img.w + x) * 4 + 3] < 24) continue;
        if (x < ax) ax = x; if (x > bx) bx = x;
        if (y < ay) ay = y; if (y > by) by = y;
      }
    }
    [x0, y0, x1, y1] = [ax, ay, bx, by];
  }

  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const W = w * ESCALA;
  const H = h * ESCALA;
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = ((y0 + Math.floor(y / ESCALA)) * img.w + x0 + Math.floor(x / ESCALA)) * 4;
      const d = (y * W + x) * 4;
      out[d] = img.px[o]; out[d + 1] = img.px[o + 1];
      out[d + 2] = img.px[o + 2]; out[d + 3] = img.px[o + 3];
    }
  }
  writeFileSync(join(DESTINO, `${p.nome}.png`), encode(W, H, out));
  console.log(`[janela] ${p.nome}.png  ${W}x${H}  (fonte ${w}x${h} em ${x0},${y0})`);
}
