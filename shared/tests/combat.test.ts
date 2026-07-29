import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREATURES, chebyshev, rollDamage, xpToNext } from '../src/index.js';

test('dano nunca é menor que 1, mesmo com defesa altíssima', () => {
  const { amount } = rollDamage(5, 999, () => 0.5);
  assert.equal(amount >= 1, true);
});

test('crítico aumenta o dano (rng baixo força crit e variância mínima)', () => {
  const normal = rollDamage(20, 0, () => 0.5).amount; // rng 0.5 -> sem crit, variância 1.0
  const critical = rollDamage(20, 0, () => 0.0); // rng 0 -> crit + variância 0.8
  assert.equal(rollDamage(20, 0, () => 0.0).crit, true);
  assert.equal(critical.amount > 0 && normal > 0, true);
  // Com variância 0.8 e crit 1.5x: 20*0.8*1.5 = 24 > 20*1.0 = 20
  assert.equal(critical.amount, 24);
  assert.equal(normal, 20);
});

test('defesa reduz o dano', () => {
  const semDef = rollDamage(20, 0, () => 0.5).amount;
  const comDef = rollDamage(20, 10, () => 0.5).amount;
  assert.equal(comDef < semDef, true);
});

test('xpToNext cresce com o nível', () => {
  assert.equal(xpToNext(1), 100);
  assert.equal(xpToNext(2), 150);
  assert.equal(xpToNext(3), 200);
});

test('distância de Chebyshev trata diagonal como 1', () => {
  assert.equal(chebyshev(0, 0, 1, 1), 1);
  assert.equal(chebyshev(0, 0, 3, 1), 3);
  assert.equal(chebyshev(5, 5, 5, 5), 0);
});

test('o Slime existe e tem recompensa de XP positiva', () => {
  assert.ok(CREATURES.slime);
  assert.equal(CREATURES.slime!.xpReward > 0, true);
});

test('o Rotworm existe e continua sendo uma criatura válida', () => {
  const rotworm = CREATURES.rotworm;
  assert.ok(rotworm);
  assert.equal(rotworm!.maxHp > 0, true);
  assert.equal(rotworm!.xpReward > 0, true);
  // ⚠️ Este teste comparava Rotworm com Slime ("um pouco mais fraco"). A
  // comparação caiu quando `DD-BAL-027` fixou o Slime Verde em 50 HP / 10 XP:
  // hoje o Rotworm está ACIMA da âncora do Tier I. Não é bug — é o bestiário
  // esperando o rebalanceamento que `DD-BAL-038` manda fazer Tier por Tier.
  // O Rotworm está DORMENTE (não nasce no mapa), então não afeta quem joga.
});

test('o Zumbi é fraco a Sagrado — e a fraqueza vem do lore, não de gosto', () => {
  // Morto-vivo é alma que não conseguiu voltar ao Heart; Sagrado é energia
  // vital. O roadmap fecha isso na etapa do Druid.
  const r = CREATURES.zombie!.resistances;
  assert.ok(r);
  assert.equal(r!.holy! < 0, true, 'resistência negativa = fraqueza');
  // Só Sagrado: resistência a Veneno pareceria óbvia, mas o doc não fala nisso.
  assert.equal(r!.poison, undefined);
});

test('nenhuma criatura nasce imune: resistência sempre abaixo do teto', () => {
  for (const [tipo, def] of Object.entries(CREATURES)) {
    for (const [elem, v] of Object.entries(def.resistances ?? {})) {
      assert.equal(v < 1, true, `${tipo} seria imune a ${elem}`);
    }
  }
});

test('DD-BAL-027: o Slime Verde é a âncora canônica do bestiário', () => {
  // Valor APROVADO no Doc 3. Toda a curva de XP do jogo sai por comparação com
  // estes 10 — mudar aqui desalinha o bestiário inteiro, que é precisamente o
  // que a decisão existe para impedir. Se algum dia mudar, é decisão do dono.
  const s = CREATURES.slime;
  assert.ok(s);
  assert.equal(s!.name, 'Slime Verde');
  assert.equal(s!.xpReward, 10);
  assert.equal(s!.maxHp, 50);
  assert.equal(s!.defense, 1);
});

test('DD-BAL-033/034/035: a família Slime sobe em curva previsível', () => {
  const verde = CREATURES.slime!;
  const azul = CREATURES.slime_blue!;
  const vermelho = CREATURES.slime_red!;

  // Fichas canônicas do Doc 3, na íntegra.
  assert.deepEqual(
    [verde.maxHp, azul.maxHp, vermelho.maxHp],
    [50, 70, 100],
  );
  assert.deepEqual(
    [verde.xpReward, azul.xpReward, vermelho.xpReward],
    [10, 16, 25],
  );
  assert.deepEqual(
    [verde.defense, azul.defense, vermelho.defense],
    [1, 2, 3],
  );
  assert.deepEqual(
    [verde.magicDefense, azul.magicDefense, vermelho.magicDefense],
    [0, 1, 2],
  );

  // "Criaturas lentas, previsíveis e ideais para aprendizado": a família inteira
  // compartilha comportamento e velocidade — só os números sobem.
  for (const s of [verde, azul, vermelho]) {
    assert.equal(s.behavior, 'neutral', `${s.name} deveria ser neutro`);
    assert.equal(s.moveCooldownMs, verde.moveCooldownMs);
  }
});

test('DD-BAL-036: o Super Slime é MVP, não um Slime Vermelho inflado', () => {
  const mvp = CREATURES.super_slime!;
  const vermelho = CREATURES.slime_red!;
  assert.equal(mvp.boss, true);
  assert.equal(mvp.maxHp, 500);
  assert.equal(mvp.xpReward, 250);
  assert.equal(mvp.defense, 8);
  assert.equal(mvp.magicDefense, 5);
  // Cinco vezes o HP do Vermelho e dez vezes a XP: é outro patamar, mas não os
  // 2.400 HP de antes, que faziam dele uma parede em vez de um chefe didático.
  assert.equal(mvp.maxHp, vermelho.maxHp * 5);
  // "Velocidade: Baixa" — o MVP não corre mais que o resto da família. É o que
  // torna possível fugir dele andando.
  assert.equal(mvp.moveCooldownMs, vermelho.moveCooldownMs);
});

test('o Slime Verde ainda aguenta mais de um golpe no nível 1', () => {
  // O doc pede combate de 3–8 s. Com o dano de nível 1 (~28–39 por golpe), 50 HP
  // dá dois golpes. Se cair para um só, o combate deixou de existir.
  assert.equal(CREATURES.slime!.maxHp > 39, true);
});
