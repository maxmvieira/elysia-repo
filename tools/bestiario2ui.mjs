/**
 * Conversor do kit de BESTIARIO da CraftPix -> pecas de UI do jogo.
 *
 * Entrada: `assets/Bestiario/PNG/{Page,Pages_elements_full,Monsters_without_shadow}.png`
 * Saida:   `client/public/assets/ui/bestiary/`
 *
 * ## O que este kit e, e o que ele NAO e
 *
 * 🔴 **Nao sao sprites de mundo.** E um kit de INTERFACE: um livro aberto, fitas
 * de titulo, molduras de encaixe, plaquinhas de lista e 20 retratos pintados.
 * Nada aqui anda, ataca ou morre — nada disto entra em `assets/monsters/`.
 *
 * ## Por que so 8 retratos saem daqui
 *
 * 🔴 **Os 20 retratos sao monstros GENERICOS da CraftPix, e o nosso bestiario
 * tem 28 especies proprias.** Foram conferidos um a um, olhando a arte: so 8
 * tem correspondente honesto. O pack traz demonio, elemental de fogo, treant,
 * vampiro, beholder e planta carnivora — que este jogo nao tem; e nao traz lobo,
 * urso, formiga, minotauro, esqueleto arqueiro nem nenhum dos 8 animais de
 * pasto — que este jogo tem.
 *
 * ⚠️ **As 20 especies sem retrato continuam com o icone desenhado por codigo**
 * (`creatureIconUrl`, em `main.ts`). A mistura e VISIVEL e foi decidida pelo
 * dono em 29/08, sabendo disso: retrato pintado onde ha, icone onde nao ha.
 *
 * ⚠️ **Os 12 retratos que sobram NAO sao extraidos.** Extrair arte que ninguem
 * referencia so engorda o `public/` e confunde quem vier depois. Se uma especie
 * nova casar com algum deles, a caixa esta medida na tabela `SOBRAM` abaixo.
 *
 * ## De onde saem as coordenadas
 *
 * Todas foram MEDIDAS, nao chutadas: componentes conexos de alpha na folha,
 * conferidos depois com cada recorte ampliado em tela. A folha e de terceiro e
 * nao segue grade regular — as bandas do `Monsters.png` tem alturas diferentes e
 * tres monstros se tocam, entao nao ha formula que substitua a medicao.
 *
 * Uso:  npm run bestiario:build
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const SRC = 'assets/Bestiario/PNG';
const OUT = 'client/public/assets/ui/bestiary';

/**
 * Retrato -> especie de `CREATURES`. Caixa `[x, y, largura, altura]` na folha
 * `Monsters_without_shadow.png`.
 *
 * ⚠️ **A folha SEM sombra e a certa.** A com sombra traz uma elipse cinza
 * assada embaixo de cada bicho, feita para o fundo claro do livro do preview —
 * dentro da nossa moldura de encaixe ela vira uma mancha.
 */
const RETRATOS = {
  // Ciclope branco de chifres roxos. O unico gigante do pack.
  troll: [9, 7, 61, 71],
  // Esqueleto com espada e escudo — o casamento mais exato dos oito.
  skeleton_warrior: [242, 7, 47, 71],
  // Morto-vivo de elmo com chifres e machado. Nao e um zumbi de manual, mas e o
  // unico humanoide APODRECIDO do pack, e ganha do fantasma azul com folga.
  zombie: [156, 85, 54, 69],
  // Goblin verde de tridente.
  goblin_warrior: [137, 171, 58, 79],
  // Orc verde de espada curta.
  orc_warrior: [74, 266, 57, 83],
  // Aranha de corpo de cogumelo. E aranha o bastante.
  forest_spider: [158, 266, 50, 83],
  // Gosma azul cristalina, com brilho.
  slime_blue: [233, 266, 57, 83],
  // Bicho pequeno de adaga e bandoleira.
  kobold_hunter: [78, 429, 52, 115],
};

/**
 * Os 12 que sobraram, medidos e NAO extraidos. Ficam aqui para quem for
 * acrescentar especie nao ter de remedir a folha.
 *
 * demonio_morcego [89,7,58,71] · beholder [172,7,53,71] · planta [8,85,59,69]
 * tartaruga_goblin [93,85,54,69] · mago_morto [235,85,65,69]
 * demonio_foice+fantasma [9,171,117,79] (colados) · vampiro [218,171,57,79]
 * demonio_fogo [11,266,53,83] · abobora [18,358,48,68] · elemental_fogo [81,358,39,68]
 * rocha_flamejante [162,358,44,68] · nuvem [219,358,69,68]
 * treant_morto [15,429,50,115] · demonio_azul [137,429,64,115]
 * treant_folhas [217,429,58,115]
 */

/** Pecas de moldura, na folha `Pages_elements_full.png`. */
const ELEMENTOS = {
  /*
   * Fita de titulo — SO O CORPO DA FITA, nao a peca inteira.
   *
   * 🔴 A peca original (679,13,223,57) tem tres coisas grudadas: a fita, uma
   * HASTE fina de ~90 px e uma plaquinha escura na ponta. Recortada inteira e
   * ampliada 3x ela dava 669 px de largura sobre um livro de 816, com a haste
   * saindo pela borda direita e a plaquinha caindo POR CIMA da pagina — foi o
   * "ta tudo em cima" que o dono relatou em 29/08.
   *
   * As colunas foram medidas: o corpo da fita ocupa x 4..134 e y 0..40 dentro
   * da peca (o resto e drapeado que desce ate y 48). 130x40 e a fita e so ela.
   */
  ribbon: [683, 13, 130, 40],
  // Moldura de encaixe VAZADA (300 px de borda em 28x28) — o retrato entra
  // dentro dela. A irma solida em (18,36) e o encaixe preenchido, que nao serve.
  slot: [242, 36, 28, 28],
  // Plaquinha de linha de lista.
  plate: [455, 56, 82, 12],
};

// --- PNG (mesmo codec de `pixellab2strip.mjs` e `animals2strip.mjs`) --------

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
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

/** Recorta `[x,y,w,h]` da folha. */
function recorta(img, [sx, sy, w, h]) {
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const so = ((sy + y) * img.w + sx) * 4;
    img.px.copy(px, y * w * 4, so, so + w * 4);
  }
  return { w, h, px };
}

/**
 * Aperta o recorte no bounding box de alpha.
 *
 * 🔴 As caixas medidas na folha sao GENEROSAS de proposito — margem de erro em
 * cima da medicao. Sem apertar, cada retrato levaria uma faixa transparente
 * propria e nenhum ficaria centrado dentro da moldura de encaixe: um bicho
 * apareceria colado no topo e o vizinho no rodape.
 */
function aperta(img) {
  let x0 = img.w, x1 = -1, y0 = img.h, y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.px[(y * img.w + x) * 4 + 3] <= 8) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('recorte vazio');
  return recorta(img, [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
}

// --- Programa ---------------------------------------------------------------

mkdirSync(OUT, { recursive: true });

// A pagina do livro vai INTEIRA: ela ja e um arquivo proprio e nao ha o que
// recortar. Passa pelo decode/encode assim mesmo, para sair no mesmo formato
// (RGBA, sem paleta) que o resto do `public/`.
const page = decode(`${SRC}/Page.png`);
writeFileSync(`${OUT}/page.png`, encode(page.w, page.h, page.px));
console.log(`✅ page.png        ${page.w}x${page.h}  (livro aberto, inteiro)`);

const elems = decode(`${SRC}/Pages_elements_full.png`);
for (const [nome, caixa] of Object.entries(ELEMENTOS)) {
  const c = recorta(elems, caixa);
  writeFileSync(`${OUT}/${nome}.png`, encode(c.w, c.h, c.px));
  console.log(`✅ ${(nome + '.png').padEnd(16)} ${c.w}x${c.h}  em (${caixa[0]},${caixa[1]})`);
}

const mons = decode(`${SRC}/Monsters_without_shadow.png`);
for (const [especie, caixa] of Object.entries(RETRATOS)) {
  const c = aperta(recorta(mons, caixa));
  writeFileSync(`${OUT}/retrato-${especie}.png`, encode(c.w, c.h, c.px));
  console.log(
    `✅ retrato-${especie}.png`.padEnd(36)
    + `${c.w}x${c.h}  (caixa ${caixa[2]}x${caixa[3]} apertada)`,
  );
}

console.log(`\n${Object.keys(RETRATOS).length} retratos de 20 usados — ver o cabeçalho para o porquê.`);
