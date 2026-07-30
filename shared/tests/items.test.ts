import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, RARITY, SELL_PRICE_FACTOR, sellPriceOf } from '../src/index.js';

test('venda paga a fração definida do preço de loja', () => {
  const espada = ITEMS.short_sword!;
  assert.equal(sellPriceOf('short_sword'), Math.round(espada.buyPrice * SELL_PRICE_FACTOR));
});

test('a margem existe: vender rende MENOS que comprar', () => {
  // Sem isto a loja viraria depósito sem custo e nenhuma compra pesaria.
  for (const kind of ['short_sword', 'health_potion', 'leather_armor']) {
    assert.ok(sellPriceOf(kind) < ITEMS[kind]!.buyPrice, `${kind} deveria vender por menos`);
  }
});

test('moeda NUNCA é vendável — seria torneira de dinheiro', () => {
  for (const kind of ['gold', 'gold_silver', 'gold_blue', 'gold_white']) {
    assert.equal(sellPriceOf(kind), 0, `${kind} não pode ter preço de venda`);
  }
});

test('loot de monstro tem preço próprio, porque a loja não o estoca', () => {
  // Os dois têm buyPrice 0; sem o campo `sellPrice` valeriam zero, contra o
  // "nada é lixo" que abre items.ts.
  assert.equal(ITEMS.slime_gel!.buyPrice, 0);
  assert.ok(sellPriceOf('slime_gel') > 0);
  assert.ok(sellPriceOf('snake_skin') > sellPriceOf('slime_gel'));
});

test('raridade vale mais, na mesma escala de poder do RARITY', () => {
  const comum = sellPriceOf('short_sword', { rarity: 'common', affixes: [], slots: 1 });
  const relíquia = sellPriceOf('short_sword', { rarity: 'relic', affixes: [], slots: 4 });
  assert.ok(relíquia > comum, 'Relíquia tem que valer mais que Comum');
  const base = ITEMS.short_sword!.buyPrice * SELL_PRICE_FACTOR;
  assert.equal(relíquia, Math.round(base * RARITY.relic.statMult));
});

test('a ordem de preço acompanha a ordem de raridade, sem empate', () => {
  const ordem = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'relic'] as const;
  const precos = ordem.map((r) => sellPriceOf('leather_armor', { rarity: r, affixes: [], slots: 1 }));
  for (let i = 1; i < precos.length; i++) {
    assert.ok(precos[i]! > precos[i - 1]!, `${ordem[i]} deveria valer mais que ${ordem[i - 1]}`);
  }
});

test('material de topo NÃO é vendável — só serve para fabricar', () => {
  // ⚠️ Isto é consequência do catálogo, não uma regra escrita em doc nenhum:
  // Fragmento de Relíquia e as receitas Rara+ têm `buyPrice: 0` porque a loja não
  // as estoca, e ninguém lhes deu `sellPrice`. O efeito é defensável — não dá para
  // torrar o material mais raro do jogo por trocados — mas é DECISÃO DO DONO, e
  // este teste existe para que mudá-la seja consciente, não acidental.
  for (const kind of ['fragment_relic', 'recipe_rare', 'recipe_mythic', 'recipe_relic']) {
    assert.equal(sellPriceOf(kind), 0, `${kind} deveria ser invendável hoje`);
  }
});

test('o resto do material de crafting é vendável', () => {
  // Fragmento Comum a Mítico e receita Comum/Incomum têm preço de loja, então o
  // excedente vira ouro em vez de encalhar na mochila.
  for (const kind of ['fragment_common', 'fragment_mythic', 'recipe_common']) {
    assert.ok(sellPriceOf(kind) >= 1, `${kind} deveria ser vendável`);
  }
});

test('kind inexistente não explode', () => {
  assert.equal(sellPriceOf('nao_existe'), 0);
});

test('quem tem preço definido nunca vale zero por arredondamento', () => {
  // Piso de 1: clicar "Vender" e não receber nada parece bug, não regra.
  for (const [kind, def] of Object.entries(ITEMS)) {
    const temPreco = (def.sellPrice ?? def.buyPrice) > 0 && def.category !== 'currency';
    if (temPreco) assert.ok(sellPriceOf(kind) >= 1, `${kind} caiu para zero`);
  }
});
