/**
 * **Edições de mundo** — o mecanismo por trás do `/remove`.
 *
 * ## 🔴 O problema, e por que ele não é óbvio
 *
 * O `worldgen.ts` tem uma invariante que sustenta o jogo inteiro: *terreno não
 * trafega pela rede; os dois lados calculam o mesmo mundo a partir dos mesmos
 * dados.* Um comando que **apaga uma árvore** parece violar isso de frente — se
 * o mundo é uma função pura da semente, nada nele pode mudar.
 *
 * A saída é não mexer na função: `buildWorldMap()` continua determinístico, e as
 * edições são uma **lista curta aplicada por cima**, do mesmo jeito que a
 * fazenda é carimbada por cima. A invariante que importa continua de pé — os
 * dois lados chegam ao mesmo mapa a partir da mesma origem — só que a origem
 * agora tem duas partes: a semente e as edições.
 *
 * ⚠️ **A diferença é de ESCALA, e ela é o argumento.** O mundo tem 90.000
 * tiles; a lista de edições tem dezenas. Mandar dezenas de tiles no login não é
 * "streamar terreno", é a mesma ordem de grandeza do `farm.json`. Se um dia essa
 * lista crescer para milhares, esta decisão precisa ser revista — e o lugar de
 * revisá-la é aqui.
 *
 * ## 🔴 Onde a lista mora: no BANCO, não em `shared/data/`
 *
 * O reflexo seria pôr um `edits.json` ao lado do `farm.json`. **Não funciona**, e
 * a razão foi vista em tela nesta mesma sessão: `shared/data/` está sob o
 * observador do `tsx watch` e do Vite, e um `farm.json` regravado **derrubou e
 * subiu o servidor** e recarregou a página. Com o arquivo lá, cada `/remove`
 * custaria um restart e a queda de todo mundo que estivesse online — num comando
 * cujo propósito é ajustar o cenário **enquanto se joga**.
 *
 * Então: SQLite (`world_edit`, migração v6), que já é onde o estado do servidor
 * vive e que ninguém observa. O cliente recebe a lista no login e as mudanças ao
 * vivo, por `S2C_WorldEdit`.
 */

/** Uma célula editada. `tile` é o tipo que passou a valer ali. */
export interface WorldEdit {
  floor: number;
  x: number;
  y: number;
  /** O tipo de tile que passou a valer. */
  tile: number;
  /**
   * O tipo que estava lá antes. É o que o `/undo` devolve.
   *
   * ⚠️ Opcional porque quem lê a lista (o cliente) não precisa dele: para
   * desenhar basta saber o que vale AGORA. Quem desfaz é o servidor.
   */
  antes?: number;
  /**
   * 🔴 **De qual célula da fazenda a ARTE foi carimbada aqui** (coordenadas do
   * mundo). É o que o `/paste` acrescenta ao `/remove`.
   *
   * A distinção entre "editada" e "apagada" mora neste campo, e ela é o miolo:
   *
   * - **sem `arte`** → a célula foi APAGADA. A fazenda para de desenhar ali e o
   *   motor volta a pintar o chão do bioma. É o `/remove`.
   * - **com `arte`** → a célula recebeu a arte de OUTRA célula. A fazenda
   *   continua desenhando ali, com pixels copiados. É o `/paste`.
   *
   * ⚠️ Só faz sentido entre células dentro da fazenda, porque só ela tem arte
   * própria. Colar de fora (ou para fora) copia apenas o TIPO DE TILE, e quem
   * desenha é o motor.
   */
  arte?: { x: number; y: number };
}

/**
 * 🔴 **Um OBJETO POSICIONADO à mão pelo construtor de mapas** (a tecla E).
 *
 * ## Por que não é uma edição de tile
 *
 * `WorldEdit` troca o TIPO de uma célula: o motor passa a desenhar grama em vez
 * de árvore. Serve para apagar e para clonar, e não serve para **compor**: um
 * tipo de tile por célula, sem sobreposição e sem giro.
 *
 * O que o dono pediu em 31/08 é outra coisa — *"escolher os sprites, girar 90°,
 * posicionar... escolher o nível, para deixar a hélice por cima dos objetos ou
 * um objeto embaixo da árvore"*. Isso é um **decalque**: um desenho colado numa
 * célula, com giro e com ALTURA própria, que não substitui nada e pode se
 * empilhar com outros.
 *
 * ## As três alturas, e por que exatamente três
 *
 * Elas não são um número escolhido: são os três lugares que já existem na pilha
 * de containers do cliente, e cada um resolve um pedido diferente do dono.
 *
 * | `camada` | onde entra | para quê |
 * |---|---|---|
 * | `chao` | sob a arte da fazenda | remendar terreno sem cobrir o que está em cima |
 * | `baixo` | sobre a fazenda, sob o jogador | o caso comum: um objeto no chão |
 * | `acima` | sobre tudo, inclusive o jogador | *"a hélice por cima dos objetos"* |
 *
 * ⚠️ **O `paleta` é um ÍNDICE na folha assada**, não um id de tile do Tiled. Ele
 * só faz sentido junto do `farm-paleta.png` que o `farm:build` gerou. Reordenar a
 * paleta troca o desenho de tudo que já foi posicionado — por isso o conversor
 * emite os grupos em ordem estável e novos entram sempre no fim.
 */
export interface WorldDecal {
  id: number;
  floor: number;
  x: number;
  y: number;
  /** Índice na folha `farm-paleta.png`. */
  paleta: number;
  /** Giro em graus: 0, 90, 180 ou 270. */
  rot: number;
  camada: 'chao' | 'baixo' | 'acima';
  /**
   * 🔴 **O que esta peça faz com o PASSO de quem chega nela.**
   *
   * Relato do dono em 31/08: *"tem peças que eu coloco que o herói atravessa,
   * tipo uma parede ou um barranco"*. E atravessava: decalque é desenho, e
   * desenho não para ninguém — a colisão do mundo mora no TIPO DE TILE, num
   * lugar completamente separado.
   *
   * | valor | o que faz no tile |
   * |---|---|
   * | `nada` (padrão) | nenhum — a peça é só enfeite |
   * | `bloqueia` | vira `WALL_WOOD`: ninguém passa, e o mapa da tecla M mostra |
   * | `livre` | vira o chão do bioma: **abre** passagem onde havia parede |
   *
   * ⚠️ `livre` não é enfeite da lista: é como se tira a parede invisível que
   * sobrou de arte antiga — o caso das pás sólidas do moinho.
   *
   * ⚠️ Quem cria a colisão é uma `WorldEdit` gêmea, gravada junto. O `/undo` do
   * decalque desfaz as duas, senão sobraria parede invisível sem nada em cima.
   */
  colisao?: 'nada' | 'bloqueia' | 'livre';
}

/** As alturas válidas, na ordem em que aparecem na tela (de baixo para cima). */
export const CAMADAS_DECALQUE = ['chao', 'baixo', 'acima'] as const;

export function camadaValida(c: string): c is WorldDecal['camada'] {
  return (CAMADAS_DECALQUE as readonly string[]).includes(c);
}

export const COLISOES_DECALQUE = ['nada', 'bloqueia', 'livre'] as const;

export function colisaoValida(c: string): c is NonNullable<WorldDecal['colisao']> {
  return (COLISOES_DECALQUE as readonly string[]).includes(c);
}

/** Normaliza qualquer número para um dos quatro giros. */
export function giroValido(r: number): number {
  const n = ((Math.round(r / 90) % 4) + 4) % 4;
  return n * 90;
}

/**
 * As células editadas, por `andar:x,y`. Módulo com estado, como o `farm.ts` —
 * é lido no laço de desenho do cliente, que roda por tile e não pode receber a
 * lista por parâmetro em cada chamada.
 */
const editadas = new Map<string, WorldEdit>();

export function chaveEdicao(floor: number, x: number, y: number): string {
  return `${floor}:${x},${y}`;
}

/** Esta célula foi editada por alguém? */
export function foiEditada(floor: number, x: number, y: number): boolean {
  return editadas.has(chaveEdicao(floor, x, y));
}

/**
 * 🔴 **Esta célula foi APAGADA** — editada e sem arte carimbada por cima.
 *
 * É a pergunta que o `farmDesenhaCelula` faz, e ela não é a mesma que
 * `foiEditada`. Confundir as duas apagaria a arte que o `/paste` acabou de
 * colar: a célula está editada, sim, mas ela TEM desenho — o desenho copiado.
 */
export function foiApagada(floor: number, x: number, y: number): boolean {
  const e = editadas.get(chaveEdicao(floor, x, y));
  return e !== undefined && e.arte === undefined;
}

/** De qual célula veio a arte carimbada aqui, se veio de alguma. */
export function arteCopiadaEm(
  floor: number, x: number, y: number,
): { x: number; y: number } | undefined {
  return editadas.get(chaveEdicao(floor, x, y))?.arte;
}

export function edicoesConhecidas(): WorldEdit[] {
  return [...editadas.values()];
}

/**
 * Registra edições na tabela de consulta. **Não** mexe no mapa — quem faz isso é
 * `aplicaEdicoes`, e os dois passos são separados porque o servidor aplica no
 * boot (quando o mapa existe) e o cliente aplica ao receber (quando pode
 * precisar remontar o pedaço da tela).
 */
export function registraEdicoes(edits: readonly WorldEdit[]): void {
  for (const e of edits) editadas.set(chaveEdicao(e.floor, e.x, e.y), e);
}

/** Tira uma edição da tabela — o `/restaura`. */
export function esqueceEdicao(floor: number, x: number, y: number): void {
  editadas.delete(chaveEdicao(floor, x, y));
}

/**
 * Carimba as edições sobre as camadas de um mapa já construído.
 *
 * ⚠️ Silenciosamente ignora edição fora do mapa ou em andar que não existe. É
 * proposital: uma edição gravada antes de o mundo mudar de tamanho não pode
 * derrubar o boot do servidor por causa de um tile.
 */
export function aplicaEdicoes(
  andares: Record<number, number[]>,
  largura: number,
  altura: number,
  edits: readonly WorldEdit[],
): number {
  let aplicadas = 0;
  for (const e of edits) {
    const camada = andares[e.floor];
    if (!camada) continue;
    if (e.x < 0 || e.y < 0 || e.x >= largura || e.y >= altura) continue;
    camada[e.y * largura + e.x] = e.tile;
    aplicadas++;
  }
  return aplicadas;
}
