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
import type { WorldEdit, WorldDecal } from './worldedit.js';
import type { Rarity, WeaponType } from './weapons.js';
import type { ProfessionId, Professions } from './crafting.js';
import type { NpcRole } from './tiles.js';
import type { NodeKind } from './gathering.js';

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
  kind: 'player' | 'creature' | 'item' | 'npc' | 'node';
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
  /**
   * Tipo da arma equipada — o cliente escolhe a animação de GOLPE com isto.
   *
   * A arte de classe traz um golpe por família de arma (espada, adaga, lança,
   * arco, cajado), e sem este campo o cliente só saberia a arma do PRÓPRIO
   * jogador: os outros golpeariam sempre de espada, mesmo de arco na mão.
   *
   * Opcional e omitido quando não há arma, no mesmo padrão do `skull` e do
   * `pkEnabled` — desarmado é comum, e mandar `undefined` explícito em toda
   * entidade a cada tique é peso de rede por nada.
   */
  weaponType?: WeaponType;
  /**
   * Cores do outfit, uma por grupo colorível da classe.
   *
   * 🔴 Está aqui **pela mesma razão do `weaponType` acima**: o cliente sabe o
   * outfit do PRÓPRIO jogador, não o dos outros. Sem o campo, todo mundo
   * apareceria com a cor de fábrica da classe, e a customização só existiria
   * para quem a escolheu — que é o mesmo que não existir num jogo multiplayer.
   *
   * Cada número é `0xRRGGBB`, e a posição é o grupo: `[0]` é o grupo 1 daquela
   * classe. ⚠️ **Os grupos são POR CLASSE** — o 1 do Knight é a armadura, o do
   * Arqueiro é a túnica. Ver `docs/PLANO-OUTFITS.md`.
   *
   * Opcional e omitido quando o personagem não tem outfit escolhido, no mesmo
   * padrão do `weaponType` e do `skull`: o padrão é a cor original da arte, e
   * mandar o vetor inteiro em toda entidade a cada tique seria peso de rede
   * para dizer "nada mudou".
   *
   * 🔴 **É COSMÉTICO, e o Doc 1 é explícito** (`13.10`): aparência nunca altera
   * estatística. Nada que leia este campo pode entrar em cálculo de combate.
   */
  outfit?: number[];
  /** Tipo da criatura, para escolher o sprite. */
  creatureType?: string;
  /** Item no chão: tipo e quantidade (ex.: ouro). */
  itemKind?: string;
  amount?: number;
  /** Corpo de jogador: nome de quem morreu (o cliente rotula o cadáver). */
  corpseOwner?: string;
  /**
   * Nó de recurso: que tipo é, para o cliente escolher o desenho.
   *
   * 🔴 **Nó esgotado simplesmente NÃO VEM no snapshot.** Não há campo de
   * "vazio": o nó some do mundo quando acaba e volta quando renasce. Mandá-lo
   * apagado seria pedir ao jogador que descobrisse, por clique, que aquilo não
   * serve — e é exatamente o atrito que a bolsa de loot vazia já ensinou a
   * evitar.
   */
  nodeKind?: NodeKind;
  /**
   * Cargas restantes do nó. Só informativo — o servidor é quem decide se a
   * coleta acontece; isto existe para o cliente poder mostrar que o veio está
   * no fim.
   */
  charges?: number;
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
  /**
   * `token` entra em 2026-09-05 e existe para **trocar de personagem sem
   * redigitar a senha**.
   *
   * 🔴 O botão "Trocar personagem" RECARREGA a página (ver o comentário dele no
   * cliente: não há teardown do jogo, e recarregar dá estado limpo de graça).
   * Como o cliente não guarda senha — de propósito —, a recarga caía na tela de
   * login. Com o token ela volta direto para a lista da conta.
   */
  mode: 'login' | 'register' | 'token';
  username: string;
  password: string;
  /** Só no modo `token`. Emitido pelo servidor no login anterior. */
  token?: string;
}

/**
 * Pedir a exclusão de um personagem. Não apaga: MARCA, com prazo de 24 h para
 * desistir. Quem apaga é o varredor do servidor.
 */
export interface C2S_DeleteChar {
  t: 'deletechar';
  characterId: number;
  /**
   * 🔴 A senha da CONTA, redigitada.
   *
   * Exclusão é a única ação do jogo que destrói progresso sem volta depois do
   * prazo, e a sessão já está autenticada — pedir a senha de novo é o que
   * protege de quem senta no computador destravado.
   */
  password: string;
}

/**
 * 🚪 **Pedir para sair do mundo** (botão "Trocar personagem").
 *
 * 🔴 Precisa ser um PEDIDO, e não uma ação do cliente, porque o servidor é quem
 * sabe se o jogador está em combate. Até 2026-09-05 a troca era só um
 * `location.reload()` — o servidor nem ficava sabendo, e sair no meio de um
 * duelo era de graça.
 *
 * Resposta: `leaveok` libera, `denied` recusa com o tempo que falta.
 */
export interface C2S_Leave {
  t: 'leave';
}

/** Saída autorizada: o cliente pode recarregar e voltar à lista. */
export interface S2C_LeaveOk {
  t: 'leaveok';
}

/** Desistir da exclusão, dentro do prazo. */
export interface C2S_CancelDelete {
  t: 'canceldelete';
  characterId: number;
}

/** Criar personagem na conta já autenticada. */
export interface C2S_CreateChar {
  t: 'createchar';
  name: string;
  charClass: PlayerClass;
  gender: Gender;
  /**
   * A distribuição escolhida na tela de criação — os sete atributos já somados.
   *
   * 🔴 **Viaja inteira, e não como "onde gastei os 38 pontos"**, porque o
   * servidor precisa validar o RESULTADO: `checkAttributes` confere piso 1 e
   * soma 45 de uma vez, sem depender de o cliente ter partido do lugar certo.
   *
   * ⚠️ **Opcional só para não quebrar cliente antigo.** Ausente, o servidor cai
   * na distribuição sugerida da classe (`ClassDef.base`), que é exatamente o
   * comportamento de antes de 02/09.
   */
  attributes?: Attributes;
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

/**
 * Coletar de um nó de recurso (minerar, cortar, colher).
 *
 * Uma mensagem para os cinco nós: o gesto é o mesmo, e o que muda — ferramenta
 * exigida, rendimento, profissão treinada — é atributo do NÓ, que o servidor já
 * conhece pelo id. Mandar "minerar" e "cortar" separados só daria ao cliente a
 * chance de discordar do servidor sobre o que ele está clicando.
 */
export interface C2S_Gather {
  t: 'gather';
  nodeId: string;
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
  | C2S_Leave
  | C2S_CreateChar
  | C2S_DeleteChar
  | C2S_CancelDelete
  | C2S_SetRespawn
  | C2S_MoveIntent
  | C2S_Chat
  | C2S_Decal
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
  | C2S_Gather
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

/**
 * As células de mundo que foram editadas pelo `/remove` — ver
 * `shared/src/worldedit.ts`, que explica por que isto não viola a invariante
 * do `worldgen`.
 *
 * Chega **duas vezes**, e as duas são necessárias:
 * - no login, com `inteira: true` e a lista completa;
 * - a cada `/remove` ou `/restaura`, com a única célula que mudou.
 *
 * 🔴 `inteira` não é um detalhe de otimização: sem ela o cliente não sabe se
 * deve SOMAR à tabela que já tem ou substituí-la, e uma edição desfeita no
 * servidor ficaria viva para sempre na tela de quem estava online.
 */
export interface S2C_WorldEdit {
  t: 'worldedit';
  edits: WorldEdit[];
  /** Verdadeiro só no login: esta lista é o estado completo, não um delta. */
  inteira?: boolean;
  /**
   * Células que voltaram ao terreno original (`/restaura`). Vêm com o tile
   * restaurado em `edits` **e** listadas aqui, para o cliente saber que tem de
   * TIRÁ-LAS da tabela — senão a fazenda continuaria sem desenhar ali.
   */
  desfeitas?: { floor: number; x: number; y: number }[];
}

/**
 * Os objetos que o construtor de mapas posicionou. Mesmo desenho do
 * `S2C_WorldEdit`: a lista inteira no login, o delta a cada mudança.
 */
export interface S2C_Decals {
  t: 'decals';
  decals: WorldDecal[];
  /** Verdadeiro só no login: esta lista é o estado completo. */
  inteira?: boolean;
  /** Ids que saíram (o `/undo`). */
  removidos?: number[];
}

/**
 * *"Põe o que eu selecionei na frente do meu boneco"* — o `/ok` do editor.
 *
 * 🔴 **A célula-alvo NÃO vem daqui**, e é de propósito: quem sabe onde o
 * personagem está e para onde ele olha é o servidor. O cliente manda só o que é
 * escolha de interface — qual sprite, girado quanto, em que altura.
 */
export interface C2S_Decal {
  t: 'decal';
  paleta: number;
  rot: number;
  camada: 'chao' | 'baixo' | 'acima';
  /** O que a peça faz com o passo. Ver `WorldDecal.colisao`. */
  colisao?: 'nada' | 'bloqueia' | 'livre';
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
  /**
   * Token de sessão, emitido a cada login bem-sucedido.
   *
   * O cliente guarda em `sessionStorage` — não em `localStorage`, e a diferença
   * é a intenção: `sessionStorage` morre quando a aba fecha, então o token vale
   * para a sessão do navegador e não vira "lembrar de mim" que ninguém pediu.
   *
   * ⚠️ **Vive só na MEMÓRIA do servidor.** Reiniciar o servidor invalida todos
   * — o que é aceitável para o que ele resolve (trocar personagem) e evita uma
   * coluna nova no banco para guardar credencial.
   */
  token?: string;
}

/** Um personagem na tela de seleção. */
export interface CharacterSlot {
  /**
   * Instante em que o personagem some de vez, quando a exclusão foi pedida.
   *
   * ⚠️ Ele CONTINUA na lista enquanto o prazo corre, de propósito: o jogador
   * precisa ver que marcou, e precisa de um lugar de onde desistir. Ausente = a
   * exclusão não foi pedida.
   */
  deleteAt?: number;
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
  /** ✨ Proteção Mágica ligada (Feiticeiro). */
  magicProtectionActive: boolean;
  /** Poder de cura — o que WIS constrói e o que a Cura multiplica. */
  healPower: number;
  /**
   * Buffs e debuffs ativos, para a barra de estado do cliente.
   *
   * A duração restante vai junto, ao contrário das condições do snapshot: buff
   * é decisão de jogo ("dá tempo de entrar no MVP com a bênção?"), e para essa
   * decisão o jogador precisa do número, não só do ícone.
   */
  effects: { id: string; name: string; good: boolean; remainingMs: number }[];
  /** Conjuração em andamento: id da magia e quanto falta. `null` = nenhuma. */
  casting: { spell: string; remainingMs: number } | null;
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

/**
 * Alguém foi CURADO. Separada de `hit` de propósito: o cliente pinta em verde,
 * não em vermelho, e não conta como agressão para nada.
 */
export interface S2C_Heal {
  t: 'heal';
  targetId: string;
  /** Quem curou — é como o alvo sabe a quem agradecer. */
  sourceId: string;
  amount: number;
  hp: number;
  maxHp: number;
}

/**
 * Conjuração começou ou parou (vai só para quem conjura).
 *
 * `spell: null` significa "acabou ou foi interrompida" — o cliente esconde a
 * barra sem precisar saber por quê.
 */
export interface S2C_Casting {
  t: 'casting';
  spell: string | null;
  ms: number;
}

/** Uma área persistente nasceu no chão (muralha, nevasca, santuário…). */
export interface S2C_AreaSpawn {
  t: 'area';
  id: string;
  skill: string;
  kind: string;
  x: number;
  y: number;
  floor: number;
  radius: number;
  durationMs: number;
  fx: string;
}

/** Uma área persistente acabou (ou foi substituída). */
export interface S2C_AreaGone {
  t: 'areagone';
  id: string;
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

/**
 * Uma coleta deu certo (vai só para quem coletou).
 *
 * Existe em vez de um `chat` seco porque a coleta precisa aparecer **no mundo**,
 * onde os olhos do jogador estão: o número sobe do nó, como o dano sobe do
 * monstro. Recompensa que só aparece no rodapé do chat é recompensa que passa
 * despercebida.
 */
export interface S2C_Gathered {
  t: 'gathered';
  /** Onde flutuar o texto. */
  x: number;
  y: number;
  /** O que saiu, e quanto. */
  itemKind: string;
  amount: number;
  /** Profissão treinada e quanto rendeu. */
  profession: ProfessionId;
  xp: number;
  /** Nível novo, quando a coleta subiu a profissão. */
  levelUp?: number;
  /** O nó acabou com esta coleta (o cliente já pode apagá-lo da tela). */
  depleted: boolean;
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
  | S2C_LeaveOk
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
  | S2C_Heal
  | S2C_Casting
  | S2C_AreaSpawn
  | S2C_AreaGone
  | S2C_CorpseContents
  | S2C_Gathered
  | S2C_Died
  | S2C_Respawn
  | S2C_LevelUp
  | S2C_Inventory
  | S2C_Party
  | S2C_PartyInvite
  | S2C_Friends
  | S2C_WorldEdit
  | S2C_Decals;

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
