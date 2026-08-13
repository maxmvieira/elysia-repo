/**
 * Carregador da ARTE DE CLASSE HD — as quatro classes jogáveis.
 *
 * Substitui, para quem tem pack, os bonecos 16x16 do MiniWorld (`miniworld.ts`)
 * e a arte antiga só-do-Knight (`knight.ts`). O que chega aqui já vem em
 * **tiras** — uma por animação, com uma LINHA por direção, o mesmo formato do
 * MiniWorld, de propósito, para o corte ser o mesmo código de sempre.
 *
 * Se faltar qualquer coisa, o carregador devolve `null` e o jogo cai no
 * MiniWorld. Nada aqui pode derrubar o carregamento: é arte.
 *
 * ⚠️ **O pack em uso NÃO tem `idle` nem `hurt`**, e os dois têm queda
 * conhecida: sem `idle` o motor congela no quadro 0 do `walk`, que é justamente
 * a pose parada; sem `hurt` ele pisca vermelho, como sempre fez.
 *
 * Para regerar (ver `docs/PIXELLAB-RECEITA.md`):
 *
 *   PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs
 *   node tools/pixellab2strip.mjs
 */

import { Assets, Rectangle, Texture } from 'pixi.js';
import { attackPoseFallback, type AttackPose, type Hold, type PlayerClass } from '@dominion/shared';
import { loadImage, type DirAnim } from './miniworld.js';

// ---- Outfit: recolorir por GRUPO -------------------------------------------
//
// Passo 2 do `docs/PLANO-OUTFITS.md`. A tabela cor -> grupo vem de
// `grupos.json`, escrito por `tools/outfit-grupos.mjs`; aqui ela vira pixel na
// tela. Ainda NÃO há escolha do jogador, protocolo nem banco — a cor de teste
// entra por `?outfit=` na URL, e sem ela o jogo desenha exatamente como antes.

/** Cor escolhida por grupo. Índice 0 = grupo 1. `undefined` = cor original. */
export type Outfit = readonly (number | undefined)[];

interface Grupos {
  grupos: Array<{ id: number; nome: string; exemplo: string }>;
  /** `'#rrggbb'` -> id do grupo. 0 = nunca recolorir (contorno e pele). */
  cores: Record<string, number>;
}

const hsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
};

const rgb = (h: number, s: number, l: number): [number, number, number] => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t: [number, number, number] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((t[0] + m) * 255), Math.round((t[1] + m) * 255), Math.round((t[2] + m) * 255)];
};

const hex2 = (n: number): string => '#' + n.toString(16).padStart(6, '0');

/**
 * Recolore uma tira inteira segundo a tabela de grupos.
 *
 * 🔴 **Troca MATIZ e SATURAÇÃO, e desloca a luminância em bloco — não a
 * substitui.** Cada pixel do grupo mantém a sua distância de luz para os
 * vizinhos, e o grupo inteiro sobe ou desce junto pela diferença entre a cor
 * escolhida e a cor dominante original. Substituir a luminância chapa o
 * sombreado e o personagem vira mancha: as dobras do pano são luminância.
 *
 * ⚠️ Grupo 0 passa intacto, e é a maior parte do sprite (42% a 54%): contorno e
 * pele. É o contorno que sustenta a legibilidade a 64 px.
 */
function recolore(img: HTMLImageElement, g: Grupos, outfit: Outfit): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const dados = ctx.getImageData(0, 0, cv.width, cv.height);
  const p = dados.data;

  // Alvo por grupo, já em HSL, com o deslocamento de luz calculado UMA vez.
  const alvo = new Map<number, { h: number; s: number; dl: number }>();
  for (const grupo of g.grupos) {
    const cor = outfit[grupo.id - 1];
    if (cor === undefined) continue;
    const n = parseInt(grupo.exemplo.slice(1), 16);
    const [, , baseL] = hsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
    const [h, s, l] = hsl((cor >> 16) & 255, (cor >> 8) & 255, cor & 255);
    alvo.set(grupo.id, { h, s, dl: l - baseL });
  }
  if (alvo.size === 0) return cv;

  // Memória de cor->cor: a paleta tem ~80 entradas para dezenas de milhares de
  // pixels, então converter HSL uma vez por COR (e não por pixel) é o que faz
  // isto caber num carregamento.
  const memo = new Map<number, [number, number, number]>();
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3]! <= 8) continue;
    const cr = p[i]!, cg = p[i + 1]!, cb = p[i + 2]!;
    const k = (cr << 16) | (cg << 8) | cb;
    let novo = memo.get(k);
    if (novo === undefined) {
      const gid = g.cores[hex2(k)] ?? 0;
      const t = alvo.get(gid);
      if (t) {
        const [, , l] = hsl(cr, cg, cb);
        novo = rgb(t.h, t.s, Math.min(1, Math.max(0, l + t.dl)));
      } else {
        novo = [cr, cg, cb];
      }
      memo.set(k, novo);
    }
    p[i] = novo[0]; p[i + 1] = novo[1]; p[i + 2] = novo[2];
  }
  ctx.putImageData(dados, 0, 0);
  return cv;
}

/**
 * Outfit de teste vindo da URL: `?outfit=1f65b8,7d7b7d,f1c93a`.
 *
 * ⚠️ Existe para o passo 2 ser VISTO sem ainda ter escolha, protocolo nem banco.
 * Sem o parâmetro o jogo desenha exatamente como antes — recolorir é opt-in até
 * o sistema ficar de pé.
 */
export function outfitDaUrl(): Outfit | null {
  const bruto = new URLSearchParams(location.search).get('outfit');
  if (!bruto) return null;
  const cores = bruto.split(',').map((s) => {
    const n = parseInt(s.trim().replace(/^#/, ''), 16);
    return Number.isNaN(n) ? undefined : n;
  });
  return cores.some((c) => c !== undefined) ? cores : null;
}

/**
 * De onde vem a arte de classe.
 *
 * 🔴 **É o pack do PixelLab desde 2026-08-10**, gerado por
 * `tools/pixellab/gerar-classe.mjs` e montado em tiras pelo
 * `tools/pixellab2strip.mjs`. O pack antigo (render 3D reduzido) continua
 * versionado em `/assets/classes` — para voltar atrás, troque esta linha **e as
 * cinco constantes abaixo**, que são de outro tamanho. Não dá para trocar só uma.
 *
 * | | pack antigo (`classes`) | PixelLab (`classes-pixellab`) |
 * |---|---|---|
 * | `CELL` | 60 | 64 |
 * | `CONTENT_H` | 30 | 58 |
 * | `FEET_Y` | 44 | 60 |
 * | `CENTER_X` | 29.5 | 31.5 |
 * | `TARGET_H` | 60 | 58 |
 */
const BASE = '/assets/classes-pixellab';

/** Lado da célula nas tiras. O PixelLab entrega 64x64. */
const CELL = 64;

/**
 * Altura de tela que o CONTEÚDO do herói deve ocupar (~2 tiles).
 *
 * 🔴 **`TARGET_H === CONTENT_H`, ou seja escala 1,0× — e é o melhor caso que
 * existe: não há serrilhado de escala quando não há escala.** O sprite é
 * desenhado exatamente no tamanho em que foi criado.
 *
 * Vale a história, porque ela explica as duas constantes: o pack antigo tinha
 * 30 px de conteúdo desenhados a 64 → **2,133×**, e numa escala fracionária com
 * filtragem `nearest` cada pixel vira 2 pixels de tela ou 3, em faixas
 * alternadas. Era o defeito que mais saltava aos olhos. Passou a 60 (2,0×
 * exato) e, com o pack do PixelLab, a 1,0×.
 *
 * ⚠️ Quem trocar o pack tem que fechar a conta de novo: **`TARGET_H` tem que ser
 * múltiplo inteiro de `CONTENT_H`.** Qualquer outro valor devolve o serrilhado.
 */
const TARGET_H = 58;

/**
 * Medidas do bounding box de ALPHA, não da moldura do PNG.
 *
 * 🔴 É a lição que o `spritebox.ts` já tinha aprendido à força: tratar o quadro
 * como se fosse a arte fez a árvore boiar acima da sombra e tudo sair com metade
 * do tamanho pedido.
 *
 * ⚠️ A âncora é **uma só para as quatro direções** porque `makeMiniActor` aceita
 * um valor só. Ancorar pela direção de frente jogaria o erro inteiro nas
 * laterais, e o personagem daria um pulinho lateral toda vez que virasse.
 *
 * 🔴 **`FEET_Y` não é chute: o conversor GARANTE a sola nesta linha.**
 * `tools/pixellab2strip.mjs` mede o chão de cada quadro e desce/sobe o quadro
 * inteiro para o pé cair em `GROUND_Y = 60`. **São o mesmo número em dois
 * arquivos** — mudar um sem o outro enterra ou levanta as quatro classes.
 *
 * ⚠️ **`CONTENT_H` é o mesmo para as quatro, e a variação real é de propósito.**
 * Medido: Arqueiro 55, Knight 58, Feiticeiro 59, Assassino 60. Como a escala é
 * 1,0×, cada classe é desenhada no seu tamanho natural — o Arqueiro sai um
 * pouco mais baixo que o Assassino, e isso é a arte, não erro de âncora.
 *
 * ⚠️ **`CENTER_X` é média medida, e é de propósito.** O centro horizontal varia
 * dentro do ciclo de passos, mas essa variação é a PERNA ALTERNANDO —
 * normalizá-la como se fosse erro congelaria a caminhada.
 */
const CONTENT_H = 58;
const FEET_Y = 60;
const CENTER_X = 31.5;

/** Uma classe com arte HD carregada. */
export interface HeroArt {
  /** Ciclo de passos. É o único obrigatório — sem ele não há arte de classe. */
  walk: DirAnim;
  /** Parado. Ausente = o motor congela no quadro 0 do `walk`. */
  idle?: DirAnim;
  /** Levou dano. Ausente = o motor pisca vermelho, como sempre fez. */
  hurt?: DirAnim;
  /** Morrendo. Terminal: para no último quadro. */
  death?: DirAnim;
  /** Golpes por família de arma. Nem toda classe tem as cinco. */
  attacks: Partial<Record<AttackPose, DirAnim>>;
  scale: number;
  anchorX: number;
  anchorY: number;
  /** Y (coords do container) para nome e barra de vida, acima da cabeça. */
  labelTop: number;
}

/**
 * As classes que têm pack. Sem entrada aqui = continua no MiniWorld.
 *
 * ⚠️ É uma lista ESTÁTICA, e tem que ser: a tela de criação de personagem
 * desenha os cartões **antes** de o jogo carregar qualquer textura, e um ícone
 * de CSS não tem como cair para outro arquivo se o primeiro faltar. A promessa
 * que a sustenta é o commit — as tiras estão versionadas junto com o código.
 */
export const HERO_ART_CLASSES: ReadonlySet<PlayerClass> = new Set<PlayerClass>([
  'knight', 'sorcerer', 'archer', 'assassin',
]);

const COM_ARTE: PlayerClass[] = [...HERO_ART_CLASSES];

/**
 * Corta uma tira em `DirAnim`.
 *
 * Linha 0 = sul, 1 = norte, 2 = leste, 3 = oeste — escrito assim pelo conversor.
 * O número de quadros sai da LARGURA da folha: as animações têm contagens
 * diferentes (andar tem 4, golpe tem 9) e hardcodar isso quebraria calado na
 * primeira arte reexportada com outra contagem.
 */
async function fatia(path: string, pintar?: Pintor): Promise<DirAnim> {
  // 🔴 Com outfit o caminho é OUTRO: `Assets.load` devolve textura de GPU, e
  // recolorir exige os pixels na mão. Passa pelo canvas 2D, como `spritebox.ts`
  // já faz pelo mesmo motivo. Sem outfit continua o caminho de sempre — nada
  // muda para quem não escolheu cor.
  //
  // ⚠️ `loadImage` (de `miniworld.ts`) espera `onload`, NUNCA `img.decode()`:
  // em aba oculta o Chrome adia a decodificação e a promessa nunca resolve.
  const sheet = pintar
    ? Texture.from(pintar(await loadImage(path)))
    : await Assets.load<Texture>(path);
  sheet.source.scaleMode = 'nearest'; // pixel-art nítido ao escalar
  const cols = Math.max(1, Math.round(sheet.width / CELL));
  const linha = (r: number): Texture[] =>
    Array.from({ length: cols }, (_, i) =>
      new Texture({
        source: sheet.source,
        frame: new Rectangle(i * CELL, r * CELL, CELL, CELL),
      }),
    );
  return { down: linha(0), up: linha(1), right: linha(2), left: linha(3) };
}

/** Recolore uma folha carregada. `undefined` = sem outfit, caminho de sempre. */
type Pintor = (img: HTMLImageElement) => HTMLCanvasElement;

/** Tenta cortar uma tira opcional. Ausente vira `undefined`, sem barulho. */
async function fatiaOpcional(path: string, pintar?: Pintor): Promise<DirAnim | undefined> {
  try {
    return await fatia(path, pintar);
  } catch {
    return undefined;
  }
}

/**
 * A tabela de grupos da classe, ou `null` se ela não tiver.
 *
 * ⚠️ Ausência é normal, não erro: classe sem `grupos.json` simplesmente não
 * aceita outfit e desenha com a cor original. Nada aqui pode derrubar o
 * carregamento — é arte.
 */
async function carregaGrupos(cls: PlayerClass): Promise<Grupos | null> {
  try {
    const r = await fetch(`${BASE}/${cls}/grupos.json`);
    if (!r.ok) return null;
    const g = (await r.json()) as Grupos;
    return g.grupos && g.cores ? g : null;
  } catch {
    return null;
  }
}

/**
 * Classes cujo CORPO vem do pack em camadas (`classes-layered`), sem arma
 * pintada nele.
 *
 * 🔴 **O corpo e a camada andam JUNTOS.** Desenhar a espada recortada por cima
 * do corpo armado daria ao Knight **duas espadas** — a pintada e a de camada.
 * Quem entra nesta lista tem que ter as duas coisas; quem não entra continua
 * com o corpo armado de sempre e sem camada nenhuma.
 *
 * ⚠️ Só o Knight, porque só ele foi desarmado. As outras três continuam no pack
 * antigo, e isso é estado esperado, não pendência esquecida.
 */
const COM_CAMADA: ReadonlySet<PlayerClass> = new Set<PlayerClass>(['knight']);

export const temCamada = (cls: PlayerClass): boolean => COM_CAMADA.has(cls);

async function carregaClasse(cls: PlayerClass, outfit: Outfit | null): Promise<HeroArt | null> {
  const raiz = COM_CAMADA.has(cls) ? BASE_LAYERED : BASE;
  const p = (nome: string) => `${raiz}/${cls}/${nome}.png`;

  const grupos = outfit ? await carregaGrupos(cls) : null;
  const pintar: Pintor | undefined = grupos && outfit
    ? (img) => recolore(img, grupos, outfit)
    : undefined;

  let walk: DirAnim;
  try {
    walk = await fatia(p('walk'), pintar);
  } catch {
    return null; // sem ciclo de passos não há o que mostrar — cai no MiniWorld
  }

  const [idle, hurt, death, sword, dagger, spear, bow, staff] = await Promise.all([
    fatiaOpcional(p('idle'), pintar),
    fatiaOpcional(p('hurt'), pintar),
    fatiaOpcional(p('death'), pintar),
    fatiaOpcional(p('attack_sword'), pintar),
    fatiaOpcional(p('attack_dagger'), pintar),
    fatiaOpcional(p('attack_spear'), pintar),
    fatiaOpcional(p('attack_bow'), pintar),
    fatiaOpcional(p('attack_staff'), pintar),
  ]);

  const attacks: Partial<Record<AttackPose, DirAnim>> = {};
  if (sword) attacks.sword = sword;
  if (dagger) attacks.dagger = dagger;
  if (spear) attacks.spear = spear;
  if (bow) attacks.bow = bow;
  if (staff) attacks.staff = staff;

  return {
    walk,
    idle,
    hurt,
    death,
    attacks,
    scale: TARGET_H / CONTENT_H,
    anchorX: CENTER_X / CELL,
    anchorY: FEET_Y / CELL,
    labelTop: -TARGET_H + 26,
  };
}

// ---------------------------------------------------------------------------
// EQUIPAMENTO EM CAMADA
// ---------------------------------------------------------------------------

/** Onde moram o corpo desarmado e as tiras de arma. */
const BASE_LAYERED = '/assets/classes-layered';

/**
 * As peças que existem como arte hoje. O nome é o do arquivo:
 * `arma-<peça>-<animação>.png`.
 *
 * ⚠️ **Faltam seis**, e é sabido: machado, maça e cajado, de uma e de duas mãos.
 * Neles a ponta é outro objeto — cabeça de machado, bola, cristal — e nem o
 * recorte nem a derivação da lâmina inventam isso.
 */
export type EquipPiece = 'espada' | 'espada2m' | 'adaga' | 'escudo';

/**
 * Uma peça desenhada POR CIMA do corpo, com as mesmas animações dele.
 *
 * 🔴 **Não há deslocamento a aplicar aqui.** Ele já vem assado na tira, quadro a
 * quadro, por `tools/armas2strip.mjs` — as colunas da arma são as mesmas do
 * corpo, na mesma ordem. Duas camadas desenhadas em paralelo ficam alinhadas
 * sozinhas, e o cliente não precisa saber que existe ponto de mão.
 *
 * ⚠️ **Não há `death`, de propósito.** O corpo tomba girando, e girar pixel art
 * de 20 px destrói o desenho. Sem tira, a arma some ao morrer — que é o certo
 * até alguém implementar a arma CAINDO no chão, como o Tibia faz.
 */
export interface EquipArt {
  walk: DirAnim;
  pose: DirAnim;
  attack: DirAnim;
  /** Respiração: a arma sobe junto com o tronco. Ver `pixellab2strip.mjs`. */
  idle: DirAnim;
}

const PECAS: EquipPiece[] = ['espada', 'espada2m', 'adaga', 'escudo'];

/**
 * Que peça desenhar para a arma equipada.
 *
 * 🔴 **Arma sem arte devolve `null`, e o herói aparece de mãos vazias.** A
 * tentação seria cair na espada, que é o que `attackPoseFallback` faz com a
 * ANIMAÇÃO — mas foi exatamente isso que o dono apontou como defeito em 12/08:
 * *"a lança do knight está parecendo a própria espada dele, o arco também, o
 * cajado dele também é uma espada"*. Repetir o truque no desenho seria esconder
 * a lacuna em vez de mostrá-la. Mão vazia é visivelmente "falta arte"; espada
 * errada é uma mentira difícil de notar.
 */
export function pecaDaArma(hold: Hold): EquipPiece | null {
  if (!hold.main) return null;
  if (hold.main === 'sword') return hold.grip === 'two_hand' ? 'espada2m' : 'espada';
  if (hold.main === 'dagger') return 'adaga';
  return null; // machado, maça, lança, arco, besta e cajado: sem arte ainda
}

async function carregaPeca(cls: PlayerClass, peca: EquipPiece): Promise<EquipArt | null> {
  const p = (anim: string) => `${BASE_LAYERED}/${cls}/arma-${peca}-${anim}.png`;
  const [walk, pose, attack, idle] = await Promise.all([
    fatiaOpcional(p('walk')), fatiaOpcional(p('pose')),
    fatiaOpcional(p('attack_sword')), fatiaOpcional(p('idle')),
  ]);
  // ⚠️ `idle` cai na pose se faltar: o corpo respira e a arma fica parada, que é
  // feio mas não quebra. Faltar `walk` ou `pose`, sim, invalida a peça.
  return walk && pose && attack ? { walk, pose, attack, idle: idle ?? pose } : null;
}

/**
 * As peças de equipamento de uma classe. Classe sem pack em camadas devolve
 * vazio, e o chamador desenha só o corpo — que é o comportamento de hoje.
 */
export async function loadEquipArt(cls: PlayerClass): Promise<Partial<Record<EquipPiece, EquipArt>>> {
  const carregadas = await Promise.all(PECAS.map((p) => carregaPeca(cls, p).catch(() => null)));
  const fora: Partial<Record<EquipPiece, EquipArt>> = {};
  PECAS.forEach((p, i) => { const a = carregadas[i]; if (a) fora[p] = a; });
  return fora;
}

/**
 * Carrega a arte HD de todas as classes que tiverem pack. Classe sem arte
 * simplesmente não aparece no mapa devolvido, e o chamador cai no MiniWorld.
 */
export async function loadHeroArt(
  outfit: Outfit | null = outfitDaUrl(),
): Promise<Partial<Record<PlayerClass, HeroArt>>> {
  const artes = await Promise.all(COM_ARTE.map((c) => carregaClasse(c, outfit).catch(() => null)));
  const out: Partial<Record<PlayerClass, HeroArt>> = {};
  COM_ARTE.forEach((c, i) => {
    const a = artes[i];
    if (a) out[c] = a;
  });
  const nomes = Object.keys(out);
  if (nomes.length) console.log(`[heroes] arte HD carregada: ${nomes.join(', ')}.`);
  else console.warn('[heroes] nenhuma arte de classe encontrada — usando MiniWorld.');
  return out;
}

/**
 * O golpe que esta classe toca para esta pose, seguindo a cadeia de fallback.
 *
 * Só o Assassino tem estocada de adaga, e ele não tem lança — então a cadeia
 * termina sempre em `sword`, que os cinco packs têm. `undefined` só sai daqui se
 * a classe não tiver golpe NENHUM, e aí o motor volta ao pulinho de investida.
 */
export function golpeDe(art: HeroArt, pose: AttackPose): DirAnim | undefined {
  for (const p of attackPoseFallback(pose)) {
    const anim = art.attacks[p];
    if (anim) return anim;
  }
  return undefined;
}

/**
 * CSS inline do ícone da tela de criação: o quadro parado virado para baixo
 * (linha 0 de `pose.png`), escalado para o box do cartão.
 *
 * Diferente do `knightIconCss`, que recorta a CABEÇA: aqui cabe o corpo inteiro,
 * porque o herói ocupa quase toda a célula de 64 e já fica legível no tamanho
 * do cartão.
 */
/**
 * A arma que a classe mostra no RETRATO, quando o corpo dela vem desarmado.
 *
 * 🔴 Sem isto o Knight aparece de mãos vazias no HUD e nos cartões — foi o
 * primeiro defeito visto em tela depois de ele passar a usar o corpo desarmado.
 *
 * ⚠️ É a arma **canônica da classe**, não a equipada. O retrato é montado uma vez
 * no `startGame`, e o cartão da tela de criação existe antes de haver
 * personagem — nos dois casos não há arma equipada para consultar. Se um dia o
 * retrato tiver que seguir o que está na mão, o lugar é o `mini.equipArt`, que
 * já sabe qual peça é.
 */
const ARMA_DO_RETRATO: Partial<Record<PlayerClass, EquipPiece>> = {
  knight: 'espada',
};

/**
 * CSS inline do ícone: o quadro parado virado para baixo (linha 0 de
 * `pose.png`), escalado para o box.
 *
 * 🔴 Para classe com corpo desarmado, empilha a arma por cima — **CSS aceita
 * vários `background-image`, e o primeiro da lista fica em cima**. As duas tiras
 * têm o mesmo tamanho e o mesmo layout de linhas, então um `background-size` só
 * serve para as duas e não há posição a calcular.
 *
 * Diferente do `knightIconCss`, que recorta a CABEÇA: aqui cabe o corpo inteiro,
 * porque o herói ocupa quase toda a célula de 64 e já fica legível no tamanho
 * do cartão.
 */
export function heroIconCss(cls: PlayerClass, boxPx: number): string {
  const s = boxPx / CELL;
  const raiz = COM_CAMADA.has(cls) ? BASE_LAYERED : BASE;
  const peca = COM_CAMADA.has(cls) ? ARMA_DO_RETRATO[cls] : undefined;
  const urls = [
    ...(peca ? [`url('${raiz}/${cls}/arma-${peca}-pose.png')`] : []),
    `url('${raiz}/${cls}/pose.png')`,
  ];
  const tamanho = `${CELL * s}px ${CELL * 4 * s}px`;
  return (
    `background-image:${urls.join(',')};image-rendering:pixelated;` +
    `background-repeat:no-repeat;background-position:0 0;` +
    `background-size:${urls.map(() => tamanho).join(',')};`
  );
}
