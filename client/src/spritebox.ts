/**
 * Carrega um PNG **medindo a caixa do desenho** dentro da moldura.
 *
 * ## Por que isto existe
 *
 * Os packs de arte (CraftPix e afins) deixam muita transparência em volta do
 * desenho, e a sobra é **diferente em cada arquivo**. Tratar a moldura do PNG
 * como se fosse o desenho produziu dois bugs que só apareceram vendo em tela:
 *
 * 1. **A árvore boiava acima da própria sombra.** O sprite era ancorado no
 *    rodapé da moldura, e em vários arquivos aquilo é só transparência. Como a
 *    sobra varia por arquivo, o defeito aparecia em *algumas* árvores — o que
 *    fez parecer bug de grid, e não de âncora.
 * 2. **Tudo saía menor do que o pedido.** A escala mirava a largura da moldura,
 *    e como o desenho ocupa cerca de metade dela, pedir "2 tiles" entregava 1.
 *    Dois aumentos seguidos erraram o alvo por causa disso.
 *
 * Com a caixa medida, "largura em tiles" passa a valer para o que se vê.
 *
 * ## 🔴 Duas armadilhas que o caminho pelo canvas resolve de brinde
 *
 * - **Não use `Assets.load`.** O caminho do Pixi 8 (ImageBitmap) renderiza as
 *   áreas transparentes destes PNGs como **PRETO** — foi o bug do quadrado preto
 *   em volta das árvores. O compositing do canvas 2D respeita o alpha.
 * - **`loadImage` espera `onload`, nunca `img.decode()`.** Em aba de segundo
 *   plano o Chrome adia a decodificação e a promessa do `decode()` não resolve
 *   nunca, travando o carregamento do jogo para sempre, sem erro no console.
 *
 * O canvas é obrigatório pelo primeiro motivo e é ele que dá o `getImageData`
 * da medição: nenhuma leitura a mais do que já era feita.
 */

import { Texture } from 'pixi.js';
import { loadImage } from './miniworld.js';

/** Uma textura e onde o desenho realmente está dentro dela. */
export interface SpriteMedido {
  tex: Texture;
  /** Onde o desenho acaba embaixo, fração da altura (0..1). Âncora vertical. */
  base: number;
  /** Centro horizontal do desenho, fração da largura. Âncora em x. */
  centro: number;
  /** Quanto da largura da moldura o desenho ocupa (0..1). Divide a escala. */
  cheia: number;
  /**
   * Quanto da ALTURA da moldura o desenho ocupa (0..1).
   *
   * 🔴 Existe porque `cheia` sozinha só serve para quem escala pela LARGURA — a
   * árvore e o prédio. Quem precisa CABER dentro de uma caixa (o móvel, que é
   * encaixado no bloco da planta) divide os dois eixos, e sem isto o eixo
   * vertical continuaria mirando a moldura — o mesmo erro que `cheia` conserta
   * no horizontal.
   */
  alta: number;
}

/**
 * ⚠️ Corte de alpha 8, não 0.
 *
 * Estes PNGs têm anti-aliasing na borda. Um pixel de alpha 2 — invisível na
 * tela — esticaria a caixa até a moldura e desfaria a medição inteira.
 */
const ALPHA_MIN = 8;

/** Carrega e mede. `null` se o arquivo não existir (a arte é sempre opcional). */
export async function loadSpriteMedido(url: string): Promise<SpriteMedido | null> {
  try {
    const img = await loadImage(url);
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0);

    const tex = Texture.from(cv);
    tex.source.scaleMode = 'nearest'; // pixel art nítida

    const { data } = g.getImageData(0, 0, cv.width, cv.height);
    let x0 = cv.width, x1 = -1, y0 = cv.height, y1 = -1;
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        if (data[(y * cv.width + x) * 4 + 3]! > ALPHA_MIN) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          y1 = y;
        }
      }
    }
    // PNG inteiramente transparente: devolve a moldura e não divide por zero.
    if (x1 < 0) return { tex, base: 1, centro: 0.5, cheia: 1, alta: 1 };

    return {
      tex,
      base: (y1 + 1) / cv.height,
      centro: (x0 + x1 + 1) / 2 / cv.width,
      cheia: (x1 - x0 + 1) / cv.width,
      alta: (y1 - y0 + 1) / cv.height,
    };
  } catch {
    return null;
  }
}
