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
  MOVE_BASE_MS,
  MOVE_FLOOR_MS,
  DODGE_CAP,
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

/**
 * 🔴 `DD-BAL-012` — **AGI = velocidade de ataque + esquiva. Só isso.**
 *
 * Este teste era "Agility deixa o ataque e o MOVIMENTO mais rápidos" até
 * 2026-09-04. O movimento nunca esteve no documento: a tabela de conferência do
 * destilado marcava a linha do `DD-BAL-012` como "✅ igual" e o código dava um
 * terceiro uso (e um quarto, defesa) que ninguém notou.
 */
test('AGI acelera o ataque e aumenta a esquiva — e nada mais', () => {
  const base = { str: 10, dex: 10, vit: 10, int: 10, wis: 10, agi: 10, luk: 10 };
  const pouco = computeStats(CLASSES.archer, base, 1, skill('distance'));
  const muito = computeStats(CLASSES.archer, { ...base, agi: 30 }, 1, skill('distance'));

  assert.ok(muito.attackCooldownMs < pouco.attackCooldownMs, 'ataca mais rápido');
  assert.ok(muito.dodgeChance > pouco.dodgeChance, 'esquiva mais');

  // E os dois que SAÍRAM:
  assert.equal(muito.moveIntervalMs, pouco.moveIntervalMs, 'AGI não anda mais rápido');
  assert.equal(muito.defense, pouco.defense, 'AGI não dá defesa (DEF Física = VIT + armadura)');
});

test('a velocidade de movimento vem do NÍVEL, e sobe pouco', () => {
  const base = { str: 10, dex: 10, vit: 10, int: 10, wis: 10, agi: 10, luk: 10 };
  const nv = (n: number): number =>
    computeStats(CLASSES.archer, base, n, skill('distance')).moveIntervalMs;

  assert.equal(nv(1), MOVE_BASE_MS, 'no nível 1 é a base');
  assert.ok(nv(100) < nv(1), 'o nível 100 anda melhor que o 1');
  assert.ok(nv(300) < nv(100));
  assert.equal(nv(300), MOVE_FLOOR_MS, 'e existe piso');

  // 🔴 "Bem pouco" é medido: o ganho de 1 → 300 fica abaixo de 25 %, contra os
  // ~110 % que a AGI dava sozinha. A filosofia do arquivo ("o NÍVEL sozinho
  // quase não fortalece") continua de pé.
  const ganho = 1 - nv(300) / nv(1);
  assert.ok(ganho < 0.25, `ganho de ${(ganho * 100).toFixed(0)} % é demais para "bem pouco"`);
  assert.ok(ganho > 0.10, 'mas tem de dar para sentir');
});

test('DD-DEF-005: a esquiva tem retorno decrescente e nunca chega ao teto', () => {
  /**
   * 🔴 O doc pede *"retorno decrescente e teto"* e a meta de **30–35 % máximo
   * vindo de AGI** (65.55). O código estava LINEAR com `clamp` em 50 % desde a
   * Etapa 1 — um Assassino com AGI 100 esquivava metade dos golpes.
   *
   * ⚠️ E a curva certa já existia em `defense.ts` desde a Etapa 8; `computeStats`
   * é que nunca a chamou. Duas fórmulas conviveram por meses.
   */
  const comAgi = (agi: number): number =>
    computeStats(CLASSES.assassin,
      { str: 10, dex: 10, vit: 10, int: 10, wis: 10, agi, luk: 10 },
      1, skill('melee')).dodgeChance;

  assert.ok(comAgi(200) < DODGE_CAP, 'nunca alcança o teto');
  assert.ok(comAgi(1000) < DODGE_CAP, 'nem com AGI absurda');
  // Retorno DECRESCENTE: dobrar AGI nunca dobra a esquiva.
  assert.ok(comAgi(100) < comAgi(50) * 2, 'dobrar AGI não dobra a esquiva');
  assert.ok(comAgi(200) < comAgi(100) * 2);
});

/**
 * 🔴 `DD-PROG-028` — **o ataque básico com cajado é FÍSICO.** Este teste era o
 * inverso até 03/09 ("magos têm alcance à distância e projétil"), e mudou junto
 * com a correção: *"dano mágico à distância exige gastar uma habilidade e
 * mana"*. O Arqueiro continua atirando de graça — é ele quem tem projétil.
 */
test('cajado bate de perto e sem projétil; só o Arqueiro atira de graça', () => {
  assert.equal(CLASSES.knight.attackRange, 1);
  for (const cls of [CLASSES.sorcerer, CLASSES.druid]) {
    assert.equal(cls.attackRange, 1, `${cls.id} bate de perto com o cajado`);
    assert.equal(cls.projectile, undefined, `${cls.id} não atira no golpe básico`);
    assert.equal(cls.spellCost, 0, `${cls.id} não gasta mana no golpe básico`);
  }
  assert.equal(CLASSES.archer.projectile, 'arrow');
  assert.equal(CLASSES.archer.attackRange > 1, true);
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
