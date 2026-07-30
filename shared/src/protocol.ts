/**
 * Protocolo de rede cliente <-> servidor.
 *
 * Princípio central (doc 5.2 / 15): o cliente envia INTENÇÕES, nunca fatos.
 * O servidor é autoritativo e responde com o estado real do mundo.
 *
 * Todas as mensagens são objetos JSON com um campo discriminante `t` (type).
 * Manteremos o protocolo pequeno e versionado; ele cresce por milestone.
 */

import type { Direction, Gender } from './constants.js';
import type { AttributeKey, Attributes, AttackType, PlayerClass } from './stats.js';
import type { EquipSlot, ItemStack } from './items.js';
import type { DamageType } from './elements.js';
import type { ConditionId } from './conditions.js';
import type { Rarity } from './weapons.js';
import type { Professions } from './crafting.js';
import type { NpcRole } from './tiles.js';
import type { LootRule } from './party.js';

/** Versão do protocolo. Incrementar em mudanças incompatíveis. */
export const PROTOCOL_VERSION = 1;

/** Estado público de uma entidade visível no mundo. */
export interface EntitySnapshot {
  id: string;
  name: string;
  /** Posição em coordenadas de tile. */
  tileX: number;
  tileY: number;
  /** Andar (z-level) — múltiplos andares estilo Tibia (doc 6.1). */
  floor: number;
  direction: Direction;
  kind: 'player' | 'creature' | 'item' | 'npc';
  /** Papel do NPC (ex.: 'vendor' abre a loja ao clicar). */
  npcRole?: NpcRole;
  /** Vida atual/máxima (jogador e criatura). */
  hp?: number;
  maxHp?: number;
  /** Nível (jogador). */
  level?: number;
  /** Classe do jogador, para o cliente escolher o sprite certo (todos os jogadores). */
  charClass?: PlayerClass;
  /** Sexo do personagem (define a variante do sprite quando há arte). */
  gender?: Gender;
  /** Tipo da criatura, para escolher o sprite. */
  creatureType?: string;
  /** Item no chão: tipo e quantidade (ex.: ouro). */
  itemKind?: string;
  amount?: number;
  /** Corpo de jogador: nome de quem morreu (o cliente rotula o cadáver). */
  corpseOwner?: string;
  /**
   * Condições ativas (Etapa 8), para o cliente desenhar os ícones de estado.
   *
   * Só os ids: a duração restante não vai no snapshot porque o relógio do
   * cliente não é confiável e o servidor manda a lista a cada tique de qualquer
   * forma. Ausente ou vazio = nenhuma condição.
   */
  conditions?: ConditionId[];
}

// ----------------------------------------------------------------------------
// Cliente -> Servidor (intenções)
// ----------------------------------------------------------------------------

/**
 * Entrada no jogo com um personagem JÁ PERSISTIDO.
 *
 * A partir da etapa 7 o fluxo é: `auth` -> `charlist` -> `hello`. O cliente não
 * manda mais nome/classe aqui: isso vive no banco. Manda só qual personagem da
 * conta quer jogar — e o servidor confere que ele pertence à sessão.
 */
export interface C2S_Hello {
  t: 'hello';
  protocol: number;
  characterId: number;
}

/** Login ou criação de conta. */
export interface C2S_Auth {
  t: 'auth';
  protocol: number;
  mode: 'login' | 'register';
  username: string;
  password: string;
}

/** Criar personagem na conta já autenticada. */
export interface C2S_CreateChar {
  t: 'createchar';
  name: string;
  charClass: PlayerClass;
  gender: Gender;
}

/**
 * Definir o ponto de renascimento. Só passa se ESTE personagem já visitou a
 * cidade fisicamente — conhecer o mapa (que é da conta) não basta (40.21).
 */
export interface C2S_SetRespawn {
  t: 'setrespawn';
  town: string;
}

export interface C2S_MoveIntent {
  t: 'move';
  /** Número sequencial do input, para reconciliação (doc 6.3). */
  seq: number;
  /** Passo desejado em tiles: dx, dy ∈ {-1, 0, 1}. Diagonal quando ambos ≠ 0. */
  dx: number;
  dy: number;
}

export interface C2S_Chat {
  t: 'chat';
  text: string;
}

export interface C2S_Ping {
  t: 'ping';
  time: number;
}

/** Selecionar um alvo e iniciar auto-ataque (estilo Tibia). */
export interface C2S_Attack {
  t: 'attack';
  targetId: string;
}

/** Cancelar o alvo atual. */
export interface C2S_CancelAttack {
  t: 'cancel';
}

/** Gastar 1 ponto de atributo (concedidos ao subir de nível). */
export interface C2S_Allocate {
  t: 'allocate';
  attr: AttributeKey;
}

/** Comprar um item do NPC comerciante (precisa estar perto dele). */
export interface C2S_Buy {
  t: 'buy';
  kind: string;
}

/**
 * Vender um item da mochila ao comerciante (precisa estar perto dele).
 *
 * Vai por ÍNDICE da mochila, não por `kind`, e isso não é detalhe: duas espadas
 * curtas podem ter raridades diferentes, e o preço sai do `roll` daquele slot. Por
 * `kind` o servidor não saberia qual das duas o jogador quis vender.
 */
export interface C2S_Sell {
  t: 'sell';
  index: number;
  /** Quantas unidades de uma pilha. Ausente = 1. Ignorado em equipamento. */
  amount?: number;
}

/**
 * Depositar ou sacar ouro no Banco (precisa estar perto do Banqueiro).
 *
 * O Banco guarda **só ouro** — decisão do dono. O que guarda item é o Depósito,
 * e o cap. 19 do Doc 1 separa os dois ("CASA ≠ BANCO").
 */
export interface C2S_Bank {
  t: 'bank';
  op: 'deposit' | 'withdraw';
  /** Quantidade. O servidor limita ao que existe do lado de origem. */
  amount: number;
}

/** Usar um item consumível da mochila (poção). */
export interface C2S_UseItem {
  t: 'use';
  index: number;
}

/** Equipar um item da mochila no slot correspondente. */
export interface C2S_Equip {
  t: 'equip';
  index: number;
}

/** Desequipar o item de um slot (volta para a mochila). */
export interface C2S_Unequip {
  t: 'unequip';
  slot: EquipSlot;
}

/** Mover item entre mochila e depósito (só perto do baú/DP). `to` = destino. */
export interface C2S_StoreMove {
  t: 'store';
  index: number;
  to: 'depot' | 'backpack';
}

/** Usar uma habilidade da barra de atalhos (F1, F2, …). */
export interface C2S_Cast {
  t: 'cast';
  /** Id da habilidade (ver SKILLS em skills.ts). */
  spell: string;
}

/**
 * Fabricar um equipamento na bancada do Ferreiro (`DD-PROF-022`/`026`).
 *
 * O jogador escolhe o QUE fabricar (`DD-PROF-026`: a receita define a categoria,
 * não o tipo de peça) e QUAIS fragmentos pôr na bancada — a proporção deles é o
 * que define a chance de cada raridade.
 *
 * Só intenção: o servidor revalida tudo, sorteia e é a autoridade sobre o
 * resultado. O cliente nunca decide raridade.
 */
export interface C2S_Craft {
  t: 'craft';
  /** `kind` do equipamento desejado. */
  kind: string;
  /** Raridade da receita a consumir. */
  recipeRarity: Rarity;
  /** Quantos fragmentos de cada raridade colocar. */
  fragments: Partial<Record<Rarity, number>>;
}

/**
 * Soltar um item da mochila no chão.
 *
 * Serve de área de descarte temporária para gerir inventário: solta o excesso,
 * decide o que vale voltar a pegar, e o que sobra desaparece sozinho depois de
 * alguns minutos.
 *
 * ⚠️ Qualquer jogador pode pegar o que foi solto. Não existe "meu item no chão".
 */
export interface C2S_Drop {
  t: 'drop';
  /** Índice do slot da mochila. */
  slot: number;
  /** Quantas unidades soltar. Ausente ou maior que a pilha = solta tudo. */
  amount?: number;
}

/** Abrir o corpo de alguém que morreu (precisa estar perto). */
export interface C2S_OpenCorpse {
  t: 'opencorpse';
  corpseId: string;
}

/** Retirar um item do corpo aberto. */
export interface C2S_LootCorpse {
  t: 'loot';
  corpseId: string;
  index: number;
}

/** Gastar Skill Points para subir uma habilidade um nível. */
export interface C2S_SkillUp {
  t: 'skillup';
  skill: string;
}

/** Resetar todos os Skill Points (custa ouro, cada vez mais caro). */
export interface C2S_SkillReset {
  t: 'skillreset';
}

// --- Party (Etapa 9, `DD-PARTY-001` a `026`) --------------------------------
//
// 🔴 O convite é por NOME, não por id. O id de jogador é interno e o cliente não
// tem como descobrir o do vizinho sem uma busca própria — pedir o nome é o que o
// jogador consegue digitar depois de ver alguém na tela.

/** Convidar alguém para a party. Quem convida vira líder se ainda não houver uma. */
export interface C2S_PartyInvite {
  t: 'partyinvite';
  name: string;
}

/** Responder a um convite pendente. */
export interface C2S_PartyRespond {
  t: 'partyrespond';
  accept: boolean;
}

/** Sair da party. Se o líder sai, a liderança passa ao membro mais antigo. */
export interface C2S_PartyLeave {
  t: 'partyleave';
}

/** Expulsar um membro. Só o líder. */
export interface C2S_PartyKick {
  t: 'partykick';
  playerId: string;
}

/**
 * Propor uma regra de loot.
 *
 * 🔴 `DD-PARTY-015`: o líder **não** muda a regra sozinho — isto abre uma
 * votação, não aplica nada.
 */
export interface C2S_PartyProposeLoot {
  t: 'partyproposeloot';
  rule: LootRule;
}

/** Votar na proposta em aberto (`DD-PARTY-016`). */
export interface C2S_PartyVote {
  t: 'partyvote';
  agree: boolean;
}

export type ClientMessage =
  | C2S_Hello
  | C2S_Auth
  | C2S_CreateChar
  | C2S_SetRespawn
  | C2S_MoveIntent
  | C2S_Chat
  | C2S_Ping
  | C2S_Attack
  | C2S_CancelAttack
  | C2S_Allocate
  | C2S_Buy
  | C2S_Sell
  | C2S_Bank
  | C2S_UseItem
  | C2S_Equip
  | C2S_Unequip
  | C2S_StoreMove
  | C2S_Cast
  | C2S_SkillUp
  | C2S_SkillReset
  | C2S_OpenCorpse
  | C2S_LootCorpse
  | C2S_Craft
  | C2S_Drop
  | C2S_PartyInvite
  | C2S_PartyRespond
  | C2S_PartyLeave
  | C2S_PartyKick
  | C2S_PartyProposeLoot
  | C2S_PartyVote;

// ----------------------------------------------------------------------------
// Servidor -> Cliente (fatos autoritativos)
// ----------------------------------------------------------------------------

export interface S2C_Welcome {
  t: 'welcome';
  protocol: number;
  /** Id atribuído ao jogador desta conexão. */
  playerId: string;
  serverTickHz: number;
}

export interface S2C_Snapshot {
  t: 'snapshot';
  /** Tick do servidor em que este snapshot foi produzido. */
  tick: number;
  entities: EntitySnapshot[];
  /** Último input do jogador confirmado pelo servidor (doc 6.3). */
  ackSeq: number;
  /** Hora do mundo 0..24 (ciclo dia/noite). Cliente deriva relógio e escuridão. */
  hour: number;
  /** True quando é noite (monstros ficam mais fortes/rápidos e avermelhados). */
  night: boolean;
}

export interface S2C_Chat {
  t: 'chat';
  from: string;
  text: string;
}

export interface S2C_Denied {
  t: 'denied';
  /** Feedback claro quando o servidor recusa uma ação (doc 16). */
  reason: string;
}

/** Resposta ao `auth`. Em caso de erro, `message` já vem pronta para a tela. */
export interface S2C_AuthResult {
  t: 'authresult';
  ok: boolean;
  username?: string;
  message?: string;
}

/** Um personagem na tela de seleção. */
export interface CharacterSlot {
  id: number;
  name: string;
  charClass: PlayerClass;
  gender: Gender;
  level: number;
}

/** Lista de personagens da conta — enviada após login e após criar/entrar. */
export interface S2C_CharList {
  t: 'charlist';
  characters: CharacterSlot[];
  /** Preenchido quando a criação falhou (nome tomado, palavrão, etc.). */
  error?: string;
}

/** Cidades que este personagem já visitou e onde ele renasce hoje. */
export interface S2C_Towns {
  t: 'towns';
  visited: string[];
  respawn: string;
}

export interface S2C_Pong {
  t: 'pong';
  time: number;
}

/** Estado do próprio personagem (vai só para o dono). */
export interface S2C_Stats {
  t: 'stats';
  charClass: PlayerClass;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpNext: number;
  gold: number;
  /** Ouro guardado no Banco (só ouro; itens ficam no Depósito). */
  bankGold: number;
  alive: boolean;
  /** Atributos e pontos disponíveis. */
  attributes: Attributes;
  unspentPoints: number;
  talentPoints: number;
  /** Skill que sobe com o uso. */
  skillKind: string;
  skillLevel: number;
  skillProgress: number;
  skillThreshold: number;
  /** Resumo dos stats derivados (para exibição). */
  physAtk: number;
  magicAtk: number;
  critChance: number;
  defense: number;
  magicResist: number;
  dodgeChance: number;
  attackType: AttackType;
  /** Alcance de ataque em tiles (distância de Chebyshev). Usado p.ex. na Battle list. */
  attackRange: number;
  /** Cadência de movimento/ataque em ms (para exibir a velocidade e progressão). */
  moveIntervalMs: number;
  attackCooldownMs: number;
  /** Skill Points ainda não gastos. */
  skillPoints: number;
  /** Nível de cada habilidade (0/ausente = não aprendida). */
  skillLevels: Record<string, number>;
  /** Quantos resets de skill já foram feitos (define o custo do próximo). */
  skillResets: number;
  /** Fúria de Batalha em curso (drenando vida). */
  furyActive: boolean;
  /** Postura Defensiva ligada. */
  stanceActive: boolean;
  /** Maestria por tipo de arma (sobe com o uso, sem teto). */
  proficiencies: Record<string, { level: number; progress: number }>;
  /** O que o jogador já descobriu de cada criatura. */
  bestiary: Record<string, { encountered: boolean; kills: number; variants: string[] }>;
  /** Níveis de profissão, para a bancada mostrar o nível de Ferreiro. */
  professions: Professions;
}

/** Um golpe aplicado (para números de dano flutuantes e barras). */
export interface S2C_Hit {
  t: 'hit';
  attackerId: string;
  targetId: string;
  amount: number;
  crit: boolean;
  /** Golpe esquivado (dano 0). */
  dodged: boolean;
  /**
   * Tipo de dano (Etapa 8), para o número flutuante sair na cor do elemento.
   * Ausente = físico, que é a esmagadora maioria dos golpes.
   */
  element?: DamageType;
  /** Parcela de DoT (veneno/sangramento/queimadura), não um golpe direto. */
  dot?: boolean;
  /** Vida do alvo após o golpe. */
  hp: number;
  maxHp: number;
  fatal: boolean;
  /** XP concedida ao atacante quando o golpe mata a criatura (só no golpe fatal). */
  xp?: number;
}

/** Projétil visual (flecha/feitiço) do atacante até um ponto. */
export interface S2C_Projectile {
  t: 'projectile';
  fromId: string;
  toX: number;
  toY: number;
  floor: number;
  kind: string;
}

/**
 * Confirmação de conjuração (vai só para quem conjurou). O cliente só inicia a
 * animação de cooldown do slot quando o SERVIDOR aceita — nada de adivinhar.
 */
export interface S2C_Cast {
  t: 'cast';
  spell: string;
  cooldownMs: number;
}

/** Efeito visual sem dano próprio (explosão de área, rastro de investida…). */
export interface S2C_Effect {
  t: 'fx';
  /** Tipo do efeito (ver `fx` em SPELLS). */
  kind: string;
  /** Centro do efeito, em tiles. */
  x: number;
  y: number;
  floor: number;
  /** Raio em tiles, quando o efeito é de área. */
  radius?: number;
}

/** O próprio jogador morreu. */
export interface S2C_Died {
  t: 'died';
  /** Nome de quem/o que matou. */
  by: string;
  /** XP perdida na morte (para o jogador entender o custo). */
  xpLost: number;
  /** Níveis perdidos, quando a XP não foi suficiente. */
  levelsLost: number;
  /** Onde ficou o corpo, para o jogador saber aonde voltar. */
  corpseX: number;
  corpseY: number;
}

/** Conteúdo de um corpo aberto (vai só para quem abriu). */
export interface S2C_CorpseContents {
  t: 'corpse';
  corpseId: string;
  /** Nome de quem morreu. */
  owner: string;
  items: (ItemStack | null)[];
  /** Segundos até o corpo sumir. */
  secondsLeft: number;
}

/** O próprio jogador renasceu. */
export interface S2C_Respawn {
  t: 'respawn';
}

/** Subiu de nível. */
export interface S2C_LevelUp {
  t: 'levelup';
  level: number;
}

/** Estado do inventário do dono (mochila + equipamento + depósito). */
export interface S2C_Inventory {
  t: 'inventory';
  backpack: (ItemStack | null)[];
  equipment: Partial<Record<EquipSlot, ItemStack>>;
  depot: (ItemStack | null)[];
  /** True quando o jogador está no Depósito (pode mover itens p/ o baú). */
  atDepot: boolean;
  /** True quando está perto do NPC comerciante (pode comprar). */
  nearVendor: boolean;
  /** True quando está perto do Banqueiro (pode depositar/sacar). */
  nearBank: boolean;
}

/** Um membro, como o cliente precisa vê-lo no painel. */
export interface PartyMemberView {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  leader: boolean;
  /**
   * Divide XP com o dono deste cliente? `DD-PARTY-014` exige que a regra ativa
   * seja visível — e a elegibilidade é a informação que mais surpreende quem
   * chama um amigo de nível muito diferente e não entende por que não ganha XP.
   */
  sharesXp: boolean;
}

/**
 * Estado completo da party. Reenviado inteiro a cada mudança — é estado pequeno
 * (até um punhado de membros) e mandar o todo evita toda uma classe de bug de
 * sincronização parcial.
 *
 * `members` vazio = o jogador não está em party nenhuma.
 */
export interface S2C_Party {
  t: 'party';
  members: PartyMemberView[];
  lootRule: LootRule;
  /** Votação em aberto, se houver (`DD-PARTY-016`). */
  vote?: {
    proposal: LootRule;
    favor: number;
    contra: number;
    /** Este jogador ainda não votou? */
    pending: boolean;
  };
}

/** Convite recebido, esperando resposta. */
export interface S2C_PartyInvited {
  t: 'partyinvited';
  fromName: string;
  /** Regra de loot que a party já usa, para decidir sabendo (`DD-PARTY-014`). */
  lootRule: LootRule;
}

export type ServerMessage =
  | S2C_Welcome
  | S2C_AuthResult
  | S2C_CharList
  | S2C_Towns
  | S2C_Snapshot
  | S2C_Chat
  | S2C_Denied
  | S2C_Pong
  | S2C_Stats
  | S2C_Hit
  | S2C_Projectile
  | S2C_Cast
  | S2C_Effect
  | S2C_CorpseContents
  | S2C_Died
  | S2C_Respawn
  | S2C_LevelUp
  | S2C_Inventory
  | S2C_Party
  | S2C_PartyInvited;

// ----------------------------------------------------------------------------
// Helpers de serialização (um só ponto para trocar JSON por binário depois)
// ----------------------------------------------------------------------------

export function encode(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg);
}

export function decodeClientMessage(raw: string): ClientMessage | null {
  try {
    const obj = JSON.parse(raw) as ClientMessage;
    return obj && typeof obj.t === 'string' ? obj : null;
  } catch {
    return null;
  }
}

export function decodeServerMessage(raw: string): ServerMessage | null {
  try {
    const obj = JSON.parse(raw) as ServerMessage;
    return obj && typeof obj.t === 'string' ? obj : null;
  } catch {
    return null;
  }
}
