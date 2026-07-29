/**
 * Carregador dos sprites de ÁRVORE (recortados do pack enviado pelo usuário,
 * em `client/public/assets/trees/cut/tree1..6.png`). São árvores HD detalhadas;
 * cada tile de árvore no mundo escolhe uma variante de forma determinística
 * (mesma árvore sempre no mesmo lugar). Se faltarem, o jogo cai no desenho por
 * código (placeholder), sem quebrar.
 */

import { Texture } from 'pixi.js';

const BASE = '/assets/trees/cut';
const COUNT = 6;

/**
 * Carrega o PNG e o desenha num CANVAS 2D, usando o canvas como fonte da
 * textura. Fazemos assim DE PROPÓSITO: o caminho normal do Pixi 8 (Assets.load
 * / ImageBitmap) estava renderizando as áreas transparentes destes PNGs como
 * PRETO (fundo preto nos cantos das árvores esparsas). O compositing do canvas
 * 2D respeita o alpha corretamente (mesma abordagem dos ícones/overlay).
 */
async function loadTex(url: string): Promise<Texture | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0);
    const tex = Texture.from(cv);
    tex.source.scaleMode = 'nearest';
    return tex;
  } catch {
    return null;
  }
}

// Bump para forçar refetch (evita cache HTTP servindo recorte antigo).
const CACHE_BUST = 'v6';

// DESLIGADO por ora: o recorte atual do pack renderiza fundo preto nas árvores
// esparsas. Aguardando um sprite mais simples do usuário. Enquanto isso, o
// jogo cai no desenho por código (árvores limpas). Trocar para true ao chegar
// o sprite novo (e ajustar BASE/COUNT/nomes de arquivo).
const USE_TREE_SPRITES = false;

export async function loadTrees(): Promise<Texture[]> {
  if (!USE_TREE_SPRITES) {
    console.log('[trees] sprites HD desligados — usando árvores por código (aguardando sprite novo).');
    return [];
  }
  const out: Texture[] = [];
  for (let i = 1; i <= COUNT; i++) {
    const t = await loadTex(`${BASE}/tree${i}.png?${CACHE_BUST}`);
    if (t) out.push(t);
  }
  console.log(`[trees] ${out.length}/${COUNT} sprites carregados (via canvas, ${CACHE_BUST}).`);
  return out;
}

/** Escolhe uma variante de árvore de forma estável para a célula (x,y). */
export function treeIndexFor(x: number, y: number, n: number): number {
  const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  return h % n;
}
