/**
 * O MUNDO DE ELYSIA — regiões, cidades e dungeons.
 *
 * Esta é a tradução para código do mapa oficial entregue pelo dono em
 * 2026-08-02 (`map/mapa-oficial/`): o PNG ilustrado, a lista de regiões em
 * `message.txt` e as duas pranchas de cidade.
 *
 * 🔴 **É DADO AUTORAL, não geração procedural.** O terreno de 300×300 é gerado a
 * partir daqui (ver `worldgen.ts`), mas *o que existe e onde* vem desta tabela —
 * nomes, biomas, faixas de nível e posições. Gerar as regiões por ruído
 * produziria um mundo plausível e **errado**: o mapa do dono tem intenção
 * (a capital no centro, o deserto a sudeste, o gelo ao norte), e intenção não
 * sai de PRNG.
 *
 * ## 🔴 As duas fontes DIVERGIAM, e o dono decidiu
 *
 * | Assunto | `message.txt` | PNG | Decisão |
 * |---|---|---|---|
 * | Capital | "Valdor" | **ARCADIA** | **Arcadia** — Valdor é o REINO |
 * | Planícies centrais | "Centrais" | **de Verídia** | Verídia |
 * | Olyn | "Costa" | **Península** | Península |
 * | Terras de Fogo | "Draikor" | **Drakor** | Drakor |
 * | Dungeons | outra lista de 6 | **6 do PNG** | as do PNG |
 *
 * ⚠️ O `GDD-doc1-destilado.md` chamava a cidade principal de **Asteria**. Esse
 * nome foi **descartado** pelo dono junto com esta decisão. Se aparecer em
 * algum doc antigo, é resíduo.
 *
 * ## 🔴 A névoa de guerra foi REVOGADA
 *
 * `DD-MAP-001/002` (o mundo não começa revelado) e `DD-MAP-009` (a exploração
 * pertence à conta) **não valem mais** — decisão do dono em 02/08: o mundo é
 * **inteiramente visível desde o início**. O que o jogador não sabe é *o que
 * mora* em cada lugar, e é a distância que protege o novato, não a ignorância
 * do terreno.
 *
 * Consequência prática: não há estado de descoberta para persistir, e o mapa da
 * tecla M pode ser desenhado inteiro a partir daqui, sem ida ao servidor.
 */

import type { Rarity } from './weapons.js';

/** Lado do mundo, em tiles. O mapa antigo (Valoria) tinha 60. */
export const WORLD_SIZE = 300;

/** Onde o personagem nasce: o vilarejo de Lumindale. */
export const WORLD_SPAWN = { x: 150, y: 158, floor: 0 };

/**
 * Raio (Chebyshev) da **praça segura** em volta do nascimento, em tiles.
 *
 * 🔴 É a única coisa que sobrou do vilarejo de Lumindale, e é de propósito
 * (decisão do dono em 2026-08-05): saíram muralha, portões, praça de pedra e as
 * sete casas — *"pode deixar só grama mesmo, e apenas os NPCs mais juntinhos ali
 * no meio"*. O que protege o novato deixou de ser arquitetura e passou a ser
 * **regra**, desenhada como um círculo no chão.
 *
 * Dentro dela: monstro não entra, monstro não ataca, jogador não fere jogador.
 *
 * ⚠️ Mora aqui, e não no servidor, porque **três lados precisam do mesmo
 * número**: o servidor para barrar, o cliente para desenhar o círculo, e o
 * `worldgen` para não plantar árvore em cima do NPC. Se divergissem, o desenho
 * mentiria sobre onde a proteção acaba — e é justamente essa borda que o jogador
 * usa para fugir.
 *
 * 🔴 **Subiu de 6 para 12 em 2026-08-05**, a pedido do dono: o vilarejo vai ser
 * construído aqui dentro com packs de casa, e 13×13 não comportava. São 25×25
 * tiles limpos, de grama, sem monstro.
 *
 * ⚠️ Quando as casas entrarem, este raio deixa de ser "o vilarejo" e volta a ser
 * só a **praça central** — cidade grande com PvP proibido em toda a extensão
 * seria refúgio, não vila. Rever junto com o desenho.
 */
export const SAFE_ZONE_RADIUS = 12;

/**
 * Os oito grupos de bioma da Etapa 22, mais `sea` e `coast`, que o roadmap
 * classifica como **geografia, não bioma** — entram aqui porque o gerador
 * precisa saber desenhar água, e não porque sejam ecossistemas próprios.
 */
export type Biome =
  | 'plains' | 'forest' | 'mountain' | 'swamp' | 'desert'
  | 'snow' | 'volcanic' | 'jungle' | 'cursed'
  | 'coast' | 'sea';

export const BIOME_NAME: Record<Biome, string> = {
  plains: 'Planícies',
  forest: 'Floresta',
  mountain: 'Montanhas',
  swamp: 'Pântano',
  desert: 'Deserto',
  snow: 'Nevado',
  volcanic: 'Vulcânico',
  jungle: 'Selva',
  cursed: 'Corrupção',
  coast: 'Costa',
  sea: 'Mar',
};

/** Função de um assentamento. `village` é o ponto de partida. */
export type SettlementKind = 'capital' | 'city' | 'village';

export interface CityDef {
  id: string;
  name: string;
  kind: SettlementKind;
  /** Centro do assentamento, em tiles do mundo. */
  x: number;
  y: number;
  /** Região que a abriga. */
  region: string;
  /** Uma linha, do próprio mapa do dono. */
  about: string;
}

/**
 * Faixa de nível pretendida da região.
 *
 * 🔴 **Bioma NÃO determina nível** (Etapa 22) — a mesma floresta pode ser
 * inicial perto da capital e Lv.150+ do outro lado do mundo. O que determina é
 * a DISTÂNCIA do nascimento, e é isso que o teste desta pasta trava.
 */
export interface LevelBand {
  min: number;
  max: number;
}

export interface RegionDef {
  id: string;
  name: string;
  biome: Biome;
  /** Retângulo que a região ocupa, inclusivo, em tiles do mundo. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
  level: LevelBand;
  /**
   * Bestiário pretendido, com os nomes que o dono escreveu.
   *
   * ⚠️ **Nem todos existem como espécie.** `species` lista o que já está em
   * `CREATURES` e pode nascer hoje; `wanted` é o resto, que espera o bestiário
   * crescer. Manter os dois separados evita a mentira de uma região "pronta"
   * que na verdade nasce vazia.
   */
  species: string[];
  wanted: string[];
}

/**
 * As treze regiões, traduzidas do PNG.
 *
 * ⚠️ **As coordenadas são REFERÊNCIA.** Foram lidas à mão do mapa ilustrado,
 * que é arte e não grade: o que se preservou foi a **posição relativa** (gelo ao
 * norte, deserto a sudeste, capital no centro) e a **ordem de distância**, que é
 * o que o jogo sente. Ajustar um retângulo aqui é barato; trocar a posição
 * relativa não é, porque quebra a curva de dificuldade.
 *
 * 🔴 **A ORDEM DA LISTA É PRIORIDADE.** `regionAt` devolve a PRIMEIRA que
 * contém o tile, então região encravada vem antes da que a cerca — é o caso dos
 * **Campos de Valdor**, que são um bolsão manso (Lv. 1–15) dentro das Planícies
 * de Verídia (Lv. 30–50). Sem essa ordem, quem sai de Lumindale cairia direto
 * em conteúdo de nível 30.
 *
 * 🔴 **O MAR NÃO É REGIÃO.** Tile que nenhuma região reivindica é água — o
 * roadmap trata costa e ilhas como *geografia, não bioma*, e modelar o oceano
 * como retângulo brigaria com todas as penínsulas do mapa.
 */
export const REGIONS: RegionDef[] = [
  {
    id: 'campos_valdor',
    name: 'Campos de Valdor',
    biome: 'plains',
    bounds: { x0: 122, y0: 132, x1: 182, y1: 186 },
    level: { min: 1, max: 15 },
    species: ['grey_wolf', 'boar', 'goblin_warrior', 'goblin_archer', 'slime', 'rabbit'],
    wanted: ['Bandidos'],
  },
  {
    id: 'planicies_veridia',
    name: 'Planícies de Verídia',
    biome: 'plains',
    bounds: { x0: 116, y0: 96, x1: 190, y1: 160 },
    level: { min: 30, max: 50 },
    species: ['black_wolf', 'orc_warrior'],
    wanted: ['Cavaleiros Renegados', 'Centauros'],
  },
  {
    id: 'floresta_eldor',
    name: 'Floresta de Eldor',
    biome: 'forest',
    bounds: { x0: 42, y0: 32, x1: 112, y1: 108 },
    level: { min: 15, max: 35 },
    species: ['young_orc', 'orc_warrior', 'troll', 'brown_bear', 'giant_spider', 'forest_spider', 'web_spider'],
    wanted: ['Ents'],
  },
  {
    id: 'montanhas_ferro',
    name: 'Montanhas de Ferro',
    biome: 'mountain',
    bounds: { x0: 68, y0: 118, x1: 132, y1: 178 },
    level: { min: 25, max: 50 },
    species: ['kobold_hunter', 'minotaur'],
    wanted: ['Anões Corrompidos', 'Golems', 'Morcegos', 'Ogros'],
  },
  {
    id: 'peninsula_olyn',
    name: 'Península de Olyn',
    biome: 'coast',
    bounds: { x0: 12, y0: 128, x1: 76, y1: 192 },
    level: { min: 20, max: 40 },
    species: [],
    wanted: ['Piratas', 'Caranguejos Gigantes', 'Serpentes Marinhas', 'Sahuagins'],
  },
  {
    id: 'northland',
    name: 'Northland',
    biome: 'snow',
    bounds: { x0: 108, y0: 8, x1: 188, y1: 62 },
    level: { min: 70, max: 100 },
    species: [],
    wanted: ['Yetis', 'Lobos Árticos', 'Gigantes do Gelo', 'Espíritos Congelados'],
  },
  {
    id: 'terras_fogo',
    name: 'Terras de Fogo',
    biome: 'volcanic',
    bounds: { x0: 198, y0: 12, x1: 284, y1: 88 },
    level: { min: 80, max: 110 },
    species: [],
    wanted: ['Demônios', 'Elementais de Fogo', 'Salamandras', 'Gigantes de Lava'],
  },
  {
    id: 'vale_dragoes',
    name: 'Vale dos Dragões',
    biome: 'mountain',
    bounds: { x0: 190, y0: 92, x1: 252, y1: 152 },
    level: { min: 70, max: 100 },
    species: [],
    wanted: ['Wyrms', 'Drakes', 'Dragões Jovens', 'Dragões Antigos'],
  },
  {
    id: 'deserto_kharzan',
    name: 'Deserto de Kharzan',
    biome: 'desert',
    bounds: { x0: 176, y0: 156, x1: 258, y1: 232 },
    level: { min: 50, max: 80 },
    species: ['snake'],
    wanted: ['Escorpiões', 'Múmias', 'Djinns', 'Vermes Gigantes'],
  },
  {
    id: 'selva_yoruba',
    name: 'Selva de Yoruba',
    biome: 'jungle',
    bounds: { x0: 252, y0: 172, x1: 294, y1: 238 },
    level: { min: 60, max: 90 },
    species: ['snake'],
    wanted: ['Hidras', 'Gorilas', 'Tribos Selvagens'],
  },
  {
    id: 'pantano_umbria',
    name: 'Pântano de Umbria',
    biome: 'swamp',
    bounds: { x0: 32, y0: 188, x1: 98, y1: 248 },
    level: { min: 55, max: 85 },
    species: ['zombie', 'rotworm', 'giant_spider'],
    wanted: ['Sapos Gigantes', 'Bruxas'],
  },
  {
    id: 'terras_amaldicoadas',
    name: 'Terras Amaldiçoadas',
    biome: 'cursed',
    bounds: { x0: 102, y0: 192, x1: 178, y1: 258 },
    level: { min: 100, max: 130 },
    species: ['zombie', 'skeleton_warrior', 'skeleton_archer'],
    wanted: ['Demônios', 'Aberrações', 'Cavaleiros Corrompidos'],
  },
];

/**
 * Os assentamentos.
 *
 * 🔴 **Lumindale não aparece no mapa-múndi ilustrado**, e é o mais importante
 * deles: é onde o personagem nasce. O `vilarejo-inicial.png` diz que fica "nas
 * Terras do Reinado de Valdor, a região mais segura", e o roadmap fecha que o
 * personagem **nasce num vilarejo ao redor de uma cidade principal, não nela**.
 * Daí ele ficar nos Campos de Valdor, ao sul de Arcadia, e não dentro da capital.
 */
export const CITIES: CityDef[] = [
  {
    id: 'lumindale', name: 'Lumindale', kind: 'village',
    x: WORLD_SPAWN.x, y: WORLD_SPAWN.y, region: 'campos_valdor',
    about: 'Vilarejo de partida de todos os aventureiros, protegido pela guarda real.',
  },
  {
    id: 'arcadia', name: 'Arcadia', kind: 'capital',
    x: 152, y: 122, region: 'planicies_veridia',
    about: 'Capital Real: centro político de Elysia, sede do rei e do conselho real.',
  },
  {
    id: 'valen', name: 'Valen', kind: 'city',
    x: 74, y: 70, region: 'floresta_eldor',
    about: 'Cidade élfica construída nas copas das árvores.',
  },
  {
    id: 'skald', name: 'Skald', kind: 'city',
    x: 148, y: 34, region: 'northland',
    about: 'Cidade dos guerreiros do norte, forte e inabalável.',
  },
  {
    id: 'drakor', name: 'Drakor', kind: 'city',
    x: 238, y: 44, region: 'terras_fogo',
    about: 'Capital das Terras de Fogo, dominada pela força e pelo aço.',
  },
  {
    id: 'lyon', name: 'Lyon', kind: 'city',
    x: 40, y: 158, region: 'peninsula_olyn',
    about: 'Cidade portuária, comércio e entrada para o oceano.',
  },
  {
    id: 'kazdur', name: 'Kazdur', kind: 'city',
    x: 98, y: 146, region: 'montanhas_ferro',
    about: 'Cidade anã nas montanhas, mestres da forja e da mineração.',
  },
  {
    id: 'zahir', name: 'Zahir', kind: 'city',
    x: 214, y: 194, region: 'deserto_kharzan',
    about: 'Cidade no deserto, lar de mercadores e nômades.',
  },
  {
    id: 'mortaine', name: 'Mortaine', kind: 'city',
    x: 62, y: 214, region: 'pantano_umbria',
    about: 'Cidade sombria, estudiosa de magias proibidas.',
  },
  {
    id: 'illara', name: 'Illara', kind: 'city',
    x: 274, y: 204, region: 'selva_yoruba',
    about: 'Cidade da selva, lar de xamãs e antigos espíritos.',
  },
  {
    id: 'cidade_sombras', name: 'Cidade das Sombras', kind: 'city',
    x: 138, y: 226, region: 'terras_amaldicoadas',
    about: 'O último posto habitado antes da corrupção total.',
  },
];

/**
 * Quantos andares tem uma dungeon.
 *
 * Decisão do dono: **descer é a progressão**, como no Tibia. O PNG nomeia
 * **quatro** sub-áreas por dungeon e o dono pediu **seis** andares — então os
 * dois primeiros são a aproximação (entrada e galerias, onde se aprende o
 * bicho da casa) e os quatro nomeados são o miolo. Assim nenhum nome do mapa se
 * perde e ninguém precisa inventar dois.
 */
export const DUNGEON_FLOORS = 6;

export interface DungeonDef {
  id: string;
  name: string;
  region: string;
  /** Entrada no mundo aberto, em tiles. */
  x: number;
  y: number;
  /** Faixa de nível do andar mais fundo. O primeiro andar é bem mais brando. */
  level: LevelBand;
  /** Nome de cada andar, do topo (0) ao fundo. `DUNGEON_FLOORS` nomes. */
  floors: string[];
  /** Raridade do que se espera achar no fundo. ⚠️ REFERÊNCIA. */
  loot: Rarity;
}

/**
 * As seis dungeons do PNG.
 *
 * ⚠️ **A região de cada uma é INFERÊNCIA minha** — o PNG lista as dungeons num
 * rodapé, sem marcá-las no mapa. Segui o tema (escorpião → deserto, dragão →
 * Vale dos Dragões, lobisomem → floresta) e espalhei uma por região para não
 * concentrar tudo no mesmo canto. Mover é trocar dois números.
 */
export const DUNGEONS: DungeonDef[] = [
  {
    id: 'castelo_vampiros', name: 'Castelo dos Vampiros',
    region: 'terras_amaldicoadas', x: 158, y: 210,
    level: { min: 100, max: 130 }, loot: 'epic',
    floors: ['Portão Arruinado', 'Galerias', 'Conde Draven', 'Salão Escarlate', 'Cripta Antiga', 'Câmara do Senhor'],
  },
  {
    id: 'covil_lobisomens', name: 'Covil dos Lobisomens',
    region: 'floresta_eldor', x: 62, y: 96,
    level: { min: 25, max: 40 }, loot: 'rare',
    floors: ['Trilha Uivante', 'Tocas', 'Selva da Lua Cheia', 'Alcateia Sangrenta', 'Caverna do Alfa', 'Rei dos Lobisomens'],
  },
  {
    id: 'templo_fantasmas', name: 'Templo dos Fantasmas',
    region: 'pantano_umbria', x: 84, y: 232,
    level: { min: 60, max: 85 }, loot: 'epic',
    floors: ['Ruínas Submersas', 'Nave Inundada', 'Corredores Eternos', 'Espíritos Antigos', 'Sacerdote Espectral', 'Guardião Esquecido'],
  },
  {
    id: 'tuneis_escorpiao', name: 'Túneis Escorpião',
    region: 'deserto_kharzan', x: 236, y: 176,
    level: { min: 55, max: 80 }, loot: 'rare',
    floors: ['Boca de Areia', 'Galerias Sopradas', 'Areia Cortante', 'Ninho dos Escorpiões', 'Rainha Escorpião', 'Câmaras Enterradas'],
  },
  {
    id: 'fortaleza_sombria', name: 'Fortaleza Sombria',
    region: 'terras_fogo', x: 228, y: 74,
    level: { min: 95, max: 120 }, loot: 'legendary',
    floors: ['Muralha Calcinada', 'Pátio de Cinzas', 'Salão do Caos', 'Cavaleiros da Morte', 'Senhor da Corrupção', 'Trono Amaldiçoado'],
  },
  {
    id: 'abismo_dragao', name: 'Abismo do Dragão',
    region: 'vale_dragoes', x: 218, y: 132,
    level: { min: 110, max: 140 }, loot: 'legendary',
    floors: ['Desfiladeiro', 'Ossário', 'Caverna do Dragão', 'Guardiões Ancestrais', 'Santuário Proibido', 'Dragão Ancião'],
  },
];

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

const chebyshev = (ax: number, ay: number, bx: number, by: number): number =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

/** A região que contém este tile, se houver. */
export function regionAt(x: number, y: number): RegionDef | undefined {
  return REGIONS.find(
    (r) => x >= r.bounds.x0 && x <= r.bounds.x1 && y >= r.bounds.y0 && y <= r.bounds.y1,
  );
}

export function regionById(id: string): RegionDef | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function cityById(id: string): CityDef | undefined {
  return CITIES.find((c) => c.id === id);
}

/** Centro geométrico de uma região. */
export function regionCenter(r: RegionDef): { x: number; y: number } {
  return {
    x: Math.round((r.bounds.x0 + r.bounds.x1) / 2),
    y: Math.round((r.bounds.y0 + r.bounds.y1) / 2),
  };
}

/**
 * Distância do nascimento até o centro de uma região, em tiles.
 *
 * É a régua de coerência do mundo: quanto mais longe de Lumindale, mais duro.
 * Ver o teste que trava a monotonia disso.
 */
export function distanceFromSpawn(r: RegionDef): number {
  const c = regionCenter(r);
  return chebyshev(c.x, c.y, WORLD_SPAWN.x, WORLD_SPAWN.y);
}
