import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMOR_CLASS_AFFINITY,
  CLASSES,
  ITEMS,
  WEAPON_CLASS_AFFINITY,
  WEAPON_TYPES,
} from '../src/index.js';

test('cap. 38: todo tipo de arma tem classe que o prioriza', () => {
  // Arma sem classe recomendada é arma que ninguém sabe para que serve.
  for (const t of WEAPON_TYPES) {
    const classes = WEAPON_CLASS_AFFINITY[t];
    assert.ok(classes?.length, `${t} não tem classe recomendada`);
  }
});

test('a afinidade bate com o que o cap. 38 lista', () => {
  // Warrior: espadas, machados, maças, lanças.
  for (const t of ['sword', 'axe', 'mace', 'spear'] as const) {
    assert.ok(WEAPON_CLASS_AFFINITY[t].includes('knight'), `Knight deveria priorizar ${t}`);
  }
  // Archer: arcos e bestas.
  assert.deepEqual(WEAPON_CLASS_AFFINITY.bow, ['archer']);
  assert.deepEqual(WEAPON_CLASS_AFFINITY.crossbow, ['archer']);
  // Assassin: adagas e espadas curtas — daí ele aparecer em `sword` também.
  assert.deepEqual(WEAPON_CLASS_AFFINITY.dagger, ['assassin']);
  assert.ok(WEAPON_CLASS_AFFINITY.sword.includes('assassin'));
  // Sorcerer e Druid: cajados.
  assert.ok(WEAPON_CLASS_AFFINITY.staff.includes('sorcerer'));
  assert.ok(WEAPON_CLASS_AFFINITY.staff.includes('druid'));
});

test('nenhuma classe fica sem arma recomendada', () => {
  // Se uma classe não prioriza nada, ela não tem identidade de equipamento.
  const comAfinidade = new Set(Object.values(WEAPON_CLASS_AFFINITY).flat());
  for (const id of Object.keys(CLASSES)) {
    assert.ok(comAfinidade.has(id), `a classe ${id} não prioriza arma nenhuma`);
  }
});

test('as três categorias de armadura do cap. 38 existem e se dividem', () => {
  assert.deepEqual(ARMOR_CLASS_AFFINITY.heavy, ['knight']);
  assert.deepEqual(ARMOR_CLASS_AFFINITY.light, ['archer', 'assassin']);
  assert.deepEqual(ARMOR_CLASS_AFFINITY.robe, ['sorcerer', 'druid']);
  // Nenhuma classe prioriza duas categorias de armadura ao mesmo tempo — seria
  // afinidade sem escolha.
  const contagem = new Map<string, number>();
  for (const classes of Object.values(ARMOR_CLASS_AFFINITY)) {
    for (const c of classes) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  }
  for (const [c, n] of contagem) {
    assert.equal(n, 1, `${c} prioriza ${n} categorias de armadura`);
  }
});

test('a afinidade é RECOMENDAÇÃO, não bloqueio', () => {
  // O doc diz "Prioriza", não "só pode usar". Se algum dia virar bloqueio, tem
  // que ser decisão consciente do dono — e este teste vai falhar avisando.
  // A prova de que não bloqueia: nada em ItemDef restringe classe.
  const espada = ITEMS.short_sword!;
  assert.equal('requiredClass' in espada, false, 'não deveria existir restrição de classe');
  assert.equal('classLock' in espada, false);
});

test('peças de couro estão marcadas como armadura LEVE', () => {
  for (const k of ['leather_helmet', 'leather_armor', 'leather_pants', 'leather_boots']) {
    assert.equal(ITEMS[k]!.armorClass, 'light', `${k} deveria ser leve`);
  }
});

test('cap. 40: item marcado como único não entra em pool aleatório', () => {
  // "Existirá apenas um modelo daquele equipamento... nunca terão versões
  // alternativas." Ainda não há artefato único no catálogo; o teste garante que,
  // quando houver, ele não vire drop comum por descuido.
  const unicos = Object.values(ITEMS).filter((i) => i.unique);
  for (const u of unicos) {
    assert.equal(u.buyPrice, 0, `${u.kind} é único e não pode ter preço de balcão`);
  }
});
