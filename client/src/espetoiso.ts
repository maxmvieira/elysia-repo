/**
 * ESPETO ISOMÉTRICO — o mundo em losango, com os personagens QUE JÁ EXISTEM.
 *
 * 🔴 A PERGUNTA QUE ELE RESPONDE, e só ela: **os sprites das 4 classes, que
 * foram feitos em `high top-down`, aguentam um mundo isométrico?**
 *
 * Ela apareceu em 14/08, quando o interior da casa entrou no jogo: o assoalho
 * do cômodo é um losango isométrico e o jogador anda em grade quadrada, e o
 * dono descreveu como *"está incomodando muito"*. A saída óbvia é migrar o jogo
 * inteiro — mas isso só se decide vendo, não estimando.
 *
 * ⚠️ Descartável como os irmãos `espeto3d*`: **não fala com o servidor, não
 * importa `main.ts`, não é entrada do `vite build`.** Apagar este arquivo e o
 * `espeto-iso.html` não quebra nada.
 *
 * ## O que ele mostra de propósito, e o que ele NÃO mostra
 *
 * ✅ O herói real (tira `walk.png` do pack PixelLab), nas 4 direções, andando.
 * ✅ A casa e o cômodo isométricos que já geramos, na mesma cena.
 * ✅ Os dois lado a lado: **isométrico à esquerda, top-down à direita**, o
 *    mesmo mundo e o mesmo herói — é a comparação que decide.
 *
 * ❌ **O chão é losango de cor chapada, não o `Ground.png`.** O tileset atual é
 *    top-down e não existe versão isométrica dele; fingir uma aqui mentiria
 *    sobre o custo. A pergunta é sobre o PERSONAGEM, e cor chapada não atrapalha
 *    julgá-la. 🔴 Refazer o tileset é um custo real da migração, e este espeto
 *    deliberadamente não o esconde.
 * ❌ Sem criaturas: 21 das 23 não têm arte nenhuma hoje, então não há o que
 *    conflitar — é justamente o que barateia a migração.
 *
 * ## A projeção
 *
 * Losango 2:1, o mesmo do resto da arte que geramos:
 *
 *     telaX = (x - y) * (LADO / 2)
 *     telaY = (x + y) * (LADO / 4)
 *
 * 🔴 E a ordem de desenho muda junto: hoje o jogo ordena por `y`, e em
 * isométrico o que está "à frente" é o maior **`x + y`**. Errar isso faz o
 * herói sumir atrás de coisas que estão atrás dele.
 */

import { Application, Container, Sprite, Texture, Graphics, Rectangle } from 'pixi.js';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Lado do losango em pixels. 64x32 é o 2:1 clássico. */
const LADO = 64;
/** Lado do tile quadrado, no painel de comparação. Igual ao `TILE_SIZE` do jogo. */
const QUAD = 32;

/** Formato da tira de herói — os mesmos números de `heroes.ts`. */
const CELL = 64;
const DIRS = ['south', 'north', 'east', 'west'] as const;
type Dir = typeof DIRS[number];

const MAPA = 14; // lado do pedaço de mundo do espeto, em tiles

// ---------------------------------------------------------------------------
// Carregamento (pelo canvas, nunca por `Assets.load`)
// ---------------------------------------------------------------------------

/**
 * ⚠️ As duas armadilhas de sempre, e elas valem aqui igual valem no jogo:
 * `Assets.load` do Pixi pinta a transparência destes PNGs de PRETO, e
 * `img.decode()` não resolve em aba oculta. Ver `spritebox.ts`.
 */
function carregaImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error(`falhou: ${url}`));
    img.src = url;
  });
}

async function texturaDe(url: string): Promise<Texture | null> {
  try {
    const img = await carregaImagem(url);
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    cv.getContext('2d')!.drawImage(img, 0, 0);
    return Texture.from(cv);
  } catch {
    return null;
  }
}

/** Recorta um quadro da tira: linha = direção, coluna = quadro. */
function quadro(tira: Texture, linha: number, coluna: number): Texture {
  return new Texture({
    source: tira.source,
    frame: new Rectangle(coluna * CELL, linha * CELL, CELL, CELL),
  });
}

// ---------------------------------------------------------------------------
// Mundo de mentirinha (o espeto não fala com o servidor)
// ---------------------------------------------------------------------------

const COR_GRAMA = 0x3c5a34;
const COR_TERRA = 0x5a4632;
const COR_PEDRA = 0x4a4740;

/** Chão do espeto: grama, com um caminho de terra e o piso da casa. */
function chaoEm(x: number, y: number): number {
  if (x === 6 && y >= 4) return COR_TERRA;              // caminho até a porta
  if (x >= 4 && x <= 8 && y >= 1 && y <= 3) return COR_PEDRA; // base da casa
  return COR_GRAMA;
}

// ---------------------------------------------------------------------------
// Espeto
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const app = new Application();
  await app.init({ background: 0x101216, resizeTo: window, antialias: false });
  document.body.appendChild(app.canvas);

  const aviso = document.getElementById('aviso');

  const walk = await texturaDe('/assets/classes-pixellab/knight/walk.png');
  const pose = await texturaDe('/assets/classes-pixellab/knight/pose.png');
  const casa = await texturaDe('/assets/buildings/casa-2-andares.png');
  const comodo = await texturaDe('/assets/buildings/comodo-quarto.png');

  if (!walk || !pose) {
    if (aviso) aviso.textContent =
      'Faltou a tira do Knight em /assets/classes-pixellab/knight/. Rode `npm run sprites:build`.';
    return;
  }

  // --- os dois painéis, lado a lado ---
  const iso = new Container();
  const top = new Container();
  iso.sortableChildren = true;
  top.sortableChildren = true;
  app.stage.addChild(iso, top);

  /** Projeção isométrica: losango 2:1. */
  const isoX = (x: number, y: number): number => (x - y) * (LADO / 2);
  const isoY = (x: number, y: number): number => (x + y) * (LADO / 4);

  // --- chão ---
  for (let y = 0; y < MAPA; y++) {
    for (let x = 0; x < MAPA; x++) {
      const cor = chaoEm(x, y);

      // Isométrico: losango desenhado a mão.
      const d = new Graphics();
      const cx = isoX(x, y);
      const cy = isoY(x, y);
      d.moveTo(cx, cy - LADO / 4)
        .lineTo(cx + LADO / 2, cy)
        .lineTo(cx, cy + LADO / 4)
        .lineTo(cx - LADO / 2, cy)
        .closePath()
        .fill({ color: cor })
        .stroke({ color: 0x000000, alpha: 0.18, width: 1 });
      // 🔴 zIndex isométrico é x+y, não y. Ver o cabeçalho.
      d.zIndex = x + y - 1000; // chão sempre atrás dos objetos
      iso.addChild(d);

      // Top-down: quadrado, como o jogo faz hoje.
      const q = new Graphics();
      q.rect(x * QUAD, y * QUAD, QUAD, QUAD)
        .fill({ color: cor })
        .stroke({ color: 0x000000, alpha: 0.18, width: 1 });
      q.zIndex = -1000;
      top.addChild(q);
    }
  }

  // --- a casa, nos dois painéis ---
  if (casa) {
    const cx0 = 6, cy0 = 2; // tile do pé da casa
    const si = new Sprite(casa);
    si.anchor.set(0.5, 1);
    si.scale.set((LADO * 4) / casa.width);
    si.x = isoX(cx0, cy0);
    si.y = isoY(cx0, cy0) + LADO / 4;
    si.zIndex = cx0 + cy0;
    iso.addChild(si);

    const st = new Sprite(casa);
    st.anchor.set(0.5, 1);
    st.scale.set((QUAD * 4) / casa.width);
    st.x = cx0 * QUAD + QUAD / 2;
    st.y = cy0 * QUAD + QUAD;
    st.zIndex = cy0;
    top.addChild(st);
  }

  // --- o cômodo, só no isométrico (é ele que motivou o espeto) ---
  if (comodo) {
    const rx = 10, ry = 8;
    const s = new Sprite(comodo);
    s.anchor.set(0.5, 1);
    s.scale.set((LADO * 4) / comodo.width);
    s.x = isoX(rx, ry);
    s.y = isoY(rx, ry) + LADO / 4;
    s.zIndex = rx + ry - 900; // como assoalho: atrás dos objetos
    iso.addChild(s);
  }

  // --- o herói, nos dois painéis, com a MESMA arte ---
  const heroIso = new Sprite(quadro(pose, 0, 0));
  const heroTop = new Sprite(quadro(pose, 0, 0));
  for (const h of [heroIso, heroTop]) {
    // A sola do desenho fica em y=60 dentro da célula de 64 (ver `heroes.ts`).
    h.anchor.set(31.5 / CELL, 60 / CELL);
    iso.addChild(h);
  }
  top.addChild(heroTop);

  let hx = 5, hy = 6;
  let dir: Dir = 'south';
  let passo = 0;
  let andando = false;

  function redesenha(): void {
    const linha = DIRS.indexOf(dir);
    const tex = andando ? quadro(walk!, linha, passo % 4) : quadro(pose!, linha, 0);
    heroIso.texture = tex;
    heroTop.texture = tex;

    heroIso.x = isoX(hx, hy);
    heroIso.y = isoY(hx, hy) + LADO / 4;
    heroIso.zIndex = hx + hy;

    heroTop.x = hx * QUAD + QUAD / 2;
    heroTop.y = hy * QUAD + QUAD;
    heroTop.zIndex = hy;
  }

  // --- teclado ---
  const passos: Record<string, [number, number, Dir]> = {
    ArrowUp: [0, -1, 'north'], ArrowDown: [0, 1, 'south'],
    ArrowLeft: [-1, 0, 'west'], ArrowRight: [1, 0, 'east'],
    w: [0, -1, 'north'], s: [0, 1, 'south'], a: [-1, 0, 'west'], d: [1, 0, 'east'],
  };
  window.addEventListener('keydown', (e) => {
    const p = passos[e.key];
    if (!p) return;
    e.preventDefault();
    const [dx, dy, nd] = p;
    hx = Math.max(0, Math.min(MAPA - 1, hx + dx));
    hy = Math.max(0, Math.min(MAPA - 1, hy + dy));
    dir = nd;
    andando = true;
    passo += 1;
    redesenha();
  });
  window.addEventListener('keyup', () => { andando = false; redesenha(); });

  // --- posiciona os painéis ---
  function acomoda(): void {
    const meio = app.screen.width / 2;
    iso.x = meio / 2;
    iso.y = 80;
    top.x = meio + 60;
    top.y = 80;
  }
  acomoda();
  window.addEventListener('resize', acomoda);

  redesenha();
  if (aviso) aviso.textContent = '';
}

void main();
