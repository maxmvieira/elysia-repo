import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREATURES, chebyshev, rollDamage, xpToNext } from '../src/index.js';

test('dano nunca é menor que 1, mesmo com defesa altíssima', () => {
  const { amount } = rollDamage(5, 999, () => 0.5);
  assert.equal(amount >= 1, true);
});

test('crítico aumenta o dano (rng baixo força crit e variância mínima)', () => {
  const normal = rollDamage(20, 0, () => 0.5).amount; // rng 0.5 -> sem crit, variância 1.0
  const critical = rollDamage(20, 0, () => 0.0); // rng 0 -> crit + variância 0.8
  assert.equal(rollDamage(20, 0, () => 0.0).crit, true);
  assert.equal(critical.amount > 0 && normal > 0, true);
  // Com variância 0.8 e crit 1.5x: 20*0.8*1.5 = 24 > 20*1.0 = 20
  assert.equal(critical.amount, 24);
  assert.equal(normal, 20);
});

test('defesa reduz o dano', () => {
  const semDef = rollDamage(20, 0, () => 0.5).amount;
  const comDef = rollDamage(20, 10, () => 0.5).amount;
  assert.equal(comDef < semDef, true);
});

test('xpToNext cresce com o nível', () => {
  assert.equal(xpToNext(1), 100);
  assert.equal(xpToNext(2), 150);
  assert.equal(xpToNext(3), 200);
});

test('distância de Chebyshev trata diagonal como 1', () => {
  assert.equal(chebyshev(0, 0, 1, 1), 1);
  assert.equal(chebyshev(0, 0, 3, 1), 3);
  assert.equal(chebyshev(5, 5, 5, 5), 0);
});

test('o Slime existe e tem recompensa de XP positiva', () => {
  assert.ok(CREATURES.slime);
  assert.equal(CREATURES.slime!.xpReward > 0, true);
});

test('o Rotworm existe e é um pouco mais fraco que o Slime', () => {
  const rotworm = CREATURES.rotworm;
  const slime = CREATURES.slime;
  assert.ok(rotworm);
  assert.ok(slime);
  // "Um pouco mais fraco": menos vida e menos recompensa que o Slime.
  assert.equal(rotworm!.maxHp < slime!.maxHp, true);
  assert.equal(rotworm!.xpReward < slime!.xpReward, true);
});

test('o Zumbi é fraco a Sagrado — e a fraqueza vem do lore, não de gosto', () => {
  // Morto-vivo é alma que não conseguiu voltar ao Heart; Sagrado é energia
  // vital. O roadmap fecha isso na etapa do Druid.
  const r = CREATURES.zombie!.resistances;
  assert.ok(r);
  assert.equal(r!.holy! < 0, true, 'resistência negativa = fraqueza');
  // Só Sagrado: resistência a Veneno pareceria óbvia, mas o doc não fala nisso.
  assert.equal(r!.poison, undefined);
});

test('nenhuma criatura nasce imune: resistência sempre abaixo do teto', () => {
  for (const [tipo, def] of Object.entries(CREATURES)) {
    for (const [elem, v] of Object.entries(def.resistances ?? {})) {
      assert.equal(v < 1, true, `${tipo} seria imune a ${elem}`);
    }
  }
});

test('o Slime aguenta mais de um golpe no início (não é 1-hit)', () => {
  // No nível 1 as classes batem ~28-39 por golpe (skill inicial 10). O Slime
  // precisa de HP suficiente para não morrer com um único acerto forte.
  assert.equal(CREATURES.slime!.maxHp >= 80, true);
});
