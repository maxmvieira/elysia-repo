/**
 * Armas, raridade, passivos e proficiência (GDD §6, mensagens #262–#264,
 * #422, #944, #966).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFFIXES,
  ITEMS,
  RARITIES,
  RARITY,
  WEAPON_IDENTITY,
  WEAPON_TYPES,
  affixValue,
  getItem,
  proficiencyBonus,
  proficiencyThreshold,
  rollItem,
  rollRarity,
  type Rarity,
} from '../src/index.js';

/** RNG determinístico para testes de rolagem. */
const rngFixo = (valores: number[]): (() => number) => {
  let i = 0;
  return () => valores[i++ % valores.length]!;
};

test('cada tipo de arma tem identidade própria', () => {
  assert.equal(WEAPON_TYPES.length, 8);
  for (const t of WEAPON_TYPES) {
    const w = WEAPON_IDENTITY[t];
    assert.ok(w.damageMult > 0 && w.speedMult > 0, `${t} precisa de dano e velocidade`);
    assert.ok(w.hands === 1 || w.hands === 2);
  }
});

test('dano e velocidade se compensam: nenhuma arma é estritamente melhor', () => {
  const adaga = WEAPON_IDENTITY.dagger;
  const machado = WEAPON_IDENTITY.axe;
  // A adaga bate mais fraco, mas muito mais rápido — e vice-versa.
  assert.ok(adaga.damageMult < machado.damageMult, 'adaga bate menos por golpe');
  assert.ok(adaga.speedMult < machado.speedMult, 'adaga bate mais rápido');
  // Dano por segundo fica na mesma ordem de grandeza (nada é 3x melhor).
  const dps = (w: typeof adaga): number => w.damageMult / w.speedMult;
  const razao = dps(adaga) / dps(machado);
  assert.ok(razao > 0.7 && razao < 1.4, `DPS desbalanceado: razão ${razao.toFixed(2)}`);
});

test('nenhum tipo de arma domina no dano por segundo', () => {
  // damageMult e speedMult precisam se compensar: se um tipo tivesse DPS muito
  // acima dos outros, a escolha de arma viraria obrigatória em vez de estilo.
  const dps = WEAPON_TYPES.map((t) => ({
    t,
    v: WEAPON_IDENTITY[t].damageMult / WEAPON_IDENTITY[t].speedMult,
  }));
  const menor = Math.min(...dps.map((d) => d.v));
  const maior = Math.max(...dps.map((d) => d.v));
  assert.ok(
    maior / menor < 1.25,
    `DPS desequilibrado entre tipos: ${dps.map((d) => `${d.t}=${d.v.toFixed(2)}`).join(' ')}`,
  );
});

test('armas de duas mãos existem e trocam escudo por poder', () => {
  const duasMaos = WEAPON_TYPES.filter((t) => WEAPON_IDENTITY[t].hands === 2);
  assert.ok(duasMaos.length >= 3, 'precisa haver armas de duas mãos');
  // A besta é de duas mãos e bate bem mais que a espada de uma mão.
  assert.equal(WEAPON_IDENTITY.crossbow.hands, 2);
  assert.ok(WEAPON_IDENTITY.crossbow.damageMult > WEAPON_IDENTITY.sword.damageMult);
});

test('o catálogo tem uma arma de cada tipo, e o tipo é válido', () => {
  const tiposNoCatalogo = new Set(
    Object.values(ITEMS).filter((i) => i.weaponType).map((i) => i.weaponType!),
  );
  assert.equal(tiposNoCatalogo.size, WEAPON_TYPES.length, 'falta arma de algum tipo');
  for (const t of tiposNoCatalogo) assert.ok(WEAPON_IDENTITY[t], `tipo inválido: ${t}`);
});

// --- Raridade e passivos ---------------------------------------------------

test('raridade sobe passivos e poder de forma monotônica', () => {
  let affixesAnterior = -1;
  let multAnterior = 0;
  for (const r of RARITIES) {
    const def = RARITY[r];
    assert.ok(def.affixes > affixesAnterior, `${r} deveria ter mais passivos`);
    assert.ok(def.statMult > multAnterior, `${r} deveria ter mais poder`);
    affixesAnterior = def.affixes;
    multAnterior = def.statMult;
  }
  assert.equal(RARITY.common.affixes, 0, 'comum não rola passivo');
  assert.equal(RARITY.relic.affixes, 6);
});

test('slots de carta têm faixa: dois itens da mesma raridade podem diferir', () => {
  // É proposital (GDD #262): mantém a emoção de achar um exemplar melhor.
  assert.ok(RARITY.epic.slotsMax > RARITY.epic.slotsMin);
  assert.ok(RARITY.rare.slotsMax > RARITY.rare.slotsMin);
});

test('rollItem entrega a quantidade de passivos da raridade, sem repetir', () => {
  for (const r of RARITIES) {
    const item = rollItem(r, 'weapon', rngFixo([0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.6]));
    assert.equal(item.affixes.length, RARITY[r].affixes, `${r} rolou passivos demais/de menos`);
    const ids = item.affixes.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length, `${r} repetiu passivo no mesmo item`);
    assert.ok(item.slots >= RARITY[r].slotsMin && item.slots <= RARITY[r].slotsMax);
  }
});

test('os valores rolados respeitam a faixa de cada passivo', () => {
  for (let i = 0; i < 200; i++) {
    const item = rollItem('mythic', 'weapon');
    for (const a of item.affixes) {
      const def = AFFIXES[a.id];
      assert.ok(a.value >= def.min && a.value <= def.max, `${a.id} fora da faixa: ${a.value}`);
    }
  }
});

test('armadura não rola passivo exclusivo de arma', () => {
  for (let i = 0; i < 100; i++) {
    for (const a of rollItem('relic', 'armor').affixes) {
      assert.notEqual(AFFIXES[a.id].on, 'weapon', `${a.id} não deveria cair em armadura`);
    }
  }
});

test('raridade alta é rara; comum é o caso normal', () => {
  const conta: Record<string, number> = {};
  for (let i = 0; i < 20000; i++) {
    const r = rollRarity();
    conta[r] = (conta[r] ?? 0) + 1;
  }
  assert.ok(conta.common! > conta.rare!, 'comum deve ser mais frequente que raro');
  assert.ok(conta.rare! > (conta.legendary ?? 0), 'raro deve superar lendário');
  assert.ok((conta.relic ?? 0) < 20000 * 0.01, 'relíquia precisa ser realmente rara');
});

test('bônus de chefe empurra a curva de raridade para cima', () => {
  const bons = (bonus: number): number => {
    let n = 0;
    for (let i = 0; i < 5000; i++) {
      const r: Rarity = rollRarity(bonus);
      if (r === 'epic' || r === 'legendary' || r === 'mythic' || r === 'relic') n++;
    }
    return n;
  };
  assert.ok(bons(35) > bons(0) * 2, 'chefe deveria dar bem mais itens excepcionais');
});

test('affixValue soma o passivo pedido e ignora o resto', () => {
  const affixes = [
    { id: 'crit_chance' as const, value: 7 },
    { id: 'hp_bonus' as const, value: 30 },
  ];
  assert.equal(affixValue(affixes, 'crit_chance'), 7);
  assert.equal(affixValue(affixes, 'hp_bonus'), 30);
  assert.equal(affixValue(affixes, 'life_steal'), 0);
  assert.equal(affixValue(undefined, 'crit_chance'), 0);
});

// --- Proficiência ----------------------------------------------------------

test('proficiência não tem teto, mas desacelera muito', () => {
  const t20 = proficiencyThreshold(20);
  const t100 = proficiencyThreshold(100);
  const t300 = proficiencyThreshold(300);
  assert.ok(t100 > t20 * 3, 'chegar ao 100 é bem mais lento que ao 20');
  assert.ok(t300 > t100 * 3, 'do 100 ao 300 é extremamente lento');
  assert.ok(Number.isFinite(proficiencyThreshold(1000)), 'nunca trava — não há teto');
});

test('maestria sempre soma dano, com retorno decrescente', () => {
  assert.ok(proficiencyBonus(50) > proficiencyBonus(10));
  assert.ok(proficiencyBonus(200) > proficiencyBonus(100));
  // O ganho por nível diminui conforme sobe.
  const ganhoBaixo = proficiencyBonus(20) - proficiencyBonus(10);
  const ganhoAlto = proficiencyBonus(210) - proficiencyBonus(200);
  assert.ok(ganhoBaixo > ganhoAlto, 'retorno deveria ser decrescente');
});

test('a loja vende uma arma de cada tipo para experimentar', () => {
  const arma = getItem('short_bow');
  assert.equal(arma?.weaponType, 'bow');
  assert.ok((arma?.buyPrice ?? 0) > 0, 'precisa estar à venda');
});
