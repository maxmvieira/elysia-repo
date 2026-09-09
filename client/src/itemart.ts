/**
 * Arte de ITEM recortada das folhas do dono, para os poucos itens que têm uma.
 *
 * 🔴 **A maioria dos itens continua sendo DESENHADA por código, e isso é o
 * certo.** O catálogo tem 277 itens — 210 deles equipamento — e o desenho por
 * código dá conta de todos: forma pelo slot, cor pelo item. A folha do dono tem
 * onze itens, dos quais quatro existem no jogo. Trocar o sistema inteiro por
 * onze desenhos seria perder 267 ícones para ganhar quatro.
 *
 * ✅ O que estes quatro têm de especial é FREQUÊNCIA: poção de vida e de mana
 * são o que o jogador mais olha, e são as únicas duas que cabem nos itens
 * rápidos. Ali a arte aparece sozinha, emoldurada pelo slot, sem nenhum ícone
 * geométrico ao lado para destoar.
 *
 * ⚠️ Pré-carregado como os cristais (`crystals.ts`), e pelo mesmo motivo: quem
 * consome é o `itemIconCanvas`, que desenha de forma SÍNCRONA. Uma imagem que
 * chegasse depois seria desenhada em cima de um canvas que já virou data-URL e
 * já está no cache — o ícone só apareceria no próximo item do mesmo tipo.
 */

const BASE = '/assets/hud/icones';

/**
 * Item → arquivo.
 *
 * ⚠️ As receitas são SETE (`recipe_common` … `recipe_relic`) e dividem o mesmo
 * pergaminho de propósito: o que distingue uma da outra é a raridade, e a
 * raridade já pinta a moldura do slot. Um pergaminho por raridade seria sete
 * desenhos para uma informação que a cor já dá.
 */
const ARTE: Record<string, string> = {
  health_potion: 'pocao_vida',
  mana_potion: 'pocao_mana',
  feather: 'pena',
};

const imagens = new Map<string, HTMLImageElement>();

/** Carrega a arte de item. Chamado uma vez no `startGame`. */
export async function loadItemArt(): Promise<number> {
  const arquivos = new Set([...Object.values(ARTE), 'pergaminho']);
  for (const nome of arquivos) {
    try {
      imagens.set(nome, await new Promise<HTMLImageElement>((ok, erro) => {
        const im = new Image();
        // 🔴 `onload`, nunca `decode()` — em aba oculta o Chrome adia a
        // decodificação e a promessa não resolve nunca. Ver `crystals.ts`.
        im.onload = () => ok(im);
        im.onerror = erro;
        im.src = `${BASE}/${nome}.png`;
      }));
    } catch { /* sem arte: cai no desenho por código */ }
  }
  return imagens.size;
}

/** O nome do arquivo de arte deste item, ou `null` quando não há. */
function arquivoDe(kind: string): string | null {
  return (kind.startsWith('recipe_') ? 'pergaminho' : ARTE[kind]) ?? null;
}

/** A imagem do item, ou `null` quando não há — e aí vale o desenho por código. */
export function itemArtImage(kind: string): HTMLImageElement | null {
  const nome = arquivoDe(kind);
  return nome ? imagens.get(nome) ?? null : null;
}

/**
 * O CAMINHO da arte, para quem mostra o item num `<img>`.
 *
 * 🔴 **Existe para a arte não passar pelo canvas de 28 px.** O
 * `itemIconCanvas` desenha tudo nesse tamanho — é o que o ícone por código
 * precisa —, e enfiar ali um PNG de 130 px jogava fora quatro quintos dele
 * antes de a tela ver. Num `<img>` o navegador reduz a partir do original.
 *
 * ⚠️ O canvas continua desenhando a arte também: quem usa é o item no CHÃO, que
 * é textura do Pixi e não elemento do DOM.
 */
export function itemArtUrl(kind: string): string | null {
  const nome = arquivoDe(kind);
  return nome ? `${BASE}/${nome}.png` : null;
}
