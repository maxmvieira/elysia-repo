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
 * 🔴 **A CORREÇÃO DE REDONDEZA vem junto, e pelo mesmo motivo do outro círculo.**
 * A arte chega em perspectiva (elipse) e o chão deste jogo **não tem
 * perspectiva** — a marca de mira sempre foi um círculo perfeito. Pior: elipse
 * girando em 2D não lê como disco rodando no chão, e sim como anel INCLINADO
 * mudando de inclinação.
 *
 * ⚠️ **E o achatamento sai da MASSA, não da caixa.** Foi o erro do primeiro
 * círculo, em 11/09: esticar a caixa do recorte até virar quadrada deixou 19 %
 * de oval, porque a caixa inclui os losangos das quatro pontas e eles não são
 * simétricos — os de leste e oeste avançam mais que os de norte e sul. O
 * desvio-padrão do brilho em cada eixo mede o ANEL e ignora o que sobressai
 * numa ponta.
 *
 *   node tools/anel2fx.mjs <folha.png> <nome> [lado]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';
/** Abaixo disto o pixel é fundo. O preto da folha fica em 0–12. */
const PISO_BRILHO = 18;

/** Grade MEDIDA pelo perfil de brilho (ver o histórico de 11/09). */
const FILEIRAS = [[18, 200], [221, 403], [422, 604], [621, 803], [820, 1003]];
const COLUNAS = [[14, 242], [269, 498], [525, 754], [780, 1009], [1036, 1265], [1291, 1520]];

const [arq, nome, ladoArg] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/anel2fx.mjs <folha.png> <nome> [lado]');
  process.exit(1);
}
const LADO = Number(ladoArg ?? 256);

const img = decode(arq);
const brilho = (o) => Math.max(img.px[o], img.px[o + 1], img.px[o + 2]);

/*
 * O achatamento é medido na folha INTEIRA, e não quadro a quadro: os quadros
 * são o mesmo anel em fases diferentes do brilho, e medir cada um deixaria a
 * proporção oscilando — o anel "respiraria" ao longo da animação.
 */
let sx = 0, sy = 0, sw = 0;
for (const [cy0, cy1] of FILEIRAS) {
  for (const [cx0, cx1] of COLUNAS) {
    const mx0 = (cx0 + cx1) / 2, my0 = (cy0 + cy1) / 2;
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        const b = brilho((y * img.w + x) * 4);
        if (b < PISO_BRILHO) continue;
        sx += b * (x - mx0) ** 2; sy += b * (y - my0) ** 2; sw += b;
      }
    }
  }
}
const achatamento = Math.sqrt(sx / sw) / Math.sqrt(sy / sw);

const quadros = [];
for (const [cy0, cy1] of FILEIRAS) {
  for (const [cx0, cx1] of COLUNAS) {
    const mx = (cx0 + cx1) / 2, my = (cy0 + cy1) / 2;
    const CH = cy1 - cy0 + 1;
    /*
     * ⚠️ A janela ALARGA em x para achatar o anel na saída. Estreitar em y daria
     * a mesma proporção e cortaria os losangos de cima e de baixo.
     */
    const CW = Math.max(cx1 - cx0 + 1, Math.round(CH * achatamento));
    const ox = mx - CW / 2, oy = my - CH / 2;
    const cel = Buffer.alloc(LADO * LADO * 4);
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO; x++) {
        const sx0 = Math.round(ox + (x * CW) / LADO);
        const sy0 = Math.round(oy + (y * CH) / LADO);
        const sx1 = Math.round(ox + ((x + 1) * CW) / LADO);
        const sy1 = Math.round(oy + ((y + 1) * CH) / LADO);
        let r = 0, g = 0, b = 0, a = 0, total = 0;
        for (let s = sy0; s < Math.max(sy0 + 1, sy1); s++) {
          for (let t = sx0; t < Math.max(sx0 + 1, sx1); t++) {
            total += 1;
            if (t < 0 || s < 0 || t >= img.w || s >= img.h) continue;
            const o = (s * img.w + t) * 4;
            const br = brilho(o);
            if (br < PISO_BRILHO) continue;
            r += img.px[o]; g += img.px[o + 1]; b += img.px[o + 2]; a += br;
          }
        }
        const n = Math.max(1, total);
        const d = (y * LADO + x) * 4;
        const alfa = Math.min(255, Math.round(a / n));
        /*
         * ⚠️ A COR sai normalizada pelo próprio brilho, e não pela média crua.
         * Sem isso a borda macia sairia cinza-escura com alfa baixo — cinza em
         * cima de alfa baixo é sujeira, porque a transparência já escurece.
         */
        out4(d, alfa, r, g, b, total, cel);
      }
    }
    quadros.push(cel);
  }
}

function out4(d, alfa, r, g, b, total, cel) {
  const mx = Math.max(r, g, b) || 1;
  cel[d] = Math.round((r / mx) * 255);
  cel[d + 1] = Math.round((g / mx) * 255);
  cel[d + 2] = Math.round((b / mx) * 255);
  cel[d + 3] = alfa;
  void total;
}

const W = LADO * quadros.length;
const out = Buffer.alloc(W * LADO * 4);
quadros.forEach((cel, k) => {
  for (let y = 0; y < LADO; y++) {
    cel.copy(out, (y * W + k * LADO) * 4, y * LADO * 4, (y + 1) * LADO * 4);
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, LADO, out));
console.log(`[anel] ${nome}.png  ${W}x${LADO}  (${quadros.length} quadros, achatamento ${achatamento.toFixed(3)})`);
