/**
 * Onde ficam os PRÉDIOS do mundo, e que chão eles ocupam.
 *
 * 🔴 **Mora em `shared` por um motivo duro: colisão é decidida no SERVIDOR.**
 * Se a posição vivesse só no cliente, ele desenharia a casa e o servidor
 * deixaria o jogador atravessá-la — o cliente não é fonte de verdade de
 * movimento em lugar nenhum deste projeto. Aqui os dois leem a mesma lista.
 *
 * O cliente usa isto para saber ONDE desenhar o sprite; o `worldgen` usa para
 * pintar a pegada de `building` no mapa, e daí a colisão sai de graça pelo
 * `isWalkable`, que já existia.
 *
 * ## 🔴 A PEGADA NÃO É O TAMANHO DO SPRITE
 *
 * A casa é desenhada com **7 tiles de largura**, mas o que encosta no chão é só
 * a base de pedra: medida no PNG, ela tem **4,2 tiles**. O resto é telhado
 * avançando e o andar de cima em balanço — que passam *por cima* do jogador,
 * não *contra* ele.
 *
 * ⚠️ Usar os 7 tiles como pegada faria o jogador esbarrar no ar a dois tiles da
 * parede. É o mesmo erro que o `spritebox.ts` conta ter custado caro nas
 * árvores: tratar a moldura do desenho como se fosse o desenho.
 */

/** Um prédio: onde está, e quanto chão ocupa. */
export interface PredioDef {
  /** Nome do PNG em `client/public/assets/buildings/`, sem extensão. */
  arquivo: string;
  /** Tile onde o PÉ do desenho assenta (centro da frente da base). */
  x: number;
  y: number;
  /** Largura da pegada, em tiles. */
  larg: number;
  /** Profundidade da pegada, em tiles, contada para o NORTE a partir de `y`. */
  prof: number;
}

/**
 * Os prédios do mundo.
 *
 * ⚠️ **(172,152) é POSIÇÃO DE TESTE**, escolhida em 14/08 por ser onde o
 * personagem do dono estava salvo — serve para olhar a casa sem andar. O lugar
 * definitivo é perto do `WORLD_SPAWN` (150,158), quando o vilarejo de Lumindale
 * for remontado.
 *
 * ⚠️ A pegada 4×3 sai da medição da base (4,2 tiles de largura), arredondada
 * para baixo. A profundidade é chute educado: a base é um losango isométrico e
 * o quanto disso vira "fundo" no mundo quadrado não se mede no PNG. É a
 * primeira coisa a ajustar depois de ver o jogador contornando a casa.
 */
export const PREDIOS: readonly PredioDef[] = [
  { arquivo: 'casa-2-andares', x: 172, y: 152, larg: 4, prof: 3 },
];

/**
 * Os tiles que um prédio ocupa.
 *
 * A pegada cresce para o NORTE (y menor) porque o sprite é ancorado pelo pé:
 * `(x, y)` é a quina da frente, e o corpo do prédio sobe na tela a partir dela.
 * Em x ela é centrada, com a sobra à esquerda quando a largura é par.
 */
export function tilesDoPredio(p: PredioDef): Array<{ x: number; y: number }> {
  const saida: Array<{ x: number; y: number }> = [];
  const meia = Math.floor(p.larg / 2);
  for (let dy = 0; dy < p.prof; dy++) {
    for (let dx = 0; dx < p.larg; dx++) {
      saida.push({ x: p.x - meia + dx, y: p.y - dy });
    }
  }
  return saida;
}
