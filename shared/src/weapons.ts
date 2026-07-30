/**
 * Armas, raridade e passivos aleatórios (GDD §6, mensagens #262–#264, #422).
 *
 * Duas coisas separadas formam um equipamento:
 *
 *  1. IDENTIDADE (fixa) — o que faz uma espada ser espada e um machado ser
 *     machado. Espada é rápida e média; machado é lento e forte; adaga é
 *     rapidíssima e fraca. Isso nunca muda.
 *
 *  2. PASSIVOS (aleatórios) — rolados quando o item nasce. É o que impede que
 *     "toda espada acabe parecendo igual" e faz um Épico bem rolado valer mais
 *     que um Lendário mediano.
 *
 * Regra de ouro do GDD: nenhum passivo pode ser obrigatório para uma build.
 * Todo passivo é forte numa situação e apenas bom em outras.
 */

/** Tipos de arma. Cada um tem proficiência própria, que sobe com o uso. */
export type WeaponType =
  | 'sword' | 'axe' | 'mace' | 'dagger' | 'spear'
  | 'bow' | 'crossbow' | 'staff';

export const WEAPON_TYPES: WeaponType[] = [
  'sword', 'axe', 'mace', 'dagger', 'spear', 'bow', 'crossbow', 'staff',
];

export interface WeaponIdentity {
  type: WeaponType;
  name: string;
  /** Quantas mãos ocupa. Duas mãos = sem escudo, em troca de mais atributo. */
  hands: 1 | 2;
  /** Multiplicador do dano-base do tipo (machado bate mais que adaga). */
  damageMult: number;
  /** Multiplicador da cadência: <1 é mais rápido, >1 é mais lento. */
  speedMult: number;
  /** Alcance em tiles do ataque básico. */
  range: number;
  /** Arma mágica usa poder mágico em vez de físico. */
  magic: boolean;
  blurb: string;
}

/**
 * A identidade de cada tipo. Note que dano e velocidade se compensam: a adaga
 * bate fraco mas rápido, o machado o contrário. Nenhum é estritamente melhor.
 */
export const WEAPON_IDENTITY: Record<WeaponType, WeaponIdentity> = {
  sword:    { type: 'sword',    name: 'Espada',  hands: 1, damageMult: 1.0,  speedMult: 1.0,  range: 1, magic: false, blurb: 'Equilibrada: dano médio, ataque rápido.' },
  axe:      { type: 'axe',      name: 'Machado', hands: 1, damageMult: 1.25, speedMult: 1.25, range: 1, magic: false, blurb: 'Lenta, mas o dano bruto é o maior.' },
  mace:     { type: 'mace',     name: 'Maça',    hands: 1, damageMult: 1.15, speedMult: 1.2,  range: 1, magic: false, blurb: 'Alto impacto — boa contra armadura.' },
  dagger:   { type: 'dagger',   name: 'Adaga',   hands: 1, damageMult: 0.65, speedMult: 0.6,  range: 1, magic: false, blurb: 'Fraca por golpe, rapidíssima.' },
  spear:    { type: 'spear',    name: 'Lança',   hands: 2, damageMult: 1.2,  speedMult: 1.1,  range: 2, magic: false, blurb: 'Perfuração e alcance de 2 tiles.' },
  bow:      { type: 'bow',      name: 'Arco',    hands: 2, damageMult: 1.0,  speedMult: 0.9,  range: 5, magic: false, blurb: 'Rápido e de longo alcance.' },
  crossbow: { type: 'crossbow', name: 'Besta',   hands: 2, damageMult: 1.45, speedMult: 1.35, range: 5, magic: false, blurb: 'Lenta, dano alto, longo alcance.' },
  staff:    { type: 'staff',    name: 'Cajado',  hands: 1, damageMult: 1.0,  speedMult: 1.0,  range: 4, magic: true,  blurb: 'Canaliza poder mágico.' },
};

// ---------------------------------------------------------------------------
// Raridade
// ---------------------------------------------------------------------------

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'relic';

export const RARITIES: Rarity[] = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'relic',
];

export interface RarityDef {
  id: Rarity;
  name: string;
  /** Quantos passivos aleatórios o item recebe. */
  affixes: number;
  /** Faixa de slots de carta — proposital: dois Épicos podem ser diferentes. */
  slotsMin: number;
  slotsMax: number;
  /** Multiplicador do atributo-base (atk/def) do item. */
  statMult: number;
  /** Cor da moldura/nome na interface. */
  color: number;
}

export const RARITY: Record<Rarity, RarityDef> = {
  common:    { id: 'common',    name: 'Comum',     affixes: 0, slotsMin: 1, slotsMax: 2, statMult: 1.0,  color: 0xb8b8b8 },
  uncommon:  { id: 'uncommon',  name: 'Incomum',   affixes: 1, slotsMin: 1, slotsMax: 3, statMult: 1.15, color: 0x5fbf5f },
  rare:      { id: 'rare',      name: 'Raro',      affixes: 2, slotsMin: 2, slotsMax: 3, statMult: 1.3,  color: 0x4a86d8 },
  epic:      { id: 'epic',      name: 'Épico',     affixes: 3, slotsMin: 2, slotsMax: 4, statMult: 1.5,  color: 0xa55fd8 },
  legendary: { id: 'legendary', name: 'Lendário',  affixes: 4, slotsMin: 3, slotsMax: 4, statMult: 1.75, color: 0xe0a33c },
  mythic:    { id: 'mythic',    name: 'Mítico',    affixes: 5, slotsMin: 4, slotsMax: 4, statMult: 2.0,  color: 0xd8453c },
  relic:     { id: 'relic',     name: 'Relíquia',  affixes: 6, slotsMin: 4, slotsMax: 4, statMult: 2.3,  color: 0xf0e6c8 },
};

// ---------------------------------------------------------------------------
// Passivos aleatórios
// ---------------------------------------------------------------------------

/**
 * Classes que **priorizam** cada tipo de arma (Doc 4, cap. 38).
 *
 * 🔴 O doc diz **"Prioriza"**, não "só pode usar". A diferença importa: é
 * afinidade, não bloqueio. Um Feiticeiro PODE segurar uma espada — só não é o
 * dele, e o GDD reforça isso ao ter proficiência `Fist` para lutar sem arma
 * nenhuma. Bloquear seria inventar restrição que o documento não pediu.
 *
 * ⚠️ **Sem efeito mecânico ainda, de propósito.** O doc não dá penalidade nem
 * bônus numérico para arma fora da afinidade, e inventar um mexeria em
 * balanceamento sem base. Por ora é informação para o jogador — o tooltip diz
 * para quem a peça foi feita, o que já resolve o problema real de hoje: não há
 * como saber que cajado é coisa de Feiticeiro.
 *
 * O Druid entra porque o cap. 38 o lista; a classe é a Etapa 15.
 */
export const WEAPON_CLASS_AFFINITY: Record<WeaponType, string[]> = {
  sword: ['knight', 'assassin'], // o Assassin prioriza "Espadas Curtas"
  axe: ['knight'],
  mace: ['knight'],
  spear: ['knight'],
  dagger: ['assassin'],
  bow: ['archer'],
  crossbow: ['archer'],
  staff: ['sorcerer', 'druid'],
};

/**
 * Categoria de armadura, para a afinidade de classe do cap. 38.
 *
 * O doc separa **Armaduras Pesadas** (Warrior), **Leves** (Archer e Assassin) e
 * **Vestes** (Sorcerer e Druid). Hoje o catálogo tem só peças de couro, que caem
 * em `light` — as outras duas categorias existem para o catálogo do cap. 13–43
 * preencher.
 */
export type ArmorClass = 'heavy' | 'light' | 'robe';

export const ARMOR_CLASS_AFFINITY: Record<ArmorClass, string[]> = {
  heavy: ['knight'],
  light: ['archer', 'assassin'],
  robe: ['sorcerer', 'druid'],
};

export type AffixId =
  | 'atk_speed' | 'crit_chance' | 'crit_damage' | 'phys_damage'
  | 'armor_pen' | 'life_steal' | 'hp_bonus' | 'mana_bonus'
  | 'move_speed' | 'defense';

export interface AffixDef {
  id: AffixId;
  name: string;
  /** Faixa do valor rolado (o número é a unidade do passivo). */
  min: number;
  max: number;
  /** Valor em porcentagem? (define só como o texto é montado). */
  percent: boolean;
  /** Só aparece em arma / só em armadura / em qualquer equipamento. */
  on: 'weapon' | 'armor' | 'any';
}

export const AFFIXES: Record<AffixId, AffixDef> = {
  atk_speed:   { id: 'atk_speed',   name: 'Velocidade de ataque', min: 4,  max: 12, percent: true,  on: 'weapon' },
  crit_chance: { id: 'crit_chance', name: 'Chance de crítico',    min: 3,  max: 12, percent: true,  on: 'weapon' },
  crit_damage: { id: 'crit_damage', name: 'Dano crítico',         min: 8,  max: 25, percent: true,  on: 'weapon' },
  phys_damage: { id: 'phys_damage', name: 'Dano físico',          min: 5,  max: 18, percent: true,  on: 'weapon' },
  armor_pen:   { id: 'armor_pen',   name: 'Penetração de armadura', min: 5, max: 20, percent: true, on: 'weapon' },
  life_steal:  { id: 'life_steal',  name: 'Roubo de vida',        min: 2,  max: 8,  percent: true,  on: 'weapon' },
  hp_bonus:    { id: 'hp_bonus',    name: 'Vida',                 min: 10, max: 60, percent: false, on: 'any' },
  mana_bonus:  { id: 'mana_bonus',  name: 'Mana',                 min: 8,  max: 45, percent: false, on: 'any' },
  move_speed:  { id: 'move_speed',  name: 'Velocidade de movimento', min: 2, max: 8, percent: true, on: 'any' },
  defense:     { id: 'defense',     name: 'Defesa',               min: 2,  max: 12, percent: false, on: 'armor' },
};

export const AFFIX_IDS: AffixId[] = Object.keys(AFFIXES) as AffixId[];

/** Um passivo já rolado, com o valor fixado para aquela instância do item. */
export interface RolledAffix {
  id: AffixId;
  value: number;
}

/**
 * A "instância" de um equipamento: o que difere DUAS espadas curtas iguais.
 * Vive dentro do ItemStack e é gerado uma vez, quando o item nasce.
 */
export interface ItemRoll {
  rarity: Rarity;
  affixes: RolledAffix[];
  /** Slots de carta deste exemplar (as cartas em si vêm numa etapa futura). */
  slots: number;
  /**
   * Modificadores de NOME (`DD-AFFIX-001`, cap. 46 do Doc 4). Ids de
   * `affixes.ts`, que é a camada de identidade por cima destes passivos.
   *
   * Ficam aqui, e não em `affixes.ts`, porque são parte da INSTÂNCIA do item:
   * o que faz esta espada ser "Feroz do Dragão" e a de ao lado não.
   * Ausentes = item sem nome próprio (todo Comum, e alguns Incomuns).
   */
  prefix?: string;
  suffix?: string;
}

/** Texto pronto de um passivo, para tooltip. */
export function affixText(a: RolledAffix): string {
  const def = AFFIXES[a.id];
  return `+${a.value}${def.percent ? '%' : ''} ${def.name}`;
}

/** Soma o valor de um passivo numa lista rolada (0 se não tiver). */
export function affixValue(affixes: RolledAffix[] | undefined, id: AffixId): number {
  if (!affixes) return 0;
  let total = 0;
  for (const a of affixes) if (a.id === id) total += a.value;
  return total;
}

// ---------------------------------------------------------------------------
// Rolagem
// ---------------------------------------------------------------------------

const randInt = (min: number, max: number, rng: () => number): number =>
  min + Math.floor(rng() * (max - min + 1));

/**
 * Sorteia a raridade de um drop. Monstro mais forte (nível maior) empurra a
 * curva para cima, mas Lendário+ continua sendo evento raro.
 */
export function rollRarity(bonus = 0, rng: () => number = Math.random): Rarity {
  const r = rng() * 100 - bonus;
  if (r > 60) return 'common';
  if (r > 32) return 'uncommon';
  if (r > 14) return 'rare';
  if (r > 5) return 'epic';
  if (r > 1.5) return 'legendary';
  if (r > 0.3) return 'mythic';
  return 'relic';
}

/**
 * Gera a instância de um equipamento: raridade, passivos, slots e nome.
 *
 * `names` vem de fora (`rollAffixNames` em `affixes.ts`) em vez de ser sorteado
 * aqui, e o motivo é estrutural: `affixes.ts` importa `AffixId` e `Rarity` deste
 * arquivo, então chamar de volta criaria import circular. Quem cria o item
 * chama os dois e junta — o servidor faz isso em um lugar só.
 */
export function rollItem(
  rarity: Rarity,
  on: 'weapon' | 'armor',
  rng: () => number = Math.random,
  names?: { prefix?: string; suffix?: string },
): ItemRoll {
  const def = RARITY[rarity];
  const candidatos = AFFIX_IDS.filter((id) => AFFIXES[id].on === on || AFFIXES[id].on === 'any');
  const escolhidos: RolledAffix[] = [];
  const disponiveis = [...candidatos];
  for (let i = 0; i < def.affixes && disponiveis.length > 0; i++) {
    // Sem passivo repetido no mesmo item: cada linha é uma propriedade distinta.
    const idx = Math.floor(rng() * disponiveis.length);
    const id = disponiveis.splice(idx, 1)[0]!;
    const a = AFFIXES[id];
    escolhidos.push({ id, value: randInt(a.min, a.max, rng) });
  }
  return {
    rarity,
    affixes: escolhidos,
    slots: randInt(def.slotsMin, def.slotsMax, rng),
    ...(names?.prefix ? { prefix: names.prefix } : {}),
    ...(names?.suffix ? { suffix: names.suffix } : {}),
  };
}

// ---------------------------------------------------------------------------
// Proficiência (maestria de arma)
// ---------------------------------------------------------------------------

/**
 * Proficiência NÃO tem teto (GDD §6): ela nunca para de subir, o que muda é a
 * velocidade. 0→20 voa, 60→100 é normal, 200→300 é extremamente lento. Cada
 * ponto conquistado exige mais dedicação — como uma habilidade da vida real.
 */
export function proficiencyThreshold(level: number): number {
  return Math.round(8 + Math.pow(level, 1.55) * 0.9);
}

/** Bônus de dano da proficiência: cresce sempre, mas com retorno decrescente. */
export function proficiencyBonus(level: number): number {
  return Math.pow(level, 0.85) * 0.55;
}

/** Proficiência de cada tipo de arma do personagem. */
export type Proficiencies = Partial<Record<WeaponType, { level: number; progress: number }>>;

export function proficiencyOf(profs: Proficiencies, type: WeaponType): number {
  return profs[type]?.level ?? 0;
}
