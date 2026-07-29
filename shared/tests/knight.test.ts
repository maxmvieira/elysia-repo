/**
 * Árvore do Knight (GDD §5, mensagens #741–#764).
 * Cada teste aqui trava uma decisão de design que foi discutida e fechada.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SKILL_LEVEL,
  SKILLS,
  SKILL_BAR,
  executionMultiplier,
  furyStats,
  ruptureDefReduction,
  stanceDamagePenalty,
  stanceDamageReduction,
} from '../src/index.js';

test('o Knight tem oito habilidades, todas na barra de atalhos', () => {
  const doKnight = Object.values(SKILLS).filter((s) => s.classes.includes('knight'));
  assert.equal(doKnight.length, 8);
  for (const s of doKnight) {
    assert.ok(SKILL_BAR.includes(s.id), `${s.id} deveria estar na barra`);
  }
});

test('cada habilidade tem uma função diferente — nada de dano com outra animação', () => {
  const tipos = new Set(Object.values(SKILLS).map((s) => s.kind));
  for (const esperado of ['damage', 'charge', 'rupture', 'execution', 'taunt', 'stance', 'fury']) {
    assert.ok(tipos.has(esperado as never), `falta uma habilidade do tipo ${esperado}`);
  }
});

// --- Fúria de Batalha ------------------------------------------------------

test('Fúria: a vida vai de 2x no Lv.1 a 3x no Lv.10', () => {
  assert.equal(furyStats(1).hpMult, 2);
  assert.equal(furyStats(MAX_SKILL_LEVEL).hpMult, 3);
});

test('Fúria: especializar melhora o poder E o controle da drenagem', () => {
  const lv1 = furyStats(1);
  const lv10 = furyStats(MAX_SKILL_LEVEL);
  assert.ok(lv10.damageBonus > lv1.damageBonus, 'mais dano');
  assert.ok(lv10.attackSpeedBonus > lv1.attackSpeedBonus, 'mais velocidade');
  // A drenagem CAI: dominar a habilidade é controlar melhor a própria fúria.
  assert.equal(lv1.drainPerSecond, 0.01, 'Lv.1 drena 1%/s');
  assert.equal(lv10.drainPerSecond, 0.005, 'Lv.10 drena 0,5%/s');
  assert.ok(lv10.drainPerSecond < lv1.drainPerSecond);
});

test('Fúria: o risco NUNCA desaparece — o dano recebido piora com o nível', () => {
  const lv1 = furyStats(1);
  const lv10 = furyStats(MAX_SKILL_LEVEL);
  assert.equal(lv1.damageTakenBonus, 0.2);
  assert.equal(lv10.damageTakenBonus, 0.3);
  assert.ok(lv10.damageTakenBonus > lv1.damageTakenBonus, 'especializar não remove o preço');
});

test('Fúria: a recarga só começa quando ela termina (90 s)', () => {
  assert.equal(SKILLS.battle_fury.cooldownMs, 90000);
  assert.equal(SKILLS.battle_fury.shape, 'self');
});

// --- Execução --------------------------------------------------------------

test('Execução: sem bônus com o alvo cheio, máximo com o alvo quase morto', () => {
  assert.equal(executionMultiplier(5, 1.0), 1, 'alvo cheio = golpe normal');
  assert.ok(executionMultiplier(5, 0.1) > executionMultiplier(5, 0.5), 'mais ferido, mais forte');
  assert.ok(executionMultiplier(10, 0.05) > executionMultiplier(1, 0.05), 'nível aumenta a curva');
});

test('Execução: é curva de dano, não botão de deletar', () => {
  // Mesmo no pior caso possível o multiplicador é finito e previsível.
  const pior = executionMultiplier(MAX_SKILL_LEVEL, 0);
  assert.ok(pior <= 3.3, `multiplicador máximo ficou alto demais: ${pior}`);
  assert.ok(Number.isFinite(pior));
});

// --- Ruptura ---------------------------------------------------------------

test('Ruptura: abre a defesa do alvo por uma janela curta', () => {
  assert.equal(SKILLS.rupture.durationMs, 4000, 'janela de 3–5 s como combinado');
  assert.ok(ruptureDefReduction(10) > ruptureDefReduction(1));
  assert.ok(ruptureDefReduction(10) < 1, 'nunca zera a defesa do alvo');
});

// --- Postura Defensiva -----------------------------------------------------

test('Postura Defensiva: troca defesa por ofensiva, e o preço cai com o nível', () => {
  assert.ok(stanceDamageReduction(10) > stanceDamageReduction(1), 'protege mais no Lv.10');
  assert.ok(stanceDamagePenalty(10) < stanceDamagePenalty(1), 'custa menos dano no Lv.10');
  // Continua sendo uma troca real: você sempre abre mão de alguma ofensiva.
  assert.ok(stanceDamagePenalty(MAX_SKILL_LEVEL) > 0);
});

// --- Provocar --------------------------------------------------------------

test('Provocar: recarga curta e alvo único', () => {
  assert.equal(SKILLS.taunt.cooldownMs, 2000, 'GDD: 2 s, para administrar o campo');
  assert.equal(SKILLS.taunt.shape, 'target');
  assert.equal(SKILLS.taunt.power, 0, 'não causa dano');
  assert.ok(SKILLS.taunt.manaCost <= 5, 'custo de mana baixo');
});

// --- Investida -------------------------------------------------------------

test('Investida: alcança de longe e vale pela mobilidade, não pelo dano', () => {
  assert.equal(SKILLS.charge.cooldownMs, 8000);
  assert.ok(SKILLS.charge.range >= 5, 'precisa alcançar quem está longe');
  assert.ok(
    SKILLS.charge.power < SKILLS.power_strike.power,
    'bate menos que o Golpe Poderoso — o valor é chegar lá',
  );
});

// --- Árvore ---------------------------------------------------------------

test('a árvore abre em ordem: as habilidades avançadas pedem nível maior', () => {
  assert.ok(SKILLS.taunt.reqLevel < SKILLS.charge.reqLevel);
  assert.ok(SKILLS.charge.reqLevel < SKILLS.rupture.reqLevel);
  assert.ok(SKILLS.rupture.reqLevel < SKILLS.execution.reqLevel);
  assert.ok(SKILLS.execution.reqLevel < SKILLS.battle_fury.reqLevel);
  assert.equal(SKILLS.power_strike.reqLevel, 1, 'a primeira está disponível desde o começo');
});

test('as habilidades avançadas dependem das básicas', () => {
  assert.deepEqual(SKILLS.charge.requires, [{ skill: 'power_strike', level: 3 }]);
  assert.deepEqual(SKILLS.rupture.requires, [{ skill: 'bash', level: 3 }]);
  assert.deepEqual(SKILLS.execution.requires, [{ skill: 'power_strike', level: 5 }]);
});
