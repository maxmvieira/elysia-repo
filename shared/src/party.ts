/**
 * Party — o núcleo do cap. 35 (`DD-PARTY-001`: *"Elysia possui sistema formal
 * de Party"*).
 *
 * ⚠️ **Escopo desta entrega: só a FORMAÇÃO do grupo.** Convidar, aceitar, sair,
 * expulsar e passar a liderança. O que a Etapa 9 ainda deve trazer:
 *
 * - Shared XP com faixa de nível (`DD-PARTY-003..007`) — a faixa já está aqui
 *   em `sharesXpWith`, porque é regra fechada e barata de travar em teste, mas
 *   **nada no servidor a consulta ainda**: a XP continua indo inteira para quem
 *   deu o abate.
 * - Bônus de grupo antes da divisão (`DD-PARTY-009`)
 * - Os três modos de distribuição e a votação (`DD-PARTY-013..020`)
 * - Boss Global por contribuição (`DD-PARTY-021..026`)
 *
 * 🔴 O que JÁ vale de verdade a partir daqui é o `partyId` chegar ao `canHarm`:
 * membros do mesmo grupo param de se acertar (friendly fire desligado por
 * padrão, 32.61). Era a única regra de party que o jogo tinha e não usava.
 */

/** Tamanho máximo de uma party.
 *
 * ⚠️ **REFERÊNCIA, não canônico.** Procurei nos quatro documentos: `DD-PARTY-001`
 * a `026` não fixam tamanho de grupo em lugar nenhum, e `DD-PARTY-026` chega a
 * dizer que **boss não tem número mínimo obrigatório de jogadores**. O 5 sai do
 * único número que o doc usa — o exemplo de distribuição de XP do `35.x`
 * (*"monstro de 1.000 XP com 5 jogadores"*). É ponto de partida para teste, não
 * decisão fechada: mudar aqui muda o jogo inteiro, e nenhum teste trava o valor.
 */
export const PARTY_MAX = 5;

/** Um membro, do ponto de vista das regras (o servidor tem muito mais estado). */
export interface PartyMemberRef {
  id: string;
  level: number;
}

export interface PartyState {
  id: string;
  /** Quem lidera. `DD-PARTY-015`: ele **não** muda a regra de loot sozinho. */
  leaderId: string;
  /** Ordem de entrada; o líder não é necessariamente o primeiro depois de repassada. */
  memberIds: string[];
}

export type InviteVeto =
  | 'self'          // convidou a si mesmo
  | 'full'          // grupo cheio
  | 'already-mine'  // já está neste grupo
  | 'in-other'      // já está em outro grupo
  | 'not-leader';   // só o líder convida

export interface InviteDecision {
  allowed: boolean;
  veto?: InviteVeto;
}

/**
 * Pode `inviterId` convidar `targetId`?
 *
 * `party` ausente = quem convida ainda não tem grupo (o convite CRIA a party no
 * aceite). Esse é o caso comum: dois jogadores soltos no mapa.
 */
export function canInvite(
  inviterId: string,
  targetId: string,
  party: PartyState | undefined,
  targetParty: PartyState | undefined,
): InviteDecision {
  if (inviterId === targetId) return { allowed: false, veto: 'self' };
  if (targetParty) {
    // Distinguir "já está comigo" de "está em outro grupo" existe para a
    // mensagem: as duas recusas parecem iguais para o código e são muito
    // diferentes para quem clicou.
    if (party && targetParty.id === party.id) return { allowed: false, veto: 'already-mine' };
    return { allowed: false, veto: 'in-other' };
  }
  if (party) {
    // 🔴 Só o líder convida. Sem isso, qualquer membro encheria o grupo de
    // desconhecidos e o líder descobriria depois — que é a versão social do
    // problema que `DD-PARTY-015` resolve para o loot.
    if (party.leaderId !== inviterId) return { allowed: false, veto: 'not-leader' };
    if (party.memberIds.length >= PARTY_MAX) return { allowed: false, veto: 'full' };
  }
  return { allowed: true };
}

/** Mensagem de recusa, na voz do jogo. */
export function inviteVetoText(veto: InviteVeto, targetName: string): string {
  switch (veto) {
    case 'self': return 'Você não pode convidar a si mesmo.';
    case 'full': return `O grupo já está cheio (${PARTY_MAX}).`;
    case 'already-mine': return `${targetName} já está no seu grupo.`;
    case 'in-other': return `${targetName} já está em outro grupo.`;
    case 'not-leader': return 'Só o líder do grupo pode convidar.';
  }
}

/**
 * Tira um membro e devolve o estado resultante — `null` quando o grupo deixa de
 * existir.
 *
 * 🔴 **Party de um membro é dissolvida.** Manter alguém "em grupo" sozinho o
 * deixaria com o friendly fire e a UI de party sem nenhum benefício, e é estado
 * fantasma que reaparece como bug depois.
 *
 * Se quem sai é o líder, a liderança passa ao **membro mais antigo restante** —
 * o doc não trata sucessão, e ordem de entrada é o critério que não precisa de
 * decisão de design nem de votação (que `DD-PARTY-016` reserva ao loot).
 */
export function removeMember(party: PartyState, memberId: string): PartyState | null {
  const memberIds = party.memberIds.filter((id) => id !== memberId);
  if (memberIds.length <= 1) return null;
  const leaderId = party.leaderId === memberId ? memberIds[0]! : party.leaderId;
  return { ...party, leaderId, memberIds };
}

/**
 * Faixa de nível do Shared XP (`DD-PARTY-004/005`).
 *
 * ⚠️ **Definida aqui, ainda NÃO usada pelo servidor.** Entra junto porque é
 * regra fechada e o teste a trava de graça; ligar na distribuição de XP é a
 * Etapa 9.
 *
 * 🔴 `DD-PARTY-006` deixa as faixas acima do Lv.200 como **pendente numérico**.
 * Não invento: acima de 200 seguimos com a janela de 20, que é a última que o
 * doc fecha, e o comentário fica aqui para quem for fechar o número.
 */
export function xpBandFor(level: number): number {
  if (level <= 100) return 10;
  return 20;
}

/**
 * `DD-PARTY-007`: um Lv.300 pode **ajudar** um Lv.20 — atacar, proteger,
 * participar — mas **não divide XP** com ele. Ajudar sim, carregar não.
 *
 * A janela usada é a do MAIOR nível dos dois: é o que impede o Lv.101 de usar a
 * janela larga para puxar o Lv.85 e, ao mesmo tempo, o Lv.99 de reclamar de uma
 * janela estreita contra alguém que já está na faixa de 20.
 */
export function sharesXpWith(a: number, b: number): boolean {
  return Math.abs(a - b) <= xpBandFor(Math.max(a, b));
}
