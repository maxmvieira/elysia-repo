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
import type { ProfessionId } from './crafting.js';
import type { GameMap } from './tiles.js';
import { getTileType, inDepotZone, isWalkable, tileAt } from './tiles.js';

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

/**
 * Qual profissão cada nó treina.
 *
 * As três de coleta são as do `DD-NPC-005` (Instrutor Minerador, Lenhador e
 * Herbalista) — ver o comentário de `ProfessionId` em `crafting.ts`.
 *
 * ⚠️ Duas escolhas que o doc não fecha e que valem registro:
 *
 * - **Cristal treina Minerador**, e não uma quarta profissão. O `DD-DROP-013`
 *   dá Cristais como MATERIAL de Ferreiro e Joalheiro, mas material não é
 *   profissão: quem pica pedra com picareta está minerando, e o cristal usa a
 *   mesma ferramenta do minério.
 * - **Cogumelo treina Herbalista.** O 44.1 chama cogumelo de "recurso
 *   subterrâneo" e não de erva, mas nenhuma profissão do documento colhe
 *   cogumelo — e criar uma quarta para um nó só seria profissão de fachada.
 */
export const GATHER_PROFESSION: Record<NodeKind, ProfessionId> = {
  ore: 'miner',
  crystal: 'miner',
  wood: 'lumberjack',
  herb: 'herbalist',
  mushroom: 'herbalist',
};

/**
 * Distância máxima (Chebyshev) para coletar.
 *
 * O mesmo `1` de pegar item do chão e de saquear corpo, e de propósito: as três
 * são "mexer em algo que está ali", e alcances diferentes para o mesmo gesto só
 * ensinariam o jogador a duvidar da distância.
 *
 * 🔴 É o que permite o nó de MADEIRA morar num tile de árvore, que é sólido: não
 * se pisa nele, mas se alcança de qualquer um dos oito lados.
 */
export const GATHER_RANGE = 1;

/**
 * Intervalo mínimo entre duas coletas do mesmo jogador, em ms.
 *
 * ⚠️ REFERÊNCIA — nenhum documento dá tempo de coleta. Existe por uma razão
 * concreta: sem ele, um nó de 3 cargas se esvazia em três cliques no mesmo
 * quadro, e a coleta vira um botão em vez de uma atividade. Perto de um segundo
 * é o bastante para o gesto ter peso sem virar espera.
 */
export const GATHER_COOLDOWN_MS = 1_200;

/** Um nó posicionado no mundo, antes de virar entidade viva no servidor. */
export interface ResourceNodeSpot {
  kind: NodeKind;
  x: number;
  y: number;
  floor: number;
}

/**
 * 🔴 **Nós ficam FORA da vila**, a pelo menos isto de distância do ponto de
 * nascimento (Chebyshev).
 *
 * A muralha de Valoria fica a exatamente 10 tiles do centro, então `11` é o
 * primeiro tile do lado de fora. Não é decoração: recurso dentro dos muros faria
 * o jogador coletar sem nunca sair do lugar mais seguro do mapa, e coleta que
 * não expõe a nada é só um clique repetido.
 */
export const NODE_MIN_SPAWN_DIST = 11;

/** Um a cada quantas árvores do bosque vira nó de madeira. ⚠️ REFERÊNCIA. */
const WOOD_EVERY = 6;

/**
 * Onde nasce cada nó que NÃO é madeira, em faixas de distância do nascimento.
 *
 * Mesma lógica do povoamento de criaturas (`spawnInitialCreatures`): a
 * dificuldade de chegar é a curva. Cogumelo e erva ficam no primeiro anel,
 * minério mais fora, e **cristal a 32+ tiles, dentro do território do Tier III** —
 * é o material mais valioso do conjunto, e o preço dele é a vizinhança.
 *
 * ⚠️ São coordenadas ESCRITAS À MÃO, mas não frágeis: `buildResourceNodes`
 * empurra para o tile válido mais próximo qualquer ponto que caia em água,
 * árvore ou parede. Mudar o mapa reposiciona o nó, não o apaga.
 */
const HAND_PLACED: Array<[NodeKind, number, number]> = [
  // Cogumelo — a porta de entrada: não pede ferramenta, então nasce no anel
  // mais próximo, onde chega quem acabou de sair da vila sem nada.
  ['mushroom', 8, 18], ['mushroom', 18, 8], ['mushroom', 31, 12],
  ['mushroom', 26, 32], ['mushroom', 12, 32],
  // Ervas — logo depois, e já exigindo a Foice comprada do comerciante.
  ['herb', 8, 14], ['herb', 32, 8], ['herb', 14, 34], ['herb', 34, 30], ['herb', 2, 24],
  // Minério — o segundo anel, junto do Tier II.
  ['ore', 4, 20], ['ore', 36, 20], ['ore', 20, 4], ['ore', 20, 36],
  ['ore', 6, 6], ['ore', 34, 34], ['ore', 44, 20], ['ore', 20, 44],
  // Cristal — leste e sul profundos, onde mora o Tier III.
  ['crystal', 52, 32], ['crystal', 32, 52], ['crystal', 54, 54],
];

const chebyshev = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

/**
 * Onde os nós do mundo nascem, derivado do MAPA.
 *
 * Determinístico e puro: as mesmas entradas dão a mesma saída sempre, o que
 * permite testar o povoamento sem subir servidor — e é o que garante que reiniciar
 * o mundo devolva os nós aos mesmos lugares.
 *
 * 🔴 **A madeira sai das ÁRVORES que já existem no mapa**, uma a cada
 * `WOOD_EVERY`. Não se desenha uma árvore nova ao lado da árvore: o bosque já
 * está lá, e o que faltava era dizer quais dele se pode cortar. O nó por cima do
 * tile também resolve sozinho a pergunta "por que esta árvore e não aquela" —
 * quem tem marca, corta.
 *
 * ⚠️ Cortar **não derruba** a árvore. O tile continua sendo árvore porque o mapa
 * é gerado dos dois lados e não trafega pela rede: mudar o tile aqui
 * dessincronizaria cliente e servidor na hora. O que se esgota é o nó.
 */
export function buildResourceNodes(map: GameMap): ResourceNodeSpot[] {
  const out: ResourceNodeSpot[] = [];
  const tomados = new Set<number>();
  const chave = (x: number, y: number): number => y * map.width + x;
  const { x: sx, y: sy, floor } = map.spawn;

  /** Serve para nó que se PISA ao lado: andável, fora da vila e fora do DP. */
  const valido = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < map.width && y < map.height
    && isWalkable(map, x, y, floor)
    && !inDepotZone(map, x, y)
    && chebyshev(x, y, sx, sy) >= NODE_MIN_SPAWN_DIST
    && !tomados.has(chave(x, y));

  for (const [kind, x0, y0] of HAND_PLACED) {
    // Anéis crescentes ao redor do ponto pedido. O raio pequeno é intencional:
    // se nada serve a 3 tiles, o ponto está errado o bastante para merecer
    // conserto à mão, e empurrar 10 tiles esconderia isso.
    let posto = false;
    for (let r = 0; r <= 3 && !posto; r++) {
      for (let dy = -r; dy <= r && !posto; dy++) {
        for (let dx = -r; dx <= r && !posto; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // só a casca do anel
          const x = x0 + dx;
          const y = y0 + dy;
          if (!valido(x, y)) continue;
          tomados.add(chave(x, y));
          out.push({ kind, x, y, floor });
          posto = true;
        }
      }
    }
  }

  // Madeira: as árvores do bosque, uma a cada `WOOD_EVERY`, desde que dê para
  // ficar ao lado delas (árvore cercada de água ou de outras árvores seria nó
  // visível e inalcançável).
  const temVizinhoAndavel = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (isWalkable(map, x + dx, y + dy, floor)) return true;
      }
    }
    return false;
  };
  let vistas = 0;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (getTileType(tileAt(map, x, y, floor)).name !== 'tree') continue;
      if (chebyshev(x, y, sx, sy) < NODE_MIN_SPAWN_DIST) continue;
      if (!temVizinhoAndavel(x, y)) continue;
      if (vistas++ % WOOD_EVERY !== 0) continue;
      tomados.add(chave(x, y));
      out.push({ kind: 'wood', x, y, floor });
    }
  }

  return out;
}
