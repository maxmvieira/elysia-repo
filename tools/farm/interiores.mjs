/**
 * Os **interiores** da fazenda: o que se vê ao entrar no celeiro e na casa.
 *
 * ## 🔴 A colisão do interior sai do `Floor`, não do `Walls`
 *
 * Parece ao contrário e não é. O `Walls` desses dois mapas **pinta o mapa
 * inteiro** — 484 das 520 células na casa — porque o autor usou o mesmo tileset
 * (`Interior_walls_floor`) para a parede, para o piso da sala E para o fundo
 * escuro de fora. Todas opacas. Tratar "tem arte no `Walls`" como parede daria
 * uma casa maciça, sem interior nenhum.
 *
 * O `Floor` é que desenha exatamente a sala: 113 células na casa (14×8), 78 no
 * celeiro (11×7), e o formato bate com o que se vê. Então:
 *
 *   **andável = tem `Floor` e não tem móvel em cima.**
 *
 * ⚠️ Isso também quer dizer que o vão da porta do desenho não é
 * automaticamente andável — se o autor não pintou piso ali, ali é parede. É a
 * regra certa: quem decide onde se anda é quem desenhou o chão.
 *
 * ## Onde os interiores moram
 *
 * No **andar 1**, que existe no motor (`floors: { 0, 1 }` + `floorLinks`) e
 * está VAZIO desde 05/08, quando o Depósito de Lumindale foi apagado e levou
 * junto a única escada do mundo. O handoff registrou que "a próxima dungeon vai
 * estreá-lo sem rede de proteção" — quem estreia é a fazenda.
 *
 * ⚠️ Os dois interiores ficam em cantos do andar 1 que **não se sobrepõem**, e
 * não têm relação com a posição do prédio no andar 0. Isso é invisível para o
 * jogador (a troca de andar já reposiciona a câmera) e evita ter que encaixar
 * uma casa de 26×20 debaixo de um telhado de 9×6.
 */
import { lerTmx, resolveGid } from './tmx.mjs';

/**
 * 🔴 Só o celeiro e a casa têm interior — **o moinho e o galinheiro não têm, e
 * isso é do pack, não uma escolha minha.** Existem quatro portas desenhadas e
 * dois mapas de interior. As duas portas sem destino continuam abrindo (a
 * animação é da porta, não do interior) e não levam a lugar nenhum.
 *
 * ⚠️ Reaproveitar o celeiro como interior do moinho seria pior que não ter:
 * entrar numa torre de pedra e sair dentro de um celeiro de madeira quebra a
 * ilusão de forma mais barulhenta do que uma porta que só range.
 */
export const INTERIORES = [
  { nome: 'celeiro', tmx: 'assets/Farm/Tiled_files/Barn_interior.tmx', origem: { x: 163, y: 141 } },
  { nome: 'casa', tmx: 'assets/Farm/Tiled_files/House_interior.tmx', origem: { x: 163, y: 160 } },
];

/** O andar onde todos os interiores vivem. */
export const ANDAR_INTERNO = 1;

/**
 * Papel de cada camada de interior, por NOME.
 *
 * ⚠️ Aqui o nome serve (ao contrário do `Farm.tmx`, que tem três `Walls`):
 * conferido, os dois arquivos têm nomes únicos. O conversor estoura se um dia
 * deixarem de ter.
 */
const PAPEL = {
  Floor: 'piso',
  carpet: 'piso', // tapete é chão, e chão bonito
  Windows: 'enfeite',
  Walls: 'parede',
  Shelving: 'movel',
  Table: 'movel',
  Boxes1: 'movel',
  Boxes2: 'movel',
  furniture1: 'movel',
  furniture2: 'movel',
};

/**
 * Lê um interior e devolve `{ m, andavel, pouso, saida }`.
 *
 * - `pouso` é onde o jogador aparece ao entrar. **Não pode ser gatilho**, ou ele
 *   saltaria de volta para fora no mesmo instante — o motor documenta isso em
 *   `FloorLink` ("célula de pouso, que não é gatilho").
 * - `saida` é o gatilho de sair: a célula do vão, logo abaixo do pouso.
 */
export function leInterior(caminho) {
  const m = lerTmx(caminho);
  const N = m.largura * m.altura;
  const piso = new Uint8Array(N);
  const bloqueia = new Uint8Array(N);

  const vistos = new Set();
  for (const c of m.camadas) {
    if (vistos.has(c.nome)) {
      throw new Error(`${caminho}: duas camadas chamadas "${c.nome}" — a tabela PAPEL casa por nome`);
    }
    vistos.add(c.nome);
    const papel = PAPEL[c.nome];
    if (!papel) throw new Error(`${caminho}: camada "${c.nome}" sem papel em PAPEL`);
    for (let i = 0; i < c.gids.length; i++) {
      if (!c.gids[i]) continue;
      if (papel === 'piso') piso[i] = 1;
      else if (papel === 'movel') bloqueia[i] = 1;
    }
  }

  const andavel = new Uint8Array(N);
  for (let i = 0; i < N; i++) andavel[i] = piso[i] && !bloqueia[i] ? 1 : 0;

  /*
   * O vão da porta: a célula andável mais BAIXA, e a mais central entre as
   * empatadas. Nos dois mapas a porta está na parede de baixo, que é a
   * convenção do pack — a casa desenhada tem a entrada virada para o sul.
   */
  let ymax = -1;
  for (let i = 0; i < N; i++) if (andavel[i]) ymax = Math.max(ymax, (i / m.largura) | 0);
  if (ymax < 1) throw new Error(`${caminho}: não achei chão andável`);
  const naLinha = [];
  for (let x = 0; x < m.largura; x++) if (andavel[ymax * m.largura + x]) naLinha.push(x);
  const xVao = naLinha[(naLinha.length / 2) | 0];

  const saida = { x: xVao, y: ymax };
  const pouso = { x: xVao, y: ymax - 1 };
  if (!andavel[pouso.y * m.largura + pouso.x]) {
    throw new Error(`${caminho}: a célula de pouso (${pouso.x},${pouso.y}) não é andável`);
  }

  return { m, andavel, pouso, saida };
}

export { PAPEL };
