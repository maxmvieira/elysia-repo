/**
 * Leitor de .tmx do Tiled — a parte que o `tmx2world.mjs` não sabe fazer.
 *
 * 🔴 **Por que não reusar o `tmx2world.mjs`.** Aquele script traduz
 * `(camada, gid) → um dos 16 tipos semânticos` do Elysia e joga a arte fora: é o
 * que ele existe para fazer, e é certo para o mapa provisório do ChatGPT, que é
 * de retalhos de cor chapada. A Farm é o caso oposto — o valor dela **é** a arte
 * dos tilesets. Então este leitor guarda o gid, e quem consome decide.
 *
 * O que este arquivo entende e o `tmx2world` não:
 *
 *   - **mapa infinito** (`infinite="1"`): os dados vêm em `<chunk>` de 16×16
 *     espalhados por coordenadas que podem ser NEGATIVAS. A Farm vai de x=−32 a
 *     x=32. Ler como grade densa daria lixo.
 *   - **tilesets embutidos** com `<image source>` relativo ao .tmx.
 *   - **animação de tile** (`<tile><animation><frame>`): é o que faz a água
 *     correr, a bandeira tremular e o portãozinho abrir.
 *   - **flip flags** nos 3 bits altos do gid.
 *
 * ⚠️ Parser por regex, pela mesma razão declarada no `tmx2world.mjs`: a saída do
 * Tiled é gerada por máquina e rigidamente regular, e uma dependência de XML no
 * workspace custaria mais do que resolve.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * 🔴 **Os 3 bits altos do gid são espelhamento, e eles são PRESERVADOS.**
 *
 * ⚠️ Até 31/08 eles eram apagados aqui (`& ~FLIP`), e isso produziu o defeito que
 * o dono relatou: *"as bordas estão todas erradas — algumas grids que deveriam
 * seguir viradas para a esquerda estão viradas pra direita, e aí quebra o
 * caminho da borda"*. E estavam: **37 células do `Farm.tmx` são espelhadas**, e
 * 25 delas são a cerca-viva (`Hill`) e a grama da borda. O autor desenhou meia
 * curva e espelhou a outra metade, que é como se trabalha no Tiled.
 *
 * Quem separa índice de espelhamento agora é o `resolveGid`, de uma vez só para
 * todos os consumidores.
 */
const FLIP_H = 0x80000000;
const FLIP_V = 0x40000000;
const FLIP_D = 0x20000000;
const FLIP = FLIP_H | FLIP_V | FLIP_D;

function atributos(tag) {
  const a = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) a[m[1]] = m[2];
  return a;
}

/**
 * Lê um .tmx inteiro.
 *
 * Devolve `{ largura, altura, x0, y0, tileW, tileH, tilesets, camadas }`, com
 * `x0/y0` sendo o canto do bounding box em tiles (pode ser negativo no infinito)
 * e cada camada já **densificada** para uma grade `largura × altura` alinhada a
 * esse canto — quem consome não precisa saber que existiram chunks.
 */
export function lerTmx(caminho, opcoes = {}) {
  /**
   * 🔴 Camadas que NÃO contam para o retângulo do mapa.
   *
   * O bounding box sai das células com gid, e isso o fazia crescer por lixo: as
   * camadas de bicho do `Farm.tmx` têm 15 células na fileira y=34 com tiles
   * **totalmente transparentes** — sobra de trabalho do autor. Elas esticavam a
   * fazenda em 3 linhas e 1 coluna sem arte nenhuma, e como o cliente deixa de
   * desenhar o mundo dentro do retângulo da fazenda, essas linhas viravam uma
   * **FAIXA PRETA** em volta dela. Foi o defeito que o dono relatou em 30/08.
   */
  const ignorarNoLimite = opcoes.ignorarNoLimite ?? new Set();
  const xml = readFileSync(caminho, 'utf8');
  const mapa = atributos(xml.match(/<map\b[^>]*>/)[0]);
  const tileW = Number(mapa.tilewidth);
  const tileH = Number(mapa.tileheight);
  const base = dirname(caminho);

  // --- tilesets -------------------------------------------------------------
  const tilesets = [];
  for (const m of xml.matchAll(/<tileset\b([^>]*)>([\s\S]*?)<\/tileset>/g)) {
    const a = atributos(m[1]);
    const corpo = m[2];
    const img = corpo.match(/<image\b([^>]*)\/?>/);
    if (!img) throw new Error(`tileset "${a.name}" sem <image> (tsx externo não suportado)`);
    const ia = atributos(img[1]);
    // Animações declaradas neste tileset: tileid local -> [{tileid, duration}]
    const animacoes = {};
    for (const t of corpo.matchAll(/<tile id="(\d+)">\s*<animation>([\s\S]*?)<\/animation>/g)) {
      animacoes[Number(t[1])] = [...t[2].matchAll(/<frame tileid="(\d+)" duration="(\d+)"/g)]
        .map((f) => ({ tile: Number(f[1]), ms: Number(f[2]) }));
    }
    tilesets.push({
      nome: a.name,
      firstgid: Number(a.firstgid),
      tileW: Number(a.tilewidth),
      tileH: Number(a.tileheight),
      colunas: Number(a.columns),
      total: Number(a.tilecount),
      imagem: resolve(base, ia.source),
      imagemW: Number(ia.width),
      imagemH: Number(ia.height),
      animacoes,
    });
  }
  tilesets.sort((a, b) => a.firstgid - b.firstgid);

  // --- camadas, ainda em chunks --------------------------------------------
  const cruas = [];
  for (const m of xml.matchAll(/<layer\b([^>]*)>([\s\S]*?)<\/layer>/g)) {
    const a = atributos(m[1]);
    const corpo = m[2];
    if (!/encoding="csv"/.test(corpo)) throw new Error(`camada "${a.name}" não é CSV`);
    const chunks = [];
    for (const c of corpo.matchAll(/<chunk\b([^>]*)>([\s\S]*?)<\/chunk>/g)) {
      const ca = atributos(c[1]);
      chunks.push({
        x: Number(ca.x), y: Number(ca.y), w: Number(ca.width), h: Number(ca.height),
        gids: c[2].trim().split(',').map((s) => Number(s.trim()) >>> 0),
      });
    }
    if (chunks.length === 0) {
      // Mapa finito: um <data> único, sem chunk.
      const d = corpo.match(/<data encoding="csv">([\s\S]*?)<\/data>/);
      chunks.push({
        x: 0, y: 0, w: Number(a.width), h: Number(a.height),
        gids: d[1].trim().split(',').map((s) => Number(s.trim()) >>> 0),
      });
    }
    cruas.push({ nome: a.name, id: Number(a.id), chunks });
  }

  // --- bounding box de tudo que tem gid != 0 -------------------------------
  //
  // ⚠️ Não dá para usar o `width`/`height` do <map> num mapa infinito: o Tiled
  // grava ali o tamanho da JANELA de edição (16×24 na Farm), não o do conteúdo,
  // que é 64×48. Ler dali cortaria três quartos da fazenda.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cruas) {
    if (ignorarNoLimite.has(c.id)) continue;
    for (const ch of c.chunks) {
      for (let i = 0; i < ch.gids.length; i++) {
        if (ch.gids[i] === 0) continue;
        const x = ch.x + (i % ch.w);
        const y = ch.y + Math.floor(i / ch.w);
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x0 === Infinity) throw new Error(`${caminho}: nenhuma célula preenchida`);
  const largura = x1 - x0 + 1;
  const altura = y1 - y0 + 1;

  // --- densifica cada camada nesse retângulo -------------------------------
  const camadas = cruas.map((c) => {
    const gids = new Uint32Array(largura * altura);
    for (const ch of c.chunks) {
      for (let i = 0; i < ch.gids.length; i++) {
        const g = ch.gids[i];
        if (g === 0) continue;
        const x = ch.x + (i % ch.w) - x0;
        const y = ch.y + Math.floor(i / ch.w) - y0;
        if (x < 0 || y < 0 || x >= largura || y >= altura) continue;
        gids[y * largura + x] = g;
      }
    }
    return { nome: c.nome, id: c.id, gids };
  });

  return { largura, altura, x0, y0, tileW, tileH, tilesets, camadas };
}

/**
 * Qual tileset dono do gid, o índice local dentro dele, e **como o tile está
 * espelhado**.
 *
 * 🔴 `flipD` é a diagonal, e ela vem PRIMEIRO na composição: o Tiled define a
 * transformação como *"transpõe, depois espelha em H e em V"*. É assim que uma
 * rotação de 90° é gravada — D+H. Aplicar H antes de D dá a rotação para o lado
 * errado, e é um erro que só aparece nos poucos tiles rotacionados.
 *
 * ⚠️ O gid chega **sem máscara** de propósito: mascarar é o serviço desta
 * função, e centralizá-lo aqui é o que impede que um consumidor novo esqueça.
 */
export function resolveGid(tilesets, gid) {
  const flipH = (gid & FLIP_H) !== 0;
  const flipV = (gid & FLIP_V) !== 0;
  const flipD = (gid & FLIP_D) !== 0;
  const id = (gid & ~FLIP) >>> 0;
  for (let i = tilesets.length - 1; i >= 0; i--) {
    if (id >= tilesets[i].firstgid) {
      return { ts: tilesets[i], local: id - tilesets[i].firstgid, flipH, flipV, flipD };
    }
  }
  throw new Error(`gid ${gid} não pertence a nenhum tileset`);
}
