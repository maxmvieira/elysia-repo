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
  SAFE_ZONE_RADIUS,
  regionAt,
  type Biome,
  type RegionDef,
  type CityDef,
} from './regions.js';
import { WORLD_NPCS } from './worlddata.js';
import {
  PREDIOS, ANDARES, PORTA_DA_CASA, VOLTA_DA_CASA, MOVEL_DA_LETRA,
  tilesDoPredio, achaNaPlanta,
} from './buildings.js';

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
  BUILDING: 16,
  WOOD_FLOOR: 17,
  STONE_SLAB: 18,
  WALL_INTERIOR: 19,
  DOOR_CLOSED: 20,
  DOOR_OPEN: 21,
  FURNITURE: 22,
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
/*
 * 🔴 **Estes números CAÍRAM quando a árvore virou sprite (2026-08-04).**
 *
 * Enquanto árvore era um desenho por código do tamanho de um tile, contar
 * árvores e medir mata dava na mesma. Com o pack da CraftPix a árvore grande
 * ocupa **4 tiles de largura** — 16× a área de antes — e a mesma contagem passou
 * a fechar o cenário. O dono viu em tela: *"o cenário tá lotado de árvores"*.
 *
 * Então o que mudou não foi o gosto, foi a unidade: o que se está escolhendo
 * aqui é **quanto do chão fica coberto**, e a conversão de "chance por tile"
 * para "chão coberto" mudou por baixo. Cortei perto de ⅔ em tudo que planta
 * árvore, mantendo a ORDEM entre os biomas, que é o que tem significado:
 * selva > floresta > pântano > planície > deserto.
 *
 * ⚠️ Mexer aqui **reposiciona o mundo inteiro**, inclusive as 76 árvores
 * marcadas como nó de madeira. Cliente e servidor continuam de acordo porque os
 * dois rodam esta mesma função — mas personagem salvo em cima de um tile que
 * virou árvore é devolvido à cidade por `applyStoredCharacter`.
 */
/*
 * ⚠️ **Segunda rodada de corte (mesmo dia), depois de ver de novo em tela.** A
 * planície foi de 0.05 → 0.018 → **0.008**, quase 7× menos que o original. O
 * primeiro corte errou porque eu comparei contagem de árvores; o que o olho
 * compara é chão coberto, e com copa de 3 tiles cada árvore cobre ~9 células.
 * A 0.008 sobram ~2 árvores a cada 250 tiles, que é campo com árvore — o que a
 * planície deveria ter sido desde o começo.
 */
const BIOME_DECOR: Record<Biome, { tile: number; chance: number }> = {
  plains: { tile: T.TREE, chance: 0.008 },
  // Floresta e selva continuam no topo: o chão delas é o mesmo verde da
  // planície, então é a densidade de árvore — e só ela — que faz o jogador
  // perceber que entrou na mata. Só que agora a copa larga já diz isso sozinha,
  // e o que era 0.42 fecharia corredor.
  forest: { tile: T.TREE, chance: 0.08 },
  jungle: { tile: T.TREE, chance: 0.09 },
  swamp: { tile: T.TREE, chance: 0.015 },
  snow: { tile: T.TREE, chance: 0.008 },
  cursed: { tile: T.TREE, chance: 0.012 },
  mountain: { tile: T.WALL_STONE, chance: 0.16 }, // pedra não mudou de tamanho
  volcanic: { tile: T.LAVA, chance: 0.08 }, // lava é piso, não decoração alta
  // Deserto SOBE um pouco: estava em 0.004, quase nada, e agora tem palmeira e
  // arbusto para mostrar. Continua o bioma mais pelado, como deve ser.
  desert: { tile: T.TREE, chance: 0.008 },
  coast: { tile: T.TREE, chance: 0.01 },
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
 * 🔴 **MUNDO DE UM BIOMA SÓ — ligado em 2026-08-05, e é TEMPORÁRIO.**
 *
 * Decisão do dono, ao fim da sessão em que a arte foi acertada: *"pode apagar
 * todo o restante do mapa por enquanto, quero somente esse bioma central mesmo
 * (…) vamos montar o vilarejo aqui amanhã"*.
 *
 * Com isto ligado, os 300×300 viram **campo verde inteiro**: sem mar, sem
 * deserto, sem neve, sem as 11 cidades. Sobra grama, as árvores esparsas da
 * planície e a praça segura no meio.
 *
 * ⚠️ **Nada foi apagado para isso.** `regions.ts` continua com as 12 regiões, as
 * 11 cidades e as 6 dungeons; `marcaCidade` e `BIOME_GROUND` continuam inteiros.
 * Desligar esta constante devolve o mundo de antes na mesma linha — é por isso
 * que é uma chave, e não uma poda.
 *
 * 🔴 **Quem ligar/desligar tem que conferir os DOIS lugares que a leem**:
 * `chaoBaseEm` (o piso sob tile alto, no cliente) e `pintaBiomas` (o terreno).
 * Esquecer o primeiro foi um bug de verdade — árvore com quadrado de areia por
 * baixo, que na tela parecia sombra vermelha.
 */
const MUNDO_SO_CAMPO = true;

/**
 * O chão que este tile teria sem nada por cima.
 *
 * 🔴 **Serve ao cliente, que desenha piso debaixo de todo tile alto.** Antes ele
 * usava grama fixa, o que bastava quando o mundo inteiro era o bosque de
 * Valoria — no Northland, a árvore apareceria plantada num quadrado de grama no
 * meio da neve.
 */
export function chaoBaseEm(x: number, y: number): number {
  /*
   * 🔴 Tem que respeitar `MUNDO_SO_CAMPO`, e esquecer disso foi um bug real.
   *
   * Esta função é a que o cliente usa para pintar o piso EMBAIXO de tile alto.
   * Enquanto ela consultava a região direto, com o mundo forçado a campo, cada
   * árvore plantada sobre o antigo deserto ganhava um quadrado de areia por
   * baixo, e cada uma sobre a antiga montanha, um de rocha. Na tela isso apareceu
   * como *"sombra vermelha em algumas árvores e sombra quadrada em outras"* — a
   * areia cai no retalho marrom do `Ground.png`, e o quadrado é o tile inteiro.
   *
   * O sintoma não parecia bug de terreno porque só acontecia SOB a copa, onde o
   * jogador lê como sombra.
   */
  if (MUNDO_SO_CAMPO) return BIOME_GROUND.plains;
  const r = regiaoQuePinta(x, y);
  return r ? BIOME_GROUND[r.biome] : T.WATER;
}

/**
 * Pinta o chão base do mundo inteiro. Devolve o bioma de cada tile.
 *
 * ⚠️ Com `MUNDO_SO_CAMPO` ligado sai tudo planície. Efeito colateral que vale
 * saber: sem mar, **toda cidade fica alcançável a pé**, e o teste que garante
 * isso passa por motivo diferente do original. Quando a chave voltar a `false`,
 * ele volta a valer de verdade.
 */
function pintaBiomas(ground: number[]): (Biome | undefined)[] {
  const biomas: (Biome | undefined)[] = new Array(WIDTH * HEIGHT).fill(undefined);

  if (MUNDO_SO_CAMPO) {
    biomas.fill('plains');
    ground.fill(BIOME_GROUND.plains);
    return biomas;
  }

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

/**
 * A **praça segura** de Lumindale: o que restou do vilarejo.
 *
 * 🔴 O vilarejo inteiro foi APAGADO em 2026-08-05, a pedido do dono vendo em
 * tela: *"pode remover essa cidadezinha com o muro cercando, umas casinhas...
 * pode deixar só grama mesmo, e apenas os NPCs mais juntinhos ali no meio. Um
 * círculo mostrando que a área não é PVP e que os monstros não podem entrar"*.
 *
 * Saíram: paliçada e quatro portões, praça de pedra, fonte, área de treinamento
 * e as sete casas (Ferreiro, Mercearia, Armaria, Curandeiro, Mestre de Classe,
 * Taberna e o Depósito).
 *
 * ⚠️ **Foi junto a única escada do mundo aberto.** O Depósito tinha o segundo
 * andar, e era o único lugar que exercitava `floors` + `floorLinks` — o mesmo
 * mecanismo que as dungeons vão usar. O motor continua inteiro, mas nada mais o
 * usa: a próxima dungeon vai estreá-lo sem rede de proteção.
 *
 * ⚠️ O Depósito (baú/banco) passou a ser a própria praça. Antes era uma sala
 * fechada; agora é o círculo, que é onde os NPCs estão.
 *
 * O que a função faz é só **limpar**: o bioma já pintou grama aqui, e a
 * decoração já espalhou árvore por cima. Sem esta limpeza, o jogador podia
 * nascer encurralado entre três árvores — ou o Comerciante nascer dentro de uma.
 */
function limpaPracaSegura(ground: number[]): { x0: number; y0: number; x1: number; y1: number } {
  const r = SAFE_ZONE_RADIUS;
  const { x: cx, y: cy } = WORLD_SPAWN;

  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!dentro(x, y)) continue;
      // Um tile de folga além do raio: árvore encostada na borda ainda invadiria
      // o círculo com a copa, que tem 3 tiles de largura.
      set(ground, x, y, T.GRASS);
    }
  }

  return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
}

/**
 * Pinta a pegada dos prédios como tile sólido.
 *
 * 🔴 É isto que faz o jogador CONTORNAR a casa em vez de atravessá-la, e o
 * motivo de morar no `worldgen` (compartilhado) e não no cliente: movimento é
 * validado no servidor por `isWalkable`, que lê o mapa. Casa desenhada só no
 * cliente seria casa fantasma — bonita e atravessável.
 *
 * ⚠️ A pegada é MENOR que o sprite de propósito: só a base de pedra encosta no
 * chão. Ver `shared/src/buildings.ts`.
 */
function pintaPredios(ground: number[]): void {
  for (const predio of PREDIOS) {
    for (const { x, y } of tilesDoPredio(predio)) {
      if (!dentro(x, y)) continue;
      set(ground, x, y, T.BUILDING);
    }
  }
}

/**
 * Escava as PLANTAS dos andares da casa e liga porta e escada.
 *
 * 🔴 O andar nasce inteiro de , e  é **sólido** — a laje já barra
 * tudo por padrão. Escavar é só abrir o que a planta marca como chão. O que
 * ficar de fora continua intransponível sem eu desenhar parede nenhuma.
 *
 * 🔴 E é aqui que os MÓVEIS ganham física: cada  da planta simplesmente
 * **não é escavado**. O dono reportou em 14/08 que passava por cima da mobília;
 * a causa era o cômodo ser um retângulo de chão livre com um desenho por cima.
 * Agora desenho e colisão saem da mesma planta.
 *
 * ⚠️ A soleira, no andar 0, é aberta em : ela **precisa ser andável**,
 * senão o servidor barra o passo antes de olhar o link.
 */
function escavaAndares(
  ground: number[], porAndar: Map<number, number[]>, links: FloorLink[],
): void {
  const andarDe = (f: number): number[] => {
    let camada = porAndar.get(f);
    if (!camada) { camada = makeLayer(T.VOID); porAndar.set(f, camada); }
    return camada;
  };

  /*
   * 🔴 CADA SÍMBOLO VIRA UM TILE DE VERDADE — e é isto que conserta o
   * "ando em cima do muro".
   *
   * Antes a planta só ESCAVAVA: chão virava `STONE` e o resto ficava `VOID`,
   * enquanto o desenho vinha de uma imagem pintada por cima. Duas fontes, e
   * onde discordavam o jogador andava sobre parede desenhada.
   *
   * Agora parede é `WALL_INTERIOR`: o motor a desenha (bloco 2.5D, como faz com
   * as paredes do mundo) E a barra. Desenho e colisão deixam de poder discordar
   * porque são o mesmo dado.
   */
  const TILE_DE: Record<string, number> = {
    '#': T.WALL_INTERIOR,
    '.': T.WOOD_FLOOR,
    /*
     * 🔴 A soleira é DOOR_OPEN, ou seja ANDÁVEL — e isso é uma limitação
     * assumida, não descuido.
     *
     * `DOOR_CLOSED` é sólido, e o servidor barra o passo **antes** de olhar o
     * `floorLink`. Uma porta fechada aqui seria uma saída que nunca abre: o
     * jogador entraria na casa e ficaria preso.
     *
     * ⚠️ Porta que ABRE de verdade (fechada até alguém clicar) precisa de uma
     * peça que não existe: o mapa é calculado por `buildWorldMap` nos DOIS lados
     * e nada no protocolo avisa "o tile (x,y) mudou". Sem esse canal, o servidor
     * abriria a porta e o cliente continuaria desenhando fechada.
     */
    'e': T.DOOR_OPEN,
    '>': T.STONE_SLAB,
    '<': T.STONE_SLAB,
  };

  for (const a of ANDARES) {
    const camada = andarDe(a.floor);
    for (let ly = 0; ly < a.planta.length; ly++) {
      const linha = a.planta[ly]!;
      for (let lx = 0; lx < linha.length; lx++) {
        const x = a.x0 + lx, y = a.y0 + ly;
        if (!dentro(x, y)) continue;
        const c = linha[lx]!;
        /*
         * 🔴 Letra de MÓVEL vira `FURNITURE`: sólido, mas com o CHÃO desenhado
         * por baixo — o móvel em si é sprite por cima, no molde do `makeTree`.
         * Antes ele virava `wall_interior` e a cama aparecia como muro.
         *
         * ⚠️ Letra desconhecida cai em parede de propósito: errar a letra fecha
         * caminho em vez de abrir buraco, e caminho fechado o teste de rota pega.
         */
        const tile = TILE_DE[c] ?? (MOVEL_DA_LETRA[c] ? T.FURNITURE : T.WALL_INTERIOR);
        set(camada, x, y, tile);
      }
    }
  }

  const terreo = ANDARES.find((a) => a.arquivo === 'terreo');
  const superior = ANDARES.find((a) => a.arquivo === 'superior');

  if (terreo) {
    const saida = achaNaPlanta(terreo, 'e');
    if (saida) {
      // A soleira do lado de fora.
      if (dentro(PORTA_DA_CASA.x, PORTA_DA_CASA.y)) {
        set(ground, PORTA_DA_CASA.x, PORTA_DA_CASA.y, T.STONE);
      }
      /*
       * ⚠️ Entrando, o jogador pousa UM TILE ACIMA da soleira interna, não
       * sobre ela: pousar no próprio gatilho o devolveria para fora no passo
       * seguinte, e a casa viraria uma porta giratória.
       */
      links.push({
        x: PORTA_DA_CASA.x, y: PORTA_DA_CASA.y, fromFloor: 0,
        toX: saida.x, toY: saida.y - 1, toFloor: terreo.floor, kind: 'up',
      });
      links.push({
        x: saida.x, y: saida.y, fromFloor: terreo.floor,
        toX: VOLTA_DA_CASA.x, toY: VOLTA_DA_CASA.y, toFloor: 0, kind: 'down',
      });
    }
  }

  if (terreo && superior) {
    const sobe = achaNaPlanta(terreo, '>');
    const desce = achaNaPlanta(superior, '<');
    if (sobe && desce) {
      // Mesmo cuidado: pousa ao lado da escada, nunca em cima dela.
      links.push({
        x: sobe.x, y: sobe.y, fromFloor: terreo.floor,
        toX: desce.x, toY: desce.y + 3, toFloor: superior.floor, kind: 'up',
      });
      links.push({
        x: desce.x, y: desce.y, fromFloor: superior.floor,
        toX: sobe.x, toY: sobe.y - 1, toFloor: terreo.floor, kind: 'down',
      });
    }
  }
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

  /*
   * 🔴 **As cidades não são mais desenhadas.** As dez genéricas (praça + muralha
   * do `marcaCidade`) saíram por decisão do dono em 03/08 — *"estão mt feias"* —
   * e Lumindale saiu em 05/08, junto com muralha, portões e casas.
   *
   * A regra que ficou: cidade é lugar no mapa e no `regions.ts`, não desenho
   * gerado. Quando cada uma for desenhada de verdade, entra como mapa autoral do
   * Tiled (ver `tools/tmx2world.mjs`), não como retângulo procedural.
   *
   * `marcaCidade` continua no arquivo, sem chamador, de propósito: é a única
   * documentação executável de como o gerador desenhava cidade, e o custo de
   * mantê-la é zero.
   */
  const depotZone = limpaPracaSegura(ground);

  /*
   * 🔴 DEPOIS da praça, e a ordem importa: `limpaPracaSegura` sobrescreve tudo
   * com grama no raio 12, então pintar a casa antes dela a apagaria em silêncio.
   * A casa de teste está a 8 tiles do centro, ou seja dentro do raio.
   */
  pintaPredios(ground);
  /*
   * ⚠️ DEPOIS de `pintaPredios`: a soleira precisa sobrescrever a pegada se um
   * dia ela cair dentro dela. Hoje fica um tile ao sul, mas a ordem protege
   * contra a porta virar parede em silêncio se alguém mexer nos números.
   */
  /*
   * 🔴 Os andares da casa saem daqui, e podem ser MAIS de um.
   *
   * O mundo tinha só 0 (chão) e 1 (alto) porque o único usuário de andar — o
   * Depósito — foi apagado em 05/08. A casa de dois andares pediu um terceiro,
   * e `floors` é `Record<number, number[]>`: acrescentar é de graça. O cliente
   * já trata andar inexistente (`if (!map.floors[floor]) return`).
   */
  const porAndar = new Map<number, number[]>([[1, upper]]);
  escavaAndares(ground, porAndar, floorLinks);

  const floors: Record<number, number[]> = { 0: ground };
  for (const [n, camada] of porAndar) floors[n] = camada;

  return {
    id: 'elysia',
    name: 'Elysia',
    width: WIDTH,
    height: HEIGHT,
    floors,
    floorLinks,
    spawn: { ...WORLD_SPAWN },
    depotZone,
    npcs: WORLD_NPCS.map((n) => ({ ...n })),
  };
}

export { TILE_VOID };
