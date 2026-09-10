/**
 * 🏹 **MUNIÇÃO E ALJAVA** — pedido do dono em 11/09.
 *
 * *"Quando comprar, precisa equipar as flechas no quiver, que também é um item
 * que precisa ter no jogo para guardar as flechas. O personagem só consegue
 * carregar até 10 mil flechas no quiver... lembrando que o quiver também
 * armazenará o virote, que é a munição da besta. Faça variáveis de flechas
 * também, tipo flecha de fogo, flecha de gelo, flecha sagrada, sombria."*
 *
 * O que este arquivo trava é o **contrato entre as três pontas** — a arma diz
 * qual família aceita, a munição diz a que família pertence e qual elemento
 * imprime, e a aljava diz quanto cabe. Cada uma sozinha parece inofensiva; é a
 * combinação que quebra em silêncio (um arco que aceita virote, uma flecha sem
 * família que nunca é escolhida, uma aljava sem teto).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEMS,
  VENDOR_STOCK,
  EQUIP_SLOTS,
  WEAPON_IDENTITY,
  quiverSizeFor,
  quiverMaxFor,
  DAMAGE_TYPES,
} from '../src/index.js';

test('🏹 arco aceita FLECHA e besta aceita VIROTE — e nunca o contrário', () => {
  /*
   * Até 11/09 a besta gastava a flecha do arco. Era simplificação assumida, e o
   * dono a desfez. Este teste existe para ela não voltar por descuido: um
   * `ammo: 'arrow'` copiado na linha da besta não daria erro nenhum.
   */
  assert.equal(WEAPON_IDENTITY.bow.ammo, 'arrow');
  assert.equal(WEAPON_IDENTITY.crossbow.ammo, 'bolt');

  /*
   * 🔴 E NINGUÉM MAIS GASTA MUNIÇÃO. A LANÇA é a armadilha concreta: ela tem
   * alcance 2, logo o servidor a classifica como `ranged`. Quem um dia trocar a
   * regra "a arma declara a munição" pela regra fácil "todo ataque à distância
   * gasta flecha" faz a lança comer a aljava do jogador — e o teste cai aqui.
   */
  for (const [tipo, id] of Object.entries(WEAPON_IDENTITY)) {
    if (tipo === 'bow' || tipo === 'crossbow') continue;
    assert.equal(id.ammo, undefined, `${tipo} não deveria gastar munição`);
  }
  assert.ok(WEAPON_IDENTITY.spear.range > 1, 'a lança continua sendo de alcance');
});

test('🏹 toda munição declara família, e ela bate com o nome', () => {
  const municoes = Object.values(ITEMS).filter((i) => i.category === 'ammo');
  assert.ok(municoes.length >= 10, 'as cinco flechas e os cinco virotes');

  for (const m of municoes) {
    /*
     * ⚠️ Sem `ammoFamily` a munição existe na mochila mas NUNCA é escolhida
     * pelo disparo — `municaoEscolhida` compara família. Seria um item comprável
     * e inútil, sem nenhum erro no caminho.
     */
    assert.ok(m.ammoFamily, `${m.kind} sem ammoFamily`);
    assert.equal(
      m.ammoFamily,
      m.kind.startsWith('bolt') ? 'bolt' : 'arrow',
      `${m.kind}: o nome e a família discordam`,
    );
    assert.equal(m.stackable, true, `${m.kind} tem de empilhar`);
  }
});

test('🔥 as quatro variantes elementais existem nas DUAS famílias', () => {
  // O dono pediu fogo, gelo, sagrada e sombria. Se um dia entrar uma quinta,
  // ela tem de entrar nas duas famílias — meia implementação é o defeito que
  // este teste pega.
  for (const familia of ['arrow', 'bolt'] as const) {
    for (const el of ['fire', 'ice', 'holy', 'dark'] as const) {
      const item = ITEMS[`${familia}_${el}`];
      assert.ok(item, `falta ${familia}_${el}`);
      assert.equal(item.element, el);
      assert.equal(item.ammoFamily, familia);
      // O elemento tem de ser um dano que o jogo conhece, senão `resolveDamage`
      // não acha resistência nenhuma e a variante vira dano genérico.
      assert.ok(DAMAGE_TYPES.includes(el), `${el} não é um DamageType`);
    }
    // A comum é FÍSICA — é ela que dá sentido às outras terem elemento.
    assert.equal(ITEMS[familia]!.element, undefined);
  }
});

test('🔥 a munição elemental custa mais que a comum — é escolha, não upgrade', () => {
  /*
   * A elemental rende contra o bicho certo e rende MENOS contra o errado (a
   * resistência corta nos dois sentidos). O preço é o que impede que ela vire
   * simplesmente "a melhor" e aposente a comum.
   */
  for (const familia of ['arrow', 'bolt'] as const) {
    const comum = ITEMS[familia]!;
    for (const el of ['fire', 'ice', 'holy', 'dark'] as const) {
      assert.ok(
        ITEMS[`${familia}_${el}`]!.buyPrice > comum.buyPrice,
        `${familia}_${el} tinha de custar mais que ${familia}`,
      );
    }
  }
});

test('🏹 a ALJAVA: slot próprio, 10 mil unidades, e slots para vários tipos', () => {
  assert.ok(EQUIP_SLOTS.includes('quiver'));

  const aljava = ITEMS.quiver;
  assert.ok(aljava, 'a aljava tem de existir como item');
  assert.equal(aljava.slot, 'quiver');

  // 🔴 O número é do dono: dez mil.
  assert.equal(quiverMaxFor('quiver'), 10000);

  /*
   * ⚠️ `capacity` e `ammoMax` são medidas DIFERENTES e é fácil confundi-las.
   * `capacity` são os slots (quantos tipos de munição lado a lado) e `ammoMax`
   * são as unidades somadas. Mais de um slot é o que dá sentido às elementais:
   * sem isso o jogador carregaria um tipo só e trocar munição viraria uma ida à
   * mochila no meio da luta.
   */
  assert.ok(quiverSizeFor('quiver') > 1, 'tem de caber mais de um tipo');
  assert.notEqual(quiverSizeFor('quiver'), quiverMaxFor('quiver'));

  // Sem aljava, zero — e zero é a regra, não caso de borda: sem aljava o
  // personagem não carrega munição nenhuma e o arco não dispara.
  assert.equal(quiverSizeFor(undefined), 0);
  assert.equal(quiverMaxFor(undefined), 0);
});

test('🏹 a loja vende a aljava e as dez munições', () => {
  // Sem isso a feature existe e é inalcançável: não há receita nem drop de
  // munição, então o comerciante é o ÚNICO caminho.
  assert.ok(VENDOR_STOCK.includes('quiver'), 'a aljava tem de ser comprável');
  for (const m of Object.values(ITEMS).filter((i) => i.category === 'ammo')) {
    assert.ok(VENDOR_STOCK.includes(m.kind), `${m.kind} fora da loja`);
  }
});
