/**
 * Buffs, debuffs e áreas persistentes — as duas peças de motor que as Etapas 14
 * e 15 exigiram.
 *
 * O que se testa aqui não é número de documento, é REGRA: quem vence quando o
 * mesmo buff chega duas vezes, até onde uma pilha de debuffs pode derrubar um
 * stat, e o que acontece com a quarta muralha de gelo.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyEffect,
  effectPower,
  hasEffect,
  modifierFactor,
  modifierOf,
  removeEffect,
  sumModifiers,
  tickEffects,
  MODIFIER_FLOOR,
  MODIFIER_CEIL,
  areaBlocks,
  areaCovers,
  countAreasOf,
  dropOldestOf,
  expireAreas,
  type ActiveEffect,
  type GroundArea,
} from '../src/index.js';

const buff = (id: string, mods: ActiveEffect['mods'], expiresAt: number): ActiveEffect =>
  ({ id, name: id, good: true, mods, expiresAt });

// ---------------------------------------------------------------------------
// Regra 1 — mesma habilidade não acumula, renova
// ---------------------------------------------------------------------------

test('o mesmo buff duas vezes não vira o dobro', () => {
  // Dois Druidas lançando Pele de Carvalho no mesmo tank não fazem +50 %.
  let lista: ActiveEffect[] = [];
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.25 }, 1000));
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.25 }, 1000));
  assert.equal(lista.length, 1);
  assert.equal(modifierOf(lista, 'defense'), 0.25);
});

test('quando os dois têm a mesma força, vence o que dura mais', () => {
  let lista: ActiveEffect[] = [];
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.25 }, 1000));
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.25 }, 5000));
  assert.equal(lista.length, 1);
  assert.equal(lista[0]!.expiresAt, 5000);
});

test('o buff mais FORTE substitui o mais fraco, inclusive a duração', () => {
  let lista: ActiveEffect[] = [];
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.06 }, 9000));
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.25 }, 2000));
  assert.equal(modifierOf(lista, 'defense'), 0.25);
  assert.equal(lista[0]!.expiresAt, 2000);
});

test('o buff mais FRACO não consegue encurtar o mais forte', () => {
  // O Druida de nível 1 não pode apagar a bênção do Druida de nível 10 — nem
  // por acidente, nem de propósito.
  let lista: ActiveEffect[] = [];
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.25 }, 9000));
  lista = applyEffect(lista, buff('oak_skin', { defense: 0.06 }, 1000));
  assert.equal(modifierOf(lista, 'defense'), 0.25);
  assert.equal(lista[0]!.expiresAt, 9000);
});

// ---------------------------------------------------------------------------
// Regra 2 — habilidades diferentes acumulam
// ---------------------------------------------------------------------------

test('habilidades diferentes somam, mesmo na mesma chave', () => {
  let lista: ActiveEffect[] = [];
  lista = applyEffect(lista, buff('weaken', { physAtk: -0.15 }, 1000));
  lista = applyEffect(lista, buff('nature_plague', { physAtk: -0.10 }, 1000));
  assert.ok(Math.abs(modifierOf(lista, 'physAtk') + 0.25) < 1e-9);
});

test('chaves diferentes convivem sem se atrapalhar', () => {
  let lista: ActiveEffect[] = [];
  lista = applyEffect(lista, buff('weaken', { physAtk: -0.15, magicAtk: -0.15 }, 1000));
  lista = applyEffect(lista, buff('vulnerability', { defense: -0.15 }, 1000));
  const total = sumModifiers(lista);
  assert.ok(Math.abs((total.physAtk ?? 0) + 0.15) < 1e-9);
  assert.ok(Math.abs((total.defense ?? 0) + 0.15) < 1e-9);
});

// ---------------------------------------------------------------------------
// Piso e teto
// ---------------------------------------------------------------------------

test('uma pilha de debuffs nunca zera nem inverte um stat', () => {
  // Sem piso, três debuffs de −40 % dariam dano negativo — e o "golpe" curaria.
  let lista: ActiveEffect[] = [];
  for (let i = 0; i < 6; i++) {
    lista = applyEffect(lista, buff(`d${i}`, { physAtk: -0.4 }, 1000));
  }
  const f = modifierFactor(lista, 'physAtk');
  assert.equal(f, MODIFIER_FLOOR);
  assert.ok(f > 0, 'o fator continua positivo');
});

test('uma pilha de buffs tem teto', () => {
  let lista: ActiveEffect[] = [];
  for (let i = 0; i < 20; i++) {
    lista = applyEffect(lista, buff(`b${i}`, { physAtk: 0.5 }, 1000));
  }
  assert.equal(modifierFactor(lista, 'physAtk'), MODIFIER_CEIL);
});

test('sem nenhum efeito, o fator é 1 — nada muda', () => {
  assert.equal(modifierFactor([], 'physAtk'), 1);
  assert.equal(modifierOf([], 'defense'), 0);
});

test('a força de um efeito conta todas as chaves que ele mexe', () => {
  // É o que faz um buff de duas chaves vencer o de uma só com o mesmo valor.
  assert.ok(effectPower({ physAtk: 0.1, magicAtk: 0.1 }) > effectPower({ physAtk: 0.1 }));
  // E o sinal não importa: −15 % é tão "forte" quanto +15 %.
  assert.equal(effectPower({ physAtk: -0.15 }), effectPower({ physAtk: 0.15 }));
});

// ---------------------------------------------------------------------------
// Expiração
// ---------------------------------------------------------------------------

test('o efeito vencido sai da lista e é devolvido a quem chamou', () => {
  // Quem chama precisa saber QUAIS caíram: é assim que o servidor decide
  // recalcular a ficha e avisar o jogador.
  const lista = [buff('a', { physAtk: 0.1 }, 1000), buff('b', { physAtk: 0.1 }, 5000)];
  const r = tickEffects(lista, 2000);
  assert.equal(r.list.length, 1);
  assert.equal(r.expired.length, 1);
  assert.equal(r.expired[0]!.id, 'a');
});

test('sem nada vencido, a lista volta INTACTA (mesma referência)', () => {
  // Isto não é micro-otimização: o servidor usa "a lista mudou?" para decidir
  // se recalcula a ficha, e recalcular todo mundo a cada tique custaria caro.
  const lista = [buff('a', { physAtk: 0.1 }, 9000)];
  const r = tickEffects(lista, 2000);
  assert.equal(r.list, lista);
  assert.equal(r.expired.length, 0);
});

test('dá para remover e consultar um efeito pelo id', () => {
  const lista = [buff('oak_skin', { defense: 0.2 }, 9000)];
  assert.ok(hasEffect(lista, 'oak_skin'));
  assert.ok(!hasEffect(removeEffect(lista, 'oak_skin'), 'oak_skin'));
});

// ---------------------------------------------------------------------------
// 🌿 Áreas persistentes
// ---------------------------------------------------------------------------

const area = (over: Partial<GroundArea> = {}): GroundArea => ({
  id: 'a1', skillId: 'blizzard', ownerId: 'p1', kind: 'damage',
  x: 10, y: 10, floor: 0, radius: 2,
  expiresAt: 10000, nextTickAt: 0, tickMs: 1000, power: 5,
  hitsPlayers: true, hitsCreatures: true, blocks: false, fx: 'blizzard',
  ...over,
});

test('a área cobre pelo Chebyshev, como o resto do combate', () => {
  const a = area({ x: 10, y: 10, radius: 2 });
  assert.ok(areaCovers(a, 10, 10, 0), 'o centro');
  assert.ok(areaCovers(a, 12, 12, 0), 'a diagonal do raio ainda está dentro');
  assert.ok(!areaCovers(a, 13, 10, 0), 'um tile além, fora');
});

test('a área não atravessa andares', () => {
  // O andar de cima não pode pegar a nevasca do andar de baixo.
  assert.ok(!areaCovers(area({ floor: 0 }), 10, 10, 1));
});

test('só a área bloqueante impede a passagem', () => {
  const nevasca = area({ blocks: false });
  const parede = area({ id: 'a2', skillId: 'ice_wall', kind: 'wall', blocks: true, radius: 0 });
  assert.ok(!areaBlocks([nevasca], 10, 10, 0), 'atravessar a nevasca dói, mas dá');
  assert.ok(areaBlocks([parede], 10, 10, 0), 'a muralha de gelo, não');
});

test('as áreas vencidas somem e são devolvidas para o cliente apagar', () => {
  const lista = [area({ id: 'a1', expiresAt: 1000 }), area({ id: 'a2', expiresAt: 9000 })];
  const r = expireAreas(lista, 5000);
  assert.equal(r.areas.length, 1);
  assert.equal(r.expired[0]!.id, 'a1');
});

test('a contagem por dono e por habilidade é o que limita a Ice Wall', () => {
  const lista = [
    area({ id: 'a1', ownerId: 'p1', skillId: 'ice_wall' }),
    area({ id: 'a2', ownerId: 'p1', skillId: 'ice_wall' }),
    area({ id: 'a3', ownerId: 'p2', skillId: 'ice_wall' }),
    area({ id: 'a4', ownerId: 'p1', skillId: 'blizzard' }),
  ];
  assert.equal(countAreasOf(lista, 'p1', 'ice_wall'), 2);
  assert.equal(countAreasOf(lista, 'p2', 'ice_wall'), 1);
  assert.equal(countAreasOf(lista, 'p1', 'fire_wall'), 0);
});

test('ao estourar o limite, cai a mais ANTIGA — e só a do próprio dono', () => {
  const lista = [
    area({ id: 'velha', ownerId: 'p1', skillId: 'ice_wall', expiresAt: 2000 }),
    area({ id: 'nova', ownerId: 'p1', skillId: 'ice_wall', expiresAt: 9000 }),
    area({ id: 'alheia', ownerId: 'p2', skillId: 'ice_wall', expiresAt: 100 }),
  ];
  const velha = dropOldestOf(lista, 'p1', 'ice_wall');
  assert.equal(velha?.id, 'velha', 'a de p2 vence antes, mas não é dele');
});

test('sem área daquele dono, não há o que descartar', () => {
  assert.equal(dropOldestOf([area({ ownerId: 'p2' })], 'p1', 'ice_wall'), null);
});
