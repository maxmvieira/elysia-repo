/**
 * Definições de tiles e do modelo de mapa (compartilhado cliente/servidor).
 *
 * O mapa é a fonte de verdade da colisão e da renderização. Conforme a doc
 * (§5.2 / §21), os dados de mundo devem ser versionados e configuráveis, não
 * espalhados pelo código. Por isso o mapa vive em `shared/data/maps/*.json`
 * e é validado/carregado por este módulo.
 */

/** Cada tipo de tile e suas propriedades de gameplay. */
export interface TileType {
  id: number;
  name: string;
  /** Bloqueia movimento de personagens/criaturas? */
  solid: boolean;
  /** Bloqueia a linha de visão (paredes altas)? */
  blocksSight: boolean;
  /**
   * Altura visual em "andares falsos" para o efeito 2.5D estilo Tibia.
   * 0 = piso; >0 = parede/objeto elevado desenhado com deslocamento.
   */
  height: number;
  /** Cor placeholder até termos sprites (RGB hex). */
  color: number;
}

/**
 * Catálogo de tipos de tile do MVP. O `id` é o valor usado nas camadas do
 * mapa. Mantê-lo estável — mudanças de id quebram mapas salvos.
 */
export const TILE_TYPES: Record<number, TileType> = {
  0: { id: 0, name: 'void', solid: true, blocksSight: false, height: 0, color: 0x0c0b0a },
  1: { id: 1, name: 'grass', solid: false, blocksSight: false, height: 0, color: 0x3c5a34 },
  2: { id: 2, name: 'dirt', solid: false, blocksSight: false, height: 0, color: 0x5a4632 },
  3: { id: 3, name: 'stone_floor', solid: false, blocksSight: false, height: 0, color: 0x4a4740 },
  4: { id: 4, name: 'water', solid: true, blocksSight: false, height: 0, color: 0x274a6b },
  5: { id: 5, name: 'wall_stone', solid: true, blocksSight: true, height: 1, color: 0x6b6459 },
  6: { id: 6, name: 'wall_wood', solid: true, blocksSight: true, height: 1, color: 0x6e4f2f },
  7: { id: 7, name: 'tree', solid: true, blocksSight: true, height: 1, color: 0x2f4a24 },
  8: { id: 8, name: 'sand', solid: false, blocksSight: false, height: 0, color: 0x8a7a4a },
};

export const TILE_VOID = 0;

export function getTileType(id: number): TileType {
  return TILE_TYPES[id] ?? TILE_TYPES[TILE_VOID]!;
}

/**
 * Como um tile permite mudar de andar (escada/rampa/buraco). Opcional por tile.
 * `target` é o andar de destino ao pisar; simplificação inicial do sistema de
 * z-levels da doc (§6.1).
 */
export interface FloorLink {
  /** Célula-gatilho: ao pisar aqui neste andar, o jogador é transferido. */
  x: number;
  y: number;
  fromFloor: number;
  /** Destino da transferência (andar + célula de pouso, que não é gatilho). */
  toX: number;
  toY: number;
  toFloor: number;
  /** 'up' ou 'down' — usado só para escolher o sprite/efeito. */
  kind: 'up' | 'down';
}

/**
 * Função de um NPC. O Doc 3 é explícito no cap. "Vida em Elysia": *"cada NPC
 * possui uma função"*, e lista Ferreiro, Comerciante, **Banco**, Estalajadeiro e
 * outros como funções SEPARADAS. Daí o Banqueiro ser um NPC próprio e não uma
 * terceira aba do Comerciante.
 */
export type NpcRole = 'vendor' | 'bank';

/**
 * Mapa multi-andar. Cada andar é uma grade `width*height` de ids de tile,
 * em row-major (index = y*width + x).
 */
export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Andares presentes, do mais baixo ao mais alto. Chave = número do andar. */
  floors: Record<number, number[]>;
  /** Ligações entre andares (escadas/buracos). */
  floorLinks: FloorLink[];
  /** Ponto de spawn padrão de novos jogadores. */
  spawn: { x: number; y: number; floor: number };
  /**
   * Zona do Depósito (DP): interior da casa inicial. Dentro dela o jogador pode
   * guardar/retirar itens no baú e MONSTROS NÃO ENTRAM. Retângulo inclusivo.
   */
  depotZone?: { x0: number; y0: number; x1: number; y1: number };
  /** NPCs fixos do mundo (comerciante, banqueiro…). */
  npcs?: { name: string; x: number; y: number; floor: number; role: NpcRole }[];
}

/** Uma célula está dentro da zona do Depósito? */
export function inDepotZone(map: GameMap, x: number, y: number): boolean {
  const z = map.depotZone;
  return !!z && x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
}

function inBounds(map: GameMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

/** Id do tile numa posição/andar (void se fora dos limites ou andar ausente). */
export function tileAt(map: GameMap, x: number, y: number, floor: number): number {
  if (!inBounds(map, x, y)) return TILE_VOID;
  const layer = map.floors[floor];
  if (!layer) return TILE_VOID;
  return layer[y * map.width + x] ?? TILE_VOID;
}

/** Uma posição é caminhável (dentro do mapa, tile não sólido)? */
export function isWalkable(map: GameMap, x: number, y: number, floor: number): boolean {
  return !getTileType(tileAt(map, x, y, floor)).solid;
}

/** Retorna a ligação de andar naquela célula, se houver. */
export function floorLinkAt(
  map: GameMap,
  x: number,
  y: number,
  floor: number,
): FloorLink | undefined {
  return map.floorLinks.find((l) => l.x === x && l.y === y && l.fromFloor === floor);
}
