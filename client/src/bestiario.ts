/**
 * A arte do BESTIÁRIO — o kit de livro da CraftPix ligado às nossas espécies.
 *
 * Recortado por `npm run bestiario:build` (`tools/bestiario2ui.mjs`), que é
 * quem tem as coordenadas e a explicação de cada uma. Este módulo só decide
 * **qual espécie mostra retrato pintado e qual continua no ícone de código**.
 *
 * 🔴 **8 das 28 espécies têm retrato, e a mistura é proposital.** O pack traz
 * 20 monstros genéricos; conferidos um a um contra o nosso bestiário, só 8
 * casam de verdade. Decisão do dono em 2026-08-29, sabendo do resultado:
 * retrato pintado onde existe, ícone desenhado por código onde não existe.
 *
 * ⚠️ **A alternativa descartada era pior:** empurrar retrato parecido para
 * espécie errada — pôr o demônio de foice no Minotauro, o fantasma no Zumbi —
 * é o mesmo erro do `attackPoseFallback` de 12/08, que fazia o Knight golpear
 * de espada com qualquer arma na mão. Ícone honesto ganha de retrato mentiroso.
 */

/** Onde as peças recortadas moram em `client/public`. */
const BASE = '/assets/ui/bestiary';

/**
 * As espécies com retrato pintado.
 *
 * 🔴 É lista explícita, e não uma tentativa de carregar `retrato-<tipo>.png`
 * para todo mundo: sem ela o cliente dispararia 28 requisições no boot, 20
 * delas 404, e um `<img>` que falha mostra o ícone quebrado do navegador — bem
 * pior que o ícone de código que já temos.
 *
 * ⚠️ **Acrescentar espécie aqui exige recortar o retrato antes**, no
 * `RETRATOS` de `tools/bestiario2ui.mjs`. As duas listas têm que concordar.
 */
const COM_RETRATO: ReadonlySet<string> = new Set([
  'troll',
  'skeleton_warrior',
  'zombie',
  'goblin_warrior',
  'orc_warrior',
  'forest_spider',
  'slime_blue',
  'kobold_hunter',
]);

/** Tem retrato pintado? Quem não tem cai no ícone desenhado por código. */
export const temRetrato = (tipo: string): boolean => COM_RETRATO.has(tipo);

/** URL do retrato pintado da espécie, ou `null` se ela não tiver. */
export function retratoUrl(tipo: string): string | null {
  return COM_RETRATO.has(tipo) ? `${BASE}/retrato-${tipo}.png` : null;
}

/** As peças de moldura do livro, para o CSS montar a página. */
export const BESTIARY_ART = {
  /** Livro aberto, 272×192. É o fundo do painel inteiro. */
  page: `${BASE}/page.png`,
  /** Fita de título, 223×57. Fica sobreposta ao topo do livro. */
  ribbon: `${BASE}/ribbon.png`,
  /** Moldura de encaixe VAZADA, 28×28. O retrato entra dentro dela. */
  slot: `${BASE}/slot.png`,
  /** Plaquinha de linha, 82×12. Fundo das linhas da ficha. */
  plate: `${BASE}/plate.png`,
} as const;

/**
 * Quanto o livro é ampliado na tela.
 *
 * 🔴 **INTEIRO, pela mesma razão de sempre neste projeto:** é pixel art com
 * `image-rendering: pixelated`, e escala fracionária faz um pixel do desenho
 * virar 2 na tela e o vizinho virar 3, em faixas alternadas. 3× põe o livro em
 * 816×576, que cabe folgado numa janela de jogo.
 */
export const BOOK_SCALE = 3;

/**
 * A área de PAPEL de cada página, em pixels da arte original (272×192).
 *
 * 🔴 **Medido, não chutado** — varredura da cor do papel em `Page.png`: a
 * esquerda ocupa x 23..130 e a direita x 141..249, as duas de y 5..166. Os
 * números abaixo já vêm com recuo, porque **a folha é CURVA**: na altura do
 * meio ela é mais larga que perto da lombada e das bordas. Escrever conteúdo
 * até o limite medido o faria vazar para a capa vermelha em cima e embaixo.
 */
export const BOOK = {
  /** Tamanho da arte, antes da escala. */
  w: 272,
  h: 192,
  esquerda: { x: 30, y: 14, w: 96, h: 144 },
  direita: { x: 146, y: 14, w: 98, h: 144 },
} as const;
