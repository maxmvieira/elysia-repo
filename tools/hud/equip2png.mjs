/**
 * Prepara os ícones de EQUIPAMENTO a partir dos packs de pixel art.
 *
 * 🔴 **Este arquivo não decide nada sobre o jogo — ele só corta.** Quem diz qual
 * ícone veste qual item é `client/src/itemart.ts`, e a razão é que essa escolha
 * depende do CATÁLOGO: a ordem em que os itens estão declarados é a ordem de
 * tier ("espada_enferrujada" antes de "espada_primordial"), e o catálogo é
 * TypeScript. Um conversor `.mjs` não tem como lê-lo.
 *
 * ✅ Por isso aqui se corta a FILEIRA inteira e se nomeia por origem
 * (`w1_07.png`), não por item. O cliente escolhe pelo índice.
 *
 * ⚠️ **A ordem dentro de cada pack É a informação.** Estes packs vêm em dez
 * fileiras de dez, uma por tipo de arma ou peça, e dentro da fileira vão do
 * simples ao ornamentado — madeira e ferro à esquerda, chama e cristal à
 * direita. É essa progressão que casa com a ordem do catálogo, e é por isso que
 * o corte preserva o número do arquivo em vez de reordenar.
 *
 * ## Uso
 *
 *   node tools/hud/equip2png.mjs --fonte "C:/.../packs"   # uma vez
 *   node tools/hud/equip2png.mjs                          # monta os PNGs
 */

import { readdirSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const FONTE = 'arte-fonte/itens';
const DESTINO = 'client/public/assets/hud/itens';

/**
 * Lado do PNG final.
 *
 * ⚠️ 64 é o dobro EXATO dos 32 do original, e inteiro de propósito: a arte é de
 * pixel, e um fator quebrado deixaria uns pixels com o dobro da largura dos
 * outros. Dois vezes chega para o slot de 32 px em tela HiDPI.
 */
const LADO = 64;

/**
 * Os packs, com a pasta de onde vêm.
 *
 * ⚠️ Cada um é cortado INTEIRO, e não só as fileiras usadas. É o oposto da
 * regra que vale para as folhas do dono ("o que não entra no jogo não entra no
 * repositório"), e por um motivo: aqui a unidade de curadoria é a FILEIRA, e o
 * índice do arquivo é o que amarra o corte à escolha do cliente. Cortar pela
 * metade quebraria a numeração e a escolha viraria adivinhação.
 */
const PACKS = {
  w1: { pasta: 'craftpix-net-204068-100-pixel-art-weapon-icons/Icons' },
  w2: { pasta: 'craftpix-net-460362-100-pixel-art-weapon-icons-pack-2/Icons' },
  a1: { pasta: 'craftpix-net-339915-100-pixel-art-armor-icons/Icons' },
  rg: { pasta: 'craftpix-net-539335-ring-earring-and-amulet-pixel-art-icons/Icons' },
  mb: { pasta: 'craftpix-net-872304-magic-wand-and-book-icon-pack/Icons/2 Books' },
  th: { pasta: 'craftpix-net-975646-things-for-rpg-game-32x32-pixel-art/Icons' },
  rc: { pasta: 'craftpix-net-674745-resource-rpg-icons-32x32-pixel-art/Icons' },
  nt: { pasta: 'craftpix-net-712507-nature-things-pixel-art-32x32-icons/Icons' },
};

const dois = (n) => String(n).padStart(3, '0');

// ---------------------------------------------------------------------------
// Etapa 1: preparar a fonte
// ---------------------------------------------------------------------------

const iFonte = process.argv.indexOf('--fonte');
if (iFonte >= 0) {
  const base = process.argv[iFonte + 1];
  if (!base) { console.error('uso: --fonte <pasta-com-os-packs>'); process.exit(1); }
  mkdirSync(FONTE, { recursive: true });
  for (const [alias, p] of Object.entries(PACKS)) {
    const dir = join(base, p.pasta);
    /*
     * ⚠️ Ordenação NUMÉRICA, não alfabética. Os arquivos se chamam `icon_1`…
     * `icon_100`, e em ordem de texto o 100 vem logo depois do 1 — a fileira
     * inteira sairia embaralhada, e com ela a progressão de tier.
     */
    const arquivos = readdirSync(dir).filter((f) => f.endsWith('.png'))
      .sort((a, b) => (a.match(/\d+/g)?.map(Number).at(-1) ?? 0) - (b.match(/\d+/g)?.map(Number).at(-1) ?? 0));
    arquivos.forEach((f, i) => {
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(dir, f),
        '-vf', `scale=${LADO}:${LADO}:flags=neighbor`, '-pix_fmt', 'rgba',
        join(FONTE, `${alias}_${dois(i + 1)}.png`)], { stdio: 'inherit' });
    });
    console.log(`[equip] fonte ${alias}: ${arquivos.length} ícones`);
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Etapa 2: publicar
// ---------------------------------------------------------------------------

if (!existsSync(FONTE)) {
  console.error(`[equip] sem fonte preparada em ${FONTE} — rode com --fonte`);
  process.exit(1);
}
mkdirSync(DESTINO, { recursive: true });
const arquivos = readdirSync(FONTE).filter((f) => f.endsWith('.png'));
for (const f of arquivos) copyFileSync(join(FONTE, f), join(DESTINO, f));

/*
 * O manifesto diz ao cliente QUANTOS ícones cada pack tem. Sem ele o cliente
 * precisaria repetir esses números, e um pack recortado pela metade viraria
 * imagem quebrada em vez de erro.
 */
const contagem = {};
for (const f of arquivos) {
  const alias = f.slice(0, f.indexOf('_'));
  contagem[alias] = (contagem[alias] ?? 0) + 1;
}
writeFileSync('client/src/itens-packs.json', `${JSON.stringify(contagem, null, 2)}\n`);
console.log(`[equip] ${arquivos.length} ícones em ${DESTINO}`);
console.log(`[equip] manifesto: ${Object.entries(contagem).map(([k, v]) => `${k}=${v}`).join(' ')}`);
