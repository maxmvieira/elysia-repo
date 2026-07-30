import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCK_CAP,
  DODGE_CAP,
  MAGIC_BLOCK_CAP,
  blockCapFor,
  computeDodgeChance,
  emptyDefense,
  resolveDamage,
} from '../src/index.js';

/** rng que devolve uma sequência fixa — deixa cada camada previsível. */
const seq = (...valores: number[]): (() => number) => {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)]!;
};

/** rng que nunca dispara nada probabilístico (esquiva/bloqueio sempre falham). */
const semSorte = (): number => 0.999;

test('DD-DEF-006: escudo REDUZ o dano, nunca anula', () => {
  // O exemplo é literal no doc: ataque de 1.000 com 25 % de mitigação -> 750.
  const def = emptyDefense({ shieldMitigation: 0.25 });
  const r = resolveDamage(1000, 'physical', def, semSorte);
  assert.equal(r.outcome, 'hit');
  assert.equal(r.amount, 750);
});

test('escudo com mitigação altíssima ainda deixa passar dano', () => {
  const def = emptyDefense({ shieldMitigation: 1 });
  const r = resolveDamage(1000, 'physical', def, semSorte);
  assert.equal(r.outcome, 'hit', 'escudo não pode virar esquiva');
  assert.equal(r.amount, 1, 'piso de 1: golpe que conectou sempre machuca');
});

test('bloqueio completo zera o dano — e é separado do escudo', () => {
  // Sem esquiva no perfil não há sorteio de esquiva, então o único valor de rng
  // consumido é o do bloqueio.
  const def = emptyDefense({ fullBlockChance: 0.25 });
  const r = resolveDamage(1000, 'physical', def, seq(0.01));
  assert.equal(r.outcome, 'blocked');
  assert.equal(r.amount, 0);
});

test('DD-DEF-012: a chance de bloqueio respeita o cap global', () => {
  const def = emptyDefense({ fullBlockChance: 0.95 });
  // Com rng logo acima do cap, o bloqueio TEM que falhar mesmo com 95 % no perfil.
  const r = resolveDamage(100, 'physical', def, seq(BLOCK_CAP + 0.01));
  assert.equal(r.outcome, 'hit');
});

test('com esquiva e bloqueio no perfil, sorteia a esquiva primeiro', () => {
  // Fixa a ordem dos sorteios: quem tem os dois consome [esquiva, bloqueio].
  const def = emptyDefense({ dodgeChance: 0.5, fullBlockChance: 0.25 });
  assert.equal(resolveDamage(100, 'physical', def, seq(0.1, 0.9)).outcome, 'dodged');
  assert.equal(resolveDamage(100, 'physical', def, seq(0.9, 0.1)).outcome, 'blocked');
  assert.equal(resolveDamage(100, 'physical', def, seq(0.9, 0.9)).outcome, 'hit');
});

test('DD-DEF-012: bloqueio MÁGICO tem teto muito menor que o físico', () => {
  // O medo específico do doc: "bloqueio mágico completo deve ser MUITO raro,
  // senão o Knight fecha todas as formas de pressioná-lo". Um teto único
  // deixaria anular magia tão comum quanto anular espada.
  assert.ok(MAGIC_BLOCK_CAP < BLOCK_CAP);
  assert.equal(blockCapFor('physical'), BLOCK_CAP);
  for (const t of ['fire', 'ice', 'electric', 'poison', 'holy', 'dark'] as const) {
    assert.equal(blockCapFor(t), MAGIC_BLOCK_CAP, `${t} deveria usar o teto mágico`);
  }

  // Com o perfil no máximo, um rng entre os dois tetos bloqueia o físico e
  // deixa a magia passar — que é exatamente a assimetria pretendida.
  const def = emptyDefense({ fullBlockChance: 1 });
  const rng = (): number => (BLOCK_CAP + MAGIC_BLOCK_CAP) / 2;
  assert.equal(resolveDamage(100, 'physical', def, rng).outcome, 'blocked');
  assert.equal(resolveDamage(100, 'fire', def, rng).outcome, 'hit');
});

test('esquiva impede o ataque de conectar', () => {
  const def = emptyDefense({ dodgeChance: 0.5 });
  const r = resolveDamage(1000, 'physical', def, seq(0.01));
  assert.equal(r.outcome, 'dodged');
  assert.equal(r.amount, 0);
});

test('DD-DEF-005: esquiva tem retorno decrescente e teto', () => {
  const a = computeDodgeChance(50);
  const b = computeDodgeChance(100);
  const c = computeDodgeChance(200);
  assert.equal(b > a, true, 'mais AGI, mais esquiva');
  // Retorno decrescente: dobrar AGI não dobra a esquiva.
  assert.equal(b < a * 2, true);
  assert.equal(c < DODGE_CAP, true, 'o teto nunca é alcançado');
  assert.equal(computeDodgeChance(100000) < DODGE_CAP, true);
  assert.equal(computeDodgeChance(0), 0);
});

test('DEF é corte PLANO no dano bruto, não redução percentual', () => {
  const fraco = resolveDamage(100, 'physical', emptyDefense({ defense: 40 }), semSorte);
  const forte = resolveDamage(200, 'physical', emptyDefense({ defense: 40 }), semSorte);
  // Corte plano: os dois perdem os MESMOS 40 pontos.
  assert.equal(fraco.amount, 60);
  assert.equal(forte.amount, 160);
});

test('dano físico usa DEF física; os outros usam DEF mágica', () => {
  const def = emptyDefense({ defense: 50, magicDefense: 10 });
  assert.equal(resolveDamage(100, 'physical', def, semSorte).amount, 50);
  assert.equal(resolveDamage(100, 'fire', def, semSorte).amount, 90);
});

test('a ordem das camadas é escudo -> armadura -> resistência', () => {
  const def = emptyDefense({
    shieldMitigation: 0.5, // 200 -> 100
    defense: 20, //            100 -> 80
    resistances: { physical: 0.5 }, // 80 -> 40
  });
  const r = resolveDamage(200, 'physical', def, semSorte);
  assert.equal(r.breakdown.afterShield, 100);
  assert.equal(r.breakdown.afterArmor, 80);
  assert.equal(r.breakdown.afterResist, 40);
  assert.equal(r.amount, 40);
});

test('31.56: a ordem inversa (armadura antes do escudo) dá resultado diferente', () => {
  // O doc se contradiz e a ordem definitiva está pendente. As duas precisam
  // funcionar, e o teste registra que a escolha MUDA o número — por isso ela
  // não pode ser feita em silêncio.
  const def = emptyDefense({ shieldMitigation: 0.5, defense: 20 });
  const diagrama = resolveDamage(200, 'physical', def, semSorte, 'shield-first');
  const texto = resolveDamage(200, 'physical', def, semSorte, 'armor-first');
  assert.equal(diagrama.amount, 80); // (200*0.5) - 20
  assert.equal(texto.amount, 90); //   (200 - 20)*0.5
  assert.notEqual(diagrama.amount, texto.amount);
});

test('🔴 armadura sozinha nunca apara mais que três quartos do golpe', () => {
  // Corte plano não tem retorno decrescente: sem teto, defesa acima do dano
  // bruto zera o golpe (piso de 1) e o jogador vira intocável. Com o catálogo do
  // Doc 4 completo, um set pesado de meio de jogo já passa dos 24 de força do
  // Zumbi, que é a criatura mais forte que existe — o jogo se resolveria sozinho.
  const r = resolveDamage(10, 'physical', emptyDefense({ defense: 9999 }), semSorte);
  assert.equal(r.amount, 3, '25 % de 10, arredondado');
  assert.ok(r.amount > 0, 'nem cura o alvo nem devolve negativo');
  // Escala com o golpe: quanto mais forte a pancada, mais passa pela armadura.
  assert.equal(resolveDamage(100, 'physical', emptyDefense({ defense: 9999 }), semSorte).amount, 25);
});

test('o teto da armadura não muda o balanceamento de hoje', () => {
  // 🔴 O ponto: é grade de proteção, não nerf. Com o set de couro completo (17 de
  // defesa somada) contra o Zumbi (24 de força), o corte plano já entrega 7 — bem
  // acima do teto de 25 %, então ele nem entra em ação.
  const couro = emptyDefense({ defense: 17 });
  assert.equal(resolveDamage(24, 'physical', couro, semSorte).amount, 7);
  // Ele só age quando a armadura passaria a dominar.
  const setPesadoDeEndgame = emptyDefense({ defense: 60 });
  assert.equal(resolveDamage(24, 'physical', setPesadoDeEndgame, semSorte).amount, 6);
});

test('o teto vale só para a ARMADURA — resistência e redução agem depois', () => {
  // `DD-ELM-003` e o cap. 31 preveem que as camadas seguintes reduzam mais. Se o
  // teto fosse no dano final, resistência elemental deixaria de valer a pena.
  const resistente = emptyDefense({ defense: 9999, resistances: { fire: 0.5 } });
  const semResistencia = emptyDefense({ defense: 9999 });
  assert.ok(
    resolveDamage(100, 'fire', resistente, semSorte).amount
    < resolveDamage(100, 'fire', semResistencia, semSorte).amount,
    'resistir a fogo tem que continuar valendo mesmo com armadura enorme',
  );
});

test('damageTakenMult pode AUMENTAR o dano — é a Fúria de Batalha', () => {
  // Fúria multiplica a vida e o dano, mas o Knight passa a apanhar mais. Uma
  // "redução %" não expressa isso, por isso o campo é multiplicador.
  const furia = emptyDefense({ defense: 10, damageTakenMult: 1.5 });
  assert.equal(resolveDamage(100, 'physical', furia, semSorte).amount, 135);

  // Postura Defensiva usa o mesmo campo do outro lado do 1.
  const postura = emptyDefense({ defense: 10, damageTakenMult: 0.7 });
  assert.equal(resolveDamage(100, 'physical', postura, semSorte).amount, 63);
});

test('reduções % e multiplicador final se combinam, e o piso de 1 sobrevive', () => {
  const def = emptyDefense({ flatReductionPct: 0.5, damageTakenMult: 0.5 });
  assert.equal(resolveDamage(100, 'physical', def, semSorte).amount, 25);
  const nulo = emptyDefense({ damageTakenMult: 0 });
  assert.equal(resolveDamage(100, 'physical', nulo, semSorte).amount, 1);
});

test('fraqueza elemental atravessa a armadura e aumenta o dano final', () => {
  // Morto-vivo fraco a Sagrado: é assim que a família ganha um contra natural.
  const def = emptyDefense({ magicDefense: 10, resistances: { holy: -0.5 } });
  const r = resolveDamage(100, 'holy', def, semSorte);
  assert.equal(r.amount, 135); // (100 - 10) * 1.5
});
