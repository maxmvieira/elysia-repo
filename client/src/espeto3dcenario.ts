/**
 * ESPETO 3D — CENÁRIO EM 3D, CÂMERA FIXA, PERSONAGEM EM 2D.
 *
 * 🔴 A DECISÃO DO DONO (13/08), e ela muda o custo do projeto inteiro:
 * personagem em 2D venceu; câmera **fixa como no Tibia**, sem girar e sem
 * zoom; e o cenário em 3D — terreno, vegetação e estruturas.
 *
 * 🔴 POR QUE ISSO DESTRAVA TUDO: o gargalo das 8 direções só existia porque a
 * câmera girava. O sprite era escolhido por `frente − yaw`, e com `yaw` variável
 * as 4 direções do projeto não bastavam. **Com a câmera travada, `yaw` é
 * constante** — cada personagem mostra sempre a face certa, e as 4 direções que
 * já existem continuam servindo. O PixelLab Characters deixa de ser
 * pré-requisito para o 3D (segue valendo por outros motivos).
 *
 * 🔴 E A NITIDEZ VOLTA — era o meu argumento mais forte contra o 3D, e a câmera
 * fixa o derruba. Ver `ZOOM_PX` e `deitaNaCamera()` mais abaixo.
 *
 * ⚠️ Descartável como os irmãos: não fala com o servidor, não importa
 * `main.ts`, não usa PixiJS, não é entrada do `vite build`.
 *
 * ⚠️ **A vegetação e as estruturas são geradas por CÓDIGO**, não são assets.
 * É de propósito: o repositório é PÚBLICO, e baixar pack de terceiro repete o
 * problema de licença que já está registrado no `HANDOFF` de 11/08. Modelo
 * procedural não tem dono. Ver "De onde vem a arte 3D" no relatório.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ---------------------------------------------------------------------------
// Medidas — as mesmas de `heroes.ts` e `tileset.ts`
// ---------------------------------------------------------------------------

const CELL = 64;
const FEET_Y = 60;
const TILE_PX = 32;
const GRAMA: [number, number] = [40, 160];

/** Lado do pedaço de mundo do espeto, em tiles. */
const TILES = 44;

/**
 * 🔴 O NÚMERO QUE DEVOLVE A NITIDEZ.
 *
 * Quantos pixels de TELA cada pixel de ARTE ocupa. Com projeção ortográfica a
 * escala não depende da distância — então basta escolher a caixa da câmera para
 * que a conta feche em número inteiro, e o sprite volta a ser desenhado
 * exatamente como foi criado. É o mesmo `ZOOM = 2` que entrou no jogo hoje de
 * manhã, agora dentro de uma cena 3D.
 *
 * ⚠️ Tem que ser INTEIRO. Fracionário traz de volta o serrilhado de 10/08.
 */
const ZOOM_PX = 2;

/** Inclinação da câmera fixa, em graus a partir do horizonte. */
let INCLINACAO = 52;

// ---------------------------------------------------------------------------
// Sorteio estável
// ---------------------------------------------------------------------------

/**
 * PRNG com semente. A cena precisa ser IDÊNTICA entre recarregamentos — comparar
 * duas coisas exige que só uma delas mude.
 */
function sorteador(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = sorteador(20260813);
const entre = (a: number, b: number): number => a + rnd() * (b - a);

// ---------------------------------------------------------------------------
// Arte 2D (só o personagem e o chão)
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

function texturaPixel(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Terreno
// ---------------------------------------------------------------------------

let relevoLigado = true;

/** Altura do terreno em (x,z), em tiles. */
function altura(x: number, z: number): number {
  if (!relevoLigado) return 0;
  return (
    Math.sin(x * 0.17) * Math.cos(z * 0.14) * 0.9 +
    Math.sin((x + z) * 0.07) * 0.7
  );
}

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x0e1216);
cena.fog = new THREE.Fog(0x0e1216, TILES * 0.9, TILES * 1.7);

/**
 * 🔴 ORTOGRÁFICA, e é o coração desta versão.
 *
 * Perspectiva encolhe o que está longe — dois personagens do mesmo tamanho
 * apareceriam com tamanhos diferentes, e nenhum deles em escala inteira. Com
 * ortográfica **todo mundo tem a mesma escala em qualquer canto da tela**, e a
 * escala pode ser cravada em `ZOOM_PX`. É também o que o Tibia faz: não há
 * ponto de fuga num tabuleiro visto de cima.
 */
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true });
/*
 * ⚠️ `setPixelRatio(1)`, de propósito. Em tela com `devicePixelRatio` 1,5 o
 * buffer sai 1,5× maior e o sprite volta a cair entre pixels — que é o defeito
 * que esta página inteira existe para evitar. Numa versão de verdade isto vira
 * "arredonda para o inteiro mais próximo", não "usa o valor do sistema".
 */
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/*
 * ⚠️ A cena estava ESCURA na primeira montagem, e escuro engana: reboco creme
 * lia como cinza-azulado e eu quase julguei a cor do modelo como errada. Luz de
 * conferência tem que ser generosa — julgar arte sob luz fraca é o equivalente
 * 3D de julgar sprite sem abrir a página de conferência.
 */
cena.add(new THREE.HemisphereLight(0xdcecff, 0x6d7a4e, 1.9));
const sol = new THREE.DirectionalLight(0xfff6e2, 2.4);
sol.position.set(-24, 40, 18);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
sol.shadow.camera.left = -TILES * 0.7;
sol.shadow.camera.right = TILES * 0.7;
sol.shadow.camera.top = TILES * 0.7;
sol.shadow.camera.bottom = -TILES * 0.7;
sol.shadow.camera.near = 1;
sol.shadow.camera.far = 120;
sol.shadow.bias = -0.0015;
cena.add(sol);
const centro = new THREE.Vector3(TILES / 2, 0, TILES / 2);
sol.target.position.copy(centro);
cena.add(sol.target);

/**
 * 🔴 A CÂMERA É FIXA. Não gira e não dá zoom — decisão do dono, e é a do Tibia.
 *
 * `yaw = 0` significa que a câmera está ao SUL olhando para o norte, que é
 * exatamente o enquadramento do jogo hoje: o sul do personagem é a face que
 * aparece. Só a INCLINAÇÃO é regulável nesta página, e ela é uma ferramenta de
 * DECISÃO — no jogo vira constante.
 */
function aplicaCamera(): void {
  const p = THREE.MathUtils.degToRad(INCLINACAO);
  const dist = TILES * 1.2;
  camera.position.set(
    centro.x,
    centro.y + dist * Math.sin(p),
    centro.z + dist * Math.cos(p),
  );
  camera.lookAt(centro);

  /*
   * A caixa ortográfica sai do tamanho da JANELA dividido por `ZOOM_PX` — não
   * de um número de tiles. Assim 1 px de arte = `ZOOM_PX` px de tela, sempre, e
   * redimensionar a janela mostra mais mundo em vez de esticar o que aparece.
   * É o mesmo comportamento do jogo 2D de hoje.
   */
  const meiaL = window.innerWidth / (2 * ZOOM_PX * TILE_PX);
  const meiaA = window.innerHeight / (2 * ZOOM_PX * TILE_PX);
  camera.left = -meiaL;
  camera.right = meiaL;
  camera.top = meiaA;
  camera.bottom = -meiaA;
  camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------------------
// Vegetação e estruturas — GERADAS POR CÓDIGO
// ---------------------------------------------------------------------------

/**
 * A paleta sai das cores que o jogo já usa (o verde do `Ground.png` é #63886C).
 * Low-poly com `flatShading`: cada face pega uma cor sólida, que é o que casa
 * com pixel art — sombreado suave brigaria com o sprite ao lado.
 */
const CORES = {
  tronco: [0x6b4a2f, 0x5a3d26, 0x7a5636],
  folha: [0x4a7a3a, 0x3e6b31, 0x5c8c44, 0x355c2b],
  pinho: [0x2f5c3a, 0x27503150, 0x376b44],
  pedra: [0x7c8288, 0x6a7076, 0x8b9198],
  cristal: [0x5fb6ed, 0xa46fe0, 0x6fe0a4],
  parede: [0xd9c9a8, 0xcbb994],
  madeira: [0x8a6039, 0x6f4c2c],
  telhado: [0x9c4436, 0x83382c],
} as const;

function corDe(lista: readonly number[]): number {
  return lista[Math.floor(rnd() * lista.length)] ?? 0xffffff;
}

/** Materiais compartilhados: um por cor, nunca um por objeto. */
const cacheMaterial = new Map<number, THREE.MeshLambertMaterial>();
function material(cor: number): THREE.MeshLambertMaterial {
  let m = cacheMaterial.get(cor);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: cor, flatShading: true });
    cacheMaterial.set(cor, m);
  }
  return m;
}

function peca(geo: THREE.BufferGeometry, cor: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, material(cor));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Deforma um sólido para tirar a cara de "primitiva do Three". */
function amassa(geo: THREE.BufferGeometry, quanto: number): THREE.BufferGeometry {
  const pos = geo.getAttribute('position');
  if (!pos) return geo;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + entre(-quanto, quanto),
      pos.getY(i) + entre(-quanto, quanto),
      pos.getZ(i) + entre(-quanto, quanto),
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Carvalho: tronco cônico e três massas de folha desalinhadas. */
function arvoreFrondosa(escala: number): THREE.Group {
  const g = new THREE.Group();
  const h = 3.4 * escala;
  const tronco = peca(new THREE.CylinderGeometry(0.13 * escala, 0.24 * escala, h * 0.5, 6), corDe(CORES.tronco));
  tronco.position.y = h * 0.25;
  g.add(tronco);
  const nFolhas = 3;
  for (let i = 0; i < nFolhas; i++) {
    const r = (0.85 - i * 0.16) * escala;
    const folha = peca(amassa(new THREE.IcosahedronGeometry(r, 0), r * 0.14), corDe(CORES.folha));
    folha.position.set(entre(-0.28, 0.28) * escala, h * (0.52 + i * 0.17), entre(-0.28, 0.28) * escala);
    g.add(folha);
  }
  return g;
}

/** Pinheiro: cones empilhados. Silhueta bem diferente, para o bosque variar. */
function arvoreConifera(escala: number): THREE.Group {
  const g = new THREE.Group();
  const h = 4.2 * escala;
  const tronco = peca(new THREE.CylinderGeometry(0.1 * escala, 0.18 * escala, h * 0.32, 6), corDe(CORES.tronco));
  tronco.position.y = h * 0.16;
  g.add(tronco);
  const cor = corDe(CORES.pinho);
  for (let i = 0; i < 3; i++) {
    const r = (0.86 - i * 0.2) * escala;
    const cone = peca(new THREE.ConeGeometry(r, h * 0.4, 7), cor);
    cone.position.y = h * (0.34 + i * 0.21);
    g.add(cone);
  }
  return g;
}

/** Arbusto: massas pequenas grudadas. */
function arbusto(escala: number): THREE.Group {
  const g = new THREE.Group();
  const cor = corDe(CORES.folha);
  for (let i = 0; i < 3; i++) {
    const r = entre(0.28, 0.44) * escala;
    const m = peca(amassa(new THREE.IcosahedronGeometry(r, 0), r * 0.2), cor);
    m.position.set(entre(-0.3, 0.3) * escala, r * 0.75, entre(-0.3, 0.3) * escala);
    g.add(m);
  }
  return g;
}

function pedra(escala: number): THREE.Mesh {
  const r = entre(0.3, 0.62) * escala;
  const m = peca(amassa(new THREE.IcosahedronGeometry(r, 0), r * 0.28), corDe(CORES.pedra));
  m.position.y = r * 0.55;
  m.rotation.set(entre(0, 3), entre(0, 3), entre(0, 3));
  return m;
}

/** Veio de cristal: octaedros esticados saindo do chão em leque. */
function cristal(): THREE.Group {
  const g = new THREE.Group();
  const cor = corDe(CORES.cristal);
  for (let i = 0; i < 4; i++) {
    const alt = entre(0.5, 1.15);
    const m = peca(new THREE.OctahedronGeometry(0.17, 0), cor);
    m.scale.set(1, alt / 0.34, 1);
    m.position.set(entre(-0.3, 0.3), alt * 0.5, entre(-0.3, 0.3));
    m.rotation.set(entre(-0.25, 0.25), entre(0, 3), entre(-0.25, 0.25));
    g.add(m);
  }
  return g;
}

/**
 * Casa: caixa + telhado de duas águas + porta e janelas rebaixadas.
 *
 * ⚠️ O telhado é um PRISMA feito à mão, não uma primitiva. `ConeGeometry` com 4
 * lados dá pirâmide, que serve para torre e não para casa de vila.
 */
function casa(larg: number, prof: number, escala: number): THREE.Group {
  const g = new THREE.Group();
  const hParede = 1.5 * escala;
  const w = larg * escala;
  const d = prof * escala;

  const parede = peca(new THREE.BoxGeometry(w, hParede, d), corDe(CORES.parede));
  parede.position.y = hParede / 2;
  g.add(parede);

  // Vigas nos cantos: é o que faz ler como casa de vila e não como caixa.
  const corViga = corDe(CORES.madeira);
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
    const viga = peca(new THREE.BoxGeometry(0.13 * escala, hParede, 0.13 * escala), corViga);
    viga.position.set((sx * w) / 2, hParede / 2, (sz * d) / 2);
    g.add(viga);
  }

  // Telhado: prisma triangular, cumeeira no eixo X.
  const hTelhado = 0.95 * escala;
  const beira = 0.22 * escala;
  const meiaL = w / 2 + beira;
  const meiaP = d / 2 + beira;
  const v = new Float32Array([
    // água da frente
    -meiaL, 0, meiaP, meiaL, 0, meiaP, meiaL, hTelhado, 0,
    -meiaL, 0, meiaP, meiaL, hTelhado, 0, -meiaL, hTelhado, 0,
    // água de trás
    meiaL, 0, -meiaP, -meiaL, 0, -meiaP, -meiaL, hTelhado, 0,
    meiaL, 0, -meiaP, -meiaL, hTelhado, 0, meiaL, hTelhado, 0,
    // empena esquerda e direita
    -meiaL, 0, -meiaP, -meiaL, 0, meiaP, -meiaL, hTelhado, 0,
    meiaL, 0, meiaP, meiaL, 0, -meiaP, meiaL, hTelhado, 0,
  ]);
  const geoTelhado = new THREE.BufferGeometry();
  geoTelhado.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geoTelhado.computeVertexNormals();
  const telhado = peca(geoTelhado, corDe(CORES.telhado));
  telhado.position.y = hParede;
  g.add(telhado);

  // Porta virada para o SUL (+z), que é o lado que a câmera fixa enxerga.
  const porta = peca(new THREE.BoxGeometry(0.42 * escala, 0.82 * escala, 0.08 * escala), corDe(CORES.madeira));
  porta.position.set(0, 0.41 * escala, d / 2 + 0.02 * escala);
  g.add(porta);
  for (const lado of [-1, 1]) {
    const janela = peca(new THREE.BoxGeometry(0.3 * escala, 0.3 * escala, 0.07 * escala), 0x3b4a52);
    janela.position.set(lado * 0.42 * w, hParede * 0.62, d / 2 + 0.02 * escala);
    g.add(janela);
  }
  return g;
}

/** Trecho de cerca: dois mourões e duas travessas. */
function cerca(comprimento: number): THREE.Group {
  const g = new THREE.Group();
  const cor = corDe(CORES.madeira);
  for (const t of [-0.5, 0.5]) {
    const mourao = peca(new THREE.BoxGeometry(0.12, 0.95, 0.12), cor);
    mourao.position.set(t * comprimento, 0.47, 0);
    g.add(mourao);
  }
  for (const y of [0.35, 0.7]) {
    const trave = peca(new THREE.BoxGeometry(comprimento, 0.08, 0.07), cor);
    trave.position.set(0, y, 0);
    g.add(trave);
  }
  return g;
}

/** Põe um objeto no terreno, com giro e altura corretos. */
function planta(obj: THREE.Object3D, x: number, z: number, giro = rnd() * Math.PI * 2): void {
  obj.position.set(x, altura(x, z), z);
  obj.rotation.y = giro;
  cena.add(obj);
}

// ---------------------------------------------------------------------------
// O personagem: 2D, e agora PIXEL-PERFEITO
// ---------------------------------------------------------------------------

interface Heroi {
  malha: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  /** Índice da linha da tira: 0 sul, 1 norte, 2 leste, 3 oeste. */
  linha: number;
}

const herois: Heroi[] = [];
let quadrosPorLinha: THREE.Texture[][] = [];

/**
 * 🔴 O SPRITE DEITA PARA FICAR DE FRENTE PARA A CÂMERA — e é isto que o
 * mantém nítido.
 *
 * Billboard só no eixo Y (o do espeto anterior) deixa o quadro EM PÉ, e uma
 * carta em pé vista de 52° aparece **achatada** em `cos(52°) ≈ 0,62`: o
 * personagem encolheria para dois terços da altura. Copiando a orientação da
 * câmera, o quadro fica perpendicular ao olhar e é desenhado no tamanho exato —
 * com ortográfica e `ZOOM_PX` inteiro, 1 px de arte = 2 px de tela, cravado.
 *
 * ⚠️ O preço é que o sprite fica LEVEMENTE deitado sobre o chão em vez de
 * cravado nele. É o que o Ragnarok faz, e o que o Tibia não precisa fazer
 * porque olha de 90°. Numa versão de verdade a sombra no chão é o que amarra o
 * personagem ao tile — por isso ela está aqui.
 */
function deitaNaCamera(m: THREE.Object3D): void {
  m.quaternion.copy(camera.quaternion);
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

const aviso = document.getElementById('aviso') as HTMLDivElement;
const contagem = document.getElementById('contagem') as HTMLSpanElement;

async function monta(): Promise<void> {
  // --- terreno --------------------------------------------------------------
  const ground = await carregaImagem('/assets/Ground.png');
  const ctxG = contexto(32, 32);
  ctxG.drawImage(ground, GRAMA[0], GRAMA[1], 32, 32, 0, 0, 32, 32);
  const texChao = texturaPixel(ctxG.canvas);
  texChao.wrapS = THREE.RepeatWrapping;
  texChao.wrapT = THREE.RepeatWrapping;
  texChao.repeat.set(TILES, TILES);

  const geoChao = new THREE.PlaneGeometry(TILES, TILES, TILES, TILES);
  geoChao.rotateX(-Math.PI / 2);
  geoChao.translate(TILES / 2, 0, TILES / 2);
  const posChao = geoChao.getAttribute('position');
  if (!posChao) throw new Error('PlaneGeometry sem posição');
  for (let i = 0; i < posChao.count; i++) {
    posChao.setY(i, altura(posChao.getX(i), posChao.getZ(i)));
  }
  posChao.needsUpdate = true;
  geoChao.computeVertexNormals();
  const chao = new THREE.Mesh(geoChao, new THREE.MeshLambertMaterial({ map: texChao }));
  chao.receiveShadow = true;
  cena.add(chao);

  // --- o vilarejo, e um bosque em volta -------------------------------------
  let objetos = 0;
  aviso.textContent = 'carregando a casa modelada…';

  /*
   * 🔴 A CASA MODELADA NO BLENDER, ao lado das procedurais — é a comparação
   * que esta versão da página existe para mostrar.
   *
   * Ela vem de `tools/blender/modelos/casa_enxaimel.py` por
   * `npm run models:build`. A origem já está na BASE e centrada em x/y (é o que
   * `assenta()` garante no `comum.py`), então posicionar é só `set(x, altura, z)`
   * — sem correção de âncora, que é justamente o bug que a convenção previne.
   */
  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/models3d/casa_enxaimel.glb');
    const modelo = gltf.scene;
    modelo.traverse((o) => {
      const malha = o as THREE.Mesh;
      if (!malha.isMesh) return;
      malha.castShadow = true;
      malha.receiveShadow = true;
      /*
       * 🔴 TROCA DE MATERIAL, e ela é uma CORREÇÃO — não gosto pessoal.
       *
       * O `GLTFLoader` cria `MeshStandardMaterial` (PBR), e todo o resto desta
       * cena é `MeshLambertMaterial`. Sob as MESMAS luzes os dois dão brilhos
       * diferentes — o PBR divide a energia e sai bem mais escuro. Na primeira
       * carga a casa modelada apareceu quase preta ao lado das procedurais, e
       * eu quase li isso como "o modelo ficou ruim".
       *
       * ⚠️ A lição para a versão de verdade: **um modelo de material só na
       * cena inteira.** Misturar é comparar coisas sob regras diferentes.
       */
      const antigo = malha.material;
      const lista = Array.isArray(antigo) ? antigo : [antigo];
      const novos = lista.map((m) => {
        const base = m as THREE.MeshStandardMaterial;
        return new THREE.MeshLambertMaterial({
          color: base.color ?? new THREE.Color(0xffffff),
          map: base.map ?? null,
          flatShading: true,
        });
      });
      malha.material = Array.isArray(antigo) ? novos : (novos[0] as THREE.Material);
    });
    const mx = TILES / 2 - 1;
    const mz = TILES / 2 - 4;
    modelo.position.set(mx, altura(mx, mz), mz);
    cena.add(modelo);
    objetos++;
  } catch (e) {
    // Sem o `.glb` a página continua funcionando com as casas procedurais —
    // rode `npm run models:build`. Falhar aqui não pode derrubar a cena.
    console.warn('[espeto] casa_enxaimel.glb ausente; só as procedurais.', e);
  }

  // Praça: quatro casas em volta de um miolo livre, portas para o sul.
  const praca: Array<[number, number, number, number]> = [
    [TILES / 2 - 6, TILES / 2 - 5, 3.2, 2.6],
    [TILES / 2 + 5, TILES / 2 - 6, 2.8, 2.4],
    [TILES / 2 + 7, TILES / 2 + 3, 3.6, 2.8],
    [TILES / 2 - 8, TILES / 2 + 4, 2.6, 2.2],
  ];
  for (const [x, z, w, d] of praca) {
    planta(casa(w, d, 1), x, z, entre(-0.16, 0.16));
    objetos++;
  }

  // Cerca marcando um quintal.
  for (let i = 0; i < 5; i++) {
    planta(cerca(1.6), TILES / 2 - 11 + i * 1.6, TILES / 2 + 8, 0);
    objetos++;
  }

  // Bosque: fora de um raio livre em volta da praça.
  for (let i = 0; i < 120; i++) {
    const x = entre(1.5, TILES - 1.5);
    const z = entre(1.5, TILES - 1.5);
    const dCentro = Math.hypot(x - TILES / 2, z - TILES / 2);
    if (dCentro < 11) continue; // a praça fica limpa
    const s = rnd();
    if (s < 0.42) planta(arvoreFrondosa(entre(0.8, 1.35)), x, z);
    else if (s < 0.68) planta(arvoreConifera(entre(0.75, 1.2)), x, z);
    else if (s < 0.86) planta(arbusto(entre(0.8, 1.3)), x, z);
    else planta(pedra(entre(0.8, 1.4)), x, z);
    objetos++;
  }

  // Veios de cristal, longe da praça — como no jogo, recurso não nasce na vila.
  for (let i = 0; i < 7; i++) {
    const x = entre(2, TILES - 2);
    const z = entre(2, TILES - 2);
    if (Math.hypot(x - TILES / 2, z - TILES / 2) < 13) continue;
    planta(cristal(), x, z);
    objetos++;
  }

  // --- os heróis ------------------------------------------------------------
  const walk = await carregaImagem('/assets/classes-pixellab/knight/walk.png');
  const colunas = Math.max(1, Math.round(walk.width / CELL));
  quadrosPorLinha = [0, 1, 2, 3].map((linha) =>
    Array.from({ length: colunas }, (_, i) => {
      const ctx = contexto(CELL, CELL);
      ctx.drawImage(walk, i * CELL, linha * CELL, CELL, CELL, 0, 0, CELL, CELL);
      return texturaPixel(ctx.canvas);
    }),
  );

  const lado = CELL / TILE_PX;
  const sobraPe = (CELL - FEET_Y) / TILE_PX;
  const primeira = quadrosPorLinha[0]?.[0];
  if (!primeira) throw new Error('walk.png sem quadros');

  const texSombra = (() => {
    const ctx = contexto(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.8)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(ctx.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  // Quatro heróis, um por direção. Com a câmera fixa, cada um mostra para
  // sempre a face certa — é o ponto que esta página prova.
  const postos: Array<[number, number, number]> = [
    [TILES / 2 - 2, TILES / 2 + 1, 0],
    [TILES / 2 + 1, TILES / 2 + 1, 1],
    [TILES / 2 + 3, TILES / 2 - 1, 2],
    [TILES / 2 - 4, TILES / 2 - 1, 3],
  ];
  for (const [x, z, linha] of postos) {
    const mat = new THREE.MeshBasicMaterial({ map: primeira, alphaTest: 0.5, side: THREE.DoubleSide });
    const malha = new THREE.Mesh(new THREE.PlaneGeometry(lado, lado), mat);
    // O pé do quadro encosta no chão: sobe metade da carta ao longo do "para
    // cima" DA CÂMERA, porque a carta está deitada como ela.
    const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const pe = new THREE.Vector3(x, altura(x, z), z);
    malha.position.copy(pe).addScaledVector(cima, lado / 2 - sobraPe);
    deitaNaCamera(malha);
    cena.add(malha);
    herois.push({ malha, material: mat, linha });

    const s = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 18),
      new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false, opacity: 0.6 }),
    );
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, altura(x, z) + 0.04, z);
    cena.add(s);
  }

  contagem.textContent = `${objetos} objetos 3D gerados por código · 1 px de arte = ${ZOOM_PX} px de tela`;
  aviso.remove();
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

let quadro = 0;
let ultimoPasso = 0;
let andando = true;

function laco(t: number): void {
  requestAnimationFrame(laco);

  if (andando && t - ultimoPasso > 170) {
    quadro++;
    ultimoPasso = t;
  }

  /*
   * 🔴 REPARE NO QUE NÃO ESTÁ AQUI: não há escolha de face.
   *
   * No espeto anterior esta linha calculava `frente − yaw` e caía num de quatro
   * quadrantes. Com a câmera fixa, a linha da tira é **constante por
   * personagem** — a mesma coisa que o jogo 2D já faz hoje. As 4 direções
   * bastam, e o motor não precisa saber que existe 3D em volta.
   */
  for (const h of herois) {
    const quadros = quadrosPorLinha[h.linha];
    if (!quadros || quadros.length === 0) continue;
    const tex = quadros[quadro % quadros.length];
    if (tex && h.material.map !== tex) {
      h.material.map = tex;
      h.material.needsUpdate = true;
    }
  }

  renderer.render(cena, camera);
}

function redimensiona(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  aplicaCamera();
  for (const h of herois) deitaNaCamera(h.malha);
}
window.addEventListener('resize', redimensiona);

// --- controles: ferramentas de DECISÃO, não recursos do jogo ----------------

function botao(id: string, fn: () => void): void {
  document.getElementById(id)?.addEventListener('click', fn);
}
function reinclina(graus: number): void {
  INCLINACAO = graus;
  aplicaCamera();
  // As cartas dos heróis acompanham a câmera nova.
  const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const lado = CELL / TILE_PX;
  const sobraPe = (CELL - FEET_Y) / TILE_PX;
  for (const h of herois) {
    const p = h.malha.position;
    // Volta ao pé e sobe de novo pela nova vertical de tela.
    const pe = new THREE.Vector3(p.x, altura(p.x, p.z), p.z);
    h.malha.position.copy(pe).addScaledVector(cima, lado / 2 - sobraPe);
    deitaNaCamera(h.malha);
  }
}
botao('b-52', () => reinclina(52));
botao('b-65', () => reinclina(65));
botao('b-90', () => reinclina(89.5));
botao('b-andar', () => { andando = !andando; });
botao('b-relevo', () => { relevoLigado = !relevoLigado; location.reload(); });

redimensiona();
requestAnimationFrame(laco);
monta().catch((e: unknown) => {
  aviso.textContent = `Falhou ao montar: ${String(e)}`;
});
