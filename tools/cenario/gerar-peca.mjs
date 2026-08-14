/**
 * Gerador das pecas 2D isometricas de cenario, pela API de imagem da OpenAI.
 *
 * Produz UMA peca por chamada, com fundo transparente:
 *
 *   arte-fonte/cenario-iso/<peca>.png
 *
 * 🔴 ISTO NAO E MODELAGEM 3D. Decisao do dono em 13/08: o cenario virou uma
 * linha separada, em que cada peca e uma IMAGEM 2D isometrica isolada, gerada
 * por IA de imagem. O Blender entra so depois, para montar as pecas prontas
 * como sprites. Ver `docs/PROMPT-ARTE-CENARIO-2D.md`.
 *
 * ⚠️ O `gpt-image-1` foi escolhido por UM motivo concreto: e o unico que faz
 * fundo transparente NATIVO (`background: 'transparent'`). Nos outros geradores
 * o fundo teria de ser recortado depois, e recorte come borda de peca escura.
 *
 * 💳 CUSTA DINHEIRO DE VERDADE, por imagem, ao contrario do PixelLab (que tem
 * cota mensal e falha em vez de cobrar). Por isso existe o teto de gasto
 * abaixo, e ele e obrigatorio.
 *
 * Uso:
 *   node tools/cenario/gerar-peca.mjs piso
 *   node tools/cenario/gerar-peca.mjs parede-pedra parede-enxaimel
 *   node tools/cenario/gerar-peca.mjs --lista
 *
 * ⚠️ A chave NUNCA entra no repositorio: vem de `OPENAI_API_KEY` no `.env`,
 * que e ignorado pelo git (linha 5) — e este repositorio e PUBLICO.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync, appendFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SAIDA = join(RAIZ, 'arte-fonte', 'cenario-iso');
const DIARIO = join(SAIDA, 'geracoes.jsonl');

/**
 * Le a chave do ambiente ou do `.env`.
 *
 * ⚠️ Le o `.env` direto porque o shell nao guarda estado entre chamadas — foi a
 * armadilha registrada no HANDOFF de 11/08 com o `PIXELLAB_TOKEN`.
 */
function chave() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const env = join(RAIZ, '.env');
  if (existsSync(env)) {
    const linha = readFileSync(env, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('OPENAI_API_KEY='));
    if (linha) return linha.slice('OPENAI_API_KEY='.length).trim();
  }
  return null;
}

/**
 * 🔴 TETO DE GASTO — nao remova.
 *
 * Este script roda sem ninguem olhando. Sem teto, um laco que erra e repete
 * vira conta de cartao. O teto conta IMAGENS, nao dolares, porque imagem e o
 * que o script controla; a conversao para dinheiro esta na tabela de precos da
 * OpenAI e muda sem avisar.
 */
const TETO_POR_RODADA = Number(process.env.TETO_IMAGENS ?? 12);

/** O bloco de estilo fixo. E o que faz piso, parede e telhado parecerem do mesmo jogo. */
const ESTILO = `Single isolated game asset, 2D isometric scenery piece for a fantasy MMORPG,
in the visual tradition of Ragnarok Online but with much higher detail and texture
richness — hand-painted digital art, NOT a 3D render, NOT a photo, NOT flat vector art.

Camera: true isometric projection, consistent with a 2:1 diamond-shaped tile grid.
The piece must read correctly as a tile in an isometric game engine — do not tilt,
rotate, or foreshorten it off-grid.

Lighting: soft directional light from the upper-left, warm and painterly, with clearly
defined but soft-edged shadows baked directly into the texture. Consistent light
direction across every piece of this set.

Material detail: rich hand-painted texture — visible wood grain with knots and small
cracks, or individual stone blocks with mortar and chips, or individual roof shingles
with tonal variation, depending on the material. Small imperfections and weathering,
not a clean sterile surface.

Background: fully transparent. No ground, no other scenery, no characters, no monsters,
no other building pieces, no UI, no text, no watermark, no border.

Composition: the piece fills most of the frame, centered, with a small margin.
Only ONE piece in the image.

PIECE:
`;

/**
 * As pecas. O texto sai de `docs/PROMPT-ARTE-CENARIO-2D.md` — os dois tem que
 * concordar, e o documento e a fonte de verdade para leitura humana.
 *
 * `size` e por peca porque piso e telhado sao losangos largos (2:1) e porta e
 * janela sao verticais. Pedir tudo quadrado desperdica pixel na transparencia.
 */
const PECAS = {
  piso: {
    size: '1536x1024',
    texto:
      'A medieval wooden floor tile, isometric rhombus shape. Wide wooden planks ' +
      'running in one diagonal direction, laid in a staggered brick-like pattern. ' +
      'Warm honey-to-dark-brown wood tones with visible grain, occasional knots, ' +
      'hairline cracks along a few planks. A raised wooden trim beam frames all four ' +
      'edges of the diamond, with a thicker corner post at each of the four corners. ' +
      'Small dark metal nail heads visible along the plank seams.',
  },
  'parede-pedra': {
    size: '1024x1024',
    texto:
      'A medieval stone wall panel, seen isometrically as a flat rectangular slab ' +
      '(front-facing wall face, not a floor). Irregular hand-cut fieldstone blocks of ' +
      'varying size, light grey to warm beige tones, visible mortar lines between ' +
      'stones, some chipped edges and small moss or weathering stains near the base. ' +
      'Slight bevel and relief so each stone reads as physically raised.',
  },
  'parede-enxaimel': {
    size: '1024x1024',
    texto:
      'A medieval half-timbered wall panel (Tudor / fachwerk style), seen isometrically ' +
      'as a flat rectangular slab. Cream-white lime plaster background, dark aged oak ' +
      'timber frame with horizontal, vertical AND diagonal cross-brace beams forming the ' +
      'traditional pattern. Visible wood grain on the beams, faint texture and small ' +
      'stains on the plaster.',
  },
  telhado: {
    size: '1536x1024',
    texto:
      'A medieval roof panel, isometric rhombus shape matching a sloped roof surface. ' +
      'Dense small clay or slate roof shingles in deep blue tones, with tonal variation ' +
      'between shingles and soft shadow in the gaps between rows for volume. A thicker ' +
      'wooden ridge cap trim along the top edge.',
  },
  /**
   * 🔴 REDIGIDA EM POSITIVO por causa de duas falhas seguidas em 13/08.
   *
   * As duas primeiras tentativas diziam o que a peca NAO era ("not a
   * horseshoe") e as duas voltaram com a moldura de pedra curvando por baixo
   * da porta, como uma ferradura. Gerador de imagem nao obedece negacao de
   * forma confiavel: ele le "horseshoe" e desenha uma. A forma que funciona e
   * descrever a geometria desejada, membro por membro.
   */
  porta: {
    size: '1024x1536',
    texto:
      'A medieval doorway. Geometry, described piece by piece: TWO straight vertical ' +
      'stone columns, one on the left and one on the right, each standing upright from ' +
      'the ground; a semicircular stone arch resting on top of those two columns, ' +
      'bridging them; and between the columns, a wooden door of dark aged oak planks ' +
      'whose bottom edge sits flat on a stone doorstep at ground level. ' +
      'The wooden door is a tall rectangle with a rounded top matching the arch. ' +
      'Wrought-iron hinges and a round iron ring handle. Visible wood grain. ' +
      'The stone floor line is straight and horizontal across the whole bottom. ' +
      'ANGLE: mounted on a wall plane that recedes to the RIGHT, matching the ' +
      '`parede-pedra` panel of this same set — the same isometric tilt.',
  },
  /**
   * ⚠️ A 2a tentativa veio com um pedaco de parede de PEDRA grudado em volta,
   * o que impede a janela de ir numa parede de enxaimel. Por isso o recorte
   * agora e descrito em positivo: a peca termina na moldura de madeira.
   */
  janela: {
    size: '1024x1024',
    texto:
      'A medieval wooden window unit, as a standalone object floating in empty space. ' +
      'The object consists of exactly these parts and nothing else: a dark oak window ' +
      'frame, small blue-tinted glass panes with faint depth, two hinged wooden shutters ' +
      'on the sides, and a small wooden flower box with colorful flowers below the sill. ' +
      'The outer edge of the wooden frame is where the object ends — the silhouette is ' +
      'the wooden frame itself, surrounded entirely by empty transparent space. ' +
      'ANGLE: the window faces a wall plane that recedes to the RIGHT, matching the ' +
      '`parede-pedra` panel of this same set — the same isometric tilt.',
  },
  barril: {
    size: '1024x1024',
    texto:
      'A single medieval wooden barrel with dark iron bands, standing upright, isometric ' +
      'view, resting on its own small contact shadow only.',
  },

  /**
   * 🔴 O EXPERIMENTO QUE DECIDE SE O CONJUNTO VIRA CASA.
   *
   * As 7 pecas soltas de 13/08 sairam boas e NAO se encaixam: sem grade comum,
   * sem escala comum, cada uma num angulo proprio. A hipotese e que os sheets
   * de referencia que o dono mandou sao coerentes porque cada um saiu de UMA
   * geracao so — o modelo mantem grade e escala dentro da mesma imagem, e nao
   * entre imagens diferentes.
   *
   * ⚠️ Esta peca quebra a regra "only ONE piece in the image" do bloco de
   * estilo de proposito. E o unico caso em que varias pecas juntas sao o
   * objetivo, e nao um defeito.
   */
  folha: {
    size: '1536x1024',
    semEstilo: true,
    texto:
      'A modular building kit sprite sheet for a 2D isometric fantasy MMORPG, in the ' +
      'visual tradition of Ragnarok Online but with much higher detail — hand-painted ' +
      'digital art, NOT a 3D render, NOT a photo.\n\n' +
      'ONE single image containing MULTIPLE separate building pieces, laid out in a ' +
      'neat grid with clear empty space between them, like a game asset catalog page.\n\n' +
      'THE CRITICAL REQUIREMENT: every piece must share ONE common isometric grid and ' +
      'ONE common scale, so that they can be snapped together to build a house. A wall ' +
      'piece must be exactly as tall as the door that goes in it. The floor diamond must ' +
      'be exactly twice as wide as it is tall (a 2:1 isometric tile). All pieces lit by ' +
      'the same soft directional light from the upper-left.\n\n' +
      'The pieces to include, all medieval:\n' +
      '- a square wooden plank floor tile, as a 2:1 isometric diamond\n' +
      '- a stone wall panel whose face recedes to the LEFT\n' +
      '- the same stone wall panel mirrored, receding to the RIGHT\n' +
      '- a half-timbered plaster-and-oak wall panel receding to the LEFT\n' +
      '- the same half-timbered panel mirrored, receding to the RIGHT\n' +
      '- a blue shingled roof panel\n' +
      '- a wooden door mounted in a wall segment\n' +
      '- a shuttered window with a flower box, mounted in a wall segment\n' +
      '- a square stone corner pillar\n\n' +
      'Background: plain flat white, completely empty. No characters, no monsters, no ' +
      'ground, no assembled house, no UI, no text labels, no watermark, no border.',
  },

  /**
   * A folha de 12 pecas resolveu a coerencia mas bateu em dois tetos, medidos
   * ao montar a casa em 14/08:
   *
   * 1. RESOLUCAO — 12 pecas em 1536x1024 dao ~200 px cada. Menos pecas na
   *    mesma folha e a unica forma de subir o detalhe, porque 1536x1024 e o
   *    maximo do modelo.
   * 2. MODULO — as paredes sairam de 174 a 207 px de largura e de 289 a 325 de
   *    altura. A diferenca de 36 px entre a janela e a parede lisa obrigou a
   *    erguer o telhado so para ele nao engolir a floreira. Kit de verdade tem
   *    modulo unico, e por isso ele agora e pedido em numero.
   */
  folha2: {
    size: '1536x1024',
    semEstilo: true,
    texto:
      'A modular building kit sprite sheet for a 2D isometric fantasy MMORPG, in the ' +
      'visual tradition of Ragnarok Online but with much higher detail — hand-painted ' +
      'digital art with rich texture, NOT a 3D render, NOT a photo.\n\n' +
      'ONE single image containing EXACTLY SIX separate wall pieces, arranged in two ' +
      'rows of three, with generous empty space between them. Each piece should be ' +
      'large and highly detailed, filling its share of the canvas.\n\n' +
      'THE CRITICAL REQUIREMENT — all six pieces are the SAME MODULE: every piece is a ' +
      'wall panel of exactly the same width, exactly the same height, and exactly the ' +
      'same isometric tilt, so they can be stacked and placed side by side seamlessly ' +
      'to build a house. A window panel must be exactly as tall as a plain panel. All ' +
      'six lit by the same soft directional light from the upper-left.\n\n' +
      'All six panels face the same direction: their front face angled toward the ' +
      'lower-right, receding to the upper-right.\n\n' +
      'The six pieces, all medieval:\n' +
      '1. a plain rough stone block wall panel\n' +
      '2. a stone wall panel with a wooden door set in a rounded arch, the door ' +
      '   standing on straight vertical jambs with a flat threshold at the bottom\n' +
      '3. a stone wall panel with a small shuttered window\n' +
      '4. a plain half-timbered panel: cream plaster with dark oak beams\n' +
      '5. a half-timbered panel with a shuttered window and a flower box\n' +
      '6. a half-timbered panel with diagonal cross-brace beams\n\n' +
      'Background: plain flat white, completely empty. No characters, no ground, no ' +
      'assembled house, no roof, no floor, no UI, no text labels, no watermark.',
  },

  /**
   * 🔴 CASCA DE COMODO PRONTA — pedido do dono em 14/08, tirado das folhas de
   * referencia dele, que trazem o comodo inteiro como UMA peca.
   *
   * ⚠️ E provavelmente o caminho melhor que montar painel por painel. Montando
   * a casa em 14/08 com as pecas da `folha`, o que mais atrapalhou foi o modulo
   * inconsistente (parede de 289 px contra janela de 325). Num comodo pronto o
   * encaixe ja vem resolvido pelo proprio desenho, e nao ha o que alinhar.
   */
  comodos: {
    size: '1536x1024',
    semEstilo: true,
    texto:
      'A sprite sheet of complete isometric ROOM SHELLS for a 2D fantasy MMORPG, in the ' +
      'visual tradition of Ragnarok Online but with much higher detail — hand-painted ' +
      'digital art with rich texture, NOT a 3D render, NOT a photo.\n\n' +
      'ONE single image containing EXACTLY FOUR complete room shells, arranged in two ' +
      'rows of two, with generous empty space between them. Each room is a single ' +
      'self-contained piece, drawn large and highly detailed.\n\n' +
      'Each room shell is built the same way: a square wooden plank floor seen as an ' +
      'isometric diamond, with TWO walls standing on its two far edges, forming an open ' +
      'L-shaped corner. The two near edges are left open so the interior is fully ' +
      'visible from above — a cutaway room, no ceiling, no roof.\n\n' +
      'All four rooms share the SAME isometric tilt, the SAME floor size and the SAME ' +
      'wall height, and are lit by the same soft directional light from the upper-left.\n\n' +
      'The four rooms:\n' +
      '1. a rough stone-walled room, empty, with a small shuttered window in one wall\n' +
      '2. a half-timbered room (cream plaster with dark oak beams), empty, with a ' +
      '   shuttered window in one wall\n' +
      '3. a furnished bedroom: half-timbered walls, a bed with blue blanket against one ' +
      '   wall, a wooden wardrobe, a small side table with a candle, a rug on the floor, ' +
      '   and a wooden chest\n' +
      '4. a furnished kitchen or workshop: stone walls, a stone fireplace with a fire ' +
      '   burning, a wooden work table, shelves with pots and jars, and a barrel\n\n' +
      'Background: plain flat white, completely empty. No characters, no monsters, no ' +
      'ground outside the rooms, no roof, no UI, no text labels, no watermark.',
  },

  /**
   * 🔴 A CASA INTEIRA COMO UMA PECA SO.
   *
   * ⚠️ Existe porque montar por modulo FALHOU, e o motivo esta medido em
   * 14/08: as pecas da `folha2` sao blocos de vitrine, com frente, lateral e
   * topo visiveis. Duas lado a lado nao encostam — a lateral de uma cobre a
   * frente da outra e o conjunto vira escada. Para encaixar, o modulo teria de
   * ser um segmento de parede SEM lateral propria, e o gerador nao entrega
   * isso porque desenha objeto, nao peca de encaixe.
   *
   * As folhas de referencia do dono trazem casas inteiras justamente assim: a
   * casa e o asset, e o kit modular ao lado e complemento.
   */
  casa: {
    size: '1024x1536',
    semEstilo: true,
    texto:
      'A complete two-storey medieval fantasy house, drawn as a SINGLE isometric game ' +
      'asset for a 2D MMORPG, in the visual tradition of Ragnarok Online but with much ' +
      'higher detail and texture richness — hand-painted digital art, NOT a 3D render, ' +
      'NOT a photo, NOT flat vector art.\n\n' +
      'The house: the ground floor is built of rough hand-cut stone blocks with visible ' +
      'mortar and weathering, with a wooden arched front door standing on straight ' +
      'jambs with a flat stone threshold and a stone step. The upper storey is ' +
      'half-timbered — cream lime plaster with dark aged oak beams, horizontal, ' +
      'vertical and diagonal — and it juts out slightly over the ground floor, as real ' +
      'medieval houses do. Several shuttered windows with blue-tinted glass, some with ' +
      'flower boxes. A steep roof of many small deep-blue shingles with visible tonal ' +
      'variation and soft shadow between the rows, with wide overhanging eaves and a ' +
      'stone chimney. A wooden balcony with turned railing on the upper floor, and a ' +
      'hanging iron lantern by the door.\n\n' +
      'Camera: true isometric projection, viewed from above at the standard isometric ' +
      'angle, showing two faces of the house plus the roof. The whole building is ' +
      'visible and fits within the frame with a small margin.\n\n' +
      'Lighting: soft directional light from the upper-left, warm and painterly, with ' +
      'clearly defined but soft-edged shadows baked into the texture.\n\n' +
      'Background: plain flat white, completely empty. Only ONE house. No characters, ' +
      'no monsters, no trees, no ground, no road, no other buildings, no UI, no text, ' +
      'no watermark, no border.',
  },

  /**
   * 🔴 AS QUATRO INSTALACOES DA CASA — e elas NAO sao invencao minha.
   *
   * `docs/ELYSIA ONLINE.txt` 19.38 nomeia as quatro, explicitamente, como o que
   * pertence estruturalmente a casa e se perde no despejo: **Forja**,
   * **Laboratorio de Alquimia**, **Cozinha** e **Area de Treinamento**.
   *
   * E a 19.25 escalona por tamanho de propriedade:
   *   casa pequena  -> Laboratorio
   *   casa media    -> Laboratorio + Cozinha
   *   grande        -> Forja + Laboratorio + Cozinha + outras
   *
   * O dono pediu cozinha, alquimia e forja em 14/08 — que e exatamente o
   * patamar de GRANDE PROPRIEDADE. A Area de Treinamento entra junto porque a
   * 19.38 a lista, e gerar as quatro de uma vez custa a mesma imagem.
   *
   * ⚠️ O que continua PENDENTE e nao se inventa: `PENDENTE 03` (tamanhos
   * oficiais das propriedades), `PENDENTE 11` (quantas instalacoes por tamanho)
   * e `PENDENTE 12` (niveis maximos de cada uma). Esta arte cobre a APARENCIA
   * das quatro; quantas cabem em que casa e decisao do dono, nao do gerador.
   */
  instalacoes: {
    size: '1536x1024',
    semEstilo: true,
    texto:
      'A sprite sheet of complete isometric ROOM SHELLS for a 2D fantasy MMORPG, in the ' +
      'visual tradition of Ragnarok Online but with much higher detail — hand-painted ' +
      'digital art with rich texture, NOT a 3D render, NOT a photo.\n\n' +
      'ONE single image containing EXACTLY FOUR complete room shells, arranged in two ' +
      'rows of two, with generous empty space between them. Each room is a single ' +
      'self-contained piece, drawn large and highly detailed.\n\n' +
      'Each room shell is built the same way: a square wooden plank floor seen as an ' +
      'isometric diamond, with TWO walls standing on its two far edges, forming an open ' +
      'L-shaped corner. The two near edges are left open so the interior is fully ' +
      'visible from above — a cutaway room, no ceiling, no roof.\n\n' +
      'All four rooms share the SAME isometric tilt, the SAME floor size and the SAME ' +
      'wall height, and are lit by the same soft directional light from the upper-left.\n\n' +
      'The four rooms, each a crafting workshop in a medieval fantasy home:\n' +
      '1. A FORGE: stone walls, a stone forge with glowing orange coals and a chimney ' +
      '   hood, an anvil on a wooden block, a water quenching barrel, hammers and tongs ' +
      '   hanging on the wall, a rack of horseshoes and sword blanks.\n' +
      '2. An ALCHEMY LABORATORY: stone walls, a workbench covered with glass flasks and ' +
      '   retorts holding coloured liquids, a small cauldron bubbling with green light, ' +
      '   shelves of labelled jars and dried herbs hanging in bundles, a thick open book.\n' +
      '3. A KITCHEN: half-timbered walls, a stone hearth with a cooking pot on a hook ' +
      '   over the fire, a heavy wooden prep table with bread, vegetables and a cutting ' +
      '   board, shelves of crockery, strings of onions and garlic hanging.\n' +
      '4. A TRAINING ROOM: half-timbered walls, a straw practice dummy on a post, a ' +
      '   weapon rack holding wooden swords and spears, a round wooden shield and a bow ' +
      '   on the wall, a sandbag hanging from a beam, a low bench.\n\n' +
      'Background: plain flat white, completely empty. No characters, no monsters, no ' +
      'ground outside the rooms, no roof, no UI, no text labels, no watermark.',
  },
};

async function gerar(nome, apiKey) {
  const peca = PECAS[nome];
  if (!peca) throw new Error(`Peca "${nome}" nao existe. Use --lista.`);

  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      // `semEstilo` existe so para a `folha`: o bloco de estilo exige "only ONE
      // piece in the image", e a folha quer justamente varias.
      prompt: peca.semEstilo ? peca.texto : ESTILO + peca.texto,
      size: peca.size,
      // 🔴 Os dois andam juntos: transparencia exige formato com canal alpha.
      // A folha e a excecao: ela pede fundo branco, porque o recorte dela e
      // por peca, feito depois — nao pela API.
      background: peca.semEstilo ? 'opaque' : 'transparent',
      output_format: 'png',
      quality: process.env.QUALIDADE ?? 'high',
      n: 1,
    }),
  });

  if (!resp.ok) {
    const corpo = await resp.text();
    throw new Error(`API respondeu ${resp.status}: ${corpo.slice(0, 500)}`);
  }

  const json = await resp.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error('Resposta sem imagem (data[0].b64_json vazio).');

  mkdirSync(SAIDA, { recursive: true });
  const destino = join(SAIDA, `${nome}.png`);

  // 🔴 NUNCA sobrescrever direto. Custou uma peca boa em 13/08: a 2a tentativa
  // da janela saiu PIOR que a 1a (veio com parede grudada) e apagou a boa, que
  // nao da para recuperar — imagem gerada nao se regera igual nem com o mesmo
  // prompt. Toda versao anterior vai para `historico/` antes da nova entrar.
  if (existsSync(destino)) {
    const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
    const hist = join(SAIDA, 'historico');
    mkdirSync(hist, { recursive: true });
    renameSync(destino, join(hist, `${nome}-${carimbo}.png`));
  }

  writeFileSync(destino, Buffer.from(b64, 'base64'));

  // Diario append-only: e o que permite contar o gasto depois, e saber o que
  // ja foi gerado sem reabrir cada PNG.
  appendFileSync(
    DIARIO,
    JSON.stringify({
      peca: nome,
      quando: new Date().toISOString(),
      size: peca.size,
      qualidade: process.env.QUALIDADE ?? 'high',
      bytes: Buffer.from(b64, 'base64').length,
    }) + '\n',
  );

  return destino;
}

const args = process.argv.slice(2);

if (args.includes('--lista') || args.length === 0) {
  console.log('Pecas disponiveis:\n');
  for (const [nome, p] of Object.entries(PECAS)) {
    console.log(`  ${nome.padEnd(18)} ${p.size}`);
  }
  console.log('\nUso: node tools/cenario/gerar-peca.mjs <peca> [<peca>...]');
  process.exit(0);
}

const apiKey = chave();
if (!apiKey) {
  console.error('Faltou OPENAI_API_KEY. Ponha no `.env` da raiz (ele e ignorado pelo git).');
  process.exit(1);
}

if (args.length > TETO_POR_RODADA) {
  console.error(
    `Pedidas ${args.length} imagens, teto e ${TETO_POR_RODADA}. ` +
      `Suba com TETO_IMAGENS=<n> se for de proposito.`,
  );
  process.exit(1);
}

let ok = 0;
for (const nome of args) {
  try {
    process.stdout.write(`gerando ${nome}... `);
    const destino = await gerar(nome, apiKey);
    console.log(`✓ ${destino}`);
    ok += 1;
  } catch (erro) {
    console.error(`✗ ${nome}: ${erro.message}`);
  }
}

console.log(`\n${ok} de ${args.length} geradas. Diario: ${DIARIO}`);
