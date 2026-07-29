/**
 * Validação do nome do personagem (regra do dono, 2026-07-28):
 * só letras, sem número, sem caractere especial, sem palavrão, único.
 *
 * A unicidade não é testada aqui — depende do banco. O que se testa é a chave
 * de comparação (`nameKey`), que é o que o servidor usa para decidir se dois
 * nomes são "o mesmo".
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { checkName, nameKey, NAME_MAX, NAME_MIN } from '../src/names.js';

test('aceita nome simples e devolve capitalizado', () => {
  const r = checkName('arthas');
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Arthas');
});

test('aceita nome de duas palavras', () => {
  const r = checkName('bubble gum');
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Bubble Gum');
});

test('colapsa espaço extra e apara as pontas', () => {
  const r = checkName('   dark   knight   ');
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Dark Knight');
});

test('recusa número — e a mensagem diz por quê', () => {
  const r = checkName('Arthas123');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'caractere');
  assert.match(r.message!, /número/i);
});

test('recusa caractere especial', () => {
  for (const nome of ['Art@has', 'Dark_Knight', 'Zé!', 'a-b', "O'Brien"]) {
    assert.equal(checkName(nome).ok, false, `deveria recusar: ${nome}`);
  }
});

test('recusa acento — a unicidade não pode depender de "José" vs "Jose"', () => {
  const r = checkName('Tibério');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'caractere');
});

test('respeita o tamanho mínimo e máximo', () => {
  assert.equal(checkName('ab').reason, 'curto');
  assert.equal(checkName('a'.repeat(NAME_MIN)).ok, true);
  assert.equal(checkName('a'.repeat(NAME_MAX)).ok, true);
  assert.equal(checkName('a'.repeat(NAME_MAX + 1)).reason, 'longo');
});

test('recusa mais de duas palavras', () => {
  assert.equal(checkName('um dois tres').reason, 'palavras');
});

test('recusa palavra solta de uma letra só', () => {
  assert.equal(checkName('Arthas X').reason, 'espaco');
});

test('recusa vazio', () => {
  assert.equal(checkName('').reason, 'vazio');
  assert.equal(checkName('    ').reason, 'vazio');
});

test('recusa palavrão, inclusive disfarçado com espaço', () => {
  for (const nome of ['Caralho', 'xXcaralhoXx', 'Fuck You', 'Puta Merda']) {
    const r = checkName(nome);
    assert.equal(r.ok, false, `deveria recusar: ${nome}`);
  }
});

test('NÃO recusa nome legítimo que contém termo ambíguo', () => {
  // Termos ambíguos só casam como palavra inteira. Sem isso o filtro rejeitaria
  // "Rolando" (rola), "Pintor" (pinto) e "Disputa" (puta) — o problema do
  // Scunthorpe. Um filtro que recusa nome honesto é pior que um que deixa passar.
  for (const nome of [
    'Assassino', 'Cassandra', 'Rolando', 'Pintor', 'Disputa', 'Grape',
    'Dickens', 'Pretoria', 'Analise',
  ]) {
    assert.equal(checkName(nome).ok, true, `não deveria recusar: ${nome}`);
  }
});

test('mas ainda pega o termo ambíguo quando ele é a palavra toda', () => {
  for (const nome of ['Rola', 'Pinto Grande', 'Puta', 'Fuck']) {
    assert.equal(checkName(nome).ok, false, `deveria recusar: ${nome}`);
  }
});

test('recusa nome reservado pelo jogo', () => {
  for (const nome of ['admin', 'GameMaster', 'Elysia', 'suporte']) {
    assert.equal(checkName(nome).reason, 'reservado', `deveria reservar: ${nome}`);
  }
});

test('nameKey ignora caixa e espaço — é a chave de unicidade', () => {
  assert.equal(nameKey('Dark Knight'), nameKey('darkknight'));
  assert.equal(nameKey('ARTHAS'), 'arthas');
});
