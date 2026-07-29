/**
 * Carregador de tilesets externos (sprites reais, se presentes em /assets).
 *
 * Os PNGs ficam em client/public/assets e são servidos na raiz pelo Vite.
 * Se um arquivo não existir, retornamos null e o jogo cai no desenho por
 * código (placeholder) — nada quebra. Assim a arte é opcional/plugável.
 *
 * Tileset alvo: "Oblique Fantasy Tile Set" (redspark). Como ele é feito de
 * peças de AUTOTILE (bordas/transições) e não tem tiles sólidos isolados,
 * recortamos retalhos sólidos de 32px do interior de cada material — obtidos
 * por varredura de uniformidade da imagem. Renderizamos 1:1 sobre o tile
 * lógico de 32px (sem sobreposição), o que dá um chão limpo e sem emendas.
 * Autotiling com bordas bonitas fica para uma etapa futura.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

/** Lado do retalho sólido recortado do spritesheet. */
export const GROUND_PATCH = 32;

/**
 * id do tile (ver shared/tiles.ts) -> [x, y] do retalho sólido no Ground.png.
 * Coordenadas escolhidas por varredura (menor variância de cor por material).
 */
const GROUND_PATCHES: Record<number, [number, number]> = {
  1: [40, 160], // grass  -> verde  #63886C
  2: [112, 48], // dirt   -> terra  #BF6440
  3: [112, 48], // stone_floor -> terra (o retalho de areia tinha pintinhas em grade)
  4: [128, 0], //  water  -> azul   #5FAAED
  8: [112, 48], // sand   -> terra (idem; praia vira terra batida por ora)
};

export interface GroundTiles {
  byId: Map<number, Texture>;
  cell: number;
}

export async function loadGroundTiles(): Promise<GroundTiles | null> {
  try {
    const sheet = await Assets.load<Texture>('/assets/Ground.png');
    sheet.source.scaleMode = 'nearest'; // pixel-art nítido
    const byId = new Map<number, Texture>();
    for (const [idStr, [x, y]] of Object.entries(GROUND_PATCHES)) {
      const frame = new Rectangle(x, y, GROUND_PATCH, GROUND_PATCH);
      byId.set(Number(idStr), new Texture({ source: sheet.source, frame }));
    }
    console.log('[tileset] Ground.png carregado.');
    return { byId, cell: GROUND_PATCH };
  } catch (err) {
    console.warn('[tileset] Ground.png ausente — usando placeholders.', err);
    return null;
  }
}
