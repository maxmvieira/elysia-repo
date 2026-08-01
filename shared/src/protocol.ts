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
import type { SkullKind } from './pvp.js';
import type { LootRule } from './party.js';
import type { DayPhase } from './daynight.js';
import type { Rarity } from './weapons.js';
import type { Professions } from './crafting.js';
import type { NpcRole } from './tiles.js';

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
  /**
   * Flag de PK deste jogador (32.57–32.61). O cliente usa para desenhar o
   * indicador e para saber se "Atacar" no menu vai dar em algo.
   *
   * Vai no snapshot público de propósito: PK é informação que o jogador PRECISA
   * ver no outro antes de chegar perto. Não é escudo — quem está com ele ligado
   * pode agredir quem está com ele desligado —, mas é aviso.
   */
  pkEnabled?: boolean;
  /**
   * ⚪ Caveira ativa. Hoje só a branca (agrediu alguém há pouco).
   *
   * 🔴 Isto **tem** de ser público, mais do que o `pkEnabled`: a caveira é o
   * que diz a todo mundo em volta que aquele jogador virou alvo livre e que
   * atacá-lo não custa nada. Uma caveira invisível não cumpre função nenhuma.
   */
  skull?: SkullKind;
  /**
   * Grupo a que este jogador pertence, quando há. O cliente pinta o nome dos
   * companheiros e o menu de contexto troca "Convidar" por "Expulsar".
   */
  partyId?: string;
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

/**
 * Reorganizar itens DENTRO da mochila ou do depósito.
 *
 * 🔴 Puro arranjo: nada entra, nada sai, nada muda de dono. O servidor troca as
 * duas posições — ou **funde** as pilhas, quando são do mesmo empilhável. Fundir
 * é o que faz o gesto valer a pena: arrastar 3 poções sobre 5 e ficar com 8 num
 * slot só é o motivo de existir arrastar.
 */
export interface C2S_MoveItem {
  t: 'moveitem';
  from: number;
  to: number;
  where: 'backpack' | 'depot';
}

/**
 * Pegar um item do chão à distância de um braço.
 *
 * ⚠️ **Não substitui o recolhimento automático ao pisar em cima** — soma-se a
 * ele. Quem quer correr por cima do loot continua podendo; quem quer escolher o
 * que pega, agora clica.
 *
 * O alcance é validado no SERVIDOR (como tudo): sem isso, o cliente pegaria item
 * do outro lado do mapa mandando um id.
 */
export interface C2S_PickUp {
  t: 'pickup';
  itemId: string;
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
  /**
   * Tile ALVO do arremesso — para onde o mouse apontava ao soltar.
   *
   * Ausente = cai aos pés do jogador (é o que o botão direito faz, porque ali
   * não há posição de mouse envolvida).
   *
   * 🔴 O servidor NUNCA confia nisto. Ele valida alcance (`DROP_THROW_RANGE`),
   * andabilidade e andar antes de usar — é coordenada vinda do cliente, e
   * aceitá-la de olhos fechados deixaria qualquer um plantar item do outro lado
   * do mapa.
   */
  tileX?: number;
  tileY?: number;
}

/**
 * Empurrar um item que JÁ ESTÁ no chão para outro tile, arrastando com o mouse.
 *
 * É o gesto do Tibia: dá para ir levando a pilha de tile em tile sem pegá-la, o
 * que serve para organizar loot, desobstruir passagem e deixar coisa marcada
 * onde se quer.
 *
 * Mesmas travas do arremesso: o servidor confere que o jogador ALCANÇA o item
 * (`PICKUP_RANGE`) e que o destino está dentro de `DROP_THROW_RANGE` e é
 * andável — senão daria para varrer item pelo mapa inteiro à distância.
 */
export interface C2S_MoveGroundItem {
  t: 'movegrounditem';
  /** Id da pilha no chão. */
  itemId: string;
  tileX: number;
  tileY: number;
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

/**
 * Ligar/desligar o flag de PK (32.57–32.61).
 *
 * 🔴 É intenção, como todo o resto: o servidor decide. Em particular ele impõe
 * o tempo mínimo com PK ligado — desligar no meio da briga para virar intocável
 * é exatamente o golpe que o flag não pode permitir.
 */
export interface C2S_SetPk {
  t: 'pk';
  on: boolean;
}

/**
 * Ações de grupo (cap. 35). Uma mensagem para todas, com `action` discriminando:
 * são cinco verbos pequenos sobre o mesmo objeto, e cinco tipos separados só
 * inchariam a união sem ganhar nada em tipagem.
 */
export interface C2S_Party {
  t: 'party';
  action:
    | 'invite' | 'accept' | 'decline' | 'leave' | 'kick' | 'promote'
    // Distribuição de loot (`DD-PARTY-013..020`), vinda do merge de 2026-07-30.
    | 'loot' | 'vote';
  /** Alvo da ação. Ausente em `leave`. Em `accept`/`decline`, quem convidou. */
  targetId?: string;
  /**
   * Alvo por NOME, alternativa ao `targetId`.
   *
   * 🔴 As duas formas existem porque as duas entradas existem: o **menu de
   * contexto** clica num jogador visível e tem o id dele do snapshot; o
   * **comando de chat** (`/convidar Fulano`) só tem o que a pessoa digitou. Exigir
   * id mataria o comando; exigir nome obrigaria o menu a resolver nome de volta.
   */
  name?: string;
  /** Só em `loot`: a regra PROPOSTA (`DD-PARTY-015` — não é aplicação direta). */
  rule?: LootRule;
  /** Só em `vote`. */
  agree?: boolean;
}

/**
 * Lista de amigos.
 *
 * ⚠️ **Sistema sem respaldo documental.** Não aparece em nenhum dos quatro
 * documentos — não está marcado `PENDENTE`, simplesmente não existe. Foi pedido
 * pelo dono em 2026-07-30, que decidiu o escopo: **da CONTA**, pela mesma lógica
 * do `DD-MAP-010` (geografia descoberta e marcadores pendem da conta; só o
 * ponto de respawn é do personagem).
 *
 * Por isso o alvo é o **nome**, não o id de sessão: adiciona-se um amigo que
 * está offline, e o vínculo tem que sobreviver à troca de personagem dos dois
 * lados.
 */
export interface C2S_Friend {
  t: 'friend';
  action: 'add' | 'remove';
  name: string;
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
  | C2S_MoveItem
  | C2S_PickUp
  | C2S_Cast
  | C2S_SkillUp
  | C2S_SkillReset
  | C2S_OpenCorpse
  | C2S_LootCorpse
  | C2S_Craft
  | C2S_Drop
  | C2S_MoveGroundItem
  | C2S_SetPk
  | C2S_Party
  | C2S_Friend;

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
  /**
   * Fase do ciclo. `night` continua vindo à parte porque é o que liga os
   * multiplicadores de combate — e a **tarde não conta como noite**.
   *
   * Opcional para o cliente antigo não quebrar durante um deploy parcial.
   */
  phase?: DayPhase;
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
  /** Nome de quem morreu, ou da criatura que largou a bolsa. */
  owner: string;
  items: (ItemStack | null)[];
  /** Segundos até o corpo sumir. */
  secondsLeft: number;
  /**
   * De onde veio este espólio.
   *
   * `player` é o corpo de quem morreu; `creature` é a **bolsa de loot** que a
   * criatura larga. Muda só o desenho e o texto — as regras de saque (estar
   * perto, qualquer um pode abrir, some com o tempo) são as mesmas para os dois.
   *
   * Ausente = `player`, para não quebrar cliente antigo.
   */
  source?: 'player' | 'creature';
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

/** Um companheiro de grupo, do jeito que o HUD precisa dele. */
export interface PartyMemberView {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  charClass: PlayerClass;
  /** Está no mesmo andar e perto o bastante para o grupo funcionar. */
  nearby: boolean;
  /**
   * Divide XP com o dono deste cliente?
   *
   * 🔴 É a informação que mais surpreende: quem chama um amigo de nível muito
   * diferente não entende por que não ganha XP, e sem dizer isso na cara a regra
   * do `DD-PARTY-007` parece bug.
   */
  sharesXp: boolean;
}

/**
 * O grupo do jogador mudou. `party: null` = ele não está em nenhum.
 *
 * Reenviado inteiro a cada mudança em vez de por delta: um grupo tem no máximo
 * `PARTY_MAX` membros, e delta de lista pequena é complexidade sem ganho.
 */
export interface S2C_Party {
  t: 'party';
  party: {
    id: string;
    leaderId: string;
    members: PartyMemberView[];
    /**
     * Regra de loot ativa. `DD-PARTY-014` exige que ela seja **visível aos
     * membros** — é o tipo de coisa que o jogador só descobre que precisava
     * saber depois de perder um item.
     */
    lootRule: LootRule;
    /** Votação em aberto, se houver (`DD-PARTY-016`). */
    vote?: {
      proposal: LootRule;
      favor: number;
      contra: number;
      /** Este jogador ainda não votou? */
      pending: boolean;
    };
  } | null;
}

/** Chegou um convite de grupo. O cliente mostra aceitar/recusar. */
export interface S2C_PartyInvite {
  t: 'partyinvite';
  fromId: string;
  fromName: string;
  /** Quando o convite expira, em ms epoch — o cliente conta o tempo na tela. */
  expiresAt: number;
}

/** A lista de amigos da CONTA (ver `C2S_Friend`). */
export interface S2C_Friends {
  t: 'friends';
  list: Array<{
    name: string;
    /** Algum personagem desta conta-amiga está jogando agora. */
    online: boolean;
    /** Nome do personagem online, quando há. */
    charName?: string;
  }>;
}

/*
 * ⚠️ **Não existe um `S2C_PlayerInfo`, e é de propósito.** O "informações
 * básicas" do menu de contexto é montado no cliente a partir do próprio
 * snapshot — nome, nível, classe, vida, PK e grupo já viajam nele a 15 Hz. Pedir
 * ao servidor para reenviar o que o cliente acabou de receber seria uma ida e
 * volta para nada, e mais um tipo de mensagem para manter.
 *
 * 🔴 O limite do que a ficha mostra é o que já é público no mundo. Atributos,
 * equipamento e ouro ficam de fora: inspecionar a build alheia é decisão de
 * design que nenhum documento tomou, e é muito mais fácil acrescentar campo
 * depois do que tirar um que os jogadores já usam.
 */

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
  | S2C_PartyInvite
  | S2C_Friends;

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
