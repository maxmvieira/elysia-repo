/**
 * 🌿 As 23 habilidades do Druida — Doc 1, cap. 71.
 *
 * 🔴 **Este arquivo existe para travar CITAÇÃO, não balanceamento.** Quase todo
 * número conferido aqui está escrito no documento com todas as letras; quando um
 * teste falhar, a pergunta certa é "o doc mudou?", não "ajusto o teste?".
 *
 * Os poucos valores que o doc NÃO deu estão marcados ⚠️ REFERÊNCIA no
 * `skills.ts` e são conferidos aqui só por estrutura (existe? tem a forma
 * certa?), nunca por valor exato.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SKILLS,
  SKILL_IDS,
  MAX_SKILL_LEVEL,
  skillsOfClass,
  branchesOfClass,
  skillPower,
  skillManaCost,
  skillDuration,
  skillModifiers,
  skillConditionChance,
  skillConditionDuration,
  skillGroundDuration,
  hotTickMs,
  HOT_PULSES,
  rootsPetrifyChance,
  ROOTS_PETRIFY_FROM_LEVEL,
  natureAffinityBonus,
  benefitsFromNatureAffinity,
  computeStats,
  CLASSES,
  type SkillDef,
} from '../src/index.js';

const druidas = (): SkillDef[] => skillsOfClass('druid');

// ---------------------------------------------------------------------------
// A contagem — `DD-DRU-006`
// ---------------------------------------------------------------------------

test('o Druida tem exatamente 23 habilidades em 4 ramos', () => {
  // `DD-DRU-006`: a contagem foi corrigida de 22 para 23. Se este número mudar
  // sem o doc mudar, alguém inventou ou perdeu uma habilidade.
  assert.equal(druidas().length, 23);
  assert.deepEqual(branchesOfClass('druid'), ['cura', 'buff', 'debuff', 'natureza']);
});

test('os quatro ramos têm 5 · 6 · 6 · 6', () => {
  const conta = (ramo: string): number => druidas().filter((d) => d.branch === ramo).length;
  assert.equal(conta('cura'), 5, '💚 cura');
  assert.equal(conta('buff'), 6, '🌟 buff/defesa');
  assert.equal(conta('debuff'), 6, '☠️ debuff');
  assert.equal(conta('natureza'), 6, '🌿 natureza');
});

test('~230 níveis possíveis: maximizar tudo é impossível de propósito', () => {
  // O doc justifica a árvore grande dizendo "~230 níveis possíveis". 23 × 10.
  assert.equal(druidas().length * MAX_SKILL_LEVEL, 230);
});

test('DD-DRU-032: o Druida NÃO tem ressurreição', () => {
  // "A função dele é impedir a morte, não desfazê-la." Nenhuma habilidade pode
  // agir sobre alvo morto — e nenhuma se chama assim.
  for (const d of druidas()) {
    assert.ok(
      !/ressur|revive|reviv/i.test(d.name + d.desc),
      `${d.id} parece ressuscitar, e DD-DRU-032 proíbe`,
    );
  }
});

// ---------------------------------------------------------------------------
// 💚 Cura
// ---------------------------------------------------------------------------

test('Cura: CD de 1 s e cast de 1 s — o limitador é MP + cast, não recarga', () => {
  const heal = SKILLS.heal;
  assert.equal(heal.cooldownMs, 1000);
  assert.equal(heal.castMs, 1000);
});

test('Cura no Lv.10 vale 450 % do Lv.1', () => {
  // Citação: "Lv.10 = 450 % de poder relativo".
  const heal = SKILLS.heal;
  const razao = skillPower(heal, 10) / skillPower(heal, 1);
  assert.ok(
    Math.abs(razao - 4.5) < 0.05,
    `esperado ~4,5×, veio ${razao.toFixed(2)}×`,
  );
});

test('Regeneração: 10 pulsos em 20 s', () => {
  // Citação: "HoT, ~10 pulsos em ~20 s".
  const regen = SKILLS.regeneration;
  assert.equal(skillDuration(regen, 1), 20000);
  assert.equal(HOT_PULSES, 10);
  assert.equal(hotTickMs(regen, 1), 2000);
});

test('Regeneração é MAIS EFICIENTE EM MANA que a Cura direta', () => {
  // Citação: "mais eficiente em mana que a cura direta". É a promessa que
  // justifica a habilidade existir, e é medível — então está medida.
  const heal = SKILLS.heal;
  const regen = SKILLS.regeneration;
  for (const nivel of [1, 5, 10]) {
    const porManaCura = skillPower(heal, nivel) / skillManaCost(heal, nivel);
    const totalRegen = skillPower(regen, nivel) * HOT_PULSES;
    const porManaRegen = totalRegen / skillManaCost(regen, nivel);
    assert.ok(
      porManaRegen > porManaCura,
      `Lv.${nivel}: regeneração ${porManaRegen.toFixed(3)}/mana não supera cura ${porManaCura.toFixed(3)}/mana`,
    );
  }
});

test('a Cura de emergência é instantânea — emergência com cast chega tarde', () => {
  assert.equal(SKILLS.emergency_heal.castMs, undefined);
  assert.ok(SKILLS.emergency_heal.cooldownMs >= 30000, 'e é botão de pânico, não rotação');
});

// ---------------------------------------------------------------------------
// 🌟 Buffs
// ---------------------------------------------------------------------------

test('Bênção da Natureza exige as QUATRO anteriores no Lv.5', () => {
  // Citação direta do cap. 71.
  const req = SKILLS.nature_blessing.requires ?? [];
  assert.equal(req.length, 4);
  const ids = req.map((r) => r.skill).sort();
  assert.deepEqual(ids, ['blessing_agility', 'nature_strength', 'oak_skin', 'spirit_blessing']);
  for (const r of req) assert.equal(r.level, 5, `${r.skill} precisa estar no Lv.5`);
});

test('Bênção da Natureza dura 30 s → 90 s, com CD de 30 s', () => {
  // Citação: "dura 30→90 s, CD ~30 s — é magia de 'vamos entrar no MVP'".
  const b = SKILLS.nature_blessing;
  assert.equal(skillDuration(b, 1), 30000);
  assert.equal(skillDuration(b, 10), 90000);
  assert.equal(b.cooldownMs, 30000);
});

test('Harmonia Natural: os quatro números do Lv.10 são os do doc', () => {
  // Citação: "+15 % resist. a status, +10 % elemental, +15 % a debuffs,
  // +10 % de cura recebida por ele mesmo".
  const mods = skillModifiers(SKILLS.natural_harmony, 10);
  assert.ok(Math.abs((mods.statusResist ?? 0) - 0.15) < 1e-9);
  assert.ok(Math.abs((mods.elementalResist ?? 0) - 0.10) < 1e-9);
  assert.ok(Math.abs((mods.debuffResist ?? 0) - 0.15) < 1e-9);
  assert.ok(Math.abs((mods.healReceived ?? 0) - 0.10) < 1e-9);
});

test('Harmonia Natural é passiva e SÓ do próprio Druida', () => {
  // "Passiva só do próprio Druid, não é buff de party."
  const h = SKILLS.natural_harmony;
  assert.equal(h.kind, 'passive');
  assert.equal(h.shape, 'self');
});

test('Harmonia Natural aumenta a cura RECEBIDA, não a que ele dá', () => {
  // O doc é explícito: "não aumenta a cura que ele dá". Trocar a chave por
  // `healPower` seria o erro fácil, e este teste é o que o pega.
  const mods = skillModifiers(SKILLS.natural_harmony, 10);
  assert.equal(mods.healPower, undefined);
  assert.ok((mods.healReceived ?? 0) > 0);
});

// ---------------------------------------------------------------------------
// ☠️ Debuff — a tabela inteira do cap. 71
// ---------------------------------------------------------------------------

test('a tabela de debuffs bate com o doc, linha por linha', () => {
  // | Skill | Lv.10 | CD | — tudo citação.
  const casos: Array<{
    id: keyof typeof SKILLS;
    mods: Partial<Record<string, number>>;
    duracao: number;
    cd: number;
  }> = [
    { id: 'weaken', mods: { physAtk: -0.15, magicAtk: -0.15 }, duracao: 16000, cd: 5000 },
    { id: 'vulnerability', mods: { defense: -0.15, magicResist: -0.15 }, duracao: 12000, cd: 8000 },
    { id: 'curse_slowness', mods: { moveSpeed: -0.25, attackSpeed: -0.15 }, duracao: 10000, cd: 8000 },
    { id: 'curse_weakness', mods: { healReceived: -0.40 }, duracao: 10000, cd: 15000 },
  ];
  for (const caso of casos) {
    const def = SKILLS[caso.id];
    const mods = skillModifiers(def, 10) as Record<string, number>;
    for (const [k, v] of Object.entries(caso.mods)) {
      assert.ok(
        Math.abs((mods[k] ?? 0) - (v as number)) < 1e-9,
        `${caso.id}.${k}: esperado ${v}, veio ${mods[k]}`,
      );
    }
    assert.equal(skillDuration(def, 10), caso.duracao, `${caso.id}: duração`);
    assert.equal(def.cooldownMs, caso.cd, `${caso.id}: cooldown`);
  }
});

test('Silêncio dura 6 s, tem CD de 20 s — e o alvo continua andando e batendo', () => {
  // "bloqueia magia, mas o alvo continua andando e batendo" — a regra mora em
  // `conditions.ts`, e é lá que este teste vai conferi-la.
  const s = SKILLS.silence;
  assert.equal(skillConditionDuration(s, 10), 6000);
  assert.equal(s.cooldownMs, 20000);
  assert.equal(s.applies?.id, 'silence');
});

test('Praga da Natureza: versões reduzidas de tudo (−10/−10/−15/−10 %)', () => {
  // Citação: "AoE com versões reduzidas de tudo (−10/−10/−15/−10 %), 8–10 s,
  // CD ~25 s". Os quatro batem, na ordem, com as quatro maldições.
  const p = SKILLS.nature_plague;
  const mods = skillModifiers(p, 10);
  assert.ok(Math.abs((mods.physAtk ?? 0) + 0.10) < 1e-9, 'ataque −10 %');
  assert.ok(Math.abs((mods.defense ?? 0) + 0.10) < 1e-9, 'defesa −10 %');
  assert.ok(Math.abs((mods.moveSpeed ?? 0) + 0.15) < 1e-9, 'movimento −15 %');
  assert.ok(Math.abs((mods.healReceived ?? 0) + 0.10) < 1e-9, 'cura recebida −10 %');
  assert.equal(p.cooldownMs, 25000);
  assert.equal(p.shape, 'area');
});

test('cada debuff da Praga é MAIS FRACO que a maldição dedicada', () => {
  // É o que "versões reduzidas" quer dizer: a AoE nunca pode substituir a
  // habilidade individual, senão o Druida só apertaria uma tecla.
  const praga = skillModifiers(SKILLS.nature_plague, 10);
  const pares: Array<[string, keyof typeof SKILLS]> = [
    ['physAtk', 'weaken'],
    ['defense', 'vulnerability'],
    ['moveSpeed', 'curse_slowness'],
    ['healReceived', 'curse_weakness'],
  ];
  for (const [chave, dedicada] of pares) {
    const p = Math.abs((praga as Record<string, number>)[chave] ?? 0);
    const d = Math.abs((skillModifiers(SKILLS[dedicada], 10) as Record<string, number>)[chave] ?? 0);
    assert.ok(p < d, `${chave}: praga ${p} deveria ser menor que ${dedicada} ${d}`);
  }
});

// ---------------------------------------------------------------------------
// 🌿 Natureza e a Petrificação
// ---------------------------------------------------------------------------

test('Raízes Prensoras: 4 s no Lv.10, e a condição prende só os PÉS', () => {
  // "Imobiliza: pode atacar e conjurar, mas não anda; Lv.10 ~4 s."
  const r = SKILLS.binding_roots;
  assert.equal(skillConditionDuration(r, 10), 4000);
  assert.equal(r.applies?.id, 'root');
});

test('a Petrificação só aparece nos níveis ALTOS das Raízes', () => {
  // O doc diz "níveis altos" sem número; o Lv.7 é escolha nossa e está
  // documentada. O que este teste trava é a FORMA: nada de petrificar no Lv.1.
  assert.equal(rootsPetrifyChance(1), 0);
  assert.equal(rootsPetrifyChance(ROOTS_PETRIFY_FROM_LEVEL - 1), 0);
  assert.ok(rootsPetrifyChance(ROOTS_PETRIFY_FROM_LEVEL) > 0);
  assert.ok(rootsPetrifyChance(10) > rootsPetrifyChance(ROOTS_PETRIFY_FROM_LEVEL));
});

test('Lâminas de Vento: ~20 % de empurrão, e o empurrão não é o dano', () => {
  // "AoE, ~20 % de pequeno knockback". A chance não cresce com o nível de
  // propósito: o doc dá um número só.
  const w = SKILLS.wind_blades;
  assert.equal(w.applies?.id, 'knockback');
  assert.ok(Math.abs(skillConditionChance(w, 1) - 0.20) < 1e-9);
  assert.ok(Math.abs(skillConditionChance(w, 10) - 0.20) < 1e-9);
  assert.ok(w.power > 0, 'e ela causa dano de verdade, não só empurra');
});

test('Esporos Venenosos: área de veneno de 10 a 12 s', () => {
  // "DoT em área, 10–12 s."
  const e = SKILLS.poison_spores;
  assert.equal(skillGroundDuration(e, 1), 10000);
  assert.equal(skillGroundDuration(e, 10), 12000);
  assert.equal(e.damageType, 'poison');
});

test('Ira da Natureza: persistente de 4 s a 8 s, com 3–5 % de petrificação', () => {
  // "Persistente 4→8 s" e "~3–5 % por ciclo" — citação.
  const ira = SKILLS.nature_wrath;
  assert.equal(skillGroundDuration(ira, 1), 4000);
  assert.equal(skillGroundDuration(ira, 10), 8000);
  assert.equal(ira.applies?.id, 'petrify');
  assert.ok(Math.abs(skillConditionChance(ira, 1) - 0.03) < 1e-9);
  assert.ok(Math.abs(skillConditionChance(ira, 10) - 0.05) < 1e-9);
});

test('DD-DRU-021: a suprema do Druida dá MENOS dano bruto que a do Feiticeiro', () => {
  // "Dano bruto abaixo das supremas do Sorcerer." A conta é por alvo e no
  // Lv.10: Ira = pulsos × poder; Chuva = impactos × poder.
  const ira = SKILLS.nature_wrath;
  const pulsos = skillGroundDuration(ira, 10) / (ira.ground?.tickMs ?? 1);
  const totalIra = pulsos * skillPower(ira, 10);

  const chuva = SKILLS.meteor_storm;
  const totalChuva = 10 * skillPower(chuva, 10);

  assert.ok(
    totalIra < totalChuva,
    `Ira ${totalIra.toFixed(2)} deveria ficar abaixo da Chuva ${totalChuva.toFixed(2)}`,
  );
});

test('Afinidade com a Natureza dá +15 % e NÃO toca em cura (DD-DRU-026)', () => {
  assert.ok(Math.abs(natureAffinityBonus(10) - 0.15) < 1e-9);
  assert.equal(natureAffinityBonus(0), 0, 'não aprendida não bonifica nada');
  // Pega o ramo Natureza e o veneno...
  assert.ok(benefitsFromNatureAffinity(SKILLS.earth_spike));
  assert.ok(benefitsFromNatureAffinity(SKILLS.poison_spores));
  // ...e nenhuma cura, nenhum buff.
  for (const d of druidas()) {
    if (d.branch === 'cura' || d.branch === 'buff') {
      assert.ok(!benefitsFromNatureAffinity(d), `${d.id} não pode receber a afinidade`);
    }
  }
});

// ---------------------------------------------------------------------------
// A ficha: WIS, não INT
// ---------------------------------------------------------------------------

test('DD-PROG-024/025: é WIS que escala a cura, não INT', () => {
  const base = { str: 4, vit: 7, agi: 5, dex: 5, int: 9, wis: 11, luk: 4 };
  const skill = { kind: 'magic' as const, level: 0, progress: 0 };
  const normal = computeStats(CLASSES.druid, base, 1, skill);
  const maisWis = computeStats(CLASSES.druid, { ...base, wis: base.wis + 10 }, 1, skill);
  const maisInt = computeStats(CLASSES.druid, { ...base, int: base.int + 10 }, 1, skill);

  assert.ok(maisWis.healPower > normal.healPower, 'WIS tem de aumentar a cura');
  assert.equal(maisInt.healPower, normal.healPower, 'INT NÃO pode aumentar a cura');
  // E o contrário também vale, senão as duas viravam a mesma coisa:
  assert.ok(maisInt.magicAtk > normal.magicAtk, 'INT continua sendo o dano mágico');
  assert.equal(maisWis.magicAtk, normal.magicAtk);
});

test('a ficha V1 do cap. 71 continua batendo 140 de vida e 150 de mana', () => {
  // Já havia teste disto; repetido aqui porque `healPower` entrou na mesma
  // estrutura e um erro de digitação em `computeStats` derrubaria os dois.
  const base = { str: 4, vit: 7, agi: 5, dex: 5, int: 9, wis: 11, luk: 4 };
  const d = computeStats(CLASSES.druid, base, 1, { kind: 'magic', level: 0, progress: 0 });
  assert.equal(d.maxHp, 140);
  assert.equal(d.maxMana, 150);
});

// ---------------------------------------------------------------------------
// Higiene da árvore
// ---------------------------------------------------------------------------

test('todo pré-requisito do Druida aponta para outra habilidade do Druida', () => {
  // Um `requires` apontando para skill de outra classe travaria a árvore para
  // sempre, e o erro só apareceria com o personagem no nível certo.
  const ids = new Set(druidas().map((d) => d.id));
  for (const d of druidas()) {
    for (const r of d.requires ?? []) {
      assert.ok(ids.has(r.skill), `${d.id} exige ${r.skill}, que não é do Druida`);
      assert.ok(r.level >= 1 && r.level <= MAX_SKILL_LEVEL, `${d.id}: nível de pré-requisito inválido`);
    }
  }
});

test('nenhuma habilidade do Druida ficou fora de SKILL_IDS', () => {
  // `SKILL_IDS` é a lista que a UI varre. Uma habilidade fora dela existiria no
  // servidor e seria invisível na árvore — o pior tipo de bug.
  for (const d of druidas()) {
    assert.ok(SKILL_IDS.includes(d.id), `${d.id} não está em SKILL_IDS`);
  }
});
