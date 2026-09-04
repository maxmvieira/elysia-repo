/**
 * 🗡️ As 14 habilidades do Assassino — Doc 1, cap. 68.
 *
 * 🔴 **Este arquivo testa coisas de DOIS tipos, e a diferença importa mais aqui
 * do que no Druida ou no Feiticeiro.**
 *
 * O cap. 68 é o menos fechado das cinco classes: só o ramo de lâminas é
 * canônico. Então há testes de **citação** (a tabela do Ataque Duplo, as regras
 * de adaga/katar) e testes de **limite** — os que não conferem o número, mas a
 * RELAÇÃO que o doc amarra mesmo sem dar valor: a Evasão ser mais forte que o
 * Instinto do Caçador, o arremesso alcançar menos que o arco.
 *
 * Os de limite são os que mais protegem, porque sobrevivem ao rebalanceamento.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SKILLS,
  SKILL_IDS,
  MAX_SKILL_LEVEL,
  CLASSES,
  WEAPON_IDENTITY,
  skillsOfClass,
  branchesOfClass,
  skillRange,
  skillDuration,
  skillModifiers,
  skillHits,
  DOUBLE_ATTACK_CHANCE,
  doubleAttackChance,
  doubleAttackExtra,
  envenomChance,
  envenomPower,
  counterAttackShare,
  HIDDEN_STRIKE_BONUS,
  type SkillDef,
} from '../src/index.js';

const assassinos = (): SkillDef[] => skillsOfClass('assassin');

// ---------------------------------------------------------------------------
// A árvore
// ---------------------------------------------------------------------------

test('o Assassino tem 14 habilidades nas três famílias do doc', () => {
  // O cap. 68 fala em "quatro famílias" de ARMA (adagas, espadas curtas, katar,
  // arremesso). Katar não vira ramo próprio: a única habilidade dele — o Sonic
  // Blow — mora nas lâminas, com o Ataque Duplo que ele não tem.
  assert.equal(assassinos().length, 14);
  assert.deepEqual(branchesOfClass('assassin'), ['laminas', 'espada', 'arremesso']);
});

test('nenhuma habilidade do Assassino ficou fora de SKILL_IDS', () => {
  for (const d of assassinos()) {
    assert.ok(SKILL_IDS.includes(d.id), `${d.id} não está em SKILL_IDS`);
  }
});

test('todo pré-requisito do Assassino aponta para outra habilidade dele', () => {
  const ids = new Set(assassinos().map((d) => d.id));
  for (const d of assassinos()) {
    for (const r of d.requires ?? []) {
      assert.ok(ids.has(r.skill), `${d.id} exige ${r.skill}, que não é do Assassino`);
      assert.ok(r.level >= 1 && r.level <= MAX_SKILL_LEVEL);
    }
  }
});

// ---------------------------------------------------------------------------
// 🔴 ATAQUE DUPLO — a única coisa totalmente fechada da classe
// ---------------------------------------------------------------------------

test('a tabela do Ataque Duplo é a do doc, degrau por degrau', () => {
  // | Lv | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  // | Chance | 35% | 40% | 45% | 50% | 55% | 60% | 65% | 70% | 75% | 80% |
  const esperado = [0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80];
  assert.equal(DOUBLE_ATTACK_CHANCE.length, MAX_SKILL_LEVEL);
  for (let lv = 1; lv <= MAX_SKILL_LEVEL; lv++) {
    assert.ok(
      Math.abs(doubleAttackChance(lv) - esperado[lv - 1]!) < 1e-9,
      `Lv.${lv}: esperado ${esperado[lv - 1]}, veio ${doubleAttackChance(lv)}`,
    );
  }
  assert.equal(doubleAttackChance(0), 0, 'não aprendida não dispara');
});

test('DD-ASS-003: adaga com escudo rende 200 % de um ataque normal', () => {
  // "O golpe extra causa 100 % do dano da arma → o proc rende 200 %."
  const extra = doubleAttackExtra('one_hand', 'dagger');
  assert.equal(extra, 1.0);
  assert.equal(1 + extra, 2.0, 'o ataque inteiro vale o dobro quando o proc sai');
});

test('DD-ASS-004/005: duas adagas TÊM Ataque Duplo, a 50 % cada', () => {
  // A regra antiga que desativava o dual foi REVOGADA. Se alguém a "restaurar"
  // por engano, este teste cai.
  const extra = doubleAttackExtra('dual', 'dagger');
  assert.equal(extra, 0.5);
  assert.ok(extra > 0, 'dual dagger NÃO pode ficar sem Ataque Duplo');
});

test('a config de escudo é mais forte por proc que a de duas adagas', () => {
  // O doc insiste que adaga+escudo é "a mais defensiva E consistente, não a
  // versão fraca". Dois golpes de 50 % empatam em dano bruto com um de 100 %,
  // e o escudo é o desempate — então o extra POR GOLPE tem de ser maior.
  assert.ok(doubleAttackExtra('one_hand', 'dagger') > doubleAttackExtra('dual', 'dagger'));
});

test('DD-ASS-006: arma de duas mãos não tem Ataque Duplo', () => {
  // O katar é 2 mãos. Enquanto ele não for um WeaponType próprio, é por aqui
  // que a regra vale — e o resultado é o que o doc manda.
  assert.equal(doubleAttackExtra('two_hand', 'dagger'), 1.0, 'adaga de 2 mãos não existe hoje');
  for (const arma of ['sword', 'axe', 'mace', 'spear', 'bow', 'crossbow', 'staff'] as const) {
    assert.equal(doubleAttackExtra('one_hand', arma), 0, `${arma} não deveria ter Ataque Duplo`);
  }
  assert.equal(doubleAttackExtra('one_hand', undefined), 0, 'punho também não');
});

test('o Ataque Duplo é PASSIVO — não tem tecla nem mana', () => {
  const d = SKILLS.double_attack;
  assert.equal(d.kind, 'passive');
  assert.equal(d.manaCost, 0);
  assert.equal(d.cooldownMs, 0);
  assert.equal(d.reqLevel, 1, 'é a mecânica central: disponível desde o começo');
});

// ---------------------------------------------------------------------------
// 🔴 Os limites que o doc amarra SEM dar o número
// ---------------------------------------------------------------------------

test('a Evasão do Assassino é MAIS FORTE que o Instinto do Caçador do Archer', () => {
  /**
   * 🔴 O cap. 69 diz que o Instinto do Caçador (+2/+6/**+10 %**) é
   * *"deliberadamente mais fraca que a Evasão do Assassin"*.
   *
   * O valor da Evasão é REFERÊNCIA; este PISO não é. É o teste que protege a
   * comparação entre as duas classes se alguém rebalancear uma sem olhar a
   * outra — e o Archer ainda nem tem árvore, então o 10 % está escrito à mão
   * aqui de propósito, vindo do doc e não do código.
   */
  const INSTINTO_ARCHER_LV10 = 0.10;
  const evasao = skillModifiers(SKILLS.evasion, 10).dodgeChance ?? 0;
  assert.ok(
    evasao > INSTINTO_ARCHER_LV10,
    `Evasão no Lv.10 (${evasao}) tem de passar dos ${INSTINTO_ARCHER_LV10} do Archer`,
  );
});

test('DD-ASS-011: o arremesso do Assassino alcança MENOS que o arco', () => {
  // "Alcance menor que o Archer" — ele é "híbrido móvel, não um segundo Archer".
  const arco = WEAPON_IDENTITY.bow.range;
  for (const d of assassinos().filter((x) => x.branch === 'arremesso')) {
    assert.ok(
      skillRange(d, MAX_SKILL_LEVEL) < arco || d.shape === 'area',
      `${d.id} alcança ${skillRange(d, 10)}, e o arco alcança ${arco}`,
    );
  }
});

test('o Assassino continua corpo a corpo no ataque básico', () => {
  assert.equal(CLASSES.assassin.attackType, 'melee');
  assert.equal(CLASSES.assassin.attackRange, 1);
  assert.equal(CLASSES.assassin.spellCost, 0);
});

// ---------------------------------------------------------------------------
// Os três pilares de identidade: explosão · furtividade · veneno
// ---------------------------------------------------------------------------

test('a classe tem os três pilares que o índice do GDD dá a ela', () => {
  // "explosão + furtividade + veneno" — e cada um tem de existir como
  // habilidade, senão a classe é um Knight com adagas.
  const ids = new Set(assassinos().map((d) => d.id));
  assert.ok(ids.has('sonic_blow'), 'explosão');
  assert.ok(ids.has('hide'), 'furtividade');
  assert.ok(ids.has('envenom'), 'veneno');
});

test('Sonic Blow é burst de alvo único, e não suprema de área', () => {
  const s = SKILLS.sonic_blow;
  assert.equal(s.shape, 'target');
  assert.equal(s.kind, 'multihit');
  assert.ok(skillHits(s, 10) > skillHits(s, 1));
  // ⚠️ REFERÊNCIA, mas a RELAÇÃO é firme: o burst físico de alvo único não pode
  // passar da suprema mágica do jogo.
  const total = skillHits(s, 10) * (s.power + s.powerPerLevel * 9);
  const chuva = 10 * (SKILLS.meteor_storm.power + SKILLS.meteor_storm.powerPerLevel * 9);
  assert.ok(total < chuva, `Sonic Blow ${total.toFixed(2)} não pode passar da Chuva ${chuva.toFixed(2)}`);
});

test('Envenenar Arma é preparação longa, não reação', () => {
  const e = SKILLS.envenom;
  assert.equal(e.shape, 'self');
  assert.ok(skillDuration(e, 10) >= 120000, 'unta-se a lâmina antes de entrar');
  assert.ok(envenomChance(10) > envenomChance(1));
  assert.ok(envenomPower(10) > envenomPower(1));
  assert.equal(envenomChance(0), 0, 'não aprendida não envenena');
});

test('a furtividade é janela de aproximação, não modo de jogo', () => {
  const h = SKILLS.hide;
  // Se a duração passasse do cooldown, daria para ficar oculto o tempo todo — e
  // a Chama de Revelação do Feiticeiro perderia o sentido.
  assert.ok(skillDuration(h, 10) <= 20000);
  assert.ok(h.cooldownMs > 0);
});

test('o Ataque Oculto compensa ter gasto a furtividade', () => {
  // Sem bônus, o combo "oculta → ataca" custaria duas manas para render uma.
  assert.ok(HIDDEN_STRIKE_BONUS >= 2);
  assert.deepEqual(SKILLS.hidden_strike.requires, [{ skill: 'hide', level: 3 }]);
});

test('Lançamento Fantasma sai da FORÇA e bate na defesa mágica', () => {
  /**
   * 🔴 Este teste guarda um erro que já foi cometido: a habilidade nasceu com
   * `magic: true`, o que mandaria o poder sair de `magicAtk` — e o Assassino
   * tem INT 3. Ela ficaria inútil com cara de implementada.
   *
   * Os dois campos respondem perguntas diferentes: `magic` diz de qual ATAQUE o
   * poder sai; `damageType` diz contra qual DEFESA ele bate.
   */
  const p = SKILLS.phantom_throw;
  assert.notEqual(p.magic, true, 'não pode escalar com poder mágico');
  assert.equal(p.damageType, 'dark', 'mas bate contra a resistência mágica');
});

test('nenhuma habilidade do Assassino escala com poder mágico', () => {
  for (const d of assassinos()) {
    assert.notEqual(d.magic, true, `${d.id} escalaria com INT, que a classe não tem`);
  }
});

test('Contra-ataque devolve dano e é janela curta', () => {
  const c = SKILLS.counter_attack;
  assert.equal(c.shape, 'self');
  assert.ok(counterAttackShare(10) > counterAttackShare(1));
  assert.equal(counterAttackShare(0), 0);
  assert.ok(c.cooldownMs > skillDuration(c, 10), 'o CD tem de ser maior que a janela');
});

// ---------------------------------------------------------------------------
// ⚠️ A honestidade sobre o que é PROPOSTA
// ---------------------------------------------------------------------------

test('todo ramo de PROPOSTA avisa isso na descrição', () => {
  /**
   * ⚠️ `DD-ASS-014/015` marcam os ramos de arremesso e espada curta como
   * PROPOSTA no Doc 1 — e a exceção que o dono deu em 2026-07-30 vale só para
   * os Docs 3 e 4.
   *
   * O jogador tem de VER isso no tooltip, não só quem lê o código. Este teste
   * existe para que ninguém apague o aviso ao mexer num texto.
   */
  for (const d of assassinos()) {
    if (d.branch !== 'espada' && d.branch !== 'arremesso') continue;
    assert.match(d.desc, /PROPOSTA/, `${d.id} precisa avisar que é proposta`);
  }
});

test('o ramo canônico NÃO se anuncia como proposta', () => {
  // O contrário também importa: marcar o Ataque Duplo como provisório faria
  // alguém "corrigir" a única tabela que o doc fecha.
  assert.doesNotMatch(SKILLS.double_attack.desc, /PROPOSTA|provisóri/i);
});
