/**
 * Carregador dos sprites de **CRISTAL / MINÉRIO** (pack top-down da CraftPix,
 * recortado para `client/public/assets/crystals/`).
 *
 * ## 🔴 A cor do nó vem do BIOMA, não do item
 *
 * A primeira versão amarrava a cor ao `ItemDef.color` do catálogo: minério era
 * sempre o cristal escuro azulado, em qualquer lugar do mundo. O dono viu em
 * tela e recusou, com razão — *"o cristal azul não precisa estar nesse bioma,
 * pode ir para o gelo; aqui devem ficar os mais 'natureza', cor marrom"*.
 *
 * A regra que saiu disso vale além do minério: **pedra tem a cor do chão de onde
 * é arrancada.** Ocre nos campos, arenito no deserto, gelo no norte, obsidiana
 * no vulcânico. É a mesma ideia que já governa as árvores (`trees.ts`), e vem da
 * mesma fonte: o tile de chão embaixo do nó.
 *
 * ⚠️ O **cristal mágico continua vivo em qualquer bioma**, e isso é de propósito:
 * o `makeNodeView` justifica que "o nó mais valioso tem que puxar o olho de
 * longe — é o que paga atravessar território de Tier III". Se ele tomasse a cor
 * do chão, sumiria dentro dele. Então o minério camufla e o cristal contrasta.
 *
 * ## Tamanho
 *
 * Também relatado vendo em tela: *"os cristais estão muito grandes"*. Estavam,
 * e por dois motivos somados — o número pedido era generoso E ele mirava a
 * moldura do PNG em vez do desenho (ver `spritebox.ts`). Agora a largura vale
 * para o que se vê, e um veio de minério é **menor que a criatura que o guarda**,
 * que é a proporção certa: pedra no chão, não monumento.
 */

import { loadSpriteMedido, type SpriteMedido } from './spritebox.js';

const BASE = '/assets/crystals';

/** As cores do pack recortadas para o jogo. */
type Cor = 'yellow' | 'darkred' | 'white' | 'red' | 'black' | 'green' | 'blue' | 'violet';

/**
 * id do tile de CHÃO (ver `TILE_TYPES`) -> cor do VEIO DE MINÉRIO.
 *
 * Quem não está aqui cai em `yellow`, o ocre terroso — chão novo que apareça no
 * futuro nasce com minério comum em vez de sumir do mapa.
 */
const CHAO_MINERIO: Record<number, Cor> = {
  1: 'yellow', // grama: ocre, o "natureza" pedido pelo dono
  2: 'yellow', // terra batida
  3: 'yellow', // piso de pedra
  8: 'darkred', // areia: arenito ferruginoso
  9: 'white', // neve: quartzo gelado
  10: 'black', // rocha de montanha: veio escuro
  11: 'red', // cinza vulcânica
  12: 'green', // selva
  13: 'green', // pântano
  14: 'violet', // solo amaldiçoado
};

/** Idem para o VEIO DE CRISTAL — vivo em tudo, só troca de tom pelo bioma. */
const CHAO_CRISTAL: Record<number, Cor> = {
  9: 'blue', // no gelo o azul é o que o dono pediu
  11: 'red',
  14: 'violet',
};
const CRISTAL_PADRAO: Cor = 'violet';

/**
 * Largura do desenho **na tela**, em tiles. Ver `spritebox.ts`: vale para o
 * cristal, não para a transparência em volta dele.
 *
 * Calibre: a criatura tem 38 px (1.2 tile) e o tile tem 32 px. O minério em 0.65
 * dá **21 px** — dois terços de célula, uma pedra no chão, e é ele que aparece
 * às dezenas. O cristal fica maior porque é raro e precisa ser visto de longe.
 *
 * O caminho até aqui foi 1.15 → 0.85 → 0.5 → 0.65: os dois primeiros erraram
 * porque a escala mirava a moldura, o terceiro passou do ponto, e este é o
 * ajuste fino depois de o dono ver os dois extremos.
 *
 * ⚠️ Estes números já foram 1.15 e depois 0.85, e as duas vezes o dono disse que
 * continuava grande. Vale lembrar o porquê: enquanto a escala mirava a moldura
 * do PNG, baixar o número não baixava o desenho na mesma proporção. Desde que a
 * medição passou por `spritebox.ts`, o número aqui é o tamanho real na tela.
 */
const LARGURA_MINERIO = 0.65;
/*
 * ⚠️ O cristal encolheu SOZINHO, sem o minério ir junto (2026-08-05): o dono
 * aprovou o minério em 0.65 e disse que o cristal continuava grande. Eram 1.15,
 * depois 0.95, agora 0.7 — ainda maior que o minério, que é o que mantém "o raro
 * se vê de longe", mas sem virar monumento.
 */
const LARGURA_CRISTAL = 0.7;

/** `kind` de item -> cor do ícone na mochila. Aqui NÃO entra bioma: o item é o
 *  que é, independente de onde foi arrancado, e o ícone precisa ser constante
 *  para o jogador reconhecer a pilha na mochila. */
const ITEM_COR: Record<string, Cor> = {
  iron_ore: 'yellow', // Minério de Ferro: ocre, igual ao veio dos campos
  raw_gem: 'green', // Gema Bruta
  mana_crystal: 'violet', // Cristal de Mana
};

const nodes = new Map<Cor, SpriteMedido>();
const icones = new Map<Cor, HTMLImageElement>();

/** Carrega tudo. Chamado uma vez no `startGame`, antes de o mundo ser montado. */
export async function loadCrystals(): Promise<number> {
  const cores = new Set<Cor>([
    ...Object.values(CHAO_MINERIO),
    ...Object.values(CHAO_CRISTAL),
    CRISTAL_PADRAO,
    ...Object.values(ITEM_COR),
  ]);

  for (const cor of cores) {
    const m = await loadSpriteMedido(`${BASE}/${cor}.png`);
    if (m) nodes.set(cor, m);
    try {
      icones.set(cor, await new Promise<HTMLImageElement>((ok, erro) => {
        const im = new Image();
        // 🔴 `onload`, nunca `decode()` — em aba oculta o Chrome adia a
        // decodificação e a promessa não resolve nunca. Ver `spritebox.ts`.
        im.onload = () => ok(im);
        im.onerror = erro;
        im.src = `${BASE}/${cor}_icon.png`;
      }));
    } catch { /* sem ícone: cai no desenho por código */ }
  }

  console.log(`[crystals] ${nodes.size} cores carregadas (${[...cores].join(', ')}).`);
  return nodes.size;
}

/** O que desenhar num nó de recurso, dado a família dele e o chão embaixo. */
export interface CristalNode extends SpriteMedido {
  largura: number;
}

export function crystalNodeSprite(nodeKind: string, chaoId: number): CristalNode | null {
  if (nodeKind !== 'ore' && nodeKind !== 'crystal') return null;

  const cor = nodeKind === 'ore'
    ? CHAO_MINERIO[chaoId] ?? 'yellow'
    : CHAO_CRISTAL[chaoId] ?? CRISTAL_PADRAO;

  const m = nodes.get(cor);
  if (!m) return null;
  return { ...m, largura: nodeKind === 'ore' ? LARGURA_MINERIO : LARGURA_CRISTAL };
}

/** Imagem 16×16 para o ícone da mochila, ou `null`. */
export function crystalIconImage(itemKind: string): HTMLImageElement | null {
  const cor = ITEM_COR[itemKind];
  return cor ? icones.get(cor) ?? null : null;
}
