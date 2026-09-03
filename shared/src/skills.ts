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
import type { DamageType } from './elements.js';
import type { ConditionId } from './conditions.js';
import type { ModifierKey, Modifiers } from './effects.js';
import type { AreaKind } from './areas.js';

export type SkillId =
  // ⚔️ Knight
  | 'power_strike'
  | 'bash'
  | 'charge'
  | 'rupture'
  | 'execution'
  | 'taunt'
  | 'defensive_stance'
  | 'battle_fury'
  // 🌿 Druida — 💚 cura (5)
  | 'heal'
  | 'regeneration'
  | 'area_heal'
  | 'sanctuary'
  | 'emergency_heal'
  // 🌿 Druida — 🌟 buff/defesa (6)
  | 'blessing_agility'
  | 'oak_skin'
  | 'spirit_blessing'
  | 'nature_strength'
  | 'nature_blessing'
  | 'natural_harmony'
  // 🌿 Druida — ☠️ debuff (6)
  | 'weaken'
  | 'vulnerability'
  | 'curse_slowness'
  | 'curse_weakness'
  | 'silence'
  | 'nature_plague'
  // 🌿 Druida — 🌿 natureza (6)
  | 'earth_spike'
  | 'binding_roots'
  | 'wind_blades'
  | 'poison_spores'
  | 'nature_wrath'
  | 'nature_affinity'
  // 🔮 Feiticeiro — 🔥 fogo (4)
  | 'fire_bolt'
  | 'fire_wall'
  | 'meteor'
  | 'meteor_storm'
  // 🔮 Feiticeiro — ❄️ gelo (4)
  | 'cold_bolt'
  | 'ice_wall'
  | 'glacial_burst'
  | 'blizzard'
  // 🔮 Feiticeiro — ⚡ raio (3)
  | 'lightning_ball'
  | 'electric_discharge'
  | 'thor_wrath'
  // 🔮 Feiticeiro — ✨ arcano (7)
  | 'magic_enhance'
  | 'magic_amplify'
  | 'cast_mastery'
  | 'mana_regen'
  | 'magic_protection'
  | 'revealing_flame'
  | 'arcane_circle';

/** Como a habilidade escolhe seus alvos. */
export type SkillShape =
  /** Alvo único INIMIGO: usa o alvo atual, precisa estar dentro do alcance. */
  | 'target'
  /** Área: pega TODOS os inimigos no raio ao redor do conjurador. */
  | 'area'
  /** Não mira ninguém: age sobre o próprio personagem. */
  | 'self'
  /**
   * Alvo único ALIADO. Sem alvo aliado escolhido, cai no próprio conjurador —
   * é o que faz a Cura ser utilizável enquanto se foge, sem trocar de alvo.
   */
  | 'ally'
  /** Todos os aliados no raio, incluindo quem conjurou. Party e Cura em Área. */
  | 'party'
  /** Cria uma área persistente no chão (ver `areas.ts`). */
  | 'ground';

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
  | 'fury'
  /** Cura direta, na hora. Escala com `healPower` (WIS), não com ataque. */
  | 'heal'
  /** Cura ao longo do tempo: N pulsos até a duração acabar. */
  | 'hot'
  /** Modificadores de ficha por um tempo, no próprio ou em aliado. */
  | 'buff'
  /** Modificadores de ficha por um tempo, no inimigo. */
  | 'debuff'
  /** Aplica uma CONDIÇÃO (`conditions.ts`), com ou sem dano junto. */
  | 'condition'
  /** Larga uma área persistente no chão. */
  | 'ground'
  /** Vários golpes no mesmo lançamento. Fire Bolt, Lightning Ball. */
  | 'multihit'
  /** Passiva: nunca é conjurada, só soma enquanto estiver aprendida. */
  | 'passive'
  /** Alternável genérica (a Proteção Mágica). Igual à postura, sem ser do Knight. */
  | 'toggle';

/**
 * Um modificador que a habilidade concede, interpolado do Lv.1 ao Lv.10.
 *
 * Guardamos as duas pontas em vez de "valor + ganho por nível" porque é assim
 * que o documento escreve (*"−15 % no Lv.10"*), e converter de cabeça na hora
 * de conferir com o doc é onde o erro entra.
 */
export interface SkillModifier {
  key: ModifierKey;
  atLv1: number;
  atLv10: number;
}

/** Condição que a habilidade tenta aplicar, com chance e duração por nível. */
export interface SkillCondition {
  id: ConditionId;
  /** Chance 0..1 antes das resistências do alvo. */
  chanceAtLv1: number;
  chanceAtLv10: number;
  durationAtLv1: number;
  durationAtLv10: number;
  /** Dano por parcela, só para condições de DoT (veneno, queimadura). */
  power?: number;
}

/** Configuração da área persistente, para as habilidades `shape: 'ground'`. */
export interface SkillGround {
  kind: AreaKind;
  /** Intervalo entre pulsos. */
  tickMs: number;
  durationAtLv1: number;
  durationAtLv10: number;
  hitsPlayers: boolean;
  hitsCreatures: boolean;
  /** Impede a passagem (só a Ice Wall). */
  blocks?: boolean;
  /** Quantas instâncias simultâneas do MESMO conjurador. Ausente = 1. */
  maxAtLv1?: number;
  maxAtLv10?: number;
}

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

  // -------------------------------------------------------------------------
  // Campos das classes mágicas. Todos opcionais: as 8 do Knight não usam
  // nenhum, e continuam se comportando exatamente como antes.
  // -------------------------------------------------------------------------

  /**
   * Ramo/escola na árvore. Só serve para agrupar na UI — o servidor ignora.
   * Druida: `cura` · `buff` · `debuff` · `natureza`.
   * Feiticeiro: `fogo` · `gelo` · `raio` · `arcano`.
   */
  branch?: string;
  /**
   * Escala com `magicAtk` em vez de `physAtk`, e a defesa que conta passa a ser
   * a MÁGICA.
   *
   * 🔴 Não confundir com `damageType`: `DD-ELM-002`/32.2 separam as duas
   * coisas. O Espinho da Terra é `magic: true` (sai do poder mágico do Druida)
   * e `damageType: 'physical'` (uma estaca de pedra fura, não queima).
   */
  magic?: boolean;
  /** Tipo de dano. Ausente = físico. */
  damageType?: DamageType;
  /**
   * Tempo de conjuração em ms. 0 = instantâneo.
   *
   * 🔴 Durante a conjuração o personagem fica preso: andar cancela, e as
   * condições com `interruptsCast` (Stun, Congelamento, Petrificação) derrubam.
   * É o que dá contrajogo às magias grandes — sem isso, Chuva de Meteoros seria
   * um botão sem risco.
   */
  castMs?: number;
  /** Quantos golpes por lançamento (Fire Bolt, Lightning Ball). Ausente = 1. */
  hits?: number;
  hitsAtLv10?: number;
  /** Condição aplicada pela habilidade. */
  applies?: SkillCondition;
  /** Modificadores concedidos (buff) ou impostos (debuff). */
  mods?: SkillModifier[];
  /** Configuração da área persistente (`shape: 'ground'`). */
  ground?: SkillGround;
  /**
   * A duração cresce com o nível: quanto ela vale no Lv.10. Ausente = a
   * duração é fixa em `durationMs`.
   */
  durationAtLv10?: number;
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

  // ==========================================================================
  // 🌿 DRUIDA — 23 habilidades em 4 ramos (Doc 1, cap. 71)
  //
  // 🔴 A conta é do doc, não arredondada: `DD-DRU-006` corrigiu de 22 para 23,
  // "~230 níveis possíveis — maximizar tudo é impossível de propósito". Com
  // 2,0 SP/nível, o Druida fecha ~8 habilidades no Lv.10 lá pelo nível 100.
  //
  // 🔴 **Toda cura sai de `healPower` (WIS), não de ataque** (`DD-PROG-024/025`:
  // "WIS é o principal, não INT — e é WIS que escala cura"). Por isso nenhuma
  // habilidade de cura tem `magic: true`: ela não passa pelo poder mágico.
  // ==========================================================================

  // ------------------------------- 💚 CURA (5) ------------------------------
  heal: {
    id: 'heal',
    name: 'Cura',
    kind: 'heal',
    branch: 'cura',
    classes: ['druid'],
    reqLevel: 1,
    manaCost: 12,
    manaPerLevel: 3,
    // 🔴 CD ~1 s vem do doc, e é deliberado: "pode ser repetida em sequência; o
    // limitador é MP + cast, não cooldown". Quem segura o spam é o bolso.
    cooldownMs: 1000,
    // 🔴 "Lv.10 = 450 % de poder relativo". Lv.1 = 100 %, e a reta entre os dois
    // dá 0,3889 por nível — arredondado para 0,39, o Lv.10 fecha em 4,51.
    power: 1.0,
    powerPerLevel: 0.39,
    shape: 'ally',
    range: 6,
    rangeEvery: 0,
    durationMs: 0,
    // 🔴 ~1,0 s de conjuração, também do doc. É o que impede a Cura de anular o
    // burst: o dano chega antes de a cura sair.
    castMs: 1000,
    fx: 'heal',
    desc: 'Cura um aliado na hora. Barata no cooldown, cara na mana.',
  },
  regeneration: {
    id: 'regeneration',
    name: 'Regeneração',
    kind: 'hot',
    branch: 'cura',
    classes: ['druid'],
    reqLevel: 6,
    requires: [{ skill: 'heal', level: 3 }],
    manaCost: 20,
    manaPerLevel: 4,
    cooldownMs: 3000,
    // 🔴 "Mais eficiente em MANA que a cura direta" — e é medido, não afirmado:
    // ver `HOT_PULSES`. O total curado por ponto de mana fica ~35 % acima da
    // Cura, e o preço é o tempo: 20 s para receber tudo.
    power: 0.42,
    powerPerLevel: 0.16,
    shape: 'ally',
    range: 6,
    rangeEvery: 0,
    // 🔴 ~10 pulsos em ~20 s (doc). `HOT_PULSES` fecha a conta do intervalo.
    durationMs: 20000,
    fx: 'regeneration',
    desc: 'Cura ao longo de 20 s. Rende mais por mana e libera você para agir.',
  },
  /**
   * ⚠️ **REFERÊNCIA — o doc NÃO recuperou os detalhes desta.** O cap. 71 lista
   * "Cura em Área" como a 3ª do ramo e avisa: *"as três últimas não têm
   * detalhes recuperados — nomes e números não confirmados"*.
   *
   * O que existe aqui é a ESTRUTURA (cura em raio, sobre a party), com números
   * derivados por proporção da Cura individual — não citação. Quando o
   * documento aparecer, é este bloco que se corrige.
   */
  area_heal: {
    id: 'area_heal',
    name: 'Cura em Área',
    kind: 'heal',
    branch: 'cura',
    classes: ['druid'],
    reqLevel: 20,
    requires: [{ skill: 'heal', level: 5 }],
    manaCost: 40,
    manaPerLevel: 8,
    cooldownMs: 8000,
    // ⚠️ REFERÊNCIA: ~60 % da Cura individual por alvo. Cura menos por cabeça e
    // muito mais no total — é o que separa healer de party do healer de tank.
    power: 0.6,
    powerPerLevel: 0.24,
    shape: 'party',
    range: 3,
    rangeEvery: 5,
    durationMs: 0,
    castMs: 1500,
    fx: 'area_heal',
    desc: 'Cura todos os aliados ao seu redor. ⚠️ Números provisórios.',
  },
  /**
   * ⚠️ **REFERÊNCIA** — mesma advertência da Cura em Área. O nome "Santuário"
   * está no doc; os números, não.
   *
   * Implementado como ÁREA PERSISTENTE porque é o que o nome descreve e o que o
   * arquétipo "Guerra" pede (*"Cura em Área + Santuário + debuff pesado"*):
   * um chão seguro onde a party se reagrupa enquanto o Druida faz outra coisa.
   */
  sanctuary: {
    id: 'sanctuary',
    name: 'Santuário',
    kind: 'ground',
    branch: 'cura',
    classes: ['druid'],
    reqLevel: 35,
    requires: [{ skill: 'area_heal', level: 5 }],
    manaCost: 70,
    manaPerLevel: 10,
    cooldownMs: 30000,
    // ⚠️ REFERÊNCIA: pulso fraco, muitos pulsos. O valor está na permanência.
    power: 0.3,
    powerPerLevel: 0.09,
    shape: 'ground',
    range: 2,
    rangeEvery: 6,
    durationMs: 8000,
    castMs: 1200,
    ground: {
      kind: 'heal',
      tickMs: 1000,
      durationAtLv1: 8000,
      durationAtLv10: 16000,
      hitsPlayers: true,
      hitsCreatures: false,
    },
    fx: 'sanctuary',
    desc: 'Consagra o chão: quem ficar dentro se cura a cada segundo. ⚠️ Provisório.',
  },
  /**
   * ⚠️ **REFERÊNCIA — inclusive o NOME.** O doc diz apenas que existe uma "5ª de
   * emergência" e não dá nome nem número. "Sopro Vital" é escolha nossa, e é o
   * primeiro candidato a mudar quando o texto aparecer.
   *
   * 🔴 O que **não** é escolha nossa: ela não ressuscita. `DD-DRU-032` fecha
   * que *"o Druid não tem Ressurreição — a função dele é impedir a morte, não
   * desfazê-la"*. Uma cura de emergência forte é o limite do que a classe pode
   * ter sem ferir isso, e o alvo precisa estar **vivo**.
   */
  emergency_heal: {
    id: 'emergency_heal',
    name: 'Sopro Vital',
    kind: 'heal',
    branch: 'cura',
    classes: ['druid'],
    reqLevel: 45,
    requires: [{ skill: 'heal', level: 7 }, { skill: 'regeneration', level: 5 }],
    manaCost: 90,
    manaPerLevel: 12,
    // CD longo: é o botão de "não morre agora", não parte da rotação.
    cooldownMs: 45000,
    // ⚠️ REFERÊNCIA: ~2× a Cura individual, e instantânea — o que ela compra é
    // o cast que a Cura cobra.
    power: 2.2,
    powerPerLevel: 0.7,
    shape: 'ally',
    range: 7,
    rangeEvery: 0,
    durationMs: 0,
    // Sem `castMs` de propósito: emergência com 1 s de conjuração chega tarde.
    fx: 'emergency_heal',
    desc: 'Cura de emergência, instantânea e enorme. Não ressuscita. ⚠️ Provisório.',
  },

  // ---------------------------- 🌟 BUFF/DEFESA (6) --------------------------
  blessing_agility: {
    id: 'blessing_agility',
    name: 'Bênção da Agilidade',
    kind: 'buff',
    branch: 'buff',
    classes: ['druid'],
    reqLevel: 3,
    manaCost: 15,
    manaPerLevel: 2,
    cooldownMs: 2000,
    power: 0,
    powerPerLevel: 0,
    shape: 'ally',
    range: 6,
    rangeEvery: 0,
    durationMs: 60000,
    durationAtLv10: 180000,
    mods: [
      { key: 'attackSpeed', atLv1: 0.04, atLv10: 0.15 },
      { key: 'moveSpeed', atLv1: 0.03, atLv10: 0.10 },
    ],
    fx: 'buff_agility',
    desc: 'Acelera ataque e movimento de um aliado.',
  },
  oak_skin: {
    id: 'oak_skin',
    name: 'Pele de Carvalho',
    kind: 'buff',
    branch: 'buff',
    classes: ['druid'],
    reqLevel: 8,
    requires: [{ skill: 'blessing_agility', level: 3 }],
    manaCost: 18,
    manaPerLevel: 3,
    cooldownMs: 2000,
    power: 0,
    powerPerLevel: 0,
    shape: 'ally',
    range: 6,
    rangeEvery: 0,
    durationMs: 60000,
    durationAtLv10: 180000,
    mods: [
      { key: 'defense', atLv1: 0.06, atLv10: 0.25 },
      { key: 'maxHp', atLv1: 0.03, atLv10: 0.12 },
    ],
    fx: 'buff_oak',
    desc: 'Endurece a pele de um aliado: mais defesa física e mais vida.',
  },
  spirit_blessing: {
    id: 'spirit_blessing',
    name: 'Bênção Espiritual',
    kind: 'buff',
    branch: 'buff',
    classes: ['druid'],
    reqLevel: 8,
    requires: [{ skill: 'blessing_agility', level: 3 }],
    manaCost: 18,
    manaPerLevel: 3,
    cooldownMs: 2000,
    power: 0,
    powerPerLevel: 0,
    shape: 'ally',
    range: 6,
    rangeEvery: 0,
    durationMs: 60000,
    durationAtLv10: 180000,
    // O par defensivo da Pele de Carvalho: aquela cobre o físico, esta o mágico.
    // A bifurcação é o que faz o Druida escolher contra o que a party vai lutar.
    mods: [
      { key: 'magicResist', atLv1: 0.06, atLv10: 0.25 },
      { key: 'statusResist', atLv1: 0.03, atLv10: 0.12 },
    ],
    fx: 'buff_spirit',
    desc: 'Protege um aliado contra magia e contra status.',
  },
  nature_strength: {
    id: 'nature_strength',
    name: 'Força da Natureza',
    kind: 'buff',
    branch: 'buff',
    classes: ['druid'],
    reqLevel: 15,
    requires: [{ skill: 'oak_skin', level: 3 }, { skill: 'spirit_blessing', level: 3 }],
    manaCost: 25,
    manaPerLevel: 4,
    cooldownMs: 2000,
    power: 0,
    powerPerLevel: 0,
    shape: 'ally',
    range: 6,
    rangeEvery: 0,
    durationMs: 60000,
    durationAtLv10: 180000,
    // Ofensivo, e nos DOIS tipos: o Druida buffa a party inteira, não só quem
    // bate. Sem isso, o Feiticeiro do grupo não teria motivo para querer um.
    mods: [
      { key: 'physAtk', atLv1: 0.05, atLv10: 0.20 },
      { key: 'magicAtk', atLv1: 0.05, atLv10: 0.20 },
    ],
    fx: 'buff_strength',
    desc: 'Aumenta o dano físico e mágico de um aliado.',
  },
  /**
   * 🔴 A "magia de vamos entrar no MVP" do doc — e as três regras dela são
   * citação: **exige as 4 anteriores no Lv.5**, dura **30 → 90 s**, CD **~30 s**.
   *
   * ⚠️ O CD alto com duração alta é proposital: *"é magia de 'vamos entrar no
   * MVP', não de spam"*. Ela não cabe na rotação, cabe no plano.
   */
  nature_blessing: {
    id: 'nature_blessing',
    name: 'Bênção da Natureza',
    kind: 'buff',
    branch: 'buff',
    classes: ['druid'],
    reqLevel: 40,
    requires: [
      { skill: 'blessing_agility', level: 5 },
      { skill: 'oak_skin', level: 5 },
      { skill: 'spirit_blessing', level: 5 },
      { skill: 'nature_strength', level: 5 },
    ],
    manaCost: 80,
    manaPerLevel: 10,
    cooldownMs: 30000,
    power: 0,
    powerPerLevel: 0,
    // A única do ramo que pega a party inteira de uma vez.
    shape: 'party',
    range: 5,
    rangeEvery: 0,
    durationMs: 30000,
    durationAtLv10: 90000,
    castMs: 1500,
    // Um pouco de tudo, em todo mundo. Mais fraca por chave que as quatro
    // individuais — o valor é atingir cinco pessoas de uma vez.
    mods: [
      { key: 'physAtk', atLv1: 0.03, atLv10: 0.12 },
      { key: 'magicAtk', atLv1: 0.03, atLv10: 0.12 },
      { key: 'defense', atLv1: 0.03, atLv10: 0.12 },
      { key: 'magicResist', atLv1: 0.03, atLv10: 0.12 },
      { key: 'attackSpeed', atLv1: 0.02, atLv10: 0.08 },
    ],
    fx: 'buff_nature',
    desc: 'Abençoa a party inteira antes da luta grande. Exige as 4 bênçãos no Lv.5.',
  },
  /**
   * 🔴 **PASSIVA, e só do próprio Druida** — o doc é explícito: *"não é buff de
   * party"*. Os quatro números do Lv.10 são citação direta: +15 % resistência a
   * status, +10 % elemental, +15 % a debuffs, +10 % de cura recebida.
   *
   * ⚠️ `DD-DRU-013` **é resistência, não imunidade** — não substitui carta.
   * ⚠️ O +10 % é de cura **recebida por ele mesmo**; NÃO aumenta a cura que ele
   * dá. É por isso que a chave é `healReceived` e não `healPower`.
   */
  natural_harmony: {
    id: 'natural_harmony',
    name: 'Harmonia Natural',
    kind: 'passive',
    branch: 'buff',
    classes: ['druid'],
    reqLevel: 25,
    requires: [{ skill: 'spirit_blessing', level: 5 }],
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    mods: [
      { key: 'statusResist', atLv1: 0.02, atLv10: 0.15 },
      { key: 'elementalResist', atLv1: 0.01, atLv10: 0.10 },
      { key: 'debuffResist', atLv1: 0.02, atLv10: 0.15 },
      { key: 'healReceived', atLv1: 0.01, atLv10: 0.10 },
    ],
    fx: 'passive',
    desc: 'Passiva sua: resiste a status, elementos e debuffs, e recebe mais cura.',
  },

  // ------------------------------ ☠️ DEBUFF (6) -----------------------------
  //
  // 🔴 O ramo que dá identidade à classe, nas palavras do doc: *"não precisa
  // causar dano se faz o inimigo causar menos e os aliados causarem mais"*.
  // TODOS os números do Lv.10 e os cooldowns abaixo são citação do cap. 71.
  //
  // ⚠️ `71.23` **MVP não precisa ser imune a debuff** — basta reduzir a
  // eficiência. É o que mantém o Druida relevante em boss fight, e é por isso
  // que nenhum destes está na lista de imunidade de criatura.

  weaken: {
    id: 'weaken',
    name: 'Enfraquecer',
    kind: 'debuff',
    branch: 'debuff',
    classes: ['druid'],
    reqLevel: 4,
    manaCost: 14,
    manaPerLevel: 2,
    cooldownMs: 5000,
    power: 0,
    powerPerLevel: 0,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 16000,
    mods: [
      { key: 'physAtk', atLv1: -0.04, atLv10: -0.15 },
      { key: 'magicAtk', atLv1: -0.04, atLv10: -0.15 },
    ],
    fx: 'debuff_weaken',
    desc: 'O alvo causa menos dano físico e mágico por 16 s.',
  },
  vulnerability: {
    id: 'vulnerability',
    name: 'Vulnerabilidade',
    kind: 'debuff',
    branch: 'debuff',
    classes: ['druid'],
    reqLevel: 10,
    requires: [{ skill: 'weaken', level: 3 }],
    manaCost: 18,
    manaPerLevel: 3,
    cooldownMs: 8000,
    power: 0,
    powerPerLevel: 0,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 12000,
    mods: [
      { key: 'defense', atLv1: -0.04, atLv10: -0.15 },
      { key: 'magicResist', atLv1: -0.04, atLv10: -0.15 },
    ],
    fx: 'debuff_vulnerability',
    desc: 'Abre a defesa do alvo: todo o grupo passa a machucar mais.',
  },
  curse_slowness: {
    id: 'curse_slowness',
    name: 'Maldição da Lentidão',
    kind: 'debuff',
    branch: 'debuff',
    classes: ['druid'],
    reqLevel: 12,
    requires: [{ skill: 'weaken', level: 3 }],
    manaCost: 18,
    manaPerLevel: 3,
    cooldownMs: 8000,
    power: 0,
    powerPerLevel: 0,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 10000,
    mods: [
      { key: 'moveSpeed', atLv1: -0.07, atLv10: -0.25 },
      { key: 'attackSpeed', atLv1: -0.04, atLv10: -0.15 },
    ],
    fx: 'debuff_slow',
    desc: 'O alvo anda e ataca mais devagar.',
  },
  /**
   * 🔴 −40 % de cura recebida no Lv.10, 10 s, CD ~15 s — tudo citação.
   *
   * ⚠️ É a habilidade **anti-healer** do jogo, e o número é grande de propósito:
   * o doc a coloca como a resposta a uma party que não morre. Ela não aparece
   * em PvE porque monstro não se cura — é uma skill que só faz sentido contra
   * gente, e está aqui inteira desde já.
   */
  curse_weakness: {
    id: 'curse_weakness',
    name: 'Maldição da Fraqueza',
    kind: 'debuff',
    branch: 'debuff',
    classes: ['druid'],
    reqLevel: 22,
    requires: [{ skill: 'vulnerability', level: 3 }],
    manaCost: 26,
    manaPerLevel: 4,
    cooldownMs: 15000,
    power: 0,
    powerPerLevel: 0,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 10000,
    mods: [{ key: 'healReceived', atLv1: -0.12, atLv10: -0.40 }],
    fx: 'debuff_curse',
    desc: 'O alvo recebe muito menos cura. A resposta a quem não morre.',
  },
  /**
   * 🔴 6 s no Lv.10, CD ~20 s — citação. E a regra que o define: *"bloqueia
   * magia, mas o alvo **continua andando e batendo**"*. Isso já está em
   * `conditions.ts` (`silence` é `restriction`, não `control`).
   *
   * ⚠️ Bifurcação proposital do doc: **Silêncio → PvP/anti-caster**, enquanto a
   * **Praga → guerra/controle de grupo**. As duas são o Lv.10 do ramo e o
   * Druida raramente tem pontos para as duas.
   */
  silence: {
    id: 'silence',
    name: 'Silêncio',
    kind: 'condition',
    branch: 'debuff',
    classes: ['druid'],
    reqLevel: 30,
    requires: [{ skill: 'curse_slowness', level: 5 }],
    manaCost: 35,
    manaPerLevel: 4,
    cooldownMs: 20000,
    power: 0,
    powerPerLevel: 0,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 6000,
    applies: {
      id: 'silence',
      // A chance sobe com o nível; no Lv.10 é praticamente certa, mas a
      // resistência do alvo ainda tem a palavra final.
      chanceAtLv1: 0.5,
      chanceAtLv10: 1.0,
      durationAtLv1: 3000,
      durationAtLv10: 6000,
    },
    fx: 'silence',
    desc: 'Cala o alvo: nada de magia por 6 s. Ele ainda anda e bate.',
  },
  /**
   * 🔴 "AoE com versões reduzidas de tudo (−10/−10/−15/−10 %), 8–10 s, CD ~25 s"
   * — citação. Os quatro números batem, na ordem, com as quatro maldições
   * individuais: ataque, defesa, movimento e cura recebida.
   */
  nature_plague: {
    id: 'nature_plague',
    name: 'Praga da Natureza',
    kind: 'debuff',
    branch: 'debuff',
    classes: ['druid'],
    reqLevel: 30,
    requires: [{ skill: 'curse_weakness', level: 5 }],
    manaCost: 55,
    manaPerLevel: 7,
    cooldownMs: 25000,
    power: 0,
    powerPerLevel: 0,
    shape: 'area',
    range: 3,
    rangeEvery: 6,
    durationMs: 10000,
    castMs: 1000,
    mods: [
      { key: 'physAtk', atLv1: -0.03, atLv10: -0.10 },
      { key: 'magicAtk', atLv1: -0.03, atLv10: -0.10 },
      { key: 'defense', atLv1: -0.03, atLv10: -0.10 },
      { key: 'moveSpeed', atLv1: -0.04, atLv10: -0.15 },
      { key: 'healReceived', atLv1: -0.03, atLv10: -0.10 },
    ],
    fx: 'plague',
    desc: 'Praga em área: um pouco de todas as maldições, em todos ao redor.',
  },

  // ----------------------------- 🌿 NATUREZA (6) ----------------------------
  //
  // 🔴 O ramo "que permite jogar solo" (doc). É o único do Druida que causa dano
  // de verdade, e `DD-DRU-021` põe o teto: **dano bruto ABAIXO das supremas do
  // Sorcerer** — o que está respeitado abaixo, na comparação Ira × Chuva.
  //
  // ⚠️ **Sobre o "elemento natureza".** O doc fala em "dano de natureza", mas
  // `DD-ELM-002` fecha a lista em SETE elementos e natureza não é um deles —
  // foi decisão explícita não ter 15–25 elementos. Tratamos "natureza" como o
  // RAMO, não como elemento: cada habilidade usa um dos sete (estaca de pedra e
  // lâmina de vento ferem `physical`, esporo e praga ferem `poison`), e a
  // passiva `nature_affinity` some sobre o ramo. Nenhum oitavo elemento entrou.

  earth_spike: {
    id: 'earth_spike',
    name: 'Espinho da Terra',
    kind: 'damage',
    branch: 'natureza',
    classes: ['druid'],
    reqLevel: 2,
    manaCost: 10,
    manaPerLevel: 2,
    cooldownMs: 2000,
    power: 1.1,
    powerPerLevel: 0.13,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 0,
    // Sai do poder MÁGICO (é conjurada) e fere como FÍSICO (é uma estaca).
    // 32.2 em uma linha só.
    magic: true,
    damageType: 'physical',
    applies: {
      id: 'bleed',
      chanceAtLv1: 0.10,
      chanceAtLv10: 0.35,
      durationAtLv1: 6000,
      durationAtLv10: 8000,
      power: 3,
    },
    fx: 'earth_spike',
    desc: 'Estaca de pedra num alvo, com chance de sangramento. O básico do ramo.',
  },
  /**
   * 🔴 "Imobiliza: **pode atacar e conjurar, mas não anda**; Lv.10 ~4 s" —
   * citação, e é exatamente a condição `root` de `conditions.ts` (*"prende os
   * pés, não as mãos"*).
   *
   * 🔴 **É daqui que sai a PETRIFICAÇÃO** ("níveis altos"), o status
   * característico da classe. Só a partir do Lv.7: nos níveis baixos é raiz
   * pura. `DD-DRU-031` — imunidade a Congelamento **não** protege dela.
   */
  binding_roots: {
    id: 'binding_roots',
    name: 'Raízes Prensoras',
    kind: 'condition',
    branch: 'natureza',
    classes: ['druid'],
    reqLevel: 9,
    requires: [{ skill: 'earth_spike', level: 3 }],
    manaCost: 22,
    manaPerLevel: 3,
    cooldownMs: 10000,
    power: 0,
    powerPerLevel: 0,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 4000,
    applies: {
      id: 'root',
      chanceAtLv1: 0.6,
      chanceAtLv10: 1.0,
      durationAtLv1: 2000,
      durationAtLv10: 4000,
    },
    fx: 'roots',
    desc: 'Prende os pés do alvo. Nos níveis altos, pode PETRIFICAR.',
  },
  wind_blades: {
    id: 'wind_blades',
    name: 'Lâminas de Vento',
    kind: 'damage',
    branch: 'natureza',
    classes: ['druid'],
    reqLevel: 9,
    requires: [{ skill: 'earth_spike', level: 3 }],
    manaCost: 26,
    manaPerLevel: 4,
    cooldownMs: 5000,
    power: 0.75,
    powerPerLevel: 0.09,
    shape: 'area',
    range: 2,
    rangeEvery: 6,
    durationMs: 0,
    magic: true,
    damageType: 'physical',
    // 🔴 "~20 % de pequeno knockback" — citação. E o empurrão é tratado à parte
    // do dano, como no Lightning Ball do Feiticeiro: resistir ao empurrão não
    // evita o golpe.
    applies: {
      id: 'knockback',
      chanceAtLv1: 0.20,
      chanceAtLv10: 0.20,
      durationAtLv1: 400,
      durationAtLv10: 400,
    },
    fx: 'wind_blades',
    desc: 'Corta todos ao redor e às vezes empurra. A AoE do Druida.',
  },
  poison_spores: {
    id: 'poison_spores',
    name: 'Esporos Venenosos',
    kind: 'ground',
    branch: 'natureza',
    classes: ['druid'],
    reqLevel: 18,
    requires: [{ skill: 'wind_blades', level: 3 }],
    manaCost: 40,
    manaPerLevel: 5,
    cooldownMs: 12000,
    power: 0.35,
    powerPerLevel: 0.07,
    shape: 'ground',
    range: 2,
    rangeEvery: 6,
    // 🔴 "DoT em área, 10–12 s" — citação.
    durationMs: 10000,
    magic: true,
    damageType: 'poison',
    ground: {
      kind: 'damage',
      tickMs: 2000,
      durationAtLv1: 10000,
      durationAtLv10: 12000,
      hitsPlayers: true,
      hitsCreatures: true,
    },
    applies: {
      id: 'poison',
      chanceAtLv1: 0.25,
      chanceAtLv10: 0.60,
      durationAtLv1: 6000,
      durationAtLv10: 12000,
      power: 4,
    },
    fx: 'spores',
    desc: 'Nuvem de esporos que envenena quem ficar dentro.',
  },
  /**
   * 🔴 A SUPREMA, e o doc explica por que ela é a identidade da classe:
   * *"persistente 4→8 s, ataca a região em ciclos **enquanto o Druida continua
   * curando e debuffando**"*. Foi por causa desta frase que áreas persistentes
   * viraram sistema (`areas.ts`) em vez de laço dentro do lançamento.
   *
   * 🔴 `DD-DRU-021` **dano bruto ABAIXO das supremas do Sorcerer**, e a conta
   * fecha: no Lv.10 ela dá 8 pulsos de 0,815 = **6,52** de poder por alvo,
   * contra os **10,4** da Chuva de Meteoros (10 impactos de 1,04). Há teste
   * travando essa desigualdade — mexeu num dos dois, ele avisa.
   *
   * ⚠️ E o troco é o certo: o Druida **continua curando e debuffando** enquanto
   * ela roda, enquanto o Feiticeiro fica 3 s preso conjurando a dele.
   *
   * 🔴 "~3–5 % de petrificação por ciclo" — citação.
   */
  nature_wrath: {
    id: 'nature_wrath',
    name: 'Ira da Natureza',
    kind: 'ground',
    branch: 'natureza',
    classes: ['druid'],
    reqLevel: 40,
    requires: [
      { skill: 'poison_spores', level: 5 },
      { skill: 'binding_roots', level: 5 },
    ],
    manaCost: 90,
    manaPerLevel: 12,
    cooldownMs: 25000,
    power: 0.5,
    powerPerLevel: 0.035,
    shape: 'ground',
    range: 3,
    rangeEvery: 5,
    durationMs: 4000,
    castMs: 1500,
    magic: true,
    damageType: 'physical',
    ground: {
      kind: 'damage',
      // Um ciclo por segundo: 4 ciclos no Lv.1, 8 no Lv.10.
      tickMs: 1000,
      durationAtLv1: 4000,
      durationAtLv10: 8000,
      hitsPlayers: true,
      hitsCreatures: true,
    },
    applies: {
      id: 'petrify',
      chanceAtLv1: 0.03,
      chanceAtLv10: 0.05,
      durationAtLv1: 5000,
      durationAtLv10: 7000,
    },
    fx: 'nature_wrath',
    desc: 'A região inteira ataca em ciclos — e você continua curando enquanto isso.',
  },
  /**
   * 🔴 "+15 % dano de natureza e de veneno" — citação.
   * 🔴 `DD-DRU-026` **NÃO aumenta cura** — o doc é explícito, e a razão é
   * separar investimento ofensivo de healer. Por isso a chave é uma só e não
   * encosta em `healPower`.
   */
  nature_affinity: {
    id: 'nature_affinity',
    name: 'Afinidade com a Natureza',
    kind: 'passive',
    branch: 'natureza',
    classes: ['druid'],
    reqLevel: 25,
    requires: [{ skill: 'earth_spike', level: 5 }],
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'passive',
    desc: 'Passiva: +15 % de dano nas habilidades de Natureza e no veneno. Não afeta cura.',
  },

  // ==========================================================================
  // 🔮 FEITICEIRO — 18 habilidades em 4 escolas (Doc 1, cap. 70)
  //
  // ⚠️ `70.60`: diferente do Archer, o Feiticeiro **NÃO sofreu reformulação
  // posterior** — a V1 de 18 habilidades continua sendo a versão mais atual.
  // Não há revisão escondida para procurar.
  //
  // | Escola | Nº | Identidade (doc) |
  // |---|---|---|
  // | 🔥 Fogo | 4 | dano bruto, Queimadura, AoE — **destrói** |
  // | ❄️ Gelo | 4 | slow, Congelamento, barreiras — **controla** |
  // | ⚡ Raio | 3 | velocidade, burst, resposta imediata — **reage e explode** |
  // | ✨ Arcano | 7 | mana, cast, defesa, utilidade — **faz o Feiticeiro funcionar** |
  //
  // 🔴 `70.49` **Se todo o kit defensivo estiver em cooldown e o Knight colar
  // nele, o Feiticeiro tem que estar em perigo real.** É proposital, e é por
  // isso que os CDs defensivos daqui (Círculo 45 s, Explosão Glacial 12 s) são
  // longos: evitam kite infinito.
  // ==========================================================================

  // ------------------------------- 🔥 FOGO (4) ------------------------------
  /**
   * 🔴 O doc chama de *"o 'Golpe Poderoso' do mago"*: alvo único, econômico,
   * multi-hit. É a habilidade que substitui o firebolt que o Feiticeiro
   * disparava no ataque BÁSICO até agora — `DD-PROG-028` fecha que cajado bate
   * físico e *"dano mágico à distância exige gastar uma habilidade e mana"*.
   */
  fire_bolt: {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    kind: 'multihit',
    branch: 'fogo',
    classes: ['sorcerer'],
    reqLevel: 1,
    manaCost: 8,
    manaPerLevel: 2,
    cooldownMs: 1500,
    power: 0.55,
    powerPerLevel: 0.07,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 0,
    magic: true,
    damageType: 'fire',
    // 2 impactos no Lv.1, 4 no Lv.10 — o "multi-hit" do doc, sem virar canhão.
    hits: 2,
    hitsAtLv10: 4,
    applies: {
      id: 'burn',
      chanceAtLv1: 0.10,
      chanceAtLv10: 0.30,
      durationAtLv1: 4000,
      durationAtLv10: 6000,
      power: 4,
    },
    fx: 'fire_bolt',
    desc: 'Rajada de fogo num alvo. Barata, constante, pode queimar.',
  },
  fire_wall: {
    id: 'fire_wall',
    name: 'Muralha de Fogo',
    kind: 'ground',
    branch: 'fogo',
    classes: ['sorcerer'],
    reqLevel: 10,
    requires: [{ skill: 'fire_bolt', level: 3 }],
    manaCost: 35,
    manaPerLevel: 5,
    cooldownMs: 14000,
    power: 0.4,
    powerPerLevel: 0.06,
    shape: 'ground',
    range: 1,
    rangeEvery: 6,
    durationMs: 8000,
    castMs: 800,
    magic: true,
    damageType: 'fire',
    // "Controle de ESPAÇO": ela não bloqueia a passagem (isso é a Ice Wall),
    // ela torna a passagem cara. Quem atravessar, queima.
    ground: {
      kind: 'damage',
      tickMs: 1000,
      durationAtLv1: 8000,
      durationAtLv10: 14000,
      hitsPlayers: true,
      hitsCreatures: true,
    },
    applies: {
      id: 'burn',
      chanceAtLv1: 0.25,
      chanceAtLv10: 0.60,
      durationAtLv1: 4000,
      durationAtLv10: 6000,
      power: 5,
    },
    fx: 'fire_wall',
    desc: 'Parede de chamas no chão: atravessar custa caro.',
  },
  meteor: {
    id: 'meteor',
    name: 'Meteoro',
    kind: 'damage',
    branch: 'fogo',
    classes: ['sorcerer'],
    reqLevel: 20,
    requires: [{ skill: 'fire_bolt', level: 5 }],
    manaCost: 45,
    manaPerLevel: 7,
    cooldownMs: 9000,
    power: 1.8,
    powerPerLevel: 0.22,
    // "Impacto + pequena AoE": estoura em volta do conjurador com raio curto.
    shape: 'area',
    range: 2,
    rangeEvery: 6,
    durationMs: 0,
    castMs: 1800,
    magic: true,
    damageType: 'fire',
    applies: {
      id: 'burn',
      chanceAtLv1: 0.30,
      chanceAtLv10: 0.70,
      durationAtLv1: 5000,
      durationAtLv10: 8000,
      power: 6,
    },
    fx: 'meteor',
    desc: 'Um meteoro cai: impacto pesado e uma pequena área.',
  },
  /**
   * 🔴 A SUPREMA de fogo. Do doc, e tudo é citação: pré-requisito **Fire Bolt 5
   * + Fire Wall 5 + Meteoro 5**; no Lv.10 são **10 meteoros**, área grande,
   * ~4 s de queda, **cast ~3 s**, **CD ~15 s**, MP altíssimo.
   *
   * 🔴 `DD-SOR-010` **os meteoros caem em posições parcialmente aleatórias na
   * área** — um alvo pequeno leva poucos impactos, um MVP enorme leva vários.
   * O tamanho físico do inimigo importa.
   *
   * ⚠️ **O sorteio por impacto está no servidor, não aqui.** Esta ficha diz
   * quantos meteoros caem; quem decide em quem cada um acerta é `castSpell`.
   */
  meteor_storm: {
    id: 'meteor_storm',
    name: 'Chuva de Meteoros',
    kind: 'multihit',
    branch: 'fogo',
    classes: ['sorcerer'],
    reqLevel: 50,
    requires: [
      { skill: 'fire_bolt', level: 5 },
      { skill: 'fire_wall', level: 5 },
      { skill: 'meteor', level: 5 },
    ],
    manaCost: 140,
    manaPerLevel: 18,
    cooldownMs: 15000,
    // 10 impactos × 1,04 = 10,4 de poder por alvo no Lv.10. É o teto do jogo, e
    // é contra este número que `DD-DRU-021` mede a suprema do Druida.
    power: 0.68,
    powerPerLevel: 0.04,
    shape: 'area',
    range: 4,
    rangeEvery: 4,
    durationMs: 0,
    // 🔴 3 s de conjuração: o preço da maior magia do jogo é ficar parado e
    // interrompível. Sem isso ela não teria contrajogo nenhum.
    castMs: 3000,
    magic: true,
    damageType: 'fire',
    hits: 4,
    hitsAtLv10: 10,
    applies: {
      id: 'burn',
      chanceAtLv1: 0.35,
      chanceAtLv10: 0.80,
      durationAtLv1: 6000,
      durationAtLv10: 10000,
      power: 8,
    },
    fx: 'meteor_storm',
    desc: 'O céu cai. 10 meteoros no Lv.10, em posições aleatórias da área.',
  },

  // ------------------------------- ❄️ GELO (4) ------------------------------
  cold_bolt: {
    id: 'cold_bolt',
    name: 'Cold Bolt',
    kind: 'damage',
    branch: 'gelo',
    classes: ['sorcerer'],
    reqLevel: 3,
    manaCost: 10,
    manaPerLevel: 2,
    cooldownMs: 2000,
    power: 1.15,
    powerPerLevel: 0.14,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 0,
    magic: true,
    damageType: 'ice',
    // Gelo CONTROLA: o bolt não congela, atrasa. Congelar é papel da Nevasca.
    applies: {
      id: 'slow',
      chanceAtLv1: 0.15,
      chanceAtLv10: 0.45,
      durationAtLv1: 3000,
      durationAtLv10: 5000,
    },
    fx: 'cold_bolt',
    desc: 'Lasca de gelo num alvo, com chance de deixá-lo lento.',
  },
  /**
   * 🔴 "Barreira física destruível, **1→3 paredes simultâneas**, **20 s→60 s**"
   * — citação. É a única habilidade do jogo que cria colisão de verdade
   * (`blocks: true` em `areas.ts`).
   *
   * ⚠️ Quando o Feiticeiro tenta erguer a 4ª, a mais antiga cai — recusar em
   * silêncio seria pior do que substituir.
   */
  ice_wall: {
    id: 'ice_wall',
    name: 'Muralha de Gelo',
    kind: 'ground',
    branch: 'gelo',
    classes: ['sorcerer'],
    reqLevel: 12,
    requires: [{ skill: 'cold_bolt', level: 3 }],
    manaCost: 30,
    manaPerLevel: 4,
    cooldownMs: 12000,
    power: 0,
    powerPerLevel: 0,
    shape: 'ground',
    range: 0,
    rangeEvery: 0,
    durationMs: 20000,
    magic: true,
    ground: {
      kind: 'wall',
      // Parede não pulsa: o tique é irrelevante, mas o campo é obrigatório.
      tickMs: 1000,
      durationAtLv1: 20000,
      durationAtLv10: 60000,
      hitsPlayers: false,
      hitsCreatures: false,
      blocks: true,
      maxAtLv1: 1,
      maxAtLv10: 3,
    },
    fx: 'ice_wall',
    desc: 'Ergue uma parede de gelo que bloqueia a passagem. Até 3 no Lv.10.',
  },
  /**
   * 🔴 "360° ao redor de si, **para quando o melee cola nele**" — citação, e é
   * a razão de ser da habilidade: é a resposta ao Knight que fechou a
   * distância. Por isso o raio é curto e o efeito é empurrar, não matar.
   */
  glacial_burst: {
    id: 'glacial_burst',
    name: 'Explosão Glacial',
    kind: 'damage',
    branch: 'gelo',
    classes: ['sorcerer'],
    reqLevel: 22,
    requires: [{ skill: 'cold_bolt', level: 5 }],
    manaCost: 40,
    manaPerLevel: 5,
    cooldownMs: 12000,
    power: 1.0,
    powerPerLevel: 0.12,
    shape: 'area',
    range: 2,
    rangeEvery: 0,
    durationMs: 0,
    magic: true,
    damageType: 'ice',
    applies: {
      id: 'slow',
      chanceAtLv1: 0.45,
      chanceAtLv10: 0.90,
      durationAtLv1: 3000,
      durationAtLv10: 6000,
    },
    fx: 'glacial_burst',
    desc: 'Estoura gelo em 360°. A resposta a quem colou em você.',
  },
  /**
   * 🔴 A suprema de gelo. "Tempestade persistente, múltiplos ciclos", e o
   * número do congelamento é uma CORREÇÃO registrada: `DD-SOR-012` rebalanceou
   * de 25 % para **8–12 % de chance por impacto** no Lv.10, justamente porque
   * o Congelamento passou a durar ~10 s.
   *
   * 🔴 E o combo que o doc descreve funciona porque `conditions.ts` já
   * implementa a regra: **dano externo quebra o gelo**. Congela → abre
   * distância → prepara Meteoro → o impacto liberta. É tensão, não bug.
   */
  blizzard: {
    id: 'blizzard',
    name: 'Nevasca',
    kind: 'ground',
    branch: 'gelo',
    classes: ['sorcerer'],
    reqLevel: 50,
    requires: [
      { skill: 'cold_bolt', level: 5 },
      { skill: 'ice_wall', level: 5 },
      { skill: 'glacial_burst', level: 5 },
    ],
    manaCost: 130,
    manaPerLevel: 16,
    cooldownMs: 20000,
    power: 0.45,
    powerPerLevel: 0.06,
    shape: 'ground',
    range: 3,
    rangeEvery: 5,
    durationMs: 6000,
    castMs: 2500,
    magic: true,
    damageType: 'ice',
    ground: {
      kind: 'damage',
      tickMs: 1000,
      durationAtLv1: 6000,
      durationAtLv10: 12000,
      hitsPlayers: true,
      hitsCreatures: true,
    },
    applies: {
      id: 'freeze',
      // 🔴 8 % → 12 %: a faixa exata do `DD-SOR-012`. Não é chute.
      chanceAtLv1: 0.08,
      chanceAtLv10: 0.12,
      durationAtLv1: 10000,
      durationAtLv10: 10000,
    },
    fx: 'blizzard',
    desc: 'Tempestade persistente. Cada impacto pode congelar por 10 s.',
  },

  // ------------------------------- ⚡ RAIO (3) ------------------------------
  //
  // ⚠️ **Só três, de propósito** (doc). Raio é a escola da resposta imediata:
  // pouca variedade, muito burst.

  /**
   * 🔴 "Multi-hit, **8 hits no Lv.10**, empurra progressivamente" — citação.
   * 🔴 E a regra fina: *"knockback é tratado **separado do dano**, resistir ao
   * empurrão não evita o dano"*. É exatamente como `applies` funciona aqui —
   * a condição pode falhar e o golpe entra do mesmo jeito.
   */
  lightning_ball: {
    id: 'lightning_ball',
    name: 'Esfera Elétrica',
    kind: 'multihit',
    branch: 'raio',
    classes: ['sorcerer'],
    reqLevel: 15,
    manaCost: 30,
    manaPerLevel: 5,
    cooldownMs: 7000,
    power: 0.4,
    powerPerLevel: 0.05,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 0,
    magic: true,
    damageType: 'electric',
    hits: 3,
    hitsAtLv10: 8,
    applies: {
      id: 'knockback',
      chanceAtLv1: 0.10,
      chanceAtLv10: 0.30,
      durationAtLv1: 400,
      durationAtLv10: 400,
    },
    fx: 'lightning_ball',
    desc: 'Esfera que acerta várias vezes e vai empurrando. 8 impactos no Lv.10.',
  },
  /**
   * 🔴 `DD-SOR-018` **sem stun, sem knockback** — citação, e é o que a
   * diferencia das outras duas de raio. Ela é a AoE RÁPIDA: cooldown curto,
   * dano limpo, nenhum controle.
   */
  electric_discharge: {
    id: 'electric_discharge',
    name: 'Descarga Elétrica',
    kind: 'damage',
    branch: 'raio',
    classes: ['sorcerer'],
    reqLevel: 25,
    requires: [{ skill: 'lightning_ball', level: 3 }],
    manaCost: 38,
    manaPerLevel: 5,
    cooldownMs: 5000,
    power: 1.05,
    powerPerLevel: 0.13,
    shape: 'area',
    range: 2,
    rangeEvery: 5,
    durationMs: 0,
    magic: true,
    damageType: 'electric',
    // Sem `applies`, e isso é a ficha inteira: `DD-SOR-018` proíbe.
    fx: 'discharge',
    desc: 'Descarga em área, rápida e limpa. Sem atordoar, sem empurrar.',
  },
  /**
   * 🔴 A suprema de raio: "múltiplos raios, **pequena chance de stun por
   * impacto** com proteção anti-cadeia".
   *
   * ⚠️ A proteção anti-cadeia que o doc pede **já existe e é do jogo inteiro**:
   * `CONTROL_IMMUNITY_MS` e os diminishing returns de `conditions.ts`. Não
   * precisou de regra especial aqui — o quarto stun seguido simplesmente não
   * pega.
   */
  thor_wrath: {
    id: 'thor_wrath',
    name: 'Ira de Thor',
    kind: 'multihit',
    branch: 'raio',
    classes: ['sorcerer'],
    reqLevel: 50,
    requires: [
      { skill: 'lightning_ball', level: 5 },
      { skill: 'electric_discharge', level: 5 },
    ],
    manaCost: 125,
    manaPerLevel: 15,
    cooldownMs: 18000,
    power: 0.62,
    powerPerLevel: 0.05,
    shape: 'area',
    range: 3,
    rangeEvery: 5,
    durationMs: 0,
    castMs: 2000,
    magic: true,
    damageType: 'electric',
    hits: 3,
    hitsAtLv10: 8,
    applies: {
      id: 'stun',
      chanceAtLv1: 0.05,
      chanceAtLv10: 0.12,
      durationAtLv1: 1500,
      durationAtLv10: 1500,
    },
    fx: 'thor_wrath',
    desc: 'Raios caem na área. Cada impacto pode atordoar — mas a corrente tem limite.',
  },

  // ------------------------------ ✨ ARCANO (7) -----------------------------
  //
  // ⚠️ O ramo é **ramificado, não linear** (doc): Aprimoramento → Amplificação
  // (Lv.5) e Maestria de Conjuração (Lv.3) · Regeneração de Mana → Proteção
  // Mágica (Lv.3) · Chama de Revelação · Círculo Arcano.
  //
  // É a escola que "faz o Feiticeiro funcionar": nenhuma delas causa dano.

  magic_enhance: {
    id: 'magic_enhance',
    name: 'Aprimoramento Mágico',
    kind: 'passive',
    branch: 'arcano',
    classes: ['sorcerer'],
    reqLevel: 5,
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    mods: [{ key: 'magicAtk', atLv1: 0.02, atLv10: 0.15 }],
    fx: 'passive',
    desc: 'Passiva: seu poder mágico cresce. A raiz de toda a escola arcana.',
  },
  magic_amplify: {
    id: 'magic_amplify',
    name: 'Amplificação Mágica',
    kind: 'buff',
    branch: 'arcano',
    classes: ['sorcerer'],
    reqLevel: 25,
    requires: [{ skill: 'magic_enhance', level: 5 }],
    manaCost: 45,
    manaPerLevel: 6,
    cooldownMs: 40000,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 12000,
    durationAtLv10: 20000,
    // Janela de burst: curta, forte, cara. É o que se liga antes da Chuva.
    mods: [{ key: 'magicAtk', atLv1: 0.12, atLv10: 0.40 }],
    fx: 'buff_amplify',
    desc: 'Janela curta de poder mágico muito maior. Ligue antes da suprema.',
  },
  /**
   * ⚠️ **A única habilidade do jogo que mexe em tempo de CONJURAÇÃO.** Não é
   * cooldown — o GDD proíbe cooldown cair com nível — é o `castMs`, que é
   * outro eixo e existe justamente para poder ser reduzido.
   */
  cast_mastery: {
    id: 'cast_mastery',
    name: 'Maestria de Conjuração',
    kind: 'passive',
    branch: 'arcano',
    classes: ['sorcerer'],
    reqLevel: 18,
    requires: [{ skill: 'magic_enhance', level: 3 }],
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'passive',
    desc: 'Passiva: conjura mais rápido. Até −30 % de tempo de conjuração no Lv.10.',
  },
  mana_regen: {
    id: 'mana_regen',
    name: 'Regeneração de Mana',
    kind: 'passive',
    branch: 'arcano',
    classes: ['sorcerer'],
    reqLevel: 5,
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'passive',
    desc: 'Passiva: sua mana volta mais rápido. Até +60 % no Lv.10.',
  },
  /**
   * 🔴 "Converte parte do dano recebido em consumo de MP; **liga e desliga**"
   * — citação. É `toggle`, como a Postura Defensiva do Knight, e não tem
   * duração: fica ligada até acabar a mana ou você desligar.
   */
  magic_protection: {
    id: 'magic_protection',
    name: 'Proteção Mágica',
    kind: 'toggle',
    branch: 'arcano',
    classes: ['sorcerer'],
    reqLevel: 20,
    requires: [{ skill: 'mana_regen', level: 3 }],
    manaCost: 0,
    manaPerLevel: 0,
    // Só para não virar liga-desliga a cada golpe.
    cooldownMs: 1500,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'magic_protection',
    desc: 'Alterna: parte do dano que você levaria sai da mana em vez da vida.',
  },
  /**
   * 🔴 "Detecta Assassin furtivo, monstro invisível e **armadilhas**; revela
   * para aliados. CD ~15 s" — citação. E `70.42` é o que impede o abuso: **não
   * é detecção permanente**, é counter com counterplay.
   *
   * ⚠️ **Furtividade e armadilha ainda não existem no jogo** (são das Etapas 13
   * e 16). A habilidade entra com a estrutura pronta — cooldown, alcance,
   * duração da revelação — e revela o que houver para revelar hoje: nada.
   * Marcada assim para quem implementar furtividade saber que o counter já tem
   * lugar.
   */
  revealing_flame: {
    id: 'revealing_flame',
    name: 'Chama de Revelação',
    kind: 'buff',
    branch: 'arcano',
    classes: ['sorcerer'],
    reqLevel: 15,
    manaCost: 25,
    manaPerLevel: 3,
    cooldownMs: 15000,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 4,
    rangeEvery: 5,
    durationMs: 5000,
    durationAtLv10: 12000,
    fx: 'reveal',
    desc: 'Revela furtivos, invisíveis e armadilhas ao redor — e mostra à party.',
  },
  /**
   * 🔴 A defensiva definitiva, e o doc é cirúrgico: `DD-SOR-023/024` **100 % de
   * imunidade a dano FÍSICO** dentro da área — **magia continua acertando
   * normal**. Só vale enquanto está dentro; saiu, acabou.
   *
   * 🔴 Lv.1 **2,0 s** → Lv.10 **4,0 s**, CD **45 s**. Dois círculos **não
   * acumulam** — e essa é justamente a regra 1 de `effects.ts`, que vale para
   * todos os efeitos do jogo.
   *
   * ⚠️ 4 s de imunidade total ao físico parece absurdo, e é: é o que `70.49`
   * compra ao exigir que, **com o kit em cooldown**, o Feiticeiro esteja em
   * perigo real. O CD de 45 s é o outro lado dessa moeda.
   */
  arcane_circle: {
    id: 'arcane_circle',
    name: 'Círculo Arcano de Proteção',
    kind: 'ground',
    branch: 'arcano',
    classes: ['sorcerer'],
    reqLevel: 35,
    requires: [{ skill: 'magic_protection', level: 3 }],
    manaCost: 60,
    manaPerLevel: 6,
    cooldownMs: 45000,
    power: 0,
    powerPerLevel: 0,
    shape: 'ground',
    range: 1,
    rangeEvery: 0,
    durationMs: 2000,
    ground: {
      kind: 'ward',
      tickMs: 500,
      durationAtLv1: 2000,
      durationAtLv10: 4000,
      hitsPlayers: true,
      hitsCreatures: false,
    },
    fx: 'arcane_circle',
    desc: 'Círculo que anula TODO o dano físico de quem estiver dentro. Magia passa.',
  },
};

export const SKILL_IDS: SkillId[] = [
  // ⚔️ Knight (8)
  'power_strike', 'bash', 'charge', 'rupture', 'execution', 'taunt',
  'defensive_stance', 'battle_fury',
  // 🌿 Druida (23)
  'heal', 'regeneration', 'area_heal', 'sanctuary', 'emergency_heal',
  'blessing_agility', 'oak_skin', 'spirit_blessing', 'nature_strength',
  'nature_blessing', 'natural_harmony',
  'weaken', 'vulnerability', 'curse_slowness', 'curse_weakness', 'silence',
  'nature_plague',
  'earth_spike', 'binding_roots', 'wind_blades', 'poison_spores', 'nature_wrath',
  'nature_affinity',
  // 🔮 Feiticeiro (18)
  'fire_bolt', 'fire_wall', 'meteor', 'meteor_storm',
  'cold_bolt', 'ice_wall', 'glacial_burst', 'blizzard',
  'lightning_ball', 'electric_discharge', 'thor_wrath',
  'magic_enhance', 'magic_amplify', 'cast_mastery', 'mana_regen',
  'magic_protection', 'revealing_flame', 'arcane_circle',
];

/** Quantos slots a barra de atalhos tem: F1..F8. */
export const SKILL_BAR_SLOTS = 8;

/**
 * Barra de atalhos padrão de cada classe: índice 0 = F1, 1 = F2, …
 * `null` = slot vazio.
 *
 * 🔴 **Por que passou a ser por classe.** Até aqui `SKILL_BAR` era UM array
 * global de oito, montado quando só o Knight tinha habilidades, e o cliente
 * filtrava por classe em cima dele. Com 23 do Druida e 18 do Feiticeiro isso
 * deixa de fechar por aritmética: 49 habilidades não cabem em oito slots
 * compartilhados, e o Druida acabaria com a barra do Knight quase toda vazia.
 *
 * ⚠️ Isto é o **padrão**, não uma prisão: são as oito que fazem sentido ter à
 * mão desde cedo. As passivas ficam de fora de propósito — não se aperta F para
 * uma passiva. As demais se usam pela janela de habilidades.
 */
export const SKILL_BARS: Record<PlayerClass, (SkillId | null)[]> = {
  knight: [
    'power_strike', 'bash', 'charge', 'rupture',
    'execution', 'taunt', 'defensive_stance', 'battle_fury',
  ],
  // A ordem conta a rotação: cura, cura, os dois debuffs que se usa sempre,
  // o dano básico, o controle e a suprema.
  druid: [
    'heal', 'regeneration', 'weaken', 'vulnerability',
    'earth_spike', 'binding_roots', 'area_heal', 'nature_wrath',
  ],
  sorcerer: [
    'fire_bolt', 'cold_bolt', 'lightning_ball', 'electric_discharge',
    'meteor', 'ice_wall', 'arcane_circle', 'meteor_storm',
  ],
  // Sem árvore própria ainda (Etapa 13). A barra existe e nasce vazia em vez de
  // herdar a do Knight — ver `skillBarFor`.
  archer: [null, null, null, null, null, null, null, null],
  assassin: [null, null, null, null, null, null, null, null],
};

/**
 * ⚠️ Compatibilidade: a barra do Knight, que era o `SKILL_BAR` global. Mantida
 * para não quebrar quem ainda importa o nome antigo; código novo usa
 * `skillBarFor(classe)`.
 */
export const SKILL_BAR: (SkillId | null)[] = SKILL_BARS.knight;

/** Barra de atalhos desta classe. */
export function skillBarFor(cls: PlayerClass): (SkillId | null)[] {
  return SKILL_BARS[cls];
}

/** Todas as habilidades que esta classe pode aprender, na ordem da árvore. */
export function skillsOfClass(cls: PlayerClass): SkillDef[] {
  return SKILL_IDS.map((id) => SKILLS[id]).filter((d) => d.classes.includes(cls));
}

/** Os ramos/escolas da classe, na ordem em que aparecem. */
export function branchesOfClass(cls: PlayerClass): string[] {
  const vistos: string[] = [];
  for (const def of skillsOfClass(cls)) {
    const b = def.branch ?? 'geral';
    if (!vistos.includes(b)) vistos.push(b);
  }
  return vistos;
}

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

/** Duração do efeito no nível informado. Fixa quando não há `durationAtLv10`. */
export function skillDuration(def: SkillDef, nivel: number): number {
  if (def.durationAtLv10 === undefined) return def.durationMs;
  return Math.round(porNivel(nivel, def.durationMs, def.durationAtLv10));
}

/** Quantos golpes o lançamento dá (Fire Bolt, Chuva de Meteoros, Esfera). */
export function skillHits(def: SkillDef, nivel: number): number {
  if (!def.hits) return 1;
  if (def.hitsAtLv10 === undefined) return def.hits;
  return Math.max(1, Math.round(porNivel(nivel, def.hits, def.hitsAtLv10)));
}

/** Chance (0..1) de a condição pegar, antes das resistências do alvo. */
export function skillConditionChance(def: SkillDef, nivel: number): number {
  if (!def.applies) return 0;
  return porNivel(nivel, def.applies.chanceAtLv1, def.applies.chanceAtLv10);
}

/** Duração da condição aplicada, no nível informado. */
export function skillConditionDuration(def: SkillDef, nivel: number): number {
  if (!def.applies) return 0;
  return Math.round(porNivel(nivel, def.applies.durationAtLv1, def.applies.durationAtLv10));
}

/** Modificadores que a habilidade concede/impõe no nível informado. */
export function skillModifiers(def: SkillDef, nivel: number): Modifiers {
  const mods: Modifiers = {};
  for (const m of def.mods ?? []) {
    mods[m.key] = (mods[m.key] ?? 0) + porNivel(nivel, m.atLv1, m.atLv10);
  }
  return mods;
}

/** Duração da área persistente no chão. */
export function skillGroundDuration(def: SkillDef, nivel: number): number {
  if (!def.ground) return 0;
  return Math.round(porNivel(nivel, def.ground.durationAtLv1, def.ground.durationAtLv10));
}

/** Quantas instâncias simultâneas desta área o conjurador pode ter. */
export function skillGroundMax(def: SkillDef, nivel: number): number {
  if (!def.ground) return 0;
  const lv1 = def.ground.maxAtLv1 ?? 1;
  const lv10 = def.ground.maxAtLv10 ?? lv1;
  return Math.max(1, Math.round(porNivel(nivel, lv1, lv10)));
}

// ---------------------------------------------------------------------------
// Cura
// ---------------------------------------------------------------------------

/**
 * Pulsos da Regeneração. O doc pede *"~10 pulsos em ~20 s"*, então o intervalo
 * é a divisão: 2 s por pulso.
 */
export const HOT_PULSES = 10;

/** Intervalo entre pulsos de uma cura ao longo do tempo. */
export function hotTickMs(def: SkillDef, nivel: number): number {
  return Math.max(200, Math.round(skillDuration(def, nivel) / HOT_PULSES));
}

/**
 * Cura de UM pulso do HoT. O `power` da ficha é o valor de **cada pulso**, não
 * do total — o total é dez vezes isto.
 *
 * 🔴 **A eficiência de mana que o doc promete é verificável daqui**, e há teste
 * conferindo: no Lv.10 a Regeneração cura 10 × 1,86 = 18,6 de poder por 56 de
 * mana (0,33/mana), contra os 4,51 por 39 da Cura (0,116/mana). Quase 3× mais
 * eficiente — o preço é receber em 20 s em vez de na hora.
 */
export function hotPulsePower(def: SkillDef, nivel: number): number {
  return skillPower(def, nivel);
}

// ---------------------------------------------------------------------------
// Regras próprias de habilidades específicas
// ---------------------------------------------------------------------------

/**
 * 🪨 A partir de que nível as Raízes Prensoras podem PETRIFICAR.
 *
 * O doc diz apenas "níveis altos", sem número. Lv.7 é escolha nossa: é onde a
 * habilidade já custou 13 dos 28 pontos, o que faz da petrificação um prêmio
 * por investir, e não algo que todo Druida ganha de brinde no Lv.1.
 */
export const ROOTS_PETRIFY_FROM_LEVEL = 7;

/** Chance de a Raiz virar Petrificação, no nível informado. */
export function rootsPetrifyChance(nivel: number): number {
  if (nivel < ROOTS_PETRIFY_FROM_LEVEL) return 0;
  // Do Lv.7 ao Lv.10: 10 % → 25 %.
  const t = (nivel - ROOTS_PETRIFY_FROM_LEVEL) / (MAX_SKILL_LEVEL - ROOTS_PETRIFY_FROM_LEVEL);
  return 0.10 + t * 0.15;
}

/**
 * 🌿 Afinidade com a Natureza: bônus de dano no ramo Natureza e no veneno.
 * `DD-DRU-026` — **não** toca em cura.
 */
export function natureAffinityBonus(nivel: number): number {
  if (nivel <= 0) return 0;
  return porNivel(nivel, 0.02, 0.15);
}

/** A habilidade recebe o bônus da Afinidade? (ramo natureza OU dano de veneno) */
export function benefitsFromNatureAffinity(def: SkillDef): boolean {
  return def.branch === 'natureza' || def.damageType === 'poison';
}

/**
 * ✨ Maestria de Conjuração: quanto o tempo de conjuração encolhe (0..1).
 *
 * ⚠️ É o único redutor de tempo do jogo, e não fere a regra do GDD — a regra
 * proíbe o COOLDOWN cair com o nível, e cast é outro eixo. O teto de −30 %
 * existe para a Chuva de Meteoros nunca ficar abaixo de ~2 s: o contrajogo dela
 * é poder ser interrompida.
 */
export function castMasteryReduction(nivel: number): number {
  if (nivel <= 0) return 0;
  return porNivel(nivel, 0.05, 0.30);
}

/** Tempo de conjuração efetivo, já com a Maestria. */
export function skillCastMs(def: SkillDef, nivel: number, maestria: number): number {
  const base = def.castMs ?? 0;
  if (base <= 0) return 0;
  return Math.round(base * (1 - castMasteryReduction(maestria)));
}

/** ✨ Regeneração de Mana: quanto a regeneração sobe (0..1). */
export function manaRegenBonus(nivel: number): number {
  if (nivel <= 0) return 0;
  return porNivel(nivel, 0.08, 0.60);
}

/**
 * ✨ Proteção Mágica: que fatia do dano recebido sai da MANA em vez da vida.
 *
 * ⚠️ Teto em 50 % de propósito. Acima disso a habilidade deixaria de ser
 * "converte parte do dano" e viraria imortalidade enquanto houver mana — que é
 * exatamente o kite infinito que `70.49` manda evitar.
 */
export function magicProtectionShare(nivel: number): number {
  if (nivel <= 0) return 0;
  return porNivel(nivel, 0.15, 0.50);
}

/**
 * Quanta mana custa absorver 1 de dano com a Proteção Mágica.
 *
 * Acima de 1 para a troca doer: no Lv.10, 2 pontos de mana compram 1 de vida.
 * Um Feiticeiro com 180 de mana converte ~90 de dano — significativo, longe de
 * imortalidade.
 */
export const MAGIC_PROTECTION_MANA_PER_HP = 2;

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
