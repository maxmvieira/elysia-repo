/**
 * ☄️ Corta as folhas DIRECIONAIS do Meteoro.
 *
 * 🔴 **Por que é um cortador novo: a chave muda DENTRO da folha.**
 *
 * Os quatro cortadores anteriores têm uma chave só cada um — croma, alfa,
 * brilho, chão-ou-nuvem. Aqui as duas metades da mesma folha pedem alinhamentos
 * diferentes, e nenhum dos dois é opcional:
 *
 *  - **O VOO alinha pela CABEÇA da rocha.** É ela que tem de estar na posição
 *    interpolada a cada quadro; o rastro é enfeite que a segue. Alinhar pela
 *    caixa poria o CENTRO DO RISCO no ponto, e no último quadro a pedra já
 *    teria passado do alvo — o impacto sairia adiantado de meio rastro.
 *  - **O ESTOURO alinha pelo CHÃO**, como toda explosão: o que fica parado
 *    entre um quadro e outro é o solo, não a fumaça que sobe.
 *
 * ✅ As duas metades saem na MESMA tira, com o cliente separando por
 * `fracaoQueda`. O que muda é só onde cada uma foi ancorada dentro da célula:
 * a cabeça no meio, o chão em `ANCORA_CHAO`.
 *
 * 🔴 **E por que OITO folhas, uma por direção.** A primeira versão girava uma
 * folha só pelo rumo, e o argumento parecia bom: um meteoro é uma pedra com
 * rastro atrás, e girar o conjunto continua certo em qualquer ângulo.
 *
 * ⚠️ **Estava errado, e o dono viu antes de mim: girar gira a FUMAÇA junto.**
 * Fumaça sobe — ela não acompanha a trajetória. Numa folha girada 90° a coluna
 * de fumaça sai deitada, e não há ângulo em que isso não denuncie o truque. Arte
 * desenhada por direção é a única saída, e o custo (oito arquivos) é real.
 *
 * Uso:
 *   node tools/meteoro2fx.mjs arte-fonte/fx/meteoro_nw_se.png meteoro_se
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/** Abaixo disto o pixel é fundo. Mesma razão do véu fantasma dos outros. */
const PISO_ALFA = 20;

/** Lado da célula de saída. Potência de dois; 25 delas cabem folgado na textura. */
const LADO = 192;

/**
 * Onde o CHÃO da explosão fica dentro da célula de saída, em fração da altura.
 *
 * ⚠️ Não é 1. O estouro tem brasa e poeira espalhando ABAIXO do ponto de
 * impacto, e ancorar no rodapé levantaria a explosão inteira — foi o defeito de
 * dois tiles no ar que o relâmpago teve em 12/09, e a lição custou três
 * rodadas de "o impacto não bate".
 */
const ANCORA_CHAO = 0.88;

/**
 * Em quantos pixels da FONTE a cerca do voo some, em vez de cortar reto.
 *
 * ⚠️ 40 e não 4: o meio do caminho entre duas pedras cai em cima do rastro
 * ACESO, e quatro pixels de transição continuam sendo uma parede. 40 px da fonte
 * são 25 da célula de saída — um sexto dela, o bastante para ler como o rastro
 * esfriando.
 */
const SUAVE_VOO = 40;

/**
 * Área mínima, em pixels da fonte, para uma mancha escura ser candidata a pedra.
 *
 * ⚠️ **50, e era 250.** O piso alto existia para descartar estilhaço, e junto com
 * ele descartava a pedra dos PRIMEIROS quadros — medida, 72 px no quadro mais
 * distante da folha oeste→leste. Quem separa pedra de estilhaço agora é a cadeia
 * (ver `cabecas`), e o piso só precisa segurar poeira solta.
 */
const AREA_MIN = 50;

/**
 * ☄️ **As fileiras são MEDIDAS em cada folha, não declaradas.**
 *
 * 🔴 O dono garantiu *"mesmo padrão visual, escala e sequência"* para as oito, e
 * o gerador não entregou isso: medidas as três primeiras, elas vieram com
 * contagens diferentes (9, 9 e 7 quadros de voo), empacotamentos diferentes (numa
 * o voo encosta no estouro e o vale entre eles não zera) e uma delas com a
 * fileira de voo escrita da DIREITA PARA A ESQUERDA.
 *
 * ⚠️ Declarar a grade à mão, folha por folha, seria oito medições manuais e oito
 * chances de errar — e mais oito se ele regerar alguma. Tudo aqui sai de medida.
 *
 * As fileiras saem dos dois vales mais fundos do perfil de linha, procurados em
 * volta de 1/3 e 2/3 da altura do conteúdo.
 */
function fileirasDe(img, aceso) {
  const lin = [];
  for (let y = 0; y < img.h; y++) {
    let n = 0;
    for (let x = 0; x < img.w; x++) if (aceso(x, y)) n++;
    lin.push(n);
  }
  const y0 = lin.findIndex((v) => v > 0);
  const y1 = img.h - 1 - [...lin].reverse().findIndex((v) => v > 0);
  const cortes = [];
  for (const f of [1 / 3, 2 / 3]) {
    const alvo = y0 + (y1 - y0) * f;
    const j0 = Math.round(alvo - (y1 - y0) * 0.14);
    const j1 = Math.round(alvo + (y1 - y0) * 0.14);
    let m = Infinity;
    let yb = Math.round(alvo);
    for (let y = j0; y <= j1; y++) if (lin[y] < m) { m = lin[y]; yb = y; }
    cortes.push(yb);
  }
  return [
    { y0, y1: cortes[0] - 1, chao: false },
    { y0: cortes[0], y1: cortes[1] - 1, chao: true },
    { y0: cortes[1], y1, chao: true },
  ];
}

const GRADES = {
  /**
   * ☄️ **Noroeste → Sudeste**, a primeira das oito (12/09). 25 quadros:
   *
   *   fileira 1 — 9 quadros: o meteoro entrando, crescendo, com o rastro
   *   fileira 2 — 8 quadros: o impacto e o auge do estouro
   *   fileira 3 — 8 quadros: a dissipação, brasa e fumaça
   *
   * ⚠️ **As fileiras têm passos DIFERENTES** (9 quadros numa, 8 nas outras), e a
   * primeira tem as colunas grudadas porque os rastros diagonais se tocam. É a
   * mesma situação da folha do relâmpago: as ilhas resolvem o que dá, e a
   * divisão entra só dentro das que seguram mais de um quadro.
   *
   * ⚠️ **As outras sete usam esta MESMA grade.** O dono garantiu *"mesmo padrão
   * visual, escala e sequência, mudando apenas a direção"*; se alguma vier
   * diferente, o corte sai torto e é aqui que se mede de novo.
   */
  meteoro_dir: {
    fileiras: [
      { y0: 4, y1: 439, quadros: 9, chao: false },
      { y0: 445, y1: 745, quadros: 8, chao: true },
      { y0: 756, y1: 996, quadros: 8, chao: true },
    ],
    /** Janela recortada da FONTE, em pixels dela. */
    janela: 300,
  },
};

const [arq, nome] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/meteoro2fx.mjs <folha.png> <nome-de-saida>');
  process.exit(1);
}

const img = decode(arq);
const aceso = (x, y) => img.px[(y * img.w + x) * 4 + 3] > PISO_ALFA;
const grade = GRADES.meteoro_dir;

/** Faixas contíguas de valor não-zero. */
function faixas(arr) {
  const o = [];
  let j = -1;
  for (let i = 0; i <= arr.length; i++) {
    if (i < arr.length && arr[i] > 0) { if (j < 0) j = i; }
    else if (j >= 0) { o.push([j, i - 1]); j = -1; }
  }
  return o;
}

/**
 * Corta uma fileira em `n` colunas: ilhas separadas por vão, e divisão por vale
 * só dentro das que seguram mais de um quadro. Mesma regra do `nuvem2fx`, e
 * pelo mesmo motivo — passo teórico não sobrevive a larguras irregulares.
 */
function colunas(y0, y1, n) {
  const col = [];
  for (let x = 0; x < img.w; x++) {
    let c = 0;
    for (let y = y0; y <= y1; y++) if (aceso(x, y)) c++;
    col.push(c);
  }
  const ilhas = faixas(col);
  const x0 = ilhas[0][0];
  const x1 = ilhas[ilhas.length - 1][1];
  const passo = (x1 - x0 + 1) / n;
  const conta = ilhas.map(([a, b]) => Math.max(1, Math.round((b - a + 1) / passo)));
  let sobra = n - conta.reduce((s, v) => s + v, 0);
  while (sobra !== 0) {
    let k = 0;
    for (let i = 1; i < ilhas.length; i++) {
      if ((ilhas[i][1] - ilhas[i][0]) / conta[i] > (ilhas[k][1] - ilhas[k][0]) / conta[k]) k = i;
    }
    if (sobra > 0) { conta[k] += 1; sobra -= 1; } else if (conta[k] > 1) { conta[k] -= 1; sobra += 1; } else break;
  }
  const cortes = [x0];
  ilhas.forEach(([a, b], i) => {
    const q = conta[i];
    for (let j = 1; j < q; j++) {
      const larg = (b - a + 1) / q;
      const alvo = a + j * larg;
      let melhor = Infinity;
      let xb = Math.round(alvo);
      for (let x = Math.max(a, Math.round(alvo - larg * 0.3));
        x <= Math.min(b, Math.round(alvo + larg * 0.3)); x++) {
        if (col[x] < melhor) { melhor = col[x]; xb = x; }
      }
      cortes.push(xb);
    }
    if (i < ilhas.length - 1) cortes.push(Math.round((b + ilhas[i + 1][0]) / 2));
  });
  cortes.push(x1 + 1);
  return cortes;
}

/**
 * ☄️ **AS CABEÇAS DE ROCHA da fileira de voo, uma por quadro.**
 *
 * 🔴 **É a medida que substitui a grade inteira da fileira do voo.** Ali as
 * colunas se tocam (os rastros diagonais invadem o quadro vizinho) e a contagem
 * muda de folha para folha. Mas cada quadro tem exatamente UMA pedra, e é nela
 * que a interpolação tem de pendurar o sprite — achar as pedras responde as
 * duas perguntas de uma vez: quantos quadros e onde ancorar cada um.
 *
 * ⚠️ **A rocha é OPACA e ESCURA, e é isso que a separa do rastro.** A chama é o
 * mais brilhante da folha; a pedra tem alfa cheio e luminância baixa. Buscar
 * brilho acharia o meio do risco.
 *
 * 🔴 **E o filtro final é a SEQUÊNCIA QUE CRESCE.** O critério de rocha também
 * pega os estilhaços que voam junto — medidos, dezenove bolhas onde há nove
 * quadros. O que separa é o comportamento: a cabeça CRESCE quadro a quadro (o
 * meteoro se aproxima), e o estilhaço é pequeno e aparece no meio do caminho.
 * Uma bolha só entra se tiver ao menos 80 % da largura da anterior aceita.
 *
 * ⚠️ Isso pode perder um quadro ou outro nas pontas, e em tela não se nota: são
 * nove quadros em 1,1 s de mergulho, com a pedra crescendo quatro vezes e meia.
 * Perder um custa 70 ms de animação; errar a ÂNCORA custa o impacto no lugar
 * errado, e é dessa que o filtro protege.
 */
/**
 * 🪨 **O NÚCLEO de uma mancha: o maior círculo que cabe dentro dela.**
 *
 * 🔴 **É o que separa PEDRA de tudo o mais, e de quebra dá a âncora certa.** A
 * rocha é um disco cheio; a casca de fumaça é um arco fino, o rastro é uma faixa
 * comprida e o estilhaço é pequeno. Área, largura e enchimento confundem os
 * quatro em alguma folha — medido: a casca do último quadro da folha leste tem
 * 24 mil pixels contra 14 mil da pedra, e a fumaça da folha norte→sul é tão
 * "cheia" quanto a rocha. O MAIOR CÍRCULO INSCRITO não confunde: 75 px na pedra,
 * 12 na fumaça que tem o dobro da área.
 *
 * ✅ **E quando a pedra vem GRUDADA nos estilhaços numa mancha só** — o que
 * acontece nos quadros grandes, em quatro das oito folhas — o centro da massa cai
 * fora da pedra, mas o círculo inscrito continua no meio dela. A âncora sai certa
 * sem precisar separar as duas coisas.
 *
 * Distância de chanfro 3-4 em duas varreduras, dentro da caixa da mancha.
 */
function nucleo(bx0, by0, larg, alt, dentro) {
  /*
   * 🔴 **A ROCHA É UMA MALHA, e não um disco cheio.** Ela tem veias de lava
   * ACESAS atravessando a pedra, e para o critério "escuro e opaco" cada veia é
   * um buraco. O círculo inscrito medido direto cabia ENTRE duas veias: 24 px na
   * pedra de 82 px de largura — e a nota saía do tamanho da malha, não da pedra.
   *
   * ✅ Um FECHAMENTO (dilata, mede, desconta) tapa as veias antes de medir. O
   * `FECHA` é maior que a veia mais larga e menor que o vão entre duas pedras.
   */
  const FECHA = 9;
  const L = larg + FECHA * 2;
  const A = alt + FECHA * 2;
  const GDE = 1 << 28;
  const chanfro = (m) => {
    const d = new Int32Array(L * A);
    for (let i = 0; i < d.length; i++) d[i] = m[i] ? GDE : 0;
    const vizinhos = [[-1, 0, 3], [1, 0, 3], [0, -1, 3], [0, 1, 3],
      [-1, -1, 4], [-1, 1, 4], [1, -1, 4], [1, 1, 4]];
    const passa = (y0, y1, py, x0, x1, px) => {
      for (let y = y0; y !== y1; y += py) {
        for (let x = x0; x !== x1; x += px) {
          if (d[y * L + x] === 0) continue;
          let v = d[y * L + x];
          for (const [dy, dx, p] of vizinhos) {
            const ny = y + dy;
            const nx = x + dx;
            // Fora da caixa conta como FUNDO — a borda da janela não é pedra.
            const c = (ny < 0 || nx < 0 || ny >= A || nx >= L) ? p : d[ny * L + nx] + p;
            if (c < v) v = c;
          }
          d[y * L + x] = v;
        }
      }
    };
    passa(0, A, 1, 0, L, 1);
    passa(A - 1, -1, -1, L - 1, -1, -1);
    return d;
  };

  const m0 = new Uint8Array(L * A);
  for (let y = 0; y < alt; y++) {
    for (let x = 0; x < larg; x++) {
      if (dentro(bx0 + x, by0 + y)) m0[(y + FECHA) * L + x + FECHA] = 1;
    }
  }
  // Dilata: tudo a menos de FECHA de pedra passa a contar como pedra.
  const dFundo = chanfro(m0.map((v) => (v ? 0 : 1)));
  const m1 = new Uint8Array(L * A);
  for (let i = 0; i < m1.length; i++) m1[i] = (m0[i] || dFundo[i] <= FECHA * 3) ? 1 : 0;
  const d1 = chanfro(m1);

  let melhor = 0;
  let mx = bx0 + larg / 2;
  let my = by0 + alt / 2;
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      if (d1[y * L + x] > melhor) {
        melhor = d1[y * L + x];
        mx = bx0 + x - FECHA;
        my = by0 + y - FECHA;
      }
    }
  }
  // Desconta a dilatação: o raio que interessa é o da pedra, não o do inchaço.
  return { x: mx, y: my, raio: Math.max(1, melhor / 3 - FECHA) };
}

function cabecas(y0, y1, n) {
  const rocha = (x, y) => {
    const i = (y * img.w + x) * 4;
    if (img.px[i + 3] < 240) return false;
    return 0.299 * img.px[i] + 0.587 * img.px[i + 1] + 0.114 * img.px[i + 2] < 110;
  };
  const vis = new Uint8Array(img.w * img.h);
  const bolhas = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < img.w; x++) {
      if (vis[y * img.w + x] || !rocha(x, y)) continue;
      let sx = 0, sy = 0, pix = 0, bx0 = x, bx1 = x, by0 = y, by1 = y;
      const fila = [[x, y]];
      vis[y * img.w + x] = 1;
      while (fila.length) {
        const [cx, cy] = fila.pop();
        sx += cx; sy += cy; pix++;
        if (cx < bx0) bx0 = cx;
        if (cx > bx1) bx1 = cx;
        if (cy < by0) by0 = cy;
        if (cy > by1) by1 = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < y0 || nx >= img.w || ny > y1) continue;
          if (vis[ny * img.w + nx] || !rocha(nx, ny)) continue;
          vis[ny * img.w + nx] = 1;
          fila.push([nx, ny]);
        }
      }
      const larg = bx1 - bx0 + 1;
      const alt = by1 - by0 + 1;
      /*
       * 🔴 **A PEDRA É REDONDA E CHEIA — é isso que a separa de tudo o mais.**
       *
       * Medidos na folha oeste→leste: os discos de pedra dão 0,60 a 0,72 de
       * enchimento com os lados quase iguais; a casca escura que viaja junto (a
       * fumaça fria em volta do meteoro, um arco OCO) dá 0,22 a 0,31, e os
       * rastros verticais dão 0,26 de proporção. A casca chega a ser MAIOR em
       * área que a pedra — 23 951 px contra 14 536 no último quadro — então nem
       * área nem largura servem de peneira. Forma serve.
       */
      const ench = pix / (larg * alt);
      const asp = larg / alt;
      if (pix >= AREA_MIN && ench >= 0.45 && asp >= 0.65 && asp <= 1.5) {
        const nu = nucleo(bx0, by0, larg, alt, rocha);
        bolhas.push({ cx: nu.x, cy: nu.y, raio: nu.raio, larg, alt, area: pix });
      }
    }
  }
  if (bolhas.length === 0) return [];
  bolhas.sort((a, b) => a.cx - b.cx);

  /*
   * 🔴 **A NOTA é o RAIO ao quadrado — o tamanho do disco de pedra.**
   *
   * ⚠️ **E a âncora errada erra POR TRÁS.** A casca de fumaça fica atrás da
   * pedra, então ancorar nela pendura o RASTRO no ponto interpolado e a pedra
   * chega adiantada: o impacto sai na frente do alvo. É o mesmo defeito de "o
   * efeito não bate no lugar" do relâmpago em 12/09, e de novo a causa estava uma
   * etapa antes — no corte, e não no cliente.
   */
  const nota = (b) => b.raio * b.raio;

  /*
   * 🔴 **A CADEIA sai por programação dinâmica, e não por varredura gulosa.**
   *
   * O que se procura são `n` bolhas que formem UM MERGULHO: na ordem de leitura,
   * cada uma à frente da anterior e não menor que ela. A varredura gulosa aceita
   * a primeira que couber e fica presa nela — foi o que fez a folha oeste perder
   * a pedra maior (48 px de largura depois de uma de 63) e a folha sudoeste parar
   * em seis de oito.
   *
   * ✅ A DP escolhe o conjunto de maior nota TOTAL que respeita a regra, então
   * uma bolha boa no fim compensa uma escolha ruim no começo. Trinta bolhas e
   * nove quadros: 30×30×9 passos, instantâneo.
   *
   * ⚠️ **`n` vem das fileiras de estouro**, que separam limpo. É o mesmo gerador
   * desenhando as três fileiras, então a contagem é a mesma — e amarrar as duas
   * é o que garante que `fracaoQueda: 1/3` seja VERDADE no cliente. Sem isso, uma
   * folha com 8 quadros de voo e 7 de estouro faria o cliente cortar no lugar
   * errado, em silêncio.
   */
  /*
   * 🔴 **DOIS QUADROS NÃO PODEM ESTAR NO MESMO x.**
   *
   * Sem isto a DP encontra um atalho e o usa: na folha norte→sul cada quadro tem
   * a PEDRA e, três pixels ao lado, a coluna de fumaça escura — duas manchas no
   * mesmo x. A cadeia de sete saiu com quatro quadros reais, cada um contado
   * duas vezes (pedra e fumaça), porque a soma das notas ficava maior que
   * espalhar por sete quadros de verdade.
   *
   * ⚠️ O piso é um QUARTO do passo médio, e não um número fixo: o mergulho
   * ACELERA (medidos 96 px entre os dois primeiros quadros e 321 entre os dois
   * últimos, na folha leste), então qualquer piso perto do passo médio cortaria
   * os quadros distantes, que são os que já estão mais juntos.
   */
  const vaoX = bolhas[bolhas.length - 1].cx - bolhas[0].cx;
  const sep = (vaoX / Math.max(1, n - 1)) * 0.25;

  const cadeia = (lista) => {
    const N = lista.length;
    const melhor = Array.from({ length: n + 1 }, () => new Float64Array(N).fill(-1));
    const dedonde = Array.from({ length: n + 1 }, () => new Int32Array(N).fill(-1));
    /*
     * 🔴 **A CADEIA TEM DE ATRAVESSAR A FILEIRA, de ponta a ponta.**
     *
     * Sem isto a DP encontra outro atalho: uma cadeia inteira de estilhaços
     * amontoados numa ponta soma mais que a sequência certa, e sai "vencendo". Na
     * folha nordeste ela devolveu oito quadros espremidos no canto direito, todos
     * do tamanho de um caco.
     *
     * ⚠️ O voo começa numa borda e termina na outra — isso é verdade nas oito
     * folhas e não depende do rumo. Um quinto de folga em cada ponta é o bastante
     * para a pedra distante, que às vezes nem aparece.
     */
    const ponta = Math.abs(lista[N - 1].cx - lista[0].cx) * 0.2;
    const perto = (b, ref) => Math.abs(b.cx - ref.cx) <= ponta;
    for (let i = 0; i < N; i++) {
      if (perto(lista[i], lista[0])) melhor[1][i] = nota(lista[i]);
    }
    for (let k = 2; k <= n; k++) {
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < j; i++) {
          if (melhor[k - 1][i] < 0) continue;
          // Não encolher: a pedra se aproxima. A folga de 25 % é o ruído do
          // recorte, não uma licença para a sequência diminuir.
          if (lista[j].raio < lista[i].raio * 0.75) continue;
          if (Math.abs(lista[j].cx - lista[i].cx) < sep) continue;
          const v = melhor[k - 1][i] + nota(lista[j]);
          if (v > melhor[k][j]) { melhor[k][j] = v; dedonde[k][j] = i; }
        }
      }
    }
    /*
     * 🔴 **E a escolha é pela NOTA, e não pelo comprimento.** Preferir a cadeia
     * mais longa parece óbvio e está errado: na folha nordeste existe uma cadeia
     * de oito CACOS — que fecha a contagem — e uma de sete PEDRAS, que não fecha
     * porque a mais distante não aparece. A de cacos ganhava por um quadro e a
     * animação inteira saía errada. A soma das notas separa as duas por quatro
     * vezes, e quem chamou completa o que faltar repetindo o primeiro quadro
     * (ver `janelas`).
     */
    let saida = [];
    let melhorSoma = -1;
    for (let k = n; k >= 1; k--) {
      for (let j = 0; j < N; j++) {
        if (melhor[k][j] < 0 || !perto(lista[j], lista[N - 1])) continue;
        if (melhor[k][j] <= melhorSoma) continue;
        melhorSoma = melhor[k][j];
        saida = [];
        let i = j;
        for (let q = k; q >= 1; q--) { saida.unshift(lista[i]); i = dedonde[q][i]; }
      }
    }
    return saida;
  };

  /*
  /*
   * ⚠️ **A ORDEM DE LEITURA sai de ONDE ESTÃO AS PEDRAS GRANDES.**
   *
   * Metade das folhas está escrita da direita para a esquerda — é de lá que o
   * meteoro vem. O lado das três MAIORES responde direto: o meteoro cresce ao se
   * aproximar, então elas ficam no fim da sequência.
   *
   * 🔴 **Deixar a DP escolher a ordem (rodar as duas, ficar com a de nota maior)
   * NÃO funciona**, e é sutil: a regra "não encolher" tem 25 % de folga por
   * passo, e vinte e cinco por cento repetidos sete vezes deixam passar uma
   * sequência que DIMINUI de ponta a ponta. As duas leituras fecham, e a de trás
   * ganhou em duas folhas — com o meteoro chegando de marcha à ré.
   *
   * ⚠️ A folga de 25 % fica, e é necessária: na folha sudoeste o último quadro
   * sai CORTADO pela borda da tela e mede menos que o anterior. Apertar para 10 %
   * o descartaria — perder o quadro do impacto para não perder a ordem.
   */
  const aFrente = cadeia(bolhas);
  const deTras = cadeia([...bolhas].reverse());
  /*
   * O MERGULHO é a leitura em que a pedra mais CRESCE de ponta a ponta. A soma
   * das notas sozinha escolhe errado: a folga de 25 % por passo deixa as duas
   * leituras fecharem, e a maior soma pode ser a que anda de ré.
   */
  const cresce = (c) => (c.length < 2 ? 0 : c[c.length - 1].raio / Math.max(1, c[0].raio));
  return cresce(deTras) > cresce(aFrente) ? deTras : aFrente;
}

/** O chão: linha mais baixa com desenho, e o centro horizontal da massa ali. */
function chao(x0, x1, y0, y1) {
  let base = y0;
  for (let y = y1; y >= y0; y--) {
    let c = 0;
    for (let x = x0; x < x1; x++) if (aceso(x, y)) c++;
    if (c > 0) { base = y; break; }
  }
  let sx = 0;
  let peso = 0;
  for (let y = Math.max(y0, base - 50); y <= base; y++) {
    for (let x = x0; x < x1; x++) {
      const a = img.px[(y * img.w + x) * 4 + 3];
      if (a <= PISO_ALFA) continue;
      sx += x * a; peso += a;
    }
  }
  return [peso > 0 ? sx / peso : (x0 + x1) / 2, base];
}

/**
 * ☄️ **A fileira do VOO pode estar escrita da direita para a esquerda.**
 *
 * 🔴 E está, em metade das folhas: o meteoro que viaja para o sudoeste foi
 * desenhado com o quadro pequeno na ponta DIREITA, porque é de lá que ele vem.
 * Ler na ordem das colunas daria a animação ao contrário — a pedra encolhendo
 * até sumir, e só então o estouro.
 *
 * ✅ **Detectado por MEDIDA, não por bandeira.** O voo é uma coisa que CRESCE:
 * o primeiro quadro tem menos desenho que o último, sempre. Comparar a massa
 * das duas pontas responde sozinho, e responde certo para as oito folhas sem
 * ninguém precisar lembrar de marcar cada uma.
 *
 * ⚠️ Só vale para a fileira do voo. O estouro também muda de tamanho, mas ele
 * DIMINUI — aplicar a mesma conta lá inverteria uma fileira que está certa.
 */
function vooInvertido(y0, y1, ct, n) {
  const massa = (i) => {
    let m = 0;
    for (let y = y0; y <= y1; y++) for (let x = ct[i]; x < ct[i + 1]; x++) if (aceso(x, y)) m++;
    return m;
  };
  return massa(n - 1) < massa(0);
}

/** O perfil de coluna de uma fileira: quanto desenho há em cada x. */
function perfil(y0, y1) {
  const col = [];
  for (let x = 0; x < img.w; x++) {
    let c = 0;
    for (let y = y0; y <= y1; y++) if (aceso(x, y)) c++;
    col.push(c);
  }
  return col;
}

/**
 * 💥 **QUANTOS QUADROS TEM UMA FILEIRA — pelo PASSO, e não pelas ilhas.**
 *
 * 🔴 **As três fileiras NÃO têm a mesma contagem.** Era a suposição do cortador
 * até hoje (a última fileira separa limpo, então valia para todas), e a folha
 * norte→sul quebrou: 7 quadros de voo, **6** de impacto e **8** de dissipação, na
 * mesma folha. Contar pela última ali cortaria a fileira de 6 em 8 pedaços — sem
 * erro nenhum, com a explosão picotada.
 *
 * ⚠️ **E contar as ilhas de cada fileira também não serve**: no auge as chamas se
 * tocam, e a mesma fileira que tem 8 quadros dá 2, 3 ou 6 ilhas.
 *
 * ✅ **O que sobrevive aos dois casos é a AUTOCORRELAÇÃO**: a fileira é uma coisa
 * periódica (o mesmo desenho repetido com um passo fixo), e o passo aparece no
 * deslocamento de maior correlação, estejam os quadros grudados ou não. Medido
 * nas sete folhas, as catorze fileiras de estouro acertam a contagem.
 *
 * ⚠️ **As ilhas ainda entram como desempate.** `vão / passo` cai em 7,42 numa
 * fileira que tem 8 quadros — o último é mais estreito que o passo, e arredondar
 * erraria. Quando a contagem de ilhas está a menos de 0,6 da estimativa, ela é a
 * resposta: ilhas separadas são a medida direta, e a estimativa é que erra.
 */
function quadrosDaFileira(y0, y1) {
  const col = perfil(y0, y1);
  const x0 = col.findIndex((v) => v > 0);
  const x1 = col.length - 1 - [...col].reverse().findIndex((v) => v > 0);
  const vao = x1 - x0 + 1;
  const p = col.slice(x0, x1 + 1);
  const med = p.reduce((s, v) => s + v, 0) / p.length;
  const c = p.map((v) => v - med);
  let passo = vao;
  let melhor = -2;
  // Piso de 80 px: abaixo disso o "passo" achado é a textura da própria chama.
  for (let lag = 80; lag <= Math.floor(vao / 2); lag++) {
    let num = 0, d1 = 0, d2 = 0;
    for (let i = 0; i + lag < c.length; i++) {
      num += c[i] * c[i + lag];
      d1 += c[i] * c[i];
      d2 += c[i + lag] * c[i + lag];
    }
    const v = num / Math.sqrt(Math.max(1, d1 * d2));
    if (v > melhor) { melhor = v; passo = lag; }
  }
  const est = vao / passo;
  const ilhas = faixas(col).length;
  return Math.max(2, Math.abs(ilhas - est) <= 0.6 ? ilhas : Math.round(est));
}

/* Monta a lista de janelas, uma por quadro. */
const fileiras = fileirasDe(img, aceso);
/*
 * ⚠️ **O VOO é amarrado à MÉDIA das duas fileiras de estouro**, e não medido
 * solto. O cliente corta a tira em `fracaoQueda: 1/3` — um número escrito na
 * ficha dele, que ele não tem como conferir. Com o voo em `(n1 + n2) / 2` o total
 * é exatamente `3 × voo` e a fração é VERDADE; medindo os três lados soltos, uma
 * folha com um quadro a mais no voo faria o cliente começar o estouro no meio do
 * mergulho, em silêncio. Ver o aviso no fim.
 */
const nEstouro = fileiras.filter((f) => f.chao).map((f) => quadrosDaFileira(f.y0, f.y1));
const nVoo = Math.round(nEstouro.reduce((s, v) => s + v, 0) / nEstouro.length);
const janelas = [];
fileiras.forEach((fil, nf) => {
  if (!fil.chao) {
    // ☄️ O VOO: uma janela por cabeça de rocha, ancorada NELA.
    const achadas = cabecas(fil.y0, fil.y1, nVoo);
    /*
     * ⚠️ **Faltando pedra, repete a PRIMEIRA.** Nos quadros distantes ela tem 70
     * px de área e às vezes nem chega ao piso; perder um ali é perder o quadro
     * mais apagado da sequência. Repetir não trava o meteoro: quem move o sprite
     * é a trajetória do cliente, e a folha só diz a APARÊNCIA — dois quadros com
     * a mesma pedrinha lêem como "ainda longe".
     */
    const cabs = achadas.slice();
    while (cabs.length > 0 && cabs.length < nVoo) cabs.unshift(cabs[0]);
    console.log(`[meteoro] voo: ${cabs.length} quadros`
      + `${achadas.length < nVoo ? ` (${nVoo - achadas.length} repetidos)` : ''}`
      + ` (y ${fil.y0}..${fil.y1})`);
    // As pedras achadas, para conferir a âncora sem abrir a folha.
    console.log(`[meteoro]   pedras: ${cabs.map((c) => `${Math.round(c.cx)},${Math.round(c.cy)}`
      + `/r${Math.round(c.raio)}`).join('  ')}`);
    /*
     * ☄️ **A CERCA DO VOO sai do MEIO DO CAMINHO entre uma pedra e a seguinte.**
     *
     * 🔴 Ela não existia, e nas folhas DIAGONAIS ninguém sentiu falta: lá os
     * quadros se afastam nos dois eixos, e a janela de 300 px em volta de uma
     * pedra não alcança a vizinha. Na folha HORIZONTAL (oeste → leste) todas as
     * sete pedras estão na mesma linha, com 96 a 320 px entre elas — medido — e
     * cada célula saiu com DUAS pedras dentro. Em tela isso seria um meteoro
     * acompanhado de um fantasma que anda junto.
     *
     * ⚠️ **O preço é o rastro CURTO nos primeiros quadros**, e é o lado certo do
     * corte: o rastro de um quadro passa por cima da pedra do anterior, então
     * qualquer cerca que salve o rastro inteiro traz a pedra vizinha junto. Pedra
     * duplicada é defeito; rastro curto é uma pedra mais distante.
     *
     * ✅ **E a cerca DESVANECE em vez de cortar reto** (ver `suave`). O meio do
     * caminho cai em cima do rastro aceso, e um corte seco ali deixa uma parede
     * vertical de fogo. Sumindo aos poucos, lê como o rastro esfriando — que é o
     * que um rastro faz.
     *
     * ⚠️ Nas pontas não há vizinho, e a cerca usa o mesmo meio-vão do lado que
     * existe: sem isso o primeiro e o último quadro ficariam com regra diferente
     * dos outros seis.
     */
    const ordX = cabs.map((c) => c.cx);
    cabs.forEach((c, i) => {
      const ant = ordX[i - 1] ?? (c.cx - Math.abs((ordX[i + 1] ?? c.cx + 300) - c.cx));
      const dep = ordX[i + 1] ?? (c.cx + Math.abs(c.cx - (ordX[i - 1] ?? c.cx - 300)));
      const a = (c.cx + ant) / 2;
      const b = (c.cx + dep) / 2;
      janelas.push({
        esq: Math.round(c.cx - grade.janela / 2),
        topo: Math.round(c.cy - grade.janela * 0.5),
        cx0: Math.round(Math.min(a, b)), cx1: Math.round(Math.max(a, b)),
        cy0: fil.y0, cy1: fil.y1,
        suave: SUAVE_VOO,
      });
    });
    return;
  }
  // 💥 O ESTOURO: cada fileira com a contagem MEDIDA nela. Ver `quadrosDaFileira`.
  const quantos = nEstouro[nf - 1];
  const ct = colunas(fil.y0, fil.y1, quantos);
  console.log(`[meteoro] estouro ${nf}: ${quantos} quadros (y ${fil.y0}..${fil.y1})`);
  for (let i = 0; i < quantos; i++) {
    const a = ct[i];
    const b = ct[i + 1];
    const [cx, cy] = chao(a, b, fil.y0, fil.y1);
    janelas.push({
      esq: Math.round(cx - grade.janela / 2),
      topo: Math.round(cy - grade.janela * ANCORA_CHAO),
      cx0: a, cx1: b, cy0: fil.y0, cy1: fil.y1,
    });
  }
});

const W = LADO * janelas.length;
const out = Buffer.alloc(W * LADO * 4);
janelas.forEach((q, k) => {
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      // Média de bloco ponderada pelo alfa — a mesma dos outros cortadores.
      const sx0 = q.esq + Math.floor((x * grade.janela) / LADO);
      const sx1 = q.esq + Math.max(
        Math.floor((x * grade.janela) / LADO) + 1, Math.floor(((x + 1) * grade.janela) / LADO),
      );
      const sy0 = q.topo + Math.floor((y * grade.janela) / LADO);
      const sy1 = q.topo + Math.max(
        Math.floor((y * grade.janela) / LADO) + 1, Math.floor(((y + 1) * grade.janela) / LADO),
      );
      let r = 0, g = 0, b = 0, a = 0, peso = 0, total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total += 1;
          // A cerca da célula: nada do quadro vizinho entra.
          if (sx < q.cx0 || sx >= q.cx1 || sy < q.cy0 || sy > q.cy1) continue;
          if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
          const o = (sy * img.w + sx) * 4;
          /*
           * A cerca SUAVE: perto da borda da célula o alfa cai até zero. Só o
           * voo pede isso — ver `suave` acima. `1` deixa a conta idêntica à de
           * antes para as células de estouro, que já são cortadas num vale.
           */
          const fat = q.suave
            ? Math.max(0, Math.min(1, Math.min(sx - q.cx0, q.cx1 - 1 - sx) / q.suave))
            : 1;
          const al = img.px[o + 3] * fat;
          if (al <= PISO_ALFA) continue;
          const p = al / 255;
          r += img.px[o] * p; g += img.px[o + 1] * p; b += img.px[o + 2] * p;
          a += al; peso += p;
        }
      }
      const d = (y * W + k * LADO + x) * 4;
      out[d] = peso > 0 ? Math.round(r / peso) : 0;
      out[d + 1] = peso > 0 ? Math.round(g / peso) : 0;
      out[d + 2] = peso > 0 ? Math.round(b / peso) : 0;
      out[d + 3] = Math.round(a / Math.max(1, total));
    }
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, LADO, out));
console.log(`[meteoro] ${nome}.png  ${W}x${LADO}  (${janelas.length} quadros de ${LADO})`);

/*
 * 🔴 **O CONTRATO COM O CLIENTE, conferido aqui em vez de descoberto em tela.**
 *
 * `fracaoQueda: 1/3` está escrito na ficha do cliente e não tem como ser
 * verificado lá: uma tira com o voo fora do primeiro terço não dá erro, só toca a
 * animação picotada — e é o tipo de defeito que só aparece depois de o dono jogar
 * e reclamar. Aqui a conta existe, então é aqui que ela é conferida.
 */
if (janelas.length !== nVoo * 3) {
  console.warn(`[meteoro] ⚠️ ${janelas.length} quadros com ${nVoo} de voo:`
    + ' o voo NÃO é 1/3 da tira, e o cliente corta em 1/3.'
    + ` Fileiras de estouro medidas: ${nEstouro.join(' e ')}.`);
}
