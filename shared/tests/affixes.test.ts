import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFFIXES,
  CURSES,
  PREFIXES,
  SUFFIXES,
  affixDamageType,
  composeItemName,
  prefixesFor,
  rollAffixNames,
  rollItem,
  suffixesFor,
  type AffixId,
} from '../src/index.js';

test('DD-AFFIX-003/004: os catálogos têm o tamanho que o doc lista', () => {
  // 40 prefixos (10 ofensivos + 9 defensivos + 8 mágicos + 8 elementais + 5 especiais)
  assert.equal(Object.keys(PREFIXES).length, 40);
  // 30 sufixos (5 classes + 7 criaturas + 5 virtudes + 5 natureza + 4 celestiais + 4 corrupção)
  assert.equal(Object.keys(SUFFIXES).length, 30);
});

test('todo grupo do doc está representado', () => {
  const gruposPre = new Set(Object.values(PREFIXES).map((p) => p.group));
  assert.deepEqual(
    [...gruposPre].sort(),
    ['defensive', 'elemental', 'magic', 'offensive', 'special'],
  );
  const gruposSuf = new Set(Object.values(SUFFIXES).map((s) => s.group));
  assert.deepEqual(
    [...gruposSuf].sort(),
    ['celestial', 'class', 'corruption', 'creature', 'nature', 'virtue'],
  );
});

test('todo modificador aponta para efeito mecânico que EXISTE', () => {
  // A camada de nome não pode prometer efeito que `weapons.ts` não implementa —
  // seria tooltip mentindo para o jogador.
  const validos = new Set(Object.keys(AFFIXES) as AffixId[]);
  for (const p of Object.values(PREFIXES)) {
    assert.ok(p.grants.length > 0, `${p.id} não concede nada`);
    for (const g of p.grants) assert.ok(validos.has(g), `${p.id} concede ${g}, que não existe`);
  }
  for (const s of Object.values(SUFFIXES)) {
    assert.ok(s.grants.length > 0, `${s.id} não concede nada`);
    for (const g of s.grants) assert.ok(validos.has(g), `${s.id} concede ${g}, que não existe`);
  }
});

test('DD-AFFIX-001: o nome se compõe como o doc desenha', () => {
  assert.equal(composeItemName('Espada Longa'), 'Espada Longa');
  assert.equal(composeItemName('Espada Longa', 'feroz'), 'Espada Longa Feroz');
  assert.equal(
    composeItemName('Espada Longa', 'feroz', 'do_dragao'),
    'Espada Longa Feroz do Dragão',
  );
  // Sufixo sozinho também funciona: nem todo item tem prefixo.
  assert.equal(composeItemName('Adaga', undefined, 'do_lobo'), 'Adaga do Lobo');
});

test('id inexistente não quebra o nome, só é ignorado', () => {
  // Item salvo antes de um prefixo ser renomeado não pode virar crash.
  assert.equal(composeItemName('Espada', 'nao_existe'), 'Espada');
});

test('DD-AFFIX-009: arma prioriza ofensivo, armadura prioriza defensivo', () => {
  const emArma = prefixesFor('weapon', 'legendary').map((p) => p.group);
  const emArmadura = prefixesFor('armor', 'legendary').map((p) => p.group);
  assert.ok(emArma.includes('offensive'));
  assert.ok(emArma.includes('elemental'), 'elemento é coisa de arma');
  assert.ok(!emArma.includes('defensive'), 'prefixo defensivo não nasce em arma');
  assert.ok(emArmadura.includes('defensive'));
  assert.ok(!emArmadura.includes('offensive'), 'prefixo ofensivo não nasce em armadura');
  assert.ok(!emArmadura.includes('elemental'), 'armadura não muda tipo de dano');
});

test('raridade mínima filtra: item Comum não ganha modificador nenhum', () => {
  assert.equal(prefixesFor('weapon', 'common').length, 0);
  assert.equal(suffixesFor('weapon', 'common').length, 0);
  // E a lista só cresce conforme a raridade sobe.
  assert.ok(prefixesFor('weapon', 'epic').length > prefixesFor('weapon', 'uncommon').length);
});

test('os especiais e celestiais são reservados para raridade alta', () => {
  const emIncomum = new Set(prefixesFor('weapon', 'uncommon').map((p) => p.group));
  assert.ok(!emIncomum.has('special'), 'Celestial/Primordial não caem em Incomum');
  const sufIncomum = suffixesFor('weapon', 'uncommon');
  assert.equal(sufIncomum.length, 0, 'sufixo começa em Raro');
});

test('só prefixo ELEMENTAL muda o tipo de dano', () => {
  assert.equal(affixDamageType('flamejante'), 'fire');
  assert.equal(affixDamageType('glacial'), 'ice');
  assert.equal(affixDamageType('tempestuoso'), 'electric');
  assert.equal(affixDamageType('luminoso'), 'holy');
  assert.equal(affixDamageType('sombrio'), 'dark');
  assert.equal(affixDamageType('natural'), 'poison');
  // Ofensivo, defensivo e mágico não mexem no tipo.
  assert.equal(affixDamageType('feroz'), undefined);
  assert.equal(affixDamageType('robusto'), undefined);
  assert.equal(affixDamageType('arcano'), undefined);
  assert.equal(affixDamageType(undefined), undefined);
});

test('nenhum elemento fora dos sete de DD-ELM-002', () => {
  // "Terreno" e "Marinho" não têm elemento próprio no doc; foram mapeados para
  // Físico e Gelo. Este teste garante que ninguém invente um oitavo tipo.
  const sete = ['physical', 'fire', 'ice', 'electric', 'poison', 'holy', 'dark'];
  for (const p of Object.values(PREFIXES)) {
    if (p.damageType) {
      assert.ok(sete.includes(p.damageType), `${p.id} usa elemento inválido: ${p.damageType}`);
    }
  }
});

test('DD-AFFIX-007: maldição sempre dá de um lado e cobra do outro', () => {
  for (const c of Object.values(CURSES)) {
    assert.ok(c.boon, `${c.id} não tem bônus`);
    assert.ok(c.bane, `${c.id} não tem custo`);
    assert.notEqual(c.boon, c.bane, `${c.id} dá e tira a mesma coisa`);
  }
});

test('rollAffixNames respeita raridade e é determinístico com rng fixo', () => {
  // Comum não ganha nada.
  assert.deepEqual(rollAffixNames('weapon', 'common', () => 0), {});

  // Incomum ganha prefixo mas não sufixo (chance 0 nessa faixa).
  const inc = rollAffixNames('weapon', 'uncommon', () => 0);
  assert.ok(inc.prefix, 'Incomum deveria ganhar prefixo');
  assert.equal(inc.suffix, undefined);

  // Relíquia ganha sufixo sempre (chance 1).
  const rel = rollAffixNames('weapon', 'relic', () => 0);
  assert.ok(rel.prefix);
  assert.ok(rel.suffix);
});

test('rollItem carrega os nomes recebidos para dentro da instância', () => {
  const roll = rollItem('epic', 'weapon', () => 0.5, { prefix: 'feroz', suffix: 'do_dragao' });
  assert.equal(roll.prefix, 'feroz');
  assert.equal(roll.suffix, 'do_dragao');
  // Sem nomes, os campos ficam ausentes em vez de virar string vazia.
  const sem = rollItem('epic', 'weapon', () => 0.5);
  assert.equal(sem.prefix, undefined);
  assert.equal(sem.suffix, undefined);
});

test('o cadastro do DD-AFFIX-012 está preenchido em todo modificador', () => {
  for (const m of [...Object.values(PREFIXES), ...Object.values(SUFFIXES)]) {
    assert.ok(m.id && m.name, 'id e nome obrigatórios');
    assert.ok(m.compat.equip.length > 0, `${m.id} precisa dizer onde pode nascer`);
    assert.ok(m.compat.minRarity, `${m.id} precisa de raridade mínima`);
    assert.ok(m.application.sources.length > 0, `${m.id} precisa de origem`);
  }
});
