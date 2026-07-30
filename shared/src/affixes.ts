/**
 * Item Affix Bible — a camada de IDENTIDADE dos equipamentos (Doc 4, cap. 46).
 *
 * `DD-AFFIX-001` quer que dois itens do mesmo modelo tenham desempenhos
 * diferentes, e que isso apareça no NOME:
 *
 * ```
 * Espada Longa  →  Espada Longa Feroz  →  Espada Longa Feroz do Dragão
 * ```
 *
 * 🔴 **Este arquivo não substitui nada.** `weapons.ts` já tem os EFEITOS
 * mecânicos (`AffixId`: dano físico, crítico, roubo de vida…) com faixa de valor
 * e sorteio por raridade, e continua sendo a autoridade sobre eles. O que
 * faltava era a camada de cima: os NOMES que o jogador lê e que dizem *por que*
 * aquele item é diferente. Um prefixo aqui **aponta** para os efeitos de lá.
 *
 * Separar assim é o que permite o doc dizer "a combinação específica dos efeitos
 * será definida posteriormente" (`DD-AFFIX-007`) sem travar a implementação: a
 * estrutura fecha agora, os números seguem ajustáveis.
 */

import type { DamageType } from './elements.js';
import type { AffixId, Rarity } from './weapons.js';

/** As seis categorias oficiais (`DD-AFFIX-002`). */
export type AffixCategory =
  | 'prefix'
  | 'suffix'
  | 'enchantment'
  | 'blessing'
  | 'curse'
  | 'unique';

/** Grupos de prefixo (`DD-AFFIX-003`). */
export type PrefixGroup = 'offensive' | 'defensive' | 'magic' | 'elemental' | 'special';

/** Grupos de sufixo (`DD-AFFIX-004`). */
export type SuffixGroup =
  | 'class'
  | 'creature'
  | 'virtue'
  | 'nature'
  | 'celestial'
  | 'corruption';

/**
 * Categoria de equipamento, para a compatibilidade do `DD-AFFIX-009`.
 * `tool` existe porque o doc reserva modificadores de profissão a ferramentas.
 */
export type EquipCategory = 'weapon' | 'armor' | 'accessory' | 'tool';

/**
 * Compatibilidade — a metade "onde pode aparecer" do cadastro do `DD-AFFIX-012`.
 *
 * ⚠️ `material` e `origin` estão **declarados e NÃO aplicados**. O doc os define
 * em `DD-AFFIX-010/011` citando Mithril, Adamantita, Escamas de Dragão e
 * equipamento Élfico/Anão/Celestial/Corrompido — e **nada disso existe no
 * código**. O Material Bible é o cap. 44, o próximo da fila. Os campos ficam
 * aqui para que ligá-los seja uma linha, não uma reescrita.
 */
export interface AffixCompat {
  /** Em que categorias de equipamento pode nascer. */
  equip: EquipCategory[];
  /** Raridade mínima do item para este modificador entrar no sorteio. */
  minRarity: Rarity;
  /** ⚠️ Não aplicado: materiais compatíveis (`DD-AFFIX-010`). */
  material?: string[];
  /** ⚠️ Não aplicado: origens compatíveis (`DD-AFFIX-011`). */
  origin?: string[];
}

/** A metade "como se aplica" do cadastro (`DD-AFFIX-012`). */
export interface AffixApplication {
  /** De onde vem. `loot` é o único implementado hoje. */
  sources: Array<'loot' | 'craft' | 'npc' | 'enchant' | 'event'>;
  removable: boolean;
  replaceable: boolean;
  /** Pode coexistir com outros modificadores da mesma categoria? */
  coexists: boolean;
}

/** Padrão de aplicação para o que nasce junto com o item no drop. */
const NO_LOOT: AffixApplication = {
  sources: ['loot', 'craft'],
  // Nasce com o item e morre com ele. Remover/trocar prefixo é a Etapa 11
  // (reroll), e é lá que estes valores mudam.
  removable: false,
  replaceable: false,
  coexists: true,
};

export interface PrefixDef {
  id: string;
  /** O que aparece no nome: "Feroz". */
  name: string;
  group: PrefixGroup;
  /**
   * Efeitos mecânicos que este prefixo concede, por id de `weapons.ts`.
   *
   * ⚠️ Alguns prefixos do doc prometem coisas que **não existem como efeito**
   * ainda — precisão, bloqueio, resistência a condição. Nesses casos o mapa
   * aponta para o efeito existente mais próximo e o comentário diz qual era a
   * intenção. Quando o efeito real entrar, troca-se aqui.
   */
  grants: AffixId[];
  /**
   * Tipo de dano que o prefixo impõe à arma. Só os elementais têm.
   *
   * 🔴 Decisão do dono (2026-07-30): prefixo elemental muda o dano DE VERDADE,
   * usando o pipeline da Etapa 8. É o que faz as resistências das criaturas
   * saírem do papel — o Zumbi fraco a Sagrado passa a ter contra real.
   */
  damageType?: DamageType;
  compat: AffixCompat;
  application: AffixApplication;
}

export interface SuffixDef {
  id: string;
  /** O que aparece no nome, com preposição: "do Dragão". */
  name: string;
  group: SuffixGroup;
  grants: AffixId[];
  compat: AffixCompat;
  application: AffixApplication;
}

// ---------------------------------------------------------------------------
// PREFIXOS (`DD-AFFIX-003`) — 40, nos cinco grupos do documento
// ---------------------------------------------------------------------------

const arma: EquipCategory[] = ['weapon'];
const defesa: EquipCategory[] = ['armor', 'accessory'];
const qualquer: EquipCategory[] = ['weapon', 'armor', 'accessory'];

function pre(
  id: string,
  name: string,
  group: PrefixGroup,
  grants: AffixId[],
  equip: EquipCategory[],
  minRarity: Rarity = 'uncommon',
  damageType?: DamageType,
): PrefixDef {
  return {
    id, name, group, grants,
    ...(damageType ? { damageType } : {}),
    compat: { equip, minRarity },
    application: NO_LOOT,
  };
}

export const PREFIXES: Record<string, PrefixDef> = {
  // --- Ofensivos: o dano e a pressa ---
  feroz: pre('feroz', 'Feroz', 'offensive', ['phys_damage'], arma),
  brutal: pre('brutal', 'Brutal', 'offensive', ['phys_damage', 'crit_damage'], arma, 'rare'),
  voraz: pre('voraz', 'Voraz', 'offensive', ['life_steal'], arma, 'rare'),
  // "Preciso" queria PRECISÃO, que não existe como efeito. Chance de crítico é
  // o vizinho mais próximo: também é "acertar melhor".
  preciso: pre('preciso', 'Preciso', 'offensive', ['crit_chance'], arma),
  afiado: pre('afiado', 'Afiado', 'offensive', ['armor_pen'], arma),
  implacavel: pre('implacavel', 'Implacável', 'offensive', ['atk_speed'], arma),
  violento: pre('violento', 'Violento', 'offensive', ['crit_damage'], arma),
  selvagem: pre('selvagem', 'Selvagem', 'offensive', ['phys_damage', 'atk_speed'], arma, 'rare'),
  mortifero: pre('mortifero', 'Mortífero', 'offensive', ['crit_chance', 'crit_damage'], arma, 'epic'),
  destruidor: pre('destruidor', 'Destruidor', 'offensive', ['phys_damage', 'armor_pen'], arma, 'epic'),

  // --- Defensivos: aguentar o golpe ---
  robusto: pre('robusto', 'Robusto', 'defensive', ['hp_bonus'], defesa),
  fortificado: pre('fortificado', 'Fortificado', 'defensive', ['defense'], defesa),
  // "Pesado" troca mobilidade por proteção — a única maldição implícita dos
  // defensivos, e o doc trata isso como identidade, não como Maldição formal.
  pesado: pre('pesado', 'Pesado', 'defensive', ['defense', 'hp_bonus'], defesa, 'rare'),
  resistente: pre('resistente', 'Resistente', 'defensive', ['hp_bonus'], defesa),
  solido: pre('solido', 'Sólido', 'defensive', ['defense'], defesa),
  // "Impenetrável" queria BLOQUEIO, que `DD-DEF-009` reserva a escudo e carta.
  // Fica em defesa plana até o bloqueio por equipamento existir (Etapa 11).
  impenetravel: pre('impenetravel', 'Impenetrável', 'defensive', ['defense'], defesa, 'epic'),
  inabalavel: pre('inabalavel', 'Inabalável', 'defensive', ['hp_bonus', 'defense'], defesa, 'epic'),
  guardiao: pre('guardiao', 'Guardião', 'defensive', ['defense', 'hp_bonus'], defesa, 'rare'),
  protetor: pre('protetor', 'Protetor', 'defensive', ['defense'], defesa),

  // --- Mágicos: o poço e o Éter ---
  arcano: pre('arcano', 'Arcano', 'magic', ['mana_bonus'], qualquer),
  runico: pre('runico', 'Rúnico', 'magic', ['mana_bonus'], qualquer),
  mistico: pre('mistico', 'Místico', 'magic', ['mana_bonus'], qualquer, 'rare'),
  astral: pre('astral', 'Astral', 'magic', ['mana_bonus'], qualquer, 'rare'),
  etereo: pre('etereo', 'Etéreo', 'magic', ['move_speed'], qualquer, 'rare'),
  elemental: pre('elemental', 'Elemental', 'magic', ['mana_bonus'], qualquer, 'epic'),
  ancestral: pre('ancestral', 'Ancestral', 'magic', ['hp_bonus', 'mana_bonus'], qualquer, 'epic'),
  encantado: pre('encantado', 'Encantado', 'magic', ['mana_bonus'], qualquer),

  // --- Elementais: mudam o TIPO do dano (decisão do dono) ---
  flamejante: pre('flamejante', 'Flamejante', 'elemental', ['phys_damage'], arma, 'uncommon', 'fire'),
  glacial: pre('glacial', 'Glacial', 'elemental', ['phys_damage'], arma, 'uncommon', 'ice'),
  tempestuoso: pre('tempestuoso', 'Tempestuoso', 'elemental', ['phys_damage'], arma, 'rare', 'electric'),
  // ⚠️ **"Terreno" e "Marinho" não têm elemento em `DD-ELM-002`.** Os sete são
  // Físico · Fogo · Gelo · Elétrico · Veneno · Sagrado · Sombrio — Terra e Água
  // não estão lá. Terreno vira impacto (Físico) e Marinho vira Gelo, que é a
  // mesma leitura que propusemos para o "Slime Azul → Água" do Doc 3.
  // 🔴 Precisa de confirmação do dono, junto com aquela.
  terreno: pre('terreno', 'Terreno', 'elemental', ['phys_damage', 'defense'], arma, 'uncommon', 'physical'),
  marinho: pre('marinho', 'Marinho', 'elemental', ['phys_damage'], arma, 'uncommon', 'ice'),
  luminoso: pre('luminoso', 'Luminoso', 'elemental', ['phys_damage'], arma, 'rare', 'holy'),
  sombrio: pre('sombrio', 'Sombrio', 'elemental', ['phys_damage'], arma, 'rare', 'dark'),
  natural: pre('natural', 'Natural', 'elemental', ['phys_damage'], arma, 'uncommon', 'poison'),

  // --- Especiais: raros e ligados à lore ---
  celestial: pre('celestial', 'Celestial', 'special', ['hp_bonus', 'mana_bonus'], qualquer, 'legendary'),
  primordial: pre('primordial', 'Primordial', 'special', ['phys_damage', 'hp_bonus'], qualquer, 'legendary'),
  corrompido: pre('corrompido', 'Corrompido', 'special', ['phys_damage', 'life_steal'], qualquer, 'epic'),
  abencoado: pre('abencoado', 'Abençoado', 'special', ['defense', 'hp_bonus'], qualquer, 'legendary'),
  profano: pre('profano', 'Profano', 'special', ['crit_damage', 'life_steal'], qualquer, 'epic'),
};

// ---------------------------------------------------------------------------
// SUFIXOS (`DD-AFFIX-004`) — 30, nos seis grupos do documento
// ---------------------------------------------------------------------------

function suf(
  id: string,
  name: string,
  group: SuffixGroup,
  grants: AffixId[],
  minRarity: Rarity = 'rare',
): SuffixDef {
  return {
    id, name, group, grants,
    // Sufixo é AFINIDADE, e afinidade cabe em qualquer peça.
    compat: { equip: qualquer, minRarity },
    application: NO_LOOT,
  };
}

export const SUFFIXES: Record<string, SuffixDef> = {
  // --- Classes: o sufixo diz para quem a peça foi feita ---
  do_guerreiro: suf('do_guerreiro', 'do Guerreiro', 'class', ['hp_bonus', 'defense']),
  do_arqueiro: suf('do_arqueiro', 'do Arqueiro', 'class', ['crit_chance', 'atk_speed']),
  do_assassino: suf('do_assassino', 'do Assassino', 'class', ['crit_damage', 'move_speed']),
  do_feiticeiro: suf('do_feiticeiro', 'do Feiticeiro', 'class', ['mana_bonus']),
  // O Druida é a Etapa 15 e ainda não existe como classe — o sufixo entra
  // porque a peça não depende da classe existir para ser encontrada.
  do_druida: suf('do_druida', 'do Druida', 'class', ['mana_bonus', 'hp_bonus']),

  // --- Criaturas: a essência do bicho na peça ---
  do_dragao: suf('do_dragao', 'do Dragão', 'creature', ['phys_damage', 'defense'], 'epic'),
  do_lobo: suf('do_lobo', 'do Lobo', 'creature', ['move_speed', 'atk_speed']),
  do_urso: suf('do_urso', 'do Urso', 'creature', ['hp_bonus']),
  da_serpente: suf('da_serpente', 'da Serpente', 'creature', ['crit_chance']),
  do_grifo: suf('do_grifo', 'do Grifo', 'creature', ['move_speed'], 'epic'),
  da_aranha: suf('da_aranha', 'da Aranha', 'creature', ['atk_speed']),
  do_escorpiao: suf('do_escorpiao', 'do Escorpião', 'creature', ['armor_pen']),

  // --- Virtudes ---
  da_coragem: suf('da_coragem', 'da Coragem', 'virtue', ['hp_bonus']),
  da_honra: suf('da_honra', 'da Honra', 'virtue', ['defense']),
  da_sabedoria: suf('da_sabedoria', 'da Sabedoria', 'virtue', ['mana_bonus']),
  da_disciplina: suf('da_disciplina', 'da Disciplina', 'virtue', ['atk_speed']),
  da_perseveranca: suf('da_perseveranca', 'da Perseverança', 'virtue', ['hp_bonus', 'defense']),

  // --- Natureza ---
  da_tempestade: suf('da_tempestade', 'da Tempestade', 'nature', ['atk_speed', 'crit_chance']),
  da_floresta: suf('da_floresta', 'da Floresta', 'nature', ['hp_bonus']),
  das_montanhas: suf('das_montanhas', 'das Montanhas', 'nature', ['defense']),
  dos_oceanos: suf('dos_oceanos', 'dos Oceanos', 'nature', ['mana_bonus']),
  das_cinzas: suf('das_cinzas', 'das Cinzas', 'nature', ['phys_damage']),

  // --- Celestiais: topo da escala, ligados à lore dos Arcanjos ---
  da_criacao: suf('da_criacao', 'da Criação', 'celestial', ['hp_bonus', 'mana_bonus'], 'legendary'),
  do_firmamento: suf('do_firmamento', 'do Firmamento', 'celestial', ['defense', 'mana_bonus'], 'legendary'),
  das_estrelas: suf('das_estrelas', 'das Estrelas', 'celestial', ['crit_damage'], 'legendary'),
  do_primeiro_ceu: suf('do_primeiro_ceu', 'do Primeiro Céu', 'celestial', ['phys_damage', 'hp_bonus'], 'mythic'),

  // --- Corrupção: poder com peso ---
  do_abismo: suf('do_abismo', 'do Abismo', 'corruption', ['life_steal'], 'epic'),
  da_ruina: suf('da_ruina', 'da Ruína', 'corruption', ['armor_pen'], 'epic'),
  da_escuridao: suf('da_escuridao', 'da Escuridão', 'corruption', ['crit_damage'], 'epic'),
  do_caos: suf('do_caos', 'do Caos', 'corruption', ['phys_damage', 'crit_chance'], 'legendary'),
};

// ---------------------------------------------------------------------------
// MALDIÇÕES (`DD-AFFIX-007`) — poder mediante desvantagem
// ---------------------------------------------------------------------------

/**
 * Maldição: dá de um lado e cobra do outro.
 *
 * ⚠️ Os exemplos do doc são conceituais e ele diz explicitamente que "a
 * combinação específica dos efeitos será definida posteriormente". A estrutura
 * fecha aqui; os pares e valores são **REFERÊNCIA**.
 */
export interface CurseDef {
  id: string;
  name: string;
  /** O que melhora. */
  boon: AffixId;
  /** O que piora. Mesmo vocabulário de efeitos, aplicado ao contrário. */
  bane: AffixId;
  compat: AffixCompat;
}

export const CURSES: Record<string, CurseDef> = {
  // Os três exemplos literais do `DD-AFFIX-007`. Durabilidade ainda não existe
  // como sistema (é a Etapa 11), então o segundo troca por defesa.
  sede_de_sangue: {
    id: 'sede_de_sangue', name: 'Sede de Sangue',
    boon: 'phys_damage', bane: 'defense',
    compat: { equip: ['weapon'], minRarity: 'rare' },
  },
  pressa_imprudente: {
    id: 'pressa_imprudente', name: 'Pressa Imprudente',
    boon: 'atk_speed', bane: 'defense',
    compat: { equip: ['weapon'], minRarity: 'rare' },
  },
  fome_arcana: {
    id: 'fome_arcana', name: 'Fome Arcana',
    boon: 'crit_damage', bane: 'mana_bonus',
    compat: { equip: ['weapon', 'accessory'], minRarity: 'rare' },
  },
};

// ---------------------------------------------------------------------------
// Composição de nome e sorteio
// ---------------------------------------------------------------------------

/**
 * Monta o nome do item como `DD-AFFIX-001` desenha:
 * `Espada Longa` + `Feroz` + `do Dragão` → **"Espada Longa Feroz do Dragão"**.
 *
 * A ordem importa: prefixo depois do nome-base (em português o adjetivo vem
 * depois do substantivo, ao contrário do inglês do exemplo original), sufixo no
 * fim porque já carrega a preposição.
 */
export function composeItemName(base: string, prefixId?: string, suffixId?: string): string {
  const partes = [base];
  const p = prefixId ? PREFIXES[prefixId] : undefined;
  const s = suffixId ? SUFFIXES[suffixId] : undefined;
  if (p) partes.push(p.name);
  if (s) partes.push(s.name);
  return partes.join(' ');
}

const RARITY_RANK: Rarity[] = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'relic',
];

function atLeast(have: Rarity, need: Rarity): boolean {
  return RARITY_RANK.indexOf(have) >= RARITY_RANK.indexOf(need);
}

/**
 * Prefixos que podem nascer nesta categoria de equipamento e raridade
 * (`DD-AFFIX-009`).
 *
 * ⚠️ `material` e `origin` **não entram no filtro** — ver `AffixCompat`.
 */
export function prefixesFor(equip: EquipCategory, rarity: Rarity): PrefixDef[] {
  return Object.values(PREFIXES).filter(
    (p) => p.compat.equip.includes(equip) && atLeast(rarity, p.compat.minRarity),
  );
}

export function suffixesFor(equip: EquipCategory, rarity: Rarity): SuffixDef[] {
  return Object.values(SUFFIXES).filter(
    (s) => s.compat.equip.includes(equip) && atLeast(rarity, s.compat.minRarity),
  );
}

/**
 * ⚠️ REFERÊNCIA. Chance de o item nascer com sufixo, por raridade.
 *
 * Prefixo é a regra (todo item Incomum+ ganha um, é o que dá variedade);
 * **sufixo é o extra** que faz a peça memorável. O doc não dá número, mas trata
 * o nome completo "Espada Longa Feroz do Dragão" como algo notável, não comum.
 */
const SUFFIX_CHANCE: Partial<Record<Rarity, number>> = {
  rare: 0.25,
  epic: 0.45,
  legendary: 0.7,
  mythic: 0.85,
  relic: 1,
};

export interface RolledNames {
  prefix?: string;
  suffix?: string;
}

/**
 * Sorteia prefixo e sufixo para um item que está nascendo.
 *
 * `rng` injetável, como no resto do projeto. Item Comum não ganha nada: é o que
 * faz o primeiro Incomum com nome próprio parecer um achado.
 */
export function rollAffixNames(
  equip: EquipCategory,
  rarity: Rarity,
  rng: () => number = Math.random,
): RolledNames {
  const out: RolledNames = {};

  const pres = prefixesFor(equip, rarity);
  if (pres.length > 0) {
    out.prefix = pres[Math.floor(rng() * pres.length)]!.id;
  }

  const chance = SUFFIX_CHANCE[rarity] ?? 0;
  if (chance > 0 && rng() < chance) {
    const sufs = suffixesFor(equip, rarity);
    if (sufs.length > 0) out.suffix = sufs[Math.floor(rng() * sufs.length)]!.id;
  }

  return out;
}

/**
 * Tipo de dano que os modificadores impõem à arma, se algum impuser.
 *
 * `undefined` = a arma continua física, que é o caso da esmagadora maioria.
 * Só prefixo elemental muda isso.
 */
export function affixDamageType(prefixId?: string): DamageType | undefined {
  if (!prefixId) return undefined;
  return PREFIXES[prefixId]?.damageType;
}
