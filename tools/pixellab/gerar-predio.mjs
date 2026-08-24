/**
 * Gerador de PRÉDIOS em pixel art, pelo PixelLab.
 *
 * Produz um PNG por prédio:
 *
 *   client/public/assets/buildings/<nome>.png
 *
 * Uso:
 *   node tools/pixellab/gerar-predio.mjs casa-pixel
 *   node tools/pixellab/gerar-predio.mjs --lista
 *
 * ## 🔴 Por que é um script separado do `gerar-movel.mjs`
 *
 * Só uma coisa os separa, e ela é grande: **o tamanho da célula**.
 *
 * Móvel sai em 64 px, o mesmo dos personagens. Prédio em 64 px fica ILEGÍVEL —
 * o dono viu a primeira casa e disse *"está bem feia"*, e a causa é aritmética:
 * uma casa de dois andares com telhado, chaminé, porta e janelas não cabe em
 * 64×64. Não é prompt ruim, é pixel de menos.
 *
 * ⚠️ O `PIXELLAB-RECEITA.md` registra que **`animate-with-text` trava em 64**
 * (mínimo e máximo iguais), e é dele que vem a impressão de que 64 é o teto do
 * PixelLab. Mas ele diz também que *"os outros endpoints aceitam mais"* — e
 * sondando a API, `generate-image-pixflux` **aceita 128×128** (HTTP 200).
 * Prédio não é animado, então não passa por aquele endpoint e pode ser maior.
 *
 * 🔴 **128 tem quatro vezes o pixel de 64.** É essa a diferença entre a casa
 * que o dono achou feia e uma que dá para olhar.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SAIDA = join(RAIZ, 'client', 'public', 'assets', 'buildings');
const FONTE = join(RAIZ, 'arte-fonte', 'pixellab', '_predios');

function token() {
  if (process.env.PIXELLAB_TOKEN) return process.env.PIXELLAB_TOKEN;
  const env = join(RAIZ, '.env');
  if (existsSync(env)) {
    const linha = readFileSync(env, 'utf8').split('\n')
      .find((l) => l.startsWith('PIXELLAB_TOKEN='));
    if (linha) return linha.slice('PIXELLAB_TOKEN='.length).trim();
  }
  return null;
}

const API = 'https://api.pixellab.ai/v1';

/**
 * 🔴 128 px — o dobro do lado, o QUÁDRUPLO do pixel de um móvel.
 *
 * ⚠️ E ele decide a escala no jogo: com tile de 32, `escala = 32*tiles/128`, ou
 * seja `tiles/4`. **Só múltiplo de 4 dá escala inteira** — 4 tiles é 1,0×,
 * 8 tiles é 2,0×. Qualquer outro valor traz o serrilhado de 10/08, quando
 * escala fracionária com filtragem `nearest` faz um pixel virar 2 na tela e o
 * vizinho virar 3.
 */
const CELL = 128;

const COMUM = {
  image_size: { width: CELL, height: CELL },
  view: 'high top-down',
  no_background: true,
  outline: 'single color black outline',
  /*
   * ⚠️ `highly detailed` e não `medium detail`, ao contrário dos móveis.
   * Em 128 px há pixel para gastar, e prédio é o objeto onde detalhe rende:
   * telha, pedra e viga são padrões repetidos, que é o que pixel art faz bem.
   */
  detail: 'highly detailed',
};

const PREDIOS = {
  /*
   * 🔴 A FACHADA TEM DE ESTAR DE FRENTE — e o prompt insiste nisso porque a
   * primeira casa saiu em três quartos, com a porta na face ESQUERDA.
   *
   * O jogador chega pelo SUL: a porta da planta fica na parede de baixo. Com a
   * porta desenhada à esquerda, ele atravessava a fachada por um ponto onde não
   * há porta nenhuma no desenho. O dono viu: *"vira a casa de frente de acordo
   * com a entrada dela para ficar realista"*.
   *
   * ⚠️ Isto não é capricho de ângulo: em jogo top-down o jogador só encosta na
   * casa pelas quatro direções da grade, e a porta tem de cair numa delas.
   */
  'casa-pixel': {
    tiles: 8,
    desc: 'a two-storey medieval half-timbered house seen from above at a high '
      + 'top-down angle, facing the viewer DIRECTLY — the front wall with the door '
      + 'is parallel to the bottom edge of the image and fully visible, not turned '
      + 'to one side, no three-quarter view. '
      + 'The ground floor is grey stone blocks with visible mortar. The upper floor '
      + 'is cream plaster crossed by dark oak beams and juts out slightly over the '
      + 'ground floor. A steep roof of small blue slate shingles with a wide '
      + 'overhang and a grey stone chimney. Small windows with wooden shutters and '
      + 'warm yellow light inside. '
      + 'In the MIDDLE of the front wall, a dark wooden door with a stone step, '
      + 'centred and facing the viewer.',
  },
};

async function gera(nome, chave) {
  const p = PREDIOS[nome];
  if (!p) throw new Error(`prédio "${nome}" não existe. Use --lista.`);

  const r = await fetch(`${API}/generate-image-pixflux`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
    body: JSON.stringify({ ...COMUM, description: p.desc }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${txt.slice(0, 300)}`);

  const b64 = JSON.parse(txt).image?.base64;
  if (!b64) throw new Error('resposta sem imagem');
  const buf = Buffer.from(String(b64).replace(/^data:image\/\w+;base64,/, ''), 'base64');

  mkdirSync(SAIDA, { recursive: true });
  mkdirSync(FONTE, { recursive: true });
  writeFileSync(join(FONTE, `${nome}.png`), buf);
  writeFileSync(join(SAIDA, `${nome}.png`), buf);
  return join(SAIDA, `${nome}.png`);
}

const args = process.argv.slice(2);
if (args.includes('--lista') || !args.length) {
  console.log(`Prédios (célula ${CELL}px):\n`);
  for (const [n, p] of Object.entries(PREDIOS)) {
    const esc = (32 * p.tiles) / CELL;
    console.log(`  ${n.padEnd(14)} ${p.tiles} tiles  escala ${esc}× ${Number.isInteger(esc) ? '✅' : '🔴 FRACIONÁRIA'}`);
  }
  process.exit(0);
}

const chave = token();
if (!chave) {
  console.error('Faltou PIXELLAB_TOKEN no .env.');
  process.exit(1);
}

for (const nome of args) {
  try {
    process.stdout.write(`  ${nome.padEnd(14)} `);
    console.log(`✓ ${await gera(nome, chave)}`);
  } catch (erro) {
    console.log(`✗ ${erro.message}`);
  }
}
