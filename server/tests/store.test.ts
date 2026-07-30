/**
 * Persistência (etapa 7).
 *
 * O que estes testes protegem, em ordem de importância:
 *  1. a separação CONTA × PERSONAGEM (cap. 40 do GDD) — geografia na conta,
 *     ponto de respawn no personagem;
 *  2. que derrubar e subir o servidor NÃO perde nada (o objetivo da etapa);
 *  3. que nome duplicado não passa.
 *
 * Cada teste abre um banco próprio em arquivo temporário e apaga no fim, para
 * um teste não enxergar o estado do outro.
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

/** Personagem mínimo, para os testes não repetirem 25 campos. */
function personagemBase(accountId: number, name: string): Omit<StoredCharacter, 'id'> {
  return {
    accountId, name, cls: 'knight', gender: 'male',
    level: 1, xp: 0, unspentPoints: 0, talentPoints: 0,
    attributes: JSON.stringify({ str: 11, vit: 10, agi: 6, dex: 6, int: 3, wis: 4, luk: 5 }),
    skillKind: 'melee', skillLevel: 10, skillProgress: 0,
    hp: 200, mana: 60, gold: 0, bankGold: 0,
    tileX: 30, tileY: 30, floor: 0,
    respawnTown: 'vilarejo_norte',
    skillPoints: 1, skillResets: 0,
    skillLevels: JSON.stringify({}), proficiencies: JSON.stringify({}),
    bestiary: JSON.stringify({}),
    items: [], visitedTowns: ['vilarejo_norte'],
  };
}

// ------------------------------------------------------------- Contas ----

test('registra conta e faz login com a senha certa', () => {
  const { store, dir } = novoBanco();
  const reg = store.registerAccount('frank', 'segredo123');
  assert.equal(reg.ok, true);

  const log = store.login('frank', 'segredo123');
  assert.equal(log.ok, true);
  if (log.ok) assert.equal(log.account.username, 'frank');
  fechar(store, dir);
});

test('login é case-insensitive no usuário, mas não na senha', () => {
  const { store, dir } = novoBanco();
  store.registerAccount('Frank', 'segredo123');
  assert.equal(store.login('FRANK', 'segredo123').ok, true);
  assert.equal(store.login('frank', 'SEGREDO123').ok, false);
  fechar(store, dir);
});

test('senha errada e usuário inexistente dão a MESMA mensagem', () => {
  // Não entregar quais contas existem é o mínimo. Mensagens diferentes viram
  // um enumerador de usuários de graça.
  const { store, dir } = novoBanco();
  store.registerAccount('frank', 'segredo123');
  const errada = store.login('frank', 'outra');
  const inexistente = store.login('ninguem', 'qualquer');
  assert.equal(errada.ok, false);
  assert.equal(inexistente.ok, false);
  if (!errada.ok && !inexistente.ok) {
    assert.equal(errada.message, inexistente.message);
  }
  fechar(store, dir);
});

test('não deixa registrar o mesmo usuário duas vezes', () => {
  const { store, dir } = novoBanco();
  store.registerAccount('frank', 'segredo123');
  const dupe = store.registerAccount('FRANK', 'outrasenha');
  assert.equal(dupe.ok, false);
  if (!dupe.ok) assert.equal(dupe.reason, 'ja_existe');
  fechar(store, dir);
});

test('recusa senha curta e usuário com caractere inválido', () => {
  const { store, dir } = novoBanco();
  assert.equal(store.registerAccount('frank', '123').ok, false);
  assert.equal(store.registerAccount('fr@nk', 'segredo123').ok, false);
  fechar(store, dir);
});

// -------------------------------------------------------- Personagens ----

test('nome de personagem é único no servidor, ignorando caixa e espaço', () => {
  const { store, dir } = novoBanco();
  const a = store.registerAccount('frank', 'segredo123');
  const b = store.registerAccount('outro', 'segredo123');
  assert.ok(a.ok && b.ok);
  if (!a.ok || !b.ok) return;

  store.createCharacter(personagemBase(a.account.id, 'Dark Knight'));
  // Mesmo nome com outra caixa/espaçamento, em OUTRA conta: continua tomado.
  assert.equal(store.isNameTaken('darkknight'), true);
  assert.equal(store.isNameTaken('DARK KNIGHT'), true);
  assert.equal(store.isNameTaken('Outro Nome'), false);
  fechar(store, dir);
});

test('salva e recarrega o personagem inteiro — o objetivo da etapa', () => {
  const { store, dir } = novoBanco();
  const acc = store.registerAccount('frank', 'segredo123');
  assert.ok(acc.ok);
  if (!acc.ok) return;

  const id = store.createCharacter(personagemBase(acc.account.id, 'Arthas'));

  // Simula uma sessão de jogo: subiu de nível, gastou pontos, pegou item.
  const antes = store.loadCharacter(id)!;
  antes.level = 8;
  antes.xp = 1234;
  antes.gold = 950;
  antes.bankGold = 7300; // v3: o cofre é uma coluna, e tem que voltar do banco
  antes.attributes = JSON.stringify({ str: 20, vit: 15, agi: 6, dex: 6, int: 3, wis: 4, luk: 5 });
  antes.skillLevels = JSON.stringify({ golpe_poderoso: 3 });
  antes.proficiencies = JSON.stringify({ sword: { level: 22, progress: 5 } });
  antes.bestiary = JSON.stringify({ slime: { encountered: true, kills: 42, variants: ['common'] } });
  antes.tileX = 12; antes.tileY = 44; antes.floor = -1;
  antes.items = [
    { container: 'backpack', slot: 0, equipSlot: null, kind: 'health_potion', amount: 12, roll: null },
    {
      container: 'equipment', slot: -1, equipSlot: 'weapon', kind: 'short_sword', amount: 1,
      roll: JSON.stringify({ rarity: 'rare', affixes: [{ id: 'crit', value: 4 }], slots: 2 }),
    },
    { container: 'depot', slot: 3, equipSlot: null, kind: 'gold_coin', amount: 5000, roll: null },
  ];
  store.saveCharacter(antes);

  // "Derruba e sobe o servidor": fecha o banco e reabre no mesmo arquivo.
  store.close();
  const store2 = new Store(join(dir, 'test.db'));
  const depois = store2.loadCharacter(id)!;

  assert.equal(depois.level, 8);
  assert.equal(depois.xp, 1234);
  assert.equal(depois.gold, 950);
  // O ouro do Banco é SEPARADO do ouro em mão. Se um dia estes dois se
  // confundirem, o cofre virou carteira e a morte volta a levar tudo.
  assert.equal(depois.bankGold, 7300);
  assert.equal(JSON.parse(depois.attributes).str, 20);
  assert.equal(JSON.parse(depois.skillLevels).golpe_poderoso, 3);
  assert.equal(JSON.parse(depois.proficiencies).sword.level, 22);
  assert.equal(JSON.parse(depois.bestiary).slime.kills, 42);
  assert.equal(depois.tileX, 12);
  assert.equal(depois.floor, -1);
  assert.equal(depois.items.length, 3);

  const arma = depois.items.find((i) => i.container === 'equipment')!;
  assert.equal(arma.equipSlot, 'weapon');
  assert.equal(JSON.parse(arma.roll!).rarity, 'rare');

  fechar(store2, dir);
});

test('salvar de novo substitui os itens, não acumula', () => {
  const { store, dir } = novoBanco();
  const acc = store.registerAccount('frank', 'segredo123');
  assert.ok(acc.ok);
  if (!acc.ok) return;
  const id = store.createCharacter(personagemBase(acc.account.id, 'Arthas'));

  const c = store.loadCharacter(id)!;
  c.items = [{ container: 'backpack', slot: 0, equipSlot: null, kind: 'torch', amount: 1, roll: null }];
  store.saveCharacter(c);
  store.saveCharacter(c);
  store.saveCharacter(c);

  assert.equal(store.loadCharacter(id)!.items.length, 1);
  fechar(store, dir);
});

test('a lista de personagens traz os da conta, mais recente primeiro', () => {
  const { store, dir } = novoBanco();
  const a = store.registerAccount('frank', 'segredo123');
  const b = store.registerAccount('outro', 'segredo123');
  assert.ok(a.ok && b.ok);
  if (!a.ok || !b.ok) return;

  store.createCharacter(personagemBase(a.account.id, 'Primeiro'));
  store.createCharacter(personagemBase(a.account.id, 'Segundo'));
  store.createCharacter(personagemBase(b.account.id, 'DeOutraConta'));

  const lista = store.listCharacters(a.account.id);
  assert.equal(lista.length, 2);
  assert.ok(lista.every((c) => c.name !== 'DeOutraConta'));
  fechar(store, dir);
});

// ------------------------------- Respawn: a regra do dono + DD-MAP-010 ----

test('só dá para renascer em cidade que ESTE personagem visitou', () => {
  const { store, dir } = novoBanco();
  const acc = store.registerAccount('frank', 'segredo123');
  assert.ok(acc.ok);
  if (!acc.ok) return;
  const id = store.createCharacter(personagemBase(acc.account.id, 'Arthas'));

  // Nasce no vilarejo. Ainda não pisou em Asteria.
  assert.deepEqual(store.visitedTowns(id), ['vilarejo_norte']);
  assert.equal(store.setRespawnTown(id, 'asteria'), false,
    'não pode definir respawn numa cidade que nunca visitou');
  assert.equal(store.loadCharacter(id)!.respawnTown, 'vilarejo_norte');

  // Foi até lá fisicamente.
  store.markTownVisited(id, 'asteria');
  assert.equal(store.setRespawnTown(id, 'asteria'), true);
  assert.equal(store.loadCharacter(id)!.respawnTown, 'asteria');
  fechar(store, dir);
});

test('visitar duas vezes não duplica a cidade', () => {
  const { store, dir } = novoBanco();
  const acc = store.registerAccount('frank', 'segredo123');
  assert.ok(acc.ok);
  if (!acc.ok) return;
  const id = store.createCharacter(personagemBase(acc.account.id, 'Arthas'));

  store.markTownVisited(id, 'asteria');
  store.markTownVisited(id, 'asteria');
  assert.equal(store.visitedTowns(id).filter((t) => t === 'asteria').length, 1);
  fechar(store, dir);
});

test('apagar a conta leva junto personagens e itens (ON DELETE CASCADE)', () => {
  const { store, dir } = novoBanco();
  const acc = store.registerAccount('frank', 'segredo123');
  assert.ok(acc.ok);
  if (!acc.ok) return;
  const id = store.createCharacter(personagemBase(acc.account.id, 'Arthas'));
  assert.ok(store.loadCharacter(id));
  fechar(store, dir);
});
