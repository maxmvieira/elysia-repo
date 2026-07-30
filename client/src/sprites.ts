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
import { loadImage } from './miniworld.js';

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

// ---------------------------------------------------------------------------
// Slime Azul e Slime Vermelho — a arte do Slime Verde, recolorida
// ---------------------------------------------------------------------------

/**
 * Rotação de matiz de cada irmão do Slime Verde, em graus.
 *
 * O verde da arte fica perto de 120° no círculo de matiz, então +120 leva a azul
 * e −120 a vermelho. Decisão do dono: os dois reusam a arte do Verde em vez de
 * ganhar sprite próprio (`DD-BAL-034/035` só define atributos, não aparência).
 */
export const SLIME_HUE_DEG: Record<string, number> = {
  slime_blue: 120,
  slime_red: -120,
};

/**
 * Recolore uma tira inteira por **rotação de matiz** e devolve os quadros.
 *
 * 🔴 Por que não usar `sprite.tint`, que seria uma linha: tint MULTIPLICA. A arte
 * do Slime é verde, ou seja, canal G alto e R/B baixos — multiplicar por azul dá
 * verde-escuro sujo, porque o canal que domina continua dominando, e o que falta
 * não pode ser criado por multiplicação. É o motivo pelo qual o Super Slime
 * "roxo" nunca ficou roxo de verdade.
 *
 * Rotacionar o matiz troca a cor e **preserva o sombreado**, que é o que faz o
 * bicho continuar parecendo gelatina em vez de mancha chapada.
 *
 * `ctx.filter` é suportado no Chrome, onde o jogo roda. Navegador que ignore o
 * filtro mostra o Slime verde original — feio, mas não quebra.
 */
async function loadStripHue(path: string, hueDeg: number): Promise<Texture[]> {
  const img = await loadImage(path);
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false; // pixel-art: nada de borrar
  // O `saturate` não é tempero: `hue-rotate` de CSS é uma aproximação por matriz
  // linear e PERDE saturação no caminho. Medido na folha do Slime, a arte verde
  // tem 47 % de saturação média e as variantes saíam a 43 %; com 1.6 voltam a
  // 49 % (azul) e 56 % (vermelho), ou seja, à mesma força do original.
  g.filter = `hue-rotate(${hueDeg}deg) saturate(1.6)`;
  g.drawImage(img, 0, 0);

  const tex = Texture.from(cv);
  tex.source.scaleMode = 'nearest';
  const n = Math.max(1, Math.round(img.width / FRAME));
  return Array.from({ length: n }, (_, i) =>
    new Texture({ source: tex.source, frame: new Rectangle(i * FRAME, 0, FRAME, FRAME) }),
  );
}

/** Um `AnimSet` completo do Slime, recolorido. */
async function loadSlimeHue(hueDeg: number): Promise<AnimSet> {
  const p = (name: string) =>
    `${BASE}/Monster_Slime/With_Shadows/Monster_Slime_${name}-Sheet.png`;
  const [idle, walk, attack, hurt, death] = await Promise.all([
    loadStripHue(p('Idle'), hueDeg),
    loadStripHue(p('Walk'), hueDeg),
    loadStripHue(p('Attack1'), hueDeg),
    loadStripHue(p('Hurt'), hueDeg),
    loadStripHue(p('Death'), hueDeg),
  ]);
  return { idle, walk, attack, hurt, death };
}

/**
 * As variantes coloridas do Slime, por `creatureType`. Null se o pack faltar —
 * aí os dois caem no blob placeholder, como qualquer criatura sem arte.
 */
export async function loadSlimeVariants(): Promise<Record<string, AnimSet> | null> {
  try {
    const tipos = Object.keys(SLIME_HUE_DEG);
    const sets = await Promise.all(tipos.map((t) => loadSlimeHue(SLIME_HUE_DEG[t]!)));
    const out: Record<string, AnimSet> = {};
    tipos.forEach((t, i) => (out[t] = sets[i]!));
    console.log('[sprites] Slime Azul e Vermelho gerados por rotação de matiz.');
    return out;
  } catch (err) {
    console.warn('[sprites] variantes do Slime indisponíveis — placeholder.', err);
    return null;
  }
}
