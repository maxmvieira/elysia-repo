/**
 * Monta as tiras do PERSONAGEM PRINCIPAL — **uma por classe** — a partir do
 * pack de espadachins da CraftPix, o mesmo de onde saíam os bandidos.
 *
 * 🔴 **Os bandidos SAÍRAM do jogo nesta troca** (2026-09-10, a pedido do dono):
 * a arte deles é agora a do jogador, e um monstro com a cara do herói seria a
 * pior confusão possível num jogo visto de cima. As três espécies (`bandit`,
 * `bandit_raider`, `bandit_chief`) foram removidas de `combat.ts` e do
 * `creatures.json`.
 *
 * Substitui `universal2strip.mjs` (autosprite.io) como fonte do herói. O antigo
 * NÃO foi apagado, e a arte dele continua em `classes-universal/`: é o único
 * caminho que produz arco, conjuração e as OITO direções, e é para lá que se
 * volta se este pack for descartado.
 *
 * ---
 *
 * ## 🔴 SÃO NOVE PATENTES DO MESMO PACK, E O JOGO USA CINCO
 *
 * O pack de espadachim vem em nove níveis, do maltrapilho ao capitão dourado.
 * Três eram os bandidos e seis são os guardas de vilarejo e de cidade. Cada
 * classe recebeu a patente cuja ROUPA conta a classe — não a que tem o número
 * mais alto:
 *
 * | classe | patente | por quê |
 * |---|---|---|
 * | `assassin` | lvl1 | o mais leve dos nove: sem armadura, braços de fora |
 * | `archer` | lvl2 | couro e capa, ainda leve |
 * | `druid` | lvl3 | túnica VERDE — a única cor de classe que o pack entrega |
 * | `knight` | lvl6 | elmo alado, placa completa, espadão |
 * | `sorcerer` | lvl9 | azul e dourado, o mais arcano dos nove |
 *
 * ⚠️ **Duas dessas patentes (lvl6 e lvl9) também são GUARDAS** em
 * `monstros2strip.mjs`. Não há conflito em tela hoje porque guarda **não
 * nasce** — o servidor só sabe criatura-ataca-jogador, e guarda hostil no
 * vilarejo atacaria quem deveria proteger. 🔴 **No dia em que a IA de guarda
 * existir, estas duas classes precisam de outra patente**, senão o jogador de
 * Knight será idêntico ao guarda ao lado dele.
 *
 * ## 🔴 A ORDEM DAS LINHAS DA FONTE NÃO É A DO JOGO — E NÃO É A QUE
 *    O `monstros2strip.mjs` USA
 *
 * | linha na fonte | é | linha no jogo |
 * |---|---|---|
 * | 0 | frente | 0 (`down`) |
 * | 1 | perfil esquerdo | 3 (`left`) |
 * | 2 | perfil direito | 2 (`right`) |
 * | 3 | costas | 1 (`up`) |
 *
 * Medido, não deduzido do nome do arquivo, por dois testes que não dependem de
 * olho — errar aqui faz o personagem andar de costas para onde vai e nada no
 * motor tem como perceber:
 *
 * 1. **Qual par é espelho.** Comparando o alpha de uma linha com o da outra
 *    invertida, as linhas 1 e 2 divergem **0,4 %** e todos os outros pares
 *    divergem de 1,8 % a 3,7 %. Só um par pode ser esquerda/direita, e é esse —
 *    logo 0 e 3 são frente e costas.
 * 2. **Onde caem os OLHOS.** Contando os pixels de azul saturado: a linha 0 tem
 *    36 (dois olhos), a 1 e a 2 têm 18 (um), e a 3 não tem nenhum. Isso separa
 *    frente de costas; e o olho único cai à ESQUERDA do centro do corpo na
 *    linha 1 e à direita na 2, o que separa esquerda de direita.
 *
 * ⚠️ **O `monstros2strip.mjs` usa `ORDEM = [0, 1, 3, 2]` nestes mesmos
 * arquivos**, que trata a linha 1 como costas e as 2 e 3 como o par de perfis.
 * Pelas duas medidas acima isso está errado para o pack de espadachim — o
 * bandido andando para o norte mostrava o perfil, e andando para o leste
 * mostrava as costas. Como os bandidos saíram e os guardas não nascem, o
 * defeito não está em tela hoje; **quem for ligar a IA de guarda conserta ali
 * antes**. Aqui não se mexe: aquele `ORDEM` está certo para os outros vinte
 * packs de monstro, e trocá-lo giraria todos eles.
 *
 * ## ✅ POR QUE ESTE CONVERSOR É CURTO
 *
 * O `universal2strip.mjs` tem 700 linhas porque as folhas do autosprite chegam
 * desalinhadas entre si e ele precisa medir a passada, girar a fase e reassentar
 * cada quadro no chão. Aqui nada disso é preciso: as nove patentes saem do MESMO
 * rig, na mesma célula de 64, com a sola na linha 43 — a prova é que o pack
 * consegue usar UMA sombra (`shadow_single.png`) para a animação inteira.
 *
 * A regra deste arquivo é **copiar a célula verbatim**: sem reescala, sem
 * reassentar, sem girar fase. Reposicionar arte já alinhada só introduz erro — e
 * o alinhamento é COBRADO a cada build (`confereSola`), então folha futura que
 * quebre a premissa aborta em vez de sair torta.
 *
 * ## Uso
 *
 *   node tools/principal2strip.mjs      # a fonte já é RGBA cru; não há passo 1
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { decode, encode } from './hud/png.mjs';

/** Lado da célula. É o da fonte, e não há reescala em lugar nenhum. */
const CELL = 64;

/**
 * 🔴 A linha em que a SOLA cai, dentro da célula.
 *
 * Medida nas nove patentes, não escolhida — e é o mesmo número que o `feetY` do
 * `PACK_PRINCIPAL` em `client/src/heroes.ts`. **São o mesmo valor em dois
 * arquivos**: mudar um sem o outro enterra ou levita o personagem.
 */
const SOLA = 43;

const ORIGEM = 'assets/monstros-craftpix';
const DESTINO = 'client/public/assets/classes-principal';

/**
 * 🔴 CONTRATO DE LINHAS com `fatia()` de `heroes.ts`: 0=down, 1=up, 2=right,
 * 3=left. O índice é a linha DA FONTE que alimenta cada uma.
 */
const DA_FONTE = [0, 3, 2, 1];

/** Qual patente veste cada classe, e o prefixo dos arquivos dela. */
const CLASSES = {
  assassin: { dir: 'bandido/Swordsman_lvl1', pre: 'Swordsman_lvl1' },
  archer: { dir: 'bandido/Swordsman_lvl2', pre: 'Swordsman_lvl2' },
  druid: { dir: 'bandido/Swordsman_lvl3', pre: 'Swordsman_lvl3' },
  knight: { dir: 'gvila/lvl6', pre: 'lvl6' },
  sorcerer: { dir: 'gcidade/lvl9', pre: 'lvl9' },
};

/**
 * O que vira cada arquivo.
 *
 * `verificaSola` fica falso onde a arte sai do eixo de propósito: no golpe a
 * lâmina varre acima da cabeça e abaixo dos pés, e na morte o corpo deita no
 * chão. Nos dois a caixa do conteúdo deixa de descrever onde o personagem
 * pisa, e cobrar a sola ali acusaria arte correta.
 *
 * ⚠️ **`Run`, `Walk_Attack` e `Run_Attack` ficam de fora**: o jogo não tem
 * corrida nem golpe-andando. É arte paga e disponível, e é a primeira coisa a
 * puxar se um dia esses estados existirem.
 */
const SAIDAS = [
  { saida: 'walk', anim: 'Walk', verificaSola: true },
  { saida: 'idle', anim: 'Idle', verificaSola: true },
  { saida: 'hurt', anim: 'Hurt', verificaSola: true },
  { saida: 'death', anim: 'Death', verificaSola: false },
  { saida: 'attack_sword', anim: 'attack', verificaSola: false },
];

/**
 * Caminho de uma folha da fonte.
 *
 * ⚠️ **`_without_shadow`, e é a única variante que o pack traz nesta pasta.** O
 * motor desenha a própria elipse de sombra sob todo ator (`makeMiniActor`, em
 * `main.ts`); folha com sombra pintada daria DUAS sombras — uma girando junto
 * com o sprite e outra não.
 */
const folha = (cls, anim) =>
  join(ORIGEM, CLASSES[cls].dir, `${CLASSES[cls].pre}_${anim}_without_shadow.png`);

/** Caixa do conteúdo de uma célula: `null` se ela estiver vazia. */
function caixa(img, col, row) {
  let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      if (img.px[((row * CELL + y) * img.w + col * CELL + x) * 4 + 3] > 8) {
        if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
      }
    }
  }
  return y1 < 0 ? null : { y0, y1, x0, x1 };
}

/**
 * 🔴 **A premissa deste conversor, cobrada a cada build.**
 *
 * Copiar verbatim só é correto porque o personagem pisa sempre na mesma linha.
 * Se um pack futuro vier de outro jeito, o defeito seria o herói subindo e
 * descendo enquanto anda — visível em tela e invisível no log.
 *
 * ⚠️ **O teste é "nada ACIMA da linha 43", e não "tudo exatamente em 43".** As
 * patentes vestidas penduram coisa abaixo do pé — capa, bainha, ponta de
 * espada —, e nas nove medidas a caixa desce até 47. Isso é arte correta. O que
 * não pode existir é quadro que ACABE acima de 43: aí o personagem flutua.
 */
function confereSola(img, nome) {
  const cols = img.w / CELL;
  const flutuando = [];
  let tocaOChao = false;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < cols; col++) {
      const c = caixa(img, col, row);
      if (!c) continue;
      if (c.y1 < SOLA) flutuando.push(`l${row}q${col}=${c.y1}`);
      if (c.y1 === SOLA) tocaOChao = true;
    }
  }
  if (flutuando.length) {
    throw new Error(
      `${nome}: ${flutuando.length} quadro(s) acabam ACIMA da linha ${SOLA} — ${flutuando.slice(0, 8).join(' ')}`
        + '\n  A cópia verbatim pressupõe o rig assentado no chão. Confira a folha antes de seguir.',
    );
  }
  if (!tocaOChao) throw new Error(`${nome}: nenhum quadro toca a linha ${SOLA} — o rig mudou de altura`);
}

/** Copia a célula `deCol` da linha `deLinha` para `paraCol` da linha `paraLinha`. */
function copia(img, deCol, deLinha, tira, tiraW, paraCol, paraLinha) {
  for (let y = 0; y < CELL; y++) {
    const orig = ((deLinha * CELL + y) * img.w + deCol * CELL) * 4;
    const dest = ((paraLinha * CELL + y) * tiraW + paraCol * CELL) * 4;
    img.px.copy(tira, dest, orig, orig + CELL * 4);
  }
}

/**
 * 🔴 **QUANTOS QUADROS ESTA LINHA REALMENTE TEM.**
 *
 * A largura da folha é a da direção MAIS LONGA, e nem toda linha a preenche: no
 * `Idle` das nove patentes a fileira de COSTAS tem **4 quadros de 12**, e os
 * outros oito são células vazias. É o único lugar do pack onde isso acontece —
 * `Walk`, `Hurt`, `Death` e `attack` vêm cheias nas quatro direções.
 *
 * ⚠️ **O defeito que isto evita é do pior tipo: silencioso e grave.** Copiadas
 * como estão, o herói parado de costas SUMIRIA da tela em oito dos doze
 * quadros. Nada erra, nada avisa — o personagem só pisca e desaparece.
 *
 * ⚠️ Exige que os quadros cheios estejam no COMEÇO. Um buraco no meio seria
 * outra coisa (quadro perdido, não loop curto) e aborta.
 */
function quadrosDaLinha(img, linha, cols, nome) {
  let cheios = 0;
  while (cheios < cols && caixa(img, cheios, linha)) cheios++;
  for (let c = cheios; c < cols; c++) {
    if (caixa(img, c, linha)) {
      throw new Error(`${nome}: linha ${linha} tem célula vazia no meio (q${cheios}), e não no fim`);
    }
  }
  if (cheios === 0) throw new Error(`${nome}: linha ${linha} está inteiramente vazia`);
  return cheios;
}

/**
 * Reordena as linhas de uma folha para o contrato do jogo, repetindo o loop
 * curto das linhas que não preenchem a largura.
 *
 * ✅ **Repetir é o conserto certo, e não esticar.** Reamostrar 4 quadros em 12
 * deixaria a respiração de costas 3× mais lenta que a de frente; repetir o
 * ciclo mantém as quatro direções no MESMO ritmo, que é o que o olho compara
 * quando o personagem gira.
 */
function reordena(img, cols, nome) {
  const tiraW = CELL * cols, tiraH = CELL * 4;
  const tira = Buffer.alloc(tiraW * tiraH * 4);
  const repetidas = [];
  for (let linha = 0; linha < 4; linha++) {
    const fonte = DA_FONTE[linha];
    const tem = quadrosDaLinha(img, fonte, cols, nome);
    if (tem < cols) {
      repetidas.push(`l${linha}: ${tem}→${cols}`);
      /*
       * ⚠️ Só fecha redondo se a largura for múltiplo do loop curto. Fora
       * disso a última repetição sai cortada e a animação dá um tranco ao
       * voltar ao começo — visível, não quebrado, e por isso é aviso e não erro.
       */
      if (cols % tem !== 0) {
        console.warn(`      ⚠️ ${nome} linha ${linha}: ${cols} não é múltiplo de ${tem}, o loop vai truncar`);
      }
    }
    for (let col = 0; col < cols; col++) copia(img, col % tem, fonte, tira, tiraW, col, linha);
  }
  return { tira, tiraW, tiraH, repetidas };
}

/**
 * Mede o que o `PACK_PRINCIPAL` precisa saber, sobre a tira já montada.
 *
 * 🔴 **A altura é contada DA SOLA ao topo, e não da caixa do conteúdo.** É a
 * diferença que fez este número sair errado na primeira medição: nas patentes
 * vestidas a capa e a bainha penduram até seis pixels ABAIXO do pé, então o
 * fundo da caixa é o tecido, não a sola. Medir dali dava um `feetY` de 47 para
 * o Knight — o boneco entraria no chão até o joelho.
 *
 * ⚠️ `alturaConteudo` alimenta só a ESCALA (`targetH / contentH`). Medir por
 * cima a altura encolheria a escala e o herói sairia menor que os outros.
 */
function metricas(tira, w, h) {
  let y0 = 1e9, x0 = 1e9, x1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tira[(y * w + x) * 4 + 3] > 8) {
        const ly = y % CELL; if (ly < y0) y0 = ly;
        const lx = x % CELL; if (lx < x0) x0 = lx; if (lx > x1) x1 = lx;
      }
    }
  }
  return { topo: y0, sola: SOLA, alturaConteudo: SOLA - y0 + 1, centroX: (x0 + x1) / 2 };
}

function monta(cls) {
  const destino = join(DESTINO, cls);
  mkdirSync(destino, { recursive: true });
  console.log(`\n[${cls}]  ${CLASSES[cls].dir}`);
  let daCaminhada = null;

  for (const { saida, anim, verificaSola } of SAIDAS) {
    const caminho = folha(cls, anim);
    const img = decode(caminho);
    if (img.h !== CELL * 4) {
      throw new Error(`${caminho}: esperava 4 linhas de ${CELL} px, veio ${img.h}`);
    }
    const cols = img.w / CELL;
    if (!Number.isInteger(cols)) {
      throw new Error(`${caminho}: largura ${img.w} não é múltiplo de ${CELL}`);
    }
    if (verificaSola) confereSola(img, `${CLASSES[cls].pre}_${anim}`);

    const { tira, tiraW, tiraH, repetidas } = reordena(img, cols, `${CLASSES[cls].pre}_${anim}`);
    writeFileSync(join(destino, `${saida}.png`), encode(tiraW, tiraH, tira));
    if (saida === 'walk') daCaminhada = metricas(tira, tiraW, tiraH);
    console.log(
      `   ${saida.padEnd(13)} ${String(cols).padStart(2)} quadros`
        + (verificaSola ? '  · sola conferida' : '')
        + (repetidas.length ? `  · loop curto repetido (${repetidas.join(', ')})` : ''),
    );
  }

  /**
   * `pose.png` é o quadro 0 do `idle`, com UMA coluna.
   *
   * ⚠️ Não é redundância: `heroIconCss` monta o retrato do cartão da tela de
   * criação por CSS, e imagem de CSS que falta **não dá erro** — o cartão só
   * fica vazio. E ele precisa de UMA célula: apontar para a tira animada
   * mostraria os doze quadros lado a lado dentro do retrato.
   */
  const idle = decode(folha(cls, 'Idle'));
  const poseW = CELL, poseH = CELL * 4;
  const pose = Buffer.alloc(poseW * poseH * 4);
  for (let linha = 0; linha < 4; linha++) copia(idle, 0, DA_FONTE[linha], pose, poseW, 0, linha);
  writeFileSync(join(destino, 'pose.png'), encode(poseW, poseH, pose));
  console.log(`   ${'pose'.padEnd(13)}  1 quadro`);

  return daCaminhada;
}

const medidas = {};
for (const cls of Object.keys(CLASSES)) medidas[cls] = monta(cls);

/*
 * 🔴 **ESCALA 2, e o número não é gosto: é o do resto da tela.** Toda criatura
 * deste mesmo pack é desenhada a 2,0× (`CREATURE_SHEETS`, em `miniworld.ts`),
 * então o herói a 2× tem o pixel do mesmo tamanho que o goblin ao lado. A 3×
 * ele teria o pixel maior que o mundo inteiro.
 *
 * ⚠️ E a escala TEM que ser inteira — a lição de 10/08, registrada no
 * `PACK_ANTIGO`: em escala fracionária com filtragem `nearest` cada pixel do
 * desenho vira 2 ou 3 pixels de tela, em faixas alternadas.
 */
const ESCALA = 2;

console.log('\nPara o PACK_PRINCIPAL em client/src/heroes.ts:');
for (const [cls, m] of Object.entries(medidas)) {
  console.log(
    `  ${cls.padEnd(9)} cell: ${CELL}, contentH: ${m.alturaConteudo}, feetY: ${m.sola}, `
      + `centerX: ${m.centroX}, targetH: ${m.alturaConteudo * ESCALA}   (${ESCALA},0×)`,
  );
}
