/**
 * Party (cap. 35) — o que estes testes protegem:
 *
 *  1. as recusas de convite, uma a uma, porque cada uma vira uma mensagem
 *     diferente na tela e trocá-las é o tipo de bug que ninguém percebe;
 *  2. a dissolução do grupo de um membro só e a sucessão da liderança, que o
 *     doc **não** trata — é decisão nossa e por isso precisa ficar travada;
 *  3. a faixa de nível do Shared XP (`DD-PARTY-003..007`), que ainda não está
 *     ligada ao servidor mas já é regra fechada.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTY_MAX,
  canInvite,
  inviteVetoText,
  removeMember,
  sharesXpWith,
  xpBandFor,
  type PartyState,
} from '../src/index.js';

function grupo(leaderId: string, memberIds: string[]): PartyState {
  return { id: 'party1', leaderId, memberIds };
}

test('convite entre dois jogadores soltos é aceito (o caso comum)', () => {
  assert.equal(canInvite('a', 'b', undefined, undefined).allowed, true);
});

test('não dá para convidar a si mesmo', () => {
  const d = canInvite('a', 'a', undefined, undefined);
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'self');
});

test('quem já está em OUTRO grupo não pode ser convidado', () => {
  const meu = grupo('a', ['a']);
  const dele = { id: 'party2', leaderId: 'c', memberIds: ['c', 'b'] };
  const d = canInvite('a', 'b', meu, dele);
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'in-other');
});

test('"já está no seu grupo" é distinto de "está em outro grupo"', () => {
  // As duas recusas parecem iguais para o código e são muito diferentes para
  // quem clicou — é exatamente por isso que existem dois vetos.
  const meu = grupo('a', ['a', 'b']);
  const d = canInvite('a', 'b', meu, meu);
  assert.equal(d.veto, 'already-mine');
  assert.notEqual(inviteVetoText('already-mine', 'Bob'), inviteVetoText('in-other', 'Bob'));
});

test('só o líder convida', () => {
  const meu = grupo('a', ['a', 'b']);
  const d = canInvite('b', 'c', meu, undefined);
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'not-leader');
});

test('grupo cheio recusa o convite', () => {
  const cheio = grupo('a', Array.from({ length: PARTY_MAX }, (_, i) => `p${i}`));
  const d = canInvite('a', 'novo', cheio, undefined);
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'full');
});

test('o grupo com uma vaga ainda aceita — o teto é PARTY_MAX, não PARTY_MAX-1', () => {
  const quase = grupo('a', Array.from({ length: PARTY_MAX - 1 }, (_, i) => `p${i}`));
  assert.equal(canInvite('a', 'novo', quase, undefined).allowed, true);
});

test('sair de um grupo de dois DISSOLVE o grupo', () => {
  // Party de um membro só é estado fantasma: dá friendly fire e painel de
  // grupo sem nenhum benefício.
  assert.equal(removeMember(grupo('a', ['a', 'b']), 'b'), null);
});

test('sair de um grupo de três mantém o grupo', () => {
  const r = removeMember(grupo('a', ['a', 'b', 'c']), 'c');
  assert.notEqual(r, null);
  assert.deepEqual(r!.memberIds, ['a', 'b']);
  assert.equal(r!.leaderId, 'a');
});

test('líder que sai passa a liderança ao membro mais antigo restante', () => {
  const r = removeMember(grupo('a', ['a', 'b', 'c']), 'a');
  assert.notEqual(r, null);
  assert.equal(r!.leaderId, 'b');
  assert.deepEqual(r!.memberIds, ['b', 'c']);
});

test('DD-PARTY-004/005: a faixa é de 10 até o Lv.100 e de 20 acima', () => {
  assert.equal(xpBandFor(1), 10);
  assert.equal(xpBandFor(100), 10);
  assert.equal(xpBandFor(101), 20);
});

test('DD-PARTY-007: um Lv.300 NÃO divide XP com um Lv.20', () => {
  assert.equal(sharesXpWith(300, 20), false);
});

test('a faixa usada é a do MAIOR nível dos dois', () => {
  // 85 e 101 distam 16. Pela janela do 85 (10) não dividiriam; pela do 101
  // (20) dividem. A regra manda usar a do maior — senão o Lv.101 escaparia da
  // própria faixa larga escolhendo parceiro abaixo de 100.
  assert.equal(sharesXpWith(85, 101), true);
  // O contraste: 15 níveis de distância NÃO passam enquanto os dois estão sob a
  // janela de 10 — mas os mesmos 16 passam assim que o maior cruza o Lv.100.
  assert.equal(sharesXpWith(85, 100), false);
  // E dentro da janela estreita continua valendo.
  assert.equal(sharesXpWith(85, 95), true);
});

test('níveis iguais sempre dividem', () => {
  for (const nv of [1, 50, 100, 250]) assert.equal(sharesXpWith(nv, nv), true);
});
