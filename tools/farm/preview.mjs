/**
 * Compõe um .tmx num PNG único, para OLHAR antes de converter.
 *
 * Não entra no jogo: é a ferramenta de conferência. Rodar sempre que o mapa
 * mudar, e olhar o resultado — a lição do Golem de 29/08 é que erro de arte só
 * aparece em tela, e ninguém deve descobrir isso pelo jogador.
 *
 * Uso: node tools/farm/preview.mjs <arquivo.tmx> <saida.png> [escala]
 */
import { writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';
import { lerTmx, resolveGid } from './tmx.mjs';

const [entrada, saida, escalaArg] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error('uso: node tools/farm/preview.mjs <arquivo.tmx> <saida.png> [escala]');
  process.exit(1);
}
const ESC = Number(escalaArg ?? 2);

const m = lerTmx(entrada);
const imgs = new Map();
for (const ts of m.tilesets) {
  if (!imgs.has(ts.imagem)) imgs.set(ts.imagem, decode(ts.imagem));
}

const W = m.largura * m.tileW * ESC;
const H = m.altura * m.tileH * ESC;
const out = Buffer.alloc(W * H * 4);

/** Alpha-over de um tile na saída, já escalado por vizinho mais próximo. */
function poe(ts, local, dx, dy) {
  const img = imgs.get(ts.imagem);
  const sx = (local % ts.colunas) * ts.tileW;
  const sy = Math.floor(local / ts.colunas) * ts.tileH;
  for (let y = 0; y < ts.tileH * ESC; y++) {
    const oy = dy + y;
    if (oy < 0 || oy >= H) continue;
    const iy = sy + Math.floor(y / ESC);
    for (let x = 0; x < ts.tileW * ESC; x++) {
      const ox = dx + x;
      if (ox < 0 || ox >= W) continue;
      const ix = sx + Math.floor(x / ESC);
      const s = (iy * img.w + ix) * 4;
      const a = img.px[s + 3];
      if (a === 0) continue;
      const d = (oy * W + ox) * 4;
      if (a === 255) {
        out[d] = img.px[s]; out[d + 1] = img.px[s + 1];
        out[d + 2] = img.px[s + 2]; out[d + 3] = 255;
        continue;
      }
      const f = a / 255, g = 1 - f;
      out[d] = img.px[s] * f + out[d] * g;
      out[d + 1] = img.px[s + 1] * f + out[d + 1] * g;
      out[d + 2] = img.px[s + 2] * f + out[d + 2] * g;
      out[d + 3] = Math.min(255, a + out[d + 3] * g);
    }
  }
}

for (const camada of m.camadas) {
  for (let i = 0; i < camada.gids.length; i++) {
    const gid = camada.gids[i];
    if (gid === 0) continue;
    const { ts, local } = resolveGid(m.tilesets, gid);
    const tx = i % m.largura, ty = Math.floor(i / m.largura);
    poe(ts, local, tx * ts.tileW * ESC, ty * ts.tileH * ESC);
  }
}

writeFileSync(saida, encode(W, H, out));
console.log(`✅ ${saida}  ${W}x${H}px  (${m.largura}x${m.altura} tiles a ${ESC}x, ${m.camadas.length} camadas)`);
