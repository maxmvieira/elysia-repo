/**
 * Arte de ITEM: a das folhas do dono e a dos packs de pixel art.
 *
 * 🔴 **O desenho por código continua vivo, e é ele que cobre o catálogo
 * inteiro.** São 277 itens; o que tem arte aqui são os 4 da folha do dono e os
 * 210 equipamentos. O resto — os 61 de espólio e as moedas — continua saindo do
 * `itemIconCanvas`, com forma pelo slot e cor pelo item.
 *
 * ⚠️ Pré-carregado como os cristais (`crystals.ts`), e pelo mesmo motivo: quem
 * consome é o `itemIconCanvas`, que desenha de forma SÍNCRONA. Uma imagem que
 * chegasse depois seria desenhada em cima de um canvas que já virou data-URL e
 * já está no cache — o ícone só apareceria no próximo item do mesmo tipo.
 */

import { ITEMS } from '@dominion/shared';

import PACKS from './itens-packs.json';

const BASE = '/assets/hud/icones';
const BASE_EQUIP = '/assets/hud/itens';

/**
 * Item → arquivo, para os quatro que saíram da folha do dono.
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

/**
 * 🔴 **OS 210 EQUIPAMENTOS, por FAMÍLIA e não um a um.**
 *
 * Escolher ícone para 210 itens à mão seria um dia de trabalho e um erro por
 * linha. O que torna isso desnecessário é uma coincidência feliz entre as duas
 * pontas:
 *
 *   - no CATÁLOGO, os itens de cada família estão declarados em ordem de tier
 *     ("espada_enferrujada" primeiro, "espada_primordial" por último);
 *   - nos PACKS, cada fileira de dez é um tipo de arma ou peça, e vai do
 *     simples ao ornamentado — madeira e ferro à esquerda, chama e cristal à
 *     direita.
 *
 * ✅ Então basta ESTICAR uma ordem sobre a outra: o primeiro item da família
 * pega o primeiro ícone da faixa, o último pega o último, e o meio se
 * distribui. A espada enferrujada sai enferrujada e a primordial sai flamejante
 * sem ninguém escolher nada.
 *
 * ⚠️ **A ordem do catálogo é, portanto, CONTRATO.** Inserir uma espada nova no
 * meio da lista desloca o ícone de todas as seguintes — o que costuma ser o
 * certo (o tier novo entra no lugar certo da progressão), mas é bom saber que
 * mexer na ordem mexe na arte.
 *
 * ⚠️ Quando a família tem mais itens que ícones, dois vizinhos repetem um
 * desenho. É preferível a deixar metade da família sem arte, e são vizinhos de
 * TIER — os dois mais parecidos que existem na lista.
 */
type Alias = keyof typeof PACKS;

const FAMILIAS: ReadonlyArray<{
  nome: string;
  casa: (id: string) => boolean;
  faixas: ReadonlyArray<readonly [Alias, number, number]>;
}> = [
  // ⚔️ Armas brancas.
  /*
   * ⚠️ Cinco espadas NÃO se chamam "espada_": gládio, sabre, falcata, claymore
   * e katana. Sem elas na lista a família saía com dez itens em vez de quinze,
   * e as cinco caíam no ícone desenhado por código — no meio de uma fileira
   * que já estava toda em pixel art.
   */
  {
    nome: 'espada',
    casa: (id) => id.startsWith('espada_')
      || ['gladio', 'sabre', 'falcata', 'claymore', 'katana', 'short_sword'].includes(id),
    faixas: [['w1', 1, 20]],
  },
  { nome: 'machado', casa: (id) => id.startsWith('machado_') || id === 'hand_axe', faixas: [['w1', 81, 90], ['w2', 41, 50]] },
  { nome: 'maça', casa: (id) => id.startsWith('maca_') || id === 'mangual' || id === 'club', faixas: [['w1', 51, 60], ['w2', 61, 70]] },
  { nome: 'lança', casa: (id) => id.startsWith('lanca_') || ['pique', 'alabarda', 'spear'].includes(id), faixas: [['w1', 41, 50], ['w2', 31, 40]] },
  { nome: 'adaga', casa: (id) => id.startsWith('adaga_') || ['faca', 'punhal', 'dagger'].includes(id), faixas: [['w2', 1, 10]] },
  // 🏹 À distância.
  { nome: 'arco', casa: (id) => id.startsWith('arco_') || id === 'short_bow', faixas: [['w1', 31, 40]] },
  { nome: 'besta', casa: (id) => id.startsWith('besta_') || id === 'light_crossbow', faixas: [['w1', 21, 30]] },
  // 🔮 Mágicas.
  { nome: 'cajado', casa: (id) => id.startsWith('cajado_') || id === 'apprentice_staff', faixas: [['w1', 71, 80]] },
  { nome: 'varinha', casa: (id) => id.startsWith('varinha_'), faixas: [['w1', 91, 100]] },
  /*
   * ⚠️ Grimório e livro ocupam o slot de ESCUDO no jogo (é a mão de fora do
   * mago), mas o desenho tem de ser livro. Vêm antes do escudo na lista porque
   * a primeira família que casa leva o item.
   */
  { nome: 'livro', casa: (id) => id.startsWith('grimorio_') || id.startsWith('livro_'), faixas: [['mb', 1, 50]] },
  { nome: 'escudo', casa: (id) => id.startsWith('escudo_') || id === 'wooden_shield', faixas: [['w1', 61, 70]] },
  /*
   * 🛡️ Vestimenta. As faixas saltam fileiras porque a folha alterna peito,
   * perna e cabeça em vez de agrupá-las — cada salto é uma fileira do mesmo
   * tipo mais adiante na folha.
   */
  { nome: 'elmo', casa: (id) => ehSlot(id, 'helmet'), faixas: [['a1', 1, 10], ['a1', 31, 40], ['a1', 61, 70]] },
  { nome: 'peito', casa: (id) => ehSlot(id, 'armor'), faixas: [['a1', 11, 20], ['a1', 41, 50], ['a1', 71, 90]] },
  { nome: 'perna', casa: (id) => ehSlot(id, 'pants'), faixas: [['a1', 21, 30], ['a1', 51, 60]] },
  { nome: 'bota', casa: (id) => ehSlot(id, 'boots'), faixas: [['a1', 91, 100]] },
  /*
   * 💍 Adorno. No pack, anel são as quatro primeiras fileiras e amuleto as duas
   * últimas; o meio é brinco, que o jogo não tem.
   */
  { nome: 'anel', casa: (id) => ehSlot(id, 'ring'), faixas: [['rg', 1, 40]] },
  { nome: 'amuleto', casa: (id) => ehSlot(id, 'necklace'), faixas: [['rg', 81, 100]] },
  /*
   * 🎒 Recipiente. A folha tem bolsinha na segunda fileira e mochila nas duas
   * seguintes, e são exatamente essas trinta que a família atravessa: a bolsa
   * inicial sai pequena e o pacote de viajante sai a maior de todas.
   */
  { nome: 'mochila', casa: (id) => ehSlot(id, 'container'), faixas: [['th', 11, 40]] },
];

function ehSlot(id: string, slot: string): boolean {
  return (ITEMS[id] as { slot?: string } | undefined)?.slot === slot;
}

/** Monta item → arquivo, esticando a ordem do catálogo sobre a das faixas. */
const EQUIP: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  const equips = Object.keys(ITEMS).filter(
    (k) => (ITEMS[k] as { category?: string } | undefined)?.category === 'equip',
  );
  const tomados = new Set<string>();
  for (const f of FAMILIAS) {
    const ids = equips.filter((id) => !tomados.has(id) && f.casa(id));
    if (!ids.length) continue;
    const icones: string[] = [];
    for (const [alias, de, ate] of f.faixas) {
      const teto = Math.min(ate, PACKS[alias]);
      for (let n = de; n <= teto; n++) icones.push(`${alias}_${String(n).padStart(3, '0')}`);
    }
    if (!icones.length) continue;
    ids.forEach((id, i) => {
      /*
       * ⚠️ O passo divide por `ids.length - 1` para o ÚLTIMO item cair no
       * último ícone. Com `ids.length` o topo da família nunca alcançaria a
       * ponta ornamentada da fileira — a arma primordial sairia com cara de
       * penúltima.
       */
      const k = ids.length === 1 ? 0 : Math.round((i * (icones.length - 1)) / (ids.length - 1));
      out[id] = icones[Math.min(k, icones.length - 1)]!;
      tomados.add(id);
    });
  }
  return out;
})();

const imagens = new Map<string, HTMLImageElement>();

/** Carrega a arte de item da folha do dono. Chamado uma vez no `startGame`. */
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

/**
 * A imagem do item, ou `null` quando não há — e aí vale o desenho por código.
 *
 * ⚠️ Só serve à arte da FOLHA, que é a pré-carregada. O equipamento não passa
 * por aqui: ele é sempre mostrado num `<img>`, e quem o busca é `itemArtUrl`.
 */
export function itemArtImage(kind: string): HTMLImageElement | null {
  const nome = arquivoDe(kind);
  return nome ? imagens.get(nome) ?? null : null;
}

/**
 * O CAMINHO da arte, para quem mostra o item num `<img>`.
 *
 * 🔴 **Existe para a arte não passar pelo canvas de 28 px.** O
 * `itemIconCanvas` desenha tudo nesse tamanho — é o que o ícone por código
 * precisa —, e enfiar ali um PNG grande jogava fora quatro quintos dele antes
 * de a tela ver. Num `<img>` o navegador reduz a partir do original.
 */
export function itemArtUrl(kind: string): string | null {
  const nome = arquivoDe(kind);
  if (nome) return `${BASE}/${nome}.png`;
  const equip = EQUIP[kind];
  return equip ? `${BASE_EQUIP}/${equip}.png` : null;
}
