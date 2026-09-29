/**
 * ❄️ Corta uma folha IRREGULAR cujo ponto fixo é o PÉ da explosão.
 *
 * 🔴 **Por que não serve nenhum dos outros cortadores.** Eles pressupõem grade —
 * colunas de passo regular, ou fileiras medidas com o mesmo número de células.
 * Esta folha (espinhos de gelo, 12/09) não tem nada disso: medida, ela traz 7
 * desenhos na primeira fileira, 4 na segunda e 6 na terceira, com larguras de
 * 174 a 340 px, e dois deles ENCOSTADOS um no outro. A ficha do dono já avisava:
 * *"se a imagem não estiver perfeitamente organizada em uma grade regular, criar
 * um recorte por coordenadas individuais; não presumir que todos os frames
 * possuem exatamente a mesma largura sem verificar"*.
 *
 * ✅ **Então nada é presumido: as fileiras saem do perfil vertical, os quadros do
 * perfil horizontal DENTRO de cada fileira, e uma ilha larga demais é partida no
 * vale que houver no meio dela.** O limiar é relativo à mediana da própria folha,
 * não um número trazido de fora.
 *
 * 🔴 **E o alinhamento é pelo PÉ, não pela caixa.** A explosão cresce para cima e
 * para o lado a partir de um pequeno halo no chão; esse halo é o que tem de
 * ficar parado sob o personagem. Medido, ele cai de 82 a 123 px do começo de
 * cada ilha — quer dizer que alinhar pelas caixas faria a explosão ANDAR pelo
 * chão durante a animação. O pé é achado como o centro de massa da faixa logo
 * acima da última linha com desenho.
 *
 * ⚠️ **A célula sai das MARGENS MEDIDAS**, e não de um tamanho escolhido: mede-se
 * quanto cada quadro precisa para cada lado do pé, toma-se o maior de cada lado,
 * e a célula é isso. Assim nenhuma ponta de espinho é cortada — que é o outro
 * pedido explícito da ficha.
 *
 * ## Uso
 *
 *   node tools/espinhos2fx.mjs <folha.png> <nome> [altura-da-celula]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';
const [arq, nome, altArg] = process.argv.slice(2);
/**
 * 🔥 **`--sem-quebra`: quadros que crescem DE PROPÓSITO não se partem.**
 *
 * 🔴 A quebra recursiva existe para folhas em que dois desenhos se encostaram,
 * e ela decide pela mediana das larguras. Isso pressupõe quadros de tamanho
 * parecido — e há folhas em que o tamanho É a animação: o cone da Firewave vai de
 * 56 a 465 px de largura, e a mediana o fez partir 14 quadros em 33.
 *
 * ⚠️ Não dá para decidir isso medindo: "larga demais" e "cresceu" têm a mesma
 * cara no perfil. Quem sabe qual é o caso é quem olhou a folha.
 */
const SEM_QUEBRA = process.argv.includes('--sem-quebra');
/**
 * 🧲 **`--junta=<px>`: ilhas mais próximas que isto são o MESMO quadro.**
 *
 * 🔴 O último quadro de uma dissipação é fumaça quase invisível, e o perfil o lê
 * como vários pedaços soltos — na folha do cone ele virou CINCO ilhas, e o
 * cortador contou 16 quadros onde havia 14.
 *
 * ⚠️ O número sai da MEDIDA daquela folha, e por isso é argumento: nela os vãos
 * DENTRO de um quadro vão até 19 px e os vãos ENTRE quadros começam em 47. Trinta
 * separa os dois grupos com folga dos dois lados; noutra arte será outro número, e
 * medir é parte de cortar.
 */
const JUNTA = Number((process.argv.find((a) => a.startsWith('--junta=')) ?? '').split('=')[1] ?? 0) || 0;
/**
 * 🔺 **`--separa=<fração>: as divisas saem da FAIXA DE BAIXO, não do desenho
 * inteiro.**
 *
 * 🔴 Numa folha de cones que crescem, os desenhos se encostam EM CIMA (onde são
 * largos) e continuam separados EMBAIXO (onde afinam até o ápice). Medido na folha
 * da Firewave: pelo perfil inteiro os vãos entre quadros chegam a 16 px — menores
 * que buracos DENTRO de um quadro, ou seja, impossível de separar. Olhando só os
 * 35 % de baixo, os sete quadros de cada fileira aparecem limpos.
 *
 * ✅ A faixa serve apenas para achar ONDE cortar; o recorte usa a altura inteira.
 */
const SEPARA = Number((process.argv.find((a) => a.startsWith('--separa=')) ?? '').split('=')[1] ?? 0) || 0;

/** Funde ilhas separadas por menos de `JUNTA` pixels. */
function juntaPerto(lista) {
  if (JUNTA <= 0 || lista.length === 0) return lista;
  const o = [lista[0]];
  for (let i = 1; i < lista.length; i++) {
    const ult = o[o.length - 1];
    if (lista[i][0] - ult[1] - 1 < JUNTA) ult[1] = lista[i][1];
    else o.push(lista[i]);
  }
  return o;
}
if (!arq || !nome) {
  console.error('uso: node tools/espinhos2fx.mjs <folha.png> <nome> [altura]');
  process.exit(1);
}
const ALT = Number(altArg ?? 160) || 160;

const img = decode(arq);
const A = (x, y) => img.px[(y * img.w + x) * 4 + 3];
const PISO = 18;

/** Faixas contíguas em que o perfil passa do limiar. */
function ilhas(v, limiar) {
  const o = [];
  let j = -1;
  for (let k = 0; k <= v.length; k++) {
    if (k < v.length && v[k] > limiar) { if (j < 0) j = k; } else if (j >= 0) { o.push([j, k - 1]); j = -1; }
  }
  return o;
}

/* 1. As fileiras, pelo perfil vertical. */
const perfilY = new Int32Array(img.h);
for (let y = 0; y < img.h; y++) {
  let n = 0;
  for (let x = 0; x < img.w; x++) if (A(x, y) > PISO) n++;
  perfilY[y] = n;
}
/*
 * ⚠️ **Fileira de menos de 10 px é ruído, não fileira.** A folha do cone tem uma
 * linha de UM pixel entre as duas fileiras de verdade — respingo do desenho —, e
 * sem este corte ela vira uma terceira fileira com quadros de um pixel de altura.
 */
const fileiras = ilhas(perfilY, 2).filter(([a, b]) => b - a + 1 >= 10);

/* 2. Os quadros de cada fileira, pelo perfil horizontal dela. */
const bruto = [];
for (const [y0, y1] of fileiras) {
  const perfilX = new Int32Array(img.w);
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < img.w; x++) if (A(x, y) > PISO) perfilX[x]++;
  }
  /*
   * ⚠️ Com `--separa`, o perfil que DIVIDE é só o da faixa de baixo; as divisas
   * ficam no meio do vão entre uma ilha e a seguinte, e cada quadro vai de uma
   * divisa à outra com a altura inteira da fileira.
   */
  if (SEPARA > 0) {
    const corte = y1 - Math.round((y1 - y0 + 1) * SEPARA);
    const perfilBase = new Int32Array(img.w);
    for (let y = corte; y <= y1; y++) {
      for (let x = 0; x < img.w; x++) if (A(x, y) > PISO) perfilBase[x]++;
    }
    const apices = juntaPerto(ilhas(perfilBase, 1));
    for (let k = 0; k < apices.length; k++) {
      const ini = k === 0 ? 0 : Math.round((apices[k - 1][1] + apices[k][0]) / 2);
      const fim = k === apices.length - 1
        ? img.w - 1
        : Math.round((apices[k][1] + apices[k + 1][0]) / 2);
      bruto.push({ x0: ini, x1: fim, y0, y1, perfilX });
    }
    continue;
  }
  for (const [x0, x1] of juntaPerto(ilhas(perfilX, 1))) bruto.push({ x0, x1, y0, y1, perfilX });
}

/*
 * ⚠️ **Ilha larga demais é MAIS DE UM desenho encostado.** A mediana das larguras
 * é a régua; acima de 1,6 dela, procura-se o vale mais fundo no miolo e corta-se
 * ali. Sem isto, dois quadros vizinhos viram um só — e a animação perde um passo
 * e ganha um borrão.
 */
/*
 * ⚠️ **E a separação é RECURSIVA, porque uma ilha pode ter mais de dois
 * desenhos.** A primeira versão partia uma vez só e servia para a folha dos
 * espinhos, onde dois quadros se encostavam. A folha da mãozinha (12/09) trouxe
 * uma ilha de 944 px onde cabiam QUATRO — partida uma vez, sobravam dois de 472,
 * cada um com duas mãos dentro. Repetir enquanto houver ilha gorda resolve
 * qualquer quantidade, e a mediana se recalcula a cada volta.
 */
const quadros = [...bruto];
for (let volta = 0; !SEM_QUEBRA && volta < 16; volta++) {
  const larguras = quadros.map((q) => q.x1 - q.x0 + 1).sort((a, b) => a - b);
  const medianaL = larguras[larguras.length >> 1] ?? 1;
  const gorda = quadros.findIndex((q) => q.x1 - q.x0 + 1 > medianaL * 1.5);
  if (gorda < 0) break;
  const q = quadros[gorda];
  const larg = q.x1 - q.x0 + 1;
  let corte = q.x0;
  let menor = Infinity;
  /*
   * ⚠️ A janela de busca é larga (25 % a 75 %) porque numa ilha de quatro o vale
   * certo NÃO fica no meio: fica a um quarto. Procurar só no miolo cortaria o
   * desenho do meio ao meio.
   */
  for (let x = q.x0 + Math.round(larg * 0.25); x <= q.x0 + Math.round(larg * 0.75); x++) {
    if (q.perfilX[x] < menor) { menor = q.perfilX[x]; corte = x; }
  }
  quadros.splice(gorda, 1, { ...q, x1: corte - 1 }, { ...q, x0: corte });
  console.log(`[espinhos] ilha de ${larg} px partida em x=${corte} (vale de ${menor} px)`);
}

/* 3. O PÉ de cada quadro: centro de massa da faixa acima da última linha com desenho. */
for (const q of quadros) {
  let base = q.y0;
  for (let y = q.y1; y >= q.y0; y--) {
    let n = 0;
    for (let x = q.x0; x <= q.x1; x++) if (A(x, y) > 25) n++;
    if (n > 2) { base = y; break; }
  }
  const alto = Math.max(q.y0, base - 18);
  let sx = 0;
  let w = 0;
  for (let y = alto; y <= base; y++) {
    for (let x = q.x0; x <= q.x1; x++) {
      const a = A(x, y);
      if (a < 25) continue;
      sx += x * a; w += a;
    }
  }
  q.pe = { x: w > 0 ? sx / w : (q.x0 + q.x1) / 2, y: base };
}

/* 4. As margens que a célula precisa em volta do pé. */
const margem = { esq: 0, dir: 0, cima: 0, baixo: 0 };
for (const q of quadros) {
  margem.esq = Math.max(margem.esq, q.pe.x - q.x0);
  margem.dir = Math.max(margem.dir, q.x1 - q.pe.x);
  margem.cima = Math.max(margem.cima, q.pe.y - q.y0);
  margem.baixo = Math.max(margem.baixo, q.y1 - q.pe.y);
}
const CW = Math.ceil(margem.esq + margem.dir);
const CH = Math.ceil(margem.cima + margem.baixo);
const K = ALT / CH;
const LARG = Math.max(1, Math.round(CW * K));

const W = LARG * quadros.length;
const out = Buffer.alloc(W * ALT * 4);
quadros.forEach((q, k) => {
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      /* Do destino para a fonte: desfaz a escala e recoloca o pé no lugar dele. */
      const sx0 = Math.floor(q.pe.x - margem.esq + x / K);
      const sx1 = Math.max(sx0 + 1, Math.floor(q.pe.x - margem.esq + (x + 1) / K));
      const sy0 = Math.floor(q.pe.y - margem.cima + y / K);
      const sy1 = Math.max(sy0 + 1, Math.floor(q.pe.y - margem.cima + (y + 1) / K));
      let r = 0; let g = 0; let b = 0; let al = 0; let peso = 0; let total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total += 1;
          if (sx < q.x0 || sx > q.x1 || sy < q.y0 || sy > q.y1) continue;
          const o = (sy * img.w + sx) * 4;
          // ⚠️ Média ponderada pelo ALFA: cor de pixel invisível sujaria a borda.
          const p = img.px[o + 3] / 255;
          r += img.px[o] * p; g += img.px[o + 1] * p; b += img.px[o + 2] * p;
          al += img.px[o + 3]; peso += p;
        }
      }
      const d = (y * W + k * LARG + x) * 4;
      out[d] = peso > 0 ? Math.round(r / peso) : 0;
      out[d + 1] = peso > 0 ? Math.round(g / peso) : 0;
      out[d + 2] = peso > 0 ? Math.round(b / peso) : 0;
      out[d + 3] = Math.round(al / Math.max(1, total));
    }
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, ALT, out));
console.log(`[espinhos] fileiras: ${fileiras.map(([a, b]) => `${a}-${b}`).join(' ')}`);
console.log(`[espinhos] ${nome}.png  ${W}x${ALT}  (${quadros.length} quadros de ${LARG}x${ALT})`);
console.log(`[espinhos] o PÉ fica em ${(margem.esq / CW).toFixed(3)} / ${(margem.cima / CH).toFixed(3)}`
  + ` da célula — é a âncora do cliente.`);
