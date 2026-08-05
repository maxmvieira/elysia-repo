/**
 * Conversor **Tiled (.tmx) → mundo de Elysia (.json)**.
 *
 * Uso:  node tools/tmx2world.mjs map/mapa-gpt/vila_inicial.tmx
 *       npm run map:build
 *
 * ## 🔴 Por que existe um passo de conversão, em vez de o jogo ler o .tmx
 *
 * O `worldgen.ts` documenta em vermelho que **o terreno não trafega pela rede**:
 * cliente e servidor *calculam* o mesmo mundo, e é essa igualdade que sustenta a
 * decisão de "nó de recurso é ENTIDADE, não tile". Se o navegador lesse o .tmx em
 * runtime, o terreno viraria dado transmitido e essa invariante cairia.
 *
 * Então: **o .tmx é o formato de AUTORIA** (o dono abre e edita no Tiled) e o
 * .json é o que os dois lados importam, versionado no git. Editar no Tiled →
 * rodar este script → o jogo muda. O irmão continua vendo no diff o que mudou.
 *
 * ## O que este script NÃO faz
 *
 * ⚠️ Ele **não toca** em `npcs.json`, `creatures.json` nem `nodes.json`. Aqueles
 * são o povoamento curado do mundo de 300×300, com `_leia` explicando cada
 * decisão. Sobrescrevê-los apagaria trabalho que não é meu. Este script escreve
 * um arquivo só, e o novo mundo lê dele.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

/* ------------------------------------------------------------------ *
 * A tradução gid → id de tile do Elysia.
 *
 * 🔴 **É AQUI que se troca a arte.** Quando um tileset novo entrar, esta é a
 * única tabela que muda — o resto do script não sabe o nome de nenhum tileset.
 * A chave externa é o `name` do <tileset> (o do .tsx), então dois tilesets
 * podem conviver enquanto a vila migra de um para o outro.
 *
 * O gid é 1-based e **relativo ao firstgid** do tileset no mapa; o script já
 * subtrai o firstgid antes de consultar, então aqui o índice é 0-based: 0 é o
 * primeiro tile da folha, lido da esquerda para a direita, de cima para baixo.
 * ------------------------------------------------------------------ */
const T = {
  VOID: 0, GRASS: 1, DIRT: 2, STONE: 3, WATER: 4,
  WALL_STONE: 5, WALL_WOOD: 6, TREE: 7, SAND: 8,
};

/*
 * 🔴 **A CAMADA decide o significado; o gid decide só a arte.**
 *
 * Descoberto convertendo o mapa provisório: ali o gid 4 é *parede* na camada
 * `Buildings` e é um *marcador genérico de bloqueio* na `Collision` — 493
 * células, todas com o mesmo gid. Uma tabela `gid → tile` achatada traduzia as
 * duas para a mesma coisa e enchia a vila de parede fantasma.
 *
 * E isso não é vício do mapa do ChatGPT: é como mapa de Tiled é desenhado. Num
 * tileset de verdade o retalho "pedra" é **chão** quando pintado na `Ground` e
 * **parede** quando pintado na `Buildings`; o autor troca de camada, não de
 * tile. Então a tradução é `(camada, gid) → tile`, com `padrao` valendo para
 * quem não tiver regra própria.
 */
const TILESETS = {
  /**
   * O tileset provisório que veio junto do mapa do ChatGPT: 16 quadrados de cor
   * chapada, 8 colunas. O próprio LEIA-ME dele diz que os gráficos são
   * provisórios e servem só para testar a importação — é exatamente esse o papel
   * que ele cumpre aqui, de cobaia do encanamento antes de a arte de verdade
   * chegar.
   */
  starter_tileset: {
    padrao: {
      0: T.GRASS,  // verde
      1: T.DIRT,   // terra batida
      2: T.WATER,  // água
      3: T.STONE,  // tijolo cinza
      4: T.STONE,  // tijolo cinza (variante)
      5: T.TREE,   // árvore
      6: T.WALL_WOOD,
      7: T.WALL_WOOD,
      8: T.TREE,   // moita
      9: T.DIRT,   // marcador de NPC — não é terreno, vira o chão de baixo
      10: T.WALL_WOOD,
      11: T.GRASS, // flor: decoração andável, não vira sólido
      12: T.STONE, // pedra
      13: T.SAND,
      14: T.GRASS,
      15: T.VOID,
    },
    porCamada: {
      // Tudo que o autor pintou como construção é parede, seja qual for o gid.
      Buildings: { 3: T.WALL_STONE, 4: T.WALL_STONE, 6: T.WALL_WOOD, 7: T.WALL_WOOD, 10: T.WALL_WOOD },
      // Pedra solta barra o passo; flor, não.
      Nature_Decoration: { 12: T.TREE },
    },
  },
};

/* ------------------------------------------------------------------ *
 * Leitura do .tmx
 *
 * ⚠️ Parser por regex, de propósito: a saída do Tiled é gerada por máquina e
 * rigidamente regular, e uma dependência de XML a mais no workspace custaria
 * mais do que resolve. Se algum dia o .tmx passar a ser escrito à mão, ou o
 * Tiled mudar o formato, isto vira dívida — e o jeito de descobrir é o script
 * quebrar alto, que é o que os `erro()` abaixo garantem.
 * ------------------------------------------------------------------ */

function erro(msg) {
  console.error(`\n[tmx2world] ERRO: ${msg}\n`);
  process.exit(1);
}

function atributos(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

/** Camadas de tile, na ordem em que aparecem no arquivo (= ordem de pintura). */
function lerCamadasDeTile(xml) {
  const camadas = [];
  const re = /<layer\b([^>]*)>[\s\S]*?<data encoding="csv">([\s\S]*?)<\/data>/g;
  for (const m of xml.matchAll(re)) {
    const a = atributos(m[1]);
    const gids = m[2].trim().split(',').map((s) => Number(s.trim()));
    camadas.push({ nome: a.name, largura: Number(a.width), altura: Number(a.height), gids });
  }
  return camadas;
}

/** Camadas de objeto (NPCs, MonsterSpawns, Zones), com as propriedades tipadas. */
function lerCamadasDeObjeto(xml) {
  const grupos = [];
  for (const g of xml.matchAll(/<objectgroup\b([^>]*)>([\s\S]*?)<\/objectgroup>/g)) {
    const nome = atributos(g[1]).name;
    const objetos = [];
    for (const o of g[2].matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>|<object\b([^>]*)\/>/g)) {
      const a = atributos(o[1] ?? o[3] ?? '');
      const props = {};
      for (const p of (o[2] ?? '').matchAll(/<property\b([^>]*)\/>/g)) {
        const pa = atributos(p[1]);
        props[pa.name] =
          pa.type === 'int' ? Number(pa.value)
          : pa.type === 'bool' ? pa.value === 'true'
          : pa.value;
      }
      objetos.push({
        nome: a.name, tipo: a.type,
        x: Number(a.x), y: Number(a.y),
        largura: Number(a.width ?? 0), altura: Number(a.height ?? 0),
        props,
      });
    }
    grupos.push({ nome, objetos });
  }
  return grupos;
}

/* ------------------------------------------------------------------ */

const entrada = process.argv[2];
if (!entrada) erro('falta o caminho do .tmx.\n  uso: node tools/tmx2world.mjs <arquivo.tmx>');

const caminho = resolve(entrada);
const xml = readFileSync(caminho, 'utf8');
const mapa = atributos(xml.match(/<map\b([^>]*)>/)?.[1] ?? '');

if (mapa.orientation !== 'orthogonal') {
  erro(
    `o mapa é "${mapa.orientation}", e o motor de Elysia é grade quadrada vista de cima.\n` +
    `  Tibia NÃO é isométrico — se este mapa veio de um pack isométrico, ele não serve\n` +
    `  sem reescrever projeção, clique-para-andar e ordem de profundidade.`,
  );
}
if (mapa.tilewidth !== '32' || mapa.tileheight !== '32') {
  erro(`célula de ${mapa.tilewidth}×${mapa.tileheight}; o motor usa 32×32 (TILE_SIZE).`);
}

const W = Number(mapa.width);
const H = Number(mapa.height);

// O tileset e o firstgid dele. Um só, por enquanto — vários exigiria escolher a
// tabela por faixa de gid, e ainda não há caso de uso.
const ts = atributos(xml.match(/<tileset\b([^>]*)\/>/)?.[1] ?? '');
const nomeTileset = basename(ts.source ?? '', '.tsx');
const firstgid = Number(ts.firstgid ?? 1);
const tabela = TILESETS[nomeTileset];
if (!tabela) {
  erro(
    `não conheço o tileset "${nomeTileset}".\n` +
    `  Some uma entrada em TILESETS, no topo deste arquivo. Conhecidos: ${Object.keys(TILESETS).join(', ')}`,
  );
}

/* --- Achatar as camadas de tile numa grade só -------------------- */

const camadas = lerCamadasDeTile(xml);
const COLISAO = 'Collision';
const pintaveis = camadas.filter((c) => c.nome !== COLISAO);
const colisao = camadas.find((c) => c.nome === COLISAO);

const grade = new Array(W * H).fill(T.VOID);
for (const camada of pintaveis) {
  if (camada.largura !== W || camada.altura !== H) {
    erro(`a camada "${camada.nome}" é ${camada.largura}×${camada.altura}, e o mapa é ${W}×${H}.`);
  }
  const daCamada = tabela.porCamada?.[camada.nome] ?? {};
  camada.gids.forEach((gid, i) => {
    if (gid === 0) return; // célula vazia não apaga o que veio antes
    const idx = gid - firstgid;
    const tile = daCamada[idx] ?? tabela.padrao[idx];
    if (tile === undefined) {
      erro(
        `gid ${gid} (índice ${idx}) na camada "${camada.nome}" sem tradução em ` +
        `TILESETS.${nomeTileset}. Some o índice em \`padrao\`, ou em \`porCamada.${camada.nome}\` ` +
        `se ele significar outra coisa nessa camada.`,
      );
    }
    if (tile !== T.VOID) grade[i] = tile;
  });
}

/*
 * 🔴 A camada Collision é CONFERIDA, não aplicada.
 *
 * No Elysia a solidez vem do TIPO do tile (`TILE_TYPES[id].solid`), e é assim
 * dos dois lados da rede. Se este script também gravasse uma lista paralela de
 * sólidos vinda do Tiled, passariam a existir duas fontes de verdade para "dá
 * para pisar aqui" — e o dia em que discordassem, o jogador atravessaria parede
 * no cliente e travaria no servidor, sem nada no console.
 *
 * Então a camada Collision do Tiled vira um CONFERENTE: o script avisa onde ela
 * discorda dos tiles pintados. Divergência é erro de desenho do mapa (parede
 * esquecida, água sem marcar), e o lugar de consertar é o Tiled.
 */
const SOLIDOS = new Set([T.VOID, T.WATER, T.WALL_STONE, T.WALL_WOOD, T.TREE]);
let divergencias = 0;
if (colisao) {
  for (let i = 0; i < W * H; i++) {
    const marcado = colisao.gids[i] !== 0;
    const solido = SOLIDOS.has(grade[i]);
    if (marcado !== solido) {
      if (divergencias < 10) {
        console.warn(
          `[tmx2world] aviso: (${i % W},${Math.floor(i / W)}) Collision diz ` +
          `${marcado ? 'BLOQUEADO' : 'livre'}, mas o tile é ${solido ? 'sólido' : 'andável'}.`,
        );
      }
      divergencias++;
    }
  }
  if (divergencias > 10) console.warn(`[tmx2world] ... e mais ${divergencias - 10} divergências.`);
}

/* --- Objetos: NPC, spawn e zona ---------------------------------- */

const grupos = lerCamadasDeObjeto(xml);
const emTiles = (px) => Math.floor(px / 32);
const pega = (nome) => grupos.find((g) => g.nome === nome)?.objetos ?? [];

const npcs = pega('NPCs').map((o) => ({
  name: o.nome,
  x: emTiles(o.x), y: emTiles(o.y), floor: 0,
  role: o.props.role ?? 'vendor',
  npcId: o.props.npc_id,
  dialogue: o.props.dialogue,
}));

const spawns = pega('MonsterSpawns').map((o) => ({
  type: o.props.monster_id,
  x: emTiles(o.x), y: emTiles(o.y), floor: 0,
  respawnSeconds: o.props.respawn_seconds ?? 20,
  maxAlive: o.props.max_alive ?? 1,
}));

const zonas = pega('Zones').map((o) => ({
  name: o.nome, kind: o.tipo,
  x1: emTiles(o.x), y1: emTiles(o.y),
  x2: emTiles(o.x + o.largura) - 1, y2: emTiles(o.y + o.altura) - 1,
  pvpEnabled: o.props.pvp_enabled ?? true,
  recommendedLevel: o.props.recommended_level,
}));

/*
 * O spawn do jogador é o centro da primeira SafeZone. Não é chute: SafeZone é a
 * única marcação do mapa que quer dizer "aqui não se morre", e nascer fora dela
 * seria nascer em área de caça. Se não houver nenhuma, o centro do mapa serve e
 * o script avisa.
 */
const segura = zonas.find((z) => z.kind === 'SafeZone');
if (!segura) console.warn('[tmx2world] aviso: nenhuma SafeZone — o spawn caiu no centro do mapa.');
const spawn = segura
  ? { x: Math.floor((segura.x1 + segura.x2) / 2), y: Math.floor((segura.y1 + segura.y2) / 2), floor: 0 }
  : { x: Math.floor(W / 2), y: Math.floor(H / 2), floor: 0 };

if (SOLIDOS.has(grade[spawn.y * W + spawn.x])) {
  erro(`o spawn (${spawn.x},${spawn.y}) caiu num tile sólido. Mova a SafeZone ou limpe o tile no Tiled.`);
}

/* --- Escrita ------------------------------------------------------ */

const id = basename(caminho, '.tmx');
const saida = resolve(dirname(caminho), '../../shared/data/world', `${id}.json`);

const mundo = {
  _leia:
    'GERADO por tools/tmx2world.mjs a partir do .tmx do Tiled. NAO EDITE A MAO — ' +
    'a proxima conversao apaga. Para mudar o mapa, abra o .tmx no Tiled e rode ' +
    '`npm run map:build`. O .tmx e a fonte; este arquivo e o que o jogo importa, ' +
    'dos dois lados, porque terreno nao trafega pela rede (ver worldgen.ts).',
  _origem: `${basename(caminho)} (tileset: ${nomeTileset})`,
  id,
  name: mapa.name ?? id,
  width: W,
  height: H,
  spawn,
  tiles: grade,
  npcs,
  spawns,
  zones: zonas,
};

writeFileSync(saida, JSON.stringify(mundo, null, 1), 'utf8');

const andaveis = grade.filter((t) => !SOLIDOS.has(t)).length;
console.log(
  `[tmx2world] ${basename(caminho)} -> ${basename(saida)}\n` +
  `  ${W}×${H} = ${W * H} tiles (${andaveis} andáveis, ${((andaveis / (W * H)) * 100).toFixed(0)}%)\n` +
  `  spawn (${spawn.x},${spawn.y}) · ${npcs.length} NPC · ${spawns.length} spawn · ${zonas.length} zona` +
  (divergencias ? `\n  ⚠️  ${divergencias} divergências entre Collision e os tiles` : ''),
);
