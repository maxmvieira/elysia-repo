/**
 * ESPETO 3D — O PERSONAGEM. Descartável, irmão do `espeto3d.ts`.
 *
 * 🔴 A PERGUNTA: qual é a diferença entre o personagem em 2D (billboard, como
 * no Ragnarok) e o personagem em 3D de verdade? Esta página põe os dois lado a
 * lado, no mesmo chão, sob a mesma câmera, andando no mesmo passo.
 *
 * 🔴 DE ONDE VEM O MODELO 3D, porque isso é o mais importante daqui.
 *
 * Não foi baixado nem modelado: ele é **derivado do próprio Knight 2D**, por
 * interseção de silhuetas (*visual hull*). A vista do **sul** diz quais (x,y)
 * do corpo são opacos; a vista do **leste** diz quais (z,y) são. Um voxel
 * (x,y,z) existe quando as DUAS concordam. O resultado é o mesmo cavaleiro, na
 * mesma paleta, em volume — sem gastar um minuto de artista e sem trazer
 * licença de terceiro para dentro de um repositório PÚBLICO.
 *
 * ⚠️ E ELE É APROXIMADO, DE PROPÓSITO — a limitação é a arte, não o método:
 *
 * 1. **O leste não é perfil, é três quartos.** Está escrito no `HANDOFF` desde
 *    10/08 ("leste e oeste saem em três quartos, não em perfil"). Interseção de
 *    silhuetas pressupõe vistas ortogonais; com três quartos, o volume sai
 *    torcido — mais gordo na diagonal do que deveria.
 * 2. **A arte é `high top-down`, não ortográfica.** Há perspectiva embutida em
 *    cada quadro, e o hull a interpreta como forma.
 * 3. **Duas vistas não veem concavidade.** O vão entre o braço e o tronco fica
 *    preenchido: é a assinatura clássica do hull, e nenhuma delas é bug.
 *
 * 🔴 Ou seja: isto mostra **como o personagem se COMPORTA em 3D** (gira liso,
 * recebe luz, tem profundidade de verdade), e não a qualidade que um modelo
 * feito à mão teria. Para julgar o comportamento serve; para julgar acabamento,
 * não.
 *
 * ⚠️ Não fala com o servidor, não importa `main.ts`, não usa PixiJS, não é
 * entrada do `vite build`. Apagar este arquivo e o HTML não deixa rastro.
 */

import * as THREE from 'three';

/** Lado da célula do pack PixelLab. `heroes.ts`. */
const CELL = 64;
/** Linha onde o conversor GARANTE a sola. `heroes.ts` / `pixellab2strip.mjs`. */
const FEET_Y = 60;
/** Centro horizontal medido do conteúdo. `heroes.ts`. */
const CENTER_X = 31.5;
/** Lado do tile do jogo, em px de arte. Um voxel = 1 px = 1/32 de tile. */
const TILE_PX = 32;
/** Retalho sólido de grama no `Ground.png`. `tileset.ts`. */
const GRAMA: [number, number] = [40, 160];

/** Quantos quadros do ciclo de passos viram volume. Cada um é um mesh. */
const MAX_QUADROS = 4;

/**
 * 🔴 ACHATAMENTO EM Z — e ele é uma CORREÇÃO, não um enfeite.
 *
 * Interseção de duas silhuetas devolve, em planta, um retângulo: 28 px de
 * largura (a silhueta do sul) por 26 de profundidade (a do leste). Uma pessoa
 * tem ~28 de largura por ~12 de profundidade. Sem isto o cavaleiro sai
 * **quadrado por cima** — um bloco — e o escudo, que é uma mancha larga na
 * vista de frente, é extrudado por toda a profundidade e vira uma pilha de
 * placas. Visto em tela a 45°: era exatamente isso que acontecia.
 *
 * ⚠️ O número é ARBITRÁRIO e não pode ser medido: **a arte não contém a
 * profundidade**. Duas vistas dizem "onde há corpo", nunca "quão fundo". Só um
 * modelo de verdade, ou uma terceira vista ortogonal, responderia.
 */
const ACHATA_Z = 0.42;
/** Alpha acima disto conta como corpo. Mesmo critério do `spritebox.ts`. */
const LIMIAR_ALPHA = 8;

// ---------------------------------------------------------------------------
// Leitura de arte
// ---------------------------------------------------------------------------

/** ⚠️ `onload`, nunca `img.decode()` — ver a nota em `miniworld.ts`. */
function carregaImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error(`falhou: ${src}`));
    img.src = src;
  });
}

function contexto(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('sem contexto 2D');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Uma vista do personagem: os pixels crus de um quadro da tira. */
interface Vista {
  dados: Uint8ClampedArray;
}

function vista(img: HTMLImageElement, sx: number, sy: number): Vista {
  const ctx = contexto(CELL, CELL);
  ctx.drawImage(img, sx, sy, CELL, CELL, 0, 0, CELL, CELL);
  return { dados: ctx.getImageData(0, 0, CELL, CELL).data };
}

function alpha(v: Vista, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= CELL || y >= CELL) return 0;
  return v.dados[(y * CELL + x) * 4 + 3] ?? 0;
}

function opaco(v: Vista, x: number, y: number): boolean {
  return alpha(v, x, y) > LIMIAR_ALPHA;
}

/** Cor sRGB normalizada (0..1) daquele pixel. */
function cor(v: Vista, x: number, y: number): [number, number, number] {
  const i = (y * CELL + x) * 4;
  return [
    (v.dados[i] ?? 0) / 255,
    (v.dados[i + 1] ?? 0) / 255,
    (v.dados[i + 2] ?? 0) / 255,
  ];
}

// ---------------------------------------------------------------------------
// O volume, por interseção de silhuetas
// ---------------------------------------------------------------------------

/**
 * 🔴 A vista do leste é ESPELHADA em z.
 *
 * Olhando de +x para a origem com o "para cima" em +y, a direita da tela é
 * **−z**. Então a coluna `u` da vista leste corresponde a `z = 63 − u`. Errar
 * isto não deforma o corpo — ele é quase simétrico — mas põe a espada atrás em
 * vez de na frente, e aí o personagem fica costurado ao contrário.
 */
function zDaColuna(u: number): number {
  return CELL - 1 - u;
}

/**
 * Constrói a malha de um quadro. Só as faces VISÍVEIS entram: face entre dois
 * voxels cheios não é desenhada, senão a geometria explode sem aparecer nada.
 */
function volumeDoQuadro(sul: Vista, leste: Vista): THREE.BufferGeometry {
  const N = CELL;
  const cheio = new Uint8Array(N * N * N);
  const em = (x: number, y: number, z: number): number => (y * N + z) * N + x;
  const dentro = (x: number, y: number, z: number): boolean =>
    x >= 0 && y >= 0 && z >= 0 && x < N && y < N && z < N && (cheio[em(x, y, z)] ?? 0) === 1;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!opaco(sul, x, y)) continue; // a silhueta do sul manda em (x,y)
      for (let u = 0; u < N; u++) {
        if (!opaco(leste, u, y)) continue; // e a do leste, em (z,y)
        cheio[em(x, y, zDaColuna(u))] = 1;
      }
    }
  }

  const pos: number[] = [];
  const cores: number[] = [];
  const normais: number[] = [];

  /** Um quadrado, em dois triângulos, com a cor e a normal da face. */
  function face(
    a: [number, number, number], b: [number, number, number],
    c: [number, number, number], d: [number, number, number],
    n: [number, number, number], rgb: [number, number, number],
  ): void {
    for (const v of [a, b, c, a, c, d]) {
      pos.push(v[0], v[1], v[2]);
      normais.push(n[0], n[1], n[2]);
      cores.push(rgb[0], rgb[1], rgb[2]);
    }
  }

  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (!dentro(x, y, z)) continue;

        /*
         * 🔴 A COR VEM DA VISTA QUE OLHA PARA AQUELA FACE.
         *
         * Face virada para o sul/norte recebe a cor da vista do sul; face
         * virada para leste/oeste, a cor da vista do leste. É o que faz o
         * escudo continuar azul de frente E de lado. Pintar tudo pela vista da
         * frente borraria as laterais com a cor errada.
         */
        const cSul = cor(sul, x, y);
        const cLeste = cor(leste, CELL - 1 - z, y);
        const cTopo: [number, number, number] = [
          (cSul[0] + cLeste[0]) / 2,
          (cSul[1] + cLeste[1]) / 2,
          (cSul[2] + cLeste[2]) / 2,
        ];

        // Coordenadas locais: 1 unidade = 1 px de arte. O mesh é escalado depois.
        const x0 = x - CENTER_X;
        const x1 = x0 + 1;
        const y0 = FEET_Y - y - 1; // a sola do quadro cai em Y = 0
        const y1 = y0 + 1;
        const z0 = z - CELL / 2;
        const z1 = z0 + 1;

        if (!dentro(x, y, z + 1))
          face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], cSul);
        if (!dentro(x, y, z - 1))
          face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], cSul);
        if (!dentro(x + 1, y, z))
          face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], cLeste);
        if (!dentro(x - 1, y, z))
          face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], cLeste);
        // y cresce para BAIXO no quadro, então `y-1` é o voxel de CIMA.
        if (!dentro(x, y - 1, z))
          face([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], cTopo);
        if (!dentro(x, y + 1, z))
          face([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], cTopo);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normais, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  return geo;
}

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x11161b);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.body.appendChild(renderer.domElement);

/*
 * 🔴 A luz é o segundo ponto da comparação, e é fácil deixar passar.
 *
 * O billboard usa `MeshBasicMaterial`: ele IGNORA luz, porque iluminar pixel
 * art tinge a paleta. O voxel usa `MeshLambertMaterial` e recebe luz de
 * verdade — é por isso que ele ganha lado claro e lado escuro conforme gira, e
 * o billboard não muda nunca. Um dos dois reage ao mundo; o outro é um adesivo.
 */
cena.add(new THREE.HemisphereLight(0xcfe2ff, 0x54603f, 1.15));
const sol = new THREE.DirectionalLight(0xfff2d0, 1.5);
sol.position.set(-0.7, 1.1, 0.6);
cena.add(sol);

const alvo = new THREE.Vector3(0, 0.9, 0);
let yaw = 0;
let pitch = THREE.MathUtils.degToRad(28);
let raio = 7.5;
let girandoSozinho = true;

function aplicaCamera(): void {
  const cp = Math.cos(pitch);
  camera.position.set(
    alvo.x + raio * Math.sin(yaw) * cp,
    alvo.y + raio * Math.sin(pitch),
    alvo.z + raio * Math.cos(yaw) * cp,
  );
  camera.lookAt(alvo);
}

// --- controles -------------------------------------------------------------

let arrastando = false;
let ultimoX = 0;
let ultimoY = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  arrastando = true;
  girandoSozinho = false; // pegou no mouse: para de girar sozinho
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
  pitch = THREE.MathUtils.clamp(
    pitch + (e.clientY - ultimoY) * 0.006,
    THREE.MathUtils.degToRad(-5),
    THREE.MathUtils.degToRad(85),
  );
  ultimoX = e.clientX;
  ultimoY = e.clientY;
});

function aproxima(f: number): void {
  raio = THREE.MathUtils.clamp(raio * f, 1.6, 40);
}
window.addEventListener('wheel', (e) => { e.preventDefault(); aproxima(e.deltaY > 0 ? 1.1 : 1 / 1.1); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === '=') aproxima(1 / 1.15);
  else if (e.key === '-' || e.key === '_') aproxima(1.15);
  else if (e.key === 'ArrowLeft') yaw += 0.08;
  else if (e.key === 'ArrowRight') yaw -= 0.08;
});

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

const aviso = document.getElementById('aviso') as HTMLDivElement;
const rotulo2d = document.getElementById('r-2d') as HTMLDivElement;
const rotulo3d = document.getElementById('r-3d') as HTMLDivElement;
const contagem = document.getElementById('contagem') as HTMLSpanElement;

/** Onde cada um fica. Distantes o bastante para não se taparem girando. */
const POS_2D = new THREE.Vector3(-1.3, 0, 0);
const POS_3D = new THREE.Vector3(1.3, 0, 0);

/** Ambos encaram o SUL (+z), sempre. Quem gira é a câmera. */
const FRENTE = 0;

let facesSprite: THREE.Texture[][] = [];
let materialSprite: THREE.MeshBasicMaterial | null = null;
let malhaSprite: THREE.Mesh | null = null;
const malhasVoxel: THREE.Mesh[] = [];

async function monta(): Promise<void> {
  // --- chão -----------------------------------------------------------------
  const ground = await carregaImagem('/assets/Ground.png');
  const ctxG = contexto(32, 32);
  ctxG.drawImage(ground, GRAMA[0], GRAMA[1], 32, 32, 0, 0, 32, 32);
  const texChao = new THREE.CanvasTexture(ctxG.canvas);
  texChao.magFilter = THREE.NearestFilter;
  texChao.minFilter = THREE.NearestFilter;
  texChao.generateMipmaps = false;
  texChao.colorSpace = THREE.SRGBColorSpace;
  texChao.wrapS = THREE.RepeatWrapping;
  texChao.wrapT = THREE.RepeatWrapping;
  texChao.repeat.set(24, 24);
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshLambertMaterial({ map: texChao }),
  );
  chao.rotation.x = -Math.PI / 2;
  cena.add(chao);

  // --- a tira do Knight -----------------------------------------------------
  const walk = await carregaImagem('/assets/classes-pixellab/knight/walk.png');
  const colunas = Math.min(MAX_QUADROS, Math.max(1, Math.round(walk.width / CELL)));

  // Linha 0 = sul, 1 = norte, 2 = leste, 3 = oeste — a ordem do conversor.
  facesSprite = [0, 1, 2, 3].map((linha) =>
    Array.from({ length: colunas }, (_, i) => {
      const ctx = contexto(CELL, CELL);
      ctx.drawImage(walk, i * CELL, linha * CELL, CELL, CELL, 0, 0, CELL, CELL);
      const t = new THREE.CanvasTexture(ctx.canvas);
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }),
  );

  // --- o billboard 2D -------------------------------------------------------
  const lado = CELL / TILE_PX; // 64 px de célula = 2 tiles
  const sobraPe = (CELL - FEET_Y) / TILE_PX; // 4 px vazios sob a sola
  const primeira = facesSprite[0]?.[0];
  if (!primeira) throw new Error('walk.png sem quadros');
  materialSprite = new THREE.MeshBasicMaterial({
    map: primeira,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  malhaSprite = new THREE.Mesh(new THREE.PlaneGeometry(lado, lado), materialSprite);
  malhaSprite.position.set(POS_2D.x, lado / 2 - sobraPe, POS_2D.z);
  cena.add(malhaSprite);

  // --- o volume 3D, um por quadro ------------------------------------------
  let faces = 0;
  const materialVoxel = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (let i = 0; i < colunas; i++) {
    const ctxS = contexto(CELL, CELL);
    ctxS.drawImage(walk, i * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
    const sul: Vista = { dados: ctxS.getImageData(0, 0, CELL, CELL).data };

    const ctxL = contexto(CELL, CELL);
    ctxL.drawImage(walk, i * CELL, 2 * CELL, CELL, CELL, 0, 0, CELL, CELL);
    const leste: Vista = { dados: ctxL.getImageData(0, 0, CELL, CELL).data };

    const geo = volumeDoQuadro(sul, leste);
    const contaPos = geo.getAttribute('position');
    faces += contaPos ? contaPos.count / 6 : 0;

    const m = new THREE.Mesh(geo, materialVoxel);
    // 1 px de arte = 1/32 de tile; z achatado porque a arte não tem profundidade.
    m.scale.set(1 / TILE_PX, 1 / TILE_PX, ACHATA_Z / TILE_PX);
    m.position.copy(POS_3D);
    m.visible = i === 0;
    cena.add(m);
    malhasVoxel.push(m);
  }
  contagem.textContent = `${colunas} quadros · ~${Math.round(faces / 1000)}k faces`;

  aviso.remove();
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

const projetado = new THREE.Vector3();

function posicionaRotulo(el: HTMLDivElement, onde: THREE.Vector3): void {
  projetado.set(onde.x, 2.1, onde.z).project(camera);
  el.style.left = `${(projetado.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-projetado.y * 0.5 + 0.5) * window.innerHeight}px`;
  el.style.display = projetado.z < 1 ? 'block' : 'none';
}

let quadro = 0;
let ultimoPasso = 0;

function laco(t: number): void {
  requestAnimationFrame(laco);
  if (girandoSozinho) yaw += 0.0055;
  aplicaCamera();

  if (t - ultimoPasso > 170) {
    quadro++;
    ultimoPasso = t;
  }

  // --- o de 2D: billboard + escolha da face entre as QUATRO que existem ------
  if (malhaSprite && materialSprite && facesSprite.length === 4) {
    malhaSprite.rotation.y = yaw;
    const rel = ((FRENTE - yaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const q = Math.round(rel / (Math.PI / 2)) % 4;
    const linha = [0, 2, 1, 3][q] ?? 0;
    const quadros = facesSprite[linha];
    const tex = quadros?.[quadro % (quadros.length || 1)];
    if (tex) {
      materialSprite.map = tex;
      materialSprite.needsUpdate = true;
    }
  }

  /*
   * --- o de 3D: NÃO ESCOLHE FACE NENHUMA -----------------------------------
   *
   * 🔴 É a diferença inteira, em duas linhas de código que não existem. Ele
   * encara o sul e fica; quem muda o que se vê é a câmera se mover em volta.
   * Não há quadrante, não há salto de 90°, não há face que falta — e é por
   * isso que a rotação livre da câmera deixa de ser um problema.
   */
  if (malhasVoxel.length > 0) {
    const i = quadro % malhasVoxel.length;
    for (let k = 0; k < malhasVoxel.length; k++) {
      const m = malhasVoxel[k];
      if (m) m.visible = k === i;
    }
  }

  posicionaRotulo(rotulo2d, POS_2D);
  posicionaRotulo(rotulo3d, POS_3D);
  renderer.render(cena, camera);
}

function redimensiona(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redimensiona);

document.getElementById('b-girar')?.addEventListener('click', () => {
  girandoSozinho = !girandoSozinho;
});
document.getElementById('b-frente')?.addEventListener('click', () => {
  yaw = 0;
  pitch = THREE.MathUtils.degToRad(28);
});
document.getElementById('b-lado')?.addEventListener('click', () => {
  // 45°: o ângulo em que o de 2D não tem face para mostrar.
  yaw = Math.PI / 4;
  pitch = THREE.MathUtils.degToRad(28);
});
document.getElementById('b-perto')?.addEventListener('click', () => aproxima(1 / 1.6));
document.getElementById('b-longe')?.addEventListener('click', () => aproxima(1.6));

redimensiona();
aplicaCamera();
requestAnimationFrame(laco);
monta().catch((e: unknown) => {
  aviso.textContent = `Falhou ao montar: ${String(e)}`;
});
