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
  strength: number;
  defense: number;
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
  /**
   * Resistências e fraquezas por tipo de dano (`DD-ELM-002`). Ausente = neutra
   * a tudo.
   *
   * O bestiário revela isto em patamares (`Resistências: ???` até o jogador
   * conhecer a espécie) — encaixa no sistema já implementado na Etapa 6.
   */
  resistances?: ResistanceProfile;
}

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
    behavior: 'hostile',
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
    // Doc 3: "dano 4–7". `strength` alimenta `computeHit`, que aplica variância
    // de 0,85–1,15 — 5 de força cai dentro da faixa pedida.
    strength: 5,
    defense: 1,
    aggroRange: 5,
    attackCooldownMs: 1200,
    moveCooldownMs: 1500, // "velocidade baixa" (a velocidade-base do sistema segue PENDENTE)
    xpReward: 10,
    goldMin: 2,
    goldMax: 8,
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
    maxHp: 160,
    strength: 15,
    defense: 6,
    aggroRange: 4,
    attackCooldownMs: 1600,
    // ~2 s por passo: o mais lento do mapa. Slime anda a 1500.
    moveCooldownMs: 2000,
    xpReward: 40,
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
  super_slime: {
    type: 'super_slime',
    name: 'Super Slime',
    boss: true,
    // FANÁTICO: persegue sem medo e nunca recua.
    behavior: 'fanatic',
    // CHEFE. Uma muralha de gosma: muito HP e MUITA força. Ele se move bem mais
    // rápido que o resto, então fugir dele é difícil: a saída é correr para o
    // centro do mapa, onde ele NÃO pode entrar.
    maxHp: 2400,
    strength: 44,
    defense: 14,
    aggroRange: 9,
    attackCooldownMs: 850,
    moveCooldownMs: 620, // o mais rápido do mapa
    xpReward: 800,
    goldMin: 200,
    goldMax: 480,
    respawnMs: 90000, // 1min30 até renascer
    avoidCenter: true, // não invade a zona central (spawn de morte)
    // Cospe uma bola de gosma ácida à distância (dano mágico, ignora parte da
    // defesa via resistência mágica). Só a média/longa distância.
    spell: { power: 34, rangeMin: 2, range: 6, cooldownMs: 3500, projectile: 'firebolt' },
    // Invoca Slimes comuns: poucos (teto de 3 vivos), 2 por vez.
    summon: { type: 'slime', count: 2, maxAlive: 3, cooldownMs: 14000 },
  },
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
