/**
 * Morte, penalidade e corpo (GDD §8, mensagens #151–#154, #1002–#1004).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CORPSE_EMPTY_TTL_MS,
  CORPSE_TTL_MS,
  EQUIP_DROP_ON_DEATH,
  MAX_XP_PENALTY_RATIO,
  PVE_PENALTY_RATIO,
  RARE_EQUIP_DROP_MULT,
  pvpXpPenaltyRatio,
  xpPenaltyRatio,
} from '../src/index.js';

test('o começo é bem perdoado: até o nível 20 perde 20 % da XP do nível', () => {
  assert.equal(pvpXpPenaltyRatio(1), 0.2);
  assert.equal(pvpXpPenaltyRatio(20), 0.2);
});

test('do 21 ao 100 a morte custa menos de meio nível', () => {
  assert.equal(pvpXpPenaltyRatio(21), 0.4);
  assert.equal(pvpXpPenaltyRatio(100), 0.4);
});

test('NUNCA custa mais que um nível — nem em PvP no nível mais alto', () => {
  // Decisão do dono (2026-07-27): perder 2–3 níveis afasta o jogador.
  for (const n of [101, 200, 500, 1000, 5000]) {
    assert.ok(
      pvpXpPenaltyRatio(n) <= MAX_XP_PENALTY_RATIO,
      `nível ${n} passou do teto de um nível`,
    );
  }
  assert.equal(pvpXpPenaltyRatio(5000), 1.0, 'o teto é exatamente um nível');
});

test('acima de 100 a curva sobe, mas devagar', () => {
  assert.ok(pvpXpPenaltyRatio(300) > pvpXpPenaltyRatio(150), 'ainda cresce com o nível');
  assert.ok(pvpXpPenaltyRatio(200) < 0.6, 'no nível 200 ainda é bem menos de um nível');
});

test('em PvE a morte nunca chega perto de custar um nível', () => {
  for (const n of [1, 50, 100, 300, 1000]) {
    assert.ok(
      xpPenaltyRatio(n, false) <= 0.7,
      `PvE no nível ${n} custou ${xpPenaltyRatio(n, false)} de nível`,
    );
  }
});

test('a penalidade nunca diminui conforme o nível sobe', () => {
  let anterior = 0;
  for (let n = 1; n <= 400; n++) {
    const r = pvpXpPenaltyRatio(n);
    assert.ok(r >= anterior, `penalidade caiu no nível ${n}`);
    anterior = r;
  }
});

test('morrer para outro jogador dói mais que morrer para um monstro', () => {
  for (const nivel of [5, 50, 150]) {
    const pvp = xpPenaltyRatio(nivel, true);
    const pve = xpPenaltyRatio(nivel, false);
    assert.ok(pve < pvp, `PvE deveria ser mais leve no nível ${nivel}`);
    // A conversa fechou a faixa de 60–80 % da penalidade de PvP.
    const proporcao = pve / pvp;
    assert.ok(proporcao >= 0.6 && proporcao <= 0.8, `proporção fora da faixa: ${proporcao}`);
  }
});

test('PvE no início mal arranha o progresso', () => {
  const r = xpPenaltyRatio(10, false);
  assert.ok(r <= 0.15, `esperado no máximo 15 %, veio ${(r * 100).toFixed(0)} %`);
});

test('PVE_PENALTY_RATIO está dentro da faixa combinada', () => {
  assert.ok(PVE_PENALTY_RATIO >= 0.6 && PVE_PENALTY_RATIO <= 0.8);
});

// --- Corpo -----------------------------------------------------------------

test('o corpo dura o bastante para o jogador conseguir voltar', () => {
  const minutos = CORPSE_TTL_MS / 60000;
  assert.ok(minutos >= 15 && minutos <= 20, `esperado 15–20 min, veio ${minutos}`);
});

test('corpo vazio some rápido para não poluir o mundo', () => {
  assert.ok(CORPSE_EMPTY_TTL_MS < CORPSE_TTL_MS);
  assert.equal(CORPSE_EMPTY_TTL_MS / 1000, 60, 'cerca de 1 minuto');
});

// --- Drop de equipamento ---------------------------------------------------

test('a chance de perder equipamento é baixa, mas nunca zero', () => {
  assert.ok(EQUIP_DROP_ON_DEATH > 0, 'nunca zero — o perigo precisa ser real');
  assert.ok(EQUIP_DROP_ON_DEATH <= 0.15, 'baixa o bastante para não frustrar');
});

test('item excepcional resiste mais à perda', () => {
  assert.ok(RARE_EQUIP_DROP_MULT < 1, 'lendário/mítico cai menos');
  assert.ok(RARE_EQUIP_DROP_MULT > 0, 'mas ainda pode cair');
});
