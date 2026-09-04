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
import type { Grip } from './grip.js';
import type { WeaponType } from './weapons.js';

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
  | 'arcane_circle'
  // 🗡️ Assassino — lâminas (adaga e katar)
  | 'double_attack'
  | 'sonic_blow'
  | 'envenom'
  | 'evasion'
  | 'hide'
  // 🗡️ Assassino — espada curta
  | 'cross_slash'
  | 'deep_cut'
  | 'blade_dance'
  | 'counter_attack'
  // 🗡️ Assassino — armas de arremesso
  | 'quick_throw'
  | 'shuriken_storm'
  | 'poison_kunai'
  | 'phantom_throw'
  | 'hidden_strike'
  // 🏹 Arqueiro
  | 'bow_mastery'
  | 'crossbow_mastery'
  | 'hunter_instinct'
  | 'double_shot'
  | 'precise_shot'
  | 'piercing_shot'
  | 'arrow_rain'
  | 'volley'
  | 'eagle_eye'
  | 'concentration'
  | 'hunting_trap'
  | 'explosive_trap';

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
  /**
   * Famílias de arma que a habilidade EXIGE. Ausente = serve com qualquer uma.
   *
   * 🔴 Entrou com o Arqueiro, e é exigência do doc: o Disparo Duplo é *"só
   * arco"* e o Tiro Preciso é *"só besta"*. É a primeira vez que uma habilidade
   * depende do que está na mão — o Bash do Knight muda de SABOR conforme a
   * arma, mas nunca é recusado.
   */
  requiresWeapon?: WeaponType[];
  /**
   * Teto de alvos numa habilidade de área. Ausente = sem teto.
   *
   * 🔴 A Chuva de Flechas é *"AoE, **até 10 alvos**"* — o doc dá o número, e
   * sem ele uma horda de trinta viraria dano irreal.
   */
  maxTargets?: number;
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

  // ==========================================================================
  // 🗡️ ASSASSINO — 14 habilidades (Doc 1, cap. 68)
  //
  // 🔴 **LEIA ISTO ANTES DE MUDAR QUALQUER NÚMERO DAQUI.** O capítulo do
  // Assassino é o MENOS fechado das cinco classes, e a diferença entre os três
  // ramos abaixo não é temática — é de CONFIANÇA:
  //
  // | Ramo | Estado no doc |
  // |---|---|
  // | 🗡️ Lâminas | **canônico** — o Ataque Duplo tem tabela exata, e as regras de adaga/katar são decisões numeradas |
  // | ⚔️ Espada Curta | ⚠️ `DD-ASS-015` **PROPOSTA** — os 4 nomes existem, os números não |
  // | 🎯 Arremesso | ⚠️ `DD-ASS-014` **PROPOSTA** — os 5 nomes existem, os números não |
  //
  // ⚠️ **A exceção de 2026-07-30 (`PROPOSTA` não bloqueia) vale só para os Docs
  // 3 e 4.** Estas são do Doc 1. Entraram a pedido do dono em 2026-09-03, e a
  // regra do projeto foi aplicada à risca: **estrutura sim, número inventado
  // marcado**. Todos os catorze NOMES são do documento — nenhum foi inventado,
  // com a única exceção anotada em `hide`.
  //
  // ⚠️ **`DD-ASS-011`: o alcance de arremesso é MENOR que o do Archer.** O
  // Assassino de shuriken é *"híbrido móvel (aproxima furtivo → ataca → recua →
  // arremessa), não um segundo Archer"*. Por isso nenhuma daqui passa de 4
  // tiles, contra os 5 do arco.
  //
  // ⚠️ **Munição ainda não existe como item.** O doc quer shuriken consumível
  // (~40) e proficiência reduzindo a perda. As habilidades de arremesso entram
  // custando MANA por enquanto, e é substituição provisória — quem implementar
  // munição troca aqui.
  // ==========================================================================

  // ---------------------------- 🗡️ LÂMINAS (5) ------------------------------
  /**
   * 🔴 **A MECÂNICA CENTRAL DA CLASSE, e a única coisa totalmente fechada.**
   * A tabela de chance é citação literal do cap. 68:
   *
   * | Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
   * | Chance | 35 % | 40 % | 45 % | 50 % | 55 % | 60 % | 65 % | 70 % | 75 % | **80 %** |
   *
   * É **passiva** e age no ataque BÁSICO — não tem tecla. Quanto o golpe extra
   * causa depende de como as mãos estão ocupadas, e as três regras são
   * decisões numeradas:
   *
   * - `DD-ASS-003` **Adaga + Escudo** → golpe extra de **100 %** ⇒ o proc rende
   *   200 % de um ataque normal. É a config **mais defensiva E mais
   *   consistente**, não a versão fraca.
   * - `DD-ASS-004/005` **Duas adagas TAMBÉM têm** (a regra antiga que
   *   desativava foi **revogada**), mas o extra de cada uma causa só **50 %**.
   *   Ganha volume, veneno e cartas dobradas; perde o escudo.
   * - `DD-ASS-006` **Katar NÃO usa Ataque Duplo** — é 2 mãos, sem escudo, e vai
   *   de crítico + burst + Sonic Blow.
   *
   * 🔴 `DD-ASS-007` **Anti-cascata: Ataque Duplo não gera outro Ataque Duplo.**
   * Sem isso a chance de 80 % viraria uma série geométrica e o Lv.10 daria
   * cinco golpes de vez em quando.
   *
   * Os multiplicadores vivem em `doubleAttackExtra`; a chance, em
   * `doubleAttackChance`. Quem aplica é o servidor, no ataque básico.
   */
  double_attack: {
    id: 'double_attack',
    name: 'Ataque Duplo',
    kind: 'passive',
    branch: 'laminas',
    classes: ['assassin'],
    reqLevel: 1,
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
    desc: 'Passiva: seus ataques podem golpear duas vezes. 80 % de chance no Lv.10.',
  },
  /**
   * 🔴 O doc nomeia esta habilidade e diz de quem ela é: o **Katar** *"é 2 mãos,
   * sem escudo, e vai de crítico + burst + **Sonic Blow**"*. É o troco por
   * abrir mão do Ataque Duplo.
   *
   * ⚠️ **Os números são REFERÊNCIA.** O doc dá o nome e o papel (burst), não a
   * potência, a contagem de golpes nem o cooldown.
   *
   * ⚠️ Não há trava de arma na ficha: quem tiver adaga também consegue lançar.
   * O doc separa katar de adaga pelo ESTILO, e trancar a habilidade exigiria um
   * campo de requisito de arma que nenhuma outra classe usa hoje.
   */
  sonic_blow: {
    id: 'sonic_blow',
    name: 'Sonic Blow',
    kind: 'multihit',
    branch: 'laminas',
    classes: ['assassin'],
    reqLevel: 12,
    manaCost: 20,
    manaPerLevel: 3,
    // ⚠️ REFERÊNCIA: 8 s. É a explosão da classe — cabe uma vez por luta curta,
    // não na rotação.
    cooldownMs: 8000,
    // ⚠️ REFERÊNCIA: 8 golpes fracos no Lv.10 = 4,0 de poder total. Fica abaixo
    // das supremas mágicas (Chuva 10,4) e acima do que o Knight faz num golpe,
    // que é o lugar certo para o burst de alvo único de uma classe física.
    power: 0.28,
    powerPerLevel: 0.024,
    shape: 'target',
    range: 1,
    rangeEvery: 0,
    durationMs: 0,
    hits: 4,
    hitsAtLv10: 8,
    fx: 'sonic_blow',
    desc: 'Rajada de golpes num alvo. O burst do katar. ⚠️ Números provisórios.',
  },
  /**
   * 🔴 **Veneno é um dos três pilares de identidade da classe** — o índice do
   * GDD resume o Assassino como *"explosão + furtividade + veneno"*, e o cap. 68
   * diz que a build de duas adagas *"ganha volume, **veneno**, on-hit e cartas
   * dobradas"*.
   *
   * ⚠️ **Números REFERÊNCIA.** O pilar é do doc; a duração, a chance e a
   * parcela não.
   *
   * Implementada como buff em si mesmo que passa a envenenar no ataque BÁSICO
   * — é o que "on-hit" quer dizer. Quem aplica é o servidor.
   */
  envenom: {
    id: 'envenom',
    name: 'Envenenar Arma',
    kind: 'buff',
    branch: 'laminas',
    classes: ['assassin'],
    reqLevel: 6,
    manaCost: 18,
    manaPerLevel: 2,
    cooldownMs: 3000,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    // ⚠️ REFERÊNCIA: 60 s no Lv.1 → 180 s no Lv.10. Longo porque é preparação,
    // não reação — envenena-se a lâmina antes de entrar, não no meio da briga.
    durationMs: 60000,
    durationAtLv10: 180000,
    fx: 'envenom',
    desc: 'Unta a lâmina: seus golpes passam a envenenar. ⚠️ Números provisórios.',
  },
  /**
   * 🔴 **O único número deste ramo que o doc AMARRA sem dar o valor.** O cap. 69
   * diz que o Instinto do Caçador do Archer (+2/+6/**+10 %**) é
   * *"deliberadamente **mais fraca** que a Evasão do Assassin"*.
   *
   * Ou seja: o valor exato é REFERÊNCIA, mas o **piso não é** — no Lv.10 tem de
   * passar de 10 %, senão a frase do doc deixa de ser verdade. Há teste
   * travando exatamente isso, e é ele que protege a comparação entre as duas
   * classes se alguém rebalancear uma sem olhar a outra.
   */
  evasion: {
    id: 'evasion',
    name: 'Evasão',
    kind: 'passive',
    branch: 'laminas',
    classes: ['assassin'],
    reqLevel: 10,
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    // ⚠️ REFERÊNCIA no valor; o piso de "> 10 % no Lv.10" é do doc.
    mods: [{ key: 'dodgeChance', atLv1: 0.04, atLv10: 0.18 }],
    fx: 'passive',
    desc: 'Passiva: esquiva. Mais forte que o Instinto do Caçador do Arqueiro.',
  },
  /**
   * 🔴 **Furtividade é pilar de identidade** (*"explosão + furtividade +
   * veneno"*), e o doc a trata como mecânica existente em dois lugares: o
   * Assassino de shuriken *"aproxima **furtivo** → ataca → recua → arremessa"*,
   * e a Chama de Revelação do Feiticeiro existe para *"detectar Assassin
   * **furtivo**"*. Ou seja: o counter já está escrito, e é o counter de algo.
   *
   * ⚠️⚠️ **O NOME "Ocultar" É INVENÇÃO NOSSA.** É a única das catorze cujo nome
   * não sai do documento — ele fala em "furtividade" como conceito e nunca
   * nomeia a habilidade. É a primeira a mudar quando o texto aparecer, como o
   * "Sopro Vital" do Druida.
   *
   * ⚠️ Números REFERÊNCIA. E a regra que o servidor aplica — **atacar quebra a
   * furtividade** — é decisão nossa: sem ela, o Assassino atacaria para sempre
   * de dentro da invisibilidade, e a Chama de Revelação nunca teria o que
   * revelar.
   */
  hide: {
    id: 'hide',
    name: 'Ocultar',
    kind: 'buff',
    branch: 'laminas',
    classes: ['assassin'],
    reqLevel: 15,
    manaCost: 25,
    manaPerLevel: 3,
    cooldownMs: 12000,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    // ⚠️ REFERÊNCIA: 6 s → 15 s. É janela de aproximação, não modo de jogo.
    durationMs: 6000,
    durationAtLv10: 15000,
    fx: 'hide',
    desc: 'Some de vista: monstro perde o interesse. Atacar quebra. ⚠️ Provisório.',
  },

  // -------------------------- ⚔️ ESPADA CURTA (4) ---------------------------
  //
  // ⚠️ **RAMO INTEIRO EM `PROPOSTA` (`DD-ASS-015`).** Os quatro nomes são do
  // doc; **nenhum número é**. Entrou a estrutura, com valores derivados do papel
  // que cada nome descreve.
  //
  // O doc dá a identidade da família, e ela guiou os números: *"Espada Curta ≠
  // adaga com outro sprite: **mais dano base, menos velocidade, menos crítico,
  // mais duelo**"*. Daí as quatro serem mais lentas e mais pesadas por golpe
  // que o Sonic Blow, e uma delas ser um contra-ataque de duelo.

  cross_slash: {
    id: 'cross_slash',
    name: 'Corte Cruzado',
    kind: 'damage',
    branch: 'espada',
    classes: ['assassin'],
    reqLevel: 4,
    manaCost: 10,
    manaPerLevel: 2,
    cooldownMs: 3000,
    // ⚠️ REFERÊNCIA. O básico do ramo: alvo único, honesto, sem truque.
    power: 1.25,
    powerPerLevel: 0.11,
    shape: 'target',
    range: 1,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'cross_slash',
    desc: 'Dois cortes em X num alvo. ⚠️ PROPOSTA no doc — números provisórios.',
  },
  deep_cut: {
    id: 'deep_cut',
    name: 'Corte Profundo',
    kind: 'damage',
    branch: 'espada',
    classes: ['assassin'],
    reqLevel: 14,
    requires: [{ skill: 'cross_slash', level: 3 }],
    manaCost: 16,
    manaPerLevel: 2,
    cooldownMs: 6000,
    // ⚠️ REFERÊNCIA. "Profundo" pede sangramento — a única leitura do nome que
    // não é chute puro.
    power: 1.5,
    powerPerLevel: 0.14,
    shape: 'target',
    range: 1,
    rangeEvery: 0,
    durationMs: 0,
    applies: {
      id: 'bleed',
      chanceAtLv1: 0.35,
      chanceAtLv10: 0.85,
      durationAtLv1: 6000,
      durationAtLv10: 8000,
      power: 5,
    },
    fx: 'deep_cut',
    desc: 'Corte que abre o alvo e faz sangrar. ⚠️ PROPOSTA no doc.',
  },
  blade_dance: {
    id: 'blade_dance',
    name: 'Dança das Lâminas',
    kind: 'damage',
    branch: 'espada',
    classes: ['assassin'],
    reqLevel: 18,
    requires: [{ skill: 'cross_slash', level: 5 }],
    manaCost: 28,
    manaPerLevel: 4,
    cooldownMs: 7000,
    // ⚠️ REFERÊNCIA. "Dança" é a única do ramo em área — girar entre vários é o
    // que o nome descreve.
    power: 0.8,
    powerPerLevel: 0.07,
    shape: 'area',
    range: 1,
    rangeEvery: 5,
    durationMs: 0,
    fx: 'blade_dance',
    desc: 'Gira entre os inimigos ao redor. ⚠️ PROPOSTA no doc.',
  },
  /**
   * ⚠️ `PROPOSTA`. E é a que mais depende de mecânica nova: contra-atacar exige
   * o servidor saber devolver golpe quando o jogador APANHA — nada no jogo
   * fazia isso.
   *
   * Entrou como buff de janela: enquanto dura, todo golpe recebido devolve uma
   * fração. É a leitura de "Contra-ataque" que cabe na arquitetura sem inventar
   * um sistema de parry inteiro.
   */
  counter_attack: {
    id: 'counter_attack',
    name: 'Contra-ataque',
    kind: 'buff',
    branch: 'espada',
    classes: ['assassin'],
    reqLevel: 22,
    requires: [{ skill: 'deep_cut', level: 3 }],
    manaCost: 24,
    manaPerLevel: 3,
    cooldownMs: 15000,
    // ⚠️ REFERÊNCIA: devolve 40 % → 100 % do seu ataque por golpe recebido.
    power: 0.4,
    powerPerLevel: 0.067,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    // ⚠️ REFERÊNCIA: 5 s → 10 s. Curta: é reação a uma investida, não postura.
    durationMs: 5000,
    durationAtLv10: 10000,
    fx: 'counter_attack',
    desc: 'Por alguns segundos, quem te bate leva de volta. ⚠️ PROPOSTA no doc.',
  },

  // --------------------------- 🎯 ARREMESSO (5) -----------------------------
  //
  // ⚠️ **RAMO INTEIRO EM `PROPOSTA` (`DD-ASS-014`).** Cinco nomes do doc, zero
  // números do doc.
  //
  // 🔴 O que NÃO é proposta e amarra o ramo: `DD-ASS-011` **o alcance é menor
  // que o do Archer**, porque o Assassino de shuriken é *"híbrido móvel"* e
  // *"não um segundo Archer"*. Nenhuma daqui passa de 4 tiles; o arco tem 5.
  // Há teste travando isso.

  quick_throw: {
    id: 'quick_throw',
    name: 'Lançamento Rápido',
    kind: 'damage',
    branch: 'arremesso',
    classes: ['assassin'],
    reqLevel: 8,
    manaCost: 8,
    manaPerLevel: 1,
    // ⚠️ REFERÊNCIA. "Rápido" é a ficha inteira: recarga curta, dano modesto.
    cooldownMs: 1500,
    power: 0.9,
    powerPerLevel: 0.08,
    shape: 'target',
    range: 4,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'quick_throw',
    desc: 'Arremesso rápido à distância curta. ⚠️ PROPOSTA no doc.',
  },
  shuriken_storm: {
    id: 'shuriken_storm',
    name: 'Tempestade de Shurikens',
    kind: 'multihit',
    branch: 'arremesso',
    classes: ['assassin'],
    reqLevel: 20,
    requires: [{ skill: 'quick_throw', level: 5 }],
    manaCost: 35,
    manaPerLevel: 5,
    cooldownMs: 9000,
    // ⚠️ REFERÊNCIA. "Tempestade" = muitos projéteis numa área.
    power: 0.35,
    powerPerLevel: 0.03,
    shape: 'area',
    range: 3,
    rangeEvery: 6,
    durationMs: 0,
    hits: 4,
    hitsAtLv10: 9,
    fx: 'shuriken_storm',
    desc: 'Chuva de shurikens na área. ⚠️ PROPOSTA no doc.',
  },
  poison_kunai: {
    id: 'poison_kunai',
    name: 'Kunai Envenenada',
    kind: 'damage',
    branch: 'arremesso',
    classes: ['assassin'],
    reqLevel: 16,
    requires: [{ skill: 'quick_throw', level: 3 }],
    manaCost: 18,
    manaPerLevel: 2,
    cooldownMs: 6000,
    // ⚠️ REFERÊNCIA nos números; o veneno é o que o NOME garante.
    power: 1.0,
    powerPerLevel: 0.09,
    shape: 'target',
    range: 4,
    rangeEvery: 0,
    durationMs: 0,
    damageType: 'poison',
    applies: {
      id: 'poison',
      chanceAtLv1: 0.45,
      chanceAtLv10: 0.95,
      durationAtLv1: 8000,
      durationAtLv10: 12000,
      power: 5,
    },
    fx: 'poison_kunai',
    desc: 'Kunai que envenena quase sempre. ⚠️ PROPOSTA no doc.',
  },
  phantom_throw: {
    id: 'phantom_throw',
    name: 'Lançamento Fantasma',
    kind: 'damage',
    branch: 'arremesso',
    classes: ['assassin'],
    reqLevel: 26,
    requires: [{ skill: 'shuriken_storm', level: 3 }],
    manaCost: 30,
    manaPerLevel: 4,
    cooldownMs: 10000,
    // ⚠️ REFERÊNCIA. "Fantasma" lido como golpe que ignora a armadura: o dano é
    // SOMBRIO, então bate contra a resistência mágica em vez da defesa física.
    power: 1.6,
    powerPerLevel: 0.16,
    shape: 'target',
    range: 4,
    rangeEvery: 0,
    durationMs: 0,
    /**
     * 🔴 **`magic` fica FALSO de propósito, e a distinção custou um teste.**
     *
     * `magic: true` mandaria o poder sair de `magicAtk` — e o Assassino tem
     * INT 3. A habilidade nasceria inútil, com cara de implementada.
     *
     * O que "fantasma" pede é outra coisa: sair da FORÇA do assassino e bater
     * contra a defesa MÁGICA do alvo. Isso é `damageType`, não `magic`. Os dois
     * campos respondem perguntas diferentes, e esta é a habilidade que provou.
     */
    damageType: 'dark',
    fx: 'phantom_throw',
    desc: 'Arremesso sombrio que passa pela armadura. ⚠️ PROPOSTA no doc.',
  },
  /**
   * ⚠️ `PROPOSTA`, e é a que amarra os dois ramos: o doc a lista entre as de
   * arremesso, mas o nome descreve o combo que ele mesmo escreve para a classe
   * — *"aproxima **furtivo** → ataca → recua → arremessa"*.
   *
   * Implementada como o pagamento por ter usado `hide`: **dano muito maior
   * quando lançada de dentro da furtividade**. Sem isso, "Ataque Oculto" seria
   * só mais um golpe com nome bonito.
   */
  hidden_strike: {
    id: 'hidden_strike',
    name: 'Ataque Oculto',
    kind: 'damage',
    branch: 'arremesso',
    classes: ['assassin'],
    reqLevel: 30,
    requires: [{ skill: 'hide', level: 3 }],
    manaCost: 26,
    manaPerLevel: 3,
    cooldownMs: 12000,
    // ⚠️ REFERÊNCIA. O número que importa é o bônus de furtividade, em
    // `HIDDEN_STRIKE_BONUS`.
    power: 1.4,
    powerPerLevel: 0.15,
    shape: 'target',
    range: 4,
    rangeEvery: 0,
    durationMs: 0,
    fx: 'hidden_strike',
    desc: 'Muito mais forte se lançado de dentro da furtividade. ⚠️ PROPOSTA no doc.',
  },

  // ==========================================================================
  // 🏹 ARQUEIRO — as 12 habilidades da V1 (Doc 1, cap. 69)
  //
  // ✅ **É a classe mais bem especificada das cinco.** Ao contrário do
  // Assassino, quase toda skill daqui vem com número no documento: cooldowns,
  // percentuais por nível, teto de alvos, contagem de armadilhas. Onde há
  // `⚠️ REFERÊNCIA` abaixo, é exceção — não a regra.
  //
  // 🔴 **As quatro regras que definem a classe, e todas são proibições:**
  //
  // | | |
  // |---|---|
  // | `DD-ARC-015` | **Sem dash, sem backstep, sem teleporte.** A sobrevivência é alcance → armadilha → Concentração → correr |
  // | `DD-ARC-013` | **Estar mais longe NÃO aumenta o dano.** A vantagem de estar longe é estar longe |
  // | `DD-ARC-019` | **Munição elemental é ITEM, não skill.** Nada de "Flecha de Fogo" nesta árvore |
  // | `DD-ARC-009` | O Disparo Perfurante **não atravessa inimigos** |
  //
  // ⚠️ **Propostas NÃO fechadas, e por isso ausentes:** Disparo Pesado, Flecha
  // Explosiva, Arremesso Preciso, Arremesso Rápido. E o doc avisa: **Flecha
  // Explosiva ≠ Armadilha Explosiva — não fundir.** A que está aqui é a
  // ARMADILHA.
  //
  // ⚠️ **A Azagaia não virou habilidade**, e não devia: o doc a trata como
  // configuração de ARMA (lança curta de arremesso que usa escudo, consumível),
  // e `DD-ARC-029` amarra a perda dela ao Distance. É item e munição — os dois
  // ainda não existem.
  // ==========================================================================

  // ------------------------- 🏹 Maestrias e passivas ------------------------
  bow_mastery: {
    id: 'bow_mastery',
    name: 'Maestria com Arco',
    kind: 'passive',
    branch: 'maestria',
    classes: ['archer'],
    reqLevel: 1,
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    // ⚠️ REFERÊNCIA no valor: o doc nomeia as duas maestrias e não dá número.
    // A estrutura é o que importa — elas são o que separa a build de arco da
    // build de besta, e o Arqueiro não tem pontos para maximizar as duas.
    mods: [{ key: 'physAtk', atLv1: 0.03, atLv10: 0.18 }],
    fx: 'passive',
    desc: 'Passiva: mais dano com ARCO. ⚠️ Valor provisório.',
  },
  crossbow_mastery: {
    id: 'crossbow_mastery',
    name: 'Maestria com Besta',
    kind: 'passive',
    branch: 'maestria',
    classes: ['archer'],
    reqLevel: 1,
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    // Espelha a de arco de propósito: a escolha entre as duas é de BUILD, não
    // de poder. Dar vantagem numérica a uma delas resolveria a decisão que o
    // doc quer que o jogador tome.
    mods: [{ key: 'physAtk', atLv1: 0.03, atLv10: 0.18 }],
    fx: 'passive',
    desc: 'Passiva: mais dano com BESTA. ⚠️ Valor provisório.',
  },
  /**
   * 🔴 "Esquiva **+2/+6/+10 %**, deliberadamente **mais fraca que a Evasão do
   * Assassin**" — citação, e as duas metades importam.
   *
   * Os três degraus do doc (+2 no Lv.1, +6 no meio, +10 no Lv.10) saem da
   * interpolação: `porNivel(1)` dá 2 %, `porNivel(10)` dá 10 %, e o meio cai em
   * ~6 %. Não precisou de tabela.
   *
   * ⚠️ **O "mais fraca que a Evasão" tem teste**, e o teste mora no arquivo do
   * ASSASSINO — é lá que a comparação pode quebrar quando alguém rebalancear a
   * classe dele sem olhar esta.
   */
  hunter_instinct: {
    id: 'hunter_instinct',
    name: 'Instinto do Caçador',
    kind: 'passive',
    branch: 'maestria',
    classes: ['archer'],
    reqLevel: 10,
    manaCost: 0,
    manaPerLevel: 0,
    cooldownMs: 0,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 0,
    mods: [{ key: 'dodgeChance', atLv1: 0.02, atLv10: 0.10 }],
    fx: 'passive',
    desc: 'Passiva: esquiva +2 % a +10 %. Mais modesta que a do Assassino, de propósito.',
  },

  // ----------------------------- 🎯 Disparos (5) ----------------------------
  /**
   * 🔴 Tudo citação: **só arco**, **CD 1,5 s**, **2 projéteis independentes**,
   * **2 × 60 % → 2 × 90 %**.
   *
   * "Independentes" é o detalhe que muda a sensação: são dois golpes separados,
   * cada um com o próprio sorteio de crítico — não um golpe de 120 %. Como
   * `multihit` já resolve golpe a golpe, sai de graça.
   */
  double_shot: {
    id: 'double_shot',
    name: 'Disparo Duplo',
    kind: 'multihit',
    branch: 'disparo',
    classes: ['archer'],
    reqLevel: 3,
    manaCost: 8,
    manaPerLevel: 1,
    cooldownMs: 1500,
    // 60 % → 90 % por projétil.
    power: 0.6,
    powerPerLevel: 0.0333,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 0,
    hits: 2,
    requiresWeapon: ['bow'],
    fx: 'double_shot',
    desc: 'Dois projéteis independentes. Só com ARCO.',
  },
  /**
   * 🔴 "Só besta, **~0,7 s de preparação**" — citação. A preparação É a
   * habilidade: a besta troca cadência por impacto, e o `castMs` é o que faz
   * isso ser sentido em vez de lido no tooltip.
   *
   * ⚠️ REFERÊNCIA no dano. O doc dá a arma e o tempo, não a potência.
   */
  precise_shot: {
    id: 'precise_shot',
    name: 'Tiro Preciso',
    kind: 'damage',
    branch: 'disparo',
    classes: ['archer'],
    reqLevel: 3,
    manaCost: 10,
    manaPerLevel: 2,
    cooldownMs: 2500,
    power: 1.8,
    powerPerLevel: 0.18,
    shape: 'target',
    range: 6,
    rangeEvery: 0,
    durationMs: 0,
    castMs: 700,
    requiresWeapon: ['crossbow'],
    fx: 'precise_shot',
    desc: 'Mira e dispara forte. Só com BESTA — 0,7 s de preparação.',
  },
  /**
   * 🔴 Citação em três números: **CD 6 s**, reduz DEF **−5/−10/−15 %**, e
   * **10/20/30 % de sangramento**.
   *
   * 🔴 `DD-ARC-009` **NÃO atravessa inimigos**, e a decisão está no `shape`:
   * `'target'`, não uma linha. O nome sugere perfuração em fila e o doc corrige
   * explicitamente — é o tipo de coisa que alguém "conserta" de boa-fé daqui a
   * seis meses, então está dito aqui e tem teste.
   */
  piercing_shot: {
    id: 'piercing_shot',
    name: 'Disparo Perfurante',
    kind: 'debuff',
    branch: 'disparo',
    classes: ['archer'],
    reqLevel: 12,
    manaCost: 14,
    manaPerLevel: 2,
    cooldownMs: 6000,
    // ⚠️ REFERÊNCIA no dano — o doc dá o debuff e o sangramento, não a potência.
    power: 1.3,
    powerPerLevel: 0.12,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 8000,
    mods: [{ key: 'defense', atLv1: -0.05, atLv10: -0.15 }],
    applies: {
      id: 'bleed',
      chanceAtLv1: 0.10,
      chanceAtLv10: 0.30,
      durationAtLv1: 6000,
      durationAtLv10: 8000,
      power: 4,
    },
    fx: 'piercing_shot',
    desc: 'Fura a defesa do alvo e pode fazer sangrar. NÃO atravessa inimigos.',
  },
  /**
   * 🔴 "AoE, **até 10 alvos**" — o teto é citação, e mora em `maxTargets`.
   *
   * ⚠️ REFERÊNCIA no dano e no raio.
   */
  arrow_rain: {
    id: 'arrow_rain',
    name: 'Chuva de Flechas',
    kind: 'damage',
    branch: 'disparo',
    classes: ['archer'],
    reqLevel: 16,
    requires: [{ skill: 'double_shot', level: 3 }],
    manaCost: 26,
    manaPerLevel: 4,
    cooldownMs: 7000,
    power: 0.75,
    powerPerLevel: 0.07,
    shape: 'area',
    range: 3,
    rangeEvery: 5,
    durationMs: 0,
    castMs: 800,
    maxTargets: 10,
    fx: 'arrow_rain',
    desc: 'Chove flechas na área. Até 10 alvos.',
  },
  /**
   * 🔴 "**5–8 disparos**" — citação, e vira `hits: 5 → hitsAtLv10: 8`.
   *
   * ⚠️ REFERÊNCIA no dano por disparo. É o burst de alvo único da classe: mais
   * total que o Disparo Duplo, e com cooldown para não virar a rotação.
   */
  volley: {
    id: 'volley',
    name: 'Saraivada',
    kind: 'multihit',
    branch: 'disparo',
    classes: ['archer'],
    reqLevel: 24,
    requires: [{ skill: 'double_shot', level: 5 }],
    manaCost: 30,
    manaPerLevel: 4,
    cooldownMs: 9000,
    power: 0.45,
    powerPerLevel: 0.04,
    shape: 'target',
    range: 5,
    rangeEvery: 0,
    durationMs: 0,
    hits: 5,
    hitsAtLv10: 8,
    fx: 'volley',
    desc: 'Cinco a oito disparos no mesmo alvo.',
  },

  // ------------------------- 👁️ Posturas de mira (2) ------------------------
  /**
   * 🔴 "+15 % precisão, **+20 % alcance**; **não dá dano**" — citação inteira,
   * inclusive a última parte, que é o ponto da habilidade.
   *
   * 🔴 **O +20 % de alcance é a única coisa no jogo que estica o alcance do
   * ataque básico.** E é a resposta do Arqueiro ao `DD-ARC-015` (sem dash, sem
   * backstep): ele não foge para longe, ele passa a alcançar de onde já está.
   */
  eagle_eye: {
    id: 'eagle_eye',
    name: 'Olho de Águia',
    kind: 'buff',
    branch: 'mira',
    classes: ['archer'],
    reqLevel: 8,
    manaCost: 16,
    manaPerLevel: 2,
    cooldownMs: 20000,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    // ⚠️ REFERÊNCIA na duração; os dois percentuais são do doc.
    durationMs: 20000,
    durationAtLv10: 45000,
    mods: [
      { key: 'accuracy', atLv1: 0.04, atLv10: 0.15 },
      { key: 'attackRange', atLv1: 0.05, atLv10: 0.20 },
    ],
    fx: 'eagle_eye',
    desc: 'Enxerga mais longe: +15 % de precisão e +20 % de alcance. Não causa dano.',
  },
  /**
   * 🔴 "+15 % precisão, +10 % ASPD, **+10 % movimento**" — citação.
   *
   * O movimento é o que a põe na lista de sobrevivência do `DD-ARC-015`
   * (*"alcance → armadilha → **Concentração** → corrida"*): sem dash, correr
   * mais rápido é o reposicionamento que ele tem.
   */
  concentration: {
    id: 'concentration',
    name: 'Concentração',
    kind: 'buff',
    branch: 'mira',
    classes: ['archer'],
    reqLevel: 14,
    requires: [{ skill: 'eagle_eye', level: 3 }],
    manaCost: 22,
    manaPerLevel: 3,
    cooldownMs: 25000,
    power: 0,
    powerPerLevel: 0,
    shape: 'self',
    range: 0,
    rangeEvery: 0,
    durationMs: 15000,
    durationAtLv10: 35000,
    mods: [
      { key: 'accuracy', atLv1: 0.04, atLv10: 0.15 },
      { key: 'attackSpeed', atLv1: 0.03, atLv10: 0.10 },
      { key: 'moveSpeed', atLv1: 0.03, atLv10: 0.10 },
    ],
    fx: 'concentration',
    desc: 'Precisão, cadência e movimento. É a fuga do Arqueiro, que não tem dash.',
  },

  // --------------------------- 🪤 Armadilhas (2) ----------------------------
  //
  // 🔴 **As armadilhas são o sistema novo desta classe.** Ficam ARMADAS no
  // chão, não pulsam, e disparam quando um inimigo pisa. E são **ocultas ao
  // inimigo, visíveis à party** — o filtro é do servidor, porque esconder no
  // cliente deixaria a posição trafegando na rede.

  /**
   * 🔴 "**1→2→3 traps**; a 4ª apaga a mais antiga; **ocultas** ao inimigo,
   * visíveis à party" — citação inteira. O descarte da mais antiga reusa o
   * mesmo `dropOldestOf` que a Muralha de Gelo já usava.
   *
   * ⚠️ REFERÊNCIA no efeito: o doc não diz o que a Armadilha de Caça FAZ além
   * de existir. Prender é a leitura do nome — armadilha de caça segura a presa
   * —, e dá à classe o controle que `DD-ARC-015` lhe nega em mobilidade.
   */
  hunting_trap: {
    id: 'hunting_trap',
    name: 'Armadilha de Caça',
    kind: 'ground',
    branch: 'armadilha',
    classes: ['archer'],
    reqLevel: 6,
    manaCost: 18,
    manaPerLevel: 2,
    cooldownMs: 8000,
    power: 0,
    powerPerLevel: 0,
    shape: 'ground',
    range: 0,
    rangeEvery: 0,
    durationMs: 60000,
    ground: {
      kind: 'trap',
      // Armadilha não pulsa; o tique é só a cadência com que o servidor
      // pergunta "alguém pisou?".
      tickMs: 200,
      durationAtLv1: 60000,
      durationAtLv10: 120000,
      hitsPlayers: true,
      hitsCreatures: true,
      maxAtLv1: 1,
      maxAtLv10: 3,
    },
    applies: {
      id: 'root',
      chanceAtLv1: 1,
      chanceAtLv10: 1,
      durationAtLv1: 3000,
      durationAtLv10: 8000,
    },
    fx: 'hunting_trap',
    desc: 'Arma uma trapa que PRENDE quem pisar. Até 3 no Lv.10, ocultas ao inimigo.',
  },
  /**
   * 🔴 "Dano em raio + **10/20/30 % de Queimadura**" — citação. E
   * `DD-ARC-017` **SEM SLOW**: a explosão queima e não atrasa. Está aqui pela
   * ausência de um segundo `applies`, e tem teste — "explosão que também
   * atrasa" é a adição óbvia que o doc proíbe.
   */
  explosive_trap: {
    id: 'explosive_trap',
    name: 'Armadilha Explosiva',
    kind: 'ground',
    branch: 'armadilha',
    classes: ['archer'],
    reqLevel: 20,
    requires: [{ skill: 'hunting_trap', level: 5 }],
    manaCost: 28,
    manaPerLevel: 4,
    cooldownMs: 12000,
    // ⚠️ REFERÊNCIA no dano; a queimadura é do doc.
    power: 1.6,
    powerPerLevel: 0.16,
    shape: 'ground',
    range: 1,
    rangeEvery: 6,
    durationMs: 45000,
    damageType: 'fire',
    ground: {
      kind: 'trap',
      tickMs: 200,
      durationAtLv1: 45000,
      durationAtLv10: 90000,
      hitsPlayers: true,
      hitsCreatures: true,
      maxAtLv1: 1,
      maxAtLv10: 3,
    },
    applies: {
      id: 'burn',
      chanceAtLv1: 0.10,
      chanceAtLv10: 0.30,
      durationAtLv1: 5000,
      durationAtLv10: 6000,
      power: 5,
    },
    fx: 'explosive_trap',
    desc: 'Trapa que explode em raio e queima. NÃO deixa lento (DD-ARC-017).',
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
  // 🗡️ Assassino (14)
  'double_attack', 'sonic_blow', 'envenom', 'evasion', 'hide',
  'cross_slash', 'deep_cut', 'blade_dance', 'counter_attack',
  'quick_throw', 'shuriken_storm', 'poison_kunai', 'phantom_throw',
  'hidden_strike',
  // 🏹 Arqueiro (12)
  'bow_mastery', 'crossbow_mastery', 'hunter_instinct',
  'double_shot', 'precise_shot', 'piercing_shot', 'arrow_rain', 'volley',
  'eagle_eye', 'concentration',
  'hunting_trap', 'explosive_trap',
];

/** Quantos slots a barra de atalhos tem: F1..F8. */
/**
 * Slots da barra de atalhos: **duas fileiras de doze**.
 *
 * 🔴 Eram oito, e oito era o número da época em que só o Knight tinha
 * habilidades. Não fecha mais: o Druida tem **21 conjuráveis** (23 menos as
 * duas passivas) e o Feiticeiro **15**. Pedir ao jogador que escolha 8 de 21
 * para ter à mão é escondê-lo do próprio personagem.
 *
 * ⚠️ **Por que 12 + 12 e não 16 ou 20.** A fileira tem de casar com uma linha
 * de teclas de verdade, senão metade dos slots vira só botão de mouse. O
 * teclado dá F1–F12; a segunda fileira é **Shift+F1–F12**. Vinte e quatro cobre
 * as 21 do Druida com folga e não inventa tecla que não existe.
 */
export const SKILL_BAR_ROWS = 2;
export const SKILL_BAR_COLS = 12;
export const SKILL_BAR_SLOTS = SKILL_BAR_ROWS * SKILL_BAR_COLS;

/** Monta uma barra do tamanho certo a partir das habilidades informadas. */
function barra(ids: (SkillId | null)[]): (SkillId | null)[] {
  const out = ids.slice(0, SKILL_BAR_SLOTS);
  while (out.length < SKILL_BAR_SLOTS) out.push(null);
  return out;
}

/**
 * Barra de atalhos PADRÃO de cada classe: índice 0 = F1 … 11 = F12, 12 =
 * Shift+F1 … 23 = Shift+F12.
 *
 * 🔴 **O padrão agora traz TUDO que se conjura**, na ordem da árvore. Antes
 * eram oito escolhidas a dedo, e o resto o jogador tinha que descobrir na
 * janela. Com 24 slots não há motivo para esconder nada: quem quiser uma barra
 * enxuta arrasta o que não usa para fora.
 *
 * ⚠️ **As passivas ficam de fora, e continuam fora.** Não se aperta tecla para
 * uma passiva — o slot dela seria um botão que responde "já está ativa".
 *
 * ⚠️ Isto é só o ponto de partida. O jogador arrasta da janela de habilidades
 * para qualquer slot, e a arrumação dele é guardada por personagem (no
 * cliente). Ver `skillBarFor`.
 */
export const SKILL_BARS: Record<PlayerClass, (SkillId | null)[]> = {
  knight: barra([
    'power_strike', 'bash', 'charge', 'rupture',
    'execution', 'taunt', 'defensive_stance', 'battle_fury',
  ]),
  // A ordem conta a rotação: as duas curas, os debuffs que se usa sempre, o
  // dano básico, o controle, e as grandes no fim da primeira fileira.
  druid: barra([
    'heal', 'regeneration', 'emergency_heal', 'area_heal',
    'weaken', 'vulnerability', 'curse_slowness', 'curse_weakness',
    'earth_spike', 'binding_roots', 'wind_blades', 'nature_wrath',
    // Segunda fileira (Shift+F1…): o que se usa por decisão, não por rotação.
    'sanctuary', 'blessing_agility', 'oak_skin', 'spirit_blessing',
    'nature_strength', 'nature_blessing', 'silence', 'nature_plague',
    'poison_spores',
  ]),
  sorcerer: barra([
    'fire_bolt', 'cold_bolt', 'lightning_ball', 'electric_discharge',
    'meteor', 'glacial_burst', 'fire_wall', 'ice_wall',
    'arcane_circle', 'meteor_storm', 'blizzard', 'thor_wrath',
    // Segunda fileira: as utilitárias arcanas.
    'magic_amplify', 'magic_protection', 'revealing_flame',
  ]),
  // 🏹 As nove conjuráveis do Arqueiro (as três passivas ficam na árvore).
  archer: barra([
    'double_shot', 'precise_shot', 'piercing_shot', 'volley',
    'arrow_rain', 'eagle_eye', 'concentration', 'hunting_trap',
    'explosive_trap',
  ]),
  assassin: barra([
    'sonic_blow', 'cross_slash', 'deep_cut', 'blade_dance',
    'counter_attack', 'envenom', 'hide', 'hidden_strike',
    'quick_throw', 'shuriken_storm', 'poison_kunai', 'phantom_throw',
  ]),
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

// ---------------------------------------------------------------------------
// 🗡️ Assassino
// ---------------------------------------------------------------------------

/**
 * 🔴 **A tabela do Ataque Duplo, citação literal do cap. 68.**
 *
 * | Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
 * | Chance | 35 % | 40 % | 45 % | 50 % | 55 % | 60 % | 65 % | 70 % | 75 % | 80 % |
 *
 * ⚠️ Escrita como TABELA e não como fórmula de propósito. `0,35 + 0,05 × (n−1)`
 * dá exatamente os mesmos dez valores, mas quando o balanceamento mudar um
 * degrau — e o doc já mudou o do congelamento uma vez — a tabela aceita a
 * mudança e a fórmula obriga a reescrever a regra.
 */
export const DOUBLE_ATTACK_CHANCE: readonly number[] = [
  0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80,
];

/** Chance de o Ataque Duplo disparar no nível informado. 0 = não aprendido. */
export function doubleAttackChance(nivel: number): number {
  if (nivel <= 0) return 0;
  return DOUBLE_ATTACK_CHANCE[Math.min(nivel, MAX_SKILL_LEVEL) - 1]!;
}

/**
 * Quanto o golpe EXTRA causa, como fração de um ataque normal — e é aqui que
 * as três decisões do doc viram número:
 *
 * - `DD-ASS-003` **uma adaga (com escudo)** → `1.0`. O proc rende **200 %** de
 *   um ataque normal, e o doc é enfático: é a config **mais defensiva e mais
 *   consistente**, não a versão fraca.
 * - `DD-ASS-004/005` **duas adagas** → `0.5` por golpe extra. A regra antiga
 *   que desativava o Ataque Duplo no dual foi **revogada**.
 * - `DD-ASS-006` **katar** → `0`. Não tem, ponto. Ele troca isso por crítico,
 *   burst e Sonic Blow.
 *
 * ⚠️ **Katar ainda não é um `WeaponType` próprio.** Enquanto não for, ele cai
 * no `return 0` de baixo junto com todas as outras armas — o resultado é o que
 * o doc manda, mas pelo motivo errado. Quem criar o tipo `katar` deve conferir
 * que esta função continua devolvendo 0 para ele.
 */
export function doubleAttackExtra(grip: Grip, arma?: WeaponType): number {
  if (arma !== 'dagger') return 0;
  return grip === 'dual' ? 0.5 : 1.0;
}

/**
 * 🥷 Ataque Oculto: quanto o dano cresce quando o golpe sai de dentro da
 * furtividade.
 *
 * ⚠️ REFERÊNCIA. O doc descreve o combo (*"aproxima furtivo → ataca → recua →
 * arremessa"*) e não dá o número. 2,5× é o que faz o combo valer: abaixo disso
 * os 25 de mana do `hide` mais os 26 do golpe custam mais do que rendem, e
 * ninguém o usaria duas vezes.
 */
export const HIDDEN_STRIKE_BONUS = 2.5;

/**
 * ☠️ Envenenar Arma: chance e parcela do veneno no ataque BÁSICO.
 *
 * ⚠️ REFERÊNCIA nos dois. O pilar "veneno" é do doc; os números não.
 */
export function envenomChance(nivel: number): number {
  if (nivel <= 0) return 0;
  return porNivel(nivel, 0.20, 0.60);
}
export function envenomPower(nivel: number): number {
  if (nivel <= 0) return 0;
  return porNivel(nivel, 2, 8);
}
/** Duração do veneno aplicado pela lâmina untada. */
export const ENVENOM_POISON_MS = 8000;

/**
 * ⚔️ Contra-ataque: fração do SEU ataque devolvida a cada golpe recebido.
 *
 * ⚠️ REFERÊNCIA. `PROPOSTA` no doc — só o nome é dele.
 */
export function counterAttackShare(nivel: number): number {
  if (nivel <= 0) return 0;
  return porNivel(nivel, 0.4, 1.0);
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
