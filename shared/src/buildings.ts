/**
 * Onde ficam os PRÉDIOS do mundo, e que chão eles ocupam.
 *
 * 🔴 **Mora em `shared` por um motivo duro: colisão é decidida no SERVIDOR.**
 * Se a posição vivesse só no cliente, ele desenharia a casa e o servidor
 * deixaria o jogador atravessá-la — o cliente não é fonte de verdade de
 * movimento em lugar nenhum deste projeto. Aqui os dois leem a mesma lista.
 *
 * O cliente usa isto para saber ONDE desenhar o sprite; o `worldgen` usa para
 * pintar a pegada de `building` no mapa, e daí a colisão sai de graça pelo
 * `isWalkable`, que já existia.
 *
 * ## 🔴 A PEGADA NÃO É O TAMANHO DO SPRITE
 *
 * A casa é desenhada com **7 tiles de largura**, mas o que encosta no chão é só
 * a base de pedra: medida no PNG, ela tem **4,2 tiles**. O resto é telhado
 * avançando e o andar de cima em balanço — que passam *por cima* do jogador,
 * não *contra* ele.
 *
 * ⚠️ Usar os 7 tiles como pegada faria o jogador esbarrar no ar a dois tiles da
 * parede. É o mesmo erro que o `spritebox.ts` conta ter custado caro nas
 * árvores: tratar a moldura do desenho como se fosse o desenho.
 */

/** Um prédio: onde está, e quanto chão ocupa. */
export interface PredioDef {
  /** Nome do PNG em `client/public/assets/buildings/`, sem extensão. */
  arquivo: string;
  /** Tile onde o PÉ do desenho assenta (centro da frente da base). */
  x: number;
  y: number;
  /** Largura da pegada, em tiles. */
  larg: number;
  /** Profundidade da pegada, em tiles, contada para o NORTE a partir de `y`. */
  prof: number;
}

/**
 * Os prédios do mundo.
 *
 * ⚠️ **(172,152) é POSIÇÃO DE TESTE**, escolhida em 14/08 por ser onde o
 * personagem do dono estava salvo — serve para olhar a casa sem andar. O lugar
 * definitivo é perto do `WORLD_SPAWN` (150,158), quando o vilarejo de Lumindale
 * for remontado.
 *
 * ⚠️ A pegada 4×3 sai da medição da base (4,2 tiles de largura), arredondada
 * para baixo. A profundidade é chute educado: a base é um losango isométrico e
 * o quanto disso vira "fundo" no mundo quadrado não se mede no PNG. É a
 * primeira coisa a ajustar depois de ver o jogador contornando a casa.
 */
export const PREDIOS: readonly PredioDef[] = [
  /*
   * 🔴 `casa-pixel`, e não mais `casa-2-andares` — a ilustrada isométrica foi
   * abandonada pelo dono em 15/08.
   *
   * Ela era bonita e não encaixava: isométrica num jogo de grade quadrada, e com
   * uma proporção que **nenhuma versão nova reproduzia** — foi isso que matou
   * tanto a troca de sprite para abrir a porta quanto a porta em camada. Esta
   * sai em `high top-down`, a mesma projeção do jogo e dos personagens.
   *
   * ⚠️ A arte velha continua em `client/public/assets/buildings/` de propósito,
   * sem uso: serve de referência, e apagá-la antes de a nova estar aprovada
   * deixaria o mundo com pegada sólida e nada desenhado.
   */
  /*
   * ⚠️ A pegada MEDIDA, não herdada: 7×4.
   *
   * A casa isométrica antiga tocava o chão numa quina estreita (4 tiles), e a
   * nova é vista de cima — a base ocupa quase toda a largura do desenho.
   * Medido no PNG a 3×: a faixa 24 px acima do pé tem **6,9 tiles** de largura.
   * Manter os 4 da casa velha deixaria o jogador atravessando as paredes
   * laterais.
   */
  { arquivo: 'casa-pixel', x: 172, y: 152, larg: 9, prof: 8 },
];

/**
 * O INTERIOR de um prédio: o cômodo que se vê ao entrar pela porta.
 *
 * 🔴 **Isto reusa `floors` + `floorLinks`, que já existiam e estavam órfãos.**
 * O `HANDOFF` de 05/08 registra que o Depósito era *"o único lugar que
 * exercitava `floors` + `floorLinks`"* e que, apagado ele, *"o motor continua
 * inteiro, mas nada mais o usa"*. Esta casa é o primeiro uso desde então — e,
 * por tabela, o primeiro teste do mecanismo que as dungeons vão querer.
 *
 * ## Como a entrada funciona, e por que a porta fica FORA da pegada
 *
 * O servidor só consulta o `floorLink` **depois** de aprovar o passo:
 *
 *     if (!isWalkable(...)) return;      // ← barra aqui
 *     const link = floorLinkAt(...);     // ← só chega aqui se andou
 *
 * 🔴 Ou seja: **tile de gatilho precisa ser ANDÁVEL.** Se a porta fosse um tile
 * da pegada (que é `building`, sólido), o jogador nunca pisaria nela e o link
 * jamais dispararia. Por isso o gatilho fica um tile ao sul da pegada — o
 * jogador chega à porta e entra, em vez de entrar "dentro da parede".
 *
 * ⚠️ Isso também evita um empate de `zIndex`: dentro da pegada o jogador teria
 * o mesmo `zIndex` do sprite da casa, e qual desenha na frente ficaria
 * indefinido.
 */
export interface AndarDef {
  /** PNG da planta em `client/public/assets/buildings/`, sem extensão. */
  arquivo: string;
  /** Andar do mapa. 0 é o mundo lá fora; a casa usa 1 (térreo) e 2 (superior). */
  floor: number;
  /** Canto noroeste da planta, em tile de mundo. */
  x0: number;
  y0: number;
  /**
   * A planta EM TEXTO — uma linha por fileira de tiles, todas do mesmo tamanho.
   *
   * 🔴 **É daqui que sai a colisão, e é por isso que ela existe.** O dono
   * reportou em 14/08 que *"estou conseguindo passar por cima"* dos móveis: até
   * então só a parede externa barrava, porque o cômodo era um retângulo cheio
   * de chão andável com um desenho por cima. Com a planta em texto, cada mesa,
   * bigorna e barril vira tile sólido — o desenho e a colisão saem da MESMA
   * fonte.
   *
   * | | |
   * |---|---|
   * | `#` | parede — **sólido** |
   * | `F` | móvel (mesa, bigorna, barril, cama…) — **sólido** |
   * | `.` | chão livre |
   * | `e` | entrada/saída da casa (só no térreo) |
   * | `>` | escada que SOBE |
   * | `<` | escada que DESCE |
   *
   * `#` e `F` bloqueiam igual; são símbolos diferentes só para a planta ficar
   * legível — dá para ver de relance onde é parede e onde é mobília.
   *
   * ⚠️ **Os `F` foram marcados a OLHO sobre a imagem gerada**, não
   * medidos. É a primeira coisa a acertar se algo bloquear onde parece vazio,
   * ou vice-versa. A planta é texto justamente para isso: dá para corrigir um
   * caractere e recarregar.
   */
  planta: readonly string[];
}

/**
 * A casa de teste, dois andares.
 *
 * 🔴 O desenho segue o pedido do dono em 14/08: **quarto em cima, cozinha,
 * forja e alquimia embaixo, escada ligando**. Cada andar é UMA planta gerada
 * inteira, com as portas internas e a escada já desenhadas — em vez de quatro
 * salas soltas que eu teria de furar para ligar. É a mesma lição da `folha2`:
 * peça modular não encaixa, peça inteira encaixa.
 *
 * ⚠️ As duas plantas ficam no MESMO `x0,y0` de propósito: assim os andares se
 * empilham, e a escada leva ao lugar que faz sentido no mapa.
 *
 * ⚠️ **A escada do térreo está desenhada à direita e a do superior à esquerda**
 * — o gerador as pôs assim, e elas não se alinham. Como o link teleporta, não
 * quebra nada; é realismo que falta, não bug.
 */
/**
 * 🔴 O TÉRREO MORA NO ANDAR 0, DENTRO DA PEGADA — é o jeito do Tibia.
 *
 * Até 16/08 entrar na casa era um `floorLink`: o jogador ia para o andar 1, num
 * lugar separado do mapa. O dono viu e cortou: *"não tem animação de porta
 * abrindo nem entrando dentro dela sem mudar totalmente o ambiente, pode ser
 * igual o tibia, a gente continua vendo o lado de fora"*.
 *
 * No Tibia **não se troca de mapa para entrar**. A casa é um pedaço do mundo
 * como qualquer outro: paredes são tiles sólidos, a porta é um VÃO andável, e o
 * que acontece ao entrar é o **telhado sumir**. A rua continua em volta, os
 * monstros continuam à vista, e não há transição nenhuma para estranhar.
 *
 * ⚠️ Isso apaga a necessidade da porta que abre: no Tibia a porta é um vão, e o
 * retorno de "entrei" é o telhado sumindo — que é bem mais visível que uma folha
 * de porta girando, e não precisa de arte nova nem de canal novo no protocolo.
 *
 * ⚠️ **O andar de cima CONTINUA sendo andar de verdade** (`floor: 1`), pelo
 * mesmo motivo que no Tibia: dois pisos não cabem na mesma célula do mapa. Só a
 * entrada deixou de ser troca de andar; subir a escada continua sendo.
 */
export const ANDARES: readonly AndarDef[] = [
  {
    arquivo: 'terreo',
    floor: 0,
    /*
     * Alinhado para que a PORTA da planta caia sob a porta desenhada na casa:
     * a casa é ancorada em (172,152) e a porta está na coluna 4 da última
     * linha, logo `x0 = 172-4 = 168` e `y0 = 152-7 = 145`.
     */
    x0: 168, y0: 145,
    /*
     * ⚠️ ESTA PLANTA É APROXIMADA, e a aproximação é deliberada.
     *
     * Traçar à mão a planta PINTADA sobre uma grade de 12×12 não converge: as
     * paredes da arte têm ~0,7 tile de espessura e os móveis atravessam célula.
     * Tentei duas vezes e nas duas deixei a escada MURADA — uma coluna inteira
     * de parede sem vão, que só aparece jogando.
     *
     * 🔴 Então a regra aqui passou a ser: **primeiro correto, depois bonito.**
     * O que esta planta garante é (a) o jogador nunca sai do prédio, (b) todo
     * tile livre é alcançável da porta, e (c) a escada é alcançável. Conferir
     * com `tools/cenario/conferir-planta.mjs` (sobrepõe na imagem) e com o
     * teste de rota, que é o que pega o murado.
     *
     * ⚠️ Ela NÃO acompanha o desenho célula a célula. Onde a arte mostra parede
     * e aqui é chão, o jogador anda "sobre" a parede pintada. É o preço de
     * planta pintada num jogo de grade, e o conserto de verdade é interior
     * montado por TILE (piso, parede, móvel como peças), não por imagem única.
     */
    /*
     * ⚠️ 7×6, e o tamanho é DITADO PELA CASA, não escolhido.
     *
     * O interior mora debaixo do sprite dela, então não pode ser maior que o
     * que ela cobre: medido, o desenho tem ~7,8 tiles de largura a 3×. A planta
     * de 12×12 que existia antes só cabia porque ficava num andar separado, onde
     * nada precisava bater com o desenho.
     *
     * ⚠️ Sobram 5×4 = 20 tiles andáveis. É pouco, e é honesto: a casa é pequena
     * vista de fora, então o interior tem de ser pequeno. Casa maior por dentro
     * do que por fora é justamente o que faria o Tibia parecer errado.
     *
     * A porta é o `e` na parede de baixo — um VÃO, sem link nenhum.
     */
    /*
     * ⚠️ A FILEIRA LOGO ACIMA DA PAREDE DE BAIXO FICA LIVRE, de propósito.
     *
     * O motor desenha parede com efeito 2.5D: a face dela sobe `WALL_H` px e
     * **cobre o tile de cima**. Móvel ali é desenhado ATRÁS dessa face, e o
     * dono viu como *"objetos entrando dentro da parede"*.
     *
     * A parede de cima não tem esse problema — ela sobe para fora do cômodo.
     * Por isso a mobília se encosta no topo e nas laterais, nunca na base.
     */
    /*
     * ⚠️ 9×8, contra os 7×6 de antes — cresceu junto com a casa, que foi de 3×
     * para 4×. O interior não pode passar do que o sprite cobre: a 4× o desenho
     * tem ~10,4 tiles de largura, então 9 cabe com folga de beiral.
     *
     * 🔴 A divisão em duas alas é o que faz ler como CASA e não como galpão: a
     * parede interna na coluna 4 separa cozinha (esquerda, com a escada) de
     * oficina (direita, forja e alquimia), e se contorna por cima ou por baixo.
     * Antes era um cômodo único com os móveis espalhados, e o dono viu isso
     * como *"interior ficou ruim"*.
     */
    /*
     * ⚠️ OS BLOCOS TÊM TAMANHO DE MÓVEL DE VERDADE, e antes não tinham.
     *
     * A escada ocupava **1 tile**, o que é absurdo — escada sobe um andar
     * inteiro. Aqui ela é 2×3, a forja 2×2 e a mesa 2×2. Um herói ocupa 1 tile,
     * então é essa a régua: mesa de dois lugares tem o dobro dele.
     *
     * 🔴 A escada fica com o topo do lance no `>` de cima, e é lá que o link
     * dispara: sobe-se os degraus e o andar troca no fim, não no primeiro.
     */
    /*
     * 🔴 **O BLOCO TAMBÉM É A PROPORÇÃO, e não só o tamanho.**
     *
     * O cliente ENCAIXA o desenho dentro do bloco preservando a proporção
     * (`makeMovel`, com `Math.min` nos dois eixos) — ele não estica, porque
     * esticar achatava a escada. A consequência é que **bloco com proporção
     * diferente da do desenho sobra chão**: o móvel enche um eixo e deixa o
     * outro pela metade, e o jogador vê tile bloqueado onde parece vazio — que
     * é exatamente o defeito que esta planta existe para não ter.
     *
     * Medido nos PNGs (caixa de alpha, a 64×64 de moldura), largura ÷ altura do
     * desenho: mesa 1,05 · forja 1,02 · caldeirão 1,12 · bancada 1,00 ·
     * bigorna 0,93 · baú 0,98 · cama 0,89 · escada 0,81 · barril 0,71 ·
     * armário 0,75.
     *
     * ⚠️ Então a régua tem DOIS lados: tamanho realista em tiles **e**
     * proporção parecida com a do desenho. Os blocos do térreo já batem
     * (enchem de 82% a 100%); foi o andar de cima que precisou de conserto.
     */
    planta: [
      '#########',
      '#MM.>>.K#',
      '#MM.>>.Q#',
      /*
       * ⚠️ Sem parede nesta linha, e não é descuido: com `#` na coluna 3 aqui,
       * os dois tiles à esquerda ficavam numa BOLSA — cercados pela mesa acima,
       * pela forja abaixo e por parede dos dois lados. O teste de
       * alcançabilidade pegou; a olho eu não teria visto.
       */
      '#...>>..#',
      '#JJ#....#',
      '#JJ#.GR.#',
      '#.......#',
      '####e####',
    ],
  },
  {
    arquivo: 'superior',
    // 🔴 Continua andar de verdade: dois pisos não cabem na mesma célula.
    floor: 1,
    // Mesma posição do térreo: os andares se empilham.
    x0: 168, y0: 145,
    // Mesmo tamanho do térreo — os andares se empilham, então têm de casar.
    // ⚠️ Mesmo tamanho do térreo (os andares se empilham) e mesma regra: nada
    // de móvel encostado na parede de BAIXO.
    /*
     * ⚠️ TRÊS BLOCOS MUDARAM em 24/08, e cada um por uma conta, não por gosto.
     *
     * | móvel | era | é | por quê |
     * |---|---|---|---|
     * | baú | 2×1 | 1×1 | o desenho é quadrado (0,98). Num bloco 2×1 ele enchia **49%** da largura: um baú miúdo no meio de dois tiles sólidos |
     * | cama | 2×3 | 2×2 | o desenho é quase quadrado (0,89), não comprido. Em 2×3 sobrava 3/4 de tile de chão bloqueado ao pé da cama |
     * | escada | 2×2 | 2×3 | **o mesmo sprite estava saindo de dois tamanhos**: o `>` do térreo é 2×3 e o `<` daqui era 2×2. Os andares se empilham; a escada tem de ser a mesma |
     *
     * ⚠️ O armário fica em 2×3 (era 2×2): o desenho é estreito e alto (0,75) —
     * é um armário visto de cima, com a frente inteira aparecendo — e num bloco
     * quadrado ele enchia só 75% da largura.
     *
     * ⚠️ A fileira 6 continua vazia pela regra da parede de baixo, e é por isso
     * que a escada desce até a 5 e não até a 6.
     */
    planta: [
      '#########',
      '#CC..AA.#',
      '#CC..AA.#',
      '#<<..AA.#',
      '#<<.....#',
      '#<<.B...#',
      '#.......#',
      '#########',
    ],
  },
];

/**
 * A LETRA da planta → o PNG do móvel em `client/public/assets/furniture/`.
 *
 * 🔴 A letra diz duas coisas de uma vez: que o tile é **sólido** e **qual**
 * móvel desenhar ali. Antes existia só `F`, que virava parede genérica — a cama
 * aparecia como muro. Uma letra por móvel resolve os dois de uma fonte só, que
 * é a regra que este arquivo inteiro segue.
 *
 * ⚠️ Letra que não estiver aqui e não for `#`, `.`, `e`, `>` ou `<` vira parede.
 * É de propósito: errar a letra fecha o caminho em vez de abrir buraco no chão,
 * e caminho fechado o teste de rota pega.
 */
export const MOVEL_DA_LETRA: Record<string, string> = {
  /*
   * 🔴 A ESCADA É DESENHADA COMO MÓVEL, mas o tile dela NÃO é `furniture`.
   *
   * Ela precisa das duas coisas ao mesmo tempo, e cada uma vem de um lugar:
   * o **desenho** daqui (senão sobe-se por um pedaço de chão vazio, que foi o
   * que o dono viu), e o tile continua `stone_slab` — **andável** — porque o
   * servidor consulta o `floorLink` só DEPOIS de aprovar o passo. Escada sólida
   * seria escada que ninguém sobe.
   */
  '>': 'escada',
  '<': 'escada',
  C: 'cama',
  B: 'bau',
  A: 'armario',
  M: 'mesa',
  R: 'barril',
  G: 'bigorna',
  J: 'forja',
  K: 'caldeirao',
  Q: 'bancada',
};

/** Onde o jogador entra na casa, no andar 0. Precisa ser ANDÁVEL — ver acima. */
export const PORTA_DA_CASA = { x: 171, y: 153 } as const;
/** Onde ele pousa ao sair. Um tile ao sul, para não repisar o gatilho. */
export const VOLTA_DA_CASA = { x: 171, y: 154 } as const;

/** Um móvel colocado: a letra e o retângulo de tiles que ele ocupa. */
export interface MovelPosto {
  letra: string;
  x0: number; y0: number;
  x1: number; y1: number;
}

/**
 * Agrupa as letras de móvel da planta em BLOCOS contíguos.
 *
 * 🔴 **Um móvel é UM objeto, não um por tile** — e isto existe porque eu errei
 * exatamente aí. Na primeira versão o cliente desenhava um sprite por tile de
 * `furniture`: a cama ocupa 6 tiles na planta (`CC` em três linhas) e saíam
 * **seis camas empilhadas**. E como cada sprite é mais largo que um tile, todas
 * vazavam para o vizinho — o dono viu *"objetos entrando dentro da parede"*.
 *
 * Agrupando, a cama vira um retângulo 2×3 e o cliente desenha **um** sprite
 * esticado sobre ele. Some a empilhada e some o vazamento, porque o desenho
 * passa a ter exatamente o tamanho que a planta reservou.
 *
 * ⚠️ Blocos são retangulares por construção: dois grupos da MESMA letra que se
 * tocam viram um só. Para duas camas separadas, deixe um tile entre elas ou use
 * letras diferentes.
 */
export function moveisDoAndar(a: AndarDef): MovelPosto[] {
  const alt = a.planta.length, larg = a.planta[0]!.length;
  const visto = Array.from({ length: alt }, () => new Array<boolean>(larg).fill(false));
  const saida: MovelPosto[] = [];

  for (let ly = 0; ly < alt; ly++) {
    for (let lx = 0; lx < larg; lx++) {
      const letra = a.planta[ly]![lx]!;
      if (visto[ly]![lx] || !MOVEL_DA_LETRA[letra]) continue;

      // Cresce o retângulo enquanto a mesma letra continuar.
      let x1 = lx;
      while (x1 + 1 < larg && a.planta[ly]![x1 + 1] === letra && !visto[ly]![x1 + 1]) x1++;
      let y1 = ly;
      cresce: while (y1 + 1 < alt) {
        for (let x = lx; x <= x1; x++) {
          if (a.planta[y1 + 1]![x] !== letra || visto[y1 + 1]![x]) break cresce;
        }
        y1++;
      }
      for (let y = ly; y <= y1; y++) for (let x = lx; x <= x1; x++) visto[y]![x] = true;

      saida.push({ letra, x0: a.x0 + lx, y0: a.y0 + ly, x1: a.x0 + x1, y1: a.y0 + y1 });
    }
  }
  return saida;
}

/** Acha o primeiro tile de um símbolo na planta, em coordenada de mundo. */
export function achaNaPlanta(a: AndarDef, simbolo: string): { x: number; y: number } | null {
  for (let ly = 0; ly < a.planta.length; ly++) {
    const lx = a.planta[ly]!.indexOf(simbolo);
    if (lx >= 0) return { x: a.x0 + lx, y: a.y0 + ly };
  }
  return null;
}

/**
 * Os tiles que um prédio ocupa.
 *
 * A pegada cresce para o NORTE (y menor) porque o sprite é ancorado pelo pé:
 * `(x, y)` é a quina da frente, e o corpo do prédio sobe na tela a partir dela.
 * Em x ela é centrada, com a sobra à esquerda quando a largura é par.
 */
export function tilesDoPredio(p: PredioDef): Array<{ x: number; y: number }> {
  const saida: Array<{ x: number; y: number }> = [];
  const meia = Math.floor(p.larg / 2);
  for (let dy = 0; dy < p.prof; dy++) {
    for (let dx = 0; dx < p.larg; dx++) {
      saida.push({ x: p.x - meia + dx, y: p.y - dy });
    }
  }
  return saida;
}
