/**
 * Carregador dos sprites de **PRÉDIO** (arte 2D isométrica gerada, recortada
 * para `client/public/assets/buildings/`).
 *
 * Irmão do [`trees.ts`](./trees.ts), e de propósito: prédio é decoração alta
 * como árvore, então ele reusa o mesmo `spritebox` (caixa de alpha medida),
 * a mesma âncora pelo pé e a mesma escala por **largura em tiles**. Nada de
 * sistema novo — o `makeTree` já provou que o caminho funciona.
 *
 * ## 🔴 ISTO É UM TESTE DE LEITURA VISUAL, e ainda não é o vilarejo
 *
 * O `HANDOFF` de 05/08 registra que o vilarejo de Lumindale foi **apagado**
 * esperando os packs de casa. Este arquivo põe **uma** casa num ponto fixo
 * dentro da praça segura, para responder a única pergunta que medição não
 * responde: **a casa isométrica lê bem sobre o chão quadrado do jogo?**
 *
 * ⚠️ O mundo de Elysia é **grade quadrada vista de cima**, não isométrico —
 * não existe uma linha de código isométrico no cliente. A casa, porém, foi
 * desenhada em projeção isométrica, então a base dela é um losango que não se
 * alinha ao quadriculado do piso. O Tibia desenha prédio em leve 3/4 sobre
 * chão quadrado e funciona; se aqui também funciona, só olhando.
 *
 * 🔴 **Não espalhe casa pelo mundo antes de o dono olhar esta.** Montar o
 * vilarejo mexe no `worldgen` e no `SAFE_ZONE_RADIUS`, que o `HANDOFF` marca
 * como coisa a não pegar sozinho.
 *
 * ## As duas armadilhas de sempre
 *
 * Valem aqui igual valem para árvore, e estão inteiras no `spritebox.ts`:
 * o PNG passa por **canvas 2D** (o `Assets.load` do Pixi pinta a
 * transparência de PRETO), e o `loadImage` espera `onload`, nunca
 * `img.decode()` (que em aba oculta não resolve nunca e trava o boot).
 *
 * Arquivo ausente devolve `null` e o mundo fica como sempre foi — arte é
 * opcional, como nas árvores e nos cristais.
 */

import { loadSpriteMedido, type SpriteMedido } from './spritebox.js';
// 🔴 A posição vem do SHARED, não daqui: o servidor usa a mesma lista para
// pintar a pegada sólida. Se o cliente tivesse a própria cópia, casa desenhada
// e casa com colisão poderiam sair de lugares diferentes.
import { PREDIOS } from '@dominion/shared';

const BASE = '/assets/buildings';

/**
 * Largura de cada prédio, **em tiles**.
 *
 * 🔴 **É a largura do DESENHO, não a do arquivo** — a escala divide pela caixa
 * medida (`cheia`), exatamente como em `trees.ts`. Foi o erro que lá fez dois
 * aumentos seguidos entregarem metade do pedido.
 *
 * Calibragem, nas mesmas unidades que o `trees.ts` usa: a criatura tem **1,2
 * tile** na tela e o carvalho grande tem **4,2**. Uma casa de dois andares
 * precisa dominar a cena sem engolir a praça, cujo raio é 12 tiles. Em **7**
 * ela fica ~1,7× o carvalho e ocupa pouco mais de meio raio da praça.
 *
 * ⚠️ Este número é chute educado, não medição — é a primeira coisa a ajustar
 * depois de ver em tela.
 */
const LARGURA: Record<string, number> = {
  'casa-2-andares': 7,
};

const LARGURA_PADRAO = 5;

/** A arte já medida, mais a largura pedida em tiles. */
export interface PredioSprite extends SpriteMedido {
  largura: number;
}

const carregados = new Map<string, PredioSprite>();

/** Carrega os prédios de `PREDIOS`. Devolve quantos entraram. */
export async function loadBuildings(): Promise<number> {
  for (const { arquivo } of PREDIOS) {
    if (carregados.has(arquivo)) continue;
    const medido = await loadSpriteMedido(`${BASE}/${arquivo}.png`);
    if (!medido) continue; // ausente: o mundo segue sem a casa
    carregados.set(arquivo, { ...medido, largura: LARGURA[arquivo] ?? LARGURA_PADRAO });
  }
  console.log(`[buildings] ${carregados.size} de ${PREDIOS.length} carregados`);
  return carregados.size;
}

/** O prédio daquele arquivo, ou `null` se a arte não estiver no disco. */
export function predioSprite(arquivo: string): PredioSprite | null {
  return carregados.get(arquivo) ?? null;
}

/**
 * Os prédios cujo tile cai dentro do pedaço `[x0,x1) x [y0,y1)`.
 *
 * O `montaChunk` monta e destrói pedaços conforme a câmera anda, então o prédio
 * precisa nascer junto do pedaço que o contém — senão ele apareceria uma vez e
 * sumiria na primeira reciclagem.
 */
export function prediosNoPedaco(
  x0: number, y0: number, x1: number, y1: number,
): Array<{ sprite: PredioSprite; x: number; y: number }> {
  const saida: Array<{ sprite: PredioSprite; x: number; y: number }> = [];
  for (const { arquivo, x, y } of PREDIOS) {
    if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
    const sprite = carregados.get(arquivo);
    if (sprite) saida.push({ sprite, x, y });
  }
  return saida;
}
