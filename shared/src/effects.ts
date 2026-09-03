/**
 * Efeitos temporários com MODIFICADOR de ficha — buffs e debuffs.
 *
 * 🔴 **Por que este arquivo não é `conditions.ts`.** O GDD cap. 32 trata de
 * CONDIÇÃO: Congelamento, Petrificação, Silêncio, Veneno — estados que
 * *impedem* ou *machucam*, com diminishing returns, anti-cadeia e imunidade
 * própria. O que o Druida faz na maior parte do tempo é outra coisa: *"não
 * precisa causar dano se faz o inimigo causar menos e os aliados causarem
 * mais"* (cap. 71). Isso é **número na ficha por um tempo**, e não passa pelas
 * contramedidas de controle — resistir a Congelamento não pode proteger de
 * −15 % de ataque.
 *
 * Misturar os dois daria a economia de um arquivo e custaria a regra: a
 * Pele de Carvalho entraria na fila de DR do Congelamento, e o quarto buff
 * seguido duraria metade.
 *
 * ## As duas regras de acúmulo
 *
 * 1. **Mesma habilidade não acumula — renova.** Dois Druidas lançando
 *    Enfraquecer no mesmo alvo não fazem −30 %. Vence a aplicação **mais
 *    forte**; empatou, vence a que dura mais. É a regra que o doc pede em
 *    `70.47` para o Círculo Arcano (*"dois círculos não acumulam"*) e que aqui
 *    vale para todos, porque a exceção seria a surpresa.
 * 2. **Habilidades diferentes acumulam, somando.** Enfraquecer (−15 % ATK) e
 *    Vulnerabilidade (−15 % DEF) tocam chaves diferentes e convivem; dois
 *    buffs que tocam a MESMA chave somam. É o que faz o Druida de suporte
 *    valer a vaga na party.
 */

/**
 * O que um efeito consegue mexer. Tudo é **fração relativa**: `+0.15` é
 * +15 %, `-0.15` é −15 %. Nunca valor absoluto — o mesmo buff tem de servir no
 * nível 1 e no 300.
 */
export type ModifierKey =
  /** Ataque físico. */
  | 'physAtk'
  /** Ataque mágico — o "poder mágico" que o Enfraquecer também derruba. */
  | 'magicAtk'
  /** Defesa física. */
  | 'defense'
  /** Resistência mágica (a MDEF do doc). */
  | 'magicResist'
  /** Velocidade de ataque (ASPD). Positivo = ataca mais rápido. */
  | 'attackSpeed'
  /** Velocidade de movimento. Positivo = anda mais rápido. */
  | 'moveSpeed'
  /** Vida máxima. */
  | 'maxHp'
  /** Cura RECEBIDA pelo alvo. A Maldição da Fraqueza vive aqui. */
  | 'healReceived'
  /** Cura que o alvo CAUSA. Separado de `healReceived` de propósito. */
  | 'healPower'
  /** Chance de crítico (soma direta na chance, ainda em fração). */
  | 'critChance'
  /** Chance de esquiva. */
  | 'dodgeChance'
  /**
   * Precisão: o contrário da esquiva. Desconta da chance do alvo de desviar.
   *
   * 🔴 Entrou com o Arqueiro, e fechou uma promessa antiga: `ATTRIBUTE_INFO.dex`
   * já dizia *"Dano de arco/besta · **precisão**"* desde o começo, e precisão
   * não existia em lugar nenhum da ficha. Duas das doze skills dele (Olho de
   * Águia e Concentração) dão "+15 % de precisão", e não havia onde pôr.
   */
  | 'accuracy'
  /** Alcance do ataque básico, em fração (Olho de Águia dá +20 %). */
  | 'attackRange'
  /** Resistência a CONDIÇÃO (reduz a chance de aplicar). */
  | 'statusResist'
  /** Resistência a dano elemental. */
  | 'elementalResist'
  /** Resistência a DEBUFF (reduz a duração de quem já pegou). */
  | 'debuffResist';

export const MODIFIER_KEYS: readonly ModifierKey[] = [
  'physAtk', 'magicAtk', 'defense', 'magicResist', 'attackSpeed', 'moveSpeed',
  'maxHp', 'healReceived', 'healPower', 'critChance', 'dodgeChance',
  'accuracy', 'attackRange',
  'statusResist', 'elementalResist', 'debuffResist',
] as const;

export const MODIFIER_LABEL: Record<ModifierKey, string> = {
  physAtk: 'Ataque físico',
  magicAtk: 'Poder mágico',
  defense: 'Defesa',
  magicResist: 'Defesa mágica',
  attackSpeed: 'Velocidade de ataque',
  moveSpeed: 'Movimento',
  maxHp: 'Vida máxima',
  healReceived: 'Cura recebida',
  healPower: 'Poder de cura',
  critChance: 'Crítico',
  dodgeChance: 'Esquiva',
  accuracy: 'Precisão',
  attackRange: 'Alcance',
  statusResist: 'Resistência a status',
  elementalResist: 'Resistência elemental',
  debuffResist: 'Resistência a debuff',
};

/** Conjunto de modificadores. Ausente = 0, não 1 — são somas, não fatores. */
export type Modifiers = Partial<Record<ModifierKey, number>>;

/** Um efeito ativo em cima de um jogador ou de uma criatura. */
export interface ActiveEffect {
  /** Id da habilidade que aplicou. É a chave de "não acumula com ela mesma". */
  id: string;
  /** Nome exibido na UI. */
  name: string;
  /** `true` pinta de verde no cliente, `false` de vermelho. */
  good: boolean;
  expiresAt: number;
  mods: Modifiers;
  /** Quem aplicou. Serve para o alvo saber de quem apanhou. */
  sourceId?: string;
}

/**
 * "Força" de um efeito, para decidir quem vence quando o mesmo id chega duas
 * vezes. É a soma dos módulos — um −20 % de ATK vence um −15 %, e um buff que
 * mexe em duas chaves vence o que mexe em uma só com o mesmo valor.
 */
export function effectPower(mods: Modifiers): number {
  let total = 0;
  for (const k of MODIFIER_KEYS) total += Math.abs(mods[k] ?? 0);
  return total;
}

/**
 * Aplica um efeito à lista, respeitando a regra 1 (mesma habilidade renova em
 * vez de somar). Devolve uma lista nova — o chamador troca a referência.
 *
 * ⚠️ O efeito mais fraco **não** consegue encurtar um mais forte que já está
 * rolando: o Druida de nível 1 lançando Pele de Carvalho não pode apagar a do
 * Druida de nível 10. Mas o MAIS FORTE substitui inteiro, inclusive a duração.
 */
export function applyEffect(list: ActiveEffect[], eff: ActiveEffect): ActiveEffect[] {
  const atual = list.find((e) => e.id === eff.id);
  if (!atual) return [...list, eff];
  const novoPoder = effectPower(eff.mods);
  const poderAtual = effectPower(atual.mods);
  if (novoPoder > poderAtual) return [...list.filter((e) => e.id !== eff.id), eff];
  if (novoPoder < poderAtual) return list;
  // Mesma força: renova a duração se a nova for mais longa.
  if (eff.expiresAt <= atual.expiresAt) return list;
  return [...list.filter((e) => e.id !== eff.id), eff];
}

/** Remove os efeitos vencidos. Devolve a lista nova e quais caíram. */
export function tickEffects(
  list: ActiveEffect[],
  now: number,
): { list: ActiveEffect[]; expired: ActiveEffect[] } {
  const expired = list.filter((e) => e.expiresAt <= now);
  if (expired.length === 0) return { list, expired };
  return { list: list.filter((e) => e.expiresAt > now), expired };
}

/** Soma todos os modificadores ativos (regra 2). */
export function sumModifiers(list: ActiveEffect[]): Modifiers {
  const total: Modifiers = {};
  for (const e of list) {
    for (const k of MODIFIER_KEYS) {
      const v = e.mods[k];
      if (v === undefined) continue;
      total[k] = (total[k] ?? 0) + v;
    }
  }
  return total;
}

/** Valor de uma chave específica (0 quando ninguém mexe nela). */
export function modifierOf(list: ActiveEffect[], key: ModifierKey): number {
  let total = 0;
  for (const e of list) total += e.mods[key] ?? 0;
  return total;
}

/**
 * Fator multiplicador de uma chave, já com PISO.
 *
 * 🔴 O piso existe para uma pilha de debuffs não zerar (nem inverter) um stat.
 * Sem ele, três debuffs de −40 % deixariam o alvo com dano negativo, e o
 * "golpe" passaria a curar. O teto é generoso porque buff empilhado é o que o
 * suporte existe para fazer.
 */
export function modifierFactor(list: ActiveEffect[], key: ModifierKey): number {
  return Math.max(MODIFIER_FLOOR, Math.min(MODIFIER_CEIL, 1 + modifierOf(list, key)));
}

/** Nenhum stat cai abaixo de 20 % do valor de ficha, por mais debuff que leve. */
export const MODIFIER_FLOOR = 0.2;
/** Nem passa de 3× por mais buff que receba. */
export const MODIFIER_CEIL = 3;

/** Remove um efeito pelo id (dispel, cancelar postura, fim de duração forçado). */
export function removeEffect(list: ActiveEffect[], id: string): ActiveEffect[] {
  return list.filter((e) => e.id !== id);
}

/** O alvo está sob este efeito agora? */
export function hasEffect(list: ActiveEffect[], id: string): boolean {
  return list.some((e) => e.id === id);
}
