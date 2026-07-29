import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAMAGE_TYPES,
  ELEMENT_INFO,
  RESISTANCE_CAP,
  applyResistance,
  isWeakTo,
  mergeResistances,
  resistanceAgainst,
} from '../src/index.js';

test('DD-ELM-002: são exatamente SETE tipos de dano', () => {
  assert.equal(DAMAGE_TYPES.length, 7);
  // A decisão de não ter 15-25 elementos é explícita no doc. Se alguém quiser
  // um oitavo, tem que passar pelo dono primeiro.
  assert.deepEqual([...DAMAGE_TYPES], [
    'physical',
    'fire',
    'ice',
    'electric',
    'poison',
    'holy',
    'dark',
  ]);
});

test('todo tipo de dano tem ficha de exibição', () => {
  for (const t of DAMAGE_TYPES) {
    assert.ok(ELEMENT_INFO[t], `falta ELEMENT_INFO para ${t}`);
    assert.equal(typeof ELEMENT_INFO[t].name, 'string');
  }
});

test('DD-ELM-003: resistência NUNCA zera o dano, por mais alta que seja', () => {
  // "alta resistência a fogo não zera o dano de fogo, só torna a escolha menos
  // eficiente" — o teto é o que garante isso.
  const absurda = applyResistance(1000, 'fire', { fire: 5 });
  assert.equal(absurda > 0, true);
  assert.equal(absurda, 1000 * (1 - RESISTANCE_CAP));
  assert.equal(RESISTANCE_CAP < 1, true, 'o teto precisa ser menor que 1');
});

test('resistência reduz o dano só do SEU tipo', () => {
  const perfil = { fire: 0.5 };
  assert.equal(applyResistance(100, 'fire', perfil), 50);
  assert.equal(applyResistance(100, 'ice', perfil), 100);
});

test('resistência negativa é FRAQUEZA: aumenta o dano', () => {
  assert.equal(applyResistance(100, 'holy', { holy: -0.5 }), 150);
  assert.equal(isWeakTo({ holy: -0.5 }, 'holy'), true);
  assert.equal(isWeakTo({ holy: 0.5 }, 'holy'), false);
});

test('a fraqueza tem piso: nem a pior soma multiplica o dano indefinidamente', () => {
  const comPiso = applyResistance(100, 'fire', { fire: -99 });
  assert.equal(comPiso, 200, 'piso de -1.0 => no máximo o dobro');
});

test('mergeResistances soma as fontes (personagem + equipamento + carta)', () => {
  const total = mergeResistances({ fire: 0.2 }, { fire: 0.1, ice: 0.3 });
  assert.equal(total.fire, 0.30000000000000004); // soma em ponto flutuante
  assert.equal(total.ice, 0.3);
  assert.equal(total.holy, undefined, 'tipo não citado não vira 0 explícito');
});

test('resistanceAgainst já entrega o valor limitado pelo teto', () => {
  assert.equal(resistanceAgainst({ dark: 0.9 }, 'dark'), RESISTANCE_CAP);
  assert.equal(resistanceAgainst({}, 'dark'), 0, 'tipo ausente vale 0');
});
