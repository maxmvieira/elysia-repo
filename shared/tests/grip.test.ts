import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRIPS,
  WEAPON_TYPES,
  canDualWield,
  handsOf,
  resolveHold,
  type Grip,
} from '../src/index.js';

test('TODA arma do jogo resolve numa das tres posturas — e o ponto deste arquivo', () => {
  // Se alguem adicionar um nono WeaponType, e aqui que a falha aparece. Sem
  // isto o sintoma seria o corpo ficar sem postura e o heroi parar de segurar a
  // arma em silencio — o tipo de bug que so se acha jogando.
  for (const w of WEAPON_TYPES) {
    const hold = resolveHold({ weapon: w });
    assert.ok(GRIPS.includes(hold.grip), `${w} caiu numa postura desconhecida: ${hold.grip}`);
    assert.equal(hold.main, w, `${w} nao chegou na mao principal`);
  }
});

test('arma de duas maos NAO desenha escudo, mesmo com escudo equipado', () => {
  // A regra ja estava escrita em weapons.ts ("Duas maos = sem escudo") e nunca
  // tinha tido efeito, porque o escudo estava pintado no corpo.
  for (const w of WEAPON_TYPES) {
    const hold = resolveHold({ weapon: w, shield: true });
    if (handsOf(w) === 2) {
      assert.equal(hold.grip, 'two_hand', `${w} deveria ser de duas maos`);
      assert.equal(hold.showShield, false, `${w} de duas maos nao pode mostrar escudo`);
    }
  }
});

test('o `hands` do ITEM vence o do TIPO — e o que faz "espada de duas maos" existir', () => {
  const umaMao = resolveHold({ weapon: 'sword', shield: true });
  assert.equal(umaMao.grip, 'one_hand');
  assert.equal(umaMao.showShield, true);

  const duasMaos = resolveHold({ weapon: 'sword', hands: 2, shield: true });
  assert.equal(duasMaos.grip, 'two_hand');
  assert.equal(duasMaos.showShield, false, 'montante com escudo na mochila nao mostra o escudo');

  // E o contrario tambem: uma lanca curta de uma mao volta a poder usar escudo.
  const lancaCurta = resolveHold({ weapon: 'spear', hands: 1, shield: true });
  assert.equal(lancaCurta.grip, 'one_hand');
  assert.equal(lancaCurta.showShield, true);
});

test('so a adaga pode ser dupla', () => {
  const duplas = WEAPON_TYPES.filter(canDualWield);
  assert.deepEqual(duplas, ['dagger'], 'o dono disse: so a adaga, uma em cada mao');

  const adagas = resolveHold({ weapon: 'dagger', offhand: 'dagger' });
  assert.equal(adagas.grip, 'dual');
  assert.equal(adagas.off, 'dagger');
  assert.equal(adagas.showShield, false, 'as duas maos estao ocupadas');
});

test('par invalido cai em UMA mao, e a segunda arma nao e desenhada', () => {
  // Recusar a metade invalida e melhor que desenhar uma empunhadura que o jogo
  // nao modela. Espada na outra mao nao vira dupla.
  const misto = resolveHold({ weapon: 'dagger', offhand: 'sword' });
  assert.equal(misto.grip, 'one_hand');
  assert.equal(misto.off, undefined);

  const aoContrario = resolveHold({ weapon: 'sword', offhand: 'dagger' });
  assert.equal(aoContrario.grip, 'one_hand');
  assert.equal(aoContrario.off, undefined);
});

test('escudo so aparece se estiver equipado', () => {
  assert.equal(resolveHold({ weapon: 'sword' }).showShield, false);
  assert.equal(resolveHold({ weapon: 'sword', shield: false }).showShield, false);
  assert.equal(resolveHold({ weapon: 'sword', shield: true }).showShield, true);
});

test('punho: sem arma nenhuma continua sendo uma postura valida', () => {
  // O GDD tem proficiencia Fist — lutar sem arma e legitimo, nao estado invalido.
  const punho = resolveHold({});
  assert.equal(punho.grip, 'one_hand');
  assert.equal(punho.main, undefined);
  assert.equal(punho.showShield, false);

  const punhoComEscudo = resolveHold({ shield: true });
  assert.equal(punhoComEscudo.showShield, true, 'so escudo, sem arma, e valido');
});

test('handsOf: o padrao vem do tipo, e as de longo alcance ja nascem com 2', () => {
  assert.equal(handsOf('sword'), 1);
  assert.equal(handsOf('spear'), 2);
  assert.equal(handsOf('bow'), 2);
  assert.equal(handsOf('crossbow'), 2);
  assert.equal(handsOf(undefined), 1, 'punho ocupa uma mao');
  assert.equal(handsOf('sword', 2), 2, 'o override vence');
});

test('as tres posturas sao alcancaveis — nenhuma e codigo morto', () => {
  const vistas = new Set<Grip>();
  vistas.add(resolveHold({ weapon: 'sword' }).grip);
  vistas.add(resolveHold({ weapon: 'spear' }).grip);
  vistas.add(resolveHold({ weapon: 'dagger', offhand: 'dagger' }).grip);
  assert.deepEqual([...vistas].sort(), [...GRIPS].sort());
});
