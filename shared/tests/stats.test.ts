import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASSES,
  attributeCost,
  computeHit,
  computeStats,
  pointsForLevel,
  totalPointsUpToLevel,
  skillThreshold,
  totalAttributes,
  type SkillState,
} from '../src/index.js';

const skill = (kind: SkillState['kind'], level = 10): SkillState => ({ kind, level, progress: 0 });

test('classes têm atributos-base distintos e coerentes com o papel', () => {
  const k = CLASSES.knight.base;
  const s = CLASSES.sorcerer.base;
  assert.equal(k.str > s.str, true, 'knight tem mais força que sorcerer');
  assert.equal(s.int > k.int, true, 'sorcerer tem mais inteligência que knight');
  assert.equal(CLASSES.archer.base.dex > CLASSES.knight.base.dex, true);
});

test('Vitality aumenta a vida máxima; Intelligence aumenta a mana', () => {
  const base = { str: 10, dex: 10, vit: 10, int: 10, wis: 10, agi: 10, luk: 10 };
  const d0 = computeStats(CLASSES.knight, base, 1, skill('melee'));
  const dVit = computeStats(CLASSES.knight, { ...base, vit: 20 }, 1, skill('melee'));
  const dInt = computeStats(CLASSES.knight, { ...base, int: 20 }, 1, skill('melee'));
  assert.equal(dVit.maxHp > d0.maxHp, true);
  assert.equal(dInt.maxMana > d0.maxMana, true);
});

test('Agility deixa o ataque e o movimento mais rápidos', () => {
  const base = { str: 10, dex: 10, vit: 10, int: 10, wis: 10, agi: 10, luk: 10 };
  const lento = computeStats(CLASSES.archer, base, 1, skill('distance'));
  const rapido = computeStats(CLASSES.archer, { ...base, agi: 30 }, 1, skill('distance'));
  assert.equal(rapido.moveIntervalMs < lento.moveIntervalMs, true);
  assert.equal(rapido.attackCooldownMs < lento.attackCooldownMs, true);
});

test('magos têm alcance à distância e projétil; knight é corpo a corpo', () => {
  assert.equal(CLASSES.knight.attackRange, 1);
  assert.equal(CLASSES.sorcerer.attackRange > 1, true);
  assert.equal(CLASSES.sorcerer.projectile, 'firebolt');
  assert.equal(CLASSES.archer.projectile, 'arrow');
});

test('skill maior aumenta o dano (físico ou mágico conforme a classe)', () => {
  const base = { str: 12, dex: 10, vit: 10, int: 14, wis: 10, agi: 10, luk: 10 };
  const s1 = computeStats(CLASSES.sorcerer, base, 1, skill('magic', 10));
  const s2 = computeStats(CLASSES.sorcerer, base, 1, skill('magic', 20));
  assert.equal(s2.magicAtk > s1.magicAtk, true);
});

test('skillThreshold cresce com o nível da skill', () => {
  assert.equal(skillThreshold(1) < skillThreshold(20), true);
});

test('computeHit respeita crítico determinístico', () => {
  const critical = computeHit(20, 1, 2, () => 0); // variância 0.85, crit garantido -> 20*0.85*2 = 34
  assert.equal(critical.crit, true);
  assert.equal(critical.amount, 34);
});

test('DD-PROG-002: os pontos por nível crescem de 10 para 20', () => {
  // A regra que o doc fecha. As FAIXAS são decisão do projeto (o doc recusa
  // dá-las, avisando "não devemos inventar").
  assert.equal(pointsForLevel(1), 10);
  assert.equal(pointsForLevel(50), 10);
  assert.equal(pointsForLevel(51), 12);
  assert.equal(pointsForLevel(150), 14);
  assert.equal(pointsForLevel(200), 16);
  assert.equal(pointsForLevel(250), 18);
  assert.equal(pointsForLevel(251), 20);
  assert.equal(pointsForLevel(999), 20, 'o teto é 20 e não passa disso');
});

test('a curva é monotônica: nunca cai ao subir de nível', () => {
  let anterior = 0;
  for (let n = 1; n <= 400; n++) {
    const p = pointsForLevel(n);
    assert.ok(p >= anterior, `nível ${n} concede menos que o anterior`);
    anterior = p;
  }
});

test('a curva resolve o travamento do nível alto', () => {
  // O problema concreto: acima de 200 um atributo custa 20 pontos por +1. Com
  // os 10 fixos de antes, o personagem alto não comprava NEM UM ponto por nível.
  assert.equal(attributeCost(210), 20);
  assert.ok(pointsForLevel(10) < attributeCost(210), 'nível baixo não alcança — correto');
  assert.ok(
    pointsForLevel(300) >= attributeCost(210),
    'nível 300 tem que conseguir +1 num atributo caro por nível',
  );
});

test('totalPointsUpToLevel soma a curva, não multiplica o valor atual', () => {
  // Multiplicar daria pontos que nunca foram concedidos. Nível 3 recebeu no 2 e
  // no 3, ambos na primeira faixa.
  assert.equal(totalPointsUpToLevel(1), 0, 'o nível 1 não sobe de nada');
  assert.equal(totalPointsUpToLevel(3), 20);
  // Níveis 2 a 50 são 49 concessões de 10 (o nível 1 não concede nada), e o 51
  // já é a segunda faixa.
  assert.equal(totalPointsUpToLevel(51), 49 * 10 + 12);
  // E é sempre menor que a conta ingênua com o valor do nível atual.
  assert.ok(totalPointsUpToLevel(300) < pointsForLevel(300) * 299);
});

test('totalAttributes soma os sete atributos', () => {
  assert.equal(totalAttributes({ str: 1, dex: 2, vit: 3, int: 4, wis: 5, agi: 6, luk: 7 }), 28);
});
