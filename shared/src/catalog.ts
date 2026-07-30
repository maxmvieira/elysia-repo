/**
 * O GERADOR: transforma os modelos do documento (`models.ts`) em itens jogáveis,
 * usando a curva de `equipcurve.ts`.
 *
 * 🔴 **Por que gerar em vez de escrever.** São 178 peças. Escritas à mão seriam
 * 178 oportunidades de um `atk` fora da escada, de um nome divergindo do
 * canônico, ou de um `kind` duplicado — e rebalancear exigiria reabrir as 178.
 * Aqui, mudar a progressão inteira do jogo é mudar uma constante em
 * `equipcurve.ts`.
 *
 * ⚠️ **O que este arquivo NÃO gera:** os 13 itens que já existiam escritos à mão
 * em `items.ts`. Eles têm `kind` em inglês (`short_sword`, `leather_armor`),
 * preço escolhido a dedo e balanceamento que o dono já aprovou jogando. Modelo
 * com o campo `kind` preenchido é pulado — mas continua entrando no
 * `MODEL_INDEX`, porque o nível recomendado dele é usado para limitar drop e
 * fabricação.
 *
 * Há teste conferindo que as peças âncora **batem com a curva** (tolerância de
 * ±1 ponto). Se alguém mexer na curva e afastá-la das peças que o jogo já usa,
 * o teste avisa em vez de deixar o catálogo silenciosamente em duas escadas
 * diferentes.
 */

import {
  MODEL_FAMILIES,
  TIER_RANK,
  type EquipModel,
  type ModelFamily,
  type ModelTier,
} from './models.js';
import {
  armorDefFor,
  modelBuyPrice,
  modelKind,
  modelLevel,
  weaponAtkFor,
} from './equipcurve.js';
import type { ArmorClass, Rarity, WeaponType } from './weapons.js';
import type { EquipSlot, ItemDef } from './items.js';

/** Um modelo já resolvido: com `kind`, nível e tudo que o item precisa. */
export interface ModelEntry {
  kind: string;
  name: string;
  familyId: string;
  chapter: number;
  tier: ModelTier;
  /** Nível recomendado, derivado do tier e da posição dentro dele. */
  level: number;
  slot: EquipSlot;
  weaponType?: WeaponType;
  armorClass?: ArmorClass;
  unique?: boolean;
  /**
   * `false` = o item vem escrito à mão de `items.ts`, e este registro existe só
   * para o nível recomendado ser conhecido.
   */
  generated: boolean;
}

/**
 * 🔴 **A peça âncora fica no piso da escada, mesmo que o documento a liste no
 * meio.**
 *
 * O cap. 17 põe Faca e Punhal *antes* da Adaga Curta, então a posição dela na
 * lista daria Lv.14. Mas a Adaga Curta é o que o comerciante vende para quem
 * acabou de nascer, com `atk: 8` escrito à mão — colocá-la em Lv.14 criaria uma
 * peça de balcão com o dobro do preço do resto do estoque e um buraco entre ela
 * e o próximo modelo.
 *
 * A âncora continua **ocupando a posição dela** na distribuição dos outros, e
 * isso importa: tirá-la da contagem faz o primeiro modelo gerado do tier cair no
 * piso da faixa junto com ela. Foi o que aconteceu com o Machado de Ferro, que
 * empatava em Lv.1 com o Machado de Lenhador e depois pulava direto para Lv.20.
 * Mantendo a posição, a escada fica Lenhador 1 · de Ferro 11 · Militar 20.
 */
const ANCHOR_LEVEL = 1;

function resolveFamily(fam: ModelFamily): ModelEntry[] {
  const out: ModelEntry[] = [];
  // O nível vem da posição DENTRO do tier, então cada tier é contado à parte.
  const porTier = new Map<ModelTier, EquipModel[]>();
  for (const mod of fam.models) {
    const lista = porTier.get(mod.tier) ?? [];
    lista.push(mod);
    porTier.set(mod.tier, lista);
  }
  for (const [tier, lista] of porTier) {
    lista.forEach((mod, idx) => {
      out.push({
        kind: mod.kind ?? modelKind(mod.name),
        name: mod.name,
        familyId: fam.id,
        chapter: fam.chapter,
        tier,
        level: mod.kind ? ANCHOR_LEVEL : modelLevel(tier, idx, lista.length),
        slot: fam.slot,
        ...(fam.weaponType ? { weaponType: fam.weaponType } : {}),
        ...(mod.armorClass ?? fam.armorClass
          ? { armorClass: (mod.armorClass ?? fam.armorClass)! }
          : {}),
        ...(mod.unique ? { unique: true } : {}),
        generated: !mod.kind,
      });
    });
  }
  return out;
}

/** Todo modelo do catálogo, resolvido — gerado ou âncora. */
export const MODEL_ENTRIES: ModelEntry[] = MODEL_FAMILIES.flatMap(resolveFamily);

/** Busca pelo `kind`. É como o servidor descobre o nível de uma peça. */
export const MODEL_INDEX: Record<string, ModelEntry> = Object.fromEntries(
  MODEL_ENTRIES.map((e) => [e.kind, e]),
);

/** Nível recomendado de um equipamento. `0` = não é peça de catálogo. */
export function modelLevelOf(kind: string): number {
  return MODEL_INDEX[kind]?.level ?? 0;
}

// ---------------------------------------------------------------------------
// Quem pode fabricar o quê
// ---------------------------------------------------------------------------

/**
 * 🔴 **A raridade da receita limita o TIER do modelo.** Sem isto, o catálogo
 * inteiro nasce quebrado.
 *
 * A bancada do Ferreiro oferece todo item de categoria `equip` e o servidor
 * aceita qualquer `kind` — regra que funcionava quando havia 13 peças, todas de
 * nível 1. Com 113 modelos, um jogador recém-nascido fabricaria o Machado
 * Primordial com uma Receita Comum e três Fragmentos Comuns.
 *
 * A trava reusa a escada de raridade em vez de inventar um requisito de nível
 * novo, e isso é deliberado: `DD-PROF-026` deixa o jogador escolher a PEÇA na
 * hora da fabricação, e a raridade é a única grandeza que a receita já carrega.
 * O efeito é que a receita passa a valer duas coisas — a qualidade do resultado
 * e o alcance do catálogo — e o Fragmento de Relíquia volta a fazer sentido como
 * matéria-prima de topo.
 *
 * ⚠️ REFERÊNCIA: o documento não amarra raridade a tier. A escada abaixo é
 * escolha de projeto, e é o ponto de ajuste se a fabricação ficar apertada
 * demais.
 */
export const CRAFT_TIER_CAP: Record<Rarity, ModelTier> = {
  common: 'inicial',
  uncommon: 'inicial',
  rare: 'intermediario',
  epic: 'intermediario',
  legendary: 'avancado',
  mythic: 'avancado',
  relic: 'avancado',
};

/**
 * Este modelo pode sair de uma receita desta raridade?
 *
 * Item que não é peça de catálogo (as âncoras de `items.ts` continuam sendo, mas
 * uma poção não) devolve `false` — só equipamento se fabrica, e quem valida isso
 * é o chamador; aqui a resposta para o desconhecido é "não", que é o lado seguro.
 */
export function craftableModel(kind: string, recipeRarity: Rarity): boolean {
  const entry = MODEL_INDEX[kind];
  if (!entry) return false;
  // Artefato único do cap. 40 nunca é fabricável: existe um só no mundo.
  if (entry.unique) return false;
  return TIER_RANK[entry.tier] <= TIER_RANK[CRAFT_TIER_CAP[recipeRarity]];
}

/** Modelos que uma receita desta raridade alcança, para a bancada listar. */
export function craftableModels(recipeRarity: Rarity): ModelEntry[] {
  return MODEL_ENTRIES.filter((e) => craftableModel(e.kind, recipeRarity));
}

function toItemDef(e: ModelEntry, color: number): ItemDef {
  const arma = e.slot === 'weapon';
  return {
    kind: e.kind,
    name: e.name,
    category: 'equip',
    stackable: false,
    // Artefato único não tem preço de balcão (cap. 40): existe um só no mundo, e
    // preço de loja apagaria exatamente o valor narrativo que o capítulo protege.
    buyPrice: e.unique ? 0 : modelBuyPrice(e.level),
    slot: e.slot,
    ...(arma && e.weaponType
      ? { atk: weaponAtkFor(e.weaponType, e.level), weaponType: e.weaponType }
      : { def: armorDefFor(e.slot, e.level, e.armorClass) }),
    ...(e.armorClass ? { armorClass: e.armorClass } : {}),
    ...(e.unique ? { unique: true } : {}),
    tier: e.level,
    color,
  };
}

/**
 * Os itens gerados, prontos para entrar em `ITEMS`.
 *
 * `items.ts` espalha este objeto no catálogo. A dependência é de mão única —
 * este arquivo só importa **tipos** de `items.ts`, que somem na compilação, então
 * não há ciclo em tempo de execução.
 */
export const GENERATED_EQUIP: Record<string, ItemDef> = (() => {
  const out: Record<string, ItemDef> = {};
  const corPorFamilia = new Map(MODEL_FAMILIES.map((f) => [f.id, f.color]));
  for (const e of MODEL_ENTRIES) {
    if (!e.generated) continue;
    out[e.kind] = toItemDef(e, corPorFamilia.get(e.familyId) ?? 0x9a9a9a);
  }
  return out;
})();
