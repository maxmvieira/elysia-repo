/**
 * **Construtor de mapas** — o painel da tecla `E`.
 *
 * ## O que ele é, e o que ele deliberadamente NÃO é
 *
 * É uma ferramenta de AUTORIA em jogo, para consertar aresta de cenário sem
 * abrir o Tiled, reconverter e recarregar. Pedido do dono em 31/08, depois de o
 * `/clone` + `/paste` se mostrarem lentos demais: *"escolher os sprites, girar
 * 90°, posicionar... escolher o nível que quero colocar o objeto"*.
 *
 * ⚠️ **Ele não substitui o Tiled.** O `Farm.tmx` continua sendo a fonte da
 * fazenda; o que se põe aqui é uma camada de remendos por cima, gravada no
 * banco. Reconstruir a fazenda do zero por aqui seria montar 4.400 células a
 * mão — o conversor existe justamente para não fazer isso.
 *
 * ## De onde vêm os sprites
 *
 * Da folha `farm-paleta.png`, que o `npm run farm:build` assa com os **871 tiles
 * que a fazenda realmente usa** (de mais de 10.000 nos 24 tilesets do pack).
 *
 * 🔴 **Assar é o único jeito de eles existirem aqui:** os tilesets moram em
 * `assets/`, fora de `client/public`, e o navegador não os alcança.
 *
 * ⚠️ **O índice na paleta é o que vai para o banco.** Reordenar a paleta troca o
 * desenho de tudo que já foi posicionado — por isso o conversor emite os grupos
 * em ordem estável e grupos novos entram sempre no FIM.
 */

import { Assets, Rectangle, Texture } from 'pixi.js';

const BASE = '/assets/farm';

interface GrupoJson { nome: string; inicio: number; n: number }
interface PaletaJson {
  folha: string;
  colunas: number;
  total: number;
  grupos: GrupoJson[];
  /**
   * `"x,y"` (coordenada da FAZENDA) → as peças que a compõem, **da que mais
   * ocupa a célula para a que menos ocupa**. Ver o comentário no `build.mjs`:
   * ordenar por camada devolvia a hera em vez do telhado.
   */
  celulas?: Record<string, number[]>;
}

/** O que o painel tem selecionado neste instante. */
export interface Selecao {
  paleta: number;
  rot: number;
  camada: 'chao' | 'baixo' | 'acima';
  /** O que a peça faz com o passo de quem chega nela. */
  colisao: 'nada' | 'bloqueia' | 'livre';
}

export interface Editor {
  /** Liga/desliga o painel (a tecla `E`). */
  alterna(): void;
  aberto(): boolean;
  /** Gira 90° o sprite selecionado (a tecla `R`). */
  gira(): void;
  /** `null` quando nada está selecionado — o `/ok` recusa e avisa. */
  selecao(): Selecao | null;
  /** A textura de um índice da paleta, para desenhar o que foi posicionado. */
  textura(indice: number): Texture | undefined;
  /**
   * 🔴 **"Que peça é essa?"** — recebe uma célula em coordenadas da FAZENDA e
   * seleciona no painel o que está desenhado ali, pulando para o grupo certo.
   *
   * Devolve quantas peças a célula tem, ou 0 se não tem arte. A primeira é a que
   * mais OCUPA a célula — o que se está vendo. Clicar de novo na MESMA célula
   * desce um degrau, e é assim que se alcança o chão debaixo do mato.
   */
  aponta(fx: number, fy: number): number;
}

const el = (id: string): HTMLElement => document.getElementById(id)!;

/**
 * Monta o painel. `aoPor` é chamado quando o dono clica em "pôr" — o `/ok`
 * digitado no chat entra pelo mesmo caminho, em `main.ts`.
 *
 * Devolve `null` se a paleta não estiver assada (repositório recém-clonado sem
 * `npm run farm:build`). Falha silenciosa pelo mesmo motivo da arte da fazenda:
 * quem não gerou os assets tem que conseguir jogar.
 */
export async function criaEditor(aoPor: () => void): Promise<Editor | null> {
  let dados: PaletaJson;
  try {
    const resp = await fetch(`${BASE}/farm.json`);
    if (!resp.ok) throw new Error(String(resp.status));
    const json = (await resp.json()) as { paleta?: PaletaJson };
    if (!json.paleta) throw new Error('sem paleta');
    dados = json.paleta;
  } catch {
    console.warn('[editor] paleta ausente — rode `npm run farm:build`. Construtor desligado.');
    return null;
  }

  const folha = await Assets.load<Texture>(`${BASE}/${dados.folha}`);
  folha.source.scaleMode = 'nearest';
  const T = 32;

  /*
   * As texturas são criadas SOB DEMANDA e guardadas. Criar as 871 no boot custa
   * memória e tempo por um painel que talvez nem seja aberto; e quem desenha o
   * cenário só precisa das que foram efetivamente posicionadas.
   */
  const cache = new Map<number, Texture>();
  function textura(i: number): Texture | undefined {
    if (i < 0 || i >= dados.total) return undefined;
    let t = cache.get(i);
    if (!t) {
      t = new Texture({
        source: folha.source,
        frame: new Rectangle((i % dados.colunas) * T, Math.floor(i / dados.colunas) * T, T, T),
      });
      cache.set(i, t);
    }
    return t;
  }

  // --- estado do painel ------------------------------------------------------

  const painel = el('editpanel');
  const grade = el('ed-grade');
  const gruposEl = el('ed-grupos');
  const previa = el('ed-previa');
  const btnGirar = el('ed-girar') as HTMLButtonElement;
  const selCamada = el('ed-camada') as HTMLSelectElement;
  const selColisao = el('ed-colisao') as HTMLSelectElement;

  let escolhido = -1;
  let rot = 0;
  let grupoAtual = 0;

  /*
   * 🔴 **Tamanho, posição e zoom sobrevivem à recarga**, e isso não é enfeite: o
   * fluxo de conserto é *mexe → Ctrl+Shift+R → olha*, dezenas de vezes seguidas.
   * Sem guardar, cada recarga devolvia o painel ao canto e à peça de 32 px, e
   * quem estava com a paleta grande no meio da tela tinha de refazer tudo.
   *
   * ⚠️ Tudo dentro de try/catch: `localStorage` pode estourar (janela anônima,
   * site com dados bloqueados) e um painel que não abre por causa disso seria
   * uma troca péssima.
   */
  const CHAVE = 'elysia.editor';
  interface Guardado { z?: number; w?: string; h?: string; l?: string; t?: string }
  function leGuardado(): Guardado {
    try { return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Guardado; } catch { return {}; }
  }
  function guarda(patch: Guardado): void {
    try { localStorage.setItem(CHAVE, JSON.stringify({ ...leGuardado(), ...patch })); } catch { /* ok */ }
  }

  /**
   * Os degraus de zoom da paleta.
   *
   * ⚠️ **Inteiros e meio, nunca arbitrários.** A arte é de 16 px desenhada a 2×;
   * ampliar por um fator quebrado devolve o serrilhado em faixas que assombra
   * este projeto desde 10/08. 1,5× cai em 48 px, que é múltiplo inteiro de 16 —
   * por isso ele entra e 1,25× não.
   */
  const ZOOMS = [0.5, 1, 1.5, 2, 3];
  let iz = Math.max(0, ZOOMS.indexOf(leGuardado().z ?? 1));
  if (iz < 0) iz = 1;
  const zoom = (): number => ZOOMS[iz]!;

  /**
   * Onde posicionar a folha para que a célula mostre o tile `i`.
   *
   * 🔴 Com zoom, a folha inteira é escalada (`background-size`) e o deslocamento
   * tem de escalar junto — senão a peça certa aparece cortada, meio tile fora.
   */
  const fundoDoTile = (i: number, z = zoom()): string =>
    `-${(i % dados.colunas) * T * z}px -${Math.floor(i / dados.colunas) * T * z}px`;
  const tamanhoDaFolha = (z = zoom()): string => `${dados.colunas * T * z}px auto`;

  /** Aplica o zoom: a variável CSS manda no tamanho da célula e o reflow é da grade. */
  function aplicaZoom(): void {
    const z = zoom();
    grade.style.setProperty('--ed-cell', `${Math.round(T * z)}px`);
    grade.style.backgroundSize = '';
    for (const c of grade.children) {
      const d = c as HTMLElement;
      d.style.backgroundSize = tamanhoDaFolha(z);
      d.style.backgroundPosition = fundoDoTile(Number(d.dataset.i), z);
    }
    el('ed-zoom').textContent = `${z}×`.replace('.5', ',5');
    guarda({ z });
  }

  function atualizaPrevia(): void {
    // A prévia tem tamanho FIXO (40 px): ela é o "o que vai sair", não parte da
    // grade, e mudar de tamanho junto com o zoom faria a linha de baixo pular.
    const zp = 40 / T;
    previa.style.backgroundSize = tamanhoDaFolha(zp);
    previa.style.backgroundPosition = escolhido >= 0 ? fundoDoTile(escolhido, zp) : '';
    previa.style.opacity = escolhido >= 0 ? '1' : '0.25';
    previa.style.transform = `rotate(${rot}deg)`;
    btnGirar.textContent = `↻ ${rot}°`;
  }

  function desenhaGrupo(g: number): void {
    grupoAtual = g;
    for (const b of gruposEl.children) b.classList.toggle('on', Number((b as HTMLElement).dataset.g) === g);
    const grupo = dados.grupos[g];
    if (!grupo) return;
    /*
     * ⚠️ A grade é refeita inteira ao trocar de grupo, e a escuta é DELEGADA no
     * container. É a mesma lição do bestiário em 29/08: pendurar `onclick` em
     * cada célula e depois recriá-las faz o clique cujo `mousedown` cai num nó
     * que some nunca virar `click`.
     */
    grade.textContent = '';
    for (let k = 0; k < grupo.n; k++) {
      const i = grupo.inicio + k;
      const d = document.createElement('div');
      d.dataset.i = String(i);
      d.style.backgroundSize = tamanhoDaFolha();
      d.style.backgroundPosition = fundoDoTile(i);
      if (i === escolhido) d.classList.add('on');
      grade.appendChild(d);
    }
    aplicaZoom();
  }

  grade.addEventListener('click', (ev) => {
    const alvo = (ev.target as HTMLElement).closest('[data-i]') as HTMLElement | null;
    if (!alvo) return;
    for (const c of grade.children) c.classList.remove('on');
    alvo.classList.add('on');
    escolhido = Number(alvo.dataset.i);
    atualizaPrevia();
  });

  dados.grupos.forEach((g, i) => {
    const b = document.createElement('button');
    b.textContent = `${g.nome} (${g.n})`;
    b.dataset.g = String(i);
    b.onclick = () => desenhaGrupo(i);
    gruposEl.appendChild(b);
  });
  desenhaGrupo(0);
  atualizaPrevia();

  /*
   * O "conta-gotas": clicar num tile do jogo e cair na peça dele.
   *
   * ⚠️ **O estado da última célula apontada mora aqui**, e não em quem chama,
   * porque é ele que faz o clique repetido descer a pilha. Sem isso, uma célula
   * com chão + mato + cerca só entregaria a cerca, para sempre.
   */
  let ultimaCelula = '';
  let ultimoDegrau = 0;
  function aponta(fx: number, fy: number): number {
    const pilha = dados.celulas?.[`${fx},${fy}`];
    if (!pilha || pilha.length === 0) return 0;
    const chave = `${fx},${fy}`;
    /*
     * A lista já vem ordenada por cobertura, então o índice 0 é o que se está
     * vendo — o conversor faz esse trabalho para o cliente não ter de conhecer
     * pixel nenhum.
     */
    if (chave === ultimaCelula) ultimoDegrau = (ultimoDegrau + 1) % pilha.length;
    else { ultimaCelula = chave; ultimoDegrau = 0; }
    const i = pilha[ultimoDegrau]!;

    const g = dados.grupos.findIndex((gr) => i >= gr.inicio && i < gr.inicio + gr.n);
    escolhido = i;
    if (g >= 0 && g !== grupoAtual) desenhaGrupo(g);
    for (const c of grade.children) {
      const d = c as HTMLElement;
      const marcado = Number(d.dataset.i) === i;
      d.classList.toggle('on', marcado);
      // Rolar até a peça: num grupo de 244 ela pode estar bem longe da vista.
      if (marcado) d.scrollIntoView({ block: 'nearest' });
    }
    atualizaPrevia();
    return pilha.length;
  }

  function gira(): void {
    rot = (rot + 90) % 360;
    atualizaPrevia();
  }
  btnGirar.onclick = gira;
  el('ed-menos').onclick = () => { if (iz > 0) { iz--; aplicaZoom(); } };
  el('ed-mais').onclick = () => { if (iz < ZOOMS.length - 1) { iz++; aplicaZoom(); } };
  el('ed-por').onclick = aoPor;
  el('ed-close').onclick = () => {
    painel.style.display = 'none';
    painel.classList.remove('aberto');
  };

  // Devolve a geometria da última sessão, se houver.
  {
    const g = leGuardado();
    if (g.w) painel.style.width = g.w;
    if (g.h) painel.style.height = g.h;
    if (g.l) { painel.style.left = g.l; painel.style.right = 'auto'; }
    if (g.t) painel.style.top = g.t;
  }

  /*
   * O `resize: both` do CSS não avisa ninguém quando termina — daí o
   * `ResizeObserver`, que é o único jeito de guardar o tamanho novo.
   */
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (painel.style.display === 'none') return;
      guarda({ w: painel.style.width, h: painel.style.height });
    }).observe(painel);
  }

  /*
   * Arrastar pelo título. Sem isso o painel tapa justamente a região que se está
   * consertando.
   */
  {
    const barra = painel.querySelector('h3') as HTMLElement;
    let arrastando = false;
    let ox = 0;
    let oy = 0;
    barra.addEventListener('mousedown', (ev) => {
      if ((ev.target as HTMLElement).id === 'ed-close') return;
      const r = painel.getBoundingClientRect();
      arrastando = true;
      ox = ev.clientX - r.left;
      oy = ev.clientY - r.top;
      ev.preventDefault();
    });
    window.addEventListener('mousemove', (ev) => {
      if (!arrastando) return;
      painel.style.left = `${ev.clientX - ox}px`;
      painel.style.top = `${ev.clientY - oy}px`;
      painel.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => {
      if (arrastando) guarda({ l: painel.style.left, t: painel.style.top });
      arrastando = false;
    });
  }

  return {
    alterna() {
      const abrindo = painel.style.display === 'none' || painel.style.display === '';
      painel.style.display = abrindo ? 'flex' : 'none';
      painel.classList.toggle('aberto', abrindo);
      if (abrindo) aplicaZoom();
    },
    aberto: () => painel.style.display === 'flex',
    gira,
    aponta,
    selecao: () => (escolhido < 0 ? null : {
      paleta: escolhido,
      rot,
      camada: selCamada.value as Selecao['camada'],
      colisao: selColisao.value as Selecao['colisao'],
    }),
    textura,
  };
}
