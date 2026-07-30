import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMOR_CLASS_AFFINITY,
  CREATURES,
  ITEMS,
  MODEL_ENTRIES,
  MODEL_FAMILIES,
  MODEL_INDEX,
  SLOT_DEF_SHARE,
  TIER_BANDS,
  armorDefFor,
  craftableModel,
  craftableModels,
  equipDefPower,
  equipPower,
  modelKind,
  modelLevelOf,
  weaponAtkFor,
} from '../src/index.js';

test('a curva nasce nas peças que o jogo já usava', () => {
  // 🔴 Este é o teste que ancora tudo. Os `def` do catálogo antigo não foram
  // escolhidos ao acaso: com o `atk` das armas iniciais (8) como unidade, eles
  // caem exatos nas frações de SLOT_DEF_SHARE. Se a curva se afastar das peças
  // que o jogo já usa, o catálogo passa a viver em duas escadas diferentes.
  assert.equal(equipPower(1), 8);
  assert.equal(equipDefPower(1), 8);
  assert.equal(weaponAtkFor('sword', 1), ITEMS.short_sword!.atk);
  assert.equal(weaponAtkFor('staff', 1), ITEMS.apprentice_staff!.atk);
  assert.equal(armorDefFor('armor', 1, 'light'), ITEMS.leather_armor!.def);
  assert.equal(armorDefFor('pants', 1, 'light'), ITEMS.leather_pants!.def);
  assert.equal(armorDefFor('helmet', 1, 'light'), ITEMS.leather_helmet!.def);
  assert.equal(armorDefFor('boots', 1, 'light'), ITEMS.leather_boots!.def);
  assert.equal(armorDefFor('shield', 1), ITEMS.wooden_shield!.def);
});

test('todo modelo virou item, e nenhum kind colidiu', () => {
  const vistos = new Set<string>();
  for (const e of MODEL_ENTRIES) {
    assert.ok(!vistos.has(e.kind), `kind duplicado: ${e.kind} (${e.name})`);
    vistos.add(e.kind);
    assert.ok(ITEMS[e.kind], `${e.name} não virou item`);
    assert.equal(ITEMS[e.kind]!.name, e.name, `${e.kind} tem nome divergente`);
    assert.equal(ITEMS[e.kind]!.category, 'equip');
  }
  assert.equal(MODEL_ENTRIES.length, 113);
});

test('o kind sobrevive aos acentos do português', () => {
  // 🔴 O `kind` fica gravado em save de jogador, então ele não pode mudar. A
  // derivação tira os diacríticos via NFD — estes são os casos que mais têm
  // chance de sair torto, e por isso estão travados um a um.
  assert.equal(modelKind('Maça Primordial'), 'maca_primordial');
  assert.equal(modelKind('Espada Anã'), 'espada_ana');
  assert.equal(modelKind('Machado da Ruína'), 'machado_da_ruina');
  assert.equal(modelKind('Lança Dracônica'), 'lanca_draconica');
  assert.equal(modelKind('Grimório do Aprendiz'), 'grimorio_do_aprendiz');
  assert.equal(modelKind('Cajado do Sábio'), 'cajado_do_sabio');
  for (const e of MODEL_ENTRIES) {
    assert.match(e.kind, /^[a-z0-9_]+$/, `${e.name} gerou um kind inválido: ${e.kind}`);
  }
});

test('o nível de cada modelo cabe na faixa do tier dele', () => {
  for (const e of MODEL_ENTRIES) {
    if (!e.generated) continue; // âncora fica fixada no piso, ver catalog.ts
    const [lo, hi] = TIER_BANDS[e.tier];
    assert.ok(
      e.level >= lo && e.level <= hi,
      `${e.name} está em Lv.${e.level}, fora da faixa ${lo}–${hi} do tier ${e.tier}`,
    );
  }
});

test('a escada de cada família nunca desce', () => {
  // Modelo mais avançado não pode ser mais fraco que um anterior — seria degrau
  // de progressão que pune quem sobe.
  for (const fam of MODEL_FAMILIES) {
    const gerados = MODEL_ENTRIES
      .filter((e) => e.familyId === fam.id && e.generated)
      .sort((x, y) => x.level - y.level);
    let anterior = 0;
    for (const e of gerados) {
      const it = ITEMS[e.kind]!;
      const poder = (it.atk ?? 0) + (it.def ?? 0);
      assert.ok(poder >= anterior, `${fam.name}: ${e.name} é mais fraco que o degrau anterior`);
      anterior = poder;
    }
  }
});

test('a peça âncora nunca é ultrapassada em preço pelo degrau seguinte por engano', () => {
  // As âncoras são o equipamento de balcão do nível 1 e ficam fixadas em Lv.1,
  // mesmo quando o documento as lista no meio da escada inicial (a Adaga Curta
  // vem depois de Faca e Punhal no cap. 17).
  for (const e of MODEL_ENTRIES) {
    if (e.generated) continue;
    assert.equal(e.level, 1, `${e.name} é âncora e deveria estar fixada em Lv.1`);
  }
});

test('arma mágica bate mais fraco que arma física no mesmo nível', () => {
  // `magicAtk` cresce mais por ponto de skill que `physAtk` (skillMagic × 2
  // contra skillPhys × 1,5), então o mesmo `atk` rende mais na mão do
  // conjurador. É a razão de o Cajado do Aprendiz sempre ter sido 6 e não 8.
  for (const nivel of [1, 20, 60, 100]) {
    assert.ok(
      weaponAtkFor('staff', nivel) < weaponAtkFor('sword', nivel),
      `no Lv.${nivel} o cajado não deveria empatar com a espada`,
    );
  }
});

test('cap. 21: a Varinha é família própria dentro de staff, sem WeaponType novo', () => {
  // Decisão do dono em 2026-07-30. Criar tipo de arma só para ela significaria
  // inventar identidade de combate e uma proficiência paralela ao Magic Level.
  const varinhas = MODEL_ENTRIES.filter((e) => e.familyId === 'varinha');
  assert.equal(varinhas.length, 6);
  for (const v of varinhas) {
    assert.equal(v.weaponType, 'staff', `${v.name} deveria usar a proficiência de cajado`);
    assert.equal(ITEMS[v.kind]!.slot, 'weapon');
  }
});

test('cap. 22: o Livro Arcano é foco de mão secundária, não arma', () => {
  // Decisão do dono em 2026-07-30. No slot `shield`, a build mágica fica
  // completa (Cajado na mão principal, Livro na secundária), que é a leitura
  // natural do cap. 38 — ele lista Cajados E Livros para o Sorcerer.
  const livros = MODEL_ENTRIES.filter((e) => e.familyId === 'livro');
  assert.equal(livros.length, 7);
  for (const l of livros) {
    assert.equal(l.weaponType, undefined, `${l.name} não pode ser arma`);
    assert.equal(ITEMS[l.kind]!.slot, 'shield');
    assert.equal(ITEMS[l.kind]!.armorClass, 'robe');
    assert.equal(ITEMS[l.kind]!.atk, undefined);
  }
  // A classe Veste é o que faz o tooltip dizer para quem a peça foi feita.
  assert.deepEqual(ARMOR_CLASS_AFFINITY.robe, ['sorcerer', 'druid']);
});

test('cap. 23: escudo não tem classe de armadura, e isso é deliberado', () => {
  // O cap. 38 divide Leve/Média/Pesada/Veste só para peças de proteção do
  // corpo, e não põe escudo em nenhuma. Sem classe, o multiplicador é neutro —
  // que é o que mantém o Escudo de Madeira em def 4.
  for (const e of MODEL_ENTRIES.filter((x) => x.familyId === 'escudo')) {
    assert.equal(e.armorClass, undefined, `${e.name} não deveria ter classe de armadura`);
  }
});

test('🔴 a defesa de um set completo não pode zerar o dano do bestiário', () => {
  // `resolveDamage` mitiga por SUBTRAÇÃO PLANA: max(0, dano − def). Defesa não
  // tem retorno decrescente — a partir de um ponto ela ZERA o dano e o jogador
  // fica invulnerável. É por isso que DEF_COEF é três vezes menor que ATK_COEF.
  //
  // O teto do bestiário é baixo: a criatura mais forte bate com 24, e a
  // variância de computeHit chega a +15 %.
  const maisForte = Math.max(...Object.values(CREATURES).map((c) => c.strength));
  const tetoDeDano = maisForte * 1.15;

  // O set completo soma todos os SLOT_DEF_SHARE. Com as peças de couro de hoje
  // (leves, Lv.1) o jogo já opera perto do limite — e é isso que o teste trava.
  const somaDosShares = Object.values(SLOT_DEF_SHARE).reduce((s, v) => s + v, 0);
  const setNoNivel1 = equipDefPower(1) * somaDosShares;
  assert.ok(
    setNoNivel1 < tetoDeDano,
    `um set completo de Lv.1 soma ${setNoNivel1.toFixed(1)} de defesa contra um teto`
    + ` de dano de ${tetoDeDano.toFixed(1)} — o jogo já nasceria com o jogador imune`,
  );

  // ⚠️ E o aviso de para onde isso vai: em algum ponto do meio do jogo a curva
  // cruza o teto, porque não existe criatura de Tier IV para bater mais forte.
  // O que impede o problema hoje é a OBTENÇÃO — VENDOR_STOCK é lista curada, e o
  // drop e a bancada são limitados. Se este teste começar a falhar, a resposta
  // não é baixar DEF_COEF: é o bestiário que precisa crescer.
  const setNoTopo = equipDefPower(100) * somaDosShares;
  assert.ok(setNoTopo > tetoDeDano, 'se o topo couber no teto, o bestiário já cresceu');
});

test('🔴 uma Receita Comum não fabrica o topo do catálogo', () => {
  // O bug que o catálogo teria criado: a bancada oferecia todo item `equip` e o
  // servidor aceitava qualquer `kind`. Com 13 peças de nível 1 isso funcionava;
  // com 113 modelos, um recém-nascido forjaria o Machado Primordial.
  assert.equal(craftableModel('machado_primordial', 'common'), false);
  assert.equal(craftableModel('machado_primordial', 'rare'), false);
  assert.equal(craftableModel('machado_primordial', 'legendary'), true);
  // O que ela alcança é o tier inicial — inclusive as peças âncora.
  assert.equal(craftableModel('espada_enferrujada', 'common'), true);
  assert.equal(craftableModel('short_sword', 'common'), true);
  // E o degrau do meio exige receita do meio.
  assert.equal(craftableModel('claymore', 'common'), false);
  assert.equal(craftableModel('claymore', 'rare'), true);
});

test('a trava de fabricação vale só para peça de catálogo', () => {
  // ⚠️ Mochila, bolsa e as peças de couro não são modelos do Doc 4. Elas já eram
  // fabricáveis antes do catálogo, e negar por não estarem nele tiraria do jogo
  // algo que funcionava. Quem chama é que decide — `craftableModel` responde
  // "não" para o desconhecido, que é o lado seguro para um handler de rede.
  assert.equal(craftableModel('leather_armor', 'common'), false);
  assert.equal(craftableModel('health_potion', 'relic'), false);
  assert.equal(MODEL_INDEX.leather_armor, undefined);
});

test('a escada de raridade cobre o catálogo inteiro, sem modelo inalcançável', () => {
  // Se algum tier ficasse acima do teto da melhor receita, haveria modelo que
  // ninguém fabrica nunca — item que existe só para ocupar espaço.
  const alcancados = new Set(craftableModels('relic').map((e) => e.kind));
  for (const e of MODEL_ENTRIES) {
    if (e.unique) continue; // cap. 40: artefato único não sai de bancada
    assert.ok(alcancados.has(e.kind), `${e.name} não é fabricável por receita nenhuma`);
  }
});

test('modelLevelOf conhece as peças do catálogo e ignora o resto', () => {
  assert.equal(modelLevelOf('short_sword'), 1);
  assert.equal(modelLevelOf('machado_primordial'), 100);
  // ⚠️ Não existe "Espada Primordial": o cap. 13 é o único catálogo de arma que
  // **não tem Tier Avançado** — ele para na Espada Anã. Todas as outras famílias
  // chegam ao Celestial/Primordial. É lacuna do documento, não do código, e está
  // travada aqui para ninguém "consertar" inventando os nomes que faltam.
  assert.equal(modelLevelOf('espada_primordial'), 0);
  assert.equal(
    MODEL_ENTRIES.filter((e) => e.familyId === 'espada' && e.tier === 'avancado').length,
    0,
    'se o doc ganhar Espadas de tier avançado, este teste avisa para registrá-las',
  );
  assert.equal(modelLevelOf('health_potion'), 0, 'poção não é peça de catálogo');
  assert.equal(modelLevelOf('nao_existe'), 0);
  assert.equal(MODEL_INDEX.espada_longa!.familyId, 'espada');
});

test('todo equipamento gerado tem preço, para nada virar lixo invendável', () => {
  // "Nada é lixo" abre items.ts. Peça sem preço vale zero no comerciante, que é
  // o que ensina o jogador a largar loot no chão.
  for (const e of MODEL_ENTRIES) {
    if (!e.generated) continue;
    const it = ITEMS[e.kind]!;
    if (it.unique) continue; // cap. 40: artefato único não tem balcão
    assert.ok(it.buyPrice > 0, `${e.name} não tem preço`);
  }
});
