/**
 * 🧊 Gera a SOBREPOSIÇÃO de congelamento — o bloco de gelo que envolve quem
 * congelou.
 *
 * 🔴 **Por que é gerada.** O script que o dono trouxe em 11/09 declarava
 * `frozen_status_overlay.png`, mas o base64 dele veio vazio e a linha que o
 * gravava veio comentada. O arquivo nunca existiu; sem isto, o cliente pediria
 * uma folha ausente e a sobreposição não apareceria — em silêncio, como já
 * aconteceu com a névoa neste mesmo dia.
 *
 * ⚠️ **O bloco é TRANSLÚCIDO e o alfa é baixo de propósito.** Ele cobre o
 * monstro inteiro; opaco, esconderia qual bicho está ali, e saber o que está
 * congelado é metade da informação. O que precisa ler de longe é a SILHUETA
 * azulada e o brilho das quinas, não o volume.
 *
 * ⚠️ **Sem contorno preto.** O jogo desenha isto por cima do sprite em mistura
 * normal; uma borda escura recortaria o monstro do cenário como adesivo.
 *
 *   node tools/gelo-congelado.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/spells';
const W = 48;
const H = 72;

const px = Buffer.alloc(W * H * 4);

/** Mistura uma cor no pixel, respeitando o alfa acumulado. */
function poe(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  const dest = px[o + 3] / 255;
  const na = a + dest * (1 - a);
  if (na <= 0) return;
  px[o] = Math.round((r * a + px[o] * dest * (1 - a)) / na);
  px[o + 1] = Math.round((g * a + px[o + 1] * dest * (1 - a)) / na);
  px[o + 2] = Math.round((b * a + px[o + 2] * dest * (1 - a)) / na);
  px[o + 3] = Math.round(na * 255);
}

/*
 * O corpo do bloco: um prisma com o topo mais estreito que a base, porque um
 * retângulo reto lê como janela e não como pedra de gelo. A largura cresce de
 * cima para baixo.
 */
for (let y = 0; y < H; y++) {
  const t = y / (H - 1);
  const meia = (0.30 + 0.20 * t) * W;
  for (let x = 0; x < W; x++) {
    const d = Math.abs(x - W / 2);
    if (d > meia) continue;
    /*
     * ⚠️ Mais claro nas BORDAS e mais transparente no meio. É o contrário do
     * instinto, e é o que dá a leitura de vidro: o miolo deixa ver o monstro,
     * as quinas acendem. Preencher por igual daria um retângulo azul chapado.
     */
    const borda = d / meia;
    /*
     * ⚠️ **AZUL de verdade, e não branco de baixo alfa.** A primeira versão
     * usava tons quase brancos; sobre a grama do jogo ela sumia numa mancha
     * pálida esverdeada, sem dizer "gelo". O vermelho é o canal que precisa
     * cair — é ele que desbota o azul contra fundo claro.
     */
    const a = 0.26 + borda * borda * 0.46;
    poe(
      x, y,
      60 + Math.round(borda * 130),
      150 + Math.round(borda * 85),
      255,
      a,
    );
  }
  /*
   * ⚠️ **A QUINA, desenhada à parte e quase opaca.** Sem ela o bloco tem o alfa
   * subindo até a borda e parando no ar — lê como névoa azul, não como objeto.
   * Duas colunas de pixel acesas dão o vidro: é a silhueta que diz "tem uma
   * coisa sólida em volta do bicho", e ela é a leitura de longe.
   */
  const meiaQ = (0.30 + 0.20 * (y / (H - 1))) * W;
  for (const lado of [-1, 1]) {
    const x = Math.round(W / 2 + lado * meiaQ);
    poe(x, y, 205, 240, 255, 0.85);
    poe(x - lado, y, 130, 200, 255, 0.55);
  }
}

/*
 * As FACETAS: riscos diagonais claros, do jeito que gelo quebra a luz. São o
 * que impede o bloco de virar um filtro de cor por cima do sprite.
 *
 * ⚠️ **PARALELOS, e todos no mesmo sentido.** A primeira versão alternava a
 * direção e os três se encontravam num zigue-zague — lê como rabisco, não como
 * reflexo. Luz que entra num bloco vem de uma direção só.
 */
for (const [x0, y0, comp] of [[13, 12, 13], [24, 30, 15], [11, 46, 12], [28, 56, 9]]) {
  for (let i = 0; i < comp; i++) {
    poe(x0 + i, y0 + i, 245, 252, 255, 0.72);
    poe(x0 + i, y0 + i + 1, 200, 232, 255, 0.34);
  }
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, 'frozen_status_overlay.png'), encode(W, H, px));
console.log(`[gelo] frozen_status_overlay.png  ${W}x${H}`);
