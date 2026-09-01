/**
 * Recorta a HUD alada do pack CraftPix `assets/HUD-barras/PNG/Bars.png`.
 *
 * 🔴 **As coordenadas aqui foram MEDIDAS na folha, não estimadas** — e é por
 * isso que este arquivo existe em vez de um recorte feito à mão no editor. A
 * folha tem ~12 kits soltos, sem grade, e a única forma de acertar o retângulo
 * de cada peça é varrer o alpha. Refazer o corte à mão depois de uma
 * atualização do pack seria adivinhar de novo.
 *
 * Saídas em `client/public/assets/hud/`:
 *
 * | | |
 * |---|---|
 * | `asas.png` | a peça central alada, 248×43, com o MIOLO DO ENCAIXE VAZADO |
 * | `barra.png` | a barra inclinada, 108×12 — serve para vida, mana e XP |
 *
 * ⚠️ **O miolo do encaixe é vazado de propósito.** Na folha ele vem pintado de
 * azul-acinzentado; se ficasse assim, o retrato do herói teria de ser desenhado
 * POR CIMA da moldura, e aí o anel dourado ficaria atrás dele. Vazando, o
 * retrato entra por baixo e o anel emoldura — que é o que a arte quer.
 *
 * ⚠️ **Escala de pixel art é sempre INTEIRA** (regra do projeto, ver o `ZOOM` em
 * `client/src/main.ts`). Estas peças são desenhadas a 1× no HUD; quem for
 * ampliar, use 2× ou 3×, nunca 1,5×.
 *
 *   node tools/hud/recortar.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';

const ENTRADA = 'assets/HUD-barras/PNG/Bars.png';
const SAIDA = 'client/public/assets/hud';

/** As peças, em coordenada da folha. Medidas por varredura de alpha. */
const PECAS = {
  // A peça alada inteira: o encaixe redondo sobe acima das asas, daí y começa em 82.
  asas: { x: 4, y: 82, w: 248, h: 43 },
  /*
   * ⚠️ Há DUAS barras inclinadas na folha, empilhadas. Esta é a de CIMA
   * (y 98..109). A de baixo (y 114..125) tem um vinco diagonal no meio que
   * atravessa a calha — bonito sozinho, sujo quando o preenchimento anda por
   * cima dele.
   */
  barra: { x: 258, y: 98, w: 108, h: 12 },
};

/**
 * ⚠️ LIXO DA FOLHA que cai dentro do retângulo das asas, e tem de sair.
 *
 * A folha não tem grade: acima da asa direita moram três tiras de AMOSTRA de
 * preenchimento (vermelho e azul), soltas, na faixa y 87..90. Elas ficam dentro
 * do retângulo 248×43 da peça e apareciam como dois riscos flutuando no canto.
 *
 * 🔴 O corte é por faixa e não por cor: as tiras têm exatamente as cores do
 * preenchimento que a barra vai usar, então cor não as distingue de nada. O que
 * as distingue é ONDE estão — acima de y 92 a peça alada só tem o topo do
 * encaixe, que acaba em x 159.
 */
const LIXO = { x0: 170, y1: 92 };

/** Miolo do encaixe redondo, em coordenada da folha. Vira transparente. */
const ENCAIXE = { x: 112, y: 88, w: 32, h: 32 };

// --------------------------------------------------------------- PNG ----
// RGBA8 puro. O pack é todo assim; qualquer outro formato é erro de entrada.

function decode(arquivo) {
  const b = readFileSync(arquivo);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6) throw new Error(`${arquivo}: esperado RGBA8`);
  const idat = [];
  let off = 8;
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    if (b.toString('ascii', off + 4, off + 8) === 'IDAT') idat.push(b.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp, out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++], linha = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const ant = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, bb = ant[i], c = i >= bpp ? ant[i - bpp] : 0;
      let v = linha[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += bb;
      else if (ft === 3) v += (a + bb) >> 1;
      else if (ft === 4) {
        const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      cur[i] = v & 255;
    }
  }
  return { w, h, data: out };
}

const CRC_TAB = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TAB[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function bloco(tipo, dados) {
  const len = Buffer.alloc(4); len.writeUInt32BE(dados.length);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, cr]);
}

function encode(w, h, data) {
  const stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(raw, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- corte ----

const folha = decode(ENTRADA);

/**
 * O miolo do encaixe é reconhecido pela COR, não pelo retângulo.
 *
 * 🔴 O encaixe é um círculo dentro de um retângulo: apagar o retângulo inteiro
 * comeria as quinas do anel dourado. O azul-acinzentado do vidro não aparece no
 * anel, então a cor separa os dois sem precisar desenhar a máscara redonda.
 */
function ehVidroDoEncaixe(r, g, b, a) {
  return a > 8 && b > 110 && b < 190 && Math.abs(r - g) < 25 && r < 150 && b > r + 15;
}

function recorta(nome, { x, y, w, h }, vazarEncaixe) {
  const out = Buffer.alloc(w * h * 4);
  let vazados = 0;
  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      const sx = x + lx, sy = y + ly;
      const i = (sy * folha.w + sx) * 4, o = (ly * w + lx) * 4;
      const [r, g, b, a] = [folha.data[i], folha.data[i + 1], folha.data[i + 2], folha.data[i + 3]];
      if (vazarEncaixe && sx >= LIXO.x0 && sy <= LIXO.y1) continue; // ver LIXO
      const noEncaixe = vazarEncaixe
        && sx >= ENCAIXE.x && sx < ENCAIXE.x + ENCAIXE.w
        && sy >= ENCAIXE.y && sy < ENCAIXE.y + ENCAIXE.h;
      if (noEncaixe && ehVidroDoEncaixe(r, g, b, a)) { vazados++; continue; } // fica alpha 0
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
    }
  }
  const destino = join(SAIDA, `${nome}.png`);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, encode(w, h, out));
  console.log(`${destino}  ${w}x${h}${vazarEncaixe ? `  (${vazados} px vazados no encaixe)` : ''}`);
}

recorta('asas', PECAS.asas, true);
recorta('barra', PECAS.barra, false);
