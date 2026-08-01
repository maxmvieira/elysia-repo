import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasLineOfSight, type GameMap } from '../src/index.js';

/*
 * Linha de visão do combate à distância.
 *
 * Nasceu de um bug relatado em jogo: o tiro de besta atravessava muro e acertava
 * quem estava do outro lado — que não via o atirador, não podia revidar e não
 * sabia de onde vinha o dano.
 */

const GRAMA = 1;
const AGUA = 4;
const MURO = 5;

/** Mapa quadrado de grama, para pintar obstáculos à mão. */
function mapaDeTeste(lado = 9): GameMap {
  return {
    width: lado,
    height: lado,
    floors: { 0: new Array<number>(lado * lado).fill(GRAMA) },
    floorLinks: [],
    spawn: { x: 0, y: 0 },
  } as unknown as GameMap;
}

const pintar = (map: GameMap, x: number, y: number, tile: number): void => {
  map.floors[0]![y * map.width + x] = tile;
};

test('campo aberto: enxerga de ponta a ponta', () => {
  const map = mapaDeTeste();
  assert.equal(hasLineOfSight(map, 0, 4, 8, 4, 0), true);
});

test('muro no meio corta a linha de visão', () => {
  const map = mapaDeTeste();
  pintar(map, 4, 4, MURO);
  assert.equal(hasLineOfSight(map, 0, 4, 8, 4, 0), false);
});

test('muro na diagonal também corta', () => {
  const map = mapaDeTeste();
  pintar(map, 4, 4, MURO);
  assert.equal(hasLineOfSight(map, 1, 1, 7, 7, 0), false);
});

test('dá para contornar: com o muro fora da reta, enxerga', () => {
  const map = mapaDeTeste();
  pintar(map, 4, 6, MURO); // longe da linha y=4
  assert.equal(hasLineOfSight(map, 0, 4, 8, 4, 0), true);
});

test('ÁGUA não bloqueia visão, mesmo sendo sólida', () => {
  // 🔴 A distinção que motivou usar `blocksSight` em vez de `solid`: não se anda
  // na água, mas se enxerga através dela. Atirar por cima de um rio é válido.
  const map = mapaDeTeste();
  for (let y = 0; y < 9; y++) pintar(map, 4, y, AGUA);
  assert.equal(hasLineOfSight(map, 0, 4, 8, 4, 0), true);
});

test('o tile do ALVO pode bloquear visão — atirar em quem está colado no muro vale', () => {
  const map = mapaDeTeste();
  pintar(map, 8, 4, MURO);
  assert.equal(hasLineOfSight(map, 0, 4, 8, 4, 0), true);
});

test('o tile de ORIGEM não é testado', () => {
  // Se o atirador está ali, ali dá para estar. Testar a origem só criaria um
  // caso impossível de satisfazer.
  const map = mapaDeTeste();
  pintar(map, 0, 4, MURO);
  assert.equal(hasLineOfSight(map, 0, 4, 8, 4, 0), true);
});

test('alvo em cima de si mesmo enxerga (corpo a corpo nunca é bloqueado)', () => {
  const map = mapaDeTeste();
  assert.equal(hasLineOfSight(map, 3, 3, 3, 3, 0), true);
});

test('alvo adjacente nunca é bloqueado — não há tile no meio', () => {
  const map = mapaDeTeste();
  pintar(map, 3, 3, MURO);
  pintar(map, 4, 4, MURO);
  assert.equal(hasLineOfSight(map, 3, 4, 4, 4, 0), true);
});

test('é simétrico: quem vê é visto', () => {
  const map = mapaDeTeste();
  pintar(map, 5, 3, MURO);
  const ida = hasLineOfSight(map, 1, 1, 8, 6, 0);
  const volta = hasLineOfSight(map, 8, 6, 1, 1, 0);
  assert.equal(ida, volta);
});

test('fora do mapa não trava (void não bloqueia, mas também não crasha)', () => {
  const map = mapaDeTeste();
  assert.doesNotThrow(() => hasLineOfSight(map, 0, 0, 50, 50, 0));
});
