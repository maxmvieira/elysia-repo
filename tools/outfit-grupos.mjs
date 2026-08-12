/**
 * Passo 1 do PLANO-OUTFITS: descobrir os GRUPOS COLORIVEIS de cada classe.
 *
 * Le todas as tiras de uma classe, junta a paleta inteira e classifica cada cor
 * em um grupo. Escreve dois arquivos por classe:
 *
 *   client/public/assets/classes-pixellab/<classe>/grupos.json  <- a tabela
 *   <scratch>/grupos-<classe>.png                               <- para OLHAR
 *
 * 🔴 POR QUE UMA TABELA DE CORES, E NAO UMA MASCARA POR QUADRO. Todas as tiras
 * de uma classe compartilham a MESMA paleta (~50 a 88 cores). Entao "a que grupo
 * este pixel pertence" e funcao da COR, nao da posicao — e uma tabela de ~80
 * entradas vale para walk, pose, attack e death de uma vez, sem gerar imagem
 * nenhuma. Tambem e legivel: da para abrir o JSON e conferir.
 *
 * 🔴 POR QUE NAO DIVIDIR POR ALTURA, como o Tibia faz com cabeca/tronco/pernas/
 * pes: medido em 11/08, NAO FUNCIONA. O cinza da armadura do Knight vai de y=4 a
 * y=59 — elmo, peito e greva sao a mesma cor. Nele nao existe "cor da perna".
 * O que separa bem e o MATIZ. Ver `docs/PLANO-OUTFITS.md`.
 *
 * Uso:  node tools/outfit-grupos.mjs [classe]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join } from 'node:path';

const OUT = 'client/public/assets/classes-pixellab';
const DEBUG = process.env.DEBUG_DIR ?? '.';
const CELL = 64;

/**
 * ⚠️ REFERENCIA — nenhum documento fixa estes numeros; sairam da medicao dos
 * quatro packs em 11/08 e existem para serem afinados OLHANDO o PNG de conferencia.
 */
const DELTA_CONTORNO = Number(process.env.DELTA ?? 0.20); // quanto mais claro o vizinho para o pixel ser traco
const FRACAO_BORDA = Number(process.env.FRACAO ?? 0.80);  // acima disto, a cor VIVE na borda: e contorno
const PRETO_ABSOLUTO = 0.06;  // tao escuro que e contorno onde quer que esteja
const CLARO_DEMAIS = 0.45;    // acima disto nao e contorno, e brilho
const PELE = { hMin: 12, hMax: 45, sMin: 0.15, lMin: 0.35 };
const NEUTRO_S = 0.15;        // saturacao abaixo disto e cinza (armadura!)
const JUNTA_MATIZ = 30;       // cores a menos de 30 graus viram a mesma familia
const MAX_GRUPOS = 3;         // grupos coloriveis por classe

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

/** RGB 0..255 -> { h: 0..360, s: 0..1, l: 0..1 } */
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return { h, s, l };
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
/** Distancia circular entre dois matizes, em graus. */
const dh = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/**
 * Junta a paleta de TODAS as tiras da classe. Para cada cor guarda quantos
 * pixels ela tem e **quantos deles vivem na BORDA**.
 *
 * 🔴 CONTORNO NAO E UMA PROPRIEDADE DA COR, E DA POSICAO — e essa foi a licao
 * da primeira versao. Ela classificava contorno so por luminancia, e num
 * personagem ESCURO isso engole a roupa: no Arqueiro, 54% dos pixels caiam em
 * "nao recolorir", e as manchas escuras do tronco e das pernas eram pano, nao
 * traco. Num personagem claro os dois criterios coincidem; num escuro, nao.
 *
 * Aqui um pixel conta como borda se **encosta em transparencia** (a silhueta) ou
 * se e um **minimo local de luminancia** — o traco escuro que separa braco de
 * tronco nao toca o vazio, mas e sempre mais escuro que tudo em volta.
 *
 * ⚠️ A vizinhanca para DENTRO DA CELULA: colunas vizinhas sao outro quadro da
 * animacao, e deixar o olhar vazar para elas inventaria borda onde nao ha.
 */
function paletaDe(dir) {
  const cores = new Map();
  const lum = (px, o) => (0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2]) / 255;

  for (const arq of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    const img = decode(join(dir, arq));
    const cols = Math.round(img.w / CELL), rows = Math.round(img.h / CELL);
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
        const gx = cx * CELL + x, gy = cy * CELL + y;
        const o = (gy * img.w + gx) * 4;
        if (img.px[o + 3] <= 8) continue;
        const k = (img.px[o] << 16) | (img.px[o + 1] << 8) | img.px[o + 2];
        const e = cores.get(k) ?? { px: 0, borda: 0 };
        e.px++;

        const meuL = lum(img.px, o);
        let vizinhoVazio = false, maxVizL = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= CELL || ny >= CELL) { vizinhoVazio = true; continue; }
          const no = ((cy * CELL + ny) * img.w + cx * CELL + nx) * 4;
          if (img.px[no + 3] <= 8) { vizinhoVazio = true; continue; }
          const l = lum(img.px, no);
          if (l > maxVizL) maxVizL = l;
        }
        if (vizinhoVazio || maxVizL - meuL > DELTA_CONTORNO) e.borda++;
        cores.set(k, e);
      }
    }
  }
  return cores;
}

/**
 * Classifica a paleta em grupos.
 *
 * `0` = NUNCA recolorir. Cai aqui o contorno (que e ~40% do sprite e e o que
 * segura a legibilidade a 64 px) e a pele (tom de pele e outra pendencia do
 * Doc 1, com escolha propria — nao se mistura com cor de roupa).
 */
function classifica(cores) {
  const fixos = []; const livres = [];
  for (const [k, { px, borda }] of cores) {
    const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
    const c = hsl(r, g, b);
    const fracao = borda / px;
    // 🔴 Contorno = cor que VIVE na borda. O quase-preto entra sempre (ele e
    // traco onde quer que apareca); o resto precisa provar que mora na borda, e
    // brilho claro nunca e traco por mais encostado na silhueta que esteja.
    const ehContorno = c.l < PRETO_ABSOLUTO
      || (fracao >= FRACAO_BORDA && c.l < CLARO_DEMAIS);
    if (ehContorno) { fixos.push({ k, px, ...c, motivo: 'contorno', fracao }); continue; }
    if (c.h >= PELE.hMin && c.h <= PELE.hMax && c.s >= PELE.sMin && c.l >= PELE.lMin) {
      fixos.push({ k, px, ...c, motivo: 'pele', fracao }); continue;
    }
    livres.push({ k, px, ...c, fracao });
  }

  // Familias: cinzas viram UMA familia (a armadura do Knight mora aqui);
  // o resto agrupa por matiz, semeando pelas cores de maior area.
  const neutros = livres.filter((c) => c.s < NEUTRO_S);
  const cromaticos = livres.filter((c) => c.s >= NEUTRO_S).sort((a, b) => b.px - a.px);

  const familias = [];
  for (const c of cromaticos) {
    const f = familias.find((f) => dh(f.h, c.h) <= JUNTA_MATIZ);
    if (f) { f.cores.push(c); f.px += c.px; f.h = (f.h * (f.cores.length - 1) + c.h) / f.cores.length; }
    else familias.push({ h: c.h, px: c.px, cores: [c] });
  }
  if (neutros.length) familias.push({ h: -1, px: neutros.reduce((s, c) => s + c.px, 0), cores: neutros, neutro: true });

  familias.sort((a, b) => b.px - a.px);
  const mantidas = familias.slice(0, MAX_GRUPOS);
  // ⚠️ Familia que sobrou nao vira grupo 0: ela se junta a familia MAIS PROXIMA
  // em matiz. Uma cor de roupa que ficasse fixa apareceria como mancha teimosa
  // quando o jogador trocasse a cor em volta dela.
  for (const f of familias.slice(MAX_GRUPOS)) {
    const alvo = f.neutro
      ? mantidas.find((m) => m.neutro) ?? mantidas[mantidas.length - 1]
      : mantidas.reduce((best, m) => (m.neutro ? best : (dh(m.h, f.h) < dh(best.h, f.h) ? m : best)), mantidas[0]);
    alvo.cores.push(...f.cores); alvo.px += f.px;
  }
  return { fixos, grupos: mantidas };
}

const NOMES = ['principal', 'secundaria', 'detalhe'];

function processa(cls) {
  const dir = join(OUT, cls);
  if (!existsSync(join(dir, 'pose.png'))) { console.log(`  ✗ ${cls}: sem pose.png`); return; }
  const cores = paletaDe(dir);
  const { fixos, grupos } = classifica(cores);

  const tabela = {};
  for (const c of fixos) tabela[hex((c.k >> 16) & 255, (c.k >> 8) & 255, c.k & 255)] = 0;
  grupos.forEach((g, i) => {
    for (const c of g.cores) tabela[hex((c.k >> 16) & 255, (c.k >> 8) & 255, c.k & 255)] = i + 1;
  });

  const totalPx = [...cores.values()].reduce((s, e) => s + e.px, 0);
  const fixPx = fixos.reduce((s, c) => s + c.px, 0);
  const json = {
    _leia: 'Gerado por tools/outfit-grupos.mjs. Grupo 0 = NUNCA recolorir (contorno e pele). Ver docs/PLANO-OUTFITS.md.',
    classe: cls,
    grupos: grupos.map((g, i) => {
      const dom = g.cores.slice().sort((a, b) => b.px - a.px)[0];
      return {
        id: i + 1,
        nome: NOMES[i] ?? `grupo${i + 1}`,
        exemplo: hex((dom.k >> 16) & 255, (dom.k >> 8) & 255, dom.k & 255),
        neutro: !!g.neutro,
        cores: g.cores.length,
        px: g.px,
      };
    }),
    fixos: { cores: fixos.length, px: fixPx },
    cores: tabela,
  };
  writeFileSync(join(dir, 'grupos.json'), JSON.stringify(json, null, 2) + '\n');

  // PNG de conferencia: a pose das 4 direcoes pintada por GRUPO.
  const CHAPADAS = [[70, 70, 78], [232, 72, 72], [72, 160, 232], [240, 196, 64]];
  const img = decode(join(dir, 'pose.png'));
  const out = Buffer.alloc(img.w * img.h * 4);
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4;
    if (img.px[o + 3] <= 8) { const q = (((i % img.w) >> 3) + ((i / img.w | 0) >> 3)) & 1 ? 210 : 170; out[o] = out[o + 1] = out[o + 2] = q; out[o + 3] = 255; continue; }
    const gid = tabela[hex(img.px[o], img.px[o + 1], img.px[o + 2])] ?? 0;
    const [r, g, b] = CHAPADAS[gid] ?? CHAPADAS[0];
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 255;
  }
  writeFileSync(join(DEBUG, `grupos-${cls}.png`), encode(img.w, img.h, out));

  const pct = (n) => `${Math.round((n / totalPx) * 100)}%`;
  // DIAG=1 mostra a fracao de borda das cores de maior area — e com ela que se
  // escolhe `FRACAO_BORDA` olhando dado, em vez de chutando.
  if (process.env.DIAG) {
    const top = [...cores.entries()].sort((a, b) => b[1].px - a[1].px).slice(0, 12);
    console.log(`  --- ${cls}: as 12 cores de maior area ---`);
    for (const [k, e] of top) {
      const r = (k >> 16) & 255, g = (k >> 8) & 255, b = k & 255;
      const c = hsl(r, g, b);
      const gid = tabela[hex(r, g, b)] ?? 0;
      console.log(`      ${hex(r, g, b)} ${String(e.px).padStart(5)}px  borda ${(e.borda / e.px).toFixed(2)}  L ${c.l.toFixed(2)}  -> grupo ${gid}`);
    }
  }
  console.log(`  ✓ ${cls}: ${cores.size} cores · fixas ${fixos.length} (${pct(fixPx)} dos px)`);
  for (const g of json.grupos) {
    console.log(`      ${g.id} ${g.nome.padEnd(11)} ${g.exemplo} ${g.neutro ? '(cinza)' : '       '} ${String(g.cores).padStart(2)} cores · ${pct(g.px).padStart(4)} dos px`);
  }
}

const alvo = process.argv[2];
console.log('Grupos coloriveis por classe (passo 1 do PLANO-OUTFITS):\n');
for (const cls of readdirSync(OUT)) if (!alvo || cls === alvo) processa(cls);
console.log(`\n  PNGs de conferencia em ${DEBUG}/grupos-<classe>.png — OLHE antes de seguir.`);
