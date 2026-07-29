/**
 * Crafting por Fragmentos de Equipamento (Doc 3, Bloco 01 e cap. 78).
 *
 * O ciclo econômico que o doc chama de pilar do jogo (`DD-PROF-027`):
 *
 * ```
 * Exploração → Fragmentos → Craft → Marketplace → novas expedições
 * ```
 *
 * A ideia central: monstro **não** dropa equipamento pronto com frequência. Ele
 * dropa **fragmentos**, e o jogador escolhe o risco — juntar 100 fragmentos
 * Comuns garante um item Comum; misturar Lendários aumenta a chance de Lendário
 * mas custa muito mais tempo de farm.
 *
 * ⚠️ `DD-PROF-021` teve **duas versões**: o Bloco 01 fala em cinco categorias de
 * fragmento e o **cap. 78 revisa para sete**, alinhando com as sete raridades
 * que o jogo já tem. Vale o cap. 78, pela regra de ouro do roadmap ("o capítulo
 * mais alto vence").
 */

import { RARITIES, type Rarity } from './weapons.js';

/**
 * Quantos fragmentos uma fabricação consome. O doc usa 100 como exemplo em
 * todas as contas.
 * ⚠️ REFERÊNCIA — o próprio doc diz que "só restará balanceamento numérico
 * (chances, quantidades de fragmentos, custos)".
 */
export const FRAGMENTS_PER_CRAFT = 100;

/**
 * Mínimo de fragmentos de uma raridade para ela ENTRAR na tabela de
 * probabilidade.
 *
 * 🔴 É a regra anti-exploit, e o doc explica o porquê com o caso concreto:
 * sem ela, `1 Lendário + 99 Comuns` daria 1 % de chance de Lendário por um
 * custo irrisório, e farmar Comum viraria a via barata para o item caro.
 *
 * O doc sugere "pelo menos 20 ou 30". ⚠️ REFERÊNCIA.
 */
export const MIN_FRAGMENTS_FOR_CHANCE = 20;

/** Quantos fragmentos de cada raridade o jogador colocou na bancada. */
export type FragmentBundle = Partial<Record<Rarity, number>>;

/**
 * 🔴 `DD-PROF-028` — teto do artesão comum.
 *
 * A maioria das cidades tem Ferreiros comuns, que fabricam **até Lendário**.
 * Existem apenas **DOIS Mestres Ferreiros em todo o mundo**, e só eles fazem
 * Mítico e Relíquia. Isso torna os dois NPCs centros econômicos do servidor —
 * e é o que impede o endgame de virar linha de produção.
 */
export const COMMON_SMITH_MAX: Rarity = 'legendary';
export const MASTER_ONLY: readonly Rarity[] = ['mythic', 'relic'] as const;

/** Índice da raridade na escala (0 = comum). Usado para comparar e subir degrau. */
export function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r);
}

/** Esta raridade exige um dos dois Mestres Ferreiros? */
export function needsMasterSmith(r: Rarity): boolean {
  return MASTER_ONLY.includes(r);
}

/**
 * Distribuição de probabilidade da raridade final, a partir dos fragmentos.
 *
 * Regras que o doc fecha:
 *
 * 1. A chance é **proporcional à quantidade** de cada raridade
 *    (`DD-PROF-022`): 50 Comuns + 50 Incomuns → 50 % / 50 %.
 * 2. Uma raridade só entra se tiver `MIN_FRAGMENTS_FOR_CHANCE` fragmentos.
 * 3. 🔴 **Fragmento fraco nunca REBAIXA o resultado** — ele apenas deixa de
 *    contribuir. Por isso os que não atingem o mínimo somem da conta em vez de
 *    puxar a média para baixo, e a proporção é renormalizada entre os que
 *    ficaram. É o que garante que "o crafting nunca gera um item inútil": com
 *    30 Raros + 30 Épicos + 40 Lendários e nenhum Comum qualificado, **é
 *    impossível** sair Comum.
 */
export function rarityChances(bundle: FragmentBundle): Partial<Record<Rarity, number>> {
  const qualificados: Array<[Rarity, number]> = [];
  for (const r of RARITIES) {
    const n = bundle[r] ?? 0;
    if (n >= MIN_FRAGMENTS_FOR_CHANCE) qualificados.push([r, n]);
  }
  const total = qualificados.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return {};

  const out: Partial<Record<Rarity, number>> = {};
  for (const [r, n] of qualificados) out[r] = n / total;
  return out;
}

/** Motivos para uma fabricação não poder acontecer. */
export type CraftRejection =
  | 'sem-fragmentos-suficientes'
  | 'nenhuma-raridade-qualificada'
  | 'acima-da-receita'
  | 'exige-mestre-ferreiro';

export interface CraftAttempt {
  bundle: FragmentBundle;
  /**
   * Raridade da receita. `DD-PROF-025`: a receita define a **categoria** da
   * fabricação, não o tipo de equipamento — o jogador escolhe espada ou machado
   * na hora (`DD-PROF-026`).
   *
   * ⚠️ Tratada aqui como **TETO**. O doc diz que a raridade vem dos fragmentos
   * (`DD-PROF-022`) *e* que a receita define a categoria (`DD-PROF-025`), sem
   * dizer como as duas convivem. Teto é a leitura que preserva as duas: os
   * fragmentos sorteiam, a receita limita. Precisa de confirmação do dono.
   */
  recipeRarity: Rarity;
  /** Nível da profissão do artesão. */
  professionLevel: number;
  /** O artesão é um dos dois Mestres Ferreiros do mundo? */
  masterSmith?: boolean;
}

export interface CraftCheck {
  ok: boolean;
  reason?: CraftRejection;
}

/** Valida a tentativa antes de gastar qualquer material. */
export function canCraft(attempt: CraftAttempt): CraftCheck {
  const total = RARITIES.reduce((s, r) => s + (attempt.bundle[r] ?? 0), 0);
  if (total < FRAGMENTS_PER_CRAFT) return { ok: false, reason: 'sem-fragmentos-suficientes' };

  const chances = rarityChances(attempt.bundle);
  const entradas = Object.keys(chances) as Rarity[];
  if (entradas.length === 0) return { ok: false, reason: 'nenhuma-raridade-qualificada' };

  // Fragmento acima da receita é desperdício, não upgrade: se TODA raridade
  // qualificada está acima do teto, não há o que fabricar.
  const teto = rarityRank(attempt.recipeRarity);
  if (entradas.every((r) => rarityRank(r) > teto)) {
    return { ok: false, reason: 'acima-da-receita' };
  }

  if (needsMasterSmith(attempt.recipeRarity) && !attempt.masterSmith) {
    return { ok: false, reason: 'exige-mestre-ferreiro' };
  }

  return { ok: true };
}

/**
 * ⚠️ REFERÊNCIA. `DD-PROF-023` fecha que o nível da profissão dá "pequena
 * chance de elevar a raridade em um nível" — e insiste no **pequena**. O doc
 * não dá número; esta curva satura em 10 % para não transformar nível alto em
 * bilhete garantido para Lendário.
 */
export function upgradeChance(professionLevel: number): number {
  if (professionLevel <= 0) return 0;
  return Math.min(0.10, professionLevel * 0.001);
}

export interface CraftResult {
  rarity: Rarity;
  /** O nível da profissão elevou a raridade em um degrau? */
  upgraded: boolean;
  /** Chances usadas no sorteio — o cliente mostra antes de confirmar. */
  chances: Partial<Record<Rarity, number>>;
}

/**
 * Sorteia a raridade do item fabricado.
 *
 * `rng` injetável, no mesmo padrão do resto do combate. Consome no máximo dois
 * sorteios: um para a raridade, outro para o upgrade de profissão.
 */
export function rollCraft(
  attempt: CraftAttempt,
  rng: () => number = Math.random,
): CraftResult {
  const chances = rarityChances(attempt.bundle);
  const teto = rarityRank(attempt.recipeRarity);

  // A receita é teto: fragmentos acima dela não contam. Renormaliza o que sobra.
  const elegiveis = (Object.entries(chances) as Array<[Rarity, number]>)
    .filter(([r]) => rarityRank(r) <= teto);
  const soma = elegiveis.reduce((s, [, p]) => s + p, 0);

  let rarity: Rarity = elegiveis[0]?.[0] ?? 'common';
  let acumulado = 0;
  const sorteio = rng() * soma;
  for (const [r, p] of elegiveis) {
    acumulado += p;
    if (sorteio < acumulado) {
      rarity = r;
      break;
    }
  }

  // Upgrade da profissão: um degrau, respeitando o teto da receita E a regra
  // dos Mestres Ferreiros. Um ferreiro comum de nível altíssimo não vira
  // atalho para Mítico — `DD-PROF-028` seria letra morta.
  let upgraded = false;
  if (rng() < upgradeChance(attempt.professionLevel)) {
    const proxima = RARITIES[rarityRank(rarity) + 1];
    if (
      proxima
      && rarityRank(proxima) <= teto
      && (!needsMasterSmith(proxima) || attempt.masterSmith)
    ) {
      rarity = proxima;
      upgraded = true;
    }
  }

  return { rarity, upgraded, chances };
}

/**
 * XP profissional de uma fabricação (`DD-PROF-023`/`024`).
 *
 * "Receitas muito abaixo do nível do artesão concedem experiência reduzida" —
 * é o anti-spam: repetir item barato para sempre não sobe profissão. Receita
 * difícil rende bônus.
 *
 * ⚠️ A curva é REFERÊNCIA: o doc fecha a REGRA (menos XP abaixo, bônus acima) e
 * deixa os números para "a fase final do desenvolvimento".
 */
export function craftXp(recipeRarity: Rarity, professionLevel: number): number {
  const base = 10 * (rarityRank(recipeRarity) + 1);
  // Cada raridade equivale a ~10 níveis de profissão como referência de dificuldade.
  const nivelDaReceita = (rarityRank(recipeRarity) + 1) * 10;
  const diferenca = nivelDaReceita - professionLevel;
  if (diferenca >= 0) {
    // Receita compatível ou difícil: XP normal, com bônus proporcional.
    return Math.round(base * (1 + Math.min(1, diferenca / 20)));
  }
  // Muito abaixo do nível: decai rápido, mas nunca chega a zero — trabalho
  // feito é trabalho feito.
  return Math.max(1, Math.round(base * Math.max(0.1, 1 + diferenca / 20)));
}
