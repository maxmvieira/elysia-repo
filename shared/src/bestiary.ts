/**
 * Comportamento de criatura, variantes de spawn e bestiário
 * (GDD §12, mensagens #269–#277, #551–#564, #971).
 *
 * O mundo fica mais natural quando nem todo bicho quer te matar: o coelho foge,
 * o javali só revida se você começar, e o zumbi ataca qualquer coisa que se
 * mexa. É essa diferença que faz a floresta parecer viva em vez de uma arena.
 */

/** Como a criatura reage à presença de um jogador. */
export type Behavior =
  /** Nunca ataca; sempre foge. Coelho, cervo, galinha. */
  | 'peaceful'
  /** Não inicia combate, mas revida — e desiste depois de um tempo em paz. */
  | 'neutral'
  /** Ataca quem entra no território dele. Urso, aranha gigante. */
  | 'territorial'
  /** Caça tudo que vê, inclusive outros monstros. Lobo, leão. */
  | 'predator'
  /** Ataca qualquer ser vivo, sem motivo. Zumbi, esqueleto, demônio. */
  | 'hostile'
  /** Como o hostil, mas nunca foge — ignora a própria vida. */
  | 'fanatic';

export const BEHAVIOR_LABEL: Record<Behavior, string> = {
  peaceful: 'Pacífico',
  neutral: 'Neutro',
  territorial: 'Territorial',
  predator: 'Predador',
  hostile: 'Hostil',
  fanatic: 'Fanático',
};

/** Começa a briga sozinha ao ver um jogador? */
export function startsFight(b: Behavior): boolean {
  return b === 'territorial' || b === 'predator' || b === 'hostile' || b === 'fanatic';
}

/** Foge em vez de lutar? */
export function fleesFromPlayers(b: Behavior): boolean {
  return b === 'peaceful';
}

/** Revida quando apanha? (só o pacífico não revida) */
export function retaliates(b: Behavior): boolean {
  return b !== 'peaceful';
}

/**
 * Depois de quanto tempo sem apanhar o NEUTRO perde o interesse e volta à
 * rotina. O pacífico também usa isso para parar de fugir.
 */
export const NEUTRAL_CALM_DOWN_MS = 8000;

// ---------------------------------------------------------------------------
// Variantes de spawn
// ---------------------------------------------------------------------------

/**
 * Variante natural de nascimento. Propositalmente só COMUM e INCOMUM por
 * enquanto (GDD #552): usar a mesma criatura-base com multiplicadores deixa a
 * hunt menos repetitiva sem virar um bestiário paralelo.
 */
export type CreatureVariant = 'common' | 'uncommon';

export interface VariantDef {
  id: CreatureVariant;
  /** Prefixo no nome exibido ('' para o comum). */
  prefix: string;
  hpMult: number;
  damageMult: number;
  xpMult: number;
  /** Multiplicador da chance de largar equipamento. */
  lootMult: number;
  /** Tonalidade aplicada ao sprite, para dar de ver que é diferente. */
  tint: number;
}

export const VARIANTS: Record<CreatureVariant, VariantDef> = {
  common: {
    id: 'common', prefix: '', hpMult: 1, damageMult: 1, xpMult: 1, lootMult: 1, tint: 0xffffff,
  },
  uncommon: {
    // +20 % de HP e dano, XP e loot melhores. O bastante para o jogador notar
    // "esse aqui está diferente" sem virar outra criatura.
    id: 'uncommon', prefix: 'Robusto ', hpMult: 1.2, damageMult: 1.2,
    xpMult: 1.6, lootMult: 1.8, tint: 0xffd27a,
  },
};

/** Chance de um spawn nascer na variante incomum. */
export const UNCOMMON_SPAWN_CHANCE = 0.08;

export function rollVariant(rng: () => number = Math.random): CreatureVariant {
  return rng() < UNCOMMON_SPAWN_CHANCE ? 'uncommon' : 'common';
}

// ---------------------------------------------------------------------------
// Bestiário
// ---------------------------------------------------------------------------

/**
 * O que o jogador já sabe sobre uma criatura. `encountered` marca "já vi isso"
 * mesmo que tenha morrido ou fugido — enfrentar ≠ matar (GDD #564).
 */
export interface BestiaryEntry {
  encountered: boolean;
  kills: number;
  /** Variantes que ele já viu, só como informação. */
  variants: CreatureVariant[];
}

export type BestiaryState = Record<string, BestiaryEntry>;

/**
 * Quantas mortes para cada patamar de conhecimento (0 a 4 = 0 %, 25 %, 50 %,
 * 75 %, 100 %).
 *
 * Chefes usam uma escala MUITO menor: não faz sentido exigir centenas de
 * mortes de algo raro e difícil. A primeira morte de um MVP já revela metade.
 */
export const BESTIARY_STEPS_COMMON = [5, 25, 100, 300];
export const BESTIARY_STEPS_BOSS = [1, 2, 4, 8];

/** Nível de conhecimento (0..4) a partir das mortes. */
export function bestiaryTier(kills: number, boss: boolean): number {
  const steps = boss ? BESTIARY_STEPS_BOSS : BESTIARY_STEPS_COMMON;
  let tier = 0;
  for (const s of steps) if (kills >= s) tier++;
  return tier;
}

/** Porcentagem revelada, para exibir na interface. */
export function bestiaryPercent(kills: number, boss: boolean): number {
  // O MVP salta para 50 % logo no primeiro abate (GDD #564).
  if (boss) {
    if (kills >= 8) return 100;
    if (kills >= 4) return 90;
    if (kills >= 2) return 75;
    if (kills >= 1) return 50;
    return 0;
  }
  return bestiaryTier(kills, false) * 25;
}

/** O que cada patamar libera. Serve de legenda na interface. */
export const BESTIARY_UNLOCKS: string[] = [
  'Nada ainda — continue caçando',
  'Vida e experiência',
  'Ataque e defesa',
  'Comportamento e tabela de loot',
  'Ficha completa',
];
