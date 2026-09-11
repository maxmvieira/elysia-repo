/**
 * ⭕ Converte a folha ANIMADA do círculo de conjuração numa tira de FX.
 *
 * 🔴 **Fundo preto e arte MONOCROMÁTICA — o recorte é pelo BRILHO.**
 *
 * Nem o `contato2fx.mjs` nem o `folha-alfa2fx.mjs` servem aqui. O primeiro
 * recorta por CROMA, e este desenho é branco sobre preto: croma zero na folha
 * inteira, ele apagaria tudo menos o núcleo mais claro. O segundo exige um alfa
 * que este arquivo não tem (chegou em `rgb24`).
 *
 * ✅ O certo para arte assim é **alfa = brilho**: o preto some sozinho, o traço
 * fica cheio, e o meio-tom vira borda macia. É a mesma conta que a mistura
 * aditiva já faria em tela — a diferença é que gravá-la no alfa deixa o anel
 * legível também em mistura normal.
 *
 * 🔴 **CADA QUADRO É REENQUADRADO NO PRÓPRIO CENTRO.** Foi o defeito relatado em
 * 11/09 (*"ainda ficou meio torto"*): a primeira versão recortava todos os
 * quadros pela grade medida, e os círculos não estão exatamente no mesmo lugar
 * dentro das células. Medido na saída, o centro variava até 6 px em 256 — o anel
 * BALANÇAVA ao longo da animação, e balanço lê como torto mesmo quando cada
 * quadro, parado, está redondo.
 *
 * ⚠️ **O centro sai da CAIXA e não da massa, e aqui é o contrário do outro
 * caso.** O que se move entre os quadros é o BRILHO varrendo a circunferência —
 * e o brilho puxa o centro de massa atrás de si. A caixa, ao contrário, é
 * cravada pelos quatro losangos das pontas, que são fixos em todos os quadros.
 *
 * 🔴 **A REDONDEZA, essa sim, sai da massa.** A caixa inclui os losangos e eles
 * não são simétricos — os de leste e oeste avançam mais que os de norte e sul.
 * Esticar a caixa até virar quadrada foi o erro do círculo anterior e deixou
 * 19 % de oval. O desvio-padrão do brilho em cada eixo mede o ANEL.
 *
 * ⚠️ E o achatamento é medido na folha INTEIRA, não quadro a quadro: os quadros
 * são o mesmo anel em fases diferentes do brilho, e medir cada um deixaria a
 * proporção oscilando — o anel respiraria ao longo da animação.
 *
 * ⚠️ **A amostragem é BILINEAR porque isto AUMENTA a imagem.** Cada círculo da
 * folha tem ~230 px e o jogo desenha o anel a 416 px (a área da Chuva de
 * Meteoros). Média de bloco só ajuda quando se reduz; ampliando, ela vira
 * vizinho-mais-próximo e serrilha o traço fino — foi a outra metade do *"a
 * definição caiu bastante"*.
 *
 * ⚠️ E por isso o lado padrão é **512 e não 256**: com 256 o Pixi ainda teria de
 * AMPLIAR para 416 na hora de desenhar, e ampliar é onde se perde nitidez. A
 * 512 o desenho é uma REDUÇÃO, que sai limpa.
 *
 *   node tools/anel2fx.mjs <folha.png> <nome> [lado]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';
/** Abaixo disto o pixel é fundo. O preto da folha fica em 0–12. */
const PISO_BRILHO = 18;
/**
 * ⚠️ Piso ALTO para achar a caixa, e de propósito: o halo fraco em volta do anel
 * se mexe com o brilho, e incluí-lo na caixa devolveria o balanço que este
 * recorte existe para tirar. Os losangos passam folgados deste valor.
 */
const PISO_CAIXA = 90;

/**
 * As grades MEDIDAS pelo perfil de brilho, por nome de saída.
 *
 * 🔴 **`redondo` é a decisão de desenho, e as duas folhas discordam de
 * propósito.**
 *
 *  - `anel_conjuracao` deita no CHÃO, e o chão deste jogo não tem perspectiva:
 *    ele precisa virar círculo perfeito.
 *  - `anel_caster` ORBITA O CORPO, visto quase de lado. A elipse dele é o
 *    desenho, não um defeito — arredondá-lo poria o anel de pé na frente do
 *    personagem em vez de em volta dele.
 */
const GRADES = {
  anel_conjuracao: {
    redondo: true,
    fileiras: [[18, 200], [221, 403], [422, 604], [621, 803], [820, 1003]],
    colunas: [[14, 242], [269, 498], [525, 754], [780, 1009], [1036, 1265], [1291, 1520]],
  },
  anel_caster: {
    redondo: false,
    fileiras: [[53, 192], [244, 384], [436, 576], [628, 768], [819, 959]],
    colunas: [[15, 242], [270, 497], [526, 753], [781, 1008], [1037, 1264], [1292, 1519]],
  },
  /**
   * ⚡ **A ESFERA ELÉTRICA (12/09): 8 colunas × 2 fileiras, grade UNIFORME.**
   *
   * 🔴 **E sem recentrar, que é o oposto do que os anéis precisam.** Nos anéis o
   * recentro existe para matar o balanço: o desenho é o mesmo em todos os
   * quadros e só o brilho gira. Aqui é o contrário — a esfera NASCE pequena no
   * meio, CRESCE e o rastro se estica para a esquerda. O deslocamento dentro da
   * célula **é a animação**; recentrar a apagaria.
   *
   * ⚠️ E a grade é por DIVISÃO, não medida: o rastro de um quadro invade a
   * célula do vizinho, então não há vale escuro para o detector achar. 1881/8 e
   * 836/2 dão as fronteiras que o gerador usou.
   *
   * 🔴 **E foi por aqui que o defeito entrou.** 1881/8 = 235,125 — a divisão não
   * fecha em pixel inteiro, e o erro se acumula célula a célula. A tira que saiu
   * tem células de 159 a 247 px, com as linhas da grade do desenho original
   * ainda impressas nela e já fora de lugar. O cliente então fatiava ESSA tira
   * em dezesseis colunas iguais, e do quinto quadro em diante mostrava o fim de
   * uma esfera junto com o começo da seguinte — o *"muitas pontas"* que o dono
   * relatou em 12/09.
   *
   * ✅ A esfera não passa mais por aqui: `tools/esfera2fx.mjs` lê a tira, acha
   * as linhas de verdade e corta por elas. Esta entrada fica como registro de
   * onde o erro nasceu — dividir quando dava para medir.
   */
  esfera_eletrica: {
    redondo: false,
    recentra: false,
    preservaCor: true,
    uniforme: { colunas: 8, fileiras: 2 },
  },
};

const [arq, nome, ladoArg] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/anel2fx.mjs <folha.png> <nome> [lado]');
  process.exit(1);
}
const grade = GRADES[nome];
if (!grade) {
  console.error(`[anel] sem grade medida para "${nome}". Conhecidas: ${Object.keys(GRADES).join(', ')}`);
  process.exit(1);
}
const LADO = Number(ladoArg ?? 512);

const img = decode(arq);

/*
 * ⚠️ A grade uniforme é montada DEPOIS de abrir a imagem, porque ela sai da
 * divisão das dimensões reais. As medidas à mão continuam vindo da tabela.
 */
const faixas = (total, quantas) => Array.from({ length: quantas }, (_, i) => [
  Math.round((i * total) / quantas),
  Math.round(((i + 1) * total) / quantas) - 1,
]);
const FILEIRAS = grade.uniforme
  ? faixas(img.h, grade.uniforme.fileiras)
  : grade.fileiras;
const COLUNAS = grade.uniforme
  ? faixas(img.w, grade.uniforme.colunas)
  : grade.colunas;
const brilho = (x, y) => {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return 0;
  const o = (y * img.w + x) * 4;
  const b = Math.max(img.px[o], img.px[o + 1], img.px[o + 2]);
  return b < PISO_BRILHO ? 0 : b;
};

/** As células, na ordem em que viram quadros. */
const celulas = [];
for (const [cy0, cy1] of FILEIRAS) {
  for (const [cx0, cx1] of COLUNAS) celulas.push({ cx0, cx1, cy0, cy1 });
}

/**
 * 🔴 **O ACHATAMENTO SAI DE UMA ELIPSE AJUSTADA AO ANEL, e é a TERCEIRA
 * tentativa de medi-lo.** O caminho vale registrar porque cada método errou por
 * um motivo diferente:
 *
 * | método | deu | por que erra |
 * |---|---|---|
 * | caixa do recorte | 1,251 | inclui os losangos, que não são simétricos |
 * | desvio-padrão do brilho | 1,365 | o halo e o brilho varrendo puxam a massa |
 * | **elipse ajustada** | **1,404** | — |
 *
 * Os 3 % entre a massa e a verdade foram o *"não está 100 % redondo"* de 11/09.
 *
 * ✅ O ajuste mede o ANEL e mais nada: dispara raios do centro e anota onde cada
 * um cruza o traço. Para uma elipse vale `1/r² = u·cos²θ + v·sin²θ`, que é
 * LINEAR em `u` e `v` — dois somatórios resolvem, sem iteração.
 *
 * ⚠️ **Os raios EVITAM 0°, 90°, 180° e 270°**, que é onde moram os losangos das
 * pontas. Incluí-los mediria a ponta e não o anel, que é exatamente o erro do
 * método da caixa com outra roupa.
 *
 * ⚠️ E o resultado é a MEDIANA dos trinta quadros, não a média: em alguns o
 * brilho forte fora do traço puxa o ajuste daquele quadro (a amostra vai de
 * 1,25 a 1,60), e a mediana ignora esses sem precisar escolher quais.
 */
const ANGULOS = [];
for (let g = 20; g < 360; g += 10) {
  const m = g % 90;
  if (m >= 18 && m <= 72) ANGULOS.push((g * Math.PI) / 180);
}

function ajustaElipse(c) {
  const cx = (c.cx0 + c.cx1) / 2, cy = (c.cy0 + c.cy1) / 2;
  const limite = (Math.min(c.cx1 - c.cx0, c.cy1 - c.cy0) / 2) * 1.3;
  let A = 0, B = 0, C = 0, D = 0, E = 0;
  for (const th of ANGULOS) {
    const dx = Math.cos(th), dy = Math.sin(th);
    let r = 0;
    for (let t = limite; t > 4; t -= 0.5) {
      if (brilho(Math.round(cx + dx * t), Math.round(cy + dy * t)) > PISO_CAIXA) { r = t; break; }
    }
    if (!r) continue;
    const c2 = dx * dx, s2 = dy * dy, w = 1 / (r * r);
    A += c2 * c2; B += c2 * s2; C += s2 * s2; D += c2 * w; E += s2 * w;
  }
  const det = A * C - B * B;
  if (!det) return null;
  const u = (D * C - E * B) / det, v = (A * E - B * D) / det;
  if (u <= 0 || v <= 0) return null;
  // a/b = sqrt(v/u), porque a = 1/sqrt(u) e b = 1/sqrt(v).
  return Math.sqrt(v / u);
}

const razoes = celulas.map(ajustaElipse).filter((r) => r !== null).sort((p, q) => p - q);
if (razoes.length === 0) { console.error('[anel] não consegui medir o anel'); process.exit(1); }
let achatamento = razoes[razoes.length >> 1];

/**
 * 🔴 **E o número medido pode ser SOBRESCRITO, porque medir não bastou.**
 *
 * O ajuste acima mede o traço mais externo que encontra. Nesta arte isso inclui
 * as FOLHAGENS das diagonais, que avançam mais que o anel pontilhado — e o olho
 * julga o pontilhado, que é a silhueta. Com o número cru (1,395) o anel saía 8 %
 * mais alto que largo, e foi o *"não está 100 % redondo"* de 11/09.
 *
 * ✅ O valor usado hoje saiu de MEDIR A SAÍDA contra um círculo de verdade e
 * corrigir: `1,395 × 0,918 ≈ 1,28`. Não é chute — é a mesma conta feita uma vez
 * a mais, do outro lado do conversor.
 *
 * ⚠️ Quem trocar a folha tem de refazer essa volta: gerar com o medido, abrir a
 * saída com um círculo sobreposto e ajustar. O argumento existe para isso.
 */
const ACHATAMENTO_FORCADO = { anel_conjuracao: 1.28 };
const forcado = Number(process.argv[5] ?? ACHATAMENTO_FORCADO[nome] ?? 0);
if (forcado > 0) achatamento = forcado;

/* A caixa de CADA quadro: centro estável e altura comum. */
const caixas = celulas.map((c) => {
  let x0 = c.cx1, x1 = c.cx0, y0 = c.cy1, y1 = c.cy0;
  for (let y = c.cy0; y <= c.cy1; y++) {
    for (let x = c.cx0; x <= c.cx1; x++) {
      if (brilho(x, y) < PISO_CAIXA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { mx: (x0 + x1) / 2, my: (y0 + y1) / 2, alt: y1 - y0 + 1, larg: x1 - x0 + 1 };
});

/*
 * ⚠️ A JANELA É A MESMA para todos os quadros — só o centro muda. Tamanho por
 * quadro faria o anel pulsar de tamanho, que é o mesmo defeito do balanço com
 * outro nome. Uma folga de 8 % evita raspar os losangos no quadro mais largo.
 */
const CH = grade.recentra === false
  ? celulas[0].cy1 - celulas[0].cy0 + 1
  : Math.round(Math.max(...caixas.map((b) => b.alt)) * 1.08);
/*
 * ⚠️ Só a folha REDONDA esticada pelo achatamento; a que orbita o corpo mantém
 * a largura medida, porque a elipse dela é o desenho. Ver `GRADES`.
 */
const CW = grade.recentra === false
  ? celulas[0].cx1 - celulas[0].cx0 + 1
  : grade.redondo
    ? Math.round(CH * achatamento)
    : Math.round(Math.max(...caixas.map((b) => b.larg)) * 1.08);
/** A célula de saída acompanha a janela quando não se arredonda. */
const LADO_Y = grade.redondo ? LADO : Math.round((LADO * CH) / CW);

/** Amostra bilinear do brilho e da cor. Ver a nota de ampliação no cabeçalho. */
function amostra(fx, fy) {
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  let r = 0, g = 0, b = 0, a = 0;
  for (const [dx, dy, w] of [
    [0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)],
    [0, 1, (1 - tx) * ty], [1, 1, tx * ty],
  ]) {
    const br = brilho(x0 + dx, y0 + dy);
    if (!br) continue;
    const o = ((y0 + dy) * img.w + (x0 + dx)) * 4;
    r += img.px[o] * w; g += img.px[o + 1] * w; b += img.px[o + 2] * w; a += br * w;
  }
  return [r, g, b, a];
}

/*
 * 🔴 **A SAÍDA É UMA GRADE, e não uma tira.** Trinta quadros de 512 em fila dão
 * uma textura de 15 360 px de largura — passa do teto de 8 192 que placas mais
 * modestas impõem, e aí a folha não carrega e o anel some sem erro nenhum. Em
 * grade 6×5 são 3 072×2 560, com o mesmo número de pixels e nenhum risco.
 *
 * ⚠️ O cliente fatia por `COLS`; mudar aqui sem mudar lá corta os quadros no
 * lugar errado.
 */
/*
 * ⚠️ A esfera sai em TIRA (16 colunas, uma fileira): ela é um projétil, e o
 * cliente fatia projétil por largura/quadros, como as outras tiras de efeito.
 * Os anéis vão em grade porque 30 quadros de 384 estourariam a largura máxima
 * de textura; 16 de 192 cabem folgados.
 */
const COLS = grade.uniforme ? celulas.length : 6;
const LINHAS = Math.ceil(celulas.length / COLS);
const W = LADO * COLS;
const H = LADO_Y * LINHAS;
const out = Buffer.alloc(W * H * 4);
caixas.forEach((cx, k) => {
  /*
   * ⚠️ Sem recentrar, a janela É a célula: o deslocamento do desenho dentro
   * dela é a animação, e centrar cada quadro a apagaria. Ver `recentra`.
   */
  const ox = grade.recentra === false ? celulas[k].cx0 : cx.mx - CW / 2;
  const oy = grade.recentra === false ? celulas[k].cy0 : cx.my - CH / 2;
  const gx = (k % COLS) * LADO;
  const gy = Math.floor(k / COLS) * LADO_Y;
  for (let y = 0; y < LADO_Y; y++) {
    for (let x = 0; x < LADO; x++) {
      const [r, g, b, a] = amostra(ox + ((x + 0.5) * CW) / LADO, oy + ((y + 0.5) * CH) / LADO_Y);
      const d = ((gy + y) * W + gx + x) * 4;
      /*
       * 🔴 **A COR SAI BRANCA, sempre, e a forma inteira vive no ALFA.**
       *
       * A arte é monocromática: normalizar cada pixel pelo próprio pico já dava
       * quase branco, com ruído. Cravar branco puro tem três efeitos, e os três
       * são bons:
       *
       *  - o `tint` do cliente passa a mandar de verdade na cor do anel;
       *  - a borda macia não sai cinza-escura sobre alfa baixo, que é sujeira —
       *    a transparência já escurece sozinha;
       *  - e os três canais viram constantes, o que o PNG comprime quase de
       *    graça: a folha caiu de 6,4 MB para 2,7 MB sem perder um pixel.
       */
      /*
       * ⚠️ **A ESFERA PRESERVA A COR; os anéis não.** O anel é monocromático e
       * quem manda na cor dele é o `tint` do cliente — gravar branco puro deixa
       * isso funcionar e comprime muito melhor. A esfera tem núcleo branco com
       * arcos AZUIS, e achatar tudo para branco jogaria fora metade do desenho;
       * tingir depois não devolve, porque a tinta multiplica por igual.
       */
      const pico = grade.preservaCor ? (Math.max(r, g, b) || 1) : 0;
      out[d] = grade.preservaCor ? Math.round((r / pico) * 255) : 255;
      out[d + 1] = grade.preservaCor ? Math.round((g / pico) * 255) : 255;
      out[d + 2] = grade.preservaCor ? Math.round((b / pico) * 255) : 255;
      out[d + 3] = Math.min(255, Math.round(a));
    }
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, H, out));
console.log(
  `[anel] ${nome}.png  ${W}x${H}  (${celulas.length} quadros em ${COLS} colunas`
  + `, janela ${CW}x${CH}, achatamento ${achatamento.toFixed(3)})`,
);
