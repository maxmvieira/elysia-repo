import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeOutfit, corDoGrupo, OUTFIT_MAX_GRUPOS } from '../src/outfit.js';

test('outfit válido passa inteiro', () => {
  assert.deepEqual(sanitizeOutfit([0x8c2f2f, 0x2f2f38, 0xd8c070]), [0x8c2f2f, 0x2f2f38, 0xd8c070]);
});

test('preto e branco são cores válidas — os dois extremos da faixa', () => {
  assert.deepEqual(sanitizeOutfit([0x000000, 0xffffff]), [0x000000, 0xffffff]);
});

test('o que não é cor vira undefined, não erro', () => {
  // O servidor não pode cair porque alguém mandou lixo no lugar de uma cor.
  assert.equal(sanitizeOutfit(null), undefined);
  assert.equal(sanitizeOutfit('vermelho'), undefined);
  assert.equal(sanitizeOutfit({ 0: 0xff0000 }), undefined);
  assert.equal(sanitizeOutfit([]), undefined);
  assert.equal(sanitizeOutfit(['#ff0000']), undefined);
  assert.equal(sanitizeOutfit([1.5]), undefined);
  assert.equal(sanitizeOutfit([-1]), undefined);
  assert.equal(sanitizeOutfit([0x1000000]), undefined); // acima de 0xFFFFFF
});

test('🔴 valor ruim no MEIO é aparado, não derruba o outfit inteiro', () => {
  // Perder uma cor é menos ruim que perder as três — e recusar o personagem
  // por causa de cosmético seria desproporcional.
  const out = sanitizeOutfit([0xff0000, 'lixo', 0x00ff00]);
  assert.equal(out?.length, 3);
  assert.equal(corDoGrupo(out, 1), 0xff0000);
  assert.equal(corDoGrupo(out, 2), undefined); // o buraco não pinta
  assert.equal(corDoGrupo(out, 3), 0x00ff00);
});

test('grupo sem cor no FIM é removido — não precisa viajar', () => {
  assert.deepEqual(sanitizeOutfit([0xff0000, null, null]), [0xff0000]);
});

test('nunca passa mais grupos do que a classe tem', () => {
  const out = sanitizeOutfit([1, 2, 3, 4, 5, 6]);
  assert.equal(out?.length, OUTFIT_MAX_GRUPOS);
});

test('corDoGrupo é 1-based e aguenta ausência', () => {
  assert.equal(corDoGrupo(undefined, 1), undefined);
  assert.equal(corDoGrupo([0xabcdef], 1), 0xabcdef);
  assert.equal(corDoGrupo([0xabcdef], 2), undefined); // grupo que não existe
  assert.equal(corDoGrupo([0xabcdef], 0), undefined); // 0 não é grupo
});

test('sanitizar duas vezes dá o mesmo resultado', () => {
  // Importa porque o valor sai do banco e volta a passar por aqui no login:
  // se não fosse idempotente, o outfit mudaria sozinho a cada entrada.
  const uma = sanitizeOutfit([0xff0000, 'x', 0x00ff00]);
  assert.deepEqual(sanitizeOutfit(uma), uma);
});
