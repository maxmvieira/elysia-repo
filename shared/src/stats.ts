/**
 * Sistema de atributos, classes e stats derivados (compartilhado).
 *
 * Filosofia (pedido do jogo): o NÍVEL sozinho quase não fortalece. Quem define
 * o personagem são os ATRIBUTOS (10 pontos por nível como MOEDA, gastos numa
 * tabela de custo crescente) e as SKILLS que sobem com o uso. Cada classe
 * começa com uma distribuição-base e um estilo de ataque.
 *
 * O servidor é a autoridade: ele calcula os stats derivados a partir dos
 * atributos e usa isso no combate. O cliente só exibe.
 */

export type PlayerClass = 'knight' | 'sorcerer' | 'archer' | 'assassin';
export type AttributeKey = 'str' | 'dex' | 'vit' | 'int' | 'wis' | 'agi' | 'luk';
export type AttackType = 'melee' | 'ranged' | 'magic';
export type SkillKind = 'melee' | 'distance' | 'magic';

export interface Attributes {
  str: number;
  dex: number;
  vit: number;
  int: number;
  wis: number;
  agi: number;
  luk: number;
}

export const ATTRIBUTE_KEYS: AttributeKey[] = ['str', 'vit', 'agi', 'dex', 'int', 'wis', 'luk'];

/**
 * Os SETE atributos (GDD §4). Cada um tem uma função principal e uma
 * secundária — nenhum atributo é "lixo" para nenhuma classe.
 */
export const ATTRIBUTE_INFO: Record<AttributeKey, { name: string; effects: string }> = {
  str: { name: 'Strength', effects: 'Dano físico corpo a corpo · capacidade de carga' },
  vit: { name: 'Vitality', effects: 'Vida máxima · regeneração de vida · resistência física' },
  agi: { name: 'Agility', effects: 'Velocidade de ataque · esquiva · movimento' },
  dex: { name: 'Dexterity', effects: 'Dano de arco/besta · precisão' },
  int: { name: 'Intelligence', effects: 'Dano mágico · mana máxima' },
  wis: { name: 'Wisdom', effects: 'Regeneração de mana · resistência mágica' },
  luk: { name: 'Luck', effects: 'Chance de crítico · efeitos probabilísticos' },
};

/** Pontos concedidos por nível e cadência de pontos de talento. */
export const POINTS_PER_LEVEL = 10;
export const TALENT_EVERY_LEVELS = 5;

/**
 * CUSTO CRESCENTE (GDD §4): subir um atributo custa mais conforme ele cresce.
 * Especializar continua possível, mas fica progressivamente caro — a decisão
 * "gasto 12 pontos em +1 STR ou espalho em VIT/WIS/AGI?" é o coração da build.
 * Não há teto: dá para chegar a 250 STR, só custa uma fortuna de pontos.
 */
const ATTRIBUTE_COST_TABLE: Array<{ ate: number; custo: number }> = [
  { ate: 20, custo: 2 },
  { ate: 40, custo: 3 },
  { ate: 60, custo: 4 },
  { ate: 80, custo: 5 },
  { ate: 100, custo: 6 },
  { ate: 125, custo: 8 },
  { ate: 150, custo: 10 },
  { ate: 175, custo: 12 },
  { ate: 200, custo: 15 },
];
const ATTRIBUTE_COST_ACIMA = 20;

/** Quantos pontos custa subir este atributo de `valorAtual` para +1. */
export function attributeCost(valorAtual: number): number {
  for (const faixa of ATTRIBUTE_COST_TABLE) {
    if (valorAtual <= faixa.ate) return faixa.custo;
  }
  return ATTRIBUTE_COST_ACIMA;
}

export interface ClassDef {
  id: PlayerClass;
  name: string;
  attackType: AttackType;
  skill: SkillKind;
  base: Attributes;
  /** Alcance do ataque básico, em tiles. */
  attackRange: number;
  /** Projétil visual disparado no ataque (magos/arqueiro). */
  projectile?: string;
  /** Custo de mana do ataque básico (0 para físicos). */
  spellCost: number;
  /** Vida e mana ALVO no nível 1 com os atributos-base (GDD §4). */
  hpAt1: number;
  manaAt1: number;
  blurb: string;
}

/** Ganhos de vida/mana por nível, por classe (o grosso vem dos atributos). */
const HP_PER_LEVEL = 5;
const MANA_PER_LEVEL = 3;
const HP_PER_VIT = 8;
const MANA_PER_INT = 8;

/** Total de pontos de atributo que TODA classe recebe no nível 1 (GDD §4). */
export const BASE_ATTRIBUTE_POINTS = 45;

/**
 * As classes de Elysia Online (GDD §4). Todas começam com os MESMOS 45 pontos
 * de atributo — o que muda é a distribuição, não a soma. Nenhuma classe nasce
 * matematicamente maior que outra.
 *
 * São CINCO classes no total: Knight, Sorcerer, Archer, Assassin e Druid.
 * O Druid entra na etapa 15 do roadmap. Priest NÃO existe.
 */
export const CLASSES: Record<PlayerClass, ClassDef> = {
  knight: {
    id: 'knight',
    name: 'Knight',
    attackType: 'melee',
    skill: 'melee',
    base: { str: 11, vit: 10, agi: 6, dex: 6, int: 3, wis: 4, luk: 5 },
    attackRange: 1,
    spellCost: 0,
    hpAt1: 200,
    manaAt1: 60,
    blurb: 'Especialista em combate corpo a corpo. Espadas, machados, maças, escudos e armaduras pesadas.',
  },
  sorcerer: {
    id: 'sorcerer',
    name: 'Feiticeiro',
    attackType: 'magic',
    skill: 'magic',
    base: { str: 3, vit: 5, agi: 5, dex: 6, int: 12, wis: 10, luk: 4 },
    attackRange: 5,
    projectile: 'firebolt',
    spellCost: 6,
    hpAt1: 100,
    manaAt1: 180,
    blurb: 'Controla o Éter. Magias ofensivas à distância, suporte, controle e invocações.',
  },
  archer: {
    id: 'archer',
    name: 'Arqueiro',
    attackType: 'ranged',
    skill: 'distance',
    base: { str: 5, vit: 6, agi: 9, dex: 11, int: 4, wis: 5, luk: 5 },
    attackRange: 5,
    projectile: 'arrow',
    spellCost: 0,
    hpAt1: 120,
    manaAt1: 80,
    blurb: 'Especialista em combate à distância. Arcos, bestas, armadilhas e muita mobilidade.',
  },
  assassin: {
    id: 'assassin',
    name: 'Assassino',
    attackType: 'melee',
    skill: 'melee',
    // Adagas: pouca força bruta, mas AGI/LUK altas -> crítico, esquiva e
    // velocidade. Veneno e furtividade virão como sistemas futuros (talentos).
    base: { str: 7, vit: 6, agi: 11, dex: 7, int: 3, wis: 4, luk: 7 },
    attackRange: 1,
    spellCost: 0,
    hpAt1: 150,
    manaAt1: 70,
    blurb: 'Alta velocidade e adagas. Críticos, venenos e furtividade — golpeia e some.',
  },
};

export interface SkillState {
  kind: SkillKind;
  level: number;
  progress: number;
}

/** Progresso necessário para subir a skill do nível atual para o próximo. */
export function skillThreshold(level: number): number {
  return 10 + level * 8;
}

/** Stats derivados usados no combate (calculados dos atributos). */
export interface DerivedStats {
  maxHp: number;
  maxMana: number;
  hpRegen: number;
  manaRegen: number;
  physAtk: number;
  magicAtk: number;
  critChance: number;
  critMult: number;
  defense: number;
  magicResist: number;
  dodgeChance: number;
  attackCooldownMs: number;
  moveIntervalMs: number;
  manaCost: number;
  attackType: AttackType;
  attackRange: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function computeStats(
  cls: ClassDef,
  a: Attributes,
  level: number,
  skill: SkillState,
): DerivedStats {
  const skillPhys = skill.kind !== 'magic' ? skill.level : 0;
  const skillMagic = skill.kind === 'magic' ? skill.level : 0;
  // Vida/mana: a classe define o PATAMAR no nível 1 (Knight 200, Sorcerer 100…)
  // e VIT/INT constroem daí para cima. Descontamos a contribuição dos atributos
  // -base para que o alvo do GDD bata exatamente no nível 1.
  const hpBase = cls.hpAt1 - cls.base.vit * HP_PER_VIT;
  const manaBase = cls.manaAt1 - cls.base.int * MANA_PER_INT;
  return {
    maxHp: hpBase + (level - 1) * HP_PER_LEVEL + a.vit * HP_PER_VIT,
    maxMana: manaBase + (level - 1) * MANA_PER_LEVEL + a.int * MANA_PER_INT,
    hpRegen: 1 + a.vit * 0.15,
    manaRegen: 1 + a.wis * 0.2, // WIS regenera mana (INT dá o tamanho do poço)
    // Dano físico: STR no corpo a corpo, DEX no arco/besta.
    physAtk: 3 + (cls.attackType === 'ranged' ? a.dex : a.str) * 1.0 + skillPhys * 1.5,
    magicAtk: 3 + a.int * 1.0 + skillMagic * 2,
    // Crítico é LUK — é a função principal do atributo Sorte.
    critChance: clamp(0.03 + a.luk * 0.006, 0, 0.6),
    critMult: 1.5 + a.luk * 0.008,
    defense: 1 + Math.floor(a.agi * 0.2) + Math.floor(a.vit * 0.15),
    magicResist: clamp(a.wis * 0.01, 0, 0.6),
    dodgeChance: clamp(a.agi * 0.005, 0, 0.5),
    // Velocidade de ATAQUE vem de AGI (GDD §4: "AGI = velocidade de ataque").
    // O nível não acelera nada sozinho — ele dá pontos, e você escolhe.
    attackCooldownMs: Math.max(300, 1100 - a.agi * 12),
    // Velocidade de MOVIMENTO idem: sobe conforme você gasta pontos em AGI.
    moveIntervalMs: Math.max(150, 480 - a.agi * 5),
    manaCost: Math.max(2, Math.round(cls.spellCost * (1 - a.wis * 0.01))),
    attackType: cls.attackType,
    attackRange: cls.attackRange,
  };
}

/** Calcula um golpe a partir da potência e da chance/mult de crítico. */
export function computeHit(
  power: number,
  critChance: number,
  critMult: number,
  rng: () => number = Math.random,
): { amount: number; crit: boolean } {
  const variance = 0.85 + rng() * 0.3; // 0.85 .. 1.15
  const crit = rng() < critChance;
  return { amount: Math.max(1, Math.round(power * variance * (crit ? critMult : 1))), crit };
}

export function totalAttributes(a: Attributes): number {
  return a.str + a.dex + a.vit + a.int + a.wis + a.agi + a.luk;
}
