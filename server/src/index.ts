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
  backpackSizeFor,
  DROP_THROW_RANGE,
  CLASSES,
  CREATURES,
  DEFAULT_SERVER_PORT,
  DELETE_GRACE_MS,
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
  buildWorldMap,
  chebyshev,
  sellPriceOf,
  computeHit,
  computeStats,
  DAMAGE_TYPES,
  resolveDamage,
  affixDamageType,
  composeItemName,
  materialsOf,
  rollAffixNames,
  addProfessionXp,
  buildResourceNodes,
  WORLD_CREATURE_SPAWNS,
  tileValidoMaisProximo,
  GATHER_COOLDOWN_MS,
  GATHER_PROFESSION,
  GATHER_RANGE,
  GATHER_XP,
  NODES,
  PROFESSION_NAME,
  hasToolFor,
  rollGather,
  type NodeKind,
  canCraft,
  craftXp,
  rollCraft,
  FRAGMENTS_PER_CRAFT,
  MIN_FRAGMENTS_FOR_CHANCE,
  RARITIES,
  type C2S_Craft,
  type C2S_Party,
  type FragmentBundle,
  type Professions,
  type Rarity,
  FRAGMENT_ITEM,
  RECIPE_ITEM,
  rollFragmentDrop,
  rollRecipeDrop,
  type FragmentSource,
  canHarm,
  WHITE_SKULL_MS,
  type Combatant,
  type HarmVeto,
  canInvite,
  inviteVetoText,
  removeMember,
  PARTY_MAX,
  type PartyState,
  type PartyMemberView,
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
  interruptsCast,
  tickConditions,
  tryApplyCondition,
  type ActiveCondition,
  type ConditionId,
  type DamageType,
  // --- Etapas 14 e 15: efeitos de ficha, áreas persistentes e as 41 magias
  type ActiveEffect,
  type Modifiers,
  type GroundArea,
  applyEffect,
  modifierFactor,
  modifierOf,
  removeEffect,
  sumModifiers,
  tickEffects,
  MODIFIER_FLOOR,
  MODIFIER_CEIL,
  areaBlocks,
  areaCovers,
  countAreasOf,
  dropOldestOf,
  expireAreas,
  MAX_GROUND_AREAS,
  benefitsFromNatureAffinity,
  castMasteryReduction,
  hotTickMs,
  magicProtectionShare,
  manaRegenBonus,
  natureAffinityBonus,
  rootsPetrifyChance,
  skillBarFor,
  skillCastMs,
  skillConditionChance,
  skillConditionDuration,
  skillDuration,
  skillGroundDuration,
  skillGroundMax,
  skillHits,
  skillModifiers,
  skillsOfClass,
  HOT_PULSES,
  MAGIC_PROTECTION_MANA_PER_HP,
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
  proficiencyFor,
  migrateProficiencies,
  PROFICIENCY_LABEL,
  RARITY,
  rollItem,
  rollRarity,
  WEAPON_IDENTITY,
  isSkillUsable,
  isWalkable,
  hasLineOfSight,
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
  checkAttributes,
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
  // --- Vindos do merge de 2026-07-30 (catálogo do Doc 4 + distribuição de party)
  MODEL_ENTRIES,
  MODEL_INDEX,
  craftableModel,
  applyLootVote,
  canProposeLootRule,
  distributeXp,
  rollBossLootWinner,
  sharesXp,
  tallyLootVote,
  LOOT_RULES,
  LOOT_RULE_LABEL,
  worldTimeAt,
  phaseStartMs,
  PHASE_LABEL,
  SAFE_ZONE_RADIUS,
  FARM_BICHOS,
  FARM_AREA,
  type AffixId,
  type LootRule,
  type DayPhase,
  registraEdicoes,
  esqueceEdicao,
  aplicaEdicoes,
  edicoesConhecidas,
  chaoBaseEm,
  camadaValida,
  colisaoValida,
  giroValido,
  dentroDaFarm,
  getTileType,
  type WorldEdit,
} from '@dominion/shared';
import { openStore } from './store/store.js';
import { fromStored, rowsToItems, toStored } from './store/serialize.js';

const map = buildWorldMap();
const store = openStore();

/*
 * 🔴 **As edições de mundo entram AQUI, logo depois do `buildWorldMap()` e antes
 * de qualquer coisa ler o mapa** — spawn de criatura, nós de coleta, NPC.
 *
 * A ordem não é estética: `buildWorldMap()` é determinístico e as edições são
 * uma lista curta carimbada por cima (ver `shared/src/worldedit.ts`). Aplicá-las
 * depois de o spawn rodar deixaria um monstro nascido em cima de uma árvore que
 * o dono já tinha apagado, ou pior, um nó de coleta preso dentro de uma parede
 * que não existe mais.
 */
{
  const edicoes = store.listWorldEdits();
  registraEdicoes(edicoes);
  const n = aplicaEdicoes(map.floors, map.width, map.height, edicoes);
  if (n > 0) console.log(`[mundo] ${n} edições de cenário aplicadas (/remove).`);
  const decalques = store.listDecals();
  if (decalques.length > 0) {
    console.log(`[mundo] ${decalques.length} objetos posicionados no construtor de mapas.`);
  }
}
/**
 * Autosave. Se o servidor cair de bota (crash, kill -9, queda de luz), o
 * jogador perde no máximo este intervalo de progresso — não a sessão inteira.
 */
const AUTOSAVE_MS = 30000;
let lastAutosaveAt = 0;
const PLAYER_RESPAWN_MS = 4000;
/**
 * Quanto uma criatura demora a renascer no ponto dela.
 *
 * ⚠️ REFERÊNCIA — nenhum documento fixa o tempo. Subiu de 8 s para 45 s em
 * 2026-08-05, a pedido do dono vendo em tela (*"tem muuuito monstro, pode
 * reduzir bem o respawn"*).
 *
 * 🔴 Ele se SOMA ao corte da lista de spawns (`shared/data/world/creatures.json`
 * caiu de 32 para 10 pontos na mesma leva). Quem for calibrar população precisa
 * olhar os dois: mexer só aqui e estranhar o resultado é o erro fácil.
 *
 * A 8 s o ponto de spawn ficava praticamente sempre ocupado — matar um monstro
 * não abria espaço, e a região parecia cheia por mais que a lista fosse curta.
 * Um `respawnMs` por espécie, em `CREATURES`, continua vencendo este padrão.
 */
const CREATURE_RESPAWN_MS = 45_000;
const REGEN_INTERVAL_MS = 1000;
const XP_DEATH_PENALTY = 0.1;
const START_SKILL_LEVEL = 10;
/**
 * A **praça segura** em volta do nascimento.
 *
 * 🔴 Passou a valer para TODA criatura em 2026-08-05. Antes era privilégio dos
 * chefes com `avoidCenter`: um slime comum entrava e batia em quem tinha acabado
 * de renascer. Isso funcionava enquanto a muralha de Lumindale segurava o resto
 * — quando o vilarejo virou grama a pedido do dono, a arquitetura parou de
 * proteger e a regra passou a ser a única proteção que existe.
 *
 * O raio mora em `shared/regions.ts` porque o cliente desenha o mesmo círculo.
 * Se os dois números divergissem, o desenho mentiria sobre onde a proteção
 * acaba — e é essa borda exata que o jogador usa para fugir.
 */
function inCenterSafeZone(x: number, y: number): boolean {
  return chebyshev(x, y, map.spawn.x, map.spawn.y) <= SAFE_ZONE_RADIUS;
}

/**
 * Ciclo dia/noite. As durações e o mapa de horas vivem em
 * `shared/src/daynight.ts` — 1 h de dia, 30 min de tarde, 1 h de noite.
 *
 * 🔴 **`cycleOffset` é o que os comandos de teste movem.** Forçar uma fase não
 * congela o relógio: desloca a ORIGEM do ciclo, e o mundo segue andando dali. É
 * o que faz `/noite` e depois esperar amanhecer sozinho — congelar esconderia
 * justamente os bugs de transição, que é o que se quer testar.
 */
let cycleOffset = 0;
let worldHour = 8; // 0..24
let isNight = false;
let worldPhase: DayPhase = 'day';
/** À noite os monstros ficam mais fortes/rápidos. Multiplicadores. */
const NIGHT_DMG_MULT = 1.5;
// NIGHT_SPEED_MULT mora em `shared` porque o cliente também depende dele para
// deslizar a criatura na velocidade certa (ver o comentário lá).

/**
 * O que o `/clone` guardou. Vive na sessão e não no banco: é área de
 * transferência, não conteúdo do mundo — some ao sair, como o Ctrl+C.
 */
interface AreaDeTransferencia {
  tile: number;
  /** Célula da fazenda de onde copiar a arte, se a origem estava nela. */
  arte?: { x: number; y: number };
}

/**
 * Uma cura ao longo do tempo em andamento (Regeneração, e o que vier depois).
 *
 * Guarda o valor JÁ RESOLVIDO por pulso em vez do nível da habilidade: o
 * Druida pode morrer, deslogar ou trocar de equipamento no meio dos 20 s, e o
 * HoT que ele plantou não deve mudar de tamanho por causa disso. O que saiu,
 * saiu.
 */
interface ActiveHot {
  skillId: SkillId;
  /** Quem lançou — para o crédito e para a mensagem. */
  sourceId: string;
  /** Cura de cada pulso, já com poder de cura e modificadores aplicados. */
  perPulse: number;
  nextTickAt: number;
  tickMs: number;
  expiresAt: number;
}

/**
 * Conjuração em andamento.
 *
 * 🔴 O alvo é guardado AQUI, não relido no fim: se o jogador trocar de alvo
 * durante os 3 s da Chuva de Meteoros, a magia sai onde ele mandou sair. O
 * contrário faria a conjuração longa virar uma loteria.
 */
interface Casting {
  skillId: SkillId;
  endsAt: number;
  /** Alvo escolhido no início (criatura ou jogador). */
  targetId: string | null;
  /** Onde o personagem estava — sair do tile cancela. */
  fromX: number;
  fromY: number;
}

interface Player {
  /** O último /clone deste jogador. */
  clipboard?: AreaDeTransferencia;
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
  /**
   * Buffs e debuffs com modificador de ficha (`effects.ts`).
   *
   * Separado de `conditions` de propósito: Pele de Carvalho não pode entrar na
   * fila de diminishing returns do Congelamento. Não persiste, pelo mesmo
   * motivo das condições — sair buffado e voltar buffado seria mana de graça.
   */
  effects: ActiveEffect[];
  /**
   * Curas ao longo do tempo em andamento (Regeneração). Uma por habilidade:
   * relançar renova em vez de empilhar dois HoTs da mesma fonte.
   */
  hots: ActiveHot[];
  /**
   * Conjuração em andamento. Andar cancela; Stun, Congelamento e Petrificação
   * derrubam. É o contrajogo das magias grandes.
   */
  casting: Casting | null;
  /** ✨ Proteção Mágica ligada (alternável, como a Postura do Knight). */
  magicProtection: boolean;
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
  /**
   * Níveis de profissão (`DD-PROF-004`: sem limite de profissões, daí o mapa).
   * Persistido na coluna `professions` desde a migração v2.
   */
  professions: Professions;
  /**
   * Cores do outfit, escolhidas na criação. `undefined` = arte original.
   * Persistido na coluna `outfit` desde a migração v5.
   *
   * ⚠️ **COSMÉTICO** — `13.10` do Doc 1: aparência nunca altera estatística.
   * Se algum dia isto aparecer dentro de `recompute` ou de `combat`, é bug.
   */
  outfit?: number[];
  /**
   * Quando coletou pela última vez, para impor `GATHER_COOLDOWN_MS`.
   *
   * Mora no jogador, e não no nó: o limite é do braço de quem trabalha, não da
   * pedra. Guardado no nó, bastaria alternar entre dois veios para coletar na
   * velocidade do clique.
   */
  lastGatherAt: number;
  /** O que ele já conhece de cada criatura (encontros e abates). */
  bestiary: BestiaryState;
  /** Última leitura das zonas, p/ reenviar inventário só quando muda. */
  wasAtDepot: boolean;
  wasNearVendor: boolean;
  wasNearBank: boolean;
  /**
   * Flag de PK (32.57–32.61). Começa DESLIGADO: o doc trata PvP como opção
   * consciente, e nascer agressor seria o contrário disso.
   *
   * 🔴 É o flag de **agredir**, não o de ser agredido. Desligado, este jogador
   * não acerta outro jogador; não impede que outro jogador o acerte. Ver
   * `canHarm` em `shared/src/pvp.ts`.
   *
   * Não persiste no banco — pelo mesmo motivo das condições. Relogar já é jeito
   * de sair do PvP (o personagem some do mapa); o que não pode é sair sem sair,
   * e disso cuidam o `pkLockedUntil` e a caveira.
   */
  pkEnabled: boolean;
  /**
   * Até quando não pode DESLIGAR o PK.
   *
   * 🔴 Sem isto o flag vira o golpe que ele existe para impedir: bater e
   * desligar o PK no mesmo segundo para o menu do outro dizer "ligue o seu PK".
   * Ligar é livre e imediato; desligar espera. Armado a cada agressão.
   */
  pkLockedUntil: number;
  /**
   * ⚪ Até quando este jogador carrega a **Caveira Branca**.
   *
   * `0` (ou já passado) = sem caveira. Enquanto estiver de pé, qualquer jogador
   * pode atacá-lo sem ligar o próprio PK e sem consequência — é a contrapartida
   * de ter agredido alguém, e o que sustenta o PK ON não ser um escudo.
   *
   * Não persiste, pelo mesmo motivo do `pkEnabled`: dura 5 min e o personagem
   * some do mapa ao deslogar. Persistir isto é assunto da Etapa 17, junto com a
   * contagem de assassinatos que gera vermelha e preta.
   */
  whiteSkullUntil: number;
  /** Grupo atual (`parties`), quando há. */
  partyId: string | null;
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
  /**
   * Debuffs de ficha em cima da criatura (Enfraquecer, Vulnerabilidade, Praga).
   *
   * ⚠️ `71.23`: **MVP não precisa ser imune a debuff** — basta reduzir a
   * eficiência. Por isso não há lista de imunidade aqui: até o chefe apanha de
   * Vulnerabilidade, e é o que mantém o Druida útil em boss fight.
   */
  effects: ActiveEffect[];
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
  /**
   * Dano acumulado por jogador nesta vida da criatura.
   *
   * 🔴 Peça que a base não tinha, e da qual duas regras dependem:
   * `DD-PARTY-008` (participação válida — bater é o que dá direito à XP) e
   * `DD-PARTY-021` (contribuição pondera o loot de chefe). É zerada ao renascer,
   * junto com o resto do estado.
   */
  damageBy: Map<string, number>;
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
  /**
   * Corpo de jogador ou **bolsa de loot** de criatura.
   *
   * As duas coisas são o mesmo mecanismo — recipiente no chão, aberto por
   * clique, saqueável por qualquer um, com validade. Só mudam o desenho e o
   * texto. Reusar evita um segundo sistema de container fazendo o mesmo.
   */
  source: 'player' | 'creature';
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
  /**
   * 🔴 **Quem acabou de soltar este item, e ainda está em cima dele.**
   *
   * Sem isto, soltar item no chão simplesmente NÃO FUNCIONA: o `drop` põe a
   * pilha no tile do próprio jogador, e o recolhimento automático de
   * `updatePlayers` a pega de volta no mesmo tique. O item caía e voltava, e de
   * fora parecia que o botão direito não fazia nada.
   *
   * A marca se apaga sozinha quando o jogador **sai do tile** — não por tempo.
   * Prazo fixo teria o mesmo problema em câmera lenta: quem ficasse parado
   * veria o item pular de volta para a mochila alguns segundos depois.
   *
   * ⚠️ Só bloqueia o recolhimento AUTOMÁTICO. Arrastar o item de volta para a
   * mochila continua valendo na hora: é gesto deliberado, e desfazer um engano
   * não pode exigir dar um passo para o lado.
   */
  droppedBy?: string;
  /**
   * Timestamp em que o item some do chão.
   *
   * 🔴 Antes disto, item no chão **nunca expirava** — só corpo expirava. Com 32
   * criaturas renascendo para sempre, cada uma largando ouro, fragmento e
   * material, o mapa acumulava centenas de entidades, e TODAS iam no snapshot de
   * todo jogador a cada tique. Era vazamento de desempenho, não só sujeira
   * visual.
   */
  expiresAt: number;
}

/**
 * Nó de recurso vivo no mundo (veio, árvore marcada, moita, cogumelos).
 *
 * 🔴 **É ENTIDADE, não tile — e a decisão não é de gosto.** O mapa é gerado
 * deterministicamente pelos DOIS lados (`buildWorldMap`) e não trafega pela
 * rede: cliente e servidor concordam porque calculam a mesma coisa, não porque
 * um conta ao outro. Trocar o tile ao cortar uma árvore quebraria esse acordo na
 * hora — o servidor teria um mapa e o cliente, outro.
 *
 * Como entidade, o nó viaja no snapshot junto com criaturas e itens, some quando
 * esgota e volta quando renasce, sem que uma única célula do mapa mude.
 */
interface ResourceNode {
  id: string;
  kind: NodeKind;
  tileX: number;
  tileY: number;
  floor: number;
  /** Cargas restantes. `0` = esgotado, esperando renascer (não vai no snapshot). */
  charges: number;
  /** Instante em que volta a ter cargas. Só vale quando `charges === 0`. */
  respawnAt: number;
}

const players = new Map<string, Player>();
const creatures = new Map<string, Creature>();
/**
 * Áreas persistentes no chão: Muralha de Fogo, Muralha de Gelo, Nevasca,
 * Círculo Arcano, Esporos, Santuário e Ira da Natureza.
 *
 * 🔴 Elas vivem FORA de quem as lançou. É o que a identidade do Druida exige
 * (*"ataca a região em ciclos enquanto o Druida continua curando"*), e a
 * consequência é que a área sobrevive à morte do dono — a magia já saiu.
 */
let groundAreas: GroundArea[] = [];
let proximaAreaId = 1;
const items = new Map<string, GroundItem>();
const corpses = new Map<string, Corpse>();
const nodes = new Map<string, ResourceNode>();
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
// Party, PK e amigos
// ---------------------------------------------------------------------------
// As regras puras moram em `shared/src/party.ts` e `shared/src/pvp.ts`; aqui
// fica só o estado de sessão e a entrega das mensagens.

/** Grupos ativos. Não persiste: party é estado de sessão, morre com o servidor. */
/**
 * A party como o SERVIDOR a guarda: as regras de formação (`PartyState`, do
 * shared) mais o estado de distribuição.
 *
 * 🔴 A separação é deliberada — `PartyState` é o que as regras puras precisam
 * ver para decidir convite e saída, e o teste delas não deve conhecer votação
 * nem regra de loot.
 */
interface ServerParty extends PartyState {
  lootRule: LootRule;
  vote?: { proposal: LootRule; votes: Map<string, boolean> };
}

/**
 * Regra de loot com que toda party nasce.
 *
 * ⚠️ **Livre é o padrão porque é o que o jogo já fazia**: o loot cai no chão e
 * quem chega primeiro pega. Nascer em qualquer outra regra mudaria o
 * comportamento de quem nunca abriu o painel de party.
 */
const DEFAULT_LOOT_RULE: LootRule = 'free';

const parties = new Map<string, ServerParty>();

/**
 * Convites pendentes: id do CONVIDADO -> quem convidou e quando expira.
 *
 * Um convite por pessoa de propósito. Permitir vários empilharia caixas de
 * diálogo na tela de quem está caçando, que é exatamente o vetor de importunação
 * que qualquer MMO acaba tendo de fechar depois.
 */
const partyInvites = new Map<string, { fromId: string; expiresAt: number }>();

/** Convite não aceito some sozinho — senão vira lixo eterno no mapa. */
const PARTY_INVITE_MS = 30_000;

/**
 * Tempo mínimo com o PK ligado depois de trocar dano com outro jogador.
 *
 * ⚠️ REFERÊNCIA: nenhum documento dá este número. O que o doc fecha é que PK é
 * escolha consciente (32.57–32.61); 10 s é o ponto de partida para que essa
 * escolha não possa ser desfeita no meio do golpe. Ajustar aqui.
 */
const PK_COMBAT_LOCK_MS = 10_000;

/** Tem caveira branca de pé agora? Fonte única — não comparar o prazo à mão. */
function hasWhiteSkull(player: Player, now = Date.now()): boolean {
  return player.whiteSkullUntil > now;
}

/** O jogador como o `canHarm` o enxerga. Guilda entra na Etapa 20. */
function combatantOf(player: Player): Combatant {
  return {
    id: player.id,
    kind: 'player',
    pkEnabled: player.pkEnabled,
    skull: hasWhiteSkull(player) ? 'white' : undefined,
    partyId: player.partyId ?? undefined,
  };
}

function partyOf(player: Player): ServerParty | undefined {
  return player.partyId ? parties.get(player.partyId) : undefined;
}

/** Algum membro está brigando com um chefe agora? Para `DD-PARTY-019`. */
function partyInBossFight(party: ServerParty): boolean {
  for (const id of party.memberIds) {
    const p = players.get(id);
    const alvo = p?.targetId ? creatures.get(p.targetId) : undefined;
    if (alvo?.def.boss && alvo.alive) return true;
  }
  return false;
}

/**
 * Raio de proximidade do grupo (`DD-PARTY-008`), em tiles.
 *
 * 🔴 **É o MESMO número para o HUD e para o Shared XP, de propósito.** A marca
 * de "perto" no painel existe para o grupo ver quem se afastou; se ela usasse um
 * raio diferente do que decide a XP, o painel mentiria — alguém apareceria perto
 * e não receberia nada, sem explicação na tela.
 *
 * ⚠️ REFERÊNCIA: o doc não dá raio. 15 tiles é pouco mais que uma tela — perto o
 * bastante para exigir estar na mesma briga, longe o bastante para o arqueiro no
 * fundo e o mago na retaguarda contarem.
 */
const PARTY_NEAR_TILES = 15;

function partyMemberViews(party: PartyState, viewer: Player): PartyMemberView[] {
  const saida: PartyMemberView[] = [];
  for (const id of party.memberIds) {
    const p = players.get(id);
    if (!p) continue;
    saida.push({
      id: p.id,
      name: p.name,
      level: p.level,
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      charClass: p.cls.id,
      nearby: p.floor === viewer.floor
        && chebyshev(p.tileX, p.tileY, viewer.tileX, viewer.tileY) <= PARTY_NEAR_TILES,
      // 🔴 `DD-PARTY-007` visível na tela: sem isto, quem chama um amigo de nível
      // muito diferente não entende por que não ganha XP, e a regra parece bug.
      sharesXp: sharesXp(p.level, viewer.level),
    });
  }
  return saida;
}

/**
 * Manda a composição do grupo a todos os membros.
 *
 * Um envio por membro, e não um broadcast: `nearby` é calculado do ponto de
 * vista de cada um, então a mensagem é genuinamente diferente para cada
 * destinatário.
 */
function sendParty(party: ServerParty): void {
  for (const id of party.memberIds) {
    const p = players.get(id);
    if (!p) continue;
    send(p, {
      t: 'party',
      party: {
        id: party.id,
        leaderId: party.leaderId,
        members: partyMemberViews(party, p),
        lootRule: party.lootRule,
        ...(party.vote
          ? {
            vote: {
              proposal: party.vote.proposal,
              ...tallyLootVote({ proposal: party.vote.proposal, votes: party.vote.votes }),
              pending: !party.vote.votes.has(p.id),
            },
          }
          : {}),
      },
    });
  }
}

function partyChat(party: PartyState, text: string): void {
  for (const id of party.memberIds) {
    const p = players.get(id);
    if (p) send(p, { t: 'chat', from: 'Grupo', text });
  }
}

/**
 * Tira o jogador do grupo dele, dissolvendo quando sobra um só.
 *
 * Seguro chamar em quem não está em grupo nenhum — é o que permite usá-la no
 * `close` do socket sem checar antes.
 */
function leaveParty(player: Player, motivo: string): void {
  const party = partyOf(player);
  player.partyId = null;
  if (!party) return;
  const restante = removeMember(party, player.id);
  send(player, { t: 'party', party: null });
  if (!restante) {
    // Dissolveu: o outro membro também sai, e precisa saber por quê.
    parties.delete(party.id);
    for (const id of party.memberIds) {
      const p = players.get(id);
      if (!p || p.id === player.id) continue;
      p.partyId = null;
      send(p, { t: 'party', party: null });
      send(p, { t: 'chat', from: 'Grupo', text: `${player.name} ${motivo}. O grupo foi desfeito.` });
    }
    return;
  }
  // `removeMember` é regra pura e só conhece `PartyState` — a regra de loot e a
  // votação são estado de servidor e voltam por cima. Sem isto, sair do grupo
  // silenciosamente resetaria a regra para Livre, desfazendo uma votação.
  const atualizada: ServerParty = {
    ...restante,
    lootRule: party.lootRule,
    ...(party.vote ? { vote: party.vote } : {}),
  };
  // E o voto de quem saiu some: senão a apuração conta um fantasma e a votação
  // nunca fecha, porque `votes.size` nunca alcança `memberIds.length`.
  atualizada.vote?.votes.delete(player.id);
  parties.set(atualizada.id, atualizada);
  partyChat(atualizada, `${player.name} ${motivo}.`);
  if (atualizada.leaderId !== party.leaderId) {
    const novo = players.get(atualizada.leaderId);
    if (novo) partyChat(atualizada, `${novo.name} agora lidera o grupo.`);
  }
  sendParty(atualizada);
}

// ------------------------------------------------------------------ Amigos --

/**
 * A lista de amigos da conta, com quem está online agora.
 *
 * Online é decidido pelos jogadores CONECTADOS, não por uma coluna no banco:
 * coluna de presença mente quando o servidor cai, e aí a lista fica cheia de
 * gente eternamente online. Aqui a fonte é a mesma que o resto do jogo usa.
 */
function sendFriends(player: Player): void {
  if (!player.accountId) return;
  const lista = store.listFriends(player.accountId).map((f) => {
    let charName: string | undefined;
    for (const p of players.values()) {
      if (p.joined && p.accountId === f.accountId) { charName = p.name; break; }
    }
    return { name: f.name, online: charName !== undefined, charName };
  });
  send(player, { t: 'friends', list: lista });
}

/**
 * Reenvia a lista a todo mundo que está online.
 *
 * Chamado quando alguém entra ou sai, que é quando o `online` de outra pessoa
 * muda. Custo: uma consulta por jogador conectado, em evento raro — barato
 * comparado a manter um índice reverso de quem-é-amigo-de-quem em memória.
 */
function broadcastFriendPresence(): void {
  for (const p of players.values()) if (p.joined) sendFriends(p);
}

/**
 * Por que o golpe não sai, na voz do jogo.
 *
 * 🔴 `pk-off` agora só pode ser o flag de QUEM ATACOU — o do alvo deixou de ser
 * consultado. A mensagem não tem mais dois casos, e é isso que a torna acionável:
 * a recusa sempre tem a mesma cura.
 */
function harmVetoText(veto: HarmVeto | undefined, target: Player): string {
  switch (veto) {
    case 'ally':
      return `${target.name} está no seu grupo.`;
    case 'self':
      return 'Você não pode atacar a si mesmo.';
    case 'pk-off':
      return 'Ligue o seu PK para atacar outro jogador.';
    default:
      return 'Você não pode atacar esse alvo.';
  }
}

/**
 * Consequências de uma agressão consumada, do lado do agressor.
 *
 * Duas, e são diferentes:
 *
 * 1. **Trava do flag** (10 s) — impede bater e desligar o PK no mesmo segundo.
 *    Vale para qualquer golpe entre jogadores, justificado ou não.
 * 2. **⚪ Caveira Branca** (5 min) — só quando `marksAsPk`, isto é, quando a
 *    agressão foi injustificada. Revidar em quem já está de caveira não dá
 *    caveira a ninguém (17.38).
 *
 * ⚠️ **Só o agressor é travado.** A versão anterior travava os dois, porque o
 * flag do alvo o protegia e desligá-lo no meio da briga era exploração. Agora o
 * flag do alvo não faz nada pela defesa dele — travá-lo seria punir a vítima por
 * ter sido atacada.
 */
function applyAggression(attacker: Player, marksAsPk: boolean, now: number): void {
  attacker.pkLockedUntil = now + PK_COMBAT_LOCK_MS;
  if (!marksAsPk) return;

  const jaTinha = hasWhiteSkull(attacker, now);
  // Renova, não soma: cada nova agressão reinicia os 5 minutos. Somar faria de
  // uma briga longa uma caveira de horas, que é papel da vermelha, não da branca.
  attacker.whiteSkullUntil = now + WHITE_SKULL_MS;
  if (!jaTinha) {
    send(attacker, {
      t: 'chat', from: 'Sistema',
      text: '⚪ Você recebeu a Caveira Branca — por 5 minutos qualquer jogador '
        + 'pode atacá-lo sem punição.',
    });
  }
}

/** As seis ações de grupo. A validação pura vem de `shared/src/party.ts`. */
function handleParty(player: Player, msg: C2S_Party): void {
  const agora = Date.now();

  if (msg.action === 'leave') {
    if (!player.partyId) {
      send(player, { t: 'denied', reason: 'Você não está em um grupo.' });
      return;
    }
    leaveParty(player, 'saiu do grupo');
    return;
  }

  if (msg.action === 'accept' || msg.action === 'decline') {
    const convite = partyInvites.get(player.id);
    if (!convite || agora > convite.expiresAt) {
      partyInvites.delete(player.id);
      send(player, { t: 'denied', reason: 'Nenhum convite de grupo pendente.' });
      return;
    }
    partyInvites.delete(player.id);
    const quemConvidou = players.get(convite.fromId);
    if (!quemConvidou || !quemConvidou.joined) {
      send(player, { t: 'denied', reason: 'Quem convidou não está mais no jogo.' });
      return;
    }
    if (msg.action === 'decline') {
      send(quemConvidou, { t: 'chat', from: 'Grupo', text: `${player.name} recusou o convite.` });
      send(player, { t: 'chat', from: 'Grupo', text: 'Convite recusado.' });
      return;
    }
    // 🔴 Revalidado no ACEITE, não só no convite. Entre um e outro o grupo pode
    // ter enchido, ou quem convidou pode ter entrado em outro grupo. Sem esta
    // segunda checagem, um convite guardado 29 s vira o furo do `PARTY_MAX`.
    const partyDele = partyOf(quemConvidou);
    const d = canInvite(quemConvidou.id, player.id, partyDele, partyOf(player));
    if (!d.allowed) {
      send(player, { t: 'denied', reason: inviteVetoText(d.veto!, quemConvidou.name) });
      return;
    }
    if (partyDele) {
      partyDele.memberIds.push(player.id);
      player.partyId = partyDele.id;
      partyChat(partyDele, `${player.name} entrou no grupo.`);
      sendParty(partyDele);
    } else {
      // Não havia grupo: o aceite é que CRIA a party, com quem convidou de líder.
      const nova: ServerParty = {
        id: newId('party'),
        leaderId: quemConvidou.id,
        memberIds: [quemConvidou.id, player.id],
        lootRule: DEFAULT_LOOT_RULE,
      };
      parties.set(nova.id, nova);
      quemConvidou.partyId = nova.id;
      player.partyId = nova.id;
      partyChat(nova, `Grupo formado: ${quemConvidou.name} e ${player.name}.`);
      sendParty(nova);
    }
    return;
  }

  // --- Distribuição de loot (`DD-PARTY-013..020`) ---------------------------
  if (msg.action === 'loot' || msg.action === 'vote') {
    const minha = partyOf(player);
    if (!minha) {
      send(player, { t: 'denied', reason: 'Você não está em um grupo.' });
      return;
    }
    if (msg.action === 'loot') {
      const regra = msg.rule;
      if (!regra || !LOOT_RULES.includes(regra)) return;
      if (minha.lootRule === regra) {
        send(player, { t: 'denied', reason: 'O grupo já usa essa regra.' });
        return;
      }
      if (minha.vote) {
        send(player, { t: 'denied', reason: 'Já há uma votação em andamento.' });
        return;
      }
      // 🔴 `DD-PARTY-019`: travada durante combate de chefe. Anti-golpe — sem
      // isso o líder propõe "Loot do Líder" no instante antes de o chefe cair.
      if (!canProposeLootRule(partyInBossFight(minha))) {
        send(player, { t: 'denied', reason: 'Não dá para mudar a regra durante um chefe.' });
        return;
      }
      // Quem propõe vota a favor: propor é a forma mais clara de dizer "sou a
      // favor", e obrigá-lo a votar de novo seria cerimônia sem sentido.
      minha.vote = { proposal: regra, votes: new Map([[player.id, true]]) };
      partyChat(minha, `${player.name} propôs: ${LOOT_RULE_LABEL[regra]}.`);
      sendParty(minha);
      return;
    }
    // Voto.
    if (!minha.vote) return;
    minha.vote.votes.set(player.id, msg.agree === true);
    // Apura quando todo mundo votou. Empate mantém a regra (`DD-PARTY-018`).
    if (minha.vote.votes.size < minha.memberIds.length) {
      sendParty(minha);
      return;
    }
    const antes = minha.lootRule;
    minha.lootRule = applyLootVote(antes, {
      proposal: minha.vote.proposal,
      votes: minha.vote.votes,
    });
    const aprovado = minha.lootRule !== antes;
    minha.vote = undefined;
    partyChat(
      minha,
      aprovado
        ? `Aprovado: ${LOOT_RULE_LABEL[minha.lootRule]}.`
        : `Recusado. O grupo segue em ${LOOT_RULE_LABEL[antes]}.`,
    );
    sendParty(minha);
    return;
  }

  // As três restantes miram outro jogador.
  //
  // 🔴 Por id OU por nome: o menu de contexto clica em quem está visível e tem o
  // id do snapshot; o comando de chat (`/convidar Fulano`) só tem o que a pessoa
  // digitou. Exigir id mataria o comando.
  const alvo = msg.targetId
    ? players.get(msg.targetId)
    : [...players.values()].find(
      (p) => p.joined && p.name.toLowerCase() === (msg.name ?? '').trim().toLowerCase(),
    );
  if (!alvo || !alvo.joined) {
    send(player, { t: 'denied', reason: 'Jogador não encontrado.' });
    return;
  }

  if (msg.action === 'invite') {
    const d = canInvite(player.id, alvo.id, partyOf(player), partyOf(alvo));
    if (!d.allowed) {
      send(player, { t: 'denied', reason: inviteVetoText(d.veto!, alvo.name) });
      return;
    }
    const pendente = partyInvites.get(alvo.id);
    if (pendente && agora < pendente.expiresAt) {
      send(player, { t: 'denied', reason: `${alvo.name} já tem um convite pendente.` });
      return;
    }
    const expiresAt = agora + PARTY_INVITE_MS;
    partyInvites.set(alvo.id, { fromId: player.id, expiresAt });
    send(alvo, { t: 'partyinvite', fromId: player.id, fromName: player.name, expiresAt });
    send(player, { t: 'chat', from: 'Grupo', text: `Convite enviado a ${alvo.name}.` });
    return;
  }

  const party = partyOf(player);
  if (!party) {
    send(player, { t: 'denied', reason: 'Você não está em um grupo.' });
    return;
  }
  if (party.leaderId !== player.id) {
    send(player, { t: 'denied', reason: 'Só o líder do grupo pode fazer isso.' });
    return;
  }
  if (alvo.partyId !== party.id) {
    send(player, { t: 'denied', reason: `${alvo.name} não está no seu grupo.` });
    return;
  }

  if (msg.action === 'kick') {
    if (alvo.id === player.id) {
      send(player, { t: 'denied', reason: 'Para sair do grupo, use "Sair do grupo".' });
      return;
    }
    send(alvo, { t: 'chat', from: 'Grupo', text: 'Você foi removido do grupo.' });
    leaveParty(alvo, 'foi removido do grupo');
    return;
  }

  // promote — passar a liderança.
  if (alvo.id === player.id) return;
  party.leaderId = alvo.id;
  partyChat(party, `${alvo.name} agora lidera o grupo.`);
  sendParty(party);
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
 * Remove `amount` unidades de um `kind` empilhável da mochila.
 *
 * Devolve quanto NÃO conseguiu remover (0 = removeu tudo). Quem chama já deve ter
 * verificado a quantidade — o retorno existe para o caso de a verificação e a
 * remoção divergirem, que seria bug e precisa aparecer em vez de sumir.
 *
 * Só serve para empilhável: equipamento tem `roll` próprio por instância e não
 * pode ser tratado como quantidade fungível.
 */
function removeFromBackpack(player: Player, kind: string, amount: number): number {
  let faltam = Math.max(0, Math.floor(amount));
  for (let i = 0; i < player.backpack.length && faltam > 0; i++) {
    const slot = player.backpack[i];
    if (slot?.kind !== kind) continue;
    const tira = Math.min(slot.amount, faltam);
    slot.amount -= tira;
    faltam -= tira;
    if (slot.amount <= 0) player.backpack[i] = null;
  }
  return faltam;
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
    source: corpse.source,
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
    magicProtectionActive: player.magicProtection,
    healPower: Math.round(player.derived.healPower),
    effects: player.effects.map((e) => ({
      id: e.id, name: e.name, good: e.good,
      remainingMs: Math.max(0, e.expiresAt - Date.now()),
    })),
    casting: player.casting
      ? {
        spell: player.casting.skillId,
        remainingMs: Math.max(0, player.casting.endsAt - Date.now()),
      }
      : null,
    proficiencies: player.proficiencies as Record<string, { level: number; progress: number }>,
    professions: player.professions,
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

/**
 * Soma um passivo ao acumulador, na unidade certa.
 *
 * 🔴 Fonte única para as duas origens de passivo — o rolado e o fixo do modelo.
 * Duplicar esta tradução (quais são percentuais e quais são absolutos) era o
 * caminho mais curto para o bônus fixo de velocidade virar +8 em vez de +8 %.
 */
function somaAffix(b: EquipBonus, id: AffixId, valor: number): void {
  switch (id) {
    case 'hp_bonus': b.hp += valor; break;
    case 'mana_bonus': b.mana += valor; break;
    case 'defense': b.def += valor; break;
    case 'atk_speed': b.atkSpeed += valor / 100; break;
    case 'crit_chance': b.critChance += valor / 100; break;
    case 'crit_damage': b.critDamage += valor / 100; break;
    case 'phys_damage': b.physDamage += valor / 100; break;
    case 'armor_pen': b.armorPen += valor / 100; break;
    case 'life_steal': b.lifeSteal += valor / 100; break;
    case 'move_speed': b.moveSpeed += valor / 100; break;
  }
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
    // Bônus FIXO do modelo (cap. 30 e 31, Vestes e Livros Arcanos). Entra pelo
    // mesmo caminho do passivo rolado porque é a mesma grandeza — o que muda é a
    // origem: este é característica da peça e vem sempre igual.
    //
    // ⚠️ A raridade NÃO multiplica o bônus fixo. Ele é a identidade do modelo, e
    // `statMult` já multiplica `atk`/`def`; aplicá-lo aqui também faria a
    // raridade contar duas vezes num acessório, cujo valor é quase todo bônus.
    for (const [id, valor] of Object.entries(def0.bonus ?? {})) {
      somaAffix(b, id as AffixId, valor);
    }
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
    const prof = proficiencyOf(player.proficiencies, proficiencyFor(arma.identity.type));
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
    // 🔴 `basicPhysical` (o cajado) canaliza magia sem conjurar no golpe comum:
    // `DD-PROG-028`. Sem esta porta, equipar um cajado devolveria ao Feiticeiro
    // o firebolt de graça que a correção de 03/09 tirou.
    player.derived.attackType = arma.identity.magic && !arma.identity.basicPhysical
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

  // 🌟 Buffs, debuffs e passivas entram POR ÚLTIMO, sobre a ficha já pronta.
  // A ordem importa: a Bênção da Agilidade dá +15 % sobre a velocidade que o
  // jogador realmente tem, equipamento incluído — não sobre a nua.
  const mods = allModifiers(player);
  const fator = (k: keyof Modifiers): number => {
    const v = mods[k] ?? 0;
    return Math.max(MODIFIER_FLOOR, Math.min(MODIFIER_CEIL, 1 + v));
  };
  player.derived.physAtk *= fator('physAtk');
  player.derived.magicAtk *= fator('magicAtk');
  player.derived.healPower *= fator('healPower');
  player.derived.defense *= fator('defense');
  player.derived.maxHp = Math.round(player.derived.maxHp * fator('maxHp'));
  // Resistências e chances SOMAM em vez de multiplicar: são frações 0..1, e
  // "+15 % de resistência mágica" sobre 0,11 daria +0,016 — nada. O doc trata
  // esses números como pontos percentuais, e é assim que eles se comportam.
  player.derived.magicResist = Math.min(0.9, player.derived.magicResist + (mods.magicResist ?? 0));
  player.derived.critChance = Math.min(0.95, player.derived.critChance + (mods.critChance ?? 0));
  player.derived.dodgeChance = Math.min(0.8, player.derived.dodgeChance + (mods.dodgeChance ?? 0));
  // Velocidade é INTERVALO: mais rápido = intervalo menor, então o buff divide.
  player.derived.attackCooldownMs = Math.max(
    250, player.derived.attackCooldownMs / fator('attackSpeed'),
  );
  player.derived.moveIntervalMs = Math.max(
    120, player.derived.moveIntervalMs / fator('moveSpeed'),
  );
  // ✨ Regeneração de Mana é passiva do Feiticeiro e mexe direto no regen.
  const regenMana = skillLevelOf(player.skillLevels, 'mana_regen');
  if (regenMana > 0) player.derived.manaRegen *= 1 + manaRegenBonus(regenMana);

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
    conditions: [], cc: emptyCcState(), effects: [],
    lastSpellAt: 0, lastSummonAt: 0, lastSlamAt: 0,
    enrageUntil: 0, enrageUsed: false,
    summonedBy: opts.summonedBy,
    defBreakUntil: 0, defBreakPct: 0, tauntedBy: null, tauntUntil: 0,
    variant, lastHurtAt: 0, triumphs: 0, damageBy: new Map(),
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
 * Distâncias de Chebyshev a partir de Lumindale (150,158), onde o personagem
 * nasce — a paliçada fica a 12 do centro:
 *
 * | Faixa | Distância | Quem |
 * |---|---|---|
 * | Tier I | 12–14 | Slime Verde (8) |
 * | Tier I+ | 16–18 | Slime Azul (2), Vermelho (2) |
 * | Tier II | 18–24 | 9 espécies, uma cada |
 * | Tier III | 30–36 | 10 espécies, uma cada |
 * | MVP | 28 | Super Slime |
 *
 * ## ⚠️ A lista mudou de lugar, e a fauna ainda não conhece as regiões
 *
 * As posições agora vêm de **`shared/data/world/creatures.json`** (ver
 * `worlddata.ts`: é o arquivo que o Editor de Mapa vai escrever). O conteúdo é o
 * **rebase mecânico** do povoamento de Valoria — mesmas espécies, mesmas
 * distâncias, deslocadas para o entorno de Lumindale, preservando a curva que o
 * dono testou jogando.
 *
 * 🔴 **Consequência que vale saber:** a 32 tiles do berço ainda mora Tier III, e
 * `regions.ts` declara aquele chão como **Campos de Valdor, Lv. 1–15**. Terreno e
 * fauna discordam de propósito por ora — distribuir as criaturas pelos campos
 * `species` de cada região é o **passo 4** do plano de mundo, e misturá-lo com a
 * troca do mapa faria um commit que ninguém consegue revisar.
 */
function spawnInitialCreatures(): void {
  // Snake, Rotworm, Javali e Aranha seguem DORMENTES a pedido: as CreatureDefs
  // e os desenhos continuam no código, só não nascem. Para reintroduzir
  // qualquer uma, basta uma linha no creatures.json.
  //
  // ⚠️ O Coelho SAIU dessa lista em 2026-08-29: ele voltou a nascer junto com o
  // resto do pasto (Cabra, Ganso, Cavalo e os filhotes), que ganhou arte.
  let fora = 0;
  for (const s of WORLD_CREATURE_SPAWNS) {
    if (!CREATURES[s.type]) {
      throw new Error(
        `creatures.json: espécie "${s.type}" não existe em CREATURES (shared/src/combat.ts)`,
      );
    }
    // O ponto do arquivo é intenção: se caiu em árvore, água ou dentro de um
    // prédio, encaixa no tile andável mais próximo. Sem isto, uma mudança de
    // densidade de floresta apagaria criaturas em silêncio.
    const posto = tileValidoMaisProximo(
      (x, y) => isWalkable(map, x, y, map.spawn.floor),
      s.x,
      s.y,
      4,
    );
    if (!posto) {
      fora++;
      console.warn(`[mundo] ${s.type} em (${s.x},${s.y}) não achou tile andável — não nasceu.`);
      continue;
    }
    spawnCreature(s.type, posto.x, posto.y);
  }

  /*
   * 🐄 **Os bichos do curral não vêm do `creatures.json`, e é de propósito.**
   *
   * Eles vêm de `FARM_BICHOS`, que sai do próprio `Farm.tmx`: o autor da fazenda
   * desenhou onde cada porco, vaca e galinha fica, e essa é a informação certa.
   * Copiar as nove posições para o `creatures.json` à mão criaria uma segunda
   * verdade que envelhece — mexer no mapa no Tiled deixaria de mover os bichos.
   *
   * ⚠️ **Sem `tileValidoMaisProximo` aqui, e isso importa.** O encaixe de raio 4
   * é a coisa certa para bicho de mato, cuja posição é uma intenção aproximada;
   * para bicho de curral seria o oposto — empurraria a vaca para FORA da cerca,
   * que é a única coisa que ela não pode fazer. O `farm:build` já garante chão
   * andável (ele mesmo empurra para uma vizinha antes de emitir). Se ainda assim
   * não estiver, o certo é reclamar alto, não improvisar.
   */
  let presos = 0;
  for (const b of FARM_BICHOS) {
    if (!CREATURES[b.type]) {
      throw new Error(`farm.json: espécie "${b.type}" não existe em CREATURES (shared/src/combat.ts)`);
    }
    if (!isWalkable(map, b.x, b.y, map.spawn.floor)) {
      presos++;
      console.warn(`[fazenda] ${b.type} em (${b.x},${b.y}) caiu em tile sólido — rode npm run farm:build`);
      continue;
    }
    spawnCreature(b.type, b.x, b.y);
  }
  console.log(
    `[mundo] ${creatures.size} criaturas geradas${fora ? ` (${fora} sem lugar)` : ''}`
    + ` — ${FARM_BICHOS.length - presos} delas no curral da fazenda.`,
  );
}

/**
 * Povoa o mundo de nós de recurso.
 *
 * Roda a cada boot, como `spawnInitialCreatures` e pela mesma razão: nó não
 * persiste. As posições vêm de `buildResourceNodes`, que é pura e determinística
 * — então "não persistir" não significa "muda de lugar": reiniciar o servidor
 * devolve exatamente os mesmos nós aos mesmos tiles, cheios.
 */
function spawnInitialNodes(): void {
  for (const spot of buildResourceNodes(map)) {
    const id = newId('node');
    nodes.set(id, {
      id,
      kind: spot.kind,
      tileX: spot.x,
      tileY: spot.y,
      floor: spot.floor,
      charges: NODES[spot.kind].charges,
      respawnAt: 0,
    });
  }
  const porTipo = new Map<NodeKind, number>();
  for (const n of nodes.values()) porTipo.set(n.kind, (porTipo.get(n.kind) ?? 0) + 1);
  const resumo = [...porTipo].map(([k, n]) => `${n} ${NODES[k].name}`).join(', ');
  console.log(`[mundo] ${nodes.size} nós de recurso: ${resumo}.`);
}

/** Nó esgotado volta ao mundo quando o prazo dele vence. */
function respawnNodes(now: number): void {
  for (const n of nodes.values()) {
    if (n.charges > 0 || now < n.respawnAt) continue;
    n.charges = NODES[n.kind].charges;
    n.respawnAt = 0;
  }
}

/**
 * Criaturas podem pisar aqui? Caminhável, fora do Depósito e fora da praça.
 *
 * 🔴 A praça segura é barrada **incondicionalmente**, e não mais só para quem
 * tem `avoidCenter`. O parâmetro continua na assinatura porque quem chama já o
 * passa, mas ele deixou de mandar aqui — a checagem do centro não olha mais para
 * ele.
 *
 * ⚠️ Não confie no `inDepotZone` para isso, mesmo que hoje as duas áreas
 * coincidam (a `depotZone` virou a praça quando o vilarejo saiu). São conceitos
 * diferentes — um é onde se guarda item, o outro é onde não se apanha — e o dia
 * em que o Depósito voltar a ser uma sala, a proteção sumiria em silêncio.
 */
function creatureCanEnter(
  x: number, y: number, floor: number, avoidCenter = false, selfId?: string,
): boolean {
  void avoidCenter; // ver o comentário acima: a praça vale para todos
  if (floor === 0 && inDepotZone(map, x, y)) return false; // monstros não entram no DP
  if (floor === 0 && inCenterSafeZone(x, y)) return false; // ninguém invade a praça
  if (!isWalkable(map, x, y, floor)) return false;
  // ❄️ Muralha de Gelo: "barreira física destruível" — a única magia do jogo que
  // vira colisão. Vale para monstro e para jogador (ver `podeAndarPara`).
  if (areaBlocks(groundAreas, x, y, floor)) return false;
  return !tileOccupied(x, y, floor, selfId);
}

/**
 * O jogador pode pisar aqui? Igual ao mapa, mais as muralhas de gelo.
 *
 * ⚠️ Existe separado de `creatureCanEnter` porque jogador entra no depósito e
 * na praça central, e monstro não.
 */
function podeAndarPara(x: number, y: number, floor: number): boolean {
  if (!isWalkable(map, x, y, floor)) return false;
  return !areaBlocks(groundAreas, x, y, floor);
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

/**
 * Quanto tempo o item do JOGADOR fica no chão, quando ele solta da mochila.
 *
 * 3 minutos, a pedido do dono. A ideia é o chão servir de área de descarte
 * temporária para gerir inventário — solta o excesso, decide o que voltar a
 * pegar, e o que sobra se limpa sozinho.
 */
const PLAYER_DROP_TTL_MS = 180000;

/**
 * Quanto tempo o LOOT de monstro fica no chão.
 *
 * Mais longo que o do jogador de propósito: um chefe larga 8 fragmentos, uma
 * receita, material e ouro de uma vez, muitas vezes no fim de uma luta em que o
 * grupo está sem vida e precisa se recompor. Três minutos ali custariam o loot
 * que a luta rendeu.
 *
 * ⚠️ REFERÊNCIA. Ancorado nos ~120 s do corpo de monstro (`DD-LOOT-002`), com
 * folga porque o item já está no chão, fora do corpo.
 */
const GROUND_LOOT_TTL_MS = 300000;

function dropItem(
  kind: string, amount: number, x: number, y: number, floor: number, roll?: ItemRoll,
  ttlMs = GROUND_LOOT_TTL_MS,
  /** Quem soltou, quando foi um jogador. Ver `GroundItem.droppedBy`. */
  droppedBy?: string,
): void {
  const id = newId('i');
  items.set(id, {
    id, itemKind: kind, amount, tileX: x, tileY: y, floor, roll,
    ...(droppedBy ? { droppedBy } : {}),
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Remove do chão o que passou da validade.
 *
 * Roda junto de `expireCorpses`, no mesmo tique — as duas limpezas têm a mesma
 * natureza e separá-las só espalharia a lógica.
 */
function expireGroundItems(now: number): void {
  for (const item of items.values()) {
    if (now >= item.expiresAt) items.delete(item.id);
  }
}

/**
 * Quanto de nível de equipamento vale um ponto de XP da criatura.
 *
 * 🔴 **A XP é o medidor de dificuldade canônico do bestiário** — o Slime Verde,
 * com 10 de XP, é a "âncora de balanceamento de todo o bestiário" segundo o Doc
 * 3, e não existe campo de nível na criatura. Ancorar aqui é reusar a escala que
 * o documento já fechou em vez de inventar uma segunda.
 *
 * ⚠️ REFERÊNCIA: o fator é ajuste de sensação. Com 0,6, o Slime Verde (10 XP)
 * larga peça de Lv.6 e o Zumbi (95 XP, conteúdo de nível 50–100) larga de Lv.57.
 */
const DROP_LEVEL_PER_XP = 0.6;

/**
 * Equipamentos que podem cair de uma criatura desta faixa de nível.
 *
 * 🔴 Antes do catálogo do Doc 4 isto era uma lista fixa de 13 peças, e não havia
 * o que filtrar. Com 205 modelos, sortear uniformemente faria um Slime Verde
 * largar o Machado Primordial.
 *
 * A faixa vai da METADE do nível até ele: sem o piso, todo monstro do jogo
 * continuaria largando as peças de nível 1 na maior parte das vezes, porque elas
 * são a maioria do que cabe no filtro.
 *
 * Artefato único fica fora: o cap. 40 diz que existe UM no mundo, e pool
 * aleatório é a definição do contrário.
 */
function dropPoolFor(c: Creature, arma: boolean): string[] {
  const max = Math.max(1, Math.round((c.def.xpReward ?? 0) * DROP_LEVEL_PER_XP));
  const min = Math.max(1, Math.floor(max / 2));
  const cabe = MODEL_ENTRIES.filter(
    (e) => !e.unique && (e.slot === 'weapon') === arma && e.level >= min && e.level <= max,
  );
  // Se a faixa não pegou nada (criatura muito fraca), cai no piso do catálogo —
  // largar nada seria pior que largar a peça mais simples.
  const escolhidos = cabe.length > 0
    ? cabe
    : MODEL_ENTRIES.filter((e) => !e.unique && (e.slot === 'weapon') === arma && e.level === 1);
  return escolhidos.map((e) => e.kind);
}

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

/**
 * Larga o loot de uma criatura morta.
 *
 * `recipient` vem da regra de loot da party (`lootRecipientFor`). Quando ele
 * existe, o item vai direto para a mochila dele; `undefined` mantém o
 * comportamento de sempre — cai no chão, que é o Loot Livre.
 *
 * 🔴 `DD-PARTY-011/012`: **a quantidade não muda.** Uma morte gera uma
 * quantidade real de drops, com 2 ou com 10 jogadores. O que a regra decide é o
 * DONO, nunca o volume.
 */
function dropLoot(c: Creature, recipient?: Player): void {
  /**
   * Entrega uma pilha. Mochila cheia **cai no chão** em vez de sumir: perder
   * loot por falta de espaço seria pior que a regra de loot não valer.
   */
  /*
   * 🔴 O que não vai para a mochila de alguém entra numa BOLSA, não no chão.
   *
   * Antes cada `entrega` virava uma pilha solta no mesmo tile, e uma morte com
   * ouro + fragmento + material + equipamento deixava quatro pilhas empilhadas,
   * onde só a de cima aparecia. A bolsa junta tudo num recipiente clicável — o
   * mesmo mecanismo do corpo de jogador, que já existia.
   */
  const paraBolsa: ItemStack[] = [];
  const entrega = (kind: string, amount: number, roll?: ItemRoll): void => {
    if (recipient?.alive && addToBackpack(recipient, kind, amount, roll)) {
      sendInventory(recipient);
      send(recipient, {
        t: 'chat', from: 'Grupo',
        text: `Você recebeu ${amount}× ${ITEMS[kind]?.name ?? kind}.`,
      });
      return;
    }
    paraBolsa.push({ kind, amount, ...(roll ? { roll } : {}) });
  };

  const gold = c.def.goldMin + Math.floor(Math.random() * (c.def.goldMax - c.def.goldMin + 1));
  if (gold > 0) entrega('gold', gold);

  // Fragmentos de Equipamento: o material que sustenta o crafting inteiro.
  // Chefe larga vários de uma vez — é o que justifica organizar um grupo.
  const fonte = fragmentSourceOf(c);
  const tentativas = c.def.boss ? BOSS_FRAGMENT_DROPS : 1;
  for (let i = 0; i < tentativas; i++) {
    const raridade = rollFragmentDrop(fonte, FRAGMENT_DROP_CHANCE);
    if (raridade) entrega(FRAGMENT_ITEM[raridade], 1);
  }

  // Receita: chance BEM menor que fragmento, porque uma receita rende uma
  // fabricação inteira enquanto o fragmento rende 1/100 dela. Chefe garante uma.
  const receita = rollRecipeDrop(fonte, c.def.boss ? 1 : RECIPE_DROP_CHANCE);
  if (receita) entrega(RECIPE_ITEM[receita], 1);

  for (const entry of LOOT_TABLE[c.def.type] ?? []) {
    if (Math.random() < entry.chance) entrega(entry.kind, 1);
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
      if (Math.random() < entry.chance) entrega(entry.kind, 1);
    }
  }
  // Equipamento com raridade e passivos rolados. Chefe empurra a curva de
  // raridade para cima — mas Lendário+ segue sendo evento raro.
  if (Math.random() < (c.def.boss ? 1 : EQUIP_DROP_CHANCE)) {
    const arma = Math.random() < 0.5;
    // A faixa vem da XP da criatura: bicho mais forte larga modelo mais fundo.
    const pool = dropPoolFor(c, arma);
    const kind = pool[Math.floor(Math.random() * pool.length)]!;
    const rarity = rollRarity(c.def.boss ? 35 : 0);
    // Cap. 46: o item nasce com NOME. `rollAffixNames` vem separado de
    // `rollItem` para evitar import circular no shared — ver o comentário lá.
    const nomes = rollAffixNames(arma ? 'weapon' : 'armor', rarity);
    entrega(kind, 1, rollItem(rarity, arma ? 'weapon' : 'armor', Math.random, nomes));
  }

  // Nada sobrou para o chão (tudo coube na mochila do dono do loot): sem bolsa.
  // Criatura que não larga nada também não deixa bolsa vazia sujando o mapa.
  if (paraBolsa.length === 0) return;

  const bolsa: Corpse = {
    id: newId('corpse'),
    // Criatura não tem id de jogador. O nome é o da espécie, e é o que aparece
    // no título da janela ("Bolsa de Slime Verde").
    ownerId: c.id,
    ownerName: c.def.name,
    tileX: c.tileX,
    tileY: c.tileY,
    floor: c.floor,
    items: paraBolsa,
    expiresAt: Date.now() + CORPSE_TTL_MS,
    source: 'creature',
  };
  corpses.set(bolsa.id, bolsa);
}

/**
 * Chance de um monstro comum largar uma peça de equipamento.
 *
 * ⚠️ **Baixou de 0,18 para 0,08 em 2026-07-30**, e o motivo é o catálogo: antes
 * havia 13 peças, todas de nível 1, e quase 1 em cada 5 abates largar equipamento
 * só enchia a mochila de repetição. Com 205 modelos escalonados por nível, cada
 * peça que cai é uma peça que pode ser melhor que a atual — e a mesma frequência
 * viraria progressão de graça.
 */
const EQUIP_DROP_CHANCE = 0.08;

/**
 * Alcance para pegar item do chão clicando, em tiles (Chebyshev).
 *
 * ⚠️ REFERÊNCIA. `1` = o próprio tile e os oito ao redor — a distância de um
 * braço, que é o que o Tibia usa. Mais que isso viraria telecinese; menos
 * obrigaria a pisar exatamente em cima, que é justamente o que o clique existe
 * para evitar.
 */
const PICKUP_RANGE = 1;

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
  // 🔴 **Desarmado treina `fist`, e antes não treinava nada.** O jogador batia
  // sem arma e não melhorava, para sempre. `proficiencyFor(undefined)` devolve
  // `fist` justamente para este caminho deixar de ser um beco sem saída.
  const tipo = proficiencyFor(arma?.identity.type);
  const p = player.proficiencies[tipo] ?? { level: 0, progress: 0 };
  p.progress += 1;
  if (p.progress >= proficiencyThreshold(p.level)) {
    p.progress = 0;
    p.level += 1;
    player.proficiencies[tipo] = p;
    recompute(player);
    send(player, {
      t: 'chat', from: 'Sistema',
      text: `${PROFICIENCY_LABEL[tipo]}: maestria ${p.level}.`,
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
    source: 'player',
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
  // Morrer também limpa buffs, debuffs, HoT e a conjuração em andamento.
  //
  // ⚠️ O que NÃO morre é a área que ele já plantou: a Ira da Natureza continua
  // atacando depois que o Druida cai. A magia saiu — e é o que dá ao grupo a
  // chance de terminar a luta que o healer não viu acabar.
  player.effects = [];
  player.hots = [];
  player.casting = null;
  player.magicProtection = false;
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
  // ☠️ Vulnerabilidade e Praga: "faz os aliados causarem mais" sem causar dano.
  return base * creatureMod(c, 'defense');
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
    // A Vulnerabilidade derruba DEF **e MDEF** — o doc dá os dois no mesmo
    // número. Sem isto, ela seria metade da habilidade contra um Feiticeiro.
    magicDefense: (creature.def.magicDefense ?? 0) * creatureMod(creature, 'magicResist'),
    resistances: creature.def.resistances ?? {},
  };
}

// ---------------------------------------------------------------------------
// Fabricação (`DD-PROF-021`..`028`)
// ---------------------------------------------------------------------------

/**
 * ⚠️ REFERÊNCIA. Custo em ouro por raridade de receita.
 *
 * `DD-PROF-024` exige gold em toda fabricação e **não dá valor**. Dobra por
 * degrau: o custo tem que doer o suficiente para o jogador não queimar receita
 * em teste, mas o gargalo real do sistema são os 100 fragmentos, não a moeda.
 */
const CRAFT_GOLD_COST: Record<Rarity, number> = {
  common: 50,
  uncommon: 100,
  rare: 200,
  epic: 400,
  legendary: 800,
  mythic: 1600,
  relic: 3200,
};

/** Quantos itens deste `kind` o jogador tem na mochila. */
function countInBackpack(player: Player, kind: string): number {
  let n = 0;
  for (const slot of player.backpack) {
    if (slot?.kind === kind) n += slot.amount;
  }
  return n;
}

/**
 * Fabrica um equipamento. O servidor é a autoridade: revalida tudo, consome e
 * sorteia. O cliente só manda a intenção.
 *
 * A ordem importa — **valida tudo antes de consumir qualquer coisa**. Consumir e
 * depois falhar comeria os fragmentos do jogador, que é o pior bug possível num
 * sistema onde 100 fragmentos custam horas de caça.
 */
function handleCraft(player: Player, msg: C2S_Craft): void {
  const deny = (reason: string): void => send(player, { t: 'denied', reason });

  // `DD-PROF-028`: fabricação acontece na bancada do Ferreiro, não no mato.
  if (!nearNpc(player, 'blacksmith')) {
    return deny('Você precisa estar na bancada de um Ferreiro.');
  }

  const def = getItem(msg.kind);
  if (!def || def.category !== 'equip') {
    return deny('Só dá para fabricar equipamento.');
  }

  // 🔴 A raridade da receita limita o TIER do modelo. Sem esta linha, uma Receita
  // Comum fabrica o Machado Primordial — a bancada aceitava qualquer `kind` de
  // equipamento, regra que funcionava quando o catálogo tinha 13 peças, todas de
  // nível 1. Ver `CRAFT_TIER_CAP` para a escada e o porquê de ser a raridade que
  // limita, e não um requisito de nível novo.
  //
  // ⚠️ A trava vale só para PEÇA DE CATÁLOGO. Mochila e bolsa não são modelos do
  // Doc 4 e continuam fabricáveis como sempre foram — negar por elas não estarem
  // no catálogo tiraria do jogo algo que já funcionava.
  const entry = MODEL_INDEX[msg.kind];
  if (entry && !craftableModel(msg.kind, msg.recipeRarity)) {
    return deny(`${def.name} exige uma receita melhor — é equipamento de nível ${entry.level}.`);
  }

  // Fragmentos: o que o jogador pediu tem que existir na mochila.
  const pedido: FragmentBundle = {};
  for (const r of RARITIES) {
    const n = Math.max(0, Math.floor(msg.fragments[r] ?? 0));
    if (n > 0) {
      if (countInBackpack(player, FRAGMENT_ITEM[r]) < n) {
        return deny(`Você não tem ${n} ${ITEMS[FRAGMENT_ITEM[r]]!.name}.`);
      }
      pedido[r] = n;
    }
  }

  const attempt = {
    bundle: pedido,
    recipeRarity: msg.recipeRarity,
    professionLevel: player.professions.blacksmith?.level ?? 1,
    // Os dois Mestres Ferreiros do mundo são conteúdo da Etapa 16 (cidades).
    // Até existirem, Mítico e Relíquia ficam inalcançáveis — fiel ao doc.
    masterSmith: false,
  };

  const check = canCraft(attempt);
  if (!check.ok) {
    const motivos: Record<string, string> = {
      'sem-fragmentos-suficientes': `A fabricação exige ${FRAGMENTS_PER_CRAFT} fragmentos.`,
      'nenhuma-raridade-qualificada':
        `Nenhuma raridade tem os ${MIN_FRAGMENTS_FOR_CHANCE} fragmentos mínimos.`,
      'acima-da-receita': 'Seus fragmentos estão acima do que esta receita produz.',
      'exige-mestre-ferreiro': 'Só um Mestre Ferreiro fabrica isso — e não há nenhum por aqui.',
    };
    return deny(motivos[check.reason ?? ''] ?? 'Não é possível fabricar isso.');
  }

  // Receita e ouro.
  const receita = RECIPE_ITEM[msg.recipeRarity];
  if (countInBackpack(player, receita) < 1) {
    return deny(`Você precisa de uma ${ITEMS[receita]!.name}.`);
  }
  const custo = CRAFT_GOLD_COST[msg.recipeRarity] ?? 0;
  if (player.gold < custo) return deny(`A fabricação custa ${custo} de ouro.`);

  // --- Daqui para baixo, nada mais pode falhar: consome e entrega. ---
  for (const r of RARITIES) {
    const n = pedido[r];
    if (n) removeFromBackpack(player, FRAGMENT_ITEM[r], n);
  }
  // `DD-PROF-024`: a receita é CONSUMÍVEL. Cada fabricação gasta uma.
  removeFromBackpack(player, receita, 1);
  // `setGold` e não `player.gold -=`: o ouro vive como MOEDAS na mochila e
  // precisa ser renormalizado (100 de uma viram 1 da próxima).
  setGold(player, player.gold - custo);

  const result = rollCraft(attempt);
  const arma = def.slot === 'weapon';
  const nomes = rollAffixNames(arma ? 'weapon' : 'armor', result.rarity);
  const roll = rollItem(result.rarity, arma ? 'weapon' : 'armor', Math.random, nomes);
  addToBackpack(player, msg.kind, 1, roll);

  // XP de profissão. `DD-PROF-023`: receita difícil rende mais.
  const antes = player.professions.blacksmith ?? { level: 1, xp: 0 };
  const ganho = craftXp(msg.recipeRarity, antes.level);
  const { state, levelsGained } = addProfessionXp(antes, ganho);
  player.professions.blacksmith = state;

  const nomeFinal = composeItemName(def.name, roll.prefix, roll.suffix);
  send(player, {
    t: 'chat', from: 'Ferreiro',
    text: `Você fabricou ${nomeFinal} [${RARITY[result.rarity].name}]`
      + `${result.upgraded ? ' — sua perícia elevou a raridade!' : ''}`,
  });
  if (levelsGained > 0) {
    send(player, {
      t: 'chat', from: 'Ferreiro',
      text: `Ferreiro subiu para o nível ${state.level}.`,
    });
  }
  sendInventory(player);
  sendStats(player);
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

/**
 * Estava junto na hora da morte? Mesmo raio que a marca de "perto" do painel
 * (`PARTY_NEAR_TILES`), medido contra a CRIATURA em vez de contra o outro
 * jogador — ver o comentário lá para o motivo de ser um número só.
 */
function nearCreature(p: Player, c: Creature): boolean {
  return p.floor === c.floor
    && chebyshev(p.tileX, p.tileY, c.tileX, c.tileY) <= PARTY_NEAR_TILES;
}

/**
 * Quem recebe o loot desta morte, segundo a regra da party.
 *
 * 🔴 `DD-PARTY-011/012`: **o loot NÃO é multiplicado.** Esta função escolhe UM
 * dono para a mesma quantidade de itens que cairia solo — ela nunca duplica
 * nada. `undefined` = cai no chão, que é o Loot Livre e o comportamento de
 * sempre.
 */
function lootRecipientFor(creature: Creature, killer: Player): Player | undefined {
  const party = partyOf(killer);
  if (!party) return undefined;
  const presentes = party.memberIds
    .map((id) => players.get(id))
    .filter((p): p is Player => !!p && nearCreature(p, creature));
  if (presentes.length === 0) return undefined;
  switch (party.lootRule) {
    case 'free':
      return undefined;
    case 'leader':
      return presentes.find((p) => p.id === party.leaderId);
    case 'random': {
      // Em chefe, a contribuição pondera o sorteio (`DD-PARTY-021`) e o last hit
      // não vale nada (`DD-PARTY-022`). Em criatura comum não há por que pesar:
      // o combate é curto e a ponderação viraria só ruído.
      if (creature.def.boss) {
        const porJogador = new Map<string, number>();
        for (const p of presentes) {
          const dano = creature.damageBy.get(p.id) ?? 0;
          if (dano > 0) porJogador.set(p.id, dano);
        }
        const vencedor = rollBossLootWinner(porJogador);
        return vencedor ? players.get(vencedor) : undefined;
      }
      return presentes[Math.floor(Math.random() * presentes.length)];
    }
  }
}

/**
 * Distribui a XP de uma morte, respeitando as regras de `party.ts`.
 *
 * 🔴 **É o que faltava para a Etapa 9 existir de verdade.** Sem party, é o
 * caminho de sempre: quem matou leva tudo.
 */
function grantKillXp(killer: Player, creature: Creature, baseXp: number): void {
  const party = partyOf(killer);
  if (!party) return grantXp(killer, baseXp);

  const membros = party.memberIds
    .map((id) => players.get(id))
    .filter((p): p is Player => !!p);
  const partes = distributeXp(
    baseXp,
    membros.map((p) => ({
      id: p.id,
      level: p.level,
      // 🔴 `DD-PARTY-008`: participação VÁLIDA. Entrar no grupo e ficar parado
      // não rende XP — é o que impede o grupo de virar reboque.
      participated: (creature.damageBy.get(p.id) ?? 0) > 0,
      nearby: nearCreature(p, creature),
    })),
  );
  for (const p of membros) {
    const xp = partes.get(p.id);
    if (xp) grantXp(p, xp);
  }
}

function damageCreature(
  player: Player,
  creature: Creature,
  dmg: number,
  crit: boolean,
  now: number,
): void {
  creature.hp = Math.max(0, creature.hp - dmg);
  // Contribuição acumulada, para `DD-PARTY-008` (participação válida) e
  // `DD-PARTY-021` (loot de chefe ponderado). Zerada quando a criatura renasce.
  creature.damageBy.set(player.id, (creature.damageBy.get(player.id) ?? 0) + dmg);
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
  // A regra de loot da party escolhe UM dono para a mesma quantidade de itens
  // que cairia solo (`DD-PARTY-011`: loot não é multiplicado). Sem party, ou em
  // Loot Livre, `undefined` mantém o comportamento de sempre — cai no chão.
  dropLoot(creature, lootRecipientFor(creature, player));
  // A variante incomum entrega mais XP — é a recompensa por ter dado mais
  // trabalho. Um chefe que já aniquilou grupos também vale mais.
  const bonusTriunfo = 1 + creature.triumphs * BOSS_TRIUMPH_XP;
  grantKillXp(
    player,
    creature,
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
 * Golpe básico de um jogador em OUTRO jogador.
 *
 * ⚠️ **Isto ainda não é a Etapa 17.** A ⚪ Caveira Branca existe (é a marca de
 * agressor recente, e o que faz o alvo poder revidar), mas amarela, vermelha e
 * preta não — elas dependem de contagem de assassinatos persistida. Reação dos
 * guardas e duelo consensual também continuam de fora.
 *
 * 🔴 A penalidade de morte por PvP já é a certa: `killPlayer(..., byPlayer)`
 * usa a tabela cheia em vez dos 70 % do PvE. Isso já estava implementado — só
 * não havia como um jogador matar outro para chegar lá.
 */
function playerAttackPlayer(player: Player, alvo: Player, now: number): void {
  const d = player.derived;
  const isMagic = d.attackType === 'magic';
  const restr = restrictionsOf(player.conditions);
  if (!restr.canAttack) return;
  if (isMagic && !restr.canCast) return;
  if (isMagic && player.mana < d.manaCost) return;

  // 🔴 Reconferido AQUI, e não só no clique. Entre selecionar o alvo e o golpe
  // sair passam tiques inteiros: dá tempo de os dois entrarem no mesmo grupo, de
  // o atacante desligar o PK ou de a caveira do alvo expirar. Confiar na
  // checagem do clique deixaria passar o golpe em quem já não é alvo válido.
  /*
   * 🔴 A praça segura vence o `canHarm`.
   *
   * Fica ANTES dele de propósito: `canHarm` decide pela regra de PvP (flag,
   * caveira, grupo), e o lugar não entra nessa conta — nem deve, porque
   * `shared/pvp.ts` não conhece geografia e ficaria pior se conhecesse.
   *
   * Vale para os DOIS lados: quem está dentro não apanha, e quem está dentro
   * também não bate. Só a primeira metade transformaria a praça em torre de
   * tiro — o novato apanharia de alguém intocável parado ao lado do Banqueiro.
   */
  if (player.floor === 0 && alvo.floor === 0
    && (inCenterSafeZone(player.tileX, player.tileY)
      || inCenterSafeZone(alvo.tileX, alvo.tileY))) {
    player.targetId = null;
    send(player, { t: 'denied', reason: 'Área protegida: aqui ninguém ataca ninguém.' });
    return;
  }

  const decisao = canHarm(combatantOf(player), combatantOf(alvo));
  if (!decisao.allowed) {
    player.targetId = null;
    send(player, { t: 'denied', reason: harmVetoText(decisao.veto, alvo) });
    return;
  }

  if (isMagic) player.mana -= d.manaCost;
  player.lastAttackAt = now;

  const bonus = equipBonus(player);
  const power = (isMagic ? d.magicAtk : d.physAtk)
    * offenseMult(player)
    * (1 + bonus.physDamage);
  const { amount, crit } = computeHit(power, d.critChance, d.critMult);
  const tipo = playerDamageType(player);
  // Mesma pilha de defesa em camadas que o jogador usa contra monstro — é o
  // ponto do cap. 31: uma ordem só de resolução, não uma para PvE e outra para
  // PvP. Esquivável porque é golpe corpo a corpo/à distância de alguém visível.
  const res = resolveDamage(amount, tipo, playerDefenseProfile(alvo, true));
  const dmg = res.amount;
  const dodged = res.outcome === 'dodged';
  applyLifeSteal(player, dmg);
  gainSkill(player);

  if (d.attackType !== 'melee') {
    broadcastFloor(player.floor, {
      t: 'projectile', fromId: player.id, toX: alvo.tileX, toY: alvo.tileY,
      floor: player.floor, kind: player.cls.projectile ?? 'arrow',
    });
  }

  alvo.hp = Math.max(0, alvo.hp - dmg);
  if (dmg > 0) onDamaged(alvo);
  // Cobrado no golpe que SAIU, não no alvo escolhido: mirar não é agredir.
  // `marksAsPk` é falso quando o alvo já estava de caveira — revidar é de graça.
  applyAggression(player, decisao.marksAsPk, now);
  const fatal = alvo.hp <= 0;
  broadcastFloor(player.floor, {
    t: 'hit', attackerId: player.id, targetId: alvo.id, amount: dmg, crit, dodged,
    hp: Math.round(alvo.hp), maxHp: alvo.maxHp, fatal,
  });
  if (fatal) {
    // `byPlayer: true` é o que troca a penalidade de PvE (70 %) pela de PvP
    // cheia — a tabela branda confirmada pelo dono em 30/07, com teto de um
    // nível. Ver `shared/src/death.ts`; não reverter para os 200–300 % do Doc 1.
    killPlayer(alvo, player.name, true);
    player.targetId = null;
  }
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
  // Passiva não se conjura: ela já está agindo. Sem esta porta, apertar a tecla
  // gastaria mana e cooldown para não fazer nada.
  if (def.kind === 'passive') {
    send(player, { t: 'denied', reason: `${def.name} é passiva — já está ativa.` });
    return;
  }
  // Etapa 8: Silêncio bloqueia SÓ magia (o silenciado anda e bate normal);
  // Congelamento, Petrificação e Stun bloqueiam tudo.
  const restr = restrictionsOf(player.conditions);
  if (!restr.canCast) {
    send(player, { t: 'denied', reason: 'Você não consegue conjurar agora.' });
    return;
  }
  if (player.casting) {
    send(player, { t: 'denied', reason: 'Você já está conjurando.' });
    return;
  }
  const readyAt = player.spellReadyAt[def.id] ?? 0;
  if (now < readyAt) {
    send(player, { t: 'denied', reason: `${def.name} recarregando (${((readyAt - now) / 1000).toFixed(1)}s).` });
    return;
  }
  if (player.mana < skillManaCost(def, nivel)) {
    send(player, { t: 'denied', reason: `Mana insuficiente para ${def.name} (${skillManaCost(def, nivel)}).` });
    return;
  }

  /**
   * 🔴 CONJURAÇÃO: as magias grandes não saem na hora.
   *
   * Andar cancela, e Stun/Congelamento/Petrificação derrubam (ver
   * `cancelCasting`). É o único contrajogo da Chuva de Meteoros — sem ele, a
   * maior magia do jogo seria um botão sem risco, e `70.49` deixa claro que o
   * Feiticeiro tem de correr perigo real quando o kit está em cooldown.
   *
   * ⚠️ A mana só é debitada no FIM. Cancelar uma conjuração não custa nada além
   * do tempo perdido — cobrar por uma magia que não saiu seria punir duas vezes.
   */
  const castMs = skillCastMs(def, nivel, skillLevelOf(player.skillLevels, 'cast_mastery'));
  if (castMs > 0) {
    player.casting = {
      skillId: def.id, endsAt: now + castMs, targetId: player.targetId,
      fromX: player.tileX, fromY: player.tileY,
    };
    send(player, { t: 'casting', spell: def.id, ms: castMs });
    return;
  }
  executeSpell(player, def, now, player.targetId);
}

/**
 * Interrompe a conjuração em andamento, se houver. Chamado por movimento e
 * pelas condições que `interruptsCast` marca.
 */
function cancelCasting(player: Player, motivo: string): void {
  if (!player.casting) return;
  const def = SKILLS[player.casting.skillId];
  player.casting = null;
  send(player, { t: 'casting', spell: null, ms: 0 });
  send(player, { t: 'chat', from: 'Sistema', text: `${def.name} interrompida: ${motivo}.` });
}

/** Fecha as conjurações que chegaram ao fim, e derruba as interrompidas. */
function tickCasting(now: number): void {
  for (const p of players.values()) {
    if (!p.casting) continue;
    if (!p.alive) {
      p.casting = null;
      continue;
    }
    // Sair do tile em que começou cancela — é como o jogador desiste.
    if (p.tileX !== p.casting.fromX || p.tileY !== p.casting.fromY) {
      cancelCasting(p, 'você se moveu');
      continue;
    }
    if (interruptsCast(p.conditions)) {
      cancelCasting(p, 'você foi atingido por controle');
      continue;
    }
    if (now < p.casting.endsAt) continue;
    const { skillId, targetId } = p.casting;
    p.casting = null;
    send(p, { t: 'casting', spell: null, ms: 0 });
    executeSpell(p, SKILLS[skillId], now, targetId);
  }
}

/**
 * Executa a habilidade de verdade — depois da conjuração, se houver uma.
 *
 * Dano, custo de mana e raio saem do NÍVEL da habilidade (Lv.1–10). O cooldown
 * é fixo de propósito: subir o nível deixa a skill mais forte, não mais rápida.
 *
 * O despacho é por `kind`, e a ordem das portas importa: as que agem sobre o
 * próprio personagem saem primeiro (não miram ninguém), depois as que miram
 * aliado, depois o chão, e por último as ofensivas — que são as únicas que
 * precisam juntar criaturas.
 */
function executeSpell(player: Player, def: SkillDef, now: number, targetId: string | null): void {
  const nivel = skillLevelOf(player.skillLevels, def.id);
  const custoMana = skillManaCost(def, nivel);
  // A mana é reconferida aqui: durante uma conjuração de 3 s ela pode ter sido
  // gasta em outra coisa, ou drenada.
  if (player.mana < custoMana) {
    send(player, { t: 'denied', reason: `Mana insuficiente para ${def.name} (${custoMana}).` });
    return;
  }
  const alcance = skillRange(def, nivel);

  // --- Habilidades que agem sobre o próprio personagem -----------------------
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
  if (def.kind === 'toggle') {
    // ✨ Proteção Mágica: liga e desliga, sem duração. Quem a desliga é o
    // jogador ou a falta de mana (ver `absorveComProtecaoMagica`).
    player.magicProtection = !player.magicProtection;
    player.spellReadyAt[def.id] = now + def.cooldownMs;
    send(player, { t: 'cast', spell: def.id, cooldownMs: def.cooldownMs });
    send(player, {
      t: 'chat', from: 'Sistema',
      text: player.magicProtection ? `${def.name} ATIVADA.` : `${def.name} desativada.`,
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

  // --- Cura, HoT e buff: miram ALIADO ---------------------------------------
  if (def.kind === 'heal' || def.kind === 'hot'
    || (def.kind === 'buff' && def.shape !== 'area')) {
    lancaEmAliados(player, def, nivel, now, targetId, alcance, custoMana);
    return;
  }

  // --- Área persistente no chão --------------------------------------------
  if (def.shape === 'ground') {
    plantaArea(player, def, nivel, now, custoMana);
    return;
  }

  // --- Daqui para baixo é ofensivo: junta os alvos --------------------------
  //
  // Os alvos são reunidos ANTES de gastar mana: sem alvo válido, a habilidade
  // não sai (e o jogador não perde mana nem cooldown por um clique no vazio).
  const targets: Creature[] = [];
  if (def.shape === 'target') {
    const target = targetId ? creatures.get(targetId) : undefined;
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

  // Debuff puro (Enfraquecer, Vulnerabilidade, Praga): nenhum dano, só ficha.
  if (def.kind === 'debuff') {
    const mods = skillModifiers(def, nivel);
    const duracao = skillDuration(def, nivel);
    for (const c of targets) {
      applyEffectTo(c, def.id, def.name, false, mods, duracao, now, player.id);
      // Debuffar é ato hostil: a criatura passa a te caçar. Sem isso, o Druida
      // enfraqueceria o chefe inteiro sem nunca entrar na briga.
      if (!c.targetId) c.targetId = player.id;
    }
    broadcastFloor(player.floor, {
      t: 'fx', kind: def.fx,
      x: def.shape === 'area' ? player.tileX : targets[0]!.tileX,
      y: def.shape === 'area' ? player.tileY : targets[0]!.tileY,
      floor: player.floor,
      ...(def.shape === 'area' ? { radius: alcance } : {}),
    });
    sendStats(player);
    return;
  }

  // Condição pura (Silêncio, Raízes Prensoras): controle sem dano.
  if (def.kind === 'condition') {
    aplicaCondicaoDaSkill(player, def, nivel, targets, now);
    broadcastFloor(player.floor, {
      t: 'fx', kind: def.fx, x: targets[0]!.tileX, y: targets[0]!.tileY, floor: player.floor,
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
  const sabor = def.kind === 'damage' && def.shape === 'area' && arma && !def.magic
    ? WEAPON_IDENTITY[arma.identity.type].damageMult
    : 1;
  /**
   * 🔴 **De onde sai o dano: `magic` decide.** A habilidade mágica escala com
   * `magicAtk` e ignora o bônus de dano físico do equipamento — senão o
   * Feiticeiro de espada grande conjuraria melhor que o de cajado.
   *
   * ⚠️ E `magic` é diferente de `damageType`: o Espinho da Terra sai do poder
   * mágico e fere como FÍSICO. É o 32.2 (*elemento ≠ condição ≠ origem*) na
   * prática.
   */
  const ataque = def.magic ? d.magicAtk : d.physAtk;
  const bonusEquip = def.magic ? 1 : 1 + equipBonus(player).physDamage;
  // 🌿 Afinidade com a Natureza: +15 % no ramo Natureza e no veneno (Lv.10).
  const afinidade = benefitsFromNatureAffinity(def)
    ? 1 + natureAffinityBonus(skillLevelOf(player.skillLevels, 'nature_affinity'))
    : 1;
  const poderBase = ataque * skillPower(def, nivel) * offenseMult(player)
    * bonusEquip * sabor * afinidade;

  /**
   * 🔴 `DD-SOR-010` **os meteoros caem em posições parcialmente aleatórias**:
   * um alvo pequeno leva poucos impactos, um MVP enorme leva vários.
   *
   * Como o jogo é por tile e o "tamanho físico" ainda não existe no bestiário,
   * o sorteio é por impacto: cada um dos 10 meteoros escolhe um alvo da área.
   * Com um alvo só, ele leva todos — que é o comportamento correto do alvo
   * "grande" e o único que a informação atual permite. Fica anotado para quando
   * criatura tiver tamanho.
   */
  const golpes = skillHits(def, nivel);
  const sorteiaAlvo = def.kind === 'multihit' && def.shape === 'area';

  for (let i = 0; i < golpes; i++) {
    const lista = sorteiaAlvo
      ? [targets[Math.floor(Math.random() * targets.length)]!]
      : targets;
    for (const c of lista) {
      if (!c.alive) continue;
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
      const dano = def.magic
        ? Math.max(1, Math.round(resolveDamage(
          amount, def.damageType ?? 'physical',
          creatureDefenseProfile(c, now, player, (def.damageType ?? 'physical') !== 'physical'),
        ).amount))
        : Math.max(1, Math.round(amount - creatureDefense(c, now, player)));
      applyLifeSteal(player, dano);
      damageCreature(player, c, dano, crit, now);
    }
  }
  // A condição vem DEPOIS do dano, e num sorteio só por lançamento: dez
  // meteoros não podem dar dez chances de queimar. `DD-SOR-018` (a Descarga não
  // controla) é respeitado por ausência de `applies` na ficha dela.
  if (def.applies) aplicaCondicaoDaSkill(player, def, nivel, targets, now);

  // Usar a habilidade treina a maestria de arma como um golpe normal
  // (uma vez só, mesmo quando o Bash acerta cinco monstros).
  gainSkill(player);
  sendStats(player);
}

/**
 * Aplica a condição da ficha nos alvos, com a regra especial das Raízes.
 *
 * 🪨 **Raízes Prensoras nos níveis altos PETRIFICA** em vez de só prender — é
 * daí que sai o status característico do Druida. `DD-DRU-031`: imunidade a
 * Congelamento **não** protege da Petrificação, e como a imunidade é lista de
 * ids exatos em `conditions.ts`, isso já vale sem regra extra.
 */
function aplicaCondicaoDaSkill(
  player: Player,
  def: SkillDef,
  nivel: number,
  targets: Creature[],
  now: number,
): void {
  if (!def.applies) return;
  const chance = skillConditionChance(def, nivel);
  const duracao = skillConditionDuration(def, nivel);
  const petrifica = def.id === 'binding_roots' ? rootsPetrifyChance(nivel) : 0;
  for (const c of targets) {
    if (!c.alive) continue;
    if (petrifica > 0 && Math.random() < petrifica) {
      applyConditionTo(c, 'petrify', 1, CONDITIONS.petrify.referenceDurationMs, now, undefined, player.id);
      continue;
    }
    applyConditionTo(c, def.applies.id, chance, duracao, now, def.applies.power, player.id);
    // Empurrão move de verdade: a condição só marca a janela sem ação.
    if (def.applies.id === 'knockback') empurra(player, c);
  }
}

/** Empurra a criatura um tile para longe de quem bateu, se houver para onde. */
function empurra(player: Player, c: Creature): void {
  const dx = Math.sign(c.tileX - player.tileX);
  const dy = Math.sign(c.tileY - player.tileY);
  if (dx === 0 && dy === 0) return;
  const nx = c.tileX + dx;
  const ny = c.tileY + dy;
  if (!isWalkable(map, nx, ny, c.floor) || tileOccupied(nx, ny, c.floor, c.id)) return;
  c.tileX = nx;
  c.tileY = ny;
}

/**
 * 💚🌟 Cura, HoT e buff — as habilidades que miram ALIADO.
 *
 * ⚠️ **Sem alvo aliado escolhido, cai no próprio conjurador.** É deliberado: o
 * Druida sob ataque não pode ser obrigado a trocar de alvo para se curar, e
 * trocar de alvo no meio da fuga é exatamente o que faz o healer morrer.
 */
function lancaEmAliados(
  player: Player,
  def: SkillDef,
  nivel: number,
  now: number,
  targetId: string | null,
  alcance: number,
  custoMana: number,
): void {
  const alvos: Player[] = [];
  if (def.shape === 'party' || def.shape === 'area') {
    for (const p of players.values()) {
      if (!p.joined || !p.alive || p.floor !== player.floor) continue;
      if (!ehAliado(player, p)) continue;
      if (chebyshev(player.tileX, player.tileY, p.tileX, p.tileY) <= alcance) alvos.push(p);
    }
  } else {
    // `shape: 'self'` (Chama de Revelação, Amplificação) nunca mira outro.
    const escolhido = def.shape === 'self' ? undefined : (targetId ? players.get(targetId) : undefined);
    const alvo = escolhido && escolhido.alive && escolhido.floor === player.floor
      && chebyshev(player.tileX, player.tileY, escolhido.tileX, escolhido.tileY) <= alcance
      ? escolhido
      : player;
    alvos.push(alvo);
  }
  if (alvos.length === 0) alvos.push(player);

  player.mana -= custoMana;
  player.spellReadyAt[def.id] = now + def.cooldownMs;
  send(player, { t: 'cast', spell: def.id, cooldownMs: def.cooldownMs });

  if (def.kind === 'heal') {
    // 🔴 A cura sai de `healPower` (WIS), nunca de ataque — `DD-PROG-024/025`.
    const bruto = player.derived.healPower * skillPower(def, nivel);
    for (const alvo of alvos) healPlayer(alvo, bruto, player, now);
  } else if (def.kind === 'hot') {
    const porPulso = player.derived.healPower * skillPower(def, nivel);
    const duracao = skillDuration(def, nivel);
    const tick = hotTickMs(def, nivel);
    for (const alvo of alvos) {
      // Uma por habilidade: relançar RENOVA em vez de empilhar dois HoTs iguais.
      alvo.hots = alvo.hots.filter((h) => h.skillId !== def.id);
      alvo.hots.push({
        skillId: def.id, sourceId: player.id, perPulse: porPulso,
        nextTickAt: now + tick, tickMs: tick, expiresAt: now + duracao,
      });
    }
  } else {
    const mods = skillModifiers(def, nivel);
    const duracao = skillDuration(def, nivel);
    for (const alvo of alvos) {
      applyEffectTo(alvo, def.id, def.name, true, mods, duracao, now, player.id);
      if (alvo.id !== player.id) {
        send(alvo, { t: 'chat', from: 'Sistema', text: `${player.name} lançou ${def.name} em você.` });
      }
    }
  }

  const fxAt = alvos.length === 1 ? alvos[0]! : player;
  broadcastFloor(player.floor, {
    t: 'fx', kind: def.fx, x: fxAt.tileX, y: fxAt.tileY, floor: player.floor,
    ...(def.shape === 'party' ? { radius: alcance } : {}),
  });
  sendStats(player);
}

/**
 * 🌿 Larga uma área persistente no chão.
 *
 * A área nasce onde o CONJURADOR está. Mirar com o mouse exigiria posição no
 * protocolo de `usespell`, e o jogo é de clique-para-andar — ficar de pé no
 * lugar certo é a decisão tática que a mecânica já oferece.
 */
function plantaArea(
  player: Player,
  def: SkillDef,
  nivel: number,
  now: number,
  custoMana: number,
): void {
  const g = def.ground;
  if (!g) return;
  if (groundAreas.length >= MAX_GROUND_AREAS) {
    send(player, { t: 'denied', reason: 'Magia demais no chão. Espere um instante.' });
    return;
  }
  // 🔴 Ice Wall: 1 parede no Lv.1, 3 no Lv.10. Ao erguer a 4ª, a mais antiga
  // cai — recusar em silêncio seria pior do que substituir.
  const teto = skillGroundMax(def, nivel);
  if (countAreasOf(groundAreas, player.id, def.id) >= teto) {
    const velha = dropOldestOf(groundAreas, player.id, def.id);
    if (velha) {
      groundAreas = groundAreas.filter((a) => a.id !== velha.id);
      broadcastFloor(velha.floor, { t: 'areagone', id: velha.id });
    }
  }

  player.mana -= custoMana;
  player.spellReadyAt[def.id] = now + def.cooldownMs;
  send(player, { t: 'cast', spell: def.id, cooldownMs: def.cooldownMs });

  const duracao = skillGroundDuration(def, nivel);
  const raio = skillRange(def, nivel);
  // Cura sai de `healPower`; dano sai do poder mágico. A mesma bifurcação do
  // resto do arquivo, aqui já resolvida em número absoluto por pulso.
  const afinidade = benefitsFromNatureAffinity(def)
    ? 1 + natureAffinityBonus(skillLevelOf(player.skillLevels, 'nature_affinity'))
    : 1;
  const poder = g.kind === 'heal'
    ? player.derived.healPower * skillPower(def, nivel)
    : player.derived.magicAtk * skillPower(def, nivel) * offenseMult(player) * afinidade;

  const area: GroundArea = {
    id: `a${proximaAreaId++}`,
    skillId: def.id,
    ownerId: player.id,
    kind: g.kind,
    x: player.tileX,
    y: player.tileY,
    floor: player.floor,
    radius: raio,
    expiresAt: now + duracao,
    nextTickAt: now + g.tickMs,
    tickMs: g.tickMs,
    power: poder,
    damageType: def.damageType,
    hitsPlayers: g.hitsPlayers,
    hitsCreatures: g.hitsCreatures,
    blocks: g.blocks ?? false,
    fx: def.fx,
    ...(def.applies
      ? {
        condition: {
          id: def.applies.id,
          chance: skillConditionChance(def, nivel),
          durationMs: skillConditionDuration(def, nivel),
          power: def.applies.power,
        },
      }
      : {}),
  };
  groundAreas.push(area);
  broadcastFloor(player.floor, {
    t: 'area', id: area.id, skill: def.id, kind: area.kind,
    x: area.x, y: area.y, floor: area.floor, radius: area.radius,
    durationMs: duracao, fx: def.fx,
  });
  gainSkill(player);
  sendStats(player);
}

// ---------------------------------------------------------------------------
// 🌟 Efeitos de ficha: passivas, buffs e debuffs
// ---------------------------------------------------------------------------

/**
 * Modificadores vindos das PASSIVAS aprendidas.
 *
 * Passiva não é buff: não expira, não pode ser dissipada e não ocupa slot na
 * lista de efeitos. Somá-la aqui, na hora do `recompute`, evita o pior dos dois
 * mundos — uma entrada eterna em `effects` que teria de ser recriada a cada
 * login e removida a cada reset de skill.
 */
function passiveModifiers(player: Player): Modifiers {
  const total: Modifiers = {};
  for (const def of skillsOfClass(player.cls.id)) {
    if (def.kind !== 'passive' || !def.mods) continue;
    const nivel = skillLevelOf(player.skillLevels, def.id);
    if (nivel <= 0) continue;
    for (const [k, v] of Object.entries(skillModifiers(def, nivel))) {
      const key = k as keyof Modifiers;
      total[key] = (total[key] ?? 0) + (v ?? 0);
    }
  }
  return total;
}

/** Tudo somado: passivas + buffs/debuffs ativos. */
function allModifiers(player: Player): Modifiers {
  const total = passiveModifiers(player);
  for (const [k, v] of Object.entries(sumModifiers(player.effects))) {
    const key = k as keyof Modifiers;
    total[key] = (total[key] ?? 0) + (v ?? 0);
  }
  return total;
}

/**
 * Aplica um efeito de ficha num jogador ou criatura, já contando a
 * **resistência a debuff** do alvo.
 *
 * 🔴 `DD-DRU-013`: a Harmonia Natural dá *resistência*, não imunidade — então
 * ela ENCURTA o debuff em vez de recusá-lo. Bloquear por completo daria à
 * passiva o poder de uma carta, que é justamente o que o doc proíbe.
 */
function applyEffectTo(
  alvo: Player | Creature,
  id: string,
  nome: string,
  bom: boolean,
  mods: Modifiers,
  duracaoMs: number,
  now: number,
  origemId?: string,
): void {
  let duracao = duracaoMs;
  if (!bom) {
    const resist = 'skillLevels' in alvo ? (allModifiers(alvo).debuffResist ?? 0) : 0;
    duracao = Math.round(duracao * Math.max(0.4, 1 - resist));
  }
  alvo.effects = applyEffect(alvo.effects, {
    id, name: nome, good: bom, mods,
    expiresAt: now + duracao,
    sourceId: origemId,
  });
  if ('skillLevels' in alvo) recompute(alvo);
}

/** Fator de um modificador em cima de uma CRIATURA (que não tem `recompute`). */
function creatureMod(c: Creature, key: keyof Modifiers): number {
  if (c.effects.length === 0) return 1;
  return modifierFactor(c.effects, key as never);
}

/**
 * Derruba os efeitos vencidos de todo mundo, e recalcula a ficha de quem
 * perdeu algum.
 *
 * ⚠️ O `recompute` só roda para quem REALMENTE perdeu um efeito. Rodar em todos
 * a cada tique custaria uma ficha inteira por jogador por 100 ms, e o resultado
 * seria idêntico em 99 % dos tiques.
 */
function tickEffectsAll(now: number): void {
  for (const p of players.values()) {
    if (!p.joined || p.effects.length === 0) continue;
    const r = tickEffects(p.effects, now);
    if (r.expired.length === 0) continue;
    p.effects = r.list;
    recompute(p);
    for (const e of r.expired) {
      send(p, { t: 'chat', from: 'Sistema', text: `${e.name} acabou.` });
    }
  }
  for (const c of creatures.values()) {
    if (c.effects.length === 0) continue;
    c.effects = tickEffects(c.effects, now).list;
  }
}

// ---------------------------------------------------------------------------
// 💚 Cura
// ---------------------------------------------------------------------------

/**
 * Cura um jogador, respeitando a Maldição da Fraqueza e a Harmonia Natural.
 *
 * 🔴 `healReceived` é do ALVO, não de quem cura — é o que faz a Maldição da
 * Fraqueza (−40 %) ser uma habilidade anti-healer de verdade: ela ataca o
 * paciente, não o médico.
 *
 * Devolve quanto foi curado de fato (0 se já estava cheio), porque quem chama
 * usa isso para decidir se mostra número na tela.
 */
function healPlayer(alvo: Player, bruto: number, origem: Player, now: number): number {
  if (!alvo.alive || bruto <= 0) return 0;
  const recebido = Math.max(MODIFIER_FLOOR, 1 + (allModifiers(alvo).healReceived ?? 0));
  const valor = Math.max(1, Math.round(bruto * recebido));
  const antes = alvo.hp;
  alvo.hp = Math.min(alvo.maxHp, alvo.hp + valor);
  const curado = Math.round(alvo.hp - antes);
  if (curado > 0) {
    broadcastFloor(alvo.floor, {
      t: 'heal', targetId: alvo.id, sourceId: origem.id, amount: curado,
      hp: Math.round(alvo.hp), maxHp: alvo.maxHp,
    });
  }
  if (alvo.id !== origem.id) sendStats(alvo);
  void now;
  return curado;
}

/** Pulsos de HoT vencidos. Roda antes do regen, como as condições. */
function tickHots(now: number): void {
  for (const p of players.values()) {
    if (!p.joined || p.hots.length === 0) continue;
    const vivos: ActiveHot[] = [];
    for (const h of p.hots) {
      if (h.expiresAt <= now) continue;
      if (now >= h.nextTickAt) {
        h.nextTickAt = now + h.tickMs;
        const dono = players.get(h.sourceId);
        if (p.alive && dono) healPlayer(p, h.perPulse, dono, now);
      }
      vivos.push(h);
    }
    p.hots = vivos;
  }
}

// ---------------------------------------------------------------------------
// 🌿 Áreas persistentes no chão
// ---------------------------------------------------------------------------

/**
 * Um tique de todas as áreas: dano, cura e condição em quem estiver dentro.
 *
 * ⚠️ A área NÃO acerta o dono nem a party dele quando é ofensiva. Sem isso, a
 * Nevasca do Feiticeiro congelaria o Knight que segura o chefe — e o jogador
 * aprenderia a nunca mais usar a suprema da própria classe.
 */
function tickGroundAreas(now: number): void {
  const r = expireAreas(groundAreas, now);
  if (r.expired.length > 0) {
    groundAreas = r.areas;
    for (const a of r.expired) {
      broadcastFloor(a.floor, { t: 'areagone', id: a.id });
    }
  }
  for (const a of groundAreas) {
    if (a.kind === 'wall' || a.kind === 'ward') continue;
    if (now < a.nextTickAt) continue;
    a.nextTickAt = now + a.tickMs;
    const dono = players.get(a.ownerId);

    if (a.hitsCreatures && a.kind === 'damage' && dono) {
      for (const c of creatures.values()) {
        if (!c.alive || !areaCovers(a, c.tileX, c.tileY, c.floor)) continue;
        golpeDeArea(dono, a, c, now);
        if (!c.alive) continue;
      }
    }
    if (a.hitsPlayers) {
      for (const p of players.values()) {
        if (!p.joined || !p.alive || !areaCovers(a, p.tileX, p.tileY, p.floor)) continue;
        if (a.kind === 'heal') {
          if (dono && ehAliado(dono, p)) healPlayer(p, a.power, dono, now);
          continue;
        }
        // Dano em jogador: só quem NÃO é aliado do dono.
        if (!dono || ehAliado(dono, p)) continue;
        danoDeAreaEmJogador(dono, a, p, now);
      }
    }
  }
}

/** Um pulso de área ofensiva numa criatura. */
function golpeDeArea(dono: Player, a: GroundArea, c: Creature, now: number): void {
  const perfil = creatureDefenseProfile(c, now, dono, a.damageType !== 'physical');
  const bruto = resolveDamage(a.power, a.damageType ?? 'physical', perfil).amount;
  const dano = Math.max(1, Math.round(bruto));
  damageCreature(dono, c, dano, false, now);
  if (a.condition) {
    applyConditionTo(c, a.condition.id, a.condition.chance, a.condition.durationMs, now, a.condition.power, dono.id);
  }
}

/** Um pulso de área ofensiva num jogador (PvP). */
function danoDeAreaEmJogador(dono: Player, a: GroundArea, p: Player, now: number): void {
  const bruto = resolveDamage(
    a.power, a.damageType ?? 'physical', playerDefenseProfile(p, a.damageType !== 'physical'),
  ).amount;
  const dano = Math.max(1, Math.round(bruto));
  p.hp = Math.max(0, p.hp - dano);
  broadcastFloor(p.floor, {
    t: 'hit', attackerId: dono.id, targetId: p.id, amount: dano,
    crit: false, dodged: false, element: a.damageType ?? 'physical', dot: true,
    hp: Math.round(p.hp), maxHp: p.maxHp, fatal: p.hp <= 0,
  });
  if (a.condition) {
    applyConditionTo(p, a.condition.id, a.condition.chance, a.condition.durationMs, now, a.condition.power, dono.id);
  }
  if (p.hp <= 0) killPlayer(p, SKILLS[a.skillId as SkillId].name);
  else sendStats(p);
}

/**
 * O jogador está dentro de um Círculo Arcano seu ou de um aliado?
 *
 * 🔴 `DD-SOR-023/024`: dentro dele o dano FÍSICO é anulado por completo, e a
 * magia passa normal. *"Só vale enquanto está dentro; saiu, acabou"* — por isso
 * a checagem é por posição na hora do golpe, e não um buff com duração.
 */
function dentroDeCirculoArcano(p: Player): boolean {
  for (const a of groundAreas) {
    if (a.kind !== 'ward') continue;
    if (!areaCovers(a, p.tileX, p.tileY, p.floor)) continue;
    const dono = players.get(a.ownerId);
    if (dono && ehAliado(dono, p)) return true;
  }
  return false;
}

/**
 * As duas defesas do Feiticeiro, aplicadas ao dano JÁ mitigado pela ficha.
 *
 * Devolve quanto realmente chega na vida. A ordem entre as duas importa: o
 * Círculo Arcano é absoluto e vem primeiro — anulado o golpe, não há nada para
 * a Proteção Mágica converter, e converter mana à toa seria o pior dos mundos.
 */
function mitigaDanoNoJogador(player: Player, dano: number, tipo: DamageType): number {
  if (dano <= 0) return dano;

  // 🔴 `DD-SOR-023/024`: dentro do Círculo, 100 % de imunidade ao FÍSICO — e
  // magia continua acertando normal. Sem exceção e sem meio-termo.
  if (tipo === 'physical' && dentroDeCirculoArcano(player)) return 0;

  // ✨ Proteção Mágica: parte do dano sai da mana em vez da vida. Quando a mana
  // acaba, a habilidade se desliga sozinha — descobrir isso apanhando seria
  // pior do que o aviso.
  if (!player.magicProtection) return dano;
  const nivel = skillLevelOf(player.skillLevels, 'magic_protection');
  if (nivel <= 0) return dano;
  const fatia = Math.round(dano * magicProtectionShare(nivel));
  if (fatia <= 0) return dano;
  const custo = fatia * MAGIC_PROTECTION_MANA_PER_HP;
  const paga = Math.min(fatia, Math.floor(player.mana / MAGIC_PROTECTION_MANA_PER_HP));
  if (paga <= 0) {
    player.magicProtection = false;
    send(player, { t: 'chat', from: 'Sistema', text: 'Proteção Mágica desligou: mana esgotada.' });
    return dano;
  }
  player.mana = Math.max(0, player.mana - Math.min(custo, paga * MAGIC_PROTECTION_MANA_PER_HP));
  return dano - paga;
}

/** São do mesmo lado? (o próprio, ou membro da mesma party) */
function ehAliado(a: Player, b: Player): boolean {
  if (a.id === b.id) return true;
  return a.partyId !== null && a.partyId === b.partyId;
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
    * (1 + creature.triumphs * BOSS_TRIUMPH_POWER)
    // ☠️ Enfraquecer e Praga da Natureza mordem aqui: é o "faz o inimigo causar
    // menos" que o cap. 71 usa para definir o ramo de debuff do Druida.
    * creatureMod(creature, 'physAtk');
  const { amount, crit } = computeHit(str, 0.05, 1.5);
  // Etapa 8: o golpe passa pelas camadas do cap. 31 em vez de subtrair a defesa
  // na mão. Ataque de criatura corpo a corpo é dano FÍSICO.
  const res = resolveDamage(amount, 'physical', playerDefenseProfile(player, true));
  const dodged = res.outcome === 'dodged';
  const dmg = mitigaDanoNoJogador(player, res.amount, 'physical');
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
 *   /lvl [n]     o mesmo; sozinho sobe UM nível
 *   /sp <n>      dá Skill Points avulsos
 *   /gold <n>    define o ouro
 *   /heal        enche vida e mana
 *   /cond <id>   aplica uma condição em você (Etapa 8)
 *   /uncond      limpa todas as condições
 *
 * ⚠️ `/dia`, `/tarde`, `/noite` e `/ciclo` NÃO estão aqui: saíram para
 * `handleWorldCommand`, que vale em qualquer servidor.
 *
 * Devolve true quando consumiu o texto (não deve virar chat).
 */
const DEV_MODE = process.env.ELYSIA_DEV === '1';

/**
 * Conta que o servidor de desenvolvimento deixa entrar **sem senha**.
 *
 * 🔴 TEMPORÁRIO — atalho para testar a interface sem redigitar a senha a cada
 * recarga do Vite. Vazia (o padrão fora do `dev.ts`) desliga o auto-login.
 * Ver o bloco comentado no `case 'auth'`.
 */
const DEV_ACCOUNT = (process.env.ELYSIA_DEV_ACCOUNT ?? '').trim().toLowerCase();
/**
 * Comandos de chat que **não são trapaça** e por isso valem SEMPRE, inclusive no
 * `npm run dev` — que é o servidor em que o mundo é olhado no dia a dia.
 *
 *   /dia  /tarde  /noite   põe o mundo naquela fase agora
 *   /ciclo                 devolve o relógio ao horário natural
 *
 * 🔴 Ficavam atrás de `DEV_MODE` junto com `/level` e `/gold`, e era a trava
 * errada: olhar o céu não é ganhar poder. Quem quisesse ver a noite tinha que
 * subir o `dev:test`, que arrasta junto o auto-login sem senha.
 *
 * 🔴 Estes NÃO congelam o relógio: deslocam a origem do ciclo, e o mundo segue
 * andando dali. Forçar `/noite` e esperar faz amanhecer sozinho — congelar
 * esconderia justamente os bugs de transição, que é o que se quer ver.
 *
 * ⚠️ O efeito é GLOBAL: o mundo é um só, então quem está jogando junto vê a
 * mesma coisa. Enquanto não existir conta de administrador, qualquer jogador
 * conectado muda o céu de todos — é aqui que a checagem de GM entra no dia em
 * que houver uma.
 *
 * Devolve true quando consumiu o texto (não deve virar chat).
 */
function handleWorldCommand(player: Player, text: string): boolean {
  const [cmd] = text.slice(1).split(/\s+/);

  switch (cmd) {
    case 'dia':
    case 'tarde':
    case 'noite': {
      const fase: DayPhase = cmd === 'dia' ? 'day' : cmd === 'tarde' ? 'dusk' : 'night';
      // A origem passa a ser "agora menos o quanto desta fase já deveria ter
      // corrido", ou seja: a fase começa exatamente neste instante.
      cycleOffset = phaseStartMs(fase) - Date.now();
      const t = worldTimeAt(Date.now() + cycleOffset);
      for (const p of players.values()) {
        if (!p.joined) continue;
        send(p, {
          t: 'chat', from: 'Mundo',
          text: `${PHASE_LABEL[fase]} agora (${String(Math.floor(t.hour)).padStart(2, '0')}h).`,
        });
      }
      return true;
    }
    case 'ciclo': {
      cycleOffset = 0;
      send(player, { t: 'chat', from: 'Mundo', text: 'Ciclo de volta ao horário natural.' });
      return true;
    }
    default:
      return false;
  }
}

function handleDevCommand(player: Player, text: string): boolean {
  if (!DEV_MODE) return false;
  /*
   * ⚠️ Guarda a lista inteira, e não só os dois primeiros: `/clone` e `/paste`
   * aceitam DOIS modificadores em qualquer ordem (`/paste aqui solido`), então
   * quem os lê precisa enxergar além do primeiro argumento.
   */
  const partes = text.slice(1).split(/\s+/);
  const [cmd, arg] = partes;
  /** "aqui" vale em QUALQUER posição — `/paste solido aqui` tem de funcionar. */
  const miraAqui = partes.slice(1).some((a) => a.toLowerCase() === 'aqui');
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

    /*
     * `/lvl` é o mesmo comando com um atalho: SEM número ele sobe UM nível. É o
     * modo de ir subindo aos poucos sem ter que lembrar em que nível se está.
     * Com número (`/lvl 30`) é idêntico a `/level 30`.
     *
     * ⚠️ Só sobe. `/level` nunca desceu de nível — o laço reconstrói a ficha de
     * baixo para cima, e o atalho não muda isso.
     */
    case 'lvl':
    case 'level': {
      const alvo = Number.isFinite(n) ? n : cmd === 'lvl' ? player.level + 1 : NaN;
      if (!Number.isFinite(alvo) || alvo < 1 || alvo > 500) {
        return aviso('uso: /level <1..500> — ou /lvl sozinho para subir um nível'), true;
      }
      // Reconstrói a ficha do nível 1 até `alvo`, concedendo tudo que seria ganho.
      while (player.level < alvo) {
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

    /*
     * 🔴 **`/remove` — a ferramenta de AUTORIA de cenário** (pedido do dono em
     * 31/08: *"remove a árvore/item/plantação/textura do grid que estiver de
     * FRENTE para o meu boneco"*).
     *
     * O alvo é o tile para onde o personagem está **virado**, e não o que está
     * sob ele: apagar o chão que se pisa é o caso raro, e mirar de frente é o
     * que dá para fazer andando. `/remove aqui` cobre o outro caso.
     *
     * 🔴 **A ordem em que as três coisas são tentadas é o conteúdo do comando**,
     * porque num mesmo tile pode haver as três, e apagar a errada é frustrante:
     *
     *   1. **item no chão** — o que está mais "por cima" e o mais fácil de pôr
     *      de volta (é só largar outro). Some sozinho, não vira edição gravada.
     *   2. **nó de coleta** — a árvore/veio/erva do sistema de coleta. Também
     *      não vira edição: nós renascem, e gravar "não existe aqui" brigaria
     *      com o respawn na próxima vez que ele acontecesse.
     *   3. **o TILE** — é o único que vira edição gravada, porque é o único que
     *      o mundo recria igual a cada boot.
     *
     * ⚠️ **Criatura não entra na lista, de propósito.** Bicho anda: mirar nele
     * seria mirar em algo que não está mais lá quando o comando roda, e ele
     * renasce em 45 s de qualquer jeito. Para tirar bicho, o caminho é matar.
     */
    case 'remove': {
      const aqui = miraAqui;
      const [ax, ay] = aqui
        ? [player.tileX, player.tileY]
        : tileAFrente(player);
      const onde = `(${ax}, ${ay})`;

      if (ax < 0 || ay < 0 || ax >= map.width || ay >= map.height) {
        return aviso(`${onde} está fora do mapa.`), true;
      }

      // 1. item no chão
      for (const [id, it] of items) {
        if (it.floor === player.floor && it.tileX === ax && it.tileY === ay) {
          items.delete(id);
          return aviso(`${onde}: item removido (${getItem(it.itemKind)?.name ?? it.itemKind}).`), true;
        }
      }

      // 2. nó de coleta
      for (const [id, no] of nodes) {
        if (no.floor === player.floor && no.tileX === ax && no.tileY === ay) {
          nodes.delete(id);
          return aviso(`${onde}: nó de coleta removido (${no.kind}).`), true;
        }
      }

      // 3. o tile
      const camada = map.floors[player.floor];
      if (!camada) return aviso('andar sem terreno.'), true;
      const idx = ay * map.width + ax;
      const antes = camada[idx]!;
      const base = chaoBaseEm(ax, ay);
      if (antes === base && !dentroDaFarm(ax, ay)) {
        return aviso(`${onde}: já é o chão do bioma, não há o que remover.`), true;
      }

      /*
       * 🔴 O substituto é `chaoBaseEm`, que é a mesma função que o cliente usa
       * para pintar o piso EMBAIXO de todo tile alto. Escolher `grass` fixo
       * plantaria um quadrado de grama na neve — foi um bug real do projeto,
       * está documentado no `worldgen.ts`.
       *
       * ⚠️ Dentro da fazenda isso vale igual: célula editada deixa de ser
       * desenhada pela arte assada (o cliente checa `foiEditada`), e o motor
       * volta a pintar ali a mesma grama do resto do mundo — que é exatamente o
       * que as células "não cobertas" da fazenda já fazem hoje.
       */
      const edit: WorldEdit & { antes: number } = {
        floor: player.floor, x: ax, y: ay, tile: base, antes,
      };
      camada[idx] = base;
      store.saveWorldEdit(edit, player.name);
      registraEdicoes([edit]);
      broadcastEdicao([edit]);
      aviso(`${onde}: "${getTileType(antes).name}" removido → "${getTileType(base).name}". /undo desfaz.`);
      return true;
    }

    /**
     * Desfaz a última remoção de TILE, do jeito que ela foi feita: devolvendo o
     * terreno gravado em `tile_antes`, não recalculando o `worldgen`. Ver o
     * comentário da v6 no `schema.ts`.
     */
    /*
     * 🔴 **`/clone` e `/paste` — o Ctrl+C / Ctrl+V do cenário** (pedido do dono em
     * 31/08). `/clone` guarda o tile de frente; `/paste` carimba o que está
     * guardado no tile de frente. `/undo` desfaz.
     *
     * 🔴 **O que é copiado são DUAS coisas, e entender a diferença é tudo:**
     *
     * | | de onde vem | quem desenha |
     * |---|---|---|
     * | **o tile** | `map.floors` — grama, terra, árvore, parede | o motor |
     * | **a arte** | o PNG assado da fazenda | o cliente, copiando pixels |
     *
     * Fora da fazenda só existe a primeira: o mundo é feito de 16 tipos de tile e
     * o que se vê É o tipo. Dentro da fazenda existem as duas, e são
     * independentes — a colisão vem do tile e o desenho vem do PNG.
     *
     * Por isso `/clone` guarda o tile SEMPRE e a origem da arte SÓ quando a
     * célula está na fazenda. Colar arte de fazenda numa célula de fora não faz
     * sentido (não há PNG lá para receber os pixels) e é recusado.
     *
     * ⚠️ **Não copia o que está VIVO**: bicho, item no chão, nó de coleta, água
     * correndo e as pás do moinho são entidades ou sprites animados, não pixels
     * do PNG. Clonar uma célula do lago copia o fundo do lago parado.
     */
    case 'clone': {
      const [cx, cy] = miraAqui
        ? [player.tileX, player.tileY]
        : tileAFrente(player);
      if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) {
        return aviso(`(${cx}, ${cy}) está fora do mapa.`), true;
      }
      const camada = map.floors[player.floor];
      if (!camada) return aviso('andar sem terreno.'), true;
      const tile = camada[cy * map.width + cx]!;
      const naFarm = player.floor === 0 && dentroDaFarm(cx, cy);
      player.clipboard = { tile, ...(naFarm ? { arte: { x: cx, y: cy } } : {}) };
      aviso(
        `copiado de (${cx}, ${cy}): "${getTileType(tile).name}"`
        + (naFarm ? ' + a arte da fazenda' : ' (fora da fazenda: só o tipo de tile)')
        + '. Use /paste.',
      );
      return true;
    }

    case 'paste': {
      const area = player.clipboard;
      if (!area) return aviso('nada copiado ainda — use /clone primeiro.'), true;
      const [ax, ay] = miraAqui
        ? [player.tileX, player.tileY]
        : tileAFrente(player);
      if (ax < 0 || ay < 0 || ax >= map.width || ay >= map.height) {
        return aviso(`(${ax}, ${ay}) está fora do mapa.`), true;
      }
      const camada = map.floors[player.floor];
      if (!camada) return aviso('andar sem terreno.'), true;

      /*
       * ⚠️ Arte da fazenda só cola DENTRO da fazenda. Fora dela não existe PNG
       * assado para receber os pixels, e o cliente não teria onde desenhar —
       * então o tile vai e a arte fica para trás, com aviso.
       */
      const destinoNaFarm = player.floor === 0 && dentroDaFarm(ax, ay);
      const levaArte = area.arte !== undefined && destinoNaFarm;

      const idx = ay * map.width + ax;
      const antes = camada[idx]!;
      const edit: WorldEdit & { antes: number } = {
        floor: player.floor, x: ax, y: ay, tile: area.tile, antes,
        ...(levaArte ? { arte: area.arte } : {}),
      };
      camada[idx] = area.tile;
      store.saveWorldEdit(edit, player.name);
      registraEdicoes([edit]);
      broadcastEdicao([edit]);
      aviso(
        `colado em (${ax}, ${ay}): "${getTileType(area.tile).name}"`
        + (levaArte ? ` + a arte de (${area.arte!.x}, ${area.arte!.y})`
          : area.arte ? ' — a arte NÃO foi: o destino está fora da fazenda' : '')
        + '. /undo desfaz.',
      );
      return true;
    }

    case 'undo':
    case 'restaura': {
      /*
       * 🔴 **Duas pilhas, um só `/undo`.** O editor grava em duas tabelas — tile
       * em `world_edit`, objeto em `world_decal` — e o dono não tem por que saber
       * disso: ele desfez a última coisa que fez. Então o comando compara os dois
       * carimbos de tempo e desfaz o mais recente dos dois.
       *
       * ⚠️ Sem isto, posicionar um objeto e apertar `/undo` desfaria a REMOÇÃO de
       * dez minutos atrás e deixaria o objeto lá — o pior tipo de desfazer, o que
       * mexe no que você não estava olhando.
       */
      const ultimoDecal = store.lastDecal();
      const editAt = store.lastWorldEditAt();
      if (ultimoDecal && (editAt === undefined || ultimoDecal.placedAt >= editAt)) {
        store.deleteDecal(ultimoDecal.id);
        for (const outro of players.values()) {
          if (outro.joined) send(outro, { t: 'decals', decals: [], removidos: [ultimoDecal.id] });
        }
        /*
         * ⚠️ **A edição GÊMEA sai junto, num `/undo` só.** Desfazer o desenho e
         * deixar a colisão para trás é o pior resultado possível: sobra parede
         * invisível, e nada em tela denuncia o que ficou.
         */
        let extra = '';
        if (ultimoDecal.colisao && ultimoDecal.colisao !== 'nada') {
          const gemea = store.listWorldEdits().find(
            (e) => e.floor === ultimoDecal.floor && e.x === ultimoDecal.x && e.y === ultimoDecal.y,
          );
          if (gemea?.antes !== undefined) {
            const cam = map.floors[gemea.floor];
            if (cam) cam[gemea.y * map.width + gemea.x] = gemea.antes;
            store.deleteWorldEdit(gemea.floor, gemea.x, gemea.y);
            esqueceEdicao(gemea.floor, gemea.x, gemea.y);
            broadcastEdicao(
              [{ floor: gemea.floor, x: gemea.x, y: gemea.y, tile: gemea.antes }],
              [{ floor: gemea.floor, x: gemea.x, y: gemea.y }],
            );
            extra = ' (e a colisão dele)';
          }
        }
        return aviso(`objeto #${ultimoDecal.id} removido de (${ultimoDecal.x}, ${ultimoDecal.y})${extra}.`), true;
      }
      const ultima = store.lastWorldEdit();
      if (!ultima) return aviso('não há nada para desfazer.'), true;
      const camada = map.floors[ultima.floor];
      if (camada) camada[ultima.y * map.width + ultima.x] = ultima.antes;
      store.deleteWorldEdit(ultima.floor, ultima.x, ultima.y);
      esqueceEdicao(ultima.floor, ultima.x, ultima.y);
      broadcastEdicao(
        [{ floor: ultima.floor, x: ultima.x, y: ultima.y, tile: ultima.antes }],
        [{ floor: ultima.floor, x: ultima.x, y: ultima.y }],
      );
      aviso(`(${ultima.x}, ${ultima.y}) restaurado para "${getTileType(ultima.antes).name}".`);
      return true;
    }

    default:
      return false;
  }
}

/** O tile para onde o personagem está virado. */
function tileAFrente(player: Player): [number, number] {
  const d = player.direction;
  const dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
  const dy = d === 'up' ? -1 : d === 'down' ? 1 : 0;
  return [player.tileX + dx, player.tileY + dy];
}

/**
 * Conta a TODO MUNDO que uma célula mudou.
 *
 * 🔴 Vai para todos os andares e não só para o de quem editou: um jogador no
 * andar 1 (o interior da casa da fazenda) que desça depois precisa do mapa já
 * certo, e o cliente aplica a edição na camada dela mesmo sem estar vendo.
 */
function broadcastEdicao(
  edits: WorldEdit[],
  desfeitas?: { floor: number; x: number; y: number }[],
): void {
  for (const p of players.values()) {
    if (p.joined) send(p, { t: 'worldedit', edits, ...(desfeitas ? { desfeitas } : {}) });
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
    ...(c.deleteAt ? { deleteAt: c.deleteAt } : {}),
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
function createCharacterFor(
  player: Player,
  name: string,
  cls: ClassDef,
  gender: Gender,
  /**
   * 🔴 A distribuição que o JOGADOR escolheu na criação. Desde 02/09 a classe
   * não decide mais os atributos — ela sugere.
   *
   * ⚠️ Ausente cai em `cls.base`, que é a distribuição sugerida e o
   * comportamento de antes. Serve para cliente antigo e para qualquer chamada
   * interna que não venha da tela.
   */
  attrs?: Attributes,
): number {
  const vila = starterTown();
  const attributes = { ...(attrs ?? cls.base) };
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
    professions: {} as Professions,
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
  // 🔴 O tamanho da mochila vem do CONTAINER EQUIPADO, não de uma constante.
  //
  // Usava `BACKPACK_SIZE` (20) fixo, e isso virou bug quando a Mochila subiu para
  // 40 slots: o personagem salvo com 40 voltava com 20 e **perdia acesso aos
  // itens dos slots 20 a 39** — eles continuavam no banco, invisíveis.
  //
  // Duas passadas porque há uma dependência circular: para saber o tamanho é
  // preciso saber qual container está equipado, e o container vem das mesmas
  // linhas. A primeira passada existe só para descobrir isso.
  const equipPrevio = rowsToItems(c.items, BACKPACK_SIZE, DEPOT_SIZE).equipment;
  const capacidade = backpackSizeFor(equipPrevio.container?.kind);
  const { backpack, depot, equipment } = rowsToItems(c.items, capacidade, DEPOT_SIZE);

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
  /*
   * 🔴 POSIÇÃO SALVA PODE NÃO EXISTIR MAIS — e a partir de 02/08 isso é certeza
   * para todo personagem antigo.
   *
   * Valoria era um mapa de 60×60 e o mundo passou a ter 300×300: um personagem
   * salvo em (20,20) reabre **no meio do oceano**, num tile sólido, sem rota
   * para lugar nenhum. Ele não estaria "preso" de forma visível — estaria num
   * lugar de onde nenhum clique funciona, o que é bem pior de diagnosticar.
   *
   * O conserto é geral, não uma correção de uma vez só: sempre que o tile salvo
   * não for andável, o personagem volta para a cidade de renascimento dele. Isso
   * cobre também o que ainda vai acontecer — o terreno é gerado por regra, e
   * mudar a densidade de floresta pode plantar uma árvore em cima de alguém que
   * deslogou ali.
   */
  const chao = getTown(c.respawnTown) ?? starterTown();
  if (isWalkable(map, c.tileX, c.tileY, c.floor)) {
    player.tileX = c.tileX;
    player.tileY = c.tileY;
    player.floor = c.floor;
  } else {
    player.tileX = chao.spawn.x;
    player.tileY = chao.spawn.y;
    player.floor = chao.spawn.floor;
    console.log(
      `[mundo] ${c.name} estava em (${c.tileX},${c.tileY},${c.floor}), que não existe mais — devolvido a ${chao.name}.`,
    );
  }
  player.skillPoints = c.skillPoints;
  player.skillLevels = parsed.skillLevels;
  player.skillResets = c.skillResets;
  // 🔴 Migração de proficiência, no CARREGAMENTO e não no schema.
  //
  // A mudança é de FORMATO do JSON, não de coluna — a coluna `proficiencies`
  // continua a mesma. Migrar aqui é o que faz cada personagem se converter ao
  // entrar, sem precisar varrer a tabela inteira num boot. E `migrateProficiencies`
  // é idempotente: chave que já é canônica passa direto, então rodar de novo num
  // personagem já convertido não faz nada.
  player.proficiencies = migrateProficiencies(
    parsed.proficiencies as Record<string, { level: number; progress: number } | undefined>,
  );
  player.professions = parsed.professions;
  player.outfit = parsed.outfit;
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
      /*
       * 🔴 AUTO-LOGIN DE DESENVOLVIMENTO — TEMPORÁRIO
       *
       * Entra sem senha, para não ter que digitá-la a cada recarga do Vite
       * enquanto se testa a interface. Três travas, todas necessárias:
       *
       *   1. `DEV_MODE`   só `npm run dev:test` liga (`ELYSIA_DEV=1`). O
       *                   servidor de verdade nunca passa por `dev.ts`.
       *   2. `DEV_ACCOUNT` precisa ser preenchida à mão em `ELYSIA_DEV_ACCOUNT`.
       *                   Vazia (o padrão) desliga tudo isto.
       *   3. nome bate    só a conta nomeada ali entra assim.
       *
       * ⚠️ Isto é um ATALHO DE TESTE com cara de furo de autenticação. Se algum
       * dia o servidor de produção passar a definir `ELYSIA_DEV`, isto vira um
       * bypass real. Apagar quando a fase de teste manual acabar.
       */
      const autoLoginDev = DEV_MODE
        && DEV_ACCOUNT !== ''
        && msg.mode === 'login'
        && msg.username.trim().toLowerCase() === DEV_ACCOUNT;
      if (autoLoginDev) {
        console.warn(`[DEV] auto-login SEM SENHA para "${DEV_ACCOUNT}" (ELYSIA_DEV_ACCOUNT)`);
      }
      const res = autoLoginDev
        ? store.contaSemSenhaParaDesenvolvimento(msg.username)
        : msg.mode === 'register'
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

    /**
     * ---- EXCLUIR PERSONAGEM (02/09) --------------------------------------
     *
     * 🔴 **Não apaga: MARCA.** Grava o instante em que o personagem morre e
     * devolve a lista. Quem apaga de fato é `varreExcluidos`, comparando com o
     * relógio — por isso o prazo sobrevive a reinício do servidor.
     */
    case 'deletechar': {
      if (!player.accountId) {
        send(player, { t: 'denied', reason: 'Faça login primeiro.' });
        return;
      }
      /*
       * 🔴 A SENHA É CONFERIDA DE NOVO, com a sessão já autenticada.
       *
       * Passado o prazo, isto destrói progresso sem volta — é a única ação do
       * jogo assim. Redigitar protege de quem senta no computador destravado, e
       * o custo é uma caixa de texto.
       *
       * ⚠️ Reusa `store.login`, que compara em tempo constante e devolve a mesma
       * mensagem para senha errada e conta inexistente.
       */
      const conta = store.accountById(player.accountId);
      if (!conta || !store.login(conta.username, msg.password).ok) {
        sendCharList(player, 'Senha incorreta.');
        return;
      }
      /*
       * ⚠️ Personagem EM JOGO não pode ser marcado: ele tem estado vivo na
       * memória, e o prazo venceria com alguém dentro dele.
       */
      const emJogo = [...players.values()].some((p) => p.characterId === msg.characterId);
      if (emJogo) {
        sendCharList(player, 'Saia do personagem antes de excluí-lo.');
        return;
      }
      const prazo = Date.now() + DELETE_GRACE_MS;
      if (!store.scheduleCharacterDeletion(msg.characterId, player.accountId, prazo)) {
        sendCharList(player, 'Não foi possível marcar este personagem.');
        return;
      }
      console.log('[excluir] personagem ' + msg.characterId + ' marcado (conta ' + player.accountId + ')');
      sendCharList(player);
      break;
    }

    /** Desistir, dentro do prazo. Não pede senha: desfazer não destrói nada. */
    case 'canceldelete': {
      if (!player.accountId) {
        send(player, { t: 'denied', reason: 'Faça login primeiro.' });
        return;
      }
      if (!store.cancelCharacterDeletion(msg.characterId, player.accountId)) {
        sendCharList(player, 'Este personagem não estava marcado para exclusão.');
        return;
      }
      console.log('[excluir] cancelado no personagem ' + msg.characterId);
      sendCharList(player);
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
      /*
       * 🔴 **REVALIDA a distribuição, mesmo com a tela já impedindo.** O cliente
       * é quem monta o `createchar`, e um forjado com `str: 999` entraria
       * direto no banco — atributo é permanente, não dá para desfazer depois.
       * A mesma função roda nos dois lados (`shared/src/stats.ts`).
       */
      if (msg.attributes) {
        const attrOk = checkAttributes(msg.attributes);
        if (!attrOk.ok) {
          sendCharList(player, attrOk.message);
          return;
        }
      }
      createCharacterFor(
        player, check.name, cls,
        msg.gender === 'female' ? 'female' : 'male',
        msg.attributes,
      );
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
      /*
       * 🔴 ENTRAR DUAS VEZES NA MESMA CONEXÃO — recusado.
       *
       * O bloco abaixo derruba OUTRAS conexões no mesmo personagem, mas nada
       * impedia a MESMA de mandar `hello` de novo. Isso aconteceu de verdade em
       * 01/08: um cliente autenticou duas vezes, virou dois `enterGame`, e o
       * segundo join reinicializou o personagem por cima do primeiro. O save da
       * desconexão gravou o estado meio-montado e o jogador perdeu a mochila
       * inteira, a arma e o ouro.
       *
       * O bug do cliente foi corrigido, mas a trava fica: perda de save é
       * irreversível, e o servidor não deve depender de o cliente se comportar.
       */
      if (player.joined) {
        send(player, { t: 'denied', reason: 'Você já está no mundo.' });
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
      sendFriends(player);
      // As edições de cenário do `/remove`: a lista INTEIRA, porque este
      // cliente ainda não tem nenhuma. Ver `shared/src/worldedit.ts`.
      send(player, { t: 'worldedit', edits: edicoesConhecidas(), inteira: true });
      send(player, { t: 'decals', decals: store.listDecals(), inteira: true });
      // Quem tem este jogador na lista precisa ver o "online" acender agora.
      broadcastFriendPresence();
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
      if (!podeAndarPara(nx, ny, player.floor)) return;
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
      if (target && target.alive && target.floor === player.floor) {
        player.targetId = msg.targetId;
        break;
      }
      // Alvo JOGADOR (o "Atacar" do menu de contexto). Passa pelo mesmo
      // `canHarm` que o dano vai passar — recusar aqui, na hora do clique, é o
      // que dá a mensagem certa em vez de um auto-ataque que nunca acerta.
      const outro = players.get(msg.targetId);
      if (outro && outro.joined && outro.alive && outro.floor === player.floor) {
        const d = canHarm(combatantOf(player), combatantOf(outro));
        if (!d.allowed) {
          send(player, { t: 'denied', reason: harmVetoText(d.veto, outro) });
          return;
        }
        player.targetId = msg.targetId;
        break;
      }
      send(player, { t: 'denied', reason: 'Alvo inválido.' });
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
    case 'craft': {
      if (!player.joined || !player.alive) return;
      handleCraft(player, msg);
      return;
    }
    case 'drop': {
      if (!player.joined || !player.alive) return;
      const slot = player.backpack[msg.slot];
      if (!slot) return;
      // Ouro não se solta pelo slot: ele vive como moedas normalizadas e
      // `player.gold` é a autoridade. Mexer nas moedas por fora dessincronizaria
      // o total, e o jogador acharia que perdeu dinheiro.
      if (isGold(slot.kind)) {
        send(player, { t: 'denied', reason: 'Ouro não pode ser solto no chão.' });
        return;
      }
      const qtd = Math.min(slot.amount, Math.max(1, Math.floor(msg.amount ?? slot.amount)));
      /*
       * Onde o item cai: no tile MIRADO pelo mouse, como no Tibia.
       *
       * 🔴 Coordenada vinda do cliente NÃO se usa crua. Duas checagens antes de
       * aceitar, e qualquer falha vira recusa COM MOTIVO — deixar cair aos pés
       * em silêncio seria pior: o jogador repetiria o gesto sem entender.
       *
       *   1. alcance — `DROP_THROW_RANGE` tiles (Chebyshev, diagonal conta)
       *   2. andável — nada de plantar item dentro de parede ou fora do mapa
       *
       * Sem `tileX`/`tileY` cai aos pés, que é o caso do botão direito: ali não
       * há posição de mouse envolvida.
       */
      let alvoX = player.tileX;
      let alvoY = player.tileY;
      if (msg.tileX !== undefined && msg.tileY !== undefined) {
        const tx = Math.floor(msg.tileX);
        const ty = Math.floor(msg.tileY);
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
        if (chebyshev(player.tileX, player.tileY, tx, ty) > DROP_THROW_RANGE) {
          send(player, { t: 'denied', reason: 'Longe demais para arremessar.' });
          return;
        }
        if (!isWalkable(map, tx, ty, player.floor)) {
          send(player, { t: 'denied', reason: 'Não dá para soltar aí.' });
          return;
        }
        alvoX = tx;
        alvoY = ty;
      }
      // 🔴 `player.id` no fim: marca o item como "acabei de soltar", para o
      // recolhimento automático não o puxar de volta no mesmo tique. Sem isso o
      // botão direito parecia não fazer nada.
      dropItem(
        slot.kind, qtd, alvoX, alvoY, player.floor,
        slot.roll, PLAYER_DROP_TTL_MS, player.id,
      );
      slot.amount -= qtd;
      if (slot.amount <= 0) player.backpack[msg.slot] = null;
      sendInventory(player);
      return;
    }
    case 'gather': {
      if (!player.joined || !player.alive) return;
      const node = nodes.get(msg.nodeId);
      if (!node || node.charges <= 0) {
        send(player, { t: 'denied', reason: 'Não há mais nada aqui.' });
        return;
      }
      const def = NODES[node.kind];
      if (node.floor !== player.floor
        || chebyshev(player.tileX, player.tileY, node.tileX, node.tileY) > GATHER_RANGE) {
        send(player, { t: 'denied', reason: `Aproxime-se: ${def.name}.` });
        return;
      }
      // Ferramenta. `hasToolFor` é a regra, e vive no shared com os testes —
      // aqui só se responde às duas perguntas que dependem deste jogador.
      const armaEquipada = player.equipment.weapon
        ? getItem(player.equipment.weapon.kind)?.weaponType
        : undefined;
      const temNaMochila = (kind: string): boolean =>
        player.backpack.some((s) => s?.kind === kind);
      if (!hasToolFor(def, { equippedWeapon: armaEquipada, hasItem: temNaMochila })) {
        send(player, { t: 'denied', reason: def.toolHint });
        return;
      }
      // Ritmo. Ver `GATHER_COOLDOWN_MS`: sem isto o nó se esvazia num clique
      // triplo, e coletar deixa de ser uma atividade para virar um botão.
      const agora = Date.now();
      if (agora - player.lastGatherAt < GATHER_COOLDOWN_MS) return;

      const saiu = rollGather(def);
      if (!addToBackpack(player, saiu, 1)) {
        send(player, { t: 'denied', reason: 'Mochila cheia.' });
        return;
      }
      player.lastGatherAt = agora;
      node.charges -= 1;
      const esgotou = node.charges <= 0;
      if (esgotou) node.respawnAt = agora + def.respawnMs;

      // XP da profissão que ESTE nó treina (ver `GATHER_PROFESSION`).
      const prof = GATHER_PROFESSION[node.kind];
      const antes = player.professions[prof] ?? { level: 1, xp: 0 };
      const { state, levelsGained } = addProfessionXp(antes, GATHER_XP[node.kind]);
      player.professions[prof] = state;

      send(player, {
        t: 'gathered',
        x: node.tileX, y: node.tileY,
        itemKind: saiu, amount: 1,
        profession: prof, xp: GATHER_XP[node.kind],
        ...(levelsGained > 0 ? { levelUp: state.level } : {}),
        depleted: esgotou,
      });
      if (levelsGained > 0) {
        send(player, {
          t: 'chat', from: PROFESSION_NAME[prof],
          text: `${PROFESSION_NAME[prof]} subiu para o nível ${state.level}.`,
        });
      }
      sendInventory(player);
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
      if (corpse.items.every((s) => s === null)) {
        if (corpse.source === 'creature') {
          // 🔴 Bolsa de monstro vazia some NA HORA, não por validade.
          //
          // Uma caçada gera uma bolsa por morte; com TTL, o campo de caça vira
          // um tapete de saquinhos vazios que ainda pedem clique para descobrir
          // que não têm nada. Esvaziou, acabou a função.
          //
          // Corpo de JOGADOR continua com o TTL curto: ele também marca onde
          // alguém morreu, e essa informação sobrevive ao espólio.
          corpses.delete(corpse.id);
        } else {
          corpse.expiresAt = Math.min(corpse.expiresAt, Date.now() + CORPSE_EMPTY_TTL_MS);
        }
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

    case 'pk': {
      if (!player.joined) return;
      const agora = Date.now();
      // Ligar é imediato; desligar espera a trava de combate. Ver `pkLockedUntil`.
      if (!msg.on && agora < player.pkLockedUntil) {
        const seg = Math.ceil((player.pkLockedUntil - agora) / 1000);
        send(player, { t: 'denied', reason: `Você está em combate PvP — espere ${seg}s para desligar o PK.` });
        return;
      }
      if (player.pkEnabled === msg.on) return;
      player.pkEnabled = msg.on;
      // Desligar o PK derruba um alvo jogador que já estava mirado — a menos que
      // o alvo esteja de caveira, porque nesse caso o golpe continua valendo e
      // derrubar a mira tiraria da vítima o alvo que ela tem direito de bater.
      if (!msg.on && player.targetId) {
        const alvo = players.get(player.targetId);
        if (alvo && !hasWhiteSkull(alvo, agora)) player.targetId = null;
      }
      send(player, {
        t: 'chat', from: 'Sistema',
        // 🔴 O texto do "desligado" mentia: dizia "intocável". Nunca foi
        // verdade depois da correção de 30/07 — o flag é de agredir, e a defesa
        // contra o agressor é a caveira dele, não o flag da vítima.
        text: msg.on
          ? 'PK LIGADO — você pode atacar outros jogadores. Agredir quem não está '
            + 'de caveira lhe dará a Caveira Branca.'
          : 'PK desligado — você não ataca outros jogadores (mas ainda pode ser '
            + 'atacado, e revidar em quem estiver de caveira).',
      });
      break;
    }

    case 'party': {
      if (!player.joined) return;
      handleParty(player, msg);
      break;
    }

    case 'friend': {
      if (!player.joined || !player.accountId) return;
      const nome = (msg.name ?? '').trim();
      if (msg.action === 'remove') {
        if (store.removeFriend(player.accountId, nome)) {
          send(player, { t: 'chat', from: 'Sistema', text: `${nome} saiu da sua lista de amigos.` });
        } else {
          send(player, { t: 'denied', reason: `${nome} não está na sua lista.` });
        }
        sendFriends(player);
        return;
      }
      const r = store.addFriend(player.accountId, nome);
      if (!r.ok) {
        const motivo = r.reason === 'nao_existe'
          ? `Não existe personagem chamado ${nome}.`
          : r.reason === 'voce_mesmo'
            ? 'Esse personagem é seu.'
            : `${nome} já está na sua lista.`;
        send(player, { t: 'denied', reason: motivo });
        return;
      }
      send(player, { t: 'chat', from: 'Sistema', text: `${nome} entrou na sua lista de amigos.` });
      sendFriends(player);
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
      if (text.startsWith('/')
        && (handleWorldCommand(player, text) || handleDevCommand(player, text))) return;
      broadcastFloor(player.floor, { t: 'chat', from: player.name, text });
      break;
    }
    /*
     * 🔴 **O `/ok` do construtor de mapas.** O cliente manda só a ESCOLHA — qual
     * sprite, girado quanto, em que altura; a célula-alvo é calculada aqui, do
     * mesmo jeito que no `/remove`: o tile para onde o personagem está virado.
     *
     * ⚠️ Fica atrás do `DEV_MODE` como todo o resto do editor. Sem essa trava, um
     * cliente qualquer poderia carimbar desenho no mundo de todo mundo.
     */
    case 'decal': {
      if (!player.joined || !DEV_MODE) return;
      const paleta = Math.floor(msg.paleta);
      if (!Number.isFinite(paleta) || paleta < 0) return;
      if (!camadaValida(msg.camada)) return;
      const [dx, dy] = tileAFrente(player);
      if (dx < 0 || dy < 0 || dx >= map.width || dy >= map.height) {
        send(player, { t: 'chat', from: 'DEV', text: `(${dx}, ${dy}) está fora do mapa.` });
        return;
      }
      const colisao = msg.colisao && colisaoValida(msg.colisao) ? msg.colisao : 'nada';
      const posto = store.addDecal({
        floor: player.floor, x: dx, y: dy,
        paleta, rot: giroValido(msg.rot), camada: msg.camada,
        ...(colisao !== 'nada' ? { colisao } : {}),
      }, player.name);
      for (const outro of players.values()) {
        if (outro.joined) send(outro, { t: 'decals', decals: [posto] });
      }
      /*
       * 🔴 **A colisão é uma `WorldEdit` GÊMEA**, gravada junto do decalque.
       *
       * Decalque é desenho, e desenho não para ninguém: a colisão do mundo mora
       * no TIPO DE TILE, em outro lugar. Então "essa parede bloqueia" vira uma
       * edição de tile na mesma célula, e `bloqueia` vs `livre` é só qual tile.
       *
       * ⚠️ **Dentro da fazenda a edição leva `arte` apontando para a PRÓPRIA
       * célula**, e sem isso a colisão apagaria o desenho: `farmDesenhaCelula`
       * devolve `false` para célula editada **sem** arte (é o `/remove`), e a
       * fazenda pararia de pintar ali. Apontando para si mesma, a célula continua
       * desenhada com os pixels originais — a colagem vira um no-op visual e só a
       * colisão muda.
       */
      if (colisao !== 'nada') {
        const camadaMapa = map.floors[player.floor];
        if (camadaMapa) {
          const idx = dy * map.width + dx;
          const antes = camadaMapa[idx]!;
          const alvo = colisao === 'bloqueia' ? 6 /* WALL_WOOD */ : chaoBaseEm(dx, dy);
          const naFarm = player.floor === 0 && dentroDaFarm(dx, dy);
          const edit: WorldEdit & { antes: number } = {
            floor: player.floor, x: dx, y: dy, tile: alvo, antes,
            ...(naFarm ? { arte: { x: dx, y: dy } } : {}),
          };
          camadaMapa[idx] = alvo;
          store.saveWorldEdit(edit, player.name);
          registraEdicoes([edit]);
          broadcastEdicao([edit]);
        }
      }
      send(player, {
        t: 'chat', from: 'DEV',
        text: `objeto #${posto.id} posto em (${dx}, ${dy}) · ${posto.rot}° · camada "${posto.camada}"`
          + (colisao === 'bloqueia' ? ' · SÓLIDO' : colisao === 'livre' ? ' · passagem ABERTA' : '')
          + '. /undo desfaz.',
      });
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
        // Mesma fonte que o carregamento usa, para os dois nunca divergirem.
        const newCap = backpackSizeFor(slot.kind);
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
    /**
     * Reorganizar dentro da mochila ou do depósito. Troca as duas posições, ou
     * FUNDE quando são do mesmo empilhável.
     *
     * 🔴 Nada entra nem sai: é rearranjo puro. Por isso não pede proximidade de
     * NPC nenhum — arrumar a própria mochila é coisa que se faz andando.
     */
    case 'moveitem': {
      if (!player.joined) return;
      const lista = msg.where === 'depot' ? player.depot : player.backpack;
      // Depósito só se mexe no Depósito; mochila, em qualquer lugar.
      if (msg.where === 'depot' && !atDepot(player)) {
        send(player, { t: 'denied', reason: 'Você precisa estar no Depósito.' });
        return;
      }
      const { from, to } = msg;
      if (from === to) return;
      if (!Number.isInteger(from) || !Number.isInteger(to)) return;
      if (from < 0 || to < 0 || from >= lista.length || to >= lista.length) return;
      const origem = lista[from];
      if (!origem) return; // arrastar de slot vazio não faz nada

      const destino = lista[to];
      const def = getItem(origem.kind);
      // Fundir: mesmo kind, empilhável, e sem `roll` dos dois lados — duas
      // espadas de raridades diferentes NÃO são a mesma coisa, mesmo com o mesmo
      // `kind`, e fundi-las apagaria os passivos de uma delas.
      if (destino && def?.stackable && destino.kind === origem.kind && !origem.roll && !destino.roll) {
        destino.amount += origem.amount;
        lista[from] = null;
      } else {
        lista[from] = destino ?? null;
        lista[to] = origem;
      }
      sendInventory(player);
      break;
    }

    /**
     * Pegar item do chão sem pisar em cima.
     *
     * O alcance é validado AQUI, e não no cliente: um id de item é fácil de
     * forjar, e sem esta checagem daria para limpar o mapa parado na vila.
     */
    case 'pickup': {
      if (!player.joined || !player.alive) return;
      const item = items.get(msg.itemId);
      if (!item) return; // já foi de alguém, ou expirou
      if (item.floor !== player.floor
        || chebyshev(player.tileX, player.tileY, item.tileX, item.tileY) > PICKUP_RANGE) {
        send(player, { t: 'denied', reason: 'Longe demais.' });
        return;
      }
      if (item.itemKind === 'gold') {
        setGold(player, player.gold + item.amount);
        items.delete(item.id);
        sendStats(player);
        sendInventory(player);
        break;
      }
      if (!addToBackpack(player, item.itemKind, item.amount, item.roll)) {
        send(player, { t: 'denied', reason: 'Mochila cheia.' });
        return;
      }
      items.delete(item.id);
      sendInventory(player);
      break;
    }

    /*
     * Empurrar uma pilha do chão para outro tile, arrastando — o gesto do Tibia.
     *
     * Duas distâncias diferentes, de propósito:
     *   ORIGEM  `PICKUP_RANGE`      — precisa alcançar o item para mexer nele
     *   DESTINO `DROP_THROW_RANGE`  — o mesmo alcance de arremesso da mochila
     *
     * Fossem a mesma, ou dava para mexer no que não se alcança, ou dava para
     * varrer item pelo mapa em saltos sucessivos sem sair do lugar.
     */
    case 'movegrounditem': {
      if (!player.joined || !player.alive) return;
      const item = items.get(msg.itemId);
      if (!item) return; // expirou, ou outro jogador levou
      if (item.floor !== player.floor
        || chebyshev(player.tileX, player.tileY, item.tileX, item.tileY) > PICKUP_RANGE) {
        send(player, { t: 'denied', reason: 'Longe demais para mexer nesse item.' });
        return;
      }
      const tx = Math.floor(msg.tileX);
      const ty = Math.floor(msg.tileY);
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
      if (tx === item.tileX && ty === item.tileY) return; // não saiu do lugar
      if (chebyshev(player.tileX, player.tileY, tx, ty) > DROP_THROW_RANGE) {
        send(player, { t: 'denied', reason: 'Longe demais para arremessar.' });
        return;
      }
      if (!isWalkable(map, tx, ty, player.floor)) {
        send(player, { t: 'denied', reason: 'Não dá para soltar aí.' });
        return;
      }
      item.tileX = tx;
      item.tileY = ty;
      // 🔴 Remarca quem mexeu por último. Sem isto, empurrar a pilha para o tile
      // onde o jogador está faria o recolhimento automático engoli-la no mesmo
      // tique — e mover item para perto de si é justamente um uso esperado.
      item.droppedBy = player.id;
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
        // A contribuição é por VIDA da criatura: sem zerar, o dano de ontem
        // continuaria dando direito ao loot de hoje.
        c.damageBy.clear();
      }
      continue;
    }
    // Etapa 8: criatura sob controle total não anda, não ataca e não conjura.
    // Pular a IA inteira é o comportamento certo — deixá-la "pensando" faria
    // ela teleportar para a posição nova assim que o controle acabasse.
    if (!restrictionsOf(c.conditions).canMove) continue;
    /*
     * 🔴 `true` fixo, não `c.def.avoidCenter`.
     *
     * A praça segura deixou de ser regra de chefe e virou regra do mundo
     * (2026-08-05). Enquanto a muralha de Lumindale existia, ela barrava o
     * slime comum e só o chefe precisava de regra; agora que o vilarejo é
     * grama, a regra é a única coisa que segura qualquer monstro.
     *
     * ⚠️ `def.avoidCenter` continua nos chefes de propósito: se um dia a praça
     * deixar de ser universal, é ele que diz quem nunca pôde entrar.
     */
    const avoidCenter = true;
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
    // ☠️ Maldição da Lentidão. Velocidade é INTERVALO aqui, então o debuff
    // (moveSpeed negativo) tem de DIVIDIR: −25 % de movimento vira 1/0,75, ou
    // seja, 33 % mais tempo entre os passos.
    const moveCd = (c.def.moveCooldownMs * spd) / creatureMod(c, 'moveSpeed');
    const atkCd = (c.def.attackCooldownMs * spd) / creatureMod(c, 'attackSpeed');

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
          /*
           * 🔴 A DIREÇÃO SAI ANTES DO PASSO, e a ordem é o bug inteiro.
           *
           * Estava assim: movia `c.tileX`/`c.tileY` para o destino e SÓ ENTÃO
           * calculava `dirFromDelta(step.x - c.tileX, ...)` — que, depois da
           * atribuição, é `step.x - step.x`, ou seja **zero nos dois eixos**.
           * `dirFromDelta(0, 0, atual)` devolve a direção que já estava lá, e o
           * bicho fugia sem nunca virar: andava de costas, de lado, de ré.
           *
           * ⚠️ O defeito é ANTIGO e só apareceu em 29/08 porque **fugir é
           * exclusividade do pacífico**, e até a fauna de pasto entrar não havia
           * uma única criatura pacífica nascendo no mundo. Os outros dois ramos
           * (perseguir e perambular) sempre calcularam antes, e por isso nunca
           * mostraram o problema.
           */
          c.direction = dirFromDelta(step.x - c.tileX, step.y - c.tileY, c.direction);
          c.tileX = step.x;
          c.tileY = step.y;
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
        // Mesma regra do jogador: magia à distância não atravessa parede. Sem
        // isto o muro protegeria só de um lado, e esconder-se atrás dele viraria
        // armadilha em vez de defesa.
        && hasLineOfSight(map, c.tileX, c.tileY, target.tileX, target.tileY, c.floor)
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
      // Alvo jogador (PvP): mesma cadência e mesmo alcance do PvE, resolvido
      // por `playerAttackPlayer`. O `else` abaixo cuida do alvo criatura.
      const alvoJogador = target ? undefined : players.get(player.targetId);
      if (alvoJogador) {
        if (!alvoJogador.joined || !alvoJogador.alive || alvoJogador.floor !== player.floor) {
          player.targetId = null;
        } else if (
          chebyshev(player.tileX, player.tileY, alvoJogador.tileX, alvoJogador.tileY)
            <= player.derived.attackRange
          // 🔴 Alcance NÃO basta: precisa enxergar. Sem isto, o tiro atravessava
          // muro e acertava quem estava do outro lado — que não via o atirador,
          // não podia revidar e não sabia de onde vinha o dano.
          && hasLineOfSight(
            map, player.tileX, player.tileY, alvoJogador.tileX, alvoJogador.tileY, player.floor,
          )
        ) {
          player.direction = dirFromDelta(
            alvoJogador.tileX - player.tileX, alvoJogador.tileY - player.tileY, player.direction,
          );
          const cadencia = player.fury
            ? player.derived.attackCooldownMs * (1 - furyStats(player.fury.level).attackSpeedBonus)
            : player.derived.attackCooldownMs;
          if (now - player.lastAttackAt >= cadencia) playerAttackPlayer(player, alvoJogador, now);
        }
      } else if (!target || !target.alive || target.floor !== player.floor) {
        player.targetId = null;
      } else if (
        chebyshev(player.tileX, player.tileY, target.tileX, target.tileY)
          <= player.derived.attackRange
        // Mesma regra do PvP acima: quem não vê, não acerta.
        && hasLineOfSight(
          map, player.tileX, player.tileY, target.tileX, target.tileY, player.floor,
        )
      ) {
        player.direction = dirFromDelta(target.tileX - player.tileX, target.tileY - player.tileY, player.direction);
        // Em Fúria o Knight bate mais rápido.
        const cadencia = player.fury
          ? player.derived.attackCooldownMs * (1 - furyStats(player.fury.level).attackSpeedBonus)
          : player.derived.attackCooldownMs;
        if (now - player.lastAttackAt >= cadencia) playerAttack(player, target, now);
      }
    }
    for (const item of items.values()) {
      if (item.floor !== player.floor) continue;
      const mesmoTile = item.tileX === player.tileX && item.tileY === player.tileY;
      // 🔴 Item que ESTE jogador acabou de soltar não volta para a mochila
      // enquanto ele estiver em cima. A marca se apaga quando ele sai do tile —
      // é isso que faz soltar no chão funcionar de verdade.
      if (item.droppedBy === player.id) {
        if (!mesmoTile) item.droppedBy = undefined;
        continue;
      }
      if (!mesmoTile) continue;
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
  // Um relógio só para o snapshot inteiro: com um `Date.now()` por jogador, dois
  // observadores poderiam ver a mesma caveira expirar em tiques diferentes.
  const agoraSnapshot = Date.now();
  /** Está perto o bastante para este jogador ver? Ver `SNAPSHOT_RANGE`. */
  const visivel = (x: number, y: number): boolean =>
    chebyshev(viewer.tileX, viewer.tileY, x, y) <= SNAPSHOT_RANGE;

  for (const p of players.values()) {
    if (!p.joined || p.floor !== viewer.floor) continue;
    // 🔴 O próprio jogador NUNCA é cortado: sem ele o cliente não teria de onde
    // tirar a posição da câmera nem o sprite do herói.
    if (p.id !== viewer.id && !visivel(p.tileX, p.tileY)) continue;
    out.push({
      id: p.id, name: p.name, tileX: p.tileX, tileY: p.tileY, floor: p.floor,
      direction: p.direction, kind: 'player', hp: Math.round(p.hp), maxHp: p.maxHp, level: p.level,
      charClass: p.cls.id, gender: p.gender,
      // A arma na mão, para o cliente escolher a animação do golpe. Sai do MESMO
      // `equippedWeapon` que o combate usa — se divergissem, o herói golpearia de
      // arco enquanto o dano saísse de espada.
      weaponType: equippedWeapon(p)?.identity.type,
      // As cores escolhidas, pela MESMA razão do `weaponType` acima: sem elas o
      // cliente só saberia o outfit do próprio jogador, e os outros apareceriam
      // todos na cor de fábrica da classe. ⚠️ COSMÉTICO (`13.10`) — não entra em
      // conta nenhuma, e é omitido para quem não escolheu.
      outfit: p.outfit,
      // Mesma economia do `conditions` abaixo: só vai quando é verdade/existe.
      // PK ligado é minoria, grupo também e caveira mais ainda, então na prática
      // nenhum dos três campos viaja no caso comum.
      pkEnabled: p.pkEnabled ? true : undefined,
      // Sem prazo junto, de propósito: o relógio do cliente não é confiável e o
      // snapshot já vai a cada tique. Quando o campo sumir, a caveira acabou.
      skull: hasWhiteSkull(p, agoraSnapshot) ? 'white' : undefined,
      partyId: p.partyId ?? undefined,
      // Só manda o campo quando há algo: um array vazio em cada entidade a cada
      // tique é peso de rede por nada.
      conditions: p.conditions.length ? p.conditions.map((c) => c.id) : undefined,
    });
  }
  for (const c of creatures.values()) {
    if (!c.alive || c.floor !== viewer.floor) continue;
    if (!visivel(c.tileX, c.tileY)) continue;
    out.push({
      id: c.id, name: c.name, tileX: c.tileX, tileY: c.tileY, floor: c.floor,
      direction: c.direction, kind: 'creature', hp: c.hp, maxHp: c.maxHp, creatureType: c.def.type,
      conditions: c.conditions.length ? c.conditions.map((x) => x.id) : undefined,
    });
  }
  for (const item of items.values()) {
    if (item.floor !== viewer.floor || !visivel(item.tileX, item.tileY)) continue;
    out.push({
      id: item.id, name: item.itemKind, tileX: item.tileX, tileY: item.tileY, floor: item.floor,
      direction: 'down', kind: 'item', itemKind: item.itemKind, amount: item.amount,
    });
  }
  for (const c of corpses.values()) {
    if (c.floor !== viewer.floor || !visivel(c.tileX, c.tileY)) continue;
    // `lootbag` desenha uma bolsa; `corpse` desenha ossos. Mesmo mecanismo,
    // leituras diferentes: o jogador precisa distinguir de longe o espólio de
    // uma caçada do corpo de alguém que morreu ali.
    const bolsa = c.source === 'creature';
    out.push({
      id: c.id,
      name: bolsa ? `Bolsa de ${c.ownerName}` : `Corpo de ${c.ownerName}`,
      tileX: c.tileX, tileY: c.tileY, floor: c.floor,
      direction: 'down', kind: 'item', itemKind: bolsa ? 'lootbag' : 'corpse',
      corpseOwner: c.ownerName,
    });
  }
  for (const n of nodes.values()) {
    // Esgotado não viaja: some da tela até renascer. Ver `nodeKind` no protocolo.
    if (n.floor !== viewer.floor || n.charges <= 0) continue;
    if (!visivel(n.tileX, n.tileY)) continue;
    out.push({
      id: n.id, name: NODES[n.kind].name, tileX: n.tileX, tileY: n.tileY, floor: n.floor,
      direction: 'down', kind: 'node', nodeKind: n.kind, charges: n.charges,
    });
  }
  for (const n of npcs) {
    if (n.floor !== viewer.floor || !visivel(n.x, n.y)) continue;
    out.push({
      id: n.id, name: n.name, tileX: n.x, tileY: n.y, floor: n.floor,
      direction: 'down', kind: 'npc', npcRole: n.role,
    });
  }
  return out;
}

/**
 * Raio, em tiles, do que o jogador recebe no snapshot.
 *
 * 🔴 **O snapshot deixou de mandar o andar inteiro.** Até aqui ele varria
 * jogadores, criaturas, itens, corpos, nós e NPCs do andar e mandava TODOS,
 * para TODO mundo, **15 vezes por segundo**. Com Valoria (60×60, 32 criaturas)
 * isso custava pouco e ninguém reparou.
 *
 * O mundo de Elysia tem 300×300 e vai ter centenas de criaturas espalhadas por
 * treze regiões. Sem corte, cada jogador receberia o mundo inteiro a 15 Hz — e
 * o custo cresceria com o TAMANHO DO MUNDO vezes o NÚMERO DE JOGADORES, que é
 * o jeito mais rápido de um servidor de MMO morrer.
 *
 * ⚠️ REFERÊNCIA: `32` é mais que a meia-tela do cliente (~20 tiles na
 * horizontal), então a entidade entra na lista **antes** de aparecer no quadro —
 * ninguém vê monstro "nascendo" na borda. Se o zoom da câmera diminuir, este
 * número sobe junto.
 *
 * ⚠️ O que NÃO depende disto: a lista de grupo (vai em `S2C_Party`, própria) e a
 * battle list (o cliente já filtra por alcance de ataque). Companheiro de grupo
 * do outro lado do mapa continua aparecendo no painel, como deve.
 */
const SNAPSHOT_RANGE = 32;

/** Corpos expiram: some do mundo quando o tempo acaba. */
function expireCorpses(now: number): void {
  for (const [id, c] of corpses) {
    if (now >= c.expiresAt) corpses.delete(id);
  }
}

/** Convite não respondido cai sozinho, e quem convidou fica sabendo. */
function expirePartyInvites(now: number): void {
  for (const [alvoId, convite] of partyInvites) {
    if (now <= convite.expiresAt) continue;
    partyInvites.delete(alvoId);
    const quemConvidou = players.get(convite.fromId);
    const alvo = players.get(alvoId);
    if (quemConvidou && alvo) {
      send(quemConvidou, { t: 'chat', from: 'Grupo', text: `${alvo.name} não respondeu ao convite.` });
    }
  }
}

/**
 * Reenvia a composição do grupo periodicamente.
 *
 * Precisa existir porque duas coisas do painel mudam SEM mudança de membro: a
 * vida de cada um e o `nearby` de quem se afastou. Enviar junto do snapshot (15
 * Hz) seria desperdício — a barra de vida do companheiro não precisa dessa
 * resolução — então vai a ~2 Hz.
 */
const PARTY_REFRESH_MS = 500;
let lastPartyRefreshAt = 0;

function refreshParties(now: number): void {
  if (now - lastPartyRefreshAt < PARTY_REFRESH_MS) return;
  lastPartyRefreshAt = now;
  for (const party of parties.values()) sendParty(party);
}

/**
 * Avisa quem acabou de perder a caveira, e zera o prazo.
 *
 * O snapshot já para de mandar o campo sozinho — isto existe só pelo aviso: o
 * agressor precisa saber a hora exata em que deixou de ser alvo livre, senão
 * fica cinco minutos sem saber se já pode voltar a andar pela vila.
 *
 * Zerar (em vez de deixar o prazo velho) é o que faz a comparação `> 0` valer
 * como "tem caveira" em qualquer lugar que precise dela sem um relógio à mão.
 */
function expireWhiteSkulls(now: number): void {
  for (const p of players.values()) {
    if (p.whiteSkullUntil === 0 || p.whiteSkullUntil > now) continue;
    p.whiteSkullUntil = 0;
    if (p.joined) {
      send(p, { t: 'chat', from: 'Sistema', text: '⚪ Sua Caveira Branca desapareceu.' });
    }
  }
}

function gameTick(): void {
  tick++;
  const now = Date.now();
  expireCorpses(now);
  expireGroundItems(now);
  respawnNodes(now);
  // Relógio do mundo. As três fases e o mapa de horas moram no shared.
  const t = worldTimeAt(now + cycleOffset);
  worldHour = t.hour;
  isNight = t.night;
  worldPhase = t.phase;
  updateCreatures(now);
  updatePlayers(now);
  expirePartyInvites(now);
  expireWhiteSkulls(now);
  refreshParties(now);
  // Antes do regen: uma parcela de veneno que mata não deve ser desfeita pela
  // regeneração do mesmo tique.
  tickConditionsAll(now);
  // A ordem daqui é deliberada: as condições já rodaram (é o que interrompe uma
  // conjuração), então `tickCasting` decide com a informação do tique atual. Os
  // efeitos vencem antes das áreas e do HoT porque um buff de cura que acabou
  // não pode inflar o pulso deste mesmo tique.
  tickCasting(now);
  tickEffectsAll(now);
  tickGroundAreas(now);
  tickHots(now);
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
      hour: worldHour, night: isNight, phase: worldPhase,
    });
    sendStats(player);
  }
}

// ---------------------------------------------------------------------------
// Conexões
// ---------------------------------------------------------------------------
/**
 * ---- VARREDOR DE EXCLUSÃO (02/09) ----------------------------------------
 *
 * 🔴 **É ele quem apaga de verdade.** O pedido do jogador só grava um instante
 * em `character.delete_at`; nada some até este varredor comparar com o relógio.
 *
 * ⚠️ **Roda no BOOT antes de qualquer coisa, e é o caso que mais importa.**
 * Servidor desligado a noite inteira acorda com prazos vencidos — sem a
 * varredura de partida, eles só venceriam quando alguém abrisse a tela de
 * personagens, e um prazo que depende de alguém olhar não é prazo.
 *
 * ⚠️ O intervalo é generoso (10 min) de propósito: exclusão não tem pressa, e um
 * laço apertado só gastaria disco para nada.
 */
const VARREDURA_MS = 10 * 60 * 1000;

function varreExcluidos(): void {
  const nomes = store.purgeExpiredCharacters(Date.now());
  if (nomes.length > 0) {
    console.log(`[excluir] ${nomes.length} personagem(ns) apagado(s): ${nomes.join(', ')}`);
  }
}

varreExcluidos();
setInterval(varreExcluidos, VARREDURA_MS);

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
    conditions: [], cc: emptyCcState(), effects: [], hots: [],
    casting: null, magicProtection: false,
    spellReadyAt: {}, skillPoints: 0, skillLevels: {}, skillResets: 0,
    fury: null, stance: false, proficiencies: {}, professions: {}, bestiary: {},
    lastGatherAt: 0,
    wasAtDepot: false, wasNearVendor: false, wasNearBank: false,
    pkEnabled: false, pkLockedUntil: 0, whiteSkullUntil: 0, partyId: null,
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
    // Sair do jogo é sair do grupo. Party não persiste (é estado de sessão), e
    // manter o fantasma faria o grupo contar um membro que ninguém enxerga —
    // ocupando vaga do `PARTY_MAX` e travando o convite do próximo.
    leaveParty(player, 'saiu do jogo');
    partyInvites.delete(id);
    players.delete(id);
    for (const c of creatures.values()) if (c.targetId === id) c.targetId = null;
    // Quem tinha este jogador como alvo perde o alvo — senão o auto-ataque
    // ficaria mirando um id que não existe mais.
    for (const p of players.values()) if (p.targetId === id) p.targetId = null;
    // A lista de amigos de quem está online mostra o status dele; avisa.
    broadcastFriendPresence();
    console.log(`[disc] ${player.name} saiu (${players.size} online)`);
  });
  socket.on('error', (err) => console.error(`[erro] socket ${id}:`, err.message));
});

spawnInitialCreatures();
spawnInitialNodes();
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
