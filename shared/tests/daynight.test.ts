import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CYCLE_MS,
  DAY_MS,
  DUSK_MS,
  NIGHT_MS,
  phaseStartMs,
  worldTimeAt,
} from '../src/index.js';

test('as durações são as que o dono pediu: 1 h · 30 min · 1 h', () => {
  assert.equal(DAY_MS, 60 * 60 * 1000);
  assert.equal(DUSK_MS, 30 * 60 * 1000);
  assert.equal(NIGHT_MS, 60 * 60 * 1000);
  assert.equal(CYCLE_MS, 2.5 * 60 * 60 * 1000, 'a volta completa dá 2 h 30');
});

test('cada fase ocupa a sua faixa de tempo real', () => {
  assert.equal(worldTimeAt(0).phase, 'day');
  assert.equal(worldTimeAt(DAY_MS - 1).phase, 'day');
  assert.equal(worldTimeAt(DAY_MS).phase, 'dusk');
  assert.equal(worldTimeAt(DAY_MS + DUSK_MS - 1).phase, 'dusk');
  assert.equal(worldTimeAt(DAY_MS + DUSK_MS).phase, 'night');
  assert.equal(worldTimeAt(CYCLE_MS - 1).phase, 'night');
});

test('o ciclo dá a volta', () => {
  assert.deepEqual(worldTimeAt(0), worldTimeAt(CYCLE_MS));
  assert.deepEqual(worldTimeAt(1234), worldTimeAt(CYCLE_MS * 3 + 1234));
});

test('relógio do sistema para trás não estoura', () => {
  // `elapsedMs` negativo tem que cair no ciclo, não devolver hora negativa.
  const t = worldTimeAt(-1000);
  assert.ok(t.hour >= 0 && t.hour < 24, `hora fora da faixa: ${t.hour}`);
  assert.ok(['day', 'dusk', 'night'].includes(t.phase));
});

test('a hora do relógio nunca sai de 0..24', () => {
  for (let t = 0; t < CYCLE_MS; t += 60_000) {
    const { hour } = worldTimeAt(t);
    assert.ok(hour >= 0 && hour < 24, `t=${t} deu hora ${hour}`);
  }
});

test('o mapa de horas bate com o desenhado', () => {
  // Dia começa às 6 e termina às 17.
  assert.equal(worldTimeAt(0).hour, 6);
  assert.ok(Math.abs(worldTimeAt(DAY_MS - 1).hour - 17) < 0.01);
  // Tarde: 17 → 19, em metade do tempo real. Ela CORRE, e é de propósito.
  assert.equal(worldTimeAt(DAY_MS).hour, 17);
  assert.ok(Math.abs(worldTimeAt(DAY_MS + DUSK_MS - 1).hour - 19) < 0.01);
  // Noite começa às 19 e atravessa a meia-noite.
  assert.equal(worldTimeAt(DAY_MS + DUSK_MS).hour, 19);
  assert.ok(worldTimeAt(DAY_MS + DUSK_MS + NIGHT_MS / 2).hour < 6, 'meio da noite é madrugada');
});

test('🔴 a TARDE não conta como noite', () => {
  // É este booleano que liga NIGHT_DMG_MULT e NIGHT_SPEED_MULT. Se a tarde
  // valesse como noite, seriam 1h30 de perigo contra 1h de segurança — e a
  // tarde deixaria de ser o aviso que ela é.
  assert.equal(worldTimeAt(DAY_MS + DUSK_MS / 2).night, false);
  assert.equal(worldTimeAt(DAY_MS + DUSK_MS / 2).phase, 'dusk');
  assert.equal(worldTimeAt(DAY_MS + DUSK_MS + 1).night, true);
});

test('a escuridão do cliente acompanha sem precisar saber da fase', () => {
  // O cliente calcula a escuridão por cosseno da hora: máxima à meia-noite,
  // nula ao meio-dia. O mapa de horas foi escolhido para que isso continue
  // valendo — meio do dia tem que ser mais claro que meio da noite.
  const escuridao = (h: number): number => (1 + Math.cos((h / 24) * Math.PI * 2)) / 2;
  const meioDia = escuridao(worldTimeAt(DAY_MS / 2).hour);
  const meioDaNoite = escuridao(worldTimeAt(DAY_MS + DUSK_MS + NIGHT_MS / 2).hour);
  const tarde = escuridao(worldTimeAt(DAY_MS + DUSK_MS / 2).hour);
  assert.ok(meioDia < tarde, 'o meio-dia tem que ser mais claro que a tarde');
  assert.ok(tarde < meioDaNoite, 'a tarde tem que ser mais clara que a madrugada');
});

test('phaseStartMs leva exatamente ao começo da fase pedida', () => {
  // É o que os comandos de teste usam: deslocam a origem do ciclo em vez de
  // manter um relógio paralelo — forçar "noite" e esperar faz amanhecer sozinho.
  for (const fase of ['day', 'dusk', 'night'] as const) {
    assert.equal(worldTimeAt(phaseStartMs(fase)).phase, fase);
  }
});
