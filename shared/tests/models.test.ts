import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEMS,
  MODEL_ENTRIES,
  MODEL_FAMILIES,
  PENDING_MODEL_CATEGORIES,
  TIER_RANK,
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

test('cada FAMÍLIA começa no tier inicial e termina no mais alto', () => {
  // As listas do doc são ordenadas do mais simples ao mais forte, e a ordem é o
  // que permite inferir a faixa. Se alguém embaralhar, a inferência se perde.
  //
  // 🔴 A validação é por FAMÍLIA, não por tipo de arma: Cajados e Varinhas são
  // famílias distintas que dividem o `WeaponType` staff, então a escada de tiers
  // reinicia entre elas de propósito. Validar por tipo acusaria a Varinha
  // Simples de "regredir" logo depois do Cajado Primordial.
  for (const fam of MODEL_FAMILIES) {
    assert.equal(fam.models[0]!.tier, 'inicial', `${fam.name} não começa no inicial`);
    let anterior = -1;
    for (const mod of fam.models) {
      const r = TIER_RANK[mod.tier];
      assert.ok(r >= anterior, `${fam.name}: ${mod.name} regride de faixa`);
      anterior = r;
    }
  }
});

test('todo modelo do catálogo virou item jogável', () => {
  const { total, implemented } = modelCoverage();
  // 90 de arma (cap. 13–20) + 6 Varinhas + 7 Livros + 10 Escudos = 113, mais 64
  // de proteção (21 capacetes, 23 peitorais, 10 calças, 10 botas) = 177, mais 28
  // de acessório (18 anéis, 10 colares) = 205.
  assert.equal(total, 205, `o doc fixa 205 nomes, contei ${total}`);
  // `implemented` conta só o que está escrito à mão em items.ts — as peças
  // âncora. O resto é gerado, e a cobertura de verdade se confere em ITEMS.
  assert.equal(implemented, 13, 'as 13 peças âncora deveriam estar mapeadas');
  for (const fam of MODEL_FAMILIES) {
    for (const mod of fam.models) {
      const entry = MODEL_ENTRIES.find((e) => e.name === mod.name);
      assert.ok(entry, `${mod.name} não foi resolvido`);
      assert.ok(ITEMS[entry!.kind], `${mod.name} não virou item (${entry!.kind})`);
    }
  }
});

test('as categorias que continuam pendentes têm os nomes registrados', () => {
  // Varinha, Livro e Escudo SAÍRAM daqui em 2026-07-30 — viraram famílias.
  // Sobram as que exigem slot novo no paperdoll e as que dependem de sistemas
  // inexistentes (coleta, exploração, guildas).
  for (const nome of ['varinha', 'livro', 'escudo']) {
    assert.ok(
      !(nome in PENDING_MODEL_CATEGORIES),
      `${nome} virou família e não deveria continuar pendente`,
    );
  }
  assert.ok(PENDING_MODEL_CATEGORIES.luvas.length >= 9);
  assert.ok(PENDING_MODEL_CATEGORIES.capas.length >= 8);
  assert.ok(PENDING_MODEL_CATEGORIES.braceletes.length >= 8);
  assert.ok(PENDING_MODEL_CATEGORIES.cintos.length >= 8);
  assert.ok(PENDING_MODEL_CATEGORIES.broches.length >= 8);
  // 🔴 O "Machado de Lenhador" do cap. 35 colide com a arma do cap. 14. Fica
  // sendo a arma; a ferramenta não entra nem como pendência.
  assert.ok(!PENDING_MODEL_CATEGORIES.ferramentas.includes('Machado de Lenhador' as never));
  assert.equal(ITEMS.hand_axe!.name, 'Machado de Lenhador');
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
