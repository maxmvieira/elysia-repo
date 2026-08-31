/**
 * Deriva a colisão da Farm a partir das camadas. **Uma implementação só**, usada
 * pelo conversor (`build.mjs`) e pelo preview de conferência (`overlay.mjs`) —
 * se as duas divergissem, o overlay passaria a mentir, que é o pior defeito
 * possível numa ferramenta que existe para conferir.
 */
import { resolveGid } from './tmx.mjs';
import { CAMADAS, papelDaCelula } from './layers.mjs';

/**
 * 🔴 **As camadas do POMAR, as únicas em que só o tronco bloqueia.**
 *
 * A regra do tronco é geométrica: sólida a célula de árvore que **não tem outra
 * árvore logo abaixo** — a silhueta de baixo de cada mancha. A copa fica andável
 * e é desenhada por cima do jogador, então passar pelo pomar esconde o
 * personagem atrás das folhas em vez de fazê-lo pisar nelas.
 *
 * Ela existe por uma razão medida: com o pomar sólido célula a célula, as copas
 * encostadas fecham cada canteiro e **duas hortas (65 e 18 células) ficam
 * ilhadas** no meio da fazenda, visíveis e sem rota.
 *
 * ⚠️ **As árvores de BORDA saíram desta lista em 30/08** e voltaram a ser
 * sólidas inteiras (`solido: true` no `layers.mjs`). O tronco só bastava para
 * árvore isolada; na cerca-viva de 3 células de altura que fecha a fazenda, ele
 * deixava entrar pela lateral e ficar de pé no meio da folhagem — foi o
 * *"estou conseguindo passar dentro de uma árvore"* que o dono relatou.
 *
 * ⚠️ A união é entre as duas camadas do pomar, não uma por vez: `Trees` e
 * `Trees2` são duas metades do mesmo pomar (os mesmos 80 tiles), e olhar uma
 * sozinha marcaria tronco no meio da copa da outra.
 */
export const CAMADAS_DE_ARVORE = new Set([48, 49]);

/**
 * 🔴 **A célula do TRONCO: a que bloqueia, e a que fica SOB o jogador.**
 *
 * É a fileira de baixo da mancha da árvore — "árvore sem árvore logo abaixo".
 * A mesma pergunta responde duas coisas, e é por isso que ela mora aqui sozinha:
 *
 * - **colisão:** o tronco barra, a copa não (senão cada canteiro do pomar vira
 *   um bloco maciço e duas hortas ficam ilhadas);
 * - **desenho:** o tronco vai para `baixo` e a copa para `acima`.
 *
 * O segundo uso entrou em 31/08, com o relato do dono: *"o personagem está
 * passando embaixo do pé das árvores"*. E estava — a camada inteira era
 * `acima`, então o herói parado ao lado do pé sumia atrás das raízes. Passar
 * ATRÁS da copa é o efeito pedido; passar atrás do TRONCO é o bug.
 */
export function ehTronco(arvore, largura, i) {
  if (!arvore[i]) return false;
  const abaixo = i + largura;
  return abaixo >= arvore.length || !arvore[abaixo];
}

/**
 * 🔴 **TILE TRANSPARENTE NUNCA BLOQUEIA.** É a regra mais simples deste arquivo
 * e a que consertou mais coisa de uma vez.
 *
 * O autor preencheu várias camadas com tiles **totalmente vazios** — não é
 * descuido, é como se pinta no Tiled: seleciona-se um retângulo do tileset e
 * carimba-se, e o retângulo carrega as células em branco junto. A camada
 * `Walls (casa)` cobre a linha 10 inteira em frente à casa com tiles que não
 * desenham um pixel; a `animal buildings` faz o mesmo no quintal.
 *
 * Sem esta regra, a **escada da varanda ficava sólida e a porta da frente da
 * casa virava uma ilha de 4 células** — o jogador via a porta, ela abria quando
 * ele passava perto, e não havia rota para entrar. O conversor pegou isso
 * sozinho ao exigir um pouso andável do lado de fora.
 *
 * ⚠️ E vale para tudo, não só para a casa: parede que não se vê não é parede.
 */
function fazMedidorDeVazio(decodePng) {
  const cache = new Map();
  return (ts, local) => {
    const chave = `${ts.nome}#${local}`;
    const guardado = cache.get(chave);
    if (guardado !== undefined) return guardado;
    if (!cache.has(ts.imagem)) cache.set(ts.imagem, decodePng(ts.imagem));
    const img = cache.get(ts.imagem);
    const sx = (local % ts.colunas) * ts.tileW;
    const sy = Math.floor(local / ts.colunas) * ts.tileH;
    let vazio = true;
    for (let y = 0; y < ts.tileH && vazio; y++) {
      for (let x = 0; x < ts.tileW; x++) {
        if (img.px[((sy + y) * img.w + sx + x) * 4 + 3] > 8) { vazio = false; break; }
      }
    }
    cache.set(chave, vazio);
    return vazio;
  };
}

/**
 * Devolve `{ solido, agua, porta, acima }`, todos `Uint8Array` de
 * `largura × altura`, mais `portaPorNome` com as células de cada porta.
 *
 * `decodePng` é injetado (e não importado) para o módulo não depender do codec:
 * quem chama já tem as imagens abertas e passa o mesmo cache.
 */
export function derivaColisao(m, decodePng) {
  const N = m.largura * m.altura;
  const solido = new Uint8Array(N);
  const agua = new Uint8Array(N);
  const porta = new Uint8Array(N);
  const arvore = new Uint8Array(N);
  const portaPorNome = new Map();
  const ehVazio = fazMedidorDeVazio(decodePng);

  for (const camada of m.camadas) {
    const papel = CAMADAS[camada.id];
    const ehArvore = CAMADAS_DE_ARVORE.has(camada.id);
    for (let i = 0; i < camada.gids.length; i++) {
      const gid = camada.gids[i];
      if (!gid) continue;
      const { ts, local } = resolveGid(m.tilesets, gid);
      // Tile sem um pixel opaco não opina sobre colisão nenhuma.
      if (ehVazio(ts, local)) continue;
      if (ehArvore) {
        // Árvore não decide colisão aqui: fica para a passada dos troncos.
        arvore[i] = 1;
        continue;
      }
      switch (papelDaCelula(papel, ts.nome, local)) {
        case 'solido': solido[i] = 1; break;
        case 'agua': agua[i] = 1; break;
        // Chão apaga água, mas NÃO apaga sólido — a tigela não fura a parede.
        case 'chao': agua[i] = 0; break;
        default: break;
      }
      if (papel.porta) {
        porta[i] = 1;
        if (!portaPorNome.has(papel.porta)) portaPorNome.set(papel.porta, []);
        portaPorNome.get(papel.porta).push(i);
      }
    }
  }

  // Tronco = árvore sem árvore logo abaixo (a silhueta de baixo da mancha).
  for (let i = 0; i < N; i++) if (ehTronco(arvore, m.largura, i)) solido[i] = 1;

  // A porta ganha de tudo: o vão tem que ser andável, senão não se entra.
  for (let i = 0; i < N; i++) if (porta[i]) { solido[i] = 0; agua[i] = 0; }

  // Ordem de desenho: quem é `acima` fica sobre o jogador.
  const acima = new Uint8Array(N);
  for (const camada of m.camadas) {
    if (!CAMADAS[camada.id].acima) continue;
    for (let i = 0; i < camada.gids.length; i++) if (camada.gids[i]) acima[i] = 1;
  }

  return { solido, agua, porta, acima, arvore, portaPorNome };
}

/** As ilhas andáveis, maior primeiro. Serve para achar horta sem rota. */
export function ilhasAndaveis(m, { solido, agua }) {
  const N = m.largura * m.altura;
  const andavel = (i) => !solido[i] && !agua[i];
  const vis = new Uint8Array(N);
  const ilhas = [];
  for (let s = 0; s < N; s++) {
    if (vis[s] || !andavel(s)) continue;
    const fila = [s]; vis[s] = 1; const cels = [];
    while (fila.length) {
      const i = fila.pop(); cels.push(i);
      const x = i % m.largura, y = (i / m.largura) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.largura || ny >= m.altura) continue;
        const j = ny * m.largura + nx;
        if (vis[j] || !andavel(j)) continue;
        vis[j] = 1; fila.push(j);
      }
    }
    ilhas.push(cels);
  }
  ilhas.sort((a, b) => b.length - a.length);
  return ilhas;
}
