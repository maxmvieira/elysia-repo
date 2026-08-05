/**
 * Carregador dos sprites de **ÁRVORE** (pack top-down da CraftPix, recortado
 * para `client/public/assets/trees/craftpix/`).
 *
 * Substitui o desenho por código do `makeBlock` — círculos de folhagem sobre um
 * retângulo de tronco — que era placeholder desde o começo do projeto.
 *
 * ## O sorteio é POR BIOMA, não geral
 *
 * O pack traz palmeira, árvore de neve e árvore queimada, e o mundo de Elysia já
 * tem deserto, Northland e Terras Amaldiçoadas. Espalhar carvalho em tudo
 * desperdiçaria o pack e faria o deserto parecer campo.
 *
 * O bioma sai do **tile de chão embaixo da árvore** (`chaoSobTileAlto`), que o
 * `montaChunk` já calcula para desenhar o piso. Não custa consulta nova e não
 * inventa fonte de verdade: o chão já é derivado das regiões.
 *
 * | Chão | Conjunto | O que entra |
 * |---|---|---|
 * | areia | `desert` | 4 palmeiras |
 * | neve | `snow` | 4 coníferas nevadas |
 * | cinza · amaldiçoado · pântano | `dead` | queimadas e quebradas |
 * | o resto (grama, selva, terra, rocha) | `temperate` | 10 folhosas sortidas |
 *
 * ## 🔴 Duas armadilhas que já custaram caro neste projeto
 *
 * 1. **Passa por canvas 2D, não por `Assets.load`.** O caminho normal do Pixi 8
 *    (ImageBitmap) renderiza as áreas transparentes destes PNGs como **PRETO**.
 *    Foi literalmente o bug do quadrado preto em volta das árvores, e é por causa
 *    dele que a versão anterior deste arquivo ficou com os sprites DESLIGADOS.
 * 2. **`loadImage` espera `onload`, nunca `img.decode()`.** Em aba de segundo
 *    plano o Chrome adia a decodificação e a promessa do `decode()` não resolve
 *    nunca — o jogo fica na tela preta para sempre, sem erro no console.
 *
 * Se os arquivos faltarem, `treeTexFor` devolve `null` e o `montaChunk` cai no
 * `makeBlock` de antes. Arte continua opcional.
 */

import { loadSpriteMedido, type SpriteMedido } from './spritebox.js';

const BASE = '/assets/trees/craftpix';

/**
 * O bolo de sorteio de cada bioma.
 *
 * 🔴 **Nome repetido é PESO, não descuido.** A primeira versão sorteava 10
 * variantes por igual, e o resultado em tela foi uma floresta cor-de-rosa:
 * outono e florida somavam 40% das árvores. Numa mata de verdade a cor é
 * *acento* — uma árvore vermelha entre sete verdes chama atenção; sete vermelhas
 * não chamam nada.
 *
 * Assim o balanço fica visível aqui, em vez de escondido em quantos arquivos
 * cada família tem no disco.
 */
const CONJUNTOS = {
  /*
   * 🔴 **Poucos modelos por bioma, de propósito** (pedido do dono vendo em
   * tela). A versão anterior sorteava 13 espécies na mata temperada — carvalho,
   * musgo, frutífera, outono, florida, tronco caído — e o resultado não foi
   * "variedade", foi ruído: nenhuma forma se repetia o bastante para o olho
   * aprender o lugar. Mata de verdade é uma ou duas espécies dominantes.
   *
   * Aqui é o carvalho grande e o pequeno, e só. A variação de TAMANHO faz o
   * trabalho que a variação de espécie fazia mal.
   */
  temperate: ['oak_big', 'oak1', 'oak1'],
  // Deserto: palmeira grande, duas pequenas e um arbusto — nada mais cresce lá.
  desert: ['palm_big1', 'palm1', 'palm2', 'bush'],
  snow: ['snow_big', 'snow1', 'snow1'],
  dead: ['burned_big', 'burned1', 'burned1'],
} as const;

type Conjunto = keyof typeof CONJUNTOS;

/**
 * Largura de cada árvore, **em tiles**.
 *
 * 🔴 Tamanho variado não é enfeite, é a correção de dois problemas de uma vez.
 *
 * O primeiro foi relatado vendo em tela: *"as árvores estão menores que os
 * monstros"*. E estavam — criatura é sprite de 16 px com `scale: 2.4`, ou seja
 * **38 px**, enquanto a árvore tinha 50 px de moldura com a copa ocupando só
 * parte dela. Árvore menor que o bicho que mora nela quebra a leitura da cena.
 *
 * O segundo é que uma floresta com todas as árvores do mesmo tamanho parece
 * papel de parede. Mata de verdade tem carvalho velho e árvore nova.
 *
 * 🔴 **É a largura da COPA, não a do arquivo.** A escala divide pela caixa
 * medida (`ArvoreSprite.cheia`), então o número aqui é o que se vê na tela.
 * Antes ele mirava a moldura do PNG, e como a copa ocupa cerca de metade do
 * arquivo, todo valor entregava metade do pedido — foi por isso que a árvore
 * continuou parecendo pequena mesmo depois de dois aumentos.
 *
 * Para calibrar: **a criatura tem 38 px na tela** (sprite de 16 px com
 * `scale: 2.4`), ou seja 1.2 tile. A árvore pequena em 2.0 fica ~1.7× o bicho,
 * e a grande em 3.0 fica ~2.5×.
 *
 * A invariante do `worldgen` — decoração nunca encosta em decoração — garante
 * 2 tiles de centro a centro. As grandes (3.0) portanto **se sobrepõem**, e isso
 * é desejado: copa encavalada é o que faz mata parecer mata. A ordem por
 * `zIndex = y` mantém quem está à frente na frente.
 *
 * ⚠️ O preço de escalar pela copa é que o fator deixa de ser inteiro, então a
 * pixel art não sai mais 1:1. Vale: tamanho errado na tela incomoda muito mais
 * do que um pixel desigual na borda da folhagem.
 */
const LARGURA: Record<string, number> = {
  oak_big: 4.2, moss_big: 4.2, palm_big1: 4.2, snow_big: 4.2, burned_big: 4.2,
  // Arbusto é vegetação rasteira, não árvore: fica menor que a criatura.
  bush: 1.2,
};

/** Quem não está em `LARGURA`: copa de 2.8 tiles. */
const LARGURA_PADRAO = 2.8;

/**
 * id do tile de CHÃO (ver `TILE_TYPES` em shared/tiles.ts) -> conjunto.
 *
 * Quem não está aqui cai em `temperate`, e isso é proposital: chão novo que
 * apareça no futuro nasce com árvore folhosa em vez de sumir do mapa.
 */
const CHAO_CONJUNTO: Record<number, Conjunto> = {
  8: 'desert', // sand
  9: 'snow', // snow
  11: 'dead', // ash (vulcânico)
  13: 'dead', // swamp
  14: 'dead', // cursed_ground
};

/** Uma entrada do bolo: a arte já medida, mais a largura de copa pedida. */
export interface ArvoreSprite extends SpriteMedido {
  /** Largura da COPA em tiles — ver `LARGURA`. */
  largura: number;
}

const carregados = new Map<Conjunto, ArvoreSprite[]>();


/**
 * Carrega os quatro conjuntos. Devolve quantos ARQUIVOS distintos entraram.
 *
 * Cada arquivo é lido uma vez só, mesmo aparecendo várias vezes no bolo de
 * sorteio: o cache é por nome, e o bolo guarda referências para a mesma textura.
 * Sem isso, dar peso a uma árvore custaria memória de vídeo proporcional ao
 * peso, que seria o jeito mais bobo de vazar textura.
 */
export async function loadTrees(): Promise<number> {
  const cache = new Map<string, SpriteMedido>();

  for (const [nome, bolo] of Object.entries(CONJUNTOS) as Array<[Conjunto, readonly string[]]>) {
    const sprites: ArvoreSprite[] = [];
    for (const arquivo of bolo) {
      let t = cache.get(arquivo);
      if (!t) {
        const carregada = await loadSpriteMedido(`${BASE}/${arquivo}.png`);
        if (!carregada) continue; // arquivo ausente: só sai do bolo
        cache.set(arquivo, carregada);
        t = carregada;
      }
      sprites.push({ ...t, largura: LARGURA[arquivo] ?? LARGURA_PADRAO });
    }
    if (sprites.length) carregados.set(nome, sprites);
  }

  console.log(
    `[trees] ${cache.size} arquivos carregados — ` +
    [...carregados].map(([k, v]) => `${k}:${v.length} sorteios`).join(' '),
  );
  return cache.size;
}

/**
 * Escolhe uma variante de forma **estável** para a célula (x,y).
 *
 * 🔴 Estável importa mais do que parece: `montaChunk` monta e destrói pedaços
 * conforme a câmera anda, então a mesma árvore é recriada toda vez que o jogador
 * volta. Sorteio aleatório faria a floresta *mudar de forma* pelas costas dele.
 */
export function treeIndexFor(x: number, y: number, n: number): number {
  const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  return h % n;
}

/**
 * A árvore que nasce em (x,y) — textura e largura —, dado o chão embaixo dela.
 *
 * `null` quando o pack não está no disco: o chamador cai no desenho por código.
 */
export function treeTexFor(chaoId: number, x: number, y: number): ArvoreSprite | null {
  const conjunto = CHAO_CONJUNTO[chaoId] ?? 'temperate';
  const sprites = carregados.get(conjunto) ?? carregados.get('temperate');
  if (!sprites?.length) return null;
  return sprites[treeIndexFor(x, y, sprites.length)]!;
}
