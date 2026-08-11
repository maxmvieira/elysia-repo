/**
 * Conversor do pack PixelLab -> tiras do jogo.
 *
 * Entrada: `arte-fonte/pixellab/<classe>/{south,north,east,west}[-passo].png`
 * Saida:   `client/public/assets/classes-pixellab/<classe>/{walk,pose}.png`
 *
 * 🔴 A SAIDA VAI PARA UMA PASTA SEPARADA, e nao por cima de
 * `assets/classes/`. O pack tem parado, andando, golpe e morte; falta `hurt`,
 * que o motor supre piscando vermelho. A troca e decisao do dono, e vale por
 * classe — ver `docs/PIXELLAB-RECEITA.md`.
 *
 * Mesmo layout do `frames2strip.mjs`, para o loader ser o mesmo codigo:
 *   linha 0 = sul · 1 = norte · 2 = leste · 3 = oeste
 *   `walk.png` = 2 colunas (parado, passo) · `pose.png` = 1 coluna
 *
 * Uso:  node tools/pixellab2strip.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join } from 'node:path';

const SRC = 'arte-fonte/pixellab';
const OUT = 'client/public/assets/classes-pixellab';
const DIRS = ['south', 'north', 'east', 'west'];
const CELL = 64;

/** Linha da sola. Mesma ideia do `frames2strip.mjs`: garantida na geracao. */
const GROUND_Y = 60;
const ALIGN_MAX = 3;
const MIN_PX_LINHA = 3;

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

function decode(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
  if (ct !== 6) throw new Error(`${path}: esperado RGBA, veio colorType ${ct}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4; const px = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0, b = prev ? prev[x] : 0;
      const c = x >= 4 && prev ? prev[x - 4] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px };
}

function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function chaoDe(img) {
  for (let y = img.h - 1; y >= 0; y--) {
    let n = 0;
    for (let x = 0; x < img.w; x++) if (img.px[(y * img.w + x) * 4 + 3] > 8) n++;
    if (n >= MIN_PX_LINHA) return y;
  }
  return -1;
}

function blit(dst, dstW, src, col, row, dy) {
  for (let y = 0; y < CELL; y++) {
    const alvo = y + dy;
    if (alvo < 0 || alvo >= CELL) continue;
    const de = y * CELL * 4;
    const para = ((row * CELL + alvo) * dstW + col * CELL) * 4;
    src.px.copy(dst, para, de, de + CELL * 4);
  }
}

/** Mede a caixa de alpha da tira inteira — e o que `heroes.ts` precisa saber. */
function metricas(px, w, h) {
  let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 8) {
      const ly = y % CELL;
      if (ly < y0) y0 = ly; if (ly > y1) y1 = ly;
      const lx = x % CELL;
      if (lx < x0) x0 = lx; if (lx > x1) x1 = lx;
    }
  }
  return { topo: y0, chao: y1, alturaConteudo: y1 - y0 + 1, centroX: (x0 + x1) / 2 };
}

function converte(cls) {
  const dir = join(SRC, cls);
  const faltando = DIRS.filter((d) => !existsSync(join(dir, `${d}.png`)));
  if (faltando.length) { console.log(`  ✗ ${cls}: faltam ${faltando.join(',')}`); return 0; }
  const outDir = join(OUT, cls);
  mkdirSync(outDir, { recursive: true });

  const temPasso = DIRS.every((d) => existsSync(join(dir, `${d}-passo.png`)));
  const cols = temPasso ? 2 : 1;
  const W = cols * CELL, H = DIRS.length * CELL;
  const walk = Buffer.alloc(W * H * 4);
  const pose = Buffer.alloc(CELL * H * 4);

  DIRS.forEach((d, r) => {
    const quadros = [decode(join(dir, `${d}.png`))];
    if (temPasso) quadros.push(decode(join(dir, `${d}-passo.png`)));
    quadros.forEach((img, c) => {
      const chao = chaoDe(img);
      const bruto = GROUND_Y - chao;
      const dy = Math.abs(bruto) <= ALIGN_MAX ? bruto : 0;
      blit(walk, W, img, c, r, dy);
      if (c === 0) blit(pose, CELL, img, 0, r, dy);
    });
  });

  writeFileSync(join(outDir, 'walk.png'), encode(W, H, walk));
  writeFileSync(join(outDir, 'pose.png'), encode(CELL, H, pose));

  // O golpe: 2 colunas — parado e o golpe —, uma linha por direcao.
  if (DIRS.every((d) => existsSync(join(dir, `${d}-golpe.png`)))) {
    const atk = Buffer.alloc(2 * CELL * H * 4);
    DIRS.forEach((d, r) => {
      [join(dir, `${d}.png`), join(dir, `${d}-golpe.png`)].forEach((p, c) => {
        const img = decode(p);
        const bruto = GROUND_Y - chaoDe(img);
        blit(atk, 2 * CELL, img, c, r, Math.abs(bruto) <= ALIGN_MAX ? bruto : 0);
      });
    });
    const tira = encode(2 * CELL, H, atk);

    // 🔴 Grava no slot da arma da classe E em `attack_sword`.
    // `attackPoseFallback` (shared/src/heropose.ts) termina a cadeia em `sword`:
    // classe sem esse arquivo perde o golpe inteiro e volta ao "pulinho" de
    // investida do placeholder. O nome do arquivo e o SLOT, nao a arma desenhada.
    const slot = existsSync(join(dir, 'GOLPE.txt'))
      ? readFileSync(join(dir, 'GOLPE.txt'), 'utf8').trim()
      : 'sword';
    writeFileSync(join(outDir, `attack_${slot}.png`), tira);
    if (slot !== 'sword') writeFileSync(join(outDir, 'attack_sword.png'), tira);
    console.log(`    + attack_${slot}${slot !== 'sword' ? ' (+ attack_sword)' : ''}`);
  }

  // A morte: 3 colunas, uma linha por direção.
  //
  // ⚠️ NÃO alinha o chão como as outras. `chaoDe` mede a última linha com massa,
  // e num corpo DEITADO isso é o corpo inteiro, não o pé — alinhar por ele
  // empurraria o cadáver para fora do tile. Os quadros vão como vieram; o
  // recentro já foi feito no esqueleto, na geração.
  if (DIRS.every((d) => existsSync(join(dir, `${d}-morte2.png`)))) {
    const morte = Buffer.alloc(3 * CELL * H * 4);
    DIRS.forEach((d, r) => {
      for (let c = 0; c < 3; c++) blit(morte, 3 * CELL, decode(join(dir, `${d}-morte${c}.png`)), c, r, 0);
    });
    writeFileSync(join(outDir, 'death.png'), encode(3 * CELL, H, morte));
    console.log('    + death (3q, terminal — congela no cadáver)');
  }
  const m = metricas(walk, W, H);
  console.log(`  ✓ ${cls}: walk ${cols}q · pose 1q · conteudo ${m.alturaConteudo}px (y ${m.topo}..${m.chao}) · centro x ${m.centroX}`);
  return 1;
}

if (!existsSync(SRC)) { console.error(`Sem ${SRC}/ — rode antes tools/pixellab/gerar-classe.mjs`); process.exit(1); }
let n = 0;
for (const cls of readdirSync(SRC)) n += converte(cls);
console.log(`\n  ${n} classes convertidas em ${OUT}/`);
console.log('  ⚠️ Pasta SEPARADA: falta só hurt (o motor pisca vermelho sem ele).');
