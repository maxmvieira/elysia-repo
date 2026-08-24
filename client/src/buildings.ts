/**
 * Carregador dos sprites de **PRÉDIO** (arte 2D isométrica gerada, recortada
 * para `client/public/assets/buildings/`).
 *
 * Irmão do [`trees.ts`](./trees.ts), e de propósito: prédio é decoração alta
 * como árvore, então ele reusa o mesmo `spritebox` (caixa de alpha medida),
 * a mesma âncora pelo pé e a mesma escala por **largura em tiles**. Nada de
 * sistema novo — o `makeTree` já provou que o caminho funciona.
 *
 * ## 🔴 ISTO É UM TESTE DE LEITURA VISUAL, e ainda não é o vilarejo
 *
 * O `HANDOFF` de 05/08 registra que o vilarejo de Lumindale foi **apagado**
 * esperando os packs de casa. Este arquivo põe **uma** casa num ponto fixo
 * dentro da praça segura, para responder a única pergunta que medição não
 * responde: **a casa isométrica lê bem sobre o chão quadrado do jogo?**
 *
 * ⚠️ O mundo de Elysia é **grade quadrada vista de cima**, não isométrico —
 * não existe uma linha de código isométrico no cliente. A casa, porém, foi
 * desenhada em projeção isométrica, então a base dela é um losango que não se
 * alinha ao quadriculado do piso. O Tibia desenha prédio em leve 3/4 sobre
 * chão quadrado e funciona; se aqui também funciona, só olhando.
 *
 * 🔴 **Não espalhe casa pelo mundo antes de o dono olhar esta.** Montar o
 * vilarejo mexe no `worldgen` e no `SAFE_ZONE_RADIUS`, que o `HANDOFF` marca
 * como coisa a não pegar sozinho.
 *
 * ## As duas armadilhas de sempre
 *
 * Valem aqui igual valem para árvore, e estão inteiras no `spritebox.ts`:
 * o PNG passa por **canvas 2D** (o `Assets.load` do Pixi pinta a
 * transparência de PRETO), e o `loadImage` espera `onload`, nunca
 * `img.decode()` (que em aba oculta não resolve nunca e trava o boot).
 *
 * Arquivo ausente devolve `null` e o mundo fica como sempre foi — arte é
 * opcional, como nas árvores e nos cristais.
 */

import { loadSpriteMedido, type SpriteMedido } from './spritebox.js';
// 🔴 A posição vem do SHARED, não daqui: o servidor usa a mesma lista para
// pintar a pegada sólida. Se o cliente tivesse a própria cópia, casa desenhada
// e casa com colisão poderiam sair de lugares diferentes.
import { PREDIOS, ANDARES, type AndarDef } from '@dominion/shared';

const BASE = '/assets/buildings';

/**
 * Largura de cada prédio, **em tiles**.
 *
 * 🔴 **É a largura do DESENHO, não a do arquivo** — a escala divide pela caixa
 * medida (`cheia`), exatamente como em `trees.ts`. Foi o erro que lá fez dois
 * aumentos seguidos entregarem metade do pedido.
 *
 * Calibragem, nas mesmas unidades que o `trees.ts` usa: a criatura tem **1,2
 * tile** na tela e o carvalho grande tem **4,2**. Uma casa de dois andares
 * precisa dominar a cena sem engolir a praça, cujo raio é 12 tiles. Em **7**
 * ela fica ~1,7× o carvalho e ocupa pouco mais de meio raio da praça.
 *
 * ⚠️ Este número é chute educado, não medição — é a primeira coisa a ajustar
 * depois de ver em tela.
 */
const LARGURA: Record<string, number> = {
  /*
   * 🔴 4 TILES, e o número sai de uma conta, não de gosto.
   *
   * A casa em pixel art tem 64 px de origem. A escala é
   * `(32 * largura) / 64`, ou seja `largura / 2` — então **só largura PAR dá
   * escala inteira**. Em 4 a escala é exatamente **2,0×**.
   *
   * ⚠️ Escala fracionária é o defeito que custou a sessão de 10/08: com
   * filtragem `nearest`, um pixel do desenho vira 2 na tela e o vizinho vira 3,
   * em faixas alternadas, e a silhueta sai picotada. Pedir 5 tiles aqui daria
   * 2,5× e traria o serrilhado de volta.
   *
   * ⚠️ A ilustrada aguentava 7 porque tinha 905 px de origem; esta não.
   */
  'casa-pixel': 4,
  'casa-2-andares': 7,
  /*
   * 🔴 7.48 e nao 7, e o numero sai de conta, nao de gosto.
   *
   * A versao de porta aberta NAO tem a mesma proporcao da fechada — 882x1121
   * contra 905x1228 — porque gerador de imagem nao repete enquadramento. Com a
   * mesma largura de 7 tiles ela sairia 19 px mais BAIXA, e a casa encolheria
   * na hora de abrir a porta.
   *
   * Igualando a ALTURA na tela (304 px nas duas) o salto vertical some; sobra
   * ~15 px a mais de largura, que incomoda muito menos.
   *   7 * (1228/905) / (1121/882) = 7.48
   *
   * ⚠️ Mesmo assim a troca "pula" um pouco: as duas casas nao sao a mesma arte.
   * O conserto de verdade seria a porta ser uma CAMADA sobre a casa, como as
   * armas viraram camada sobre o corpo em 12/08 — mas isso pede a porta
   * desenhada separada, que nao temos.
   */
  'casa-2-andares-aberta': 7.48,
};

/**
 * Qual arte usar quando o jogador esta perto da porta.
 *
 * 🔴 **VAZIO de proposito — a troca de sprite foi DESFEITA em 15/08.**
 *
 * A ideia era: perto da porta, troca a casa pela versao com a porta aberta. Em
 * tela o dono viu na hora o que o numero ja dizia e eu subestimei: *"foram
 * feitas duas casas diferentes"*. E eram mesmo — 882x1121 contra 905x1228,
 * telhado diferente, varanda do outro lado, janelas em outro lugar. Compensar a
 * altura tirou o pulo vertical e nao tirou o essencial: **o predio inteiro
 * trocava de identidade para a porta abrir**.
 *
 * ⚠️ Gerador de imagem NAO reproduz o mesmo desenho, nem com a descricao
 * repetida palavra por palavra. Isso ja estava escrito no `PROMPT-ARTE-*` para
 * personagem ("nao segura o mesmo personagem por 32 quadros") e vale igual para
 * predio.
 *
 * O caminho certo e a porta ser uma CAMADA sobre a casa — exatamente o que as
 * armas viraram sobre o corpo em 12/08, e pela mesma razao: o que muda tem de
 * ser desenhado separado do que fica. Precisa da porta desenhada sozinha, que
 * nao temos. Ate la a porta fica fechada na arte, e quem da o retorno de
 * "entrei" e a troca de andar.
 *
 * A arte da casa aberta fica em `arte-fonte/` e no `client/public`, sem uso —
 * serve de referencia para quando a porta virar camada.
 */
export const PORTA_ABERTA: Record<string, string> = {};

/** A quantos tiles da soleira a porta abre. */
export const RAIO_ABRIR = 3;

const LARGURA_PADRAO = 5;

/** A arte já medida, mais a largura pedida em tiles. */
export interface PredioSprite extends SpriteMedido {
  largura: number;
  /** O nome do PNG, para achar a variante de porta aberta. */
  arquivo: string;
}

const carregados = new Map<string, PredioSprite>();

/**
 * Carrega os prédios e os interiores. Devolve quantos arquivos entraram.
 *
 * Interior e prédio passam pelo mesmo cache e pelo mesmo `spritebox` — a
 * diferença entre eles é só ONDE são desenhados, não COMO são medidos.
 */
export async function loadBuildings(): Promise<number> {
  const pedidos: Array<{ arquivo: string; largura: number }> = [
    ...PREDIOS.map((p) => ({ arquivo: p.arquivo, largura: LARGURA[p.arquivo] ?? LARGURA_PADRAO })),
    // A variante de porta aberta, quando existir para aquele prédio.
    ...PREDIOS.flatMap((p) => {
      const aberta = PORTA_ABERTA[p.arquivo];
      return aberta ? [{ arquivo: aberta, largura: LARGURA[aberta] ?? LARGURA_PADRAO }] : [];
    }),
    // A largura do interior não vem daqui: ele é esticado sobre o retângulo
    // andável no `makeInterior`. O valor só preenche o campo do cache.
    
  ];
  for (const { arquivo, largura } of pedidos) {
    if (carregados.has(arquivo)) continue;
    const medido = await loadSpriteMedido(`${BASE}/${arquivo}.png`);
    if (!medido) continue; // ausente: o mundo segue sem ele
    carregados.set(arquivo, { ...medido, largura, arquivo });
  }
  console.log(`[buildings] ${carregados.size} de ${pedidos.length} carregados`);
  return carregados.size;
}

/** O prédio daquele arquivo, ou `null` se a arte não estiver no disco. */
export function predioSprite(arquivo: string): PredioSprite | null {
  return carregados.get(arquivo) ?? null;
}

/**
 * Os prédios cujo tile cai dentro do pedaço `[x0,x1) x [y0,y1)`.
 *
 * O `montaChunk` monta e destrói pedaços conforme a câmera anda, então o prédio
 * precisa nascer junto do pedaço que o contém — senão ele apareceria uma vez e
 * sumiria na primeira reciclagem.
 */
export function prediosNoPedaco(
  x0: number, y0: number, x1: number, y1: number, floor: number,
): Array<{ sprite: PredioSprite; x: number; y: number }> {
  const saida: Array<{ sprite: PredioSprite; x: number; y: number }> = [];

  // 🔴 O prédio visto de FORA só existe no andar 0. Sem este filtro a casa
  // seria desenhada por cima do cômodo quando o jogador entrasse.
  if (floor === 0) {
    for (const { arquivo, x, y } of PREDIOS) {
      if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
      const sprite = carregados.get(arquivo);
      if (sprite) saida.push({ sprite, x, y });
    }
  }

  return saida;
}

/**
 * Os INTERIORES do pedaço, para desenhar na camada de PISO.
 *
 * 🔴 **Interior vai no piso, e prédio vai nos altos — e a diferença é o
 * jogador.** Na primeira versão o cômodo era desenhado junto das árvores e
 * casas, ordenado por `zIndex = y`: com o cômodo ancorado na borda sul (y=153)
 * e o jogador andando no meio dele (y=150), o cômodo ganhava e desenhava POR
 * CIMA — o dono viu isso como *"o personagem anda embaixo"*.
 *
 * No piso não há disputa: tudo que é objeto (jogador, criatura, item) desenha
 * depois, então o jogador anda SEMPRE sobre o assoalho.
 *
 * ⚠️ O preço é que as paredes do fundo também ficam sob o jogador. Num cômodo
 * deste tamanho ele está quase sempre à frente delas, então quase nunca
 * aparece; quando aparecer, o conserto é partir a arte em duas camadas (piso e
 * parede) e devolver só a parede para os altos.
 */
export function andaresNoPedaco(
  x0: number, y0: number, x1: number, y1: number, floor: number,
): Array<{ sprite: PredioSprite; a: AndarDef }> {
  const saida: Array<{ sprite: PredioSprite; a: AndarDef }> = [];
  for (const a of ANDARES) {
    if (a.floor !== floor) continue;
    // Ancorado pelo canto noroeste: é o pedaço que cria a planta.
    if (a.x0 < x0 || a.x0 >= x1 || a.y0 < y0 || a.y0 >= y1) continue;
    const sprite = carregados.get(a.arquivo);
    if (sprite) saida.push({ sprite, a });
  }
  return saida;
}
