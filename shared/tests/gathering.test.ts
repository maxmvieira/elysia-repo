import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GATHER_XP,
  ITEMS,
  MATERIALS,
  NODES,
  NODE_KINDS,
  hasToolFor,
  rollGather,
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
