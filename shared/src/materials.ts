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
 * ✅ **Penas entraram em 2026-08-29**, pelo mesmo critério: o Ganso e o Filhote
 * de Ganso passaram a nascer no mundo, então a família deixou de ser matéria sem
 * origem. Era a única exceção anotada aqui — o que continua de fora são as
 * famílias que dependem de conteúdo que não existe.
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

  // === Fauna de pasto (`DD-DROP-006`, família `fauna` e `ave`) =============
  // Os dois materiais mais BAIXOS da cadeia, de propósito: são o que o
  // iniciante consegue no pasto ao lado da vila, antes de haver lobo ou aranha.
  animal_hide: mat(
    'animal_hide', 'couro', 'animal', 'common', 'costura',
    'leve', 'baixo',
    'Couro fino de bicho de pasto. Não segura golpe, mas todo aprendiz de '
    + 'costureiro estraga uns vinte antes de acertar a primeira bota.',
  ),
  feather: mat(
    'feather', 'pena', 'animal', 'common', 'costura',
    'muito-leve', 'baixo',
    'Pena de ganso, dessas que ficam presas no barro da margem. Enche '
    + 'travesseiro, empena flecha e, se for das grandes, vira pena de escrever.',
  ),

  // === Golens (chefe) =======================================================
  stone_core: mat(
    'stone_core', 'fragmento', 'elemental', 'rare', 'encantamento',
    'pesado', 'alto',
    'O caroço que fazia a pedra andar. Ainda morno, e some devagar — quem '
    + 'guarda um diz que ele fica leve quando o dono original é vingado.',
    // ⚠️ `physical`, e não "terra": os tipos de dano são SETE
    // (`DD-ELM-002`) e terra não é um deles. O vocabulário é único de
    // propósito — inventar um oitavo aqui abriria a porta para dois sistemas
    // de elemento discordando, e há teste impedindo.
    { affinity: 'physical' },
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
  // === Os cinco packs de monstro de 01/09 (DD-DROP-006) ===================
  //
  // 🔴 **Cada família ganha UM material próprio e reusa UM que já existia.**
  // Não é economia de digitação: material novo demais dilui a rota de farm que
  // o `DD-DROP-002` pede. O reuso amarra o bicho novo a uma cadeia que já tem
  // consumidor — o Ent larga a mesma `oak_log` da árvore, então quem precisa de
  // madeira tem duas fontes em vez de duas listas separadas.

  // === Segunda leva de packs, 01/09 =======================================
  // Mesma regra da primeira: cada família ganha UM material próprio e reusa UM
  // que já existia. Nenhum entra em família de COLETA (`erva`, `flor`,
  // `cogumelo`, `minerio`, `madeira`, `gema`, `cristal`), que exigiria um nó.

  demon_horn: mat(
    'demon_horn', 'chifre', 'corrompido', 'rare', 'encantamento',
    'medio', 'alto',
    'Chifre de demônio, quente ao toque mesmo frio há dias. Encantador que '
    + 'trabalha com fogo paga bem e não faz perguntas sobre a procedência.',
    { affinity: 'fire' },
  ),

  ectoplasm: mat(
    'ectoplasm', 'essencia', 'espiritual', 'common', 'alquimia',
    'muito-leve', 'baixo',
    'Resto frio do que um fantasma era. Escorre entre os dedos e não molha — '
    + 'alquimista guarda em vidro, nunca em pano.',
  ),

  beholder_eye: mat(
    'beholder_eye', 'essencia', 'monstruoso', 'uncommon', 'encantamento',
    'leve', 'medio',
    'O olho, ainda inteiro, ainda seguindo quem passa. Ninguém que carrega um '
    + 'consegue dormir com ele na mochila aberta.',
  ),

  gnoll_pelt: mat(
    'gnoll_pelt', 'couro', 'humanoide', 'common', 'costura',
    'medio', 'baixo',
    'Pelame áspero de gnoll, malhado como hiena. Aquece bem e cheira mal — '
    + 'curtidor bom tira o cheiro, curtidor ruim vende assim mesmo.',
  ),

  rat_fang: mat(
    'rat_fang', 'presa', 'animal', 'common', 'alquimia',
    'muito-leve', 'muito-baixo',
    'Dente amarelo de rato de esgoto. Vale pouco e cheira pior, mas é o '
    + 'reagente que todo alquimista aprendiz gasta antes de encostar em veneno '
    + 'de verdade.',
  ),

  /*
   * ⚠️ Família `essencia`, e NÃO `cogumelo`, apesar de sair de um cogumelo.
   *
   * 🔴 As sete famílias de COLETA (`erva`, `flor`, `cogumelo`, `minerio`,
   * `madeira`, `gema`, `cristal`) têm um teste exigindo que cada material
   * delas tenha um NÓ que o produza — `DD-MAT-001` proíbe material que só ocupa
   * espaço. Isto aqui cai de monstro, não do chão, então entrar como
   * `cogumelo` obrigaria a inventar um nó de coleta que ninguém pediu.
   */
  spore_sac: mat(
    'spore_sac', 'essencia', 'vegetal', 'common', 'alquimia',
    'leve', 'baixo',
    'Bolsa de esporos, ainda inchada. Estoura ao menor aperto — carregue no '
    + 'fundo da mochila, nunca junto de nada que você pretenda comer.',
    { affinity: 'poison' },
  ),

  lizard_scale: mat(
    'lizard_scale', 'escama', 'monstruoso', 'common', 'ferraria',
    'medio', 'baixo',
    'Escama larga de homem-lagarto, com a beirada esverdeada. Costurada em '
    + 'fileira vira peitoral leve que não range ao andar.',
  ),

  vampire_fang: mat(
    'vampire_fang', 'presa', 'corrompido', 'rare', 'encantamento',
    'muito-leve', 'alto',
    'Presa que continua fria depois de arrancada. Encantadores brigam por ela '
    + 'e nenhum explica direito o porquê.',
    { affinity: 'dark' },
  ),

  // ⚠️ `fragmento` e não `madeira`, pela mesma regra do `spore_sac` acima:
  // `madeira` é família de coleta e exigiria um nó. A tora que o Ent larga é a
  // `oak_log`, que já TEM nó — a casca é o pedaço que sobra dele.
  living_bark: mat(
    'living_bark', 'fragmento', 'vegetal', 'uncommon', 'carpintaria',
    'pesado', 'medio',
    'Casca de ent, arrancada ainda viva. Fecha sozinha se você deixar num '
    + 'canto úmido, e é por isso que carpinteiro bom a trabalha no mesmo dia.',
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
