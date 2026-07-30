import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEMS,
  PENDING_MODEL_CATEGORIES,
  WEAPON_MODELS,
  WEAPON_TYPES,
  implementedModels,
  modelCoverage,
} from '../src/index.js';

test('todo tipo de arma tem catálogo de modelos', () => {
  for (const t of WEAPON_TYPES) {
    assert.ok(WEAPON_MODELS[t]?.length, `${t} sem modelos`);
  }
});

test('os modelos que apontam para item existem de verdade em ITEMS', () => {
  // O `kind` é a ponte entre o nome canônico do doc e o item jogável. Ponte
  // quebrada significa que o nome no catálogo não corresponde a nada.
  for (const [tipo, modelos] of Object.entries(WEAPON_MODELS)) {
    for (const mod of modelos) {
      if (!mod.kind) continue;
      const item = ITEMS[mod.kind];
      assert.ok(item, `${mod.name} aponta para ${mod.kind}, que não existe`);
      assert.equal(item!.weaponType, tipo, `${mod.kind} não é do tipo ${tipo}`);
    }
  }
});

test('o NOME do item bate com o nome canônico do documento', () => {
  // É a razão de este arquivo existir: impedir "Espada Larga" onde o doc diz
  // "Espada Longa". Se alguém renomear um item, este teste avisa.
  for (const modelos of Object.values(WEAPON_MODELS)) {
    for (const mod of modelos) {
      if (!mod.kind) continue;
      assert.equal(
        ITEMS[mod.kind]!.name, mod.name,
        `o item ${mod.kind} se chama "${ITEMS[mod.kind]!.name}", o doc diz "${mod.name}"`,
      );
    }
  }
});

test('nenhum modelo aparece duas vezes, dentro ou entre os tipos', () => {
  const vistos = new Set<string>();
  for (const modelos of Object.values(WEAPON_MODELS)) {
    for (const mod of modelos) {
      assert.ok(!vistos.has(mod.name), `modelo duplicado: ${mod.name}`);
      vistos.add(mod.name);
    }
  }
});

test('cada tipo começa no tier inicial e termina no mais alto', () => {
  // As listas do doc são ordenadas do mais simples ao mais forte, e a ordem é o
  // que permite inferir a faixa. Se alguém embaralhar, a inferência se perde.
  const rank = { inicial: 0, intermediario: 1, avancado: 2 };
  for (const [tipo, modelos] of Object.entries(WEAPON_MODELS)) {
    assert.equal(modelos[0]!.tier, 'inicial', `${tipo} não começa no inicial`);
    let anterior = -1;
    for (const mod of modelos) {
      const r = rank[mod.tier];
      assert.ok(r >= anterior, `${tipo}: ${mod.name} regride de faixa`);
      anterior = r;
    }
  }
});

test('o catálogo é muito maior que o implementado — e isso é esperado', () => {
  const { total, implemented } = modelCoverage();
  // 90 modelos de ARMA nos cap. 13–20, mais 23 nas categorias pendentes
  // (Varinha, Livro e Escudo) = 113 nomes que o documento fixa.
  assert.ok(total >= 90, `o doc define 90 modelos de arma, contei ${total}`);
  assert.ok(implemented >= 8, 'as 8 armas do jogo deveriam estar mapeadas');
  // Preencher o resto exige atribuir atk a cada um, e o doc não dá número
  // nenhum — dos onze capítulos só o das Espadas tem descrição qualitativa.
  assert.ok(implemented < total, 'se isto empatar, o catálogo foi preenchido');
});

test('as categorias pendentes têm os nomes registrados', () => {
  // Varinha e Livro exigiriam WeaponType novo; Escudo ocupa outro slot. Os nomes
  // ficam guardados para ninguém reinventá-los quando a decisão for tomada.
  assert.ok(PENDING_MODEL_CATEGORIES.varinha.length >= 6);
  assert.ok(PENDING_MODEL_CATEGORIES.livro.length >= 7);
  assert.ok(PENDING_MODEL_CATEGORIES.escudo.length >= 10);
  // O Escudo de Madeira já existe como item, e o nome tem que casar.
  assert.ok(PENDING_MODEL_CATEGORIES.escudo.includes(ITEMS.wooden_shield!.name));
});

test('implementedModels devolve só o que é jogável', () => {
  for (const t of WEAPON_TYPES) {
    for (const mod of implementedModels(t)) {
      assert.ok(mod.kind, `${mod.name} veio sem kind`);
    }
  }
  // Cada tipo tem exatamente uma arma implementada hoje.
  assert.equal(implementedModels('sword').length, 1);
});
