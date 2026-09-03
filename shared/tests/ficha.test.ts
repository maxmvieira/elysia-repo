/**
 * Regras da ficha de personagem conforme o GDD (docs/GDD-indice-da-conversa.md §4).
 * Estes testes travam decisões de design que foram fechadas na conversa-fonte.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTRIBUTE_KEYS,
  BASE_ATTRIBUTE_POINTS,
  CREATION_POINTS,
  startingAttributes,
  checkAttributes,
  creationCost,
  CLASSES,
  POINTS_PER_LEVEL,
  attributeCost,
  computeStats,
  totalAttributes,
  type PlayerClass,
  type SkillState,
} from '../src/index.js';

const skill = (kind: SkillState['kind'], level = 10): SkillState => ({ kind, level, progress: 0 });
const CLASSES_IDS: PlayerClass[] = ['knight', 'sorcerer', 'archer', 'assassin'];

test('são SETE atributos, incluindo LUK', () => {
  assert.equal(ATTRIBUTE_KEYS.length, 7);
  assert.ok(ATTRIBUTE_KEYS.includes('luk'));
});

test('🔴 o orçamento da criação é o custo EXATO de montar qualquer classe', () => {
  // 76 não é número escolhido, é medido: sair de sete atributos em 1 e chegar na
  // distribuição sugerida de qualquer uma das quatro classes custa exatamente
  // isso. Este teste é o que trava — mexeu na tabela de custo ou na base de uma
  // classe e o orçamento deixa de bater, ele avisa.
  for (const id of CLASSES_IDS) {
    assert.equal(
      creationCost(CLASSES[id].base),
      CREATION_POINTS,
      `a distribuição sugerida do ${id} devia custar exatamente o orçamento`,
    );
  }
  const inicial = startingAttributes();
  for (const k of ATTRIBUTE_KEYS) assert.equal(inicial[k], 1, `${k} devia nascer em 1`);
  assert.equal(creationCost(inicial), 0, 'não gastou nada ainda');
});

test('🔴 a criação cobra pela MESMA tabela da subida de nível', () => {
  // O dono pediu isso em 02/09: especializar tem que doer. Levar um atributo
  // sozinho de 1 a 20 consome metade do orçamento inteiro.
  const um = startingAttributes();
  um.str = 20;
  assert.equal(creationCost(um), 38, '1→20 num atributo custa 38 (19 × 2)');
  // ⚠️ O degrau vira 3 a partir do valor 21, não do 20: `attributeCost(v)` é o
  // preço para sair de `v`, e a faixa "até 20" ainda cobra 2 quando v = 20.
  const vinteEUm = { ...um, str: 21 };
  const vinteEDois = { ...um, str: 22 };
  assert.equal(creationCost(vinteEUm) - creationCost(um), 2, '20→21 ainda custa 2');
  assert.equal(creationCost(vinteEDois) - creationCost(vinteEUm), 3, '21→22 já custa 3');
});

test('🔴 concentrar custa caro: o mesmo orçamento rende 45 espalhado e 32 num só', () => {
  // É a razão de o dono ter pedido a tabela na criação. Espalhado pelas sete
  // faixas baratas, o orçamento compra os 45 do GDD; jogado num atributo só,
  // ele atravessa o degrau dos 20 e rende bem menos.
  const espalhado = CLASSES.knight.base;
  assert.equal(creationCost(espalhado), CREATION_POINTS);
  assert.equal(totalAttributes(espalhado), BASE_ATTRIBUTE_POINTS);

  const concentrado = startingAttributes();
  concentrado.str = 33; // 19×2 + 1×2 + 12×3 = 76, o orçamento inteiro
  assert.equal(creationCost(concentrado), CREATION_POINTS);
  assert.ok(
    totalAttributes(concentrado) < BASE_ATTRIBUTE_POINTS,
    'concentrar tem que render MENOS atributo que espalhar',
  );
});

test('🔴 o servidor recusa distribuição que não fecha exatamente 45', () => {
  // Esta função roda nos DOIS lados. A tela impede passar do limite, mas quem
  // monta o `createchar` é o cliente — e atributo é permanente.
  // Duas maneiras válidas de fechar o orçamento: espalhada e concentrada.
  const espalhado = CLASSES.knight.base;
  assert.equal(checkAttributes(espalhado).ok, true, 'a sugestão da classe fecha o orçamento');

  const concentrado = startingAttributes();
  concentrado.str = 33;
  assert.equal(checkAttributes(concentrado).ok, true, 'concentrar também é build válida');

  const faltando = { ...concentrado, str: 32 };
  assert.equal(checkAttributes(faltando).ok, false, 'sobrou ponto: não pode criar');

  const passou = { ...concentrado, vit: 2 };
  assert.equal(checkAttributes(passou).ok, false, 'passou do limite: não pode criar');
});

test('🔴 o piso é 1, e não 0 — atributo zerado é personagem quebrado', () => {
  // Zerar VIT não é build: várias fórmulas derivadas dividem por atributo.
  const zerado = { ...CLASSES.knight.base, luk: 0 };
  const r = checkAttributes(zerado);
  assert.equal(r.ok, false);
  assert.match(r.ok === false ? r.message : '', /luk/);
});

test('a distribuição livre muda vida e mana no nível 1 — e é o ponto dela', () => {
  // A prévia da tela existe por causa disto: um Knight que ignora VIT nasce com
  // bem menos vida, e o nome já é definitivo quando ele descobrir jogando.
  const k = CLASSES.knight;
  const tanque = startingAttributes(); tanque.vit += CREATION_POINTS;
  const mago = startingAttributes(); mago.int += CREATION_POINTS;
  const vida = (a: typeof tanque) =>
    computeStats(k, a, 1, { kind: k.skill, level: 1, progress: 0 }).maxHp;
  assert.ok(vida(tanque) > vida(mago), 'VIT tem que valer vida');
  assert.ok(vida(mago) < k.hpAt1, 'ignorar VIT custa vida em relação à sugestão da classe');
});

test('toda classe começa com os mesmos 45 pontos-base', () => {
  for (const id of CLASSES_IDS) {
    assert.equal(
      totalAttributes(CLASSES[id].base),
      BASE_ATTRIBUTE_POINTS,
      `${id} deveria somar ${BASE_ATTRIBUTE_POINTS} pontos-base`,
    );
  }
});

test('HP e mana no nível 1 batem com o definido no GDD', () => {
  for (const id of CLASSES_IDS) {
    const cls = CLASSES[id];
    const d = computeStats(cls, cls.base, 1, skill(cls.skill));
    assert.equal(d.maxHp, cls.hpAt1, `HP inicial do ${id}`);
    assert.equal(d.maxMana, cls.manaAt1, `mana inicial do ${id}`);
  }
});

test('Knight 200/60 e Sorcerer 100/180 — os extremos da tabela', () => {
  const w = computeStats(CLASSES.knight, CLASSES.knight.base, 1, skill('melee'));
  const s = computeStats(CLASSES.sorcerer, CLASSES.sorcerer.base, 1, skill('magic'));
  assert.equal(w.maxHp, 200);
  assert.equal(w.maxMana, 60);
  assert.equal(s.maxHp, 100);
  assert.equal(s.maxMana, 180);
});

test('são 10 pontos por nível', () => {
  assert.equal(POINTS_PER_LEVEL, 10);
});

test('custo de atributo cresce por faixa e nunca diminui', () => {
  assert.equal(attributeCost(15), 2, '1–20 custa 2');
  assert.equal(attributeCost(20), 2, 'o limite da faixa ainda é 2');
  assert.equal(attributeCost(21), 3, 'passou de 20, sobe para 3');
  assert.equal(attributeCost(160), 12, '151–175 custa 12');
  assert.equal(attributeCost(500), 20, 'acima de 200 custa 20 para sempre');
  // Monotônico: subir o atributo nunca deixa o próximo ponto mais barato.
  let anterior = 0;
  for (let v = 1; v <= 260; v++) {
    const c = attributeCost(v);
    assert.ok(c >= anterior, `custo caiu em ${v}`);
    anterior = c;
  }
});

test('especializar é caro: +1 STR em 160 custa 6x mais que em 15', () => {
  assert.equal(attributeCost(160) / attributeCost(15), 6);
});

test('LUK é quem dá crítico (e DEX não dá mais)', () => {
  const base = { ...CLASSES.knight.base };
  const d0 = computeStats(CLASSES.knight, base, 1, skill('melee'));
  const comLuk = computeStats(CLASSES.knight, { ...base, luk: base.luk + 30 }, 1, skill('melee'));
  const comDex = computeStats(CLASSES.knight, { ...base, dex: base.dex + 30 }, 1, skill('melee'));
  assert.ok(comLuk.critChance > d0.critChance, 'LUK aumenta o crítico');
  assert.equal(comDex.critChance, d0.critChance, 'DEX não mexe no crítico');
});

test('DEX arma o arqueiro; STR arma o Knight', () => {
  const wBase = CLASSES.knight.base;
  const aBase = CLASSES.archer.base;
  const wStr = computeStats(CLASSES.knight, { ...wBase, str: wBase.str + 20 }, 1, skill('melee'));
  const wDex = computeStats(CLASSES.knight, { ...wBase, dex: wBase.dex + 20 }, 1, skill('melee'));
  assert.ok(wStr.physAtk > wDex.physAtk, 'melee escala com STR, não com DEX');

  const aDex = computeStats(CLASSES.archer, { ...aBase, dex: aBase.dex + 20 }, 1, skill('distance'));
  const aStr = computeStats(CLASSES.archer, { ...aBase, str: aBase.str + 20 }, 1, skill('distance'));
  assert.ok(aDex.physAtk > aStr.physAtk, 'arco escala com DEX, não com STR');
});

test('WIS regenera mana; INT define o tamanho do poço', () => {
  const base = CLASSES.sorcerer.base;
  const comWis = computeStats(CLASSES.sorcerer, { ...base, wis: base.wis + 20 }, 1, skill('magic'));
  const comInt = computeStats(CLASSES.sorcerer, { ...base, int: base.int + 20 }, 1, skill('magic'));
  const d0 = computeStats(CLASSES.sorcerer, base, 1, skill('magic'));
  assert.ok(comWis.manaRegen > d0.manaRegen);
  assert.equal(comInt.manaRegen, d0.manaRegen);
  assert.ok(comInt.maxMana > d0.maxMana);
});

test('nenhuma classe nasce mais forte: mesma soma, perfis diferentes', () => {
  // Knight é o mais duro; Sorcerer tem o maior poço de mana.
  const maisHp = CLASSES_IDS.reduce((a, b) => (CLASSES[a].hpAt1 >= CLASSES[b].hpAt1 ? a : b));
  const maisMana = CLASSES_IDS.reduce((a, b) => (CLASSES[a].manaAt1 >= CLASSES[b].manaAt1 ? a : b));
  assert.equal(maisHp, 'knight');
  assert.equal(maisMana, 'sorcerer');
});
