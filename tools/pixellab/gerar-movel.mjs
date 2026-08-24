/**
 * Gerador de MÓVEIS de interior, pelo PixelLab.
 *
 * Produz um PNG por móvel, com fundo transparente:
 *
 *   client/public/assets/furniture/<nome>.png
 *
 * Uso:
 *   node tools/pixellab/gerar-movel.mjs                 # todos os que faltam
 *   node tools/pixellab/gerar-movel.mjs cama mesa       # só esses
 *   node tools/pixellab/gerar-movel.mjs --lista
 *
 * ⚠️ O token NUNCA entra no repositório: vem de `PIXELLAB_TOKEN` no `.env`.
 *
 * ## 🔴 Por que móvel é o caso FÁCIL do PixelLab
 *
 * O `PIXELLAB-RECEITA.md` documenta seis becos e ~44 gerações perdidas, e o
 * maior deles é **girar o desenho para 4 direções**: o `/rotate` duplica a
 * cabeça no leste, e o `direction` do pixflux é ignorado.
 *
 * **Móvel não gira.** Uma cama vista de cima é a mesma de qualquer lado que o
 * jogador venha — no jogo ele anda em volta, não em torno dela. Então este
 * script usa só o passo que a receita registra como *"saiu bom de primeira"*:
 * `generate-image-pixflux` com `high top-down`.
 *
 * 💳 **1 geração por móvel.** Contra 8 por classe.
 *
 * ## Por que não é `wall_interior`
 *
 * Hoje cada `F` da planta vira parede: bloqueia certo e **desenha como pedra**,
 * então a cama parece muro. Estes PNGs entram como OBJETO sobre o tile, no
 * molde do `makeTree` — que já está provado com as árvores.
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SAIDA = join(RAIZ, 'client', 'public', 'assets', 'furniture');
const FONTE = join(RAIZ, 'arte-fonte', 'pixellab', '_moveis');

/** Lê a chave do `.env` — o shell não guarda estado entre chamadas. */
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
 * 🔴 64 px, o mesmo dos personagens — e não é escolha estética.
 *
 * O `PIXELLAB-RECEITA.md` registra que `animate-with-text` declara `width` e
 * `height` com mínimo E máximo iguais a 64, e que **misturar tamanhos entre
 * peças do mesmo jogo quebra o conversor**. Móvel não passa por aquele
 * endpoint, mas manter 64 deixa tudo na mesma resolução de pixel: um móvel de
 * 96 ao lado de um herói de 64 teria pixel de tamanho diferente na tela, e isso
 * salta aos olhos mesmo em quem não sabe explicar por quê.
 */
const CELL = 64;

/**
 * Opções fixas — copiadas da receita que funcionou para as classes.
 *
 * ⚠️ `view: 'high top-down'` é o ângulo do jogo. `'side'` não assenta em mapa
 * visto de cima, e é o erro mais fácil de cometer com móvel, porque cadeira
 * "de lado" parece mais natural de pedir.
 */
const COMUM = {
  image_size: { width: CELL, height: CELL },
  view: 'high top-down',
  no_background: true,
  outline: 'single color black outline',
  detail: 'medium detail',
};

/**
 * Os móveis, e o que cada um descreve.
 *
 * 🔴 As descrições saem do que a PLANTA já mostra em cada cômodo — cozinha,
 * forja, alquimia e quarto — e as quatro instalações são as que o Doc 1 nomeia
 * na §19.38 (Forja, Laboratório de Alquimia, Cozinha, Área de Treinamento).
 * Não é invenção de mobília.
 *
 * ⚠️ `tiles` é o tamanho em tiles que o móvel deve OCUPAR na tela, e vale para
 * o desenho, não para o arquivo — a escala divide pela caixa de alpha medida,
 * como em `trees.ts`. Um tile é 32 px, e o herói tem 58 px de altura.
 */
const MOVEIS = {
  // --- quarto ---
  cama: {
    tiles: 2,
    desc: 'a medieval wooden bed seen from directly above, with a plain pillow '
      + 'and a folded blue blanket, dark oak frame',
  },
  bau: {
    tiles: 1,
    desc: 'a small medieval wooden chest with iron bands and a round lock, '
      + 'closed, seen from directly above',
  },
  armario: {
    tiles: 1.4,
    desc: 'a tall medieval wooden wardrobe with two doors, seen from directly '
      + 'above so the top surface and the doors are visible',
  },
  // --- cozinha ---
  mesa: {
    tiles: 1.6,
    desc: 'a sturdy medieval wooden work table seen from directly above, with a '
      + 'loaf of bread and a knife on the top',
  },
  barril: {
    tiles: 1,
    desc: 'a medieval wooden barrel with dark iron bands, standing upright, '
      + 'seen from directly above so the round lid is visible',
  },
  // --- forja ---
  bigorna: {
    tiles: 1,
    desc: 'a blacksmith anvil of dark iron on a round wooden block, seen from '
      + 'directly above',
  },
  forja: {
    tiles: 1.6,
    desc: 'a stone blacksmith forge with glowing orange coals burning inside, '
      + 'seen from directly above',
  },
  /*
   * --- A ESCADA ---
   *
   * 🔴 Ela faltava, e o sintoma foi o dono dizer *"não tem escada, construa
   * ela"*. A planta já tinha o `>`, e o worldgen já criava o link que sobe —
   * mas o `>` virava `stone_slab`, que desenha uma laje. **A mecânica existia e
   * a arte não**, então subia-se por um pedaço de chão sem nada à vista.
   */
  /*
   * ⚠️ A descrição pede um LANCE COMPRIDO, e a primeira não pedia.
   *
   * A primeira escada saiu como um degrauzinho quadrado, e ocupava 1 tile na
   * planta. O dono: *"a escada está pequena e não realista"*. Escada de verdade
   * é longa — sobe um andar inteiro —, então tanto a arte quanto o bloco
   * precisam ser compridos. Aqui ela ocupa **2×3 tiles**.
   */
  escada: {
    tiles: 2,
    desc: 'a long straight flight of wooden stairs seen from directly above, '
      + 'running from the bottom of the image to the top, with about ten '
      + 'parallel steps in dark oak and a wooden handrail along one side',
  },
  // --- alquimia ---
  caldeirao: {
    tiles: 1,
    desc: 'a black iron cauldron on three legs, filled with bubbling green '
      + 'liquid, seen from directly above',
  },
  bancada: {
    tiles: 1.6,
    desc: 'a medieval alchemy workbench seen from directly above, with small '
      + 'glass flasks of coloured liquid and an open book on the top',
  },
};

async function gera(nome, chave) {
  const m = MOVEIS[nome];
  if (!m) throw new Error(`móvel "${nome}" não existe. Use --lista.`);

  const r = await fetch(`${API}/generate-image-pixflux`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
    body: JSON.stringify({ ...COMUM, description: m.desc }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${txt.slice(0, 300)}`);

  const b64 = JSON.parse(txt).image?.base64;
  if (!b64) throw new Error('resposta sem imagem');
  const buf = Buffer.from(String(b64).replace(/^data:image\/\w+;base64,/, ''), 'base64');

  mkdirSync(SAIDA, { recursive: true });
  mkdirSync(FONTE, { recursive: true });
  // A fonte fica versionada junto da saída, como nos outros packs.
  writeFileSync(join(FONTE, `${nome}.png`), buf);
  writeFileSync(join(SAIDA, `${nome}.png`), buf);
  return join(SAIDA, `${nome}.png`);
}

const args = process.argv.slice(2);

if (args.includes('--lista')) {
  console.log('Móveis disponíveis:\n');
  for (const [n, m] of Object.entries(MOVEIS)) {
    console.log(`  ${n.padEnd(12)} ${String(m.tiles).padStart(4)} tiles`);
  }
  console.log(`\n${Object.keys(MOVEIS).length} móveis = ${Object.keys(MOVEIS).length} gerações.`);
  process.exit(0);
}

const chave = token();
if (!chave) {
  console.error('Faltou PIXELLAB_TOKEN. Pegue em pixellab.ai/account, campo "Secret".');
  process.exit(1);
}

// Sem argumento: só os que ainda não estão no disco. Não regera de graça.
const pedidos = args.length ? args : Object.keys(MOVEIS)
  .filter((n) => !existsSync(join(SAIDA, `${n}.png`)));

if (!pedidos.length) {
  console.log('Nada a gerar — todos já estão em client/public/assets/furniture/.');
  process.exit(0);
}

console.log(`${pedidos.length} móvel(is): ${pedidos.join(', ')}\n`);
let ok = 0;
for (const nome of pedidos) {
  try {
    process.stdout.write(`  ${nome.padEnd(12)} `);
    console.log(`✓ ${await gera(nome, chave)}`);
    ok += 1;
  } catch (erro) {
    console.log(`✗ ${erro.message}`);
  }
}
console.log(`\n${ok} de ${pedidos.length} gerados.`);
