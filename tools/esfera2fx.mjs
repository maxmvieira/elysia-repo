/**
 * ⚡ Corta a folha da **Esfera Elétrica** nas duas tiras que o jogo usa.
 *
 * 🔴 **A GRADE DESTA FOLHA NÃO É UNIFORME, e essa foi a causa raiz do defeito
 * relatado pelo dono em 12/09** (*"está dando muitas pontas nos quadros da
 * magia"*).
 *
 * O cliente fatiava a folha em dezesseis colunas de `largura / 16` = 192 px. Só
 * que as células não têm 192 px: medidas pelos separadores DESENHADOS na própria
 * folha, elas vão de 161 a 251 px. Erro acumulado, e a partir do quinto quadro
 * cada "quadro" mostrado era um pedaço de um mais o começo do seguinte —
 * **duas esferas e dois rastros no mesmo desenho**. É isso que lia como espinhos.
 *
 * ✅ Aqui as células saem dos separadores de verdade: colunas cobertas de ponta
 * a ponta por um cinza uniforme. Elas também são jogadas fora, e não é detalhe —
 * em mistura aditiva aquela linha apareceria acesa em tela.
 *
 * 🔴 **DUAS SAÍDAS, porque são duas animações com ritmos diferentes.** Foi a
 * lição do meteoro (11/09): um `AnimatedSprite` tem UMA velocidade, e enfiar a
 * queda e o estouro na mesma tira obriga os dois a compartilharem um ritmo que
 * não serve para nenhum dos dois.
 *
 *   `esfera_orbe.png`   — a bola, em vaivém, para VOAR e para PULSAR no alvo.
 *   `esfera_choque.png` — o estouro radial, uma vez por descarga.
 *
 * 🔴 **O ORBE É RECORTADO EM DISCO, e o rastro fica de fora.** A folha desenha
 * uma bola viajando **para a direita**, com a cauda assada no quadro. Um rastro
 * assado só funciona se o projétil andar sempre naquele sentido — e o nosso anda
 * em nove direções. Girar o sprite para o rumo do tiro resolveria a direção e
 * não resolve o pulsar: parada no alvo, a bola não tem rumo nenhum e a cauda
 * fica apontando para o nada.
 *
 * ✅ Referência dada pelo dono (o Trovão de Júpiter do RO, 12/09): lá o projétil
 * é uma **bola branca redonda, sem cauda**, deslizando rente ao chão. O disco
 * entrega isso e resolve as duas coisas de uma vez.
 *
 * ⚠️ **O centro do disco é o NÚCLEO BRANCO, não o centro de massa.** O centro de
 * massa é puxado pela cauda — nos quadros longos ele cai fora da bola, e o
 * recorte comeria metade dela. O núcleo é achado pelos pixels quase brancos
 * (`min(r,g,b)` alto) e opacos: os arcos são azuis e finos, e não entram nessa
 * conta.
 *
 * Uso:
 *   node tools/esfera2fx.mjs arte-fonte/fx/esfera_eletrica.png
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/** Lado dos quadros de saída, nos dois arquivos. Potência de dois, 128 basta. */
const LADO = 128;

/**
 * Raio do disco do orbe, na escala da FOLHA.
 *
 * ⚠️ Medido, não escolhido: o núcleo branco tem raio 20–40 px conforme o quadro,
 * e o halo azul da bola vai a ~1,8× disso. 72 px pega a bola inteira com a
 * borda macia e corta a cauda, que começa por volta de 90 px do centro.
 */
const RAIO_ORBE = 72;
/** Onde o disco começa a desaparecer. A borda dura denunciaria o recorte. */
const SUAVE_DE = 52;

/**
 * Os quadros de cada saída, por índice na folha.
 *
 * ⚠️ **O orbe vai e VOLTA.** Ele toca em laço enquanto a esfera existe; uma tira
 * só de ida daria um salto do último quadro para o primeiro a cada volta, e
 * salto lê como piscada. O vaivém fecha o ciclo sozinho.
 *
 * ⚠️ **O orbe para no quadro 6.** Do sétimo em diante a folha já está montando o
 * estouro, e a bola perde a forma — em laço isso lê como a magia explodindo sem
 * parar.
 */
const ORBE = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2];
/**
 * ⚠️ **O choque começa no 9 e não no 8.** O oitavo ainda é bola com cauda; o
 * nono é o primeiro em que os raios saem para TODOS os lados, que é o desenho
 * do impacto. Vai até o 14 — o 15 é fumaça e some sozinho.
 */
const CHOQUE = [9, 10, 11, 12, 13, 14];

const [folhaArq] = process.argv.slice(2);
if (!folhaArq) {
  console.error('uso: node tools/esfera2fx.mjs <folha.png>');
  process.exit(1);
}

const { w: W, h: H, px } = decode(folhaArq);

/**
 * Colunas separadoras: cobertas de cima a baixo e sem brilho.
 *
 * ⚠️ O critério é COBERTURA, e não cor. Uma coluna de desenho pode ser clara e
 * cheia num quadro do meio do estouro; o que nenhuma coluna de desenho é, é
 * opaca nos 342 pixels de altura.
 */
function separadores() {
  const cols = [];
  for (let x = 0; x < W; x++) {
    let cobertos = 0;
    let luz = 0;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      if (px[i + 3] > 40) cobertos++;
      luz = Math.max(luz, Math.min(px[i], px[i + 1], px[i + 2]) * (px[i + 3] / 255));
    }
    if (cobertos / H > 0.9 && luz < 120) cols.push(x);
  }
  // Colunas vizinhas são a MESMA linha (ela tem 1–2 px). Fica a primeira.
  const unicas = [];
  for (const x of cols) if (unicas.length === 0 || x - unicas[unicas.length - 1] > 4) unicas.push(x);
  return unicas;
}

const sep = separadores();
const bordas = [0, ...sep.filter((x) => x > 0), W];
const celulas = [];
for (let i = 0; i < bordas.length - 1; i++) {
  // +2/−2: a linha tem espessura, e um pixel dela sobrando acende a borda.
  celulas.push([bordas[i] + 2, bordas[i + 1] - 2]);
}
console.log(`[esfera] ${celulas.length} células: ${celulas.map(([a, b]) => b - a).join(', ')} px`);

/** Centro do núcleo BRANCO da célula. Ver o cabeçalho. */
function nucleo([x0, x1]) {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      if (px[i + 3] < 200) continue;
      if (Math.min(px[i], px[i + 1], px[i + 2]) < 215) continue;
      sx += x; sy += y; n++;
    }
  }
  if (n === 0) return [(x0 + x1) / 2, H / 2];
  return [sx / n, sy / n];
}

/**
 * Monta uma tira.
 *
 * `disco` liga o recorte circular — ligado no orbe, desligado no choque, onde os
 * raios para fora SÃO o desenho.
 */
function tira(indices, disco, lado) {
  const OW = lado * indices.length;
  const out = Buffer.alloc(OW * lado * 4);
  // A escala é a MESMA em todos os quadros: cada um no seu tamanho faria a bola
  // pular de diâmetro a cada troca.
  const meia = disco ? RAIO_ORBE : 150;
  indices.forEach((idx, k) => {
    const cel = celulas[idx];
    const [cx, cy] = nucleo(cel);
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        // Centro do pixel de saída, em coordenadas da folha.
        const fx = cx + ((x + 0.5) / lado - 0.5) * 2 * meia;
        const fy = cy + ((y + 0.5) / lado - 0.5) * 2 * meia;
        const passo = (2 * meia) / lado;
        // Média de bloco ponderada pelo alfa — a mesma conta do `folha-alfa2fx`,
        // e pela mesma razão: amostrar um pixel só apagaria os fiapos finos.
        let r = 0, g = 0, b = 0, a = 0, peso = 0, total = 0;
        const sx0 = Math.round(fx - passo / 2), sx1 = Math.max(sx0 + 1, Math.round(fx + passo / 2));
        const sy0 = Math.round(fy - passo / 2), sy1 = Math.max(sy0 + 1, Math.round(fy + passo / 2));
        for (let sy = sy0; sy < sy1; sy++) {
          for (let sx = sx0; sx < sx1; sx++) {
            total++;
            if (sx < cel[0] || sx >= cel[1] || sy < 0 || sy >= H) continue;
            const o = (sy * W + sx) * 4;
            const p = px[o + 3] / 255;
            r += px[o] * p; g += px[o + 1] * p; b += px[o + 2] * p;
            a += px[o + 3]; peso += p;
          }
        }
        let alfa = Math.round(a / Math.max(1, total));
        if (disco) {
          const d = Math.hypot(fx - cx, fy - cy);
          if (d >= RAIO_ORBE) alfa = 0;
          else if (d > SUAVE_DE) {
            const t = (d - SUAVE_DE) / (RAIO_ORBE - SUAVE_DE);
            // Queda suave (cosseno) e não linear: a linear ainda deixa um anel
            // visível onde a derivada quebra.
            alfa = Math.round(alfa * (0.5 + 0.5 * Math.cos(Math.PI * t)));
          }
        }
        const d = (y * OW + k * lado + x) * 4;
        out[d] = peso ? Math.round(r / peso) : 0;
        out[d + 1] = peso ? Math.round(g / peso) : 0;
        out[d + 2] = peso ? Math.round(b / peso) : 0;
        out[d + 3] = alfa;
      }
    }
  });
  return { OW, out };
}

mkdirSync(DESTINO, { recursive: true });

const orbe = tira(ORBE, true, LADO);
writeFileSync(join(DESTINO, 'esfera_orbe.png'), encode(orbe.OW, LADO, orbe.out));
console.log(`[esfera] esfera_orbe.png   ${orbe.OW}x${LADO}  (${ORBE.length} quadros de ${LADO})`);

const choque = tira(CHOQUE, false, LADO * 2);
writeFileSync(join(DESTINO, 'esfera_choque.png'), encode(choque.OW, LADO * 2, choque.out));
console.log(`[esfera] esfera_choque.png ${choque.OW}x${LADO * 2}  (${CHOQUE.length} quadros de ${LADO * 2})`);
