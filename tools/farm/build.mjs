/**
 * Conversor **Farm.tmx → fazenda jogável de Elysia** (`npm run farm:build`).
 *
 * ## 🔴 O problema que este arquivo resolve
 *
 * O motor do Elysia conhece **16 tipos de tile semânticos** (`GRASS`, `STONE`,
 * `WALL_WOOD`…) pintados como retalhos chapados de 32 px. O `tmx2world.mjs`
 * traduz `(camada, gid) → um desses 16` e **joga a arte fora** — é o certo para
 * o mapa provisório do ChatGPT, que é de quadrados de cor.
 *
 * A Farm é o caso oposto: **o valor dela É a arte**. Passá-la pelo `tmx2world`
 * devolveria uma fazenda em forma de manchas verdes e marrons. Então aqui a
 * saída é dupla, e é essa divisão que faz a coisa toda funcionar:
 *
 * | Para o motor | Para os olhos |
 * |---|---|
 * | `shared/data/world/farm.json` | `client/public/assets/farm/*` |
 * | colisão, portas, spawn de bicho | dois PNGs assados + tiles animados |
 * | lido pelos DOIS lados | só o cliente |
 *
 * 🔴 **É essa divisão que preserva a invariante do `worldgen.ts`:** terreno não
 * trafega pela rede, os dois lados calculam o mesmo mundo. A colisão da fazenda
 * é `WALL_WOOD` e `WATER` como qualquer outra parede — servidor e cliente
 * chegam nela do mesmo arquivo. A arte bonita é enfeite que só o cliente carrega,
 * e o servidor nem sabe que existe.
 *
 * ## Por que a arte é ASSADA e não montada em tempo real
 *
 * São 43 camadas e ~4.400 células com tile. Montar isso como 4.400 sprites no
 * boot do cliente é desperdício: **a esmagadora maioria nunca muda**. Então o
 * estático vira dois PNGs (um abaixo do jogador, um acima) e só o que se mexe —
 * água, peixe, as pás do moinho — continua vivo, como sprite animado.
 *
 * ⚠️ Dois PNGs e não um: as copas das árvores e o corrimão das cercas precisam
 * ficar POR CIMA do personagem, senão ele anda em cima da folhagem.
 *
 * ## Escala
 *
 * 1 tile do Tiled (16 px) = 1 tile do Elysia (32 px), arte a **2×**. Inteiro,
 * pela regra de sempre — fracionário devolve o serrilhado em faixas.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { decode, encode } from './png.mjs';
import { lerTmx, resolveGid } from './tmx.mjs';
import { CAMADAS, desenhaAcima } from './layers.mjs';
import { derivaColisao, ilhasAndaveis, CAMADAS_DE_ARVORE } from './colisao.mjs';
import { INTERIORES, ANDAR_INTERNO, leInterior } from './interiores.mjs';

const TMX = 'assets/Farm/Tiled_files/Farm.tmx';
const OUT_ARTE = 'client/public/assets/farm';
const OUT_DADOS = 'shared/data/world/farm.json';
const ESC = 2;

/**
 * 🔴 **Onde a fazenda encosta no mundo de 300×300.**
 *
 * Decisão do dono em 30/08: *"colada na praça segura"*, para dar para chegar a
 * pé em segundos — fazenda a cinco minutos de caminhada é fazenda que ninguém
 * testa. A praça vai de x 138 a 162 (raio 12 em volta de 150,158), então a
 * fazenda começa em 163, um tile depois da borda.
 *
 * ⚠️ **Ela transborda os Campos de Valdor, e não tem jeito.** Valdor vai até
 * x=182 e a fazenda tem 45 de largura: 20 colunas caem em Valdor e o resto em
 * território do Deserto de Kharzan e da Selva de Yoruba. Tirando a praça,
 * NENHUM retângulo livre de Valdor comporta 45×35 — as sobras são faixas de 16
 * e de 14 tiles.
 *
 * Hoje isso é cosmético: `regions.ts` governa rótulo de lugar e a lista de
 * espécies do passo 4 do roadmap, e as criaturas ainda nascem do
 * `creatures.json` à mão. ⚠️ Quando o passo 4 acontecer, a fazenda vai estar
 * pisando em região de nível 30–50 e isso precisa ser revisto.
 */
export const ORIGEM = { x: 163, y: 141 };

/**
 * 🔴 **Quais animações continuam VIVAS no jogo, e por que as outras não.**
 *
 * O pack anima 13 tilesets. Só quatro entram como animação em laço:
 *
 * - água e margem, e os **peixes** do lago — é o que faz o lago não ser um
 *   adesivo azul;
 * - as **pás do moinho** (`Sails_animation`), que é a coisa que mais chama o
 *   olho na fazenda inteira.
 *
 * Ficam de fora, cada uma por um motivo diferente:
 *
 * - **porta e janela**: animação de porta não é laço, é **evento** — ela abre
 *   quando alguém entra. Os quadros dela vão para `portas`, no JSON, e quem
 *   dispara é o cliente. Em laço, a fazenda inteira ficaria batendo porta
 *   sozinha.
 * - **porco, vaca e galinha**: viram criatura de verdade, com IA. Ver `BICHOS`.
 * - **o portão do curral** (`wicket_animation`): fica fechado e sólido. Portão
 *   que abre de verdade precisa de porta com estado no servidor e de prender os
 *   bichos por lógica em vez de por parede — senão a vaca sai andando no
 *   primeiro tick. Ver a nota no `layers.mjs`.
 */
const ANIMACAO_VIVA = new Set(['Water_detilazation', 'Water_coasts', 'fishes', 'Sails_animation']);

/**
 * 🔴 **Animações cujas células são UM objeto só, e por isso andam em bloco.**
 *
 * O cliente começa cada célula animada num quadro **sorteado** — é o que faz a
 * água do lago cintilar em vez de piscar toda junto, e é certo para água e
 * peixe. Para as pás do moinho é destruidor: as 77 células animadas do
 * `Sails_animation` são pedaços de uma hélice só, e sorteadas cada uma no seu
 * quadro elas viram estilhaços girando em fases diferentes.
 *
 * Foi o relato do dono em 31/08: *"o catavento está girando todo quebrado,
 * faltando partes"*. Não faltava parte nenhuma — estavam todas lá, cada uma num
 * instante diferente do giro.
 */
const ANIMACAO_EM_BLOCO = new Set(['Sails_animation']);

/**
 * As três espécies pintadas nas camadas `Animals` e `Animals2`, e o tipo de
 * criatura do Elysia que cada uma vira.
 *
 * ⚠️ Os tipos têm que existir em `CREATURES` (`shared/src/combat.ts`) — tipo
 * desconhecido derruba o boot do servidor, o que é o comportamento certo.
 */
const BICHOS = {
  Pig_animation: 'pig',
  Cow_animation: 'cow',
  Chicken_animation: 'chicken',
};

// ---------------------------------------------------------------------------

/*
 * ⚠️ As camadas de bicho ficam FORA do bounding box. Elas têm 15 células de
 * tiles transparentes na última fileira — sobra do autor — e sem esta exclusão
 * a fazenda ganhava 3 linhas sem arte, que o cliente deixava de desenhar e
 * viravam faixa preta em volta dela.
 *
 * ⚠️ **Sobra uma coluna fantasma, e ela é inofensiva.** A coluna 0 entra no
 * retângulo porque a camada `Ground` pinta duas células ali — com tiles de
 * `Water_coasts` que são **totalmente transparentes**. Excluí-la exigiria
 * decodificar PNG dentro do `lerTmx`, e não paga: a máscara de cobertura já
 * marca a coluna inteira como "o motor desenha", e o motor pinta a mesma grama
 * do mundo. Em tela não há diferença nenhuma; só o `FARM_AREA` fica um tile mais
 * largo que a arte.
 */
const m = lerTmx(TMX, { ignorarNoLimite: new Set([82, 83]) });
const imgs = new Map();
for (const ts of m.tilesets) if (!imgs.has(ts.imagem)) imgs.set(ts.imagem, decode(ts.imagem));

const LARG = m.largura;
const ALT = m.altura;
const N = LARG * ALT;
const W = LARG * m.tileW * ESC;
const H = ALT * m.tileH * ESC;

/**
 * 🔴 **A GRAMA DO PACK VIRA A GRAMA DO JOGO, pixel a pixel.**
 *
 * O defeito, relatado pelo dono em 30/08: *"o verde da fazenda está diferente do
 * resto do mapa"*, e depois *"a borda está bugada, mudando do nada, com os
 * canteiros de graminha todos errados"*. A grama do pack é `rgb(160,179,90)` —
 * amarelada e clara; a do jogo é um verde-azulado bem mais escuro. A fazenda
 * ficava um adesivo com uma escadinha de cor na borda.
 *
 * ⚠️ **A primeira tentativa consertou só metade e foi ela que produziu a borda
 * bugada.** Ela repintava a célula inteira, e só quando a célula era de UMA cor
 * chapada. Mas a borda da fazenda é composta: `Ground` (terra) + `Hill`
 * (cerca-viva) + `Grass` (tufos), tudo na mesma célula. Nenhuma delas é chapada,
 * então nenhuma era repintada — e sobrava uma franja da grama antiga contornando
 * cada decoração, contra a grama nova. Pior que antes.
 *
 * A regra que ficou é por PIXEL, não por célula: todo pixel que for exatamente
 * uma das cores de grama do pack recebe, no lugar, o pixel do **retalho de grama
 * do próprio jogo** — o mesmo 32×32 do `Ground.png` que o `desenhaChao` estampa
 * no mundo inteiro. Os tufos, a cerca-viva e a terra têm cores próprias e passam
 * intactos: só o campo por baixo deles troca de tom.
 *
 * 🔴 **A amostragem é pela posição na TELA (`% 32`), não no tile de origem** —
 * é isso que faz o ruído da textura continuar de uma célula para a outra e
 * atravessar a borda da fazenda sem emenda. A origem da fazenda cai num tile
 * inteiro do mundo, então as duas grades coincidem.
 *
 * ⚠️ Conferido que é seguro aplicar em TODAS as camadas: as três cores só
 * aparecem em `ground_grass_bricks`, `Objects_outside`, `Ground_grass_details` e
 * `wicket_animation` — chão e vegetação. Nenhum tileset de construção as usa,
 * então nenhuma parede muda de cor por tabela.
 */
const GRAMA_DO_JOGO = { arquivo: 'client/public/assets/Ground.png', x: 40, y: 160, lado: 32 };
const gramaImg = decode(GRAMA_DO_JOGO.arquivo);

/**
 * As cores de grama do pack, **descobertas e não digitadas**: são as dos tiles
 * pintados de uma cor só, verde (canal G acima dos outros dois), nos tilesets
 * usados pelo mapa. Hoje dá três — o campo (160,179,90), o piso dos currais
 * (105,162,67) e a base das moitas (121,154,81).
 */
const CORES_DE_GRAMA = new Set();
for (const ts of m.tilesets) {
  const img = imgs.get(ts.imagem);
  for (let t = 0; t < ts.total; t++) {
    const sx = (t % ts.colunas) * ts.tileW;
    const sy = Math.floor(t / ts.colunas) * ts.tileH;
    if (sy + ts.tileH > img.h) continue;
    let cor = -1;
    let uniforme = true;
    for (let y = 0; y < ts.tileH && uniforme; y++) {
      for (let x = 0; x < ts.tileW; x++) {
        const p = ((sy + y) * img.w + sx + x) * 4;
        if (img.px[p + 3] !== 255) { uniforme = false; break; }
        const c = (img.px[p] << 16) | (img.px[p + 1] << 8) | img.px[p + 2];
        if (cor === -1) cor = c;
        else if (cor !== c) { uniforme = false; break; }
      }
    }
    if (!uniforme || cor === -1) continue;
    const r = (cor >> 16) & 0xff, g = (cor >> 8) & 0xff, b = cor & 0xff;
    if (g > r && g > b) CORES_DE_GRAMA.add(cor);
  }
}

/**
 * 🔴 **O PÉ DAS ÁRVORES DO POMAR, descoberto na arte e não digitado.**
 *
 * O relato do dono em 31/08: *"o personagem está passando embaixo do pé das
 * árvores"*. E passava — as duas camadas do pomar são `acima` inteiras, então o
 * herói parado rente ao tronco sumia atrás das raízes.
 *
 * ⚠️ **"A fileira de baixo da mancha" NÃO serve aqui**, e foi a primeira
 * tentativa: no pomar as copas se tocam de propósito (é o que impede as hortas
 * de ficarem ilhadas — ver `colisao.mjs`), então as árvores formam colunas
 * contínuas e só **26 de 222** células são fim de mancha. A regra pegava quase
 * nada.
 *
 * A que ficou é pela ARTE: tile do pomar cujos pixels opacos são
 * majoritariamente MARROM é raiz, não folha. A separação é limpa e não precisa
 * de limiar escolhido a dedo — os 8 tiles de raiz dão de 87% a 100% de marrom, e
 * o primeiro tile de copa depois deles dá **23%**. Qualquer corte dentro desse
 * buraco devolve o mesmo conjunto.
 *
 * 🔴 **A copa continua `acima`, e é o efeito pedido:** anda-se ATRÁS da
 * folhagem. O que mudou é só o pé — que é chão de árvore, e chão fica sob quem
 * pisa nele.
 */
const PES_DO_POMAR = (() => {
  const pes = new Set();
  const ts = m.tilesets.find((t) => t.nome === 'trees');
  if (!ts) return pes;
  const img = imgs.get(ts.imagem);
  for (let local = 0; local < ts.total; local++) {
    const sx = (local % ts.colunas) * ts.tileW;
    const sy = Math.floor(local / ts.colunas) * ts.tileH;
    if (sy + ts.tileH > img.h) continue;
    let opacos = 0, marrons = 0;
    for (let y = 0; y < ts.tileH; y++) {
      for (let x = 0; x < ts.tileW; x++) {
        const s = ((sy + y) * img.w + sx + x) * 4;
        if (img.px[s + 3] < 128) continue;
        opacos++;
        if (img.px[s] > img.px[s + 1] && img.px[s] > img.px[s + 2]) marrons++;
      }
    }
    if (opacos > 0 && marrons / opacos >= 0.5) pes.add(local);
  }
  return pes;
})();

/**
 * Compositor alpha-over de um tile numa tela RGBA qualquer, ampliado por ESC.
 *
 * 🔴 **`flip` desfaz o espelhamento do Tiled, e a ORDEM é a do Tiled.** Ele
 * define o tile mostrado como *"transpõe (D), depois espelha em H, depois em
 * V"*; aqui se vai do destino para a origem, então as três se desfazem na ordem
 * inversa — V, H e a diagonal por último. Trocar a ordem só estraga os tiles
 * ROTACIONADOS (que são D+H), e é por isso que o erro passaria despercebido num
 * mapa que só tem espelho simples.
 */
function poeEm(tela, telaW, telaH, img, ts, local, dx, dy, flip) {
  const sx = (local % ts.colunas) * ts.tileW;
  const sy = Math.floor(local / ts.colunas) * ts.tileH;
  const fH = !!flip?.flipH, fV = !!flip?.flipV, fD = !!flip?.flipD;
  for (let y = 0; y < ts.tileH * ESC; y++) {
    const oy = dy + y; if (oy < 0 || oy >= telaH) continue;
    for (let x = 0; x < ts.tileW * ESC; x++) {
      const ox = dx + x; if (ox < 0 || ox >= telaW) continue;

      let ax = (x / ESC) | 0, ay = (y / ESC) | 0;
      if (fV) ay = ts.tileH - 1 - ay;
      if (fH) ax = ts.tileW - 1 - ax;
      const iy = sy + (fD ? ax : ay);
      const ix = sx + (fD ? ay : ax);

      const s = (iy * img.w + ix) * 4;
      const a = img.px[s + 3]; if (a === 0) continue;

      let sr = img.px[s], sg = img.px[s + 1], sb = img.px[s + 2];
      if (CORES_DE_GRAMA.has((sr << 16) | (sg << 8) | sb)) {
        const gp = ((GRAMA_DO_JOGO.y + (oy % GRAMA_DO_JOGO.lado)) * gramaImg.w
          + GRAMA_DO_JOGO.x + (ox % GRAMA_DO_JOGO.lado)) * 4;
        sr = gramaImg.px[gp]; sg = gramaImg.px[gp + 1]; sb = gramaImg.px[gp + 2];
      }

      const d = (oy * telaW + ox) * 4;
      const f = a / 255, g = 1 - f;
      tela[d] = sr * f + tela[d] * g;
      tela[d + 1] = sg * f + tela[d + 1] * g;
      tela[d + 2] = sb * f + tela[d + 2] * g;
      tela[d + 3] = Math.min(255, a + tela[d + 3] * g);
    }
  }
}

/** O mesmo, na tela da fazenda de fora. */
function poe(tela, ts, local, dx, dy, flip) {
  poeEm(tela, W, H, imgs.get(ts.imagem), ts, local, dx, dy, flip);
}

/**
 * O tile desenha alguma coisa? Memoizado.
 *
 * ⚠️ **Tile totalmente transparente é comum aqui e não é descuido** — é como se
 * pinta no Tiled: seleciona-se um retângulo do tileset e carimba-se, e as
 * células em branco vêm junto. O `colisao.mjs` tem a mesma regra pelo mesmo
 * motivo (lá ela impede que parede invisível tranque a casa); aqui ela impede
 * que célula vazia entre na conta do relatório de camadas `acima`.
 */
/** Quantos pixels opacos o tile tem. Memoizado, e a base do ranking do clique. */
const contaPixelCache = new Map();
function contaPixels(ts, local) {
  const chave = `${ts.imagem}#${local}`;
  if (contaPixelCache.has(chave)) return contaPixelCache.get(chave);
  const img = imgs.get(ts.imagem);
  const sx = (local % ts.colunas) * ts.tileW;
  const sy = Math.floor(local / ts.colunas) * ts.tileH;
  let n = 0;
  for (let y = 0; y < ts.tileH; y++) {
    for (let x = 0; x < ts.tileW; x++) {
      if (img.px[((sy + y) * img.w + sx + x) * 4 + 3] > 8) n++;
    }
  }
  contaPixelCache.set(chave, n);
  return n;
}

const temPixelCache = new Map();
function temPixel(ts, local) {
  const chave = `${ts.imagem}#${local}`;
  if (temPixelCache.has(chave)) return temPixelCache.get(chave);
  const img = imgs.get(ts.imagem);
  const sx = (local % ts.colunas) * ts.tileW;
  const sy = Math.floor(local / ts.colunas) * ts.tileH;
  let tem = false;
  for (let y = 0; y < ts.tileH && !tem; y++) {
    for (let x = 0; x < ts.tileW; x++) {
      if (img.px[((sy + y) * img.w + sx + x) * 4 + 3] > 8) { tem = true; break; }
    }
  }
  temPixelCache.set(chave, tem);
  return tem;
}

/**
 * Os interiores usam tilesets próprios (`Interior_walls_floor`, `fire`…) que não
 * estão no `Farm.tmx`. Carrega sob demanda, no mesmo cache.
 */
function imgsInterior(ts) {
  if (!imgs.has(ts.imagem)) imgs.set(ts.imagem, decode(ts.imagem));
  return imgs.get(ts.imagem);
}

// --- 1. a colisão ----------------------------------------------------------

const col = derivaColisao(m, decode);

/**
 * 🔴 A colisão sai como TEXTO, uma linha por fileira de tiles:
 *
 *     `.` andável   `#` sólido   `~` água   `+` porta
 *
 * Podia ser um array de números, e seria menor. Mas este repositório é lido a
 * dois — o irmão do dono acompanha pelo diff do git — e um array de 1.575
 * inteiros num diff não diz nada, enquanto 35 linhas de 45 caracteres **mostram
 * a fazenda**. Mover uma parede vira uma linha mudada que dá para entender sem
 * abrir o jogo.
 */
const mapaTexto = [];
for (let y = 0; y < ALT; y++) {
  let linha = '';
  for (let x = 0; x < LARG; x++) {
    const i = y * LARG + x;
    linha += col.porta[i] ? '+' : col.agua[i] ? '~' : col.solido[i] ? '#' : '.';
  }
  mapaTexto.push(linha);
}

// --- 2. a arte estática, assada ---------------------------------------------

const baixo = Buffer.alloc(W * H * 4);
const acima = Buffer.alloc(W * H * 4);

/** Tiles animados que ficam vivos: chave `tileset#local` → índice de faixa. */
const faixas = new Map();
const celulasAnimadas = [];
/** Quadros de porta, por nome de porta. */
const portas = new Map();
/** Quantas células ANDÁVEIS cada camada `acima` cobre — ver o relatório no fim. */
const contaAcimaAndavel = new Map();

/**
 * 🔴 **Pré-passada: quais células têm PRÉDIO.**
 *
 * Precisa vir antes do laço de assamento porque a profundidade de uma célula de
 * mato depende de haver um prédio ali — e o mato pode ser desenhado numa camada
 * ANTERIOR à do prédio. Ver `desenhaAcima` em `layers.mjs`.
 */
const construcao = new Uint8Array(N);
for (const camada of m.camadas) {
  if (!CAMADAS[camada.id].construcao) continue;
  for (let i = 0; i < camada.gids.length; i++) {
    const gid = camada.gids[i];
    if (!gid) continue;
    const { ts, local } = resolveGid(m.tilesets, gid);
    if (temPixel(ts, local)) construcao[i] = 1;
  }
}

for (const camada of m.camadas) {
  const papel = CAMADAS[camada.id];
  if (papel.bichos) continue; // bicho não é arte
  for (let i = 0; i < camada.gids.length; i++) {
    const gid = camada.gids[i];
    if (!gid) continue;
    const { ts, local, ...flip } = resolveGid(m.tilesets, gid);
    const anim = ts.animacoes[local];
    const x = i % LARG, y = (i / LARG) | 0;
    /*
     * ⚠️ **A profundidade é por CÉLULA, não por camada** — mudou em 31/08. Era
     * `papel.acima` uma vez por camada, e uma camada só do pack (`porch_roof`)
     * guarda telhado e varanda juntos, que querem lados opostos do jogador.
     * Ver `desenhaAcima` em `layers.mjs`.
     */
    /*
     * 🔴 **E o PÉ das árvores do pomar desce junto** — ver `PES_DO_POMAR`. Só
     * a copa fica sobre o jogador.
     */
    const ehAcima = desenhaAcima(papel, ts.nome, local, construcao[i] === 1)
      && !(CAMADAS_DE_ARVORE.has(camada.id) && ts.nome === 'trees' && PES_DO_POMAR.has(local));
    if (ehAcima && !col.solido[i] && !col.agua[i] && temPixel(ts, local)) {
      contaAcimaAndavel.set(papel.nome, (contaAcimaAndavel.get(papel.nome) ?? 0) + 1);
    }

    if (papel.porta) {
      // A porta não é assada: o cliente desenha o quadro certo do estado dela.
      if (!portas.has(papel.porta)) {
        portas.set(papel.porta, { nome: papel.porta, celulas: [], quadros: [] });
      }
      const p = portas.get(papel.porta);
      p.celulas.push({ x, y, ts: ts.nome, local, anim: anim ? anim.map((f) => f.tile) : [local] });
      continue;
    }

    if (anim && ANIMACAO_VIVA.has(ts.nome)) {
      /*
       * ⚠️ **O espelhamento entra na CHAVE da faixa**, e não no cliente: duas
       * células com o mesmo tile e espelhos diferentes são duas tiras
       * diferentes na folha. São 9 células no mapa (peixe e detalhe de água), e
       * assar a tira já virada custa 9 linhas a mais e poupa o cliente de saber
       * que espelho existe.
       */
      const chave = `${ts.nome}#${local}#${+flip.flipH}${+flip.flipV}${+flip.flipD}`;
      if (!faixas.has(chave)) {
        faixas.set(chave, {
          ts, quadros: anim, flip, indice: faixas.size,
          sincrona: ANIMACAO_EM_BLOCO.has(ts.nome),
        });
      }
      celulasAnimadas.push({ x, y, faixa: faixas.get(chave).indice, acima: ehAcima });
      continue;
    }

    poe(ehAcima ? acima : baixo, ts, local, x * ts.tileW * ESC, y * ts.tileH * ESC, flip);
  }
}

// --- 2b. a máscara de cobertura, e quais células são gramado -----------------

/**
 * 🔴 **Célula sem um pixel de arte é DEVOLVIDA ao motor.** É o conserto do
 * defeito que o dono relatou em 30/08: *"faixa preta em volta da fazenda, como
 * se faltasse a textura do chão"*. O cliente desliga o desenho por regra dentro
 * do retângulo da fazenda; onde a arte assada não cobria, não sobrava nada.
 *
 * ⚠️ Só vale para célula ANDÁVEL. Uma sólida sem arte devolvida ao motor viraria
 * um bloco 2.5D de madeira plantado no meio do campo.
 *
 * ⚠️ **A pergunta é sobre a camada `baixo`, e é de propósito**: célula cuja arte
 * inteira mora no `acima` — a copa do pomar sobre um canteiro — não tem chão
 * nenhum embaixo, e é o motor que tem que desenhá-lo.
 *
 * 🔴 **A troca do verde do pack pelo verde do jogo NÃO acontece mais aqui.** Ela
 * é por PIXEL, no compositor (`poeEm`, lá em cima) — ver o comentário grande de
 * `CORES_DE_GRAMA`. Aqui só se pergunta o resultado: quais células ficaram
 * sendo gramado limpo, que é o que o minimapa precisa saber.
 */
const LADO = 16 * ESC;
if (GRAMA_DO_JOGO.lado !== LADO) {
  throw new Error(`o retalho de grama tem ${GRAMA_DO_JOGO.lado}px e o tile da fazenda ${LADO}px`);
}

/**
 * A célula é gramado limpo? Sim quando ela ficou **idêntica ao retalho de grama
 * do jogo** depois da troca por pixel — ou seja: era grama chapada do pack e
 * ninguém desenhou nada por cima.
 *
 * 🔴 É o que sobrou do antigo `corUnicaDoTile`, e responde melhor: antes se
 * perguntava *"esta célula é de uma cor verde só?"* sobre a arte do pack; agora
 * se pergunta *"esta célula É a grama do jogo?"* sobre o resultado. Um tufo de
 * mato por cima reprova nas duas, e a segunda não depende de adivinhar verde.
 */
function ehGramadoLimpo(tx, ty) {
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const d = ((ty * LADO + y) * W + tx * LADO + x) * 4;
      if (baixo[d + 3] !== 255) return false;
      const s = ((GRAMA_DO_JOGO.y + y) * gramaImg.w + GRAMA_DO_JOGO.x + x) * 4;
      if (baixo[d] !== gramaImg.px[s] || baixo[d + 1] !== gramaImg.px[s + 1]
        || baixo[d + 2] !== gramaImg.px[s + 2]) return false;
    }
  }
  return true;
}

const coberto = new Uint8Array(N).fill(1);
/** Células cujo chão é GRAMA — o gramado, e as sem arte nenhuma na borda. */
const ehGrama = new Uint8Array(N);
let gramado = 0;
let liberadasPorVazio = 0;
for (let ty = 0; ty < ALT; ty++) {
  for (let tx = 0; tx < LARG; tx++) {
    const i = ty * LARG + tx;

    let opacos = 0;
    for (let y = 0; y < LADO; y++) {
      for (let x = 0; x < LADO; x++) {
        if (baixo[((ty * LADO + y) * W + tx * LADO + x) * 4 + 3] > 0) opacos++;
      }
    }
    if (opacos === 0) {
      if (!col.solido[i] && !col.agua[i]) { coberto[i] = 0; ehGrama[i] = 1; liberadasPorVazio++; }
      continue;
    }

    if (ehGramadoLimpo(tx, ty)) { ehGrama[i] = 1; gramado++; }
  }
}

/** A máscara de cobertura, no mesmo formato legível em diff do mapa de colisão. */
const arteTexto = [];
for (let y = 0; y < ALT; y++) {
  let linha = '';
  for (let x = 0; x < LARG; x++) linha += coberto[y * LARG + x] ? '#' : '.';
  arteTexto.push(linha);
}

/*
 * 🔴 O mapa de colisão é reescrito AQUI, e não lá em cima, porque só agora se
 * sabe quais células são grama. O `g` não muda colisão nenhuma — `g` e `.` são
 * ambos andáveis — mas muda o tile carimbado, e com ele **o mapa da tecla M**.
 * Sem isso o gramado da fazenda apareceria como terra batida no minimapa.
 */
for (let y = 0; y < ALT; y++) {
  let linha = '';
  for (let x = 0; x < LARG; x++) {
    const i = y * LARG + x;
    linha += col.porta[i] ? '+'
      : col.agua[i] ? '~'
        : col.solido[i] ? '#'
          : ehGrama[i] ? 'g' : '.';
  }
  mapaTexto[y] = linha;
}

// --- 3. a folha das animações ------------------------------------------------

const listaFaixas = [...faixas.values()].sort((a, b) => a.indice - b.indice);
const maxQuadros = listaFaixas.reduce((n, f) => Math.max(n, f.quadros.length), 1);
const AW = maxQuadros * 16 * ESC;
const AH = Math.max(1, listaFaixas.length) * 16 * ESC;
const folhaAnim = Buffer.alloc(AW * AH * 4);
{
  // Reaproveita `poe` com uma tela de outro tamanho: troca temporária dos
  // limites, que é feio mas mantém um compositor só no arquivo.
  const salvaW = W, salvaH = H;
  listaFaixas.forEach((f, linha) => {
    f.quadros.forEach((q, k) => {
      const img = imgs.get(f.ts.imagem);
      const sx = (q.tile % f.ts.colunas) * f.ts.tileW;
      const sy = Math.floor(q.tile / f.ts.colunas) * f.ts.tileH;
      const fH = f.flip.flipH, fV = f.flip.flipV, fD = f.flip.flipD;
      for (let y = 0; y < 16 * ESC; y++) {
        for (let x = 0; x < 16 * ESC; x++) {
          // Mesma ordem de desespelhamento do `poeEm` — V, H, e a diagonal por último.
          let ax = (x / ESC) | 0, ay = (y / ESC) | 0;
          if (fV) ay = f.ts.tileH - 1 - ay;
          if (fH) ax = f.ts.tileW - 1 - ax;
          const s = ((sy + (fD ? ax : ay)) * img.w + sx + (fD ? ay : ax)) * 4;
          const d = ((linha * 16 * ESC + y) * AW + k * 16 * ESC + x) * 4;
          folhaAnim[d] = img.px[s];
          folhaAnim[d + 1] = img.px[s + 1];
          folhaAnim[d + 2] = img.px[s + 2];
          folhaAnim[d + 3] = img.px[s + 3];
        }
      }
    });
  });
  void salvaW; void salvaH;
}

// --- 4. a folha das portas ---------------------------------------------------

/**
 * Cada porta vira uma tira horizontal de quadros, um por passo da abertura.
 * O cliente toca do 0 ao último ao entrar, e ao contrário ao sair.
 */
const listaPortas = [...portas.values()];
let portaMaxQuadros = 1, portaCelulas = 0;
for (const p of listaPortas) {
  for (const c of p.celulas) portaMaxQuadros = Math.max(portaMaxQuadros, c.anim.length);
  portaCelulas += p.celulas.length;
}
const PW = portaMaxQuadros * 16 * ESC;
const PH = Math.max(1, portaCelulas) * 16 * ESC;
const folhaPortas = Buffer.alloc(PW * PH * 4);
{
  let linha = 0;
  for (const p of listaPortas) {
    for (const c of p.celulas) {
      const ts = m.tilesets.find((t) => t.nome === c.ts);
      const img = imgs.get(ts.imagem);
      c.linha = linha;
      c.quadros = c.anim.length;
      for (let k = 0; k < c.anim.length; k++) {
        const t = c.anim[k];
        const sx = (t % ts.colunas) * ts.tileW;
        const sy = Math.floor(t / ts.colunas) * ts.tileH;
        for (let y = 0; y < 16 * ESC; y++) {
          for (let x = 0; x < 16 * ESC; x++) {
            const s = ((sy + ((y / ESC) | 0)) * img.w + sx + ((x / ESC) | 0)) * 4;
            const d = ((linha * 16 * ESC + y) * PW + k * 16 * ESC + x) * 4;
            folhaPortas[d] = img.px[s];
            folhaPortas[d + 1] = img.px[s + 1];
            folhaPortas[d + 2] = img.px[s + 2];
            folhaPortas[d + 3] = img.px[s + 3];
          }
        }
      }
      linha++;
    }
  }
}

// --- 5. os bichos ------------------------------------------------------------

/**
 * 🔴 **Contar bicho é mais difícil do que parece, e as duas primeiras regras que
 * tentei estavam erradas.**
 *
 * O autor pintou cada bicho como um bloco de células vizinhas — um porco ocupa
 * 2×2. Emitir um spawn por célula daria quatro porcos empilhados.
 *
 * **Tentativa 1, mancha conectada: dá 1 porco onde há 3.** Os porcos do
 * chiqueiro se ENCOSTAM: a célula (8,17) de um é vizinha da (9,17) do outro, e
 * um `flood fill` engole os três num blob só. Deu `pig×1 cow×3 chicken×1` para
 * uma fazenda que tem 3 porcos, 2 vacas e 4 galinhas.
 *
 * **A regra que funciona olha o TILESET, não o mapa.** Cada bicho é um retângulo
 * contíguo de tiles do tileset dele. Então uma célula começa um bicho novo
 * quando a célula à esquerda no mapa **não** é o tile imediatamente à esquerda
 * no tileset, e a de cima **não** é o tile imediatamente acima. Dois porcos
 * encostados têm um salto de coluna entre eles, e o salto é a fronteira.
 *
 * ⚠️ Comparação **dentro da mesma camada**: `Animals` e `Animals2` existem
 * justamente para o autor sobrepor bichos, e cruzar as duas voltaria a colar.
 *
 * 🔴 **E há bicho INVISÍVEL no mapa.** A última fileira (y=34) tem 15 células de
 * vaca em tiles totalmente transparentes — sobra de trabalho do autor, que não
 * aparece no desenho. Sem descartá-las, nasceriam vacas na borda de baixo da
 * fazenda, vindas do nada. Bicho que não se vê não é bicho.
 */
function ehArteVazia(ts, local) {
  const img = imgs.get(ts.imagem);
  const sx = (local % ts.colunas) * ts.tileW;
  const sy = Math.floor(local / ts.colunas) * ts.tileH;
  for (let y = 0; y < ts.tileH; y++) {
    for (let x = 0; x < ts.tileW; x++) {
      if (img.px[((sy + y) * img.w + sx + x) * 4 + 3] > 8) return false;
    }
  }
  return true;
}

const spawns = [];
const porEspecie = new Map();
for (const id of [82, 83]) {
  const camada = m.camadas.find((c) => c.id === id);
  /** `i` → {col, lin} do tile no tileset, só para esta camada. */
  const naCamada = new Map();
  for (let i = 0; i < camada.gids.length; i++) {
    const gid = camada.gids[i];
    if (!gid) continue;
    const { ts, local } = resolveGid(m.tilesets, gid);
    if (!BICHOS[ts.nome]) continue;
    if (ehArteVazia(ts, local)) continue;
    naCamada.set(i, { tipo: BICHOS[ts.nome], col: local % ts.colunas, lin: (local / ts.colunas) | 0 });
  }
  for (const [i, c] of naCamada) {
    const x = i % LARG, y = (i / LARG) | 0;
    const esq = x > 0 ? naCamada.get(i - 1) : undefined;
    const cima = y > 0 ? naCamada.get(i - LARG) : undefined;
    const continuaEsq = esq && esq.tipo === c.tipo && esq.lin === c.lin && esq.col === c.col - 1;
    const continuaCima = cima && cima.tipo === c.tipo && cima.col === c.col && cima.lin === c.lin - 1;
    if (continuaEsq || continuaCima) continue; // é o meio de um bicho, não o começo

    /*
     * O spawn vai no PÉ do bicho, não na célula de cima: `naCamada` é o canto
     * superior esquerdo, e o bicho pisa na linha de baixo do bloco dele.
     */
    let py = y;
    while (py + 1 < ALT) {
      const abaixo = naCamada.get((py + 1) * LARG + x);
      if (!abaixo || abaixo.tipo !== c.tipo || abaixo.col !== c.col) break;
      py++;
    }
    // ⚠️ Bicho em cima de parede fica preso para sempre; empurra para uma
    // vizinha andável antes de desistir dele.
    let destino = py * LARG + x;
    if (col.solido[destino] || col.agua[destino]) {
      const alt = [destino - LARG, destino + LARG, destino - 1, destino + 1]
        .find((j) => j >= 0 && j < N && !col.solido[j] && !col.agua[j]);
      if (alt === undefined) continue;
      destino = alt;
    }
    spawns.push({ type: c.tipo, x: destino % LARG, y: (destino / LARG) | 0 });
    porEspecie.set(c.tipo, (porEspecie.get(c.tipo) ?? 0) + 1);
  }
}

// --- 6. os interiores --------------------------------------------------------

/**
 * 🔴 Cada interior vira **um PNG e um mapa de texto**, exatamente como a
 * fazenda de fora — e mora no andar 1, que o motor tem e ninguém usa desde
 * 05/08.
 *
 * ⚠️ Não há camada `acima` aqui, e é de propósito: nada num quarto fica sobre a
 * cabeça do jogador. Móvel alto (a estante do celeiro) é sólido, então ele nunca
 * chega a ficar atrás dele.
 */
const interiores = [];
for (const def of INTERIORES) {
  const { m: mi, andavel, pouso, saida } = leInterior(def.tmx);
  const IW = mi.largura * mi.tileW * ESC;
  const IH = mi.altura * mi.tileH * ESC;
  const tela = Buffer.alloc(IW * IH * 4);

  for (const camada of mi.camadas) {
    for (let i = 0; i < camada.gids.length; i++) {
      const gid = camada.gids[i];
      if (!gid) continue;
      const { ts, local, ...flip } = resolveGid(mi.tilesets, gid);
      const img = imgsInterior(ts);
      poeEm(tela, IW, IH, img, ts, local,
        (i % mi.largura) * ts.tileW * ESC, ((i / mi.largura) | 0) * ts.tileH * ESC, flip);
    }
  }

  const linhas = [];
  for (let y = 0; y < mi.altura; y++) {
    let l = '';
    for (let x = 0; x < mi.largura; x++) l += andavel[y * mi.largura + x] ? '.' : '#';
    linhas.push(l);
  }

  writeFileSync(`${OUT_ARTE}/farm-int-${def.nome}.png`, encode(IW, IH, tela));
  interiores.push({
    nome: def.nome,
    origem: def.origem,
    andar: ANDAR_INTERNO,
    largura: mi.largura,
    altura: mi.altura,
    mapa: linhas,
    pouso,
    saida,
  });
}

// --- 7. as ligações entre andares --------------------------------------------

/**
 * 🔴 **Onde o jogador pousa ao SAIR, e por que não pode ser a própria porta.**
 *
 * O motor (`FloorLink`, em `shared/src/tiles.ts`) documenta que a célula de
 * pouso *"não é gatilho"* — e é uma exigência, não um detalhe. Se sair da casa
 * pousasse em cima da porta, a porta dispararia de novo e o jogador entraria e
 * sairia para sempre, num piscar de andares.
 *
 * Então o pouso de fora é **um tile ABAIXO** da porta, e o conversor confere que
 * ele é andável de verdade antes de emitir. Se não for, estoura aqui em vez de
 * criar uma porta que engole quem entra.
 */
const ligacoes = [];
for (const interior of interiores) {
  const porta = listaPortas.find((p) => p.nome === interior.nome);
  if (!porta) throw new Error(`interior "${interior.nome}" não tem porta correspondente no Farm.tmx`);

  /*
   * 🔴 **Só as células de porta que a COLISÃO reconhece viram gatilho.**
   *
   * A camada de porta do celeiro tem 12 células, mas 4 delas são tiles
   * transparentes (o mesmo enchimento que trancava a varanda da casa). A arte
   * pode carregar as 12 — desenhar nada não custa nada. O gatilho, não: quatro
   * delas caem em cima de parede, e a primeira da lista era uma dessas. O
   * resultado era uma entrada **inalcançável a pé**, que só apareceu quando eu
   * medi a alcançabilidade a partir do nascimento.
   */
  const vaos = porta.celulas.filter((c) => col.porta[c.y * LARG + c.x]);
  if (vaos.length === 0) throw new Error(`porta "${interior.nome}": nenhuma célula de vão sobrou`);

  const yMax = Math.max(...vaos.map((c) => c.y));
  const naLinha = vaos.filter((c) => c.y === yMax).map((c) => c.x).sort((a, b) => a - b);
  const xVao = naLinha[(naLinha.length / 2) | 0];
  const pousoExterno = { x: xVao, y: yMax + 1 };
  const iFora = pousoExterno.y * LARG + pousoExterno.x;
  if (pousoExterno.y >= ALT || col.solido[iFora] || col.agua[iFora] || col.porta[iFora]) {
    throw new Error(
      `porta "${interior.nome}": o pouso de fora (${pousoExterno.x},${pousoExterno.y}) não serve`
      + ' — precisa ser andável e não pode ser gatilho',
    );
  }

  ligacoes.push({
    nome: interior.nome,
    /** Gatilhos no andar 0: todo VÃO da porta leva para dentro. */
    entradas: vaos.map((c) => ({ x: c.x, y: c.y })),
    pousoDentro: interior.pouso,
    /** Gatilho no andar 1: o vão do interior. */
    saidaDentro: interior.saida,
    pousoFora: pousoExterno,
  });
}

// --- 8. escreve --------------------------------------------------------------

// --- 5b. a PALETA do construtor de mapas -------------------------------------

/**
 * 🔴 **O atlas que o editor de mapas do jogo mostra** (pedido do dono em 31/08:
 * *"um mini construtor de mapas... escolher os sprites, girar 90°, posicionar"*).
 *
 * ⚠️ **Só entram os tiles que a fazenda REALMENTE usa** — 1.053 de mais de
 * 10.000 nos 24 tilesets do pack. Despejar tudo daria uma paleta impossível de
 * percorrer, cheia de variação que o mapa nunca pediu; o que o autor usou é
 * exatamente o vocabulário visual desta fazenda, e é com ele que se conserta uma
 * aresta sem inventar um estilo novo.
 *
 * ⚠️ O atlas é o ÚNICO jeito de a paleta existir no cliente: os tilesets moram em
 * `assets/`, fora de `client/public`, e o navegador não os enxerga. Assar aqui é o
 * que os torna alcançáveis, do mesmo jeito que a arte da fazenda.
 *
 * 🔴 A ordem é agrupada por TILESET e estável: o índice de um tile na paleta é o
 * que vai gravado no banco quando alguém posiciona um objeto. Reordenar a paleta
 * troca o desenho de tudo que já foi posicionado — por isso grupos novos entram
 * no FIM, nunca no meio.
 */
const PALETA_COLS = 32;
const paletaTiles = [];
{
  const vistos = new Set();
  const porTs = new Map();
  for (const camada of m.camadas) {
    if (CAMADAS[camada.id].bichos) continue;
    for (let i = 0; i < camada.gids.length; i++) {
      const gid = camada.gids[i];
      if (!gid) continue;
      const { ts, local } = resolveGid(m.tilesets, gid);
      const chave = `${ts.nome}#${local}`;
      if (vistos.has(chave) || !temPixel(ts, local)) continue;
      vistos.add(chave);
      if (!porTs.has(ts.nome)) porTs.set(ts.nome, { ts, locais: [] });
      porTs.get(ts.nome).locais.push(local);
    }
  }
  for (const [, g] of [...porTs].sort((a, b) => b[1].locais.length - a[1].locais.length)) {
    g.locais.sort((a, b) => a - b);
    for (const local of g.locais) paletaTiles.push({ ts: g.ts, local, grupo: g.ts.nome });
  }
}
const PALETA_LIN = Math.max(1, Math.ceil(paletaTiles.length / PALETA_COLS));
const LADO_PAL = 16 * ESC;
const paleta = Buffer.alloc(PALETA_COLS * LADO_PAL * PALETA_LIN * LADO_PAL * 4);
paletaTiles.forEach((t, n) => {
  const img = imgs.get(t.ts.imagem);
  const sx = (t.local % t.ts.colunas) * t.ts.tileW;
  const sy = Math.floor(t.local / t.ts.colunas) * t.ts.tileH;
  const cx = (n % PALETA_COLS) * LADO_PAL;
  const cy = Math.floor(n / PALETA_COLS) * LADO_PAL;
  const telaW = PALETA_COLS * LADO_PAL;
  for (let y = 0; y < LADO_PAL; y++) {
    for (let x = 0; x < LADO_PAL; x++) {
      const s = ((sy + ((y / ESC) | 0)) * img.w + sx + ((x / ESC) | 0)) * 4;
      const d = ((cy + y) * telaW + cx + x) * 4;
      paleta[d] = img.px[s]; paleta[d + 1] = img.px[s + 1];
      paleta[d + 2] = img.px[s + 2]; paleta[d + 3] = img.px[s + 3];
    }
  }
});
/**
 * 🔴 **De quais peças da paleta cada célula da fazenda é feita** — é o que
 * permite CLICAR num tile do jogo e o construtor achar o grupo dele.
 *
 * Pedido do dono em 31/08: *"clicar no grid que quero no game e ele localiza o
 * grupo dele no construtor, vai ajudar a encontrar os 'parentes' de cada área"*.
 * E é o pedido certo: caçar uma cerca específica entre 871 peças é procurar
 * agulha; apontar para a cerca que já está no mapa é achar na hora.
 *
 * ⚠️ **É uma LISTA por célula, não uma peça só**, e é aí que está o valor: uma
 * célula da fazenda costuma ter três ou quatro camadas empilhadas (chão + mato +
 * cerca). Guardar só a de cima esconderia justamente o chão que se quer copiar.
 *
 * 🔴 **A ordem é por COBERTURA, não por camada — e a primeira tentativa foi por
 * camada, que estava errada.** O dono relatou: *"ele localiza vários que não têm
 * nada a ver"*. E localizava: a camada mais alta de uma célula quase nunca é o
 * que se vê. No telhado da casa a peça de cima é a **hera** (um galho de folhas
 * com 20 pixels opacos) sobre o telhado inteiro; no moinho é um farelo de pá; no
 * lago é um peixe. Clicar no telhado devolvia a hera.
 *
 * A pergunta certa é *"o que ocupa mais esta célula?"*, e ela se responde
 * contando pixel opaco. Empate desempata pela camada mais alta, que é o critério
 * antigo virando desempate em vez de regra.
 *
 * ⚠️ Só as células COM arte entram. Célula vazia não vira chave, senão o mapa
 * dobraria de tamanho para dizer "aqui não tem nada".
 */
const paletaIndice = new Map();
paletaTiles.forEach((t, n) => paletaIndice.set(`${t.ts.nome}#${t.local}`, n));
const paletaCelulas = {};
for (const camada of m.camadas) {
  if (CAMADAS[camada.id].bichos) continue;
  for (let i = 0; i < camada.gids.length; i++) {
    const gid = camada.gids[i];
    if (!gid) continue;
    const { ts, local } = resolveGid(m.tilesets, gid);
    const idx = paletaIndice.get(`${ts.nome}#${local}`);
    if (idx === undefined) continue; // tile transparente: ficou fora da paleta
    const chave = `${i % LARG},${(i / LARG) | 0}`;
    (paletaCelulas[chave] ??= []).push({ idx, cobre: contaPixels(ts, local) });
  }
}
for (const chave of Object.keys(paletaCelulas)) {
  paletaCelulas[chave] = paletaCelulas[chave]
    .map((p, ordem) => ({ ...p, ordem }))
    .sort((a, b) => (b.cobre - a.cobre) || (b.ordem - a.ordem))
    .map((p) => p.idx);
}

const paletaGrupos = [];
paletaTiles.forEach((t, n) => {
  const ultimo = paletaGrupos[paletaGrupos.length - 1];
  if (ultimo && ultimo.nome === t.grupo) ultimo.n++;
  else paletaGrupos.push({ nome: t.grupo, inicio: n, n: 1 });
});

mkdirSync(OUT_ARTE, { recursive: true });
writeFileSync(
  `${OUT_ARTE}/farm-paleta.png`,
  encode(PALETA_COLS * LADO_PAL, PALETA_LIN * LADO_PAL, paleta),
);
writeFileSync(`${OUT_ARTE}/farm-baixo.png`, encode(W, H, baixo));
writeFileSync(`${OUT_ARTE}/farm-acima.png`, encode(W, H, acima));
writeFileSync(`${OUT_ARTE}/farm-anim.png`, encode(AW, AH, folhaAnim));
writeFileSync(`${OUT_ARTE}/farm-portas.png`, encode(PW, PH, folhaPortas));

writeFileSync(`${OUT_ARTE}/farm.json`, `${JSON.stringify({
  _leia: 'GERADO por tools/farm/build.mjs a partir de assets/Farm/Tiled_files/Farm.tmx. NAO EDITE A MAO. Para mudar a fazenda, abra o .tmx no Tiled e rode `npm run farm:build`. So o CLIENTE le este arquivo: e a arte. A colisao vive em shared/data/world/farm.json, que os dois lados leem.',
  largura: LARG,
  altura: ALT,
  tile: 16 * ESC,
  paleta: {
    folha: 'farm-paleta.png',
    colunas: PALETA_COLS,
    total: paletaTiles.length,
    grupos: paletaGrupos,
    celulas: paletaCelulas,
  },
  animados: {
    folha: 'farm-anim.png',
    faixas: listaFaixas.map((f) => ({
      quadros: f.quadros.length,
      ms: f.quadros.map((q) => q.ms),
      // Células desta faixa giram JUNTAS, no mesmo quadro. Ver `ANIMACAO_EM_BLOCO`.
      sincrona: f.sincrona,
    })),
    celulas: celulasAnimadas,
  },
  portas: listaPortas.map((p) => ({
    nome: p.nome,
    celulas: p.celulas.map((c) => ({ x: c.x, y: c.y, linha: c.linha, quadros: c.quadros })),
  })),
  interiores: interiores.map((i) => ({
    nome: i.nome,
    arquivo: `farm-int-${i.nome}.png`,
    origem: i.origem,
    andar: i.andar,
    largura: i.largura,
    altura: i.altura,
  })),
}, null, 1)}\n`);

writeFileSync(OUT_DADOS, `${JSON.stringify({
  _leia: 'GERADO por tools/farm/build.mjs. NAO EDITE A MAO. Fonte: assets/Farm/Tiled_files/Farm.tmx. Lido pelos DOIS lados (shared/src/farm.ts) e carimbado no mundo em ORIGEM. A arte correspondente esta em client/public/assets/farm/ e so o cliente carrega.',
  _mapa: '. andavel (terra)   g andavel (grama)   # solido   ~ agua   + porta',
  _arte: 'Quem desenha cada celula.  # a fazenda   . o motor, com a textura do mundo',
  origem: ORIGEM,
  largura: LARG,
  altura: ALT,
  mapa: mapaTexto,
  arte: arteTexto,
  portas: listaPortas.map((p) => ({ nome: p.nome, celulas: p.celulas.map((c) => ({ x: c.x, y: c.y })) })),
  bichos: spawns,
  /*
   * ⚠️ `pouso` e `saida` já vêm em coordenadas do INTERIOR, não do mundo. Quem
   * soma a origem é `shared/src/farm.ts`, num lugar só — somar aqui e lá seria
   * a receita para o deslocamento dobrado que ninguém acha.
   */
  interiores: interiores.map((i) => ({
    nome: i.nome,
    origem: i.origem,
    andar: i.andar,
    largura: i.largura,
    altura: i.altura,
    mapa: i.mapa,
  })),
  ligacoes,
}, null, 1)}\n`);

// --- 7. relatório ------------------------------------------------------------

const ilhas = ilhasAndaveis(m, col);
const sol = col.solido.reduce((a, b) => a + b, 0);
const agu = col.agua.reduce((a, b) => a + b, 0);
console.log(`✅ fazenda ${LARG}×${ALT} tiles  ·  arte ${W}×${H}px a ${ESC}×  ·  origem (${ORIGEM.x},${ORIGEM.y})`);
console.log(`   colisão: ${sol} sólido · ${agu} água · ${N - sol - agu} andável (${((N - sol - agu) / N * 100).toFixed(0)}%)`);
console.log(
  `   gramado com a textura do jogo: ${gramado} células`
  + `  ·  devolvidas ao motor (sem arte): ${liberadasPorVazio}`,
);
console.log(`   animação viva: ${listaFaixas.length} faixas em ${celulasAnimadas.length} células`);
console.log(`   portas: ${listaPortas.map((p) => `${p.nome}(${p.celulas.length})`).join(' ')}`);
console.log(`   bichos: ${[...porEspecie].map(([t, n]) => `${t}×${n}`).join(' ')}`);
console.log(`   ilhas andáveis: ${ilhas.filter((i) => i.length >= 4).map((i) => i.length).join(', ')}`);
for (const i of interiores) {
  const andaveis = i.mapa.join('').split('').filter((c) => c === '.').length;
  console.log(
    `   interior "${i.nome}": ${i.largura}×${i.altura} no andar ${i.andar} em (${i.origem.x},${i.origem.y})`
    + ` · ${andaveis} células andáveis · pouso (${i.pouso.x},${i.pouso.y}) · saída (${i.saida.x},${i.saida.y})`,
  );
}
/*
 * 🔴 **Quanta gente cada camada `acima` esconde.** É a linha que denunciou o bug
 * da varanda em 31/08, e por isso ela virou parte do relatório.
 *
 * Toda arte `acima` passa por cima do jogador — é para isso que ela existe. A
 * pergunta que importa é *sobre quantas células ANDÁVEIS*, porque só ali há
 * alguém para esconder. Uma cerca-viva sólida com 130 células e zero andáveis
 * está certa por construção; `porch_roof` aparecia com 6, e eram justamente as
 * 6 da porta da casa.
 *
 * ⚠️ **Número alto NÃO é erro.** As duas camadas do pomar cobrem ~270 células
 * andáveis de propósito: passar por baixo da copa é o efeito pedido. O aviso não
 * julga — ele obriga a olhar a lista e perguntar, para cada linha, *"é folhagem
 * ou é chão?"*. Chão que ficou `acima` é o bug.
 */
const acimaAndavel = [...contaAcimaAndavel].sort((a, b) => b[1] - a[1]);
if (acimaAndavel.length) {
  console.log(
    `   camadas "acima" sobre células andáveis (o jogador passa ATRÁS delas): `
    + acimaAndavel.map(([nome, n]) => `${nome}(${n})`).join(' '),
  );
}
const semInterior = listaPortas.filter((p) => !interiores.some((i) => i.nome === p.nome));
if (semInterior.length) {
  console.log(`   ⚠️ portas SEM interior (abrem e não levam a lugar nenhum): ${semInterior.map((p) => p.nome).join(', ')}`);
}
console.log(
  `   paleta do editor: ${paletaTiles.length} tiles em ${paletaGrupos.length} grupos`
  + `  ·  ${PALETA_COLS}×${PALETA_LIN} células`
  + `  ·  ${Object.keys(paletaCelulas).length} células mapeadas para o clique`,
);
console.log(`   → ${OUT_ARTE}/  e  ${OUT_DADOS}`);
