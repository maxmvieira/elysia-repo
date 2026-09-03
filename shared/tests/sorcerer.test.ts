/**
 * 🔮 As 18 habilidades do Feiticeiro — Doc 1, cap. 70.
 *
 * ⚠️ `70.60`: o Feiticeiro **não sofreu reformulação posterior**. Ao contrário
 * do Archer, a V1 é a versão atual — não há revisão escondida que justifique
 * "corrigir" um número daqui sem o doc mudar.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SKILLS,
  CLASSES,
  CONDITIONS,
  MAX_SKILL_LEVEL,
  skillsOfClass,
  branchesOfClass,
  skillHits,
  skillDuration,
  skillGroundDuration,
  skillGroundMax,
  skillConditionChance,
  skillConditionDuration,
  skillCastMs,
  skillModifiers,
  castMasteryReduction,
  magicProtectionShare,
  manaRegenBonus,
  WEAPON_IDENTITY,
  type SkillDef,
} from '../src/index.js';

const magos = (): SkillDef[] => skillsOfClass('sorcerer');

// ---------------------------------------------------------------------------
// A contagem
// ---------------------------------------------------------------------------

test('o Feiticeiro tem exatamente 18 habilidades em 4 escolas', () => {
  assert.equal(magos().length, 18);
  assert.deepEqual(branchesOfClass('sorcerer'), ['fogo', 'gelo', 'raio', 'arcano']);
});

test('as escolas têm 4 · 4 · 3 · 7', () => {
  const conta = (ramo: string): number => magos().filter((d) => d.branch === ramo).length;
  assert.equal(conta('fogo'), 4, '🔥 fogo');
  assert.equal(conta('gelo'), 4, '❄️ gelo');
  // "Só 3, de propósito" — o doc diz isso com todas as letras.
  assert.equal(conta('raio'), 3, '⚡ raio');
  assert.equal(conta('arcano'), 7, '✨ arcano');
});

// ---------------------------------------------------------------------------
// 🔴 DD-PROG-028 — o ataque básico com cajado é FÍSICO
// ---------------------------------------------------------------------------

test('DD-PROG-028: o cajado bate de perto e não conjura de graça', () => {
  // A correção de 03/09. Se alguém devolver `attackType: 'magic'` à classe, o
  // Feiticeiro volta a atirar firebolt sem gastar habilidade — que é
  // exatamente o que o doc proíbe.
  assert.equal(CLASSES.sorcerer.attackType, 'melee');
  assert.equal(CLASSES.sorcerer.attackRange, 1);
  assert.equal(CLASSES.sorcerer.spellCost, 0);
  assert.equal(CLASSES.sorcerer.projectile, undefined);
});

test('o cajado canaliza magia, mas o golpe dele é físico', () => {
  // As duas coisas convivem: `magic` manda o poder da arma para `magicAtk`, e
  // `basicPhysical` mantém o golpe comum como bastonada corpo a corpo.
  const cajado = WEAPON_IDENTITY.staff;
  assert.equal(cajado.magic, true, 'o cajado ainda aumenta poder mágico');
  assert.equal(cajado.basicPhysical, true, 'mas o golpe básico é físico');
  assert.equal(cajado.range, 1, 'e de perto');
});

test('o Feiticeiro precisa de MANA para causar dano à distância', () => {
  // O outro lado de `DD-PROG-028`: "dano mágico à distância exige gastar uma
  // habilidade e mana". Toda ofensiva dele custa mana e tem alcance.
  const ofensivas = magos().filter((d) => d.power > 0);
  assert.ok(ofensivas.length >= 8);
  for (const d of ofensivas) {
    assert.ok(d.manaCost > 0, `${d.id} teria dano de graça`);
    assert.equal(d.magic, true, `${d.id} deveria escalar com poder mágico`);
  }
});

// ---------------------------------------------------------------------------
// 🔥 Fogo
// ---------------------------------------------------------------------------

test('Chuva de Meteoros: pré-requisito Fire Bolt 5 + Fire Wall 5 + Meteoro 5', () => {
  // Citação literal do cap. 70.
  const req = SKILLS.meteor_storm.requires ?? [];
  assert.equal(req.length, 3);
  const mapa = new Map(req.map((r) => [r.skill, r.level]));
  assert.equal(mapa.get('fire_bolt'), 5);
  assert.equal(mapa.get('fire_wall'), 5);
  assert.equal(mapa.get('meteor'), 5);
});

test('Chuva de Meteoros: 10 meteoros, cast de 3 s e CD de 15 s no Lv.10', () => {
  // "Lv.10: 10 meteoros, área grande, ~4 s, cast ~3 s, CD ~15 s, MP altíssimo."
  const c = SKILLS.meteor_storm;
  assert.equal(skillHits(c, 10), 10);
  assert.equal(c.castMs, 3000);
  assert.equal(c.cooldownMs, 15000);
  assert.ok(c.manaCost >= 100, 'MP altíssimo');
});

test('Fire Bolt é multi-hit e econômico — o "Golpe Poderoso do mago"', () => {
  const fb = SKILLS.fire_bolt;
  assert.equal(fb.kind, 'multihit');
  assert.ok(skillHits(fb, 10) > skillHits(fb, 1));
  // Econômico: é a magia mais barata da classe.
  const maisBarata = Math.min(...magos().filter((d) => d.manaCost > 0).map((d) => d.manaCost));
  assert.equal(fb.manaCost, maisBarata);
});

// ---------------------------------------------------------------------------
// ❄️ Gelo
// ---------------------------------------------------------------------------

test('Ice Wall: 1 parede no Lv.1, 3 no Lv.10, durando de 20 s a 60 s', () => {
  // Citação: "1→3 paredes simultâneas, 20 s→60 s".
  const w = SKILLS.ice_wall;
  assert.equal(skillGroundMax(w, 1), 1);
  assert.equal(skillGroundMax(w, 10), 3);
  assert.equal(skillGroundDuration(w, 1), 20000);
  assert.equal(skillGroundDuration(w, 10), 60000);
  assert.equal(w.ground?.blocks, true, 'é barreira física de verdade');
});

test('a Ice Wall é a ÚNICA magia que bloqueia passagem', () => {
  // Muralha de Fogo controla espaço tornando-o caro, não impedindo-o. Confundir
  // as duas apagaria a diferença entre as escolas.
  for (const d of Object.values(SKILLS)) {
    if (d.id === 'ice_wall') continue;
    assert.ok(!d.ground?.blocks, `${d.id} não deveria bloquear passagem`);
  }
});

test('DD-SOR-012: a Nevasca congela 8–12 % por impacto, e o gelo dura 10 s', () => {
  // Correção registrada: a proposta antiga era 25 %, e caiu para 8–12 % quando
  // o Congelamento passou a durar ~10 s.
  const n = SKILLS.blizzard;
  assert.ok(Math.abs(skillConditionChance(n, 1) - 0.08) < 1e-9);
  assert.ok(Math.abs(skillConditionChance(n, 10) - 0.12) < 1e-9);
  assert.equal(skillConditionDuration(n, 10), 10000);
  assert.equal(CONDITIONS.freeze.referenceDurationMs, 10000);
});

test('o combo do doc funciona: dano quebra o Congelamento, não a Petrificação', () => {
  // "Congela → abre distância → prepara Meteoro → impacto quebra o gelo."
  // É a tensão que o doc quer, e ela mora em `conditions.ts`.
  assert.equal(CONDITIONS.freeze.brokenByDamage, true);
  assert.equal(CONDITIONS.petrify.brokenByDamage, false);
});

test('Explosão Glacial é 360° ao redor de si — a resposta a quem colou', () => {
  const g = SKILLS.glacial_burst;
  assert.equal(g.shape, 'area');
  assert.ok(g.range <= 2, 'curta: serve para descolar, não para farmar');
});

// ---------------------------------------------------------------------------
// ⚡ Raio
// ---------------------------------------------------------------------------

test('Esfera Elétrica dá 8 impactos no Lv.10', () => {
  assert.equal(skillHits(SKILLS.lightning_ball, 10), 8);
});

test('o empurrão é tratado SEPARADO do dano', () => {
  // "Resistir ao empurrão não evita o dano." No código isso é automático: a
  // condição pode falhar e o golpe entra igual. O que o teste trava é que a
  // habilidade tenha AS DUAS coisas — dano próprio e condição à parte.
  const lb = SKILLS.lightning_ball;
  assert.ok(lb.power > 0);
  assert.equal(lb.applies?.id, 'knockback');
});

test('DD-SOR-018: a Descarga Elétrica não atordoa e não empurra', () => {
  // A ficha dela é a ausência: nenhuma condição, de propósito.
  const d = SKILLS.electric_discharge;
  assert.equal(d.applies, undefined);
  assert.ok(d.power > 0, 'mas ela causa dano — é a AoE rápida da escola');
});

test('Ira de Thor atordoa pouco, e o anti-cadeia é o do jogo inteiro', () => {
  const t = SKILLS.thor_wrath;
  assert.equal(t.applies?.id, 'stun');
  assert.ok(skillConditionChance(t, 10) <= 0.15, '"pequena chance de stun por impacto"');
});

// ---------------------------------------------------------------------------
// ✨ Arcano
// ---------------------------------------------------------------------------

test('DD-SOR-023/024: o Círculo Arcano dura 2 s → 4 s, com CD de 45 s', () => {
  // Citação: "Lv.1 2,0 s → Lv.10 4,0 s, CD 45 s".
  const c = SKILLS.arcane_circle;
  assert.equal(skillGroundDuration(c, 1), 2000);
  assert.equal(skillGroundDuration(c, 10), 4000);
  assert.equal(c.cooldownMs, 45000);
  assert.equal(c.ground?.kind, 'ward');
});

test('o ramo arcano não causa dano nenhum — ele faz o Feiticeiro funcionar', () => {
  for (const d of magos().filter((x) => x.branch === 'arcano')) {
    assert.equal(d.power, 0, `${d.id} não deveria causar dano`);
  }
});

test('a árvore arcana é RAMIFICADA, não linear', () => {
  // "Aprimoramento → Amplificação (Lv.5) e Maestria (Lv.3) · Regeneração de
  // Mana → Proteção Mágica (Lv.3)." Duas raízes sem pré-requisito, e cada uma
  // com filhos próprios.
  assert.equal(SKILLS.magic_enhance.requires, undefined);
  assert.equal(SKILLS.mana_regen.requires, undefined);
  assert.deepEqual(SKILLS.magic_amplify.requires, [{ skill: 'magic_enhance', level: 5 }]);
  assert.deepEqual(SKILLS.cast_mastery.requires, [{ skill: 'magic_enhance', level: 3 }]);
  assert.deepEqual(SKILLS.magic_protection.requires, [{ skill: 'mana_regen', level: 3 }]);
});

test('Proteção Mágica liga e desliga, e converte no máximo metade do dano', () => {
  // "Converte parte do dano recebido em consumo de MP; liga e desliga."
  assert.equal(SKILLS.magic_protection.kind, 'toggle');
  assert.equal(SKILLS.magic_protection.durationMs, 0, 'alternável não tem duração');
  assert.ok(magicProtectionShare(10) <= 0.5, 'acima de 50 % viraria imortalidade com mana');
  assert.ok(magicProtectionShare(10) > magicProtectionShare(1));
  assert.equal(magicProtectionShare(0), 0, 'não aprendida não converte nada');
});

test('a Maestria de Conjuração encurta o CAST, e nunca o cooldown', () => {
  // O GDD proíbe cooldown cair com o nível. Cast é outro eixo — e é o único
  // que pode encolher.
  const chuva = SKILLS.meteor_storm;
  assert.ok(skillCastMs(chuva, 10, 10) < skillCastMs(chuva, 10, 0));
  assert.ok(castMasteryReduction(10) <= 0.30, 'teto de −30 %');
  assert.equal(castMasteryReduction(0), 0);
  // A maior magia do jogo continua interrompível: nunca abaixo de ~2 s.
  assert.ok(skillCastMs(chuva, 10, 10) >= 2000);
});

test('a Maestria não inventa cast em quem não tem', () => {
  // Fire Bolt é instantânea; reduzir 30 % de zero não pode virar número
  // negativo nem ligar uma barra de conjuração fantasma.
  assert.equal(skillCastMs(SKILLS.fire_bolt, 10, 10), 0);
});

test('Aprimoramento e Regeneração de Mana são passivas de verdade', () => {
  for (const id of ['magic_enhance', 'cast_mastery', 'mana_regen'] as const) {
    assert.equal(SKILLS[id].kind, 'passive', `${id} deveria ser passiva`);
    assert.equal(SKILLS[id].manaCost, 0);
  }
  assert.ok(manaRegenBonus(10) > manaRegenBonus(1));
  assert.equal(manaRegenBonus(0), 0);
});

test('Amplificação Mágica é janela CURTA e cara — não é buff permanente', () => {
  const a = SKILLS.magic_amplify;
  assert.ok(skillDuration(a, 10) <= 20000, 'janela de burst, não estado normal');
  assert.ok(a.cooldownMs > skillDuration(a, 10), 'o CD tem de ser maior que a duração');
  assert.ok((skillModifiers(a, 10).magicAtk ?? 0) > 0.3);
});

// ---------------------------------------------------------------------------
// Higiene
// ---------------------------------------------------------------------------

test('todo pré-requisito do Feiticeiro aponta para outra magia dele', () => {
  const ids = new Set(magos().map((d) => d.id));
  for (const d of magos()) {
    for (const r of d.requires ?? []) {
      assert.ok(ids.has(r.skill), `${d.id} exige ${r.skill}, que não é do Feiticeiro`);
      assert.ok(r.level >= 1 && r.level <= MAX_SKILL_LEVEL);
    }
  }
});

test('as supremas são caras, lentas e de nível alto — nenhuma é spam', () => {
  for (const id of ['meteor_storm', 'blizzard', 'thor_wrath'] as const) {
    const d = SKILLS[id];
    assert.ok(d.reqLevel >= 50, `${id} deveria exigir nível alto`);
    assert.ok(d.cooldownMs >= 15000, `${id} deveria ter CD longo`);
    assert.ok(d.castMs && d.castMs >= 2000, `${id} deveria ser interrompível`);
  }
});
