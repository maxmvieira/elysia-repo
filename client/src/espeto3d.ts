/**
 * ESPETO 3D — descartável, e é para ser apagado.
 *
 * 🔴 O QUE ESTE ARQUIVO É, E O QUE ELE NÃO É.
 *
 * É a resposta à pergunta de 13/08: "dá para modelar o mundo em 3D e manter
 * personagens, NPCs, monstros, magias e efeitos em 2D?" — a arquitetura do
 * Ragnarok. A resposta técnica é sim, e este arquivo existe para responder a
 * ÚNICA pergunta que conversa nenhuma responde: **fica melhor do que o que
 * temos?**
 *
 * ⚠️ Ele NÃO está ligado em nada. Não fala com o servidor, não importa
 * `main.ts`, não usa PixiJS e não é entrada do `vite build`. Lê os MESMOS
 * arquivos de arte que o jogo lê, e só. Apagar este arquivo e o
 * `espeto-3d.html` devolve o projeto ao estado anterior — o `three` está em
 * `devDependencies` de propósito, então ele nunca entra no bundle do jogo.
 *
 * 🔴 O QUE OLHAR (é o que decide, e está escrito na tela também):
 *
 * 1. **A nitidez.** Todo o acerto de 10–13/08 (escala 1,0×, zoom inteiro,
 *    `nearest`, a câmera em pixel inteiro) existe porque o desenho é 2D
 *    alinhado ao eixo e um pixel da arte cai num pixel da tela. Aqui o sprite é
 *    um quad em perspectiva: gire e aproxime, e veja o que acontece com a
 *    borda do elmo. Não dá para consertar com parâmetro — é o acordo do 3D.
 * 2. **As 4 direções quebrando.** Os quatro cavaleiros olham para os quatro
 *    lados do MUNDO. Gire a câmera: em 45° cada um está entre duas faces, e o
 *    sprite da face certa não existe. É o gargalo das 8 direções, à vista.
 * 3. **O que o 3D compra:** o relevo. Ligue e desligue o relevo — aquilo o
 *    motor 2D não faz de jeito nenhum, nem com truque.
 *
 * As medidas de arte vêm de `heroes.ts` e `tileset.ts` e são as mesmas de lá.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Medidas — copiadas de `heroes.ts` e `tileset.ts`. Se lá mudar, aqui mente.
// ---------------------------------------------------------------------------

/** Lado da célula do pack PixelLab. `heroes.ts`. */
const CELL = 64;
/** Linha onde o conversor GARANTE a sola. `heroes.ts` / `pixellab2strip.mjs`. */
const FEET_Y = 60;
/** Lado do tile lógico do jogo, em px de arte. `shared/constants.ts`. */
const TILE_PX = 32;
/** Retalho sólido de grama dentro do `Ground.png`. `tileset.ts`. */
const GRAMA: [number, number] = [40, 160];
const GROUND_PATCH = 32;

/**
 * 1 unidade do mundo 3D = 1 tile do jogo. Assim toda medida de arte vira
 * "quantos tiles", que é a linguagem do baseline aprovado em 05/08.
 */
const TILES = 40; // lado do pedaço de mundo do espeto

/** Baseline visual APROVADO em 05/08 — largura de copa, em tiles. */
const COPA = { grande: 4.2, pequena: 2.8, arbusto: 1.2 };

// ---------------------------------------------------------------------------
// Carga de imagem e recorte — o caminho do canvas, NUNCA `Assets.load`
// ---------------------------------------------------------------------------

/**
 * ⚠️ `onload`, nunca `img.decode()`: em aba oculta o Chrome adia a
 * decodificação e a promessa não resolve nunca. É a mesma nota de
 * `miniworld.ts`, e ela já travou o jogo numa tela preta.
 */
function carregaImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error(`falhou: ${src}`));
    img.src = src;
  });
}

function canvasDe(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('sem contexto 2D');
  ctx.imageSmoothingEnabled = false; // pixel art: recorte duro
  return [c, ctx];
}

/** Recorta um retângulo da imagem para um canvas próprio. */
function recorta(img: HTMLImageElement, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = canvasDe(w, h);
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  return c;
}

/**
 * Caixa de ALPHA, não a moldura do PNG.
 *
 * 🔴 É a lição de `spritebox.ts`, e ela custou dois bugs em tela: a árvore
 * boiava acima da própria sombra e tudo saía com metade do tamanho pedido,
 * porque os packs deixam sobra transparente DIFERENTE em cada arquivo.
 */
function caixaAlpha(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const [, ctx] = canvasDe(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if ((d[(y * img.width + x) * 4 + 3] ?? 0) > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: img.width, h: img.height };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Canvas -> textura de pixel art. Sem mipmap, sem filtro, sem surpresa. */
function textura(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Relevo — o que o 2D não faz
// ---------------------------------------------------------------------------

let relevoLigado = true;

/**
 * Altura do terreno em (x,z), em tiles. Duas ondas defasadas: não é mapa de
 * verdade, é só relevo suficiente para o olho julgar se vale a pena.
 */
function altura(x: number, z: number): number {
  if (!relevoLigado) return 0;
  return (
    Math.sin(x * 0.22) * Math.cos(z * 0.19) * 1.15 +
    Math.sin((x + z) * 0.09) * 0.85
  );
}

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x11161b);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.body.appendChild(renderer.domElement);

/*
 * 🔴 Luz SÓ no chão. Os sprites usam `MeshBasicMaterial`, que ignora luz de
 * propósito: iluminar pixel art tinge a paleta, e a paleta é a arte. No
 * Ragnarok é a mesma divisão — o terreno tem lightmap, o personagem não.
 */
cena.add(new THREE.HemisphereLight(0xbfd8ff, 0x4a5a3a, 1.35));
const sol = new THREE.DirectionalLight(0xfff2d0, 1.15);
sol.position.set(-0.6, 1, 0.45);
cena.add(sol);

// --- Câmera em órbita (a câmera do Ragnarok: gira, aproxima, afasta) --------

const alvo = new THREE.Vector3(TILES / 2, 0, TILES / 2);
/** Azimute, em radianos. 0 = a câmera está ao SUL, que é a vista do jogo. */
let yaw = 0;
/** Elevação. O jogo 2D é ~90° (de cima); o Ragnarok fica perto de 40°. */
let pitch = THREE.MathUtils.degToRad(42);
let raio = 26;
let girandoSozinho = false;

function aplicaCamera(): void {
  const cp = Math.cos(pitch);
  camera.position.set(
    alvo.x + raio * Math.sin(yaw) * cp,
    alvo.y + raio * Math.sin(pitch),
    alvo.z + raio * Math.cos(yaw) * cp,
  );
  camera.lookAt(alvo);
}

let arrastando = false;
let ultimoX = 0;
let ultimoY = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  arrastando = true;
  ultimoX = e.clientX;
  ultimoY = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointerup', (e) => {
  arrastando = false;
  renderer.domElement.releasePointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!arrastando) return;
  yaw -= (e.clientX - ultimoX) * 0.008;
  // ⚠️ O pitch é travado: abaixo de ~12° a câmera entra no chão e o billboard
  // aparece como uma folha de papel de pé; acima de 89° o `lookAt` degenera.
  pitch = THREE.MathUtils.clamp(
    pitch + (e.clientY - ultimoY) * 0.006,
    THREE.MathUtils.degToRad(12),
    THREE.MathUtils.degToRad(89),
  );
  ultimoX = e.clientX;
  ultimoY = e.clientY;
});
function aproxima(fator: number): void {
  raio = THREE.MathUtils.clamp(raio * fator, 3, 90);
}

// ⚠️ A roda vai na JANELA, não no canvas: com o painel de texto por cima, a
// roda sobre ele não chegaria no canvas e o zoom pareceria quebrado.
window.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    aproxima(e.deltaY > 0 ? 1.1 : 1 / 1.1);
  },
  { passive: false },
);

// Teclado como reserva: nem todo trackpad manda `wheel` do jeito esperado.
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === '=') aproxima(1 / 1.15);
  else if (e.key === '-' || e.key === '_') aproxima(1.15);
  else if (e.key === 'ArrowLeft') yaw += 0.1;
  else if (e.key === 'ArrowRight') yaw -= 0.1;
  else if (e.key === 'ArrowUp') pitch = Math.min(pitch + 0.05, THREE.MathUtils.degToRad(89));
  else if (e.key === 'ArrowDown') pitch = Math.max(pitch - 0.05, THREE.MathUtils.degToRad(12));
});

// ---------------------------------------------------------------------------
// Chão
// ---------------------------------------------------------------------------

let malhaChao: THREE.Mesh | null = null;

function montaChao(tex: THREE.Texture): void {
  if (malhaChao) {
    cena.remove(malhaChao);
    malhaChao.geometry.dispose();
  }
  // Um vértice por tile: o relevo acompanha a grade lógica do jogo.
  const geo = new THREE.PlaneGeometry(TILES, TILES, TILES, TILES);
  geo.rotateX(-Math.PI / 2);
  geo.translate(TILES / 2, 0, TILES / 2);
  const pos = geo.getAttribute('position');
  if (!pos) throw new Error('PlaneGeometry sem atributo de posição');
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, altura(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  malhaChao = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
  cena.add(malhaChao);
}

// ---------------------------------------------------------------------------
// Billboards — a metade 2D da arquitetura
// ---------------------------------------------------------------------------

/**
 * 🔴 Billboard em torno do EIXO Y, não de frente para a câmera.
 *
 * `THREE.Sprite` gira nos três eixos e faz a árvore deitar quando a câmera
 * baixa. Girando só em Y o desenho fica sempre em pé sobre o terreno, que é o
 * que o Ragnarok faz com personagem e o que o motor 2D já faz hoje com o
 * deslocamento 2.5D dos objetos altos.
 */
interface Billboard {
  malha: THREE.Mesh;
  /** Direção que ele encara no MUNDO, em radianos. `null` = objeto sem frente. */
  frente: number | null;
  /** Quadros por direção, para trocar a textura conforme a câmera gira. */
  faces?: THREE.Texture[][];
  material: THREE.MeshBasicMaterial;
}

const billboards: Billboard[] = [];

function novoBillboard(
  tex: THREE.Texture,
  larguraTiles: number,
  alturaTiles: number,
  x: number,
  z: number,
  frente: number | null,
  peDentroDoQuadro = 0,
): Billboard {
  /*
   * 🔴 `alphaTest` em vez de `transparent`.
   *
   * Quad transparente não escreve no buffer de profundidade, e aí a ordem de
   * desenho decide quem tapa quem — com dezenas de árvores isso vira o "flicker"
   * clássico. Com `alphaTest` o pixel ou existe ou não existe, o buffer de
   * profundidade funciona, e o recorte de pixel art fica exato. É o caminho
   * certo para arte sem antialiasing na borda.
   */
  const material = new THREE.MeshBasicMaterial({
    map: tex,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(larguraTiles, alturaTiles), material);
  // Sobe o quad meia altura para o rodapé encostar no chão, e desconta o que
  // sobra abaixo da sola dentro do quadro (o pack tem 4 px vazios sob os pés).
  malha.position.set(x, altura(x, z) + alturaTiles / 2 - peDentroDoQuadro, z);
  cena.add(malha);
  const bb: Billboard = { malha, frente, material };
  billboards.push(bb);
  return bb;
}

/** Sombra chapada no chão — barata, e é o que assenta o billboard no terreno. */
function sombra(x: number, z: number, r: number, tex: THREE.Texture): void {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 20),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, altura(x, z) + 0.06, z);
  cena.add(m);
}

function texturaSombra(): THREE.CanvasTexture {
  const [c, ctx] = canvasDe(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

const aviso = document.getElementById('aviso') as HTMLDivElement;

async function monta(): Promise<void> {
  // --- chão -----------------------------------------------------------------
  const ground = await carregaImagem('/assets/Ground.png');
  const grama = textura(recorta(ground, GRAMA[0], GRAMA[1], GROUND_PATCH, GROUND_PATCH));
  grama.wrapS = THREE.RepeatWrapping;
  grama.wrapT = THREE.RepeatWrapping;
  grama.repeat.set(TILES, TILES); // um retalho por tile, 1:1 como no jogo
  montaChao(grama);

  const texSombra = texturaSombra();

  // --- árvores --------------------------------------------------------------
  const arvores: Array<[string, number]> = [
    ['/assets/trees/craftpix/oak_big.png', COPA.grande],
    ['/assets/trees/craftpix/oak1.png', COPA.pequena],
    ['/assets/trees/craftpix/bush.png', COPA.arbusto],
  ];
  for (const [caminho, largura] of arvores) {
    const img = await carregaImagem(caminho);
    const cx = caixaAlpha(img); // 🔴 a caixa de alpha, não a moldura
    const tex = textura(recorta(img, cx.x, cx.y, cx.w, cx.h));
    const alt = largura * (cx.h / cx.w);
    // Espalha algumas de cada tipo, com semente fixa para a cena não mudar
    // entre recarregamentos — comparar duas coisas exige que a cena seja a mesma.
    for (let i = 0; i < 7; i++) {
      const x = 4 + ((i * 137 + largura * 31) % (TILES - 8));
      const z = 4 + ((i * 91 + largura * 57) % (TILES - 8));
      novoBillboard(tex, largura, alt, x, z, null);
      sombra(x, z, largura * 0.3, texSombra);
    }
  }

  // --- os quatro cavaleiros -------------------------------------------------
  /*
   * Eles olham para os quatro lados do MUNDO e nunca mudam de frente. Quem muda
   * é a câmera — e é assim que o problema das 4 direções fica visível: em 45°
   * cada um está exatamente entre duas faces que existem, e a face que deveria
   * aparecer não foi desenhada.
   */
  const walk = await carregaImagem('/assets/classes-pixellab/knight/walk.png');
  const colunas = Math.max(1, Math.round(walk.width / CELL));
  // Linha 0 = sul, 1 = norte, 2 = leste, 3 = oeste — a ordem que o conversor grava.
  const faces: THREE.Texture[][] = [0, 1, 2, 3].map((linha) =>
    Array.from({ length: colunas }, (_, i) =>
      textura(recorta(walk, i * CELL, linha * CELL, CELL, CELL)),
    ),
  );

  const ladoTiles = CELL / TILE_PX; // 64 px de célula = 2 tiles
  // Sob a sola ainda sobram (CELL - FEET_Y) px dentro do quadro; em tiles:
  const sobraPe = (CELL - FEET_Y) / TILE_PX;

  const parado = faces[0]?.[0];
  if (!parado) throw new Error('walk.png sem quadros — a tira está vazia?');

  const meio = TILES / 2;
  const postos: Array<[number, number, number]> = [
    [meio, meio + 3, 0], // olhando para o SUL
    [meio, meio - 3, Math.PI], // NORTE
    [meio + 3, meio, Math.PI / 2], // LESTE
    [meio - 3, meio, -Math.PI / 2], // OESTE
  ];
  for (const [x, z, frente] of postos) {
    const bb = novoBillboard(parado, ladoTiles, ladoTiles, x, z, frente, sobraPe);
    bb.faces = faces;
    sombra(x, z, 0.42, texSombra);
  }

  aviso.remove();
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

let quadro = 0;
let ultimoPasso = 0;

function laco(t: number): void {
  requestAnimationFrame(laco);
  if (girandoSozinho) yaw += 0.004;
  aplicaCamera();

  // Caminhada no lugar, para a cena ler como jogo e não como maquete parada.
  if (t - ultimoPasso > 160) {
    quadro++;
    ultimoPasso = t;
  }

  for (const bb of billboards) {
    bb.malha.rotation.y = yaw; // billboard em Y: sempre em pé, sempre de frente
    if (!bb.faces || bb.frente === null) continue;
    /*
     * 🔴 A ESCOLHA DA FACE — é o coração da arquitetura do Ragnarok.
     *
     * O que decide o quadro não é para onde o personagem olha, é para onde ele
     * olha VISTO DA CÂMERA: `frente − yaw`. Com 8 direções o erro máximo é
     * 22,5°; com as 4 que este projeto tem, é 45° — e a 45° o sprite mostra uma
     * face que está meio quadrante errada.
     */
    const rel = ((bb.frente - yaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const q = Math.round(rel / (Math.PI / 2)) % 4;
    const linha = [0, 2, 1, 3][q] ?? 0; // frente, leste, costas, oeste
    const quadros = bb.faces[linha];
    if (!quadros || quadros.length === 0) continue;
    const tex = quadros[quadro % quadros.length];
    if (!tex) continue;
    bb.material.map = tex;
    bb.material.needsUpdate = true;
  }

  renderer.render(cena, camera);
}

function redimensiona(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redimensiona);

// --- botões ----------------------------------------------------------------

function botao(id: string, fn: () => void): void {
  document.getElementById(id)?.addEventListener('click', fn);
}

botao('b-jogo', () => {
  // O ângulo do jogo de hoje: de cima, sem giro. É o lado A da comparação.
  yaw = 0;
  pitch = THREE.MathUtils.degToRad(89);
  raio = 15;
});
botao('b-ro', () => {
  // O ângulo do Ragnarok: alto, mas longe de 90°.
  yaw = 0;
  pitch = THREE.MathUtils.degToRad(42);
  raio = 26;
});
botao('b-girar', () => {
  girandoSozinho = !girandoSozinho;
});
botao('b-perto', () => aproxima(1 / 1.6));
botao('b-longe', () => aproxima(1.6));
botao('b-relevo', () => {
  relevoLigado = !relevoLigado;
  location.reload(); // o relevo entra na geometria e nas posições: recarrega
});

redimensiona();
aplicaCamera();
requestAnimationFrame(laco);
monta().catch((e: unknown) => {
  aviso.textContent = `Falhou ao montar: ${String(e)}`;
});
