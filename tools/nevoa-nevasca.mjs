/**
 * ☁️ Gera a folha da NÉVOA da Nevasca — a camada que faltava.
 *
 * 🔴 **Por que existe.** As folhas trazidas prontas pelo dono em 11/09 cobriam
 * duas das três camadas: `gelo_grande_sheet.png` e `particulas_menores_sheet.png`.
 * O terceiro atlas, `nevoa_base.json`, aponta para `nevoa_base_sheet.png`, e
 * **nenhum script gerava esse arquivo** — o carregamento morreria em silêncio e
 * a camada de base simplesmente não apareceria.
 *
 * ⚠️ **Névoa não é pixel art, e por isso é gerada e não desenhada.** As outras
 * duas folhas são formas duras, com contorno; esta precisa do oposto — um
 * borrão sem borda nenhuma. Feita à mão em 64×32 ela viraria um disco com
 * degraus, e o degrau é justamente o que denuncia o efeito.
 *
 * ⚠️ **Elipse achatada em 2:1**, e não círculo: é uma nuvem DEITADA no chão,
 * vista de viés. Cada quadro gira a massa um pouco, para os seis em sequência
 * lerem como rodopio em vez de piscada.
 *
 *   node tools/nevoa-nevasca.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/spells';
const LARG = 64;
const ALT = 32;
const QUADROS = 6;

const W = LARG * QUADROS;
const px = Buffer.alloc(W * ALT * 4);

/**
 * Uma massa de névoa: três lóbulos girando em torno do centro.
 *
 * ⚠️ A queda do brilho é `(1 - d)²` e não linear. Linear deixa uma borda
 * visível onde o alfa chega a zero; ao quadrado, a névoa se dissolve.
 */
/**
 * 🔴 **CINCO lóbulos, e o número não é estético — é aritmético.**
 *
 * Com três, a massa tem simetria de 120°; seis quadros a 60° de passo caem em
 * cima de si mesmos, e só existem DUAS formas distintas na folha inteira. Em
 * tela isso não lê como rodopio: lê como uma seta piscando esquerda-direita.
 * Cinco lóbulos têm período de 72°, que não divide 60 — os seis quadros saem
 * todos diferentes.
 *
 * ⚠️ E o deslocamento é curto (0,18): lóbulo longe do centro faz a massa virar
 * anel, e anel tem borda — que é o oposto de névoa.
 */
const LOBULOS = 5;

function densidade(x, y, giro) {
  let soma = 0;
  for (let k = 0; k < LOBULOS; k++) {
    const a = giro + (k * Math.PI * 2) / LOBULOS;
    const cx = Math.cos(a) * 0.18;
    const cy = Math.sin(a) * 0.18;
    const d = Math.hypot(x - cx, y - cy) / 0.70;
    if (d < 1) soma += (1 - d) * (1 - d) * 0.62;
  }
  // O núcleo comum segura o meio aceso quando os lóbulos se afastam.
  const dn = Math.hypot(x, y) / 0.95;
  if (dn < 1) soma += (1 - dn) * (1 - dn) * 0.5;
  return soma;
}

for (let q = 0; q < QUADROS; q++) {
  const giro = (q / QUADROS) * Math.PI * 2;
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      /*
       * ⚠️ Normalizado para −1..1 nos DOIS eixos. É isso que achata: a célula
       * tem 64×32, então um "raio 1" horizontal vale o dobro do vertical em
       * pixels, e a elipse 2:1 sai sozinha da conta.
       */
      const nx = (x + 0.5) / (LARG / 2) - 1;
      const ny = (y + 0.5) / (ALT / 2) - 1;
      const v = Math.min(1, densidade(nx, ny, giro));
      const o = (y * W + q * LARG + x) * 4;
      /*
       * 🔴 **Branco puro, com o alfa carregando a forma.** A cor vem do `tint`
       * na hora de desenhar — a mesma folha serve para a Nevasca (ciano) e para
       * o que vier depois. Gravar já colorido travaria isso.
       */
      px[o] = 255; px[o + 1] = 255; px[o + 2] = 255;
      px[o + 3] = Math.round(v * 190);
    }
  }
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, 'nevoa_base_sheet.png'), encode(W, ALT, px));
console.log(`[nevoa] nevoa_base_sheet.png  ${W}x${ALT}  (${QUADROS} quadros de ${LARG}x${ALT})`);
