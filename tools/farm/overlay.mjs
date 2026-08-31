/**
 * Preview de CONFERÊNCIA: a fazenda desenhada com a colisão derivada por cima.
 *
 *   vermelho = sólido    azul = água    verde = porta (vão andável)
 *
 * Não entra no jogo. Existe porque a tabela do `layers.mjs` é um palpite
 * informado até alguém OLHAR — e olhar é o único teste que vale para arte. As
 * quatro correções documentadas lá saíram todas daqui: a precedência da água, a
 * margem do lago, a cerca escondida na camada `beds` e o tile #517 que não era
 * cerca. Nenhuma delas teria dado erro; teriam dado fazenda quebrada em silêncio.
 *
 * ⚠️ A colisão vem do `colisao.mjs`, a MESMA que o conversor usa. Se este
 * arquivo recalculasse por conta, o preview poderia mentir — e um conferidor que
 * mente é pior que nenhum.
 *
 * Uso: node tools/farm/overlay.mjs [saida.png]
 */
import { writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';
import { lerTmx, resolveGid } from './tmx.mjs';
import { CAMADAS } from './layers.mjs';
import { derivaColisao, ilhasAndaveis } from './colisao.mjs';

const saida = process.argv[2] ?? 'farm-colisao.png';
const ESC = 2;
const m = lerTmx('assets/Farm/Tiled_files/Farm.tmx', { ignorarNoLimite: new Set([82, 83]) });
const imgs = new Map();
for (const ts of m.tilesets) if (!imgs.has(ts.imagem)) imgs.set(ts.imagem, decode(ts.imagem));

const W = m.largura * m.tileW * ESC;
const H = m.altura * m.tileH * ESC;
const out = Buffer.alloc(W * H * 4);

function poe(ts, local, dx, dy) {
  const img = imgs.get(ts.imagem);
  const sx = (local % ts.colunas) * ts.tileW;
  const sy = Math.floor(local / ts.colunas) * ts.tileH;
  for (let y = 0; y < ts.tileH * ESC; y++) {
    const oy = dy + y; if (oy < 0 || oy >= H) continue;
    const iy = sy + ((y / ESC) | 0);
    for (let x = 0; x < ts.tileW * ESC; x++) {
      const ox = dx + x; if (ox < 0 || ox >= W) continue;
      const ix = sx + ((x / ESC) | 0);
      const s = (iy * img.w + ix) * 4;
      const a = img.px[s + 3]; if (a === 0) continue;
      const d = (oy * W + ox) * 4;
      const f = a / 255, g = 1 - f;
      out[d] = img.px[s] * f + out[d] * g;
      out[d + 1] = img.px[s + 1] * f + out[d + 1] * g;
      out[d + 2] = img.px[s + 2] * f + out[d + 2] * g;
      out[d + 3] = Math.min(255, a + out[d + 3] * g);
    }
  }
}

for (const camada of m.camadas) {
  if (CAMADAS[camada.id].bichos) continue; // bicho vira criatura, não arte
  for (let i = 0; i < camada.gids.length; i++) {
    const gid = camada.gids[i]; if (!gid) continue;
    const { ts, local } = resolveGid(m.tilesets, gid);
    poe(ts, local, (i % m.largura) * ts.tileW * ESC, ((i / m.largura) | 0) * ts.tileH * ESC);
  }
}

const col = derivaColisao(m, decode);

function tinge(i, r, g, b) {
  const tx = (i % m.largura) * 16 * ESC, ty = ((i / m.largura) | 0) * 16 * ESC;
  for (let y = 0; y < 16 * ESC; y++) for (let x = 0; x < 16 * ESC; x++) {
    const d = ((ty + y) * W + tx + x) * 4;
    out[d] = out[d] * 0.55 + r * 0.45;
    out[d + 1] = out[d + 1] * 0.55 + g * 0.45;
    out[d + 2] = out[d + 2] * 0.55 + b * 0.45;
    out[d + 3] = 255;
  }
}
let nS = 0, nA = 0, nP = 0;
for (let i = 0; i < col.solido.length; i++) {
  if (col.porta[i]) { tinge(i, 40, 255, 80); nP++; }
  else if (col.agua[i]) { tinge(i, 60, 120, 255); nA++; }
  else if (col.solido[i]) { tinge(i, 255, 40, 40); nS++; }
}

writeFileSync(saida, encode(W, H, out));
const total = m.largura * m.altura;
console.log(`✅ ${saida}`);
console.log(`   sólido ${nS} (${(nS / total * 100).toFixed(0)}%)  água ${nA}  porta ${nP}`
  + `  andável ${total - nS - nA} (${((total - nS - nA) / total * 100).toFixed(0)}%)`);

/*
 * As ilhas: a maior é a fazenda; as três seguintes têm que ser os currais, que
 * são fechados de propósito (portão sólido). Qualquer outra ilha de tamanho
 * relevante é horta sem rota, e é defeito.
 */
const ilhas = ilhasAndaveis(m, col);
console.log(`   ${ilhas.length} ilhas andáveis:`);
for (const cels of ilhas) {
  if (cels.length < 4) continue;
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const i of cels) {
    const x = i % m.largura, y = (i / m.largura) | 0;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  console.log(`     ${String(cels.length).padStart(4)} células   x ${x0}..${x1}  y ${y0}..${y1}`);
}
