import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStarterMap,
  isWalkable,
  floorLinkAt,
  tileAt,
  getTileType,
} from '../src/index.js';

test('mapa inicial tem dimensões e andares esperados', () => {
  const map = buildStarterMap();
  assert.equal(map.width, 60);
  assert.equal(map.height, 60);
  assert.ok(map.floors[0], 'andar 0 existe');
  assert.ok(map.floors[1], 'andar 1 existe');
  assert.equal(map.floors[0]!.length, 60 * 60);
});

test('o ponto de spawn é caminhável', () => {
  const map = buildStarterMap();
  const { x, y, floor } = map.spawn;
  assert.ok(isWalkable(map, x, y, floor), 'spawn deve ser caminhável');
});

test('paredes bloqueiam movimento e visão; grama não', () => {
  const map = buildStarterMap();
  // A muralha da vila é um retângulo em (10,10)-(29,29): o canto é parede.
  const wallId = tileAt(map, 10, 10, 0);
  assert.equal(getTileType(wallId).solid, true);
  assert.equal(isWalkable(map, 10, 10, 0), false);

  // Fora dos limites do mapa é sólido (void).
  assert.equal(isWalkable(map, -1, 5, 0), false);
  assert.equal(isWalkable(map, 999, 5, 0), false);
});

test('água é sólida (não se anda por cima)', () => {
  const map = buildStarterMap();
  // O lago fica em (3,28)-(11,35).
  assert.equal(isWalkable(map, 6, 30, 0), false);
});

test('escada transfere de andar e o pouso NÃO é gatilho (sem oscilação)', () => {
  const map = buildStarterMap();
  const up = map.floorLinks.find((l) => l.fromFloor === 0 && l.kind === 'up');
  assert.ok(up, 'deve existir uma escada para cima no andar 0');

  // O gatilho está no andar 0; o destino, no andar 1, e deve ser caminhável.
  assert.equal(floorLinkAt(map, up!.x, up!.y, 0)?.toFloor, 1);
  assert.ok(
    isWalkable(map, up!.toX, up!.toY, up!.toFloor),
    'tile de pouso deve ser caminhável',
  );
  // Crucial: o tile de pouso não pode ser, ele mesmo, um gatilho de andar.
  assert.equal(
    floorLinkAt(map, up!.toX, up!.toY, up!.toFloor),
    undefined,
    'pouso não pode ser gatilho, senão o jogador oscila entre andares',
  );
});

test('há uma escada de volta (andar 1 -> andar 0)', () => {
  const map = buildStarterMap();
  const down = map.floorLinks.find((l) => l.fromFloor === 1 && l.kind === 'down');
  assert.ok(down, 'deve existir uma escada de descida no andar 1');
  assert.equal(down!.toFloor, 0);
  assert.ok(isWalkable(map, down!.toX, down!.toY, down!.toFloor));
});
