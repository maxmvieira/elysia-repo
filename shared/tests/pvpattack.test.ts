/**
 * O portão do "Atacar" do menu de contexto.
 *
 * `canHarm` já existia desde a Etapa 8, completo e testado — mas **nada o
 * chamava**. Estes testes travam o comportamento do primeiro uso real dele:
 * ataque de jogador em jogador, que passa pelo mesmo portão no clique e de novo
 * no golpe.
 *
 * 🔴 O que mais importa aqui é o `marksAsPk`. Ele é quem entrega a ⚪ Caveira
 * Branca hoje e quem vai contar assassinato injustificado na Etapa 17 (amarela,
 * vermelha e preta). Trocá-lo por engano só faria o ataque funcionar; o efeito
 * de verdade é o agressor sair impune.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canHarm, type Combatant } from '../src/index.js';

const jogador = (id: string, extra: Partial<Combatant> = {}): Combatant => ({
  id, kind: 'player', ...extra,
});

test('com os DOIS de PK ligado o ataque passa e marca o agressor', () => {
  const d = canHarm(jogador('a', { pkEnabled: true }), jogador('b', { pkEnabled: true }));
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, true);
});

test('só o flag do ATACANTE é lido', () => {
  // 🔴 Ligar o PK é assumir a agressão, não ganhar escudo. Quem ligou acerta
  // quem não ligou (e leva caveira); quem não ligou não acerta ninguém.
  const soAtacante = canHarm(jogador('a', { pkEnabled: true }), jogador('b'));
  assert.equal(soAtacante.allowed, true, 'o alvo sofre o ataque mesmo com o PK desligado');
  assert.equal(soAtacante.marksAsPk, true);

  const soAlvo = canHarm(jogador('a'), jogador('b', { pkEnabled: true }));
  assert.equal(soAlvo.allowed, false, 'quem está com o PK desligado não ataca');
  assert.equal(soAlvo.veto, 'pk-off');
});

test('recusa por PK OFF NÃO marca o agressor como PK', () => {
  // O doc é explícito: com PK OFF a ação não acontece, então o caster também
  // não vira PK. Tentar atacar não pode custar reputação.
  const d = canHarm(jogador('a'), jogador('b', { pkEnabled: true }));
  assert.equal(d.marksAsPk, false);
});

test('companheiros de grupo não se acertam, mesmo com PK ligado nos dois', () => {
  // Friendly fire desligado por padrão (32.61). É a regra que o `partyId` do
  // servidor liga sozinha ao entrar num grupo.
  const d = canHarm(
    jogador('a', { pkEnabled: true, partyId: 'p1' }),
    jogador('b', { pkEnabled: true, partyId: 'p1' }),
  );
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'ally');
});

test('grupos DIFERENTES continuam podendo se atacar', () => {
  const d = canHarm(
    jogador('a', { pkEnabled: true, partyId: 'p1' }),
    jogador('b', { pkEnabled: true, partyId: 'p2' }),
  );
  assert.equal(d.allowed, true);
});

test('sair do grupo devolve a possibilidade de atacar', () => {
  // O caminho que o `leaveParty` do servidor produz: `partyId` volta a
  // indefinido nos dois. Sem isto, dois ex-companheiros ficariam imunes um ao
  // outro para sempre.
  const d = canHarm(jogador('a', { pkEnabled: true }), jogador('b', { pkEnabled: true }));
  assert.equal(d.allowed, true);
});

test('atacar a si mesmo é sempre recusado, antes de qualquer flag', () => {
  const d = canHarm(jogador('a', { pkEnabled: true }), jogador('a', { pkEnabled: true }));
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'self');
});

test('o PK não atrapalha o PvE: criatura entra e sai do filtro', () => {
  // A garantia de que ligar o portão no caminho do ataque não quebrou a caça,
  // que é 100 % do combate do jogo hoje.
  const monstro: Combatant = { id: 'c1', kind: 'creature' };
  const pacifico = jogador('a');
  assert.equal(canHarm(pacifico, monstro).allowed, true, 'PK OFF ainda bate em monstro');
  assert.equal(canHarm(monstro, pacifico).allowed, true, 'e monstro ainda bate nele');
  assert.equal(canHarm(pacifico, monstro).marksAsPk, false, 'caçar não marca ninguém');
});
