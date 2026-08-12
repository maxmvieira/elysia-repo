/**
 * Outfit no banco (schema v5).
 *
 * 🔴 **A migração é a armadilha nº 3 do projeto**, registrada no HANDOFF: o
 * banco já ficou marcado como migrado **sem a coluna existir**, porque
 * `user_version` sozinho mente — `ALTER TABLE` e `PRAGMA` não são transacionais
 * juntos, e uma interrupção entre os dois deixa o arquivo mentindo sobre o
 * próprio estado. O padrão correto é `Store.hasColumn()`, e é isso que o
 * primeiro teste aqui trava.
 *
 * ⚠️ Outfit é **COSMÉTICO** (`13.10` do Doc 1: aparência nunca altera
 * estatística). Nada aqui deve encostar em número de combate.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, type StoredCharacter } from '../src/store/store.js';

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

function conta(store: Store, user: string): number {
  const r = store.registerAccount(user, 'segredo123');
  assert.ok(r.ok, 'conta de teste criada');
  if (!r.ok) throw new Error('conta');
  return r.account.id;
}

test('🔴 a migração v5 roda em banco que JÁ EXISTIA, e o personagem antigo sobrevive', () => {
  // O caso que a armadilha nº 3 descreve: um banco criado antes da coluna. Ao
  // reabrir, `hasColumn` tem de ver que falta e rodar o ALTER — e o personagem
  // que já estava lá tem de continuar carregando, sem outfit.
  const dir = mkdtempSync(join(tmpdir(), 'elysia-test-'));
  const caminho = join(dir, 'test.db');

  const s1 = new Store(caminho);
  const a = conta(s1, 'velho');
  const id = s1.createCharacter(personagemBase(a, 'Thorgar')); // sem `outfit`
  s1.close();

  const s2 = new Store(caminho);
  const c = s2.loadCharacter(id);
  assert.ok(c, 'o personagem anterior à v5 continua carregando');
  assert.equal(c.outfit, '[]', 'sem outfit = cor original da arte, não preto');
  s2.close();
  rmSync(dir, { recursive: true, force: true });
});

test('reabrir o banco duas vezes não quebra nem duplica a coluna', () => {
  // `hasColumn` torna o passo idempotente: roda quando falta, não roda quando
  // já está lá. Um segundo ALTER com o mesmo nome seria erro de SQLite.
  const dir = mkdtempSync(join(tmpdir(), 'elysia-test-'));
  const caminho = join(dir, 'test.db');
  new Store(caminho).close();
  new Store(caminho).close();
  const s = new Store(caminho);
  const a = conta(s, 'terceira');
  const id = s.createCharacter({ ...personagemBase(a, 'Lyra'), outfit: '[16711680]' });
  assert.equal(s.loadCharacter(id)?.outfit, '[16711680]');
  s.close();
  rmSync(dir, { recursive: true, force: true });
});

test('o outfit sobrevive ao salvar e recarregar', () => {
  const dir = mkdtempSync(join(tmpdir(), 'elysia-test-'));
  const s = new Store(join(dir, 'test.db'));
  const a = conta(s, 'dono');
  const cores = JSON.stringify([0x8c2f2f, 0x2f2f38, 0xd8c070]);
  const id = s.createCharacter({ ...personagemBase(a, 'Kael'), outfit: cores });
  assert.equal(s.loadCharacter(id)?.outfit, cores);
  s.close();
  rmSync(dir, { recursive: true, force: true });
});

test('dois personagens da MESMA conta têm outfits próprios', () => {
  // O outfit pende do PERSONAGEM, não da conta — mesma separação que o cap. 40
  // faz para respawn e progressão.
  const dir = mkdtempSync(join(tmpdir(), 'elysia-test-'));
  const s = new Store(join(dir, 'test.db'));
  const a = conta(s, 'dupla');
  const um = s.createCharacter({ ...personagemBase(a, 'Aldo'), outfit: '[255]' });
  const dois = s.createCharacter({ ...personagemBase(a, 'Bruna'), outfit: '[65280]' });
  assert.equal(s.loadCharacter(um)?.outfit, '[255]');
  assert.equal(s.loadCharacter(dois)?.outfit, '[65280]');
  s.close();
  rmSync(dir, { recursive: true, force: true });
});
