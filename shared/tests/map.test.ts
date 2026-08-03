import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorldMap,
  isWalkable,
  floorLinkAt,
  tileAt,
  getTileType,
  CITIES,
  WORLD_SIZE,
  WORLD_SPAWN,
  WORLD_CREATURE_SPAWNS,
  tileValidoMaisProximo,
  starterTown,
  type GameMap,
} from '../src/index.js';

// Construído UMA vez: são 90.000 tiles, e nenhum teste daqui altera o mapa.
const map = buildWorldMap();

/** Tudo que se alcança a pé (4 direções) a partir de um ponto do andar 0. */
function alcancavelAPe(m: GameMap, x0: number, y0: number): Uint8Array {
  const visto = new Uint8Array(m.width * m.height);
  const pilha = [y0 * m.width + x0];
  visto[pilha[0]!] = 1;
  while (pilha.length) {
    const i = pilha.pop()!;
    const x = i % m.width;
    const y = (i / m.width) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
      const j = ny * m.width + nx;
      if (visto[j] || !isWalkable(m, nx, ny, 0)) continue;
      visto[j] = 1;
      pilha.push(j);
    }
  }
  return visto;
}

test('o mundo tem 300×300 e os dois andares', () => {
  assert.equal(map.width, WORLD_SIZE);
  assert.equal(map.height, WORLD_SIZE);
  assert.ok(map.floors[0], 'andar 0 existe');
  assert.ok(map.floors[1], 'andar 1 existe (o quarto sobre o Depósito)');
  assert.equal(map.floors[0]!.length, WORLD_SIZE * WORLD_SIZE);
});

test('o ponto de spawn é caminhável e é Lumindale', () => {
  const { x, y, floor } = map.spawn;
  assert.deepEqual({ x, y, floor }, WORLD_SPAWN);
  assert.ok(isWalkable(map, x, y, floor), 'spawn deve ser caminhável');
  assert.equal(starterTown().id, 'lumindale');
});

test('🔴 o gerador é DETERMINÍSTICO', () => {
  // Cliente e servidor constroem o mundo cada um por sua conta e nunca o
  // trocam pela rede. Se isto variasse, os dois discordariam sobre onde se pode
  // pisar — e é essa igualdade que sustenta "nó de recurso é entidade, não tile".
  const outro = buildWorldMap();
  assert.deepEqual(outro.floors[0], map.floors[0]);
  assert.deepEqual(outro.floors[1], map.floors[1]);
  assert.deepEqual(outro.npcs, map.npcs);
});

test('🔴 TODO tile do andar 0 tem chão pintado (nenhum void)', () => {
  // O cliente desenha piso debaixo de todo tile alto e conta com isto. Foi o bug
  // do quadrado preto em volta das árvores: onde falta chão, aparece o fundo da
  // página.
  const vazios = map.floors[0]!.filter((id) => getTileType(id).name === 'void').length;
  assert.equal(vazios, 0, `${vazios} tiles sem chão no andar 0`);
});

test('paredes bloqueiam movimento e visão; fora do mapa é sólido', () => {
  // A paliçada de Lumindale começa em (138,146): o canto é parede.
  assert.equal(getTileType(tileAt(map, 138, 146, 0)).solid, true);
  assert.equal(isWalkable(map, 138, 146, 0), false);

  assert.equal(isWalkable(map, -1, 5, 0), false);
  assert.equal(isWalkable(map, WORLD_SIZE + 1, 5, 0), false);
});

test('a fonte da praça é água, e água é sólida', () => {
  assert.equal(getTileType(tileAt(map, 149, 155, 0)).name, 'water');
  assert.equal(isWalkable(map, 149, 155, 0), false);
});

// ---------------------------------------------------------------------------
// O que mais importa: dá para CHEGAR
// ---------------------------------------------------------------------------

test('🔴 TODA cidade é alcançável a pé desde Lumindale', () => {
  // É o teste mais importante deste arquivo. Uma região que o mar isolou é um
  // bug que ninguém vê: o mundo abre, os testes passam, e o jogador anda 80
  // tiles para descobrir no lugar que não dá. Como o terreno é gerado por regra
  // e não desenhado à mão, ninguém olha o mapa inteiro a cada mudança — este
  // teste olha.
  const visto = alcancavelAPe(map, map.spawn.x, map.spawn.y);
  for (const c of CITIES) {
    assert.ok(
      visto[c.y * map.width + c.x],
      `${c.name} (${c.x},${c.y}) não tem caminho a pé desde Lumindale`,
    );
  }
});

test('toda cidade cai em tile caminhável, dentro do mundo', () => {
  for (const c of CITIES) {
    assert.ok(c.x >= 0 && c.y >= 0 && c.x < WORLD_SIZE && c.y < WORLD_SIZE, `${c.name} fora do mapa`);
    assert.ok(isWalkable(map, c.x, c.y, 0), `o centro de ${c.name} não é caminhável`);
  }
});

test('🔴 dá para SAIR de Lumindale — os portões existem e abrem', () => {
  // A paliçada é um retângulo fechado desenhado antes dos portões. Se um prédio
  // passasse por cima de um vão, ou se o `strokeRect` rodasse depois, o jogador
  // nasceria trancado e nada mais do jogo aconteceria.
  const visto = alcancavelAPe(map, map.spawn.x, map.spawn.y);
  const foraDaVila = [
    [map.spawn.x, 140], // ao norte, fora da paliçada
    [map.spawn.x, 178], // ao sul
    [130, map.spawn.y], // a oeste
    [170, map.spawn.y], // a leste
  ] as const;
  for (const [x, y] of foraDaVila) {
    assert.ok(visto[y * map.width + x], `(${x},${y}) fora da vila é inalcançável a partir do spawn`);
  }
});

test('os NPCs estão em tile caminhável e ninguém divide o tile', () => {
  const ocupado = new Set<string>();
  for (const n of map.npcs ?? []) {
    assert.ok(isWalkable(map, n.x, n.y, n.floor), `${n.name} em (${n.x},${n.y}) não é caminhável`);
    const chave = `${n.x},${n.y},${n.floor}`;
    assert.equal(ocupado.has(chave), false, `dois NPCs em ${chave}`);
    ocupado.add(chave);
    assert.notDeepEqual(
      { x: n.x, y: n.y },
      { x: map.spawn.x, y: map.spawn.y },
      `${n.name} está em cima do ponto de nascimento`,
    );
  }
});

test('🔴 toda criatura do creatures.json acha lugar no terreno', () => {
  // As posições são escritas à mão e o terreno é gerado: mexer na densidade de
  // floresta pode plantar uma árvore em cima de um spawn. O servidor empurra
  // para o tile andável mais próximo — este teste garante que o empurrão
  // encontra alguma coisa, em vez de a criatura sumir do mundo em silêncio.
  for (const s of WORLD_CREATURE_SPAWNS) {
    const posto = tileValidoMaisProximo((x, y) => isWalkable(map, x, y, 0), s.x, s.y, 4);
    assert.ok(posto, `${s.type} em (${s.x},${s.y}) não achou tile andável num raio de 4`);
  }
});

// ---------------------------------------------------------------------------
// A invariante da decoração
// ---------------------------------------------------------------------------

test('🔴 decoração nunca encosta em decoração (a mata continua atravessável)', () => {
  // Com dois sólidos nunca adjacentes, sempre sobra rota em volta — é o que
  // impede a floresta densa de fechar corredores e quebrar o BFS do
  // clique-para-andar. Vale só onde ninguém construiu: muralha e casa são
  // paredes coladas de propósito.
  const perto = (x: number, y: number): boolean =>
    CITIES.some((c) => Math.max(Math.abs(c.x - x), Math.abs(c.y - y)) < 22);

  let encostados = 0;
  for (let y = 1; y < map.height - 1; y++) {
    for (let x = 1; x < map.width - 1; x++) {
      const t = getTileType(tileAt(map, x, y, 0));
      if (t.height === 0 && t.name !== 'lava') continue; // só decoração alta e lava
      if (t.name === 'water') continue;
      if (perto(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) {
        const v = getTileType(tileAt(map, x + dx, y + dy, 0));
        if (v.name === t.name) encostados++;
      }
    }
  }
  assert.equal(encostados, 0, `${encostados} pares de decoração colados`);
});

// ---------------------------------------------------------------------------
// Multi-andar (o mecanismo que as dungeons vão usar)
// ---------------------------------------------------------------------------

test('escada transfere de andar e o pouso NÃO é gatilho (sem oscilação)', () => {
  const up = map.floorLinks.find((l) => l.fromFloor === 0 && l.kind === 'up');
  assert.ok(up, 'deve existir uma escada para cima no andar 0');

  assert.equal(floorLinkAt(map, up!.x, up!.y, 0)?.toFloor, 1);
  assert.ok(
    isWalkable(map, up!.toX, up!.toY, up!.toFloor),
    'tile de pouso deve ser caminhável',
  );
  assert.equal(
    floorLinkAt(map, up!.toX, up!.toY, up!.toFloor),
    undefined,
    'pouso não pode ser gatilho, senão o jogador oscila entre andares',
  );
});

test('há uma escada de volta (andar 1 -> andar 0)', () => {
  const down = map.floorLinks.find((l) => l.fromFloor === 1 && l.kind === 'down');
  assert.ok(down, 'deve existir uma escada de descida no andar 1');
  assert.equal(down!.toFloor, 0);
  assert.ok(isWalkable(map, down!.toX, down!.toY, down!.toFloor));
});
