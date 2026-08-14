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
      prompt: ESTILO + peca.texto,
      size: peca.size,
      // 🔴 Os dois andam juntos: transparencia exige formato com canal alpha.
      background: 'transparent',
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
