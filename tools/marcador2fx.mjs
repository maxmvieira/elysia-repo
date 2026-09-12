/**
 * 🎯 Corta uma folha cujo ponto fixo é o CÍRCULO NO CHÃO.
 *
 * 🔴 **Por que mais um cortador: aqui a chave não é a cor nem o rodapé, é uma
 * LINHA.** Os outros alinham por croma, por alfa, por brilho, pelo rodapé do
 * desenho ou pelo núcleo do estouro. Nesta arte o que precisa ficar parado entre
 * um quadro e o seguinte é a elipse que marca o solo — e ela não é o rodapé (há
 * brilho espalhado abaixo dela) nem o centro de massa (o facho de luz acima pesa
 * mais que o círculo).
 *
 * 🔴 **E ela PRECISA ser alinhada, porque a folha não vem alinhada.** Medido na
 * folha do marcador de movimento (12/09): a elipse fica a 83 % da altura da
 * célula nos quadros da primeira fileira e a 65 % nos da segunda. Cortada numa
 * grade simples, ela DARIA UM PULO de 62 px entre o quadro 6 e o 7 — o chão
 * saltando no meio da animação. O gerador desenhou cada fileira com o seu
 * enquadramento, e isso é comum em arte gerada por IA.
 *
 * ✅ **A linha do chão é a mais LARGA do quadro.** Uma elipse deitada é, por
 * construção, a maior extensão horizontal do desenho; o facho é estreito e o
 * losango também. Medida assim, ela sai sozinha, sem parâmetro de cor.
 *
 * ⚠️ **Quadro sem círculo herda o deslocamento do vizinho.** Nos primeiros
 * quadros o losango ainda está no ar e não há elipse nenhuma — ali a linha mais
 * larga é o próprio losango, que é estreito e mediria errado. O corte de largura
 * (`CIRCULO_MIN`) separa os dois casos, e quem não tem círculo usa o
 * deslocamento do quadro com círculo mais próximo: assim a descida continua
 * contínua em vez de dar um tranco quando a elipse aparece.
 *
 * ## Uso
 *
 *   node tools/marcador2fx.mjs <folha.png> <nome> <colunas> <fileiras> [lado]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

const [arq, nome, colArg, linArg, ladoArg] = process.argv.slice(2);
if (!arq || !nome) {
  console.error('uso: node tools/marcador2fx.mjs <folha.png> <nome> [colunas] [fileiras] [lado]');
  process.exit(1);
}
const COL = Number(colArg ?? 6) || 6;
const LIN = Number(linArg ?? 2) || 2;

/** A célula de saída, quadrada como a da fonte. */
const LADO = Number(ladoArg ?? 96) || 96;

/**
 * Onde a linha do chão fica dentro da célula de saída — e o `ancoraY` do cliente.
 *
 * ⚠️ **0,70 e não 0,83.** O facho de luz sobe muito acima da elipse; deixando-a
 * onde a arte a pôs, o topo do facho ficaria fora da célula nos quadros altos.
 * Em 0,70 cabem os dois, e o cliente ancora no mesmo número.
 */
const CHAO = 0.70;

/** Abaixo desta largura (em fração da célula) não há elipse: é só o losango. */
const CIRCULO_MIN = 0.35;

/** Piso do alfa: o véu fantasma das folhas geradas por IA. */
const PISO_ALFA = 10;

const img = decode(arq);
const cw = img.w / COL;
const ch = img.h / LIN;

/** A linha mais larga da célula `k`, ou `null` se ali não houver elipse. */
function linhaDoChao(X0, Y0) {
  let melhorY = -1;
  let melhorW = 0;
  for (let y = 0; y < Math.floor(ch); y++) {
    let x0 = Infinity;
    let x1 = -1;
    for (let x = 0; x < Math.floor(cw); x++) {
      if (img.px[((Y0 + y) * img.w + X0 + x) * 4 + 3] < 40) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
    const w = x1 < 0 ? 0 : x1 - x0 + 1;
    if (w > melhorW) { melhorW = w; melhorY = y; }
  }
  return melhorW >= cw * CIRCULO_MIN ? melhorY : null;
}

const N = COL * LIN;
const chaoDe = [];
for (let k = 0; k < N; k++) {
  chaoDe.push(linhaDoChao(Math.floor((k % COL) * cw), Math.floor(Math.floor(k / COL) * ch)));
}
/* Quem não tem círculo herda o do vizinho com círculo mais próximo. */
for (let k = 0; k < N; k++) {
  if (chaoDe[k] !== null) continue;
  for (let d = 1; d < N; d++) {
    if (chaoDe[k - d] != null) { chaoDe[k] = chaoDe[k - d]; break; }
    if (chaoDe[k + d] != null) { chaoDe[k] = chaoDe[k + d]; break; }
  }
}

const W = LADO * N;
const out = Buffer.alloc(W * LADO * 4);
for (let k = 0; k < N; k++) {
  const X0 = Math.floor((k % COL) * cw);
  const Y0 = Math.floor(Math.floor(k / COL) * ch);
  /*
   * O deslocamento vertical DESTE quadro: quanto a fonte tem de subir ou descer
   * para a linha do chão dele cair em `CHAO` da célula de saída.
   */
  const desloca = chaoDe[k] - CHAO * ch;
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const sx0 = Math.floor((x * cw) / LADO);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * cw) / LADO));
      const sy0 = Math.floor((y * ch) / LADO + desloca);
      const sy1 = Math.max(sy0 + 1, Math.floor((((y + 1) * ch) / LADO) + desloca));
      let r = 0; let g = 0; let b = 0; let a = 0; let peso = 0; let total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total += 1;
          if (sx < 0 || sy < 0 || sx >= Math.floor(cw) || sy >= Math.floor(ch)) continue;
          const o = ((Y0 + sy) * img.w + X0 + sx) * 4;
          if (img.px[o + 3] < PISO_ALFA) continue;
          /*
           * ⚠️ Média de bloco PONDERADA PELO ALFA, como nos outros cortadores: a
           * cor guardada num pixel invisível não quer dizer nada, e somá-la
           * sujaria a borda do brilho.
           */
          const p = img.px[o + 3] / 255;
          r += img.px[o] * p; g += img.px[o + 1] * p; b += img.px[o + 2] * p;
          a += img.px[o + 3]; peso += p;
        }
      }
      const d = (y * W + k * LADO + x) * 4;
      out[d] = peso > 0 ? Math.round(r / peso) : 0;
      out[d + 1] = peso > 0 ? Math.round(g / peso) : 0;
      out[d + 2] = peso > 0 ? Math.round(b / peso) : 0;
      out[d + 3] = Math.round(a / Math.max(1, total));
    }
  }
}

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, LADO, out));
console.log(`[marcador] linha do chão por quadro (px da fonte): ${chaoDe.join(' ')}`);
console.log(`[marcador] ${nome}.png  ${W}x${LADO}  (${N} quadros de ${LADO})`);
console.log(`[marcador] âncora: o CHÃO fica em ${CHAO} da célula — o cliente usa 0,5/${CHAO}.`);
