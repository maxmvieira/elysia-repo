/**
 * A **arte da fazenda** — a camada de mapa autoral do cliente.
 *
 * ## 🔴 Por que a fazenda não é desenhada como o resto do mundo
 *
 * O mundo de Elysia é pintado por REGRA: `montaChunk` lê o id do tile e desenha
 * o retalho de chão correspondente, ou um bloco 2.5D se for parede. Isso dá
 * conta de 300×300 de natureza gerada e **não dá conta de lugar desenhado à
 * mão** — a fazenda tem moinho, telhado, hera na parede e cerca de madeira, e
 * nada disso cabe em 16 tipos de tile.
 *
 * Então dentro do retângulo da fazenda o desenho por regra é **desligado**
 * (`dentroDaFarm` em `montaChunk`) e no lugar dele entram os PNGs que o
 * `npm run farm:build` assou a partir do `Farm.tmx`.
 *
 * ⚠️ A colisão continua vindo dos tiles, como em todo o resto do mundo. Arte e
 * colisão são coisas separadas de propósito: é o que permite o servidor não
 * saber que existe um moinho ali.
 *
 * ## As três camadas, e por que são três
 *
 * | camada | onde entra | o que tem |
 * |---|---|---|
 * | `baixo` | acima do piso, ABAIXO dos personagens | chão, construções, cercas |
 * | animados | junto de `baixo` | água, peixe, as pás do moinho |
 * | `acima` | ACIMA dos personagens | copa das árvores, corrimão da cerca |
 *
 * 🔴 A separação `baixo`/`acima` é o que faz o personagem **passar atrás** da
 * folhagem em vez de pisar em cima dela. Sem ela a fazenda pareceria um adesivo.
 */

import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { TILE_SIZE } from '@dominion/shared';

const BASE = '/assets/farm';

interface FaixaJson { quadros: number; ms: number[]; sincrona?: boolean }
interface CelulaJson { x: number; y: number; faixa: number; acima: boolean }
interface PortaCelulaJson { x: number; y: number; linha: number; quadros: number }
interface PortaJson { nome: string; celulas: PortaCelulaJson[] }

interface InteriorJson {
  nome: string;
  arquivo: string;
  origem: { x: number; y: number };
  andar: number;
  largura: number;
  altura: number;
}

interface FarmJson {
  largura: number;
  altura: number;
  tile: number;
  animados: { folha: string; faixas: FaixaJson[]; celulas: CelulaJson[] };
  portas: PortaJson[];
  interiores: InteriorJson[];
}

/** Um quadro animado vivo: sprite + as texturas dele + o relógio próprio. */
interface Animado {
  sprite: Sprite;
  texturas: Texture[];
  ms: number[];
  /** Quando o quadro atual começou. */
  desde: number;
  quadro: number;
}

/** Uma porta: abre ao entrar, fecha ao sair. */
interface Porta {
  nome: string;
  celulas: Array<{ x: number; y: number; sprite: Sprite; texturas: Texture[] }>;
  /** 0 = fechada, 1 = aberta. Interpolado ao longo de `ABRE_MS`. */
  abertura: number;
  alvo: 0 | 1;
}

/** Quanto tempo a porta leva para abrir por inteiro. */
const ABRE_MS = 260;

export interface FarmArte {
  baixo: Container;
  acima: Container;
  /**
   * Os interiores, que moram no andar 1. Container separado porque eles só
   * aparecem quando o jogador está lá dentro — desenhá-los junto com a fazenda
   * poria uma casa transparente flutuando sobre o pasto.
   */
  interiores: Container;
  /**
   * Liga a camada certa para o andar em que o jogador está. Chamar na troca de
   * andar, não a cada quadro.
   */
  mostraAndar(floor: number): void;
  /** Chame a cada quadro. `agora` em ms de `performance.now()`. */
  tick(agora: number, dtMs: number): void;
  /**
   * Diz à fazenda onde o herói está, em tiles do MUNDO. É o que abre e fecha as
   * portas — a porta reage à presença, não a um clique.
   */
  heroiEm(x: number, y: number): void;
  /** Nome da construção cuja porta o herói está pisando, se houver. */
  portaSob(x: number, y: number): string | undefined;
  /**
   * 🔴 **Fura a arte assada numa célula** — é a metade visual do `/remove`.
   *
   * A colisão e o `farmDesenhaCelula` já sabem que a célula foi apagada, mas os
   * dois PNGs da fazenda são **um sprite cada**: sem furar o pixel, a árvore
   * removida continuaria desenhada por cima do chão que o motor voltou a pintar.
   *
   * ⚠️ Coordenadas do MUNDO, como todo o resto desta interface.
   */
  apagaCelula(x: number, y: number): void;
  /**
   * 🔴 **Carimba a arte de uma célula em outra** — a metade visual do `/paste`.
   *
   * ⚠️ **A fonte é o PNG ORIGINAL, não o canvas em uso.** Copiar do canvas faria
   * o resultado depender da ORDEM em que as edições foram aplicadas: colar de
   * uma célula que depois foi apagada daria coisas diferentes no login de quem
   * chega agora e na tela de quem já estava online. Lendo sempre do original, a
   * mesma lista de edições dá sempre a mesma fazenda.
   *
   * ⚠️ Coordenadas do MUNDO nas duas pontas.
   */
  copiaCelula(deX: number, deY: number, paraX: number, paraY: number): void;
}

/**
 * Carrega a fazenda. Devolve `null` se a arte não estiver gerada — o jogo
 * continua funcionando, com a fazenda aparecendo como terra batida e paredes de
 * madeira, que é exatamente o que a colisão diz. Falha silenciosa é o certo
 * aqui: quem clonar o repositório sem rodar `npm run farm:build` tem que
 * conseguir jogar.
 */
export async function carregaFarmArte(
  origemX: number,
  origemY: number,
): Promise<FarmArte | null> {
  let dados: FarmJson;
  try {
    const resp = await fetch(`${BASE}/farm.json`);
    if (!resp.ok) throw new Error(String(resp.status));
    dados = (await resp.json()) as FarmJson;
  } catch {
    console.warn('[fazenda] farm.json ausente — rode `npm run farm:build`. Seguindo sem a arte.');
    return null;
  }

  const [texBaixo, texAcima, texAnim, texPortas] = await Promise.all([
    Assets.load<Texture>(`${BASE}/farm-baixo.png`),
    Assets.load<Texture>(`${BASE}/farm-acima.png`),
    Assets.load<Texture>(`${BASE}/farm-anim.png`),
    Assets.load<Texture>(`${BASE}/farm-portas.png`),
  ]);
  // Pixel art: sem isso a fazenda inteira sai borrada.
  for (const t of [texBaixo, texAcima, texAnim, texPortas]) t.source.scaleMode = 'nearest';

  const px0 = origemX * TILE_SIZE;
  const py0 = origemY * TILE_SIZE;
  const T = dados.tile; // 32: o tile de 16px do pack, a 2×

  const baixo = new Container();
  const acima = new Container();
  baixo.eventMode = 'none';
  acima.eventMode = 'none';

  /*
   * 🔴 **Os dois PNGs assados entram como CANVAS, não como textura de imagem** —
   * e a única razão é o `/remove`: um canvas dá para apagar um retângulo de
   * 32×32 e reenviar para a GPU, e uma textura de `<img>` não.
   *
   * ⚠️ **O custo é um decode a mais no boot**, ~1,5 MB de pixels copiados uma
   * vez. Medido contra a alternativa — máscara de Pixi com furos — venceu por
   * ser previsível: máscara com N buracos vira geometria que cresce com o número
   * de remoções, e isto aqui não cresce com nada.
   *
   * ⚠️ Se o canvas 2D não existir (contexto perdido, navegador exótico), cai de
   * volta na textura original e o `/remove` deixa de furar a arte. É o degrau
   * certo: perde-se a ferramenta de autoria, não o jogo.
   */
  const telas = new Map<'baixo' | 'acima', CanvasRenderingContext2D>();
  /** O PNG intocado de cada camada — a fonte do `copiaCelula`. Ver lá. */
  const originais = new Map<'baixo' | 'acima', CanvasImageSource>();
  function paraCanvas(tex: Texture, qual: 'baixo' | 'acima'): Texture {
    const fonte = tex.source.resource as CanvasImageSource | undefined;
    if (fonte) originais.set(qual, fonte);
    const cv = document.createElement('canvas');
    cv.width = tex.width;
    cv.height = tex.height;
    const ctx = cv.getContext('2d');
    if (!ctx || !fonte) {
      console.warn('[fazenda] sem canvas 2D — /remove não vai furar a arte assada.');
      return tex;
    }
    ctx.drawImage(fonte, 0, 0);
    telas.set(qual, ctx);
    const nova = Texture.from(cv);
    nova.source.scaleMode = 'nearest';
    return nova;
  }

  const fundo = new Sprite(paraCanvas(texBaixo, 'baixo'));
  fundo.x = px0; fundo.y = py0;
  baixo.addChild(fundo);

  const frente = new Sprite(paraCanvas(texAcima, 'acima'));
  frente.x = px0; frente.y = py0;
  acima.addChild(frente);

  // --- tiles animados --------------------------------------------------------

  const texturasDaFaixa = dados.animados.faixas.map((f, linha) => (
    Array.from({ length: f.quadros }, (_, k) => new Texture({
      source: texAnim.source,
      frame: new Rectangle(k * T, linha * T, T, T),
    }))
  ));

  const animados: Animado[] = [];
  for (const c of dados.animados.celulas) {
    const faixa = dados.animados.faixas[c.faixa];
    const texturas = texturasDaFaixa[c.faixa];
    if (!faixa || !texturas) continue;
    const s = new Sprite(texturas[0]);
    s.x = px0 + c.x * T;
    s.y = py0 + c.y * T;
    (c.acima ? acima : baixo).addChild(s);
    /*
     * ⚠️ **Cada célula tem relógio próprio, começando num ponto sorteado** — e
     * essa é a regra certa para água e peixe: com todas em fase, as células do
     * lago piscariam juntas e ele pareceria uma lâmpada. O deslocamento inicial
     * é o que dá a impressão de onda correndo pela superfície.
     *
     * 🔴 **E é exatamente a regra ERRADA para as pás do moinho**, que foi o bug
     * de 31/08 (*"o catavento está girando todo quebrado, faltando parte"*). As
     * 77 células do moinho são pedaços de UMA hélice: sorteadas, cada uma
     * mostrava um instante diferente do giro e a hélice virava estilhaço.
     *
     * Quem sabe a diferença é o conversor, não este arquivo — ele marca a faixa
     * como `sincrona` (ver `ANIMACAO_EM_BLOCO` no `build.mjs`). Uma faixa
     * síncrona começa no quadro 0, e como todas as células avançam no mesmo
     * laço, com o mesmo `agora` e as mesmas durações, elas ficam travadas
     * juntas para sempre — sem relógio global e sem deriva.
     */
    animados.push({
      sprite: s,
      texturas,
      ms: faixa.ms,
      quadro: faixa.sincrona ? 0 : Math.floor(Math.random() * faixa.quadros),
      desde: 0,
    });
  }

  // --- portas ----------------------------------------------------------------

  const portas: Porta[] = dados.portas.map((p) => ({
    nome: p.nome,
    abertura: 0,
    alvo: 0 as const,
    celulas: p.celulas.map((c) => {
      const texturas = Array.from({ length: c.quadros }, (_, k) => new Texture({
        source: texPortas.source,
        frame: new Rectangle(k * T, c.linha * T, T, T),
      }));
      const s = new Sprite(texturas[0]);
      s.x = px0 + c.x * T;
      s.y = py0 + c.y * T;
      baixo.addChild(s);
      return { x: origemX + c.x, y: origemY + c.y, sprite: s, texturas };
    }),
  }));

  /**
   * 🔴 A porta abre quando o herói **encosta**, não quando ele pisa nela.
   *
   * Se abrisse só ao pisar, a animação começaria com o personagem já no vão e o
   * jogador veria a porta abrindo por baixo dos próprios pés. Um tile de
   * antecedência (Chebyshev) dá tempo de a folha girar antes de ele passar — e é
   * o que faz parecer que a porta reagiu a ele.
   */
  const ALCANCE = 1;

  function heroiEm(hx: number, hy: number): void {
    for (const p of portas) {
      const perto = p.celulas.some(
        (c) => Math.abs(c.x - hx) <= ALCANCE && Math.abs(c.y - hy) <= ALCANCE,
      );
      p.alvo = perto ? 1 : 0;
    }
  }

  function portaSob(hx: number, hy: number): string | undefined {
    for (const p of portas) {
      if (p.celulas.some((c) => c.x === hx && c.y === hy)) return p.nome;
    }
    return undefined;
  }

  function tick(agora: number, dtMs: number): void {
    for (const a of animados) {
      const dur = a.ms[a.quadro] ?? 150;
      if (a.desde === 0) a.desde = agora;
      if (agora - a.desde >= dur) {
        a.desde = agora;
        a.quadro = (a.quadro + 1) % a.texturas.length;
        a.sprite.texture = a.texturas[a.quadro]!;
      }
    }
    for (const p of portas) {
      const passo = dtMs / ABRE_MS;
      if (p.abertura < p.alvo) p.abertura = Math.min(1, p.abertura + passo);
      else if (p.abertura > p.alvo) p.abertura = Math.max(0, p.abertura - passo);
      for (const c of p.celulas) {
        const n = c.texturas.length;
        // `abertura` 0..1 → quadro 0..n-1, e o último quadro é a porta escancarada.
        const k = Math.min(n - 1, Math.round(p.abertura * (n - 1)));
        const t = c.texturas[k];
        if (t && c.sprite.texture !== t) c.sprite.texture = t;
      }
    }
  }

  // --- interiores ------------------------------------------------------------

  const interiores = new Container();
  interiores.eventMode = 'none';
  const andaresComInterior = new Set<number>();
  await Promise.all((dados.interiores ?? []).map(async (i) => {
    const tex = await Assets.load<Texture>(`${BASE}/${i.arquivo}`);
    tex.source.scaleMode = 'nearest';
    const s = new Sprite(tex);
    s.x = i.origem.x * TILE_SIZE;
    s.y = i.origem.y * TILE_SIZE;
    interiores.addChild(s);
    andaresComInterior.add(i.andar);
  }));

  /**
   * Apaga uma célula da arte: fura os dois PNGs e some com o que estiver
   * animado ali.
   *
   * ⚠️ **Os animados precisam sumir junto, e é fácil esquecer:** eles são
   * sprites de verdade, não pixels do PNG. Sem esta parte, apagar uma célula do
   * lago deixaria a água correndo sobre a grama que o motor pintou.
   */
  function apagaCelula(mx: number, my: number): void {
    const cx = mx - origemX;
    const cy = my - origemY;
    if (cx < 0 || cy < 0 || cx >= dados.largura || cy >= dados.altura) return;

    for (const ctx of telas.values()) ctx.clearRect(cx * T, cy * T, T, T);
    // Reenvia os dois para a GPU: sem isto o furo só apareceria por acidente,
    // quando outra coisa forçasse o upload.
    fundo.texture.source.update();
    frente.texture.source.update();

    for (const a of animados) {
      if (a.sprite.x === px0 + cx * T && a.sprite.y === py0 + cy * T) a.sprite.visible = false;
    }
    for (const p of portas) {
      for (const c of p.celulas) if (c.x === cx && c.y === cy) c.sprite.visible = false;
    }
  }

  /**
   * Copia a arte de uma célula para outra, nas duas camadas assadas.
   *
   * ⚠️ **Limpa o destino antes de desenhar**, e isso importa: `drawImage` compõe
   * com alpha, então sem o `clearRect` colar uma copa de árvore sobre uma parede
   * daria as duas sobrepostas em vez da árvore.
   *
   * ⚠️ **O que está VIVO não é copiado** — água, peixe e as pás do moinho são
   * sprites, não pixels do PNG. O destino perde os dele (senão a água correria
   * sobre a arte nova) e não ganha os da origem. Clonar o lago copia o fundo
   * parado, e é o comportamento honesto: o resto não é arte assada.
   */
  function copiaCelula(deX: number, deY: number, paraX: number, paraY: number): void {
    const dx = deX - origemX, dy = deY - origemY;
    const px = paraX - origemX, py = paraY - origemY;
    const dentro = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < dados.largura && y < dados.altura;
    if (!dentro(dx, dy) || !dentro(px, py)) return;

    for (const qual of ['baixo', 'acima'] as const) {
      const ctx = telas.get(qual);
      const fonte = originais.get(qual);
      if (!ctx || !fonte) continue;
      ctx.clearRect(px * T, py * T, T, T);
      ctx.drawImage(fonte, dx * T, dy * T, T, T, px * T, py * T, T, T);
    }
    fundo.texture.source.update();
    frente.texture.source.update();

    for (const a of animados) {
      if (a.sprite.x === px0 + px * T && a.sprite.y === py0 + py * T) a.sprite.visible = false;
    }
    for (const p of portas) {
      for (const c of p.celulas) if (c.x === px && c.y === py) c.sprite.visible = false;
    }
  }

  function mostraAndar(floor: number): void {
    const fora = floor === 0;
    baixo.visible = fora;
    acima.visible = fora;
    interiores.visible = andaresComInterior.has(floor);
  }
  mostraAndar(0);

  console.log(
    `[fazenda] arte carregada: ${dados.largura}×${dados.altura} tiles,`
    + ` ${animados.length} células animadas, ${portas.length} portas,`
    + ` ${dados.interiores?.length ?? 0} interiores`,
  );
  return {
    baixo, acima, interiores, mostraAndar, tick, heroiEm, portaSob,
    apagaCelula, copiaCelula,
  };
}
