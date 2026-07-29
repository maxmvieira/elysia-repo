/**
 * Sprites do KNIGHT em arte detalhada (pixel-art HD), enviados pelo usuário.
 *
 * Diferente do estilo MiniWorld 16x16 das outras classes: são personagens
 * grandes e detalhados, um PNG de POSE PARADA por direção (rotações). Por ora
 * só há o quadro parado — andar/atacar virão depois (o usuário está gerando).
 *
 * Há duas variantes por SEXO (masculino/feminino), escolhido na criação. As
 * folhas têm canvas e escala diferentes, então cada uma traz sua config de
 * âncora (pés + centro) e escala, medidas do bounding box real do conteúdo.
 *
 * Só usamos as 4 direções cardeais (o jogo é 4-direções); as diagonais das
 * rotações ficam de reserva para quando houver movimento em 8 direções.
 *
 * NOTA: os caminhos abaixo apontam para PASTAS DE ASSET no disco, que contêm
 * "warrior" no nome. Eles NÃO acompanham o rename da classe para Knight.
 */

import { Assets, Texture } from 'pixi.js';
import type { Gender } from '@dominion/shared';
import type { DirAnim } from './miniworld.js';

const MALE = '/assets/Create_a_professional_pixel_art_human_warrior_for/rotations';
const FEMALE = '/assets/beautiful_female_warrior_long_brown/rotations';

/** Config de render + arte de uma variante do Knight. */
export interface KnightArt {
  anim: DirAnim;
  /** Escala de exibição (normaliza tamanhos de canvas diferentes). */
  scale: number;
  /** Âncora (centro-x, linha dos pés) em fração do canvas. */
  anchorX: number;
  anchorY: number;
  /** Y (coords do container) onde colocar nome/barra de vida, acima da cabeça. */
  labelTop: number;
}

interface GenderCfg {
  base: string;
  canvas: number;
  scale: number;
  anchorX: number;
  anchorY: number;
  /** Recorte da CABEÇA (para o ícone da tela inicial): x, y, w, h no canvas. */
  head: { x: number; y: number; w: number; h: number };
}

/** Alvo de altura na tela do CONTEÚDO do personagem (~2 tiles). */
const TARGET_H = 64;

// Medidos via bounding box (alpha) da pose 'south':
//  Masculino (92): conteúdo ~44px alto, pés y≈68, centro x≈46.
//  Feminino (232): conteúdo ~111px alto, pés y≈167, centro x≈111.
const CFG: Record<Gender, GenderCfg> = {
  male: {
    base: MALE, canvas: 92, scale: TARGET_H / 44,
    anchorX: 46 / 92, anchorY: 68 / 92,
    head: { x: 28, y: 22, w: 36, h: 36 },
  },
  female: {
    base: FEMALE, canvas: 232, scale: TARGET_H / 111,
    anchorX: 111 / 232, anchorY: 167 / 232,
    head: { x: 88, y: 50, w: 54, h: 54 },
  },
};

async function loadDir(base: string, name: string): Promise<Texture> {
  const tex = await Assets.load<Texture>(`${base}/${name}.png`);
  tex.source.scaleMode = 'nearest';
  return tex;
}

/** Carrega as 4 direções de uma variante e monta o DirAnim. */
async function loadVariant(cfg: GenderCfg): Promise<KnightArt> {
  const [south, north, east, west] = await Promise.all([
    loadDir(cfg.base, 'south'),
    loadDir(cfg.base, 'north'),
    loadDir(cfg.base, 'east'),
    loadDir(cfg.base, 'west'),
  ]);
  // down=south, up=north, right=east, left=west (uma pose parada por direção).
  const anim: DirAnim = { down: [south], up: [north], right: [east], left: [west] };
  return { anim, scale: cfg.scale, anchorX: cfg.anchorX, anchorY: cfg.anchorY, labelTop: -TARGET_H + 26 };
}

/** Carrega as duas variantes (masc/fem) do Knight. Null se a arte faltar. */
export async function loadKnightSprites(): Promise<Record<Gender, KnightArt> | null> {
  try {
    const [male, female] = await Promise.all([loadVariant(CFG.male), loadVariant(CFG.female)]);
    console.log('[knight] sprites HD do Knight carregados.');
    return { male, female };
  } catch (err) {
    console.warn('[knight] arte do Knight ausente — usando MiniWorld.', err);
    return null;
  }
}

/**
 * CSS inline para o ícone da tela inicial: recorta a CABEÇA da pose 'south'
 * (frente) da variante escolhida e a escala para caber no box.
 */
export function knightIconCss(gender: Gender, boxPx: number): string {
  const c = CFG[gender];
  const s = boxPx / c.head.w;
  return (
    `background-image:url('${c.base}/south.png');image-rendering:pixelated;` +
    `background-repeat:no-repeat;` +
    `background-size:${c.canvas * s}px ${c.canvas * s}px;` +
    `background-position:${-c.head.x * s}px ${-c.head.y * s}px;`
  );
}
