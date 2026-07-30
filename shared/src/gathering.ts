/**
 * Coleta e mineração — o que destrava metade do `44.1`.
 *
 * 🔴 **Seis famílias de material estavam PROIBIDAS de existir por falta disto.**
 * `materials.ts` diz, com todas as letras: *"só material que tem como ser obtido
 * entra aqui"*, e por isso Minérios, Madeiras, Ervas, Flores, Cogumelos e Gemas
 * ficaram de fora — criar o item sem a forma de consegui-lo seria criar item
 * inalcançável, que é o que o `DD-MAT-001` proíbe. A consequência prática era
 * dura: **o Ferreiro não tinha minério e o Alquimista não tinha erva.**
 *
 * O cap. 44.1 dá a origem de cada família em uma linha:
 *
 * ```
 * Minérios    "obtidos através da mineração"
 * Madeiras    "obtidas através do corte de árvores"
 * Ervas       "obtidas por coleta"
 * Flores      "recursos botânicos"
 * Cogumelos   "recursos subterrâneos"
 * Cristais    "encontrados em cavernas e regiões especiais"
 * ```
 *
 * ## 🔴 A ferramenta de lenhador não precisou ser inventada
 *
 * O cap. 35 lista "Machado de Lenhador" entre os **equipamentos de profissão**, e
 * o cap. 14 lista o mesmo nome entre os **machados**. Isso foi registrado como
 * colisão do documento quando o catálogo entrou — e não era: é o **mesmo
 * objeto**. Cortar árvore exige um machado equipado, e o machado inicial do jogo
 * chama-se Machado de Lenhador. O documento estava certo dos dois lados.
 *
 * A Picareta e a Foice, essas sim, não existiam — e entram agora, saindo de
 * `PENDING_MODEL_CATEGORIES.ferramentas`.
 */

import type { WeaponType } from './weapons.js';
import type { Rarity } from './weapons.js';

/** O que um nó de recurso é. */
export type NodeKind = 'ore' | 'wood' | 'herb' | 'mushroom' | 'crystal';

export const NODE_KINDS: NodeKind[] = ['ore', 'wood', 'herb', 'mushroom', 'crystal'];

/**
 * Como se exige a ferramenta de cada nó.
 *
 * - `weapon`: precisa de uma ARMA daquele tipo equipada. É o caso da madeira —
 *   o machado do jogo já é a ferramenta.
 * - `item`: precisa do `kind` na mochila (não equipado — Picareta e Foice não
 *   ocupam slot).
 * - `none`: mão limpa serve. Cogumelo e flor não pedem nada, e é isso que os
 *   torna a porta de entrada da coleta.
 */
export type ToolNeed =
  | { mode: 'weapon'; weapon: WeaponType }
  | { mode: 'item'; kind: string }
  | { mode: 'none' };

export interface NodeDef {
  kind: NodeKind;
  name: string;
  tool: ToolNeed;
  /** Frase de recusa quando falta a ferramenta. */
  toolHint: string;
  /**
   * Quantas coletas o nó aguenta antes de se esgotar.
   *
   * ⚠️ REFERÊNCIA: o doc não dá número. Mais de uma existe para o jogador não
   * precisar caçar um nó novo a cada item, e poucas para o nó não virar torneira
   * parada — a graça é percorrer o mapa, não plantar-se num ponto.
   */
  charges: number;
  /** Tempo até renascer, em ms. ⚠️ REFERÊNCIA. */
  respawnMs: number;
  /** Cor do ícone desenhado por código no cliente. */
  color: number;
  /**
   * O que sai, por raridade. O sorteio anda pela lista do mais comum ao mais
   * raro, então a ORDEM importa: o primeiro é o resultado do dia a dia.
   */
  yields: Array<{ kind: string; chance: number }>;
}

/**
 * Os cinco nós.
 *
 * ⚠️ As chances são REFERÊNCIA — nenhum documento dá probabilidade de coleta. A
 * regra que segui: o material comum sai quase sempre (a coleta não pode
 * frustrar), e o degrau acima é raro o bastante para ser notícia.
 */
export const NODES: Record<NodeKind, NodeDef> = {
  ore: {
    kind: 'ore',
    name: 'Veio de Minério',
    tool: { mode: 'item', kind: 'pickaxe' },
    toolHint: 'Você precisa de uma Picareta.',
    charges: 3,
    respawnMs: 5 * 60_000,
    color: 0x9a8a7a,
    yields: [
      { kind: 'iron_ore', chance: 1 },
      { kind: 'raw_gem', chance: 0.06 },
    ],
  },
  wood: {
    kind: 'wood',
    name: 'Árvore',
    // 🔴 A arma É a ferramenta. Ver o comentário do topo.
    tool: { mode: 'weapon', weapon: 'axe' },
    toolHint: 'Você precisa de um machado equipado.',
    charges: 3,
    respawnMs: 4 * 60_000,
    color: 0x6e4f2f,
    yields: [{ kind: 'oak_log', chance: 1 }],
  },
  herb: {
    kind: 'herb',
    name: 'Ervas',
    tool: { mode: 'item', kind: 'sickle' },
    toolHint: 'Você precisa de uma Foice.',
    charges: 2,
    respawnMs: 3 * 60_000,
    color: 0x5f9a4a,
    yields: [
      { kind: 'common_herb', chance: 1 },
      { kind: 'moon_flower', chance: 0.12 },
    ],
  },
  mushroom: {
    kind: 'mushroom',
    name: 'Cogumelos',
    // Mão limpa: é a porta de entrada da coleta, e quem acabou de nascer não
    // tem ferramenta nenhuma.
    tool: { mode: 'none' },
    toolHint: '',
    charges: 2,
    respawnMs: 3 * 60_000,
    color: 0xa06a9a,
    yields: [{ kind: 'cave_mushroom', chance: 1 }],
  },
  crystal: {
    kind: 'crystal',
    name: 'Veio de Cristal',
    tool: { mode: 'item', kind: 'pickaxe' },
    toolHint: 'Você precisa de uma Picareta.',
    charges: 1,
    respawnMs: 12 * 60_000,
    color: 0x7ad1e0,
    yields: [{ kind: 'mana_crystal', chance: 1 }],
  },
};

/** O jogador tem o que este nó exige? */
export function hasToolFor(
  node: NodeDef,
  ctx: { equippedWeapon?: WeaponType; hasItem: (kind: string) => boolean },
): boolean {
  switch (node.tool.mode) {
    case 'none': return true;
    case 'weapon': return ctx.equippedWeapon === node.tool.weapon;
    case 'item': return ctx.hasItem(node.tool.kind);
  }
}

/**
 * Sorteia o que sai de uma coleta.
 *
 * Devolve **um** `kind`, nunca vários: um nó com três cargas dá três itens em
 * três ações, e não três de uma vez. Coleta é ritmo, não caixa de presente.
 *
 * O primeiro rendimento com `chance: 1` funciona como piso — a lista é
 * percorrida do raro para o comum, então o raro tem a chance dele e o comum
 * garante que nenhuma coleta sai vazia. **Coleta vazia é o que ensina o jogador
 * a não coletar.**
 */
export function rollGather(node: NodeDef, rng: () => number = Math.random): string {
  for (let i = node.yields.length - 1; i >= 0; i--) {
    const y = node.yields[i]!;
    if (rng() < y.chance) return y.kind;
  }
  return node.yields[0]!.kind;
}

/**
 * XP de profissão por coleta.
 *
 * ⚠️ REFERÊNCIA. Proporcional à raridade do que o nó entrega e ao quanto ele
 * custa para achar: o Cristal vale muito mais que o Cogumelo porque tem uma
 * carga só e demora 12 minutos para voltar.
 */
export const GATHER_XP: Record<NodeKind, number> = {
  ore: 3,
  wood: 2,
  herb: 2,
  mushroom: 1,
  crystal: 12,
};

/** Raridade do material principal de cada nó, para a loja e o crafting. */
export const NODE_RARITY: Record<NodeKind, Rarity> = {
  ore: 'common',
  wood: 'common',
  herb: 'common',
  mushroom: 'common',
  crystal: 'rare',
};
