/**
 * Monta a tira de EFEITO a partir da folha ilustrada, para o motor ler.
 *
 * 🔴 **A folha de origem NÃO é uma grade.** É desenho gerado por IA: os quadros
 * ficam lado a lado, mas cada um tem a sua largura e o espaçamento muda ao
 * longo da fita. Medido no `firebolt.png` de 07/09:
 *
 *   largura dos quadros   38 a 131 px
 *   espaçamento           88 a 151 px
 *
 * Cortar por célula fixa — o que todos os outros conversores deste projeto
 * fazem — daria meio quadro em cada célula a partir do quinto.
 *
 * ## As três decisões que fazem a animação sobreviver ao corte
 *
 * 🔴 **1. UMA ESCALA SÓ para todos os quadros.** A bola CRESCE enquanto cai, e
 * o impacto é largo. Normalizar cada quadro para preencher a célula apagaria
 * exatamente isso: a bola ficaria do mesmo tamanho do começo ao fim, e o
 * impacto deixaria de ser maior que a queda.
 *
 * 🔴 **2. UMA JANELA VERTICAL SÓ, comum a todos.** A bola DESCE dentro do
 * quadro — é o que faz ler como queda. Recortar cada quadro na própria caixa e
 * centralizar mataria o movimento: a chama ficaria parada no meio da célula
 * enquanto só a forma mudasse.
 *
 * ⚠️ **3. Faixas quase coladas são o MESMO quadro.** Na dissipação, as brasas
 * se soltam da chama e abrem um vão dentro do quadro — o mesmo defeito que a
 * flecha do arco causou ontem. Medido nesta folha: os vãos ENTRE quadros vão de
 * 21 a 57 px, e o vão interno é de **2 px**. Qualquer corte entre 5 e 20
 * resolve; ficou em 10.
 *
 * ## Uso
 *
 *   node tools/fx2strip.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** Lado da célula na tira que o motor lê. */
const CELL = 64;
/** Vão máximo, em px da folha, para duas faixas serem o mesmo quadro. */
const COLA = 10;
/** Folga em volta da faixa vertical do conteúdo. */
const FOLGA = 10;

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const ORIGEM = 'arte-fonte/fx';
const DESTINO = 'client/public/assets/fx';

/** Os efeitos a montar. `quadros` é conferência, não entrada: o corte é medido. */
const EFEITOS = [{ nome: 'firebolt', quadros: 16 }];

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (ty, d) => {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b));
  return Buffer.concat([l, b, c]);
};

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
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px };
}

function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (s + 1)] = 0;
    px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s);
  }
  const i = Buffer.alloc(13);
  i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', i),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------

/** Faixas de conteúdo ao longo de um eixo, já coladas quando quase encostam. */
function faixas(vazio, cola) {
  const brutas = [];
  let ini = -1;
  for (let i = 0; i < vazio.length; i++) {
    if (!vazio[i] && ini < 0) ini = i;
    if (ini >= 0 && (vazio[i] || i === vazio.length - 1)) {
      brutas.push([ini, vazio[i] ? i - 1 : i]);
      ini = -1;
    }
  }
  const out = [];
  for (const f of brutas) {
    const ultima = out[out.length - 1];
    if (ultima && f[0] - ultima[1] - 1 <= cola) ultima[1] = f[1];
    else out.push([...f]);
  }
  return out;
}

mkdirSync(DESTINO, { recursive: true });

for (const efeito of EFEITOS) {
  const caminho = join(ORIGEM, `${efeito.nome}.png`);
  if (!existsSync(caminho)) { console.warn(`[fx] sem ${caminho}`); continue; }
  const img = decode(caminho);

  const colVazia = new Array(img.w).fill(true);
  const linVazia = new Array(img.h).fill(true);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      // ⚠️ Corte de alpha em 16, não em 8: a folha tem franja de antisserrilhado
      // quase invisível, e um corte baixo demais junta os quadros pela franja.
      if (img.px[(y * img.w + x) * 4 + 3] > 16) { colVazia[x] = false; linVazia[y] = false; }
    }
  }

  const quadros = faixas(colVazia, COLA);
  const linhas = faixas(linVazia, COLA);
  if (linhas.length === 0) throw new Error(`${efeito.nome}: folha vazia`);

  // 🔴 A janela vertical é COMUM: é o que preserva a queda.
  const topo = Math.max(0, linhas[0][0] - FOLGA);
  const base = Math.min(img.h - 1, linhas[linhas.length - 1][1] + FOLGA);
  const janela = base - topo + 1;
  // 🔴 A escala é ÚNICA: é o que preserva o crescimento da bola.
  const escala = CELL / janela;

  console.log(
    `\n[fx] ${efeito.nome}: ${img.w}x${img.h} → ${quadros.length} quadros ` +
      `(esperado ${efeito.quadros})`,
  );
  console.log(
    `     janela vertical ${topo}..${base} (${janela}px) · escala ${escala.toFixed(3)} · ` +
      `larguras ${Math.min(...quadros.map((q) => q[1] - q[0] + 1))}..` +
      `${Math.max(...quadros.map((q) => q[1] - q[0] + 1))}px`,
  );
  if (quadros.length !== efeito.quadros) {
    console.warn(
      `     ⚠️ contagem DIFERENTE do esperado — confira a folha antes de usar. ` +
        `O corte de colagem é ${COLA}px.`,
    );
  }

  const tmp = join(DESTINO, '_tmp');
  mkdirSync(tmp, { recursive: true });
  const tira = Buffer.alloc(CELL * quadros.length * CELL * 4);

  quadros.forEach(([x0, x1], i) => {
    const larg = x1 - x0 + 1;
    const destW = Math.max(1, Math.round(larg * escala));
    const destH = CELL;
    const saidaTmp = join(tmp, `${i}.png`);
    const r = spawnSync(
      FFMPEG,
      ['-y', '-loglevel', 'error', '-i', caminho,
        '-vf',
        `crop=${larg}:${janela}:${x0}:${topo},` +
        `scale=${destW}:${destH}:flags=lanczos,` +
        // Centrado na horizontal: a bola cai no meio da célula.
        `pad=${CELL}:${CELL}:${Math.round((CELL - destW) / 2)}:0:color=0x00000000`,
        '-pix_fmt', 'rgba', saidaTmp],
      { encoding: 'utf8' },
    );
    if (r.status !== 0) throw new Error(`ffmpeg falhou no quadro ${i}: ${r.stderr ?? ''}`);
    const cel = decode(saidaTmp);
    const tiraW = CELL * quadros.length;
    for (let y = 0; y < CELL; y++) {
      const de = y * CELL * 4;
      const para = (y * tiraW + i * CELL) * 4;
      cel.px.copy(tira, para, de, de + CELL * 4);
    }
  });

  rmSync(tmp, { recursive: true, force: true });
  const saida = join(DESTINO, `${efeito.nome}.png`);
  writeFileSync(saida, encode(CELL * quadros.length, CELL, tira));
  console.log(`     ✓ ${saida}  ${CELL * quadros.length}x${CELL}`);
}
