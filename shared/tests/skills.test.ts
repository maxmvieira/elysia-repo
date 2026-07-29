/**
 * Sistema de Skill Points e árvore de habilidades (GDD §4/§5).
 * Trava as decisões fechadas na conversa-fonte: custo 28 para maximizar,
 * renda de pontos por classe, cooldown fixo e pré-requisitos de árvore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SKILL_LEVEL,
  SKILLS,
  SKILL_BAR,
  SKILL_LEVEL_COST,
  getSkill,
  isSkillUsable,
  skillManaCost,
  skillPointsAtLevel,
  skillPointsTotalUpTo,
  skillPower,
  skillRange,
  skillResetCost,
  skillTotalCost,
  skillUpBlockedReason,
  skillUpgradeCost,
} from '../src/index.js';

test('maximizar uma habilidade custa 28 Skill Points', () => {
  assert.equal(skillTotalCost(MAX_SKILL_LEVEL), 28);
  assert.equal(SKILL_LEVEL_COST.length, MAX_SKILL_LEVEL);
});

test('chegar ao Lv.5 é barato; os últimos níveis é que doem', () => {
  assert.equal(skillTotalCost(5), 7, 'Lv.5 custa 7 no total');
  const ultimos = skillTotalCost(10) - skillTotalCost(5);
  assert.equal(ultimos, 21, 'do Lv.5 ao Lv.10 custa 21 — três vezes mais');
});

test('custo por nível nunca diminui e trava no máximo', () => {
  let anterior = 0;
  for (let n = 0; n < MAX_SKILL_LEVEL; n++) {
    const c = skillUpgradeCost(n);
    assert.ok(c >= anterior, `custo caiu no nível ${n}`);
    anterior = c;
  }
  assert.equal(skillUpgradeCost(MAX_SKILL_LEVEL), Infinity, 'não dá para passar do Lv.10');
});

test('renda de Skill Points por classe bate com as médias do GDD', () => {
  // 100 níveis: Knight ~1,5/nível, Assassin/Archer ~1,7, Sorcerer ~2,5
  // (os marcos somam por cima disso).
  const marcos = 5 * 5; // Lv.10, 25, 50, 75, 100
  const medias: Array<[Parameters<typeof skillPointsTotalUpTo>[0], number]> = [
    ['knight', 1.5],
    ['assassin', 1.7],
    ['archer', 1.7],
    ['sorcerer', 2.5],
  ];
  for (const [cls, media] of medias) {
    const total = skillPointsTotalUpTo(cls, 100) - marcos;
    assert.equal(total, Math.round(media * 100), `renda do ${cls} em 100 níveis`);
  }
});

test('a renda entrega as skills maximizadas que o GDD projetou', () => {
  // Knight ~5 skills Lv.10; Assassin/Archer ~6; Sorcerer ~9-10.
  const maximas = (cls: Parameters<typeof skillPointsTotalUpTo>[0]): number =>
    Math.floor(skillPointsTotalUpTo(cls, 100) / 28);
  assert.equal(maximas('knight'), 6);
  assert.equal(maximas('assassin'), 6);
  assert.equal(maximas('archer'), 6);
  assert.equal(maximas('sorcerer'), 9);
  assert.ok(maximas('sorcerer') > maximas('knight'), 'Sorcerer desenvolve mais magias');
});

test('níveis de marco valem mais que os outros', () => {
  assert.ok(skillPointsAtLevel('knight', 10) > skillPointsAtLevel('knight', 11));
  assert.ok(skillPointsAtLevel('knight', 50) > skillPointsAtLevel('knight', 51));
  assert.ok(skillPointsAtLevel('knight', 150) > skillPointsAtLevel('knight', 151));
});

test('subir o nível aumenta o dano das habilidades ofensivas', () => {
  const ofensivas = Object.values(SKILLS).filter((d) => d.power > 0);
  assert.ok(ofensivas.length >= 5, 'o Knight tem várias habilidades de dano');
  for (const def of ofensivas) {
    assert.ok(skillPower(def, 10) > skillPower(def, 1), `${def.id} deveria dar mais dano no Lv.10`);
  }
});

test('nenhuma habilidade fica mais rápida ao subir de nível', () => {
  // O cooldown é um campo fixo: não existe cooldownPerLevel em lugar nenhum.
  // Este teste existe para que ninguém adicione um no futuro sem perceber.
  for (const def of Object.values(SKILLS)) {
    assert.equal(typeof def.cooldownMs, 'number');
    assert.ok(def.cooldownMs > 0, `${def.id} precisa de um cooldown`);
    assert.ok(!('cooldownPerLevel' in def), `${def.id} não pode ter cooldown por nível`);
  }
});

test('Golpe Poderoso bate mais forte; Bash compensa pegando todos', () => {
  const gp = SKILLS.power_strike;
  const bash = SKILLS.bash;
  assert.ok(skillPower(gp, 1) > skillPower(bash, 1), 'alvo único dá mais dano por alvo');
  assert.equal(gp.shape, 'target');
  assert.equal(bash.shape, 'area');
  assert.equal(gp.cooldownMs, 1500, 'GDD: Golpe Poderoso 1,5 s');
  assert.equal(bash.cooldownMs, 3500, 'GDD: Bash 3,5 s');
});

test('a área do Bash cresce com o nível, mas sem ficar gigantesca', () => {
  const bash = SKILLS.bash;
  assert.equal(skillRange(bash, 1), 1);
  assert.equal(skillRange(bash, 10), 2, 'no Lv.10 chega a 2 tiles, não mais');
});

test('a árvore exige o pré-requisito: Bash depende de Golpe Poderoso Lv.3', () => {
  assert.deepEqual(SKILLS.bash.requires, [{ skill: 'power_strike', level: 3 }]);

  const semPreReq = skillUpBlockedReason(SKILLS.bash, 'knight', 10, { power_strike: 2 }, 99);
  assert.match(semPreReq ?? '', /Golpe Poderoso Lv\.3/);

  const comPreReq = skillUpBlockedReason(SKILLS.bash, 'knight', 10, { power_strike: 3 }, 99);
  assert.equal(comPreReq, null, 'com o pré-requisito cumprido, libera');
});

test('nível de personagem também trava a habilidade', () => {
  const cedo = skillUpBlockedReason(SKILLS.bash, 'knight', 4, { power_strike: 3 }, 99);
  assert.match(cedo ?? '', /exige nível 5/);
});

test('sem pontos suficientes, não sobe', () => {
  const semPontos = skillUpBlockedReason(SKILLS.power_strike, 'knight', 1, {}, 0);
  assert.match(semPontos ?? '', /Skill Points/);
});

test('classe errada não aprende a habilidade do Knight', () => {
  const r = skillUpBlockedReason(SKILLS.bash, 'sorcerer', 99, { power_strike: 10 }, 999);
  assert.match(r ?? '', /não pertence à sua classe/);
});

test('não dá para passar do Lv.10', () => {
  const r = skillUpBlockedReason(SKILLS.power_strike, 'knight', 99, { power_strike: 10 }, 999);
  assert.match(r ?? '', /nível máximo/);
});

test('habilidade só é usável depois de aprendida', () => {
  assert.equal(isSkillUsable(SKILLS.power_strike, 'knight', {}), false);
  assert.equal(isSkillUsable(SKILLS.power_strike, 'knight', { power_strike: 1 }), true);
  assert.equal(isSkillUsable(SKILLS.power_strike, 'sorcerer', { power_strike: 5 }), false);
});

test('reset fica progressivamente caro e para de subir no 4º', () => {
  assert.equal(skillResetCost(0), 500, '1º reset é quase de graça');
  assert.ok(skillResetCost(1) > skillResetCost(0));
  assert.ok(skillResetCost(2) > skillResetCost(1));
  assert.equal(skillResetCost(3), skillResetCost(10), 'a partir do 4º existe teto');
});

test('a barra de atalhos só aponta para habilidades que existem', () => {
  for (const id of SKILL_BAR) {
    if (id === null) continue;
    assert.ok(getSkill(id), `SKILL_BAR aponta para habilidade inexistente: ${id}`);
  }
  assert.equal(getSkill('nao_existe'), undefined);
});
