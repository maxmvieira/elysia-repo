/**
 * Condições de estado (GDD cap. 32).
 *
 * 🔴 **32.2 — Elemento ≠ Condição.** É o ponto que o doc mais repete. Dano de
 * gelo NÃO congela: quem congela é a habilidade, com chance própria, e a chance
 * passa pelas contramedidas daqui. `elements.ts` cuida do dano; este arquivo
 * cuida do ESTADO.
 *
 * Os três níveis de contramedida do doc, e a diferença entre eles importa:
 *
 * | Nível | O que faz |
 * |---|---|
 * | **Resistência** | reduz a CHANCE de aplicar |
 * | **Redução** | reduz a DURAÇÃO de quem já pegou |
 * | **Imunidade** | não funciona, ponto |
 *
 * `DD-CC-016` imunidade tem de ser **rara e específica**, e `DD-CC-009`
 * **imunidade a Congelamento NÃO protege de Petrificação** — por isso a
 * imunidade é uma lista de ids exatos, sem agrupamento por categoria. Agrupar
 * seria conveniente e quebraria a regra na primeira criatura "imune a controle".
 */

import type { DamageType } from './elements.js';

export type ConditionId =
  | 'freeze'
  | 'petrify'
  | 'stun'
  | 'silence'
  | 'poison'
  | 'bleed'
  | 'burn'
  | 'slow'
  | 'knockback'
  | 'root';

export type ConditionCategory = 'control' | 'restriction' | 'dot' | 'partial';

export const CONDITION_IDS: readonly ConditionId[] = [
  'freeze',
  'petrify',
  'stun',
  'silence',
  'poison',
  'bleed',
  'burn',
  'slow',
  'knockback',
  'root',
] as const;

export interface ConditionDef {
  id: ConditionId;
  name: string;
  category: ConditionCategory;
  blocksMove: boolean;
  blocksAttack: boolean;
  blocksCast: boolean;
  blocksItem: boolean;
  /** `DD-CC-004/005`: Stun, Congelamento e Petrificação interrompem conjuração. */
  interruptsCast: boolean;
  /** Dano recebido remove a condição. Vale para Congelamento, NÃO para Petrificação. */
  brokenByDamage: boolean;
  /** Dano ao longo do tempo: tipo e intervalo entre parcelas. */
  dot?: { type: DamageType; tickMs: number };
  /** Bônus de DEF/MDEF enquanto ativa. Só a Petrificação tem (é controle puro). */
  defBonusPct?: number;
  /** Fração de lentidão no movimento (0..1). Só a Lentidão tem. */
  slowPct?: number;
  /**
   * ⚠️ **REFERÊNCIA, não canônico.** Ver `CONFLITO_DD_CC_012` abaixo.
   * Ponto de partida para balanceamento — habilidades passam a sua própria duração.
   */
  referenceDurationMs: number;
}

/**
 * ⚠️ 🔴 `DD-CC-012` **CONFLITO NÃO RESOLVIDO no doc.** A definição inicial dizia
 * Petrificação **mais longa** e mais rara que Congelamento. A definição
 * posterior (cap. do Druid) diz Congelamento **~10 s** e Petrificação **5–7 s** —
 * ou seja, o inverso.
 *
 * O doc manda **não escolher em silêncio**. Não estamos: os números abaixo
 * seguem a definição **posterior**, aplicando a regra de ouro do roadmap
 * ("o capítulo mais alto vence o mais baixo · priorizar a última revisão
 * cronológica"). Fica registrado aqui para o dono confirmar ou reverter — é
 * decisão de balanceamento, não de código.
 *
 * 🔴 **A diferença MECÂNICA, essa sim, o doc fecha e está implementada:**
 * dano quebra Congelamento, dano **não** quebra Petrificação.
 */
export const CONFLITO_DD_CC_012 =
  'Duração de Congelamento x Petrificação em conflito no Doc 1; adotada a revisão posterior (Druid).';

export const CONDITIONS: Record<ConditionId, ConditionDef> = {
  freeze: {
    id: 'freeze',
    name: 'Congelamento',
    category: 'control',
    blocksMove: true,
    blocksAttack: true,
    blocksCast: true,
    blocksItem: true,
    interruptsCast: true,
    // O que separa Congelamento de Petrificação. Congelar prepara burst mas o
    // próprio burst liberta o alvo — é essa tensão que o doc quer preservar.
    brokenByDamage: true,
    referenceDurationMs: 10000,
  },
  petrify: {
    id: 'petrify',
    name: 'Petrificação',
    category: 'control',
    blocksMove: true,
    blocksAttack: true,
    blocksCast: true,
    blocksItem: true,
    interruptsCast: true,
    // Controle PURO: não prepara dano, porque o alvo fica mais duro e bater
    // nele não o solta. É o status característico do Druid (etapa 15).
    brokenByDamage: false,
    defBonusPct: 0.5,
    referenceDurationMs: 6000,
  },
  stun: {
    id: 'stun',
    name: 'Atordoamento',
    category: 'control',
    blocksMove: true,
    blocksAttack: true,
    blocksCast: true,
    blocksItem: true,
    interruptsCast: true,
    brokenByDamage: false,
    // "Controle total CURTO" — a duração é o que o diferencia dos outros dois.
    referenceDurationMs: 1500,
  },
  silence: {
    id: 'silence',
    name: 'Silêncio',
    category: 'restriction',
    // Restrição, não controle: anda e bate normal. Só a magia morre.
    blocksMove: false,
    blocksAttack: false,
    blocksCast: true,
    blocksItem: false,
    // Não interrompe um cast em andamento — impede COMEÇAR outro.
    interruptsCast: false,
    brokenByDamage: false,
    referenceDurationMs: 5000,
  },
  poison: {
    id: 'poison',
    name: 'Veneno',
    category: 'dot',
    blocksMove: false,
    blocksAttack: false,
    blocksCast: false,
    blocksItem: false,
    interruptsCast: false,
    brokenByDamage: false,
    dot: { type: 'poison', tickMs: 2000 },
    referenceDurationMs: 12000,
  },
  bleed: {
    id: 'bleed',
    name: 'Sangramento',
    category: 'dot',
    blocksMove: false,
    blocksAttack: false,
    blocksCast: false,
    blocksItem: false,
    interruptsCast: false,
    brokenByDamage: false,
    // DoT FÍSICO: passa por resistência física, não elemental. É a assinatura
    // da linha de Machado do Knight (etapa 13).
    dot: { type: 'physical', tickMs: 2000 },
    referenceDurationMs: 8000,
  },
  burn: {
    id: 'burn',
    name: 'Queimadura',
    category: 'dot',
    blocksMove: false,
    blocksAttack: false,
    blocksCast: false,
    blocksItem: false,
    interruptsCast: false,
    brokenByDamage: false,
    // O doc é enfático: fogo NÃO reduz mobilidade, NÃO congela, NÃO atordoa.
    // É dano + Queimadura, e nada além disso.
    dot: { type: 'fire', tickMs: 1500 },
    referenceDurationMs: 6000,
  },
  slow: {
    id: 'slow',
    name: 'Lentidão',
    category: 'partial',
    blocksMove: false,
    blocksAttack: false,
    blocksCast: false,
    blocksItem: false,
    interruptsCast: false,
    brokenByDamage: false,
    slowPct: 0.4,
    referenceDurationMs: 5000,
  },
  knockback: {
    id: 'knockback',
    name: 'Empurrão',
    category: 'partial',
    // Deslocamento é instantâneo; a "duração" é só a janela em que o alvo fica
    // sem ação. Quem move o personagem é o servidor, não este módulo.
    blocksMove: true,
    blocksAttack: true,
    blocksCast: true,
    blocksItem: false,
    interruptsCast: true,
    brokenByDamage: false,
    referenceDurationMs: 400,
  },
  root: {
    id: 'root',
    name: 'Aprisionamento',
    category: 'partial',
    // Prende os pés, não as mãos: continua atacando e conjurando.
    blocksMove: true,
    blocksAttack: false,
    blocksCast: false,
    blocksItem: false,
    interruptsCast: false,
    brokenByDamage: false,
    referenceDurationMs: 4000,
  },
};

/**
 * Cor do ícone de cada condição, para o cliente desenhar sem depender de arte.
 *
 * Fica aqui, e não no cliente, pelo mesmo motivo de `ELEMENT_INFO.color`: é
 * dado do jogo, e o dia em que o bestiário ou o tooltip precisarem da mesma cor
 * não vale ter duas listas para desincronizar.
 *
 * As famílias são reconhecíveis pela cor: controle em tons frios, DoT em tons
 * quentes/venenosos, restrição em roxo.
 */
export const CONDITION_COLORS: Record<ConditionId, number> = {
  freeze: 0x6ad4ff,
  petrify: 0x9a8f7a,
  stun: 0xffe14a,
  silence: 0xb26ad1,
  poison: 0x7ad13a,
  bleed: 0xc0342b,
  burn: 0xff6a2a,
  slow: 0x4a9fb0,
  knockback: 0xe0e0e0,
  root: 0x8a6a3a,
};

// ---------------------------------------------------------------------------
// ANTI-CC-CHAIN (`DD-CC-013/014`)
// ---------------------------------------------------------------------------

/**
 * ✅ **DECIDIDO em 2026-07-30** (o dono delegou o balanceamento).
 *
 * O doc exige que **CC chain infinito seja impedido** e lista duas
 * possibilidades sem escolher: resistência temporária após sofrer controle, ou
 * diminishing returns. **Implementamos as DUAS**, porque cada uma cobre um furo
 * diferente:
 *
 * - **Diminishing returns** impede a corrente LONGA: cada reaplicação da mesma
 *   condição dura menos, até não pegar mais.
 * - **Imunidade ao sair** garante uma JANELA DE AÇÃO: mesmo no primeiro
 *   controle, quando ele acaba você tem um instante para correr, curar ou
 *   revidar.
 *
 * 🔴 O problema que isto resolve é concreto: dois Feiticeiros com Congelamento de
 * 10 s se alternando prendem o alvo **para sempre**. Não é uma luta difícil — é
 * uma luta que não existe, porque o jogador assiste o personagem morrer sem
 * poder apertar tecla.
 *
 * ⚠️ Os números são decisão do projeto, não citação: o doc não dá nenhum.
 */

/** Fator de duração por vez que a condição já pegou na janela atual. */
export const DR_FACTORS: readonly number[] = [1, 0.5, 0.25, 0];

/**
 * Tempo sem sofrer AQUELA condição para o histórico dela zerar.
 *
 * 15 s é maior que a duração do Congelamento (10 s), de propósito: se a janela
 * fosse mais curta que o próprio controle, ela expiraria durante o efeito e o
 * diminishing returns nunca acumularia.
 */
export const DR_WINDOW_MS = 15000;

/**
 * Imunidade a controle TOTAL depois de sair de um.
 *
 * 3 s é curto o bastante para não anular controle como mecânica, e longo o
 * bastante para caber uma poção, um passo para fora da área ou uma habilidade.
 */
export const CONTROL_IMMUNITY_MS = 3000;

/** Estado anti-chain de um alvo. O servidor guarda um por jogador e criatura. */
export interface CcState {
  /** Quantas vezes cada condição pegou, e quando essa contagem expira. */
  history: Partial<Record<ConditionId, { stacks: number; windowUntil: number }>>;
  /** Timestamp até quando o alvo está imune a controle total. */
  controlImmuneUntil: number;
}

export function emptyCcState(): CcState {
  return { history: {}, controlImmuneUntil: 0 };
}

/** Esta condição tira o controle do personagem por completo? */
export function isTotalControl(id: ConditionId): boolean {
  const d = CONDITIONS[id];
  return d.blocksMove && d.blocksAttack && d.blocksCast;
}

/**
 * Fator de duração que o diminishing returns impõe agora.
 *
 * 1 = duração cheia (primeira vez), 0 = não pega mais. Não altera o estado —
 * quem registra é `registerCc`.
 */
export function ccDurationFactor(cc: CcState, id: ConditionId, now: number): number {
  const h = cc.history[id];
  if (!h || now >= h.windowUntil) return DR_FACTORS[0]!;
  return DR_FACTORS[Math.min(h.stacks, DR_FACTORS.length - 1)]!;
}

/** Marca que a condição pegou, avançando o diminishing returns. */
export function registerCc(cc: CcState, id: ConditionId, now: number): void {
  const h = cc.history[id];
  const dentroDaJanela = h && now < h.windowUntil;
  cc.history[id] = {
    stacks: dentroDaJanela ? h!.stacks + 1 : 1,
    // A janela reinicia a cada aplicação: quem está sendo acorrentado só sai do
    // diminishing returns depois de passar `DR_WINDOW_MS` LIVRE de verdade.
    windowUntil: now + DR_WINDOW_MS,
  };
}

/** O alvo está na janela de imunidade a controle total? */
export function isControlImmune(cc: CcState, now: number): boolean {
  return now < cc.controlImmuneUntil;
}

/** Concede a janela de imunidade. Chamado quando um controle total termina. */
export function grantControlImmunity(cc: CcState, now: number): void {
  cc.controlImmuneUntil = now + CONTROL_IMMUNITY_MS;
}

/** As três contramedidas do doc, na estrutura que o servidor carrega por alvo. */
export interface ConditionDefense {
  /** Reduz a CHANCE de aplicar. 0..1, onde 1 = a chance vira zero. */
  resist: Partial<Record<ConditionId, number>>;
  /** Reduz a DURAÇÃO de quem já pegou. 0..1. */
  reduction: Partial<Record<ConditionId, number>>;
  /**
   * Não funciona, ponto. `DD-CC-016`: rara e específica.
   * `DD-CC-009`: lista de ids EXATOS — imunidade a `freeze` não cobre `petrify`.
   */
  immunity: ConditionId[];
}

export function emptyConditionDefense(
  overrides: Partial<ConditionDefense> = {},
): ConditionDefense {
  return { resist: {}, reduction: {}, immunity: [], ...overrides };
}

export type ApplyRejection = 'immune' | 'resisted' | 'cc-immune' | 'cc-exhausted';

export interface ApplyResult {
  applied: boolean;
  /** Duração já descontada da Redução. 0 quando não aplicou. */
  durationMs: number;
  /** Por que não aplicou. Ausente quando aplicou. */
  rejection?: ApplyRejection;
}

/**
 * Tenta aplicar uma condição, passando pelos três níveis de contramedida na
 * ordem em que eles fazem sentido: imunidade anula antes de sortear, a
 * resistência mexe no sorteio, e a redução só age depois de o sorteio passar.
 *
 * `rng` injetável para teste determinístico, como no resto do combate.
 */
export function tryApplyCondition(
  id: ConditionId,
  baseChance: number,
  baseDurationMs: number,
  def: ConditionDefense,
  rng: () => number = Math.random,
  /** Estado anti-chain do alvo. Omitir desliga o `DD-CC-013/014`. */
  cc?: CcState,
  now = 0,
): ApplyResult {
  // ── IMUNIDADE ── nem sorteia.
  if (def.immunity.includes(id)) {
    return { applied: false, durationMs: 0, rejection: 'immune' };
  }

  // ── ANTI-CC-CHAIN ── vem ANTES do sorteio, porque quem acabou de sair de um
  // controle não deveria nem correr o risco de pegar outro.
  if (cc) {
    if (isTotalControl(id) && isControlImmune(cc, now)) {
      return { applied: false, durationMs: 0, rejection: 'cc-immune' };
    }
    if (ccDurationFactor(cc, id, now) <= 0) {
      // Já pegou vezes demais na janela: a 4ª não entra.
      return { applied: false, durationMs: 0, rejection: 'cc-exhausted' };
    }
  }

  // ── RESISTÊNCIA ── reduz a CHANCE, nunca a duração.
  const resist = Math.min(1, Math.max(0, def.resist[id] ?? 0));
  const chance = Math.max(0, Math.min(1, baseChance)) * (1 - resist);
  if (chance <= 0 || rng() >= chance) {
    return { applied: false, durationMs: 0, rejection: 'resisted' };
  }

  // ── REDUÇÃO ── reduz a DURAÇÃO de quem já pegou.
  const reduction = Math.min(1, Math.max(0, def.reduction[id] ?? 0));
  let duracao = baseDurationMs * (1 - reduction);

  // ── DIMINISHING RETURNS ── encurta a repetição e registra a aplicação.
  // Multiplica DEPOIS da Redução: são contramedidas independentes e as duas
  // valem (equipamento que reduz duração + corrente que já vinha encurtando).
  if (cc) {
    duracao *= ccDurationFactor(cc, id, now);
    registerCc(cc, id, now);
  }

  return { applied: true, durationMs: Math.round(duracao) };
}

/** Uma condição ativa num alvo. O servidor guarda a lista; o cliente só exibe. */
export interface ActiveCondition {
  id: ConditionId;
  /** Timestamp (ms) em que expira. */
  expiresAt: number;
  /** Timestamp (ms) da próxima parcela de DoT. Ausente quando não é DoT. */
  nextTickAt?: number;
  /** Dano por parcela, para DoT. Quem define é a habilidade que aplicou. */
  power?: number;
  /** Quem aplicou — necessário para creditar XP e para as regras de PK. */
  sourceId?: string;
}

/**
 * Adiciona ou renova uma condição.
 *
 * Reaplicar NÃO empilha duração: fica a expiração mais longa entre a atual e a
 * nova. Empilhar deixaria dois casters prenderem um alvo para sempre.
 *
 * ⚠️ 🔴 Isto **não é** a solução de `DD-CC-013/014` (CC chain infinito). O doc
 * exige que CC chain seja impedido mas **não define o método** — resistência
 * temporária após sofrer controle? diminishing returns? Fica pendente de
 * decisão do dono; quando fechar, o lugar de plugar é aqui.
 */
export function applyCondition(
  list: ActiveCondition[],
  next: ActiveCondition,
): ActiveCondition[] {
  const existing = list.find((c) => c.id === next.id);
  if (!existing) return [...list, next];
  return list.map((c) =>
    c.id === next.id
      ? { ...next, expiresAt: Math.max(c.expiresAt, next.expiresAt) }
      : c,
  );
}

export interface TickResult {
  /** Condições ainda ativas depois do tique. */
  active: ActiveCondition[];
  /** Parcelas de DoT a aplicar agora. */
  damage: Array<{ id: ConditionId; type: DamageType; amount: number; sourceId?: string }>;
  /** Condições que expiraram neste tique (o cliente remove o ícone). */
  expired: ConditionId[];
}

/**
 * Avança o relógio das condições: cobra DoT vencido e derruba o que expirou.
 *
 * `cc` opcional: quando informado, sair de um controle TOTAL concede a janela de
 * imunidade do `DD-CC-013/014`. É aqui que ela nasce, e não na aplicação, porque
 * a janela conta do FIM do controle.
 */
export function tickConditions(
  list: ActiveCondition[],
  now: number,
  cc?: CcState,
): TickResult {
  const active: ActiveCondition[] = [];
  const damage: TickResult['damage'] = [];
  const expired: ConditionId[] = [];

  for (const c of list) {
    if (now >= c.expiresAt) {
      expired.push(c.id);
      if (cc && isTotalControl(c.id)) grantControlImmunity(cc, now);
      continue;
    }
    const def = CONDITIONS[c.id];
    let next = c;
    if (def.dot && c.power && c.nextTickAt !== undefined && now >= c.nextTickAt) {
      damage.push({ id: c.id, type: def.dot.type, amount: c.power, sourceId: c.sourceId });
      next = { ...c, nextTickAt: c.nextTickAt + def.dot.tickMs };
    }
    active.push(next);
  }

  return { active, damage, expired };
}

/**
 * Dano recebido quebra Congelamento — e só ele.
 *
 * 🔴 É a diferença mecânica que o doc fecha entre Congelamento e Petrificação,
 * a única parte de `DD-CC-012` que NÃO está em conflito.
 */
export function breakOnDamage(
  list: ActiveCondition[],
  cc?: CcState,
  now = 0,
): ActiveCondition[] {
  const quebradas = list.filter((c) => CONDITIONS[c.id].brokenByDamage);
  // Quebrar por dano TAMBÉM é sair de um controle, então também rende a janela
  // de imunidade. Sem isso, o combo "congela → bate para quebrar → congela de
  // novo" seria uma corrente legítima passando por baixo do `DD-CC-013/014`.
  if (cc) {
    for (const c of quebradas) {
      if (isTotalControl(c.id)) grantControlImmunity(cc, now);
    }
  }
  return list.filter((c) => !CONDITIONS[c.id].brokenByDamage);
}

export interface Restrictions {
  canMove: boolean;
  canAttack: boolean;
  canCast: boolean;
  canUseItem: boolean;
  /** Fração de lentidão acumulada no movimento (0..1). */
  slowPct: number;
  /** Bônus de DEF/MDEF vindo de Petrificação (0..1). */
  defBonusPct: number;
}

/** O que o alvo consegue fazer agora, dado tudo que está ativo nele. */
export function restrictionsOf(list: ActiveCondition[]): Restrictions {
  const r: Restrictions = {
    canMove: true,
    canAttack: true,
    canCast: true,
    canUseItem: true,
    slowPct: 0,
    defBonusPct: 0,
  };
  for (const c of list) {
    const def = CONDITIONS[c.id];
    if (def.blocksMove) r.canMove = false;
    if (def.blocksAttack) r.canAttack = false;
    if (def.blocksCast) r.canCast = false;
    if (def.blocksItem) r.canUseItem = false;
    // Lentidões não empilham por soma (duas de 40 % não dão 80 %): vale a maior.
    if (def.slowPct) r.slowPct = Math.max(r.slowPct, def.slowPct);
    if (def.defBonusPct) r.defBonusPct = Math.max(r.defBonusPct, def.defBonusPct);
  }
  return r;
}

/** Alguma condição ativa interrompe conjuração? (`DD-CC-004/005`) */
export function interruptsCast(list: ActiveCondition[]): boolean {
  return list.some((c) => CONDITIONS[c.id].interruptsCast);
}
