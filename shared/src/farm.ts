/**
 * A **fazenda** — o primeiro mapa autoral de Elysia a entrar no mundo.
 *
 * ## 🔴 Por que a fazenda é carimbada e não gerada
 *
 * O `worldgen.ts` desenha o mundo por regra: bioma pinta chão, decoração
 * espalha árvore. Isso serve para 300×300 de natureza e **não serve para lugar
 * feito à mão** — a lição de 03/08, quando as dez cidades genéricas saíram por
 * serem "mt feias". A regra que ficou: *cidade é mapa autoral do Tiled, não
 * retângulo procedural.* A fazenda é a primeira a cumprir isso.
 *
 * ## O que este módulo faz, e o que ele deliberadamente NÃO faz
 *
 * Ele carimba **colisão**, não arte: `WALL_WOOD` nas paredes e cercas, `WATER`
 * no lago, `DIRT` no resto. Com isso, tudo que o motor já sabe fazer passa a
 * funcionar na fazenda de graça — andar, achar caminho, mirar, o mapa da tecla
 * M, monstro não atravessar parede.
 *
 * 🔴 **A arte bonita não passa por aqui, e é essa a decisão central.** Ela vive
 * em `client/public/assets/farm/` e só o cliente carrega. Assim a invariante do
 * `worldgen.ts` continua de pé: *terreno não trafega pela rede; os dois lados
 * calculam o mesmo mundo.* Servidor e cliente leem esta mesma colisão do mesmo
 * JSON e chegam ao mesmo resultado; o servidor nem sabe que existe um moinho
 * desenhado ali.
 *
 * ⚠️ O JSON é **gerado** por `npm run farm:build` a partir do `Farm.tmx`. Editar
 * à mão é trabalho perdido — a próxima conversão apaga.
 */

import farmJson from '../data/world/farm.json' with { type: 'json' };
import { foiApagada } from './worldedit.js';

/** Os mesmos ids de `tiles.ts`. Repetidos aqui pelo mesmo motivo do `worldgen`. */
const T = { GRASS: 1, DIRT: 2, STONE: 3, WATER: 4, WALL_WOOD: 6 } as const;

export interface FarmSpawn {
  type: string;
  /** Já em coordenadas do MUNDO, não da fazenda. */
  x: number;
  y: number;
}

export interface FarmPorta {
  nome: string;
  /** Células-gatilho, em coordenadas do mundo. */
  celulas: { x: number; y: number }[];
}

/** Canto noroeste da fazenda no mundo de 300×300. */
export const FARM_ORIGEM = farmJson.origem as { x: number; y: number };
export const FARM_LARGURA = farmJson.largura as number;
export const FARM_ALTURA = farmJson.altura as number;

/** Retângulo inclusivo que a fazenda ocupa no mundo. */
export const FARM_AREA = {
  x0: FARM_ORIGEM.x,
  y0: FARM_ORIGEM.y,
  x1: FARM_ORIGEM.x + FARM_LARGURA - 1,
  y1: FARM_ORIGEM.y + FARM_ALTURA - 1,
};

const MAPA = farmJson.mapa as string[];

/**
 * 🔴 **Quem desenha cada célula: a fazenda ou o motor.** `#` fazenda, `.` motor.
 *
 * Nasceu de dois defeitos que o dono relatou em 30/08 e que são o mesmo defeito
 * visto de dois lados:
 *
 * - *"faixa preta em volta da fazenda"* — o cliente desliga o desenho por regra
 *   dentro do retângulo da fazenda, e onde a arte não cobria não sobrava nada.
 * - *"o verde da fazenda está diferente do resto do mapa"* — a grama do pack é
 *   `rgb(160,179,90)`, bem mais clara que a do mundo, e a fazenda virava um
 *   retalho colado sobre o campo.
 *
 * A resposta é a mesma para os dois: **a fazenda não desenha chão nu.** Célula
 * de grama chapada sai da arte assada, é marcada `.` aqui, e o motor volta a
 * desenhá-la com a textura de todo o resto do mundo. A borda da fazenda deixa de
 * ser uma linha reta e dissolve no campo.
 */
const ARTE = farmJson.arte as string[];

/**
 * 🔴 O JSON é gerado, mas **confiar nele sem conferir seria o erro clássico**:
 * um `farm:build` interrompido no meio deixa um arquivo curto, e o carimbo sairia
 * com meia fazenda sem ninguém notar. Estoura no boot, dos dois lados.
 */
for (const [nome, grade] of [['mapa', MAPA], ['arte', ARTE]] as const) {
  if (grade.length !== FARM_ALTURA) {
    throw new Error(`farm.json: "${nome}" tem ${grade.length} linhas para altura ${FARM_ALTURA} — rode npm run farm:build`);
  }
  for (const [i, linha] of grade.entries()) {
    if (linha.length !== FARM_LARGURA) {
      throw new Error(`farm.json: "${nome}" linha ${i} tem ${linha.length} colunas, esperado ${FARM_LARGURA}`);
    }
  }
}

/** Os bichos do curral, já em coordenadas do mundo. */
export const FARM_BICHOS: FarmSpawn[] = (farmJson.bichos as { type: string; x: number; y: number }[])
  .map((b) => ({ type: b.type, x: b.x + FARM_ORIGEM.x, y: b.y + FARM_ORIGEM.y }));

/** As portas das construções, já em coordenadas do mundo. */
export const FARM_PORTAS: FarmPorta[] = (farmJson.portas as FarmPorta[])
  .map((p) => ({
    nome: p.nome,
    celulas: p.celulas.map((c) => ({ x: c.x + FARM_ORIGEM.x, y: c.y + FARM_ORIGEM.y })),
  }));

/** Uma célula do mundo está dentro da fazenda? */
export function dentroDaFarm(x: number, y: number): boolean {
  return x >= FARM_AREA.x0 && x <= FARM_AREA.x1 && y >= FARM_AREA.y0 && y <= FARM_AREA.y1;
}

/**
 * 🔴 **A fazenda desenha esta célula?** É o que o cliente pergunta antes de
 * desligar o desenho por regra — e a pergunta certa é esta, não `dentroDaFarm`.
 *
 * Usar `dentroDaFarm` foi o erro que produziu a faixa preta: o retângulo da
 * fazenda é maior que a arte dela, e desligar o motor num lugar onde a fazenda
 * também não desenha deixa o chão vazio.
 *
 * 🔴 **Célula apagada pelo `/remove` também sai daqui**, e é o que faz a
 * ferramenta de autoria funcionar dentro da fazenda: sem isto, apagar a árvore
 * do pomar trocaria o TILE (a colisão sumiria) e a arte assada continuaria
 * desenhando a árvore — um fantasma sólido ao contrário, atravessável e
 * visível. O cliente ainda tem de furar o PNG (`farmart.ts`), mas quem manda o
 * motor voltar a pintar o chão ali é esta linha.
 *
 * ⚠️ **`foiApagada` e não `foiEditada`**, e a diferença é o `/paste`: célula
 * que RECEBEU arte copiada continua sendo desenhada pela fazenda, com os pixels
 * novos. Trocar uma pela outra apagaria justamente o que se acabou de colar.
 */
export function farmDesenhaCelula(x: number, y: number): boolean {
  if (!dentroDaFarm(x, y)) return false;
  if (foiApagada(0, x, y)) return false;
  return ARTE[y - FARM_AREA.y0]![x - FARM_AREA.x0] === '#';
}

// ---------------------------------------------------------------------------
// Interiores
// ---------------------------------------------------------------------------

export interface FarmInterior {
  nome: string;
  origem: { x: number; y: number };
  andar: number;
  largura: number;
  altura: number;
  /** Retângulo inclusivo no andar interno. */
  area: { x0: number; y0: number; x1: number; y1: number };
}

interface InteriorJson {
  nome: string;
  origem: { x: number; y: number };
  andar: number;
  largura: number;
  altura: number;
  mapa: string[];
}

const INTERIORES_JSON = farmJson.interiores as InteriorJson[];

/**
 * 🔴 **Os interiores estreiam o andar 1 do motor.**
 *
 * `floors` e `floorLinks` existem desde sempre e estão **sem uso desde
 * 2026-08-05**, quando o vilarejo de Lumindale foi apagado e levou junto o
 * segundo andar do Depósito — a única escada do mundo aberto. O handoff
 * registrou que "a próxima dungeon vai estreá-lo sem rede de proteção". Quem
 * estreia é a fazenda, e num caso bem mais simples que uma dungeon.
 *
 * ⚠️ Os dois interiores ficam em cantos do andar 1 **sem relação com a posição
 * do prédio no andar 0** — não há como encaixar uma casa de 26×20 debaixo de um
 * telhado de 9×6. Isso é invisível para o jogador: trocar de andar já
 * reposiciona a câmera.
 */
export const FARM_INTERIORES: FarmInterior[] = INTERIORES_JSON.map((i) => ({
  nome: i.nome,
  origem: i.origem,
  andar: i.andar,
  largura: i.largura,
  altura: i.altura,
  area: {
    x0: i.origem.x, y0: i.origem.y,
    x1: i.origem.x + i.largura - 1,
    y1: i.origem.y + i.altura - 1,
  },
}));

/** Em que interior esta célula cai, se em algum. */
export function interiorEm(x: number, y: number, floor: number): FarmInterior | undefined {
  return FARM_INTERIORES.find(
    (i) => i.andar === floor
      && x >= i.area.x0 && x <= i.area.x1 && y >= i.area.y0 && y <= i.area.y1,
  );
}

/**
 * Carimba os interiores no andar de cima.
 *
 * ⚠️ O andar 1 começa inteiro em `VOID`, que é **sólido** — então só é preciso
 * abrir o que é andável. O lado de fora do interior continua void, e isso é o
 * certo: quem escapasse de um interior cairia no nada, e não há como escapar.
 */
export function carimbaInteriores(andares: Record<number, number[]>, larguraDoMundo: number): void {
  for (const [k, def] of INTERIORES_JSON.entries()) {
    const camada = andares[def.andar];
    if (!camada) throw new Error(`farm: o andar ${def.andar} não existe no mapa`);
    if (def.mapa.length !== def.altura) {
      throw new Error(`farm.json: interior "${def.nome}" tem ${def.mapa.length} linhas, esperado ${def.altura}`);
    }
    for (let y = 0; y < def.altura; y++) {
      const linha = def.mapa[y]!;
      for (let x = 0; x < def.largura; x++) {
        if (linha[x] !== '.') continue; // só o andável é aberto
        const mx = def.origem.x + x;
        const my = def.origem.y + y;
        camada[my * larguraDoMundo + mx] = T.STONE;
      }
    }
    void k;
  }
}

export interface FarmLigacao {
  nome: string;
  /** Gatilhos no andar 0 (portas), em coordenadas do mundo. */
  entradas: { x: number; y: number }[];
  /** Onde o jogador pousa DENTRO, no andar do interior. */
  pousoDentro: { x: number; y: number; floor: number };
  /** Gatilho de saída, dentro. */
  saidaDentro: { x: number; y: number; floor: number };
  /** Onde ele pousa ao sair, no andar 0. */
  pousoFora: { x: number; y: number; floor: number };
}

interface LigacaoJson {
  nome: string;
  entradas: { x: number; y: number }[];
  pousoDentro: { x: number; y: number };
  saidaDentro: { x: number; y: number };
  pousoFora: { x: number; y: number };
}

/**
 * As ligações porta ↔ interior, já em coordenadas do mundo.
 *
 * 🔴 **Só o celeiro e a casa têm interior** — existem quatro portas desenhadas e
 * dois mapas de interior no pack. A porta do moinho e a do galinheiro continuam
 * abrindo (a animação é da porta, não do que há atrás dela) e não levam a lugar
 * nenhum. Inventar um interior para elas seria pior: sair de uma torre de pedra
 * dentro de um celeiro de madeira quebra a ilusão mais alto do que uma porta que
 * só range.
 */
export const FARM_LIGACOES: FarmLigacao[] = (farmJson.ligacoes as LigacaoJson[]).map((l) => {
  const interior = FARM_INTERIORES.find((i) => i.nome === l.nome);
  if (!interior) throw new Error(`farm.json: ligação "${l.nome}" sem interior correspondente`);
  return {
    nome: l.nome,
    entradas: l.entradas.map((c) => ({ x: c.x + FARM_ORIGEM.x, y: c.y + FARM_ORIGEM.y })),
    pousoDentro: {
      x: l.pousoDentro.x + interior.origem.x,
      y: l.pousoDentro.y + interior.origem.y,
      floor: interior.andar,
    },
    saidaDentro: {
      x: l.saidaDentro.x + interior.origem.x,
      y: l.saidaDentro.y + interior.origem.y,
      floor: interior.andar,
    },
    pousoFora: { x: l.pousoFora.x + FARM_ORIGEM.x, y: l.pousoFora.y + FARM_ORIGEM.y, floor: 0 },
  };
});

/**
 * As ligações no formato que `GameMap.floorLinks` espera.
 *
 * ⚠️ **Toda célula da porta é gatilho**, não só o meio: o portão do celeiro tem
 * 12 células e o jogador pode encostar em qualquer uma. Uma porta larga com um
 * gatilho só é uma porta que às vezes não funciona, e ninguém descobriria por
 * quê.
 */
export function farmFloorLinks(): Array<{
  x: number; y: number; fromFloor: number;
  toX: number; toY: number; toFloor: number; kind: 'up' | 'down';
}> {
  const links = [];
  for (const l of FARM_LIGACOES) {
    for (const e of l.entradas) {
      links.push({
        x: e.x, y: e.y, fromFloor: 0,
        toX: l.pousoDentro.x, toY: l.pousoDentro.y, toFloor: l.pousoDentro.floor,
        kind: 'up' as const,
      });
    }
    links.push({
      x: l.saidaDentro.x, y: l.saidaDentro.y, fromFloor: l.saidaDentro.floor,
      toX: l.pousoFora.x, toY: l.pousoFora.y, toFloor: l.pousoFora.floor,
      kind: 'down' as const,
    });
  }
  return links;
}

/**
 * Carimba a fazenda na camada de chão do mundo.
 *
 * ⚠️ **Tem que rodar DEPOIS da decoração.** O `espalhaDecoracao` planta árvore
 * por regra em cima de qualquer grama, e rodar antes dele encheria o moinho de
 * pinheiros — o mesmo motivo pelo qual `limpaPracaSegura` também vem no fim.
 */
export function carimbaFarm(ground: number[], larguraDoMundo: number): void {
  for (let y = 0; y < FARM_ALTURA; y++) {
    const linha = MAPA[y]!;
    for (let x = 0; x < FARM_LARGURA; x++) {
      const mx = FARM_ORIGEM.x + x;
      const my = FARM_ORIGEM.y + y;
      /*
       * 🔴 `g` e `.` são os dois **andáveis**, e a diferença entre eles não é
       * colisão: é o chão. `g` é gramado — as bordas da fazenda e o piso dos
       * currais, repintados no `farm:build` com a MESMA textura de grama do
       * resto do mundo. `.` é a terra dos canteiros, que continua sendo a
       * lavoura desenhada pelo pack.
       *
       * ⚠️ A distinção importa em dois lugares: no **mapa da tecla M**, onde a
       * fazenda inteira como terra batida seria uma mancha marrom errada; e
       * onde a arte deixa buraco (`ARTE === '.'`), porque ali quem desenha é o
       * `desenhaChao` do cliente e ele pinta pelo tipo do tile.
       */
      const c = linha[x];
      ground[my * larguraDoMundo + mx] = c === '#' ? T.WALL_WOOD
        : c === '~' ? T.WATER
          : c === 'g' ? T.GRASS
            : T.DIRT;
    }
  }
}
