/**
 * Carregador dos sprites de **MÓVEL** (pixel art gerada pelo PixelLab, em
 * `client/public/assets/furniture/`).
 *
 * Primo do [`trees.ts`](./trees.ts) e do [`buildings.ts`](./buildings.ts):
 * reusa o mesmo `spritebox` (caixa de alpha medida), a mesma âncora pelo pé e a
 * mesma escala por **largura em tiles**. Nenhum sistema novo.
 *
 * ## 🔴 Por que móvel virou objeto, e não continuou parede
 *
 * Até 15/08 cada `F` da planta virava `wall_interior`: bloqueava certo e
 * **desenhava como pedra**. O dono viu a cama como um muro no meio do quarto.
 *
 * Agora o tile é `furniture` — chão desenhado por baixo, sólido por regra — e o
 * móvel vem por cima como sprite. É a mesma divisão que a árvore já usa: o tile
 * diz onde não se pisa, o sprite diz o que se vê.
 *
 * ## 🔴 Por que o PixelLab servia aqui, e não servia para o resto
 *
 * O `PIXELLAB-RECEITA.md` documenta ~44 gerações perdidas em seis becos, e o
 * maior é **girar o desenho para 4 direções** (o `/rotate` duplica a cabeça, o
 * `direction` do pixflux é ignorado).
 *
 * **Móvel não gira.** Uma cama vista de cima é a mesma de qualquer lado que o
 * jogador venha. Então só o passo que a receita registra como *"saiu bom de
 * primeira"* é usado: `generate-image-pixflux` com `high top-down`. Nove móveis,
 * nove gerações, nenhum beco.
 *
 * ## As duas armadilhas de sempre
 *
 * Valem aqui igual valem para árvore, e estão inteiras no `spritebox.ts`: o PNG
 * passa por **canvas 2D** (o `Assets.load` do Pixi pinta a transparência de
 * PRETO), e o `loadImage` espera `onload`, nunca `img.decode()`.
 *
 * Arquivo ausente devolve `null` e o tile fica sólido sem desenho — bloqueia,
 * mas não some nada. Arte continua opcional.
 */

import { loadSpriteMedido, type SpriteMedido } from './spritebox.js';
import { MOVEL_DA_LETRA } from '@dominion/shared';

const BASE = '/assets/furniture';

/**
 * Largura de cada móvel, **em tiles**.
 *
 * 🔴 É a largura do DESENHO, não a do arquivo — a escala divide pela caixa
 * medida, como em `trees.ts`. Lá isso já fez dois aumentos seguidos entregarem
 * metade do pedido.
 *
 * Calibragem: o tile tem 32 px e o herói 58 px de altura (~1,8 tile). Uma cama
 * de casal ocupa 2 tiles, um baú menos de 1.
 *
 * ⚠️ Números de referência, não medição. São a primeira coisa a ajustar depois
 * de ver o quarto em tela.
 */
const LARGURA: Record<string, number> = {
  cama: 2,
  bau: 0.9,
  armario: 1.3,
  mesa: 1.5,
  barril: 0.9,
  bigorna: 1.1,
  forja: 1.6,
  caldeirao: 1,
  bancada: 1.6,
};

const LARGURA_PADRAO = 1;

export interface MovelSprite extends SpriteMedido {
  largura: number;
}

const carregados = new Map<string, MovelSprite>();

/** Carrega todos os móveis citados pelas plantas. Devolve quantos entraram. */
export async function loadFurniture(): Promise<number> {
  const nomes = [...new Set(Object.values(MOVEL_DA_LETRA))];
  for (const nome of nomes) {
    if (carregados.has(nome)) continue;
    const medido = await loadSpriteMedido(`${BASE}/${nome}.png`);
    if (!medido) continue; // ausente: o tile fica sólido e sem desenho
    carregados.set(nome, { ...medido, largura: LARGURA[nome] ?? LARGURA_PADRAO });
  }
  console.log(`[furniture] ${carregados.size} de ${nomes.length} carregados`);
  return carregados.size;
}

/** O móvel daquela LETRA da planta, ou `null`. */
export function movelDaLetra(letra: string): MovelSprite | null {
  const nome = MOVEL_DA_LETRA[letra];
  return nome ? carregados.get(nome) ?? null : null;
}
