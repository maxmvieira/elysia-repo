/**
 * As DIAGONAIS: gira a pose cardinal para sudeste e nordeste.
 *
 * 🔴 **O dono pediu 8 direções em 2026-08-12.** Antes de gastar arte nelas, leia
 * o aviso: **o movimento do jogo é 4-direcional.** O passo do servidor é
 * `[[dx,0],[0,dy]]` — um eixo por vez — então sprite diagonal não tem como
 * aparecer até o movimento mudar. Tibia e Medivia, a referência declarada, são
 * 4-direcionais pelo mesmo motivo. Esta ferramenta prepara a arte; ela NÃO
 * torna o jogo diagonal.
 *
 * ⚠️ Roda sobre o pack DESARMADO. Girar um corpo com escudo é pedir para o
 * `/rotate` reinventar o escudo em um ângulo que ele nunca viu — e ele já
 * duplicou cabeça girando 90° com o corpo armado (beco nº 6).
 *
 * 🔴 Oeste, noroeste e sudoeste saem por ESPELHO, e não por geração: além de
 * não gastar, é a única forma de a simetria ser garantida por construção.
 *
 * Uso:  PACK=_desarmado node tools/pixellab/girar.mjs knight
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const API = 'https://api.pixellab.ai/v1';
const TOKEN = process.env.PIXELLAB_TOKEN;
if (!TOKEN) throw new Error('PIXELLAB_TOKEN nao esta no ambiente. Carregue do .env no MESMO comando.');

const CELL = 64;

/**
 * De qual cardinal cada diagonal nasce, e com que numeros.
 *
 * ⚠️ Sai da cardinal MAIS PROXIMA — 45° de giro em vez de 135°. O beco nº 6
 * ensinou que o `/rotate` erra mais quanto maior o giro (foi girando 90° que
 * ele duplicou a cabeca do Knight). Meio giro e a aposta mais segura.
 *
 * Os numeros comecam nos que ja funcionaram no giro de 90° e sao POR TENTATIVA,
 * como todos os outros deste pipeline.
 */
const GIROS = [
  { to: 'south-east', from: 'south', g: 5, s: 5 },
  { to: 'north-east', from: 'north', g: 5, s: 5 },
];

/** Quem espelha quem. O lado oeste inteiro sai de graca. */
const ESPELHOS = [['south-west', 'south-east'], ['north-west', 'north-east']];

async function call(endpoint, body) {
  const r = await fetch(`${API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${endpoint} ${r.status}: ${txt.slice(0, 300)}`);
  return JSON.parse(txt);
}

const paraB64 = (buf) => ({ type: 'base64', base64: buf.toString('base64') });
const daB64 = (s) => Buffer.from(String(s).replace(/^data:image\/\w+;base64,/, ''), 'base64');

const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

function encode(w, h, px) {
  const s = w * 4; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function decode(buf) {
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

function espelha(buf) {
  const im = decode(buf);
  const out = Buffer.alloc(im.px.length);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    im.px.copy(out, (y * im.w + (im.w - 1 - x)) * 4, (y * im.w + x) * 4, (y * im.w + x) * 4 + 4);
  }
  return encode(im.w, im.h, out);
}

const cls = process.argv[2] || 'knight';
const PACK = process.env.PACK || '_desarmado';
const dir = join('arte-fonte', 'pixellab', PACK, cls);

for (const { to, from, g, s } of GIROS) {
  console.log(`  ${cls}: ${to} (girando o ${from})...`);
  const base = readFileSync(join(dir, `${from}.png`));
  const r = await call('rotate', {
    image_size: { width: CELL, height: CELL },
    from_image: paraB64(base),
    from_direction: from, to_direction: to,
    from_view: 'high top-down', to_view: 'high top-down',
    image_guidance_scale: g, seed: s,
  });
  writeFileSync(join(dir, `${to}.png`), daB64(r.image.base64));
}

for (const [destino, origem] of ESPELHOS) {
  writeFileSync(join(dir, `${destino}.png`), espelha(readFileSync(join(dir, `${origem}.png`))));
  console.log(`  ${cls}: ${destino} — espelho do ${origem}, sem geracao`);
}
console.log(`  ${cls}: 8 direcoes em ${dir}/`);
