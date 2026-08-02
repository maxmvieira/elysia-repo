import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GATHER_PROFESSION,
  GATHER_RANGE,
  GATHER_XP,
  ITEMS,
  MATERIALS,
  NODES,
  NODE_KINDS,
  NODE_MIN_SPAWN_DIST,
  PROFESSION_NAME,
  buildResourceNodes,
  buildStarterMap,
  getTileType,
  hasToolFor,
  inDepotZone,
  isWalkable,
  rollGather,
  tileAt,
} from '../src/index.js';

test('todo nó tem nome, ferramenta declarada e pelo menos um rendimento', () => {
  for (const k of NODE_KINDS) {
    const n = NODES[k];
    assert.ok(n, `${k} sem definição`);
    assert.ok(n.name.length > 0);
    assert.ok(n.yields.length > 0, `${k} não entrega nada`);
    assert.ok(n.charges >= 1, `${k} nasce esgotado`);
    assert.ok(n.respawnMs > 0, `${k} nunca volta`);
    assert.ok(GATHER_XP[k] > 0, `${k} não dá XP de profissão`);
  }
});

test('🔴 tudo que um nó entrega existe como ITEM e como MATERIAL', () => {
  // É a trava que substituiu o bloqueio antigo. `materials.ts` proibia as
  // famílias de coleta justamente porque não tinham origem; agora elas têm, e o
  // que precisa ser garantido é o inverso — que nada fique órfão.
  for (const k of NODE_KINDS) {
    for (const y of NODES[k].yields) {
      assert.ok(ITEMS[y.kind], `${k} entrega ${y.kind}, que não existe em ITEMS`);
      assert.ok(MATERIALS[y.kind], `${y.kind} não está classificado em MATERIALS`);
    }
  }
});

test('🔴 nenhuma coleta sai vazia', () => {
  // Coleta vazia é o que ensina o jogador a não coletar. O rendimento comum tem
  // `chance: 1` e funciona como piso — inclusive com o pior sorteio possível.
  for (const k of NODE_KINDS) {
    for (const rng of [() => 0, () => 0.5, () => 0.999999]) {
      const saiu = rollGather(NODES[k], rng);
      assert.ok(saiu, `${k} devolveu vazio`);
      assert.ok(ITEMS[saiu], `${k} devolveu ${saiu}, que não é item`);
    }
  }
});

test('o raro só sai no sorteio bom, e o comum é o dia a dia', () => {
  // O veio de minério tem gema a 6 %. Com rng no piso ela sai; com rng alto,
  // vem minério.
  assert.equal(rollGather(NODES.ore, () => 0), 'raw_gem');
  assert.equal(rollGather(NODES.ore, () => 0.9), 'iron_ore');
});

test('🔴 a arma É a ferramenta de lenhador', () => {
  // O cap. 35 lista "Machado de Lenhador" como equipamento de profissão e o cap.
  // 14 como machado. Foi registrado como colisão do documento quando o catálogo
  // entrou, e não era: é o mesmo objeto.
  const semNada = { hasItem: (): boolean => false };
  assert.equal(hasToolFor(NODES.wood, { ...semNada, equippedWeapon: 'axe' }), true);
  assert.equal(hasToolFor(NODES.wood, { ...semNada, equippedWeapon: 'sword' }), false);
  assert.equal(hasToolFor(NODES.wood, semNada), false);
  // E o Machado de Lenhador do catálogo é mesmo um machado.
  assert.equal(ITEMS.hand_axe!.weaponType, 'axe');
  assert.equal(ITEMS.hand_axe!.name, 'Machado de Lenhador');
});

test('picareta e foice bastam NA MOCHILA, sem equipar', () => {
  // Ferramenta que exigisse desequipar a arma transformaria coleta em ida e
  // volta de inventário.
  const comPicareta = { hasItem: (k: string): boolean => k === 'pickaxe' };
  assert.equal(hasToolFor(NODES.ore, comPicareta), true);
  assert.equal(hasToolFor(NODES.crystal, comPicareta), true);
  assert.equal(hasToolFor(NODES.herb, comPicareta), false);
  assert.equal(hasToolFor(NODES.herb, { hasItem: (k) => k === 'sickle' }), true);
  // E as duas existem como item comprável — sem isso não haveria como começar.
  assert.ok(ITEMS.pickaxe!.buyPrice > 0);
  assert.ok(ITEMS.sickle!.buyPrice > 0);
});

test('cogumelo é a porta de entrada: não pede ferramenta nenhuma', () => {
  // Quem acabou de nascer não tem ferramenta. Se toda coleta exigisse compra, o
  // sistema seria invisível para quem mais precisa dele.
  assert.equal(hasToolFor(NODES.mushroom, { hasItem: () => false }), true);
  assert.equal(NODES.mushroom.tool.mode, 'none');
});

test('toda família de nó treina uma profissão que existe', () => {
  for (const k of NODE_KINDS) {
    const prof = GATHER_PROFESSION[k];
    assert.ok(prof, `${k} não treina nada`);
    assert.ok(PROFESSION_NAME[prof], `${prof} não tem nome`);
  }
  // As três de coleta são as do `DD-NPC-005`. Ferreiro é de fabricação e não
  // pode aparecer aqui: coletar minério não é forjar.
  assert.equal(GATHER_PROFESSION.ore, 'miner');
  assert.equal(GATHER_PROFESSION.crystal, 'miner');
  assert.equal(GATHER_PROFESSION.wood, 'lumberjack');
  assert.equal(GATHER_PROFESSION.herb, 'herbalist');
  assert.equal(GATHER_PROFESSION.mushroom, 'herbalist');
});

// ---------------------------------------------------------------------------
// Povoamento do mundo
// ---------------------------------------------------------------------------

test('o mapa inicial recebe nó de TODAS as cinco famílias', () => {
  // Família sem nó no mundo é família inalcançável — exatamente o que o
  // `DD-MAT-001` proíbe, e o motivo de as seis terem ficado fora do catálogo.
  const spots = buildResourceNodes(buildStarterMap());
  for (const k of NODE_KINDS) {
    assert.ok(spots.some((s) => s.kind === k), `nenhum nó de ${k} nasceu no mapa`);
  }
});

test('🔴 o povoamento é DETERMINÍSTICO', () => {
  // Nó não persiste: `spawnInitialNodes` roda a cada boot. Se isto variasse, os
  // recursos mudariam de lugar a cada reinício do servidor, e o jogador nunca
  // aprenderia o mapa.
  const a = buildResourceNodes(buildStarterMap());
  const b = buildResourceNodes(buildStarterMap());
  assert.deepEqual(a, b);
});

test('🔴 nenhum nó nasce dentro da vila, na água ou dentro do Depósito', () => {
  const map = buildStarterMap();
  const spots = buildResourceNodes(map);
  const ocupados = new Set<number>();
  for (const s of spots) {
    const dist = Math.max(Math.abs(s.x - map.spawn.x), Math.abs(s.y - map.spawn.y));
    assert.ok(
      dist >= NODE_MIN_SPAWN_DIST,
      `${s.kind} em (${s.x},${s.y}) está a ${dist} do nascimento — dentro da vila`,
    );
    assert.equal(inDepotZone(map, s.x, s.y), false, `${s.kind} dentro do Depósito`);
    const chave = s.y * map.width + s.x;
    assert.equal(ocupados.has(chave), false, `dois nós no mesmo tile (${s.x},${s.y})`);
    ocupados.add(chave);
  }
});

test('🔴 todo nó é ALCANÇÁVEL: ou se pisa nele, ou num vizinho', () => {
  // Nó visível e inalcançável é pior que nó ausente: o jogador atravessa o mapa
  // e descobre no lugar que não dá. Madeira mora em tile de árvore (sólido), e
  // por isso a regra é "dá para ficar ao lado", não "dá para pisar".
  const map = buildStarterMap();
  for (const s of buildResourceNodes(map)) {
    if (isWalkable(map, s.x, s.y, s.floor)) continue;
    let temVizinho = false;
    for (let dy = -1; dy <= 1 && !temVizinho; dy++) {
      for (let dx = -1; dx <= 1 && !temVizinho; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (isWalkable(map, s.x + dx, s.y + dy, s.floor)) temVizinho = true;
      }
    }
    assert.ok(temVizinho, `${s.kind} em (${s.x},${s.y}) é sólido e sem vizinho andável`);
  }
  // E o alcance da coleta é o que permite essa regra existir.
  assert.equal(GATHER_RANGE, 1);
});

test('🔴 madeira nasce EM CIMA de árvore, e o resto em chão andável', () => {
  // A árvore já está desenhada no mapa; o nó é a marca de que ela pode ser
  // cortada. Se ele saísse do tile de árvore, o jogo teria duas árvores no mesmo
  // lugar — uma de terreno e outra de recurso.
  const map = buildStarterMap();
  for (const s of buildResourceNodes(map)) {
    const nome = getTileType(tileAt(map, s.x, s.y, s.floor)).name;
    if (s.kind === 'wood') assert.equal(nome, 'tree', `madeira em (${s.x},${s.y}) fora de árvore`);
    else assert.ok(isWalkable(map, s.x, s.y, s.floor), `${s.kind} em tile sólido (${s.x},${s.y})`);
  }
});

test('o cristal é o recurso mais LONGE do nascimento', () => {
  // As três pontas do cristal já concordam entre si (1 carga, 12 min, XP alta);
  // a geografia é a quarta. Ele mora em território de Tier III, e é isso que
  // cobra o preço de ir buscá-lo.
  const map = buildStarterMap();
  const spots = buildResourceNodes(map);
  const dist = (s: { x: number; y: number }): number =>
    Math.max(Math.abs(s.x - map.spawn.x), Math.abs(s.y - map.spawn.y));
  const cristais = spots.filter((s) => s.kind === 'crystal');
  assert.ok(cristais.length > 0);
  for (const c of cristais) assert.ok(dist(c) >= 30, `cristal a só ${dist(c)} do nascimento`);
  // E o cogumelo, que não pede ferramenta, é o mais perto de todos.
  const cogumelos = spots.filter((s) => s.kind === 'mushroom');
  const maisPertoCogumelo = Math.min(...cogumelos.map(dist));
  const maisPertoCristal = Math.min(...cristais.map(dist));
  assert.ok(maisPertoCogumelo < maisPertoCristal);
});

test('o cristal é o mais caro de todos os eixos', () => {
  // Uma carga só, o respawn mais longo e a maior XP — as três pontas têm que
  // concordar, senão o nó vira armadilha ou vira farm.
  assert.equal(NODES.crystal.charges, 1);
  for (const k of NODE_KINDS) {
    if (k === 'crystal') continue;
    assert.ok(NODES.crystal.respawnMs > NODES[k].respawnMs, `${k} demora mais que o cristal`);
    assert.ok(GATHER_XP.crystal > GATHER_XP[k], `${k} dá mais XP que o cristal`);
  }
});
