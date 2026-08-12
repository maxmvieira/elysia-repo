/**
 * Converte os recortes de arma em tiras que o jogo carrega, no mesmo layout do
 * corpo: **uma linha por direção** (sul, norte, leste, oeste), uma coluna.
 *
 * 🔴 **A arma NÃO é alinhada, e isso é a coisa mais importante deste arquivo.**
 * O conversor do corpo desloca cada quadro para a sola cair em `GROUND_Y`. Se
 * ele deslocasse o corpo e a arma ficasse parada, as duas dessincronizariam e a
 * espada sairia flutuando — o mesmo defeito que o ponto de mão acabou de
 * resolver, reintroduzido pela porta dos fundos.
 *
 * A trava contra isso está abaixo: este script **verifica** que todo quadro do
 * corpo já tem a sola em `GROUND_Y`, ou seja, que o deslocamento aplicado é
 * zero. Se algum dia não for, ele falha em vez de gerar arte desencontrada.
 *
 * ⚠️ As armas ficam em CÉLULA CHEIA de 64×64, e não recortadas na caixa. É
 * desperdício de bytes de propósito: em célula cheia, compor é desenhar em
 * (0,0), e a posição em relação ao corpo vem de graça do recorte. Recortar
 * apertado exigiria guardar o canto de cada peça e somar em toda direção — mais
 * código e mais lugar para errar, para economizar alguns KB.
 *
 * Uso:  node tools/armas2strip.mjs knight
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const CELL = 64;
const DIRS = ['south', 'north', 'east', 'west'];
/** O mesmo número do `pixellab2strip.mjs`. Os dois têm que concordar. */
const GROUND_Y = 60;

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

function decode(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const t = buf.toString('ascii', off + 4, off + 8);
    const d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); }
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    off += 12 + len;
  }
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

/** Última linha com qualquer pixel opaco — a mesma regra do conversor do corpo. */
function chaoDe(im) {
  for (let y = im.h - 1; y >= 0; y--) {
    for (let x = 0; x < im.w; x++) if (im.px[(y * im.w + x) * 4 + 3] > 0) return y;
  }
  return -1;
}

const cls = process.argv[2] || 'knight';
const corpoDir = join('arte-fonte', 'pixellab', '_desarmado', cls);
const armaDir = join('arte-fonte', 'pixellab', '_armas', cls);
const out = join('client', 'public', 'assets', 'classes-layered', cls);
mkdirSync(out, { recursive: true });

/**
 * 🔴 **O ALINHAMENTO ENTRA NA CONTA, e descobrir isso custou um bug quase
 * embarcado.** O conversor do corpo desloca cada quadro para a sola cair em
 * `GROUND_Y`, e o deslocamento é **por quadro**: o `north-passo` do Knight vem
 * com o chão em 58 e desce 2 px. A arma não passa por esse conversor. Se o
 * deslocamento não fosse somado aqui, a espada sairia 2 px fora do lugar **só
 * ao andar para o norte** — o tipo de defeito que ninguém acha sem jogar.
 *
 * ⚠️ A regra do `ALIGN_MAX` é copiada de propósito, e os dois arquivos têm que
 * concordar: deslocamento maior que 3 px é **rejeitado inteiro** (não clampado),
 * porque medição que erra tanto não é confiável. Corrigir pela metade seria pior
 * que não corrigir.
 */
const ALIGN_MAX = 3;
const alinhamentoDe = (caminho) => {
  const dy = GROUND_Y - chaoDe(decode(caminho));
  return Math.abs(dy) > ALIGN_MAX ? 0 : dy;
};

/**
 * O deslocamento FINAL da arma em cada quadro, já pronto para o cliente somar.
 *
 * Ele junta as duas coisas que movem a arma, e o cliente não precisa saber de
 * nenhuma delas:
 *
 *   mão(quadro) − mão(pose)          → o braço que se ergue no golpe
 *   alinhamento(quadro) − alin(pose) → o quadro que o conversor desceu
 */
const QUADROS = ['pose', '-passo', '-passo2', '-golpe'];
const offsets = {};
if (existsSync(join(corpoDir, 'maos.json'))) {
  const maos = JSON.parse(readFileSync(join(corpoDir, 'maos.json'), 'utf8'));
  for (const d of DIRS) {
    offsets[d] = {};
    const base = maos[d]?.pose;
    if (!base?.arma) continue;
    const alinBase = alinhamentoDe(join(corpoDir, `${d}.png`));
    for (const q of QUADROS) {
      const chave = q === 'pose' ? 'pose' : q;
      const m = maos[d]?.[chave];
      const arquivo = join(corpoDir, `${d}${q === 'pose' ? '' : q}.png`);
      if (!m?.arma || !existsSync(arquivo)) continue;
      const alin = alinhamentoDe(arquivo);
      offsets[d][chave] = {
        arma: [m.arma[0] - base.arma[0], m.arma[1] - base.arma[1] + (alin - alinBase)],
        escudo: m.escudo && base.escudo
          ? [m.escudo[0] - base.escudo[0], m.escudo[1] - base.escudo[1] + (alin - alinBase)]
          : [0, 0],
      };
    }
  }
}

const pecas = new Set(
  readdirSync(armaDir).filter((f) => f.endsWith('.png')).map((f) => f.replace(/-(south|north|east|west)\.png$/, '')),
);

for (const peca of [...pecas].sort()) {
  const strip = Buffer.alloc(CELL * CELL * DIRS.length * 4);
  let temAlgum = false;
  DIRS.forEach((d, linha) => {
    const p = join(armaDir, `${peca}-${d}.png`);
    if (!existsSync(p)) return;
    const im = decode(p);
    temAlgum = true;
    for (let y = 0; y < CELL; y++) {
      im.px.copy(strip, ((linha * CELL + y) * CELL) * 4, (y * CELL) * 4, (y * CELL + CELL) * 4);
    }
  });
  if (!temAlgum) continue;
  writeFileSync(join(out, `arma-${peca}.png`), encode(CELL, CELL * DIRS.length, strip));
  console.log(`  arma-${peca}.png  (4 direcoes)`);
}

// O que viaja para o cliente e o DESLOCAMENTO pronto, nao a posicao da mao: ele
// nao precisa saber nem onde fica a mao, nem que existe alinhamento de chao.
writeFileSync(join(out, 'offsets.json'), `${JSON.stringify(offsets, null, 2)}\n`);
for (const d of DIRS) {
  for (const [q, o] of Object.entries(offsets[d] ?? {})) {
    if (o.arma[0] || o.arma[1]) console.log(`  offset ${d} ${q}: arma ${JSON.stringify(o.arma)}`);
  }
}
console.log('  offsets.json');
console.log(`\n  ${out}/`);
