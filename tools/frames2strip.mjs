/**
 * Conversor de ARTE DE CLASSE: pastas de quadros soltos -> tiras do jogo.
 *
 * Os packs de herói chegam com **um PNG por quadro**, numa pasta por direção:
 *
 *   <pack>/Idle/animations/<Animacao>/<dir>/frame_000.png ...
 *   <pack>/Idle/rotations/<dir>.png          (pose parada, uma por direção)
 *
 * São 843 arquivos nos cinco packs. Carregar isso solto seria uma requisição
 * por quadro; o jogo já resolve de outro jeito (`SPEC-SPRITES-MONSTROS.md`):
 * **uma tira por animação**, com uma LINHA por direção. É o mesmo formato que o
 * `sliceDirs` do `miniworld.ts` já lê, então o cliente não precisa de código
 * novo para consumir isto.
 *
 * Layout de saída (idêntico ao MiniWorld, por isso a ordem é esta):
 *
 *   linha 0 = sul (baixo) · 1 = norte (cima) · 2 = leste (direita) · 3 = oeste
 *
 * 🔴 Por que existe um passo de conversão em vez de o cliente ler os quadros:
 * é a mesma razão do `tmx2world.mjs` — o formato de AUTORIA (o que o gerador de
 * arte cospe) não é o formato que o jogo consome. Os quadros soltos ficam
 * versionados em `arte-fonte/classes/`, e o que o navegador baixa é a tira.
 *
 * Uso:  node tools/frames2strip.mjs            (todas as classes)
 *       node tools/frames2strip.mjs knight     (só uma)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join, basename } from 'node:path';

const SRC = 'arte-fonte/classes';
const OUT = 'client/public/assets/classes';

/** Ordem das linhas na tira. É a do MiniWorld — não mexa sem mexer no loader. */
const DIRS = ['south', 'north', 'east', 'west'];

/**
 * 🔴 A linha em que a SOLA DO PÉ é gravada em toda célula de toda tira.
 *
 * Tem que continuar igual ao `FEET_Y` de `client/src/heroes.ts`: o carregador usa
 * **uma âncora só** para as quatro direções e para todos os quadros, então o pé
 * andando de linha entre quadros vira TREMOR na tela — e, depois da escala de 2×,
 * 1 px de quadro é 2 px de tela.
 *
 * Medido nos cinco packs antes de ligar isto: o chão vinha entre 42 e 45
 * conforme o quadro, a direção e a classe. 44 é a moda, então é o alvo.
 */
const GROUND_Y = 44;

/**
 * Deslocamento máximo aceito. Fora disso o quadro fica **como veio**.
 *
 * 🔴 Não é folga de segurança, é a regra que salva o `attack_staff`: a conjuração
 * desenha um efeito mágico que desce ABAIXO dos pés, e o chão medido nesses
 * quadros cai para 47..52. Alinhar por ele **levantaria o herói** até 8 px no
 * meio do golpe. Rejeitar (dy = 0) deixa o quadro exatamente como o artista
 * entregou, que é o comportamento certo quando a medição não é confiável —
 * melhor não corrigir do que corrigir errado.
 */
const ALIGN_MAX = 3;

/** Linha com menos pixels que isto é ponta de arma ou fiapo, não chão. */
const MIN_PX_LINHA = 3;

/**
 * Classe -> pasta do pack. As pastas guardam o nome original do gerador (é o que
 * permite reconhecer de onde veio a arte); o mapa aqui é a tradução para o
 * `PlayerClass` do código.
 *
 * ⚠️ `Druid` NÃO está aqui de propósito: druida não é classe do jogo
 * (`PlayerClass` = knight | sorcerer | archer | assassin). A arte fica em
 * `arte-fonte/` esperando uma decisão do dono, sem virar asset morto.
 */
const PACKS = {
  knight: 'Knight_class_hero_wears_polished',
  sorcerer: 'Sorcerer_class_hero_wears_a',
  archer: 'Archer_class_hero_wears_light',
  assassin: 'Human_rogue_hero_young_man',
};

/**
 * Nome de saída -> palavras que identificam a pasta de origem.
 *
 * O gerador nomeia a pasta com a FRASE do prompt ("swinging_a_longsword_downward
 * _in_a_powerful_slashi"), truncada, e o texto muda de pack para pack: o Knight
 * tem `longsword`, o Sorcerer e o Archer têm `short_sword`, o rogue tem `dagger`.
 * Por isso o casamento é por palavra-chave, e não por nome exato.
 *
 * `req4` = exige as quatro direções. Sem elas a tira NÃO é gerada e o motor cai
 * no comportamento antigo (que existe e é testado): sem `attack` ele dá o
 * pulinho de investida, sem `hurt` ele pisca vermelho. Meia animação seria pior
 * que nenhuma — o personagem viraria para o sul no meio do golpe.
 */
const ANIMS = [
  { out: 'walk', keys: ['walking'], req4: false },
  { out: 'idle', keys: ['breathing_idle'], req4: false },
  { out: 'hurt', keys: ['taking_punch'], req4: true },
  { out: 'death', keys: ['collapsing'], req4: true },
  { out: 'attack_sword', keys: ['longsword', 'short_sword'], req4: true },
  { out: 'attack_dagger', keys: ['dagger'], req4: true },
  { out: 'attack_spear', keys: ['spear'], req4: true },
  { out: 'attack_bow', keys: ['bow'], req4: true },
  { out: 'attack_staff', keys: ['staff'], req4: true },
];

// ---------------------------------------------------------------------------
// PNG: decodificador e codificador mínimos (só RGBA 8 bits, que é o que chega)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function decodePng(path) {
  const buf = readFileSync(path);
  let off = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`${path}: esperado RGBA 8 bits, veio bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = line[x];
      switch (filter) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const pp = a + b - c;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`${path}: filtro PNG ${filter} desconhecido`);
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px };
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(w, h, px) {
  const stride = w * 4;
  // Filtro 0 (nenhum) em toda linha: pixel-art pequena, o ganho de comprimir
  // melhor não paga a complexidade de escolher filtro por linha.
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Copia um quadro inteiro para a posição (col, row) da tira, descido `dy` linhas
 * (negativo sobe). Linha que sair da célula é descartada — com `ALIGN_MAX = 3` e
 * o conteúdo morando em y 15..45 numa célula de 60, isso nunca corta desenho.
 */
function blit(dst, dstW, src, cell, col, row, dy = 0) {
  const stride = cell * 4;
  for (let y = 0; y < cell; y++) {
    const alvo = y + dy;
    if (alvo < 0 || alvo >= cell) continue;
    const from = y * stride;
    const to = ((row * cell + alvo) * dstW + col * cell) * 4;
    src.px.copy(dst, to, from, from + stride);
  }
}

/** Última linha do quadro com massa de verdade. -1 se o quadro está vazio. */
function chaoDe(img) {
  for (let y = img.h - 1; y >= 0; y--) {
    let n = 0;
    for (let x = 0; x < img.w; x++) if (img.px[(y * img.w + x) * 4 + 3] > 8) n++;
    if (n >= MIN_PX_LINHA) return y;
  }
  return -1;
}

/** Quantas linhas descer este quadro para o pé cair em `GROUND_Y`. Ver `ALIGN_MAX`. */
function alinhamento(img) {
  const chao = chaoDe(img);
  if (chao < 0) return 0;
  const d = GROUND_Y - chao;
  return Math.abs(d) <= ALIGN_MAX ? d : 0;
}

// ---------------------------------------------------------------------------
// Conversão
// ---------------------------------------------------------------------------

function acha(dirs, keys) {
  return dirs.find((d) => keys.some((k) => d.toLowerCase().includes(k)));
}

/** Quadros de uma direção, em ordem. Vazio se a pasta não existir. */
function quadros(animDir, dir) {
  const p = join(animDir, dir);
  if (!existsSync(p)) return [];
  return readdirSync(p)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => join(p, f));
}

function converteClasse(cls) {
  const pack = PACKS[cls];
  const raiz = join(SRC, pack, 'Idle');
  if (!existsSync(raiz)) {
    console.error(`  ✗ ${cls}: pack ausente em ${raiz}`);
    return 0;
  }
  const animsDir = join(raiz, 'animations');
  const disponiveis = readdirSync(animsDir);
  const outDir = join(OUT, cls);
  mkdirSync(outDir, { recursive: true });

  let feitas = 0;
  for (const spec of ANIMS) {
    const nome = acha(disponiveis, spec.keys);
    if (!nome) continue;

    // O gerador às vezes duplica a pasta com um sufixo de hash e deixa a
    // original pela metade (o Archer veio assim, com a lança só em 'south').
    // Fica a que tiver mais direções.
    const candidatos = disponiveis.filter((d) => spec.keys.some((k) => d.toLowerCase().includes(k)));
    const melhor = candidatos
      .map((c) => ({ c, n: DIRS.filter((d) => existsSync(join(animsDir, c, d))).length }))
      .sort((a, b) => b.n - a.n)[0].c;

    const animDir = join(animsDir, melhor);
    const porDir = DIRS.map((d) => quadros(animDir, d));
    const faltando = DIRS.filter((_, i) => porDir[i].length === 0);

    if (spec.req4 && faltando.length > 0) {
      console.log(`    – ${spec.out}: pulada (faltam ${faltando.join(',')}) — o motor cai no padrão`);
      continue;
    }

    // Direção sem ciclo cai na POSE PARADA daquela direção (rotations/<dir>.png).
    // O personagem vira para o lado certo e desliza sem mover as pernas — é o
    // mesmo compromisso que a arte HD do Knight já faz hoje no jogo.
    const cols = Math.max(...porDir.map((f) => f.length));
    const substituidas = [];
    for (let i = 0; i < DIRS.length; i++) {
      if (porDir[i].length > 0) continue;
      const pose = join(raiz, 'rotations', `${DIRS[i]}.png`);
      if (!existsSync(pose)) throw new Error(`${cls}/${spec.out}: sem quadros e sem pose para ${DIRS[i]}`);
      porDir[i] = Array.from({ length: cols }, () => pose);
      substituidas.push(DIRS[i]);
    }

    const primeiro = decodePng(porDir[0][0]);
    const cell = primeiro.w;
    if (primeiro.w !== primeiro.h) throw new Error(`${cls}/${spec.out}: quadro não é quadrado (${primeiro.w}x${primeiro.h})`);

    const W = cols * cell;
    const H = DIRS.length * cell;
    const out = Buffer.alloc(W * H * 4); // transparente
    let movidos = 0, recusados = 0;
    for (let r = 0; r < DIRS.length; r++) {
      for (let c = 0; c < cols; c++) {
        // Animação mais curta numa direção: repete o último quadro, para as
        // quatro linhas terminarem juntas (o loader usa uma contagem só).
        const f = porDir[r][Math.min(c, porDir[r].length - 1)];
        const img = decodePng(f);
        if (img.w !== cell || img.h !== cell) throw new Error(`${f}: ${img.w}x${img.h}, esperado ${cell}x${cell}`);
        const dy = alinhamento(img);
        if (dy !== 0) movidos++;
        else if (chaoDe(img) !== GROUND_Y) recusados++;
        blit(out, W, img, cell, c, r, dy);
      }
    }
    writeFileSync(join(outDir, `${spec.out}.png`), encodePng(W, H, out));
    const nota = substituidas.length ? `  ⚠️ pose parada em ${substituidas.join(',')}` : '';
    const al = `alinhados ${movidos}` + (recusados ? `, ${recusados} fora de ${ALIGN_MAX}px (mantidos)` : '');
    console.log(`    ✓ ${spec.out}.png  ${cols} quadros · ${cell}px · ${al}${nota}`);
    feitas++;
  }

  // As 4 poses paradas viram uma tira de 1 quadro: é o fallback de idle e o que
  // a tela de criação de personagem recorta para o ícone.
  const poses = DIRS.map((d) => join(raiz, 'rotations', `${d}.png`));
  if (poses.every((p) => existsSync(p))) {
    const cell = decodePng(poses[0]).w;
    const out = Buffer.alloc(cell * cell * DIRS.length * 4);
    poses.forEach((p, r) => {
      const img = decodePng(p);
      blit(out, cell, img, cell, 0, r, alinhamento(img));
    });
    writeFileSync(join(outDir, 'pose.png'), encodePng(cell, cell * DIRS.length, out));
    console.log(`    ✓ pose.png  1 quadro · ${cell}px`);
    feitas++;
  }
  return feitas;
}

const alvo = process.argv[2];
const classes = alvo ? [alvo] : Object.keys(PACKS);
if (alvo && !PACKS[alvo]) {
  console.error(`Classe desconhecida: ${alvo}. Conhecidas: ${Object.keys(PACKS).join(', ')}`);
  process.exit(1);
}
let total = 0;
for (const cls of classes) {
  console.log(`  ${cls} (${PACKS[cls]})`);
  total += converteClasse(cls);
}
console.log(`\n  ${total} tiras escritas em ${OUT}/`);
