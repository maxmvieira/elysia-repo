/**
 * Sistema de atributos, classes e stats derivados (compartilhado).
 *
 * Filosofia (pedido do jogo): o NÍVEL sozinho quase não fortalece. Quem define
 * o personagem são os ATRIBUTOS (10 pontos por nível como MOEDA, gastos numa
 * tabela de custo crescente) e as SKILLS que sobem com o uso. Cada classe
 * começa com uma distribuição-base e um estilo de ataque.
 *
 * O servidor é a autoridade: ele calcula os stats derivados a partir dos
 * atributos e usa isso no combate. O cliente só exibe.
 */

export type PlayerClass = 'knight' | 'sorcerer' | 'archer' | 'assassin' | 'druid';
export type AttributeKey = 'str' | 'dex' | 'vit' | 'int' | 'wis' | 'agi' | 'luk';
export type AttackType = 'melee' | 'ranged' | 'magic';
export type SkillKind = 'melee' | 'distance' | 'magic';

export interface Attributes {
  str: number;
  dex: number;
  vit: number;
  int: number;
  wis: number;
  agi: number;
  luk: number;
}

export const ATTRIBUTE_KEYS: AttributeKey[] = ['str', 'vit', 'agi', 'dex', 'int', 'wis', 'luk'];

/**
 * Os SETE atributos (GDD §4). Cada um tem uma função principal e uma
 * secundária — nenhum atributo é "lixo" para nenhuma classe.
 */
export const ATTRIBUTE_INFO: Record<AttributeKey, { name: string; effects: string }> = {
  str: { name: 'Strength', effects: 'Dano físico corpo a corpo · capacidade de carga' },
  vit: { name: 'Vitality', effects: 'Vida máxima · regeneração de vida · resistência física' },
  agi: { name: 'Agility', effects: 'Velocidade de ataque · esquiva · movimento' },
  dex: { name: 'Dexterity', effects: 'Dano de arco/besta · precisão' },
  int: { name: 'Intelligence', effects: 'Dano mágico · mana máxima' },
  wis: { name: 'Wisdom', effects: 'Regeneração de mana · resistência mágica' },
  luk: { name: 'Luck', effects: 'Chance de crítico · efeitos probabilísticos' },
};

/**
 * Pontos concedidos no PRIMEIRO degrau da curva, e cadência de talento.
 *
 * ⚠️ Não use isto direto para conceder pontos — use `pointsForLevel()`. A
 * constante existe porque é o valor do nível 1–50 e o teste do GDD a cita.
 */
export const POINTS_PER_LEVEL = 10;
export const TALENT_EVERY_LEVELS = 5;

/**
 * ✅ **DECIDIDO em 2026-07-30** (o dono delegou: "balanceie da forma que achar
 * melhor").
 *
 * `DD-PROG-002` fecha a REGRA — os pontos por nível **crescem de 10 para 20** —
 * e o Doc 1 recusa dar as faixas, avisando "não devemos inventar". As faixas
 * abaixo são, portanto, decisão do projeto, não citação.
 *
 * 🔴 **Por que a curva existe:** o custo de subir atributo cresce
 * (`ATTRIBUTE_COST_TABLE`: 2 pontos por +1 no começo, **20** acima de 200). Com
 * 10 pontos fixos para sempre, o personagem de nível 300 com STR 210 **não
 * consegue nem +1 por nível** — precisa juntar dois níveis para um ponto. A
 * progressão por atributo simplesmente para.
 *
 * Aos 20 pontos, o nível 251+ volta a comprar +1 de um atributo caro por nível.
 * Cinco degraus regulares de 50 níveis mantêm a conta previsível para o jogador,
 * que é o que permite planejar build.
 */
const POINTS_CURVE: Array<{ ate: number; pontos: number }> = [
  { ate: 50, pontos: 10 },
  { ate: 100, pontos: 12 },
  { ate: 150, pontos: 14 },
  { ate: 200, pontos: 16 },
  { ate: 250, pontos: 18 },
];
const POINTS_ACIMA = 20;

/** Quantos pontos de atributo o personagem ganha ao ALCANÇAR este nível. */
export function pointsForLevel(level: number): number {
  for (const faixa of POINTS_CURVE) {
    if (level <= faixa.ate) return faixa.pontos;
  }
  return POINTS_ACIMA;
}

/**
 * Total de pontos que um personagem deste nível já deveria ter recebido.
 *
 * Usado para reconstruir a ficha (comando `/level`, correção de save antigo).
 * Soma degrau por degrau em vez de multiplicar, senão quem chega ao 300 receberia
 * 20 × 299 e ficaria com o dobro do que a curva concede.
 */
export function totalPointsUpToLevel(level: number): number {
  let total = 0;
  for (let n = 2; n <= level; n++) total += pointsForLevel(n);
  return total;
}

/**
 * CUSTO CRESCENTE (GDD §4): subir um atributo custa mais conforme ele cresce.
 * Especializar continua possível, mas fica progressivamente caro — a decisão
 * "gasto 12 pontos em +1 STR ou espalho em VIT/WIS/AGI?" é o coração da build.
 * Não há teto: dá para chegar a 250 STR, só custa uma fortuna de pontos.
 */
const ATTRIBUTE_COST_TABLE: Array<{ ate: number; custo: number }> = [
  { ate: 20, custo: 2 },
  { ate: 40, custo: 3 },
  { ate: 60, custo: 4 },
  { ate: 80, custo: 5 },
  { ate: 100, custo: 6 },
  { ate: 125, custo: 8 },
  { ate: 150, custo: 10 },
  { ate: 175, custo: 12 },
  { ate: 200, custo: 15 },
];
const ATTRIBUTE_COST_ACIMA = 20;

/** Quantos pontos custa subir este atributo de `valorAtual` para +1. */
export function attributeCost(valorAtual: number): number {
  for (const faixa of ATTRIBUTE_COST_TABLE) {
    if (valorAtual <= faixa.ate) return faixa.custo;
  }
  return ATTRIBUTE_COST_ACIMA;
}

export interface ClassDef {
  id: PlayerClass;
  name: string;
  attackType: AttackType;
  skill: SkillKind;
  base: Attributes;
  /** Alcance do ataque básico, em tiles. */
  attackRange: number;
  /** Projétil visual disparado no ataque (magos/arqueiro). */
  projectile?: string;
  /** Custo de mana do ataque básico (0 para físicos). */
  spellCost: number;
  /** Vida e mana ALVO no nível 1 com os atributos-base (GDD §4). */
  hpAt1: number;
  manaAt1: number;
  blurb: string;
}

/** Ganhos de vida/mana por nível, por classe (o grosso vem dos atributos). */
const HP_PER_LEVEL = 5;
const MANA_PER_LEVEL = 3;
const HP_PER_VIT = 8;
const MANA_PER_INT = 8;

/** Total de pontos de atributo que TODA classe recebe no nível 1 (GDD §4). */
export const BASE_ATTRIBUTE_POINTS = 45;

/**
 * ---- DISTRIBUIÇÃO NA CRIAÇÃO (2026-09-02) ---------------------------------
 *
 * 🔴 **A classe deixou de decidir os atributos; quem decide é o jogador.**
 *
 * Até aqui, escolher Knight dava `{ str: 11, vit: 10, ... }` — a distribuição
 * vinha pronta em `ClassDef.base`. Agora todo atributo nasce em **1** e o
 * jogador reparte `CREATION_POINTS` como quiser, na tela de criação.
 *
 * ⚠️ **A soma continua sendo os 45 do GDD §4, e isso foi decisão do dono.** Ele
 * pediu "30 pontos"; 30 sobre sete uns daria 37, 18 % abaixo do documento e do
 * personagem que o jogo cria hoje. Com 38 a liberdade é a mesma e nada no
 * documento nem no teste `toda classe começa com os mesmos 45 pontos-base`
 * precisa mudar.
 *
 🔴 **O custo é o MESMO da subida de nível** (`ATTRIBUTE_COST_TABLE`: 2 pontos
 * por +1 no começo, 3 acima de 20, e por aí acima), a pedido do dono em 02/09.
 * É o que faz especializar doer: levar um atributo sozinho de 1 a 20 consome
 * metade do orçamento inteiro.
 *
 * 🔴 **`ClassDef.base` NÃO morreu, e não é decoração:** ela é a âncora de
 * `hpAt1`/`manaAt1` em `computeStats` (o cálculo desconta `base.vit` para o
 * alvo do GDD bater exatamente no nível 1) e é o que o teste da ficha confere.
 * Ela passa a ser a distribuição SUGERIDA da classe, não a imposta.
 */
export const ATTRIBUTE_START = 1;

/**
 * O orçamento da criação, em PONTOS (não em atributos).
 *
 * 🔴 **76 não é número escolhido, é número MEDIDO.** É exatamente o que custa
 * sair de sete atributos em 1 e montar qualquer uma das quatro distribuições
 * sugeridas pelas classes — as quatro dão 76, porque todas somam os 45 do GDD e
 * nenhuma passa de 20 em atributo nenhum. Há teste travando isso: se alguém
 * mexer na tabela de custo ou na base de uma classe, ele avisa.
 *
 * ⚠️ **Era 38 com ponto plano, e virou 76 com o custo escalonado em 02/09**,
 * a pedido do dono: *"os pontos de distribuição iniciais têm aquele mesmo custo
 * do lvl"*. Mantendo os 38, o custo de 2 por +1 compraria só 19 aumentos e o
 * personagem nasceria com 26 de atributo em vez de 45 — bem mais fraco do que
 * ele já tinha decidido preservar.
 */
export const CREATION_POINTS = 76;

/** Todos os sete atributos no piso. É daqui que a tela de criação parte. */
export function startingAttributes(): Attributes {
  const a = {} as Attributes;
  for (const k of ATTRIBUTE_KEYS) a[k] = ATTRIBUTE_START;
  return a;
}

/**
 * Quantos pontos custa chegar nesta distribuição, partindo de tudo em 1.
 *
 * 🔴 Cobra degrau a degrau pela `ATTRIBUTE_COST_TABLE` — a MESMA da subida de
 * nível. É isso que faz especializar doer: levar um atributo de 1 a 20 custa 38
 * (2 por ponto), e cada ponto depois dos 20 custa 3.
 *
 * ⚠️ Não dá para calcular por atalho ("aumentos × custo médio"): o preço muda no
 * meio do caminho, então o laço tem de passar por cada degrau.
 */
export function creationCost(a: Attributes): number {
  let total = 0;
  for (const k of ATTRIBUTE_KEYS) {
    for (let v = ATTRIBUTE_START; v < a[k]; v++) total += attributeCost(v);
  }
  return total;
}

/**
 * A distribuição é válida?
 *
 * 🔴 Mora no `shared` porque **o servidor revalida**: a tela impede passar do
 * limite, mas cliente mente, e um `createchar` forjado com `str: 999` entraria
 * direto no banco. As duas pontas chamam esta função.
 */
export function checkAttributes(
  a: Attributes,
): { ok: true } | { ok: false; message: string } {
  for (const k of ATTRIBUTE_KEYS) {
    const v = a[k];
    if (!Number.isInteger(v)) return { ok: false, message: `${k} precisa ser inteiro.` };
    // ⚠️ O piso é 1, não 0: atributo zerado divide por zero em várias fórmulas
    // derivadas, e "zerar VIT" não é build, é personagem quebrado.
    if (v < ATTRIBUTE_START) {
      return { ok: false, message: `${k} não pode ficar abaixo de ${ATTRIBUTE_START}.` };
    }
  }
  const gasto = creationCost(a);
  if (gasto !== CREATION_POINTS) {
    const sobra = CREATION_POINTS - gasto;
    return {
      ok: false,
      message: sobra > 0
        ? `Faltam ${sobra} ponto(s) para distribuir.`
        : `Você passou ${-sobra} ponto(s) do limite.`,
    };
  }
  return { ok: true };
}


/**
 * As classes de Elysia Online (GDD §4). Todas começam com os MESMOS 45 pontos
 * de atributo — o que muda é a distribuição, não a soma. Nenhuma classe nasce
 * matematicamente maior que outra.
 *
 * São CINCO classes, e desde 02/09 as cinco existem: Knight, Sorcerer, Archer,
 * Assassin e Druid. Priest NÃO existe.
 */
export const CLASSES: Record<PlayerClass, ClassDef> = {
  knight: {
    id: 'knight',
    name: 'Knight',
    attackType: 'melee',
    skill: 'melee',
    base: { str: 11, vit: 10, agi: 6, dex: 6, int: 3, wis: 4, luk: 5 },
    attackRange: 1,
    spellCost: 0,
    hpAt1: 200,
    manaAt1: 60,
    blurb: 'Especialista em combate corpo a corpo. Espadas, machados, maças, escudos e armaduras pesadas.',
  },
  /**
   * 🔮 O FEITICEIRO — e a correção de 2026-09-03.
   *
   * 🔴 **O ataque básico dele deixou de ser magia.** Até aqui a classe tinha
   * `attackType: 'magic'`, alcance 5 e um `firebolt` de 6 de mana no golpe
   * comum. Isso contrariava `DD-PROG-028` de frente: *"ataque básico com cajado
   * é FÍSICO (Sorcerer e Druid); dano mágico à distância exige gastar uma
   * habilidade e mana"*. A Etapa 14 do roadmap manda a correção em letras
   * garrafais — *"ataque básico com cajado é FÍSICO — magia exige habilidade e
   * mana"* — e este é o passo em que ela cabe, porque agora as 18 habilidades
   * existem: antes de hoje, tirar o firebolt teria deixado a classe sem NADA.
   *
   * ⚠️ **A consequência é dura e é a intenção.** Com STR 3, o golpe de cajado
   * do Feiticeiro é quase simbólico. Ele não é mais uma classe que atira de
   * longe de graça: para causar dano, gasta mana. Quem quiser bater sem mana
   * escolhe outra classe — que é exatamente o que separa o mago do arqueiro.
   *
   * ⚠️ `skill: 'magic'` continua: o que ele TREINA é magia. O cajado é a
   * ferramenta, o Magic Level é a proficiência.
   */
  sorcerer: {
    id: 'sorcerer',
    name: 'Feiticeiro',
    attackType: 'melee',
    skill: 'magic',
    base: { str: 3, vit: 5, agi: 5, dex: 6, int: 12, wis: 10, luk: 4 },
    attackRange: 1,
    spellCost: 0,
    hpAt1: 100,
    manaAt1: 180,
    blurb: 'Controla o Éter. Magias ofensivas à distância, controle e barreiras — o cajado só empurra.',
  },
  archer: {
    id: 'archer',
    name: 'Arqueiro',
    attackType: 'ranged',
    skill: 'distance',
    base: { str: 5, vit: 6, agi: 9, dex: 11, int: 4, wis: 5, luk: 5 },
    attackRange: 5,
    projectile: 'arrow',
    spellCost: 0,
    hpAt1: 120,
    manaAt1: 80,
    blurb: 'Especialista em combate à distância. Arcos, bestas, armadilhas e muita mobilidade.',
  },
  assassin: {
    id: 'assassin',
    name: 'Assassino',
    attackType: 'melee',
    skill: 'melee',
    // Adagas: pouca força bruta, mas AGI/LUK altas -> crítico, esquiva e
    // velocidade. Veneno e furtividade virão como sistemas futuros (talentos).
    base: { str: 7, vit: 6, agi: 11, dex: 7, int: 3, wis: 4, luk: 7 },
    attackRange: 1,
    spellCost: 0,
    hpAt1: 150,
    manaAt1: 70,
    blurb: 'Alta velocidade e adagas. Críticos, venenos e furtividade — golpeia e some.',
  },
  /**
   * 🌿 O DRUIDA — a quinta e última classe, fechada em 2026-09-02.
   *
   * 🔴 **Todos os números aqui vêm do GDD, não de invenção.** A "Ficha V1 do
   * Druid" está no cap. 71 do Doc 1: *HP 140 · MP 150 · STR 4 · VIT 7 · AGI 5 ·
   * DEX 5 · INT 9 · WIS 11 · LUK 4*. Ela soma exatamente os 45 pontos-base, como
   * as outras quatro.
   *
   * ⚠️ **A tabela do 65.20 marca o Druid como PENDENTE (`DD-BAL-029`) — e é fácil
   * concluir daí que os números não existem.** Existem: estão noutro capítulo.
   * Quem for revisar, procure a ficha V1 antes de arbitrar.
   *
   * 🔴 **`attackType: 'melee'` e `spellCost: 0` saem do `DD-PROG-028`:** *"ataque
   * básico com cajado é FÍSICO (Sorcerer e Druid); dano mágico à distância exige
   * gastar uma habilidade e mana"*. O cajado bate, não conjura.
   *
   * ✅ **A divergência com o Feiticeiro acabou em 2026-09-03.** Ele estava com
   * `attackType: 'magic'` e um `firebolt` de 6 de mana no golpe comum, contra o
   * mesmo `DD-PROG-028`. As duas classes de cajado seguem hoje o mesmo modelo.
   *
   * 🔴 **`skill: 'magic'` apesar do golpe físico**, e não é contradição: o doc
   * mapeia **cajado → Magic Level** na lista de proficiências. O que a classe
   * TREINA é magia; o que o bastão faz no golpe básico é dano físico.
   *
   * ⚠️ **WIS é o atributo principal, não INT** (`DD-PROG-024/025`), e é WIS que
   * escala a cura. É por isso que a ficha dá 11 de WIS contra 9 de INT — o
   * contrário do Feiticeiro.
   *
   * ✅ **As 23 habilidades entraram em 2026-09-03**, nos quatro ramos que o doc
   * descreve (cura 5 · buff 6 · debuff 6 · natureza 6). Ver `skills.ts`.
   */
  druid: {
    id: 'druid',
    name: 'Druida',
    attackType: 'melee',
    skill: 'magic',
    base: { str: 4, vit: 7, agi: 5, dex: 5, int: 9, wis: 11, luk: 4 },
    attackRange: 1,
    spellCost: 0,
    hpAt1: 140,
    manaAt1: 150,
    blurb: 'Guardião da natureza. Cura, fortalece aliados e enfraquece inimigos — sustenta o grupo em vez de derrubar sozinho.',
  },
};

export interface SkillState {
  kind: SkillKind;
  level: number;
  progress: number;
}

/** Progresso necessário para subir a skill do nível atual para o próximo. */
export function skillThreshold(level: number): number {
  return 10 + level * 8;
}

/** Stats derivados usados no combate (calculados dos atributos). */
export interface DerivedStats {
  maxHp: number;
  maxMana: number;
  hpRegen: number;
  manaRegen: number;
  physAtk: number;
  magicAtk: number;
  /**
   * Poder de CURA — a base de tudo que o Druida cura.
   *
   * 🔴 Existe separado de `magicAtk` por causa de `DD-PROG-024/025`: *"Druid tem
   * WIS como atributo principal, não INT — e **WIS escala cura**"*. Se a cura
   * saísse do poder mágico, o caminho para curar melhor seria subir INT, e o
   * Druida viraria um Feiticeiro de cajado verde. Sai de WIS, e a ficha do
   * cap. 71 (WIS 11 contra INT 9) passa a fazer sentido mecânico.
   *
   * ⚠️ `DD-DRU-026`: a passiva ofensiva do Druida **não** entra aqui — quem
   * investe em Natureza não cura melhor por isso.
   */
  healPower: number;
  critChance: number;
  critMult: number;
  defense: number;
  magicResist: number;
  dodgeChance: number;
  /**
   * Precisão — o contrário da esquiva. Desconta da chance do ALVO de desviar.
   *
   * 🔴 Entrou com o Arqueiro (2026-09-03) e fechou uma promessa antiga:
   * `ATTRIBUTE_INFO.dex` diz *"Dano de arco/besta · **precisão**"* desde o
   * primeiro dia, e precisão não existia. O Olho de Águia e a Concentração dão
   * "+15 % de precisão" e não tinham onde pousar.
   *
   * ⚠️ **Hoje ela só morde em PvP.** `creatureDefenseProfile` devolve
   * `dodgeChance: 0` — monstro não desvia —, então precisão contra criatura
   * desconta de zero. Isso é coerente com o doc, que vende o Olho de Águia
   * pelo ALCANCE e a precisão como vantagem de duelo; e no dia em que o
   * bestiário ganhar esquiva, ela passa a valer em PvE sem tocar em nada.
   */
  accuracy: number;
  attackCooldownMs: number;
  moveIntervalMs: number;
  manaCost: number;
  attackType: AttackType;
  attackRange: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function computeStats(
  cls: ClassDef,
  a: Attributes,
  level: number,
  skill: SkillState,
): DerivedStats {
  const skillPhys = skill.kind !== 'magic' ? skill.level : 0;
  const skillMagic = skill.kind === 'magic' ? skill.level : 0;
  // Vida/mana: a classe define o PATAMAR no nível 1 (Knight 200, Sorcerer 100…)
  // e VIT/INT constroem daí para cima. Descontamos a contribuição dos atributos
  // -base para que o alvo do GDD bata exatamente no nível 1.
  const hpBase = cls.hpAt1 - cls.base.vit * HP_PER_VIT;
  const manaBase = cls.manaAt1 - cls.base.int * MANA_PER_INT;
  return {
    maxHp: hpBase + (level - 1) * HP_PER_LEVEL + a.vit * HP_PER_VIT,
    maxMana: manaBase + (level - 1) * MANA_PER_LEVEL + a.int * MANA_PER_INT,
    hpRegen: 1 + a.vit * 0.15,
    manaRegen: 1 + a.wis * 0.2, // WIS regenera mana (INT dá o tamanho do poço)
    // Dano físico: STR no corpo a corpo, DEX no arco/besta.
    physAtk: 3 + (cls.attackType === 'ranged' ? a.dex : a.str) * 1.0 + skillPhys * 1.5,
    magicAtk: 3 + a.int * 1.0 + skillMagic * 2,
    // WIS pesa mais na cura (1,2) do que INT pesa no dano mágico (1,0): é o que
    // dá ao Druida um eixo próprio de crescimento em vez de uma cópia do
    // Feiticeiro. O Magic Level entra nos dois — o cajado treina magia.
    healPower: 3 + a.wis * 1.2 + skillMagic * 2,
    // Crítico é LUK — é a função principal do atributo Sorte.
    critChance: clamp(0.03 + a.luk * 0.006, 0, 0.6),
    critMult: 1.5 + a.luk * 0.008,
    defense: 1 + Math.floor(a.agi * 0.2) + Math.floor(a.vit * 0.15),
    magicResist: clamp(a.wis * 0.01, 0, 0.6),
    dodgeChance: clamp(a.agi * 0.005, 0, 0.5),
    // DEX dá precisão, como `ATTRIBUTE_INFO` sempre prometeu. O peso é menor
    // que o da esquiva (0,004 contra 0,005): quem investe em AGI para desviar
    // deve levar vantagem sobre quem investe em DEX só para acertar — senão a
    // esquiva vira estatística morta em qualquer duelo.
    accuracy: clamp(a.dex * 0.004, 0, 0.5),
    // Velocidade de ATAQUE vem de AGI (GDD §4: "AGI = velocidade de ataque").
    // O nível não acelera nada sozinho — ele dá pontos, e você escolhe.
    attackCooldownMs: Math.max(300, 1100 - a.agi * 12),
    // Velocidade de MOVIMENTO idem: sobe conforme você gasta pontos em AGI.
    moveIntervalMs: Math.max(150, 480 - a.agi * 5),
    manaCost: Math.max(2, Math.round(cls.spellCost * (1 - a.wis * 0.01))),
    attackType: cls.attackType,
    attackRange: cls.attackRange,
  };
}

/** Calcula um golpe a partir da potência e da chance/mult de crítico. */
export function computeHit(
  power: number,
  critChance: number,
  critMult: number,
  rng: () => number = Math.random,
): { amount: number; crit: boolean } {
  const variance = 0.85 + rng() * 0.3; // 0.85 .. 1.15
  const crit = rng() < critChance;
  return { amount: Math.max(1, Math.round(power * variance * (crit ? critMult : 1))), crit };
}

export function totalAttributes(a: Attributes): number {
  return a.str + a.dex + a.vit + a.int + a.wis + a.agi + a.luk;
}
