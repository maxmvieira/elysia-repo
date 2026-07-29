/**
 * Carregador das animações de personagem (FreeCharactersAnimationsAssetPack).
 *
 * Cada animação é uma TIRA horizontal de quadros 96x96. Carregamos a folha,
 * cortamos em texturas (uma por quadro) e devolvemos um AnimSet por ator.
 *
 * Estes sprites são de FRENTE ÚNICA (olham para a câmera): não há vistas de
 * cima/baixo/costas. A direção horizontal é resolvida com espelhamento no
 * `main.ts` (esquerda = direita invertida). Se o pack estiver ausente, o loader
 * devolve null e o jogo cai no desenho por código (placeholder) — nada quebra.
 *
 * Licença do pack: uso pessoal e comercial, modificação permitida (autor
 * oboropixelart). Ver License.txt no diretório do pack.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const FRAME = 96;
const BASE = '/assets/FreeCharactersAnimationsAssetPack/SpriteSheets(96x96)';

/** Estados de animação suportados (um por tira de sprite). */
export interface AnimSet {
  idle: Texture[];
  walk: Texture[];
  attack: Texture[];
  hurt: Texture[];
  death: Texture[];
}

export interface CharacterAnims {
  player: AnimSet;
  slime: AnimSet;
}

/**
 * Configuração de render de um ator (medida a partir do bounding box real dos
 * sprites): âncora no CENTRO do conteúdo em x (evita "pulo" ao espelhar) e na
 * linha dos pés/sombra em y, mais a escala para o tamanho desejado sobre o tile.
 */
export interface SpriteCfg {
  anchorX: number;
  anchorY: number;
  scale: number;
}

// Player (Human Soldier): conteúdo em x≈34..54 (centro 44), pés/sombra em y≈59.
export const PLAYER_CFG: SpriteCfg = { anchorX: 44 / FRAME, anchorY: 59 / FRAME, scale: 2.0 };
// Slime: conteúdo em x≈38..56 (centro 47), pés/sombra em y≈59.
export const SLIME_CFG: SpriteCfg = { anchorX: 47 / FRAME, anchorY: 59 / FRAME, scale: 2.0 };
// Super Slime (CHEFE): mesmo sprite do Slime, bem maior — impõe respeito.
export const BOSS_SLIME_CFG: SpriteCfg = { anchorX: 47 / FRAME, anchorY: 59 / FRAME, scale: 3.6 };

async function loadStrip(path: string): Promise<Texture[]> {
  const sheet = await Assets.load<Texture>(path);
  sheet.source.scaleMode = 'nearest'; // pixel-art nítido ao escalar
  const n = Math.max(1, Math.round(sheet.width / FRAME));
  const frames: Texture[] = [];
  for (let i = 0; i < n; i++) {
    frames.push(new Texture({ source: sheet.source, frame: new Rectangle(i * FRAME, 0, FRAME, FRAME) }));
  }
  return frames;
}

async function loadActor(dir: string, prefix: string): Promise<AnimSet> {
  const p = (name: string) => `${BASE}/${dir}/With_Shadows/${prefix}_${name}-Sheet.png`;
  const [idle, walk, attack, hurt, death] = await Promise.all([
    loadStrip(p('Idle')),
    loadStrip(p('Walk')),
    loadStrip(p('Attack1')),
    loadStrip(p('Hurt')),
    loadStrip(p('Death')),
  ]);
  return { idle, walk, attack, hurt, death };
}

/** Carrega as animações de player e slime. Null se o pack não estiver presente. */
export async function loadCharacterAnims(): Promise<CharacterAnims | null> {
  try {
    const [player, slime] = await Promise.all([
      loadActor('Human_Soldier_Sword_Shield', 'Human_Soldier_Sword_Shield'),
      loadActor('Monster_Slime', 'Monster_Slime'),
    ]);
    console.log('[sprites] animações de personagem carregadas.');
    return { player, slime };
  } catch (err) {
    console.warn('[sprites] pack de animações ausente — usando placeholders.', err);
    return null;
  }
}
