import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOOT_RULES,
  MIN_BOSS_CONTRIBUTION,
  applyLootVote,
  canProposeLootRule,
  distributeXp,
  eligibleForXp,
  partyXpBonus,
  rollBossLootWinner,
  sharedXpBand,
  sharesXp,
  tallyLootVote,
  type LootVote,
  type PartyMember,
} from '../src/index.js';

const membro = (id: string, level: number, extra: Partial<PartyMember> = {}): PartyMember =>
  ({ id, level, participated: true, nearby: true, ...extra });

test('DD-PARTY-004/005: a faixa é de ~10 níveis, e dobra depois do Lv.100', () => {
  assert.equal(sharedXpBand(1), 10);
  assert.equal(sharedXpBand(99), 10);
  assert.equal(sharedXpBand(100), 20);
  assert.equal(sharedXpBand(150), 20);
});

test('a faixa é RELATIVA, sem o penhasco da faixa fixa', () => {
  // 🔴 Faixa fixa (1–10, 11–20) faria um Lv.10 e um Lv.11 não poderem dividir
  // XP, enquanto um Lv.1 e um Lv.10 poderiam. É o buraco que a leitura relativa
  // não tem.
  assert.equal(sharesXp(10, 11), true);
  assert.equal(sharesXp(1, 10), true);
  assert.equal(sharesXp(1, 12), false);
  assert.equal(sharesXp(20, 30), true);
  assert.equal(sharesXp(20, 31), false);
});

test('🔴 DD-PARTY-007: um Lv.300 ajuda um Lv.20, mas não divide XP com ele', () => {
  // A regra anti-power-leveling, e a razão de a referência ser o menor nível.
  const grupo = [membro('novato', 20), membro('veterano', 300)];
  const elegiveis = eligibleForXp(grupo);
  assert.deepEqual(elegiveis.map((m) => m.id), ['novato']);

  // E o que importa tanto quanto: a parte do novato NÃO diminui por o veterano
  // estar junto. Ajudar continua sendo ajudar, e nunca vira roubo.
  const comAjuda = distributeXp(100, grupo);
  const sozinho = distributeXp(100, [membro('novato', 20)]);
  assert.equal(comAjuda.get('novato'), sozinho.get('novato'));
  assert.equal(comAjuda.has('veterano'), false);
});

test('🔴 solo rende mais por monstro; party rende mais no total', () => {
  // As duas pontas que o roadmap fecha, e elas puxam em direções opostas. O
  // bônus tem que satisfazer as duas ao mesmo tempo, para qualquer tamanho.
  for (let n = 2; n <= 10; n++) {
    const bonus = partyXpBonus(n);
    assert.ok(bonus > 1, `com ${n} membros o grupo tem que render mais no total`);
    assert.ok(bonus < n, `com ${n} membros cada um tem que render menos que solo`);
  }
  assert.equal(partyXpBonus(1), 1, 'sozinho não ganha bônus de grupo');
});

test('DD-PARTY-009: o bônus vem ANTES da divisão', () => {
  // A ordem é o que mantém a regra acima verdadeira. Bônus depois da divisão
  // faria party render mais por cabeça que solo.
  const dupla = distributeXp(100, [membro('a', 10), membro('b', 12)]);
  // 100 × 1,10 ÷ 2 = 55 para cada.
  assert.equal(dupla.get('a'), 55);
  assert.equal(dupla.get('b'), 55);
  assert.equal(dupla.get('a')! + dupla.get('b')!, 110);
});

test('DD-PARTY-008: estar no grupo não basta — tem que participar e estar perto', () => {
  const grupo = [
    membro('lutou', 10),
    membro('parado', 10, { participated: false }),
    membro('longe', 10, { nearby: false }),
  ];
  assert.deepEqual(eligibleForXp(grupo).map((m) => m.id), ['lutou']);
  // Party e elegibilidade para Shared XP são conceitos distintos (DD-PARTY-002).
  const xp = distributeXp(100, grupo);
  assert.equal(xp.size, 1);
  assert.equal(xp.get('lutou'), 100, 'sem ninguém para dividir, leva tudo');
});

test('ninguém elegível não distribui nada, e não explode', () => {
  assert.equal(distributeXp(100, []).size, 0);
  assert.equal(distributeXp(100, [membro('x', 10, { participated: false })]).size, 0);
});

test('DD-PARTY-013: os três modos de loot existem', () => {
  assert.deepEqual(LOOT_RULES, ['random', 'leader', 'free']);
});

test('DD-PARTY-017/018: maioria simples aprova, empate mantém', () => {
  const votar = (...vs: boolean[]): LootVote => ({
    proposal: 'free',
    votes: new Map(vs.map((v, idx) => [`p${idx}`, v])),
  });
  assert.equal(tallyLootVote(votar(true, true, false)).approved, true);
  // 🔴 Empate MANTÉM a configuração atual — não é sorteio nem voto de minerva.
  assert.equal(tallyLootVote(votar(true, false)).approved, false);
  assert.equal(applyLootVote('leader', votar(true, false)), 'leader');
  assert.equal(applyLootVote('leader', votar(true, true, false)), 'free');
});

test('abstenção não conta como voto contra', () => {
  // Quem não votou não aparece no mapa. Um favor e dois ausentes aprova.
  const vote: LootVote = { proposal: 'random', votes: new Map([['a', true]]) };
  assert.equal(tallyLootVote(vote).approved, true);
});

test('🔴 DD-PARTY-019: a regra trava durante combate de boss', () => {
  // Anti-golpe: sem isto, o líder propõe "Loot do Líder" no instante antes de o
  // chefe morrer e leva tudo sozinho.
  assert.equal(canProposeLootRule(false), true);
  assert.equal(canProposeLootRule(true), false);
});

test('🔴 DD-PARTY-022: last hit não vale nada no loot de boss', () => {
  // O sorteio só olha dano acumulado. Quem deu o golpe final não entra na conta
  // em lugar nenhum — senão a mecânica premiaria quem espera o chefe cair.
  const dano = new Map([['carregou', 900], ['deu_o_ultimo_golpe', 100]]);
  // Com rng fixo no começo da faixa, quem tem mais dano ganha.
  assert.equal(rollBossLootWinner(dano, () => 0.5), 'carregou');
  // E o sorteio é ponderado, não determinístico: no fim da faixa o outro leva.
  assert.equal(rollBossLootWinner(dano, () => 0.99), 'deu_o_ultimo_golpe');
});

test('DD-PARTY-023: existe contribuição mínima para o drop principal', () => {
  const dano = new Map([['carregou', 999], ['turista', 1]]);
  // O turista tem 0,1 % do dano — abaixo do mínimo, sai do sorteio.
  assert.ok(1 / 1000 < MIN_BOSS_CONTRIBUTION);
  for (const r of [0, 0.5, 0.99]) {
    assert.equal(rollBossLootWinner(dano, () => r), 'carregou');
  }
});

test('DD-PARTY-025: o jogador solo compete normalmente', () => {
  assert.equal(rollBossLootWinner(new Map([['sozinho', 50]]), () => 0.5), 'sozinho');
  // Ninguém causou dano: não há a quem dar.
  assert.equal(rollBossLootWinner(new Map()), undefined);
  assert.equal(rollBossLootWinner(new Map([['fantasma', 0]])), undefined);
});
