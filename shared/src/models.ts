/**
 * Catálogo de MODELOS de equipamento (Doc 4, cap. 13–34, 42 e 43).
 *
 * A separação que o cap. 43 estabelece, e que este arquivo encarna:
 *
 * ```
 * FAMÍLIA  agrupa os modelos      (Espadas)
 * MODELO   define a IDENTIDADE    (Espada Longa)
 * RARIDADE define a QUALIDADE     (Comum … Relíquia)
 * ORIGEM   define como se OBTÉM   (NPC, loot, boss, crafting)
 * ```
 *
 * Uma "Espada Longa Comum" de NPC e uma "Espada Longa Lendária" forjada por
 * mestre são o **mesmo modelo**. É isso que dá variedade enorme sem exigir
 * milhares de modelos.
 *
 * 🔴 **A família é a unidade de ordenação, não o tipo de arma.** Cajados e
 * Varinhas são famílias distintas que compartilham o mesmo `WeaponType`
 * (`staff`), porque a decisão do dono em 2026-07-30 foi **não criar `WeaponType`
 * novo** para Varinha e Livro. Cada família vai sozinha do tier inicial ao
 * avançado; concatenar as duas num só array faria a escada de tiers descer no
 * meio, e é por isso que a validação de ordem roda por família.
 *
 * ⚠️ **O tier é INFERIDO da posição na lista do documento**, que é ordenada do
 * mais simples ao mais forte. Só o cap. 13 (Espadas) e o cap. 24 (Capacetes)
 * rotulam o tier explicitamente. Há teste garantindo que nenhuma família regrida
 * de faixa: se alguém embaralhar uma lista, a inferência se perde e o teste
 * avisa.
 *
 * Os atributos não moram aqui — vêm da curva em `equipcurve.ts`, e o gerador que
 * transforma modelo em item jogável está em `catalog.ts`.
 */

import type { ArmorClass, WeaponType } from './weapons.js';
import type { EquipSlot } from './items.js';

/**
 * Faixa de progressão do modelo. O cap. 13 usa "Tier Inicial / Intermediário" e
 * os nomes dos demais capítulos seguem a mesma escada (Rúnico e Anão no meio,
 * Celestial e Primordial no topo).
 */
export type ModelTier = 'inicial' | 'intermediario' | 'avancado';

export const TIER_RANK: Record<ModelTier, number> = {
  inicial: 0,
  intermediario: 1,
  avancado: 2,
};

export interface EquipModel {
  /** Nome canônico, exatamente como o documento escreve. */
  name: string;
  tier: ModelTier;
  /**
   * `kind` do item que JÁ existia em `ITEMS` escrito à mão.
   *
   * 🔴 Modelo com âncora **não é gerado** por `catalog.ts`. Os 13 itens antigos
   * têm `kind` em inglês (`short_sword`) e preço escolhido a dedo, e mexer neles
   * mudaria save de jogador e o balanceamento que o dono já aprovou jogando.
   */
  kind?: string;
  /** Sobrepõe a classe de armadura da família (o cap. 25 mistura as quatro). */
  armorClass?: ArmorClass;
  /** Artefato Único do cap. 40 — um só modelo, sem versões por raridade. */
  unique?: boolean;
}

export interface ModelFamily {
  id: string;
  /** Nome da família como o cap. 43 a chama. */
  name: string;
  /** Capítulo do Doc 4 que lista estes nomes. */
  chapter: number;
  slot: EquipSlot;
  /** Só famílias de arma. Define proficiência e identidade de combate. */
  weaponType?: WeaponType;
  /** Classe padrão da família, quando o modelo não diz outra. */
  armorClass?: ArmorClass;
  /** Cor-base do ícone desenhado por código no cliente. */
  color: number;
  models: EquipModel[];
}

const i = (name: string, kind?: string): EquipModel =>
  ({ name, tier: 'inicial', ...(kind ? { kind } : {}) });
const m = (name: string, kind?: string): EquipModel =>
  ({ name, tier: 'intermediario', ...(kind ? { kind } : {}) });
const a = (name: string, kind?: string): EquipModel =>
  ({ name, tier: 'avancado', ...(kind ? { kind } : {}) });

// ---------------------------------------------------------------------------
// As famílias
// ---------------------------------------------------------------------------

/** Armas de mão e à distância — cap. 13 a 21. */
const WEAPON_FAMILIES: ModelFamily[] = [
  {
    // O único capítulo com descrição qualitativa por modelo.
    id: 'espada', name: 'Espadas', chapter: 13,
    slot: 'weapon', weaponType: 'sword', color: 0xc9d0d8,
    models: [
      i('Espada Enferrujada'), i('Espada Curta', 'short_sword'), i('Gládio'),
      i('Espada do Miliciano'), i('Espada Longa'), i('Sabre'), i('Falcata'),
      m('Espada Bastarda'), m('Claymore'), m('Espada do Cavaleiro'),
      m('Espada do Guardião'), m('Espada Rúnica'), m('Katana'),
      m('Espada Élfica'), m('Espada Anã'),
    ],
  },
  {
    id: 'machado', name: 'Machados', chapter: 14,
    slot: 'weapon', weaponType: 'axe', color: 0x9a8878,
    models: [
      // A "Machadinha" antiga era um machado de mão simples — o Lenhador é o
      // equivalente canônico, não o de Ferro (que é o degrau acima).
      //
      // ⚠️ Este nome aparece DUAS vezes no Doc 4: aqui, como modelo de arma, e no
      // cap. 35, como ferramenta de profissão. É colisão do documento. Fica sendo
      // a arma, que já existe no jogo; a ferramenta não é criada.
      i('Machado de Lenhador', 'hand_axe'), i('Machado de Ferro'), i('Machado Militar'),
      m('Machado Bárbaro'), m('Machado de Guerra'), m('Machado Duplo'),
      m('Machado do Executor'), m('Machado Rúnico'), m('Machado Anão'),
      m('Machado Glacial'), m('Machado Vulcânico'),
      a('Machado Titânico'), a('Machado do Colosso'), a('Machado Celestial'),
      a('Machado da Ruína'), a('Machado Primordial'),
    ],
  },
  {
    id: 'maca', name: 'Maças', chapter: 15,
    slot: 'weapon', weaponType: 'mace', color: 0x8a6a3a,
    models: [
      i('Clava', 'club'), i('Maça de Ferro'), i('Maça Militar'),
      m('Mangual'), m('Maça Pesada'), m('Maça Sagrada'), m('Maça do Guardião'),
      m('Maça Rúnica'), m('Maça Anã'), m('Maça do Julgamento'),
      a('Maça Celestial'), a('Maça Primordial'),
    ],
  },
  {
    id: 'lanca', name: 'Lanças', chapter: 16,
    slot: 'weapon', weaponType: 'spear', color: 0xa08858,
    models: [
      i('Lança de Madeira'), i('Lança Curta', 'spear'), i('Lança Militar'),
      m('Pique'), m('Alabarda'), m('Lança do Cavaleiro'), m('Lança Élfica'),
      m('Lança Rúnica'), m('Lança Dracônica'),
      a('Lança Celestial'), a('Lança Primordial'),
    ],
  },
  {
    id: 'adaga', name: 'Adagas', chapter: 17,
    slot: 'weapon', weaponType: 'dagger', color: 0xb8c2cc,
    models: [
      i('Faca'), i('Punhal'), i('Adaga Curta', 'dagger'), i('Adaga de Aço'),
      m('Adaga Curva'), m('Adaga Sombria'), m('Adaga Élfica'),
      m('Adaga Envenenada'), m('Adaga Fantasma'),
      a('Adaga Celestial'), a('Adaga Primordial'),
    ],
  },
  {
    id: 'arco', name: 'Arcos', chapter: 18,
    slot: 'weapon', weaponType: 'bow', color: 0x9a7a4a,
    models: [
      i('Arco Curto', 'short_bow'), i('Arco Longo'), i('Arco Recurvo'),
      m('Arco Composto'), m('Arco Élfico'), m('Arco de Guerra'),
      m('Arco Rúnico'), m('Arco Dracônico'),
      a('Arco Celestial'), a('Arco Primordial'),
    ],
  },
  {
    id: 'besta', name: 'Bestas', chapter: 19,
    slot: 'weapon', weaponType: 'crossbow', color: 0x7a6a5a,
    models: [
      i('Besta Leve', 'light_crossbow'), i('Besta Pesada'),
      m('Besta Militar'), m('Besta de Cerco'), m('Besta Rúnica'),
      a('Besta Celestial'), a('Besta Primordial'),
    ],
  },
  {
    id: 'cajado', name: 'Cajados', chapter: 20,
    slot: 'weapon', weaponType: 'staff', color: 0x6a5aa0,
    models: [
      i('Cajado de Madeira'), i('Cajado do Aprendiz', 'apprentice_staff'),
      m('Cajado Arcano'), m('Cajado do Sábio'), m('Cajado Rúnico'), m('Cajado Ancestral'),
      a('Cajado Celestial'), a('Cajado Primordial'),
    ],
  },
  {
    /**
     * 🔴 **Decisão do dono (2026-07-30): Varinha NÃO vira `WeaponType` novo.**
     *
     * O cap. 21 é lista de nome pura — nenhuma mecânica, nenhum número, nenhuma
     * proficiência. Criar um tipo de arma só para ela significaria inventar
     * identidade de combate (velocidade, alcance, uma ou duas mãos) que o
     * documento não pede, e uma proficiência paralela ao Magic Level que o
     * `DD-PROG-011` já prevê para conjuração.
     *
     * Então a Varinha é família própria dentro de `staff`: mesma proficiência
     * mágica, mesmo alcance, e o que a distingue do Cajado é a escada de níveis
     * (6 modelos contra 8) — que é exatamente o que o cap. 43 diz que um modelo
     * deve distinguir.
     */
    id: 'varinha', name: 'Varinhas', chapter: 21,
    slot: 'weapon', weaponType: 'staff', color: 0x8a6ac0,
    models: [
      i('Varinha Simples'), i('Varinha Arcana'),
      m('Varinha de Cristal'), m('Varinha Rúnica'),
      a('Varinha Celestial'), a('Varinha Primordial'),
    ],
  },
];

/** Mão secundária: escudos do cap. 23 e os Livros Arcanos do cap. 22. */
const OFFHAND_FAMILIES: ModelFamily[] = [
  {
    /**
     * ⚠️ Escudo **não tem classe de armadura**, e a ausência é deliberada: o cap.
     * 38 divide Leve/Média/Pesada/Veste apenas para as peças de proteção do
     * corpo, e não põe escudo em nenhuma delas. Sem classe, `armorDefFor` usa o
     * multiplicador neutro — que é o que mantém o Escudo de Madeira em `def: 4`.
     */
    id: 'escudo', name: 'Escudos', chapter: 23,
    slot: 'shield', color: 0x8a5a2f,
    models: [
      i('Escudo de Madeira', 'wooden_shield'), i('Escudo Redondo'), i('Escudo Militar'),
      m('Escudo de Torre'), m('Escudo do Guardião'), m('Escudo Anão'),
      m('Escudo Rúnico'), m('Escudo Sagrado'),
      a('Escudo Celestial'), a('Escudo Primordial'),
    ],
  },
  {
    /**
     * 🔴 **Decisão do dono (2026-07-30): o Livro Arcano é FOCO DE MÃO
     * SECUNDÁRIA, no slot do escudo.** Não vira `WeaponType`.
     *
     * O que isso resolve: o cap. 38 lista "Livros" entre as prioridades do
     * Sorcerer **ao lado** de Cajados, e o Druid usa Livros. Se o Livro ocupasse
     * o slot de arma, seria Cajado **ou** Livro — a leitura natural do capítulo é
     * os dois juntos. No slot `shield`, a build mágica fica completa (Cajado na
     * mão principal, Livro na secundária) e o Escudo de Torre continua sendo
     * coisa de Knight.
     *
     * ⚠️ **A identidade dele está fina, e é honesto dizer.** O slot só soma
     * `def`, e `ItemDef` não tem campo de mana ou poder mágico fixo — então hoje
     * um Livro é um escudo ruim (classe Veste, 0,75 de multiplicador) cuja
     * vantagem real vem do passivo `mana_bonus` rolado, que é aleatório. Dar
     * bônus mágico de equipamento é decisão do dono e mexeria em `equipBonus`.
     */
    id: 'livro', name: 'Livros Arcanos', chapter: 22,
    slot: 'shield', armorClass: 'robe', color: 0x4a5a9a,
    models: [
      i('Grimório do Aprendiz'), i('Grimório Arcano'),
      m('Livro dos Elementos'), m('Livro da Vida'), m('Livro das Sombras'),
      a('Livro Celestial'), a('Livro Primordial'),
    ],
  },
];

/** Todas as famílias do catálogo, na ordem dos capítulos. */
export const MODEL_FAMILIES: ModelFamily[] = [
  ...WEAPON_FAMILIES,
  ...OFFHAND_FAMILIES,
];

// ---------------------------------------------------------------------------
// Índices derivados
// ---------------------------------------------------------------------------

/**
 * Modelos de arma agrupados por tipo, para quem só quer saber "que espadas
 * existem".
 *
 * ⚠️ **Não use isto para validar ordem de tier** — `staff` junta duas famílias
 * (Cajados e Varinhas) e a escada de tiers reinicia no meio. Quem valida ordem
 * itera `MODEL_FAMILIES`.
 */
export const WEAPON_MODELS: Record<WeaponType, EquipModel[]> = (() => {
  const out = {} as Record<WeaponType, EquipModel[]>;
  for (const fam of MODEL_FAMILIES) {
    if (!fam.weaponType) continue;
    (out[fam.weaponType] ??= []).push(...fam.models);
  }
  return out;
})();

/**
 * ⚠️ **Categorias que o Doc 4 cria e o código ainda NÃO tem.**
 *
 * Os nomes ficam registrados para ninguém reinventá-los quando a decisão for
 * tomada. Varinha, Livro e Escudo saíram desta lista em 2026-07-30 — as três
 * viraram famílias de verdade acima.
 */
export const PENDING_MODEL_CATEGORIES = {
  /**
   * Cap. 28–29 e 32–34. Os cinco exigem **`EquipSlot` novo**, e slot novo não é
   * só um campo: é mexer no paperdoll da interface. Decisão do dono.
   */
  luvas: [
    'Luvas de Couro', 'Luvas Reforçadas', 'Manoplas de Ferro', 'Manoplas de Aço',
    'Luvas Élficas', 'Luvas Arcanas', 'Manoplas do Guardião',
    'Luvas Celestiais', 'Luvas Primordiais',
  ],
  capas: [
    'Capa Simples', 'Capa do Viajante', 'Capa do Patrulheiro', 'Capa Élfica',
    'Capa Sombria', 'Capa Arcana', 'Capa Celestial', 'Manto Primordial',
  ],
  braceletes: [
    'Bracelete de Couro', 'Bracelete de Ferro', 'Bracelete Militar',
    'Bracelete Arcano', 'Bracelete Élfico', 'Bracelete Anão',
    'Bracelete Celestial', 'Bracelete Primordial',
  ],
  cintos: [
    'Cinto Simples', 'Cinto Reforçado', 'Cinto Militar', 'Cinto do Caçador',
    'Cinto Arcano', 'Cinto do Guardião', 'Cinto Celestial', 'Cinto Primordial',
  ],
  broches: [
    'Broche da Coragem', 'Broche da Sabedoria', 'Broche da Honra',
    'Broche da Precisão', 'Broche da Fúria', 'Broche da Proteção',
    'Broche Celestial', 'Broche Primordial',
  ],
  /**
   * 🔴 Cap. 35–37 dependem de sistemas que **não existem**: coleta e mineração
   * (ferramentas), exploração (instrumentos) e guildas (Etapa 20). Mesmo
   * bloqueio das Ervas e Minérios em `materials.ts` — `DD-MAT-001` proíbe item
   * que "existe apenas para ocupar espaço", e ferramenta sem o que coletar é
   * exatamente isso.
   *
   * O "Machado de Lenhador" do cap. 35 fica de fora: o nome já é a arma do cap.
   * 14, que existe no jogo.
   */
  ferramentas: [
    'Martelo de Ferreiro', 'Picareta', 'Foice', 'Martelo de Joalheiro', 'Cinzel',
    'Kit de Costura', 'Fornalha Portátil', 'Bolsa de Ferramentas',
  ],
  instrumentos: [
    'Bússola', 'Luneta', 'Lanterna', 'Corda', 'Gancho', 'Pá', 'Martelo',
    'Rede de Pesca', 'Cantil', 'Saco de Minério', 'Bolsa de Ervas',
    'Mapa Cartográfico',
  ],
  guilda: [
    'Bandeira da Guilda', 'Estandarte', 'Baú de Guerra', 'Livro de Registros',
    'Selo da Guilda', 'Troféu de Guerra', 'Brasão', 'Relicário da Guilda',
  ],
} as const;

/** Modelos deste tipo de arma que já existem como item escrito à mão. */
export function implementedModels(type: WeaponType): EquipModel[] {
  return (WEAPON_MODELS[type] ?? []).filter((mod) => mod.kind);
}

/** Quantos modelos o documento define, e quantos têm item escrito à mão. */
export function modelCoverage(): { total: number; implemented: number } {
  const todos = MODEL_FAMILIES.flatMap((f) => f.models);
  return {
    total: todos.length,
    implemented: todos.filter((mod) => mod.kind).length,
  };
}

/** Família de um modelo, pelo nome canônico. */
export function familyOf(modelName: string): ModelFamily | undefined {
  return MODEL_FAMILIES.find((f) => f.models.some((mod) => mod.name === modelName));
}
