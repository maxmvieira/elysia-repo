import { test } from 'node:test';
import assert from 'node:assert/strict';

/** Ids de `TILE_TYPES` usados nos testes de semântica de tile. */
const TILE_WALL_STONE = 5;
const TILE_WATER = 4;
import {
  buildWorldMap,
  isWalkable,
  floorLinkAt,
  tileAt,
  getTileType,
  CITIES,
  WORLD_SIZE,
  WORLD_SPAWN,
  SAFE_ZONE_RADIUS,
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

/*
 * ⚠️ Estes dois testes miravam a paliçada e a fonte de Lumindale. O vilarejo foi
 * apagado em 2026-08-05 (ver `limpaPracaSegura` no worldgen) e eles passaram a
 * descrever um mundo que não existe. Foram reapontados para o que continua
 * verdadeiro em vez de apagados: o que eles garantem — sólido bloqueia, fora do
 * mapa bloqueia, água bloqueia — não tinha nada a ver com o vilarejo.
 */
/*
 * ⚠️ Estes dois foram do vilarejo → do mundo → do CATÁLOGO, em duas horas.
 *
 * Miravam a paliçada e a fonte de Lumindale; com o vilarejo apagado, passaram a
 * procurar parede e água em qualquer lugar do mapa; com `MUNDO_SO_CAMPO` ligado,
 * o mapa virou grama e não tem nem uma nem outra.
 *
 * A lição é que eles nunca foram testes de MUNDO. O que garantem — sólido
 * bloqueia, água barra o passo mas não a mira — é semântica de `TILE_TYPES`, e
 * ali continua valendo com o mapa vazio ou cheio. Amarrá-los ao terreno os fez
 * quebrar três vezes sem nunca ter achado um bug de verdade.
 */
test('parede bloqueia movimento e visão; fora do mapa é sólido', () => {
  const parede = getTileType(TILE_WALL_STONE);
  assert.equal(parede.solid, true);
  assert.equal(parede.blocksSight, true);

  // Esta metade é do mundo mesmo, e vale sempre: fora da grade não se anda.
  assert.equal(isWalkable(map, -1, 5, 0), false);
  assert.equal(isWalkable(map, WORLD_SIZE + 1, 5, 0), false);
});

test('🔴 água é sólida MAS transparente', () => {
  const agua = getTileType(TILE_WATER);
  assert.equal(agua.solid, true);
  // É o que deixa atirar por cima de um rio. `hasLineOfSight` usa `blocksSight`,
  // não `solid` — trocar um pelo outro proibiria o tiro e ninguém veria por quê.
  assert.equal(agua.blocksSight, false);
});

test('🔴 a praça segura é limpa: dá para andar em todo tile dela', () => {
  // O vilarejo saiu e sobrou só a praça. Se a decoração plantasse uma árvore
  // aqui dentro, o jogador nasceria encurralado ou um NPC nasceria dentro dela —
  // e nada no jogo avisaria. É o que `limpaPracaSegura` existe para impedir.
  const { x, y } = map.spawn;
  for (let ty = y - SAFE_ZONE_RADIUS; ty <= y + SAFE_ZONE_RADIUS; ty++) {
    for (let tx = x - SAFE_ZONE_RADIUS; tx <= x + SAFE_ZONE_RADIUS; tx++) {
      assert.ok(isWalkable(map, tx, ty, 0), `praça bloqueada em (${tx},${ty})`);
    }
  }
});

test('🔴 todo NPC nasce DENTRO da praça segura', () => {
  // Fora dela, o Comerciante apanharia de slime enquanto o jogador negocia.
  for (const n of map.npcs) {
    const d = Math.max(Math.abs(n.x - map.spawn.x), Math.abs(n.y - map.spawn.y));
    assert.ok(d <= SAFE_ZONE_RADIUS, `${n.name} em (${n.x},${n.y}) está a ${d} do centro`);
  }
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

/*
 * 🔴 **O mundo não tem mais nenhuma escada.** A única do mapa aberto era a do
 * Depósito de Lumindale, e ela caiu junto com o vilarejo em 2026-08-05.
 *
 * Estes dois testes liam `map.floorLinks` e passaram a falhar. Apagá-los seria o
 * caminho fácil e o errado: o mecanismo multi-andar continua no motor e é o que
 * as **dungeons** vão usar — deixá-lo sem teste significa que a primeira dungeon
 * estreia sem rede, e o bug de oscilação entre andares (pouso que também é
 * gatilho) é exatamente o tipo que só aparece jogando.
 *
 * Então eles passaram a rodar sobre um mapa SINTÉTICO. Testam o mecanismo, que é
 * o que sempre importou; o mundo ter ou não uma escada hoje é outro assunto.
 */
function mapaComEscada(): GameMap {
  const chao = (n: number): number[] => new Array(n * n).fill(1); // tudo grama
  return {
    id: 'teste', name: 'teste', width: 8, height: 8,
    floors: { 0: chao(8), 1: chao(8) },
    floorLinks: [
      { x: 3, y: 3, fromFloor: 0, toX: 2, toY: 3, toFloor: 1, kind: 'up' },
      { x: 2, y: 3, fromFloor: 1, toX: 3, toY: 3, toFloor: 0, kind: 'down' },
    ],
    spawn: { x: 0, y: 0, floor: 0 },
    npcs: [],
  };
}

test('escada transfere de andar e o pouso NÃO é gatilho (sem oscilação)', () => {
  const m = mapaComEscada();
  const up = m.floorLinks.find((l) => l.fromFloor === 0 && l.kind === 'up');
  assert.ok(up, 'deve existir uma escada para cima no andar 0');

  assert.equal(floorLinkAt(m, up!.x, up!.y, 0)?.toFloor, 1);
  assert.ok(isWalkable(m, up!.toX, up!.toY, up!.toFloor), 'tile de pouso deve ser caminhável');

  /*
   * O pouso da subida é (2,3) no andar 1, e ali existe a escada de DESCIDA.
   * O que não pode existir é outro gatilho de SUBIDA no mesmo tile: pisar no
   * pouso e ser mandado de volta para cima faria o jogador oscilar para sempre.
   */
  const noPouso = floorLinkAt(m, up!.toX, up!.toY, up!.toFloor);
  assert.notEqual(noPouso?.toFloor, up!.toFloor, 'pouso não pode devolver ao mesmo andar');
});

test('há uma escada de volta (andar 1 -> andar 0)', () => {
  const m = mapaComEscada();
  const down = m.floorLinks.find((l) => l.fromFloor === 1 && l.kind === 'down');
  assert.ok(down, 'deve existir uma escada de descida no andar 1');
  assert.equal(down!.toFloor, 0);
  assert.ok(isWalkable(m, down!.toX, down!.toY, down!.toFloor));
});
