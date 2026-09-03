/**
 * Constantes globais do jogo.
 *
 * Conforme a seção 21 do documento mestre, muitos destes valores devem
 * permanecer CONFIGURÁVEIS e não "hardcoded" espalhados pelo código.
 * Centralizá-los aqui é o primeiro passo: mais tarde parte disso migra
 * para arquivos de dados versionados (shared/data/*).
 */

/** Tamanho de um tile em pixels (base do visual estilo Tibia). */
export const TILE_SIZE = 32;

/** Frequência do tick autoritativo do servidor, em Hz (doc 6.3: 10-20 Hz). */
export const SERVER_TICK_HZ = 15;
export const SERVER_TICK_MS = 1000 / SERVER_TICK_HZ;

/** Quantos tiles o jogador enxerga ao redor de si (viewport ~15x11, doc 6.2). */
export const VIEWPORT_TILES_X = 15;
export const VIEWPORT_TILES_Y = 11;

/** Velocidade de movimento padrão em tiles por segundo (placeholder, doc 21). */
export const DEFAULT_MOVE_SPEED_TPS = 4;

/** Porta padrão do servidor de gameplay (WebSocket). */
export const DEFAULT_SERVER_PORT = 8080;

/**
 * Quanto tempo o jogador tem para desistir de excluir um personagem.
 *
 * 🔴 **24 h, e o número é do dono.** O ponto do prazo é o arrependimento: quem
 * apaga no impulso, ou por conta invadida, tem uma noite inteira para voltar
 * atrás. Menos que isso não cobre "só vi no dia seguinte".
 *
 * ⚠️ Vive no shared porque a TELA também precisa dele: ela mostra a contagem
 * regressiva, e um segundo valor no cliente divergiria do servidor no dia em
 * que alguém mexesse num só.
 */
export const DELETE_GRACE_MS = 24 * 60 * 60 * 1000;

/** Direções cardinais suportadas no MVP (doc 6.1). */
export const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** Sexo do personagem — escolhido na criação; define o sprite quando há arte. */
export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

/** Vetor (dx, dy) em tiles para cada direção. */
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
