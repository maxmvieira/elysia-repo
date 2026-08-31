/**
 * Conversor **porco, vaca e galinha** do pack Farm → folhas de criatura do jogo.
 *
 * Entrada: `assets/Farm/PNG/{Pig,Cow,Chicken}_animation.png`
 * Saída:   `client/public/assets/monsters/{pig,cow,chicken}/{walk,idle}.png`
 *
 * Roda junto com o resto da fazenda: `npm run farm:build`.
 *
 * ## 🔴 O LAYOUT DO PACK, e como ele foi descoberto
 *
 * Nada disso está escrito em lugar nenhum do pack — saiu de olhar as folhas
 * ampliadas, com grade por cima. As três seguem o mesmo desenho:
 *
 *   8 colunas de sprite × 6 linhas, e as colunas vêm em DOIS blocos:
 *
 *   | colunas | animação | quadros | linhas usadas |
 *   |---|---|---|---|
 *   | 0–3 | **andar** | 6 | 0 a 5 |
 *   | 4–7 | **parado** | 4 | 0 a 3 (as linhas 4 e 5 ficam vazias) |
 *
 * Dentro de cada bloco a ordem é `frente, costas, esquerda, direita`.
 *
 * ⚠️ **Que o segundo bloco é o PARADO não foi chute:** o autor decorou o
 * `Farm.tmx` com bichos das colunas 4, 5 e 7 — ou seja, com as poses de bicho
 * parado, que é o que se usa em cenário. O primeiro bloco, de 6 quadros, é o
 * andar.
 *
 * ## 🔴 AS DUAS LATERAIS VÊM TROCADAS — de novo
 *
 * O jogo espera `SHEET_ROW = { down: 0, up: 1, right: 2, left: 3 }`. O pack
 * entrega `frente, costas, ESQUERDA, DIREITA`. Então as duas últimas se
 * invertem na cópia, exatamente como no `golem2strip.mjs`.
 *
 * Foi conferido AMPLIANDO as duas colunas lado a lado: na coluna 2 o focinho e
 * o olho do porco estão à esquerda e o rabinho à direita; na 3, o contrário.
 * Copiar na ordem em que vem faria os três bichos **andarem de costas para os
 * lados** — o moonwalk que a fauna teve em 29/08.
 *
 * ⚠️ Não existe "convenção da CraftPix": cada pack é de um autor. O de animais
 * de pasto (`animals2strip.mjs`) já vinha na ordem certa; este e o do Golem, não.
 * A única forma de saber é olhar.
 *
 * ## Tamanhos de célula
 *
 * Porco e galinha vêm em 32×32; a vaca, em **64×64** — ela é o dobro, e é assim
 * que o pack a desenhou. Todas quadradas, que é o que o `CreatureSheetCfg` do
 * jogo aceita (ele só tem um `cell`).
 *
 * ⚠️ O código ainda suporta célula de origem retangular (`celH` ≠ `cel`,
 * encostando o conteúdo embaixo). Fica porque foi por ali que a vaca passou
 * antes de eu conferir a folha certa — a de `Tiled_files/` e a de `PNG/` têm
 * alturas diferentes, e a verificação de 8×6 é que pegou a troca.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const OUT = 'client/public/assets/monsters';

/**
 * ⚠️ `celW`/`celH` são a célula de ORIGEM; `cel` é a quadrada de saída.
 * Conferidos dividindo as dimensões da folha por 8 colunas × 6 linhas.
 */
const ESPECIES = {
  pig: { arquivo: 'Pig_animation.png', celW: 32, celH: 32, cel: 32, escala: 2 },
  cow: { arquivo: 'Cow_animation.png', celW: 64, celH: 64, cel: 64, escala: 2 },
  chicken: { arquivo: 'Chicken_animation.png', celW: 32, celH: 32, cel: 32, escala: 2 },
};

/** Coluna de origem para cada linha de destino, por animação. */
const BLOCOS = {
  //                    down up right left     ← ordem do jogo
  walk: { colunas: [0, 1, 3, 2], quadros: 6 },
  idle: { colunas: [4, 5, 7, 6], quadros: 4 },
};

const linhasCfg = [];

for (const [tipo, cfg] of Object.entries(ESPECIES)) {
  const img = decode(`assets/Farm/PNG/${cfg.arquivo}`);
  const colsNaFolha = img.w / cfg.celW;
  const linhasNaFolha = img.h / cfg.celH;
  if (colsNaFolha !== 8 || linhasNaFolha !== 6) {
    throw new Error(
      `${cfg.arquivo}: esperado 8×6 células de ${cfg.celW}×${cfg.celH}, `
      + `veio ${colsNaFolha}×${linhasNaFolha} — o layout do pack mudou, releia o cabeçalho`,
    );
  }

  const dir = `${OUT}/${tipo}`;
  mkdirSync(dir, { recursive: true });

  for (const [nome, bloco] of Object.entries(BLOCOS)) {
    const W = bloco.quadros * cfg.cel;
    const H = 4 * cfg.cel;
    const px = Buffer.alloc(W * H * 4);
    // Conteúdo encostado embaixo da célula quadrada (a vaca é mais baixa).
    const desloca = cfg.cel - cfg.celH;

    bloco.colunas.forEach((colOrigem, linhaDestino) => {
      for (let q = 0; q < bloco.quadros; q++) {
        const sx = colOrigem * cfg.celW;
        const sy = q * cfg.celH;
        for (let y = 0; y < cfg.celH; y++) {
          for (let x = 0; x < cfg.celW; x++) {
            const s = ((sy + y) * img.w + sx + x) * 4;
            const dx = q * cfg.cel + x;
            const dy = linhaDestino * cfg.cel + desloca + y;
            const d = (dy * W + dx) * 4;
            px[d] = img.px[s];
            px[d + 1] = img.px[s + 1];
            px[d + 2] = img.px[s + 2];
            px[d + 3] = img.px[s + 3];
          }
        }
      }
    });

    writeFileSync(`${dir}/${nome}.png`, encode(W, H, px));
  }

  // --- âncora, medida no ANDAR e no PARADO, como manda a lição do Golem -----
  //
  // 🔴 Só as poses de repouso entram na medida. Aqui as duas são repouso (não há
  // golpe nem morte), então a união é segura — mas a regra fica escrita para
  // quando alguém acrescentar um `attack`.
  const andar = decode(`${dir}/walk.png`);
  const parado = decode(`${dir}/idle.png`);
  let topo = cfg.cel, base = -1, esq = cfg.cel, dir_ = -1;
  for (const folha of [andar, parado]) {
    for (let y = 0; y < folha.h; y++) {
      for (let x = 0; x < folha.w; x++) {
        if (folha.px[(y * folha.w + x) * 4 + 3] <= 8) continue;
        const ly = y % cfg.cel, lx = x % cfg.cel;
        if (ly < topo) topo = ly;
        if (ly > base) base = ly;
        if (lx < esq) esq = lx;
        if (lx > dir_) dir_ = lx;
      }
    }
  }
  const altura = base - topo + 1;
  const largura = dir_ - esq + 1;
  linhasCfg.push(
    `  ${tipo}: { cell: ${cfg.cel}, scale: ${cfg.escala},`
    + ` anchorX: ${(esq + dir_ + 1) / 2 / cfg.cel},`
    + ` anchorY: ${(base + 1) / cfg.cel},`
    + ` labelTop: ${-(altura * cfg.escala) - 6} },`
    + ` // ${altura}px de conteudo -> ${altura * cfg.escala}px na tela`,
  );
  console.log(
    `✅ ${tipo.padEnd(8)} andar 6q · parado 4q · célula ${cfg.cel}`
    + `  conteúdo ${largura}×${altura}  pé em y=${base + 1}`
    + `  escala ${cfg.escala}× -> ${altura * cfg.escala}px`,
  );
}

console.log('\n--- cole em CREATURE_SHEETS (client/src/miniworld.ts) ---');
for (const l of linhasCfg) console.log(l);
