/**
 * ☄️ Corta as folhas VERTICAIS do Meteoro — fundo opaco, com ou sem grade.
 *
 * 🔴 **Por que é um cortador novo: aqui o fundo NÃO É TRANSPARENTE.**
 *
 * Os cinco cortadores anteriores têm uma chave cada um — croma, alfa existente,
 * brilho sobre preto, chão-ou-nuvem, cabeça-contra-chão. As folhas verticais do
 * Meteoro chegam com o fundo CHAPADO: a primeira num cinza de fumaça (mediana
 * 37,9 de luminância), as seguintes em preto (11–29). A chave de alfa existente
 * devolveria a folha inteira, com fundo e tudo.
 *
 * ✅ **A chave é a maior entre SATURAÇÃO, BRILHO e BRANCO-QUENTE**, e as três
 * são necessárias:
 *
 *   saturação  salva a PEDRA, que é escura mas muito colorida (0,90 contra 0,09
 *              do fundo cinza) — sem ela o meteoro sai transparente;
 *   brilho     salva a NUVEM, que é cinza como o fundo mas mais clara (35–43
 *              contra 11–25) — sem ele a fumaça some;
 *   branco     salva o NÚCLEO do impacto, que é quase sem cor e não passaria
 *              por nenhuma das outras duas.
 *
 * 🔴 **E a GRADE é uma PERGUNTA MEDIDA, não uma suposição.** Das três folhas que
 * passaram por aqui, duas não tinham grade nenhuma (as fileiras derivavam de 211
 * a 470 px, com quadros invadindo a fileira de baixo) e a terceira tinha uma
 * cravada, com vales VAZIOS de 307 em 307 px.
 *
 * ⚠️ **Eu tirei uma regra dos dois primeiros casos e ela quebrou no terceiro.**
 * As ilhas, que salvaram as duas primeiras, embaralham a terceira: são trinta
 * quadros, cada um com uma nuvem destacada no alto, e juntar ilha pequena com a
 * vizinha erra metade. Hoje o cortador pergunta — *existe um vale vazio perto de
 * cada divisa teórica?* — e usa a grade quando ela existe, as ilhas quando não.
 *
 * 🔴 **A âncora é o RODAPÉ do desenho, e serve para os dois tipos de quadro.** No
 * meteoro caindo o rodapé é a pedra (o rastro sobe atrás dela); no estouro é o
 * chão. Uma regra só, e ela põe no mesmo lugar as duas coisas que têm de cair no
 * tile.
 *
 * ⚠️ **Com os quadros reenquadrados a QUEDA sai do desenho** — cada quadro passa
 * a mostrar o meteoro parado — e quem move passa a ser o cliente, pela
 * `trajetoria` vertical. É de propósito: é o que faz a pedra chegar no tile certo
 * em qualquer ponto da tela, em vez de cair dentro do próprio quadro.
 *
 * ⚠️ **A GRADE MUDA A CADA FOLHA, e por isso ela vem de fora.** As quatro que
 * passaram por aqui vieram 5×5, 3×3, 6×5 e 7×4, com células de tamanhos
 * diferentes. `COL` e `POR_COL` são argumentos desde 12/09; a JANELA (`JAN_W`,
 * `JAN_H`) ainda é medida à mão, e trocar a folha continua exigindo conferir a
 * tira de contato.
 *
 * Uso:
 *   node tools/meteoro-grade2fx.mjs arte-fonte/fx/meteoro_vertical4.png meteoro_queda 14 7 4
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

const [arq, nome, quedaArg, colArg, linArg] = process.argv.slice(2);

/**
 * Quantas colunas a folha tem, e quantos desenhos há em cada uma.
 *
 * ⚠️ **Vêm da linha de comando desde 12/09, e o padrão é a folha anterior.** O
 * dono trocou a arte do Meteoro quatro vezes em dois dias, e a quarta veio 7×4
 * contra o 6×5 das outras. Cravar a grade aqui obrigava a editar o cortador para
 * cada folha nova — e um cortador editado a cada uso deixa de ser reproduzível.
 */
const COL = Number(colArg ?? 6) || 6;
const POR_COL = Number(linArg ?? 5) || 5;

/**
 * 🔴 **A CHAVE É A SATURAÇÃO, e não o brilho.**
 *
 * A primeira versão recortou por brilho e o dono viu o resultado em tela: *"ele
 * está muito transparente… aparecendo as nuvens que mandei também"*. As duas
 * queixas são o mesmo defeito. Por brilho, a PEDRA (escura) sai com alfa baixo e
 * a FUMAÇA (cinza-média, na mesma faixa do fundo) sai quase toda fora — e o que
 * sobra some na mistura aditiva, que não sabe escurecer.
 *
 * ✅ Medidas as quatro coisas na folha, a saturação separa as três que interessam
 * do fundo, e separa com folga:
 *
 *   fundo   0,09 (p90 0,18)   ← cinza neutro
 *   fumaça  0,35 (p90 0,74)   ← ela é quente, tem marrom dentro
 *   fogo    0,79
 *   pedra   0,90
 *
 * ⚠️ **Mas o NÚCLEO BRANCO do impacto é quase sem cor** (branco-quente tem
 * saturação perto de zero), e ele é o que dá o clarão. Por isso a chave é o maior
 * entre a saturação e um corte de brilho ALTO, que só ele alcança: o fundo mais
 * claro medido chega a 115, e o núcleo passa de 200.
 */
const SAT_PISO = 0.30;
const SAT_TETO = 0.45;
const BRANCO_PISO = 200;
const BRANCO_TETO = 240;
/**
 * Abaixo desta luminância é preto de fundo, por mais colorido que o pixel seja.
 *
 * ⚠️ **46, e era 20.** O fundo tem mediana 29 a 44 e não é perfeitamente neutro:
 * com o piso baixo, pixels escuros e levemente tingidos passavam pela chave de
 * saturação e saíam OPACOS E PRETOS — um quadro inteiro virou um retângulo
 * preto. A pedra (mediana 69) e a fumaça (70) passam folgadas deste valor.
 */
const ESCURO = 26;

/**
 * A janela recortada da FONTE, em pixels dela.
 *
 * 🔴 **A LARGURA É MEDIDA NA FOLHA, e 200 cortou a quarta.** O dono viu em tela:
 * *"as laterais da animação estão sendo cortadas"* — arestas retas dos dois
 * lados do estouro. Medidos os 28 desenhos da folha 7×4, o maior tem **220 px**
 * de largura numa célula de 219; a janela de 200 jogava fora 10 px de cada lado.
 *
 * ⚠️ **E o corte não era suave, o que aponta direto para cá.** A cerca do quadro
 * (`cx0..cx1`) desvanece em 20 px de propósito; a janela não desvanece nada —
 * o que fica fora dela simplesmente não é amostrado. Aresta RETA em efeito de
 * fogo é sempre janela, nunca cerca.
 *
 * ⚠️ Sobra de 12 px para o desvanecimento da cerca ter onde acontecer.
 */
const JAN_W = 232;
const JAN_H = 340;

/**
 * A célula de saída — uma redução de 0,64 da janela, que sai limpa.
 *
 * 🔴 **`LARG` ANDA COM `JAN_W`, e é isso que mantém o tamanho em tela.** A razão
 * entre os dois é a escala do desenho; preservada, um quadro mais largo só ganha
 * margem, e o meteoro continua do mesmo tamanho no jogo. Mudar `JAN_W` sozinho
 * espremeria a arte, e mudar `LARG` sozinho a esticaria — nos dois casos sem
 * erro nenhum, só feio.
 */
const LARG = 148;
const ALT = 218;

/**
 * Onde o RODAPÉ do desenho fica dentro da célula — e o `ancoraY` do cliente.
 *
 * ⚠️ Não é 1. O estouro espalha brasa ABAIXO do ponto de impacto, e encostar o
 * desenho no rodapé da célula cortaria essa brasa fora.
 */
const ANCORA = 0.88;

if (!arq || !nome) {
  console.error('uso: node tools/meteoro-grade2fx.mjs <folha.png> <nome-de-saida>'
    + ' [quadros-de-queda] [colunas] [fileiras]');
  process.exit(1);
}

/**
 * 🌫️ **A COROA DE FUMAÇA SAI DO MEIO DA QUEDA PARA O FIM.**
 *
 * Dono, 12/09, com a magia rodando: *"essa nuvem mais do meio pro final da magia
 * de meteoro não precisa, seria somente quando o meteoro desce do céu no início,
 * depois é somente o meteoro mesmo"*.
 *
 * 🔴 **E ele tem razão por um motivo que a arte esconde: a coroa é LARANJA no
 * arquivo e MARROM no jogo.** Ela é feita de filamentos de alfa baixo; em
 * mistura aditiva isso clarearia a grama, mas esta folha usa mistura NORMAL (ver
 * `mistura` em `FOLHAS_QUEDA`), e alfa baixo em mistura normal é o desenho
 * MISTURADO com o fundo — laranja ralo sobre verde dá barro. Sobre o preto da
 * folha de contato ela é bonita; sobre grama é uma mancha.
 *
 * ⚠️ **Os quatro números abaixo são desta ARTE, e morrem com ela.** Eles saíram
 * medidos na folha 7×4 de 12/09 (`meteoro_vertical4.png`), onde o pedido foi
 * *"remove as nuvens do terceiro em diante"*. Na folha 6×5 anterior os mesmos
 * papéis eram 128/42/7/14 — a nuvem lá era uma COROA que crescia no meio da
 * queda, aqui é o NINHO de onde a pedra sai. Folha nova, medida nova.
 *
 * ✅ **Medido na célula de 128×218:** o ninho de fumaça ocupa do topo do desenho
 * até y ≈ 138, e o facho aceso desce de ~130 até a rocha, que está em ~190. Daí
 * o corte em 150 com 32 px de rampa — o facho se dissolve subindo, sem aresta.
 *
 * ⚠️ **E aqui a força NÃO cresce devagar: ela liga no terceiro quadro**, que é o
 * que o dono pediu com essas palavras. Um quadro dura 26 ms; rampa longa aqui
 * seria interpretação minha, não o pedido dele.
 *
 * 🔴 **E o limite da queda TEM de vir de fora.** Os quadros do estouro carregam
 * de 28 a 40 % da massa acima dessa mesma linha — é a nuvem do cogumelo, que é o
 * efeito. Uma rampa cega comeria o estouro inteiro. O número é o mesmo
 * `fracaoQueda` do cliente (14/27, em `FOLHAS_QUEDA`); sem ele, o cortador não
 * apaga nada.
 */
const QUEDA = Number(quedaArg ?? 0) || 0;
const FUMACA_TOPO = 150;
const FUMACA_RAMPA = 32;
const FUMACA_DE = 1;
const FUMACA_ATE = 2;

const img = decode(arq);
const lum = (o) => 0.299 * img.px[o] + 0.587 * img.px[o + 1] + 0.114 * img.px[o + 2];
const presa = (v) => Math.max(0, Math.min(1, v));
/** Alfa recortado deste pixel: 0 no fundo, 1 na pedra, no fogo e na fumaça densa. */
function alfaDe(o) {
  const L = lum(o);
  if (L < ESCURO) return 0;
  const mx = Math.max(img.px[o], img.px[o + 1], img.px[o + 2]);
  const mn = Math.min(img.px[o], img.px[o + 1], img.px[o + 2]);
  const sat = mx > 0 ? (mx - mn) / mx : 0;
  /*
   * ⚠️ **E o BRILHO voltou a valer, porque a folha nova tem fundo PRETO.**
   *
   * Na folha de 13/09 o fundo era um cinza de fumaça com mediana 37,9, e brilho
   * não separava nada. A folha que a substituiu tem fundo entre 13 e 29 — aí a
   * fumaça (mediana 60) se separa por brilho com folga, e é bom que seja assim:
   * a saturação sozinha deixa de fora a fumaça cinzenta que o dono quer ver.
   */
  /*
   * 🔴 **A RAMPA DA NUVEM é curta de propósito: 26 → 56, e era 34 → 80.**
   *
   * *"Mostrar um pouco mais de nuvens"* (dono, 13/09). A nuvem desta folha é
   * escura — medida, mediana entre 35 e 43 de luminância, com o fundo em 11–25.
   * Com a rampa longa a nuvem mediana saía com 0,19 de alfa, quase invisível;
   * com a curta sai com 0,57. **É pouca margem de propósito**: 26 fica logo acima
   * do p95 do fundo, e é o alfa mínimo (0,09) que segura o resto.
   */
  const a = Math.max(
    presa((sat - SAT_PISO) / (SAT_TETO - SAT_PISO)),
    presa((L - 26) / 30),
    presa((L - BRANCO_PISO) / (BRANCO_TETO - BRANCO_PISO)),
  );
  /*
   * 🔴 **Alfa fraco vira ZERO, e em mistura normal isso não é detalhe.**
   *
   * O fundo da folha não é perfeitamente neutro: sobra um véu de 2 a 6 % de alfa
   * espalhado pela célula inteira. Em soma aditiva ninguém via; com mistura
   * normal (a troca de 13/09) ele virou um RETÂNGULO de névoa em volta do
   * estouro, visível contra a grama. É o mesmo defeito do recorte quadrado das
   * nuvens da Descarga, em 12/09, e a mesma cura.
   */
  return a < 0.09 ? 0 : a;
}
/**
 * 🔴 **UM critério para MEDIR, outro para DESENHAR — e os dois são necessários.**
 *
 * A saturação é a chave certa para o recorte (é ela que salva a pedra e a
 * fumaça), mas é péssima para achar a grade: a fumaça se espalha para os lados e
 * faz ponte de uma coluna para a vizinha — medido, cinco colunas viraram três. E
 * o núcleo aceso sozinho se parte no meio: cinco viraram sete.
 *
 * ✅ O BRILHO, que não serve para recortar, serve muito bem para medir: ele pega
 * o corpo do meteoro e ignora a fumaça, que é o que separa um quadro do outro.
 * Mesma divisão de trabalho do `anel2fx`.
 */
const MEDE_PISO = 48;
const MEDE_TETO = 132;
const alfa = (x, y) => presa((lum((y * img.w + x) * 4) - MEDE_PISO) / (MEDE_TETO - MEDE_PISO));

/** Faixas contíguas acima do limiar. */
function faixas(arr, limiar) {
  const o = [];
  let j = -1;
  for (let i = 0; i <= arr.length; i++) {
    if (i < arr.length && arr[i] > limiar) { if (j < 0) j = i; }
    else if (j >= 0) { o.push([j, i - 1]); j = -1; }
  }
  return o;
}

const perfilCol = new Float64Array(img.w);
for (let x = 0; x < img.w; x++) {
  let s = 0;
  for (let y = 0; y < img.h; y++) s += alfa(x, y);
  perfilCol[x] = s;
}
/*
 * ⚠️ **As colunas são achadas por VALE perto da divisa teórica, e não por ilha.**
 *
 * Contar ilhas dá o número errado nos dois sentidos: com a fumaça no perfil, a
 * ponte entre colunas junta cinco em três; só com o núcleo, o miolo aceso se
 * parte e cinco viram sete. O que é firme é que as colunas SÃO regulares — as
 * cinco começam de 200 em 200 px, medido. Então cada divisa é o ponto mais vazio
 * perto de onde ela deveria estar, e a busca fica presa a ±16 % do passo.
 *
 * 🔴 Isto vale para as COLUNAS e não valeria para as fileiras: são as fileiras
 * que derivam nesta folha (211 a 470 px), e foi lá que a grade regular falhou.
 */
const passoCol = img.w / COL;
const divisasX = [0];
for (let k = 1; k < COL; k++) {
  const alvo = k * passoCol;
  const j0 = Math.max(1, Math.round(alvo - passoCol * 0.16));
  const j1 = Math.min(img.w - 2, Math.round(alvo + passoCol * 0.16));
  let menor = Infinity;
  let melhor = Math.round(alvo);
  for (let x = j0; x <= j1; x++) {
    const v = perfilCol[x - 1] + perfilCol[x] + perfilCol[x + 1];
    if (v < menor) { menor = v; melhor = x; }
  }
  divisasX.push(melhor);
}
divisasX.push(img.w - 1);
const colunas = divisasX.slice(0, -1).map((a, i) => [a, divisasX[i + 1]]);

/*
 * 🔴 **ALGUMAS FOLHAS SÃO GRADE DE VERDADE, e vale conferir antes de adivinhar.**
 *
 * As duas primeiras folhas verticais não eram: as fileiras derivavam de 211 a
 * 470 px e nenhuma divisão regular as descrevia. A terceira (6×5, 13/09) é — os
 * vales entre fileiras estão exatamente 307 px um do outro e o desenho ali é
 * ZERO, não "pouco".
 *
 * ✅ Então a pergunta é medida, não declarada: se existe um vale VAZIO perto de
 * cada divisa teórica, a folha tem grade e é ela que manda. Se não existe,
 * volta-se a achar cada quadro pelas ilhas — que é o que salvou as outras duas.
 *
 * ⚠️ Isto importa porque as ilhas erram nesta folha: cada quadro tem uma nuvem
 * destacada no alto, e com trinta quadros a junção pela vizinha mais próxima
 * embaralha metade deles. A grade não tem como errar quando ela existe.
 */
function grade() {
  const perfil = new Float64Array(img.h);
  for (let y = 0; y < img.h; y++) {
    let s = 0;
    for (let x = 0; x < img.w; x++) s += alfa(x, y);
    perfil[y] = s;
  }
  const pico = perfil.reduce((m, v) => Math.max(m, v), 0);
  const passo = img.h / POR_COL;
  const cortes = [0];
  for (let k = 1; k < POR_COL; k++) {
    const alvo = k * passo;
    let menor = Infinity;
    let melhor = -1;
    for (let y = Math.round(alvo - passo * 0.2); y <= Math.round(alvo + passo * 0.2); y++) {
      if (y < 1 || y >= img.h - 1) continue;
      if (perfil[y] < menor) { menor = perfil[y]; melhor = y; }
    }
    // "Vazio" é medido contra o pico da folha: meio por cento ainda é vazio.
    if (melhor < 0 || menor > pico * 0.005) return null;
    cortes.push(melhor);
  }
  cortes.push(img.h);
  return cortes;
}
const CY = grade();
console.log(`[meteoro] fileiras: ${CY ? CY.join(' ') : 'sem grade — achadas por ilha'}`);

/** Os desenhos de UMA coluna: a grade, quando há; senão as ilhas do perfil. */
function desenhosDaColuna(x0, x1) {
  if (CY) return CY.slice(0, -1).map((a, i) => [a, CY[i + 1] - 1]);
  const perfil = new Float64Array(img.h);
  for (let y = 0; y < img.h; y++) {
    let s = 0;
    for (let x = x0; x <= x1; x++) s += alfa(x, y);
    perfil[y] = s;
  }
  const pico = perfil.reduce((m, v) => Math.max(m, v), 0);
  const ilhas = faixas(perfil, pico * 0.06);
  while (ilhas.length > POR_COL) {
    /*
     * ⚠️ Sobrando ilha, junta a menor com a DE BAIXO. Cada meteoro tem uma nuvem
     * de fagulhas destacada no alto do rastro, e ela vira ilha própria; como o
     * rastro é longo, essa nuvem fica mais perto do meteoro ANTERIOR do que do
     * seu. Juntar pela distância erra; juntar para baixo acerta.
     */
    let k = 0;
    for (let i = 1; i < ilhas.length; i++) {
      if (ilhas[i][1] - ilhas[i][0] < ilhas[k][1] - ilhas[k][0]) k = i;
    }
    if (k < ilhas.length - 1) ilhas.splice(k, 2, [ilhas[k][0], ilhas[k + 1][1]]);
    else ilhas.splice(k - 1, 2, [ilhas[k - 1][0], ilhas[k][1]]);
  }
  while (ilhas.length < POR_COL) {
    // Faltando, parte a ilha mais alta no vale mais fundo do miolo dela.
    let k = 0;
    for (let i = 1; i < ilhas.length; i++) {
      if (ilhas[i][1] - ilhas[i][0] > ilhas[k][1] - ilhas[k][0]) k = i;
    }
    const [a, b] = ilhas[k];
    const m0 = a + Math.round((b - a) * 0.3);
    const m1 = a + Math.round((b - a) * 0.7);
    let corte = Math.round((a + b) / 2);
    let menor = Infinity;
    for (let y = m0; y <= m1; y++) if (perfil[y] < menor) { menor = perfil[y]; corte = y; }
    ilhas.splice(k, 1, [a, corte - 1], [corte, b]);
    ilhas.sort((p, q) => p[0] - q[0]);
  }
  return ilhas;
}

/* Uma janela por desenho, agrupadas por coluna. */
const janelas = [];
for (const [cx0, cx1] of colunas) {
  for (const [cy0, cy1] of desenhosDaColuna(cx0, cx1)) {
    let base = cy0;
    let sx = 0;
    let peso = 0;
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        const a = alfa(x, y);
        if (a <= 0.02) continue;
        if (y > base) base = y;
        sx += x * a;
        peso += a;
      }
    }
    janelas.push({
      esq: Math.round((peso > 0 ? sx / peso : (cx0 + cx1) / 2) - JAN_W / 2),
      topo: Math.round(base - JAN_H * ANCORA),
      cx0, cx1, cy0, cy1,
    });
  }
}

/*
 * A folha é lida como texto — primeira linha inteira, depois a segunda. As
 * janelas saíram agrupadas por coluna, então a ordem é transposta aqui.
 */
const ordem = [];
for (let l = 0; l < POR_COL; l++) {
  for (let c = 0; c < colunas.length; c++) ordem.push(janelas[c * POR_COL + l]);
}

/**
 * Quanto do alfa sobrevive na altura `y` do quadro `k`. Ver `FUMACA_TOPO`.
 *
 * ⚠️ **Só vale para os quadros de QUEDA**, e `k` aqui é o índice da SAÍDA — o
 * mesmo que o cliente usa para fatiar a tira. Quadro de estouro passa inteiro.
 */
function veuFumaca(k, y) {
  if (QUEDA <= 0 || k >= QUEDA) return 1;
  const forca = presa((k - FUMACA_DE) / (FUMACA_ATE - FUMACA_DE));
  if (forca <= 0) return 1;
  return 1 - forca * presa((FUMACA_TOPO - y) / FUMACA_RAMPA);
}

/** Desenha uma janela numa célula do buffer de saída. */
function pinta(q, destino, larguraTotal, k) {
  let massa = 0;
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      // Média de bloco: a janela é maior que a célula, então isto é uma redução.
      const sx0 = q.esq + Math.floor((x * JAN_W) / LARG);
      const sx1 = q.esq + Math.max(Math.floor((x * JAN_W) / LARG) + 1,
        Math.floor(((x + 1) * JAN_W) / LARG));
      const sy0 = q.topo + Math.floor((y * JAN_H) / ALT);
      const sy1 = q.topo + Math.max(Math.floor((y * JAN_H) / ALT) + 1,
        Math.floor(((y + 1) * JAN_H) / ALT));
      let sr = 0, sg = 0, sb = 0, sa = 0, peso = 0, total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total += 1;
          // A cerca do quadro: nada do vizinho entra na célula.
          if (sx < q.cx0 || sx > q.cx1 || sy < q.cy0 || sy > q.cy1) continue;
          /*
           * ⚠️ **E a cerca DESVANECE em vez de cortar reto.** Enquanto o recorte
           * era por brilho, a fumaça ficava de fora e a cerca caía sempre no
           * vazio; com a fumaça dentro (a queixa do dono), o corte seco deixa uma
           * BORDA RETA no meio dela — o quadrado que a Descarga Elétrica também
           * mostrou em 12/09. Vinte pixels de transição a escondem.
           */
          const beira = Math.min(sx - q.cx0, q.cx1 - sx, sy - q.cy0, q.cy1 - sy);
          const suave = presa(beira / 20);
          if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
          const o = (sy * img.w + sx) * 4;
          /*
           * ⚠️ **A COR SAI INTEIRA, sem desconto.** A versão aditiva descontava o
           * piso do fundo para o cinza não somar névoa; em mistura NORMAL isso
           * vira o contrário — escurece a pedra e apaga a fumaça, que é
           * exatamente o que se quer ver. Ver `mistura` em `FOLHAS_QUEDA`.
           */
          const a = alfaDe(o) * suave;
          if (a <= 0) continue;
          sr += img.px[o] * a;
          sg += img.px[o + 1] * a;
          sb += img.px[o + 2] * a;
          sa += a;
          peso += a;
        }
      }
      const alvo = Math.round((sa / Math.max(1, total)) * 255);
      /*
       * 🔴 **A MASSA é medida ANTES do véu, de propósito.** Ela decide quais
       * desenhos são fagulha e saem da tira (ver abaixo), e essa pergunta é
       * sobre o que o gerador DESENHOU — não sobre o que escolhemos mostrar.
       * Descontar a fumaça aqui mudaria quem é descartado, e um quadro de queda
       * viraria fagulha por causa de uma decisão de gosto.
       */
      massa += alvo;
      if (!destino) continue;
      const d = (y * larguraTotal + k * LARG + x) * 4;
      destino[d] = peso > 0 ? Math.round(sr / peso) : 0;
      destino[d + 1] = peso > 0 ? Math.round(sg / peso) : 0;
      destino[d + 2] = peso > 0 ? Math.round(sb / peso) : 0;
      destino[d + 3] = Math.round(alvo * veuFumaca(k, y));
    }
  }
  return massa / 255;
}

/*
 * 🔴 **AS NUVENS DE FAGULHA SAEM DA TIRA, e quem as separa é a massa DA SAÍDA.**
 *
 * A folha não tem 25 meteoros: tem meteoros e, entre eles, nuvens de fagulha que
 * o gerador desenhou soltas do rastro. Tentei juntá-las ao quadro a que
 * pertencem de três maneiras e nenhuma fecha — em algumas colunas a nuvem está
 * mais perto do meteoro anterior, em outras é desenho à parte.
 *
 * ✅ Mas depois de recortada e reenquadrada a MEDIDA separa sem ambiguidade:
 * medidas as 25, as fagulhas pesam de 174 a 771 e todo quadro de verdade pesa de
 * 1065 a 8630. Quarenta e cinco por cento da mediana (873) corta no meio desse vão, com folga dos dois
 * lados.
 *
 * ⚠️ **A massa tem de ser medida na SAÍDA, não na fonte.** Na fonte, a faixa de
 * uma fagulha inclui pedaços do meteoro vizinho e o corte não separa nada — foi
 * o que me custou uma rodada: o mesmo critério, medido um passo antes, descartou
 * três quadros em vez de nove.
 */
const massas = ordem.map((q) => pinta(q, null, 0, 0));
const mediana = [...massas].sort((a, b) => a - b)[massas.length >> 1];
const vivos = ordem.filter((_, i) => massas[i] >= mediana * 0.45);

/*
 * 💥 **E o PRIMEIRO quadro do estouro também sai, quando ele é uma fagulha.**
 *
 * A última fileira começa com um lampejo no chão que o gerador desenha enquanto
 * a pedra ainda está chegando — medido, 1985 de massa contra 11 253 do quadro
 * seguinte. Tocado em sequência, ele faz o efeito ENCOLHER no instante em que
 * devia bater mais forte: a pedra de nove tiles some e sobra uma chama de dois.
 * Era metade do *"mais forte o impacto"* que o dono pediu em 13/09.
 *
 * ⚠️ O critério é relativo ao próprio estouro, e não à folha inteira: o que
 * importa é o degrau entre um quadro e os vizinhos DELE.
 */
const massaViva = vivos.map((q) => massas[ordem.indexOf(q)]);
const doEstouro = massaViva.slice(-POR_COL);
const picoEstouro = Math.max(...doEstouro);
const finais = vivos.filter((_, i) => (
  i < vivos.length - POR_COL || massaViva[i] >= picoEstouro * 0.4
));

const N = finais.length;
const W = LARG * N;
const out = Buffer.alloc(W * ALT * 4);
finais.forEach((q, k) => pinta(q, out, W, k));

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, ALT, out));
console.log(`[meteoro] ${ordem.length - N} desenhos descartados`
  + ` (massa < ${Math.round(mediana * 0.45)})`);
console.log(`[meteoro] ${nome}.png  ${W}x${ALT}  (${N} quadros de ${LARG}x${ALT})`);
console.log(`[meteoro] ancoraY ${ANCORA} — confira o nome: a ficha do cliente`
  + ` precisa dizer ${N} quadros`);
