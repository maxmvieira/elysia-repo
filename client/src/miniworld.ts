/**
 * Carregador de sprites do pack **MiniWorldSprites** (ArMM1998) — o estilo
 * unificado do jogo: pixel-art top-down 16x16, com 4 direções DE VERDADE
 * (baixo/cima/direita/esquerda), diferente do antigo Soldier frontal-único.
 *
 * Personagens: cada classe usa uma folha própria. As folhas seguem o layout
 * consistente `linha 0=baixo, 1=cima, 2=direita, 3=esquerda` (o Axeman, o Mage
 * e o Bowman batem nesse padrão), com N quadros de caminhada por linha. O
 * quadro 0 serve de "parado". Se o pack faltar, o loader devolve null e o jogo
 * cai no desenho por código (placeholder) — nada quebra.
 *
 * Licença do pack: uso livre pessoal/comercial (CC0-like). Ver OtherLinks.docx.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';
import type { PlayerClass } from '@dominion/shared';

const CELL = 16;
const CHARS = '/assets/MiniWorldSprites/Characters';

/** Quadros de caminhada por direção (esquerda é uma linha própria, não espelho). */
export interface DirAnim {
  down: Texture[];
  up: Texture[];
  right: Texture[];
  left: Texture[];
}

export interface SheetCfg {
  path: string;
  /** Quadros de caminhada por linha (varia por folha). */
  frames: number;
  /** Dimensões da folha, para recortar o ícone (quadro 0) via CSS. */
  w: number;
  h: number;
}

/**
 * Mapa classe -> folha + cor. Silhuetas e cores distintas para leitura rápida
 * (Elysia Online, 4 classes):
 *  Knight = Axeman azul-aço · Feiticeiro = Mage roxo ·
 *  Arqueiro = Bowman verde · Assassino = Assasin encapuzado vermelho (adagas).
 * Todas seguem o layout linha0=baixo/1=cima/2=direita/3=esquerda.
 */
export const CLASS_SHEETS: Record<PlayerClass, SheetCfg> = {
  knight: { path: `${CHARS}/Soldiers/Melee/CyanMelee/AxemanCyan.png`, frames: 5, w: 96, h: 96 },
  sorcerer: { path: `${CHARS}/Soldiers/Ranged/PurpleRanged/MagePurple.png`, frames: 4, w: 96, h: 128 },
  archer: { path: `${CHARS}/Soldiers/Ranged/LimeRanged/BowmanLime.png`, frames: 5, w: 80, h: 128 },
  assassin: { path: `${CHARS}/Soldiers/Melee/RedMelee/AssasinRed.png`, frames: 5, w: 80, h: 192 },
};

/**
 * CSS inline para exibir o quadro 0 (parado, virado pra baixo) de uma classe
 * como ícone recortado da folha — usado nos cartões da tela inicial. Escala o
 * sheet inteiro e mostra só a célula 16x16 do canto superior esquerdo.
 */
export function classIconCss(cls: PlayerClass, boxPx: number): string {
  const { path, w, h } = CLASS_SHEETS[cls];
  const s = boxPx / CELL;
  return (
    `background-image:url('${path}');image-rendering:pixelated;` +
    `background-repeat:no-repeat;background-position:0 0;` +
    `background-size:${w * s}px ${h * s}px;`
  );
}

/** Fatia uma folha em texturas 16x16 e monta as 4 direções. */
async function sliceDirs(cfg: SheetCfg): Promise<DirAnim> {
  const sheet = await Assets.load<Texture>(cfg.path);
  sheet.source.scaleMode = 'nearest'; // pixel-art nítido ao escalar
  const row = (r: number): Texture[] =>
    Array.from({ length: cfg.frames }, (_, i) =>
      new Texture({
        source: sheet.source,
        frame: new Rectangle(i * CELL, r * CELL, CELL, CELL),
      }),
    );
  return { down: row(0), up: row(1), right: row(2), left: row(3) };
}

/** Carrega as animações direcionais das 4 classes. Null se o pack faltar. */
export async function loadClassAnims(): Promise<Record<PlayerClass, DirAnim> | null> {
  try {
    const classes = Object.keys(CLASS_SHEETS) as PlayerClass[];
    const anims = await Promise.all(classes.map((c) => sliceDirs(CLASS_SHEETS[c])));
    const out = {} as Record<PlayerClass, DirAnim>;
    classes.forEach((c, i) => (out[c] = anims[i]!));
    console.log('[miniworld] sprites de classe carregados.');
    return out;
  } catch (err) {
    console.warn('[miniworld] pack de personagens ausente — usando placeholder.', err);
    return null;
  }
}

/** Sprite do NPC comerciante (Fazendeiro MiniWorld). Null se ausente. */
export async function loadNpcAnim(): Promise<DirAnim | null> {
  try {
    return await sliceDirs({ path: `${CHARS}/Workers/LimeWorker/FarmerLime.png`, frames: 5, w: 80, h: 192 });
  } catch (err) {
    console.warn('[miniworld] NPC ausente — placeholder.', err);
    return null;
  }
}

/**
 * Zumbi — folha no formato **LPC Universal Sprite Sheet** (13 col × 54 lin de
 * 64px), diferente do MiniWorld 16x16 do resto do jogo.
 *
 * Layout LPC (medido na folha, não chutado):
 *   linhas 0–3   conjurar   (7 quadros)
 *   linhas 4–7   estocada   (8)
 *   linhas 8–11  ANDAR      (9)  <- é o que usamos
 *   linhas 12–15 corte      (6)
 *   linhas 16–19 tiro       (13)
 *   linhas 20+   dano/morte e animações extras
 *
 * Dentro de cada bloco a ordem é sempre: cima, esquerda, baixo, direita.
 *
 * O quadro 0 de cada linha é a POSE PARADA; 1–8 são o ciclo de passos. Por isso
 * cortamos fora o quadro 0 na animação de andar — senão o zumbi dá uma
 * "engasgada" a cada volta do ciclo.
 */
const LPC_CELL = 64;
const LPC_WALK_ROW = { up: 8, left: 9, down: 10, right: 11 };

export async function loadZombieAnim(): Promise<DirAnim | null> {
  try {
    const sheet = await Assets.load<Texture>('/assets/monsters/Zombie-alfa.png');
    sheet.source.scaleMode = 'nearest';
    // Quadros 1..8: pula o 0 (parado) para o ciclo de passos fechar liso.
    const row = (r: number): Texture[] =>
      Array.from({ length: 8 }, (_, i) =>
        new Texture({
          source: sheet.source,
          frame: new Rectangle((i + 1) * LPC_CELL, r * LPC_CELL, LPC_CELL, LPC_CELL),
        }),
      );
    console.log('[monsters] sprite do Zumbi carregado (LPC 64px).');
    return {
      up: row(LPC_WALK_ROW.up),
      left: row(LPC_WALK_ROW.left),
      down: row(LPC_WALK_ROW.down),
      right: row(LPC_WALK_ROW.right),
    };
  } catch (err) {
    console.warn('[monsters] Zumbi ausente — placeholder.', err);
    return null;
  }
}

/**
 * Idle do zumbi — MONTADA aqui, não lida pronta de um arquivo.
 *
 * Zombie-alfa-idle.png tem 4 células de 64px, mas **não é uma animação**: são as
 * 4 cabeças (cima/esquerda/baixo/direita) recortadas do próprio sheet de andar.
 * Medindo linha a linha, de y15 a y31 a contagem de pixels da cabeça bate
 * exatamente com a do corpo parado, e o idle não tem nenhum pixel que o corpo
 * já não tenha. Não existem quadros de balanço no arquivo.
 *
 * Então o balanço é gerado: para cada direção, desenhamos o corpo parado
 * (quadro 0 do andar), APAGAMOS a faixa da cabeça e redesenhamos a cabeça
 * deslocada alguns pixels. Só a cabeça se mexe; o corpo fica cravado.
 *
 * Por que apagar em vez de só sobrepor: as cabeças das 4 direções têm
 * silhuetas de larguras diferentes (a de baixo é ~3px mais larga que a de
 * lado). Sobrepor sem apagar deixaria uma borda da cabeça original aparecendo
 * por trás — o clássico "crânio duplo".
 */

/** Linhas 0..31 da célula são SÓ cabeça: em y32 já começam os ombros (medido). */
const HEAD_CUT = 32;
/** Amplitude do balanço, em pixels da arte. Subir para 2 deixa mais óbvio. */
const HEAD_BOB = 1;
/**
 * Deslocamento por quadro. Só para BAIXO de propósito: subir a cabeça abriria
 * uma fresta transparente na linha 31, onde a cabeça original foi apagada.
 */
const BOB_STEPS = [0, HEAD_BOB, HEAD_BOB, 0];

interface IdleDir {
  key: keyof DirAnim;
  /** Linha do sheet de andar (LPC). */
  row: number;
  /** Célula no sheet de cabeças. */
  col: number;
  /**
   * Correção de alinhamento. A cabeça de "cima" foi exportada 1px mais baixa
   * que a do corpo; sem isto ela daria um pulinho ao sair da caminhada.
   */
  base: number;
}
const IDLE_DIRS: IdleDir[] = [
  { key: 'up', row: 8, col: 0, base: -1 },
  { key: 'left', row: 9, col: 1, base: 0 },
  { key: 'down', row: 10, col: 2, base: 0 },
  { key: 'right', row: 11, col: 3, base: 0 },
];

/**
 * Carrega uma imagem crua, fora do `Assets` do Pixi. Serve para quando os pixels
 * precisam passar por canvas antes de virar textura (recompor, recolorir).
 *
 * 🔴 **Espera `onload`, e NÃO `img.decode()`.** A versão anterior era
 * `img.decode().then(() => img)`, e isso trava o jogo inteiro quando a aba está
 * **oculta**: o Chrome adia a decodificação de imagem em aba de segundo plano e a
 * promessa do `decode()` simplesmente nunca resolve. Como todo o carregamento do
 * mundo espera por estas imagens, o jogo ficava na tela preta **para sempre** —
 * abrir Elysia numa aba que não está na frente bastava para nunca entrar.
 *
 * Achado testando: `document.visibilityState === 'hidden'` e o carregamento
 * parava sempre no mesmo ponto, sem erro nenhum no console.
 *
 * `onload` dispara normalmente em aba oculta; a decodificação acontece depois,
 * no primeiro `drawImage`. Custa um engasgo no primeiro quadro e devolve a
 * garantia de que o jogo sempre carrega.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`imagem não carregou: ${src}`));
    img.src = src;
    // Cache do navegador pode ter resolvido antes dos handlers entrarem.
    if (img.complete && img.naturalWidth > 0) resolve(img);
  });
}

export async function loadZombieIdleAnim(): Promise<DirAnim | null> {
  try {
    const [walk, heads] = await Promise.all([
      loadImage('/assets/monsters/Zombie-alfa.png'),
      loadImage('/assets/monsters/Zombie-alfa-idle.png'),
    ]);

    const compose = (d: IdleDir, off: number): Texture => {
      const cv = document.createElement('canvas');
      cv.width = LPC_CELL;
      cv.height = LPC_CELL;
      const g = cv.getContext('2d')!;
      g.imageSmoothingEnabled = false; // pixel-art: nada de borrar
      // 1) corpo parado da direção
      g.drawImage(walk, 0, d.row * LPC_CELL, LPC_CELL, LPC_CELL, 0, 0, LPC_CELL, LPC_CELL);
      // 2) fora a cabeça original
      g.clearRect(0, 0, LPC_CELL, HEAD_CUT);
      // 3) cabeça de volta, deslocada
      g.drawImage(
        heads, d.col * LPC_CELL, 0, LPC_CELL, LPC_CELL,
        0, d.base + off, LPC_CELL, LPC_CELL,
      );
      const t = Texture.from(cv);
      t.source.scaleMode = 'nearest';
      return t;
    };

    const out = {} as DirAnim;
    for (const d of IDLE_DIRS) out[d.key] = BOB_STEPS.map((off) => compose(d, off));
    console.log('[monsters] idle do Zumbi montado (corpo parado + cabeça com balanço).');
    return out;
  } catch (err) {
    console.warn('[monsters] idle do Zumbi indisponível — ficará estático.', err);
    return null;
  }
}

/** Animação de hop do Slime (linha 0, 6 quadros) — direção não importa. */
// ---------------------------------------------------------------------------
// Folhas de monstro no formato de SPEC-SPRITES-MONSTROS.md
// ---------------------------------------------------------------------------

/**
 * Ordem das linhas na folha, conforme a spec: 0 baixo · 1 cima · 2 direita ·
 * 3 esquerda.
 */
const SHEET_ROW = { down: 0, up: 1, right: 2, left: 3 } as const;

/**
 * Conjunto completo de animações de uma criatura, por direção.
 *
 * `walk` é o único obrigatório — sem ele não há o que desenhar. Os outros são
 * opcionais porque a spec permite entregar em partes, e o motor cai no que tem:
 * sem `idle` congela no quadro 0, sem `attack` volta ao pulinho do placeholder.
 */
export interface CreatureSheets {
  walk: DirAnim;
  idle?: DirAnim;
  attack?: DirAnim;
  hurt?: DirAnim;
  death?: DirAnim;
}

/**
 * Recorta uma folha de 4 linhas (ou 3, espelhando) em `DirAnim`.
 *
 * 🔴 A spec permite entregar **3 linhas** quando a esquerda é espelho exato da
 * direita — "não invente uma 4ª linha duplicada". Aqui isso é detectado pela
 * ALTURA da imagem: 3 linhas de célula quadrada dão altura = 3 × célula. Nesse
 * caso a esquerda reusa os quadros da direita, e quem espelha é o `scale.x`
 * negativo do ator, como já acontece com o sprite frontal.
 */
function sliceDirSheet(sheet: Texture, cell: number): { anim: DirAnim; mirrored: boolean } {
  sheet.source.scaleMode = 'nearest';
  const cols = Math.max(1, Math.floor(sheet.width / cell));
  const rows = Math.max(1, Math.floor(sheet.height / cell));
  const mirrored = rows < 4;

  const row = (r: number): Texture[] =>
    Array.from({ length: cols }, (_, i) =>
      new Texture({
        source: sheet.source,
        frame: new Rectangle(i * cell, r * cell, cell, cell),
      }),
    );

  const direita = row(SHEET_ROW.right);
  return {
    anim: {
      down: row(SHEET_ROW.down),
      up: row(SHEET_ROW.up),
      right: direita,
      // Folha de 3 linhas: a esquerda é a direita espelhada pelo ator.
      left: mirrored ? direita : row(SHEET_ROW.left),
    },
    mirrored,
  };
}

/**
 * Como desenhar a folha de uma espécie.
 *
 * 🔴 **`scale` TEM QUE SER INTEIRO.** A filtragem é `nearest`: em escala
 * fracionária um pixel do desenho vira 2 na tela e o vizinho vira 3, em faixas
 * alternadas — o serrilhado que custou a sessão de 10/08 (a história está em
 * `heroes.ts`). O tamanho final do bicho é **consequência** do multiplicador,
 * não um alvo que se persegue com decimais.
 *
 * ⚠️ `anchorX`/`anchorY` são o bounding box de ALPHA medido, não a moldura da
 * célula. Errar por 1 px faz o bicho flutuar ou afundar no chão, e é o tipo de
 * defeito que ninguém acha olhando.
 */
export interface CreatureSheetCfg {
  /** Lado da célula na tira, em px. */
  cell: number;
  /**
   * Multiplicador de desenho. **Inteiro**, salvo exceção vista em tela.
   *
   * ⚠️ Hoje há uma: os três lagartos, em 1,5× — o porquê está no bloco deles em
   * `CREATURE_SHEETS`. Escala quebrada serrilha; só entra com o dono olhando.
   */
  scale: number;
  /** Centro horizontal do conteúdo, em fração da célula. */
  anchorX?: number;
  /** Linha do pé, em fração da célula. */
  anchorY?: number;
  /** Y do nome e da barra de vida, acima da cabeça. */
  labelTop?: number;
}

/**
 * 🔴 **Criaturas que JÁ TÊM folha desenhada, e como desenhar cada uma.**
 *
 * Esta lista é o interruptor: espécie que não está aqui continua no blob
 * placeholder colorido, e nem tenta carregar arquivo.
 *
 * **Ao entregar arte, acrescente a espécie aqui** — é a única mudança de código
 * necessária. As pastas em `client/public/assets/monsters/` já existem todas.
 *
 * Por que uma lista explícita em vez de tentar carregar tudo: sem ela, o cliente
 * dispararia 23 espécies × 5 arquivos = 115 requisições no boot, quase todas
 * 404. E o tamanho da célula **não dá para adivinhar** — uma folha de 4×4 células
 * de 32px tem exatamente as mesmas dimensões de uma de 2×2 de 64px.
 *
 * 🔴 **Os oito animais abaixo NÃO foram digitados à mão: o bloco inteiro é
 * impresso por `npm run animals:build`**, que mede o alpha de cada folha. Se a
 * arte for reexportada, rode o conversor e cole a saída de novo — corrigir um
 * número aqui sem passar por ele é como o pé sai do lugar.
 *
 * ⚠️ Nenhum deles tem `attack`, `hurt` nem `death`: o pack da CraftPix só traz
 * andar e parado. O motor cai no que existe — sem `attack` volta o pulinho do
 * placeholder, sem `hurt` pisca vermelho. Para bicho pacífico isso quase não
 * aparece; para a Cabra e o Cavalo, que revidam, o golpe é o pulinho.
 *
 * ⚠️ O Zumbi NÃO está aqui: ele usa `Zombie-alfa.png` na raiz, no formato LPC
 * antigo, com loader próprio (`loadZombieAnim`). Quando for redesenhado no
 * formato da spec, entra nesta lista e o loader antigo pode sair.
 */
export const CREATURE_SHEETS: Record<string, CreatureSheetCfg> = {
  // --- Fauna da CraftPix (`npm run animals:build`) --------------------------
  //
  // 🔴 **2× em todos**, fechado com o dono em 2026-08-29 na terceira rodada. A
  // lição está inteira no `ESCALA` de `tools/animals2strip.mjs`: perseguir uma
  // ALTURA IGUAL para todos é que punha filhote maior que adulto. A CraftPix já
  // desenhou as proporções certas dentro do pack, e um multiplicador único as
  // preserva. A hierarquia sai sozinha, sem ninguém escolher número:
  //   Cavalo 62 > Potro 54 > Cabra 50 > Cabrito 36 > Ganso 26
  //            > Coelho 21 > Gansinho 18 > Coelhinho 15
  // ⚠️ QUATRO são exceção ao 2×, e as duas vezes por decisão do dono em tela:
  // os coelhos em 29/08 (Coelho no tamanho do Coelhinho, Coelhinho no do
  // COGUMELO) e os gansos em 30/08 — *"o ganso tá mt grande"*, e estava: a 2×
  // ele dava 52 px, acima da Cabra. O Gansinho desceu junto por obrigação,
  // senão o filhote (36) ficaria maior que o adulto (26).
  rabbit: { cell: 32, scale: 1, anchorX: 0.5, anchorY: 0.875, labelTop: -27 }, // 21px -> 21
  rabbit_cub: { cell: 16, scale: 1, anchorX: 0.5, anchorY: 0.9375, labelTop: -21 }, // 15 -> 15
  goat: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.8125, labelTop: -56 }, // 25 -> 50
  goatling: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.8125, labelTop: -42 }, // 18 -> 36
  goose: { cell: 32, scale: 1, anchorX: 0.5, anchorY: 0.8125, labelTop: -32 }, // 26 -> 26
  gosling: { cell: 32, scale: 1, anchorX: 0.5, anchorY: 0.78125, labelTop: -24 }, // 18 -> 18
  horse: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.65625, labelTop: -68 }, // 31 -> 62
  foal: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.65625, labelTop: -60 }, // 27 -> 54

  // --- Bichos da fazenda (`npm run farm:build`) ----------------------------
  //
  // 🔴 **2× porque é a escala da própria fazenda.** O pack desenhou o
  // galinheiro, as cercas e o celeiro em arte de 16 px, e a fazenda inteira
  // entra no jogo a 2× (16 → 32 px por tile). Pôr os bichos em qualquer outra
  // escala faria a galinha não caber no poleiro que o autor desenhou para ela.
  //
  // ⚠️ **Isto deixa a Galinha (36) maior que o Ganso (26), e é uma inconsistência
  // real** — ganso é maior que galinha. A causa é que são dois packs de autores
  // diferentes e o Ganso foi encolhido à mão em 30/08 a pedido do dono. Não
  // "consertei" a galinha porque encolhê-la a desalinharia do galinheiro; **vale
  // olhar os dois lado a lado em tela** e decidir qual dos dois se move.
  pig: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.875, labelTop: -44 }, // 19 -> 38
  cow: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.71875, labelTop: -60 }, // 27 -> 54
  chicken: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.875, labelTop: -42 }, // 18 -> 36

  // --- Chefe (`npm run golem:build`) ---------------------------------------
  // 🔴 O único com as CINCO animações: andar, parado, golpe, dano e morte.
  // ⚠️ As linhas 2 e 3 do pack vinham TROCADAS; quem inverte é o conversor.
  //
  // 🔴 **A âncora sai só de `walk`+`idle`, e é o conserto do "golem flutuando".**
  // Antes o conversor media a UNIÃO das cinco folhas, e o `attack` — que é um
  // baque no chão — puxava a linha do pé de 76 para 95. Como a âncora é pregada
  // no chão do tile, o golem parado subia (95−77)×2 = **36 px**, mais de um tile
  // acima da própria sombra: a sombra parecia ter ficado nos grids de baixo.
  // O mesmo inchaço mandava o nome 66 px acima da cabeça (labelTop −148).
  // ⚠️ Não conserte isto editando os números aqui — rode `npm run golem:build` e
  // cole a saída, que é onde a regra mora.
  //
  // ⚠️ **Em pé ele tem 76 px, não os 142 que o handoff de 29/08 registrou** —
  // aquele número era a mesma medida inflada. Continua o maior do mapa (Cavalo
  // 62, herói 60), mas por pouco. Se o dono quiser um chefe que intimide de
  // longe, o caminho é `scale: 3` (114 px) no conversor — decisão de arte,
  // vista em tela, não parte deste conserto.
  // 🔴 4× desde 02/09: o dono pediu o Golem do tamanho do Senhor Demônio (152,8
  // px). O corpo mede 38 px, então 4× dá 152 — empatam. Sai de
  // `npm run golem:build`; não edite à mão.
  // ⚠️ A âncora deste veio do conversor ANTIGO, que mede pelo pixel mais baixo.
  // Pela regra nova (massa por linha, ver `monstros2strip.mjs`) ele desceria
  // 1 px — que a 4× vira 4 px de flutuação. Se incomodar, é o `golem2strip.mjs`
  // que precisa da regra nova, não este número.
  golem: { cell: 128, scale: 4, anchorX: 0.49609375, anchorY: 0.6015625, labelTop: -158 },

  // --- Cinco packs da CraftPix (`npm run monstros:build`) ------------------
  //
  // 🔴 **Não edite estes números à mão — rode o conversor e cole a saída.** Ele
  // mede a caixa de alpha de `walk`+`idle` e devolve âncora e `labelTop`
  // prontos; a regra de medir só essas duas está explicada no bloco do Golem
  // logo acima, e foi o conserto do "golem flutuando".
  //
  // 🔴 **As linhas 2 e 3 destes packs vêm TROCADAS**, como no Golem — quem
  // inverte é o conversor, olhando a arte. Norte virado em leste não quebra
  // teste nenhum, só aparece jogando.
  //
  // ⚠️ Escala de PACK, não de bicho (a lição do `animals2strip.mjs`): dentro de
  // um pack o artista já acertou as proporções relativas, e um multiplicador
  // único as preserva. O vampiro é o único a 2×, porque vem desenhado com
  // metade do conteúdo dos outros.
  //
  // 🔴 **Lagartos e cogumelos são a exceção à escala inteira: 1,5×, por decisão
  // do dono em 01/09 vendo em tela.** Os cogumelos vieram no mesmo pedido, com
  // o mesmo FATOR (não a mesma altura), então a proporção do pack se mantém:
  // Púrpura 57 · Escarlate 46,5 · Pardo 45. Ele viu os 37–43 px do 1× e pediu maior; os
  // degraus inteiros eram 1× (abaixo do herói) e 2× (74–86, **acima do Golem**,
  // que tem 76 e é o chefe). A 1,5× ficam em 56–65, encostando no herói (60).
  // ⚠️ O preço é serrilhado nas diagonais da cauda e da lâmina. O valor limpo é
  // 1 — e aí eles voltam a ser menores que o herói. Não há terceira opção.
  ent_seco: { cell: 128, scale: 2, anchorX: 0.49609375, anchorY: 0.6171875, labelTop: -104 }, // 49px -> 98px
  ent: { cell: 128, scale: 2, anchorX: 0.5, anchorY: 0.6171875, labelTop: -138 }, // 66px -> 132px
  ent_ancestral: { cell: 128, scale: 2, anchorX: 0.49609375, anchorY: 0.6171875, labelTop: -146 }, // 70px -> 140px
  vampire: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.6875, labelTop: -60 }, // 27px -> 54px
  vampire_noble: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.6875, labelTop: -64 }, // 29px -> 58px
  vampire_lord: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.6875, labelTop: -62 }, // 28px -> 56px
  mushroom_brown: { cell: 64, scale: 3, anchorX: 0.5, anchorY: 0.65625, labelTop: -93 }, // 29px -> 87px
  mushroom_red: { cell: 64, scale: 3, anchorX: 0.5, anchorY: 0.65625, labelTop: -96 }, // 30px -> 90px
  mushroom_purple: { cell: 64, scale: 4, anchorX: 0.5, anchorY: 0.65625, labelTop: -154 }, // 37px -> 148px
  giant_rat: { cell: 128, scale: 1, anchorX: 0.51171875, anchorY: 0.5703125, labelTop: -33 }, // 27px -> 27px
  plague_rat: { cell: 128, scale: 1, anchorX: 0.5078125, anchorY: 0.59375, labelTop: -40 }, // 34px -> 34px
  shadow_rat: { cell: 128, scale: 1, anchorX: 0.5078125, anchorY: 0.59375, labelTop: -38 }, // 32px -> 32px
  lizardman: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.671875, labelTop: -76 }, // 35px -> 70px
  lizardman_soldier: { cell: 64, scale: 3, anchorX: 0.5, anchorY: 0.671875, labelTop: -126 }, // 40px -> 120px
  lizardman_champion: { cell: 64, scale: 4, anchorX: 0.5, anchorY: 0.671875, labelTop: -170 }, // 41px -> 164px

  // --- Segunda leva da CraftPix, 01/09 -------------------------------------
  //
  // ⚠️ **`skeleton_warrior` e `zombie` não são espécies novas** — estavam na
  // ficha desde sempre e nasciam como bolha colorida. Agora têm arte.
  //
  // 🔴 **O zumbi trocou de arte, e não foi só estética.** Ele vinha de uma folha
  // LPC de 64 px, carregada por um caminho só dele (`loadZombieAnim`), com duas
  // animações. O pack da CraftPix dá as CINCO e entra pelo caminho normal — e de
  // quebra tira do jogo a única arte com licença *share-alike* do repositório,
  // que o `docs/LICENCAS-DE-ARTE.md` marcava como risco.
  //
  // ⚠️ Esqueletos e zumbis são desenhados pequenos no pack (23–27 px), daí o 2×.
  // Fantasmas, diabretes e gnolls vão a 1,5×, como os lagartos.
  demon: { cell: 128, scale: 1.75, anchorX: 0.49609375, anchorY: 0.6015625, labelTop: -81.25 }, // 43px -> 75.25px
  demon_crimson: { cell: 128, scale: 2, anchorX: 0.49609375, anchorY: 0.6015625, labelTop: -92 }, // 43px -> 86px
  demon_lord: { cell: 128, scale: 3.25, anchorX: 0.49609375, anchorY: 0.6015625, labelTop: -158.75 }, // 47px -> 152.75px
  ghost: { cell: 64, scale: 1.5, anchorX: 0.5, anchorY: 0.59375, labelTop: -51 }, // 30px -> 45px
  ghost_wraith: { cell: 64, scale: 1.5, anchorX: 0.5, anchorY: 0.59375, labelTop: -52.5 }, // 31px -> 46.5px
  ghost_specter: { cell: 64, scale: 1.5, anchorX: 0.5, anchorY: 0.625, labelTop: -58.5 }, // 35px -> 52.5px
  imp: { cell: 64, scale: 1.5, anchorX: 0.4921875, anchorY: 0.671875, labelTop: -43.5 }, // 25px -> 37.5px
  imp_winged: { cell: 64, scale: 1.5, anchorX: 0.4921875, anchorY: 0.671875, labelTop: -48 }, // 28px -> 42px
  imp_infernal: { cell: 64, scale: 1.5, anchorX: 0.4921875, anchorY: 0.671875, labelTop: -49.5 }, // 29px -> 43.5px
  beholder: { cell: 64, scale: 2, anchorX: 0.5078125, anchorY: 0.765625, labelTop: -94 }, // 44px -> 88px
  beholder_crimson: { cell: 64, scale: 2, anchorX: 0.5078125, anchorY: 0.828125, labelTop: -102 }, // 48px -> 96px
  beholder_void: { cell: 64, scale: 3, anchorX: 0.5078125, anchorY: 0.890625, labelTop: -177 }, // 57px -> 171px
  skeleton_warrior: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.640625, labelTop: -52 }, // 23px -> 46px
  skeleton_guard: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.640625, labelTop: -52 }, // 23px -> 46px
  skeleton_king: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.640625, labelTop: -60 }, // 27px -> 54px
  gnoll: { cell: 64, scale: 2, anchorX: 0.5078125, anchorY: 0.671875, labelTop: -72 }, // 33px -> 66px
  gnoll_warrior: { cell: 64, scale: 3, anchorX: 0.5078125, anchorY: 0.671875, labelTop: -105 }, // 33px -> 99px
  gnoll_chieftain: { cell: 64, scale: 4, anchorX: 0.5078125, anchorY: 0.671875, labelTop: -142 }, // 34px -> 136px
  zombie: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.640625, labelTop: -58 }, // 26px -> 52px
  zombie_grave: { cell: 64, scale: 2, anchorX: 0.5078125, anchorY: 0.640625, labelTop: -56 }, // 25px -> 50px
  zombie_rotten: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.640625, labelTop: -58 }, // 26px -> 52px

  // --- Goblins, 01/09 ------------------------------------------------------
  // ⚠️ `goblin_warrior` já existia sem arte desde julho. As outras duas são
  // espécie nova. 1,5× e não 2×: a 2× o goblin daria 62–72 px, acima do herói —
  // e goblin é bicho pequeno, essa é a leitura que a silhueta tem de dar.
  // 🔴 O `goblin_archer` fica sem arte: as três variantes são corpo a corpo.
  goblin_warrior: { cell: 64, scale: 2, anchorX: 0.46875, anchorY: 0.625, labelTop: -54 }, // 24px -> 48px
  goblin_captain: { cell: 64, scale: 2, anchorX: 0.46875, anchorY: 0.625, labelTop: -60 }, // 27px -> 54px
  goblin_shaman: { cell: 64, scale: 2, anchorX: 0.46875, anchorY: 0.625, labelTop: -64 }, // 29px -> 58px

  // --- Terceira leva, 02/09 ------------------------------------------------
  // 🔴 QUATRO preenchem espécie que já existia: os três Slimes do DD-BAL e o
  // Super Slime, que nunca teve arte. Eles eram desenhados por ramos próprios
  // em main.ts (uma folha de andar + variantes por rotação de matiz); como
  // este mapa tem PRECEDÊNCIA sobre tudo, aqueles ramos ficaram inertes.
  // ⚠️ Só a arte muda — os números deles seguem fixados pelo documento.
  slime: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.625, labelTop: -52 }, // 23px -> 46px
  slime_blue: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.625, labelTop: -68 }, // 31px -> 62px
  slime_amber: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.625, labelTop: -78 }, // 36px -> 72px
  slime_void: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.625, labelTop: -58 }, // 26px -> 52px
  slime_red: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.625, labelTop: -84 }, // 39px -> 78px
  super_slime: { cell: 64, scale: 4, anchorX: 0.4921875, anchorY: 0.625, labelTop: -98 }, // 23px -> 92px
  lich: { cell: 64, scale: 2, anchorX: 0.4921875, anchorY: 0.6875, labelTop: -76 }, // 35px -> 70px
  lich_frost: { cell: 64, scale: 2, anchorX: 0.4765625, anchorY: 0.6875, labelTop: -80 }, // 37px -> 74px
  lich_king: { cell: 64, scale: 3, anchorX: 0.4921875, anchorY: 0.6875, labelTop: -123 }, // 39px -> 117px
  golem_earth: { cell: 128, scale: 2, anchorX: 0.49609375, anchorY: 0.59375, labelTop: -80 }, // 37px -> 74px
  golem_crystal: { cell: 128, scale: 2, anchorX: 0.5, anchorY: 0.59375, labelTop: -94 }, // 44px -> 88px
  golem_arcane: { cell: 128, scale: 3, anchorX: 0.5, anchorY: 0.59375, labelTop: -168 }, // 54px -> 162px

  // --- Quarta leva, 02/09: caça, bandidos e guardas ------------------------
  // ⚠️ O Javali (boar) já existia na ficha e estava DORMENTE sem arte.
  // 🔴 Os seis GUARDAS entram só como arte: o servidor ainda não sabe
  // criatura-ataca-criatura, então guarda de verdade é sistema, não ficha.
  // Eles não têm spawn até a IA existir.
  boar: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.8125, labelTop: -50 }, // 22px -> 44px
  deer: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.875, labelTop: -62 }, // 28px -> 56px
  fox: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.875, labelTop: -54 }, // 24px -> 48px
  hare: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.875, labelTop: -52 }, // 23px -> 46px
  black_grouse: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.78125, labelTop: -50 }, // 22px -> 44px
  bandit: { cell: 64, scale: 2, anchorX: 0.4921875, anchorY: 0.6875, labelTop: -60 }, // 27px -> 54px
  bandit_raider: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.6875, labelTop: -60 }, // 27px -> 54px
  bandit_chief: { cell: 64, scale: 2, anchorX: 0.4921875, anchorY: 0.703125, labelTop: -62 }, // 28px -> 56px
  village_guard: { cell: 64, scale: 2, anchorX: 0.4921875, anchorY: 0.71875, labelTop: -62 }, // 28px -> 56px
  village_sergeant: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.71875, labelTop: -62 }, // 28px -> 56px
  village_captain: { cell: 64, scale: 2, anchorX: 0.4921875, anchorY: 0.734375, labelTop: -66 }, // 30px -> 60px
  city_guard: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.6875, labelTop: -64 }, // 29px -> 58px
  city_sergeant: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.6875, labelTop: -66 }, // 30px -> 60px
  city_captain: { cell: 64, scale: 3, anchorX: 0.5, anchorY: 0.6875, labelTop: -96 }, // 30px -> 90px
};

/**
 * Carrega as folhas de uma criatura de `assets/monsters/<tipo>/`.
 *
 * Devolve `null` quando não há nem `walk.png` — é o sinal de "esta espécie
 * continua no placeholder", e é o caso de 18 das 23 hoje. Arquivo ausente
 * individualmente (só `attack.png`, por exemplo) não é erro: a spec permite
 * entrega em partes, e o motor usa o que existe.
 *
 * `cell` é o lado da célula em pixels. A spec pede que quem desenha informe —
 * não há como adivinhar com segurança, porque uma folha de 4×4 células de 32px
 * tem as mesmas dimensões de uma de 2×2 de 64px.
 */
export async function loadCreatureSheets(
  type: string,
  cell: number,
): Promise<CreatureSheets | null> {
  const base = `/assets/monsters/${type}`;

  async function tenta(nome: string): Promise<{ anim: DirAnim; mirrored: boolean } | null> {
    try {
      const tex = await Assets.load<Texture>(`${base}/${nome}.png`);
      return sliceDirSheet(tex, cell);
    } catch {
      // Ausente é o caso NORMAL enquanto a arte não chega. Sem warn para não
      // encher o console de 18 espécies × 5 arquivos a cada carregamento.
      return null;
    }
  }

  const walk = await tenta('walk');
  if (!walk) return null;

  const [idle, attack, hurt, death] = await Promise.all([
    tenta('idle'), tenta('attack'), tenta('hurt'), tenta('death'),
  ]);

  const partes = ['walk'];
  if (idle) partes.push('idle');
  if (attack) partes.push('attack');
  if (hurt) partes.push('hurt');
  if (death) partes.push('death');
  console.log(
    `[monsters] ${type}: ${partes.join(', ')}`
    + `${walk.mirrored ? ' (3 linhas, esquerda espelhada)' : ''}`,
  );

  return {
    walk: walk.anim,
    ...(idle ? { idle: idle.anim } : {}),
    ...(attack ? { attack: attack.anim } : {}),
    ...(hurt ? { hurt: hurt.anim } : {}),
    ...(death ? { death: death.anim } : {}),
  };
}

export async function loadSlimeAnim(): Promise<Texture[] | null> {
  try {
    const sheet = await Assets.load<Texture>(`${CHARS}/Monsters/Slimes/Slime.png`);
    sheet.source.scaleMode = 'nearest';
    return Array.from({ length: 6 }, (_, i) =>
      new Texture({ source: sheet.source, frame: new Rectangle(i * CELL, 0, CELL, CELL) }),
    );
  } catch (err) {
    console.warn('[miniworld] slime ausente — placeholder.', err);
    return null;
  }
}
