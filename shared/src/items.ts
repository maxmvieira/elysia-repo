/**
 * Catálogo de itens e modelo de inventário (compartilhado cliente/servidor).
 *
 * "Nada é lixo": todo drop tem uso. O servidor é a autoridade do inventário;
 * o cliente só exibe e envia intenções (comprar, usar, equipar, depositar).
 */

/**
 * Slots do paperdoll clássico do Tibia. `container` é a MOCHILA equipada (um
 * item-container que define quantos slots a mochila tem). `ring` é decorativo
 * por ora (sem anéis no catálogo ainda).
 */
export type EquipSlot =
  | 'necklace' | 'helmet' | 'container'
  | 'weapon' | 'armor' | 'shield'
  | 'ring' | 'pants' | 'boots';

export const EQUIP_SLOTS: EquipSlot[] = [
  'necklace', 'helmet', 'container', 'weapon', 'armor', 'shield', 'ring', 'pants', 'boots',
];

/** Rótulo PT de cada slot (para tooltips/UI). */
export const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  necklace: 'Colar',
  helmet: 'Capacete',
  container: 'Mochila',
  weapon: 'Arma',
  armor: 'Armadura',
  shield: 'Escudo',
  ring: 'Anel',
  pants: 'Calça',
  boots: 'Botas',
};

import { RARITY } from './weapons.js';
import type { ArmorClass, ItemRoll, WeaponType } from './weapons.js';

export type ItemCategory = 'currency' | 'consumable' | 'equip' | 'loot';

export interface ItemDef {
  kind: string;
  name: string;
  category: ItemCategory;
  /** Empilha no mesmo slot da mochila? (moedas, poções e loot sim; equip não.) */
  stackable: boolean;
  /** Preço de compra no NPC (0 = não vendido). */
  buyPrice: number;
  /**
   * Quanto o comerciante paga por unidade, quando isso NÃO deriva do `buyPrice`.
   *
   * Existe por causa do loot de monstro: Gosma de Slime e Pele de Serpente têm
   * `buyPrice: 0` porque a loja não as estoca, e sem este campo o preço de venda
   * cairia a zero — contra o "nada é lixo" que abre este arquivo. Ausente = usa
   * `buyPrice × SELL_PRICE_FACTOR`; `0` explícito = o comerciante não compra.
   */
  sellPrice?: number;
  /** Slot ocupado quando category === 'equip'. */
  slot?: EquipSlot;
  /** Efeito de consumível. */
  healHp?: number;
  healMana?: number;
  /** Bônus de EQUIPAMENTO (entram no cálculo de dano/defesa, estilo Tibia). */
  atk?: number;
  def?: number;
  /** Tipo da arma (só para slot 'weapon'): define identidade e proficiência. */
  weaponType?: WeaponType;
  /**
   * Categoria da armadura (Doc 4, cap. 38): Pesada, Leve ou Veste. Define qual
   * classe prioriza a peça. Só para peças de proteção.
   */
  armorClass?: ArmorClass;
  /**
   * 🔴 **Artefato Único** (cap. 40). Existe UM modelo, e ele nunca tem versões
   * por raridade — não existe "Heartblade Comum" nem "Heartblade Épica".
   *
   * O doc é explícito: isso preserva o valor narrativo e econômico. Item marcado
   * assim não deve entrar em pool de drop aleatório nem em receita de crafting.
   */
  unique?: boolean;
  /** Nível de personagem sugerido — usado para calibrar drops e loja. */
  tier?: number;
  /** Para containers (slot 'container'): quantos slots de mochila ele oferece. */
  capacity?: number;
  /** Valor em ouro (para moedas: gold=1, silver=100, blue=10000, white=1e6). */
  value?: number;
  /** Cor base para o ícone desenhado por código no cliente. */
  color: number;
}

export const ITEMS: Record<string, ItemDef> = {
  // Moedas: 100 de uma viram 1 da próxima (gold -> silver -> blue -> white).
  gold: { kind: 'gold', name: 'Moeda de Ouro', category: 'currency', stackable: true, buyPrice: 0, value: 1, color: 0xf2c14e },
  gold_silver: { kind: 'gold_silver', name: 'Ouro Prateado', category: 'currency', stackable: true, buyPrice: 0, value: 100, color: 0xcdd3da },
  gold_blue: { kind: 'gold_blue', name: 'Ouro Azul', category: 'currency', stackable: true, buyPrice: 0, value: 10000, color: 0x4a86d8 },
  gold_white: { kind: 'gold_white', name: 'Ouro Branco', category: 'currency', stackable: true, buyPrice: 0, value: 1000000, color: 0xeef1f6 },
  health_potion: {
    kind: 'health_potion', name: 'Poção de Vida', category: 'consumable',
    stackable: true, buyPrice: 15, healHp: 75, color: 0xcf3b2e,
  },
  mana_potion: {
    kind: 'mana_potion', name: 'Poção de Mana', category: 'consumable',
    stackable: true, buyPrice: 20, healMana: 60, color: 0x4a86d8,
  },
  torch: { kind: 'torch', name: 'Tocha (fonte de luz)', category: 'loot', stackable: true, buyPrice: 8, color: 0xff9a3c },

  // --- Fragmentos de Equipamento (`DD-PROF-021`) --------------------------
  // O material que sustenta o crafting inteiro. O doc escolheu "Fragmento de
  // Equipamento" genérico em vez de "fragmento de espada / de elmo / de
  // machado" de propósito: um item por raridade em vez de dezenas por tipo, e o
  // jogador entende na hora que é material reaproveitável do artesão.
  //
  // As cores acompanham `RARITY` em weapons.ts, para o ícone ser lido de
  // relance na mochila.
  fragment_common: {
    kind: 'fragment_common', name: 'Fragmento Comum', category: 'loot',
    stackable: true, buyPrice: 2, color: 0xb8b8b8,
  },
  fragment_uncommon: {
    kind: 'fragment_uncommon', name: 'Fragmento Incomum', category: 'loot',
    stackable: true, buyPrice: 8, color: 0x5fbf5f,
  },
  fragment_rare: {
    kind: 'fragment_rare', name: 'Fragmento Raro', category: 'loot',
    stackable: true, buyPrice: 30, color: 0x4a86d8,
  },
  fragment_epic: {
    kind: 'fragment_epic', name: 'Fragmento Épico', category: 'loot',
    stackable: true, buyPrice: 120, color: 0xa657ff,
  },
  fragment_legendary: {
    kind: 'fragment_legendary', name: 'Fragmento Lendário', category: 'loot',
    stackable: true, buyPrice: 500, color: 0xf2a03c,
  },
  fragment_mythic: {
    kind: 'fragment_mythic', name: 'Fragmento Mítico', category: 'loot',
    stackable: true, buyPrice: 2000, color: 0xe0405a,
  },
  fragment_relic: {
    kind: 'fragment_relic', name: 'Fragmento de Relíquia', category: 'loot',
    // Não vendável a NPC: `DD-PROF-028` faz dele matéria-prima dos dois Mestres
    // Ferreiros do mundo. Preço de balcão apagaria essa raridade.
    stackable: true, buyPrice: 0, color: 0xffe14a,
  },

  // --- Receitas (`DD-PROF-024` / `DD-PROF-025`) ---------------------------
  // 🔴 **Receita é CONSUMÍVEL, não conhecimento permanente.** Cada fabricação
  // gasta uma. É o que mantém demanda por receitas durante toda a vida do
  // servidor, em vez de o artesão aprender tudo no primeiro mês e nunca mais
  // comprar nada.
  //
  // A receita define a CATEGORIA (raridade), não o tipo de equipamento — o
  // jogador escolhe espada ou armadura na hora (`DD-PROF-026`).
  //
  // Só as duas primeiras são vendidas por NPC: `DD-PROF-027` põe as Raras em
  // monstros e bosses, e Míticas/Relíquias só em conteúdo endgame.
  recipe_common: {
    kind: 'recipe_common', name: 'Receita Comum', category: 'loot',
    stackable: true, buyPrice: 25, color: 0xb8b8b8,
  },
  recipe_uncommon: {
    kind: 'recipe_uncommon', name: 'Receita Incomum', category: 'loot',
    stackable: true, buyPrice: 90, color: 0x5fbf5f,
  },
  recipe_rare: {
    kind: 'recipe_rare', name: 'Receita Rara', category: 'loot',
    stackable: true, buyPrice: 0, color: 0x4a86d8,
  },
  recipe_epic: {
    kind: 'recipe_epic', name: 'Receita Épica', category: 'loot',
    stackable: true, buyPrice: 0, color: 0xa657ff,
  },
  recipe_legendary: {
    kind: 'recipe_legendary', name: 'Receita Lendária', category: 'loot',
    stackable: true, buyPrice: 0, color: 0xf2a03c,
  },
  recipe_mythic: {
    kind: 'recipe_mythic', name: 'Receita Mítica', category: 'loot',
    stackable: true, buyPrice: 0, color: 0xe0405a,
  },
  recipe_relic: {
    kind: 'recipe_relic', name: 'Receita de Relíquia', category: 'loot',
    stackable: true, buyPrice: 0, color: 0xffe14a,
  },
  // ⚠️ REFERÊNCIA nos dois `sellPrice`: nenhum doc dá preço para material de
  // monstro. Ancorados no Fragmento Comum (`buyPrice: 2`), que é o material mais
  // barato do jogo com preço fechado: a Gosma empata com ele, e a Pele vale mais
  // porque a Serpente é criatura bem mais difícil que o Slime Verde.
  slime_gel: { kind: 'slime_gel', name: 'Gosma de Slime', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 2, color: 0x5fae5f },
  snake_skin: { kind: 'snake_skin', name: 'Pele de Serpente', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0x6f9a4a },

  // --- Materiais característicos de família (Doc 4, cap. 44 e `DD-DROP-006`) ---
  // 🔴 `DD-DROP-001`: *"o jogador nunca deve derrotar um monstro apenas pela
  // experiência."* Antes destes, 21 das 23 espécies eram exatamente isso — só
  // Slime e Serpente largavam material próprio. Cada família ganhou o seu, e é o
  // que cria rota de farm reconhecível.
  //
  // A taxonomia (família, origem, uso, afinidade) vive em `materials.ts`; aqui
  // fica só o lado "objeto de inventário". Teste garante que as duas tabelas não
  // se separem.
  //
  // ⚠️ REFERÊNCIA em todo `sellPrice`: nenhum doc dá preço de material. Ancorados
  // na faixa de valor do `44.9` — muito-baixo 2 · baixo 5 · médio 15 · alto 50 ·
  // muito-alto 150 — com o Fragmento Comum (`buyPrice: 2`) como piso do sistema.
  spider_web: { kind: 'spider_web', name: 'Teia de Aranha', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0xdfe7f2 },
  spider_venom: { kind: 'spider_venom', name: 'Veneno de Aranha', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0x7ad13a },
  spider_eye: { kind: 'spider_eye', name: 'Olho de Aranha', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0x8a6a9a },
  chitin: { kind: 'chitin', name: 'Quitina', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0xa06a3a },
  acid_gland: { kind: 'acid_gland', name: 'Glândula Ácida', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0x8aa03a },
  goblin_rag: { kind: 'goblin_rag', name: 'Trapo de Goblin', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 2, color: 0x7a8a5a },
  goblin_tooth: { kind: 'goblin_tooth', name: 'Dente de Goblin', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0xd8d0a8 },
  wolf_hide: { kind: 'wolf_hide', name: 'Couro de Lobo', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0x9a9a9a },
  wolf_fang: { kind: 'wolf_fang', name: 'Presa de Lobo', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0xeee8d8 },
  wolf_fur: { kind: 'wolf_fur', name: 'Pelo de Lobo', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0x8a8a92 },
  thick_hide: { kind: 'thick_hide', name: 'Couro Grosso', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0x6a8a4a },
  broken_tusk: { kind: 'broken_tusk', name: 'Presa Quebrada', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0xd8cfae },
  bone: { kind: 'bone', name: 'Osso', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0xd8d0b8 },
  ashes: { kind: 'ashes', name: 'Cinzas', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0xb8b0a8 },
  spirit_fragment: { kind: 'spirit_fragment', name: 'Fragmento Espiritual', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 50, color: 0x9a5ad1 },
  horn: { kind: 'horn', name: 'Chifre', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 50, color: 0x8a4a3a },
  heavy_hide: { kind: 'heavy_hide', name: 'Couro Pesado', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 50, color: 0x7a5a4a },
  bear_pelt: { kind: 'bear_pelt', name: 'Pelego de Urso', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0x7a5a3a },
  bear_claw: { kind: 'bear_claw', name: 'Garra de Urso', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0xe0d8c8 },
  small_scale: { kind: 'small_scale', name: 'Escama Pequena', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 5, color: 0xb08a4a },
  fine_claw: { kind: 'fine_claw', name: 'Garra Fina', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 15, color: 0xc8b898 },
  troll_skin: { kind: 'troll_skin', name: 'Pele de Troll', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 50, color: 0x5a7a5a },
  troll_blood: { kind: 'troll_blood', name: 'Sangue de Troll', category: 'loot', stackable: true, buyPrice: 0, sellPrice: 150, color: 0x8a2a2a },

  // Armas: o `atk` é o dano-base, e o TIPO define identidade (velocidade,
  // alcance, uma/duas mãos) e qual proficiência sobe ao usar.
  short_sword: { kind: 'short_sword', name: 'Espada Curta', category: 'equip', stackable: false, buyPrice: 50, slot: 'weapon', atk: 8, weaponType: 'sword', tier: 1, color: 0xc9d0d8 },
  // ⚠️ Nomes corrigidos para os CANÔNICOS do Doc 4 (cap. 13–23). Antes eram
  // "Machadinha", "Adaga", "Lança" e "Cajado de Aprendiz" — nenhum existe no
  // catálogo oficial. `models.ts` tem teste travando isso, para o nome errado não
  // voltar: nome divergente é retrabalho silencioso, descoberto meses depois
  // quando o item já está em save de jogador.
  hand_axe: { kind: 'hand_axe', name: 'Machado de Lenhador', category: 'equip', stackable: false, buyPrice: 55, slot: 'weapon', atk: 8, weaponType: 'axe', tier: 1, color: 0x9a8878 },
  club: { kind: 'club', name: 'Clava', category: 'equip', stackable: false, buyPrice: 45, slot: 'weapon', atk: 8, weaponType: 'mace', tier: 1, color: 0x8a6a3a },
  dagger: { kind: 'dagger', name: 'Adaga Curta', category: 'equip', stackable: false, buyPrice: 40, slot: 'weapon', atk: 8, weaponType: 'dagger', tier: 1, color: 0xb8c2cc },
  spear: { kind: 'spear', name: 'Lança Curta', category: 'equip', stackable: false, buyPrice: 65, slot: 'weapon', atk: 9, weaponType: 'spear', tier: 1, color: 0xa08858 },
  short_bow: { kind: 'short_bow', name: 'Arco Curto', category: 'equip', stackable: false, buyPrice: 70, slot: 'weapon', atk: 8, weaponType: 'bow', tier: 1, color: 0x9a7a4a },
  light_crossbow: { kind: 'light_crossbow', name: 'Besta Leve', category: 'equip', stackable: false, buyPrice: 85, slot: 'weapon', atk: 9, weaponType: 'crossbow', tier: 1, color: 0x7a6a5a },
  apprentice_staff: { kind: 'apprentice_staff', name: 'Cajado do Aprendiz', category: 'equip', stackable: false, buyPrice: 75, slot: 'weapon', atk: 6, weaponType: 'staff', tier: 1, color: 0x6a5aa0 },
  // Demais equipamentos (compráveis / loot). def soma na defesa.
  wooden_shield: { kind: 'wooden_shield', name: 'Escudo de Madeira', category: 'equip', stackable: false, buyPrice: 40, slot: 'shield', def: 4, color: 0x8a5a2f },
  // Couro é armadura LEVE (cap. 38): Archer e Assassin priorizam. As categorias
  // Pesada e Veste existem no tipo e esperam o catálogo do cap. 13–43.
  leather_helmet: { kind: 'leather_helmet', name: 'Elmo de Couro', category: 'equip', stackable: false, buyPrice: 30, slot: 'helmet', def: 2, armorClass: 'light', color: 0x8a6a3a },
  leather_armor: { kind: 'leather_armor', name: 'Armadura de Couro', category: 'equip', stackable: false, buyPrice: 60, slot: 'armor', def: 5, armorClass: 'light', color: 0x7a5230 },
  leather_pants: { kind: 'leather_pants', name: 'Calça de Couro', category: 'equip', stackable: false, buyPrice: 35, slot: 'pants', def: 3, armorClass: 'light', color: 0x6e4a2a },
  leather_boots: { kind: 'leather_boots', name: 'Botas de Couro', category: 'equip', stackable: false, buyPrice: 25, slot: 'boots', def: 2, armorClass: 'light', color: 0x5a3a20 },
  copper_necklace: { kind: 'copper_necklace', name: 'Colar de Cobre', category: 'equip', stackable: false, buyPrice: 45, slot: 'necklace', atk: 2, def: 1, color: 0xb87333 },
  // Containers de mochila: cada um define a capacidade de slots.
  // --- Recipientes -------------------------------------------------------
  // 🔴 A escada vem do roadmap (Etapa 12): **200/20 · 500/40 · 1000/60 · 1500/80**
  // — peso e compartimentos. Os SLOTS estão implementados; o peso é o número
  // depois da barra e fica declarado no comentário até a capacidade de carga
  // existir (ela deriva de STR e ainda não foi feita).
  //
  // ⚠️ **Decisão do dono (2026-07-30): a Mochila inicial subiu de 20 para 40.**
  // Ele pediu "pelo menos uns 40 itens" para gerir inventário, e 40 é justamente
  // o segundo degrau canônico — então o pedido cabe no doc sem inventar degrau.
  // A escada acima dela (60 e 80) segue existindo como progressão.
  bag: { kind: 'bag', name: 'Bolsa', category: 'equip', stackable: false, buyPrice: 20, slot: 'container', capacity: 10, color: 0x9a6a3a },
  backpack: { kind: 'backpack', name: 'Mochila', category: 'equip', stackable: false, buyPrice: 40, slot: 'container', capacity: 40, color: 0x8a4a6a },
  // peso 1000 quando a carga existir
  large_backpack: { kind: 'large_backpack', name: 'Mochila Grande', category: 'equip', stackable: false, buyPrice: 400, slot: 'container', capacity: 60, color: 0x6a3a5a },
  // peso 1500 — o topo da escada do roadmap
  traveler_pack: { kind: 'traveler_pack', name: 'Mochila do Viajante', category: 'equip', stackable: false, buyPrice: 1800, slot: 'container', capacity: 80, color: 0x4a3a6a },
};

/** Capacidade de mochila quando nenhum container está equipado (segurança). */
export const NO_CONTAINER_SLOTS = 0;

/**
 * Uma pilha de item na mochila/depósito.
 *
 * `roll` é o que diferencia DUAS espadas curtas: raridade, passivos sorteados e
 * slots de carta. Só equipamentos têm; empilháveis (poções, moedas) não.
 */
export interface ItemStack {
  kind: string;
  amount: number;
  roll?: ItemRoll;
}

/** Itens vendidos pelo NPC comerciante (na ordem exibida). */
export const VENDOR_STOCK: string[] = [
  'health_potion', 'mana_potion', 'torch', 'bag', 'backpack',
  // As duas mochilas grandes ficam CARAS de propósito: 400 e 1800 de ouro fazem
  // delas objetivo de médio prazo, não compra do primeiro dia. O espaço extra é
  // progressão, como o roadmap desenha na escada 20/40/60/80.
  'large_backpack', 'traveler_pack',
  'short_sword', 'hand_axe', 'club', 'dagger', 'spear', 'short_bow', 'light_crossbow',
  'apprentice_staff', 'wooden_shield',
  'leather_helmet', 'leather_armor', 'leather_pants', 'leather_boots', 'copper_necklace',
];

/**
 * Slots da mochila de quem **não tem container equipado**.
 *
 * ⚠️ **Não use isto para dimensionar a mochila de um personagem com mochila.**
 * Use `backpackSizeFor()`: a capacidade real vem do container equipado, e a
 * escada do roadmap vai de 10 a 80.
 *
 * 🔴 Isto já causou bug: o carregamento de personagem usava esta constante em vez
 * da capacidade do container. Quando a Mochila subiu de 20 para 40 slots, um
 * personagem salvo com 40 voltava com 20 — e **perdia acesso aos itens dos slots
 * 20 a 39**, que continuavam no banco sem aparecer.
 */
export const BACKPACK_SIZE = 20;

/**
 * Quantos slots a mochila deste personagem tem, dado o container equipado.
 *
 * Fonte única para o dimensionamento: usada no carregamento e ao trocar de
 * mochila. Sem container, cai no `BACKPACK_SIZE`.
 */
export function backpackSizeFor(containerKind?: string): number {
  if (!containerKind) return BACKPACK_SIZE;
  return ITEMS[containerKind]?.capacity ?? BACKPACK_SIZE;
}
export const DEPOT_SIZE = 40;

export function getItem(kind: string): ItemDef | undefined {
  return ITEMS[kind];
}

// ---------------------------------------------------------------------------
// Venda ao comerciante
// ---------------------------------------------------------------------------

/**
 * Fração do `buyPrice` que o comerciante paga ao comprar do jogador.
 *
 * ⚠️ **REFERÊNCIA.** O Doc 3 fecha o *princípio* do comércio — "lojas são
 * permanentes", "os comerciantes sempre vendem os mesmos tipos de produtos",
 * "sem economia dinâmica" — e é justamente isso que autoriza um fator FIXO em vez
 * de mercado. Mas **nenhum doc dá o número**, então este 0.4 é ponto de partida
 * para teste, não canônico.
 *
 * Por que não 1.0: comprar e vender ao mesmo preço transforma a loja em depósito
 * sem custo e apaga o peso de cada compra. A margem é o que faz escolher doer.
 */
export const SELL_PRICE_FACTOR = 0.4;

/**
 * Quanto o comerciante paga por UMA unidade. `0` = ele não compra.
 *
 * Raridade entra por `statMult` do `RARITY`, e essa reutilização é deliberada: é
 * a escala canônica de quanto cada degrau é mais forte (Comum 1.0 → Relíquia
 * 2.3), então serve de valor sem inventar uma tabela de preço paralela que
 * poderia contradizer a de poder. Sem isso, uma Relíquia sairia pelo preço de uma
 * Comum, que é o tipo de coisa que ensina o jogador a jogar loot no chão.
 *
 * Moeda nunca é vendável — vender ouro por ouro seria uma torneira de dinheiro.
 */
export function sellPriceOf(kind: string, roll?: ItemRoll): number {
  const def = ITEMS[kind];
  if (!def || def.category === 'currency') return 0;
  const base = def.sellPrice ?? def.buyPrice * SELL_PRICE_FACTOR;
  if (base <= 0) return 0;
  const mult = roll ? RARITY[roll.rarity].statMult : 1;
  // Piso de 1: item com preço definido nunca vale zero, senão o jogador clica
  // "Vender" e nada acontece — o que parece bug, não regra.
  return Math.max(1, Math.round(base * mult));
}

/** Denominações de moeda da maior para a menor (para normalizar o ouro). */
export const GOLD_TIERS: { kind: string; value: number }[] = [
  { kind: 'gold_white', value: 1000000 },
  { kind: 'gold_blue', value: 10000 },
  { kind: 'gold_silver', value: 100 },
  { kind: 'gold', value: 1 },
];

export function isGold(kind: string): boolean {
  return GOLD_TIERS.some((t) => t.kind === kind);
}
