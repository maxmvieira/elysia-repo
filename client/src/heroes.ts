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
 * ⚠️ **Nenhum pack tem `hurt`**, e a queda é conhecida: sem ele o motor pisca
 * vermelho, como sempre fez. (Sem `idle` ele congelaria no quadro 0 do `walk`,
 * que é a pose parada — mas os dois packs têm `idle`.)
 *
 * 🔴 **O pack é ESCOLHIDO POR CLASSE** desde 2026-08-29 — ver `PACK_DA_CLASSE`.
 * O Knight lê `/assets/classes` (o antigo, com os cinco golpes) e as outras três
 * leem `/assets/classes-pixellab`. Nenhuma medida de tira pode ser constante de
 * módulo por causa disso.
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
 * Um pack de arte de classe: a pasta e as CINCO medidas que vêm com ela.
 *
 * 🔴 **As seis andam JUNTAS, e é por isso que viraram um objeto.** Até
 * 2026-08-29 elas eram seis constantes soltas no módulo, com um comentário
 * pedindo para "trocar as cinco ao mesmo tempo" — trocar a pasta sem trocar os
 * números enterra ou levanta o herói no chão. Agrupadas, não há como esquecer
 * uma; e como a escolha passou a ser **por classe**, soltas elas nem serviriam.
 */
interface Pack {
  /** Pasta em `client/public`. */
  base: string;
  /** Lado da célula nas tiras. */
  cell: number;
  /** Altura do bounding box de ALPHA do conteúdo, medida — não a moldura. */
  contentH: number;
  /** Linha da sola dentro da célula. O conversor GARANTE o pé aqui. */
  feetY: number;
  /** Centro horizontal médio do conteúdo. */
  centerX: number;
  /** Altura de tela que o conteúdo deve ocupar (~2 tiles). */
  targetH: number;
}

/**
 * O pack do PixelLab, gerado por `tools/pixellab/gerar-classe.mjs` e montado em
 * tiras por `tools/pixellab2strip.mjs`.
 *
 * 🔴 **`targetH === contentH`, ou seja escala 1,0× — o melhor caso que existe:
 * não há serrilhado de escala quando não há escala.** O sprite é desenhado
 * exatamente no tamanho em que foi criado.
 *
 * 🔴 **`feetY` não é chute:** `tools/pixellab2strip.mjs` mede o chão de cada
 * quadro e desce/sobe o quadro inteiro para o pé cair em `GROUND_Y = 60`. **São
 * o mesmo número em dois arquivos** — mudar um sem o outro enterra as classes.
 *
 * ⚠️ **`contentH` é o mesmo para as quatro, e a variação real é de propósito.**
 * Medido: Arqueiro 55, Knight 58, Feiticeiro 59, Assassino 60. Como a escala é
 * 1,0×, cada classe sai no seu tamanho natural — o Arqueiro um pouco mais baixo
 * que o Assassino, e isso é a arte, não erro de âncora.
 *
 * ⚠️ **`centerX` é média medida, e é de propósito.** O centro horizontal varia
 * dentro do ciclo de passos, mas essa variação é a PERNA ALTERNANDO —
 * normalizá-la como se fosse erro congelaria a caminhada.
 */
const PACK_PIXELLAB: Pack = {
  base: '/assets/classes-pixellab',
  cell: 64, contentH: 58, feetY: 60, centerX: 31.5, targetH: 58,
};

/**
 * O pack ANTIGO — render 3D reduzido, montado por `tools/frames2strip.mjs`.
 * Entrou em 09/08, saiu em 10/08 quando o PixelLab chegou, e **voltou para o
 * Knight em 29/08 por decisão do dono**.
 *
 * ✅ **É o único pack com CINCO golpes** (`sword`, `spear`, `bow`, `staff` e o
 * `dagger` por fallback). O do PixelLab só tem `attack_sword`, e é isso que faz
 * o `attackPoseFallback` empurrar arma nenhuma para o gesto de espada.
 *
 * 🔴 **A escala aqui é 2,0×, e o número é escolhido, não herdado.** 30 px de
 * conteúdo desenhados a **60** dão o dobro exato. ⚠️ Desenhá-lo a 64, como já
 * foi feito, dá **2,133×** — e em escala fracionária com filtragem `nearest`
 * cada pixel do desenho vira 2 pixels de tela ou 3, em faixas alternadas. Era o
 * serrilhado que custou a sessão de 10/08. **`targetH` tem que ser múltiplo
 * INTEIRO de `contentH`; qualquer outro valor traz o defeito de volta.**
 */
const PACK_ANTIGO: Pack = {
  base: '/assets/classes',
  cell: 60, contentH: 30, feetY: 44, centerX: 29.5, targetH: 60,
};

/**
 * Que pack cada classe usa. Ausente = `PACK_PIXELLAB`.
 *
 * 🔴 **O Knight voltou ao pack antigo em 2026-08-29, a pedido do dono**, que
 * viu em tela e disse que o do PixelLab não servia. As outras três continuam no
 * PixelLab — ele não reclamou delas, e mexer nelas seria decidir por ele.
 *
 * ⚠️ **Misturar packs é visível, e é a troca aceita conscientemente:** o Knight
 * passa a ser desenhado a 2,0× a partir de 30 px de conteúdo, enquanto as
 * outras três saem a 1,0× a partir de ~58. A âncora do pé e o `targetH` fazem
 * os quatro pisarem na mesma linha e terem quase a mesma altura de tela, então
 * o que muda é a **densidade do desenho**: o Knight fica com o pixel duas vezes
 * maior que o das colegas. É o preço de ter os cinco golpes de volta.
 */
const PACK_DA_CLASSE: Partial<Record<PlayerClass, Pack>> = {
  knight: PACK_ANTIGO,
};

const packDe = (cls: PlayerClass): Pack => PACK_DA_CLASSE[cls] ?? PACK_PIXELLAB;

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
async function fatia(path: string, cell: number, pintar?: Pintor): Promise<DirAnim> {
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
  const cols = Math.max(1, Math.round(sheet.width / cell));
  const linha = (r: number): Texture[] =>
    Array.from({ length: cols }, (_, i) =>
      new Texture({
        source: sheet.source,
        frame: new Rectangle(i * cell, r * cell, cell, cell),
      }),
    );
  return { down: linha(0), up: linha(1), right: linha(2), left: linha(3) };
}

/** Recolore uma folha carregada. `undefined` = sem outfit, caminho de sempre. */
type Pintor = (img: HTMLImageElement) => HTMLCanvasElement;

/** Tenta cortar uma tira opcional. Ausente vira `undefined`, sem barulho. */
async function fatiaOpcional(
  path: string, cell: number, pintar?: Pintor,
): Promise<DirAnim | undefined> {
  try {
    return await fatia(path, cell, pintar);
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
async function carregaGrupos(cls: PlayerClass, base: string): Promise<Grupos | null> {
  try {
    const r = await fetch(`${base}/${cls}/grupos.json`);
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
 * ⚠️ Só o Knight foi desarmado. As outras três nunca tiveram camada, e isso é
 * estado esperado, não pendência esquecida.
 *
 * 🔴 **VAZIO desde 2026-08-29, por decisão do dono: o Knight desarmado ficou
 * feio em tela e ele mandou voltar ao corpo ARMADO do PixelLab.** Nada foi
 * apagado — `classes-layered/` continua versionado, `loadEquipArt` e
 * `pecaDaArma` continuam de pé e testados. **Religar é pôr `'knight'` de volta
 * nesta linha**, e só nela.
 *
 * ⚠️ Quem religar tem que lembrar por que a camada existia: no corpo armado a
 * arma é PINTADA, então lança, arco e cajado do Knight continuam parecendo a
 * espada dele — foi o defeito nº 1 da lista de 12/08. A camada resolvia isso;
 * o corpo armado o traz de volta em troca de um sprite melhor de olhar.
 */
const COM_CAMADA: ReadonlySet<PlayerClass> = new Set<PlayerClass>([]);

export const temCamada = (cls: PlayerClass): boolean => COM_CAMADA.has(cls);

async function carregaClasse(cls: PlayerClass, outfit: Outfit | null): Promise<HeroArt | null> {
  // ⚠️ O pack em camadas ganha do pack da classe: quem tem corpo desarmado tem
  // que ler o corpo desarmado, senão a arma seria desenhada duas vezes. Ele usa
  // as medidas do PixelLab porque saiu dele — mesma célula, mesmo chão.
  const pack = COM_CAMADA.has(cls) ? { ...PACK_PIXELLAB, base: BASE_LAYERED } : packDe(cls);
  const p = (nome: string) => `${pack.base}/${cls}/${nome}.png`;

  const grupos = outfit ? await carregaGrupos(cls, pack.base) : null;
  const pintar: Pintor | undefined = grupos && outfit
    ? (img) => recolore(img, grupos, outfit)
    : undefined;

  let walk: DirAnim;
  try {
    walk = await fatia(p('walk'), pack.cell, pintar);
  } catch {
    return null; // sem ciclo de passos não há o que mostrar — cai no MiniWorld
  }

  const [idle, hurt, death, sword, dagger, spear, bow, staff] = await Promise.all([
    fatiaOpcional(p('idle'), pack.cell, pintar),
    fatiaOpcional(p('hurt'), pack.cell, pintar),
    fatiaOpcional(p('death'), pack.cell, pintar),
    fatiaOpcional(p('attack_sword'), pack.cell, pintar),
    fatiaOpcional(p('attack_dagger'), pack.cell, pintar),
    fatiaOpcional(p('attack_spear'), pack.cell, pintar),
    fatiaOpcional(p('attack_bow'), pack.cell, pintar),
    fatiaOpcional(p('attack_staff'), pack.cell, pintar),
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
    scale: pack.targetH / pack.contentH,
    anchorX: pack.centerX / pack.cell,
    anchorY: pack.feetY / pack.cell,
    labelTop: -pack.targetH + 26,
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
  // A tira de arma tem a mesma célula e o mesmo layout de linhas do corpo
  // desarmado, por construção do `armas2strip.mjs` — daí a medida do PixelLab.
  const c = PACK_PIXELLAB.cell;
  const [walk, pose, attack, idle] = await Promise.all([
    fatiaOpcional(p('walk'), c), fatiaOpcional(p('pose'), c),
    fatiaOpcional(p('attack_sword'), c), fatiaOpcional(p('idle'), c),
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
  // 🔴 A célula sai do PACK DA CLASSE, não de uma constante do módulo. Desde que
  // o Knight voltou ao pack antigo (60 px) e as outras três seguem no PixelLab
  // (64), um número fixo aqui recortaria o retrato de alguém pela metade.
  const pack = COM_CAMADA.has(cls) ? { ...PACK_PIXELLAB, base: BASE_LAYERED } : packDe(cls);
  const s = boxPx / pack.cell;
  const peca = COM_CAMADA.has(cls) ? ARMA_DO_RETRATO[cls] : undefined;
  const urls = [
    ...(peca ? [`url('${pack.base}/${cls}/arma-${peca}-pose.png')`] : []),
    `url('${pack.base}/${cls}/pose.png')`,
  ];
  const tamanho = `${pack.cell * s}px ${pack.cell * 4 * s}px`;
  return (
    `background-image:${urls.join(',')};image-rendering:pixelated;` +
    `background-repeat:no-repeat;background-position:0 0;` +
    `background-size:${urls.map(() => tamanho).join(',')};`
  );
}
