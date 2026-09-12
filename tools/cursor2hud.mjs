/**
 * 🖱️ Reduz a arte do PONTEIRO para o tamanho que um cursor CSS aceita.
 *
 * 🔴 **Por que é um cortador próprio, e não mais um `*2fx`.** Os outros recortam
 * FOLHAS — grade, fileiras, âncora por quadro. Aqui é um desenho só, e o que
 * importa é outra coisa: o **ponto quente**, o pixel que o sistema operacional
 * considera "onde o mouse está". Errar isso não deixa o cursor feio, deixa o
 * jogo impreciso — o jogador clica num monstro e acerta o tile ao lado.
 *
 * ✅ **O ponto quente sai MEDIDO da arte**: é o pixel opaco mais alto e, dentro
 * da linha dele, o mais à esquerda — a ponta da flecha. Numa seta desenhada
 * apontando para cima e para a esquerda, esse é o lugar, e ele não se chuta.
 *
 * ⚠️ **A redução é por MÉDIA DE BLOCO PONDERADA PELO ALFA**, como nos cortadores
 * de FX. A arte vem de IA a 489×671 e o cursor tem 48 px de altura: são 14×. Se
 * a média somasse a cor de pixel transparente, a borda sairia suja de preto, que
 * é a cor guardada num pixel invisível.
 *
 * ⚠️ **48 px de altura, e o padrão do Windows é 32.** A arte é ornamentada — a
 * gema, o bisel, o contorno azul — e a 32 vira um borrão cinza. O Chrome aceita
 * até 128; 48 é o meio-termo entre ler a arte e não tapar o que está embaixo.
 * Trocar o tamanho é trocar o número aqui **e** o `cursor:` do `index.html`, que
 * repete o ponto quente em pixels.
 *
 * ## Uso
 *
 *   node tools/cursor2hud.mjs arte-fonte/hud/cursor.png [altura]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/hud';
const [arq, altArg] = process.argv.slice(2);
if (!arq) {
  console.error('uso: node tools/cursor2hud.mjs <arte.png> [altura]');
  process.exit(1);
}
const ALT = Number(altArg ?? 48) || 48;

const img = decode(arq);

/* A caixa do desenho, pelo ALFA do arquivo. */
let x0 = Infinity; let x1 = -1; let y0 = Infinity; let y1 = -1;
for (let y = 0; y < img.h; y++) {
  for (let x = 0; x < img.w; x++) {
    if (img.px[(y * img.w + x) * 4 + 3] < 20) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}
const W0 = x1 - x0 + 1;
const H0 = y1 - y0 + 1;

/*
 * A PONTA: o pixel opaco mais alto e, na linha dele, o mais à esquerda.
 *
 * ⚠️ O limiar é 60 e não 20: a borda da arte tem um halo de alfa baixo que sobe
 * alguns pixels acima da ponta de verdade. Ancorar no halo põe o ponto quente no
 * vazio, e o cursor passa a clicar acima de onde a seta aponta.
 */
let pontaX = -1; let pontaY = -1;
for (let y = y0; y <= y1 && pontaY < 0; y++) {
  for (let x = x0; x <= x1; x++) {
    if (img.px[(y * img.w + x) * 4 + 3] >= 60) { pontaX = x; pontaY = y; break; }
  }
}

const LARG = Math.max(1, Math.round((W0 * ALT) / H0));
const out = Buffer.alloc(LARG * ALT * 4);
for (let y = 0; y < ALT; y++) {
  for (let x = 0; x < LARG; x++) {
    const sx0 = x0 + Math.floor((x * W0) / LARG);
    const sx1 = x0 + Math.max(Math.floor((x * W0) / LARG) + 1, Math.floor(((x + 1) * W0) / LARG));
    const sy0 = y0 + Math.floor((y * H0) / ALT);
    const sy1 = y0 + Math.max(Math.floor((y * H0) / ALT) + 1, Math.floor(((y + 1) * H0) / ALT));
    let r = 0; let g = 0; let b = 0; let a = 0; let peso = 0; let total = 0;
    for (let sy = sy0; sy < sy1; sy++) {
      for (let sx = sx0; sx < sx1; sx++) {
        total += 1;
        if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
        const o = (sy * img.w + sx) * 4;
        const p = img.px[o + 3] / 255;
        r += img.px[o] * p; g += img.px[o + 1] * p; b += img.px[o + 2] * p;
        a += img.px[o + 3]; peso += p;
      }
    }
    const d = (y * LARG + x) * 4;
    out[d] = peso > 0 ? Math.round(r / peso) : 0;
    out[d + 1] = peso > 0 ? Math.round(g / peso) : 0;
    out[d + 2] = peso > 0 ? Math.round(b / peso) : 0;
    out[d + 3] = Math.round(a / Math.max(1, total));
  }
}

const hotX = Math.round(((pontaX - x0) * LARG) / W0);
const hotY = Math.round(((pontaY - y0) * ALT) / H0);

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, 'cursor.png'), encode(LARG, ALT, out));
console.log(`[cursor] cursor.png  ${LARG}x${ALT}  (arte ${W0}x${H0})`);
console.log(`[cursor] ponto quente: ${hotX} ${hotY}  →  cursor: url(...) ${hotX} ${hotY}, default`);
