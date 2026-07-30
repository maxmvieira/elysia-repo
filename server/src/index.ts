/**
 * Servidor autoritativo do Project Dominion 2D.
 *
 * Combate com ATRIBUTOS e CLASSES:
 *  - 4 classes jogáveis (Knight/Sorcerer/Archer/Assassin) — o Druid é a 5ª e
 *    entra na etapa 15 do roadmap; Priest não existe;
 *  - 7 atributos (STR/VIT/AGI/DEX/INT/WIS/LUK); 10 pontos por nível gastos numa
 *    tabela de custo crescente;
 *  - skill que sobe com o uso (melee/distance/magic);
 *  - ataques à distância/mágicos disparam projéteis e custam mana;
 *  - stats derivados calculados no servidor (dano, crítico, esquiva, etc.).
 *
 * Ainda em memória — persistência é a etapa 7 (ver docs/ROADMAP-elysia.md).
 */

import { WebSocketServer, type WebSocket } from 'ws';
import {
  ATTRIBUTE_KEYS,
  attributeCost,
  BACKPACK_SIZE,
  CLASSES,
  CREATURES,
  DEFAULT_SERVER_PORT,
  DEPOT_SIZE,
  DIRECTION_VECTORS,
  EQUIP_SLOTS,
  GOLD_TIERS,
  ITEMS,
  NIGHT_SPEED_MULT,
  POINTS_PER_LEVEL,
  PROTOCOL_VERSION,
  SERVER_TICK_HZ,
  SERVER_TICK_MS,
  TALENT_EVERY_LEVELS,
  VENDOR_STOCK,
  buildStarterMap,
  chebyshev,
  sellPriceOf,
  computeHit,
  computeStats,
  DAMAGE_TYPES,
  resolveDamage,
  affixDamageType,
  materialsOf,
  rollAffixNames,
  FRAGMENT_ITEM,
  RECIPE_ITEM,
  rollFragmentDrop,
  rollRecipeDrop,
  type FragmentSource,
  CONDITIONS,
  CONDITION_IDS,
  emptyCcState,
  pointsForLevel,
  totalPointsUpToLevel,
  type CcState,
  applyCondition,
  breakOnDamage,
  emptyConditionDefense,
  restrictionsOf,
  tickConditions,
  tryApplyCondition,
  type ActiveCondition,
  type ConditionId,
  type DamageType,
  type DefenseProfile,
  type ResistanceProfile,
  decodeClientMessage,
  encode,
  floorLinkAt,
  getItem,
  inDepotZone,
  affixValue,
  BESTIARY_UNLOCKS,
  bestiaryPercent,
  bestiaryTier,
  CORPSE_EMPTY_TTL_MS,
  fleesFromPlayers,
  NEUTRAL_CALM_DOWN_MS,
  retaliates,
  rollVariant,
  startsFight,
  VARIANTS,
  CORPSE_TTL_MS,
  EQUIP_DROP_ON_DEATH,
  executionMultiplier,
  isGold,
  RARE_EQUIP_DROP_MULT,
  xpPenaltyRatio,
  furyStats,
  proficiencyBonus,
  proficiencyOf,
  proficiencyThreshold,
  RARITY,
  rollItem,
  rollRarity,
  WEAPON_IDENTITY,
  isSkillUsable,
  isWalkable,
  getSkill,
  ruptureDefReduction,
  SKILLS,
  stanceDamagePenalty,
  stanceDamageReduction,
  STANCE_SLOW,
  skillLevelOf,
  skillManaCost,
  skillPointsAtLevel,
  skillPower,
  skillRange,
  skillResetCost,
  skillThreshold,
  skillTotalCost as skillTotalCostOf,
  skillUpBlockedReason,
  skillUpgradeCost,
  xpToNext,
  type Attributes,
  type BestiaryEntry,
  type BestiaryState,
  type ClassDef,
  type CreatureVariant,
  type ClientMessage,
  type CreatureDef,
  type DerivedStats,
  type Direction,
  type NpcRole,
  type EntitySnapshot,
  type EquipSlot,
  type Gender,
  type ItemRoll,
  type ItemStack,
  type PlayerClass,
  type Proficiencies,
  type WeaponIdentity,
  type ServerMessage,
  type SkillDef,
  type SkillId,
  type SkillLevels,
  type SkillState,
  checkName,
  getTown,
  starterTown,
  townAt,
  TOWNS,
} from '@dominion/shared';
import { openStore } from './store/store.js';
import { fromStored, rowsToItems, toStored } from './store/serialize.js';

const map = buildStarterMap();
const store = openStore();
/**
 * Autosave. Se o servidor cair de bota (crash, kill -9, queda de luz), o
 * jogador perde no máximo este intervalo de progresso — não a sessão inteira.
 */
const AUTOSAVE_MS = 30000;
let lastAutosaveAt = 0;
const PLAYER_RESPAWN_MS = 4000;
const CREATURE_RESPAWN_MS = 8000;
const REGEN_INTERVAL_MS = 1000;
const XP_DEATH_PENALTY = 0.1;
const START_SKILL_LEVEL = 10;
// Zona central segura: quadrado (distância de Chebyshev) ao redor do ponto de
// renascimento. Chefes com `avoidCenter` não entram aqui e perdem o alvo que
// se refugia dentro — é o "santuário" de quem acabou de renascer.
const CENTER_SAFE_RADIUS = 6;
function inCenterSafeZone(x: number, y: number): boolean {
  return chebyshev(x, y, map.spawn.x, map.spawn.y) <= CENTER_SAFE_RADIUS;
}

// Ciclo dia/noite: acelerado (~2 min o dia inteiro) para o usuário testar já.
// Ajuste DAY_CYCLE_MS para deixar mais lento depois. Noite: 18h..6h.
const DAY_CYCLE_MS = 120000;
let worldHour = 8; // 0..24
let isNight = false;
/** À noite os monstros ficam mais fortes/rápidos. Multiplicadores. */
const NIGHT_DMG_MULT = 1.5;
// NIGHT_SPEED_MULT mora em `shared` porque o cliente também depende dele para
// deslizar a criatura na velocidade certa (ver o comentário lá).

interface Player {
  id: string;
  name: string;
  socket: WebSocket;
  /** Conta autenticada nesta conexão. 0 = ainda não fez login. */
  accountId: number;
  /** Personagem sendo jogado (linha do banco). 0 = ainda não entrou. */
  characterId: number;
  /** Cidade onde este personagem renasce hoje. */
  respawnTown: string;
  /** Cidades que ELE já pisou — é o que libera trocar o respawn (40.21). */
  visitedTowns: Set<string>;
  tileX: number;
  tileY: number;
  floor: number;
  direction: Direction;
  cls: ClassDef;
  gender: Gender;
  attributes: Attributes;
  skill: SkillState;
  derived: DerivedStats;
  level: number;
  xp: number;
  unspentPoints: number;
  talentPoints: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  /**
   * Ouro no Banco. Fica FORA da mochila de propósito: é o cofre, não moeda em
   * mão, então não conta para compra nem se perde na morte.
   */
  bankGold: number;
  /** Mochila (slots fixos; null = vazio). Guarda loot do chão e compras. */
  backpack: (ItemStack | null)[];
  /** Itens equipados por slot. */
  equipment: Partial<Record<EquipSlot, ItemStack>>;
  /** Depósito pessoal (acessível só na zona do DP). */
  depot: (ItemStack | null)[];
  alive: boolean;
  deadUntil: number;
  targetId: string | null;
  lastAttackAt: number;
  lastMoveAt: number;
  lastAckSeq: number;
  joined: boolean;
  /**
   * Condições ativas (Etapa 8). Não persiste no banco de propósito: sair do
   * jogo envenenado e voltar curado é melhor que voltar morrendo de um DoT que
   * o jogador não pode responder.
   */
  conditions: ActiveCondition[];
  /**
   * Estado anti-CC-chain (`DD-CC-013/014`). Não persiste, como as condições:
   * relogar não deve ser a forma de escapar de uma corrente, mas também não
   * faria sentido carregar diminishing returns entre sessões.
   */
  cc: CcState;
  /** Cooldown das habilidades: id -> timestamp em que fica pronta de novo. */
  spellReadyAt: Record<string, number>;
  /** Skill Points não gastos e nível de cada habilidade aprendida. */
  skillPoints: number;
  skillLevels: SkillLevels;
  /** Quantos resets de skill já foram pagos (define o custo do próximo). */
  skillResets: number;
  /**
   * Fúria de Batalha ativa. NÃO pode ser cancelada: só termina quando o HP
   * chega a 1. `hpAntes` guarda o teto normal para restaurar no fim.
   */
  fury: { level: number; hpNormal: number } | null;
  /** Postura Defensiva ligada (alternável). */
  stance: boolean;
  /** Maestria por tipo de arma — sobe com o uso e nunca tem teto. */
  proficiencies: Proficiencies;
  /** O que ele já conhece de cada criatura (encontros e abates). */
  bestiary: BestiaryState;
  /** Última leitura das zonas, p/ reenviar inventário só quando muda. */
  wasAtDepot: boolean;
  wasNearVendor: boolean;
  wasNearBank: boolean;
}

interface Creature {
  id: string;
  def: CreatureDef;
  name: string;
  tileX: number;
  tileY: number;
  floor: number;
  direction: Direction;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnAt: number;
  targetId: string | null;
  lastAttackAt: number;
  lastMoveAt: number;
  /** Condições ativas (Etapa 8). Zeradas ao renascer, como o resto do estado. */
  conditions: ActiveCondition[];
  /**
   * Estado anti-CC-chain (`DD-CC-013/014`). Não persiste, como as condições:
   * relogar não deve ser a forma de escapar de uma corrente, mas também não
   * faria sentido carregar diminishing returns entre sessões.
   */
  cc: CcState;
  /** Chefes: última magia e última invocação (controle de cooldown). */
  lastSpellAt: number;
  lastSummonAt: number;
  /** Chefes: último Salto Esmagador. */
  lastSlamAt: number;
  /**
   * Chefes: instante em que a fúria termina. 0 = nunca entrou.
   *
   * Guardamos o FIM e não um booleano porque a fúria é temporária, e porque
   * `enrageUsed` precisa ser separado: ela dispara UMA vez ao cruzar o limiar,
   * senão renasceria a cada golpe enquanto a vida estivesse abaixo dele.
   */
  enrageUntil: number;
  enrageUsed: boolean;
  /** Ruptura: defesa física rasgada até este instante, nesta fração (0..1). */
  defBreakUntil: number;
  defBreakPct: number;
  /** Provocar: aggro travado neste jogador até este instante. */
  tauntedBy: string | null;
  tauntUntil: number;
  /** Variante de nascimento (comum/incomum) e quando levou dano pela última vez. */
  variant: CreatureVariant;
  lastHurtAt: number;
  /** Chefe: quantas vezes já aniquilou um grupo (fica mais forte a cada vez). */
  triumphs: number;
  /** Id do chefe que invocou esta criatura (lacaio some ao morrer, não renasce). */
  summonedBy?: string;
}

/**
 * Corpo deixado por um jogador que morreu. Qualquer um pode abrir e saquear —
 * é o que cria a tensão de voltar correndo ao local (ou de proteger o corpo de
 * um aliado até ele chegar).
 */
interface Corpse {
  id: string;
  ownerId: string;
  ownerName: string;
  tileX: number;
  tileY: number;
  floor: number;
  items: (ItemStack | null)[];
  /** Instante em que some do mundo. */
  expiresAt: number;
}

interface GroundItem {
  id: string;
  itemKind: string;
  amount: number;
  tileX: number;
  tileY: number;
  floor: number;
  /** Instância do equipamento (raridade/passivos), quando houver. */
  roll?: ItemRoll;
}

const players = new Map<string, Player>();
const creatures = new Map<string, Creature>();
const items = new Map<string, GroundItem>();
const corpses = new Map<string, Corpse>();
// NPCs fixos (comerciante etc.) — vêm do mapa, com um id estável.
const npcs = (map.npcs ?? []).map((n, i) => ({ id: `npc${i}`, ...n }));
let nextId = 1;
let tick = 0;
let lastRegenAt = 0;
const newId = (p: string): string => `${p}${nextId++}`;

// ---------------------------------------------------------------------------
// Rede
// ---------------------------------------------------------------------------
function send(player: Player, msg: ServerMessage): void {
  if (player.socket.readyState === player.socket.OPEN) player.socket.send(encode(msg));
}
function broadcastFloor(floor: number, msg: ServerMessage): void {
  const raw = encode(msg);
  for (const p of players.values()) {
    if (p.joined && p.floor === floor && p.socket.readyState === p.socket.OPEN) p.socket.send(raw);
  }
}

// ---------------------------------------------------------------------------
// Inventário (autoritativo)
// ---------------------------------------------------------------------------
function emptySlots(n: number): (ItemStack | null)[] {
  return new Array(n).fill(null);
}

/**
 * Adiciona `amount` de `kind` a uma LISTA de slots. Empilha se possível.
 * False se cheia. `roll` carrega a instância do equipamento (raridade/
 * passivos) — dois itens do mesmo tipo com rolagens diferentes NUNCA empilham.
 *
 * Trabalha sobre o array (e não sobre o Player) porque a criação de personagem
 * monta a mochila antes de existir um Player em memória.
 */
function addStackTo(
  slots: (ItemStack | null)[],
  kind: string,
  amount: number,
  roll?: ItemRoll,
): boolean {
  const def = getItem(kind);
  if (!def) return false;
  if (def.stackable) {
    const slot = slots.find((s) => s && s.kind === kind);
    if (slot) {
      slot.amount += amount;
      return true;
    }
  }
  const empty = slots.indexOf(null);
  if (empty < 0) return false;
  slots[empty] = { kind, amount, ...(roll ? { roll } : {}) };
  return true;
}

function addToBackpack(player: Player, kind: string, amount: number, roll?: ItemRoll): boolean {
  return addStackTo(player.backpack, kind, amount, roll);
}

/**
 * Ouro vive como MOEDAS na mochila (gold/silver/blue/white). `player.gold` é o
 * total autoritativo; esta função reescreve as moedas normalizadas (100 de uma
 * viram 1 da próxima). Remove as moedas antigas e recria o mínimo de pilhas.
 */
function setGold(player: Player, amount: number): void {
  const total = Math.max(0, Math.floor(amount));
  player.gold = total;
  for (let i = 0; i < player.backpack.length; i++) {
    const s = player.backpack[i];
    if (s && GOLD_TIERS.some((t) => t.kind === s.kind)) player.backpack[i] = null;
  }
  let rem = total;
  for (const tier of GOLD_TIERS) {
    const n = Math.floor(rem / tier.value);
    if (n > 0) {
      addToBackpack(player, tier.kind, n);
      rem -= n * tier.value;
    }
  }
}

/** Está perto (<=2 tiles) de um NPC com esta função, no mesmo andar? */
function nearNpc(player: Player, role: NpcRole): boolean {
  return npcs.some(
    (n) => n.role === role && n.floor === player.floor &&
      chebyshev(player.tileX, player.tileY, n.x, n.y) <= 2,
  );
}

const nearVendor = (player: Player): boolean => nearNpc(player, 'vendor');
const nearBank = (player: Player): boolean => nearNpc(player, 'bank');

/** Está dentro da zona do Depósito? */
function atDepot(player: Player): boolean {
  return player.floor === 0 && inDepotZone(map, player.tileX, player.tileY);
}

function sendInventory(player: Player): void {
  send(player, {
    t: 'inventory',
    backpack: player.backpack,
    equipment: player.equipment,
    depot: player.depot,
    atDepot: atDepot(player),
    nearVendor: nearVendor(player),
    nearBank: nearBank(player),
  });
}
/** Manda o conteúdo do corpo para quem o abriu. */
function sendCorpse(player: Player, corpse: Corpse): void {
  send(player, {
    t: 'corpse',
    corpseId: corpse.id,
    owner: corpse.ownerName,
    items: corpse.items,
    secondsLeft: Math.max(0, Math.round((corpse.expiresAt - Date.now()) / 1000)),
  });
}

function sendStats(player: Player): void {
  send(player, {
    t: 'stats',
    charClass: player.cls.id,
    hp: Math.round(player.hp),
    maxHp: player.maxHp,
    mana: Math.round(player.mana),
    maxMana: player.maxMana,
    level: player.level,
    xp: player.xp,
    xpNext: xpToNext(player.level),
    gold: player.gold,
    bankGold: player.bankGold,
    alive: player.alive,
    attributes: player.attributes,
    unspentPoints: player.unspentPoints,
    talentPoints: player.talentPoints,
    skillKind: player.skill.kind,
    skillLevel: player.skill.level,
    skillProgress: player.skill.progress,
    skillThreshold: skillThreshold(player.skill.level),
    physAtk: Math.round(player.derived.physAtk),
    magicAtk: Math.round(player.derived.magicAtk),
    critChance: player.derived.critChance,
    defense: player.derived.defense,
    magicResist: player.derived.magicResist,
    dodgeChance: player.derived.dodgeChance,
    attackType: player.derived.attackType,
    attackRange: player.derived.attackRange,
    moveIntervalMs: player.derived.moveIntervalMs,
    attackCooldownMs: player.derived.attackCooldownMs,
    skillPoints: player.skillPoints,
    skillLevels: player.skillLevels as Record<string, number>,
    skillResets: player.skillResets,
    furyActive: player.fury !== null,
    stanceActive: player.stance,
    proficiencies: player.proficiencies as Record<string, { level: number; progress: number }>,
    bestiary: player.bestiary as Record<string, { encountered: boolean; kills: number; variants: string[] }>,
  });
}

/** Recalcula stats derivados; opcionalmente soma o ganho de vida ao HP atual. */
/**
 * Soma tudo que o equipamento oferece: atributos-base do item (já multiplicados
 * pela raridade) e os passivos rolados em cada peça.
 */
interface EquipBonus {
  atk: number;
  def: number;
  hp: number;
  mana: number;
  /** Frações (0.12 = +12%). */
  atkSpeed: number;
  critChance: number;
  critDamage: number;
  physDamage: number;
  armorPen: number;
  lifeSteal: number;
  moveSpeed: number;
}

function equipBonus(player: Player): EquipBonus {
  const b: EquipBonus = {
    atk: 0, def: 0, hp: 0, mana: 0, atkSpeed: 0, critChance: 0,
    critDamage: 0, physDamage: 0, armorPen: 0, lifeSteal: 0, moveSpeed: 0,
  };
  for (const slot of EQUIP_SLOTS) {
    const eq = player.equipment[slot];
    if (!eq) continue;
    const def0 = getItem(eq.kind);
    if (!def0) continue;
    // A raridade multiplica o atributo-base da peça.
    const mult = eq.roll ? RARITY[eq.roll.rarity].statMult : 1;
    b.atk += (def0.atk ?? 0) * mult;
    b.def += (def0.def ?? 0) * mult;
    const a = eq.roll?.affixes;
    b.hp += affixValue(a, 'hp_bonus');
    b.mana += affixValue(a, 'mana_bonus');
    b.atkSpeed += affixValue(a, 'atk_speed') / 100;
    b.critChance += affixValue(a, 'crit_chance') / 100;
    b.critDamage += affixValue(a, 'crit_damage') / 100;
    b.physDamage += affixValue(a, 'phys_damage') / 100;
    b.armorPen += affixValue(a, 'armor_pen') / 100;
    b.lifeSteal += affixValue(a, 'life_steal') / 100;
    b.moveSpeed += affixValue(a, 'move_speed') / 100;
    b.def += affixValue(a, 'defense');
  }
  return b;
}

/** A arma equipada e sua identidade (null = desarmado, soco). */
function equippedWeapon(player: Player): { stack: ItemStack; identity: WeaponIdentity } | null {
  const eq = player.equipment.weapon;
  if (!eq) return null;
  const def0 = getItem(eq.kind);
  if (!def0?.weaponType) return null;
  return { stack: eq, identity: WEAPON_IDENTITY[def0.weaponType] };
}

function recompute(player: Player, healGain = false): void {
  const oldMaxHp = player.maxHp;
  const oldMaxMana = player.maxMana;
  player.derived = computeStats(player.cls, player.attributes, player.level, player.skill);
  // Equipamento entra no cálculo (estilo Tibia): arma soma ataque, armadura e
  // escudo somam defesa, e os passivos rolados somam por cima.
  const bonus = equipBonus(player);
  const arma = equippedWeapon(player);

  // A ARMA define identidade: o machado bate mais forte e mais devagar que a
  // adaga, e a proficiência naquele tipo soma dano conforme você a usa.
  if (arma) {
    const prof = proficiencyOf(player.proficiencies, arma.identity.type);
    // O multiplicador da arma pesa sobre o GOLPE INTEIRO, não só sobre o bônus
    // dela. É o que faz o machado realmente bater mais forte que a adaga — e o
    // speedMult compensa na cadência, mantendo o dano por segundo equilibrado.
    if (arma.identity.magic) {
      player.derived.magicAtk = (player.derived.magicAtk + bonus.atk + proficiencyBonus(prof))
        * arma.identity.damageMult;
    } else {
      player.derived.physAtk = (player.derived.physAtk + bonus.atk + proficiencyBonus(prof))
        * arma.identity.damageMult;
    }
    player.derived.attackCooldownMs = Math.max(
      250,
      player.derived.attackCooldownMs * arma.identity.speedMult,
    );
    player.derived.attackRange = arma.identity.range;
    player.derived.attackType = arma.identity.magic
      ? 'magic'
      : arma.identity.range > 1 ? 'ranged' : 'melee';
  } else {
    player.derived.physAtk += bonus.atk;
  }

  player.derived.defense += bonus.def;
  player.derived.maxHp += bonus.hp;
  player.derived.maxMana += bonus.mana;
  player.derived.critChance = Math.min(0.9, player.derived.critChance + bonus.critChance);
  player.derived.critMult += bonus.critDamage;
  player.derived.attackCooldownMs = Math.max(
    250,
    player.derived.attackCooldownMs * (1 - Math.min(0.5, bonus.atkSpeed)),
  );
  player.derived.moveIntervalMs = Math.max(
    120,
    player.derived.moveIntervalMs * (1 - Math.min(0.4, bonus.moveSpeed)),
  );
  player.maxHp = player.derived.maxHp;
  player.maxMana = player.derived.maxMana;
  // Em Fúria o teto de vida está multiplicado: recalcular os stats não pode
  // desfazer isso no meio da luta. Guarda o teto normal e reaplica o bônus.
  if (player.fury) {
    player.fury.hpNormal = player.maxHp;
    player.maxHp = Math.round(player.maxHp * furyStats(player.fury.level).hpMult);
  }
  if (healGain) {
    player.hp += Math.max(0, player.maxHp - oldMaxHp);
    player.mana += Math.max(0, player.maxMana - oldMaxMana);
  }
  player.hp = Math.min(player.hp, player.maxHp);
  player.mana = Math.min(player.mana, player.maxMana);
}

// ---------------------------------------------------------------------------
// Mundo: criaturas
// ---------------------------------------------------------------------------
/**
 * Já tem alguém de carne e osso neste tile? Criatura viva ou jogador vivo.
 *
 * 🔴 **Um ocupante por tile.** A pedido do dono, monstro passou a ter colisão
 * "igual parede e muralha": antes o jogador atravessava criatura, e várias
 * criaturas empilhavam no mesmo tile. A regra vale nos três sentidos — jogador
 * não entra em monstro, monstro não entra em monstro, monstro não entra em
 * jogador — porque qualquer exceção reapareceria como sprite sobreposto, que é
 * exatamente a queixa original.
 *
 * ⚠️ Consequência deliberada, e é a mesma do Tibia: **dá para bloquear passagem
 * com o corpo.** Um jogador numa porta trava o monstro; o `stepToward` tem
 * desvios laterais, então ele contorna quando há por onde.
 *
 * Varre a lista em vez de manter um índice de ocupação de propósito: dentro do
 * MESMO tique as criaturas se movem uma depois da outra, e um índice montado no
 * início do tique estaria desatualizado na hora de a segunda decidir o passo —
 * duas criaturas cairiam no mesmo tile. Com 60×60 e poucas dezenas de criaturas,
 * a varredura não aparece no perfil.
 */
function tileOccupied(x: number, y: number, floor: number, ignoreId?: string): boolean {
  for (const c of creatures.values()) {
    if (!c.alive || c.id === ignoreId) continue;
    if (c.floor === floor && c.tileX === x && c.tileY === y) return true;
  }
  for (const p of players.values()) {
    if (!p.joined || !p.alive || p.id === ignoreId) continue;
    if (p.floor === floor && p.tileX === x && p.tileY === y) return true;
  }
  return false;
}

function findWalkableNear(x: number, y: number, floor: number): { x: number; y: number } {
  for (let r = 0; r < 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        // Ocupação entra aqui também: sem isso, dois spawns no mesmo ponto (ou um
        // lacaio invocado sobre o chefe) nasceriam empilhados e já travados.
        if (isWalkable(map, x + dx, y + dy, floor) && !tileOccupied(x + dx, y + dy, floor)) {
          return { x: x + dx, y: y + dy };
        }
      }
    }
  }
  return { x, y };
}

function spawnCreature(
  type: string,
  x: number,
  y: number,
  opts: { summonedBy?: string } = {},
): Creature | null {
  const def = CREATURES[type];
  if (!def) return null;
  const pos = findWalkableNear(x, y, 0);
  const id = newId('c');
  // Variante natural de spawn: de vez em quando nasce um exemplar mais forte,
  // com o mesmo sprite e o mesmo lugar no bestiário — só mais perigoso.
  const variant = def.boss ? 'common' : rollVariant();
  const v = VARIANTS[variant];
  const maxHp = Math.round(def.maxHp * v.hpMult);
  const c: Creature = {
    id, def, name: `${v.prefix}${def.name}`,
    tileX: pos.x, tileY: pos.y, floor: 0, direction: 'down',
    homeX: pos.x, homeY: pos.y, hp: maxHp, maxHp,
    alive: true, respawnAt: 0, targetId: null, lastAttackAt: 0, lastMoveAt: 0,
    conditions: [], cc: emptyCcState(),
    lastSpellAt: 0, lastSummonAt: 0, lastSlamAt: 0,
    enrageUntil: 0, enrageUsed: false,
    summonedBy: opts.summonedBy,
    defBreakUntil: 0, defBreakPct: 0, tauntedBy: null, tauntUntil: 0,
    variant, lastHurtAt: 0, triumphs: 0,
  };
  creatures.set(id, c);
  return c;
}

/**
 * Povoamento do mundo, **reescrito em 2026-07-30 a pedido do dono** ("diminuir
 * bastante a quantidade de monstros"): de 66 criaturas para 32.
 *
 * Duas regras organizam tudo, e a segunda é a que importa:
 *
 * 1. **Uma de cada espécie, sem cópias.** Cortar duplicata em vez de espécie é
 *    deliberado: o dono vai desenhar 20 sprites de monstro, e espécie que não
 *    nasce é sprite que não se consegue conferir no jogo. As duplas de família de
 *    `DD-BAL-049` (tank + ranged) sobrevivem intactas, porque a dupla são duas
 *    ESPÉCIES diferentes — Formiga Soldado com Cuspidora, Goblin Guerreiro com
 *    Arqueiro, as duas Aranhas.
 *
 * 2. **Distância da vila = Tier**, e agora de verdade. As bandas de nível do doc
 *    (Tier I = 1–20, II = 20–50, III = 50–100) só significam algo se o jogador de
 *    nível baixo não tropeçar em Tier III: `DD-DIF-006/007/008` manda o AMBIENTE
 *    comunicar o perigo, sem placa escrita.
 *
 *    🔴 Isto conserta o que o dono relatou como "subo de nível muito rápido".
 *    Havia Zumbi (Tier III, 95 XP, conteúdo de nível 50–100) a **14 tiles** do
 *    centro, e Tier II a 12. Um nível 1 saía da muralha e caía em conteúdo que
 *    vale 10× a XP do Slime Verde. A curva não estava errada; a vizinhança estava.
 *
 * Distâncias de Chebyshev a partir de (20,20), onde o personagem nasce — a
 * muralha da vila fica em 10..30, ou seja, a 10 do centro:
 *
 * | Faixa | Distância | Quem |
 * |---|---|---|
 * | Tier I | 12–14 | Slime Verde (8) |
 * | Tier I+ | 16–18 | Slime Azul (2), Vermelho (2) |
 * | Tier II | 18–24 | 9 espécies, uma cada |
 * | Tier III | 30–36 | 10 espécies, uma cada |
 * | MVP | 28 | Super Slime |
 *
 * ⚠️ A geografia limita: a vila fica no quadrante noroeste de um mapa 60×60, então
 * só há espaço para 30+ de distância a **leste e ao sul**. Todo o Tier III mora lá.
 */
function spawnInitialCreatures(): void {
  // Snake, Rotworm, Coelho, Javali e Aranha seguem DORMENTES a pedido: as
  // CreatureDefs e os desenhos continuam no código, só não nascem. Para
  // reintroduzir qualquer uma, basta uma linha aqui.

  // TIER I — o anel de treino, logo depois da muralha.
  const tier1: Array<[string, number, number]> = [
    ['slime', 8, 16], ['slime', 32, 16], ['slime', 16, 8], ['slime', 24, 32],
    ['slime', 7, 24], ['slime', 33, 25], ['slime', 12, 6], ['slime', 28, 34],
    // Um degrau acima (`DD-BAL-034/035`), mais para fora: quem sai da vila
    // encontra 50 HP, depois 70, depois 100.
    ['slime_blue', 4, 18], ['slime_blue', 36, 22],
    ['slime_red', 20, 38], ['slime_red', 38, 14],
  ];

  // TIER II — segundo anel. Cada dupla de família nasce colada, porque
  // `DD-BAL-049` desenhou tank + ranged para atuarem em conjunto.
  const tier2: Array<[string, number, number]> = [
    ['forest_spider', 38, 12], ['web_spider', 39, 11],
    ['soldier_ant', 12, 38], ['spitter_ant', 11, 39],
    ['goblin_warrior', 38, 38], ['goblin_archer', 39, 39],
    ['grey_wolf', 42, 26],
    ['young_orc', 26, 42], ['orc_warrior', 44, 30],
  ];

  // TIER III — só leste e sul, a 30+ de distância. `DD-BAL-058`: "transição para
  // o conteúdo intermediário", exige build consistente e prioridade de alvos.
  const tier3: Array<[string, number, number]> = [
    ['zombie', 50, 20],
    ['skeleton_warrior', 52, 14], ['skeleton_archer', 53, 15],
    ['minotaur', 20, 50],
    ['brown_bear', 14, 52], ['black_wolf', 15, 53],
    ['giant_spider', 50, 50],
    ['mystic_ant', 54, 44], ['kobold_hunter', 44, 54],
    ['troll', 54, 52],
  ];

  for (const [t, x, y] of [...tier1, ...tier2, ...tier3]) spawnCreature(t, x, y);

  // CHEFE: no sudeste, longe do centro. Ele caça o jogador pelo mapa, mas trava
  // na borda da zona central (`avoidCenter`).
  spawnCreature('super_slime', 48, 48);
  console.log(`[mundo] ${creatures.size} criaturas geradas.`);
}

/**
 * Criaturas podem pisar aqui? Caminhável E fora da zona do Depósito (DP).
 * `avoidCenter` (chefes): também bloqueia a zona central segura do spawn.
 */
function creatureCanEnter(
  x: number, y: number, floor: number, avoidCenter = false, selfId?: string,
): boolean {
  if (floor === 0 && inDepotZone(map, x, y)) return false; // monstros não entram no DP
  if (avoidCenter && floor === 0 && inCenterSafeZone(x, y)) return false; // chefe não invade o centro
  if (!isWalkable(map, x, y, floor)) return false;
  return !tileOccupied(x, y, floor, selfId);
}

function stepToward(
  cx: number, cy: number, tx: number, ty: number, floor: number, avoidCenter = false,
  selfId?: string,
): { x: number; y: number } | null {
  const dx = Math.sign(tx - cx);
  const dy = Math.sign(ty - cy);
  // Tenta primeiro o eixo de maior distância; depois o outro.
  const tries: number[][] = Math.abs(tx - cx) >= Math.abs(ty - cy)
    ? [[dx, 0], [0, dy]]
    : [[0, dy], [dx, 0]];
  // DESVIO: quando o alvo está em linha reta (um eixo zero) e o caminho direto
  // está bloqueado (parede, árvore ou a borda da zona central), desliza para o
  // lado para CONTORNAR em vez de travar. Sem isto o chefe paralisava na entrada
  // do centro ao encostar na borda que não pode cruzar.
  if (dx === 0) tries.push([1, 0], [-1, 0]);
  if (dy === 0) tries.push([0, 1], [0, -1]);
  for (const [mx, my] of tries) {
    if (mx === 0 && my === 0) continue;
    if (creatureCanEnter(cx + mx!, cy + my!, floor, avoidCenter, selfId)) {
      return { x: cx + mx!, y: cy + my! };
    }
  }
  return null;
}

function dirFromDelta(dx: number, dy: number, fallback: Direction): Direction {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) return 'right';
    if (dx < 0) return 'left';
  } else {
    if (dy > 0) return 'down';
    if (dy < 0) return 'up';
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Combate
// ---------------------------------------------------------------------------
/** Loot dropado por tipo de criatura ("nada é lixo"): kind + chance. */
const LOOT_TABLE: Record<string, { kind: string; chance: number }[]> = {
  slime: [{ kind: 'slime_gel', chance: 0.7 }],
  rotworm: [{ kind: 'slime_gel', chance: 0.5 }],
  snake: [{ kind: 'snake_skin', chance: 0.8 }],
};

function dropItem(
  kind: string, amount: number, x: number, y: number, floor: number, roll?: ItemRoll,
): void {
  const id = newId('i');
  items.set(id, { id, itemKind: kind, amount, tileX: x, tileY: y, floor, roll });
}

/** Equipamentos que podem cair de monstros, por slot. */
const DROP_POOL_WEAPON = [
  'short_sword', 'hand_axe', 'club', 'dagger', 'spear', 'short_bow',
  'light_crossbow', 'apprentice_staff',
];
const DROP_POOL_ARMOR = [
  'leather_helmet', 'leather_armor', 'leather_pants', 'leather_boots', 'wooden_shield',
];

/**
 * Que tipo de fonte esta criatura é, para o teto de raridade do fragmento.
 *
 * A variante de spawn conta: um exemplar Robusto é "elite" pela regra de
 * raridade máxima por fonte, o que dá função extra às variantes além de mais
 * HP e XP.
 */
function fragmentSourceOf(c: Creature): FragmentSource {
  if (c.def.boss) return 'boss';
  return c.variant === 'common' ? 'common' : 'elite';
}

/**
 * Chance de largar fragmento. Alta de propósito: `DD-PROF-021` faz do fragmento
 * a via PRINCIPAL de equipamento, e são precisos 100 deles por fabricação. Se
 * caísse na frequência de um equipamento inteiro, ninguém craftaria nunca.
 *
 * ⚠️ REFERÊNCIA — o doc deixa "quantidades de fragmentos e custos" para a fase
 * final de balanceamento.
 */
const FRAGMENT_DROP_CHANCE = 0.55;
const BOSS_FRAGMENT_DROPS = 8;
/**
 * Chance de receita. Baixa de propósito: uma receita rende uma fabricação
 * INTEIRA, enquanto cada fragmento rende 1/100 dela. Igualar as duas encheria o
 * jogador de receitas sem material para usá-las. ⚠️ REFERÊNCIA.
 */
const RECIPE_DROP_CHANCE = 0.06;

function dropLoot(c: Creature): void {
  const gold = c.def.goldMin + Math.floor(Math.random() * (c.def.goldMax - c.def.goldMin + 1));
  if (gold > 0) dropItem('gold', gold, c.tileX, c.tileY, c.floor);

  // Fragmentos de Equipamento: o material que sustenta o crafting inteiro.
  // Chefe larga vários de uma vez — é o que justifica organizar um grupo.
  const fonte = fragmentSourceOf(c);
  const tentativas = c.def.boss ? BOSS_FRAGMENT_DROPS : 1;
  for (let i = 0; i < tentativas; i++) {
    const raridade = rollFragmentDrop(fonte, FRAGMENT_DROP_CHANCE);
    if (raridade) dropItem(FRAGMENT_ITEM[raridade], 1, c.tileX, c.tileY, c.floor);
  }

  // Receita: chance BEM menor que fragmento, porque uma receita rende uma
  // fabricação inteira enquanto o fragmento rende 1/100 dela. Chefe garante uma.
  const receita = rollRecipeDrop(fonte, c.def.boss ? 1 : RECIPE_DROP_CHANCE);
  if (receita) dropItem(RECIPE_ITEM[receita], 1, c.tileX, c.tileY, c.floor);

  for (const entry of LOOT_TABLE[c.def.type] ?? []) {
    if (Math.random() < entry.chance) dropItem(entry.kind, 1, c.tileX, c.tileY, c.floor);
  }

  // 🔴 `DD-DROP-001`: "o jogador nunca deve derrotar um monstro apenas pela
  // experiência". O material característico da FAMÍLIA (`DD-DROP-006`) é o que
  // cumpre isso — e por ser da família, não da espécie, o jogador aprende uma
  // vez e a lição serve para todo o grupo.
  //
  // Chefe larga o dobro de tentativas: `DD-DROP-010` pede "maior quantidade de
  // materiais" para boss, e é o que faz valer organizar grupo.
  const tentativasMat = c.def.boss ? 2 : 1;
  for (const entry of materialsOf(c.def.type)) {
    for (let i = 0; i < tentativasMat; i++) {
      if (Math.random() < entry.chance) dropItem(entry.kind, 1, c.tileX, c.tileY, c.floor);
    }
  }
  // Equipamento com raridade e passivos rolados. Chefe empurra a curva de
  // raridade para cima — mas Lendário+ segue sendo evento raro.
  if (Math.random() < (c.def.boss ? 1 : EQUIP_DROP_CHANCE)) {
    const arma = Math.random() < 0.5;
    const pool = arma ? DROP_POOL_WEAPON : DROP_POOL_ARMOR;
    const kind = pool[Math.floor(Math.random() * pool.length)]!;
    const rarity = rollRarity(c.def.boss ? 35 : 0);
    // Cap. 46: o item nasce com NOME. `rollAffixNames` vem separado de
    // `rollItem` para evitar import circular no shared — ver o comentário lá.
    const nomes = rollAffixNames(arma ? 'weapon' : 'armor', rarity);
    dropItem(
      kind, 1, c.tileX, c.tileY, c.floor,
      rollItem(rarity, arma ? 'weapon' : 'armor', Math.random, nomes),
    );
  }
}

/** Chance de um monstro comum largar uma peça de equipamento. */
const EQUIP_DROP_CHANCE = 0.18;

function grantXp(player: Player, amount: number): void {
  player.xp += amount;
  while (player.xp >= xpToNext(player.level)) {
    player.xp -= xpToNext(player.level);
    player.level += 1;
    // `DD-PROG-002`: a concessão cresce de 10 para 20 conforme o nível, para
    // acompanhar o custo crescente de subir atributo.
    player.unspentPoints += pointsForLevel(player.level);
    // Skill Points são uma progressão SEPARADA dos atributos e rendem
    // diferente por classe (o Sorcerer desenvolve muito mais magias).
    player.skillPoints += skillPointsAtLevel(player.cls.id, player.level);
    if (player.level % TALENT_EVERY_LEVELS === 0) player.talentPoints += 1;
    recompute(player, true);
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    send(player, { t: 'levelup', level: player.level });
  }
}

function gainSkill(player: Player): void {
  player.skill.progress += 1;
  if (player.skill.progress >= skillThreshold(player.skill.level)) {
    player.skill.progress = 0;
    player.skill.level += 1;
    recompute(player);
  }
  gainProficiency(player);
}

/**
 * Maestria da arma EM USO sobe a cada golpe. Sem teto: o que muda é a
 * velocidade — os primeiros níveis voam, os altos exigem muita dedicação.
 */
function gainProficiency(player: Player): void {
  const arma = equippedWeapon(player);
  if (!arma) return;
  const tipo = arma.identity.type;
  const p = player.proficiencies[tipo] ?? { level: 0, progress: 0 };
  p.progress += 1;
  if (p.progress >= proficiencyThreshold(p.level)) {
    p.progress = 0;
    p.level += 1;
    player.proficiencies[tipo] = p;
    recompute(player);
    send(player, {
      t: 'chat', from: 'Sistema',
      text: `${arma.identity.name}: maestria ${p.level}.`,
    });
    return;
  }
  player.proficiencies[tipo] = p;
}

/**
 * Cobra a penalidade de XP da morte. Se a perda passar da XP acumulada no
 * nível, o jogador DESCE de nível — e aí perde também os pontos de atributo e
 * talento daqueles níveis. Como não dá para saber quais pontos vieram de qual
 * nível, a distribuição é zerada e tudo volta como pontos livres: é a regra
 * "ao recuperar os níveis, precisa redistribuir novamente" (GDD §8).
 */
function applyDeathPenalty(player: Player, byPlayer: boolean): { xpLost: number; levelsLost: number } {
  const ratio = xpPenaltyRatio(player.level, byPlayer);
  let restante = Math.floor(xpToNext(player.level) * ratio);
  const xpLost = restante;
  let levelsLost = 0;

  while (restante > 0) {
    if (player.xp >= restante) {
      player.xp -= restante;
      restante = 0;
      break;
    }
    restante -= player.xp;
    player.xp = 0;
    if (player.level <= 1) break; // nunca desce do nível 1
    player.level -= 1;
    levelsLost += 1;
    player.xp = xpToNext(player.level); // volta para o topo do nível anterior
    if (player.xp >= restante) {
      player.xp -= restante;
      restante = 0;
    }
  }

  if (levelsLost > 0) {
    // Redistribuição forçada: atributos voltam à base da classe e todos os
    // pontos ganhos até o nível atual retornam como não gastos.
    player.attributes = { ...player.cls.base };
    // Soma a curva degrau por degrau. Multiplicar pelo valor do nível ATUAL
    // devolveria pontos que nunca foram concedidos: quem chega ao 300 receberia
    // 20 × 299 em vez do total real da curva.
    player.unspentPoints = totalPointsUpToLevel(player.level);
    player.talentPoints = Math.floor(player.level / TALENT_EVERY_LEVELS);
    recompute(player);
  }
  return { xpLost, levelsLost };
}

/**
 * Deixa o corpo no local da morte com o espólio: a mochila INTEIRA (sempre) e
 * cada peça equipada com uma chance pequena — baixa, mas nunca zero.
 */
function dropCorpse(player: Player): Corpse {
  const espolio: (ItemStack | null)[] = [];
  // A mochila sempre cai por inteiro: sair para caçar cheio é sempre um risco.
  for (let i = 0; i < player.backpack.length; i++) {
    const s = player.backpack[i];
    if (s) espolio.push(s);
    player.backpack[i] = null;
  }
  player.gold = 0;
  // 🔴 `player.bankGold` NÃO entra aqui, e é a razão de o Banco existir: ouro
  // guardado sobrevive à morte, ouro em mão não. Zerar o banco na morte
  // transformaria o cofre em decoração.

  for (const slot of EQUIP_SLOTS) {
    if (slot === 'container') continue; // a mochila equipada fica com o dono
    const eq = player.equipment[slot];
    if (!eq) continue;
    // Item excepcional resiste mais — perder um Lendário não pode ser trivial.
    const raro = eq.roll && ['legendary', 'mythic', 'relic'].includes(eq.roll.rarity);
    const chance = EQUIP_DROP_ON_DEATH * (raro ? RARE_EQUIP_DROP_MULT : 1);
    if (Math.random() < chance) {
      espolio.push(eq);
      delete player.equipment[slot];
    }
  }

  const corpse: Corpse = {
    id: newId('corpse'),
    ownerId: player.id,
    ownerName: player.name,
    tileX: player.tileX,
    tileY: player.tileY,
    floor: player.floor,
    items: espolio,
    expiresAt: Date.now() + CORPSE_TTL_MS,
  };
  corpses.set(corpse.id, corpse);
  return corpse;
}

function killPlayer(player: Player, byName: string, byPlayer = false): void {
  player.alive = false;
  // Morrer encerra a Fúria e a Postura — nada de renascer inchado de vida.
  if (player.fury) {
    player.maxHp = player.fury.hpNormal;
    player.fury = null;
    player.spellReadyAt['battle_fury'] = Date.now() + SKILLS.battle_fury.cooldownMs;
  }
  player.stance = false;
  player.hp = 0;
  player.targetId = null;
  player.deadUntil = Date.now() + PLAYER_RESPAWN_MS;

  const corpse = dropCorpse(player);
  const { xpLost, levelsLost } = applyDeathPenalty(player, byPlayer);

  for (const c of creatures.values()) if (c.targetId === player.id) c.targetId = null;
  send(player, {
    t: 'died', by: byName, xpLost, levelsLost,
    corpseX: corpse.tileX, corpseY: corpse.tileY,
  });
  sendInventory(player);
}

function respawnPlayer(player: Player): void {
  player.alive = true;
  player.hp = player.maxHp;
  player.mana = player.maxMana;
  // Renasce na cidade que ELE escolheu — e só pôde escolher entre as que
  // visitou fisicamente. Se a cidade sumir do registro (conteúdo removido
  // entre versões), cai no vilarejo inicial em vez de num lugar inválido.
  const town = getTown(player.respawnTown) ?? starterTown();
  player.tileX = town.spawn.x;
  player.tileY = town.spawn.y;
  player.floor = town.spawn.floor;
  send(player, { t: 'respawn' });
  // Morrer é um bom momento para gravar: é onde mais dói perder progresso.
  saveCharacter(player);
}

/**
 * Modificadores ofensivos ativos do jogador (Fúria e Postura Defensiva).
 * Multiplica o dano que ele CAUSA.
 */
function offenseMult(player: Player): number {
  let m = 1;
  if (player.fury) m *= 1 + furyStats(player.fury.level).damageBonus;
  if (player.stance) {
    m *= 1 - stanceDamagePenalty(skillLevelOf(player.skillLevels, 'defensive_stance'));
  }
  return m;
}

/** Multiplica o dano que o jogador RECEBE (Fúria aumenta, Postura reduz). */
function defenseMult(player: Player): number {
  let m = 1;
  if (player.fury) m *= 1 + furyStats(player.fury.level).damageTakenBonus;
  if (player.stance) {
    m *= 1 - stanceDamageReduction(skillLevelOf(player.skillLevels, 'defensive_stance'));
  }
  return m;
}

/**
 * Monta o `DefenseProfile` do jogador para o pipeline em camadas da Etapa 8
 * (`shared/src/defense.ts`).
 *
 * ⚠️ **Esta função foi escrita para NÃO mudar o balanceamento.** Ela traduz o
 * que o servidor já fazia para a estrutura nova, e nada mais:
 *
 * - `defense` e `dodgeChance` saem de `player.derived`, como antes
 * - a `magicResist` (um número só, que valia para toda magia) vira resistência
 *   nos **seis tipos não-físicos** — mesmo resultado de hoje, mas agora dá para
 *   um equipamento somar resistência só a fogo
 * - `defenseMult` (Fúria, Postura) vira `damageTakenMult`
 *
 * O que ainda chega ZERADO, por não existir no jogo: `shieldMitigation` e
 * `fullBlockChance`. `DD-DEF-009` manda que eles venham só de escudo,
 * equipamento e carta — que são a Etapa 11 e a Etapa 10. Até lá o pipeline roda
 * com essas camadas neutras.
 */
function playerDefenseProfile(player: Player, dodgeable: boolean): DefenseProfile {
  const resistances: ResistanceProfile = {};
  for (const t of DAMAGE_TYPES) {
    if (t !== 'physical') resistances[t] = player.derived.magicResist;
  }
  return {
    // Magia não é esquivável hoje (o servidor já mandava `dodged: false`).
    dodgeChance: dodgeable ? player.derived.dodgeChance : 0,
    fullBlockChance: 0,
    shieldMitigation: 0,
    defense: player.derived.defense,
    // Jogador não tem DEF mágica plana: a mitigação mágica é toda percentual,
    // via magicResist. Introduzir uma agora mexeria no balanceamento.
    magicDefense: 0,
    resistances,
    damageTakenMult: defenseMult(player),
  };
}

/**
 * Defesa efetiva da criatura contra ESTE jogador: desconta a Ruptura (se ativa)
 * e a penetração de armadura vinda dos passivos do equipamento.
 */
function creatureDefense(c: Creature, now: number, player?: Player): number {
  let base = c.def.defense;
  if (now < c.defBreakUntil) base *= 1 - c.defBreakPct;
  if (player) base *= 1 - Math.min(0.8, equipBonus(player).armorPen);
  return base;
}

/**
 * Tipo de dano do ataque BÁSICO do jogador (`DD-ELM-002`).
 *
 * ⚠️ Provisório para as classes mágicas. O roadmap da Etapa 14 diz
 * "🔴 ataque básico com cajado é FÍSICO — magia exige habilidade e mana", mas
 * hoje o Sorcerer conjura firebolt e gasta mana no ataque básico. Reescrever
 * isso é trabalho da Etapa 14; aqui só damos um tipo ao que já existe.
 */
function basicAttackType(attackType: string): DamageType {
  return attackType === 'magic' ? 'fire' : 'physical';
}

/**
 * Tipo de dano do ataque do jogador, já contando a ARMA equipada.
 *
 * 🔴 Cap. 46 + decisão do dono: prefixo elemental muda o dano de verdade. Uma
 * "Espada Longa Flamejante" causa dano de FOGO, e é isso que faz as resistências
 * das criaturas saírem do papel — o Zumbi fraco a Sagrado passa a ter um contra
 * de verdade, em vez de ser um número parado na ficha.
 *
 * A arma vence a classe: quem empunha espada Glacial bate de gelo, mesmo sendo
 * Knight. Para as classes mágicas o prefixo também vale — cajado Sombrio troca
 * o fogo padrão por sombrio.
 */
function playerDamageType(player: Player): DamageType {
  const arma = player.equipment?.weapon;
  const doPrefixo = affixDamageType(arma?.roll?.prefix);
  if (doPrefixo) return doPrefixo;
  return basicAttackType(player.derived.attackType);
}

/**
 * `DefenseProfile` da criatura. Como em `playerDefenseProfile`, traduz o que o
 * servidor já fazia sem mexer no balanceamento:
 *
 * - contra dano físico vale `creatureDefense` (Ruptura e penetração incluídas)
 * - `resistances` faz o Zumbi levar +50 % de dano Sagrado
 *
 * 🔴 **Mudança do Doc 3:** magia deixou de ignorar a defesa da criatura. Antes
 * `magicDefense` era sempre 0 porque nenhuma criatura tinha o dado; as fichas
 * canônicas (`DD-BAL-033` em diante) dão "DEF Mágica" por espécie, então agora
 * ela vale. É pouco no Tier I (0 no Slime Verde, 2 no Vermelho) e sensível no
 * MVP (5), que é exatamente a curva que o doc desenha.
 *
 * Criatura não esquiva nem bloqueia hoje — as duas camadas ficam neutras.
 */
function creatureDefenseProfile(
  creature: Creature,
  now: number,
  player: Player | undefined,
  isMagic: boolean,
): DefenseProfile {
  return {
    dodgeChance: 0,
    fullBlockChance: 0,
    shieldMitigation: 0,
    defense: isMagic ? 0 : creatureDefense(creature, now, player),
    magicDefense: creature.def.magicDefense ?? 0,
    resistances: creature.def.resistances ?? {},
  };
}

/** Roubo de vida dos passivos: devolve parte do dano causado como vida. */
function applyLifeSteal(player: Player, dano: number): void {
  const taxa = equipBonus(player).lifeSteal;
  if (taxa <= 0) return;
  player.hp = Math.min(player.maxHp, player.hp + dano * taxa);
}

/**
 * Aplica dano já calculado numa criatura: anuncia o golpe, trata a morte (loot,
 * XP, respawn) e limpa o alvo de quem estava mirando nela. Compartilhado pelo
 * ataque básico e pelas magias — a regra de morte mora num lugar só.
 */
/** Garante a entrada do bestiário e marca que o jogador já viu esta criatura. */
function bestiarySee(player: Player, c: Creature): BestiaryEntry {
  const e = player.bestiary[c.def.type] ?? { encountered: false, kills: 0, variants: [] };
  e.encountered = true;
  if (!e.variants.includes(c.variant)) e.variants.push(c.variant);
  player.bestiary[c.def.type] = e;
  return e;
}

function damageCreature(
  player: Player,
  creature: Creature,
  dmg: number,
  crit: boolean,
  now: number,
): void {
  creature.hp = Math.max(0, creature.hp - dmg);
  onDamaged(creature); // dano quebra Congelamento (`DD-CC-012`)
  checkEnrage(creature, now); // chefe pode virar a fase aqui
  creature.lastHurtAt = now;
  // Enfrentar já conta: mesmo que o jogador morra ou fuja, a criatura entra
  // no bestiário como "encontrada".
  const entrada = bestiarySee(player, creature);
  // NEUTRO revida: quem bateu vira o alvo.
  if (!creature.targetId && retaliates(creature.def.behavior ?? 'hostile')) {
    creature.targetId = player.id;
  }
  const fatal = creature.hp <= 0;
  broadcastFloor(creature.floor, {
    t: 'hit', attackerId: player.id, targetId: creature.id, amount: dmg, crit, dodged: false,
    hp: creature.hp, maxHp: creature.maxHp, fatal,
    // No golpe fatal manda a XP concedida para o cliente exibir "+XP" sobre a criatura.
    ...(fatal ? { xp: creature.def.xpReward } : {}),
  });
  if (!fatal) return;
  creature.alive = false;
  creature.targetId = null;
  dropLoot(creature);
  // A variante incomum entrega mais XP — é a recompensa por ter dado mais
  // trabalho. Um chefe que já aniquilou grupos também vale mais.
  const bonusTriunfo = 1 + creature.triumphs * BOSS_TRIUMPH_XP;
  grantXp(
    player,
    Math.round(creature.def.xpReward * VARIANTS[creature.variant].xpMult * bonusTriunfo),
  );
  // Abate contabilizado no bestiário; avisa quando o conhecimento avança.
  const antes = bestiaryPercent(entrada.kills, !!creature.def.boss);
  entrada.kills += 1;
  const depois = bestiaryPercent(entrada.kills, !!creature.def.boss);
  if (depois > antes) {
    send(player, {
      t: 'chat', from: 'Bestiário',
      text: `${creature.def.name}: ${depois}% — ${BESTIARY_UNLOCKS[bestiaryTier(entrada.kills, !!creature.def.boss)]}.`,
    });
  }
  for (const p of players.values()) if (p.targetId === creature.id) p.targetId = null;
  if (creature.summonedBy) {
    // Lacaio invocado: some do mundo (não renasce sozinho).
    creatures.delete(creature.id);
  } else {
    creature.respawnAt = now + (creature.def.respawnMs ?? CREATURE_RESPAWN_MS);
  }
  sendStats(player); // o bestiário mudou: o painel precisa acompanhar
}

/** Quanto de XP a mais um chefe vale por cada grupo que já aniquilou. */
const BOSS_TRIUMPH_XP = 0.25;
/** E quanto ele fica mais forte a cada triunfo (HP e dano). */
const BOSS_TRIUMPH_POWER = 0.15;
/** Teto de triunfos, para o chefe não virar imbatível para sempre. */
const BOSS_TRIUMPH_MAX = 5;

function playerAttack(player: Player, creature: Creature, now: number): void {
  const d = player.derived;
  const isMagic = d.attackType === 'magic';
  // Etapa 8: controle total impede atacar. Para as classes mágicas o ataque
  // básico também é conjuração, então o Silêncio as desarma — e é justamente
  // por isso que ele não desarma o Knight.
  const restr = restrictionsOf(player.conditions);
  if (!restr.canAttack) return;
  if (isMagic && !restr.canCast) return;
  if (isMagic && player.mana < d.manaCost) return; // sem mana, não conjura
  if (isMagic) player.mana -= d.manaCost;
  player.lastAttackAt = now;

  const bonus = equipBonus(player);
  const power = (isMagic ? d.magicAtk : d.physAtk)
    * offenseMult(player)
    * (1 + bonus.physDamage);
  const { amount, crit } = computeHit(power, d.critChance, d.critMult);
  // Etapa 8: o golpe do jogador também passa pelas camadas, e é aqui que a
  // resistência da criatura entra em jogo.
  const tipo = playerDamageType(player);
  const dmg = resolveDamage(
    amount,
    tipo,
    // Dano não-físico ignora a defesa física da criatura, como antes. Uma espada
    // Flamejante passa a bater contra a defesa MÁGICA — é a troca que dá sentido
    // a carregar arma elemental contra bicho de armadura grossa.
    creatureDefenseProfile(creature, now, player, tipo !== 'physical'),
  ).amount;
  applyLifeSteal(player, dmg);
  gainSkill(player);

  if (d.attackType !== 'melee') {
    broadcastFloor(player.floor, {
      t: 'projectile', fromId: player.id, toX: creature.tileX, toY: creature.tileY,
      floor: player.floor, kind: player.cls.projectile ?? 'arrow',
    });
  }
  damageCreature(player, creature, dmg, crit, now);
}

/**
 * Usa uma habilidade da barra de atalhos. O servidor valida TUDO (a habilidade
 * foi aprendida, mana, cooldown, alcance) e só então aplica o dano.
 *
 * Dano, custo de mana e raio saem do NÍVEL da habilidade (Lv.1–10). O cooldown
 * é fixo de propósito: subir o nível deixa a skill mais forte, não mais rápida.
 *
 * O dano das habilidades do Knight é FÍSICO (sai do `physAtk` e é reduzido
 * pela defesa do monstro) — o custo delas é a mana, não o tipo de dano.
 */
function castSpell(player: Player, def: SkillDef, now: number): void {
  const nivel = skillLevelOf(player.skillLevels, def.id);
  if (!isSkillUsable(def, player.cls.id, player.skillLevels)) {
    send(player, { t: 'denied', reason: `Você ainda não aprendeu ${def.name}.` });
    return;
  }
  // Etapa 8: Silêncio bloqueia SÓ magia (o silenciado anda e bate normal);
  // Congelamento, Petrificação e Stun bloqueiam tudo.
  const restr = restrictionsOf(player.conditions);
  if (!restr.canCast) {
    send(player, { t: 'denied', reason: 'Você não consegue conjurar agora.' });
    return;
  }
  const readyAt = player.spellReadyAt[def.id] ?? 0;
  if (now < readyAt) {
    send(player, { t: 'denied', reason: `${def.name} recarregando (${((readyAt - now) / 1000).toFixed(1)}s).` });
    return;
  }
  const custoMana = skillManaCost(def, nivel);
  if (player.mana < custoMana) {
    send(player, { t: 'denied', reason: `Mana insuficiente para ${def.name} (${custoMana}).` });
    return;
  }
  const alcance = skillRange(def, nivel);

  // Habilidades que agem sobre o próprio Knight saem por aqui: não miram
  // ninguém e têm regras próprias de duração.
  if (def.shape === 'self') {
    if (def.kind === 'stance') {
      player.stance = !player.stance;
      player.spellReadyAt[def.id] = now + def.cooldownMs;
      recompute(player);
      send(player, { t: 'cast', spell: def.id, cooldownMs: def.cooldownMs });
      send(player, {
        t: 'chat', from: 'Sistema',
        text: player.stance ? 'Postura Defensiva ATIVADA.' : 'Postura Defensiva desativada.',
      });
      sendStats(player);
      return;
    }
    if (def.kind === 'fury') {
      if (player.fury) {
        send(player, { t: 'denied', reason: 'A Fúria já está ativa — ela não pode ser cancelada.' });
        return;
      }
      player.mana -= custoMana;
      startFury(player, nivel);
      // O cooldown só é armado quando a Fúria TERMINA (ver tickFury).
      send(player, { t: 'cast', spell: def.id, cooldownMs: 0 });
      broadcastFloor(player.floor, {
        t: 'fx', kind: def.fx, x: player.tileX, y: player.tileY, floor: player.floor,
      });
      sendStats(player);
      return;
    }
  }

  // Junta os alvos ANTES de gastar mana: sem alvo válido, a habilidade não sai
  // (e o jogador não perde mana nem cooldown por um clique no vazio).
  const targets: Creature[] = [];
  if (def.shape === 'target') {
    const target = player.targetId ? creatures.get(player.targetId) : undefined;
    if (!target || !target.alive || target.floor !== player.floor) {
      send(player, { t: 'denied', reason: 'Escolha um alvo primeiro.' });
      return;
    }
    if (chebyshev(player.tileX, player.tileY, target.tileX, target.tileY) > alcance) {
      send(player, { t: 'denied', reason: 'Alvo longe demais.' });
      return;
    }
    targets.push(target);
  } else {
    for (const c of creatures.values()) {
      if (!c.alive || c.floor !== player.floor) continue;
      if (chebyshev(player.tileX, player.tileY, c.tileX, c.tileY) <= alcance) targets.push(c);
    }
    if (targets.length === 0) {
      send(player, { t: 'denied', reason: 'Nenhum inimigo ao alcance.' });
      return;
    }
  }

  player.mana -= custoMana;
  player.spellReadyAt[def.id] = now + def.cooldownMs;
  send(player, { t: 'cast', spell: def.id, cooldownMs: def.cooldownMs });

  // Provocar não causa dano: só arranca o aggro da criatura para o Knight.
  if (def.kind === 'taunt') {
    const alvo = targets[0]!;
    alvo.targetId = player.id;
    alvo.tauntedBy = player.id;
    alvo.tauntUntil = now + TAUNT_LOCK_MS;
    broadcastFloor(player.floor, {
      t: 'fx', kind: def.fx, x: alvo.tileX, y: alvo.tileY, floor: player.floor,
    });
    sendStats(player);
    return;
  }

  // Investida: o valor é CHEGAR no alvo. Puxa o Knight para um tile livre
  // colado nele antes de golpear.
  if (def.kind === 'charge') {
    const alvo = targets[0]!;
    const destino = findWalkableNear(alvo.tileX, alvo.tileY, alvo.floor);
    player.tileX = destino.x;
    player.tileY = destino.y;
    player.direction = dirFromDelta(
      alvo.tileX - player.tileX, alvo.tileY - player.tileY, player.direction,
    );
  }

  // Área estoura no conjurador; alvo único estoura em cima de quem apanhou.
  const fxAt = def.shape === 'area' ? player : targets[0]!;
  broadcastFloor(player.floor, {
    t: 'fx', kind: def.fx, x: fxAt.tileX, y: fxAt.tileY, floor: player.floor,
    ...(def.shape === 'area' ? { radius: alcance } : {}),
  });

  const d = player.derived;
  // Bash muda de personalidade conforme a arma: machado bate mais forte, maça
  // controla melhor, espada fica no meio. Uma habilidade, três sensações.
  const arma = equippedWeapon(player);
  const sabor = def.kind === 'damage' && def.shape === 'area' && arma
    ? WEAPON_IDENTITY[arma.identity.type].damageMult
    : 1;
  const poderBase = d.physAtk * skillPower(def, nivel) * offenseMult(player)
    * (1 + equipBonus(player).physDamage) * sabor;
  for (const c of targets) {
    // Execução escala com o quanto o alvo já está ferido.
    const poder = def.kind === 'execution'
      ? poderBase * executionMultiplier(nivel, c.hp / c.maxHp)
      : poderBase;
    const { amount, crit } = computeHit(poder, d.critChance, d.critMult);
    // A Ruptura abre a defesa ANTES do próprio golpe entrar.
    if (def.kind === 'rupture') {
      c.defBreakUntil = now + def.durationMs;
      c.defBreakPct = ruptureDefReduction(nivel);
    }
    const dano = Math.max(1, Math.round(amount - creatureDefense(c, now, player)));
    applyLifeSteal(player, dano);
    damageCreature(player, c, dano, crit, now);
  }
  // Usar a habilidade treina a maestria de arma como um golpe normal
  // (uma vez só, mesmo quando o Bash acerta cinco monstros).
  gainSkill(player);
  sendStats(player);
}

/** Quanto tempo a criatura fica presa no Knight depois de Provocar. */
const TAUNT_LOCK_MS = 6000;

/**
 * Entra em Fúria: multiplica o HP máximo e cura junto (o Knight sente o
 * "inchaço" de vida na hora). A partir daqui só sai quando o HP chegar a 1.
 */
function startFury(player: Player, nivel: number): void {
  const stats = furyStats(nivel);
  player.fury = { level: nivel, hpNormal: player.maxHp };
  const novoMax = Math.round(player.maxHp * stats.hpMult);
  const ganho = novoMax - player.maxHp;
  player.maxHp = novoMax;
  player.hp = Math.min(novoMax, player.hp + ganho);
}

/** Termina a Fúria: devolve o teto de vida normal e arma o cooldown de 90 s. */
function endFury(player: Player, now: number): void {
  if (!player.fury) return;
  player.maxHp = player.fury.hpNormal;
  player.hp = Math.min(player.hp, player.maxHp);
  player.fury = null;
  player.spellReadyAt['battle_fury'] = now + SKILLS.battle_fury.cooldownMs;
  send(player, { t: 'chat', from: 'Sistema', text: 'A Fúria de Batalha se esgotou.' });
}

/**
 * Drenagem da Fúria, uma vez por segundo. Esta perda é DIRETA: não passa por
 * defesa, resistência ou carta nenhuma — senão alguém acharia a combinação que
 * zera a drenagem e criaria Fúria permanente. Ela também nunca mata: ao chegar
 * em 1 HP a Fúria simplesmente acaba.
 */
function tickFury(player: Player, now: number): void {
  if (!player.fury) return;
  const dreno = player.maxHp * furyStats(player.fury.level).drainPerSecond;
  player.hp -= dreno;
  if (player.hp <= 1) {
    player.hp = 1;
    endFury(player, now);
  }
}

function creatureAttack(creature: Creature, player: Player, now: number): void {
  if (!player.alive) return;
  creature.lastAttackAt = now;
  // À noite os monstros batem mais forte; a variante incomum também; e um
  // chefe que já dizimou grupos vai ficando mais perigoso a cada vitória.
  const str = creature.def.strength
    * (isNight ? NIGHT_DMG_MULT : 1)
    * VARIANTS[creature.variant].damageMult
    * (1 + creature.triumphs * BOSS_TRIUMPH_POWER);
  const { amount, crit } = computeHit(str, 0.05, 1.5);
  // Etapa 8: o golpe passa pelas camadas do cap. 31 em vez de subtrair a defesa
  // na mão. Ataque de criatura corpo a corpo é dano FÍSICO.
  const res = resolveDamage(amount, 'physical', playerDefenseProfile(player, true));
  const dodged = res.outcome === 'dodged';
  const dmg = res.amount;
  player.hp = Math.max(0, player.hp - dmg);
  if (dmg > 0) onDamaged(player);
  // Golpe que conectou pode aplicar a condição da espécie. Depois de
  // `onDamaged`, senão uma teia entraria e sairia no mesmo golpe.
  if (!dodged) creatureOnHit(creature, player, now);
  const fatal = player.hp <= 0;
  broadcastFloor(player.floor, {
    t: 'hit', attackerId: creature.id, targetId: player.id, amount: dmg, crit, dodged,
    hp: Math.round(player.hp), maxHp: player.maxHp, fatal,
  });
  if (fatal) {
    killPlayer(player, creature.name);
    bossTriumph(creature);
  }
}

/**
 * Chefe que aniquila TODO MUNDO que estava enfrentando ele fica mais forte: HP
 * cheio e um degrau a mais de poder. Só vale para chefes — em monstro comum
 * isso viraria bola de neve injusta (GDD #275, #277).
 *
 * Enquanto restar alguém vivo por perto lutando, não conta como aniquilação.
 */
function bossTriumph(creature: Creature): void {
  if (!creature.def.boss || creature.triumphs >= BOSS_TRIUMPH_MAX) return;
  for (const p of players.values()) {
    if (!p.joined || !p.alive || p.floor !== creature.floor) continue;
    if (chebyshev(p.tileX, p.tileY, creature.tileX, creature.tileY) <= creature.def.aggroRange) {
      return; // ainda tem gente de pé: o grupo não foi dizimado
    }
  }
  creature.triumphs += 1;
  creature.maxHp = Math.round(creature.maxHp * (1 + BOSS_TRIUMPH_POWER));
  creature.hp = creature.maxHp;
  creature.name = `${creature.def.name} (${creature.triumphs}º triunfo)`;
  broadcastFloor(creature.floor, {
    t: 'chat', from: 'Mundo',
    text: `${creature.def.name} dizimou seus desafiantes e ficou mais forte.`,
  });
}

/**
 * Salto Esmagador (`DD-BAL-036`): dano em ÁREA ao redor do chefe.
 *
 * Diferente da magia, não escolhe alvo — pega **todos** os jogadores no raio, no
 * mesmo andar. É a mecânica que ensina posicionamento: ficar colado no chefe com
 * o grupo inteiro passa a custar caro.
 */
function creatureSlam(creature: Creature, now: number): void {
  const s = creature.def.slam;
  if (!s) return;
  creature.lastSlamAt = now;
  broadcastFloor(creature.floor, {
    // 'bash' é o efeito de ÁREA do cliente (anel de corte + lâminas cobrindo o
    // raio real). Antes eu mandava 'whirlwind', que não existe na lista e caía
    // no `else` — desenhando um talho de espada de alvo único num ataque em
    // área. Nome errado, leitura errada.
    t: 'fx', kind: 'bash',
    x: creature.tileX, y: creature.tileY, floor: creature.floor, radius: s.radius,
  });
  const base = s.power * (isNight ? NIGHT_DMG_MULT : 1);
  for (const p of players.values()) {
    if (!p.joined || !p.alive || p.floor !== creature.floor) continue;
    if (chebyshev(p.tileX, p.tileY, creature.tileX, creature.tileY) > s.radius) continue;
    const { amount, crit } = computeHit(base, 0.05, 1.5);
    // Área não é esquivável: o chão inteiro treme. Esquivar de AoE tornaria a
    // lição de posicionamento opcional.
    const dmg = resolveDamage(
      amount, s.damageType ?? 'physical', playerDefenseProfile(p, false),
    ).amount;
    p.hp = Math.max(0, p.hp - dmg);
    onDamaged(p);
    const fatal = p.hp <= 0;
    broadcastFloor(p.floor, {
      t: 'hit', attackerId: creature.id, targetId: p.id, amount: dmg, crit, dodged: false,
      element: s.damageType ?? 'physical',
      hp: Math.round(p.hp), maxHp: p.maxHp, fatal,
    });
    if (fatal) {
      killPlayer(p, creature.name);
      bossTriumph(creature);
    }
  }
}

/**
 * Fúria por vida baixa (`DD-BAL-036`): dispara UMA vez ao cruzar o limiar.
 *
 * 🔴 Só acelera o ATAQUE. O doc é explícito em "sem alterar sua velocidade de
 * deslocamento" — acelerar o passo transformaria a segunda fase numa
 * perseguição impossível, e a lição pretendida é aguentar pressão.
 */
function checkEnrage(creature: Creature, now: number): void {
  const e = creature.def.enrage;
  if (!e || creature.enrageUsed) return;
  if (creature.hp > creature.maxHp * e.hpPct) return;
  creature.enrageUsed = true;
  creature.enrageUntil = now + e.durationMs;
  broadcastFloor(creature.floor, {
    t: 'chat', from: 'Mundo',
    text: `${creature.name} entra em fúria!`,
  });
}

/** Cooldown de ataque efetivo da criatura, já com a fúria se estiver ativa. */
function creatureAttackCooldown(creature: Creature, now: number): number {
  const base = creature.def.attackCooldownMs;
  if (creature.def.enrage && now < creature.enrageUntil) {
    return Math.round(base * creature.def.enrage.attackSpeedMult);
  }
  return base;
}

/** Ataque mágico à distância de um chefe: projétil + dano mágico (reduzido pela
 * resistência mágica do alvo). Só entra em ação a média/longa distância. */
function creatureCastSpell(creature: Creature, player: Player, now: number): void {
  if (!player.alive || !creature.def.spell) return;
  creature.lastSpellAt = now;
  const spell = creature.def.spell;
  broadcastFloor(creature.floor, {
    t: 'projectile', fromId: creature.id, toX: player.tileX, toY: player.tileY,
    floor: creature.floor, kind: spell.projectile,
  });
  const base = spell.power * (isNight ? NIGHT_DMG_MULT : 1);
  const { amount, crit } = computeHit(base, 0.05, 1.5);
  // Etapa 8: magia de criatura tem TIPO (`DD-ELM-002`). Sem `damageType`
  // declarado, vale fogo. A magia continua não sendo esquivável.
  const res = resolveDamage(
    amount,
    spell.damageType ?? 'fire',
    playerDefenseProfile(player, false),
  );
  const dmg = res.amount;
  player.hp = Math.max(0, player.hp - dmg);
  if (dmg > 0) onDamaged(player);
  const fatal = player.hp <= 0;
  broadcastFloor(player.floor, {
    t: 'hit', attackerId: creature.id, targetId: player.id, amount: dmg, crit, dodged: false,
    hp: Math.round(player.hp), maxHp: player.maxHp, fatal,
  });
  if (fatal) killPlayer(player, creature.name);
}

/** Quantos lacaios vivos um chefe tem no mundo (respeita o teto `maxAlive`). */
function countSummons(bossId: string): number {
  let n = 0;
  for (const c of creatures.values()) if (c.alive && c.summonedBy === bossId) n++;
  return n;
}

/** Chefe invoca um lacaio adjacente, já agressivo no alvo atual do chefe. */
function summonMinion(boss: Creature): void {
  const s = boss.def.summon;
  if (!s) return;
  const minion = spawnCreature(s.type, boss.tileX, boss.tileY, { summonedBy: boss.id });
  if (minion) minion.targetId = boss.targetId;
}

// ---------------------------------------------------------------------------
// Comandos de desenvolvimento
// ---------------------------------------------------------------------------
/**
 * Comandos de teste, para experimentar conteúdo de nível alto sem farmar horas.
 * Só existem quando o servidor sobe com ELYSIA_DEV=1 (`npm run dev:test`) — num
 * servidor normal viram mensagem de chat comum.
 *
 *   /level <n>   define o nível e concede os pontos correspondentes
 *   /sp <n>      dá Skill Points avulsos
 *   /gold <n>    define o ouro
 *   /heal        enche vida e mana
 *   /cond <id>   aplica uma condição em você (Etapa 8)
 *   /uncond      limpa todas as condições
 *
 * Devolve true quando consumiu o texto (não deve virar chat).
 */
const DEV_MODE = process.env.ELYSIA_DEV === '1';
function handleDevCommand(player: Player, text: string): boolean {
  if (!DEV_MODE) return false;
  const [cmd, arg] = text.slice(1).split(/\s+/);
  const n = Number(arg);
  const aviso = (t: string): void => send(player, { t: 'chat', from: 'DEV', text: t });

  switch (cmd) {
    // Sem isto a Etapa 8 é intestável na mão: nenhuma habilidade aplica
    // condição ainda, então não há como ver veneno, congelamento ou silêncio
    // acontecendo no jogo.
    case 'cond': {
      const id = arg as ConditionId;
      if (!arg || !CONDITIONS[id]) {
        return aviso(`uso: /cond <${CONDITION_IDS.join('|')}>`), true;
      }
      const def = CONDITIONS[id];
      applyConditionTo(
        player, id, 1, def.referenceDurationMs, Date.now(),
        // DoT precisa de potência; controle não usa.
        def.dot ? 8 : undefined,
        player.id,
      );
      return aviso(`${def.name} aplicado por ${def.referenceDurationMs} ms.`), true;
    }
    case 'uncond': {
      player.conditions = [];
      return aviso('condições limpas.'), true;
    }
    case 'level': {
      if (!Number.isFinite(n) || n < 1 || n > 500) return aviso('uso: /level <1..500>'), true;
      // Reconstrói a ficha do nível 1 até `n`, concedendo tudo que seria ganho.
      while (player.level < n) {
        player.level += 1;
        player.unspentPoints += pointsForLevel(player.level);
        player.skillPoints += skillPointsAtLevel(player.cls.id, player.level);
        if (player.level % TALENT_EVERY_LEVELS === 0) player.talentPoints += 1;
      }
      player.xp = 0;
      recompute(player, true);
      player.hp = player.maxHp;
      player.mana = player.maxMana;
      send(player, { t: 'levelup', level: player.level });
      sendStats(player);
      aviso(`nível ${player.level} · ${player.unspentPoints} pontos · ${player.skillPoints} SP`);
      return true;
    }
    case 'sp': {
      if (!Number.isFinite(n)) return aviso('uso: /sp <n>'), true;
      player.skillPoints += n;
      sendStats(player);
      aviso(`${player.skillPoints} Skill Points`);
      return true;
    }
    case 'gold': {
      if (!Number.isFinite(n)) return aviso('uso: /gold <n>'), true;
      setGold(player, n);
      sendStats(player);
      sendInventory(player);
      aviso(`ouro: ${player.gold}`);
      return true;
    }
    case 'heal': {
      player.hp = player.maxHp;
      player.mana = player.maxMana;
      sendStats(player);
      aviso('curado');
      return true;
    }
    case 'tp': {
      // Teleporta para um tile — testar corpo, dungeon e chefe sem caminhar.
      const [, , yArg] = text.slice(1).split(/\s+/);
      const ty = Number(yArg);
      if (!Number.isFinite(n) || !Number.isFinite(ty)) return aviso('uso: /tp <x> <y>'), true;
      if (!isWalkable(map, n, ty, player.floor)) return aviso('tile bloqueado'), true;
      player.tileX = n;
      player.tileY = ty;
      aviso(`teleportado para (${n}, ${ty})`);
      return true;
    }
    case 'hp': {
      // Útil para testar morte, Execução e o fim da Fúria sem esperar minutos.
      if (!Number.isFinite(n) || n < 1) return aviso('uso: /hp <n>'), true;
      player.hp = Math.min(player.maxHp, n);
      sendStats(player);
      aviso(`vida: ${Math.round(player.hp)}/${player.maxHp}`);
      return true;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Contas, personagens e persistência
// ---------------------------------------------------------------------------

function sendCharList(player: Player, error?: string): void {
  const chars = store.listCharacters(player.accountId).map((c) => ({
    id: c.id,
    name: c.name,
    charClass: c.cls as PlayerClass,
    gender: c.gender as Gender,
    level: c.level,
  }));
  send(player, { t: 'charlist', characters: chars, ...(error ? { error } : {}) });
}

function sendTowns(player: Player): void {
  send(player, {
    t: 'towns',
    visited: [...player.visitedTowns],
    respawn: player.respawnTown,
  });
}

/**
 * Cria o personagem no banco com a ficha inicial da classe.
 *
 * Ele NASCE no vilarejo inicial — não na cidade grande (regra do dono). A
 * cidade principal só vira ponto de renascimento depois que este personagem
 * caminhar até lá.
 */
function createCharacterFor(player: Player, name: string, cls: ClassDef, gender: Gender): number {
  const vila = starterTown();
  const attributes = { ...cls.base };
  const skill: SkillState = { kind: cls.skill, level: START_SKILL_LEVEL, progress: 0 };
  const derived = computeStats(cls, attributes, 1, skill);

  const ficha = {
    name, gender,
    attributes, skill,
    level: 1, xp: 0, unspentPoints: 0, talentPoints: 0,
    hp: derived.maxHp, mana: derived.maxMana, gold: 50,
    bankGold: 0, // começa sem nada guardado
    backpack: emptySlots(BACKPACK_SIZE),
    equipment: { container: { kind: 'backpack', amount: 1 } } as Partial<Record<EquipSlot, ItemStack>>,
    depot: emptySlots(DEPOT_SIZE),
    tileX: vila.spawn.x, tileY: vila.spawn.y, floor: vila.spawn.floor,
    // Pontos do próprio nível 1: nasce podendo aprender a primeira habilidade
    // da árvore em vez de esperar o nível 2.
    skillPoints: skillPointsAtLevel(cls.id, 1),
    skillLevels: {} as SkillLevels,
    skillResets: 0,
    proficiencies: {} as Proficiencies,
    bestiary: {} as BestiaryState,
  };
  // Kit inicial: poções + ouro, como era no fluxo antigo.
  addStackTo(ficha.backpack, 'health_potion', 5);
  addStackTo(ficha.backpack, 'mana_potion', 3);

  const stored = toStored(ficha, 0, player.accountId, cls.id, vila.id, [vila.id]);
  return store.createCharacter(stored);
}

/** Aplica no Player em memória tudo que veio do banco. */
function applyStoredCharacter(player: Player, c: ReturnType<typeof store.loadCharacter>): void {
  if (!c) return;
  const cls = CLASSES[c.cls as PlayerClass] ?? CLASSES.knight;
  const parsed = fromStored(c);
  const { backpack, depot, equipment } = rowsToItems(c.items, BACKPACK_SIZE, DEPOT_SIZE);

  player.characterId = c.id;
  player.name = c.name;
  player.cls = cls;
  player.gender = c.gender === 'female' ? 'female' : 'male';
  player.attributes = parsed.attributes;
  player.skill = parsed.skill;
  player.level = c.level;
  player.xp = c.xp;
  player.unspentPoints = c.unspentPoints;
  player.talentPoints = c.talentPoints;
  player.gold = c.gold;
  player.bankGold = c.bankGold;
  player.backpack = backpack;
  player.depot = depot;
  player.equipment = equipment;
  player.tileX = c.tileX;
  player.tileY = c.tileY;
  player.floor = c.floor;
  player.skillPoints = c.skillPoints;
  player.skillLevels = parsed.skillLevels;
  player.skillResets = c.skillResets;
  player.proficiencies = parsed.proficiencies;
  player.bestiary = parsed.bestiary;
  player.respawnTown = c.respawnTown;
  player.visitedTowns = new Set(c.visitedTowns);

  recompute(player);
  // Clampa: o teto pode ter mudado (rebalanceamento entre sessões).
  player.hp = Math.min(c.hp, player.maxHp);
  player.mana = Math.min(c.mana, player.maxMana);
  player.alive = player.hp > 0;
  if (!player.alive) player.hp = 1, player.alive = true;
}

/** Grava o personagem. Silencioso: falha de disco não pode derrubar o tick. */
function saveCharacter(player: Player): void {
  if (!player.characterId || !player.joined) return;
  try {
    store.saveCharacter(
      toStored(player, player.characterId, player.accountId, player.cls.id,
        player.respawnTown, [...player.visitedTowns]),
    );
  } catch (err) {
    console.error(`[save] falhou para ${player.name}:`, (err as Error).message);
  }
}

/**
 * Detecta que o jogador entrou numa cidade e registra a visita. É isto que
 * libera usá-la como ponto de renascimento depois.
 */
function checkTownVisit(player: Player): void {
  const town = townAt(player.tileX, player.tileY, player.floor);
  if (!town || player.visitedTowns.has(town.id)) return;
  player.visitedTowns.add(town.id);
  store.markTownVisited(player.characterId, town.id);
  send(player, { t: 'chat', from: 'Sistema', text: `Você descobriu ${town.name}.` });
  sendTowns(player);
}

// ---------------------------------------------------------------------------
// Mensagens do cliente
// ---------------------------------------------------------------------------
function handleMessage(player: Player, msg: ClientMessage): void {
  switch (msg.t) {
    case 'auth': {
      if (msg.protocol !== PROTOCOL_VERSION) {
        send(player, { t: 'denied', reason: 'Versão de protocolo incompatível.' });
        return;
      }
      const res = msg.mode === 'register'
        ? store.registerAccount(msg.username, msg.password)
        : store.login(msg.username, msg.password);
      if (!res.ok) {
        send(player, { t: 'authresult', ok: false, message: res.message });
        return;
      }
      player.accountId = res.account.id;
      send(player, { t: 'authresult', ok: true, username: res.account.username });
      sendCharList(player);
      console.log(`[auth] ${res.account.username} (conta ${res.account.id})`);
      break;
    }

    case 'createchar': {
      if (!player.accountId) {
        send(player, { t: 'denied', reason: 'Faça login primeiro.' });
        return;
      }
      // O cliente já valida para dar erro na hora — mas o servidor revalida,
      // porque cliente mente.
      const check = checkName(msg.name);
      if (!check.ok) {
        sendCharList(player, check.message);
        return;
      }
      if (store.isNameTaken(check.name)) {
        sendCharList(player, 'Já existe um personagem com esse nome.');
        return;
      }
      const cls = CLASSES[msg.charClass];
      if (!cls) {
        sendCharList(player, 'Classe inválida.');
        return;
      }
      createCharacterFor(player, check.name, cls, msg.gender === 'female' ? 'female' : 'male');
      sendCharList(player);
      console.log(`[novo] ${check.name} — ${cls.name} (conta ${player.accountId})`);
      break;
    }

    case 'setrespawn': {
      if (!player.characterId) return;
      // Só libera se ELE já pisou lá. Conhecer o mapa é da conta; renascer é
      // progressão do personagem (40.21 + regra do dono).
      if (!player.visitedTowns.has(msg.town)) {
        send(player, { t: 'denied', reason: 'Você precisa visitar essa cidade antes.' });
        return;
      }
      if (store.setRespawnTown(player.characterId, msg.town)) {
        player.respawnTown = msg.town;
        sendTowns(player);
      }
      break;
    }

    case 'hello': {
      if (msg.protocol !== PROTOCOL_VERSION) {
        send(player, { t: 'denied', reason: 'Versão de protocolo incompatível.' });
        return;
      }
      if (!player.accountId) {
        send(player, { t: 'denied', reason: 'Faça login primeiro.' });
        return;
      }
      // Confere que o personagem é DESTA conta — senão qualquer um entraria
      // com o personagem alheio mandando o id na mão.
      const stored = store.loadCharacter(msg.characterId);
      if (!stored || stored.accountId !== player.accountId) {
        send(player, { t: 'denied', reason: 'Personagem não encontrado nesta conta.' });
        return;
      }
      // Já está online (outra aba)? Derruba a sessão antiga em vez de deixar
      // duas conexões salvando por cima uma da outra.
      for (const outro of players.values()) {
        if (outro !== player && outro.characterId === stored.id) {
          send(outro, { t: 'denied', reason: 'Este personagem entrou em outra sessão.' });
          outro.socket.close();
        }
      }
      applyStoredCharacter(player, stored);
      player.joined = true;
      send(player, { t: 'welcome', protocol: PROTOCOL_VERSION, playerId: player.id, serverTickHz: SERVER_TICK_HZ });
      sendStats(player);
      sendInventory(player);
      sendTowns(player);
      console.log(`[join] ${player.name} — ${player.cls.name} nv.${player.level} (${player.id})`);
      break;
    }
    case 'move': {
      if (!player.joined || !player.alive) return;
      player.lastAckSeq = msg.seq;
      // Normaliza para {-1,0,1}; ambos ≠ 0 = passo diagonal (estilo Tibia).
      const dx = msg.dx > 0 ? 1 : msg.dx < 0 ? -1 : 0;
      const dy = msg.dy > 0 ? 1 : msg.dy < 0 ? -1 : 0;
      if (dx === 0 && dy === 0) return;
      player.direction = dirFromDelta(dx, dy, player.direction);
      const now = Date.now();
      // Diagonal percorre √2 de distância: custa ~1.5x o tempo para não virar
      // atalho de velocidade (no Tibia diagonal é mais lento que reto).
      const diagonal = dx !== 0 && dy !== 0;
      // Etapa 8: Congelamento, Petrificação, Stun e Aprisionamento prendem os
      // pés. A checagem vem antes de tudo — o servidor é a autoridade, então
      // não basta o cliente não mandar a intenção.
      const restr = restrictionsOf(player.conditions);
      if (!restr.canMove) return;
      // Postura Defensiva cobra o preço também na mobilidade, e a Lentidão soma
      // por cima dela.
      const base = player.derived.moveIntervalMs
        * (player.stance ? 1 + STANCE_SLOW : 1)
        * (1 + restr.slowPct);
      const interval = diagonal ? base * 1.5 : base;
      if (now - player.lastMoveAt < interval) return;
      const nx = player.tileX + dx;
      const ny = player.tileY + dy;
      if (!isWalkable(map, nx, ny, player.floor)) return;
      // Monstro é obstáculo, como parede (pedido do dono). Antes o jogador
      // atravessava criatura, e o sprite passava por cima dela.
      if (tileOccupied(nx, ny, player.floor, player.id)) return;
      player.tileX = nx;
      player.tileY = ny;
      player.lastMoveAt = now;
      const link = floorLinkAt(map, nx, ny, player.floor);
      if (link) {
        player.floor = link.toFloor;
        player.tileX = link.toX;
        player.tileY = link.toY;
        player.targetId = null;
      }
      // Andou: pode ter entrado numa cidade nova pela primeira vez.
      checkTownVisit(player);
      break;
    }
    case 'attack': {
      if (!player.joined || !player.alive) return;
      const target = creatures.get(msg.targetId);
      if (target && target.alive && target.floor === player.floor) player.targetId = msg.targetId;
      else send(player, { t: 'denied', reason: 'Alvo inválido.' });
      break;
    }
    case 'cancel': {
      player.targetId = null;
      break;
    }
    case 'cast': {
      if (!player.joined || !player.alive) return;
      const def = getSkill(msg.spell);
      if (!def) {
        send(player, { t: 'denied', reason: 'Habilidade desconhecida.' });
        return;
      }
      castSpell(player, def, Date.now());
      break;
    }
    case 'skillup': {
      if (!player.joined) return;
      const def = getSkill(msg.skill);
      if (!def) {
        send(player, { t: 'denied', reason: 'Habilidade desconhecida.' });
        return;
      }
      // Uma checagem só decide tudo (classe, nível, pré-requisito, pontos) e
      // já devolve a mensagem certa para o jogador.
      const bloqueio = skillUpBlockedReason(
        def, player.cls.id, player.level, player.skillLevels, player.skillPoints,
      );
      if (bloqueio) {
        send(player, { t: 'denied', reason: bloqueio });
        return;
      }
      const atual = skillLevelOf(player.skillLevels, def.id);
      player.skillPoints -= skillUpgradeCost(atual);
      player.skillLevels[def.id as SkillId] = atual + 1;
      sendStats(player);
      break;
    }
    case 'opencorpse': {
      if (!player.joined || !player.alive) return;
      const corpse = corpses.get(msg.corpseId);
      if (!corpse) {
        send(player, { t: 'denied', reason: 'Esse corpo não existe mais.' });
        return;
      }
      if (corpse.floor !== player.floor
        || chebyshev(player.tileX, player.tileY, corpse.tileX, corpse.tileY) > 1) {
        send(player, { t: 'denied', reason: 'Aproxime-se do corpo.' });
        return;
      }
      sendCorpse(player, corpse);
      break;
    }
    case 'loot': {
      if (!player.joined || !player.alive) return;
      const corpse = corpses.get(msg.corpseId);
      if (!corpse) {
        send(player, { t: 'denied', reason: 'Esse corpo não existe mais.' });
        return;
      }
      if (corpse.floor !== player.floor
        || chebyshev(player.tileX, player.tileY, corpse.tileX, corpse.tileY) > 1) {
        send(player, { t: 'denied', reason: 'Aproxime-se do corpo.' });
        return;
      }
      const stack = corpse.items[msg.index];
      if (!stack) return;
      // Ouro do corpo vai direto para a bolsa de moedas de quem saqueou.
      if (isGold(stack.kind)) {
        const def = getItem(stack.kind);
        setGold(player, player.gold + stack.amount * (def?.value ?? 1));
      } else if (!addToBackpack(player, stack.kind, stack.amount, stack.roll)) {
        send(player, { t: 'denied', reason: 'Mochila cheia.' });
        return;
      }
      corpse.items[msg.index] = null;
      // Corpo vazio some rápido: o mundo não fica poluído de cadáveres.
      if (corpse.items.every((s) => s === null)) {
        corpse.expiresAt = Math.min(corpse.expiresAt, Date.now() + CORPSE_EMPTY_TTL_MS);
      }
      sendCorpse(player, corpse);
      sendStats(player);
      sendInventory(player);
      break;
    }
    case 'skillreset': {
      if (!player.joined) return;
      const gastos = Object.entries(player.skillLevels)
        .reduce((soma, [, nivel]) => soma + skillTotalCostOf(nivel ?? 0), 0);
      if (gastos === 0) {
        send(player, { t: 'denied', reason: 'Você não tem Skill Points investidos.' });
        return;
      }
      const custo = skillResetCost(player.skillResets);
      if (player.gold < custo) {
        send(player, { t: 'denied', reason: `Reset de skills custa ${custo} de ouro.` });
        return;
      }
      setGold(player, player.gold - custo);
      player.skillPoints += gastos;
      player.skillLevels = {};
      player.spellReadyAt = {};
      player.skillResets += 1;
      sendStats(player);
      sendInventory(player);
      send(player, { t: 'chat', from: 'Sistema', text: `Skills resetadas: ${gastos} pontos devolvidos.` });
      break;
    }
    case 'allocate': {
      if (!player.joined) return;
      if (!ATTRIBUTE_KEYS.includes(msg.attr)) return;
      // Custo CRESCENTE (GDD §4): quanto mais alto o atributo, mais caro o +1.
      const custo = attributeCost(player.attributes[msg.attr]);
      if (player.unspentPoints < custo) {
        send(player, {
          t: 'denied',
          reason: `Faltam pontos: +1 ${msg.attr.toUpperCase()} custa ${custo} (você tem ${player.unspentPoints}).`,
        });
        return;
      }
      player.attributes[msg.attr] += 1;
      player.unspentPoints -= custo;
      recompute(player, true);
      sendStats(player);
      break;
    }
    case 'chat': {
      if (!player.joined) return;
      const text = msg.text.trim().slice(0, 200);
      if (text.length === 0) return;
      if (text.startsWith('/') && handleDevCommand(player, text)) return;
      broadcastFloor(player.floor, { t: 'chat', from: player.name, text });
      break;
    }
    case 'ping': {
      send(player, { t: 'pong', time: msg.time });
      break;
    }
    case 'buy': {
      if (!player.joined || !player.alive) return;
      if (!nearVendor(player)) {
        send(player, { t: 'denied', reason: 'Aproxime-se do comerciante.' });
        return;
      }
      const def = getItem(msg.kind);
      if (!def || def.buyPrice <= 0 || !VENDOR_STOCK.includes(msg.kind)) {
        send(player, { t: 'denied', reason: 'Item indisponível.' });
        return;
      }
      if (player.gold < def.buyPrice) {
        send(player, { t: 'denied', reason: 'Ouro insuficiente.' });
        return;
      }
      if (!addToBackpack(player, msg.kind, 1)) {
        send(player, { t: 'denied', reason: 'Mochila cheia.' });
        return;
      }
      setGold(player, player.gold - def.buyPrice);
      sendStats(player);
      sendInventory(player);
      break;
    }
    case 'sell': {
      if (!player.joined || !player.alive) return;
      if (!nearVendor(player)) {
        send(player, { t: 'denied', reason: 'Aproxime-se do comerciante.' });
        return;
      }
      const slot = player.backpack[msg.index];
      if (!slot) {
        send(player, { t: 'denied', reason: 'Slot vazio.' });
        return;
      }
      // O preço sai do `roll` DESTE slot: uma Relíquia vale mais que a Comum do
      // mesmo tipo (ver `sellPriceOf`).
      const unit = sellPriceOf(slot.kind, slot.roll);
      if (unit <= 0) {
        send(player, { t: 'denied', reason: 'O comerciante não compra isso.' });
        return;
      }
      // Equipamento é sempre 1 (não empilha, e cada peça tem o roll dela).
      const pedido = Math.max(1, Math.floor(msg.amount ?? 1));
      const qtd = getItem(slot.kind)?.stackable ? Math.min(pedido, slot.amount) : 1;
      slot.amount -= qtd;
      if (slot.amount <= 0) player.backpack[msg.index] = null;
      setGold(player, player.gold + unit * qtd);
      sendStats(player);
      sendInventory(player);
      break;
    }
    case 'bank': {
      if (!player.joined || !player.alive) return;
      if (!nearBank(player)) {
        send(player, { t: 'denied', reason: 'Aproxime-se do Banqueiro.' });
        return;
      }
      // Limita ao que existe do lado de origem em vez de recusar: quem clica em
      // "Depositar tudo" com o ouro mudando no mesmo instante não merece um erro.
      const pedido = Math.floor(msg.amount);
      if (!Number.isFinite(pedido) || pedido <= 0) {
        send(player, { t: 'denied', reason: 'Quantia inválida.' });
        return;
      }
      if (msg.op === 'deposit') {
        const qtd = Math.min(pedido, player.gold);
        if (qtd <= 0) {
          send(player, { t: 'denied', reason: 'Você não tem ouro em mão.' });
          return;
        }
        player.bankGold += qtd;
        setGold(player, player.gold - qtd);
      } else {
        const qtd = Math.min(pedido, player.bankGold);
        if (qtd <= 0) {
          send(player, { t: 'denied', reason: 'Não há ouro guardado.' });
          return;
        }
        player.bankGold -= qtd;
        setGold(player, player.gold + qtd);
      }
      sendStats(player);
      sendInventory(player);
      break;
    }
    case 'use': {
      if (!player.joined || !player.alive) return;
      const slot = player.backpack[msg.index];
      if (!slot) return;
      const def = getItem(slot.kind);
      if (!def || def.category !== 'consumable') {
        send(player, { t: 'denied', reason: 'Não dá para usar isso.' });
        return;
      }
      if (def.healHp) player.hp = Math.min(player.maxHp, player.hp + def.healHp);
      if (def.healMana) player.mana = Math.min(player.maxMana, player.mana + def.healMana);
      slot.amount -= 1;
      if (slot.amount <= 0) player.backpack[msg.index] = null;
      sendStats(player);
      sendInventory(player);
      break;
    }
    case 'equip': {
      if (!player.joined) return;
      const slot = player.backpack[msg.index];
      if (!slot) return;
      const def = getItem(slot.kind);
      if (!def || def.category !== 'equip' || !def.slot) {
        send(player, { t: 'denied', reason: 'Item não equipável.' });
        return;
      }
      if (def.slot === 'container') {
        // Trocar a MOCHILA equipada: redimensiona a lista de slots. O container
        // antigo volta pra dentro da nova mochila. Trava se não couber tudo.
        const newCap = def.capacity ?? 0;
        const items = player.backpack.filter((s, i) => s && i !== msg.index) as ItemStack[];
        const prev = player.equipment.container;
        if (newCap < items.length + (prev ? 1 : 0)) {
          send(player, { t: 'denied', reason: 'A mochila nova é pequena demais para os itens.' });
          return;
        }
        player.equipment.container = { kind: slot.kind, amount: 1 };
        const nb: (ItemStack | null)[] = new Array(newCap).fill(null);
        let k = 0;
        for (const it of items) nb[k++] = it;
        if (prev) nb[k++] = prev;
        player.backpack = nb;
        sendInventory(player);
        break;
      }
      // Arma de DUAS MÃOS não convive com escudo: o escudo volta pra mochila.
      // A troca é a graça do sistema — 2H dá mais atributo, 1H libera defesa.
      if (def.slot === 'weapon' && def.weaponType && WEAPON_IDENTITY[def.weaponType].hands === 2) {
        const escudo = player.equipment.shield;
        if (escudo) {
          if (!addToBackpack(player, escudo.kind, 1, escudo.roll)) {
            send(player, { t: 'denied', reason: 'Guarde o escudo antes: esta arma é de duas mãos.' });
            return;
          }
          delete player.equipment.shield;
        }
      }
      // E escudo não entra se a arma equipada ocupa as duas mãos.
      if (def.slot === 'shield') {
        const arma = equippedWeapon(player);
        if (arma && arma.identity.hands === 2) {
          send(player, {
            t: 'denied',
            reason: `${arma.identity.name} ocupa as duas mãos — não dá para usar escudo.`,
          });
          return;
        }
      }
      // Troca comum: o que estava equipado volta pra mochila (mesmo slot).
      const prev = player.equipment[def.slot];
      player.equipment[def.slot] = { kind: slot.kind, amount: 1, ...(slot.roll ? { roll: slot.roll } : {}) };
      player.backpack[msg.index] = prev ?? null;
      recompute(player);
      sendStats(player);
      sendInventory(player);
      break;
    }
    case 'unequip': {
      if (!player.joined) return;
      if (msg.slot === 'container') {
        send(player, { t: 'denied', reason: 'Equipe outra mochila para trocar esta.' });
        return;
      }
      const eq = player.equipment[msg.slot];
      if (!eq) return;
      if (!addToBackpack(player, eq.kind, 1, eq.roll)) {
        send(player, { t: 'denied', reason: 'Mochila cheia.' });
        return;
      }
      delete player.equipment[msg.slot];
      recompute(player);
      sendStats(player);
      sendInventory(player);
      break;
    }
    case 'store': {
      if (!player.joined) return;
      if (!atDepot(player)) {
        send(player, { t: 'denied', reason: 'Você precisa estar no Depósito.' });
        return;
      }
      const from = msg.to === 'depot' ? player.backpack : player.depot;
      const to = msg.to === 'depot' ? player.depot : player.backpack;
      const stack = from[msg.index];
      if (!stack) return;
      // Empilha no destino se stackable, senão ocupa um slot vazio.
      const def = getItem(stack.kind);
      if (def?.stackable) {
        const dst = to.find((s) => s && s.kind === stack.kind);
        if (dst) {
          dst.amount += stack.amount;
          from[msg.index] = null;
          sendInventory(player);
          break;
        }
      }
      const empty = to.indexOf(null);
      if (empty < 0) {
        send(player, { t: 'denied', reason: msg.to === 'depot' ? 'Depósito cheio.' : 'Mochila cheia.' });
        return;
      }
      to[empty] = stack;
      from[msg.index] = null;
      sendInventory(player);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Loop de jogo
// ---------------------------------------------------------------------------
function nearestPlayerTo(c: Creature): Player | null {
  // Provocado: a criatura ignora quem está mais perto e vai atrás de quem
  // provocou, enquanto o efeito durar. É o que deixa o Knight tirar monstros
  // de cima do Archer/Sorcerer.
  if (c.tauntedBy && Date.now() < c.tauntUntil) {
    const provocador = players.get(c.tauntedBy);
    if (provocador?.joined && provocador.alive && provocador.floor === c.floor) return provocador;
    c.tauntedBy = null;
  }
  let best: Player | null = null;
  let bestDist = Infinity;
  for (const p of players.values()) {
    if (!p.joined || !p.alive || p.floor !== c.floor) continue;
    const d = chebyshev(c.tileX, c.tileY, p.tileX, p.tileY);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best && bestDist <= c.def.aggroRange ? best : null;
}

function updateCreatures(now: number): void {
  for (const c of creatures.values()) {
    if (!c.alive) {
      if (now >= c.respawnAt) {
        c.alive = true;
        c.hp = c.maxHp;
        c.tileX = c.homeX;
        c.tileY = c.homeY;
        c.targetId = null;
        c.conditions = []; // renascer limpa o estado, como o HP
      }
      continue;
    }
    // Etapa 8: criatura sob controle total não anda, não ataca e não conjura.
    // Pular a IA inteira é o comportamento certo — deixá-la "pensando" faria
    // ela teleportar para a posição nova assim que o controle acabasse.
    if (!restrictionsOf(c.conditions).canMove) continue;
    const avoidCenter = !!c.def.avoidCenter;
    let target = c.targetId ? players.get(c.targetId) : null;
    if (target && (!target.alive || target.floor !== c.floor || chebyshev(c.tileX, c.tileY, target.tileX, target.tileY) > c.def.aggroRange + 2)) {
      target = null;
      c.targetId = null;
    }
    // Chefe que evita o centro também DESISTE de quem se refugia lá dentro.
    if (target && avoidCenter && inCenterSafeZone(target.tileX, target.tileY)) {
      target = null;
      c.targetId = null;
    }
    const behavior = c.def.behavior ?? 'hostile';
    // À noite os monstros se movem e atacam mais rápido (cooldowns menores).
    const spd = isNight ? NIGHT_SPEED_MULT : 1;
    const moveCd = c.def.moveCooldownMs * spd;
    const atkCd = c.def.attackCooldownMs * spd;

    // NEUTRO esfria: passado um tempo sem apanhar, larga o alvo e volta à
    // rotina. É o que faz o javali parecer bicho, e não monstro de dungeon.
    if (target && behavior === 'neutral' && now - c.lastHurtAt > NEUTRAL_CALM_DOWN_MS) {
      target = null;
      c.targetId = null;
    }

    // Só quem começa briga sozinho procura alvo. O neutro e o pacífico entram
    // aqui apenas quando já foram provocados (o dano define o targetId).
    if (!target && startsFight(behavior)) {
      const found = nearestPlayerTo(c);
      // Não fixa alvo escondido na zona central (chefe respeita o santuário).
      if (found && !(avoidCenter && inCenterSafeZone(found.tileX, found.tileY))) {
        target = found;
        c.targetId = found.id;
      }
    }

    // PACÍFICO: em vez de caçar, corre na direção oposta enquanto o jogador
    // estiver por perto. Nunca ataca.
    if (fleesFromPlayers(behavior)) {
      const perto = nearestPlayerTo(c);
      if (perto && now - c.lastMoveAt >= moveCd) {
        const fx = c.tileX * 2 - perto.tileX;
        const fy = c.tileY * 2 - perto.tileY;
        const step = stepToward(c.tileX, c.tileY, fx, fy, c.floor, avoidCenter, c.id);
        if (step) {
          c.tileX = step.x;
          c.tileY = step.y;
          c.direction = dirFromDelta(step.x - c.tileX, step.y - c.tileY, c.direction);
          c.lastMoveAt = now;
        }
        continue; // fugir é a única coisa que ele faz
      }
    }
    if (target) {
      const dist = chebyshev(c.tileX, c.tileY, target.tileX, target.tileY);
      c.direction = dirFromDelta(target.tileX - c.tileX, target.tileY - c.tileY, c.direction);
      // Chefe invoca lacaios de tempos em tempos (poucos: teto em maxAlive).
      if (c.def.summon && now - c.lastSummonAt >= c.def.summon.cooldownMs) {
        const alive = countSummons(c.id);
        if (alive < c.def.summon.maxAlive) {
          const n = Math.min(c.def.summon.count, c.def.summon.maxAlive - alive);
          for (let i = 0; i < n; i++) summonMinion(c);
          c.lastSummonAt = now;
        }
      }
      // Salto Esmagador: pega quem estiver colado, então ele salta assim que o
      // alvo entra no alcance — antes de checar corpo a corpo, senão nunca
      // sairia, porque a distância 1 satisfaz as duas condições.
      if (
        c.def.slam && dist <= c.def.slam.range
        && now - c.lastSlamAt >= c.def.slam.cooldownMs
      ) {
        creatureSlam(c, now);
      } else if (dist <= 1) {
        if (now - c.lastAttackAt >= creatureAttackCooldown(c, now)) creatureAttack(c, target, now);
      } else if (
        c.def.spell && dist >= c.def.spell.rangeMin && dist <= c.def.spell.range &&
        now - c.lastSpellAt >= c.def.spell.cooldownMs
      ) {
        // Longe demais para o corpo a corpo, perto o bastante para a magia.
        creatureCastSpell(c, target, now);
      } else if (now - c.lastMoveAt >= moveCd) {
        const step = stepToward(c.tileX, c.tileY, target.tileX, target.tileY, c.floor, avoidCenter, c.id);
        if (step) { c.tileX = step.x; c.tileY = step.y; c.lastMoveAt = now; }
      }
    } else if (chebyshev(c.tileX, c.tileY, c.homeX, c.homeY) > 6) {
      // SEM alvo e LONGE de casa: volta andando ao ponto de origem (leash). Sem
      // isto, um monstro que perde o alvo longe — como o chefe na borda do centro,
      // onde não pode entrar — ficava PARALISADO, sem como perseguir nem perambular.
      if (now - c.lastMoveAt >= moveCd) {
        c.direction = dirFromDelta(c.homeX - c.tileX, c.homeY - c.tileY, c.direction);
        const step = stepToward(c.tileX, c.tileY, c.homeX, c.homeY, c.floor, avoidCenter, c.id);
        if (step) { c.tileX = step.x; c.tileY = step.y; c.lastMoveAt = now; }
      }
    } else if (now - c.lastMoveAt >= moveCd * 2 && Math.random() < 0.3) {
      // Perto de casa: perambula devagar dentro de um raio pequeno.
      const dirs = Object.values(DIRECTION_VECTORS);
      const v = dirs[Math.floor(Math.random() * dirs.length)]!;
      const nx = c.tileX + v.dx;
      const ny = c.tileY + v.dy;
      if (chebyshev(nx, ny, c.homeX, c.homeY) <= 6 && creatureCanEnter(nx, ny, c.floor, avoidCenter, c.id)) {
        c.tileX = nx;
        c.tileY = ny;
        c.direction = dirFromDelta(v.dx, v.dy, c.direction);
        c.lastMoveAt = now;
      }
    }
  }
}

function updatePlayers(now: number): void {
  for (const player of players.values()) {
    if (!player.joined) continue;
    if (!player.alive) {
      if (now >= player.deadUntil) respawnPlayer(player);
      continue;
    }
    if (player.targetId) {
      const target = creatures.get(player.targetId);
      if (!target || !target.alive || target.floor !== player.floor) {
        player.targetId = null;
      } else if (chebyshev(player.tileX, player.tileY, target.tileX, target.tileY) <= player.derived.attackRange) {
        player.direction = dirFromDelta(target.tileX - player.tileX, target.tileY - player.tileY, player.direction);
        // Em Fúria o Knight bate mais rápido.
        const cadencia = player.fury
          ? player.derived.attackCooldownMs * (1 - furyStats(player.fury.level).attackSpeedBonus)
          : player.derived.attackCooldownMs;
        if (now - player.lastAttackAt >= cadencia) playerAttack(player, target, now);
      }
    }
    for (const item of items.values()) {
      if (item.floor === player.floor && item.tileX === player.tileX && item.tileY === player.tileY) {
        if (item.itemKind === 'gold') {
          setGold(player, player.gold + item.amount);
          items.delete(item.id);
          sendStats(player);
          sendInventory(player);
        } else if (addToBackpack(player, item.itemKind, item.amount, item.roll)) {
          // Só recolhe do chão se coube na mochila (senão fica lá).
          items.delete(item.id);
          sendInventory(player);
        }
      }
    }
    // Reenvia o inventário quando entra/sai do Depósito, do alcance do vendedor
    // ou do Banqueiro (as flags habilitam os botões no cliente).
    const dep = atDepot(player);
    const ven = nearVendor(player);
    const ban = nearBank(player);
    if (dep !== player.wasAtDepot || ven !== player.wasNearVendor || ban !== player.wasNearBank) {
      player.wasAtDepot = dep;
      player.wasNearVendor = ven;
      player.wasNearBank = ban;
      sendInventory(player);
    }
  }
}

/**
 * Aplica uma condição a um alvo, passando pelas três contramedidas (Etapa 8).
 *
 * ⚠️ Hoje ninguém tem resistência, redução ou imunidade — nada no jogo as
 * concede ainda. Passar `emptyConditionDefense()` não é preguiça: é o estado
 * correto até cartas (Etapa 10) e equipamento (Etapa 11) existirem. O caminho
 * já está montado, então o dia em que um item der "imune a Congelamento" é uma
 * linha aqui, não uma reescrita.
 */
function applyConditionTo(
  target: Player | Creature,
  id: ConditionId,
  chance: number,
  durationMs: number,
  now: number,
  power?: number,
  sourceId?: string,
): boolean {
  // O estado anti-chain do alvo entra aqui: é o que impede dois casters
  // alternando Congelamento prenderem alguém para sempre (`DD-CC-013/014`).
  const r = tryApplyCondition(
    id, chance, durationMs, emptyConditionDefense(), Math.random, target.cc, now,
  );
  if (!r.applied) return false;
  const def = CONDITIONS[id];
  target.conditions = applyCondition(target.conditions, {
    id,
    expiresAt: now + r.durationMs,
    nextTickAt: def.dot ? now + def.dot.tickMs : undefined,
    power,
    sourceId,
  });
  return true;
}

/**
 * Aplica o `onHit` da criatura no jogador, se ela tiver um.
 *
 * Só é chamado quando o golpe CONECTOU: esquivar ou bloquear tem que evitar a
 * condição também, senão a defesa protege do dano e não do controle — que é a
 * parte que mais dói.
 */
function creatureOnHit(creature: Creature, player: Player, now: number): void {
  const oh = creature.def.onHit;
  if (!oh || !player.alive) return;
  const antes = player.conditions.length;
  applyConditionTo(player, oh.condition, oh.chance, oh.durationMs, now, oh.power, creature.id);
  // Só avisa quando a condição realmente entrou: mandar mensagem em toda
  // tentativa entupiria o chat com "resistiu" a cada golpe de aranha.
  if (player.conditions.length > antes) {
    send(player, {
      t: 'chat', from: 'Combate',
      text: `${creature.name} aplicou ${CONDITIONS[oh.condition].name} em você.`,
    });
  }
}

/**
 * Dano recebido quebra Congelamento — e só ele (`DD-CC-012`).
 *
 * Chamado de todo lugar onde HP cai. Se algum caminho de dano esquecer de
 * chamar, o congelamento vira controle sem contrapartida, que é exatamente o
 * que o doc quer evitar.
 */
function onDamaged(target: Player | Creature): void {
  if (target.conditions.length === 0) return;
  // Passa o estado anti-chain: quebrar Congelamento por dano concede a janela de
  // imunidade, senão "congela → bate para quebrar → congela" seria uma corrente
  // passando por baixo da regra.
  target.conditions = breakOnDamage(target.conditions, target.cc, Date.now());
}

/**
 * Avança o relógio das condições de todo mundo e cobra as parcelas de DoT.
 *
 * A parcela passa pelo MESMO pipeline de defesa de um golpe normal, porque o
 * tipo importa: Sangramento é físico e sofre a armadura, Queimadura é fogo e
 * sofre resistência a fogo. Tratar DoT como dano puro anularia metade da
 * Etapa 8.
 */
function tickConditionsAll(now: number): void {
  for (const p of players.values()) {
    if (!p.joined || !p.alive || p.conditions.length === 0) continue;
    const r = tickConditions(p.conditions, now, p.cc);
    p.conditions = r.active;
    for (const d of r.damage) {
      const dmg = resolveDamage(d.amount, d.type, playerDefenseProfile(p, false)).amount;
      p.hp = Math.max(0, p.hp - dmg);
      broadcastFloor(p.floor, {
        t: 'hit', attackerId: d.sourceId ?? p.id, targetId: p.id, amount: dmg,
        crit: false, dodged: false, element: d.type, dot: true,
        hp: Math.round(p.hp), maxHp: p.maxHp, fatal: p.hp <= 0,
      });
      if (p.hp <= 0) {
        killPlayer(p, CONDITIONS[d.id].name);
        break;
      }
    }
  }

  for (const c of creatures.values()) {
    if (!c.alive || c.conditions.length === 0) continue;
    const r = tickConditions(c.conditions, now, c.cc);
    c.conditions = r.active;
    for (const d of r.damage) {
      // Quem plantou o DoT leva o crédito do abate: sem isso, matar com veneno
      // não daria XP nem loot a ninguém.
      const dono = d.sourceId ? players.get(d.sourceId) : undefined;
      const dmg = resolveDamage(
        d.amount,
        d.type,
        creatureDefenseProfile(c, now, dono, d.type !== 'physical'),
      ).amount;
      if (dono) damageCreature(dono, c, dmg, false, now);
      else c.hp = Math.max(0, c.hp - dmg);
      if (!c.alive) break;
    }
  }
}

function regen(now: number): void {
  if (now - lastRegenAt < REGEN_INTERVAL_MS) return;
  lastRegenAt = now;
  for (const p of players.values()) {
    if (!p.joined || !p.alive) continue;
    p.hp = Math.min(p.maxHp, p.hp + p.derived.hpRegen);
    p.mana = Math.min(p.maxMana, p.mana + p.derived.manaRegen);
    // A cura acontece normalmente durante a Fúria — mas a drenagem vem logo
    // depois e não pode ser reduzida por nada.
    tickFury(p, now);
  }
}

function buildSnapshotFor(viewer: Player): EntitySnapshot[] {
  const out: EntitySnapshot[] = [];
  for (const p of players.values()) {
    if (!p.joined || p.floor !== viewer.floor) continue;
    out.push({
      id: p.id, name: p.name, tileX: p.tileX, tileY: p.tileY, floor: p.floor,
      direction: p.direction, kind: 'player', hp: Math.round(p.hp), maxHp: p.maxHp, level: p.level,
      charClass: p.cls.id, gender: p.gender,
      // Só manda o campo quando há algo: um array vazio em cada entidade a cada
      // tique é peso de rede por nada.
      conditions: p.conditions.length ? p.conditions.map((c) => c.id) : undefined,
    });
  }
  for (const c of creatures.values()) {
    if (!c.alive || c.floor !== viewer.floor) continue;
    out.push({
      id: c.id, name: c.name, tileX: c.tileX, tileY: c.tileY, floor: c.floor,
      direction: c.direction, kind: 'creature', hp: c.hp, maxHp: c.maxHp, creatureType: c.def.type,
      conditions: c.conditions.length ? c.conditions.map((x) => x.id) : undefined,
    });
  }
  for (const item of items.values()) {
    if (item.floor !== viewer.floor) continue;
    out.push({
      id: item.id, name: item.itemKind, tileX: item.tileX, tileY: item.tileY, floor: item.floor,
      direction: 'down', kind: 'item', itemKind: item.itemKind, amount: item.amount,
    });
  }
  for (const c of corpses.values()) {
    if (c.floor !== viewer.floor) continue;
    out.push({
      id: c.id, name: `Corpo de ${c.ownerName}`, tileX: c.tileX, tileY: c.tileY, floor: c.floor,
      direction: 'down', kind: 'item', itemKind: 'corpse', corpseOwner: c.ownerName,
    });
  }
  for (const n of npcs) {
    if (n.floor !== viewer.floor) continue;
    out.push({
      id: n.id, name: n.name, tileX: n.x, tileY: n.y, floor: n.floor,
      direction: 'down', kind: 'npc', npcRole: n.role,
    });
  }
  return out;
}

/** Corpos expiram: some do mundo quando o tempo acaba. */
function expireCorpses(now: number): void {
  for (const [id, c] of corpses) {
    if (now >= c.expiresAt) corpses.delete(id);
  }
}

function gameTick(): void {
  tick++;
  const now = Date.now();
  expireCorpses(now);
  // Relógio do mundo (0..24). Noite entre 18h e 6h.
  worldHour = ((now % DAY_CYCLE_MS) / DAY_CYCLE_MS) * 24;
  isNight = worldHour < 6 || worldHour >= 18;
  updateCreatures(now);
  updatePlayers(now);
  // Antes do regen: uma parcela de veneno que mata não deve ser desfeita pela
  // regeneração do mesmo tique.
  tickConditionsAll(now);
  regen(now);
  // Autosave: se o servidor cair de bota, perde-se no máximo AUTOSAVE_MS de
  // progresso — não a sessão inteira.
  if (now - lastAutosaveAt >= AUTOSAVE_MS) {
    lastAutosaveAt = now;
    for (const player of players.values()) saveCharacter(player);
  }
  for (const player of players.values()) {
    if (!player.joined) continue;
    send(player, {
      t: 'snapshot', tick, entities: buildSnapshotFor(player), ackSeq: player.lastAckSeq,
      hour: worldHour, night: isNight,
    });
    sendStats(player);
  }
}

// ---------------------------------------------------------------------------
// Conexões
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ port: DEFAULT_SERVER_PORT });

wss.on('connection', (socket) => {
  const id = newId('p');
  const cls = CLASSES.knight;
  // Casca vazia: a ficha de verdade vem do banco no `hello`. Antes da etapa 7
  // o personagem nascia aqui pronto; agora ele só existe depois do login.
  const vila = starterTown();
  const player: Player = {
    id, name: 'Herói', socket,
    accountId: 0, characterId: 0,
    respawnTown: vila.id, visitedTowns: new Set([vila.id]),
    tileX: vila.spawn.x, tileY: vila.spawn.y, floor: vila.spawn.floor, direction: 'down',
    cls, gender: 'male', attributes: { ...cls.base }, skill: { kind: cls.skill, level: START_SKILL_LEVEL, progress: 0 },
    derived: computeStats(cls, cls.base, 1, { kind: cls.skill, level: START_SKILL_LEVEL, progress: 0 }),
    level: 1, xp: 0, unspentPoints: 0, talentPoints: 0,
    hp: 100, maxHp: 100, mana: 30, maxMana: 30, gold: 0, bankGold: 0,
    backpack: emptySlots(BACKPACK_SIZE), equipment: {}, depot: emptySlots(DEPOT_SIZE),
    alive: true, deadUntil: 0, targetId: null, lastAttackAt: 0, lastMoveAt: 0, lastAckSeq: 0, joined: false,
    conditions: [], cc: emptyCcState(),
    spellReadyAt: {}, skillPoints: 0, skillLevels: {}, skillResets: 0,
    fury: null, stance: false, proficiencies: {}, bestiary: {},
    wasAtDepot: false, wasNearVendor: false, wasNearBank: false,
  };
  addToBackpack(player, 'mana_potion', 5);
  setGold(player, 50);
  players.set(id, player);
  console.log(`[conn] ${id} conectado (${players.size} online)`);

  socket.on('message', (data) => {
    const msg = decodeClientMessage(data.toString());
    if (!msg) {
      send(player, { t: 'denied', reason: 'Mensagem inválida.' });
      return;
    }
    handleMessage(player, msg);
  });
  socket.on('close', () => {
    // Grava ANTES de tirar da lista: é a última chance de não perder a sessão.
    saveCharacter(player);
    players.delete(id);
    for (const c of creatures.values()) if (c.targetId === id) c.targetId = null;
    console.log(`[disc] ${player.name} saiu (${players.size} online)`);
  });
  socket.on('error', (err) => console.error(`[erro] socket ${id}:`, err.message));
});

spawnInitialCreatures();
setInterval(gameTick, SERVER_TICK_MS);

/**
 * Desligamento limpo: grava todo mundo antes de sair. Sem isto, um Ctrl+C
 * jogaria fora tudo desde o último autosave — justo no caso mais comum
 * durante o desenvolvimento.
 */
function shutdown(sinal: string): void {
  console.log(`\n[${sinal}] gravando ${players.size} jogador(es) antes de sair...`);
  for (const player of players.values()) saveCharacter(player);
  store.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`Elysia Online — servidor autoritativo em ws://localhost:${DEFAULT_SERVER_PORT} (tick ${SERVER_TICK_HZ}Hz)`);
console.log(`Banco: ${process.env.DATABASE_PATH ?? 'server/data/elysia.db'} (SQLite)`);
