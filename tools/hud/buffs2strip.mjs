/**
 * Monta as TIRAS de efeito de buff/debuff a partir do pacote de animações.
 *
 * ## Duas etapas, como o pipeline do personagem
 *
 * `--fonte <pasta-do-pack>` prepara: lê os quadros originais e grava
 * `arte-fonte/buffs/<efeito>/NN.png`. Sem argumento, monta as tiras que o jogo
 * carrega. É a mesma divisão de `universal-fonte.mjs` → `universal2strip.mjs`,
 * e existe pelo mesmo motivo: a preparação roda uma vez, na máquina de quem
 * baixou o pacote; a montagem roda sempre que a tira muda.
 *
 * 🔴 **O PACOTE VEM ENTRELAÇADO (Adam7)**, e é por isso que a preparação passa
 * pelo ffmpeg em vez do decodificador daqui. O `png.mjs` lê PNG cru sequencial
 * — nos arquivos entrelaçados ele devolve 640×800 e um chuvisco de pixels, sem
 * erro nenhum, que é o pior jeito de falhar. Quem descobriu isso foi a folha de
 * contato: dezesseis quadros de ruído colorido.
 *
 * ⚠️ **A fonte guardada é REDUZIDA a 2× o tamanho de uso (192×240), e não a
 * original de 640×800.** Os seis efeitos somam 26 MB em tamanho cheio, num
 * repositório que tem 24 de arte inteira, para desenhos que aparecem a 96 px. É
 * a mesma regra que o `.gitignore` já aplica ao áudio original: o arquivo cheio
 * fica com o dono, o repositório leva a versão preparada. **Guarde o zip.**
 *
 * ## Uso
 *
 *   node tools/hud/buffs2strip.mjs --fonte "C:/.../pack"   # uma vez
 *   node tools/hud/buffs2strip.mjs                          # monta as tiras
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { decode, encode } from './png.mjs';

const FONTE = 'arte-fonte/buffs';
const DESTINO = 'client/public/assets/fx';
const MANIFESTO = 'client/src/fx-folhas.json';

/**
 * Largura e altura de cada quadro na tira.
 *
 * ⚠️ O original é 640×800, e a proporção 4:5 é preservada: o efeito tem um anel
 * no chão e asas subindo acima dele, e espremer para um quadrado achataria as
 * duas coisas. 96 de largura é pouco mais que o tile, que é o que faz o anel
 * abraçar o personagem sem cobrir o vizinho.
 */
const LARG = 96;
const ALT = 120;

/**
 * Os efeitos, com a pasta do pacote e quantos quadros cada um tem.
 *
 * ⚠️ **A contagem NÃO é a mesma nos seis** — três têm dezesseis quadros e três
 * têm doze. É por isso que existe manifesto: a tira do Fire Bolt podia assumir
 * dezesseis colunas fixas no cliente, e aqui esse contrato quebraria em metade
 * dos arquivos.
 */
const EFEITOS = [
  { nome: 'revival', pasta: 'Revival', quadros: 16 },
  { nome: 'debuff', pasta: 'Debuff', quadros: 16 },
  { nome: 'immunity', pasta: 'Immunity', quadros: 16 },
  { nome: 'life_recovery', pasta: 'Life Recovery', quadros: 12 },
  { nome: 'mana_recovery', pasta: 'Mana Recovery', quadros: 12 },
  { nome: 'strength_buff', pasta: 'Strength Buff', quadros: 12 },
];

const ffmpeg = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });

// ---------------------------------------------------------------------------
// Etapa 1: preparar a fonte (uma vez, com o pacote em mãos)
// ---------------------------------------------------------------------------

const iFonte = process.argv.indexOf('--fonte');
if (iFonte >= 0) {
  const pack = process.argv[iFonte + 1];
  if (!pack) { console.error('uso: --fonte <pasta-do-pack>'); process.exit(1); }
  for (const e of EFEITOS) {
    const de = join(pack, e.pasta, 'PNG');
    const para = join(FONTE, e.nome);
    mkdirSync(para, { recursive: true });
    for (let i = 1; i <= e.quadros; i++) {
      const n = String(i).padStart(2, '0');
      ffmpeg(['-i', join(de, `${e.pasta}_Frame_${n}.png`),
        '-vf', `scale=${LARG * 2}:${ALT * 2}:flags=lanczos`, join(para, `${n}.png`)]);
    }
    console.log(`[buffs] fonte ${e.nome}: ${e.quadros} quadros em ${para}`);
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Etapa 2: montar as tiras
// ---------------------------------------------------------------------------

mkdirSync(DESTINO, { recursive: true });
const manifesto = {};
for (const e of EFEITOS) {
  const pasta = join(FONTE, e.nome);
  if (!existsSync(pasta)) {
    console.log(`[buffs] ${e.nome}: sem fonte preparada, pulando (rode com --fonte)`);
    continue;
  }
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.png')).sort();
  const quadros = arquivos.map((f) => decode(join(pasta, f)));
  const W = LARG * quadros.length;
  const out = Buffer.alloc(W * ALT * 4);
  quadros.forEach((q, k) => {
    /*
     * ⚠️ Redução por MÉDIA de bloco, não por amostragem: de 192 para 96 são
     * quatro pixels virando um, e este efeito é feito de faísca de um pixel —
     * amostrar apagaria metade delas de um quadro para o outro, e a animação
     * ficaria piscando.
     */
    for (let y = 0; y < ALT; y++) {
      for (let x = 0; x < LARG; x++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let sy = y * 2; sy < y * 2 + 2; sy++) {
          for (let sx = x * 2; sx < x * 2 + 2; sx++) {
            const o = (sy * q.w + sx) * 4;
            const peso = q.px[o + 3] / 255;
            r += q.px[o] * peso; g += q.px[o + 1] * peso; b += q.px[o + 2] * peso;
            a += q.px[o + 3]; n += peso;
          }
        }
        const d = (y * W + k * LARG + x) * 4;
        out[d] = n ? Math.round(r / n) : 0;
        out[d + 1] = n ? Math.round(g / n) : 0;
        out[d + 2] = n ? Math.round(b / n) : 0;
        out[d + 3] = Math.round(a / 4);
      }
    }
  });
  writeFileSync(join(DESTINO, `${e.nome}.png`), encode(W, ALT, out));
  manifesto[e.nome] = quadros.length;
  console.log(`[buffs] ${e.nome}.png  ${W}x${ALT}  (${quadros.length} quadros)`);
}

writeFileSync(MANIFESTO, `${JSON.stringify(manifesto, null, 2)}\n`);
console.log(`[buffs] manifesto em ${MANIFESTO}`);
