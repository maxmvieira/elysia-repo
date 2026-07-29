import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMON_SMITH_MAX,
  FRAGMENT_ITEM,
  FRAGMENTS_PER_CRAFT,
  ITEMS,
  RARITIES,
  rollFragmentDrop,
  MIN_FRAGMENTS_FOR_CHANCE,
  canCraft,
  craftXp,
  needsMasterSmith,
  rarityChances,
  rarityRank,
  rollCraft,
  upgradeChance,
  type FragmentBundle,
} from '../src/index.js';

const cheio = (b: FragmentBundle): FragmentBundle => b;

test('DD-PROF-022: a chance é proporcional à quantidade de fragmentos', () => {
  // O exemplo literal do doc.
  const c = rarityChances({ common: 50, uncommon: 50 });
  assert.equal(c.common, 0.5);
  assert.equal(c.uncommon, 0.5);

  const c2 = rarityChances({ rare: 20, epic: 30, legendary: 50 });
  assert.equal(c2.rare, 0.2);
  assert.equal(c2.epic, 0.3);
  assert.equal(c2.legendary, 0.5);
});

test('raridade abaixo do mínimo não entra na tabela — é a regra anti-exploit', () => {
  // O caso que o doc cita: 1 Lendário + 99 Comuns não pode dar 1 % de Lendário
  // por um custo irrisório.
  const c = rarityChances({ common: 99, legendary: 1 });
  assert.equal(c.legendary, undefined, 'um único Lendário não compra chance');
  assert.equal(c.common, 1, 'só o Comum qualificou, então leva 100 %');
});

test('fragmento fraco NÃO rebaixa o resultado, só deixa de contribuir', () => {
  // "O crafting nunca gera um item inútil": com Raro/Épico/Lendário na bancada
  // e Comum abaixo do mínimo, é IMPOSSÍVEL sair Comum.
  const c = rarityChances({ common: 5, rare: 30, epic: 30, legendary: 40 });
  assert.equal(c.common, undefined);
  const soma = Object.values(c).reduce((s, p) => s + p, 0);
  assert.ok(Math.abs(soma - 1) < 1e-9, 'as chances renormalizam para 100 %');
});

test('mínimo exato qualifica; um a menos não', () => {
  const dentro = rarityChances({ epic: MIN_FRAGMENTS_FOR_CHANCE, common: 80 });
  assert.ok(dentro.epic);
  const fora = rarityChances({ epic: MIN_FRAGMENTS_FOR_CHANCE - 1, common: 80 });
  assert.equal(fora.epic, undefined);
});

test('não fabrica sem fragmentos suficientes', () => {
  const r = canCraft({
    bundle: cheio({ common: FRAGMENTS_PER_CRAFT - 1 }),
    recipeRarity: 'common',
    professionLevel: 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'sem-fragmentos-suficientes');
});

test('DD-PROF-028: Mítico e Relíquia exigem um dos dois Mestres Ferreiros', () => {
  assert.equal(needsMasterSmith('mythic'), true);
  assert.equal(needsMasterSmith('relic'), true);
  assert.equal(needsMasterSmith('legendary'), false);
  assert.equal(COMMON_SMITH_MAX, 'legendary');

  const bundle = cheio({ mythic: 100 });
  const comum = canCraft({ bundle, recipeRarity: 'mythic', professionLevel: 99 });
  assert.equal(comum.ok, false);
  assert.equal(comum.reason, 'exige-mestre-ferreiro');

  const mestre = canCraft({
    bundle, recipeRarity: 'mythic', professionLevel: 99, masterSmith: true,
  });
  assert.equal(mestre.ok, true);
});

test('a receita é TETO: fragmento acima dela não vira item melhor', () => {
  // Receita Rara com fragmentos Lendários: o Lendário está acima do teto e não
  // entra no sorteio. Sobra o Raro.
  const r = rollCraft(
    {
      bundle: { rare: 50, legendary: 50 },
      recipeRarity: 'rare',
      professionLevel: 0,
    },
    () => 0.99,
  );
  assert.equal(r.rarity, 'rare');
});

test('receita abaixo de TODOS os fragmentos não fabrica', () => {
  const r = canCraft({
    bundle: cheio({ legendary: 100 }),
    recipeRarity: 'common',
    professionLevel: 1,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'acima-da-receita');
});

test('o sorteio respeita a proporção (rng determinístico)', () => {
  const bundle = { common: 50, uncommon: 50 };
  const base = { bundle, recipeRarity: 'uncommon' as const, professionLevel: 0 };
  // rng 0.2 cai na primeira metade -> common; 0.8 na segunda -> uncommon.
  assert.equal(rollCraft(base, () => 0.2).rarity, 'common');
  assert.equal(rollCraft(base, () => 0.8).rarity, 'uncommon');
});

test('DD-PROF-023: o upgrade de profissão é PEQUENO e tem teto', () => {
  assert.equal(upgradeChance(0), 0);
  assert.ok(upgradeChance(50) < upgradeChance(200), 'mais nível, mais chance');
  assert.ok(upgradeChance(99999) <= 0.10, 'o doc insiste em "pequena"');
});

test('o upgrade sobe UM degrau e respeita o teto da receita', () => {
  // rng sempre 0 -> pega a primeira raridade e o upgrade acerta.
  const r = rollCraft(
    { bundle: { rare: 100 }, recipeRarity: 'epic', professionLevel: 200 },
    () => 0,
  );
  assert.equal(r.upgraded, true);
  assert.equal(r.rarity, 'epic', 'subiu exatamente um degrau');

  // Com a receita no mesmo nível do sorteio, não há para onde subir.
  const travado = rollCraft(
    { bundle: { rare: 100 }, recipeRarity: 'rare', professionLevel: 200 },
    () => 0,
  );
  assert.equal(travado.upgraded, false);
  assert.equal(travado.rarity, 'rare');
});

test('o upgrade NÃO é atalho para Mítico sem Mestre Ferreiro', () => {
  // Ferreiro comum de nível altíssimo com receita Mítica: mesmo que o sorteio
  // e o upgrade acertem, ele não pode cruzar a fronteira do Mestre. Senão
  // `DD-PROF-028` viraria letra morta.
  const r = rollCraft(
    { bundle: { legendary: 100 }, recipeRarity: 'mythic', professionLevel: 200 },
    () => 0,
  );
  assert.equal(r.rarity, 'legendary');
  assert.equal(r.upgraded, false);

  const mestre = rollCraft(
    {
      bundle: { legendary: 100 }, recipeRarity: 'mythic',
      professionLevel: 200, masterSmith: true,
    },
    () => 0,
  );
  assert.equal(mestre.rarity, 'mythic');
  assert.equal(mestre.upgraded, true);
});

test('DD-PROF-024: receita muito abaixo do nível rende menos XP', () => {
  // O anti-spam: repetir item barato para sempre não sobe profissão.
  const baratoParaNovato = craftXp('common', 1);
  const baratoParaMestre = craftXp('common', 200);
  assert.ok(baratoParaMestre < baratoParaNovato);
  assert.ok(baratoParaMestre >= 1, 'trabalho feito nunca vale zero');

  // Receita difícil rende mais que receita fácil, para o mesmo artesão.
  assert.ok(craftXp('legendary', 50) > craftXp('common', 50));
});

test('cada raridade tem seu item de fragmento', () => {
  for (const r of RARITIES) {
    const kind = FRAGMENT_ITEM[r];
    assert.ok(kind, `falta fragmento para ${r}`);
    assert.ok(ITEMS[kind], `o item ${kind} não existe no catálogo`);
    assert.equal(ITEMS[kind]!.stackable, true, 'fragmento precisa empilhar');
  }
});

test('teto de raridade por fonte: monstro comum NUNCA larga Lendário', () => {
  // A regra que impede farmar o bicho fácil como via barata para o item caro.
  // Varre o espaço de rng inteiro em vez de sortear: prova, não amostra.
  for (let i = 0; i <= 100; i++) {
    const v = i / 100;
    const r = rollFragmentDrop('common', 1, () => v);
    if (r) {
      assert.ok(
        rarityRank(r) <= rarityRank('rare'),
        `monstro comum largou ${r}, acima do teto Raro`,
      );
    }
  }
});

test('a fonte melhor alcança raridade melhor', () => {
  const tetos: Array<[Parameters<typeof rollFragmentDrop>[0], string]> = [
    ['common', 'rare'],
    ['elite', 'legendary'],
    ['boss', 'mythic'],
    ['worldBoss', 'relic'],
  ];
  for (const [fonte, teto] of tetos) {
    // rng 0 no segundo sorteio cai no primeiro peso, que é o próprio teto.
    const r = rollFragmentDrop(fonte, 1, () => 0);
    assert.equal(r, teto, `${fonte} deveria alcançar ${teto}`);
  }
});

test('o fragmento do teto é RARO dentro da própria fonte', () => {
  // Se o topo saísse fácil, farmar a fonte difícil perderia a graça e o mínimo
  // de fragmentos por raridade perderia a função.
  let topo = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    const v = i / N;
    // Primeiro sorteio passa (chance 1), segundo decide a raridade.
    let n = 0;
    const rng = (): number => (n++ === 0 ? 0 : v);
    if (rollFragmentDrop('boss', 1, rng) === 'mythic') topo++;
  }
  assert.ok(topo / N < 0.10, `o topo saiu ${(topo / N * 100).toFixed(1)} % das vezes`);
});

test('chance zero nunca larga fragmento', () => {
  assert.equal(rollFragmentDrop('boss', 0, () => 0), null);
});

test('rarityRank ordena as sete raridades corretamente', () => {
  assert.ok(rarityRank('common') < rarityRank('uncommon'));
  assert.ok(rarityRank('legendary') < rarityRank('mythic'));
  assert.ok(rarityRank('mythic') < rarityRank('relic'));
});
