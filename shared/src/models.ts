/**
 * Catálogo de MODELOS de equipamento (Doc 4, cap. 13–23 e 43).
 *
 * 🔴 **Isto não é o catálogo de itens.** É a lista dos **nomes canônicos** de
 * cada modelo, e existe para uma finalidade específica: impedir que alguém
 * invente "Espada Larga" quando o documento diz "Espada Longa", ou "Machado de
 * Batalha" quando ele diz "Machado de Guerra". Nome errado é retrabalho silencioso
 * — descobre-se meses depois, quando o item já está em save de jogador.
 *
 * A separação que o cap. 43 estabelece, e que este arquivo encarna:
 *
 * ```
 * MODELO   define a IDENTIDADE   (Espada Longa)
 * RARIDADE define a QUALIDADE    (Comum … Relíquia)
 * ORIGEM   define como se OBTÉM  (NPC, loot, boss, crafting)
 * ```
 *
 * Uma "Espada Longa Comum" de NPC e uma "Espada Longa Lendária" forjada por
 * mestre são o **mesmo modelo**. É isso que dá variedade enorme sem exigir
 * milhares de modelos, e é por isso que aqui só existem nomes: os atributos vêm
 * das regras já consolidadas (`weapons.ts`, `RARITY.statMult`), não do catálogo.
 *
 * ⚠️ **Os modelos NÃO são itens do jogo ainda.** Só 8 dos ~130 existem em
 * `ITEMS`. Criar os outros exige atribuir `atk`/`def` a cada um, e **o documento
 * não dá número nenhum** — dos onze capítulos, só o das Espadas tem descrição
 * qualitativa ("bom dano", "mais lenta"), e os outros dez são lista de nome pura.
 * Preencher isso é decisão de balanceamento do dono, não invenção minha.
 */

import type { WeaponType } from './weapons.js';

/**
 * Faixa de progressão do modelo. O cap. 13 usa "Tier Inicial / Intermediário" e
 * os nomes dos demais capítulos seguem a mesma escada (Rúnico e Anão no meio,
 * Celestial e Primordial no topo).
 *
 * ⚠️ A faixa é **inferida da posição na lista do documento**, que é ordenada do
 * mais simples ao mais forte. O doc só rotula explicitamente no cap. 13.
 */
export type ModelTier = 'inicial' | 'intermediario' | 'avancado';

export interface EquipModel {
  /** Nome canônico, exatamente como o documento escreve. */
  name: string;
  tier: ModelTier;
  /** `kind` em `ITEMS`, quando o modelo já existe como item jogável. */
  kind?: string;
}

const i = (name: string, kind?: string): EquipModel =>
  ({ name, tier: 'inicial', ...(kind ? { kind } : {}) });
const m = (name: string, kind?: string): EquipModel =>
  ({ name, tier: 'intermediario', ...(kind ? { kind } : {}) });
const a = (name: string, kind?: string): EquipModel =>
  ({ name, tier: 'avancado', ...(kind ? { kind } : {}) });

/** Modelos de arma, por tipo. Nomes conforme cap. 13–21 do Doc 4. */
export const WEAPON_MODELS: Record<WeaponType, EquipModel[]> = {
  // Cap. 13 — o único com descrição qualitativa por modelo.
  sword: [
    i('Espada Enferrujada'), i('Espada Curta', 'short_sword'), i('Gládio'),
    i('Espada do Miliciano'), i('Espada Longa'), i('Sabre'), i('Falcata'),
    m('Espada Bastarda'), m('Claymore'), m('Espada do Cavaleiro'),
    m('Espada do Guardião'), m('Espada Rúnica'), m('Katana'),
    m('Espada Élfica'), m('Espada Anã'),
  ],
  // Cap. 14
  axe: [
    // A "Machadinha" antiga era um machado de mão simples — o Lenhador é o
    // equivalente canônico, não o de Ferro (que é o degrau acima).
    i('Machado de Lenhador', 'hand_axe'), i('Machado de Ferro'), i('Machado Militar'),
    m('Machado Bárbaro'), m('Machado de Guerra'), m('Machado Duplo'),
    m('Machado do Executor'), m('Machado Rúnico'), m('Machado Anão'),
    m('Machado Glacial'), m('Machado Vulcânico'),
    a('Machado Titânico'), a('Machado do Colosso'), a('Machado Celestial'),
    a('Machado da Ruína'), a('Machado Primordial'),
  ],
  // Cap. 15
  mace: [
    i('Clava', 'club'), i('Maça de Ferro'), i('Maça Militar'),
    m('Mangual'), m('Maça Pesada'), m('Maça Sagrada'), m('Maça do Guardião'),
    m('Maça Rúnica'), m('Maça Anã'), m('Maça do Julgamento'),
    a('Maça Celestial'), a('Maça Primordial'),
  ],
  // Cap. 16
  spear: [
    i('Lança de Madeira'), i('Lança Curta', 'spear'), i('Lança Militar'),
    m('Pique'), m('Alabarda'), m('Lança do Cavaleiro'), m('Lança Élfica'),
    m('Lança Rúnica'), m('Lança Dracônica'),
    a('Lança Celestial'), a('Lança Primordial'),
  ],
  // Cap. 17
  dagger: [
    i('Faca'), i('Punhal'), i('Adaga Curta', 'dagger'), i('Adaga de Aço'),
    m('Adaga Curva'), m('Adaga Sombria'), m('Adaga Élfica'),
    m('Adaga Envenenada'), m('Adaga Fantasma'),
    a('Adaga Celestial'), a('Adaga Primordial'),
  ],
  // Cap. 18
  bow: [
    i('Arco Curto', 'short_bow'), i('Arco Longo'), i('Arco Recurvo'),
    m('Arco Composto'), m('Arco Élfico'), m('Arco de Guerra'),
    m('Arco Rúnico'), m('Arco Dracônico'),
    a('Arco Celestial'), a('Arco Primordial'),
  ],
  // Cap. 19
  crossbow: [
    i('Besta Leve', 'light_crossbow'), i('Besta Pesada'),
    m('Besta Militar'), m('Besta de Cerco'), m('Besta Rúnica'),
    a('Besta Celestial'), a('Besta Primordial'),
  ],
  // Cap. 20. ⚠️ Varinhas (cap. 21) e Livros Arcanos (cap. 22) são categorias
  // PRÓPRIAS no documento, mas `WeaponType` só tem `staff` — os dois viriam de
  // uma decisão do dono sobre criar tipos novos, com proficiência e identidade
  // próprias. Ficam registrados abaixo, fora deste mapa.
  staff: [
    i('Cajado de Madeira'), i('Cajado do Aprendiz', 'apprentice_staff'),
    m('Cajado Arcano'), m('Cajado do Sábio'), m('Cajado Rúnico'), m('Cajado Ancestral'),
    a('Cajado Celestial'), a('Cajado Primordial'),
  ],
};

/**
 * ⚠️ **Categorias que o Doc 4 cria e o código ainda não tem.**
 *
 * Varinhas, Livros Arcanos e Escudos são capítulos próprios (21, 22 e 23), mas:
 *
 * - **Varinha** e **Livro** exigiriam `WeaponType` novos, com identidade e
 *   proficiência próprias (`DD-PROG-011` já prevê **Magic Level** como
 *   proficiência de conjuração). É decisão do dono, não inferência.
 * - **Escudo** não é `WeaponType` — ocupa o slot `shield`. Só o de Madeira existe.
 *
 * Os nomes ficam registrados para ninguém reinventá-los.
 */
export const PENDING_MODEL_CATEGORIES = {
  /** Cap. 21 — precisa de `WeaponType` próprio. */
  varinha: [
    'Varinha Simples', 'Varinha Arcana', 'Varinha de Cristal',
    'Varinha Rúnica', 'Varinha Celestial', 'Varinha Primordial',
  ],
  /** Cap. 22 — idem. O Druid usa Livros (cap. 38). */
  livro: [
    'Grimório do Aprendiz', 'Grimório Arcano', 'Livro dos Elementos',
    'Livro da Vida', 'Livro das Sombras', 'Livro Celestial', 'Livro Primordial',
  ],
  /** Cap. 23 — slot `shield`. Só "Escudo de Madeira" existe como item. */
  escudo: [
    'Escudo de Madeira', 'Escudo Redondo', 'Escudo Militar', 'Escudo de Torre',
    'Escudo do Guardião', 'Escudo Anão', 'Escudo Rúnico', 'Escudo Sagrado',
    'Escudo Celestial', 'Escudo Primordial',
  ],
} as const;

/** Modelos deste tipo de arma que já existem como item jogável. */
export function implementedModels(type: WeaponType): EquipModel[] {
  return WEAPON_MODELS[type].filter((mod) => mod.kind);
}

/** Quantos modelos o documento define, e quantos já são jogáveis. */
export function modelCoverage(): { total: number; implemented: number } {
  const todos = Object.values(WEAPON_MODELS).flat();
  return {
    total: todos.length,
    implemented: todos.filter((mod) => mod.kind).length,
  };
}
