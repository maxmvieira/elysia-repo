/**
 * Lista de amigos (schema v4).
 *
 * ⚠️ **Sistema sem respaldo documental** — não aparece em nenhum dos quatro
 * documentos. O que estes testes travam é a decisão do dono (2026-07-30): a
 * amizade é da **CONTA**, não do personagem.
 *
 * A consequência dessa escolha é o que os dois primeiros testes protegem:
 * adicionar *o Thorgar* é adicionar a CONTA dele, então o vínculo continua
 * valendo quando ele troca de personagem — mas a lista segue exibindo o nome
 * com que foi feita, que é a única referência que o jogador tem.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, type StoredCharacter } from '../src/store/store.js';

function novoBanco(): { store: Store; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'elysia-test-'));
  return { store: new Store(join(dir, 'test.db')), dir };
}

function fechar(store: Store, dir: string): void {
  store.close();
  rmSync(dir, { recursive: true, force: true });
}

function personagemBase(accountId: number, name: string): Omit<StoredCharacter, 'id'> {
  return {
    accountId, name, cls: 'knight', gender: 'male',
    level: 1, xp: 0, unspentPoints: 0, talentPoints: 0,
    attributes: '{}', skillKind: 'melee', skillLevel: 10, skillProgress: 0,
    hp: 100, mana: 30, gold: 0, bankGold: 0,
    tileX: 5, tileY: 5, floor: 0, respawnTown: 'vilarejo_norte',
    skillPoints: 0, skillResets: 0, skillLevels: '{}',
    proficiencies: '{}', bestiary: '{}', professions: '{}',
    items: [], visitedTowns: ['vilarejo_norte'],
  };
}

/** Duas contas, cada uma com um personagem. O cenário de quase todo teste aqui. */
function doisJogadores(store: Store): { a: number; b: number } {
  const ca = store.registerAccount('ana', 'segredo123');
  const cb = store.registerAccount('bruno', 'segredo123');
  assert.ok(ca.ok && cb.ok);
  if (!ca.ok || !cb.ok) throw new Error('conta');
  store.createCharacter(personagemBase(ca.account.id, 'Aria'));
  store.createCharacter(personagemBase(cb.account.id, 'Thorgar'));
  return { a: ca.account.id, b: cb.account.id };
}

test('adicionar amigo pelo nome do personagem guarda a CONTA dele', () => {
  const { store, dir } = novoBanco();
  const { a, b } = doisJogadores(store);

  assert.deepEqual(store.addFriend(a, 'Thorgar'), { ok: true });
  const lista = store.listFriends(a);
  assert.equal(lista.length, 1);
  assert.equal(lista[0]!.name, 'Thorgar', 'exibe o nome com que foi adicionado');
  assert.equal(lista[0]!.accountId, b, 'mas o vínculo é com a conta');
  fechar(store, dir);
});

test('o vínculo sobrevive à troca de personagem do amigo', () => {
  // É o ponto inteiro do escopo CONTA: o Bruno cria um segundo personagem e
  // continua sendo o mesmo amigo. Se a amizade fosse por personagem, entrar
  // com o alt apareceria como offline para sempre.
  const { store, dir } = novoBanco();
  const { a, b } = doisJogadores(store);
  store.addFriend(a, 'Thorgar');
  store.createCharacter(personagemBase(b, 'Elandra'));

  assert.equal(store.accountOfCharacter('Elandra')!.accountId, b);
  assert.equal(store.listFriends(a)[0]!.accountId, b);
  fechar(store, dir);
});

test('nome que não existe é recusado', () => {
  const { store, dir } = novoBanco();
  const { a } = doisJogadores(store);
  assert.deepEqual(store.addFriend(a, 'Ninguem'), { ok: false, reason: 'nao_existe' });
  fechar(store, dir);
});

test('não dá para adicionar personagem da PRÓPRIA conta', () => {
  // Compara conta, não personagem: adicionar o próprio alt não é fazer um
  // amigo, e a lista o mostraria "online" para sempre.
  const { store, dir } = novoBanco();
  const { a } = doisJogadores(store);
  store.createCharacter(personagemBase(a, 'Meualt'));
  assert.deepEqual(store.addFriend(a, 'Meualt'), { ok: false, reason: 'voce_mesmo' });
  assert.deepEqual(store.addFriend(a, 'Aria'), { ok: false, reason: 'voce_mesmo' });
  fechar(store, dir);
});

test('adicionar duas vezes é recusado, e por outro alt da mesma conta também', () => {
  const { store, dir } = novoBanco();
  const { a, b } = doisJogadores(store);
  store.addFriend(a, 'Thorgar');
  assert.deepEqual(store.addFriend(a, 'Thorgar'), { ok: false, reason: 'ja_tem' });
  // O alt é a MESMA conta: já é amigo, mesmo com nome diferente.
  store.createCharacter(personagemBase(b, 'Elandra'));
  assert.deepEqual(store.addFriend(a, 'Elandra'), { ok: false, reason: 'ja_tem' });
  assert.equal(store.listFriends(a).length, 1);
  fechar(store, dir);
});

test('a amizade NÃO é recíproca', () => {
  // Decisão consciente: mútua exigiria aceite, e aceite é notificação, fila e
  // recusa — sistema inteiro que ninguém pediu. Aqui é marcador pessoal.
  const { store, dir } = novoBanco();
  const { a, b } = doisJogadores(store);
  store.addFriend(a, 'Thorgar');
  assert.equal(store.listFriends(b).length, 0);
  fechar(store, dir);
});

test('remover tira da lista e ignora caixa', () => {
  const { store, dir } = novoBanco();
  const { a } = doisJogadores(store);
  store.addFriend(a, 'Thorgar');
  assert.equal(store.removeFriend(a, 'thorgar'), true);
  assert.equal(store.listFriends(a).length, 0);
  assert.equal(store.removeFriend(a, 'thorgar'), false, 'remover de novo não faz nada');
  fechar(store, dir);
});

test('a migração v4 roda em banco que já existia (auto-verificável)', () => {
  // A armadilha registrada no HANDOFF: `user_version` sozinho mente. Reabrir o
  // mesmo arquivo tem de encontrar a tabela e não recriá-la nem quebrar.
  const dir = mkdtempSync(join(tmpdir(), 'elysia-test-'));
  const caminho = join(dir, 'test.db');
  const s1 = new Store(caminho);
  const { a } = doisJogadores(s1);
  s1.addFriend(a, 'Thorgar');
  s1.close();

  const s2 = new Store(caminho);
  assert.equal(s2.listFriends(a).length, 1, 'a lista sobreviveu ao reinício');
  fechar(s2, dir);
});
