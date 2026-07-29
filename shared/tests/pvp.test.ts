import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canHarm, type Combatant } from '../src/index.js';

const jogador = (id: string, extra: Partial<Combatant> = {}): Combatant => ({
  id,
  kind: 'player',
  ...extra,
});
const monstro = (id: string): Combatant => ({ id, kind: 'creature' });

test('PK OFF: a ação ofensiva simplesmente não existe entre jogadores', () => {
  const a = jogador('a', { pkEnabled: false });
  const b = jogador('b', { pkEnabled: false });
  const d = canHarm(a, b);
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'pk-off');
  // 🔴 O doc é explícito: com PK OFF o caster NÃO vira PK.
  assert.equal(d.marksAsPk, false);
});

test('basta um dos dois com PK OFF para a ação não existir', () => {
  // Senão quem liga o flag arrastaria um jogador pacífico para o PvP.
  const agressor = jogador('a', { pkEnabled: true });
  const pacifico = jogador('b', { pkEnabled: false });
  assert.equal(canHarm(agressor, pacifico).allowed, false);
  assert.equal(canHarm(pacifico, agressor).allowed, false);
});

test('PK ON dos dois lados libera a ação e marca o atacante como PK', () => {
  const a = jogador('a', { pkEnabled: true });
  const b = jogador('b', { pkEnabled: true });
  const d = canHarm(a, b);
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, true);
});

test('criatura ignora o flag de PK nos dois sentidos', () => {
  const pacifico = jogador('p', { pkEnabled: false });
  assert.equal(canHarm(pacifico, monstro('m1')).allowed, true);
  assert.equal(canHarm(monstro('m1'), pacifico).allowed, true);
  assert.equal(canHarm(pacifico, monstro('m1')).marksAsPk, false);
});

test('friendly fire desligado por padrão entre aliados de party', () => {
  const a = jogador('a', { pkEnabled: true, partyId: 'g1' });
  const b = jogador('b', { pkEnabled: true, partyId: 'g1' });
  assert.equal(canHarm(a, b).veto, 'ally');
  assert.equal(canHarm(a, b, { friendlyFire: true }).allowed, true);
});

test('guerra de guilda: hostil automaticamente, sem precisar ligar PK', () => {
  const a = jogador('a', { pkEnabled: false, guildId: 'g1' });
  const b = jogador('b', { pkEnabled: false, guildId: 'g2' });
  const d = canHarm(a, b, { guildWar: (x, y) => x.guildId !== y.guildId });
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, false, 'guerra oficial não gera criminalidade');
});

test('DD-PK-009: duelo consensual é separado de PK', () => {
  const a = jogador('a', { pkEnabled: false });
  const b = jogador('b', { pkEnabled: false });
  const d = canHarm(a, b, { duel: () => true });
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, false);
});

test('ninguém se machuca sozinho', () => {
  const a = jogador('a', { pkEnabled: true });
  assert.equal(canHarm(a, a).veto, 'self');
});
