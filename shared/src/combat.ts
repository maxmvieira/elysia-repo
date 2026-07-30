/**
 * Regras de combate compartilhadas (cliente exibe, servidor DECIDE).
 *
 * Conforme a doc (§8), acerto, dano, crítico e morte são calculados no
 * servidor. Aqui ficam as fórmulas e definições de dados versionadas.
 */

/** Atributos base da vocação Vanguard no nível 1 (doc §7). */
export const VANGUARD_BASE = {
  maxHp: 120,
  maxMana: 40,
  strength: 12,
  defense: 6,
  attackCooldownMs: 800,
  /** Alcance do ataque corpo a corpo, em tiles (distância de Chebyshev). */
  attackRange: 1,
  /** Regeneração por segundo. */
  hpRegen: 2,
  manaRegen: 3,
} as const;

/** Ganhos por nível ao subir de nível (progressão vertical, doc §3.4). */
export const LEVEL_UP_GAINS = {
  maxHp: 15,
  maxMana: 5,
  strength: 2,
  defense: 1,
} as const;

/** XP necessária para ir do nível atual para o próximo. */
export function xpToNext(level: number): number {
  return 100 + (level - 1) * 50;
}

import type { DamageType, ResistanceProfile } from './elements.js';
import type { ConditionId } from './conditions.js';

/** Ataque mágico à distância de um chefe (firebolt e afins). */
export interface CreatureSpell {
  /** Potência-base do dano (reduzido pela resistência mágica do alvo). */
  power: number;
  /**
   * Tipo de dano da magia (`DD-ELM-002`). Padrão: `fire`.
   *
   * Hoje não muda número nenhum — a resistência mágica do jogador vale igual
   * para os seis tipos não-físicos. Existe para quando as resistências por tipo
   * entrarem no equipamento, aí uma capa anti-fogo passa a importar contra este
   * chefe e não contra outro.
   */
  damageType?: DamageType;
  /** Só conjura quando o alvo está a pelo menos esta distância (tiles). */
  rangeMin: number;
  /** Alcance máximo da magia (tiles). */
  range: number;
  cooldownMs: number;
  /** Projétil visual disparado (reaproveita os do cliente: 'firebolt', 'arrow'). */
  projectile: string;
}

/**
 * Ataque em ÁREA de um chefe (Salto Esmagador do Super Slime, `DD-BAL-036`).
 *
 * Diferente de `CreatureSpell`: não tem projétil nem alvo único — cai em volta
 * do ponto de impacto e pega todo mundo no raio. É o que ensina posicionamento,
 * que o doc quer como primeira lição de MVP.
 */
export interface CreatureSlam {
  power: number;
  /** Raio em tiles (Chebyshev) a partir da criatura. */
  radius: number;
  cooldownMs: number;
  /** Distância máxima do alvo para ele decidir saltar. */
  range: number;
  damageType?: DamageType;
}

/**
 * Estado de fúria por vida baixa (`DD-BAL-036`).
 *
 * 🔴 O doc é específico: aumenta **velocidade de ataque**, "sem alterar sua
 * velocidade de deslocamento". Acelerar o passo transformaria a fase em
 * perseguição impossível — a lição aqui é aguentar pressão, não fugir.
 */
export interface CreatureEnrage {
  /** Fração de vida que dispara (0.5 = aos 50 %). */
  hpPct: number;
  /** Multiplicador do cooldown de ataque. Menor que 1 = ataca mais rápido. */
  attackSpeedMult: number;
  /** "Temporariamente": quanto dura depois de disparar. */
  durationMs: number;
}

/** Invocação de lacaios por um chefe. */
export interface CreatureSummon {
  /** Tipo de criatura invocada. */
  type: string;
  /** Quantos surgem por conjuração. */
  count: number;
  /** Teto de lacaios vivos ao mesmo tempo (mantém "não muitos"). */
  maxAlive: number;
  cooldownMs: number;
}

import type { Behavior } from './bestiary.js';

/** Definição de um tipo de criatura (dados versionados). */
export interface CreatureDef {
  /** Como ela reage a jogadores. Sem isso, todo bicho vira agressivo. */
  behavior?: Behavior;
  type: string;
  name: string;
  maxHp: number;
  /**
   * Potência do ataque. O doc dá FAIXAS de dano (ex.: "4–7") e aqui guardamos o
   * ponto médio, porque `computeHit` aplica variância de ±15 % — mais estreita
   * que as faixas do documento. Reproduzir "4–7" exatamente exigiria variância
   * por criatura; até lá o valor médio é o que preserva a curva entre espécies,
   * que é o que `DD-BAL-027` realmente protege.
   */
  strength: number;
  /** Defesa física. Corte plano no dano bruto (cap. 31). */
  defense: number;
  /**
   * Defesa mágica (`DD-BAL-033` e seguintes dão "DEF Mágica" por criatura).
   *
   * Ausente = 0, que era o comportamento anterior: magia ignorava a defesa da
   * criatura por completo. Agora que o doc dá números, magia passa a ser
   * reduzida — de leve no Tier I, mais no MVP.
   */
  magicDefense?: number;
  /** Distância (tiles) para começar a perseguir. */
  aggroRange: number;
  attackCooldownMs: number;
  moveCooldownMs: number;
  xpReward: number;
  /** Ouro dropado ao morrer (min..max). */
  goldMin: number;
  goldMax: number;
  /** Chefe: nome/HP maiores e IA especial (magia, invocação). */
  boss?: boolean;
  /** Chefe não pode entrar na zona central (onde o jogador renasce). */
  avoidCenter?: boolean;
  /** Tempo até reaparecer após morrer (ms). Padrão: CREATURE_RESPAWN_MS do servidor. */
  respawnMs?: number;
  /** Ataque mágico à distância (chefes). */
  spell?: CreatureSpell;
  /** Invocação de lacaios (chefes). */
  summon?: CreatureSummon;
  /** Ataque em área (chefes). */
  slam?: CreatureSlam;
  /** Fase de fúria por vida baixa (chefes). */
  enrage?: CreatureEnrage;
  /**
   * Condição que a criatura tenta aplicar quando acerta um golpe.
   *
   * 🔴 **Elemento ≠ Condição** (32.2). Isto é DELIBERADO e separado do
   * `damageType`: a Formiga Cuspidora causa dano de Veneno e **não** envenena,
   * porque a ficha dela não diz que envenena. Quem aplica condição é quem o doc
   * diz que aplica — dano elemental não vem com condição de brinde.
   *
   * A chance passa pelas três contramedidas de `conditions.ts` no servidor.
   */
  onHit?: {
    condition: ConditionId;
    /** 0..1, antes das resistências do alvo. */
    chance: number;
    durationMs: number;
    /** Dano por parcela, só para condições de DoT. */
    power?: number;
  };
  /**
   * Resistências e fraquezas por tipo de dano (`DD-ELM-002`). Ausente = neutra
   * a tudo.
   *
   * O bestiário revela isto em patamares (`Resistências: ???` até o jogador
   * conhecer a espécie) — encaixa no sistema já implementado na Etapa 6.
   */
  resistances?: ResistanceProfile;
}

/**
 * As quatro velocidades que o Doc 3 usa nas fichas, em ms por passo.
 *
 * O documento nunca dá número — só "Baixa", "Média", "Alta", "Muito Alta". Estes
 * valores ancoram na família Slime, que é "Baixa" e já valia 1500 antes do Doc 3.
 * ⚠️ A **velocidade-base do sistema segue PENDENTE** no doc (linha 2661 do
 * `doc3-lacunas-extraido.md`), então isto é escala relativa, não canônica.
 */
export const SPEED = {
  muitoLenta: 2000, // só o Zumbi: "lento" é a identidade dele
  baixa: 1500,
  media: 1200,
  alta: 900,
  muitoAlta: 700,
} as const;

/**
 * Quanto os cooldowns de criatura encurtam à noite (menor = mais rápido). Suave
 * de propósito: os monstros já se movem devagar e a noite não pode desfazer isso.
 *
 * Vive aqui, e não no servidor, porque o CLIENTE também precisa dele: a duração
 * do deslize de uma criatura sai de `moveCooldownMs`, e à noite esse número muda.
 * Com o valor duplicado nos dois lados, uma noite deixaria o sprite andando numa
 * velocidade e a posição autoritativa em outra.
 */
export const NIGHT_SPEED_MULT = 0.85;

export const CREATURES: Record<string, CreatureDef> = {
  rabbit: {
    type: 'rabbit',
    name: 'Coelho',
    // PACÍFICO: nunca ataca, sempre foge. Existe para o mundo não ser só uma
    // arena, e para o iniciante ter o que caçar sem risco.
    behavior: 'peaceful',
    maxHp: 25,
    strength: 0,
    defense: 0,
    aggroRange: 6, // enxerga longe para fugir a tempo
    attackCooldownMs: 9999,
    moveCooldownMs: 900, // o mais ágil da fauna
    xpReward: 6,
    goldMin: 0,
    goldMax: 2,
  },
  boar: {
    type: 'boar',
    name: 'Javali',
    // NEUTRO: não começa briga, mas revida com força. Depois de uns segundos
    // sem apanhar, perde o interesse e volta à rotina.
    behavior: 'neutral',
    maxHp: 150,
    strength: 14,
    defense: 4,
    aggroRange: 5,
    attackCooldownMs: 1100,
    moveCooldownMs: 1300,
    xpReward: 34,
    goldMin: 2,
    goldMax: 10,
  },
  spider: {
    type: 'spider',
    name: 'Aranha',
    // TERRITORIAL e sempre agressiva: pedido explícito, aranha não foge.
    behavior: 'territorial',
    maxHp: 80,
    strength: 12,
    defense: 2,
    aggroRange: 6,
    attackCooldownMs: 900,
    moveCooldownMs: 1150,
    xpReward: 26,
    goldMin: 1,
    goldMax: 6,
  },
  slime: {
    type: 'slime',
    // Doc 3 dá nome e lugar: existe uma linha de Slimes (Verde → Tier I ·
    // Azul → Tier II · Vermelho → Tier III · Ancião → Tier V). Este é o Verde.
    name: 'Slime Verde',
    // 🔴 `DD-BAL-033`: comportamento **Neutro**, não hostil. O doc é explícito —
    // "permanece parado enquanto nenhum jogador se aproxima" e "abandona a
    // perseguição após perder o alvo". O primeiro monstro do jogo não caça o
    // jogador: ele revida. Isso muda a sensação da vila inicial.
    behavior: 'neutral',
    // 🔴 `DD-BAL-027` (Doc 3) — APROVADO, valor CANÔNICO. O Slime Verde é a
    // **âncora de balanceamento de todo o bestiário**: nenhuma outra criatura
    // tem XP definido isoladamente, todas saem por comparação com estes 10.
    //
    // ⚠️ Isto SUBSTITUI o balanceamento anterior (120 HP / 9 força / 5 defesa /
    // 28 XP), que tinha sido escolhido para o Slime durar ~3 golpes no nível 1.
    // O doc pede combate de 3–8 s, o que com o dano atual de nível 1 (~28–39 por
    // golpe) dá ~2 golpes. Se na prática ficar rápido demais, o ajuste correto é
    // no DANO DAS CLASSES, não aqui — mexer na âncora desalinha o bestiário
    // inteiro, que é exatamente o que `DD-BAL-027` existe para impedir.
    maxHp: 50,
    strength: 5.5, // doc: dano 4–7 (guardamos o ponto médio, ver `strength`)
    defense: 1,
    magicDefense: 0,
    aggroRange: 5,
    attackCooldownMs: 1200,
    moveCooldownMs: 1500, // "velocidade baixa" (a velocidade-base do sistema segue PENDENTE)
    xpReward: 10,
    goldMin: 2,
    goldMax: 8,
  },
  // `DD-BAL-034` — ficha canônica. Segundo degrau da família: +40 % de HP e de
  // XP sobre o Verde, com dano e defesa subindo de forma controlada. Mesma IA:
  // a lição aqui é que uma família pode escalar sem mudar de comportamento.
  //
  // ⚠️ **DORMENTE.** Definido mas não nasce no mapa — o mundo hoje só tem Slime
  // Verde, Zumbi e Super Slime, por decisão do dono. Ligar é uma linha em
  // `spawnInitialCreatures`, do lado do servidor.
  slime_blue: {
    type: 'slime_blue',
    name: 'Slime Azul',
    behavior: 'neutral',
    maxHp: 70,
    strength: 8, // doc: dano 6–10
    defense: 2,
    magicDefense: 1,
    aggroRange: 5,
    attackCooldownMs: 1200,
    moveCooldownMs: 1500,
    xpReward: 16,
    goldMin: 3,
    goldMax: 11,
  },
  // `DD-BAL-035` — o membro mais forte da família antes do MVP. Ainda básico:
  // "o desafio continua vindo dos atributos, não de mecânicas complexas".
  // ⚠️ DORMENTE, como o Azul.
  slime_red: {
    type: 'slime_red',
    name: 'Slime Vermelho',
    behavior: 'neutral',
    maxHp: 100,
    strength: 10.5, // doc: dano 8–13
    defense: 3,
    magicDefense: 2,
    aggroRange: 5,
    attackCooldownMs: 1200,
    moveCooldownMs: 1500,
    xpReward: 25,
    goldMin: 5,
    goldMax: 16,
  },
  zombie: {
    type: 'zombie',
    name: 'Zumbi',
    // HOSTIL e LENTO. É a identidade do morto-vivo: ele não te alcança se você
    // andar, mas não desiste e bate forte quando encosta. Aggro curto porque
    // zumbi não enxerga longe — ele percebe quem chega perto.
    //
    // Lore (cap. 9): morto-vivo é ALMA QUE NÃO CONSEGUIU VOLTAR AO HEART
    // (`DD-LOR-074`) — família própria, NÃO é demônio nem criatura corrompida.
    behavior: 'hostile',
    // 🔴 `DD-BAL-055` — "Mortos-Vivos Iniciais", APROVADO. O Zumbi é **Tier III**,
    // não conteúdo inicial: a linha 4427 do Doc 3 põe a progressão como Esqueleto
    // (Tier II) → Zumbi, Esqueleto Guerreiro, Esqueleto Arqueiro e Múmia (Tier III).
    //
    // Identidade oficial: "lento; extremamente resistente; pressão constante" —
    // que é exatamente o que o passo de 2000 ms já entregava.
    //
    // ⚠️ **Isto o torna MUITO mais perigoso**: mais que o dobro de vida e quase o
    // dobro de dano. Ver o aviso sobre spawn em `docs/DOC3-TRIAGEM.md` — ele nasce
    // hoje na vila inicial, ao lado de um Slime Verde de Tier I.
    maxHp: 340,
    strength: 24, // doc: dano 20–28
    defense: 8,
    magicDefense: 4,
    aggroRange: 4,
    attackCooldownMs: 1600,
    // ~2 s por passo: o mais lento do mapa. Slime anda a 1500.
    moveCooldownMs: 2000,
    xpReward: 95,
    goldMin: 3,
    goldMax: 12,
    // Primeira fraqueza elemental do jogo, e ela vem do lore, não de gosto:
    // morto-vivo é ALMA QUE NÃO CONSEGUIU VOLTAR AO HEART, e Sagrado é energia
    // vital. O roadmap fecha isso na etapa do Druid — "energia vital cura vivos
    // e causa DANO em mortos-vivos, vampiros e demônios".
    //
    // ⚠️ Só Sagrado. Resistência a Veneno pareceria óbvia para um zumbi, mas o
    // doc não fala nisso e a regra é não inventar.
    resistances: { holy: -0.5 },
  },
  rotworm: {
    type: 'rotworm',
    name: 'Rotworm',
    // Parecido com o Slime, um pouco mais fraco (menos HP e recompensa). Estilo
    // Tibia: verme marrom/avermelhado com uma bocarra de dentes que abre e fecha.
    maxHp: 90,
    strength: 8,
    defense: 3,
    aggroRange: 6,
    attackCooldownMs: 1250,
    moveCooldownMs: 1400,
    xpReward: 20,
    goldMin: 1,
    goldMax: 6,
  },
  snake: {
    type: 'snake',
    // Serpente: rápida e agressiva, pouca vida. Alcança de longe (aggro alto) e
    // se move rápido, mas cai fácil. Dropa pele (usada por profissões futuras).
    name: 'Snake',
    maxHp: 70,
    strength: 11,
    defense: 2,
    aggroRange: 7,
    attackCooldownMs: 1000,
    moveCooldownMs: 1100,
    xpReward: 24,
    goldMin: 0,
    goldMax: 5,
  },
  // ===========================================================================
  // TIER II — `DD-BAL-044` a `DD-BAL-048`
  //
  // 🔴 **Todas DORMENTES.** Não nascem no mapa, e o motivo é ARTE, não código: o
  // cliente desenha por `creatureType` e cai em `drawSlime` para tipo
  // desconhecido. Spawná-las hoje encheria o mundo de bolhas idênticas com
  // atributos radicalmente diferentes — pior que não tê-las.
  //
  // `DD-BAL-049` fecha o princípio que organiza tudo aqui: quando uma família
  // tem várias espécies, cada uma ocupa um PAPEL (melee, tank, ranged, controle,
  // suporte). "Adicionar espécie cuja única diferença seja atributo maior" é
  // explicitamente proibido.
  // ===========================================================================

  // --- Aranhas (`DD-BAL-044`): velocidade e os primeiros controles ---
  forest_spider: {
    type: 'forest_spider',
    name: 'Aranha da Floresta',
    behavior: 'hostile', // doc: "Comportamento: Agressivo"
    maxHp: 140,
    strength: 13, // doc: 10–16
    defense: 4,
    magicDefense: 2,
    aggroRange: 6,
    attackCooldownMs: 1000,
    moveCooldownMs: SPEED.media,
    xpReward: 35,
    goldMin: 6,
    goldMax: 18,
  },
  web_spider: {
    type: 'web_spider',
    name: 'Aranha de Teia',
    behavior: 'hostile',
    // "Menos resistência que a Aranha da Floresta, compensando com controle" —
    // é a primeira criatura do jogo cuja identidade é aplicar condição, e a
    // única razão de existir ao lado da Aranha da Floresta. Sem a teia ela seria
    // uma Aranha da Floresta pior, que é o que `DD-BAL-049` proíbe.
    maxHp: 130,
    strength: 11.5, // doc: 9–14
    defense: 3,
    magicDefense: 3,
    aggroRange: 6,
    attackCooldownMs: 1000,
    moveCooldownMs: SPEED.media,
    xpReward: 40,
    goldMin: 7,
    goldMax: 20,
    // "Dispara teia em curto alcance; reduz TEMPORARIAMENTE a velocidade do
    // alvo." A ficha é explícita, então a condição é Lentidão — e só ela.
    // Chance abaixo de 1 para o jogador não ficar preso em lentidão perpétua
    // quando enfrentar duas: reaplicar renova a expiração, não empilha.
    onHit: { condition: 'slow', chance: 0.35, durationMs: 3000 },
  },

  // --- Formigas (`DD-BAL-045`): a primeira dupla tank + ranged ---
  soldier_ant: {
    type: 'soldier_ant',
    name: 'Formiga Soldado',
    behavior: 'hostile',
    // "Protege outras formigas... alta resistência, pouca mobilidade ofensiva."
    maxHp: 180,
    strength: 15, // doc: 12–18
    defense: 6,
    magicDefense: 2,
    aggroRange: 5,
    attackCooldownMs: 1200,
    moveCooldownMs: SPEED.media,
    xpReward: 45,
    goldMin: 8,
    goldMax: 22,
  },
  spitter_ant: {
    type: 'spitter_ant',
    name: 'Formiga Cuspidora',
    behavior: 'hostile',
    // "Ataque ácido à distância; prefere permanecer atrás das Soldados."
    // Ácido = Veneno (`DD-ELM-002`); é o primeiro monstro comum com dano não-físico.
    maxHp: 120,
    strength: 14, // doc: 11–17 (corpo a corpo, quando encurralada)
    defense: 3,
    magicDefense: 3,
    aggroRange: 6,
    attackCooldownMs: 1200,
    moveCooldownMs: SPEED.media,
    xpReward: 42,
    goldMin: 8,
    goldMax: 21,
    spell: {
      power: 14, rangeMin: 2, range: 5, cooldownMs: 2600,
      projectile: 'firebolt', damageType: 'poison',
    },
  },

  // --- Goblins (`DD-BAL-046`): composição completa de combate ---
  goblin_warrior: {
    type: 'goblin_warrior',
    name: 'Goblin Guerreiro',
    behavior: 'hostile',
    // "Utiliza espada e escudo; protege Goblins mais frágeis."
    maxHp: 170,
    strength: 16, // doc: 13–19
    defense: 5,
    magicDefense: 2,
    aggroRange: 6,
    attackCooldownMs: 1100,
    moveCooldownMs: SPEED.media,
    xpReward: 48,
    goldMin: 10,
    goldMax: 26,
  },
  goblin_archer: {
    type: 'goblin_archer',
    name: 'Goblin Arqueiro',
    behavior: 'hostile',
    // ⚠️ "Recua quando inimigos se aproximam" NÃO está implementado — não existe
    // comportamento de kite na IA. Ele mantém distância só enquanto a magia
    // estiver no alcance; encostou, briga como todo mundo.
    maxHp: 120,
    strength: 15, // doc: 12–18
    defense: 3,
    magicDefense: 2,
    aggroRange: 7,
    attackCooldownMs: 1100,
    moveCooldownMs: SPEED.media,
    xpReward: 46,
    goldMin: 9,
    goldMax: 24,
    spell: {
      power: 15, rangeMin: 2, range: 6, cooldownMs: 2200,
      projectile: 'arrow', damageType: 'physical',
    },
  },

  // --- Lobos (`DD-BAL-047`) ---
  grey_wolf: {
    type: 'grey_wolf',
    name: 'Lobo Cinzento',
    // "Caça em alcateia; tenta cercar o alvo" — predador, não simplesmente hostil.
    behavior: 'predator',
    maxHp: 160,
    strength: 17, // doc: 14–20
    defense: 4,
    magicDefense: 2,
    aggroRange: 8, // enxerga longe: é caçador
    attackCooldownMs: 900,
    moveCooldownMs: SPEED.alta,
    xpReward: 50,
    goldMin: 6,
    goldMax: 16,
  },

  // --- Orcs (`DD-BAL-048`): a elite do Tier II ---
  young_orc: {
    type: 'young_orc',
    name: 'Orc Jovem',
    behavior: 'hostile',
    // "Agressivo; pouca técnica; combate baseado em força."
    maxHp: 180,
    strength: 18.5, // doc: 15–22
    defense: 5,
    magicDefense: 2,
    aggroRange: 6,
    attackCooldownMs: 1150,
    moveCooldownMs: SPEED.media,
    xpReward: 55,
    goldMin: 12,
    goldMax: 30,
  },
  orc_warrior: {
    type: 'orc_warrior',
    name: 'Orc Guerreiro',
    behavior: 'hostile',
    // "Representa a elite do Tier II."
    maxHp: 230,
    strength: 21, // doc: 17–25
    defense: 7,
    magicDefense: 3,
    aggroRange: 6,
    attackCooldownMs: 1150,
    moveCooldownMs: SPEED.media,
    xpReward: 65,
    goldMin: 16,
    goldMax: 38,
  },

  // ===========================================================================
  // TIER III — `DD-BAL-055` a `DD-BAL-059`
  //
  // `DD-BAL-058` define a faixa: "transição para o conteúdo intermediário". Exige
  // build consistente, uso frequente de habilidades, gestão de recursos,
  // posicionamento e **prioridade de alvos** — é aqui que grupos com funções
  // complementares aparecem de verdade.
  //
  // O Zumbi também é Tier III e está lá em cima, junto da definição antiga dele.
  // Todas DORMENTES pelo mesmo motivo de arte do Tier II.
  // ===========================================================================

  // --- Mortos-Vivos (`DD-BAL-055`), a família do Zumbi ---
  skeleton_warrior: {
    type: 'skeleton_warrior',
    name: 'Esqueleto Guerreiro',
    behavior: 'hostile',
    // "Técnica superior ao Esqueleto comum; utiliza equipamentos."
    maxHp: 280,
    strength: 29, // doc: 24–34
    defense: 8,
    magicDefense: 5,
    aggroRange: 6,
    attackCooldownMs: 1100,
    moveCooldownMs: SPEED.media,
    xpReward: 100,
    goldMin: 22,
    goldMax: 55,
    // Morto-vivo é alma que não voltou ao Heart: Sagrado devasta a família toda.
    resistances: { holy: -0.5 },
  },
  skeleton_archer: {
    type: 'skeleton_archer',
    name: 'Esqueleto Arqueiro',
    behavior: 'hostile',
    // "Arqueiro disciplinado; combate à distância; reposicionamento."
    // ⚠️ O reposicionamento não existe na IA, como no Goblin Arqueiro.
    maxHp: 220,
    strength: 29.5, // doc: 24–35
    defense: 5,
    magicDefense: 5,
    aggroRange: 8,
    attackCooldownMs: 1100,
    moveCooldownMs: SPEED.media,
    xpReward: 95,
    goldMin: 20,
    goldMax: 50,
    resistances: { holy: -0.5 },
    spell: {
      power: 26, rangeMin: 2, range: 7, cooldownMs: 2200,
      projectile: 'arrow', damageType: 'physical',
    },
  },

  // --- Minotauro (`DD-BAL-056`) ---
  minotaur: {
    type: 'minotaur',
    name: 'Minotauro',
    behavior: 'hostile',
    // "Força bruta; grande alcance; alta resistência." O maior dano não-chefe do
    // Tier III — e o alcance 2 vem do "grande alcance" da ficha.
    maxHp: 420,
    strength: 34, // doc: 28–40
    defense: 10,
    magicDefense: 4,
    aggroRange: 6,
    attackCooldownMs: 1400,
    moveCooldownMs: SPEED.media,
    xpReward: 120,
    goldMin: 35,
    goldMax: 80,
  },

  // --- Fauna Selvagem Avançada (`DD-BAL-057`) ---
  brown_bear: {
    type: 'brown_bear',
    name: 'Urso Pardo',
    // ⚠️ INFERÊNCIA: a ficha não dá comportamento. Territorial é a leitura mais
    // defensável para fauna ("tanque natural", não caçador) e mantém a coerência
    // com o Javali, que já é neutro. Confirmar com o dono.
    behavior: 'territorial',
    maxHp: 360,
    strength: 31.5, // doc: 26–37
    defense: 9,
    magicDefense: 0, // a ficha do Urso não lista MDEF
    aggroRange: 5,
    attackCooldownMs: 1400,
    moveCooldownMs: SPEED.media,
    xpReward: 110,
    goldMin: 18,
    goldMax: 44,
  },
  black_wolf: {
    type: 'black_wolf',
    name: 'Lobo Negro',
    behavior: 'predator',
    // "Velocidade Muito Alta" — a criatura mais rápida do jogo. Fugir não é opção.
    maxHp: 250,
    strength: 32.5, // doc: 27–38
    defense: 5,
    magicDefense: 0, // a ficha não lista MDEF
    aggroRange: 9,
    attackCooldownMs: 800,
    moveCooldownMs: SPEED.muitoAlta,
    xpReward: 105,
    goldMin: 16,
    goldMax: 40,
  },
  giant_spider: {
    type: 'giant_spider',
    name: 'Aranha Gigante',
    behavior: 'hostile',
    // "Controle; teias; maior resistência que as aranhas do Tier II."
    maxHp: 310,
    strength: 29.5, // doc: 24–35
    defense: 7,
    magicDefense: 5,
    aggroRange: 6,
    attackCooldownMs: 1100,
    moveCooldownMs: SPEED.media,
    xpReward: 110,
    goldMin: 20,
    goldMax: 48,
    // Ficha: "controle; teias". Mesma condição da Aranha de Teia, mais forte e
    // mais longa — é a evolução da família, não uma mecânica nova.
    onHit: { condition: 'slow', chance: 0.45, durationMs: 4000 },
  },
  mystic_ant: {
    type: 'mystic_ant',
    name: 'Formiga Mística',
    behavior: 'hostile',
    // "Suporte mágico da colônia; fortalecimento de outras formigas." O buff em
    // aliados NÃO existe — não há IA de suporte. MDEF 8 é a mais alta do Tier III.
    maxHp: 260,
    strength: 28, // doc: 22–34
    defense: 5,
    magicDefense: 8,
    aggroRange: 6,
    attackCooldownMs: 1200,
    moveCooldownMs: SPEED.media,
    xpReward: 108,
    goldMin: 20,
    goldMax: 46,
    spell: {
      power: 26, rangeMin: 2, range: 6, cooldownMs: 2600,
      projectile: 'firebolt', damageType: 'poison',
    },
  },
  kobold_hunter: {
    type: 'kobold_hunter',
    name: 'Kobold Caçador',
    behavior: 'predator',
    // "Perseguição; armadilhas; combate móvel." As armadilhas não existem.
    maxHp: 220,
    strength: 28, // doc: 23–33
    defense: 5,
    magicDefense: 3,
    aggroRange: 8,
    attackCooldownMs: 1000,
    moveCooldownMs: SPEED.alta,
    xpReward: 92,
    goldMin: 18,
    goldMax: 42,
  },

  // --- Humanoides Avançados (`DD-BAL-059`) ---
  troll: {
    type: 'troll',
    name: 'Troll',
    behavior: 'hostile',
    // O mais duro do Tier III: 480 HP e dano 30–42, mas lento.
    maxHp: 480,
    strength: 36, // doc: 30–42
    defense: 11,
    magicDefense: 4,
    aggroRange: 5,
    attackCooldownMs: 1500,
    moveCooldownMs: SPEED.baixa,
    xpReward: 130,
    goldMin: 40,
    goldMax: 90,
  },

  super_slime: {
    type: 'super_slime',
    name: 'Super Slime',
    boss: true,
    // 🔴 `DD-BAL-036` — ficha canônica APROVADA. É a mudança mais drástica do
    // rebalanceamento: o Super Slime era uma muralha de 2.400 HP que corria mais
    // que todo mundo. O doc o quer como **primeiro MVP didático** — "ensinar que
    // um MVP exige preparação", não ser intransponível.
    //
    // ⚠️ Efeito colateral consciente: com velocidade BAIXA, **dá para fugir dele
    // andando**. A lógica antiga era "corra para o centro do mapa, onde ele não
    // entra" — `avoidCenter` continua ligado, mas deixou de ser a única saída.
    //
    // Continua FANÁTICO. A ficha diz "Comportamento: Agressivo", que é rótulo
    // grosso; a descrição de IA é específica e decide: "nunca abandona o combate
    // enquanto houver um alvo na área" — que é a definição de `fanatic` aqui
    // ("como o hostil, mas nunca recua"). `hostile` deixaria ele desistir.
    behavior: 'fanatic',
    maxHp: 500,
    strength: 23, // doc: dano 18–28
    defense: 8,
    magicDefense: 5,
    aggroRange: 9, // "detecta jogadores a uma distância maior"
    attackCooldownMs: 850,
    moveCooldownMs: 1500, // "Velocidade: Baixa" — igual ao resto da família
    xpReward: 250,
    goldMin: 200,
    goldMax: 480,
    respawnMs: 90000, // 1min30 até renascer
    avoidCenter: true, // não invade a zona central (spawn de morte)
    // 🔴 **Magia à distância e invocação foram REMOVIDAS.** A ficha canônica
    // `DD-BAL-036` lista a IA do chefe e nenhuma das duas está lá — o que ela
    // pede é Salto Esmagador e fúria aos 50 %. Quatro mecânicas num MVP de 500
    // HP, cujo papel é DIDÁTICO, é ruído: o doc quer que ele "ensine conceitos
    // reutilizados em chefes futuros", não que faça tudo.
    //
    // As duas continuam existindo como sistema (`CreatureSpell`, `CreatureSummon`)
    // e outra criatura pode usá-las. Reverter neste chefe é uma linha.

    // "Periodicamente executa um Salto Esmagador, causando dano em área ao
    // redor do ponto de impacto." É a lição de POSICIONAMENTO.
    // Recarga longa a pedido do dono (6 s → 11 s → 13 s): o Salto é para ser um
    // MOMENTO que o jogador aprende a ler e evitar, não pressão contínua. Com
    // 13 s e o efeito visual durando 800 ms, dá tempo de ver, reagir e
    // reposicionar entre um salto e o próximo.
    slam: { power: 20, radius: 2, range: 4, cooldownMs: 13000, damageType: 'physical' },
    // "Quando sua vida atinge 50 %, entra em um estado de fúria, aumentando
    // temporariamente sua velocidade de ataque (sem alterar sua velocidade de
    // deslocamento)." É a lição de FASES DE COMBATE.
    enrage: { hpPct: 0.5, attackSpeedMult: 0.6, durationMs: 12000 },
  },
};

/**
 * Cor da BOLHA de placeholder de cada criatura sem arte própria.
 *
 * ⚠️ Isto é andaime, não arte. O cliente desenha todo tipo desconhecido com o
 * mesmo blob do Slime; sem cor, 18 espécies com 140 a 480 de vida ficariam
 * visualmente idênticas. Com cor + nome, dá para jogar e testar a curva de
 * dificuldade enquanto a arte de verdade não chega.
 *
 * Agrupadas por família, para o olho aprender a ler o mundo: Slimes em tons
 * próprios, mortos-vivos em osso, lobos em cinza/preto, orcs e goblins em
 * verde-oliva. Quando uma espécie ganhar sprite, ela sai desta tabela.
 */
export const CREATURE_PLACEHOLDER_COLORS: Record<string, number> = {
  // Slimes — a família tem cor no próprio nome
  slime: 0x5fae5f,
  slime_blue: 0x5f8fd0,
  slime_red: 0xc05050,
  // Aranhas
  forest_spider: 0x6a4a7a,
  web_spider: 0x8a6a9a,
  giant_spider: 0x4a3a5a,
  // Formigas
  soldier_ant: 0xa06a3a,
  spitter_ant: 0x8aa03a, // ácido
  mystic_ant: 0x6a8ad0, // suporte mágico
  // Goblins
  goblin_warrior: 0x7aa04a,
  goblin_archer: 0x9ab060,
  // Lobos
  grey_wolf: 0x9a9a9a,
  black_wolf: 0x3a3a44,
  // Orcs
  young_orc: 0x6a8a4a,
  orc_warrior: 0x4a6a3a,
  // Mortos-vivos — osso
  skeleton_warrior: 0xd8d0b8,
  skeleton_archer: 0xc8c0a8,
  // Humanoides e fauna grande
  minotaur: 0x8a4a3a,
  brown_bear: 0x7a5a3a,
  kobold_hunter: 0xb08a4a,
  troll: 0x5a7a5a,
};

/** Distância de Chebyshev (grid, permite diagonal como 1). */
export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/**
 * Calcula um golpe. Retorna dano final (>=1) e se foi crítico.
 * `rng` injetável para testes determinísticos.
 */
export function rollDamage(
  strength: number,
  defense: number,
  rng: () => number = Math.random,
): { amount: number; crit: boolean } {
  const variance = 0.8 + rng() * 0.4; // 0.8 .. 1.2
  const crit = rng() < 0.1;
  const raw = strength * variance * (crit ? 1.5 : 1) - defense * 0.5;
  return { amount: Math.max(1, Math.round(raw)), crit };
}
