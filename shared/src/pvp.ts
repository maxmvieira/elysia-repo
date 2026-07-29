/**
 * Flag PK ON/OFF (GDD 32.57–32.61) — sistema que o roadmap antigo não tinha.
 *
 * 🔴 A regra é mais forte do que "não causa dano". Com **PK OFF**, a ação
 * ofensiva de um jogador **simplesmente não existe** para outro jogador: sem
 * dano, sem queimadura, sem stun, sem congelamento, sem debuff, sem AoE, sem
 * DoT, sem armadilha — **e o caster não vira PK**. Uma Chuva de Meteoros não
 * pega quem atravessa a área.
 *
 * É isso que resolve a preocupação antiga de "magia de área acertando quem não
 * está em PvP": a resposta do doc é o flag, não um tratamento especial de AoE.
 * Por isso `canHarm` tem de ser consultada ANTES de qualquer efeito — dano,
 * condição ou empurrão — e não só na hora de subtrair HP.
 */

/** Quem pode sofrer uma ação ofensiva. Criatura nunca passa pelo filtro de PK. */
export type CombatantKind = 'player' | 'creature';

export interface Combatant {
  id: string;
  kind: CombatantKind;
  /** Flag de PK do jogador. Criaturas ignoram. */
  pkEnabled?: boolean;
  /** Id da party. Aliados não se acertam (friendly fire desligado por padrão). */
  partyId?: string;
  /** Id da guilda, para guerra oficial. */
  guildId?: string;
}

export interface HostilityContext {
  /**
   * Guerra de guilda oficial: os inimigos são **hostis automaticamente**, sem
   * precisar ligar PK a cada combate.
   */
  guildWar?: (a: Combatant, b: Combatant) => boolean;
  /** `DD-PK-009` duelo consensual é separado de PK — vale mesmo com PK OFF. */
  duel?: (a: Combatant, b: Combatant) => boolean;
  /** Friendly fire entre aliados. Desligado por padrão. */
  friendlyFire?: boolean;
}

export type HarmVeto =
  | 'self'
  | 'pk-off'
  | 'ally';

export interface HarmDecision {
  allowed: boolean;
  /** Por que não pode. Ausente quando pode. */
  veto?: HarmVeto;
  /**
   * A ação marca o atacante como PK? Falso em duelo e em guerra de guilda.
   * Com PK OFF a ação nem acontece, então também é falso — o doc é explícito
   * em que **o caster não vira PK**.
   */
  marksAsPk: boolean;
}

/**
 * Decide se `attacker` pode causar QUALQUER efeito ofensivo em `target`.
 *
 * Consultar antes do dano E antes da condição. Chamar só antes do dano deixaria
 * passar a queimadura e o stun, que é exatamente o que o doc proíbe.
 */
export function canHarm(
  attacker: Combatant,
  target: Combatant,
  ctx: HostilityContext = {},
): HarmDecision {
  if (attacker.id === target.id) {
    return { allowed: false, veto: 'self', marksAsPk: false };
  }

  // Criatura não participa do sistema de PK, nos dois sentidos: monstro bate em
  // quem quiser, e todo mundo bate em monstro.
  if (attacker.kind === 'creature' || target.kind === 'creature') {
    return { allowed: true, marksAsPk: false };
  }

  // Guerra oficial: hostil automaticamente, sem marcar PK e sem exigir flag.
  if (ctx.guildWar?.(attacker, target)) {
    return { allowed: true, marksAsPk: false };
  }

  // `DD-PK-009` duelo consensual é separado de PK: os dois concordaram.
  if (ctx.duel?.(attacker, target)) {
    return { allowed: true, marksAsPk: false };
  }

  // Aliados de party não se acertam, a menos que friendly fire esteja ligado.
  const sameParty =
    attacker.partyId !== undefined && attacker.partyId === target.partyId;
  if (sameParty && !ctx.friendlyFire) {
    return { allowed: false, veto: 'ally', marksAsPk: false };
  }

  // 🔴 O coração da regra: basta UM dos dois estar com PK OFF para a ação não
  // existir. Exigir só o do alvo deixaria um jogador pacífico ser arrastado
  // para PvP por quem ligou o flag.
  if (!attacker.pkEnabled || !target.pkEnabled) {
    return { allowed: false, veto: 'pk-off', marksAsPk: false };
  }

  return { allowed: true, marksAsPk: true };
}
