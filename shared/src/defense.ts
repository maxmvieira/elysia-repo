/**
 * Defesa em camadas (GDD cap. 31).
 *
 * ```
 * ATAQUE
 *   ↓ ESQUIVA          → o ataque não conecta
 *   ↓ ESCUDO           → conecta, mas parte do dano é amortecida
 *   ↓ ARMADURA/DEF     → reduz o dano bruto
 *   ↓ RESISTÊNCIAS     → atuam sobre o tipo de dano
 *   = DANO FINAL
 *
 * à parte: BLOQUEIO COMPLETO → 0 de dano (propriedade especial, NÃO é do escudo)
 * ```
 *
 * As duas correções que o capítulo marca como mais importantes:
 *
 * 1. `DD-DEF-006` **Escudo normal NÃO anula ataque.** Ele REDUZ. O exemplo do
 *    doc é literal: ataque de 1.000 com 25 % de mitigação → passam 750.
 * 2. `DD-DEF-009` **Chance de bloqueio não vem de NENHUM dos 7 atributos.** Nem
 *    STR, nem VIT, nem AGI, nem DEX, nem INT, nem WIS, nem LUK. Vem só de
 *    escudo, equipamento, carta e propriedades especiais — por isso
 *    `fullBlockChance` e `shieldMitigation` entram como DADOS neste módulo, e
 *    `computeStats` não os calcula.
 *
 * `DD-DEF-018` não existe botão de "levantar escudo": tudo é automático e
 * resolvido no servidor.
 */

import {
  applyResistance,
  type DamageType,
  type ResistanceProfile,
} from './elements.js';

/**
 * ⚠️ 🔴 `31.56` **A ordem matemática definitiva das camadas NÃO está fechada** —
 * e o próprio doc se contradiz:
 *
 * - o **diagrama** do cap. 31 põe ESCUDO (redução %) **antes** de ARMADURA (corte plano)
 * - o **texto** do mesmo capítulo diz *"DEF corta o dano bruto primeiro; a redução
 *   % age sobre o que sobrou"* — ou seja, o inverso
 *
 * Não dá para escolher em silêncio. As duas ordens estão implementadas e o
 * default segue o **diagrama**, que é a especificação explícita das camadas.
 * Trocar aqui é uma linha, e os testes cobrem as duas.
 */
export type LayerOrder = 'shield-first' | 'armor-first';
export const DEFAULT_LAYER_ORDER: LayerOrder = 'shield-first';

/**
 * ⚠️ REFERÊNCIA. `DD-DEF-012` fecha que **existe** um cap global de bloqueio e
 * que bloqueio mágico completo tem de ser MUITO raro — "senão o Knight fecha
 * todas as formas de pressioná-lo". O **valor** o doc deixa pendente.
 */
export const BLOCK_CAP = 0.25;

/**
 * Teto da esquiva. `DD-DEF-005` fecha **retorno decrescente e teto** ("nada de
 * Assassin com 90 %"); o roadmap registra a faixa 30–35 % vinda de AGI.
 */
export const DODGE_CAP = 0.35;

/**
 * ⚠️ REFERÊNCIA. Constante de meia-vida da curva de esquiva: com AGI = este
 * valor, a esquiva chega à metade do teto. O doc não fecha número.
 */
export const DODGE_HALF_AGI = 120;

/**
 * Esquiva a partir de AGI, com **retorno decrescente e teto** (`DD-DEF-005`).
 *
 * Curva assintótica: dobrar AGI nunca dobra a esquiva, e o teto é aproximado
 * mas jamais alcançado. É isso que impede o Assassin de virar intocável sem
 * precisar de um `clamp` que esconde o problema atrás de um corte seco.
 */
export function computeDodgeChance(agi: number): number {
  if (agi <= 0) return 0;
  return (DODGE_CAP * agi) / (agi + DODGE_HALF_AGI);
}

/**
 * O que o defensor traz para a conta.
 *
 * `fullBlockChance` e `shieldMitigation` NÃO são derivados de atributo
 * (`DD-DEF-009`) — quem preenche é o equipamento. Enquanto a Etapa 11 (refino) e
 * as cartas não existem, chegam zerados, e o pipeline funciona igual.
 */
export interface DefenseProfile {
  /** 0..1. Vem de AGI via `computeDodgeChance`. */
  dodgeChance: number;
  /**
   * 0..1. Propriedade ESPECIAL (carta, passivo, skill) — **não é do escudo**.
   * Limitada por `BLOCK_CAP`.
   */
  fullBlockChance: number;
  /**
   * 0..1. Fração do dano que o escudo amortece. `DD-DEF-007`: a proficiência
   * Shield melhora ESTA eficiência, nunca vira chance de negar golpe.
   */
  shieldMitigation: number;
  /** DEF física plana = VIT + armadura. Corte no dano bruto, não percentual. */
  defense: number;
  /** DEF mágica plana = WIS + equipamento. */
  magicDefense: number;
  /** Resistências por tipo de dano. */
  resistances: ResistanceProfile;
  /**
   * 0..1. Reduções percentuais de skill/buff/carta. O doc é explícito: reduções
   * % fortes vêm de equipamento/skill/buff/carta — **nunca** de acumular VIT ou WIS.
   */
  flatReductionPct?: number;
  /**
   * Multiplicador final do dano RECEBIDO. Padrão 1.
   *
   * Existe separado de `flatReductionPct` porque pode ser **maior que 1**: a
   * Fúria de Batalha do Knight aumenta o dano que o personagem sofre, e uma
   * "redução" não consegue expressar isso. Postura Defensiva usa o mesmo campo
   * com valor menor que 1.
   */
  damageTakenMult?: number;
}

/** Perfil neutro: nada mitiga. Base para montar defensores em teste e para criaturas sem equipamento. */
export function emptyDefense(overrides: Partial<DefenseProfile> = {}): DefenseProfile {
  return {
    dodgeChance: 0,
    fullBlockChance: 0,
    shieldMitigation: 0,
    defense: 0,
    magicDefense: 0,
    resistances: {},
    ...overrides,
  };
}

export type DamageOutcome = 'dodged' | 'blocked' | 'hit';

export interface DamageResult {
  /** Dano final aplicado. 0 se esquivou ou bloqueou; caso contrário, >= 1. */
  amount: number;
  outcome: DamageOutcome;
  type: DamageType;
  /**
   * Rastro camada a camada. O cliente usa para explicar de onde saiu o número
   * ("−40 pela armadura, −30 % pela resistência") e os testes para provar que a
   * ordem é a que o doc manda.
   */
  breakdown: {
    incoming: number;
    afterShield: number;
    afterArmor: number;
    afterResist: number;
    afterReduction: number;
  };
}

/**
 * Dano físico usa DEF física; os outros seis usam DEF mágica.
 *
 * ⚠️ Interpretação, não citação: o doc fecha "DEF Física = VIT + armadura · DEF
 * Mágica = WIS + equipamento" mas não lista qual elemento cai em qual. Só
 * Físico ser físico é a leitura direta — Veneno, em particular, é discutível e
 * pode mudar quando o Doc 3 chegar.
 */
export function defenseFor(profile: DefenseProfile, type: DamageType): number {
  return type === 'physical' ? profile.defense : profile.magicDefense;
}

/**
 * Resolve um golpe pelas camadas e devolve o dano final.
 *
 * `rng` é injetável para teste determinístico, no mesmo padrão de `computeHit`.
 * Sorteia na ordem esquiva → bloqueio, e **só sorteia a camada cuja chance é
 * maior que zero** — quem não tem escudo não gasta entropia com ele. Vale
 * lembrar disso ao montar sequências de rng em teste.
 */
export function resolveDamage(
  incoming: number,
  type: DamageType,
  def: DefenseProfile,
  rng: () => number = Math.random,
  order: LayerOrder = DEFAULT_LAYER_ORDER,
): DamageResult {
  const zero = {
    incoming,
    afterShield: 0,
    afterArmor: 0,
    afterResist: 0,
    afterReduction: 0,
  };

  // ── ESQUIVA ── o ataque não conecta. Nada depois disso acontece.
  if (def.dodgeChance > 0 && rng() < def.dodgeChance) {
    return { amount: 0, outcome: 'dodged', type, breakdown: zero };
  }

  // ── BLOQUEIO COMPLETO ── à parte das camadas: zera o dano. Propriedade
  // especial e rara (`DD-DEF-012`), nunca uma característica natural do escudo.
  const blockChance = Math.min(BLOCK_CAP, Math.max(0, def.fullBlockChance));
  if (blockChance > 0 && rng() < blockChance) {
    return { amount: 0, outcome: 'blocked', type, breakdown: zero };
  }

  // ── ESCUDO ── amortece uma FRAÇÃO. Nunca anula (`DD-DEF-006`).
  const mitigation = Math.min(1, Math.max(0, def.shieldMitigation));
  const shieldStep = (v: number): number => v * (1 - mitigation);

  // ── ARMADURA/DEF ── corte PLANO no dano bruto, não percentual.
  const flatDef = defenseFor(def, type);
  const armorStep = (v: number): number => Math.max(0, v - flatDef);

  let afterShield: number;
  let afterArmor: number;
  if (order === 'shield-first') {
    afterShield = shieldStep(incoming);
    afterArmor = armorStep(afterShield);
  } else {
    afterArmor = armorStep(incoming);
    afterShield = shieldStep(afterArmor);
  }
  const afterLayers = order === 'shield-first' ? afterArmor : afterShield;

  // ── RESISTÊNCIAS ── agem sobre o TIPO. Nunca zeram (`DD-ELM-003`).
  const afterResist = applyResistance(afterLayers, type, def.resistances);

  // ── REDUÇÕES % ── de skill/buff/carta, sobre o que sobrou. É desta camada
  // que o cap. 31 fala em "a redução % age sobre o que sobrou" — não do escudo,
  // que é camada própria e vem antes da armadura no diagrama.
  const reduction = Math.min(1, Math.max(0, def.flatReductionPct ?? 0));
  // ── MULTIPLICADOR FINAL ── pode AUMENTAR o dano (Fúria de Batalha).
  const takenMult = Math.max(0, def.damageTakenMult ?? 1);
  const afterReduction = afterResist * (1 - reduction) * takenMult;

  // Piso de 1 só no fim: um golpe que conectou sempre machuca. Aplicar piso a
  // cada camada infla o resultado e esconde o efeito da armadura.
  return {
    amount: Math.max(1, Math.round(afterReduction)),
    outcome: 'hit',
    type,
    breakdown: {
      incoming,
      afterShield,
      afterArmor,
      afterResist,
      afterReduction,
    },
  };
}
