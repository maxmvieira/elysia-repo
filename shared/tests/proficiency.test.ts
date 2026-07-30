import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFICIENCY_KINDS,
  PROFICIENCY_LABEL,
  WEAPON_IDENTITY,
  WEAPON_PROFICIENCY,
  WEAPON_TYPES,
  isMagicProficiency,
  proficiencyFor,
  proficiencyMatchesIdentity,
  weaponsOf,
} from '../src/index.js';

test('as oito proficiências do cap. 42 existem, e todas têm nome', () => {
  assert.equal(PROFICIENCY_KINDS.length, 8);
  for (const k of PROFICIENCY_KINDS) {
    assert.ok(PROFICIENCY_LABEL[k], `${k} sem rótulo`);
  }
});

test('todo tipo de arma cai em alguma proficiência', () => {
  // Arma sem proficiência é arma que não treina nada — o jogador bate e não
  // melhora, para sempre.
  for (const w of WEAPON_TYPES) {
    assert.ok(WEAPON_PROFICIENCY[w], `${w} não tem proficiência`);
  }
});

test('🔴 DD-PROG-011: cajado treina MAGIC LEVEL, não "cajado"', () => {
  // "Proficiência de cajado" era nome errado para o que sempre foi conjuração:
  // quem conjura melhor treinou magia, não madeira. É esta linha que sustenta a
  // decisão de Varinha e Livro Arcano não virarem WeaponType próprio.
  assert.equal(WEAPON_PROFICIENCY.staff, 'magic');
  assert.ok(isMagicProficiency(proficiencyFor('staff')));
  assert.equal(PROFICIENCY_LABEL.magic, 'Magic Level');
});

test('arco e besta colapsam em Distância', () => {
  // O cap. 42 não separa os dois: mirar à distância é uma habilidade só.
  assert.equal(WEAPON_PROFICIENCY.bow, 'distance');
  assert.equal(WEAPON_PROFICIENCY.crossbow, 'distance');
  assert.deepEqual(weaponsOf('distance').sort(), ['bow', 'crossbow']);
});

test('a identidade da arma continua distinta apesar da proficiência comum', () => {
  // 🔴 O que se funde é o TREINO, não a arma. Se arco e besta virassem a mesma
  // coisa em combate, a fusão teria custado identidade — e `WEAPON_IDENTITY` é
  // quem garante que não.
  assert.notEqual(WEAPON_IDENTITY.bow.damageMult, WEAPON_IDENTITY.crossbow.damageMult);
  assert.notEqual(WEAPON_IDENTITY.bow.speedMult, WEAPON_IDENTITY.crossbow.speedMult);
});

test('🔴 lutar sem arma treina Fist', () => {
  // Hoje desarmado não sobe proficiência nenhuma. O documento prevê Fist porque
  // lutar sem arma é escolha válida — e escolha válida que não progride não é
  // escolha.
  assert.equal(proficiencyFor(undefined), 'fist');
  assert.deepEqual(weaponsOf('fist'), [], 'Fist não corresponde a arma nenhuma');
});

test('as cinco famílias corpo a corpo sobrevivem intactas', () => {
  // É o que torna esta lista adotável sem migração de save: adotar o modelo
  // 1H/2H do Doc 1 jogaria fora a proficiência de todo mundo.
  assert.equal(WEAPON_PROFICIENCY.sword, 'sword');
  assert.equal(WEAPON_PROFICIENCY.axe, 'axe');
  assert.equal(WEAPON_PROFICIENCY.spear, 'spear');
  assert.equal(WEAPON_PROFICIENCY.dagger, 'dagger');
  // Só a maça muda de nome, para o que o documento usa.
  assert.equal(WEAPON_PROFICIENCY.mace, 'club');
});

test('proficiência e identidade da arma não se separam em silêncio', () => {
  // As duas tabelas descrevem o mesmo mundo. Divergência entre elas é o tipo de
  // erro que só aparece meses depois.
  for (const w of WEAPON_TYPES) {
    assert.ok(proficiencyMatchesIdentity(w), `${w}: proficiência contraria a identidade`);
  }
});

test('a lança NÃO é arma de distância', () => {
  // Ela alcança dois tiles, não o outro lado da tela. É o caso de fronteira que
  // uma regra "alcance > 1 = distância" erraria.
  assert.equal(WEAPON_PROFICIENCY.spear, 'spear');
});
