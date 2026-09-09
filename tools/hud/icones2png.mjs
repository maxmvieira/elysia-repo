/**
 * Corta os ÍCONES da HUD das folhas ilustradas para PNGs individuais.
 *
 * 🔴 **As folhas não são grade** — é a mesma história do `fx2strip.mjs`: desenho
 * gerado, ícones em fileiras com espaçamento irregular e, em algumas folhas,
 * rótulos escritos embaixo. Cortar por célula fixa pegaria meio ícone.
 *
 * ✅ O que funciona é **recortar uma FAIXA e achar as colunas cheias dentro
 * dela**. A faixa isola a fileira que interessa (e deixa o rótulo de fora); as
 * colunas separam ícone de ícone, porque entre eles há vão de verdade.
 *
 * ⚠️ A faixa de cada lote é MEDIDA, não chutada: rode com `--mapa` para o
 * programa imprimir as fileiras que encontrou na folha, com o `y` de cada uma.
 *
 * ## Uso
 *
 *   node tools/hud/icones2png.mjs --mapa 2      # lista as fileiras da folha 2
 *   node tools/hud/icones2png.mjs               # corta os lotes declarados
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join } from 'node:path';

const ORIGEM = 'arte-fonte/hud';
const DESTINO = 'client/public/assets/hud/icones';
/** Lado do PNG final. 64 dá margem para o botão de 21 px sem serrilhar. */
const LADO = 64;

/**
 * Os lotes a cortar: qual folha, que faixa vertical, e o nome de cada ícone da
 * esquerda para a direita.
 *
 * ⚠️ **A ordem dos nomes é o contrato.** Se a folha for regerada com os ícones
 * noutra ordem, é aqui que se conserta — e o `--mapa` diz quantos há em cada
 * fileira, para conferir antes.
 */
const LOTES = [
  {
    folha: 'folha2',
    y0: 430, y1: 500,
    nomes: ['inventario', 'skills', 'amigos', 'quests', 'conquistas', 'config', 'correio'],
  },
  /*
   * 🔴 A fileira do meio da folha 4 é a MELHOR fonte dos botões pequenos: ela
   * não tem rótulo escrito embaixo. A mesma coleção existe na folha 5, mas lá
   * cada botão vem com o nome por baixo, e a faixa teria de ser apertada até
   * quase cortar o desenho.
   */
  {
    folha: 'folha4',
    y0: 285, y1: 400,
    nomes: [
      'bussola', 'mapa', 'zoom_mais', 'zoom_menos', 'dia', 'noite',
      'mapa_grande', 'marca', 'mundo',
      'seta_cima', 'seta_baixo', 'seta_esq', 'seta_dir',
    ],
  },
  /*
   * ⚠️ O − e o + estão na PRIMEIRA fileira da folha 4, à direita dos sete
   * atalhos. A faixa exclui os rótulos (que começam por volta de y=185), e os
   * sete primeiros nomes vão VAZIOS de propósito: já foram cortados da folha 2,
   * e recortar de novo daria dois arquivos para o mesmo botão.
   */
  {
    folha: 'folha4',
    y0: 35, y1: 170,
    nomes: ['', '', '', '', '', '', '', 'recolher', 'expandir'],
  },
];

// ---------------------------------------------------------------------------
// PNG (mesmo par dos outros conversores: RGBA, sem dependências)
// ---------------------------------------------------------------------------

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (ty, d) => {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b));
  return Buffer.concat([l, b, c]);
};

function decode(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  if (ct !== 6) throw new Error(`${path}: esperado RGBA, veio colorType ${ct}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4; const px = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0, b = prev ? prev[x] : 0;
      const c = x >= 4 && prev ? prev[x - 4] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px };
}

function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (s + 1)] = 0;
    px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s);
  }
  const i = Buffer.alloc(13);
  i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', i),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

/**
 * 🔴 **O fundo destas folhas é TRANSPARENTE**, apesar de parecer branco no
 * navegador — quem pinta o branco é o visualizador de imagem, não o arquivo.
 * Medido: alpha 0 no canto e 253 dentro dos ícones.
 *
 * ⚠️ Corte em 24, e não em 0: a borda dos ícones tem antisserrilhado quase
 * invisível que, num corte rente, gruda um ícone no seguinte.
 */
const ehFundo = (px, i) => px[i + 3] < 24;

/** Faixas contíguas de conteúdo num vetor de "está vazio?". */
function faixas(vazio) {
  const out = [];
  let ini = -1;
  for (let i = 0; i < vazio.length; i++) {
    if (!vazio[i] && ini < 0) ini = i;
    if (ini >= 0 && (vazio[i] || i === vazio.length - 1)) {
      out.push([ini, vazio[i] ? i - 1 : i]);
      ini = -1;
    }
  }
  return out;
}

function linhasDaFolha(img) {
  const vazia = new Array(img.h).fill(true);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (!ehFundo(img.px, (y * img.w + x) * 4)) { vazia[y] = false; break; }
    }
  }
  return faixas(vazia);
}

const arg = process.argv.slice(2);
if (arg[0] === '--rows') {
  // Linhas cheias dentro de uma faixa horizontal — o par do --cols.
  const img = decode(join(ORIGEM, 'folha' + (arg[1] ?? '1') + '.png'));
  const x0 = Number(arg[2] ?? 0), x1 = Number(arg[3] ?? img.w - 1);
  const vazia = new Array(img.h).fill(true);
  for (let y = 0; y < img.h; y++) {
    for (let x = x0; x <= x1 && x < img.w; x++) {
      if (!ehFundo(img.px, (y * img.w + x) * 4)) { vazia[y] = false; break; }
    }
  }
  for (const [a, b] of faixas(vazia)) console.log('  linha y=' + a + '..' + b + '  (altura ' + (b - a + 1) + ')');
  process.exit(0);
}
if (arg[0] === '--cols') {
  // Colunas cheias dentro de uma faixa — para medir molduras antes de cortar.
  const img = decode(join(ORIGEM, 'folha' + (arg[1] ?? '1') + '.png'));
  const y0 = Number(arg[2] ?? 0), y1 = Number(arg[3] ?? img.h - 1);
  const vazia = new Array(img.w).fill(true);
  for (let y = y0; y <= y1 && y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (!ehFundo(img.px, (y * img.w + x) * 4)) vazia[x] = false;
    }
  }
  for (const [a, b] of faixas(vazia)) console.log('  coluna x=' + a + '..' + b + '  (largura ' + (b - a + 1) + ')');
  process.exit(0);
}
if (arg[0] === '--mapa') {
  const nome = `folha${arg[1] ?? '1'}`;
  const img = decode(join(ORIGEM, `${nome}.png`));
  console.log(`\n[hud] ${nome}: ${img.w}x${img.h}`);
  for (const [a, b] of linhasDaFolha(img)) {
    console.log(`  fileira y=${a}..${b}  (altura ${b - a + 1})`);
  }
  process.exit(0);
}

/**
 * 🖼️ **AS MOLDURAS — recorte RETANGULAR, em resolução cheia.**
 *
 * 🔴 Nada a ver com o corte dos ícones acima. Ícone vira um quadrado de 64;
 * moldura vira `border-image` de nove fatias, e para isso a arte tem de sair
 * do jeito que está: os quatro cantos precisam da resolução original, senão o
 * ornamento dourado borra quando o CSS os desenha em tamanho fixo.
 *
 * ⚠️ Os retângulos foram MEDIDOS com `--cols` e `--rows`, não estimados.
 */
const MOLDURAS = [
  /*
   * ⚠️ O painel do personagem começa em x=200, e não na borda esquerda da
   * arte: à esquerda fica o MEDALHÃO DO RETRATO, que é peça própria.
   *
   * ⚠️ **`tapa` existe porque a arte do painel JÁ TRAZ barras e slots
   * desenhados dentro dela** — e a fatia do `border-image` alcança esses
   * desenhos. O resultado eram quatro tocos coloridos grudados na borda
   * esquerda do painel, restos das barras da ilustração ao lado das barras de
   * verdade.
   *
   * 🔴 **A primeira tentativa APAGOU o miolo, e foi pior.** Sem o escuro por
   * baixo, a fatia teve de encolher até a espessura da faixa dourada — e a
   * faixa desta arte é FINA (uns 8 px), com o ornamento todo concentrado nos
   * cantos. A moldura virou um fio, e os cantos, um borrão.
   *
   * ✅ O certo é **tapar com o próprio fundo do painel**: os desenhos somem, o
   * escuro fica, e a fatia pode voltar a ser grande o bastante para o canto
   * ornamentado caber inteiro nela. A cor não é inventada — sai de `amostra`,
   * um ponto do próprio miolo.
   *
   * ⚠️ O retângulo é MEDIDO: as barras da ilustração vão de x=36 a x=420 num
   * PNG de 449, e os slots ocupam de y≈220 a y≈283 num de 293.
   */
  /*
   * ⚠️ `espelhaEsquerda` conserta o que `tapa` não alcança: **o anel do
   * retrato passa por cima da borda esquerda do painel na folha**, e o corte
   * traz um naco dele. Não dá para tapar junto — ali mora a barra dourada do
   * painel, que é o que se quer guardar.
   *
   * ✅ A borda direita está limpa e é o espelho da esquerda no desenho, então
   * ela é copiada invertida por cima. São 30 colunas: o suficiente para cobrir
   * o naco do anel e para o canto ornamentado vir junto.
   */
  { nome: 'painel_char', folha: 'folha1', x0: 200, y0: 28, x1: 648, y1: 320, tapa: { x0: 30, y0: 16, x1: 424, y1: 285, amostra: [224, 150] }, espelhaEsquerda: 30 },
  /* Mesma história: a arte do minimapa traz bússola, botões e rótulo dentro. */
  { nome: 'painel_mapa', folha: 'folha1', x0: 1119, y0: 12, x1: 1525, y1: 335, tapa: { x0: 16, y0: 14, x1: 390, y1: 309, amostra: [200, 150] } },
  /*
   * 🔴 **O ANEL DO RETRATO SÓ EXISTE PELA METADE NA ARTE.**
   *
   * O primeiro recorte saiu errado e o erro só apareceu no jogo: dentro do
   * medalhão iam as barras vermelha, azul e verde do painel. É que na folha o
   * anel não é uma peça solta — ele fica POR BAIXO do painel, que cobre o lado
   * direito dele, e ainda tem colados embaixo um disco menor (o nível) e um
   * escudo azul. Recortar um quadrado em volta traz tudo isso junto.
   *
   * ✅ O anel é simétrico, então **basta um quadrante**: pega-se o de cima à
   * esquerda — o único limpo, porque o painel está à direita e o disco e o
   * escudo estão embaixo — e espelha-se nos outros três. Sai um anel inteiro
   * de uma arte que nunca esteve inteira.
   *
   * ⚠️ O quadrado é MEDIDO pelo círculo, não pela caixa do desenho: o anel tem
   * centro em (114,120) e raio externo ≈106 na folha (a borda esquerda dele
   * encosta em x=9, e a ponta de cima em x=114). O recorte é esse centro ±112,
   * que é o raio com folga para a ponta de cima, em y=8.
   */
  { nome: 'anel_retrato', folha: 'folha1', x0: 2, y0: 8, x1: 227, y1: 233, espelhaQuadrante: true, vazaCentro: true },
  /*
   * A calha VAZIA das barras, com as pontas ornamentais. Medida em
   * x=23..262, y=850..885 da folha 1 — logo abaixo dela estão as versões já
   * preenchidas em verde e vermelho, que não servem: a cor tem de vir do
   * preenchimento do jogo, não da arte.
   */
  /*
   * 🔴 **O DISCO DO NÍVEL também é arte** — estava sendo desenhado com um
   * `border-radius` e uma borda de 1 px, e ao lado do anel remontado parecia
   * uma bolha solta.
   *
   * ⚠️ Ele fica POR CIMA do anel na folha, embaixo e à esquerda: o arco do anel
   * grande atravessa esta caixa. Como o disco é um círculo e está por cima, a
   * máscara circular resolve — o que sobra do arco cai fora do raio.
   *
   * ⚠️ Medido: centro em (68,212) e raio ≈34 na folha.
   */
  { nome: 'disco_nivel', folha: 'folha1', x0: 34, y0: 178, x1: 102, y1: 246, circular: true },
  /*
   * 🔴 **OS SLOTS DA BARRA DE MAGIAS** — folha 5, fileira de baixo. São três
   * estados do mesmo quadro, e é por isso que saem juntos: vazio, selecionado
   * (aro dourado) e indisponível (apagado). Medidos com `--cols 5 484 656` e
   * `--rows 5 1501 1632`; a faixa vertical 486..620 deixa de fora a legenda
   * que a folha escreve embaixo de cada peça.
   *
   * ⚠️ Ficaram de fora os dois vizinhos: "Slot Bloqueado" tem um cadeado
   * desenhado e "Cooldown", um "3.2" — são ILUSTRAÇÕES de estado, não molduras,
   * e o jogo já desenha esses dois por cima com o dado de verdade.
   */
  { nome: 'slot_vazio', folha: 'folha5', x0: 1501, y0: 486, x1: 1632, y1: 620 },
  { nome: 'slot_ativo', folha: 'folha5', x0: 1668, y0: 486, x1: 1814, y1: 620 },
  { nome: 'slot_indisponivel', folha: 'folha5', x0: 1997, y0: 486, x1: 2145, y1: 620 },
  /*
   * A placa de nome do mapa, para o nome da região no topo do minimapa.
   *
   * ⚠️ **A folha escreve "Prontera" DENTRO dela** — é a mesma armadilha dos
   * painéis, e aqui seria pior: com o miolo esticado pela largura, a palavra
   * viraria um borrão atrás do nome de verdade. `tapa` cobre o interior com o
   * escuro da própria placa (14,15,17), amostrado acima da linha do texto.
   */
  { nome: 'placa_mapa', folha: 'folha5', x0: 1840, y0: 305, x1: 2145, y1: 386, tapa: { x0: 30, y0: 18, x1: 270, y1: 62, amostra: [150, 20] } },
  { nome: 'barra_calha', folha: 'folha1', x0: 23, y0: 850, x1: 262, y1: 885 },
];

mkdirSync(DESTINO, { recursive: true });
for (const m of MOLDURAS) {
  const img = decode(join(ORIGEM, `${m.folha}.png`));
  const w = m.x1 - m.x0 + 1;
  const h = m.y1 - m.y0 + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const de2 = ((m.y0 + y) * img.w + m.x0) * 4;
    img.px.copy(out, y * w * 4, de2, de2 + w * 4);
  }
  if (m.tapa) {
    const t = m.tapa;
    const a = ((t.amostra[1] * w) + t.amostra[0]) * 4;
    const cor = [out[a], out[a + 1], out[a + 2], out[a + 3]];
    for (let y = t.y0; y <= t.y1; y++) {
      for (let x = t.x0; x <= t.x1; x++) {
        const o = (y * w + x) * 4;
        out[o] = cor[0]; out[o + 1] = cor[1]; out[o + 2] = cor[2]; out[o + 3] = cor[3];
      }
    }
    const area = (t.x1 - t.x0 + 1) * (t.y1 - t.y0 + 1);
    console.log(`     (miolo tapado: ${area} px na cor ${cor.slice(0, 3).join(',')})`);
  }
  if (m.circular) {
    /*
     * ⚠️ Raio com 1 px de folga sobre a metade do lado: cravado na metade
     * exata, a máscara comeria o contorno dourado do próprio disco.
     */
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const raio = Math.min(w, h) / 2 + 1;
    let cortados = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (Math.hypot(x - cx, y - cy) <= raio) continue;
        const o = (y * w + x) * 4;
        if (out[o + 3] !== 0) { out[o + 3] = 0; cortados++; }
      }
    }
    console.log(`     (máscara circular: ${cortados} px fora do disco apagados)`);
  }
  if (m.espelhaEsquerda) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < m.espelhaEsquerda; x++) {
        const de3 = (y * w + (w - 1 - x)) * 4;
        out.copy(out, (y * w + x) * 4, de3, de3 + 4);
      }
    }
    console.log(`     (borda esquerda espelhada da direita: ${m.espelhaEsquerda} colunas)`);
  }
  if (m.espelhaQuadrante) {
    /*
     * ⚠️ Espelha nos DOIS eixos a partir do quadrante de cima à esquerda. Vale
     * porque a peça é um ornamento de simetria quádrupla: a ponta de cima cai
     * em cima do eixo e continua centrada, e os cravos das diagonais aparecem
     * nos quatro cantos, como já aparecem no desenho.
     */
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const fx = x < w / 2 ? x : w - 1 - x;
        const fy = y < h / 2 ? y : h - 1 - y;
        if (fx === x && fy === y) continue;
        out.copy(out, (y * w + x) * 4, (fy * w + fx) * 4, (fy * w + fx) * 4 + 4);
      }
    }
  }
  if (m.vazaCentro) {
    /*
     * 🔴 **O miolo do anel TEM de ficar vazado**, senão ele tapa o retrato: no
     * CSS o anel vem por cima, e na arte o meio dele é fundo escuro opaco.
     *
     * ✅ É o mesmo alagamento do `retratos2card.mjs`: sai do centro e come o
     * escuro contíguo, parando no dourado. Não dá para usar um raio fixo — a
     * borda de dentro do anel tem cravos que entram, e um círculo cortaria
     * justamente eles.
     */
    const escuro = (o) => out[o + 3] !== 0 && (out[o] + out[o + 1] + out[o + 2]) / 3 < 28;
    const pilha = [[w >> 1, h >> 1]];
    const visto = new Uint8Array(w * h);
    let limpos = 0;
    while (pilha.length) {
      const [x, y] = pilha.pop();
      if (x < 0 || y < 0 || x >= w || y >= h || visto[y * w + x]) continue;
      const o = (y * w + x) * 4;
      if (!escuro(o)) continue;
      visto[y * w + x] = 1;
      out[o + 3] = 0;
      limpos++;
      pilha.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    console.log(`     (centro vazado: ${limpos} px alagados)`);
  }
  writeFileSync(join(DESTINO, `${m.nome}.png`), encode(w, h, out));
  console.log(`\n[hud] moldura ${m.nome}.png  ${w}x${h}`);
}

let total = 0;
for (const lote of LOTES) {
  const img = decode(join(ORIGEM, `${lote.folha}.png`));
  // Colunas cheias DENTRO da faixa — é o que separa ícone de ícone.
  const colVazia = new Array(img.w).fill(true);
  for (let y = lote.y0; y <= lote.y1 && y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (!ehFundo(img.px, (y * img.w + x) * 4)) colVazia[x] = false;
    }
  }
  const brutas = faixas(colVazia);
  /*
   * 🔴 **Descarta sobras estreitas.** A faixa horizontal pega, de raspão, o que
   * estiver acima ou abaixo dela — na folha 2 é a ponta do escudo do retrato,
   * que entrou como um oitavo 'ícone' de 42 px contra 110 dos verdadeiros.
   *
   * O corte é relativo à MEDIANA das larguras, e não a um número fixo: cada
   * folha tem a sua escala, e um limiar em pixels precisaria ser reajustado a
   * cada arte nova.
   */
  const larguras = brutas.map(([a, b]) => b - a + 1).sort((a, b) => a - b);
  const mediana = larguras[Math.floor(larguras.length / 2)] ?? 1;
  const cols = brutas.filter(([a, b]) => (b - a + 1) >= mediana * 0.6);
  if (cols.length !== brutas.length) {
    console.log(`     (${brutas.length - cols.length} sobra(s) estreita(s) descartada(s))`);
  }
  console.log(`\n[hud] ${lote.folha} y=${lote.y0}..${lote.y1} → ${cols.length} ícones ` +
    `(esperado ${lote.nomes.length})`);
  if (cols.length !== lote.nomes.length) {
    console.warn('     ⚠️ contagem DIFERENTE — rode com --mapa e ajuste a faixa.');
  }
  cols.forEach(([x0, x1], i) => {
    const nome = lote.nomes[i];
    if (!nome) return;
    const w = x1 - x0 + 1;
    const h = lote.y1 - lote.y0 + 1;
    /*
     * ⚠️ Sai QUADRADO, do maior lado, centrado: o botão é quadrado, e um PNG
     * retangular esticado dentro dele deformaria a moldura dourada — que é
     * justamente o que dá o acabamento.
     */
    const lado = Math.max(w, h);
    const out = Buffer.alloc(LADO * LADO * 4);
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO; x++) {
        // Amostragem por vizinho: a redução é pequena e a moldura tem contorno
        // fino, que um filtro suave borraria.
        const sx = x0 - Math.floor((lado - w) / 2) + Math.floor((x * lado) / LADO);
        const sy = lote.y0 - Math.floor((lado - h) / 2) + Math.floor((y * lado) / LADO);
        const d = (y * LADO + x) * 4;
        if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) continue;
        const o = (sy * img.w + sx) * 4;
        if (ehFundo(img.px, o)) continue; // fundo vira transparente
        out[d] = img.px[o]; out[d + 1] = img.px[o + 1];
        out[d + 2] = img.px[o + 2]; out[d + 3] = 255;
      }
    }
    writeFileSync(join(DESTINO, `${nome}.png`), encode(LADO, LADO, out));
    console.log(`     ✓ ${nome}.png  (fonte ${w}x${h})`);
    total++;
  });
}
console.log(`\n[hud] ${total} ícone(s) em ${DESTINO}`);
