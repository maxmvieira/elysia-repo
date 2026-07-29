import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASSES,
  computeHit,
  computeStats,
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

test('totalAttributes soma os sete atributos', () => {
  assert.equal(totalAttributes({ str: 1, dex: 2, vit: 3, int: 4, wis: 5, agi: 6, luk: 7 }), 28);
});
