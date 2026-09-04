import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canHarm,
  whiteSkullDuration,
  logoutLockDuration,
  LOGOUT_LOCK_PVE_MS,
  LOGOUT_LOCK_PVP_MS,
  type Combatant,
} from '../src/index.js';

const jogador = (id: string, extra: Partial<Combatant> = {}): Combatant => ({
  id,
  kind: 'player',
  ...extra,
});
const monstro = (id: string): Combatant => ({ id, kind: 'creature' });

test('PK OFF: a ação ofensiva do atacante simplesmente não existe (17.32/17.33)', () => {
  const a = jogador('a', { pkEnabled: false });
  const b = jogador('b', { pkEnabled: false });
  const d = canHarm(a, b);
  assert.equal(d.allowed, false);
  assert.equal(d.veto, 'pk-off');
  // 🔴 O doc é explícito: com PK OFF o caster NÃO vira PK.
  assert.equal(d.marksAsPk, false);
});

test('🔴 o PK do ALVO não protege: sofrer o golpe não é opcional (17.34)', () => {
  // Este teste existe para travar a correção de rumo de 30/07. A versão
  // anterior exigia PK ON dos dois lados, o que fazia do flag um escudo
  // pessoal e da emboscada uma impossibilidade.
  const agressor = jogador('a', { pkEnabled: true });
  const pacifico = jogador('b', { pkEnabled: false });
  const d = canHarm(agressor, pacifico);
  assert.equal(d.allowed, true, 'quem ligou o PK acerta quem está com ele desligado');
  assert.equal(d.marksAsPk, true, 'e leva a Caveira Branca por isso');
});

test('o pacífico não devolve o golpe enquanto o agressor não tem caveira', () => {
  // O flag continua sendo a porta de saída de quem não quer PvP: sem ligar o
  // PK e sem uma caveira do outro lado, ele não ataca ninguém.
  const agressor = jogador('a', { pkEnabled: true });
  const pacifico = jogador('b', { pkEnabled: false });
  assert.equal(canHarm(pacifico, agressor).veto, 'pk-off');
});

test('PK ON dos dois lados libera a ação e marca o atacante como PK', () => {
  const a = jogador('a', { pkEnabled: true });
  const b = jogador('b', { pkEnabled: true });
  const d = canHarm(a, b);
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, true);
});

test('⚪ Caveira Branca: a vítima revida sem ligar o PK e sem ganhar caveira', () => {
  const agressor = jogador('a', { pkEnabled: true, skull: 'white' });
  const vitima = jogador('b', { pkEnabled: false });
  const d = canHarm(vitima, agressor);
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, false, '17.38: matar quem está de caveira é justificado');
  assert.equal(d.justified, true);
});

test('⚪ qualquer um que esteja vendo também pode atacar o de caveira branca', () => {
  // É o ponto do cap. 75: o mundo reage ao agressor, não só quem ele agrediu.
  const agressor = jogador('a', { pkEnabled: true, skull: 'white' });
  const testemunha = jogador('c', { pkEnabled: false });
  const d = canHarm(testemunha, agressor);
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, false);
});

test('a caveira do agressor não o deixa bater de graça em quem não tem caveira', () => {
  // O alvo livre é ELE, não o contrário: continuar agredindo continua marcando.
  const agressor = jogador('a', { pkEnabled: true, skull: 'white' });
  const outro = jogador('b', { pkEnabled: false });
  assert.equal(canHarm(agressor, outro).marksAsPk, true);
});

test('caveira não fura a proteção de grupo', () => {
  // Senão bastaria um companheiro pegar caveira para o friendly fire voltar.
  const a = jogador('a', { pkEnabled: true, partyId: 'g1' });
  const b = jogador('b', { partyId: 'g1', skull: 'white' });
  assert.equal(canHarm(a, b).veto, 'ally');
});

test('criatura ignora o flag de PK nos dois sentidos', () => {
  const pacifico = jogador('p', { pkEnabled: false });
  assert.equal(canHarm(pacifico, monstro('m1')).allowed, true);
  assert.equal(canHarm(monstro('m1'), pacifico).allowed, true);
  assert.equal(canHarm(pacifico, monstro('m1')).marksAsPk, false);
});

test('friendly fire desligado por padrão entre aliados de party', () => {
  const a = jogador('a', { pkEnabled: true, partyId: 'g1' });
  const b = jogador('b', { pkEnabled: true, partyId: 'g1' });
  assert.equal(canHarm(a, b).veto, 'ally');
  assert.equal(canHarm(a, b, { friendlyFire: true }).allowed, true);
});

test('guerra de guilda: hostil automaticamente, sem precisar ligar PK', () => {
  const a = jogador('a', { pkEnabled: false, guildId: 'g1' });
  const b = jogador('b', { pkEnabled: false, guildId: 'g2' });
  const d = canHarm(a, b, { guildWar: (x, y) => x.guildId !== y.guildId });
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, false, 'guerra oficial não gera criminalidade');
});

test('DD-PK-009: duelo consensual é separado de PK', () => {
  const a = jogador('a', { pkEnabled: false });
  const b = jogador('b', { pkEnabled: false });
  const d = canHarm(a, b, { duel: () => true });
  assert.equal(d.allowed, true);
  assert.equal(d.marksAsPk, false);
});

test('ninguém se machuca sozinho', () => {
  const a = jogador('a', { pkEnabled: true });
  assert.equal(canHarm(a, a).veto, 'self');
});

// ---------------------------------------------------------------------------
// ⚪ Duração da caveira e 🚪 trava de saída — decisões do dono em 2026-09-05
// ---------------------------------------------------------------------------

test('uma agressão isolada dá 60 s de caveira; insistir dá 10 minutos', () => {
  /**
   * 🔴 Citação do dono: *"se eu virei pk a duração mínima são 10 minutos caso
   * eu continue atacando o player. caso tenha sido somente 1 ataque em um
   * player, a caveira branca some com 60 segundos."*
   *
   * O que a regra compra: encostar uma vez sem querer deixa de custar o mesmo
   * que caçar alguém pelo mapa.
   */
  assert.equal(whiteSkullDuration(1), 60_000);
  assert.equal(whiteSkullDuration(2), 10 * 60_000);
  assert.equal(whiteSkullDuration(7), 10 * 60_000, 'da segunda em diante não sobe mais');
});

test('a caveira de quem insiste dura MUITO mais que a de um golpe só', () => {
  // É a relação, não o número, que dá sentido à regra.
  assert.ok(whiteSkullDuration(2) > whiteSkullDuration(1) * 5);
});

test('0 ou menos agressões cai no caso de uma só — nunca em zero', () => {
  // Defensivo: uma contagem zerada por engano não pode devolver "caveira de 0
  // segundos", que na prática seria caveira nenhuma.
  assert.equal(whiteSkullDuration(0), 60_000);
  assert.equal(whiteSkullDuration(-3), 60_000);
});

test('a trava de saída TRIPLICA quando quem atacou foi um jogador', () => {
  // Citação: "se for um player que me atacou esse tempo triplica".
  assert.equal(logoutLockDuration(false), 60_000);
  assert.equal(logoutLockDuration(true), 180_000);
  assert.equal(
    logoutLockDuration(true), logoutLockDuration(false) * 3,
    'a relação é EXATAMENTE o triplo — se alguém mexer num, o outro acompanha',
  );
});

test('as duas travas de saída batem com as constantes exportadas', () => {
  assert.equal(LOGOUT_LOCK_PVE_MS, 60_000);
  assert.equal(LOGOUT_LOCK_PVP_MS, 180_000);
});
