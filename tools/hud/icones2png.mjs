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
import { join } from 'node:path';

import { decode, encode } from './png.mjs';

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
// PNG: o par decode/encode mora em `png.mjs`, compartilhado com o conversor
// das magias.
// ---------------------------------------------------------------------------


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
  { nome: 'anel_retrato', folha: 'folha1', x0: 2, y0: 8, x1: 227, y1: 233, espelhaQuadrante: true, vazaCentro: 28 },
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
   * O MESMO quadro selecionado, com o miolo vazado: vira um ARO, para pôr em
   * volta dos botões pequenos no hover sem tapar o ícone que está embaixo.
   *
   * ⚠️ É o mesmo recorte de propósito. O "passou o mouse aqui" da HUD inteira
   * tem de ser um desenho só — se o botão de atalho acendesse de um jeito e o
   * slot de magia de outro, seriam duas linguagens para a mesma coisa.
   */
  { nome: 'aro_ativo', folha: 'folha5', x0: 1668, y0: 486, x1: 1814, y1: 620, vazaCentro: 60 },
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

/**
 * 🔴 **OS ESTADOS SÃO DERIVADOS DO ÍCONE, NÃO RECORTADOS DA FOLHA — e a folha
 * é justamente o motivo.**
 *
 * A folha 3 traz, embaixo de cada botão, uma fileirinha "Normal · Hover · Press
 * · Disabled". Seria a fonte óbvia. Mas ela está **DESALINHADA**: o desenho
 * escorregou de um em vários grupos, e o resultado é que
 *
 *   - o *hover* do Inventário é um LIVRO,
 *   - o *press* e o *disabled* de Quests são TROFÉUS,
 *   - o *hover* de Recolher é um "+", e não o "−",
 *   - o *hover* de Zoom + é a lupa de Zoom −.
 *
 * Recortar aquilo daria um botão que vira outro botão quando o mouse passa por
 * cima. Foi conferido grupo a grupo, e quatro dos quinze estão trocados.
 *
 * ✅ O que a folha entrega de confiável é a **transformação de cor**, porque
 * entre um estado e outro só muda o tom. Os fatores abaixo saíram do grupo
 * "Zoom −", o único da fileira cujos quatro quadros foram conferidos como
 * sendo a mesma lupa nos quatro estados na ordem certa. Aplicados ao ícone que
 * já temos, cada botão vira o próprio estado — e desalinhamento deixa de ser
 * possível, porque o estado é derivado dele mesmo.
 *
 * ⚠️ **O hover mexe só no ARO.** É o que o desenho faz: no hover o quadro fica
 * dourado e o pictograma continua o que era. Passar o fator no ícone inteiro
 * deixaria a poção vermelha alaranjada. Já *press* e *disabled* valem no
 * desenho todo, que também é o que a folha mostra.
 */
const ESTADOS = {
  hover: { fator: [1.351, 1.208, 0.791], soAro: true },
  press: { fator: [0.806, 0.850, 0.932] },
  off: { fator: [0.754, 0.847, 1.027], cinza: 0.8 },
};

/**
 * Devolve uma cópia do ícone com a regra de estado aplicada.
 *
 * ⚠️ O aro é medido pela CAIXA DE CONTEÚDO de cada ícone, e não por uma fração
 * fixa do PNG: os recortes não são todos cheios até a borda (`recolher` começa
 * em y=15 num quadro de 64), e uma fração fixa pegaria fundo transparente num e
 * miolo no outro.
 */
function aplicaEstado(px, w, h, regra) {
  const out = Buffer.from(px);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] < 24) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return out;
  const aro = Math.max(2, Math.round(Math.min(x1 - x0, y1 - y0) * 0.16));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (out[o + 3] < 24) continue;
      if (regra.soAro) {
        const noAro = x - x0 < aro || x1 - x < aro || y - y0 < aro || y1 - y < aro;
        if (!noAro) continue;
      }
      let [r, g, b] = [out[o], out[o + 1], out[o + 2]];
      if (regra.cinza) {
        // Luminância padrão: verde pesa mais porque o olho o enxerga mais.
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r += (l - r) * regra.cinza; g += (l - g) * regra.cinza; b += (l - b) * regra.cinza;
      }
      out[o] = Math.min(255, Math.round(r * regra.fator[0]));
      out[o + 1] = Math.min(255, Math.round(g * regra.fator[1]));
      out[o + 2] = Math.min(255, Math.round(b * regra.fator[2]));
    }
  }
  return out;
}

/**
 * 🔴 **TIRAS: peças ENCOSTADAS, cortadas em partes iguais.**
 *
 * Os ícones de magia da folha 2 estão numa barra montada, um colado no outro —
 * não há vão entre eles, e por isso a medição por faixa devolve uma coluna só
 * de 1.323 px. É o oposto do caso dos ícones soltos, onde o vão é justamente o
 * que separa.
 *
 * ✅ Quando as peças se tocam mas são do mesmo tamanho, dividir em partes
 * iguais é mais confiável que qualquer detecção: dez de 132,3. Foi a mesma
 * saída do `fx2strip.mjs` para a folha do Fire Bolt nível 10.
 *
 * ⚠️ A ordem dos nomes é o contrato, como nos lotes.
 */
const TIRAS = [
  /*
   * ⚠️ **A fonte é a FOLHA 4, e não a folha 2.** As duas trazem os ícones de
   * magia, mas a da folha 2 vem montada como barra pronta e com a TECLA
   * desenhada dentro de cada quadro — "1", "2", … "0" no canto de cima. O jogo
   * escreve a própria tecla exatamente ali, e a do desenho ficaria por baixo,
   * permanente e errada assim que alguém remontasse a barra. Espelhar o canto
   * limpo por cima foi tentado e deixa emenda visível, porque o campo tem
   * gradiente e o motivo atravessa o canto em vários deles.
   *
   * ✅ A folha 4 traz os mesmos treze sem número nenhum.
   */
  {
    folha: 'folha4', x0: 49, y0: 443, x1: 1899, y1: 583,
    nomes: [
      'mag_fogo', 'mag_gelo', 'mag_raio', 'mag_fogo_area', 'mag_gelo_area',
      'mag_arcano', 'mag_cura', 'mag_debuff', 'mag_buff', 'mag_natureza',
      'mag_veneno', 'mag_sagrado', 'mag_travada',
    ],
  },
];

mkdirSync(DESTINO, { recursive: true });
for (const tira of TIRAS) {
  const img = decode(join(ORIGEM, `${tira.folha}.png`));
  const larg = (tira.x1 - tira.x0 + 1) / tira.nomes.length;
  const h = tira.y1 - tira.y0 + 1;
  tira.nomes.forEach((nome, i) => {
    const ax = Math.round(tira.x0 + i * larg);
    const w = Math.round(tira.x0 + (i + 1) * larg) - ax;
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      const de = ((tira.y0 + y) * img.w + ax) * 4;
      img.px.copy(out, y * w * 4, de, de + w * 4);
    }
    writeFileSync(join(DESTINO, `${nome}.png`), encode(w, h, out));
  });
  console.log(`
[hud] tira ${tira.folha} → ${tira.nomes.length} peças de ${Math.round(larg)}x${h}`);
}

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
    /*
     * ⚠️ O limiar é POR PEÇA, e não um número fixo. No anel do retrato ele tem
     * de ser baixo (28), senão o alagamento come o bronze escuro do próprio
     * anel e ele sai esburacado. No quadro selecionado tem de ser alto (60),
     * porque o miolo dele é um cinza texturizado que chega a 37 — com 28 o
     * alagamento morria no primeiro pixel.
     */
    const escuro = (o) => out[o + 3] !== 0 && (out[o] + out[o + 1] + out[o + 2]) / 3 < m.vazaCentro;
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
    for (const [estado, regra] of Object.entries(ESTADOS)) {
      writeFileSync(join(DESTINO, `${nome}_${estado}.png`), encode(LADO, LADO, aplicaEstado(out, LADO, LADO, regra)));
    }
    console.log(`     ✓ ${nome}.png  (+3 estados, fonte ${w}x${h})`);
    total++;
  });
}
console.log(`\n[hud] ${total} ícone(s) em ${DESTINO}`);
