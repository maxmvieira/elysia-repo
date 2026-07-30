/**
 * A CURVA de equipamento: como um modelo do catálogo (Doc 4, cap. 13–34) vira
 * `atk`, `def`, nível recomendado e preço.
 *
 * 🔴 **Por que uma curva e não 178 números à mão.** O documento não dá um único
 * atributo: dos onze capítulos de arma, só o das Espadas tem descrição
 * qualitativa ("bom dano", "mais lenta"), e os capítulos de armadura são lista de
 * nome pura. Escolher 178 pares de números à mão seria 178 oportunidades de
 * contradição, e rebalancear depois exigiria reabrir todos. Aqui a decisão de
 * balanceamento fica em **cinco constantes**, e o resto é consequência.
 *
 * ⚠️ **REFERÊNCIA em tudo neste arquivo.** O dono delegou o balanceamento
 * ("faça da forma que achar melhor", 2026-07-30); o documento não fecha nenhum
 * destes números. O que é canônico é a *estrutura* do cap. 42/43 — modelo define
 * identidade, raridade define qualidade — e ela está respeitada: a curva dá o
 * atributo-base do MODELO, e `RARITY.statMult` multiplica por cima, em
 * `equipBonus` no servidor.
 *
 * ## A descoberta que fixou a tabela
 *
 * Os `def` escolhidos à mão no catálogo antigo não eram arbitrários. Com o `atk`
 * das armas iniciais (8) como unidade, eles caem exatos numa fração por slot:
 *
 * ```
 * Armadura 5/8 = 0,625   Escudo 4/8 = 0,5   Calça 3/8 = 0,375
 * Elmo e Botas 2/8 = 0,25            Colar 1/8 = 0,125
 * ```
 *
 * Então `SLOT_DEF_SHARE` não é invenção: é a tabela que já existia implícita,
 * agora escrita. `equipPower(1)` vale 8 justamente para reproduzi-la — e há teste
 * conferindo que as peças âncora continuam batendo com a curva.
 */

import type { ArmorClass, WeaponType } from './weapons.js';
import type { EquipSlot } from './items.js';
import type { ModelTier } from './models.js';

// ---------------------------------------------------------------------------
// A curva
// ---------------------------------------------------------------------------

/** Poder no nível 1 — o `atk` das armas iniciais, e a unidade de `SLOT_DEF_SHARE`. */
export const CURVE_BASE = 8;

/**
 * Expoente do crescimento. **< 1 de propósito: a curva DESACELERA.**
 *
 * É o mesmo princípio do `DD-PROG-001` aplicado ao equipamento — se o poder
 * crescesse linearmente ou pior, cada tier novo apagaria o anterior e o catálogo
 * inteiro viraria uma escada de uso único.
 */
export const CURVE_EXP = 0.85;

/**
 * Coeficiente do crescimento de **ATAQUE**.
 *
 * 🔴 **Calibrado no bestiário, não no gosto.** A força das criaturas vai de ~4
 * (Slime Verde) a **24** (Zumbi, o mais forte do jogo) — um crescimento de ~6×
 * ao longo de todo o conteúdo que existe. O ataque de equipamento acompanha essa
 * ordem de grandeza (8 → 45, ~5,6×) em vez de dispará-la.
 *
 * A primeira tentativa levava o topo a 100, e a consequência aparecia no começo:
 * uma arma de Lv.20 saía com `atk: 31`, mais que a força de ataque INTEIRA do
 * monstro mais perigoso do jogo. Equipamento de nível médio não pode valer mais
 * que o topo do bestiário.
 */
export const ATK_COEF = 0.75;

/**
 * Coeficiente do crescimento de **DEFESA**. É três vezes menor que o de ataque,
 * e a assimetria é obrigatória — não é gosto.
 *
 * 🔴 **`resolveDamage` mitiga por SUBTRAÇÃO PLANA:** `max(0, dano − def)`
 * (`defense.ts`). Defesa não tem retorno decrescente nenhum, então ela não
 * "reduz muito" — a partir de um ponto ela **zera** o dano e o jogador vira
 * invulnerável. E o teto é baixo: o Zumbi bate com 24.
 *
 * O set de couro completo de hoje soma 17 de defesa contra esses 24 — ou seja, o
 * jogo já opera a 70 % do ponto de imunidade. Com o coeficiente de ataque (0,75)
 * aplicado à defesa, um set de Lv.20 passaria de 24 e o Zumbi deixaria de causar
 * dano. Com 0,25, o set completo sai de ~18 no Lv.1 para ~46 no Lv.100.
 *
 * ⚠️ **Isso ainda cruza a linha, só que mais tarde** — por volta do Lv.40 com set
 * pesado. É limitação do bestiário, não da curva: não existe criatura de Tier IV
 * para bater mais forte. Há teste travando o conjunto **obtenível** abaixo do
 * limite; quando o Tier IV entrar, sobe-se `strength` das criaturas e este
 * coeficiente junto.
 */
export const DEF_COEF = 0.25;

/** Nível do modelo mais forte do catálogo (Primordial, Celestial). */
export const LEVEL_TOP = 100;

/**
 * Poder de ATAQUE de um equipamento no nível recomendado dele. Também é a base
 * do preço.
 *
 * `8` no Lv.1 · `10` no Lv.5 · `13` no Lv.10 · `18` no Lv.20 · `26` no Lv.40 ·
 * `33` no Lv.60 · `40` no Lv.80 · `45` no Lv.100.
 */
export function equipPower(level: number): number {
  return CURVE_BASE + ATK_COEF * Math.pow(Math.max(0, level - 1), CURVE_EXP);
}

/**
 * Poder de DEFESA no nível recomendado. Curva própria, muito mais rasa — ver o
 * comentário de `DEF_COEF` para o motivo, que é a subtração plana em
 * `resolveDamage`.
 *
 * `8` no Lv.1 · `9,7` no Lv.20 · `13,9` no Lv.60 · `20,4` no Lv.100.
 */
export function equipDefPower(level: number): number {
  return CURVE_BASE + DEF_COEF * Math.pow(Math.max(0, level - 1), CURVE_EXP);
}

// ---------------------------------------------------------------------------
// Ataque
// ---------------------------------------------------------------------------

/**
 * Multiplicador de `atk` por tipo de arma.
 *
 * 🔴 **É 1,0 em quase tudo, e isso é deliberado.** A identidade de cada arma
 * (machado forte e lento, adaga fraca e rápida) já vive em
 * `WEAPON_IDENTITY.damageMult` e `speedMult`, e ela multiplica o **golpe
 * inteiro** em `recompute`. Repetir a diferença aqui contaria a mesma identidade
 * duas vezes, e a adaga acabaria fraca em dois lugares somados.
 *
 * ⚠️ A exceção é o cajado: `magicAtk` cresce mais por ponto de skill que
 * `physAtk` (`skillMagic × 2` contra `skillPhys × 1,5`, em `stats.ts`), então o
 * mesmo `atk` de arma rende mais na mão do conjurador. O 0,75 é o que já estava
 * escolhido à mão — o Cajado do Aprendiz tem `atk: 6` e as demais armas iniciais
 * têm 8.
 */
export const WEAPON_ATK_MULT: Record<WeaponType, number> = {
  sword: 1.0,
  axe: 1.0,
  mace: 1.0,
  dagger: 1.0,
  spear: 1.0,
  bow: 1.0,
  crossbow: 1.0,
  staff: 0.75,
};

/** `atk` de uma arma deste tipo no nível recomendado dela. */
export function weaponAtkFor(type: WeaponType, level: number): number {
  return Math.round(equipPower(level) * WEAPON_ATK_MULT[type]);
}

// ---------------------------------------------------------------------------
// Defesa
// ---------------------------------------------------------------------------

/**
 * Fração do poder que cada slot entrega como `def`. Ver a tabela no topo do
 * arquivo: estes números foram **extraídos** do catálogo à mão, não escolhidos.
 *
 * Slot ausente = a peça não dá defesa (`weapon`, `container`).
 */
export const SLOT_DEF_SHARE: Partial<Record<EquipSlot, number>> = {
  armor: 0.625,
  shield: 0.5,
  pants: 0.375,
  helmet: 0.25,
  boots: 0.25,
  necklace: 0.125,
  ring: 0.125,
};

/**
 * Multiplicador de defesa por classe de armadura (cap. 25 e 38).
 *
 * Calibrado em **`light` = 1,0** porque as peças de couro são as únicas que já
 * existiam, e elas não podem mudar de número. Pesada troca mobilidade por
 * proteção; Veste troca proteção por poder mágico — e é aí que está o buraco
 * abaixo.
 *
 * ⚠️ **A Veste não recebe nada em troca ainda.** `ItemDef` não tem campo de mana
 * ou poder mágico fixo, só `atk`/`def`, então hoje uma Veste é simplesmente uma
 * armadura pior. O que compensa é o passivo rolado (`mana_bonus` existe em
 * `AFFIXES`), o que é aleatório e não estrutural. Dar bônus mágico de
 * equipamento é decisão do dono e mexeria em `equipBonus` — até lá, o 0,75 é o
 * lado ruim de uma troca de um lado só.
 */
export const ARMOR_CLASS_DEF_MULT: Record<ArmorClass, number> = {
  heavy: 1.25,
  medium: 1.1,
  light: 1.0,
  robe: 0.75,
};

/**
 * 🔴 **O botão de emergência da defesa. Leia `DEF_COEF` antes de mexer nele.**
 *
 * `DEF_COEF` já segura o crescimento; este multiplicador é o ajuste global de
 * uma linha, para quando o bestiário mudar. Um set completo soma `2,25 ×
 * equipDefPower` (a soma de todos os `SLOT_DEF_SHARE`), vezes a classe: ~18 no
 * Lv.1 e ~46 no Lv.100 com peças leves, ~57 com pesadas.
 *
 * Contra os 24 de força do Zumbi, isso vira imunidade em algum ponto do meio do
 * jogo — e não há como evitar enquanto a mitigação for subtração plana e o
 * bestiário parar no Tier III. O que impede o problema de acontecer **hoje** é a
 * obtenção: `VENDOR_STOCK` é lista curada, o drop é limitado por nível e a
 * bancada pela raridade da receita. Há teste travando o conjunto obtenível.
 *
 * Quando o Tier IV existir, a escolha é do dono: subir o `strength` das
 * criaturas (e este multiplicador junto), ou trocar a subtração plana por
 * redução com retorno decrescente em `resolveDamage`.
 */
export const DEF_CURVE_MULT = 1.0;

/** `def` de uma peça deste slot e classe no nível recomendado dela. */
export function armorDefFor(
  slot: EquipSlot,
  level: number,
  armorClass: ArmorClass = 'light',
): number {
  const share = SLOT_DEF_SHARE[slot];
  if (!share) return 0;
  const bruto = equipDefPower(level) * share * ARMOR_CLASS_DEF_MULT[armorClass] * DEF_CURVE_MULT;
  // Piso de 1: peça de proteção que dá 0 de defesa parece bug, não regra.
  return Math.max(1, Math.round(bruto));
}

// ---------------------------------------------------------------------------
// Nível recomendado
// ---------------------------------------------------------------------------

/**
 * Faixa de nível de cada tier, inclusiva nas duas pontas.
 *
 * ⚠️ As faixas são **REFERÊNCIA**. O cap. 13 rotula "Tier Inicial /
 * Intermediário" sem dar nível nenhum, e os outros capítulos não rotulam nada —
 * o tier de cada modelo já vem inferido da ordem da lista, em `models.ts`.
 *
 * O topo é o **Lv.100** e não um número maior porque é onde o bestiário para de
 * existir (o Tier III é conteúdo de 50–100). Deixar o Primordial em 100 mantém
 * sobra para o Tier IV e para os artefatos únicos do cap. 40.
 */
export const TIER_BANDS: Record<ModelTier, readonly [number, number]> = {
  inicial: [1, 20],
  intermediario: [21, 60],
  avancado: [61, LEVEL_TOP],
};

/**
 * Nível recomendado de um modelo, pela posição dele dentro do próprio tier.
 *
 * O primeiro modelo do tier fica no piso da faixa e o último no teto, com o
 * resto distribuído por igual. É por isso que uma família de 7 modelos e uma de
 * 15 terminam no mesmo lugar: a Besta Primordial e a Espada Primordial são as
 * duas o fim da linha, e devem ser.
 */
export function modelLevel(tier: ModelTier, indexInTier: number, countInTier: number): number {
  const [lo, hi] = TIER_BANDS[tier];
  if (countInTier <= 1) return lo;
  const t = Math.min(1, Math.max(0, indexInTier / (countInTier - 1)));
  return Math.round(lo + (hi - lo) * t);
}

// ---------------------------------------------------------------------------
// Preço
// ---------------------------------------------------------------------------

/**
 * Ouro por ponto de poder. Ancorado nas peças que já tinham preço: a Espada
 * Curta custa 50 com poder 8 (6,25/ponto) e a Armadura de Couro custa 60 com
 * poder 8 (7,5/ponto).
 *
 * ⚠️ REFERÊNCIA — nenhum doc dá preço de equipamento. O cap. 42 pede "Valor base
 * de compra" como campo, não como número.
 */
export const PRICE_PER_POWER = 6.5;

/**
 * Preço de balcão de um modelo.
 *
 * 🔴 **Ter preço não é estar à venda.** Quem decide o que o NPC oferece é
 * `VENDOR_STOCK`, que é lista curada. O `buyPrice` aqui existe para que a peça
 * tenha **valor de venda** (`sellPriceOf` deriva dele) — sem isso, todo
 * equipamento de catálogo valeria zero no comerciante, que é a armadilha que o
 * Fragmento de Relíquia já tem e que "nada é lixo" proíbe.
 */
export function modelBuyPrice(level: number): number {
  return Math.max(1, Math.round(equipPower(level) * PRICE_PER_POWER));
}

// ---------------------------------------------------------------------------
// `kind` a partir do nome canônico
// ---------------------------------------------------------------------------

/**
 * Converte o nome canônico do documento no `kind` do item.
 *
 * 🔴 **O `kind` é o que fica gravado no save do jogador**, então ele não pode
 * mudar depois. Derivar do nome em vez de escrever 178 identificadores à mão é o
 * que garante que nenhum par nome/kind saia torto — e o teste que congela a
 * lista inteira de kinds faz o resto: renomear um modelo de forma que mudaria um
 * `kind` quebra o build, em vez de invalidar save meses depois.
 *
 * Os 13 itens que já existiam têm `kind` em inglês (`short_sword`) e **não** são
 * gerados: `models.ts` aponta para eles pelo campo `kind`, e o gerador os pula.
 */
export function modelKind(name: string): string {
  return name
    .normalize('NFD')
    // `\p{M}` = qualquer marca combinante, que é exatamente o que o NFD acabou de
    // separar da letra. Preferido a uma classe com os diacríticos literais: aquela
    // é invisível no diff e some se o arquivo passar por ferramenta que mexa em
    // encoding — o que já aconteceu duas vezes neste repositório.
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
