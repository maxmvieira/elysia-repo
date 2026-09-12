/**
 * Corta uma folha de contato que **JÁ TEM ALFA** numa tira de FX do jogo.
 *
 * 🔴 **Por que não usa o `contato2fx.mjs`.** Aquele existe para folhas de fundo
 * PRETO, e o recorte dele é por COR: joga fora o alfa que veio no arquivo e
 * recalcula tudo pelo croma. Numa folha que já chega recortada, isso é
 * destrutivo — a fumaça cinza tem croma quase zero e sairia inteira, deixando
 * só a chama. Aqui o alfa do arquivo é a verdade e é preservado.
 *
 * ⚠️ **O PISO DE ALFA existe por causa de névoa fantasma.** Folhas geradas por
 * IA costumam vir com um véu de alfa 10–40 cobrindo a célula inteira; em
 * mistura aditiva esse véu vira um RETÂNGULO aceso em volta do efeito. Medido na
 * folha do meteoro (11/09): 787 mil pixels abaixo de alfa 16, contra 468 mil em
 * 255 — é bimodal, e cortar embaixo não tira nada do desenho.
 *
 * ⚠️ **As fileiras são MEDIDAS, e alinhadas EMBAIXO.** As alturas variam de
 * fileira para fileira; o que precisa ficar parado entre um quadro e outro é o
 * CHÃO da explosão. Esticar cada fileira para a mesma altura faria a animação
 * respirar, e centralizar faria a cratera subir e descer.
 *
 * ## Uso
 *
 *   node tools/folha-alfa2fx.mjs <folha.png> <nome-da-saida>
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/** Abaixo disto o pixel some. Ver a nota do véu, acima. */
const PISO_ALFA = 24;

const FOLHAS = {
  /**
   * 🌠 **O METEORO (11/09)**, 8 colunas × 5 fileiras = 40 quadros.
   *
   * ⚠️ **As colunas são um múltiplo exato de 192** — os vales medidos caem em
   * 192, 384, 576… nas cinco fileiras. Já as FILEIRAS não têm passo nenhum:
   * 1024/5 daria 204,8, e o desenho transborda a célula teórica. Por isso os
   * `y` abaixo são os limites do CONTEÚDO, medidos pelo perfil de alfa.
   *
   * ⚠️ Fileiras 1–2 são a queda (16 quadros) e 3–5 o impacto (24). É daí que
   * sai a `fracaoQueda` de 16/40 no cliente.
   */
  meteoro40: {
    larg: 192,
    alt: 224,
    colunas: 8,
    passoX: 192,
    fileiras: [[0, 187], [193, 412], [420, 629], [646, 818], [868, 1005]],
  },
  /*
   * ⚡ **A grade do relâmpago de 25 quadros saiu daqui no mesmo dia em que
   * entrou.** O dono trouxe arte melhor — com nuvem, e o raio descendo dela até
   * o solo —, e ela é cortada pelo `tools/nuvem2fx.mjs`, que alinha por uma
   * chave que este arquivo não tem: o CHÃO onde ele existe, a NUVEM onde ainda
   * não existe.
   *
   * ⚠️ Ficou a `recentraX` abaixo, que nasceu para aquela folha e continua
   * valendo para qualquer uma empacotada solta.
   */
  /**
   * 🔥 **A MURALHA DE FOGO (13/09)**, 6 colunas × 3 fileiras.
   *
   * ⚠️ **As colunas têm passo REGULAR (295,67) e as fileiras não** — medidas,
   * elas ocupam [52,263], [308,538] e [597,817], com alturas de 212, 231 e 221.
   * É exatamente o caso para o qual este cortador existe: alinhar EMBAIXO, porque
   * o que tem de ficar parado entre um quadro e o seguinte é a linha do chão de
   * onde as chamas sobem. Esticar as três para a mesma altura faria a muralha
   * respirar; centralizar faria o chão subir e descer.
   *
   * ⚠️ **Saída de 160×128, e a proporção é a da fonte** (295×231 ≈ 1,28 contra
   * 1,25). Quadrado deformaria as chamas: elas são mais largas que altas, e
   * espremer a largura as deixaria finas como velas.
   */
  muralha18: {
    larg: 160,
    alt: 128,
    colunas: 6,
    passoX: 295,
    fileiras: [[52, 263], [308, 538], [597, 817]],
  },
};

const [folhaArq, nome] = process.argv.slice(2);
if (!folhaArq || !nome) {
  console.error('uso: node tools/folha-alfa2fx.mjs <folha.png> <nome>');
  process.exit(1);
}
const grade = FOLHAS[nome];
if (!grade) {
  console.error(`[fx] sem grade medida para "${nome}". Conhecidas: ${Object.keys(FOLHAS).join(', ')}`);
  process.exit(1);
}

const img = decode(folhaArq);

/**
 * Centro horizontal do NÚCLEO BRANCO de uma célula, ou `null` se não houver.
 *
 * ⚠️ **Núcleo branco, e não centro de massa.** O que tem de ficar parado entre
 * um quadro e outro é o ponto de IMPACTO; o centro de massa é puxado pelos
 * galhos elétricos, que saem para um lado diferente em cada quadro.
 */
function nucleoX(img, x0, x1, y0, y1) {
  let soma = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * img.w + x) * 4;
      if (img.px[o + 3] < 200) continue;
      if (Math.min(img.px[o], img.px[o + 1], img.px[o + 2]) < 225) continue;
      soma += x;
      n++;
    }
  }
  return n > 0 ? soma / n : null;
}

/** Recorta as células, já com o alfa do arquivo e o piso aplicado. */
const quadros = [];
for (const [y0, y1] of grade.fileiras) {
  for (let c = 0; c < grade.colunas; c++) {
    const w = grade.passoX;
    /*
     * ⚠️ A janela é recentrada no núcleo quando a grade pede, e presa às bordas
     * da folha: um quadro da primeira coluna cujo núcleo esteja a 60 px da
     * esquerda pediria um recorte começando em −42, e o que entraria ali seria
     * o vazio — melhor perder alguns pixels de simetria que meia coluna.
     */
    let x0 = c * grade.passoX;
    if (grade.recentraX) {
      const cx = nucleoX(img, x0, Math.min(img.w, x0 + w), y0, y1);
      if (cx !== null) x0 = Math.max(0, Math.min(img.w - w, Math.round(cx - w / 2)));
    }
    const h = y1 - y0 + 1;
    const cel = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = ((y0 + y) * img.w + x0 + x) * 4;
        const d = (y * w + x) * 4;
        const a = img.px[o + 3];
        if (a < PISO_ALFA) continue;
        cel[d] = img.px[o];
        cel[d + 1] = img.px[o + 1];
        cel[d + 2] = img.px[o + 2];
        cel[d + 3] = a;
      }
    }
    quadros.push({ px: cel, w, h });
  }
}

const LARG = grade.larg;
const ALT = grade.alt;
const W0 = Math.max(...quadros.map((q) => q.w));
const H0 = Math.max(...quadros.map((q) => q.h));
const W = LARG * quadros.length;
const out = Buffer.alloc(W * ALT * 4);

quadros.forEach((q, k) => {
  const dx = Math.floor((W0 - q.w) / 2);
  const dy = H0 - q.h;
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      /*
       * ⚠️ Redução por MÉDIA de bloco, PONDERADA PELO ALFA. Amostrar um pixel a
       * cada N apagaria as fagulhas de um pixel; e somar a cor de pixel
       * transparente sujaria a borda, porque num pixel invisível a cor guardada
       * não quer dizer nada.
       */
      const sx0 = Math.floor((x * W0) / LARG) - dx;
      const sy0 = Math.floor((y * H0) / ALT) - dy;
      const sx1 = Math.floor(((x + 1) * W0) / LARG) - dx;
      const sy1 = Math.floor(((y + 1) * H0) / ALT) - dy;
      let r = 0, g = 0, b = 0, a = 0, n = 0, total = 0;
      for (let sy = sy0; sy < Math.max(sy0 + 1, sy1); sy++) {
        for (let sx = sx0; sx < Math.max(sx0 + 1, sx1); sx++) {
          total += 1;
          if (sx < 0 || sy < 0 || sx >= q.w || sy >= q.h) continue;
          const o = (sy * q.w + sx) * 4;
          const peso = q.px[o + 3] / 255;
          r += q.px[o] * peso; g += q.px[o + 1] * peso; b += q.px[o + 2] * peso;
          a += q.px[o + 3]; n += peso;
        }
      }
      const d = (y * W + k * LARG + x) * 4;
      out[d] = n ? Math.round(r / n) : 0;
      out[d + 1] = n ? Math.round(g / n) : 0;
      out[d + 2] = n ? Math.round(b / n) : 0;
      out[d + 3] = Math.round(a / Math.max(1, total));
    }
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, ALT, out));
console.log(`[fx] ${nome}.png  ${W}x${ALT}  (${quadros.length} quadros de ${LARG}x${ALT})`);
