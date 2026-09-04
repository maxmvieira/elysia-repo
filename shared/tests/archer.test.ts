/**
 * 🏹 As 12 habilidades do Arqueiro — Doc 1, cap. 69.
 *
 * ✅ **É a classe mais bem especificada das cinco.** Ao contrário do cap. 68
 * (Assassino), aqui quase toda skill vem com número: cooldowns, percentuais por
 * nível, teto de alvos, contagem de armadilhas. Então este arquivo é
 * majoritariamente CITAÇÃO — quando um teste cair, a pergunta certa é "o doc
 * mudou?", não "ajusto o teste?".
 *
 * 🔴 E há um bloco só para as **quatro proibições** que definem a classe. Todas
 * são coisas que alguém adicionaria de boa-fé achando que está melhorando.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SKILLS,
  SKILL_IDS,
  MAX_SKILL_LEVEL,
  CLASSES,
  computeStats,
  skillsOfClass,
  branchesOfClass,
  skillHits,
  skillPower,
  skillModifiers,
  skillConditionChance,
  skillGroundMax,
  type SkillDef,
} from '../src/index.js';

const arqueiros = (): SkillDef[] => skillsOfClass('archer');

// ---------------------------------------------------------------------------
// A árvore
// ---------------------------------------------------------------------------

test('o Arqueiro tem as 12 habilidades da V1', () => {
  assert.equal(arqueiros().length, 12);
  assert.deepEqual(branchesOfClass('archer'), ['maestria', 'disparo', 'mira', 'armadilha']);
});

test('todas as 12 estão em SKILL_IDS e os pré-requisitos são da classe', () => {
  const ids = new Set(arqueiros().map((d) => d.id));
  for (const d of arqueiros()) {
    assert.ok(SKILL_IDS.includes(d.id), `${d.id} não está em SKILL_IDS`);
    for (const r of d.requires ?? []) {
      assert.ok(ids.has(r.skill), `${d.id} exige ${r.skill}, que não é do Arqueiro`);
      assert.ok(r.level >= 1 && r.level <= MAX_SKILL_LEVEL);
    }
  }
});

test('as propostas NÃO fechadas ficaram de fora', () => {
  // "Disparo Pesado, Flecha Explosiva, Arremesso Preciso, Arremesso Rápido" são
  // propostas não fechadas. Se aparecerem aqui um dia, foi invenção.
  const nomes = arqueiros().map((d) => d.name);
  for (const proibido of ['Disparo Pesado', 'Flecha Explosiva', 'Arremesso Preciso', 'Arremesso Rápido']) {
    assert.ok(!nomes.includes(proibido), `${proibido} é PROPOSTA não fechada e não deveria existir`);
  }
});

test('Flecha Explosiva ≠ Armadilha Explosiva — o doc manda não fundir', () => {
  // A que existe é a ARMADILHA. Se alguém a transformar num disparo, o `ground`
  // some e este teste cai.
  const e = SKILLS.explosive_trap;
  assert.equal(e.shape, 'ground');
  assert.equal(e.ground?.kind, 'trap');
});

// ---------------------------------------------------------------------------
// 🔴 As quatro proibições que definem a classe
// ---------------------------------------------------------------------------

test('DD-ARC-015: o Arqueiro NÃO tem dash, backstep nem teleporte', () => {
  /**
   * A sobrevivência dele é *"alcance → armadilha → Concentração → corrida"*.
   *
   * ⚠️ **O teste olha a MECÂNICA, não o texto.** A primeira versão varria
   * `name + desc` atrás das palavras proibidas e caiu na hora — a descrição da
   * Concentração diz *"é a fuga do Arqueiro, que não tem dash"*, e o regex não
   * distingue a habilidade da frase que a explica. Testar prosa pega o próprio
   * comentário; testar `kind` pega o teleporte.
   *
   * `charge` é o único tipo do jogo que REPOSICIONA o personagem (a Investida
   * do Knight). Nenhuma do Arqueiro pode ser.
   */
  for (const d of arqueiros()) {
    assert.notEqual(d.kind, 'charge', `${d.id} moveria o personagem, e o doc proíbe`);
  }
  // E a Concentração continua sendo a resposta CERTA: mais velocidade, não
  // teleporte. É o que o doc põe na lista de sobrevivência dele.
  assert.ok((skillModifiers(SKILLS.concentration, 10).moveSpeed ?? 0) > 0);
});

test('DD-ARC-019: munição elemental é ITEM — nada de "Flecha de Fogo" na árvore', () => {
  /**
   * O elemento vem da munição, do equipamento ou da carta. A ÚNICA habilidade
   * do Arqueiro com tipo de dano é a Armadilha Explosiva, e ela é uma explosão,
   * não uma flecha — o fogo é da trapa.
   */
  for (const d of arqueiros()) {
    if (d.id === 'explosive_trap') continue;
    assert.equal(
      d.damageType, undefined,
      `${d.id} tem elemento próprio, e elemento é munição (DD-ARC-019)`,
    );
  }
});

test('DD-ARC-009: o Disparo Perfurante NÃO atravessa inimigos', () => {
  // O nome sugere perfuração em fila e o doc corrige explicitamente. É o tipo
  // de coisa que alguém "conserta" de boa-fé daqui a seis meses.
  assert.equal(SKILLS.piercing_shot.shape, 'target');
});

test('DD-ARC-017: a Armadilha Explosiva NÃO deixa lento', () => {
  // "Explosão que também atrasa" é a adição óbvia que o doc proíbe. A ficha diz
  // isso pela AUSÊNCIA — a única condição dela é a Queimadura.
  assert.equal(SKILLS.explosive_trap.applies?.id, 'burn');
});

test('DD-ARC-013: estar mais longe não aumenta o dano', () => {
  // Não há campo de "bônus por distância" em habilidade nenhuma, e não pode
  // haver. O teste guarda a ausência.
  for (const d of arqueiros()) {
    assert.ok(!('damagePerTile' in d), `${d.id} não pode escalar com distância`);
    assert.ok(!('rangeBonus' in d), `${d.id} não pode escalar com distância`);
  }
});

// ---------------------------------------------------------------------------
// Os números que o doc dá
// ---------------------------------------------------------------------------

test('Disparo Duplo: só arco, CD 1,5 s, 2 projéteis de 60 % → 90 %', () => {
  const d = SKILLS.double_shot;
  assert.deepEqual(d.requiresWeapon, ['bow']);
  assert.equal(d.cooldownMs, 1500);
  assert.equal(skillHits(d, 1), 2);
  assert.equal(skillHits(d, 10), 2, 'são sempre DOIS projéteis; o que cresce é o dano');
  assert.ok(Math.abs(skillPower(d, 1) - 0.60) < 0.005, `Lv.1 deveria ser 60 %, veio ${skillPower(d, 1)}`);
  assert.ok(Math.abs(skillPower(d, 10) - 0.90) < 0.005, `Lv.10 deveria ser 90 %, veio ${skillPower(d, 10)}`);
});

test('Tiro Preciso: só besta, com 0,7 s de preparação', () => {
  const t = SKILLS.precise_shot;
  assert.deepEqual(t.requiresWeapon, ['crossbow']);
  assert.equal(t.castMs, 700);
});

test('as duas skills de arma são as ÚNICAS que exigem arma', () => {
  // É a primeira vez no jogo que uma habilidade depende do que está na mão. Se
  // aparecer uma terceira sem o doc pedir, é invenção.
  const comArma = Object.values(SKILLS).filter((d) => d.requiresWeapon);
  assert.deepEqual(comArma.map((d) => d.id).sort(), ['double_shot', 'precise_shot']);
});

test('Disparo Perfurante: CD 6 s, DEF −5 % → −15 %, sangramento 10 % → 30 %', () => {
  const p = SKILLS.piercing_shot;
  assert.equal(p.cooldownMs, 6000);
  const mods = skillModifiers(p, 10);
  assert.ok(Math.abs((mods.defense ?? 0) + 0.15) < 1e-9, 'no Lv.10 a DEF cai 15 %');
  assert.ok(Math.abs((skillModifiers(p, 1).defense ?? 0) + 0.05) < 1e-9, 'no Lv.1 cai 5 %');
  assert.ok(Math.abs(skillConditionChance(p, 1) - 0.10) < 1e-9);
  assert.ok(Math.abs(skillConditionChance(p, 10) - 0.30) < 1e-9);
});

test('Chuva de Flechas pega até 10 alvos', () => {
  assert.equal(SKILLS.arrow_rain.maxTargets, 10);
  assert.equal(SKILLS.arrow_rain.shape, 'area');
});

test('Saraivada dá de 5 a 8 disparos', () => {
  assert.equal(skillHits(SKILLS.volley, 1), 5);
  assert.equal(skillHits(SKILLS.volley, 10), 8);
});

test('Olho de Águia: +15 % precisão, +20 % alcance, e ZERO dano', () => {
  const e = SKILLS.eagle_eye;
  const mods = skillModifiers(e, 10);
  assert.ok(Math.abs((mods.accuracy ?? 0) - 0.15) < 1e-9);
  assert.ok(Math.abs((mods.attackRange ?? 0) - 0.20) < 1e-9);
  // "não dá dano" é citação, e é o que a separa de um buff ofensivo qualquer.
  assert.equal(e.power, 0);
});

test('Concentração: +15 % precisão, +10 % ASPD, +10 % movimento', () => {
  const mods = skillModifiers(SKILLS.concentration, 10);
  assert.ok(Math.abs((mods.accuracy ?? 0) - 0.15) < 1e-9);
  assert.ok(Math.abs((mods.attackSpeed ?? 0) - 0.10) < 1e-9);
  assert.ok(Math.abs((mods.moveSpeed ?? 0) - 0.10) < 1e-9);
});

test('Instinto do Caçador: esquiva +2 % → +10 %', () => {
  const mods1 = skillModifiers(SKILLS.hunter_instinct, 1);
  const mods10 = skillModifiers(SKILLS.hunter_instinct, 10);
  assert.ok(Math.abs((mods1.dodgeChance ?? 0) - 0.02) < 1e-9);
  assert.ok(Math.abs((mods10.dodgeChance ?? 0) - 0.10) < 1e-9);
});

test('Armadilha de Caça: 1 no Lv.1, 3 no Lv.10', () => {
  assert.equal(skillGroundMax(SKILLS.hunting_trap, 1), 1);
  assert.equal(skillGroundMax(SKILLS.hunting_trap, 10), 3);
});

test('as duas armadilhas são do tipo trap — armam e esperam', () => {
  for (const id of ['hunting_trap', 'explosive_trap'] as const) {
    assert.equal(SKILLS[id].ground?.kind, 'trap', `${id} deveria ser armadilha`);
    assert.equal(SKILLS[id].shape, 'ground');
  }
});

test('a Armadilha de Caça PRENDE e não fere; a Explosiva fere', () => {
  // A diferença entre as duas é a razão de existirem as duas.
  assert.equal(SKILLS.hunting_trap.power, 0);
  assert.equal(SKILLS.hunting_trap.applies?.id, 'root');
  assert.ok(SKILLS.explosive_trap.power > 0);
});

// ---------------------------------------------------------------------------
// A precisão, que não existia
// ---------------------------------------------------------------------------

test('DEX dá precisão — a promessa que ATTRIBUTE_INFO fazia desde o começo', () => {
  /**
   * 🔴 `ATTRIBUTE_INFO.dex` diz *"Dano de arco/besta · **precisão**"* desde o
   * primeiro dia, e precisão não existia em `DerivedStats`. Entrou com o
   * Arqueiro, porque duas das doze skills dele a concedem.
   */
  const base = { str: 5, vit: 6, agi: 9, dex: 11, int: 4, wis: 5, luk: 5 };
  const skill = { kind: 'distance' as const, level: 0, progress: 0 };
  const normal = computeStats(CLASSES.archer, base, 1, skill);
  const maisDex = computeStats(CLASSES.archer, { ...base, dex: base.dex + 20 }, 1, skill);
  assert.ok(normal.accuracy > 0, 'DEX já dá alguma precisão de base');
  assert.ok(maisDex.accuracy > normal.accuracy, 'mais DEX, mais precisão');
});

test('a esquiva pesa mais que a precisão, ponto por ponto', () => {
  // Quem investe em AGI para desviar tem de levar vantagem sobre quem investe
  // em DEX só para acertar — senão a esquiva vira estatística morta no duelo.
  const base = { str: 5, vit: 5, agi: 20, dex: 20, int: 5, wis: 5, luk: 5 };
  const s = computeStats(CLASSES.archer, base, 1, { kind: 'distance', level: 0, progress: 0 });
  assert.ok(s.dodgeChance > s.accuracy, 'com AGI = DEX, a esquiva vence');
});
