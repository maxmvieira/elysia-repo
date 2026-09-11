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
const FILEIRAS = grade.fileiras;
const COLUNAS = grade.colunas;
const LADO = Number(ladoArg ?? 512);

const img = decode(arq);
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

/* O achatamento do ANEL, medido na folha inteira. Ver o cabeçalho. */
let vx = 0, vy = 0, vw = 0;
for (const c of celulas) {
  const mx = (c.cx0 + c.cx1) / 2, my = (c.cy0 + c.cy1) / 2;
  for (let y = c.cy0; y <= c.cy1; y++) {
    for (let x = c.cx0; x <= c.cx1; x++) {
      const b = brilho(x, y);
      if (!b) continue;
      vx += b * (x - mx) ** 2; vy += b * (y - my) ** 2; vw += b;
    }
  }
}
const achatamento = Math.sqrt(vx / vw) / Math.sqrt(vy / vw);

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
const CH = Math.round(Math.max(...caixas.map((b) => b.alt)) * 1.08);
/*
 * ⚠️ Só a folha REDONDA esticada pelo achatamento; a que orbita o corpo mantém
 * a largura medida, porque a elipse dela é o desenho. Ver `GRADES`.
 */
const CW = grade.redondo
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
const COLS = 6;
const LINHAS = Math.ceil(celulas.length / COLS);
const W = LADO * COLS;
const H = LADO_Y * LINHAS;
const out = Buffer.alloc(W * H * 4);
caixas.forEach((cx, k) => {
  const ox = cx.mx - CW / 2;
  const oy = cx.my - CH / 2;
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
      out[d] = 255;
      out[d + 1] = 255;
      out[d + 2] = 255;
      out[d + 3] = Math.min(255, Math.round(a));
      void r; void g; void b;
    }
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, H, out));
console.log(
  `[anel] ${nome}.png  ${W}x${H}  (${celulas.length} quadros em ${COLS} colunas`
  + `, janela ${CW}x${CH}, achatamento ${achatamento.toFixed(3)})`,
);
