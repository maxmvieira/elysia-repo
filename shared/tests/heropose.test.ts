import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACK_POSES,
  WEAPON_TYPES,
  attackPoseFallback,
  attackPoseFor,
  type AttackPose,
} from '../src/index.js';

test('TODA arma do jogo tem pose de ataque — é o ponto deste arquivo', () => {
  // Se alguém adicionar um nono WeaponType e esquecer da arte, é aqui que a
  // falha aparece. Sem este teste, o sintoma seria o herói parar de animar o
  // golpe em silêncio, que é o tipo de bug que só se acha jogando.
  for (const w of WEAPON_TYPES) {
    const pose = attackPoseFor(w);
    assert.ok(ATTACK_POSES.includes(pose), `${w} caiu numa pose desconhecida: ${pose}`);
  }
});

test('desarmado e arma desconhecida golpeiam como espada, não somem', () => {
  assert.equal(attackPoseFor(undefined), 'sword');
  // Cliente desatualizado mandando lixo não pode apagar a animação de golpe.
  assert.equal(attackPoseFor('trebuchet' as never), 'sword');
});

test('as famílias de corpo a corpo sem arte própria caem no golpe de espada', () => {
  assert.equal(attackPoseFor('axe'), 'sword');
  assert.equal(attackPoseFor('mace'), 'sword');
  // Besta é a mesma postura de tiro do arco.
  assert.equal(attackPoseFor('crossbow'), 'bow');
});

test('adaga e lança têm pose própria — não colapsam em espada na origem', () => {
  // A adaga é a única pose que só uma classe (o Assassino) possui; o colapso
  // dela em espada é trabalho do FALLBACK, e não do mapa de armas. Se isto
  // virar 'sword' aqui, o Assassino perde a estocada que tem arte.
  assert.equal(attackPoseFor('dagger'), 'dagger');
  assert.equal(attackPoseFor('spear'), 'spear');
});

test('toda cadeia de fallback termina em espada, que os cinco packs têm', () => {
  for (const p of ATTACK_POSES) {
    const cadeia = attackPoseFallback(p);
    assert.equal(cadeia[0], p, `a cadeia de ${p} tem que começar nela mesma`);
    assert.equal(cadeia.at(-1), 'sword', `a cadeia de ${p} não termina em sword`);
  }
});

test('a cadeia da espada não se repete', () => {
  // 'sword' é o fim da linha: repetir viraria busca infinita se alguém
  // transformasse isto num laço.
  assert.deepEqual(attackPoseFallback('sword'), ['sword']);
});

test('nenhuma pose de ataque ficou sem constar em ATTACK_POSES', () => {
  const doMapa = new Set<AttackPose>(WEAPON_TYPES.map(attackPoseFor));
  for (const p of doMapa) assert.ok(ATTACK_POSES.includes(p), `${p} falta em ATTACK_POSES`);
});
