/**
 * Material Bible — a taxonomia da matéria-prima (Doc 4, cap. 44).
 *
 * `DD-MAT-001`: *"Todo material pertence a uma família. Todo material possui uma
 * função. Nenhum material deve existir apenas para ocupar espaço."*
 *
 * 🔴 **Duas tabelas, um `kind`.** `ITEMS` (em `items.ts`) diz o que a coisa é
 * como OBJETO de inventário — nome, preço, empilha. `MATERIALS` aqui diz o que
 * ela é como MATÉRIA-PRIMA — família, origem, para que profissão serve. As duas
 * são indexadas pelo mesmo `kind`, e há teste garantindo que não se separem.
 *
 * É o mesmo desenho de `WEAPON_IDENTITY`: o catálogo de itens não precisa saber
 * de crafting, e o de crafting não precisa saber de preço de balcão.
 */

import type { DamageType } from './elements.js';
import type { Rarity } from './weapons.js';

/** As 19 famílias oficiais do `44.1`. */
export type MaterialFamily =
  | 'minerio' | 'madeira' | 'couro' | 'tecido' | 'erva' | 'flor' | 'cogumelo'
  | 'cristal' | 'gema' | 'osso' | 'escama' | 'chifre' | 'garra' | 'presa'
  | 'pena' | 'sangue' | 'essencia' | 'fragmento' | 'reliquia';

/** As 11 origens do `44.2`. */
export type MaterialOrigin =
  | 'mineral' | 'vegetal' | 'animal' | 'monstruoso' | 'humanoide'
  | 'elemental' | 'espiritual' | 'celestial' | 'corrompido' | 'aether'
  | 'artificial';

/** Os 12 usos predominantes do `44.4`. O doc pede UM principal por material. */
export type MaterialUse =
  | 'ferraria' | 'carpintaria' | 'alquimia' | 'costura' | 'joalheria'
  | 'encantamento' | 'construcao' | 'culinaria' | 'profissoes' | 'quest'
  | 'evento' | 'colecao';

/**
 * Qualidade do `44.5`. **Independente da raridade** — o doc é explícito: "afeta
 * apenas a eficiência em processos de produção e não altera sua raridade".
 *
 * ⚠️ Declarada e ainda **não aplicada**: entra quando a fabricação existir de
 * verdade, porque é lá que "eficiência de produção" significa algo.
 */
export type MaterialQuality =
  | 'impuro' | 'comum' | 'refinado' | 'superior' | 'excepcional' | 'perfeito';

/**
 * Estado de processamento do `44.6`.
 * ⚠️ Declarado e não aplicado: depende de profissões com ação, que não existem.
 */
export type MaterialState =
  | 'natural' | 'bruto' | 'refinado' | 'processado'
  | 'encantado' | 'corrompido' | 'purificado';

/** Faixas de peso do `44.8`. Sem efeito ainda — não há capacidade de carga. */
export type MaterialWeight =
  | 'muito-leve' | 'leve' | 'medio' | 'pesado' | 'muito-pesado';

/** Faixas de valor do `44.9`. O preço real vive em `ITEMS.buyPrice`/`sellPrice`. */
export type MaterialValue =
  | 'muito-baixo' | 'baixo' | 'medio' | 'alto' | 'muito-alto' | 'inestimavel';

/** Estado comercial do `44.12`. Controla economia, independente da raridade. */
export type MaterialTrade =
  | 'negociavel' | 'ligado-personagem' | 'ligado-conta' | 'quest' | 'nao-negociavel';

/**
 * 🔴 **DECISÃO DO DONO (2026-07-30): afinidade usa os SETE tipos de dano.**
 *
 * O `44.11` lista **onze** afinidades — Fogo, Água, Terra, Vento, Raio, Gelo,
 * Natureza, Luz, Trevas, Aether, Corrupção — mas `DD-ELM-002` fecha os tipos em
 * sete, e cinco daquelas onze não existem lá. Era a **terceira** vez que o
 * conflito aparecia (antes: `Slime Azul → Água` no Doc 3, e os prefixos
 * `Terreno`/`Marinho` no cap. 46).
 *
 * O dono escolheu **vocabulário único**: as onze colapsam nos sete.
 *
 * | Palavra do doc | Vira |
 * |---|---|
 * | Fogo | `fire` |
 * | Água · Gelo | `ice` |
 * | Terra | `physical` |
 * | Vento · Raio | `electric` |
 * | Natureza | `poison` |
 * | Luz · Aether | `holy` |
 * | Trevas · Corrupção | `dark` |
 *
 * ⚠️ **O que se perde:** Água e Gelo passam a ser indistinguíveis, e o mesmo vale
 * para Vento/Raio e Trevas/Corrupção. Se algum dia a diferença temática importar
 * (uma receita que aceita Água mas não Gelo), volta a fazer falta.
 *
 * ⚠️ **Aether → `holy` é o mapeamento mais frágil.** Aether é a energia mágica do
 * mundo na lore; Sagrado é "energia vital". São próximos, não iguais. Se o Aether
 * ganhar peso mecânico próprio, este é o primeiro lugar a rever.
 */
export type MaterialAffinity = DamageType;

/**
 * O cadastro do `44.13`.
 *
 * O doc lista ~25 campos. Tornar todos obrigatórios faria cada declaração de
 * material ocupar vinte linhas, e a maioria dos campos não tem efeito mecânico
 * ainda. Então: **núcleo obrigatório** (o que o jogo usa hoje) e o resto opcional,
 * pronto para preencher quando o sistema correspondente existir.
 */
export interface MaterialDef {
  /** Mesmo `kind` da entrada em `ITEMS`. */
  kind: string;
  family: MaterialFamily;
  origin: MaterialOrigin;
  rarity: Rarity;
  /** Uso PREDOMINANTE. O doc admite secundários, mas pede um principal. */
  use: MaterialUse;
  weight: MaterialWeight;
  value: MaterialValue;
  /** Quantos cabem num slot da mochila. */
  stackMax: number;
  /** Contexto no mundo (`44.13` pede uma linha de lore por material). */
  lore: string;

  // --- Opcionais: declarados, sem efeito mecânico ainda ---
  subfamily?: string;
  affinity?: MaterialAffinity;
  quality?: MaterialQuality;
  state?: MaterialState;
  trade?: MaterialTrade;
}

/** Empilhamento padrão de material comum de monstro. */
const PILHA = 500;

function mat(
  kind: string,
  family: MaterialFamily,
  origin: MaterialOrigin,
  rarity: Rarity,
  use: MaterialUse,
  weight: MaterialWeight,
  value: MaterialValue,
  lore: string,
  extra: Partial<MaterialDef> = {},
): MaterialDef {
  return {
    kind, family, origin, rarity, use, weight, value,
    stackMax: PILHA, lore,
    trade: 'negociavel',
    state: 'natural',
    ...extra,
  };
}

/**
 * O banco de materiais.
 *
 * 🔴 **Só material que TEM COMO SER OBTIDO entra aqui** — `DD-MAT-001` proíbe
 * material que "existe apenas para ocupar espaço", e item sem forma de conseguir
 * é exatamente isso.
 *
 * ✅ **As famílias de coleta entraram em 2026-07-30**, quando `gathering.ts`
 * passou a existir. Antes, Minérios, Madeiras, Ervas, Flores, Cogumelos e
 * Cristais estavam proibidos por esta regra — e a consequência era dura: **o
 * Ferreiro não tinha minério e o Alquimista não tinha erva.**
 *
 * ⚠️ O que **continua** de fora: Penas (não há criatura voadora) e as famílias
 * que dependem de conteúdo inexistente. A regra não mudou; só deixou de bloquear
 * o que agora tem origem.
 */
export const MATERIALS: Record<string, MaterialDef> = {
  // === Coleta e mineração (`44.1`) ==========================================
  // Cada um destes tem um nó em `gathering.ts` que o produz. Se algum ficar sem
  // nó, o teste de origem acusa — é a trava que substitui o bloqueio antigo.
  iron_ore: mat(
    'iron_ore', 'minerio', 'mineral', 'common', 'ferraria',
    'pesado', 'baixo',
    'Bruto, ainda com a pedra grudada. O ferreiro cobra a mais para limpar.',
  ),
  raw_gem: mat(
    'raw_gem', 'gema', 'mineral', 'rare', 'joalheria',
    'muito-leve', 'alto',
    'Sai da rocha parecendo cascalho. Só o lapidador sabe o que tem dentro.',
  ),
  oak_log: mat(
    'oak_log', 'madeira', 'vegetal', 'common', 'carpintaria',
    'pesado', 'baixo',
    'Tora de carvalho. Cabo de machado, coronha de besta e lenha de forja saem daqui.',
  ),
  common_herb: mat(
    'common_herb', 'erva', 'vegetal', 'common', 'alquimia',
    'muito-leve', 'muito-baixo',
    'Cresce em qualquer canteiro pisado. É a base de metade dos frascos do Alquimista.',
  ),
  moon_flower: mat(
    'moon_flower', 'flor', 'vegetal', 'uncommon', 'alquimia',
    'muito-leve', 'medio',
    'Só abre à noite, e murcha na mão de quem colhe de dia.',
    { affinity: 'ice' },
  ),
  cave_mushroom: mat(
    'cave_mushroom', 'cogumelo', 'vegetal', 'common', 'alquimia',
    'muito-leve', 'muito-baixo',
    'Brota onde não bate sol. Comestível — o que não é o mesmo que saboroso.',
  ),
  mana_crystal: mat(
    'mana_crystal', 'cristal', 'mineral', 'rare', 'encantamento',
    'leve', 'alto',
    'Zumbe baixinho quando há magia por perto. Encantadores o usam como diapasão.',
    { affinity: 'holy' },
  ),

  // === Já existiam no jogo, agora classificados =============================
  slime_gel: mat(
    'slime_gel', 'essencia', 'monstruoso', 'common', 'alquimia',
    'leve', 'muito-baixo',
    'Massa translúcida que continua se mexendo sozinha por horas depois da morte do Slime.',
    { affinity: 'poison', subfamily: 'gosma' },
  ),
  snake_skin: mat(
    'snake_skin', 'couro', 'animal', 'common', 'costura',
    'leve', 'baixo',
    'Pele descartada em muda. O curtidor a prefere justamente por não vir de um corte.',
  ),

  // === Aranhas (`DD-DROP-006` cita: teias, veneno, olhos) ===================
  spider_web: mat(
    'spider_web', 'tecido', 'monstruoso', 'common', 'costura',
    'muito-leve', 'baixo',
    'Fio mais resistente que o linho e impossível de tingir. Costureiros brigam por ele.',
  ),
  spider_venom: mat(
    'spider_venom', 'sangue', 'monstruoso', 'uncommon', 'alquimia',
    'muito-leve', 'medio',
    'Recolhido das presas com pinça e paciência. Vale mais do que o braço que se arrisca.',
    { affinity: 'poison' },
  ),
  spider_eye: mat(
    'spider_eye', 'essencia', 'monstruoso', 'uncommon', 'encantamento',
    'muito-leve', 'medio',
    'Oito por aranha, e cada um enxerga uma coisa diferente. Encantadores usam o quarto.',
  ),

  // === Formigas =============================================================
  chitin: mat(
    'chitin', 'escama', 'monstruoso', 'common', 'ferraria',
    'leve', 'baixo',
    'Placa leve e absurdamente rígida. Armadura de couraça de formiga não enferruja.',
  ),
  acid_gland: mat(
    'acid_gland', 'sangue', 'monstruoso', 'uncommon', 'alquimia',
    'muito-leve', 'medio',
    'A bolsa que a Cuspidora usa para atacar. Fura o vidro se guardada do jeito errado.',
    { affinity: 'poison' },
  ),

  // === Goblins (humanoides: material pobre, mas útil) =======================
  goblin_rag: mat(
    'goblin_rag', 'tecido', 'humanoide', 'common', 'costura',
    'muito-leve', 'muito-baixo',
    'Retalho remendado dezenas de vezes. Goblin não desperdiça pano — nem o roubado.',
  ),
  goblin_tooth: mat(
    'goblin_tooth', 'presa', 'humanoide', 'common', 'joalheria',
    'muito-leve', 'baixo',
    'Amarelado e afiado. Vira colar entre os próprios goblins e amuleto entre humanos.',
  ),

  // === Lobos (o exemplo literal do doc: couros, presas, pelos) =============
  wolf_hide: mat(
    'wolf_hide', 'couro', 'animal', 'common', 'costura',
    'medio', 'baixo',
    'Couro de inverno, grosso na nuca. O melhor para forro de bota de patrulha.',
  ),
  wolf_fang: mat(
    'wolf_fang', 'presa', 'animal', 'uncommon', 'joalheria',
    'muito-leve', 'medio',
    'Quem caça em alcateia perde presas com frequência. As inteiras é que valem.',
  ),
  wolf_fur: mat(
    'wolf_fur', 'couro', 'animal', 'common', 'costura',
    'leve', 'baixo',
    'Pelo longo do dorso. Cardado, aquece mais que lã e pesa metade.',
    { subfamily: 'pelo' },
  ),

  // === Orcs =================================================================
  thick_hide: mat(
    'thick_hide', 'couro', 'humanoide', 'uncommon', 'costura',
    'pesado', 'medio',
    'Pele de orc curtida. Difícil de furar, difícil de costurar — o curtidor cobra o dobro.',
  ),
  broken_tusk: mat(
    'broken_tusk', 'presa', 'humanoide', 'common', 'ferraria',
    'medio', 'baixo',
    'Orc guerreiro exibe as presas lascadas como currículo. Serve de cabo de machado.',
  ),

  // === Mortos-vivos (o doc cita: ossos, cinzas, fragmentos espirituais) =====
  bone: mat(
    'bone', 'osso', 'espiritual', 'common', 'ferraria',
    'medio', 'baixo',
    'Osso que se recusou a virar pó. Ainda frio ao toque semanas depois.',
  ),
  ashes: mat(
    'ashes', 'essencia', 'espiritual', 'uncommon', 'alquimia',
    'muito-leve', 'medio',
    'O que sobra quando Sagrado alcança um morto-vivo. Guardar em pote lacrado.',
    { affinity: 'holy' },
  ),
  spirit_fragment: mat(
    'spirit_fragment', 'essencia', 'espiritual', 'rare', 'encantamento',
    'muito-leve', 'alto',
    'Lasca de uma alma que não conseguiu voltar ao Heart. Zumbe baixinho na mochila.',
    { affinity: 'dark', trade: 'negociavel' },
  ),

  // === Minotauros ===========================================================
  horn: mat(
    'horn', 'chifre', 'monstruoso', 'rare', 'ferraria',
    'pesado', 'alto',
    'Chifre de minotauro, marcado por cada investida que ele sobreviveu.',
  ),
  heavy_hide: mat(
    'heavy_hide', 'couro', 'monstruoso', 'rare', 'costura',
    'muito-pesado', 'alto',
    'Um único couro veste um homem inteiro. Carregá-lo já é trabalho.',
  ),

  // === Ursos ================================================================
  bear_pelt: mat(
    'bear_pelt', 'couro', 'animal', 'uncommon', 'costura',
    'pesado', 'medio',
    'Pelego inteiro de urso pardo. Vira capa, tapete ou prova de que você venceu.',
  ),
  bear_claw: mat(
    'bear_claw', 'garra', 'animal', 'uncommon', 'joalheria',
    'leve', 'medio',
    'Cinco por pata, curvas como foice. Caçador que usa colar delas raramente mente.',
  ),

  // === Kobolds ==============================================================
  small_scale: mat(
    'small_scale', 'escama', 'monstruoso', 'common', 'ferraria',
    'muito-leve', 'baixo',
    'Escama do tamanho de uma moeda. Sozinha não serve; às centenas, vira malha.',
  ),
  fine_claw: mat(
    'fine_claw', 'garra', 'monstruoso', 'uncommon', 'ferraria',
    'muito-leve', 'medio',
    'Fina e reta, boa para gatilho de armadilha. Os kobolds usam para o mesmo fim.',
  ),

  // === Trolls ===============================================================
  troll_skin: mat(
    'troll_skin', 'couro', 'monstruoso', 'rare', 'alquimia',
    'muito-pesado', 'alto',
    'Continua tentando se fechar depois de cortada. Alquimistas estudam o porquê.',
  ),
  troll_blood: mat(
    'troll_blood', 'sangue', 'monstruoso', 'rare', 'alquimia',
    'medio', 'muito-alto',
    'Espesso e morno por horas. Base de todo tônico de regeneração que presta.',
  ),
};

/** Todo material tem entrada aqui? (usado por teste e por ferramentas) */
export function getMaterial(kind: string): MaterialDef | undefined {
  return MATERIALS[kind];
}

/** Materiais de uma família — a consulta que a profissão vai fazer (`DD-DROP-013`). */
export function materialsOfFamily(family: MaterialFamily): MaterialDef[] {
  return Object.values(MATERIALS).filter((m) => m.family === family);
}

/** Materiais cujo uso predominante é esta profissão. */
export function materialsForUse(use: MaterialUse): MaterialDef[] {
  return Object.values(MATERIALS).filter((m) => m.use === use);
}
