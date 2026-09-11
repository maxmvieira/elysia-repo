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

const CW = x1 - x0 + 1;
const CH = y1 - y0 + 1;
const ALT = Math.max(1, Math.round((LARG * CH) / CW));
const out = Buffer.alloc(LARG * ALT * 4);

for (let y = 0; y < ALT; y++) {
  for (let x = 0; x < LARG; x++) {
    /*
     * ⚠️ Média de bloco PONDERADA PELO ALFA — a mesma do conversor de folhas.
     * Amostrar um pixel a cada N comeria as estrelinhas finas do anel, e somar
     * a cor de pixel invisível sujaria a borda.
     */
    const sx0 = x0 + Math.floor((x * CW) / LARG);
    const sy0 = y0 + Math.floor((y * CH) / ALT);
    const sx1 = x0 + Math.floor(((x + 1) * CW) / LARG);
    const sy1 = y0 + Math.floor(((y + 1) * CH) / ALT);
    let r = 0, g = 0, b = 0, a = 0, n = 0, total = 0;
    for (let sy = sy0; sy < Math.max(sy0 + 1, sy1); sy++) {
      for (let sx = sx0; sx < Math.max(sx0 + 1, sx1); sx++) {
        total += 1;
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
console.log(`[circulo] ${nome}.png  ${LARG}x${ALT}  (recorte ${CW}x${CH} de ${img.w}x${img.h})`);
