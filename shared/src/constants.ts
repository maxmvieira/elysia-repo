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

/**
 * As OITO direções (doc 6.1 pedia quatro; as diagonais entraram em 2026-09-09).
 *
 * 🔴 **Elas já tinham existido e foram REMOVIDAS**, e vale saber por quê antes
 * de mexer: a rota em 8 direções fazia o personagem *"atravessar o mapa virado
 * de lado"*. A causa não era a diagonal — era o `dirFromDelta` do servidor
 * empatando em `|dx| === |dy|` e caindo sempre em `right`. Cortar a diagonal
 * escondeu o sintoma; agora a causa está resolvida e elas voltam.
 *
 * ⚠️ **As quatro cardinais vêm PRIMEIRO na lista, de propósito.** Quem itera
 * `DIRECTIONS` esperando as quatro de sempre (rota, vizinhança, testes) continua
 * pegando-as antes — e quem quiser só as cardinais usa `DIRECTIONS.slice(0, 4)`
 * em vez de reescrever a lista.
 */
export const DIRECTIONS = [
  'up', 'down', 'left', 'right',
  'up_right', 'up_left', 'down_right', 'down_left',
] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** Só as quatro cardinais. É o conjunto que a ARTE antiga tem. */
export const CARDINAL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

/**
 * A cardinal mais próxima de uma direção — é o que faz arte de 4 direções
 * continuar servindo num mundo de 8.
 *
 * 🔴 **A diagonal cai no eixo VERTICAL, não no horizontal.** Num jogo visto de
 * cima o que o jogador lê primeiro é se o personagem está de frente ou de
 * costas; escolher `right` para `up_right` mostraria o perfil de alguém que
 * está indo embora. Era exatamente esse o bug de agosto, e a regra aqui é o
 * oposto dele.
 */
export const CARDINAL_OF: Record<Direction, CardinalDirection> = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  up_right: 'up',
  up_left: 'up',
  down_right: 'down',
  down_left: 'down',
};

/** Sexo do personagem — escolhido na criação; define o sprite quando há arte. */
export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

/** Vetor (dx, dy) em tiles para cada direção. */
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  up_right: { dx: 1, dy: -1 },
  up_left: { dx: -1, dy: -1 },
  down_right: { dx: 1, dy: 1 },
  down_left: { dx: -1, dy: 1 },
};

/**
 * A direção que aponta de (0,0) para (dx, dy).
 *
 * 🔴 **Vive no `shared` e não no servidor de propósito.** Era uma função
 * privada do `server/index.ts`, e o empate dela (`|dx| >= |dy|` → sempre
 * horizontal) foi a causa do bug de agosto. Com diagonal de verdade não há mais
 * empate — e pondo a regra aqui, cliente e servidor não podem discordar sobre
 * para onde o personagem está virado.
 */
export function directionFromDelta(
  dx: number,
  dy: number,
  fallback: Direction,
): Direction {
  const sx = Math.sign(dx), sy = Math.sign(dy);
  if (sx === 0 && sy === 0) return fallback;
  if (sx === 0) return sy > 0 ? 'down' : 'up';
  if (sy === 0) return sx > 0 ? 'right' : 'left';
  if (sy > 0) return sx > 0 ? 'down_right' : 'down_left';
  return sx > 0 ? 'up_right' : 'up_left';
}

/**
 * 🔴 **Intervalo entre um bolt e o seguinte, na mesma conjuração.**
 *
 * Mora no `shared` porque **os dois lados precisam do mesmo número**: o
 * servidor espaça os impactos por ele, e o cliente espaça as bolas que desenha
 * pelo mesmo valor. Dois números diferentes fariam o dano e a bola andarem
 * separados — a última cairia depois do próprio estrago.
 *
 * É o mesmo tipo de contrato do `GROUND_Y`/`feetY`: um valor, dois arquivos, e
 * mudar um sem o outro quebra em silêncio.
 *
 * 🔴 **De 140 para 800 em 09/09: os bolts passam a cair UM POR UM.** Pedido do
 * dono depois de ver dez bolas no ar ao mesmo tempo — *"quase não está dando
 * para ver a animação direito"*. A 140 o intervalo era uma fração da queda e a
 * chuva virava borrão; a 800 cada bola chega perto do chão antes de a seguinte
 * nascer.
 *
 * ⚠️ **Isto é o que mais mexe no ritmo da magia.** O Fire Bolt de nível 10
 * passa a levar 9 × 800 + queda para terminar, e a recarga acompanha (ver
 * `marcaConjuracao`). Se um dia parecer lento demais, este é o número — não a
 * duração da queda, que é o que faz cada bola ser vista.
 */
export const INTERVALO_BOLT_MS = 800;

/**
 * 🔴 **Quanto UMA bola leva do céu ao chão.**
 *
 * Morava só no cliente, porque só ele desenhava a queda. Passou para cá quando
 * a recarga do Fire Bolt deixou de ser fixa: o servidor precisa saber quando o
 * ÚLTIMO bolt termina para liberar a magia, e esse instante é
 * `(golpes − 1) × INTERVALO_BOLT_MS + DUR_QUEDA_MS`.
 *
 * ⚠️ Mesmo contrato do intervalo acima: um valor, dois arquivos. Baixar aqui
 * sem baixar a animação libera a magia antes de a última bola cair na tela.
 *
 * 🔴 **Voltou a 1000 quando os bolts passaram a cair um por um.** Ela subiu de
 * 620 até 3600 ao longo de cinco testes, e o pedido por trás de todos era o
 * mesmo: *dar para ver a bola*. Com dez caindo ao mesmo tempo, alongar a queda
 * era o único jeito de conseguir isso — e não bastava, porque as dez se
 * sobrepunham.
 *
 * ✅ Com `INTERVALO_BOLT_MS` em 800 cada bola cai sozinha, e aí ela é vista sem
 * precisar durar quatro segundos. Alongar de novo AQUI só faria as bolas
 * voltarem a se sobrepor.
 *
 * ⚠️ Na arte de 24 quadros a QUEDA são os catorze primeiros e o estouro os dez
 * últimos — então o tempo de descida é ~58% deste número.
 */
export const DUR_QUEDA_MS = 1000;
