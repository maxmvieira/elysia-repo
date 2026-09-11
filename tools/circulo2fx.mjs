/**
 * ⭕ Prepara um CÍRCULO DE CONJURAÇÃO: recorta o conteúdo, mata o véu de alfa e
 * reduz para o tamanho que o jogo usa.
 *
 * ⚠️ **O véu de alfa de novo.** Como toda folha gerada por IA, esta vem com um
 * halo de alfa 16–60 muito além do desenho. Em mistura aditiva ele acende um
 * retângulo em volta do círculo — o mesmo defeito medido na folha do meteoro em
 * 11/09. O piso corta isso; o histograma é bimodal, então não custa desenho.
 *
 * ⚠️ **O recorte é pelo CONTEÚDO, não pela moldura.** A imagem vem com margem
 * larga e desigual; guardar a moldura faria o círculo nascer descentralizado em
 * relação ao tile que ele marca, e um marcador de mira torto é pior que nenhum.
 *
 * 🔴 **A SAÍDA É QUADRADA, e a elipse de origem é ESTICADA para caber nela.**
 *
 * A arte chega desenhada em perspectiva — uma elipse, como um anel visto de
 * viés. Parece o certo e não é: **o chão deste jogo é desenhado sem
 * perspectiva**. A marca de mira que já existia é um círculo PERFEITO, e é ela
 * que define o que "deitado no chão" quer dizer aqui.
 *
 * ⚠️ E há uma segunda razão, que foi o defeito relatado em 11/09 (*"está torto
 * e não está no chão"*): **elipse não pode girar em 2D.** Girar um círculo
 * achatado não lê como disco rodando no chão — lê como anel INCLINADO, mudando
 * de inclinação. Redondo, a rotação funciona sozinha.
 *
 *   node tools/circulo2fx.mjs <imagem.png> <nome> [largura]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';
const PISO_ALFA = 40;

const [arq, nome, largArg] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/circulo2fx.mjs <imagem.png> <nome> [largura]');
  process.exit(1);
}
const LARG = Number(largArg ?? 512);

const img = decode(arq);

// Caixa do conteúdo, já com o piso aplicado.
let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
for (let y = 0; y < img.h; y++) {
  for (let x = 0; x < img.w; x++) {
    if (img.px[(y * img.w + x) * 4 + 3] < PISO_ALFA) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}
if (x1 < 0) { console.error('[circulo] nada acima do piso de alfa'); process.exit(1); }

/*
 * 🔴 **O ACHATAMENTO SAI DA MASSA, e não da moldura** — e a diferença foi o
 * defeito relatado em 11/09 (*"o anel não está redondo"*).
 *
 * A primeira versão esticava a CAIXA do recorte até virar quadrada. Parece a
 * mesma coisa e não é: a caixa inclui os losangos das quatro pontas, e eles não
 * são simétricos — os de leste e oeste avançam mais que os de norte e sul.
 * Medido nesta arte, a caixa dá 1,64:1 enquanto o ANEL é 1,95:1, e o resultado
 * ficou 19 % oval.
 *
 * ✅ O desvio-padrão do alfa em cada eixo mede o anel, não a moldura: massa
 * espalhada de verdade, sem se importar com o que sobressai numa ponta.
 *
 * ⚠️ A correção ALARGA o recorte em vez de encurtá-lo. Encurtar a altura até a
 * proporção certa cortaria os losangos de cima e de baixo; alargar só acrescenta
 * transparência nas laterais, que não custa nada.
 */
let sx = 0, sy = 0, sw = 0;
for (let y = y0; y <= y1; y++) {
  for (let x = x0; x <= x1; x++) {
    const a = img.px[(y * img.w + x) * 4 + 3];
    if (a < PISO_ALFA) continue;
    sx += x * a; sy += y * a; sw += a;
  }
}
const mx = sx / sw, my = sy / sw;
let vx = 0, vy = 0;
for (let y = y0; y <= y1; y++) {
  for (let x = x0; x <= x1; x++) {
    const a = img.px[(y * img.w + x) * 4 + 3];
    if (a < PISO_ALFA) continue;
    vx += a * (x - mx) ** 2; vy += a * (y - my) ** 2;
  }
}
const achatamento = Math.sqrt(vx / sw) / Math.sqrt(vy / sw);

const CH = y1 - y0 + 1;
const CW = Math.max(x1 - x0 + 1, Math.round(CH * achatamento));
/* ⚠️ Centrado na MASSA, não na caixa: a arte não é perfeitamente simétrica, e
 * centrar pela caixa deslocaria o anel dentro do quadro. */
const cx0 = Math.round(mx - CW / 2);
const cy0 = Math.round(my - CH / 2);
const ALT = LARG;
const out = Buffer.alloc(LARG * ALT * 4);

for (let y = 0; y < ALT; y++) {
  for (let x = 0; x < LARG; x++) {
    /*
     * ⚠️ Média de bloco PONDERADA PELO ALFA — a mesma do conversor de folhas.
     * Amostrar um pixel a cada N comeria as estrelinhas finas do anel, e somar
     * a cor de pixel invisível sujaria a borda.
     */
    const sx0 = cx0 + Math.floor((x * CW) / LARG);
    const sy0 = cy0 + Math.floor((y * CH) / ALT);
    const sx1 = cx0 + Math.floor(((x + 1) * CW) / LARG);
    const sy1 = cy0 + Math.floor(((y + 1) * CH) / ALT);
    let r = 0, g = 0, b = 0, a = 0, n = 0, total = 0;
    for (let sy = sy0; sy < Math.max(sy0 + 1, sy1); sy++) {
      for (let sx = sx0; sx < Math.max(sx0 + 1, sx1); sx++) {
        total += 1;
        // ⚠️ Fora da imagem = transparente. É o alargamento do recorte.
        if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
        const o = (sy * img.w + sx) * 4;
        const al = img.px[o + 3] < PISO_ALFA ? 0 : img.px[o + 3];
        const peso = al / 255;
        r += img.px[o] * peso; g += img.px[o + 1] * peso; b += img.px[o + 2] * peso;
        a += al; n += peso;
      }
    }
    const d = (y * LARG + x) * 4;
    out[d] = n ? Math.round(r / n) : 0;
    out[d + 1] = n ? Math.round(g / n) : 0;
    out[d + 2] = n ? Math.round(b / n) : 0;
    out[d + 3] = Math.round(a / Math.max(1, total));
  }
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(LARG, ALT, out));
console.log(`[circulo] ${nome}.png  ${LARG}x${ALT}  (recorte ${CW}x${CH}, achatamento ${achatamento.toFixed(3)})`);
