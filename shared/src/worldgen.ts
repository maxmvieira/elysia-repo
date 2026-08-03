/**
 * Gerador do mundo de **Elysia** — 300×300 tiles, a partir de `regions.ts`.
 *
 * Determinístico e puro: cliente e servidor chamam a mesma função e obtêm o
 * mesmo mundo, sem sincronizar arquivo nenhum. 🔴 **É essa igualdade que
 * sustenta a decisão de "nós de recurso são ENTIDADES, não tiles"** — se o
 * terreno pudesse mudar em um dos lados, os dois deixariam de concordar sobre
 * onde se pode pisar, e nada disso trafega pela rede.
 *
 * ## O que vem de onde
 *
 * | Camada | Fonte | Por quê |
 * |---|---|---|
 * | **Regiões, cidades, dungeons** | `regions.ts` (dado autoral) | o mapa do dono tem intenção, e intenção não sai de PRNG |
 * | **Terreno** | esta função, derivado das regiões | 90.000 tiles não se escrevem à mão |
 * | **Decoração** (árvore, penhasco, lava) | PRNG de semente fixa | o ruído *decora*; ele não decide onde fica o quê |
 * | **Spawn, NPC e nó** | `shared/data/world/*.json` | ver `worlddata.ts`: é o que o Editor de Mapa vai escrever |
 *
 * ## 🔴 Duas invariantes que o resto do jogo assume
 *
 * 1. **Decoração nunca encosta em decoração** (vizinhança de 8). É o que garante
 *    que floresta densa continue atravessável a pé: com dois sólidos nunca
 *    adjacentes, sempre sobra rota em volta. Baixar essa regra fecharia
 *    corredores e quebraria o BFS do clique-para-andar sem aviso.
 * 2. **O chão é pintado em TODO tile**, inclusive debaixo de parede e árvore. O
 *    cliente desenha o piso sempre (foi o bug do quadrado preto em volta das
 *    árvores, 02/08) e conta com isto aqui.
 */

import type { GameMap, FloorLink } from './tiles.js';
import { TILE_VOID } from './tiles.js';
import {
  REGIONS,
  CITIES,
  WORLD_SIZE,
  WORLD_SPAWN,
  regionAt,
  type Biome,
  type RegionDef,
  type CityDef,
} from './regions.js';
import { WORLD_NPCS } from './worlddata.js';

const T = {
  VOID: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WATER: 4,
  WALL_STONE: 5,
  WALL_WOOD: 6,
  TREE: 7,
  SAND: 8,
  SNOW: 9,
  ROCK: 10,
  ASH: 11,
  JUNGLE: 12,
  SWAMP: 13,
  CURSED: 14,
  LAVA: 15,
} as const;

const WIDTH = WORLD_SIZE;
const HEIGHT = WORLD_SIZE;

/**
 * Até onde uma região pinta terreno FORA do próprio retângulo, em tiles.
 *
 * 🔴 Sem isto o mundo vira arquipélago, e a razão é geométrica: os retângulos de
 * `regions.ts` não ladrilham o plano — sobram frestas entre vizinhos. Como
 * "tile que ninguém reivindica é água", uma fresta de 5 tiles entre os Campos de
 * Valdor e as Terras Amaldiçoadas viraria um **canal cortando o continente ao
 * meio**, e o jogador não teria como andar até lá.
 *
 * Então: tile sem dono pertence à região mais PRÓXIMA, se ela estiver a até
 * `REGION_REACH`; além disso, é mar de verdade. A regra do dono continua de pé —
 * o mar é o que sobra, não um retângulo — mas o que sobra passa a ser o oceano
 * externo e os vãos grandes, não toda costura entre duas regiões.
 *
 * ⚠️ Isto pinta **terreno**, não pertencimento: `regionAt` continua sendo a
 * autoridade sobre em que região o jogador está, e continua devolvendo
 * `undefined` nessa borda. Faixa de praia não é território.
 */
const REGION_REACH = 14;

/** Semente do mundo. Mudar isto redesenha toda a decoração. */
const WORLD_SEED = 20260802;

/** O chão base de cada bioma. */
const BIOME_GROUND: Record<Biome, number> = {
  plains: T.GRASS,
  forest: T.GRASS,
  mountain: T.ROCK,
  swamp: T.SWAMP,
  desert: T.SAND,
  snow: T.SNOW,
  volcanic: T.ASH,
  jungle: T.JUNGLE,
  cursed: T.CURSED,
  coast: T.SAND,
  sea: T.WATER,
};

/**
 * O que cada bioma espalha por cima do chão, e com que frequência.
 *
 * ⚠️ **Todos os números são REFERÊNCIA** — nenhum documento dá densidade de
 * vegetação. O que não é gosto é a *ordem*: selva e floresta acima de planície,
 * e deserto pelado. A densidade real fica abaixo da pedida porque a invariante
 * de "nunca encostar" limita o tabuleiro a 25% no melhor caso.
 */
const BIOME_DECOR: Record<Biome, { tile: number; chance: number }> = {
  plains: { tile: T.TREE, chance: 0.05 },
  // Floresta e selva puxadas para perto do teto: o chão delas é o mesmo verde da
  // planície, então é a densidade de árvore — e só ela — que faz o jogador
  // perceber que entrou na mata.
  forest: { tile: T.TREE, chance: 0.42 },
  jungle: { tile: T.TREE, chance: 0.46 },
  swamp: { tile: T.TREE, chance: 0.08 },
  snow: { tile: T.TREE, chance: 0.05 },
  cursed: { tile: T.TREE, chance: 0.07 },
  mountain: { tile: T.WALL_STONE, chance: 0.16 },
  volcanic: { tile: T.LAVA, chance: 0.08 },
  desert: { tile: T.TREE, chance: 0.004 },
  coast: { tile: T.TREE, chance: 0.02 },
  sea: { tile: T.TREE, chance: 0 },
};

/** Biomas que NÃO ganham praia de areia ao encostar no mar. */
const SEM_PRAIA: ReadonlySet<Biome> = new Set<Biome>(['snow', 'volcanic', 'sea']);

// ---------------------------------------------------------------------------
// Utilidades de grade
// ---------------------------------------------------------------------------

function makeLayer(fill: number): number[] {
  return new Array(WIDTH * HEIGHT).fill(fill);
}

function dentro(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;
}

function set(layer: number[], x: number, y: number, id: number): void {
  if (!dentro(x, y)) return;
  layer[y * WIDTH + x] = id;
}

function get(layer: number[], x: number, y: number): number {
  if (!dentro(x, y)) return TILE_VOID;
  return layer[y * WIDTH + x] ?? TILE_VOID;
}

function fillRect(layer: number[], x0: number, y0: number, w: number, h: number, id: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) set(layer, x, y, id);
  }
}

/** Contorno (paredes) de um retângulo, deixando o interior intacto. */
function strokeRect(layer: number[], x0: number, y0: number, w: number, h: number, id: number): void {
  for (let x = x0; x < x0 + w; x++) {
    set(layer, x, y0, id);
    set(layer, x, y0 + h - 1, id);
  }
  for (let y = y0; y < y0 + h; y++) {
    set(layer, x0, y, id);
    set(layer, x0 + w - 1, y, id);
  }
}

/** PRNG determinístico (mulberry32). */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ruído suave (value noise) numa grade grossa, interpolado com smoothstep.
 *
 * Serve a uma coisa só: **entortar as fronteiras**. Ver `RUIDO_FRONTEIRA`.
 */
function makeNoise(seed: number, celula: number): (x: number, y: number) => number {
  const rng = makeRng(seed);
  const cols = Math.ceil(WIDTH / celula) + 2;
  const rows = Math.ceil(HEIGHT / celula) + 2;
  const grade = new Float64Array(cols * rows);
  for (let i = 0; i < grade.length; i++) grade[i] = rng() * 2 - 1;

  const em = (cx: number, cy: number): number => {
    const x = Math.min(cols - 1, Math.max(0, cx));
    const y = Math.min(rows - 1, Math.max(0, cy));
    return grade[y * cols + x] ?? 0;
  };

  return (x: number, y: number): number => {
    const fx = x / celula;
    const fy = y / celula;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const cima = em(x0, y0) + (em(x0 + 1, y0) - em(x0, y0)) * sx;
    const baixo = em(x0, y0 + 1) + (em(x0 + 1, y0 + 1) - em(x0, y0 + 1)) * sx;
    return cima + (baixo - cima) * sy;
  };
}

// ---------------------------------------------------------------------------
// Terreno
// ---------------------------------------------------------------------------

/** Distância de Chebyshev de um ponto ao retângulo (0 se estiver dentro). */
function distanciaAoRetangulo(r: RegionDef, x: number, y: number): number {
  const dx = Math.max(r.bounds.x0 - x, 0, x - r.bounds.x1);
  const dy = Math.max(r.bounds.y0 - y, 0, y - r.bounds.y1);
  return Math.max(dx, dy);
}

/**
 * Quanto uma fronteira de região pode entortar, em tiles.
 *
 * 🔴 **Sem isto o mundo tem cara de colcha de retalhos.** As regiões de
 * `regions.ts` são retângulos — necessário, porque `regionAt` precisa responder
 * "que região é esta?" em tempo constante e sem tabela de 90.000 entradas. Mas
 * retângulo pintado direto no terreno dá borda reta e canto de 90°, e o mapa
 * ilustrado do dono não tem uma única linha reta.
 *
 * A correção não muda a tabela: antes de perguntar "que região pinta este
 * tile?", o ponto é **deslocado por um ruído suave**. A pergunta continua sendo
 * feita aos mesmos retângulos; o que fica torto é só onde uma acaba e a outra
 * começa — inclusive a linha da costa, que é a que mais se vê.
 *
 * ⚠️ **Isto é só TERRENO.** `regionAt` continua respondendo pelo retângulo puro,
 * então perto da fronteira o chão pode ser de neve e a região, oficialmente,
 * ainda ser a vizinha. Numa faixa de ~9 tiles, e sem consequência: o que a
 * região decide é bicho e faixa de nível, não a cor do chão.
 */
const RUIDO_FRONTEIRA = 9;

/** Lado da célula do ruído, em tiles. Maior = fronteira mais ondulada e macia. */
const RUIDO_CELULA = 26;

const ruidoX = makeNoise(WORLD_SEED + 101, RUIDO_CELULA);
const ruidoY = makeNoise(WORLD_SEED + 202, RUIDO_CELULA);

/**
 * A região que PINTA este tile — a que o contém ou, na falta, a mais próxima
 * dentro de `REGION_REACH`. Ver o comentário daquela constante.
 *
 * O empate é resolvido pela ordem de `REGIONS`, que já é prioridade declarada.
 */
function regiaoQuePinta(xCru: number, yCru: number): RegionDef | undefined {
  // Entorta a fronteira (ver `RUIDO_FRONTEIRA`). É a MESMA função para o
  // gerador e para o cliente, senão o piso desenhado sob uma árvore da borda
  // discordaria do chão em volta dela.
  const x = xCru + Math.round(ruidoX(xCru, yCru) * RUIDO_FRONTEIRA);
  const y = yCru + Math.round(ruidoY(xCru, yCru) * RUIDO_FRONTEIRA);

  const dentroDe = regionAt(x, y);
  if (dentroDe) return dentroDe;

  let melhor: RegionDef | undefined;
  let menor = Number.POSITIVE_INFINITY;
  for (const r of REGIONS) {
    const d = distanciaAoRetangulo(r, x, y);
    if (d < menor) {
      menor = d;
      melhor = r;
    }
  }
  return menor <= REGION_REACH ? melhor : undefined;
}

/**
 * O chão que este tile teria sem nada por cima.
 *
 * 🔴 **Serve ao cliente, que desenha piso debaixo de todo tile alto.** Antes ele
 * usava grama fixa, o que bastava quando o mundo inteiro era o bosque de
 * Valoria — no Northland, a árvore apareceria plantada num quadrado de grama no
 * meio da neve.
 */
export function chaoBaseEm(x: number, y: number): number {
  const r = regiaoQuePinta(x, y);
  return r ? BIOME_GROUND[r.biome] : T.WATER;
}

/** Pinta o chão base do mundo inteiro. Devolve o bioma de cada tile. */
function pintaBiomas(ground: number[]): (Biome | undefined)[] {
  const biomas: (Biome | undefined)[] = new Array(WIDTH * HEIGHT).fill(undefined);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const r = regiaoQuePinta(x, y);
      const i = y * WIDTH + x;
      if (!r) {
        ground[i] = T.WATER;
        continue;
      }
      biomas[i] = r.biome;
      ground[i] = BIOME_GROUND[r.biome];
    }
  }
  return biomas;
}

/**
 * Praia: terra encostada no mar vira areia.
 *
 * Lê de uma cópia do estado anterior de propósito — pintar e ler na mesma
 * passada faria a areia se propagar terra adentro, uma fila de dominós.
 */
function pintaPraias(ground: number[], biomas: (Biome | undefined)[]): void {
  const antes = ground.slice();
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      const b = biomas[i];
      if (!b || SEM_PRAIA.has(b) || antes[i] === T.WATER) continue;
      const vizinhoMar =
        get(antes, x - 1, y) === T.WATER || get(antes, x + 1, y) === T.WATER
        || get(antes, x, y - 1) === T.WATER || get(antes, x, y + 1) === T.WATER;
      if (vizinhoMar) ground[i] = T.SAND;
    }
  }
}

/**
 * Espalha árvore, penhasco e lava.
 *
 * 🔴 **Nada encosta em nada** (vizinhança de 8) — é a invariante do cabeçalho, e
 * o que mantém a floresta densa atravessável. O sorteio consome um número do
 * PRNG por tile de terra, sempre na mesma ordem, para que a recusa por vizinho
 * não desalinhe a sequência e mude o mundo inteiro.
 */
function espalhaDecoracao(ground: number[], biomas: (Biome | undefined)[]): void {
  const rng = makeRng(WORLD_SEED);
  const posto = new Uint8Array(WIDTH * HEIGHT);

  const temVizinho = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (dentro(nx, ny) && posto[ny * WIDTH + nx]) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      const b = biomas[i];
      if (!b) continue;
      const sorte = rng();
      if (ground[i] === T.WATER) continue;
      const decor = BIOME_DECOR[b];
      if (sorte >= decor.chance) continue;
      if (temVizinho(x, y)) continue;
      ground[i] = decor.tile;
      posto[i] = 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Assentamentos
// ---------------------------------------------------------------------------

/**
 * As 10 cidades que ainda não foram desenhadas.
 *
 * Ganham **praça de pedra, muralha e quatro portões** — o bastante para existir
 * no terreno, dar para chegar e o mapa da tecla M não mentir. Não têm interior,
 * NPC nem serviço.
 *
 * ⚠️ **É marca, não cidade.** Quando cada uma for desenhada de verdade (o
 * `vilarejo-inicial.png` mostra o padrão que Lumindale seguiu), ela substitui a
 * marca. Deixá-las invisíveis seria pior: o jogador andaria 80 tiles até Arcadia
 * para encontrar planície vazia, sem saber se errou o caminho ou se a cidade não
 * existe.
 */
function marcaCidade(ground: number[], c: CityDef): void {
  const lado = c.kind === 'capital' ? 15 : 11;
  const meio = Math.floor(lado / 2);
  const x0 = c.x - meio;
  const y0 = c.y - meio;

  fillRect(ground, x0, y0, lado, lado, T.STONE);
  strokeRect(ground, x0, y0, lado, lado, T.WALL_STONE);

  // Portões nos quatro lados: uma cidade com muralha fechada é uma parede
  // redonda, e o jogador não teria como entrar.
  for (const d of [-1, 0, 1]) {
    set(ground, c.x + d, y0, T.STONE);
    set(ground, c.x + d, y0 + lado - 1, T.STONE);
    set(ground, x0, c.y + d, T.STONE);
    set(ground, x0 + lado - 1, c.y + d, T.STONE);
  }
}

/** Casa de madeira com piso de pedra e uma porta. Devolve o retângulo interno. */
function casa(
  ground: number[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  porta: { x: number; y: number },
): { x0: number; y0: number; x1: number; y1: number } {
  fillRect(ground, x0, y0, w, h, T.STONE);
  strokeRect(ground, x0, y0, w, h, T.WALL_WOOD);
  set(ground, porta.x, porta.y, T.STONE);
  return { x0: x0 + 1, y0: y0 + 1, x1: x0 + w - 2, y1: y0 + h - 2 };
}

/** Limites do vilarejo de Lumindale, em tiles do mundo. */
const LUMINDALE = { x0: 138, y0: 146, x1: 162, y1: 172 } as const;

/**
 * O vilarejo de Lumindale, traduzido à mão do `vilarejo-inicial.png`.
 *
 * A prancha nomeia oito lugares: Portão Norte, Praça Central (com fonte e a
 * árvore grande), Área de Treinamento, Ferreiro, Mercearia, Armaria, Curandeiro,
 * Mestre de Classe e a Taberna.
 *
 * 🔴 **Só três deles viram NPC**, e isso é deliberado: `NpcRole` tem `vendor`,
 * `bank` e `blacksmith`, e mais nada. Curandeiro, Mestre de Classe e taberneiro
 * ficam com o prédio desenhado e **vazio** — inventar o papel deles seria criar
 * sistema (cura paga, troca de classe, missão) que nenhum documento fecha. O
 * mesmo vale para os **guardas** que a prancha promete: patrulha e punição são a
 * Etapa 17.
 *
 * 🔴 **Os três serviços ficam NA PRAÇA, não dentro dos prédios.** É como
 * funcionava em Valoria e continua sendo o certo: a praça concentra o serviço, e
 * é isso que faz o jogador voltar. Enfiá-los dentro das casas no mesmo dia em
 * que o mapa inteiro muda misturaria dois riscos — se a loja parasse de abrir,
 * ninguém saberia se foi a rota ou o mapa.
 */
function desenhaLumindale(
  ground: number[],
  upper: number[],
  floorLinks: FloorLink[],
): { x0: number; y0: number; x1: number; y1: number } {
  const { x0, y0, x1, y1 } = LUMINDALE;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;

  // Terra batida por dentro, paliçada de madeira em volta.
  fillRect(ground, x0, y0, w, h, T.DIRT);
  strokeRect(ground, x0, y0, w, h, T.WALL_WOOD);

  // Os quatro portões. O Norte é o que a prancha nomeia; os outros três existem
  // para que sair da vila não dependa de dar a volta por um lado só.
  for (const d of [-1, 0, 1]) {
    set(ground, WORLD_SPAWN.x + d, y0, T.DIRT); // Portão Norte
    set(ground, WORLD_SPAWN.x + d, y1, T.DIRT);
    set(ground, x0, WORLD_SPAWN.y + d, T.DIRT);
    set(ground, x1, WORLD_SPAWN.y + d, T.DIRT);
  }

  // Praça Central de pedra, com a fonte e a árvore grande da prancha.
  fillRect(ground, 145, 152, 11, 13, T.STONE);
  fillRect(ground, 149, 155, 2, 2, T.WATER); // a fonte
  set(ground, 154, 154, T.TREE); // a árvore da praça

  // Área de Treinamento: pátio aberto de areia, ao norte, entre o Depósito e a
  // Ferraria. Aberto de propósito — a prancha mostra alvos, não muros.
  fillRect(ground, 146, 147, 9, 4, T.SAND);

  // Os prédios. Cada porta é um vão na parede que dá para a terra batida ou
  // para a praça — nenhuma abre para dentro de outro prédio.
  casa(ground, 156, 148, 6, 5, { x: 158, y: 152 }); // Ferreiro
  casa(ground, 156, 160, 6, 5, { x: 156, y: 162 }); // Mercearia
  casa(ground, 139, 152, 6, 5, { x: 144, y: 154 }); // Armaria
  casa(ground, 155, 166, 6, 5, { x: 157, y: 166 }); // Curandeiro
  casa(ground, 139, 165, 7, 5, { x: 142, y: 165 }); // Mestre de Classe
  casa(ground, 147, 166, 6, 5, { x: 149, y: 166 }); // Taberna

  // O Depósito, e a única escada do mundo aberto. O andar de cima é o quarto
  // por cima dele; o mecanismo multi-andar do motor mora aqui e é o mesmo que
  // as dungeons vão usar.
  const dep = casa(ground, 139, 147, 6, 4, { x: 141, y: 150 });

  const stairX = 143;
  const stairY = 148;
  const landX = 142;
  set(ground, stairX, stairY, T.STONE);
  set(ground, landX, stairY, T.STONE);
  floorLinks.push({
    x: stairX, y: stairY, fromFloor: 0,
    toX: landX, toY: stairY, toFloor: 1, kind: 'up',
  });

  // O andar de cima existe SÓ aqui: 90.000 tiles de vazio para um quarto de 4×2.
  fillRect(upper, 139, 147, 6, 4, T.STONE);
  strokeRect(upper, 139, 147, 6, 4, T.WALL_WOOD);
  set(upper, stairX, stairY, T.STONE);
  set(upper, landX, stairY, T.STONE);
  floorLinks.push({
    x: stairX, y: stairY, fromFloor: 1,
    toX: landX, toY: stairY, toFloor: 0, kind: 'down',
  });

  return dep;
}

// ---------------------------------------------------------------------------

/**
 * Constrói o mundo inteiro. Chamada uma vez por boot, dos dois lados.
 *
 * ⚠️ Devolve estruturas novas a cada chamada (não há cache): quem altera o mapa
 * devolvido altera só a própria cópia. O custo é de dezenas de milissegundos,
 * pago uma vez.
 */
export function buildWorldMap(): GameMap {
  const ground = makeLayer(T.WATER);
  const upper = makeLayer(T.VOID);
  const floorLinks: FloorLink[] = [];

  const biomas = pintaBiomas(ground);
  pintaPraias(ground, biomas);
  espalhaDecoracao(ground, biomas);

  for (const c of CITIES) {
    if (c.id === 'lumindale') continue; // desenhada à mão logo abaixo
    marcaCidade(ground, c);
  }
  const depotZone = desenhaLumindale(ground, upper, floorLinks);

  return {
    id: 'elysia',
    name: 'Elysia',
    width: WIDTH,
    height: HEIGHT,
    floors: { 0: ground, 1: upper },
    floorLinks,
    spawn: { ...WORLD_SPAWN },
    depotZone,
    npcs: WORLD_NPCS.map((n) => ({ ...n })),
  };
}

export { TILE_VOID, LUMINDALE };
