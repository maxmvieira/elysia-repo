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
  /** Multiplicador de desenho. **Inteiro.** */
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
  //   Cavalo 62 > Potro 54 > Ganso 52 > Cabra 50 > Coelho 42
  //            > Cabrito 36 = Filhote de Ganso 36 > Coelhinho 30
  // ⚠️ Os dois coelhos são a exceção ao 2×, pedida em 29/08: o Coelho no
  // tamanho que o Coelhinho tinha, e o Coelhinho no tamanho do COGUMELO.
  rabbit: { cell: 32, scale: 1, anchorX: 0.5, anchorY: 0.875, labelTop: -27 }, // 21px -> 21
  rabbit_cub: { cell: 16, scale: 1, anchorX: 0.5, anchorY: 0.9375, labelTop: -21 }, // 15 -> 15
  goat: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.8125, labelTop: -56 }, // 25 -> 50
  goatling: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.8125, labelTop: -42 }, // 18 -> 36
  goose: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.8125, labelTop: -58 }, // 26 -> 52
  gosling: { cell: 32, scale: 2, anchorX: 0.5, anchorY: 0.78125, labelTop: -42 }, // 18 -> 36
  horse: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.65625, labelTop: -68 }, // 31 -> 62
  foal: { cell: 64, scale: 2, anchorX: 0.5, anchorY: 0.65625, labelTop: -60 }, // 27 -> 54

  // --- Chefe (`npm run golem:build`) ---------------------------------------
  // 🔴 O único com as CINCO animações: andar, parado, golpe, dano e morte. E o
  // maior do mapa por larga margem — 142 px contra 62 do Cavalo e 60 do herói.
  // ⚠️ As linhas 2 e 3 do pack vinham TROCADAS; quem inverte é o conversor.
  golem: { cell: 128, scale: 2, anchorX: 0.49609375, anchorY: 0.7421875, labelTop: -148 },
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
