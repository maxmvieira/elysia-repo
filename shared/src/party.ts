/**
 * Party, Shared XP e distribuição de loot — Etapa 9,
 * `DD-PARTY-001` a `DD-PARTY-026`.
 *
 * 🔴 **Este arquivo é a UNIÃO de dois trabalhos paralelos** (merge de
 * 2026-07-30). Dois irmãos partiram do mesmo commit sem saber e escreveram
 * metades complementares:
 *
 * - **Formação** (`PARTY_MAX`, `canInvite`, `removeMember`) — quem entra, quem
 *   sai, quem lidera.
 * - **Distribuição** (`distributeXp`, regras de loot, votação, loot de chefe) —
 *   o que o grupo ganha por existir.
 *
 * Uma sem a outra não fecha a etapa: formar grupo que não divide nada é lista de
 * amigos, e dividir XP sem poder formar grupo não roda.
 *
 * Só as REGRAS moram aqui: nada de rede, nada de estado de servidor. É o que
 * permite testar "um Lv.300 não rouba XP de um Lv.20" sem subir um servidor e
 * conectar dois clientes.
 *
 * ## As três coisas que o documento realmente fecha
 *
 * 1. **Party e elegibilidade para Shared XP são conceitos distintos**
 *    (`DD-PARTY-002`). Estar no grupo não dá direito à XP — é por isso que
 *    `PartyMember` tem `participated` e `nearby` separados do simples "está na
 *    lista".
 * 2. **O bônus vem ANTES da divisão** (`DD-PARTY-009`). A ordem importa: bônus
 *    depois da divisão faria party render mais por cabeça que solo.
 * 3. **Loot não é multiplicado** (`DD-PARTY-011/012`). Uma morte gera uma
 *    quantidade real de drops, com 2 ou com 10 jogadores.
 */

// ---------------------------------------------------------------------------
// Formação
// ---------------------------------------------------------------------------

/**
 * Tamanho máximo de uma party.
 *
 * ⚠️ **REFERÊNCIA, não canônico.** `DD-PARTY-001` a `026` não fixam tamanho de
 * grupo em lugar nenhum, e `DD-PARTY-026` chega a dizer que **boss não tem
 * número mínimo obrigatório de jogadores**. O 5 sai do único número que o doc
 * usa — o exemplo de distribuição de XP do `35.x` (*"monstro de 1.000 XP com 5
 * jogadores"*). É ponto de partida para teste, não decisão fechada.
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

// ---------------------------------------------------------------------------
// Faixa de nível
// ---------------------------------------------------------------------------

/**
 * Largura da faixa de nível que ainda divide XP.
 *
 * `DD-PARTY-004` dá ~10 níveis até o Lv.100 e `DD-PARTY-005` dá ~20 entre 100 e
 * 200.
 *
 * ⚠️ **O Lv.100 exato é ambíguo no documento** — ele aparece nas duas frases
 * ("até Lv.100" e "Lv.100–200"). Fica na faixa de **10**, porque "até Lv.100" lê
 * mais fortemente como inclusivo. As duas leituras eram defensáveis; esta foi a
 * escolhida no merge.
 *
 * 🔴 `DD-PARTY-006` diz, com todas as letras, que acima do Lv.200 as faixas
 * "serão balanceadas posteriormente". Seguimos com 20, que é a última que o doc
 * fecha — a alternativa seria travar a party em nível alto.
 */
export function sharedXpBand(level: number): number {
  return level <= 100 ? 10 : 20;
}

/**
 * Estes dois níveis ainda dividem XP?
 *
 * 🔴 **Diferença RELATIVA, não faixa fixa.** O doc diz "faixa de
 * aproximadamente 10 níveis", o que comporta as duas leituras — mas a faixa fixa
 * (1–10, 11–20) cria um penhasco absurdo: um Lv.10 e um Lv.11 não poderiam
 * jogar juntos, enquanto um Lv.1 e um Lv.10 poderiam. A relativa não tem esse
 * buraco e entrega a mesma intenção, que é `DD-PARTY-003`.
 *
 * A janela usada é a do **maior** nível dos dois: é o que impede o Lv.101 de
 * usar a janela larga para puxar o Lv.85 e, ao mesmo tempo, o Lv.99 de reclamar
 * de uma janela estreita contra alguém que já está na faixa de 20.
 */
export function sharesXp(levelA: number, levelB: number): boolean {
  return Math.abs(levelA - levelB) <= sharedXpBand(Math.max(levelA, levelB));
}

// ---------------------------------------------------------------------------
// Bônus de grupo
// ---------------------------------------------------------------------------

/**
 * Quanto a XP do monstro cresce por haver mais gente. **Aplicado ANTES da
 * divisão** (`DD-PARTY-009`).
 *
 * ⚠️ REFERÊNCIA — `DD-PARTY-010` deixa os percentuais explicitamente para
 * balanceamento. Mas o número não é livre: o roadmap fecha as duas pontas que
 * ele tem que satisfazer ao mesmo tempo, e elas puxam em direções opostas.
 *
 * ```
 * "solo rende mais por monstro"  →  bonus(n) < n     (a parte de cada um cai)
 * "party rende mais no total"    →  bonus(n) > 1     (o bolo cresce)
 * ```
 *
 * Com 0,10 por membro extra: em dupla, cada um leva 55 % do que levaria sozinho,
 * e o grupo leva 110 % no total. As duas condições valem para qualquer tamanho —
 * `1 + 0,1(n−1) < n` é verdade para todo `n ≥ 2`.
 */
export const PARTY_XP_BONUS_PER_MEMBER = 0.10;

export function partyXpBonus(eligibleCount: number): number {
  if (eligibleCount <= 1) return 1;
  return 1 + PARTY_XP_BONUS_PER_MEMBER * (eligibleCount - 1);
}

// ---------------------------------------------------------------------------
// Distribuição de XP
// ---------------------------------------------------------------------------

/** Um membro, com o que o servidor precisa saber para distribuir a XP. */
export interface PartyMember {
  id: string;
  level: number;
  /**
   * Causou dano à criatura? `DD-PARTY-008` exige **participação válida** — sem
   * isso, entrar no grupo e ficar parado renderia XP.
   */
  participated: boolean;
  /**
   * Estava perto o bastante na hora da morte? Também `DD-PARTY-008`. Separado de
   * `participated` porque são coisas diferentes: dá para bater e fugir.
   */
  nearby: boolean;
}

/**
 * Quem tem direito à XP desta morte.
 *
 * 🔴 **A referência é o membro de MENOR nível entre os participantes**, e essa
 * escolha é o que faz `DD-PARTY-007` funcionar: *"um Lv.300 pode ajudar um Lv.20,
 * mas não divide XP com ele"*.
 *
 * Se a referência fosse o de maior nível, o Lv.20 é que ficaria de fora — o
 * oposto do que o documento quer. Ancorando no menor, quem está muito acima sai
 * da divisão e **a parte de quem ficou não diminui**: ajudar continua sendo
 * ajudar, e nunca vira roubo.
 */
export function eligibleForXp(members: PartyMember[]): PartyMember[] {
  const ativos = members.filter((m) => m.participated && m.nearby);
  if (ativos.length === 0) return [];
  const menorNivel = Math.min(...ativos.map((m) => m.level));
  return ativos.filter((m) => sharesXp(m.level, menorNivel));
}

/**
 * Divide a XP de uma morte entre o grupo.
 *
 * Devolve o mapa `id → xp`. Quem não é elegível simplesmente não aparece — e o
 * que ele deixaria de receber **não é redistribuído**, porque o bônus de grupo já
 * foi calculado só sobre os elegíveis.
 */
export function distributeXp(baseXp: number, members: PartyMember[]): Map<string, number> {
  const out = new Map<string, number>();
  const elegiveis = eligibleForXp(members);
  if (elegiveis.length === 0) return out;
  // A ordem é a do `DD-PARTY-009`: bônus primeiro, divisão depois.
  const total = baseXp * partyXpBonus(elegiveis.length);
  const cada = total / elegiveis.length;
  for (const m of elegiveis) {
    // Piso de 1: matar junto e receber 0 parece bug, não regra.
    out.set(m.id, Math.max(1, Math.round(cada)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Regra de loot
// ---------------------------------------------------------------------------

/** Os três modos do `DD-PARTY-013`. */
export type LootRule = 'random' | 'leader' | 'free';

export const LOOT_RULES: LootRule[] = ['random', 'leader', 'free'];

/**
 * Rótulo de cada modo. `DD-PARTY-014` exige que a regra ativa seja **visível aos
 * membros** — o texto vive aqui para cliente e servidor dizerem a mesma coisa.
 */
export const LOOT_RULE_LABEL: Record<LootRule, string> = {
  random: 'Loot Aleatório — cada item vai para um membro sorteado',
  leader: 'Loot do Líder — tudo vai para quem lidera',
  free: 'Loot Livre — quem chegar primeiro pega',
};

/** Estado de uma votação em andamento (`DD-PARTY-016`). */
export interface LootVote {
  proposal: LootRule;
  /** `id → voto`. Quem não votou não aparece. */
  votes: Map<string, boolean>;
}

/**
 * 🔴 **O líder NÃO muda a regra sozinho** (`DD-PARTY-015`). Depois que a party se
 * forma, alterar exige proposta e votação.
 *
 * E a votação é **travada durante combate de boss** (`DD-PARTY-019`). O motivo é
 * anti-golpe: sem isso, o líder propõe "Loot do Líder" no instante antes de o
 * chefe morrer e leva tudo sozinho.
 */
export function canProposeLootRule(inBossFight: boolean): boolean {
  return !inBossFight;
}

export interface VoteResult {
  approved: boolean;
  favor: number;
  contra: number;
}

/**
 * Apura a votação: **maioria simples** aprova (`DD-PARTY-017`), **empate
 * mantém** a configuração atual (`DD-PARTY-018`).
 *
 * Quem não votou conta como ausente, não como contra — abstenção não deveria
 * pesar igual a uma recusa.
 */
export function tallyLootVote(vote: LootVote): VoteResult {
  let favor = 0;
  let contra = 0;
  for (const v of vote.votes.values()) {
    if (v) favor++;
    else contra++;
  }
  return { approved: favor > contra, favor, contra };
}

/**
 * A regra depois da apuração.
 *
 * ⚠️ `DD-PARTY-020`: a alteração **nunca é retroativa**. Quem chama isto tem que
 * aplicar o resultado só a partir da próxima morte — o loot que já está no chão
 * seguiu a regra antiga e não muda de dono.
 */
export function applyLootVote(atual: LootRule, vote: LootVote): LootRule {
  return tallyLootVote(vote).approved ? vote.proposal : atual;
}

// ---------------------------------------------------------------------------
// Loot de boss por contribuição
// ---------------------------------------------------------------------------

/**
 * Fração do dano total que um jogador precisa ter causado para concorrer aos
 * drops principais de um Boss Global (`DD-PARTY-023`).
 *
 * ⚠️ REFERÊNCIA: `DD-PARTY-024` diz que o percentual "será definido
 * posteriormente". 5 % é ponto de partida — alto o bastante para excluir quem
 * deu um tapa e ficou olhando, baixo o bastante para não punir o curandeiro de
 * um grupo grande.
 */
export const MIN_BOSS_CONTRIBUTION = 0.05;

/**
 * Sorteia quem leva um drop de boss, com o dano causado pesando no sorteio
 * (`DD-PARTY-021`).
 *
 * 🔴 **Last hit não vale nada** (`DD-PARTY-022`). Quem deu o golpe final não
 * entra nesta conta em lugar nenhum — é contribuição acumulada e só. Sem isso, a
 * mecânica premiaria quem fica esperando o chefe cair para roubar o abate.
 *
 * `DD-PARTY-025`: um jogador solo compete normalmente — com 100 % do dano, ele
 * simplesmente ganha sempre.
 */
export function rollBossLootWinner(
  damageByPlayer: Map<string, number>,
  rng: () => number = Math.random,
): string | undefined {
  const total = [...damageByPlayer.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) return undefined;
  const candidatos = [...damageByPlayer.entries()]
    .filter(([, dano]) => dano / total >= MIN_BOSS_CONTRIBUTION);
  if (candidatos.length === 0) return undefined;
  const pesoTotal = candidatos.reduce((s, [, dano]) => s + dano, 0);
  let sorteio = rng() * pesoTotal;
  for (const [id, dano] of candidatos) {
    sorteio -= dano;
    if (sorteio <= 0) return id;
  }
  return candidatos[candidatos.length - 1]![0];
}
