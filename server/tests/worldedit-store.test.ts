/**
 * Edições de mundo no banco (schema v6) — a persistência do `/remove`.
 *
 * 🔴 **A tabela é do MUNDO**, e é a primeira assim: não pende de conta nem de
 * personagem. Apagar uma árvore apaga para todo mundo, porque é autoria de
 * cenário e não progresso de ninguém. Os testes abaixo travam as duas coisas que
 * isso implica e que são fáceis de quebrar sem perceber.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store/store.js';

function bancoNovo(): { store: Store; dir: string; caminho: string } {
  const dir = mkdtempSync(join(tmpdir(), 'elysia-we-'));
  const caminho = join(dir, 'test.db');
  return { store: new Store(caminho), dir, caminho };
}

test('grava, lista e desfaz uma edição de mundo', () => {
  const { store, dir } = bancoNovo();

  assert.deepEqual(store.listWorldEdits(), [], 'mundo virgem, nenhuma edição');
  assert.equal(store.lastWorldEdit(), undefined);

  store.saveWorldEdit({ floor: 0, x: 12, y: 34, tile: 1, antes: 7 }, 'Maxboladao');

  const todas = store.listWorldEdits();
  assert.equal(todas.length, 1);
  assert.deepEqual(todas[0], { floor: 0, x: 12, y: 34, tile: 1, antes: 7 });

  const ultima = store.lastWorldEdit();
  assert.equal(ultima?.antes, 7, 'o /restaura sabe o que devolver');

  assert.equal(store.deleteWorldEdit(0, 12, 34), true);
  assert.deepEqual(store.listWorldEdits(), [], 'desfeita, some da lista');
  assert.equal(store.deleteWorldEdit(0, 12, 34), false, 'desfazer duas vezes não mente');

  store.close();
  rmSync(dir, { recursive: true, force: true });
});

/**
 * 🔴 **O caso sutil, e o único jeito de errar em silêncio.**
 *
 * Editar duas vezes a mesma célula tem de preservar o terreno ORIGINAL. Se o
 * `tile_antes` fosse sobrescrito, o `/restaura` devolveria o penúltimo estado —
 * que também é uma edição — e desfazer nunca chegaria ao mundo de verdade.
 */
test('reeditar a mesma célula preserva o terreno ORIGINAL', () => {
  const { store, dir } = bancoNovo();

  // árvore (7) -> grama (1)
  store.saveWorldEdit({ floor: 0, x: 5, y: 5, tile: 1, antes: 7 }, 'dono');
  // e agora grama (1) -> terra (2): o "antes" que chega é 1, e tem de ser IGNORADO
  store.saveWorldEdit({ floor: 0, x: 5, y: 5, tile: 2, antes: 1 }, 'dono');

  const todas = store.listWorldEdits();
  assert.equal(todas.length, 1, 'a célula é a chave: uma linha, não duas');
  assert.equal(todas[0]?.tile, 2, 'vale o último tile');
  assert.equal(todas[0]?.antes, 7, '🔴 mas o "antes" continua sendo a ÁRVORE');

  store.close();
  rmSync(dir, { recursive: true, force: true });
});

/**
 * A armadilha nº 3 do projeto, aplicada à v6: `user_version` sozinho mente, e
 * quem decide se a migração roda é o schema (`hasTable`). Um banco criado antes
 * da tabela tem de ganhá-la ao reabrir, sem perder nada do que já tinha.
 */
test('🔴 a v6 roda em banco que JÁ EXISTIA, e as edições sobrevivem ao restart', () => {
  const { store, dir, caminho } = bancoNovo();
  store.saveWorldEdit({ floor: 1, x: 3, y: 9, tile: 2, antes: 6 }, 'dono');
  store.close();

  const s2 = new Store(caminho);
  const todas = s2.listWorldEdits();
  assert.equal(todas.length, 1, 'a edição atravessou o restart do servidor');
  assert.deepEqual(todas[0], { floor: 1, x: 3, y: 9, tile: 2, antes: 6 });
  s2.close();

  rmSync(dir, { recursive: true, force: true });
});

/**
 * 🔴 **A origem da arte tem de SOBREVIVER ao restart** (schema v7).
 *
 * Sem as colunas `arte_x`/`arte_y` persistidas, ao reabrir o servidor toda
 * colagem viraria uma remoção: a fazenda pararia de desenhar as células coladas
 * e elas virariam buraco de grama. O bug só apareceria no restart seguinte, que
 * é o pior momento para descobrir.
 */
test('a célula de origem da arte (/paste) atravessa o restart', () => {
  const { store, dir, caminho } = bancoNovo();

  store.saveWorldEdit({ floor: 0, x: 10, y: 10, tile: 2, antes: 7, arte: { x: 20, y: 21 } }, 'dono');
  store.saveWorldEdit({ floor: 0, x: 11, y: 10, tile: 1, antes: 7 }, 'dono'); // /remove, sem arte
  store.close();

  const s2 = new Store(caminho);
  const todas = s2.listWorldEdits();
  assert.equal(todas.length, 2);

  const colada = todas.find((e) => e.x === 10);
  const apagada = todas.find((e) => e.x === 11);
  assert.deepEqual(colada?.arte, { x: 20, y: 21 }, 'a colagem lembra de onde veio');
  assert.equal(apagada?.arte, undefined, '🔴 e a remoção continua SEM arte — é o que a distingue');

  s2.close();
  rmSync(dir, { recursive: true, force: true });
});
