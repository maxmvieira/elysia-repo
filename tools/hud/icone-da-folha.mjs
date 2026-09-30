/**
 * 🖼️ **O ícone de uma magia, tirado da PRÓPRIA folha de animação dela.**
 *
 * 🔴 **Por que isto existe.** Os ícones das magias saem de um pacote de 36 artes
 * prontas (`tools/hud/magias2png.mjs`), e elas estão todas alocadas — uma por
 * magia. Quando a Firewave nasceu, herdou o ícone da Muralha de Fogo que ela
 * substituiu: uma labareda de pé, que desenhava uma PAREDE. Nada no pacote é uma
 * onda de fogo, e a mais próxima já pertence a uma magia onde combina melhor.
 *
 * ✅ A saída é não disputar o pacote: **nenhuma miniatura combina mais com uma
 * magia do que um quadro dela mesma.** A folha de FX já está no repositório, já
 * tem alfa e já é a arte que o dono escolheu para aquela magia.
 *
 * ⚠️ **O quadro é escolhido a olho, e por isso é argumento.** Numa animação de
 * três atos (nasce, arde, dissipa) o que serve de retrato é um do meio — o
 * primeiro é pequeno demais e o último é fumaça. Medir não decide isso.
 *
 * ⚠️ **A moldura é QUADRADA e o quadro quase nunca é.** O desenho entra centrado e
 * inteiro, com o lado maior mandando na escala: cortar para preencher tiraria
 * justamente as pontas, que é o que dá a forma da magia.
 *
 * ## Uso
 *
 *   node tools/hud/icone-da-folha.mjs <magia> <folha> <quadro> [total]
 *
 *   node tools/hud/icone-da-folha.mjs firewave firewave 4 12
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './png.mjs';

const FOLHAS = 'client/public/assets/fx';
const DESTINO = 'client/public/assets/hud/magias';
/** Lado do ícone. O mesmo do pacote, para os slots ficarem homogêneos. */
const LADO = 128;

const [magia, folha, quadroArg, totalArg] = process.argv.slice(2);
if (!magia || !folha || quadroArg === undefined) {
  console.error('uso: node tools/hud/icone-da-folha.mjs <magia> <folha> <quadro> [total]');
  process.exit(1);
}

const img = decode(join(FOLHAS, `${folha}.png`));
/*
 * ⚠️ O total de quadros vem por argumento porque a folha é uma TIRA: a largura
 * sozinha não diz onde um quadro acaba. Sem ele, assume-se que a célula é
 * quadrada — o que vale para várias folhas do projeto, mas não para todas.
 */
const total = Number(totalArg ?? 0) || Math.max(1, Math.round(img.w / img.h));
const cw = Math.floor(img.w / total);
const ch = img.h;
const k = Number(quadroArg);
if (!Number.isInteger(k) || k < 0 || k >= total) {
  console.error(`[icone] quadro ${quadroArg} fora da folha (0..${total - 1})`);
  process.exit(1);
}

const out = Buffer.alloc(LADO * LADO * 4);
/* O lado maior manda: o desenho cabe inteiro, centrado, sem corte. */
const k2 = Math.min(LADO / cw, LADO / ch);
const alvoW = Math.round(cw * k2);
const alvoH = Math.round(ch * k2);
const offX = Math.floor((LADO - alvoW) / 2);
const offY = Math.floor((LADO - alvoH) / 2);

for (let y = 0; y < alvoH; y++) {
  for (let x = 0; x < alvoW; x++) {
    const sx0 = Math.floor((x * cw) / alvoW);
    const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * cw) / alvoW));
    const sy0 = Math.floor((y * ch) / alvoH);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * ch) / alvoH));
    let r = 0; let g = 0; let b = 0; let a = 0; let peso = 0; let n = 0;
    for (let sy = sy0; sy < sy1; sy++) {
      for (let sx = sx0; sx < sx1; sx++) {
        const o = ((sy) * img.w + k * cw + sx) * 4;
        // ⚠️ Média ponderada pelo ALFA: a cor de um pixel invisível sujaria a borda.
        const al = img.px[o + 3] / 255;
        r += img.px[o] * al; g += img.px[o + 1] * al; b += img.px[o + 2] * al;
        a += img.px[o + 3]; peso += al; n += 1;
      }
    }
    const d = ((offY + y) * LADO + offX + x) * 4;
    out[d] = peso > 0 ? Math.round(r / peso) : 0;
    out[d + 1] = peso > 0 ? Math.round(g / peso) : 0;
    out[d + 2] = peso > 0 ? Math.round(b / peso) : 0;
    out[d + 3] = Math.round(a / Math.max(1, n));
  }
}

writeFileSync(join(DESTINO, `${magia}.png`), encode(LADO, LADO, out));
console.log(`[icone] ${magia}.png  ${LADO}x${LADO}  (quadro ${k} de ${total}, célula ${cw}x${ch})`);
