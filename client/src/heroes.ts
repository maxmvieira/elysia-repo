/**
 * Carregador da ARTE DE CLASSE HD — as quatro classes jogáveis.
 *
 * Substitui, para quem tem pack, os bonecos 16x16 do MiniWorld (`miniworld.ts`)
 * e a arte antiga só-do-Knight (`knight.ts`). O que chega aqui já passou pelo
 * `tools/frames2strip.mjs`: os 843 quadros soltos dos packs viraram **tiras**,
 * uma por animação, com uma LINHA por direção — o mesmo formato do MiniWorld,
 * de propósito, para o corte ser o mesmo código de sempre.
 *
 * Se faltar qualquer coisa, o carregador devolve `null` e o jogo cai no
 * MiniWorld. Nada aqui pode derrubar o carregamento: é arte.
 *
 * Fonte dos arquivos: `arte-fonte/classes/`, versionado. Para regerar as tiras:
 *
 *   npm run sprites:build
 */

import { Assets, Rectangle, Texture } from 'pixi.js';
import { attackPoseFallback, type AttackPose, type PlayerClass } from '@dominion/shared';
import type { DirAnim } from './miniworld.js';

const BASE = '/assets/classes';

/** Lado da célula nas tiras. Todos os cinco packs vieram em 60x60. */
const CELL = 60;

/**
 * Altura de tela que o CONTEÚDO do herói deve ocupar (~2 tiles). Não confundir
 * com a célula: dos 60 px do quadro, só ~30 são desenho — o resto é a
 * transparência que o gerador deixa em volta.
 *
 * 🔴 **60 e não 64, e isso NÃO é gosto: 60/30 = 2,0× exato.**
 *
 * Era 64, o que dava 2,133×. Numa escala fracionária com filtragem `nearest`,
 * cada pixel do desenho vira 2 pixels de tela ou 3, em faixas alternadas — a
 * silhueta sai picotada, e é o defeito que mais salta aos olhos na arte de
 * classe. Com 2× a ampliação é uniforme.
 *
 * ⚠️ Quem mexer aqui tem que fechar a conta com `CONTENT_H`: **`TARGET_H` tem
 * que ser múltiplo inteiro dele.** Arte nova com conteúdo de 64 px (ver
 * `docs/SPEC-SPRITES-CLASSES.md`) fecha em 1,0×, que é melhor ainda.
 *
 * O preço são 4 px de herói, que ninguém nota; o serrilhado, nota.
 */
const TARGET_H = 60;

/**
 * Medidas do bounding box de ALPHA, não da moldura do PNG.
 *
 * 🔴 É a lição que o `spritebox.ts` já tinha aprendido à força: tratar o quadro
 * como se fosse a arte fez a árvore boiar acima da sombra e tudo sair com metade
 * do tamanho pedido. Medido nos cinco packs, o conteúdo mora em y 15..44 e o
 * centro horizontal fica entre x 27,5 e 32 conforme a direção — a variação é a
 * arma esticada para um lado.
 *
 * ⚠️ A âncora é **uma só para as quatro direções** porque `makeMiniActor` aceita
 * um valor só. Usar a média (29,5) espalha o erro em ±2,5 px de quadro; ancorar
 * pela direção de frente jogaria os 5 px inteiros nas laterais, e o personagem
 * daria um pulinho lateral toda vez que virasse.
 *
 * 🔴 **`FEET_Y` deixou de ser um chute: o conversor GARANTE a sola nesta linha.**
 * `tools/frames2strip.mjs` mede o chão de cada quadro e desce/sobe o quadro
 * inteiro para o pé cair em `GROUND_Y = 44`. Mudar um dos dois sem o outro
 * enterra ou levanta as quatro classes de uma vez. O chão vinha entre 42 e 45
 * conforme o quadro, e era isso que fazia o herói tremer ao andar.
 *
 * ⚠️ **`CENTER_X` continua sendo média medida, e é de propósito.** O centro
 * horizontal varia 3 a 5 px dentro do ciclo de passos, mas essa variação é a
 * PERNA ALTERNANDO — normalizá-la como se fosse erro congelaria a caminhada.
 */
const CONTENT_H = 30;
const FEET_Y = 44;
const CENTER_X = 29.5;

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
async function fatia(path: string): Promise<DirAnim> {
  const sheet = await Assets.load<Texture>(path);
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

/** Tenta cortar uma tira opcional. Ausente vira `undefined`, sem barulho. */
async function fatiaOpcional(path: string): Promise<DirAnim | undefined> {
  try {
    return await fatia(path);
  } catch {
    return undefined;
  }
}

async function carregaClasse(cls: PlayerClass): Promise<HeroArt | null> {
  const p = (nome: string) => `${BASE}/${cls}/${nome}.png`;
  let walk: DirAnim;
  try {
    walk = await fatia(p('walk'));
  } catch {
    return null; // sem ciclo de passos não há o que mostrar — cai no MiniWorld
  }

  const [idle, hurt, death, sword, dagger, spear, bow, staff] = await Promise.all([
    fatiaOpcional(p('idle')),
    fatiaOpcional(p('hurt')),
    fatiaOpcional(p('death')),
    fatiaOpcional(p('attack_sword')),
    fatiaOpcional(p('attack_dagger')),
    fatiaOpcional(p('attack_spear')),
    fatiaOpcional(p('attack_bow')),
    fatiaOpcional(p('attack_staff')),
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

/**
 * Carrega a arte HD de todas as classes que tiverem pack. Classe sem arte
 * simplesmente não aparece no mapa devolvido, e o chamador cai no MiniWorld.
 */
export async function loadHeroArt(): Promise<Partial<Record<PlayerClass, HeroArt>>> {
  const artes = await Promise.all(COM_ARTE.map((c) => carregaClasse(c).catch(() => null)));
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
 * porque o conteúdo tem 30 px de altura numa célula de 60 e o herói inteiro já
 * fica legível no tamanho do cartão.
 */
export function heroIconCss(cls: PlayerClass, boxPx: number): string {
  const s = boxPx / CELL;
  return (
    `background-image:url('${BASE}/${cls}/pose.png');image-rendering:pixelated;` +
    `background-repeat:no-repeat;background-position:0 0;` +
    `background-size:${CELL * s}px ${CELL * 4 * s}px;`
  );
}
