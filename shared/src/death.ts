/**
 * Morte, penalidade e corpo no chão (GDD §8, mensagens #151–#154, #1002–#1004).
 *
 * A filosofia é a do Tibia: morrer dói. Não existe ressurreição — morreu,
 * voltou ao templo, e o que estava na mochila ficou para trás.
 *
 * Duas mortes diferentes:
 *  - PvE (monstro, chefe, armadilha) — pesada;
 *  - PvP (outro jogador) — a penalidade MÁXIMA do jogo.
 *
 * A diferença é proposital: ser derrotado por outro jogador precisa marcar mais
 * do que morrer para um chefe.
 */

/** Quanto da penalidade de PvP se aplica quando quem matou foi um monstro. */
export const PVE_PENALTY_RATIO = 0.7; // faixa combinada: 60–80%

/**
 * Fração da XP do nível perdida ao morrer para OUTRO JOGADOR.
 *
 *  - níveis 1–20: 20 % (o começo é perdoado, o jogador ainda está aprendendo)
 *  - níveis 21–100: 40 % — dói, mas não apaga a sessão
 *  - nível 101+: sobe devagar de 40 % até o TETO de 100 %
 *
 * DECISÃO DE 2026-07-27 (do dono do projeto), que substitui a tabela original
 * da conversa-fonte (msg #154: 50 % / 100 % / 200–300 %): perder dois ou três
 * níveis numa morte destrói progresso demais em nível alto e faz o jogador
 * largar o jogo. O teto agora é UM nível, e só no PvP em nível altíssimo.
 */
export function pvpXpPenaltyRatio(level: number): number {
  if (level <= 20) return 0.2;
  if (level <= 100) return 0.4;
  // Acima de 100 sobe suavemente; só encosta em 100 % lá pelo nível 500.
  return Math.min(1.0, 0.4 + (level - 100) * 0.0015);
}

/**
 * Teto absoluto da penalidade: nunca custa mais que UM nível cheio, mesmo em
 * PvP no nível mais alto do jogo.
 */
export const MAX_XP_PENALTY_RATIO = 1.0;

/** Fração da XP do nível perdida, conforme quem matou. */
export function xpPenaltyRatio(level: number, byPlayer: boolean): number {
  const base = pvpXpPenaltyRatio(level);
  return byPlayer ? base : base * PVE_PENALTY_RATIO;
}

// ---------------------------------------------------------------------------
// Corpo
// ---------------------------------------------------------------------------

/**
 * Quanto tempo o corpo fica no mundo. Longo de propósito: dependendo da
 * distância, voltar ao local pode levar vários minutos.
 */
export const CORPSE_TTL_MS = 15 * 60 * 1000;

/** Depois de esvaziado o corpo some rápido, para não poluir o mundo. */
export const CORPSE_EMPTY_TTL_MS = 60 * 1000;

/**
 * Chance de CADA peça equipada cair junto. Baixa — mas nunca zero, para que
 * mesmo o jogador experiente continue respeitando o perigo de morrer.
 */
export const EQUIP_DROP_ON_DEATH = 0.08;

/** Item mítico/lendário resiste mais: a chance dele cair é reduzida. */
export const RARE_EQUIP_DROP_MULT = 0.4;
