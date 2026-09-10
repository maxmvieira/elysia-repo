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
import {
  attackPoseFallback, GENDERS,
  type AttackPose, type Gender, type Hold, type PlayerClass,
} from '@dominion/shared';
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
  /**
   * A arte é a MESMA para todas as classes, e mora direto em `base` — sem a
   * subpasta por classe que os outros packs usam.
   *
   * 🔴 Entrou com o personagem universal (09/09). A alternativa era copiar a
   * mesma tira em cinco subpastas: 350 KB de binário idêntico versionado num
   * repositório que já carrega vídeo demais, e cinco arquivos para manter em
   * sincronia à mão na próxima troca de arte.
   */
  arteUnica?: boolean;
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
/**
 * 🔴 **O PERSONAGEM PRINCIPAL — trocado em 2026-09-10, a pedido do dono:**
 * *"remova os bandidos do jogo, e use o sprite dele para ser o do personagem
 * principal. Use conforme cada classe o personagem."*
 *
 * Montado por `tools/principal2strip.mjs` a partir do pack de espadachins da
 * CraftPix — o MESMO de onde saíam os bandidos, que por isso deixaram de existir
 * como criatura (`combat.ts`, `creatures.json`). Um monstro com a cara do herói
 * seria a pior confusão possível num jogo visto de cima.
 *
 * 🔴 **UMA ARTE POR CLASSE, e é a primeira vez desde 09/09.** O pack vem em nove
 * patentes e cada classe recebeu a que a ROUPA descreve, não a de número mais
 * alto: `assassin` lvl1 (o mais leve), `archer` lvl2 (couro e capa), `druid`
 * lvl3 (túnica verde), `knight` lvl6 (elmo alado e placa), `sorcerer` lvl9
 * (azul e dourado). A tabela e o porquê de cada uma estão no conversor.
 *
 * ⚠️ **`arteUnica` saiu.** A tira agora mora em `classes-principal/<classe>/`, e
 * é o `p()` de `carregaClasse` que já sabia montar esse caminho.
 *
 * 🔴 **O SEXO DEIXOU DE TROCAR O SPRITE**, e é a perda que mais se nota. O pack
 * tem um corpo só por patente; não existe variante feminina para gerar. Até
 * ontem `e.gender` escolhia entre dois bonecos (era assim desde 07/09) — agora
 * quem escolhe é a CLASSE, e `packDe` ignora o `gender` que continua recebendo.
 * ⚠️ O parâmetro ficou de propósito: os packs antigos podem voltar a usá-lo, e
 * tirá-lo da assinatura mexeria em `heroIconCss` e nos chamadores à toa.
 *
 * 🔴 **`feetY: 43` é o mesmo número do `SOLA` do conversor.** Estão em dois
 * arquivos e têm de andar juntos — mudar um sem o outro enterra ou levita o
 * boneco. ⚠️ E 43 é a **sola**, não o fundo do desenho: nas patentes vestidas a
 * capa e a bainha penduram até seis pixels abaixo do pé.
 *
 * 🔴 **`targetH` é `contentH × 2`, e o 2 é o do resto da tela.** Toda criatura
 * deste mesmo pack é desenhada a 2,0× (`CREATURE_SHEETS`, em `miniworld.ts`), e
 * o herói a 2× fica com o pixel do mesmo tamanho que o goblin ao lado — coisa
 * que o personagem anterior nunca teve. ⚠️ A escala TEM que ser inteira: em
 * escala fracionária com `nearest` cada pixel do desenho vira 2 ou 3 de tela, em
 * faixas alternadas (ver `PACK_ANTIGO`).
 *
 * ⚠️ **Ele ficou MENOR que o anterior** — 54 px de altura contra 67. É
 * consequência de valer o mesmo 2,0× das criaturas, e não um número escolhido à
 * parte; subir para 3,0× o deixaria maior que tudo no mundo.
 *
 * ⚠️ **`contentH` sai do Knight e das três leves, que medem 27.** O `sorcerer`
 * mede 30 por causa do elmo alado e por isso desenha 60 px em vez de 54 — está
 * certo, ele É mais alto. O que precisa ser igual entre as cinco é a ESCALA.
 *
 * ✅ **Ganhou `hurt` e `death` nas cinco classes** — o personagem anterior não
 * tinha nenhum dos dois, em sexo nenhum, e morrer não tombava.
 *
 * 🔴 **Perdeu as DIAGONAIS, o arco e a conjuração.** O pack traz 4 direções (o
 * anterior tinha 8) e nenhum gesto de arco ou de cajado. As três ausências caem
 * sozinhas e sem erro: a diagonal vira a cardinal vertical (`CARDINAL_OF`, em
 * `main.ts`) e as duas poses caem no golpe de espada (`attackPoseFallback`).
 *
 * ⚠️ **Nada do anterior foi apagado.** `universal2strip.mjs` e a arte em
 * `classes-universal/` continuam no disco — é o único caminho que produz arco,
 * conjuração e as oito direções, e é para lá que se volta se este pack for
 * descartado.
 */
const PACK_PRINCIPAL: Pack = {
  base: '/assets/classes-principal',
  cell: 64, contentH: 27, feetY: 43, centerX: 31.5, targetH: 54,
};

/**
 * ⚠️ **As cinco classes usam o mesmo PACK, e mesmo assim têm arte diferente** —
 * a subpasta é a classe. Foi isso que substituiu o `arteUnica` de 09/09.
 *
 * 🔴 **Nada foi apagado.** `PACK_ANTIGO` e `PACK_PIXELLAB` continuam aqui, e a
 * arte das cinco classes continua no disco. Voltar atrás é trocar as cinco
 * linhas abaixo por `knight: PACK_ANTIGO` e mais nada.
 */
const PACK_DA_CLASSE: Partial<Record<PlayerClass, Pack>> = {
  knight: PACK_PRINCIPAL,
  sorcerer: PACK_PRINCIPAL,
  archer: PACK_PRINCIPAL,
  assassin: PACK_PRINCIPAL,
  druid: PACK_PRINCIPAL,
};

/**
 * O pack desta classe.
 *
 * 🔴 **`gender` não é mais lido por nenhum pack**, desde que o principal passou
 * a ser por classe — ver o bloco de `PACK_PRINCIPAL`. Ele continua na assinatura
 * porque os chamadores o passam e porque um pack futuro pode voltar a querê-lo;
 * inventar aqui uma pasta `female/` que não existe deixaria a classe sem arte, e
 * imagem que falta cai calada no MiniWorld.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const packDe = (cls: PlayerClass, _gender: Gender = 'male'): Pack =>
  PACK_DA_CLASSE[cls] ?? PACK_PIXELLAB;

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
/**
 * 🔴 **O DRUIDA entrou aqui em 2026-09-09, e sem isso o pedido não se cumpria.**
 *
 * O pedido foi *"para todas as classes"*, e definir o pack dele em
 * `PACK_DA_CLASSE` não bastava: quem decide **se a classe tem arte** é esta
 * lista, e ela tinha quatro nomes desde que o Druida nasceu (02/09) sem arte
 * própria. Faltando aqui, ele continuaria no boneco verde do MiniWorld — com o
 * pack configurado e nunca lido, que é o tipo de meia-implementação que passa
 * despercebida.
 */
export const HERO_ART_CLASSES: ReadonlySet<PlayerClass> = new Set<PlayerClass>([
  'knight', 'sorcerer', 'archer', 'assassin', 'druid',
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
  /**
   * 🔴 **A ORDEM DAS LINHAS É CONTRATO** com `tools/universal2strip.mjs` e com
   * os conversores antigos. Trocar duas faz o personagem andar de costas para
   * onde vai, e nada no código tem como perceber.
   *
   * 🔴 **Quatro linhas ou oito** — decidido pela ALTURA da folha, não por
   * configuração. Toda a arte anterior tem quatro e continua servindo; quem
   * traz oito ganha as diagonais. Um pack não precisa declarar nada: a imagem
   * já diz o que tem.
   */
  const linhas = Math.max(1, Math.round(sheet.height / cell));
  const base: DirAnim = { down: linha(0), up: linha(1), right: linha(2), left: linha(3) };
  if (linhas < 8) return base;
  return {
    ...base,
    up_right: linha(4),
    up_left: linha(5),
    down_right: linha(6),
    down_left: linha(7),
  };
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

async function carregaClasse(
  cls: PlayerClass, outfit: Outfit | null, gender: Gender = 'male',
): Promise<HeroArt | null> {
  // ⚠️ O pack em camadas ganha do pack da classe: quem tem corpo desarmado tem
  // que ler o corpo desarmado, senão a arma seria desenhada duas vezes. Ele usa
  // as medidas do PixelLab porque saiu dele — mesma célula, mesmo chão.
  const pack = COM_CAMADA.has(cls) ? { ...PACK_PIXELLAB, base: BASE_LAYERED } : packDe(cls, gender);
  // 🔴 `arteUnica` dispensa a subpasta da classe: a mesma tira serve as cinco.
  const p = (nome: string) => (pack.arteUnica
    ? `${pack.base}/${nome}.png`
    : `${pack.base}/${cls}/${nome}.png`);

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

/** Arte HD por classe. Classe ausente do mapa cai no MiniWorld. */
export type ArtePorClasse = Partial<Record<PlayerClass, HeroArt>>;

async function carregaTodas(outfit: Outfit | null, gender: Gender): Promise<ArtePorClasse> {
  const artes = await Promise.all(
    COM_ARTE.map((c) => carregaClasse(c, outfit, gender).catch(() => null)),
  );
  const out: ArtePorClasse = {};
  COM_ARTE.forEach((c, i) => {
    const a = artes[i];
    if (a) out[c] = a;
  });
  return out;
}

/**
 * Carrega a arte HD de todas as classes, **nos dois sexos**.
 *
 * 🔴 Os dois são carregados de uma vez, e não sob demanda, porque o mundo é
 * MULTIJOGADOR: o sexo que importa não é o do jogador local, é o de cada
 * entidade no snapshot. Carregar só o próprio deixaria o personagem do outro
 * sem arte no instante em que ele aparecesse na tela — e imagem que falta cai
 * calada no MiniWorld, sem erro para investigar.
 *
 * ⚠️ O custo é pequeno porque o pack é `arteUnica`: as cinco classes
 * compartilham a mesma tira, então são **duas** tiras no total, não dez.
 */
export async function loadHeroArt(
  outfit: Outfit | null = outfitDaUrl(),
): Promise<Record<Gender, ArtePorClasse>> {
  const porSexo = await Promise.all(GENDERS.map((g) => carregaTodas(outfit, g)));
  const out = {} as Record<Gender, ArtePorClasse>;
  GENDERS.forEach((g, i) => { out[g] = porSexo[i] ?? {}; });
  for (const g of GENDERS) {
    const nomes = Object.keys(out[g]);
    if (nomes.length) console.log(`[heroes] arte HD (${g}) carregada: ${nomes.join(', ')}.`);
    else console.warn(`[heroes] nenhuma arte de classe para ${g} — usando MiniWorld.`);
  }
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
/**
 * Quais RETRATOS DE CLASSE existem em `assets/retratos/<sexo>/<classe>.png`.
 *
 * 🔴 A lista é estática de propósito. Imagem de CSS que falta **não dá erro** —
 * o cartão só fica vazio, sem nada no console. Perguntar ao disco exigiria
 * carregar dez imagens antes de desenhar a tela; declarar aqui custa uma linha
 * e falha alto quando alguém esquece de rodar `tools/retratos2card.mjs`.
 *
 * ⚠️ Gerados a partir das ilustrações do dono (07/09, 22h). Rodar o conversor
 * de novo é o que mantém esta lista honesta.
 */
const COM_RETRATO: Record<Gender, ReadonlySet<PlayerClass>> = {
  male: new Set<PlayerClass>(['knight', 'sorcerer', 'archer', 'assassin', 'druid']),
  female: new Set<PlayerClass>(['knight', 'sorcerer', 'archer', 'assassin', 'druid']),
};

export const temRetrato = (cls: PlayerClass, gender: Gender): boolean =>
  COM_RETRATO[gender].has(cls);

/**
 * Quanto o retrato é ampliado no enquadramento de BUSTO, em alturas de caixa.
 *
 * 🔴 O retrato é uma figura inteira de proporção ~1:2. Numa caixa quadrada,
 * `contain` mostraria o corpo todo com meia caixa de largura — o rosto sairia
 * com uns 10 px e não se leria nada. Ampliando 2,7× a altura, a caixa passa a
 * enquadrar o terço de cima da figura: cabeça, ombros e peito.
 *
 * ⚠️ Vale 2,7 para TODAS as classes, embora as larguras variem (110 a 136 px).
 * É de propósito: fixar a AMPLIAÇÃO mantém as cinco cabeças no mesmo tamanho,
 * enquanto fixar a largura faria a mais estreita ter a cabeça maior.
 */
const ZOOM_BUSTO = 2.7;

/**
 * CSS do retrato ilustrado da classe.
 *
 * - `'busto'` — cabeça e peito, para o cartão da lista de classes.
 * - `'palco'` — a figura inteira, para o meio da tela de criação.
 *
 * ⚠️ **`image-rendering` fica no automático, ao contrário do resto.** Estes são
 * desenhos, não pixel art: `pixelated` numa ilustração reduzida serrilha o
 * contorno inteiro. A regra de escala inteira que vale para os sprites não vale
 * aqui, e confundir as duas é o que faria a tela parecer quebrada.
 *
 * ⚠️ Ancorado embaixo no palco (`center bottom`): os retratos têm alturas de
 * conteúdo um pouco diferentes, e alinhar pelo pé mantém as cinco cabeças na
 * mesma faixa — a mesma ideia do `GROUND_Y` dos sprites, feita em CSS. No busto
 * a âncora é em cima, que é onde está o rosto.
 */
export function retratoDeClasseCss(
  cls: PlayerClass, boxPx: number, gender: Gender,
  enquadre: 'busto' | 'palco' = 'palco',
): string | null {
  if (!temRetrato(cls, gender)) return null;
  const comum =
    `background-image:url('/assets/retratos/${gender}/${cls}.png');` +
    `image-rendering:auto;background-repeat:no-repeat;`;
  return enquadre === 'busto'
    ? `${comum}background-position:center top;background-size:auto ${Math.round(boxPx * ZOOM_BUSTO)}px;`
    : `${comum}background-position:center bottom;background-size:contain;`;
}

export function heroIconCss(cls: PlayerClass, boxPx: number, gender: Gender = 'male'): string {
  // 🔴 A célula sai do PACK DA CLASSE, não de uma constante do módulo. Desde que
  // o Knight voltou ao pack antigo (60 px) e as outras três seguem no PixelLab
  // (64), um número fixo aqui recortaria o retrato de alguém pela metade.
  const pack = COM_CAMADA.has(cls) ? { ...PACK_PIXELLAB, base: BASE_LAYERED } : packDe(cls, gender);
  const s = boxPx / pack.cell;
  const peca = COM_CAMADA.has(cls) ? ARMA_DO_RETRATO[cls] : undefined;
  // 🔴 `arteUnica` também vale aqui. Sem isto o cartão da classe apontaria
  // para uma subpasta que não existe, e a tela de criação ficaria com cinco
  // retratos vazios — sem erro no console, porque imagem de CSS falha calada.
  const posePng = pack.arteUnica
    ? `${pack.base}/pose.png`
    : `${pack.base}/${cls}/pose.png`;
  const urls = [
    ...(peca ? [`url('${pack.base}/${cls}/arma-${peca}-pose.png')`] : []),
    `url('${posePng}')`,
  ];
  const tamanho = `${pack.cell * s}px ${pack.cell * 4 * s}px`;
  return (
    `background-image:${urls.join(',')};image-rendering:pixelated;` +
    `background-repeat:no-repeat;background-position:0 0;` +
    `background-size:${urls.map(() => tamanho).join(',')};`
  );
}

/**
 * 🔴 **O SPRITE DO JOGO, ANIMADO, COMO IMAGEM DE CSS** — entrou em 2026-09-10
 * a pedido do dono: *"tire os personagens que estão lá hoje... coloque os
 * bandidos que usamos hoje. (pode deixar a animação dele parado respirando, se
 * houver, no lugar)."*
 *
 * Substitui `retratoDeClasseCss` nos cartões de classe, no palco da criação e
 * na lista de personagens. Os retratos ILUSTRADOS não foram apagados — a função
 * continua exportada e a arte segue em `/assets/retratos/`, porque a troca é de
 * escolha visual e pode ser desfeita numa linha.
 *
 * ✅ **A animação é CSS puro, sem um quadro de JavaScript.** A tira `idle.png`
 * tem 12 quadros lado a lado; a caixa mostra UM, e `steps(12)` empurra o
 * `background-position` de quadro em quadro. Nada disso passa pelo laço de
 * render do Pixi, então a tela de criação continua sem custo de GPU.
 *
 * 🔴 **`background-size` cresce com a caixa, e é o que faz a conta fechar:** a
 * folha inteira é dimensionada para `12 × caixa` de largura e `4 × caixa` de
 * altura, então cada célula ocupa exatamente uma caixa. O deslocamento final da
 * animação é `-12 × caixa`, ou seja a tira inteira.
 *
 * ⚠️ **`steps(12)` e não `steps(12, end)` por acaso:** com a variante padrão o
 * primeiro quadro aparece imediatamente e o último dura o seu tempo antes de
 * voltar ao zero. Qualquer outra faz um dos doze piscar mais curto que os
 * outros, e a respiração ganha um tranco.
 *
 * ⚠️ **A LINHA é a 0 (`down`), sempre.** É a única que olha para a câmera, e
 * numa tela de menu o personagem tem de encarar quem escolhe.
 *
 * @param linha Linha da tira a mostrar. O padrão (0) é o de frente; as outras
 *   existem porque a mesma função serve um dia a uma prévia que gira.
 */
export function heroIdleCss(
  cls: PlayerClass, boxPx: number, gender: Gender = 'male', linha = 0,
): string {
  const pack = packDe(cls, gender);
  const url = pack.arteUnica
    ? `${pack.base}/idle.png`
    : `${pack.base}/${cls}/idle.png`;
  /*
   * ⚠️ A contagem de quadros é CONSTANTE aqui, e no conversor ela é medida.
   * São 12 nas nove patentes do pack de espadachim, e o `principal2strip.mjs`
   * imprime a contagem a cada build — se um pack futuro vier com outra, a
   * animação anda em passo errado e o número a corrigir é este.
   */
  const quadros = 12;
  /*
   * 🔴 **O ENQUADRAMENTO É PELO CONTEÚDO, NÃO PELA CÉLULA**, e a diferença é
   * enorme: o personagem ocupa 27 px de uma célula de 64, ou seja 42 % dela.
   * Encaixando a célula inteira na caixa, um medalhão de 52 px mostrava um
   * boneco de 22 — visto em tela, parecia um erro de carregamento.
   *
   * Ampliando até o CONTEÚDO ocupar a fração abaixo, o resto da célula
   * simplesmente transborda da caixa (que é `overflow: hidden` pelo medalhão)
   * e o personagem chega no tamanho que a caixa promete.
   */
  const OCUPACAO = 0.8;
  const escala = (boxPx * OCUPACAO) / pack.contentH;
  /*
   * 🔴 **Centrar é levar o centro do PERSONAGEM ao centro da caixa**, e o
   * centro dele não é o centro da célula: verticalmente ele vai da sola
   * (`feetY`) para cima por `contentH`, então o meio está meia altura acima do
   * pé. Usar `cell / 2` cortaria a cabeça e sobraria vão embaixo.
   */
  const meioY = pack.feetY - pack.contentH / 2;
  const x0 = boxPx / 2 - pack.centerX * escala;
  const y0 = boxPx / 2 - meioY * escala - linha * pack.cell * escala;
  return (
    `background-image:url('${url}');image-rendering:pixelated;`
    + `background-repeat:no-repeat;`
    + `background-size:${(pack.cell * quadros * escala).toFixed(2)}px ${(pack.cell * 4 * escala).toFixed(2)}px;`
    + `background-position:${x0.toFixed(2)}px ${y0.toFixed(2)}px;`
    + `--quadros-x0:${x0.toFixed(2)}px;`
    + `--quadros-x:${(x0 - pack.cell * quadros * escala).toFixed(2)}px;`
    + `animation:respira-${quadros} 1.6s steps(${quadros}) infinite;`
  );
}

/**
 * 🔴 **A CARINHA: o rosto do personagem, PARADO** — pedido do dono em
 * 2026-09-11, corrigindo o que entrei em 10/09: *"está a animação do
 * personagem. eu preciso apenas da imagem estática ali dentro do ícone, não a
 * animação. Tem que ser um ícone da carinha de um personagem estático, sem
 * mexer, e dentro do enquadramento igual aos demais menus."*
 *
 * Três diferenças em relação ao `heroIdleCss`, e cada uma é um pedaço do
 * pedido:
 *
 * | | `heroIdleCss` | aqui |
 * |---|---|---|
 * | Folha | `idle.png`, 12 quadros | **`pose.png`, 1 quadro** |
 * | Movimento | `animation: respira` | **nenhum** |
 * | Enquadramento | o corpo inteiro | **cabeça e ombros** |
 *
 * ✅ **`pose.png` em vez de `idle.png` não é detalhe de otimização.** Parar a
 * animação numa tira de doze quadros exigiria travar o `background-position`
 * num deles, e qualquer regra futura que reative a animação voltaria a mexer.
 * Apontando para a folha de um quadro só, "sem mexer" passa a ser propriedade
 * do ARQUIVO, e não de uma regra que alguém pode desfazer sem perceber.
 *
 * 🔴 **"Carinha" é o rosto, e por isso o corte é diferente.** O sprite tem 27 px
 * de altura, dos quais a cabeça é a fatia de cima; mostrar o corpo inteiro num
 * botão de 34 px daria um bonequinho de 12 px, ilegível. `FATIA_ROSTO`
 * enquadra a parte de cima, que é o que um retrato mostra.
 */
export function heroRostoCss(cls: PlayerClass, boxPx: number, gender: Gender = 'male'): string {
  const pack = packDe(cls, gender);
  const url = pack.arteUnica ? `${pack.base}/pose.png` : `${pack.base}/${cls}/pose.png`;
  /**
   * Que fração da altura do personagem é "rosto" para efeito de retrato.
   *
   * ⚠️ Meio corpo, e não só a cabeça: a cabeça sozinha (uns 0,3) cortaria o
   * elmo do Knight e a gola do Feiticeiro, que é justamente o que distingue uma
   * classe da outra num ícone deste tamanho.
   */
  const FATIA_ROSTO = 0.55;
  const alturaRosto = pack.contentH * FATIA_ROSTO;
  const escala = (boxPx * 0.96) / alturaRosto;
  // O topo do conteúdo, e daí o meio da fatia que vira retrato.
  const topo = pack.feetY - pack.contentH;
  const meioY = topo + alturaRosto / 2;
  return (
    `background-image:url('${url}');image-rendering:pixelated;`
    + `background-repeat:no-repeat;`
    + `background-size:${(pack.cell * escala).toFixed(2)}px ${(pack.cell * 4 * escala).toFixed(2)}px;`
    + `background-position:${(boxPx / 2 - pack.centerX * escala).toFixed(2)}px `
    + `${(boxPx / 2 - meioY * escala).toFixed(2)}px;`
  );
}
