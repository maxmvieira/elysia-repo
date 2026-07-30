/**
 * Ciclo dia/noite.
 *
 * 🔴 **As durações são de tempo REAL, não de hora do jogo** — é assim que o dono
 * pensa o ritmo ("1 hora dia, 30 minutos tarde, 1 hora noite"), e é o que um
 * jogador sente. A hora 0..24 que o cliente mostra no relógio é derivada disto,
 * não o contrário.
 *
 * O ciclo anterior dava a volta inteira em **2 minutos**. Era deliberado — o
 * comentário dizia "acelerado para o usuário testar já" — mas transformava a
 * noite em piscada e esvaziava o `NIGHT_DMG_MULT`: não dava tempo de a escolha
 * de sair à noite significar nada.
 *
 * ## O mapa das fases na hora do relógio
 *
 * ```
 *  fase    tempo real     hora no jogo
 *  dia      1 h           06:00 → 17:00
 *  tarde   30 min         17:00 → 19:00
 *  noite    1 h           19:00 → 06:00
 * ```
 *
 * As faixas de hora não são proporcionais ao tempo real de propósito: a **tarde
 * corre rápido** (2 horas de relógio em 30 minutos) porque é transição, e o valor
 * dela é o céu mudando de cor, não a duração. Dia e noite ficam com 11 horas de
 * relógio cada, o que mantém o meio-dia e a meia-noite nos extremos da curva de
 * escuridão que o cliente já desenha.
 */

/** As três fases. `dusk` é a tarde/crepúsculo. */
export type DayPhase = 'day' | 'dusk' | 'night';

export const DAY_MS = 60 * 60 * 1000;
export const DUSK_MS = 30 * 60 * 1000;
export const NIGHT_MS = 60 * 60 * 1000;

/** Volta completa: 2 h 30 de tempo real. */
export const CYCLE_MS = DAY_MS + DUSK_MS + NIGHT_MS;

export const PHASE_LABEL: Record<DayPhase, string> = {
  day: 'Dia',
  dusk: 'Tarde',
  night: 'Noite',
};

export interface WorldTime {
  /** Hora do relógio, 0..24. O cliente deriva o texto e a escuridão daqui. */
  hour: number;
  phase: DayPhase;
  /**
   * Atalho para `phase === 'night'`.
   *
   * ⚠️ **A tarde NÃO conta como noite**, e isso é decisão, não descuido: é este
   * booleano que liga `NIGHT_DMG_MULT` e `NIGHT_SPEED_MULT` (criaturas mais
   * fortes e mais rápidas). Deixar a tarde valer como noite daria 1h30 de
   * perigo contra 1h de segurança, e a tarde deixaria de ser o aviso que ela é
   * — o momento de decidir se volta para a vila ou encara.
   */
  night: boolean;
}

/**
 * Em que ponto do ciclo o mundo está, dado o tempo real decorrido.
 *
 * `elapsedMs` pode ser qualquer número — o resto da divisão cuida do resto, e
 * valores negativos (relógio do sistema para trás) caem no começo do ciclo em
 * vez de estourar.
 */
export function worldTimeAt(elapsedMs: number): WorldTime {
  const t = ((elapsedMs % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;

  if (t < DAY_MS) {
    return { hour: 6 + (t / DAY_MS) * 11, phase: 'day', night: false };
  }
  const aposDia = t - DAY_MS;
  if (aposDia < DUSK_MS) {
    return { hour: 17 + (aposDia / DUSK_MS) * 2, phase: 'dusk', night: false };
  }
  const aposTarde = aposDia - DUSK_MS;
  // 19h + até 11h dá 30h; o `% 24` traz a madrugada de volta para 0..6.
  return { hour: (19 + (aposTarde / NIGHT_MS) * 11) % 24, phase: 'night', night: true };
}

/**
 * O instante do ciclo em que uma fase COMEÇA, para forçar uma fase à mão.
 *
 * É o que os comandos de teste usam: em vez de mexer num relógio paralelo, eles
 * deslocam a origem do ciclo, e o mundo continua andando normalmente a partir
 * dali. Forçar "noite" e esperar faz amanhecer sozinho, como deve.
 */
export function phaseStartMs(phase: DayPhase): number {
  if (phase === 'day') return 0;
  if (phase === 'dusk') return DAY_MS;
  return DAY_MS + DUSK_MS;
}
