/**
 * Flag PK ON/OFF e Caveira Branca (GDD 17.32–17.34, cap. 75).
 *
 * 🔴 **O flag é do ATACANTE, e só dele.** Com **PK OFF**, a ação ofensiva
 * *daquele jogador* simplesmente não existe contra outro jogador: sem dano, sem
 * queimadura, sem stun, sem congelamento, sem debuff, sem AoE, sem DoT — **e o
 * caster não vira PK**. Uma Chuva de Meteoros não pega quem atravessa a área.
 * É 17.33 ao pé da letra: *"Se o Sorcerer estiver com PK OFF…"*.
 *
 * 🔴 **O flag NÃO é escudo.** Quem liga o PK e ataca acerta o alvo mesmo que o
 * alvo esteja com o PK desligado — 17.34 diz que "as ações ofensivas podem
 * atingir jogadores válidos" e em nenhum ponto exige o flag do lado de lá.
 * Sofrer o golpe não é opcional; **a consequência para o agressor é a
 * ⚪ Caveira Branca**, e é ela que devolve o equilíbrio: enquanto durar, a
 * vítima e qualquer um que esteja vendo podem revidar **sem punição e sem
 * precisar ligar o próprio PK**.
 *
 * ⚠️ **Correção de rumo (30/07):** a primeira versão exigia PK ON dos DOIS
 * lados. Era mais seguro e era errado — transformava o PK num escudo pessoal e
 * tornava a emboscada impossível, esvaziando o cap. 75 inteiro ("o objetivo não
 * é impedir PK"). Decisão do dono, confirmada contra 17.32–17.34. **Não
 * reverter para a checagem dos dois lados.**
 *
 * Por isso `canHarm` tem de ser consultada ANTES de qualquer efeito — dano,
 * condição ou empurrão — e não só na hora de subtrair HP.
 */

/** Quem pode sofrer uma ação ofensiva. Criatura nunca passa pelo filtro de PK. */
export type CombatantKind = 'player' | 'creature';

/**
 * Caveira visível sobre o personagem.
 *
 * Só a **branca** existe hoje: é a marca temporária de "agrediu alguém agora há
 * pouco". Amarela (protetor), vermelha e preta (criminalidade acumulada) são a
 * Etapa 17 e dependem de contagem de assassinatos persistida — ver `DD-PK-003`
 * a `DD-PK-007`.
 */
export type SkullKind = 'white';

/**
 * Quanto tempo a Caveira Branca fica de pé depois da última agressão.
 *
 * ⚠️ REFERÊNCIA: o Doc 1 não dá o número — o cap. 75 só fecha as durações da
 * vermelha (7 dias) e da preta (30 dias). A conversa antiga descreve a branca
 * como "poucos minutos", e 5 min é o ponto de partida: tempo de a vítima
 * revidar ou de alguém por perto intervir, sem virar castigo de sessão inteira.
 */
export const WHITE_SKULL_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// ⚪ Caveira branca: uma agressão ou muitas — decisão do dono em 2026-09-05
// ---------------------------------------------------------------------------
//
// 🔴 **A duração passou a depender do que a pessoa FEZ**, e não de um número só:
//
// > *"se eu virei pk a duração mínima são 10 minutos caso eu continue atacando
// > o player. caso tenha sido somente 1 ataque em um player, a caveira branca
// > some com 60 segundos."*
//
// ⚠️ Isto SUBSTITUI o `WHITE_SKULL_MS` de 5 minutos, que era `⚠️ REFERÊNCIA`
// (o Doc 1 não dá o número da branca — só fecha vermelha 7 dias e preta 30). A
// constante fica porque outros pontos ainda a citam, mas quem manda agora é
// `whiteSkullDuration`.
//
// O que a regra compra: **um golpe sem querer não é a mesma coisa que caçar
// alguém.** Antes, encostar uma vez num jogador custava os mesmos 5 minutos de
// alvo livre que perseguir a pessoa pelo mapa.

/** Uma agressão isolada: a caveira some em 1 minuto. */
export const WHITE_SKULL_SINGLE_MS = 60_000;
/** Insistiu: 10 minutos, contados a partir da ÚLTIMA agressão. */
export const WHITE_SKULL_REPEAT_MS = 10 * 60_000;

/**
 * Quanto tempo de caveira branca uma agressão concede.
 *
 * @param agressoes Quantas agressões o atacante já cometeu na janela atual,
 *   **incluindo a que está acontecendo agora**. 1 = primeira.
 *
 * ⚠️ A duração é sempre contada do instante da agressão, então continuar
 * batendo RENOVA os 10 minutos em vez de somar. Somar faria uma briga longa
 * virar caveira de horas, que é papel da vermelha e não da branca.
 */
export function whiteSkullDuration(agressoes: number): number {
  return agressoes <= 1 ? WHITE_SKULL_SINGLE_MS : WHITE_SKULL_REPEAT_MS;
}

// ---------------------------------------------------------------------------
// 🚪 Trava de saída em combate — decisão do dono em 2026-09-05
// ---------------------------------------------------------------------------
//
// > *"se estiver em batalha não consigo deslogar, somente após 60 segundos sem
// > batalhar eu consigo deslogar, agora se for um player que me atacou esse
// > tempo triplica"*
//
// 🔴 **Serve para tirar o "desligar o cabo" como jogada.** Sem trava, quem está
// perdendo uma luta sai do jogo e não perde nada — o que esvazia a penalidade de
// morte e o PvP inteiro.
//
// ⚠️ **A trava alcança o botão de sair/trocar, não o fechamento da aba.**
// Ninguém consegue impedir alguém de fechar o navegador; impedir de verdade
// exigiria o personagem CONTINUAR no mundo depois da queda do socket, que é um
// sistema que o jogo não tem. Está anotado no HANDOFF como pendência.

/** Tempo sem combate para poder sair, quando a briga foi com criatura. */
export const LOGOUT_LOCK_PVE_MS = 60_000;
/**
 * O mesmo, quando quem atacou foi um JOGADOR. Triplica.
 *
 * 🔴 Triplica porque a fuga por logout é um problema de PvP, não de PvE: contra
 * monstro, sair só interrompe a caçada de quem saiu; contra gente, decide o
 * resultado de um duelo alheio.
 */
export const LOGOUT_LOCK_PVP_MS = LOGOUT_LOCK_PVE_MS * 3;

/** Quanto tempo a trava dura, a partir do último combate. */
export function logoutLockDuration(porJogador: boolean): number {
  return porJogador ? LOGOUT_LOCK_PVP_MS : LOGOUT_LOCK_PVE_MS;
}

export interface Combatant {
  id: string;
  kind: CombatantKind;
  /**
   * Flag de PK do jogador. Criaturas ignoram.
   *
   * 🔴 Lido **só do atacante**. Ver o cabeçalho: não é escudo.
   */
  pkEnabled?: boolean;
  /**
   * Caveira ativa, quando há. Ausente = sem caveira.
   *
   * Quem carrega a branca é **alvo livre**: atacá-lo é permitido mesmo com o PK
   * do atacante desligado, e não gera caveira para quem ataca.
   */
  skull?: SkullKind;
  /** Id da party. Aliados não se acertam (friendly fire desligado por padrão). */
  partyId?: string;
  /** Id da guilda, para guerra oficial. */
  guildId?: string;
}

export interface HostilityContext {
  /**
   * Guerra de guilda oficial: os inimigos são **hostis automaticamente**, sem
   * precisar ligar PK a cada combate.
   */
  guildWar?: (a: Combatant, b: Combatant) => boolean;
  /** `DD-PK-009` duelo consensual é separado de PK — vale mesmo com PK OFF. */
  duel?: (a: Combatant, b: Combatant) => boolean;
  /** Friendly fire entre aliados. Desligado por padrão. */
  friendlyFire?: boolean;
}

export type HarmVeto =
  | 'self'
  | 'pk-off'
  | 'ally';

export interface HarmDecision {
  allowed: boolean;
  /** Por que não pode. Ausente quando pode. */
  veto?: HarmVeto;
  /**
   * A ação dá **Caveira Branca** ao atacante?
   *
   * Falso em duelo, em guerra de guilda e contra quem já está de caveira (é o
   * `justified` abaixo). Com PK OFF a ação nem acontece, então também é falso —
   * o doc é explícito em que **o caster não vira PK**.
   *
   * É este booleano que a Etapa 17 vai ler para contar assassinato injustificado
   * e escalar para vermelha/preta.
   */
  marksAsPk: boolean;
  /**
   * Agressão **justificada**: o alvo já estava de caveira. 17.38 exclui
   * explicitamente "matar criminoso/procurado" da lista de assassinato
   * injustificado, e é o que faz a vítima poder revidar de graça.
   */
  justified?: boolean;
}

/**
 * Decide se `attacker` pode causar QUALQUER efeito ofensivo em `target`.
 *
 * Consultar antes do dano E antes da condição. Chamar só antes do dano deixaria
 * passar a queimadura e o stun, que é exatamente o que o doc proíbe.
 */
export function canHarm(
  attacker: Combatant,
  target: Combatant,
  ctx: HostilityContext = {},
): HarmDecision {
  if (attacker.id === target.id) {
    return { allowed: false, veto: 'self', marksAsPk: false };
  }

  // Criatura não participa do sistema de PK, nos dois sentidos: monstro bate em
  // quem quiser, e todo mundo bate em monstro.
  if (attacker.kind === 'creature' || target.kind === 'creature') {
    return { allowed: true, marksAsPk: false };
  }

  // Guerra oficial: hostil automaticamente, sem marcar PK e sem exigir flag.
  if (ctx.guildWar?.(attacker, target)) {
    return { allowed: true, marksAsPk: false };
  }

  // `DD-PK-009` duelo consensual é separado de PK: os dois concordaram.
  if (ctx.duel?.(attacker, target)) {
    return { allowed: true, marksAsPk: false };
  }

  // Aliados de party não se acertam, a menos que friendly fire esteja ligado.
  const sameParty =
    attacker.partyId !== undefined && attacker.partyId === target.partyId;
  if (sameParty && !ctx.friendlyFire) {
    return { allowed: false, veto: 'ally', marksAsPk: false };
  }

  // 🔴 Alvo de caveira é alvo livre — ANTES da checagem de PK, de propósito.
  // A vítima da emboscada não tem como ter previsto o ataque para deixar o flag
  // ligado; exigir que ela ligue o PK para revidar seria dar ao agressor um
  // turno grátis. E revidar não marca ninguém (17.38).
  if (target.skull) {
    return { allowed: true, marksAsPk: false, justified: true };
  }

  // 🔴 O coração da regra: só o flag do ATACANTE é lido. Ligar o PK é assumir a
  // agressão, não ganhar um escudo — quem apanha apanha do mesmo jeito, e a
  // conta chega ao agressor na forma da Caveira Branca (o `marksAsPk` abaixo).
  if (!attacker.pkEnabled) {
    return { allowed: false, veto: 'pk-off', marksAsPk: false };
  }

  return { allowed: true, marksAsPk: true };
}
