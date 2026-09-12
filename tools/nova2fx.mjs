/**
 * ❄️ Corta folhas de EXPLOSÃO RADIAL — grade limpa, fundo preto, centro medido.
 *
 * 🔴 **Por que não é o `meteoro-grade2fx`, que também lê fundo opaco.** Aquele
 * ancora cada quadro pelo RODAPÉ do desenho, porque no meteoro o que tem de cair
 * no tile é a pedra (o rastro sobe atrás dela) ou o chão da cratera. Aqui o
 * efeito é uma explosão de 360° em volta do conjurador: o que tem de cair NOS PÉS
 * dele é o NÚCLEO, e ele não está no rodapé nem no meio do quadro — nas primeiras
 * fileiras a arte desenha o anel a uns 60 % da altura, nas últimas a estrela é
 * centrada.
 *
 * ✅ Então a âncora sai MEDIDA: o centro de massa dos pixels mais quentes, que
 * numa explosão é o clarão do impacto. Uma linha, e ela vale para os 20 quadros
 * sem ninguém declarar nada.
 *
 * ⚠️ **A grade aqui não é adivinhada: é conferida.** Se algum vale entre células
 * não estiver vazio, o corte avisa em vez de sair torto — foi a lição das três
 * folhas do Meteoro, onde eu supus grade duas vezes e errei as duas.
 *
 * Uso:
 *   node tools/nova2fx.mjs arte-fonte/fx/glacial.png glacial_burst 5 4
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/**
 * A rampa do recorte. O fundo desta arte é preto CHAPADO (mediana 0, p95 1), o
 * que é o caso fácil: qualquer coisa acima do ruído é desenho.
 */
const PISO = 8;
const TETO = 48;

/** Acima disto o pixel conta como NÚCLEO, e é dele que sai a âncora. */
const NUCLEO = 180;

/** A célula de saída. Quadrada, porque a explosão é radial. */
const LADO = 192;

const [arq, nome, colArg, linArg] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/nova2fx.mjs <folha.png> <nome> [colunas] [fileiras]');
  process.exit(1);
}
const COL = Number(colArg ?? 5);
const LIN = Number(linArg ?? 4);

const img = decode(arq);
const lum = (o) => 0.299 * img.px[o] + 0.587 * img.px[o + 1] + 0.114 * img.px[o + 2];
const presa = (v) => Math.max(0, Math.min(1, v));
const alfa = (x, y) => presa((lum((y * img.w + x) * 4) - PISO) / (TETO - PISO));

const cw = img.w / COL;
const ch = img.h / LIN;

/*
 * ⚠️ **Confere a grade antes de usá-la.** Os vales entre células têm de estar
 * VAZIOS; se não estiverem, a arte não está na grade que o nome promete e o
 * corte sairia partindo quadros ao meio — em silêncio.
 */
const perfil = (eixo, tamanho, outro) => {
  const p = new Float64Array(tamanho);
  for (let i = 0; i < tamanho; i++) {
    let s = 0;
    for (let j = 0; j < outro; j++) s += eixo === 'x' ? alfa(i, j) : alfa(j, i);
    p[i] = s;
  }
  return p;
};
const pcol = perfil('x', img.w, img.h);
const plin = perfil('y', img.h, img.w);
const pico = Math.max(...pcol, ...plin);
const confere = (p, passo, quantos, eixo) => {
  for (let k = 1; k < quantos; k++) {
    const i = Math.round(k * passo);
    const v = Math.min(p[i - 1] ?? 0, p[i] ?? 0, p[i + 1] ?? 0);
    if (v > pico * 0.01) {
      console.warn(`[nova] ⚠️ divisa ${eixo}=${i} NÃO está vazia (${v.toFixed(1)}`
        + ` contra pico ${pico.toFixed(1)}) — a folha pode não estar na grade ${COL}×${LIN}.`);
    }
  }
};
confere(pcol, cw, COL, 'x');
confere(plin, ch, LIN, 'y');

const N = COL * LIN;
const W = LADO * N;
const out = Buffer.alloc(W * LADO * 4);

for (let k = 0; k < N; k++) {
  const x0 = Math.floor((k % COL) * cw);
  const x1 = Math.floor((k % COL + 1) * cw) - 1;
  const y0 = Math.floor(Math.floor(k / COL) * ch);
  const y1 = Math.floor((Math.floor(k / COL) + 1) * ch) - 1;

  /*
   * 🔴 **A ÂNCORA É O NÚCLEO**, e o peso é o brilho ACIMA do limiar — não o
   * brilho todo. Com o peso cheio, os cristais espalhados puxariam o centro para
   * onde houvesse mais deles, e o clarão do impacto sairia fora do tile.
   */
  let sx = 0, sy = 0, peso = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const L = lum((y * img.w + x) * 4);
      if (L < NUCLEO) continue;
      const w = L - NUCLEO;
      sx += x * w; sy += y * w; peso += w;
    }
  }
  // Sem núcleo (os últimos quadros, só poeira): fica o centro da célula.
  const cx = peso > 0 ? sx / peso : (x0 + x1) / 2;
  const cy = peso > 0 ? sy / peso : (y0 + y1) / 2;
  // A janela é a célula inteira, centrada no núcleo — nada do vizinho entra.
  const jan = Math.min(cw, ch);
  const esq = cx - jan / 2;
  const topo = cy - jan / 2;

  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      // Média de bloco: a célula da fonte é maior que a de saída.
      const sx0 = Math.floor(esq + (x * jan) / LADO);
      const sx1 = Math.max(sx0 + 1, Math.floor(esq + ((x + 1) * jan) / LADO));
      const sy0 = Math.floor(topo + (y * jan) / LADO);
      const sy1 = Math.max(sy0 + 1, Math.floor(topo + ((y + 1) * jan) / LADO));
      let sr = 0, sg = 0, sb = 0, sa = 0, p = 0, total = 0;
      for (let yy = sy0; yy < sy1; yy++) {
        for (let xx = sx0; xx < sx1; xx++) {
          total += 1;
          if (xx < x0 || xx > x1 || yy < y0 || yy > y1) continue;
          const o = (yy * img.w + xx) * 4;
          const a = alfa(xx, yy);
          if (a <= 0) continue;
          sr += img.px[o] * a; sg += img.px[o + 1] * a; sb += img.px[o + 2] * a;
          sa += a; p += a;
        }
      }
      const d = (y * W + k * LADO + x) * 4;
      out[d] = p > 0 ? Math.round(sr / p) : 0;
      out[d + 1] = p > 0 ? Math.round(sg / p) : 0;
      out[d + 2] = p > 0 ? Math.round(sb / p) : 0;
      out[d + 3] = Math.round((sa / Math.max(1, total)) * 255);
    }
  }
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, LADO, out));
console.log(`[nova] ${nome}.png  ${W}x${LADO}  (${N} quadros de ${LADO})`);
console.log('[nova] âncora: o NÚCLEO fica no centro da célula — o cliente usa 0,5/0,5.');
