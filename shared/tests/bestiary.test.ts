/**
 * Comportamento, variantes e bestiário (GDD §12, mensagens #269–#277,
 * #551–#564, #971).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BESTIARY_UNLOCKS,
  CREATURES,
  NEUTRAL_CALM_DOWN_MS,
  UNCOMMON_SPAWN_CHANCE,
  VARIANTS,
  bestiaryPercent,
  bestiaryTier,
  fleesFromPlayers,
  retaliates,
  rollVariant,
  startsFight,
  type Behavior,
} from '../src/index.js';

test('o pacífico foge e nunca revida; todos os outros revidam', () => {
  assert.equal(fleesFromPlayers('peaceful'), true);
  assert.equal(retaliates('peaceful'), false);
  for (const b of ['neutral', 'territorial', 'predator', 'hostile', 'fanatic'] as Behavior[]) {
    assert.equal(fleesFromPlayers(b), false, `${b} não deveria fugir`);
    assert.equal(retaliates(b), true, `${b} deveria revidar`);
  }
});

test('só os agressivos começam a briga — neutro e pacífico não', () => {
  assert.equal(startsFight('peaceful'), false);
  assert.equal(startsFight('neutral'), false, 'o neutro só reage se você começar');
  for (const b of ['territorial', 'predator', 'hostile', 'fanatic'] as Behavior[]) {
    assert.equal(startsFight(b), true, `${b} deveria atacar por conta própria`);
  }
});

test('o neutro esfria depois de alguns segundos em paz', () => {
  assert.ok(NEUTRAL_CALM_DOWN_MS >= 3000 && NEUTRAL_CALM_DOWN_MS <= 15000);
});

test('o mundo tem bicho de cada temperamento', () => {
  const comportamentos = new Set(
    Object.values(CREATURES).map((c) => c.behavior ?? 'hostile'),
  );
  for (const esperado of ['peaceful', 'neutral', 'territorial', 'hostile'] as Behavior[]) {
    assert.ok(comportamentos.has(esperado), `falta criatura ${esperado}`);
  }
});

test('coelho não machuca ninguém; aranha e javali sim', () => {
  assert.equal(CREATURES.rabbit.behavior, 'peaceful');
  assert.equal(CREATURES.rabbit.strength, 0, 'pacífico não causa dano');
  // Pedido explícito: aranha nunca foge.
  assert.equal(CREATURES.spider.behavior, 'territorial');
  assert.equal(CREATURES.boar.behavior, 'neutral');
  assert.ok(CREATURES.boar.strength > 0, 'o neutro revida com força de verdade');
});

test('o chefe é fanático — nunca recua', () => {
  assert.equal(CREATURES.super_slime.behavior, 'fanatic');
});

// --- Variantes -------------------------------------------------------------

test('só existem duas variantes por enquanto: comum e incomum', () => {
  assert.deepEqual(Object.keys(VARIANTS).sort(), ['common', 'uncommon']);
});

test('a incomum é mais forte e recompensa mais', () => {
  const c = VARIANTS.common;
  const u = VARIANTS.uncommon;
  assert.equal(c.hpMult, 1);
  assert.ok(u.hpMult > c.hpMult && u.hpMult <= 1.25, 'na faixa de +15–25 % combinada');
  assert.ok(u.damageMult > c.damageMult);
  assert.ok(u.xpMult > c.xpMult, 'dá mais trabalho, vale mais XP');
  assert.ok(u.lootMult > c.lootMult);
  assert.ok(u.prefix.length > 0, 'precisa dar para reconhecer pelo nome');
});

test('a incomum é rara o bastante para ser um evento', () => {
  assert.ok(UNCOMMON_SPAWN_CHANCE > 0 && UNCOMMON_SPAWN_CHANCE <= 0.15);
  let incomuns = 0;
  for (let i = 0; i < 10000; i++) if (rollVariant() === 'uncommon') incomuns++;
  assert.ok(incomuns > 0 && incomuns < 2000, `saíram ${incomuns} incomuns em 10000`);
});

// --- Bestiário -------------------------------------------------------------

test('conhecimento avança por abates e trava em 100 %', () => {
  assert.equal(bestiaryPercent(0, false), 0);
  assert.ok(bestiaryPercent(30, false) > bestiaryPercent(5, false));
  assert.equal(bestiaryPercent(99999, false), 100);
});

test('chefe revela metade da ficha logo no primeiro abate', () => {
  assert.equal(bestiaryPercent(1, true), 50, 'GDD #564: 1ª morte = ~50 %');
  assert.equal(bestiaryPercent(2, true), 75);
  assert.equal(bestiaryPercent(8, true), 100);
});

test('chefe exige MUITO menos abates que monstro comum', () => {
  // Não faz sentido pedir centenas de mortes de algo raro e difícil.
  assert.ok(bestiaryPercent(1, true) > bestiaryPercent(1, false));
  assert.ok(bestiaryPercent(4, true) > bestiaryPercent(4, false));
});

test('cada patamar tem uma legenda do que foi liberado', () => {
  assert.equal(BESTIARY_UNLOCKS.length, 5, 'tiers 0..4');
  for (const t of [0, 1, 2, 3, 4]) assert.ok(BESTIARY_UNLOCKS[t]!.length > 0);
  assert.equal(bestiaryTier(0, false), 0);
  assert.equal(bestiaryTier(99999, false), 4);
});
