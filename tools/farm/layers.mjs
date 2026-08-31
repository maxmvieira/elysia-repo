/**
 * 🔴 **O PAPEL DE CADA UMA DAS 43 CAMADAS DA FARM.** É o arquivo mais
 * importante desta pasta, e é escrito à mão porque **o pack não traz colisão**:
 * o `Farm.tmx` não tem um único `<objectgroup>`. Sem esta tabela o jogo saberia
 * desenhar a fazenda e não saberia onde o jogador esbarra.
 *
 * ⚠️ **A chave é o `id` da camada, NUNCA o nome.** O mapa tem três camadas
 * chamadas `Walls`, duas `Door` e duas `door` — o autor nomeou por prédio, não
 * por função. Casar por nome pegaria a errada em silêncio.
 *
 * ## As quatro colunas
 *
 * - `solido`  o jogador esbarra. Vira `WALL_WOOD` no mapa do Elysia, então
 *             colisão, pathfinding e o mapa da tecla M funcionam sem tocar no
 *             motor.
 * - `agua`    vira `WATER`: bloqueia igual, mas o minimapa pinta azul.
 * - `acima`   desenhada POR CIMA do jogador. É o que deixa passar por trás da
 *             árvore da borda sul e atrás do corrimão da cerca.
 * - `chao`    terreno que se pisa. **Apaga água pintada antes** (ver abaixo).
 *
 * ## 🔴 Três coisas que só o overlay de conferência revelou
 *
 * Cada uma eu tinha errado no primeiro palpite, e nenhuma daria erro — daria
 * fazenda quebrada em silêncio. Rodar `node tools/farm/overlay.mjs` e OLHAR é
 * parte do processo, não zelo extra.
 *
 * **1. Precedência: chão pintado depois apaga água.** A camada `Water` pinta um
 * retângulo bem MAIOR que o lago que se vê, e o autor cobre a sobra com
 * `Ground`. Tratar toda célula de `Water` como água afogava o canto sudoeste
 * inteiro, grama e árvores junto. Sólido, ao contrário, gruda: `bowls` é chão e
 * vem DEPOIS das paredes, e uma tigela no chão do curral não pode furar a
 * parede do celeiro.
 *
 * **2. Mas chão com arte de água continua água.** A exceção da exceção: o
 * `Ground` carrega 28 células de `Water_coasts` — a margem do lago está na mesma
 * camada que a terra firme. Sem esta ressalva o lago encolhia de 38 para 18
 * células e virava poça.
 *
 * **3. `X` / `X_top` NÃO é tronco/copa.** Era o meu palpite, e é falso: as
 * `Trees_outside1/2/3` ficam na borda NORTE (y 1..12) e as
 * `Trees_outside_top1/2/3` na borda SUL (y 24..31) — conjuntos disjuntos, 129 de
 * 130 "copas" sem base nenhuma embaixo. O sufixo quer dizer **ordem de
 * desenho**, não anatomia: as do sul são árvores inteiras que ficam POR CIMA do
 * jogador, porque ele anda atrás delas. As duas famílias são sólidas.
 */
export const CAMADAS = {
  // --- lago ----------------------------------------------------------------
  15: { nome: 'Water', agua: true },
  17: { nome: 'Walls_under_water', agua: true },
  18: { nome: 'Water_details2', agua: true },
  21: { nome: 'Fish', agua: true },

  // --- chão que se pisa ----------------------------------------------------
  12: { nome: 'Ground', chao: true },
  70: { nome: 'Spots', chao: true },
  71: { nome: 'Ground_details', chao: true },
  4: { nome: 'Road', chao: true },
  3: { nome: 'Hill', chao: true },
  13: { nome: 'Grass', chao: true },
  14: { nome: 'Grass_details', chao: true },
  57: { nome: 'bowls', chao: true },
  67: { nome: 'Bowls2', chao: true },

  /*
   * 🔴 **`beds` é chão E cerca ao mesmo tempo — foi o pior achado do overlay.**
   *
   * 399 células que misturam os canteiros levantados da horta (andáveis) com
   * **todas as cercas dos três currais**, no mesmo tileset. Marcar a camada
   * inteira como chão deixava chiqueiro, curral e galinheiro **abertos dos
   * quatro lados**: os bichos sairiam andando no primeiro tick, e o pedido
   * "coloque os animais dentro do cercadinho" viraria mentira em movimento.
   *
   * Por isso a cerca é separada por TILE, não por camada — ver `CERCA_GGB`.
   */
  47: { nome: 'beds', chao: true },

  // --- construções ---------------------------------------------------------
  //
  // 🔴 **Qual camada é de qual prédio se lê pela ORDEM, não pelo nome.** O autor
  // agrupou as camadas por construção, na sequência em que as desenhou:
  //
  //   36 Walls · 40 Tools · 38 door · 39 Window · 41 Roof   → o CELEIRO
  //   42 Walls · 44 Door · 45 Sails                          → o MOINHO
  //   29 Walls · 30 Door · 31 Windows · 32 porch_roof · 33 ivy → a CASA
  //
  // ⚠️ Eu tinha o celeiro e o moinho TROCADOS na primeira versão, e a pista que
  // desfez o engano foi o `Sails`: as pás só podem ser do moinho, e elas estão
  // no segundo grupo. Confirmado pelas coordenadas — a porta de 12 células
  // (x 12–17) é o portão largo do celeiro; a de 4 (x 8–9) é a portinha na base
  // da torre do moinho.
  36: { nome: 'Walls (celeiro)', solido: true, construcao: true },
  40: { nome: 'Tools', solido: true, construcao: true },
  41: { nome: 'Roof (celeiro)', solido: true, construcao: true },
  42: { nome: 'Walls (moinho)', solido: true, construcao: true },
  /*
   * 🔴 **As pás do moinho são `acima`, e é a única coisa da fazenda que fica
   * sobre o jogador por estar NO AR** — não por ser folhagem.
   *
   * Relato do dono em 31/08: *"o catavento está passando por baixo de alguns
   * elementos (árvores, grids do chão)"*. E estava: as pás nasciam no `baixo`,
   * junto do chão, e a hélice tem 10×9 células — ela **transborda o moinho** e
   * cruza a cerca-viva ao norte, que é `acima`. As pontas das pás sumiam atrás
   * do mato, e a hélice parecia serrada nas quatro pontas.
   *
   * ⚠️ **A pergunta certa não é "é folhagem?" e sim "está acima da cabeça?"**.
   * Toda a camada `acima` até aqui era vegetação e corrimão, e é fácil ler a
   * regra como sendo sobre vegetação. Não é: é sobre ALTURA. Uma hélice a três
   * tiles do chão não pode ser encoberta por um arbusto ao nível do solo.
   *
   * ⚠️ Isto também põe as pás sobre o JOGADOR, e é o certo: passa-se por baixo
   * do catavento, não por cima.
   *
   * ⚠️ **`solido` continua valendo e é decidido em outro lugar** (a colisão não
   * olha `acima`). Hoje a hélice barra o passo célula a célula, no formato do X
   * do quadro 0 — ou seja, há parede invisível no ar em volta do moinho. É
   * pré-existente e NÃO foi mexido aqui: tirar a solidez das pás abriria
   * passagem nova e mudaria as ilhas andáveis, o que é decisão de mapa e quer
   * ser vista em tela.
   */
  45: { nome: 'Sails', solido: true, acima: true },
  29: { nome: 'Walls (casa)', solido: true, construcao: true },
  /*
   * 🔴 **`porch_roof` NÃO é telhado, apesar do nome — é a VARANDA inteira**:
   * o deck de madeira, o corrimão e, principalmente, **a escada da porta da
   * frente**. Sólida, ela trancava a casa por fora: a porta virava uma ilha de
   * 4 células, abria quando o jogador passava perto e não tinha rota nenhuma
   * para entrar. Quem pegou foi o próprio conversor, que exige um pouso andável
   * do lado de fora antes de emitir a ligação de andar.
   *
   * 🔴 **E ela guarda DUAS coisas que querem lados opostos do jogador**, que é
   * o defeito que o dono relatou em 30/08 com uma seta vermelha na captura: o
   * herói parado na porta da casa **sumia**, e só as botas e a ponta da espada
   * apareciam debaixo da varanda.
   *
   * As 46 células da camada são dois blocos disjuntos:
   *
   * - **y 3–7 · o TELHADO da casa.** `acima` de direito — telhado fica sobre
   *   todo mundo, e ninguém anda embaixo dele (as paredes são sólidas).
   * - **y 9–10 · a VARANDA, o corrimão e a escada.** Chão que se PISA: são as
   *   únicas 6 células andáveis que uma camada `acima` cobre em toda a fazenda,
   *   e são justamente o único caminho até a porta. Desenhadas por cima, o
   *   jogador ficava invisível exatamente onde ele precisa se ver.
   *
   * Por isso a profundidade desta camada é decidida **por tile**, em
   * `VARANDA_HOUSES` — o mesmo remédio que `CERCA_GGB` deu para `beds`.
   *
   * ⚠️ **O que se perde:** parado na varanda, o jogador passa NA FRENTE do
   * corrimão em vez de atrás. É o preço, e é o lado certo de errar — corrimão
   * de 3 px na frente do peito é detalhe; herói invisível é bug.
   */
  32: { nome: 'porch_roof (telhado + varanda)', acima: true },
  33: { nome: 'ivy', solido: true, construcao: true },
  84: { nome: 'Chicken_coop', solido: true, construcao: true },
  55: { nome: 'animal buildings', solido: true, construcao: true },

  /*
   * As janelas ficam SOBRE a parede, que já é sólida — marcá-las de novo não
   * mudaria nada, e deixá-las fora documenta que quem barra é a parede.
   */
  39: { nome: 'Window', construcao: true },
  31: { nome: 'Windows', construcao: true },

  // --- portas: o vão é ANDÁVEL de propósito ---------------------------------
  //
  // 🔴 São elas que levam para o interior. Sólidas, o jogador esbarraria na
  // porta em vez de entrar. O que acontece ao pisar ali quem decide é o
  // `PORTAS` do `build.mjs`, não a colisão.
  38: { nome: 'door (celeiro)', porta: 'celeiro' },
  44: { nome: 'Door (moinho)', porta: 'moinho' },
  30: { nome: 'Door (casa)', porta: 'casa' },
  86: { nome: 'door (galinheiro)', porta: 'galinheiro' },

  // --- vegetação -----------------------------------------------------------
  //
  // 🔴 **As árvores da BORDA são sólidas inteiras; as do POMAR, só o tronco.**
  // A distinção não é capricho — cada metade resolve um defeito que a outra
  // causava, e as duas foram vistas em tela.
  //
  // **Borda (norte e sul): sólida célula a célula.** Antes valia o tronco aqui
  // também, e o dono relatou em 30/08: *"estou conseguindo passar dentro de uma
  // árvore"*. Estava — a cerca-viva que fecha a fazenda tem 3 células de altura
  // e só a de baixo barrava, então dava para entrar pela lateral e ficar de pé
  // no meio da folhagem. Cerca-viva é parede: bloqueia inteira.
  //
  // **Pomar (`Trees`/`Trees2`): só o tronco**, e não dá para mudar. As copas do
  // pomar se encostam de propósito — sólidas célula a célula, cada canteiro
  // vira um bloco maciço e **duas hortas (65 e 18 células) ficam ILHADAS** no
  // meio da fazenda, visíveis e inalcançáveis. Aqui o tronco barra e passa-se
  // entre as fileiras, que é como se anda num pomar de verdade.
  //
  // ⚠️ Consequência que fica: **ainda dá para andar por baixo da copa do
  // pomar.** É o preço de as hortas serem alcançáveis, e é bem menos visível
  // que na borda porque a copa é `acima` e esconde quem passa. Se incomodar, o
  // caminho não é tornar tudo sólido — é abrir passagem no desenho, no Tiled.
  //
  // Todas são `acima`: o jogador passa ATRÁS da folhagem, nunca por cima dela.
  10: { nome: 'Trees_outside1', solido: true, acima: true, vegetacao: true },
  11: { nome: 'Trees_outside3', solido: true, acima: true, vegetacao: true },
  7: { nome: 'Trees_outside2', solido: true, acima: true, vegetacao: true },
  34: { nome: 'Trees_outside_top', solido: true, acima: true, vegetacao: true },
  53: { nome: 'Trees_outside_top2', solido: true, acima: true, vegetacao: true },
  54: { nome: 'Trees_outside_top3', solido: true, acima: true, vegetacao: true },
  48: { nome: 'Trees (pomar)', acima: true, vegetacao: true },
  49: { nome: 'Trees2 (pomar)', acima: true, vegetacao: true },
  // Corrimão de cima da cerca: sólido junto com a base, e por cima do jogador.
  68: { nome: 'fence_top', solido: true, acima: true },

  /*
   * ⚠️ **REFERÊNCIA, e é a decisão mais discutível da tabela:** as hortaliças
   * NÃO bloqueiam. São couve, abóbora e cenoura plantadas nos canteiros; deixá-
   * las sólidas transformaria cada canteiro numa ilha e cortaria o miolo da
   * fazenda. Pisar na plantação é feio, mas é menos ruim que uma fazenda
   * intransponível. **Vale rever em tela.**
   */
  60: { nome: 'Plants1' },
  62: { nome: 'Plants2' },

  /*
   * 🔴 **OS BICHOS NÃO SÃO ARTE.** Estas duas camadas foram pintadas com os
   * tilesets de animação de porco, vaca e galinha — o autor as usou como
   * decoração parada. Aqui elas viram **posição de spawn de criatura viva** e
   * NÃO entram no PNG assado. Um porco pintado no chão não anda, não come e não
   * entra no bestiário; um porco de verdade, sim.
   */
  82: { nome: 'Animals', bichos: true },
  83: { nome: 'Animals2', bichos: true },
};

/**
 * 🔴 **Tilesets cuja arte É água, em qualquer camada onde apareçam.**
 *
 * A ressalva 2 do cabeçalho: chão pintado com arte de água continua sendo água.
 */
export const TILESETS_DE_AGUA = new Set(['Water_coasts', 'Water_detilazation', 'fishes']);

/**
 * 🔴 **As 23 peças de cerca dentro do `ground_grass_bricks`.**
 *
 * O tileset tem 620 tiles e mistura chão com cerca. Estas 23 são das linhas 15 a
 * 18 dele, e foram **conferidas olhando uma a uma**, ampliadas — todas têm ripa
 * de madeira atravessando a célula.
 *
 * ⚠️ **Um limiar numérico (`id >= 465`) NÃO serve**, e foi a primeira tentativa:
 * a camada `Water` usa o 525 e a `Walls_under_water` usa 489 e 490, que moram
 * nas MESMAS linhas e são água. Tileset não é organizado por função.
 *
 * 🔴 **E olhar a tira em bloco também não bastou: o #517 passou.** Ele estava
 * nesta lista na primeira versão porque vem no meio das cercas — mas é um
 * quadrado de GRAMA LIMPA, sem ripa nenhuma. É o piso dos currais, e é o tile
 * mais usado do conjunto (39 células contra 1 a 7 dos outros). Sólido, ele
 * entijolava o interior dos três currais: 13 das 16 células de galinha e 12 das
 * 27 de vaca ficavam em chão de pedra. Os vizinhos 516 e 518 são as ripas
 * esquerda e direita **do mesmo curral**, e é por isso que ele fica no meio
 * deles no tileset.
 *
 * ⚠️ A lição: contagem de uso denuncia o que o olho deixa passar. Peça de cerca
 * aparece poucas vezes e em linha; piso aparece muitas e em mancha.
 *
 * Para refazer se o mapa mudar: liste os ids que a camada `beds` usa acima de
 * 465, olhe cada um ampliado E confira a contagem antes de confiar.
 */
export const CERCA_GGB = new Set([
  475, 476, 477, 485, 486, 487,
  506, 508, 513, 516, 518, 522,
  537, 539, 543, 545, 547, 548, 549,
  574, 575, 576, 577,
]);

/**
 * O portão do curral: animado no pack (abre e fecha), **fechado e sólido aqui**.
 *
 * 🔴 Não é preguiça, é consequência. Portão que abre de verdade precisa de porta
 * com estado no servidor, e de os bichos serem presos por LÓGICA em vez de por
 * parede — senão a vaca sai andando pelo vão na primeira vez que ele abrir. Isso
 * é sistema próprio. Enquanto não existe, o portão fica fechado, que é o estado
 * em que a fazenda foi desenhada.
 *
 * ⚠️ A porta das CASAS é outra coisa, e essa abre — ver `PORTAS` no `build.mjs`.
 */
export const TILESETS_SOLIDOS = new Set(['wicket_animation']);

/**
 * 🔴 **As 8 peças da VARANDA da casa dentro do tileset `Houses`.**
 *
 * Elas moram na camada `porch_roof` (32) junto com o telhado, e são a metade
 * dela que precisa ficar **sob** o jogador — ver o comentário da camada 32.
 * Duas fileiras de quatro: o deck com o corrimão (497–500) e a escada da frente
 * (528–531).
 *
 * ⚠️ **Por tile e não por posição** (`y >= 9`), de propósito: se o autor mover a
 * casa no Tiled, ou o mapa ganhar uma segunda casa com a mesma varanda, a regra
 * continua valendo. Coordenada fixa quebraria em silêncio.
 *
 * Conferido: estes 8 ids não aparecem em nenhuma outra camada do `Farm.tmx`.
 */
export const VARANDA_HOUSES = new Set([497, 498, 499, 500, 528, 529, 530, 531]);

/**
 * Esta célula é desenhada **por cima** do jogador?
 *
 * 🔴 A pergunta é por CÉLULA e não por camada porque `porch_roof` mistura
 * telhado (acima) com varanda (abaixo) — ver `VARANDA_HOUSES`.
 */
export function desenhaAcima(papel, tilesetNome, local, sobreConstrucao = false) {
  if (!papel.acima) return false;
  if (tilesetNome === 'Houses' && VARANDA_HOUSES.has(local)) return false;
  /*
   * 🔴 **Mato pintado na MESMA célula de um prédio fica ATRÁS do prédio.**
   *
   * Relato do dono em 31/08: *"a parte de cima do catavento ainda está por
   * baixo"*. E estava: a cerca-viva da borda norte (`Trees_outside2`) tem **27
   * células em cima do moinho**, a fileira y=3 inteira, e sendo `acima` ela
   * passava na frente do telhado. O moinho aparecia decapitado.
   *
   * ⚠️ **A regra não é sobre o jogador, e é isso que a torna segura.** Todas as
   * outras decisões de `acima` perguntam "o herói passa na frente ou atrás?".
   * Esta pergunta é entre duas ARTES: o autor pintou a fileira de mato e depois
   * plantou o moinho em cima — o mato está atrás do prédio no mundo, e desenhá-lo
   * por cima é errado com jogador ou sem. Por isso não há caso em que a troca
   * piore alguma coisa.
   *
   * ⚠️ Célula de prédio é sempre sólida: ninguém pisa nela, então isto não muda
   * oclusão de personagem nenhuma.
   */
  if (papel.vegetacao && sobreConstrucao) return false;
  return true;
}

/**
 * Decide o papel de uma célula, já com todas as exceções aplicadas.
 *
 * Devolve `'solido' | 'agua' | 'chao' | null`. `null` é "esta camada não opina" —
 * decoração como janela e hortaliça, que não muda o que já estava valendo.
 */
export function papelDaCelula(papel, tilesetNome, local) {
  if (papel.bichos) return null;
  if (papel.solido) return 'solido';
  if (TILESETS_SOLIDOS.has(tilesetNome)) return 'solido';
  if (tilesetNome === 'ground_grass_bricks' && CERCA_GGB.has(local)) return 'solido';
  if (papel.agua) return 'agua';
  if (papel.chao) return TILESETS_DE_AGUA.has(tilesetNome) ? 'agua' : 'chao';
  return null;
}
