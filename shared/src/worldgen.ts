/**
 * Gerador do mapa inicial "Valoria" (vila de partida).
 *
 * Determinístico: cliente e servidor chamam a mesma função e obtêm o mesmo
 * mundo, sem precisar sincronizar um arquivo. Numa fase futura isto pode ser
 * exportado para `shared/data/maps/*.json` e editado por uma ferramenta.
 */

import type { GameMap, FloorLink } from './tiles.js';
import { TILE_VOID } from './tiles.js';

const T = {
  VOID: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WATER: 4,
  WALL_STONE: 5,
  WALL_WOOD: 6,
  TREE: 7,
  SAND: 8,
} as const;

const WIDTH = 60;
const HEIGHT = 60;

function makeLayer(fill: number): number[] {
  return new Array(WIDTH * HEIGHT).fill(fill);
}

function set(layer: number[], x: number, y: number, id: number): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  layer[y * WIDTH + x] = id;
}

function fillRect(
  layer: number[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  id: number,
): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) set(layer, x, y, id);
  }
}

/** Contorno (paredes) de um retângulo, deixando o interior intacto. */
function strokeRect(
  layer: number[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  id: number,
): void {
  for (let x = x0; x < x0 + w; x++) {
    set(layer, x, y0, id);
    set(layer, x, y0 + h - 1, id);
  }
  for (let y = y0; y < y0 + h; y++) {
    set(layer, x0, y, id);
    set(layer, x0 + w - 1, y, id);
  }
}

/** PRNG determinístico simples (mulberry32) para espalhar árvores. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildStarterMap(): GameMap {
  const ground = makeLayer(T.GRASS);
  const upper = makeLayer(T.VOID);
  const floorLinks: FloorLink[] = [];

  // Lago no canto sudoeste, com praia de areia ao redor.
  fillRect(ground, 3, 28, 9, 8, T.WATER);
  strokeRect(ground, 2, 27, 11, 10, T.SAND);

  // Praça central de pedra com caminhos de terra saindo dela.
  fillRect(ground, 16, 16, 8, 8, T.STONE);
  fillRect(ground, 19, 6, 2, 10, T.DIRT); // caminho ao norte
  fillRect(ground, 19, 24, 2, 12, T.DIRT); // caminho ao sul
  fillRect(ground, 6, 19, 10, 2, T.DIRT); // caminho a oeste
  fillRect(ground, 24, 19, 12, 2, T.DIRT); // caminho a leste

  // Muralha da vila (pedra) cercando a área central, com portões nos caminhos.
  strokeRect(ground, 10, 10, 20, 20, T.WALL_STONE);
  // Abre portões onde os caminhos cruzam a muralha.
  set(ground, 19, 10, T.DIRT);
  set(ground, 20, 10, T.DIRT);
  set(ground, 19, 29, T.DIRT);
  set(ground, 20, 29, T.DIRT);
  set(ground, 10, 19, T.DIRT);
  set(ground, 10, 20, T.DIRT);
  set(ground, 29, 19, T.DIRT);
  set(ground, 29, 20, T.DIRT);

  // Uma casa de madeira com dois andares dentro da vila.
  const hx = 12;
  const hy = 12;
  const hw = 6;
  const hh = 5;
  fillRect(ground, hx, hy, hw, hh, T.STONE); // piso interno
  strokeRect(ground, hx, hy, hw, hh, T.WALL_WOOD); // paredes
  set(ground, hx + 2, hy + hh - 1, T.STONE); // porta (vão na parede sul)

  // Escada dentro da casa. O gatilho e o tile de pouso são adjacentes:
  //  - piso 0: pisar em (stairX, stairY) leva ao piso 1, pousando ao lado;
  //  - piso 1: pisar em (stairX, stairY) leva de volta ao piso 0, ao lado.
  // Assim nunca há oscilação (o pouso não é gatilho).
  const stairX = hx + hw - 2;
  const stairY = hy + 1;
  const landX = stairX - 1;
  set(ground, stairX, stairY, T.STONE);
  set(ground, landX, stairY, T.STONE);
  floorLinks.push({
    x: stairX, y: stairY, fromFloor: 0,
    toX: landX, toY: stairY, toFloor: 1, kind: 'up',
  });

  // Andar de cima: um quarto do mesmo tamanho, alinhado sobre a casa.
  fillRect(upper, hx, hy, hw, hh, T.STONE);
  strokeRect(upper, hx, hy, hw, hh, T.WALL_WOOD);
  set(upper, stairX, stairY, T.STONE);
  set(upper, landX, stairY, T.STONE);
  floorLinks.push({
    x: stairX, y: stairY, fromFloor: 1,
    toX: landX, toY: stairY, toFloor: 0, kind: 'down',
  });

  // Bosque: árvores espalhadas na grama fora da vila (determinístico). Mapa
  // maior (60×60) => mais floresta em volta da vila.
  const rng = makeRng(1337);
  const hasAdjacentTree = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < WIDTH && ny < HEIGHT && ground[ny * WIDTH + nx] === T.TREE) {
          return true;
        }
      }
    }
    return false;
  };
  let placed = 0;
  let guard = 0;
  while (placed < 150 && guard++ < 20000) {
    const x = Math.floor(rng() * WIDTH);
    const y = Math.floor(rng() * HEIGHT);
    const inVillage = x >= 10 && x < 30 && y >= 10 && y < 30;
    if (inVillage) continue;
    // Espaça as árvores: não coloca uma colada em outra (evita "emenda").
    if (ground[y * WIDTH + x] === T.GRASS && !hasAdjacentTree(x, y)) {
      set(ground, x, y, T.TREE);
      placed++;
    }
  }

  // Depósito (DP): o interior da casa inicial (piso, sem contar as paredes).
  const depotZone = { x0: hx + 1, y0: hy + 1, x1: hx + hw - 2, y1: hy + hh - 2 };

  return {
    id: 'valoria',
    name: 'Elysia — Arredores do Coração do Mundo',
    width: WIDTH,
    height: HEIGHT,
    floors: { 0: ground, 1: upper },
    floorLinks,
    spawn: { x: 20, y: 20, floor: 0 },
    depotZone,
    // Os dois ficam na praça central de pedra, perto do spawn, mas em lados
    // opostos: com eles colados, o clique de "abrir loja" pegaria o Banqueiro
    // metade das vezes.
    npcs: [
      { name: 'Comerciante', x: 22, y: 18, floor: 0, role: 'vendor' },
      { name: 'Banqueiro', x: 18, y: 18, floor: 0, role: 'bank' },
      // Bancada de fabricação. Fica ao lado dos outros dois: a praça da vila
      // concentra os serviços, que é o que faz o jogador voltar para cá.
      { name: 'Ferreiro', x: 20, y: 17, floor: 0, role: 'blacksmith' },
    ],
  };
}

export { TILE_VOID };
