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
  npcRole?: 'vendor';
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
  | C2S_UseItem
  | C2S_Equip
  | C2S_Unequip
  | C2S_StoreMove
  | C2S_Cast
  | C2S_SkillUp
  | C2S_SkillReset
  | C2S_OpenCorpse
  | C2S_LootCorpse;

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
  | S2C_Inventory;

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
