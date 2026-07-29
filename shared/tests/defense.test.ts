import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCK_CAP,
  DODGE_CAP,
  computeDodgeChance,
  emptyDefense,
  resolveDamage,
} from '../src/index.js';

/** rng que devolve uma sequência fixa — deixa cada camada previsível. */
const seq = (...valores: number[]): (() => number) => {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)]!;
};

/** rng que nunca dispara nada probabilístico (esquiva/bloqueio sempre falham). */
const semSorte = (): number => 0.999;

test('DD-DEF-006: escudo REDUZ o dano, nunca anula', () => {
  // O exemplo é literal no doc: ataque de 1.000 com 25 % de mitigação -> 750.
  const def = emptyDefense({ shieldMitigation: 0.25 });
  const r = resolveDamage(1000, 'physical', def, semSorte);
  assert.equal(r.outcome, 'hit');
  assert.equal(r.amount, 750);
});

test('escudo com mitigação altíssima ainda deixa passar dano', () => {
  const def = emptyDefense({ shieldMitigation: 1 });
  const r = resolveDamage(1000, 'physical', def, semSorte);
  assert.equal(r.outcome, 'hit', 'escudo não pode virar esquiva');
  assert.equal(r.amount, 1, 'piso de 1: golpe que conectou sempre machuca');
});

test('bloqueio completo zera o dano — e é separado do escudo', () => {
  // Sem esquiva no perfil não há sorteio de esquiva, então o único valor de rng
  // consumido é o do bloqueio.
  const def = emptyDefense({ fullBlockChance: 0.25 });
  const r = resolveDamage(1000, 'physical', def, seq(0.01));
  assert.equal(r.outcome, 'blocked');
  assert.equal(r.amount, 0);
});

test('DD-DEF-012: a chance de bloqueio respeita o cap global', () => {
  const def = emptyDefense({ fullBlockChance: 0.95 });
  // Com rng logo acima do cap, o bloqueio TEM que falhar mesmo com 95 % no perfil.
  const r = resolveDamage(100, 'physical', def, seq(BLOCK_CAP + 0.01));
  assert.equal(r.outcome, 'hit');
});

test('com esquiva e bloqueio no perfil, sorteia a esquiva primeiro', () => {
  // Fixa a ordem dos sorteios: quem tem os dois consome [esquiva, bloqueio].
  const def = emptyDefense({ dodgeChance: 0.5, fullBlockChance: 0.25 });
  assert.equal(resolveDamage(100, 'physical', def, seq(0.1, 0.9)).outcome, 'dodged');
  assert.equal(resolveDamage(100, 'physical', def, seq(0.9, 0.1)).outcome, 'blocked');
  assert.equal(resolveDamage(100, 'physical', def, seq(0.9, 0.9)).outcome, 'hit');
});

test('esquiva impede o ataque de conectar', () => {
  const def = emptyDefense({ dodgeChance: 0.5 });
  const r = resolveDamage(1000, 'physical', def, seq(0.01));
  assert.equal(r.outcome, 'dodged');
  assert.equal(r.amount, 0);
});

test('DD-DEF-005: esquiva tem retorno decrescente e teto', () => {
  const a = computeDodgeChance(50);
  const b = computeDodgeChance(100);
  const c = computeDodgeChance(200);
  assert.equal(b > a, true, 'mais AGI, mais esquiva');
  // Retorno decrescente: dobrar AGI não dobra a esquiva.
  assert.equal(b < a * 2, true);
  assert.equal(c < DODGE_CAP, true, 'o teto nunca é alcançado');
  assert.equal(computeDodgeChance(100000) < DODGE_CAP, true);
  assert.equal(computeDodgeChance(0), 0);
});

test('DEF é corte PLANO no dano bruto, não redução percentual', () => {
  const fraco = resolveDamage(100, 'physical', emptyDefense({ defense: 40 }), semSorte);
  const forte = resolveDamage(200, 'physical', emptyDefense({ defense: 40 }), semSorte);
  // Corte plano: os dois perdem os MESMOS 40 pontos.
  assert.equal(fraco.amount, 60);
  assert.equal(forte.amount, 160);
});

test('dano físico usa DEF física; os outros usam DEF mágica', () => {
  const def = emptyDefense({ defense: 50, magicDefense: 10 });
  assert.equal(resolveDamage(100, 'physical', def, semSorte).amount, 50);
  assert.equal(resolveDamage(100, 'fire', def, semSorte).amount, 90);
});

test('a ordem das camadas é escudo -> armadura -> resistência', () => {
  const def = emptyDefense({
    shieldMitigation: 0.5, // 200 -> 100
    defense: 20, //            100 -> 80
    resistances: { physical: 0.5 }, // 80 -> 40
  });
  const r = resolveDamage(200, 'physical', def, semSorte);
  assert.equal(r.breakdown.afterShield, 100);
  assert.equal(r.breakdown.afterArmor, 80);
  assert.equal(r.breakdown.afterResist, 40);
  assert.equal(r.amount, 40);
});

test('31.56: a ordem inversa (armadura antes do escudo) dá resultado diferente', () => {
  // O doc se contradiz e a ordem definitiva está pendente. As duas precisam
  // funcionar, e o teste registra que a escolha MUDA o número — por isso ela
  // não pode ser feita em silêncio.
  const def = emptyDefense({ shieldMitigation: 0.5, defense: 20 });
  const diagrama = resolveDamage(200, 'physical', def, semSorte, 'shield-first');
  const texto = resolveDamage(200, 'physical', def, semSorte, 'armor-first');
  assert.equal(diagrama.amount, 80); // (200*0.5) - 20
  assert.equal(texto.amount, 90); //   (200 - 20)*0.5
  assert.notEqual(diagrama.amount, texto.amount);
});

test('armadura absurda não cura o alvo nem devolve negativo', () => {
  const r = resolveDamage(10, 'physical', emptyDefense({ defense: 9999 }), semSorte);
  assert.equal(r.amount, 1);
});

test('fraqueza elemental atravessa a armadura e aumenta o dano final', () => {
  // Morto-vivo fraco a Sagrado: é assim que a família ganha um contra natural.
  const def = emptyDefense({ magicDefense: 10, resistances: { holy: -0.5 } });
  const r = resolveDamage(100, 'holy', def, semSorte);
  assert.equal(r.amount, 135); // (100 - 10) * 1.5
});
