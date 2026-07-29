/**
 * Gerador de sprites de personagem (pixel-art ORIGINAL, desenhada por código).
 *
 * Não usamos assets de terceiros: cada quadro é composto por retângulos e
 * "assado" numa textura via renderer. Produz um ciclo de caminhada de 4 quadros
 * em 3 vistas (baixo/cima/lado); a vista "esquerda" reусa a da direita espelhada.
 *
 * A paleta é parametrizável — base para um futuro sistema de outfits (doc §7).
 * Quando tivermos arte final, basta trocar este módulo por spritesheets reais.
 */

import { Container, Graphics, Texture, type Renderer } from 'pixi.js';

export interface CharacterPalette {
  skin: number;
  hair: number;
  tunic: number;
  pants: number;
  boot: number;
  outline: number;
}

export const PALETTE_SELF: CharacterPalette = {
  skin: 0xe8c9a0,
  hair: 0x5a3a1e,
  tunic: 0x3f6fb0, // azul: você
  pants: 0x2c3e50,
  boot: 0x21160d,
  outline: 0x161009,
};

export const PALETTE_OTHER: CharacterPalette = {
  skin: 0xe8c9a0,
  hair: 0x2b2b2b,
  tunic: 0xb0503f, // vermelho: outros jogadores
  pants: 0x4a3524,
  boot: 0x21160d,
  outline: 0x161009,
};

/** Texturas de caminhada por vista. `left` é `right` espelhada no uso. */
export interface CharacterTextures {
  down: Texture[];
  up: Texture[];
  right: Texture[];
}

const PX = 2; // tamanho de cada "pixel" de arte, em pixels de tela
const GW = 16; // largura da grade em pixels de arte
const GH = 18; // altura da grade
const FRAMES = 4;

type Dir = 'down' | 'up' | 'right';

function plot(g: Graphics, x: number, y: number, w: number, h: number, c: number): void {
  if (h <= 0 || w <= 0) return;
  g.rect(x * PX, y * PX, w * PX, h * PX);
  g.fill(c);
}

function drawFrame(g: Graphics, dir: Dir, frame: number, p: CharacterPalette): void {
  // Deslocamento de passo: pés alternam para dar sensação de caminhada.
  const lOff = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const rOff = -lOff;

  if (dir === 'down' || dir === 'up') {
    const front = dir === 'down';
    // Cabelo / cabeça.
    plot(g, 5, 1, 6, 2, p.hair);
    plot(g, 5, 3, 1, 2, p.hair);
    plot(g, 10, 3, 1, 2, p.hair);
    if (front) {
      plot(g, 6, 3, 4, 3, p.skin);
      plot(g, 6, 4, 1, 1, p.outline); // olho esq.
      plot(g, 9, 4, 1, 1, p.outline); // olho dir.
    } else {
      plot(g, 6, 3, 4, 3, p.hair); // nuca
    }
    // Tronco (túnica) + cinto.
    plot(g, 5, 6, 6, 5, p.tunic);
    plot(g, 5, 10, 6, 1, p.boot);
    // Braços (mangas + mãos), balançando ao contrário das pernas.
    plot(g, 4, 6, 1, 4, p.tunic);
    plot(g, 11, 6, 1, 4, p.tunic);
    plot(g, 4, 9 + rOff, 1, 1, p.skin);
    plot(g, 11, 9 + lOff, 1, 1, p.skin);
    // Pernas + pés que sobem/descem.
    plot(g, 6, 11, 2, 3, p.pants);
    plot(g, 8, 11, 2, 3, p.pants);
    plot(g, 6, 14 + lOff, 2, 1, p.boot);
    plot(g, 8, 14 + rOff, 2, 1, p.boot);
  } else {
    // Vista de lado (direita).
    plot(g, 5, 1, 6, 2, p.hair);
    plot(g, 5, 3, 1, 3, p.hair); // nuca
    plot(g, 6, 3, 4, 3, p.skin);
    plot(g, 9, 4, 1, 1, p.outline); // olho (frente)
    // Tronco.
    plot(g, 6, 6, 4, 5, p.tunic);
    plot(g, 6, 10, 4, 1, p.boot);
    // Braço da frente balançando.
    plot(g, 8, 6, 2, 4, p.tunic);
    plot(g, 8, 9 + lOff, 2, 1, p.skin);
    // Pernas em tesoura (uma à frente, outra atrás).
    plot(g, 6, 11, 2, 3, p.pants);
    plot(g, 8, 11, 2, 3, p.pants);
    plot(g, 6 + lOff, 14, 2, 1, p.boot);
    plot(g, 8 + rOff, 14, 2, 1, p.boot);
  }
}

function bake(renderer: Renderer, dir: Dir, frame: number, p: CharacterPalette): Texture {
  const g = new Graphics();
  drawFrame(g, dir, frame, p);
  // Container do tamanho fixo da grade para todos os quadros ficarem alinhados.
  const holder = new Container();
  const bounds = new Graphics();
  bounds.rect(0, 0, GW * PX, GH * PX);
  bounds.fill({ color: 0x000000, alpha: 0 }); // moldura transparente
  holder.addChild(bounds, g);
  const tex = renderer.generateTexture({ target: holder, resolution: 1 });
  tex.source.scaleMode = 'nearest'; // pixels nítidos ao escalar
  holder.destroy({ children: true });
  return tex;
}

export function generateCharacterTextures(
  renderer: Renderer,
  palette: CharacterPalette,
): CharacterTextures {
  const make = (dir: Dir): Texture[] =>
    Array.from({ length: FRAMES }, (_, f) => bake(renderer, dir, f, palette));
  return { down: make('down'), up: make('up'), right: make('right') };
}

export const CHARACTER_GRID = { GW, GH, PX };
