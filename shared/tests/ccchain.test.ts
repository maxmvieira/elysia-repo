import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONDITIONS,
  CONTROL_IMMUNITY_MS,
  DR_FACTORS,
  DR_WINDOW_MS,
  breakOnDamage,
  ccDurationFactor,
  emptyCcState,
  emptyConditionDefense,
  isControlImmune,
  isTotalControl,
  registerCc,
  tickConditions,
  tryApplyCondition,
  type ActiveCondition,
} from '../src/index.js';

const sempre = (): number => 0;

/** Aplica uma condição com chance cheia, devolvendo a duração concedida. */
function aplica(cc: ReturnType<typeof emptyCcState>, id: 'freeze' | 'stun', now: number): number {
  const r = tryApplyCondition(
    id, 1, CONDITIONS[id].referenceDurationMs, emptyConditionDefense(), sempre, cc, now,
  );
  return r.applied ? r.durationMs : 0;
}

test('DD-CC-013: a mesma condição repetida dura cada vez menos', () => {
  const cc = emptyCcState();
  const cheia = CONDITIONS.freeze.referenceDurationMs;

  // 1ª vez: duração inteira.
  assert.equal(aplica(cc, 'freeze', 0), cheia);
  // 2ª: metade. 3ª: um quarto.
  assert.equal(aplica(cc, 'freeze', 100), Math.round(cheia * DR_FACTORS[1]!));
  assert.equal(aplica(cc, 'freeze', 200), Math.round(cheia * DR_FACTORS[2]!));
  // 4ª: NÃO pega. É isto que impede a corrente infinita.
  const quarta = tryApplyCondition(
    'freeze', 1, cheia, emptyConditionDefense(), sempre, cc, 300,
  );
  assert.equal(quarta.applied, false);
  assert.equal(quarta.rejection, 'cc-exhausted');
});

test('o diminishing returns é POR condição, não global', () => {
  const cc = emptyCcState();
  // Esgotar Congelamento não deveria proteger de Atordoamento: são controles
  // diferentes e o jogador precisa respeitar cada um.
  aplica(cc, 'freeze', 0);
  aplica(cc, 'freeze', 10);
  aplica(cc, 'freeze', 20);
  assert.equal(ccDurationFactor(cc, 'freeze', 30), 0, 'freeze esgotado');
  assert.equal(ccDurationFactor(cc, 'stun', 30), 1, 'stun ainda inteiro');
});

test('a janela zera depois de tempo suficiente SEM sofrer a condição', () => {
  const cc = emptyCcState();
  registerCc(cc, 'freeze', 0);
  registerCc(cc, 'freeze', 100);
  assert.ok(ccDurationFactor(cc, 'freeze', 200) < 1, 'dentro da janela, reduzido');
  // Passada a janela inteira desde a ÚLTIMA aplicação, volta ao normal.
  assert.equal(ccDurationFactor(cc, 'freeze', 100 + DR_WINDOW_MS + 1), 1);
});

test('reaplicar reinicia a janela — não dá para esperar o relógio virar', () => {
  const cc = emptyCcState();
  registerCc(cc, 'freeze', 0);
  // Reaplica quase no fim da janela: a contagem sobe E a janela recomeça.
  registerCc(cc, 'freeze', DR_WINDOW_MS - 1);
  assert.ok(
    ccDurationFactor(cc, 'freeze', DR_WINDOW_MS + 100) < 1,
    'a janela tem que ter recomeçado na segunda aplicação',
  );
});

test('DD-CC-014: sair de um controle total dá janela de imunidade', () => {
  const cc = emptyCcState();
  const lista: ActiveCondition[] = [{ id: 'freeze', expiresAt: 1000 }];
  assert.equal(isControlImmune(cc, 999), false);

  // O congelamento expira no tique.
  const r = tickConditions(lista, 1000, cc);
  assert.deepEqual(r.expired, ['freeze']);
  assert.equal(isControlImmune(cc, 1000), true);
  assert.equal(isControlImmune(cc, 1000 + CONTROL_IMMUNITY_MS - 1), true);
  assert.equal(isControlImmune(cc, 1000 + CONTROL_IMMUNITY_MS), false, 'a janela fecha');
});

test('durante a imunidade, controle total não pega — mas DoT pega', () => {
  const cc = emptyCcState();
  cc.controlImmuneUntil = 5000;

  const congelar = tryApplyCondition(
    'freeze', 1, 9999, emptyConditionDefense(), sempre, cc, 1000,
  );
  assert.equal(congelar.applied, false);
  assert.equal(congelar.rejection, 'cc-immune');

  // Veneno não é controle: a imunidade não protege dele. Senão sair de um stun
  // daria 3 s de invulnerabilidade a debuff, que não é o que a regra quer.
  const envenenar = tryApplyCondition(
    'poison', 1, 9999, emptyConditionDefense(), sempre, cc, 1000,
  );
  assert.equal(envenenar.applied, true);
});

test('quebrar Congelamento por dano também concede a imunidade', () => {
  // Sem isto, "congela → bate para quebrar → congela" seria uma corrente
  // legítima passando por baixo da regra.
  const cc = emptyCcState();
  const lista: ActiveCondition[] = [{ id: 'freeze', expiresAt: 9999 }];
  const depois = breakOnDamage(lista, cc, 500);
  assert.equal(depois.length, 0);
  assert.equal(isControlImmune(cc, 500), true);
});

test('Petrificação NÃO quebra por dano, então não gera imunidade por golpe', () => {
  const cc = emptyCcState();
  const lista: ActiveCondition[] = [{ id: 'petrify', expiresAt: 9999 }];
  const depois = breakOnDamage(lista, cc, 500);
  assert.equal(depois.length, 1, 'petrificação sobrevive ao dano');
  assert.equal(isControlImmune(cc, 500), false);
});

test('isTotalControl separa controle de restrição e de DoT', () => {
  assert.equal(isTotalControl('freeze'), true);
  assert.equal(isTotalControl('petrify'), true);
  assert.equal(isTotalControl('stun'), true);
  // Silêncio só bloqueia magia; Aprisionamento só os pés; Veneno nada.
  assert.equal(isTotalControl('silence'), false);
  assert.equal(isTotalControl('root'), false);
  assert.equal(isTotalControl('poison'), false);
});

test('sem estado anti-chain, o comportamento antigo é preservado', () => {
  // `cc` é opcional de propósito: o comando de teste `/cond` e qualquer código
  // que não passe estado continuam funcionando com duração cheia.
  const cheia = CONDITIONS.freeze.referenceDurationMs;
  for (let i = 0; i < 5; i++) {
    const r = tryApplyCondition('freeze', 1, cheia, emptyConditionDefense(), sempre);
    assert.equal(r.applied, true);
    assert.equal(r.durationMs, cheia);
  }
});

test('a corrente de dois casters alternando NÃO prende para sempre', () => {
  // O cenário concreto que o doc quer impedir: Congelamento de 10 s aplicado
  // repetidamente. Depois de três, o alvo fica livre.
  const cc = emptyCcState();
  let t = 0;
  let totalPreso = 0;
  let aplicacoes = 0;
  for (let i = 0; i < 6; i++) {
    const dur = aplica(cc, 'freeze', t);
    if (dur > 0) {
      aplicacoes++;
      totalPreso += dur;
      t += dur; // o próximo caster age no instante em que o anterior acaba
    } else {
      break;
    }
  }
  assert.equal(aplicacoes, 3, 'só três congelamentos entram');
  const cheia = CONDITIONS.freeze.referenceDurationMs;
  assert.ok(totalPreso < cheia * 2, `preso ${totalPreso} ms, menos que dois congelamentos`);
});
