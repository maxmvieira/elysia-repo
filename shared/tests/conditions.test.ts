import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONDITIONS,
  CONDITION_IDS,
  applyCondition,
  breakOnDamage,
  emptyConditionDefense,
  interruptsCast,
  restrictionsOf,
  tickConditions,
  tryApplyCondition,
  type ActiveCondition,
} from '../src/index.js';

const sempre = (): number => 0;
const nunca = (): number => 0.999;

test('as dez condições do doc existem', () => {
  assert.equal(CONDITION_IDS.length, 10);
  for (const id of CONDITION_IDS) {
    assert.ok(CONDITIONS[id], `falta a definição de ${id}`);
    assert.equal(CONDITIONS[id].id, id);
  }
});

test('DD-CC-004/005: Stun, Congelamento e Petrificação interrompem conjuração', () => {
  assert.equal(CONDITIONS.stun.interruptsCast, true);
  assert.equal(CONDITIONS.freeze.interruptsCast, true);
  assert.equal(CONDITIONS.petrify.interruptsCast, true);
});

test('Silêncio é restrição, não controle: só bloqueia magia', () => {
  const s = CONDITIONS.silence;
  assert.equal(s.blocksCast, true);
  assert.equal(s.blocksMove, false, 'silenciado anda normal');
  assert.equal(s.blocksAttack, false, 'silenciado bate normal');
});

test('DD-CC-012: dano quebra Congelamento mas NÃO quebra Petrificação', () => {
  // É a única parte do DD-CC-012 que o doc fecha sem conflito.
  const ativas: ActiveCondition[] = [
    { id: 'freeze', expiresAt: 10_000 },
    { id: 'petrify', expiresAt: 10_000 },
    { id: 'poison', expiresAt: 10_000 },
  ];
  const depois = breakOnDamage(ativas).map((c) => c.id);
  assert.equal(depois.includes('freeze'), false);
  assert.equal(depois.includes('petrify'), true);
  assert.equal(depois.includes('poison'), true);
});

test('Petrificação dá bônus de DEF/MDEF; Congelamento não', () => {
  // É o que faz a Petrificação ser controle PURO, e não preparação de burst.
  assert.equal(CONDITIONS.petrify.defBonusPct! > 0, true);
  assert.equal(CONDITIONS.freeze.defBonusPct, undefined);
});

test('IMUNIDADE: a condição simplesmente não funciona', () => {
  const def = emptyConditionDefense({ immunity: ['freeze'] });
  const r = tryApplyCondition('freeze', 1.0, 5000, def, sempre);
  assert.equal(r.applied, false);
  assert.equal(r.rejection, 'immune');
});

test('DD-CC-009: imunidade a Congelamento NÃO protege de Petrificação', () => {
  // A regra que proíbe agrupar imunidade por categoria "controle".
  const def = emptyConditionDefense({ immunity: ['freeze'] });
  const r = tryApplyCondition('petrify', 1.0, 5000, def, sempre);
  assert.equal(r.applied, true, 'petrificação passa mesmo com imunidade a gelo');
});

test('RESISTÊNCIA reduz a CHANCE, não a duração', () => {
  const def = emptyConditionDefense({ resist: { stun: 0.5 } });
  // Chance base 1.0 com 50 % de resistência -> 0.5. rng 0.7 passa do limite.
  assert.equal(tryApplyCondition('stun', 1.0, 4000, def, () => 0.7).applied, false);
  // rng 0.3 fica abaixo -> aplica, e com a duração INTEIRA.
  const passou = tryApplyCondition('stun', 1.0, 4000, def, () => 0.3);
  assert.equal(passou.applied, true);
  assert.equal(passou.durationMs, 4000, 'resistência não mexe na duração');
});

test('REDUÇÃO reduz a DURAÇÃO, não a chance', () => {
  const def = emptyConditionDefense({ reduction: { stun: 0.25 } });
  const r = tryApplyCondition('stun', 1.0, 4000, def, sempre);
  assert.equal(r.applied, true, 'redução não impede aplicar');
  assert.equal(r.durationMs, 3000);
});

test('resistência total zera a chance sem virar imunidade', () => {
  const def = emptyConditionDefense({ resist: { freeze: 1 } });
  const r = tryApplyCondition('freeze', 1.0, 5000, def, sempre);
  assert.equal(r.applied, false);
  assert.equal(r.rejection, 'resisted', 'não é imunidade — é chance zerada');
});

test('reaplicar não empilha duração: fica a expiração mais longa', () => {
  let lista: ActiveCondition[] = [];
  lista = applyCondition(lista, { id: 'burn', expiresAt: 5000 });
  lista = applyCondition(lista, { id: 'burn', expiresAt: 3000 });
  assert.equal(lista.length, 1, 'não duplica a entrada');
  assert.equal(lista[0]!.expiresAt, 5000, 'a mais curta não encurta a ativa');
  lista = applyCondition(lista, { id: 'burn', expiresAt: 9000 });
  assert.equal(lista[0]!.expiresAt, 9000);
});

test('DoT cobra a parcela no tique e reagenda a próxima', () => {
  const lista: ActiveCondition[] = [
    { id: 'poison', expiresAt: 20_000, nextTickAt: 1000, power: 7, sourceId: 'p1' },
  ];
  const r = tickConditions(lista, 1000);
  assert.equal(r.damage.length, 1);
  assert.equal(r.damage[0]!.amount, 7);
  assert.equal(r.damage[0]!.type, 'poison');
  assert.equal(r.damage[0]!.sourceId, 'p1');
  assert.equal(r.active[0]!.nextTickAt, 1000 + CONDITIONS.poison.dot!.tickMs);
});

test('Sangramento é DoT FÍSICO — passa pela resistência física, não elemental', () => {
  assert.equal(CONDITIONS.bleed.dot!.type, 'physical');
  assert.equal(CONDITIONS.burn.dot!.type, 'fire');
});

test('condição expirada sai da lista e é reportada', () => {
  const lista: ActiveCondition[] = [
    { id: 'slow', expiresAt: 1000 },
    { id: 'root', expiresAt: 9000 },
  ];
  const r = tickConditions(lista, 5000);
  assert.deepEqual(r.expired, ['slow']);
  assert.equal(r.active.length, 1);
  assert.equal(r.active[0]!.id, 'root');
});

test('restrictionsOf combina tudo que está ativo no alvo', () => {
  const congelado = restrictionsOf([{ id: 'freeze', expiresAt: 9999 }]);
  assert.deepEqual(
    {
      canMove: congelado.canMove,
      canAttack: congelado.canAttack,
      canCast: congelado.canCast,
      canUseItem: congelado.canUseItem,
    },
    { canMove: false, canAttack: false, canCast: false, canUseItem: false },
  );

  // Aprisionamento prende os pés, não as mãos.
  const preso = restrictionsOf([{ id: 'root', expiresAt: 9999 }]);
  assert.equal(preso.canMove, false);
  assert.equal(preso.canAttack, true);
  assert.equal(preso.canCast, true);
});

test('lentidões não somam: vale a maior', () => {
  const r = restrictionsOf([
    { id: 'slow', expiresAt: 9999 },
    { id: 'slow', expiresAt: 9999 },
  ]);
  assert.equal(r.slowPct, CONDITIONS.slow.slowPct);
  assert.equal(r.slowPct < 1, true);
});

test('interruptsCast só dispara com controle de verdade', () => {
  assert.equal(interruptsCast([{ id: 'stun', expiresAt: 1 }]), true);
  assert.equal(interruptsCast([{ id: 'silence', expiresAt: 1 }]), false);
  assert.equal(interruptsCast([]), false);
});

test('chance base zero nunca aplica, mesmo sem contramedida alguma', () => {
  const r = tryApplyCondition('stun', 0, 4000, emptyConditionDefense(), sempre);
  assert.equal(r.applied, false);
});

test('sem contramedida e com chance cheia, aplica com a duração pedida', () => {
  const r = tryApplyCondition('burn', 1, 6000, emptyConditionDefense(), sempre);
  assert.equal(r.applied, true);
  assert.equal(r.durationMs, 6000);
  assert.equal(tryApplyCondition('burn', 0.5, 6000, emptyConditionDefense(), nunca).applied, false);
});
