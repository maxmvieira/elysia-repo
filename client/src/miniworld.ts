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

/** Animação de hop do Slime (linha 0, 6 quadros) — direção não importa. */
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
