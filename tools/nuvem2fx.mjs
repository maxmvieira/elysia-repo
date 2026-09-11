/**
 * ⛈️ Corta folhas de **raio que desce de uma nuvem**, alinhando pelo CHÃO onde
 * ele existe e pela NUVEM onde ele ainda não existe.
 *
 * 🔴 **Por que não serve nenhum dos cortadores que já temos.** A chave do corte
 * é o que tem de ficar PARADO entre um quadro e outro, e aqui são duas coisas
 * diferentes em momentos diferentes:
 *
 *  - `contato2fx` recorta por croma, `folha-alfa2fx` pelo alfa que veio no
 *    arquivo, `anel2fx` pelo brilho. Todos os três alinham por CAIXA — o
 *    `folha-alfa2fx` encosta as fileiras no rodapé.
 *  - Nesta folha a caixa mente. Nos primeiros quadros o desenho é só a nuvem, e
 *    o "rodapé" dele é a ponta do raio, que DESCE quadro a quadro. Encostar
 *    isso no rodapé faria a nuvem subir enquanto o raio cresce — exatamente o
 *    contrário do que a animação conta.
 *
 * ✅ Regra deste cortador:
 *
 *  - Fileira que CHEGA AO CHÃO (a descarga e a dissipação): alinhada pelo chão.
 *    É onde o jogador está olhando, e é onde o dano sai.
 *  - Fileira que NÃO chega (a nuvem se formando e o raio descendo): alinhada
 *    pela NUVEM, posta na altura que ela tem na fileira da descarga.
 *
 * ⚠️ **A arte não tem altura de nuvem constante, e isso foi medido:** na
 * fileira 3 a nuvem fica ~374 px acima do chão; na 4, ~240. Alinhar tudo pela
 * nuvem faria o CLARÃO DO CHÃO pular 130 px no meio da magia — e o clarão é o
 * que marca a célula atingida. Alinhar pelo chão faz a nuvem descer um pouco na
 * dissipação, que é o defeito mais barato dos dois: nessa fileira ela já está
 * encolhendo e sumindo, então descer junto lê como a tempestade se desfazendo.
 *
 * 🔴 **As colunas são CORTADAS POR MÍNIMO, não divididas.** A folha é
 * empacotada solta: medidos os centros, o passo da fileira 4 vai de 169 a 122
 * px. Dividir a largura pelo número de quadros erraria mais a cada coluna — foi
 * o defeito que a folha da Esfera Elétrica trouxe em 12/09, e que só apareceu em
 * tela como "muitas pontas".
 *
 * Uso:
 *   node tools/nuvem2fx.mjs arte-fonte/fx/relampago_nuvem.png relampago31
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/fx';

/** Abaixo disto o pixel some. Mesma razão do `folha-alfa2fx`: véu fantasma. */
const PISO_ALFA = 20;

const FOLHAS = {
  /**
   * ⛈️ **O RELÂMPAGO COM NUVEM (12/09)**, 31 quadros em 4 fileiras de 9, 7, 7 e 8.
   *
   * ⚠️ As fileiras são os limites do CONTEÚDO, medidos pelo perfil de alfa. Só
   * a fronteira entre a 3 e a 4 tem vale zerado; as outras duas saíram dos
   * mínimos locais do perfil (y≈232 e y≈497).
   *
   * `chao: true` marca as fileiras em que o raio ENCOSTA no solo. São elas que
   * ditam onde o clarão fica, e as outras se penduram na altura da nuvem delas.
   */
  /**
   * ⛈️ **O RELÂMPAGO COM NUVEM ESCURA (12/09)**, 24 quadros em 3 fileiras de 8,
   * 7 e 9. A terceira arte desta magia no mesmo dia, e a que o dono aprovou.
   *
   * A sequência é a que ele mandou observar do começo ao fim: **a nuvem se
   * juntando** (fileira 1, com o relâmpago ainda preso dentro dela), **a
   * descarga** batendo no chão (fileira 2) e **a dissipação** (fileira 3).
   *
   * ⚠️ As fileiras são os limites do CONTEÚDO, medidos pelo perfil de alfa. Só a
   * primeira fronteira tem vale zerado; a que separa a 2 da 3 saiu do mínimo
   * local (y=731, 26 px acesos contra centenas nas vizinhas).
   *
   * ⚠️ **A fileira 1 não tem chão** — o raio ainda não desceu. Ela se pendura na
   * altura de nuvem da fileira 2, que é a de referência.
   */
  relampago24: {
    larg: 160,
    alt: 288,
    /** Janela recortada da FONTE, em pixels dela. Ver a nota da altura. */
    janelaLarg: 250,
    janelaAlt: 450,
    /** Distância nuvem → chão na fileira de referência (a 2), medida. */
    nuvemAcimaDoChao: 404,
    fileiras: [
      { y0: 1, y1: 221, quadros: 8, chao: false },
      { y0: 231, y1: 730, quadros: 7, chao: true },
      { y0: 731, y1: 996, quadros: 9, chao: true },
    ],
  },
};

const [folhaArq, nome] = process.argv.slice(2);
if (!folhaArq || !nome) {
  console.error('uso: node tools/nuvem2fx.mjs <folha.png> <nome>');
  process.exit(1);
}
const grade = FOLHAS[nome];
if (!grade) {
  console.error(`[nuvem] sem grade medida para "${nome}". Conhecidas: ${Object.keys(FOLHAS).join(', ')}`);
  process.exit(1);
}

const img = decode(folhaArq);
const aceso = (x, y) => img.px[(y * img.w + x) * 4 + 3] > PISO_ALFA;

/**
 * Corta uma fileira em `n` colunas.
 *
 * 🔴 **Os VÃOS VAZIOS mandam, e a divisão só entra onde eles faltam.**
 *
 * A primeira versão deste cortador procurava os `n−1` menores vales em volta
 * das posições teóricas, e isso falhou de um jeito silencioso na folha de
 * 12/09: numa fileira de dez quadros com larguras de 72 a 161 px, dois cortes
 * caíram dentro de quadros vizinhos e saíram células de 44 px — meio desenho.
 * Larguras irregulares e passo teórico não combinam.
 *
 * ✅ Agora: acha as ilhas de desenho separadas por colunas VAZIAS (elas já
 * resolvem a maioria das fileiras sozinhas), estima quantos quadros cabem em
 * cada ilha pelo passo médio, e só divide por vale as ilhas que seguram mais de
 * um. Onde o desenho de um quadro encosta no do vizinho — e é só aí — a
 * divisão volta a ser o recurso.
 */
function colunasDaFileira(y0, y1, n) {
  const col = [];
  for (let x = 0; x < img.w; x++) {
    let c = 0;
    for (let y = y0; y <= y1; y++) if (aceso(x, y)) c++;
    col.push(c);
  }
  // As ilhas: faixas contíguas de coluna com algum desenho.
  const ilhas = [];
  let ini = -1;
  for (let x = 0; x <= col.length; x++) {
    if (x < col.length && col[x] > 0) { if (ini < 0) ini = x; }
    else if (ini >= 0) { ilhas.push([ini, x - 1]); ini = -1; }
  }
  const x0 = ilhas[0][0];
  const x1 = ilhas[ilhas.length - 1][1];
  const passo = (x1 - x0 + 1) / n;

  /*
   * Quantos quadros cada ilha segura. `max(1, …)` porque a ilha do primeiro
   * quadro costuma ser bem menor que o passo — é a nuvem começando a se formar,
   * e ela ocupa um terço da célula.
   */
  const conta = ilhas.map(([a, b]) => Math.max(1, Math.round((b - a + 1) / passo)));
  let sobra = n - conta.reduce((s, v) => s + v, 0);
  // Sobrou ou faltou quadro: ajusta na ilha mais LARGA, que é onde cabe a dúvida.
  while (sobra !== 0) {
    let k = 0;
    for (let i = 1; i < ilhas.length; i++) {
      if ((ilhas[i][1] - ilhas[i][0]) / conta[i] > (ilhas[k][1] - ilhas[k][0]) / conta[k]) k = i;
    }
    if (sobra > 0) { conta[k] += 1; sobra -= 1; } else if (conta[k] > 1) { conta[k] -= 1; sobra += 1; } else break;
  }

  const cortes = [x0];
  ilhas.forEach(([a, b], i) => {
    const q = conta[i];
    for (let j = 1; j < q; j++) {
      // Divide a ilha por vale, agora dentro de um pedaço que SABE quantos quadros tem.
      const larg = (b - a + 1) / q;
      const alvo = a + j * larg;
      let melhor = Infinity;
      let xb = Math.round(alvo);
      for (let x = Math.max(a, Math.round(alvo - larg * 0.3));
        x <= Math.min(b, Math.round(alvo + larg * 0.3)); x++) {
        if (col[x] < melhor) { melhor = col[x]; xb = x; }
      }
      cortes.push(xb);
    }
    // A fronteira entre ilhas cai no meio do vão.
    if (i < ilhas.length - 1) cortes.push(Math.round((b + ilhas[i + 1][0]) / 2));
  });
  cortes.push(x1 + 1);
  return cortes;
}

/**
 * Onde está a NUVEM da célula: a linha mais densa do terço superior, e o
 * centroide horizontal da faixa em volta dela.
 *
 * ⚠️ Terço superior, e não a célula inteira: na fileira da descarga o clarão do
 * CHÃO é mais denso que a nuvem, e a busca solta o acharia no lugar errado.
 */
function nuvem(x0, x1, y0, y1) {
  let melhor = -1;
  let cy = y0;
  const ate = y0 + Math.round((y1 - y0) * 0.42);
  for (let y = y0; y < ate; y++) {
    let c = 0;
    for (let x = x0; x < x1; x++) if (aceso(x, y)) c++;
    if (c > melhor) { melhor = c; cy = y; }
  }
  let sx = 0;
  let n = 0;
  for (let y = Math.max(y0, cy - 12); y <= Math.min(y1, cy + 12); y++) {
    for (let x = x0; x < x1; x++) if (aceso(x, y)) { sx += x; n++; }
  }
  return { cx: n > 0 ? sx / n : (x0 + x1) / 2, cy };
}

/** A linha mais baixa com desenho, e o centro horizontal do clarão que está lá. */
function chao(x0, x1, y0, y1) {
  let base = y0;
  for (let y = y1; y >= y0; y--) {
    let c = 0;
    for (let x = x0; x < x1; x++) if (aceso(x, y)) c++;
    if (c > 0) { base = y; break; }
  }
  // Centro do clarão: centroide dos 40 px acima da base, ponderado pelo alfa.
  let sx = 0;
  let peso = 0;
  for (let y = Math.max(y0, base - 40); y <= base; y++) {
    for (let x = x0; x < x1; x++) {
      const a = img.px[(y * img.w + x) * 4 + 3];
      if (a <= PISO_ALFA) continue;
      sx += x * a; peso += a;
    }
  }
  return { base, cx: peso > 0 ? sx / peso : (x0 + x1) / 2 };
}

const { larg: LARG, alt: ALT, janelaLarg: JW, janelaAlt: JH } = grade;
const quadros = [];
for (const fil of grade.fileiras) {
  const cortes = colunasDaFileira(fil.y0, fil.y1, fil.quadros);
  for (let i = 0; i < fil.quadros; i++) {
    const x0 = cortes[i];
    const x1 = cortes[i + 1];
    const nv = nuvem(x0, x1, fil.y0, fil.y1);
    /*
     * A janela: embaixo no chão quando ele existe, pendurada na nuvem quando
     * não. Ver o cabeçalho — é a decisão inteira deste arquivo.
     */
    let topo;
    let centroX;
    if (fil.chao) {
      const ch = chao(x0, x1, fil.y0, fil.y1);
      topo = ch.base + 4 - JH;
      centroX = ch.cx;
    } else {
      topo = nv.cy - (JH - 4 - grade.nuvemAcimaDoChao);
      centroX = nv.cx;
    }
    /*
     * 🔴 **A JANELA É MAIOR QUE A CÉLULA, e por isso ela vem com cerca.**
     *
     * A janela tem 440 px de altura porque precisa caber o raio inteiro da
     * fileira da descarga. Nas fileiras de cima a célula tem 210 px, e uma
     * janela pendurada na nuvem desce muito abaixo do fim da fileira — medido
     * na primeira versão: os quadros da nuvem se formando vinham com a NUVEM DA
     * FILEIRA SEGUINTE desenhada embaixo, duas tempestades no mesmo quadro.
     *
     * A cerca é a célula de origem: nada fora de `[x0,x1) × [y0,y1]` entra.
     */
    quadros.push({
      esq: Math.round(centroX - JW / 2), topo: Math.round(topo),
      cx0: x0, cx1: x1, cy0: fil.y0, cy1: fil.y1,
    });
  }
}

const W = LARG * quadros.length;
const out = Buffer.alloc(W * ALT * 4);
quadros.forEach((q, k) => {
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      /*
       * ⚠️ Redução por MÉDIA de bloco PONDERADA PELO ALFA, igual à do
       * `folha-alfa2fx` e pela mesma razão: amostrar um pixel a cada N apagaria
       * os fiapos de raio de um pixel, e somar a cor de pixel transparente
       * sujaria a borda.
       */
      const sx0 = q.esq + Math.floor((x * JW) / LARG);
      const sx1 = q.esq + Math.max(Math.floor((x * JW) / LARG) + 1, Math.floor(((x + 1) * JW) / LARG));
      const sy0 = q.topo + Math.floor((y * JH) / ALT);
      const sy1 = q.topo + Math.max(Math.floor((y * JH) / ALT) + 1, Math.floor(((y + 1) * JH) / ALT));
      let r = 0, g = 0, b = 0, a = 0, peso = 0, total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total += 1;
          // ⚠️ A cerca da célula. Ver a nota no empacotamento dos quadros.
          if (sx < q.cx0 || sx >= q.cx1 || sy < q.cy0 || sy > q.cy1) continue;
          if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
          const o = (sy * img.w + sx) * 4;
          const al = img.px[o + 3];
          if (al <= PISO_ALFA) continue;
          const p = al / 255;
          r += img.px[o] * p; g += img.px[o + 1] * p; b += img.px[o + 2] * p;
          a += al; peso += p;
        }
      }
      const d = (y * W + k * LARG + x) * 4;
      out[d] = peso > 0 ? Math.round(r / peso) : 0;
      out[d + 1] = peso > 0 ? Math.round(g / peso) : 0;
      out[d + 2] = peso > 0 ? Math.round(b / peso) : 0;
      out[d + 3] = Math.round(a / Math.max(1, total));
    }
  }
});

mkdirSync(DESTINO, { recursive: true });
writeFileSync(join(DESTINO, `${nome}.png`), encode(W, ALT, out));
console.log(`[nuvem] ${nome}.png  ${W}x${ALT}  (${quadros.length} quadros de ${LARG}x${ALT})`);
