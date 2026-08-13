/**
 * ESPETO HD-2D — a mistura que o dono descreveu em 13/08.
 *
 * 🔴 TRÊS JOGOS, TRÊS CAMADAS, E ELES NÃO BRIGAM:
 *
 * | Câmera fixa, grade de tiles, sem giro  | **Tibia**   |
 * | Cenário 3D com personagem 2D           | **Ragnarok**|
 * | Luz, paleta e clima — escuro, tocha    | **Diablo I**|
 * | Técnica (sprite em diorama, bloom, DOF)| HD-2D       |
 *
 * ⚠️ De Diablo vem o CLIMA, não a projeção: isométrico foi avaliado e
 * descartado em 04/08 e está registrado no `.gitignore`.
 *
 * 🔴 O QUE MUDOU EM RELAÇÃO AO ESPETO ANTERIOR, e é a lição da sessão:
 * o problema não era modelagem. As caixas continuam caixas — o que carrega o
 * visual é **textura de pixel, escuridão e luz de tocha**. Modelo mais
 * caprichado com cor chapada não chegaria aqui nunca.
 *
 * ⚠️ Nada disto é asset de terceiro: as texturas são desenhadas em canvas por
 * `texturas.ts`, com a paleta do jogo. Repositório público, licença de ninguém.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import {
  texGrama,
  texMadeira,
  texPedra,
  texReboco,
  texTelha,
  texTerra,
  textura,
} from './texturas.js';

// --- medidas, as mesmas de sempre ------------------------------------------
const CELL = 64;
const FEET_Y = 60;
const TILE_PX = 32;
/** 1 px de arte = N px de tela. Inteiro, senão volta o serrilhado de 10/08. */
const ZOOM_PX = 2;
/** Inclinação fixa. 52° mostra fachada; mais alto vira telhado. */
let INCLINACAO = 52;

// ---------------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------------

const cena = new THREE.Scene();
cena.background = new THREE.Color(0x080b10);
/*
 * 🔴 NÉVOA LINEAR E LONGE, e a primeira tentativa errou feio aqui.
 *
 * `FogExp2(0.021)` apagou a cena inteira: a câmera fica a 60 unidades do
 * centro, e a conta da névoa exponencial usa essa distância — `1 − e^−(0.021·60)²`
 * já dá **79% de névoa no meio do vilarejo**. A tela ficou preta com uma
 * fogueirinha no meio, e por um instante eu li isso como "a luz está fraca".
 *
 * ⚠️ Em câmera ortográfica afastada a névoa por distância é traiçoeira: a
 * distância que ela mede é da CÂMERA, não do que a cena parece ter de fundura.
 * O escuro do Diablo tem que vir da FALTA DE LUZ, não de névoa — senão some
 * também o que está iluminado.
 */
cena.fog = new THREE.Fog(0x080b10, 62, 105);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1); // pixel de arte tem que cair em pixel de tela
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
/*
 * ⚠️ SEM tone mapping filmico. O ACES comprime a sombra com força, e numa cena
 * já escura ele foi o terceiro fator a empurrar tudo para o preto — junto com a
 * textura escura e a luz baixa. Com a cena legível, dá para reavaliar; começar
 * por ele foi escurecer três vezes o mesmo pixel.
 */
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const centro = new THREE.Vector3(0, 0, 0);

function aplicaCamera(): void {
  const p = THREE.MathUtils.degToRad(INCLINACAO);
  const dist = 60;
  camera.position.set(centro.x, centro.y + dist * Math.sin(p), centro.z + dist * Math.cos(p));
  camera.lookAt(centro);
  const meiaL = window.innerWidth / (2 * ZOOM_PX * TILE_PX);
  const meiaA = window.innerHeight / (2 * ZOOM_PX * TILE_PX);
  camera.left = -meiaL;
  camera.right = meiaL;
  camera.top = meiaA;
  camera.bottom = -meiaA;
  camera.updateProjectionMatrix();
}

/*
 * 🔴 A LUZ É O VISUAL. Diablo I não é escuro por economia — é escuro para que a
 * tocha SIGNIFIQUE alguma coisa. Ambiente quase nulo, lua fria e fraca, e o
 * calor vindo só das chamas. Onde não há fogo, não há informação.
 */
cena.add(new THREE.HemisphereLight(0x3d4e78, 0x151a24, 1.75));
const lua = new THREE.DirectionalLight(0xa8c0ee, 1.7);
lua.position.set(-18, 26, 10);
lua.castShadow = true;
lua.shadow.mapSize.set(2048, 2048);
const s = lua.shadow.camera;
s.left = -26; s.right = 26; s.top = 26; s.bottom = -26; s.near = 1; s.far = 90;
lua.shadow.bias = -0.002;
cena.add(lua);

// ---------------------------------------------------------------------------
// Peças do cenário — caixas texturizadas, e é de propósito
// ---------------------------------------------------------------------------

const geoCaixa = new THREE.BoxGeometry(1, 1, 1);

function bloco(
  tam: [number, number, number],
  pos: [number, number, number],
  tex: THREE.Texture,
  repete: [number, number] = [1, 1],
): THREE.Mesh {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repete[0], repete[1]);
  const m = new THREE.Mesh(geoCaixa, new THREE.MeshLambertMaterial({ map: t }));
  m.scale.set(tam[0], tam[1], tam[2]);
  m.position.set(pos[0], pos[1] + tam[1] / 2, pos[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  cena.add(m);
  return m;
}

/** Telhado de duas águas: duas placas inclinadas. Caixa girada basta. */
function telhado(x: number, z: number, larg: number, prof: number, base: number, alt: number): void {
  const meia = prof / 2 + 0.3;
  const inclina = Math.atan2(alt, meia);
  const compr = Math.hypot(alt, meia);
  for (const lado of [-1, 1]) {
    const m = new THREE.Mesh(
      geoCaixa,
      new THREE.MeshLambertMaterial({ map: repetir(texTelha, larg * 1.6, compr * 1.6) }),
    );
    m.scale.set(larg + 0.6, 0.16, compr);
    m.position.set(x, base + alt / 2, z + (lado * meia) / 2);
    m.rotation.x = lado * -inclina;
    m.castShadow = true;
    m.receiveShadow = true;
    cena.add(m);
  }
  // cumeeira
  bloco([larg + 0.7, 0.16, 0.22], [x, base + alt - 0.08, z], texTelha, [larg, 1]);
}

function repetir(tex: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry)));
  return t;
}

/**
 * Casa: pedra embaixo, reboco em cima, vigas de madeira, telhado.
 *
 * ⚠️ Continua sendo caixa empilhada — e agora ela lê, porque tem textura e
 * porque a luz a esculpe. Era esse o ponto a provar.
 */
function casa(x: number, z: number, larg: number, prof: number): void {
  bloco([larg, 1.0, prof], [x, 0, z], texPedra, [larg, 1]);
  bloco([larg - 0.12, 1.9, prof - 0.12], [x, 1.0, z], texReboco, [larg, 2]);
  // vigas de canto
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      bloco([0.22, 1.9, 0.22], [x + (sx * larg) / 2, 1.0, z + (sz * prof) / 2], texMadeira, [1, 2]);
    }
  }
  // travessa no topo
  bloco([larg + 0.1, 0.2, prof + 0.1], [x, 2.75, z], texMadeira, [larg, 1]);
  telhado(x, z, larg, prof, 2.95, 1.15);
  // porta, virada para o sul (+z), que é o lado da câmera
  bloco([0.7, 1.35, 0.12], [x, 0, z + prof / 2 + 0.02], texMadeira, [1, 2]);
}

/** Árvore: tronco texturizado e copa em blocos. Silhueta antes de detalhe. */
function arvore(x: number, z: number, escala: number, rnd: () => number): void {
  const h = 2.6 * escala;
  bloco([0.42 * escala, h, 0.42 * escala], [x, 0, z], texMadeira, [1, 3]);
  const cor = new THREE.Color().setHSL(0.28 + rnd() * 0.05, 0.42, 0.17 + rnd() * 0.06);
  for (let i = 0; i < 3; i++) {
    const l = (1.9 - i * 0.45) * escala;
    const m = new THREE.Mesh(
      geoCaixa,
      new THREE.MeshLambertMaterial({ map: repetir(texGrama, 3, 3), color: cor }),
    );
    m.scale.set(l, 0.62 * escala, l);
    m.position.set(x + (rnd() - 0.5) * 0.3, h + i * 0.5 * escala, z + (rnd() - 0.5) * 0.3);
    m.rotation.y = rnd() * Math.PI;
    m.castShadow = true;
    m.receiveShadow = true;
    cena.add(m);
  }
}

/**
 * 🔴 A TOCHA — é ela que faz o clima de Diablo existir.
 *
 * Poste, chama com material emissivo (o bloom pega o emissivo, não a cor) e uma
 * `PointLight` quente com alcance curto. O alcance curto é o ponto: luz que
 * chega em tudo não cria escuridão, e sem escuridão a tocha não vale nada.
 */
function tocha(x: number, z: number): THREE.PointLight {
  bloco([0.16, 1.9, 0.16], [x, 0, z], texMadeira, [1, 3]);
  const chama = new THREE.Mesh(
    geoCaixa,
    new THREE.MeshBasicMaterial({ color: 0xffb95e }),
  );
  chama.scale.set(0.26, 0.34, 0.26);
  chama.position.set(x, 2.02, z);
  cena.add(chama);
  const luz = new THREE.PointLight(0xffa542, 46, 15, 1.5);
  luz.position.set(x, 2.1, z);
  cena.add(luz);
  return luz;
}

// ---------------------------------------------------------------------------
// Composição — feita à mão, e essa é a diferença
// ---------------------------------------------------------------------------

/**
 * ⚠️ O espeto anterior espalhava objeto por sorteio, e o dono viu: "não há
 * composição". Aqui existe um CAMINHO que atravessa a cena, casas encostadas
 * nele, uma fogueira como ponto focal e as árvores fechando as beiradas para o
 * olho não escapar da tela.
 */

function sorteador(semente: number): () => number {
  let v = semente >>> 0;
  return () => {
    v = (v + 0x6d2b79f5) >>> 0;
    let t = Math.imul(v ^ (v >>> 15), 1 | v);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = sorteador(813);

const luzes: THREE.PointLight[] = [];
let fogueira: THREE.PointLight | null = null;

function montaCenario(): void {
  // chão de grama
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshLambertMaterial({ map: repetir(texGrama, 70, 70) }),
  );
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);

  // o caminho de terra, atravessando na diagonal — dá para onde olhar
  const caminho = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 70),
    new THREE.MeshLambertMaterial({ map: repetir(texTerra, 6, 70), transparent: true }),
  );
  caminho.rotation.x = -Math.PI / 2;
  caminho.rotation.z = Math.PI / 2.7;
  caminho.position.y = 0.02;
  caminho.receiveShadow = true;
  cena.add(caminho);

  // casas encostadas no caminho
  casa(-7.5, -5.5, 5.2, 4.2);
  casa(6.5, -7.5, 4.4, 3.8);
  casa(9.5, 3.5, 5.8, 4.6);
  casa(-9.5, 6.5, 4.6, 4.0);

  // tochas nas portas
  const postesTocha: Array<[number, number]> = [
    [-4.6, -3.2], [4.0, -5.4], [6.3, 5.6], [-6.9, 8.4],
  ];
  for (const [tx, tz] of postesTocha) luzes.push(tocha(tx, tz));

  // fogueira no meio: o ponto focal
  bloco([1.5, 0.28, 1.5], [0, 0, 1.5], texPedra, [2, 2]);
  const fogo = new THREE.Mesh(geoCaixa, new THREE.MeshBasicMaterial({ color: 0xffc266 }));
  fogo.scale.set(0.5, 0.42, 0.5);
  fogo.position.set(0, 0.46, 1.5);
  cena.add(fogo);
  fogueira = new THREE.PointLight(0xffb055, 78, 24, 1.5);
  fogueira.position.set(0, 0.9, 1.5);
  fogueira.castShadow = true;
  fogueira.shadow.mapSize.set(1024, 1024);
  cena.add(fogueira);
  luzes.push(fogueira);

  // bosque fechando as beiradas
  for (let i = 0; i < 46; i++) {
    const x = (rnd() - 0.5) * 62;
    const z = (rnd() - 0.5) * 62;
    const d = Math.hypot(x, z);
    if (d < 13) continue; // o miolo fica livre
    arvore(x, z, 0.8 + rnd() * 0.6, rnd);
  }
}

// ---------------------------------------------------------------------------
// Heróis 2D
// ---------------------------------------------------------------------------

interface Heroi {
  malha: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  linha: number;
}
const herois: Heroi[] = [];
let quadrosPorLinha: THREE.Texture[][] = [];

function carregaImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error(`falhou: ${src}`));
    img.src = src;
  });
}

async function montaHerois(): Promise<void> {
  const walk = await carregaImagem('/assets/classes-pixellab/knight/walk.png');
  const colunas = Math.max(1, Math.round(walk.width / CELL));
  quadrosPorLinha = [0, 1, 2, 3].map((linha) =>
    Array.from({ length: colunas }, (_, i) => {
      const c = document.createElement('canvas');
      c.width = CELL;
      c.height = CELL;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('sem contexto');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(walk, i * CELL, linha * CELL, CELL, CELL, 0, 0, CELL, CELL);
      return textura(c);
    }),
  );

  const lado = CELL / TILE_PX;
  const sobraPe = (CELL - FEET_Y) / TILE_PX;
  const primeira = quadrosPorLinha[0]?.[0];
  if (!primeira) throw new Error('walk.png sem quadros');
  const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

  for (const [x, z, linha] of [
    [-1.8, 3.6, 0], [1.6, 3.9, 0], [-0.2, 5.2, 1],
  ] as Array<[number, number, number]>) {
    const mat = new THREE.MeshBasicMaterial({ map: primeira, alphaTest: 0.5, side: THREE.DoubleSide });
    const malha = new THREE.Mesh(new THREE.PlaneGeometry(lado, lado), mat);
    malha.position.set(x, 0, z).addScaledVector(cima, lado / 2 - sobraPe);
    malha.quaternion.copy(camera.quaternion);
    cena.add(malha);
    herois.push({ malha, mat, linha });
  }
}

// ---------------------------------------------------------------------------
// Pós-processamento — a outra metade do visual
// ---------------------------------------------------------------------------

/**
 * 🔴 Desfoque por POSIÇÃO NA TELA, não por profundidade.
 *
 * O `BokehPass` do Three lê o buffer de profundidade e pressupõe câmera em
 * perspectiva; aqui a câmera é ORTOGRÁFICA (é ela que dá o pixel cravado), e o
 * cálculo dele não vale. O efeito de miniatura do HD-2D é, na origem, um
 * *tilt-shift* fotográfico — nitidez numa faixa horizontal e borrão acima e
 * abaixo. Feito assim funciona com ortográfica e ainda é mais barato.
 *
 * Vem junto o ajuste de cor: contraste, dessaturação e vinheta — o trio que faz
 * o clima de Diablo, e que nenhum modelo entrega.
 */
/*
 * ⚠️ Os uniforms ficam num objeto PRÓPRIO, e não são lidos por
 * `passe.uniforms[...]`. O tipo de `ShaderPass.uniforms` é um dicionário
 * aberto, então cada leitura viria como "pode ser undefined" e o código
 * encheria de `!`. Guardando a referência aqui, os tipos ficam exatos.
 */
const uClima = {
  tDiffuse: { value: null as THREE.Texture | null },
  resolucao: { value: new THREE.Vector2(1, 1) },
  foco: { value: 0.5 },
  faixa: { value: 0.19 },
  forca: { value: 1.7 },
  vinheta: { value: 0.55 },
  satura: { value: 0.92 },
  contraste: { value: 1.05 },
};

const shaderClima = {
  uniforms: uClima,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolucao;
    uniform float foco, faixa, forca, vinheta, satura, contraste;
    varying vec2 vUv;

    void main() {
      // distância da faixa em foco -> quanto borrar
      float d = max(0.0, abs(vUv.y - foco) - faixa) / max(0.0001, 1.0 - faixa);
      float raio = smoothstep(0.0, 1.0, d) * forca;

      vec3 cor = vec3(0.0);
      float total = 0.0;
      for (int i = -3; i <= 3; i++) {
        for (int j = -3; j <= 3; j++) {
          vec2 desloc = vec2(float(i), float(j)) * raio / resolucao;
          float peso = 1.0 - length(vec2(float(i), float(j))) / 5.0;
          if (peso <= 0.0) continue;
          cor += texture2D(tDiffuse, vUv + desloc).rgb * peso;
          total += peso;
        }
      }
      cor /= total;

      // dessaturação e contraste — o clima de Diablo
      float cinza = dot(cor, vec3(0.299, 0.587, 0.114));
      cor = mix(vec3(cinza), cor, satura);
      cor = (cor - 0.5) * contraste + 0.5;

      // vinheta
      vec2 p = vUv - 0.5;
      cor *= 1.0 - vinheta * dot(p, p) * 0.9;

      gl_FragColor = vec4(max(cor, 0.0), 1.0);
    }
  `,
};

let composer: EffectComposer | null = null;
let passeClima: ShaderPass | null = null;
let passeBloom: UnrealBloomPass | null = null;
let posLigado = true;

function montaPos(): void {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(cena, camera));
  /*
   * 🔴 O LIMIAR É O PARÂMETRO QUE IMPORTA, e a primeira tentativa errou nele.
   *
   * Com limiar 0,22 e força 0,72 o bloom pegou **tudo que não era preto** —
   * inclusive os sprites dos heróis, que usam `MeshBasicMaterial` e portanto
   * são desenhados em brilho cheio. A fogueira virou um borrão branco com
   * riscos laranja atravessando a tela.
   *
   * O limiar alto é o que faz o bloom significar "isto emite luz": só a chama
   * passa, e o resto da cena fica intacto.
   */
  passeBloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.34, // força
    0.42, // raio
    0.78, // limiar: só o que é MUITO claro floresce
  );
  composer.addPass(passeBloom);
  passeClima = new ShaderPass(shaderClima);
  uClima.resolucao.value.set(window.innerWidth, window.innerHeight);
  composer.addPass(passeClima);
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

let quadro = 0;
let ultimo = 0;
const basesLuz: number[] = [];

function laco(t: number): void {
  requestAnimationFrame(laco);

  // Tremulação das chamas. É barata e faz a cena parar de parecer foto.
  for (let i = 0; i < luzes.length; i++) {
    const luz = luzes[i];
    if (!luz) continue;
    if (basesLuz[i] === undefined) basesLuz[i] = luz.intensity;
    const base = basesLuz[i] ?? luz.intensity;
    luz.intensity = base * (0.86 + 0.14 * Math.sin(t * 0.006 + i * 2.1) + 0.06 * Math.sin(t * 0.017 + i));
  }

  if (t - ultimo > 180) {
    quadro++;
    ultimo = t;
  }
  for (const h of herois) {
    const quadros = quadrosPorLinha[h.linha];
    if (!quadros || quadros.length === 0) continue;
    const tex = quadros[quadro % quadros.length];
    if (tex && h.mat.map !== tex) {
      h.mat.map = tex;
      h.mat.needsUpdate = true;
    }
  }

  if (posLigado && composer) composer.render();
  else renderer.render(cena, camera);
}

function redimensiona(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  aplicaCamera();
  composer?.setSize(window.innerWidth, window.innerHeight);
  uClima.resolucao.value.set(window.innerWidth, window.innerHeight);
  passeBloom?.setSize(window.innerWidth, window.innerHeight);
  const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const lado = CELL / TILE_PX;
  const sobraPe = (CELL - FEET_Y) / TILE_PX;
  for (const h of herois) {
    const p = h.malha.position;
    h.malha.position.set(p.x, 0, p.z).addScaledVector(cima, lado / 2 - sobraPe);
    h.malha.quaternion.copy(camera.quaternion);
  }
}
window.addEventListener('resize', redimensiona);

// --- botões de conferência --------------------------------------------------
function botao(id: string, fn: () => void): void {
  document.getElementById(id)?.addEventListener('click', fn);
}
botao('b-pos', () => { posLigado = !posLigado; });
/*
 * ⚠️ Estado EXPLÍCITO, não deduzido do valor atual. A primeira versão decidia
 * o lado do botão com `intensity > 1`, e quando as intensidades subiram na
 * calibragem o teste passou a dar o contrário: apertar "dia" ESCURECIA a cena.
 * Botão que adivinha o próprio estado quebra calado quando o valor muda.
 */
let ehDia = false;
const hemi = cena.children.find(
  (c) => c instanceof THREE.HemisphereLight,
) as THREE.HemisphereLight | undefined;

botao('b-dia', () => {
  // Mesmo cenário, de dia — para ver quanto do visual é LUZ e não geometria.
  ehDia = !ehDia;
  if (hemi) hemi.intensity = ehDia ? 3.4 : 1.75;
  lua.intensity = ehDia ? 3.2 : 1.7;
  lua.color.set(ehDia ? 0xfff4dc : 0xa8c0ee);
  for (let i = 0; i < luzes.length; i++) {
    const base = basesLuz[i];
    const luz = luzes[i];
    if (luz && base !== undefined) luz.visible = !ehDia;
  }
  uClima.satura.value = ehDia ? 1.04 : 0.92;
  uClima.contraste.value = ehDia ? 1.0 : 1.05;
  uClima.vinheta.value = ehDia ? 0.3 : 0.55;
});
botao('b-52', () => { INCLINACAO = 52; redimensiona(); });
botao('b-65', () => { INCLINACAO = 65; redimensiona(); });

// ---------------------------------------------------------------------------

const aviso = document.getElementById('aviso') as HTMLDivElement;

async function monta(): Promise<void> {
  aplicaCamera();
  montaCenario();
  await montaHerois();
  montaPos();
  redimensiona();
  aviso.remove();
}

requestAnimationFrame(laco);
monta().catch((e: unknown) => {
  aviso.textContent = `Falhou: ${String(e)}`;
});
