/**
 * Habilidades ativas e árvore de especialização (GDD §4 e §5).
 *
 * O personagem evolui em DUAS direções independentes:
 *  - ATRIBUTOS (stats.ts) definem a ficha — STR/VIT/AGI/DEX/INT/WIS/LUK;
 *  - SKILL POINTS definem o repertório — quais habilidades ele tem e quão
 *    fundo foi em cada uma.
 *
 * Toda habilidade vai do Lv.1 ao Lv.10. Subir de nível aumenta dano, alcance,
 * duração ou efeito — mas NUNCA reduz cooldown (cooldown é ferramenta de
 * balanceamento; se caísse com o nível, tudo viraria spam no Lv.10).
 *
 * O jogador pode CONHECER muitas habilidades, mas não maximizar todas: uma
 * skill no Lv.10 custa 28 pontos, e a renda de pontos é calibrada para o
 * Knight fechar ~5 skills máximas no nível 100 e o Sorcerer ~9-10.
 *
 * O servidor é a autoridade: ele valida pré-requisito, pontos, mana, cooldown
 * e alcance. O cliente só desenha.
 */

import type { PlayerClass } from './stats.js';

export type SkillId =
  | 'power_strike'
  | 'bash'
  | 'charge'
  | 'rupture'
  | 'execution'
  | 'taunt'
  | 'defensive_stance'
  | 'battle_fury';

/** Como a habilidade escolhe seus alvos. */
export type SkillShape =
  /** Alvo único: usa o alvo atual, precisa estar dentro do alcance. */
  | 'target'
  /** Área: pega TODAS as criaturas no raio ao redor do conjurador. */
  | 'area'
  /** Não mira ninguém: age sobre o próprio personagem. */
  | 'self';

/**
 * O que a habilidade FAZ, além de dano. Cada tipo tem uma regra própria no
 * servidor — é o discriminante que evita um monte de flags soltas.
 */
export type SkillEffectKind =
  /** Dano puro (alvo único ou área). */
  | 'damage'
  /** Aproxima o Knight do alvo e golpeia — mobilidade é o valor real. */
  | 'charge'
  /** Dano + reduz a defesa física do alvo por alguns segundos. */
  | 'rupture'
  /** Dano que cresce conforme o alvo está mais ferido. */
  | 'execution'
  /** Puxa o aggro da criatura para quem usou. */
  | 'taunt'
  /** Postura alternável: liga/desliga, sem duração. */
  | 'stance'
  /** Fúria: buff de risco que drena vida e NÃO pode ser cancelado. */
  | 'fury';

export const MAX_SKILL_LEVEL = 10;

/**
 * Custo em Skill Points para subir a habilidade PARA cada nível (índice 0 =
 * aprender o Lv.1). Chegar ao Lv.5 é acessível; maximizar é caro de propósito.
 * Soma = 28 pontos para levar uma habilidade do zero ao Lv.10.
 */
export const SKILL_LEVEL_COST: number[] = [1, 1, 1, 2, 2, 3, 3, 4, 5, 6];

/** Custo para subir a habilidade de `nivelAtual` para `nivelAtual + 1`. */
export function skillUpgradeCost(nivelAtual: number): number {
  if (nivelAtual < 0 || nivelAtual >= MAX_SKILL_LEVEL) return Infinity;
  return SKILL_LEVEL_COST[nivelAtual]!;
}

/** Total de pontos gastos para ter a habilidade no nível `nivel`. */
export function skillTotalCost(nivel: number): number {
  let total = 0;
  for (let i = 0; i < Math.min(nivel, MAX_SKILL_LEVEL); i++) total += SKILL_LEVEL_COST[i]!;
  return total;
}

/**
 * Skill Points ganhos AO ATINGIR determinado nível de personagem. A renda é
 * diferente por classe (GDD §4): o Sorcerer desenvolve muito mais magias, então
 * recebe mais pontos — sem receber mais pontos de atributo por isso.
 *
 * Médias de projeto: Knight 1,5/nível · Assassin e Archer 1,7 · Sorcerer 2,5 ·
 * **Druid 2,0** (`DD-PROG-008/009`: "Druid entra com 2,0 SP/nível, entre as
 * físicas e o Sorcerer" — ele tem 23 habilidades contra as 18 do Sorcerer, mas
 * árvore grande não é o único critério).
 */
export function skillPointsAtLevel(cls: PlayerClass, level: number): number {
  if (level < 1) return 0;
  let pts: number;
  if (cls === 'sorcerer') {
    // Alterna +2 / +3 → média 2,5.
    pts = level % 2 === 0 ? 3 : 2;
  } else if (cls === 'druid') {
    // 🔴 Exatos 2 por nível — a média do doc é redonda, então não precisa
    // alternar como as outras. Ver `DD-PROG-008/009`.
    pts = 2;
  } else if (cls === 'knight') {
    // +1 normalmente, +2 a cada segundo nível → média 1,5.
    pts = level % 2 === 0 ? 2 : 1;
  } else {
    // Assassin e Archer: 3 níveis do ciclo dão 1, os outros 7 dão 2 → média 1,7.
    const ciclo = level % 10;
    pts = ciclo === 1 || ciclo === 4 || ciclo === 7 ? 1 : 2;
  }
  return pts + milestoneBonus(level);
}

/**
 * Bônus de marco: atingir certos níveis vale mais que os outros. Lv.10, 25, 50,
 * 75, 100 e depois a cada 50 níveis.
 */
export const MILESTONE_BONUS = 5;
function milestoneBonus(level: number): number {
  if (level === 10 || level === 25 || level === 50 || level === 75) return MILESTONE_BONUS;
  if (level >= 100 && level % 50 === 0) return MILESTONE_BONUS;
  return 0;
}

/** Total acumulado de Skill Points de um personagem no nível `level`. */
export function skillPointsTotalUpTo(cls: PlayerClass, level: number): number {
  let total = 0;
  for (let l = 1; l <= level; l++) total += skillPointsAtLevel(cls, l);
  return total;
}

/**
 * Custo em OURO para resetar os Skill Points. Barato na primeira vez (corrigir
 * a build enquanto aprendia), caro a partir da terceira — reset não pode virar
 * troca de build entre hunt, PvP e guerra. A partir do 4º há teto.
 */
export const SKILL_RESET_COSTS: number[] = [500, 5000, 25000];
export const SKILL_RESET_COST_MAX = 100000;
export function skillResetCost(resetsJaFeitos: number): number {
  return SKILL_RESET_COSTS[resetsJaFeitos] ?? SKILL_RESET_COST_MAX;
}

/** Pré-requisito de árvore: outra habilidade num nível mínimo. */
export interface SkillRequirement {
  skill: SkillId;
  level: number;
}

export interface SkillDef {
  id: SkillId;
  name: string;
  /** O que a habilidade faz (ver SkillEffectKind). */
  kind: SkillEffectKind;
  /** Classes que podem aprender. */
  classes: PlayerClass[];
  /** Nível de personagem mínimo para aprender o Lv.1. */
  reqLevel: number;
  /** Habilidades que precisam estar num certo nível antes desta. */
  requires?: SkillRequirement[];
  /** Custo de mana no Lv.1 e quanto sobe por nível. */
  manaCost: number;
  manaPerLevel: number;
  /** Recarga em ms — FIXA, não cai com o nível da habilidade. */
  cooldownMs: number;
  /** Multiplicador sobre o ataque no Lv.1 e ganho por nível. */
  power: number;
  powerPerLevel: number;
  shape: SkillShape;
  /** Alcance (alvo único) ou raio (área) em tiles, no Lv.1. */
  range: number;
  /** A cada quantos níveis o raio cresce em 1 tile (só área). 0 = nunca. */
  rangeEvery: number;
  /** Duração do efeito em ms (debuffs/posturas). 0 quando não se aplica. */
  durationMs: number;
  /** Efeito visual disparado no cliente. */
  fx: string;
  desc: string;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  power_strike: {
    id: 'power_strike',
    name: 'Golpe Poderoso',
    kind: 'damage',
    classes: ['knight'],
    reqLevel: 1,
    manaCost: 8,
    manaPerLevel: 1,
    // 1,5 s: quase uma extensão do ataque básico. O Knight encaixa sempre que
    // está disponível — quem limita o spam é a mana, não a recarga.
    cooldownMs: 1500,
    power: 1.3,
    powerPerLevel: 0.08,
    shape: 'target',
    range: 1,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'power_strike',
    desc: 'Golpe pesado num alvo. DPS constante contra alvo único.',
  },
  bash: {
    id: 'bash',
    name: 'Bash',
    kind: 'damage',
    classes: ['knight'],
    reqLevel: 5,
    // Árvore de verdade: só depois de dominar o básico o Knight aprende a
    // versão em área.
    requires: [{ skill: 'power_strike', level: 3 }],
    manaCost: 14,
    manaPerLevel: 2,
    // 3,5 s: habilidade central de farm, volta rápido o bastante para ser o
    // motor do Knight em grupo de monstros.
    cooldownMs: 3500,
    power: 0.8,
    powerPerLevel: 0.05,
    shape: 'area',
    range: 1,
    // Cresce para 2 tiles no Lv.7 — mais área, sem ficar gigantesca.
    rangeEvery: 6,
    durationMs: 0,
    fx: 'bash',
    desc: 'Golpeia o chão e fere TODOS os inimigos ao redor.',
  },
  charge: {
    id: 'charge',
    name: 'Investida',
    kind: 'charge',
    classes: ['knight'],
    reqLevel: 8,
    requires: [{ skill: 'power_strike', level: 3 }],
    manaCost: 10,
    manaPerLevel: 1,
    // Recarga alongada em duas rodadas a pedido do dono: 8 s → 13 s → 15 s. A
    // Investida é MOBILIDADE, não rotação de dano: em recarga curta ela cabia
    // no ciclo normal de combate, o que apaga a decisão de "guardo para
    // alcançar quem está fugindo?". O GDD já manda o cooldown nunca cair com o
    // nível, então este é o valor definitivo até o balanceamento final.
    cooldownMs: 15000,
    // O dano não é o ponto: o valor está em CHEGAR no alvo. Contra Archer e
    // Sorcerer no PvP isso será a diferença entre lutar e apanhar de longe.
    power: 0.9,
    powerPerLevel: 0.06,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'charge',
    desc: 'Avança até o alvo e golpeia. Mobilidade para alcançar quem foge.',
  },
  rupture: {
    id: 'rupture',
    name: 'Ruptura',
    kind: 'rupture',
    classes: ['knight'],
    reqLevel: 12,
    requires: [{ skill: 'bash', level: 3 }],
    manaCost: 12,
    manaPerLevel: 1,
    cooldownMs: 6000,
    power: 1.0,
    powerPerLevel: 0.05,
    shape: 'target',
    range: 1,
    rangeEvery: 0,
    // Janela em que o grupo inteiro causa mais dano físico no alvo.
    durationMs: 4000,
    fx: 'rupture',
    desc: 'Golpe que rasga a defesa do alvo por alguns segundos.',
  },
  execution: {
    id: 'execution',
    name: 'Execução',
    kind: 'execution',
    classes: ['knight'],
    reqLevel: 15,
    requires: [{ skill: 'power_strike', level: 5 }],
    manaCost: 15,
    manaPerLevel: 2,
    cooldownMs: 8000,
    // Multiplicador CRESCENTE conforme o alvo se aproxima da morte — nunca
    // execução instantânea, para não virar botão de deletar no PvP.
    power: 1.1,
    powerPerLevel: 0.07,
    shape: 'target',
    range: 1,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'execution',
    desc: 'Finalizador: quanto menos vida o alvo tem, mais forte o golpe.',
  },
  taunt: {
    id: 'taunt',
    name: 'Provocar',
    kind: 'taunt',
    classes: ['knight'],
    reqLevel: 6,
    manaCost: 4,
    manaPerLevel: 0,
    // 2 s: baixo de propósito. O Knight precisa administrar o campo puxando
    // um monstro atrás do outro de cima do Archer/Sorcerer.
    cooldownMs: 2000,
    power: 0,
    powerPerLevel: 0,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'taunt',
    desc: 'Puxa a atenção da criatura para você. Alvo único, recarga curta.',
  },
  defensive_stance: {
    id: 'defensive_stance',
    name: 'Postura Defensiva',
    kind: 'stance',
    classes: ['knight'],
    reqLevel: 10,
    manaCost: 0,
    manaPerLevel: 0,
    // Alternável: o cooldown existe só para impedir ligar/desligar a cada golpe.
    cooldownMs: 1500,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'stance',
    desc: 'Alterna: recebe bem menos dano, causa menos e anda mais devagar.',
  },
  battle_fury: {
    id: 'battle_fury',
    name: 'Fúria de Batalha',
    kind: 'fury',
    classes: ['knight'],
    reqLevel: 20,
    manaCost: 25,
    manaPerLevel: 0,
    // 90 s a contar do FIM da fúria (o servidor arma o cooldown quando acaba).
    cooldownMs: 90000,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'fury',
    desc: 'Multiplica sua vida e seu dano — mas drena vida e NÃO pode ser cancelada.',
  },
};

export const SKILL_IDS: SkillId[] = [
  'power_strike', 'bash', 'charge', 'rupture', 'execution', 'taunt',
  'defensive_stance', 'battle_fury',
];

/** Ordem dos atalhos na barra: índice 0 = F1, 1 = F2, … `null` = slot vazio. */
export const SKILL_BAR: (SkillId | null)[] = [
  'power_strike', 'bash', 'charge', 'rupture',
  'execution', 'taunt', 'defensive_stance', 'battle_fury',
];

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS[id as SkillId];
}

/** Níveis de cada habilidade do personagem (ausente ou 0 = não aprendida). */
export type SkillLevels = Partial<Record<SkillId, number>>;

export function skillLevelOf(levels: SkillLevels, id: SkillId): number {
  return levels[id] ?? 0;
}

/** A classe pode aprender esta habilidade? */
export function skillFitsClass(def: SkillDef, cls: PlayerClass): boolean {
  return def.classes.includes(cls);
}

/**
 * Por que o personagem ainda não pode subir esta habilidade? Devolve `null`
 * quando pode. A mensagem vai direto para o jogador, então é específica.
 */
export function skillUpBlockedReason(
  def: SkillDef,
  cls: PlayerClass,
  charLevel: number,
  levels: SkillLevels,
  skillPoints: number,
): string | null {
  if (!skillFitsClass(def, cls)) return `${def.name} não pertence à sua classe.`;
  const atual = skillLevelOf(levels, def.id);
  if (atual >= MAX_SKILL_LEVEL) return `${def.name} já está no nível máximo.`;
  if (charLevel < def.reqLevel) return `${def.name} exige nível ${def.reqLevel}.`;
  for (const req of def.requires ?? []) {
    if (skillLevelOf(levels, req.skill) < req.level) {
      return `${def.name} exige ${SKILLS[req.skill].name} Lv.${req.level}.`;
    }
  }
  const custo = skillUpgradeCost(atual);
  if (skillPoints < custo) {
    return `Faltam Skill Points: subir ${def.name} custa ${custo} (você tem ${skillPoints}).`;
  }
  return null;
}

/** Habilidade utilizável agora (aprendida pelo menos no Lv.1). */
export function isSkillUsable(def: SkillDef, cls: PlayerClass, levels: SkillLevels): boolean {
  return skillFitsClass(def, cls) && skillLevelOf(levels, def.id) > 0;
}

// ---------------------------------------------------------------------------
// Valores efetivos por nível da habilidade
// ---------------------------------------------------------------------------

/** Multiplicador de dano no nível informado. */
export function skillPower(def: SkillDef, nivel: number): number {
  return def.power + def.powerPerLevel * Math.max(0, nivel - 1);
}

/** Custo de mana no nível informado (habilidade forte pesa mais no bolso). */
export function skillManaCost(def: SkillDef, nivel: number): number {
  return Math.round(def.manaCost + def.manaPerLevel * Math.max(0, nivel - 1));
}

/** Alcance/raio no nível informado. */
export function skillRange(def: SkillDef, nivel: number): number {
  if (def.rangeEvery <= 0) return def.range;
  return def.range + Math.floor(Math.max(0, nivel - 1) / def.rangeEvery);
}

/** Interpola linearmente entre o valor do Lv.1 e o do Lv.10. */
function porNivel(nivel: number, noLv1: number, noLv10: number): number {
  const t = Math.min(1, Math.max(0, (nivel - 1) / (MAX_SKILL_LEVEL - 1)));
  return noLv1 + (noLv10 - noLv1) * t;
}

// ---------------------------------------------------------------------------
// Efeitos específicos por tipo de habilidade
// ---------------------------------------------------------------------------

/** Ruptura: quanto da defesa física do alvo é anulada (0..1). */
export function ruptureDefReduction(nivel: number): number {
  return porNivel(nivel, 0.2, 0.45);
}

/**
 * Execução: multiplicador extra conforme o alvo está ferido. Com o alvo cheio
 * o bônus é zero; perto da morte chega ao máximo do nível. Nunca mata na hora —
 * é curva de dano, não botão de deletar.
 */
export function executionMultiplier(nivel: number, hpRatio: number): number {
  const faltando = Math.min(1, Math.max(0, 1 - hpRatio));
  return 1 + faltando * porNivel(nivel, 1.0, 2.2);
}

/** Postura Defensiva: quanto do dano recebido é cortado (0..1). */
export function stanceDamageReduction(nivel: number): number {
  return porNivel(nivel, 0.2, 0.4);
}
/** Postura Defensiva: quanto do SEU dano você abre mão (0..1). */
export function stanceDamagePenalty(nivel: number): number {
  // Especializar reduz o preço: no Lv.10 você perde bem menos ofensiva.
  return porNivel(nivel, 0.3, 0.15);
}
/** Postura Defensiva: quanto o movimento fica mais lento (0..1). */
export const STANCE_SLOW = 0.15;

/** Números da Fúria de Batalha num determinado nível. */
export interface FuryStats {
  /** Multiplicador aplicado ao HP máximo (2× no Lv.1 … 3× no Lv.10). */
  hpMult: number;
  /** Bônus de dano físico (0.15 = +15%). */
  damageBonus: number;
  /** Redução do intervalo entre ataques (0.10 = 10% mais rápido). */
  attackSpeedBonus: number;
  /** Dano recebido a mais (0.20 = +20%). */
  damageTakenBonus: number;
  /** Fração do HP máximo drenada por segundo. */
  drainPerSecond: number;
}

/**
 * Fúria de Batalha (GDD §5). Subir o nível melhora o poder E o controle: a
 * drenagem CAI conforme você domina a habilidade (1%/s no Lv.1 → 0,5%/s no
 * Lv.10). Já a penalidade de dano recebido piora — o risco nunca desaparece.
 */
export function furyStats(nivel: number): FuryStats {
  return {
    hpMult: porNivel(nivel, 2.0, 3.0),
    damageBonus: porNivel(nivel, 0.15, 0.5),
    attackSpeedBonus: porNivel(nivel, 0.1, 0.3),
    damageTakenBonus: porNivel(nivel, 0.2, 0.3),
    drainPerSecond: porNivel(nivel, 0.01, 0.005),
  };
}
