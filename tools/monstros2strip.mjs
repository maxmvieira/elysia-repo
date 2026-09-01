/**
 * Conversor dos packs de MONSTRO "4 direções" da CraftPix → folhas do jogo.
 *
 * Entrada: `assets/monstros-craftpix/<pack>/<Variante>/<Variante>_<Anim>_without_shadow.png`
 * Saída:   `client/public/assets/monsters/<tipo>/{walk,idle,attack,hurt,death}.png`
 *
 * Uso: `npm run monstros:build`
 *
 * ## O layout já é o do jogo — menos por uma coisa
 *
 * Cada folha do pack tem **4 linhas de direção** e célula quadrada
 * (`altura / 4`), que é exatamente o que o `sliceDirSheet` do
 * `client/src/miniworld.ts` espera. Não há remontagem a fazer.
 *
 * 🔴 **Mas as linhas 2 e 3 vêm TROCADAS**, e isso foi verificado olhando a arte,
 * não deduzido do nome do arquivo: a linha 2 é o bicho com a cabeça à ESQUERDA e
 * a linha 3 com a cabeça à DIREITA, enquanto o `SHEET_ROW` do jogo é
 * `down, up, right, left`. Conferido no rato, no lagarto e no ent — os três
 * packs em que a direção se lê de relance — e vale para os cinco.
 *
 * ⚠️ É a MESMA troca que o `golem2strip.mjs` conserta. Se um pack novo da
 * CraftPix aparecer, **confira antes de confiar**: norte virado em leste não
 * quebra nada que o typecheck ou o teste peguem, só aparece jogando.
 *
 * ## Por que `Without_shadow`
 *
 * 🔴 O pack vem em duas versões e a com sombra é a errada aqui: o
 * `makeMiniActor` já desenha uma elipse por baixo de todo ator. A arte com
 * sombra assada daria duas sombras, em tamanhos diferentes. Mesma razão do
 * `animals2strip.mjs`.
 *
 * ## O `Run` fica de fora, e não é esquecimento
 *
 * O pack traz seis animações; o jogo tem cinco estados
 * (`walk, idle, attack, hurt, death`) e **não tem corrida** — nada no protocolo
 * distingue andar de correr. Trazer o `Run` seria arte parada no disco.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const SRC = 'assets/monstros-craftpix';
const OUT = 'client/public/assets/monsters';

/**
 * Variante do pack → tipo no jogo, com a escala de desenho.
 *
 * 🔴 **A ESCALA É INTEIRA — menos nos lagartos**, e a exceção tem dono e data.
 * A regra (ver o `ZOOM` em `main.ts`) existe porque, com filtragem `nearest`,
 * escala quebrada faz um pixel virar 2 e o vizinho virar 3, em faixas
 * alternadas.
 *
 * 🔴 **E ela é uma por PACK, não uma por bicho.** A lição está inteira no
 * `ESCALA` do `animals2strip.mjs`: perseguir uma altura igual para todos foi o
 * que pôs filhote maior que adulto. Dentro de um pack o artista já desenhou as
 * proporções relativas certas, e um multiplicador único as preserva.
 *
 * ⚠️ **O que a escala entrega hoje, medido, com o herói em 60 px e o Golem — o
 * maior do mapa — em 76:**
 *
 *   Ent Ancestral 71 · Ent 67 · Campeão Lagarto 65 · Lagarto Soldado 63
 *   · Vampiro Nobre 58 · Senhor Vampiro 58 · Homem-Lagarto 56 · Cogumelo
 *   Púrpura 57 · Vampiro 54 · Ent Seco 50 · Rato Pestilento 46 · Cogumelo
 *   Escarlate 46,5 · Rato Sombrio 44 · Cogumelo Pardo 45 · Rato Gigante 42
 *
 * ⚠️ **O vampiro é o único a 2×, e por medida:** ele vem com 27 px de conteúdo,
 * pouco mais de um terço do ent. A 1× um vampiro adulto ficaria menor que um
 * cogumelo; a 2× ele encosta no herói, que é onde um humanoide deve estar.
 *
 * 🔴 **OS DEMÔNIOS PASSAM O GOLEM, e isso é ordem do dono em 01/09** — não é
 * descuido de quem não viu a hierarquia. Ele foi explícito: *"demonio mesmo
 * tamanho do golem, carmesin um pouco maior que o golem e o senhor demonio 2x
 * maior que o golem"*.
 *
 * ⚠️ Isso derruba a regra que este arquivo seguia até então, de que **nada passa
 * o Golem (76 px), porque ele é o chefe**. A regra valia enquanto o Golem era o
 * único chefe do mapa; o Senhor Demônio tem 680 de vida contra os 900 dele, e
 * agora vai ser o dobro do tamanho. **Quem for balancear depois: a silhueta e a
 * ficha discordam de propósito aqui, e a decisão é do dono.**
 *
 * As contas, a partir do corpo medido a 1× (43, 43 e 47 px) e do Golem em 76:
 *
 *   Demônio          1,75×  ->  75,3 px   (o Golem tem 76: mesmo tamanho)
 *   Demônio Carmesim 2×     ->  86 px     (13 % acima do Golem)
 *   Senhor Demônio   3,25×  ->  152,8 px  (o dobro do Golem, quase 5 tiles)
 *
 * ⚠️ O Senhor Demônio passa a ser, de longe, o maior desenho do jogo — quase
 * cinco tiles de altura. A caixa de clique NÃO cresce junto (ela é do tamanho do
 * tile, em `makeSpriteActor`), então ele se acerta pelo pé, não pelo corpo.
 *
 * 🔴 **OS LAGARTOS E OS COGUMELOS ESTÃO A 1,5×, por decisão do dono em 01/09
 * vendo em tela.** Os cogumelos vieram junto no mesmo pedido — *"mantenha o
 * mesmo do lagarto"* — e é o mesmo fator, não a mesma altura: a proporção
 * interna de cada pack continua preservada.
 *
 * Ele viu os 37–43 px do 1× e pediu maior. Os degraus inteiros disponíveis eram
 * 1× (37–43, abaixo do herói) e 2× (74–86, **acima do Golem**, que tem 76 e é o
 * chefe do mapa) — não havia meio-termo, e 2× faria a silhueta mentir sobre a
 * hierarquia do bestiário.
 *
 * A 1,5× eles ficam em **56–65 px**, encostando no herói (60), que é onde um
 * humanoide armado pertence.
 *
 * ⚠️ O preço é o serrilhado: nas diagonais da cauda e da lâmina, um pixel vira 1
 * e o vizinho vira 2. **Se um dia incomodar, o valor limpo é 1** — e aí eles
 * voltam a ser menores que o herói. Não existe terceira opção sem reamostrar a
 * arte, o que distorce o desenho de outro jeito.
 */
const TIPOS = {
  'ent/Ent1': { tipo: 'ent_seco', escala: 1 },
  'ent/Ent2': { tipo: 'ent', escala: 1 },
  'ent/Ent3': { tipo: 'ent_ancestral', escala: 1 },
  'vampire/Vampires1': { tipo: 'vampire', escala: 2 },
  'vampire/Vampires2': { tipo: 'vampire_noble', escala: 2 },
  'vampire/Vampires3': { tipo: 'vampire_lord', escala: 2 },
  'mushroom/Mushroom1': { tipo: 'mushroom_brown', escala: 1.5 },
  'mushroom/Mushroom2': { tipo: 'mushroom_red', escala: 1.5 },
  'mushroom/Mushroom3': { tipo: 'mushroom_purple', escala: 1.5 },
  'rat/Rat1': { tipo: 'giant_rat', escala: 1 },
  'rat/Rat2': { tipo: 'plague_rat', escala: 1 },
  'rat/Rat3': { tipo: 'shadow_rat', escala: 1 },
  'lizard/Lizardman1': { tipo: 'lizardman', escala: 1.5 },
  'lizard/Lizardman2': { tipo: 'lizardman_soldier', escala: 1.5 },
  'lizard/Lizardman3': { tipo: 'lizardman_champion', escala: 1.5 },

  // --- Segunda leva, 01/09 ------------------------------------------------
  //
  // ⚠️ **DOIS destes não criam espécie, PREENCHEM espécie que já existia sem
  // arte**: o `skeleton_warrior` e o `zombie` estavam na ficha desde sempre e
  // nasciam como bolha colorida. É por isso que os nomes deles não seguem o
  // padrão dos vizinhos — eles são mais velhos que este arquivo.
  //
  // ⚠️ **O pack dos esqueletos não tem ARQUEIRO**: as três variantes são corpo a
  // corpo. O `skeleton_archer` continua sem arte, e forçar uma destas nele
  // daria um arqueiro sem arco.
  'demon/Demon1': { tipo: 'demon', escala: 1.75 },
  'demon/Demon2': { tipo: 'demon_crimson', escala: 2 },
  'demon/Demon3': { tipo: 'demon_lord', escala: 3.25 },
  'ghost/Ghost1': { tipo: 'ghost', escala: 1.5 },
  'ghost/Ghost2': { tipo: 'ghost_wraith', escala: 1.5 },
  'ghost/Ghost3': { tipo: 'ghost_specter', escala: 1.5 },
  'imp/Imp1': { tipo: 'imp', escala: 1.5 },
  'imp/Imp2': { tipo: 'imp_winged', escala: 1.5 },
  'imp/Imp3': { tipo: 'imp_infernal', escala: 1.5 },
  'beholder/Beholder1': { tipo: 'beholder', escala: 1 },
  'beholder/Beholder2': { tipo: 'beholder_crimson', escala: 1 },
  'beholder/Beholder3': { tipo: 'beholder_void', escala: 1 },
  'skeleton/Skeleton1': { tipo: 'skeleton_warrior', escala: 2 },
  'skeleton/Skeleton2': { tipo: 'skeleton_guard', escala: 2 },
  'skeleton/Skeleton3': { tipo: 'skeleton_king', escala: 2 },
  'gnoll/Gnoll1': { tipo: 'gnoll', escala: 1.5 },
  'gnoll/Gnoll2': { tipo: 'gnoll_warrior', escala: 1.5 },
  'gnoll/Gnoll3': { tipo: 'gnoll_chieftain', escala: 1.5 },
  'zombie/Zombie1': { tipo: 'zombie', escala: 2 },
  'zombie/Zombie2': { tipo: 'zombie_grave', escala: 2 },
  'zombie/Zombie3': { tipo: 'zombie_rotten', escala: 2 },

  // --- Goblins, 01/09 ------------------------------------------------------
  //
  // ⚠️ **`goblin_warrior` já existia sem arte** — nascia como bolha colorida
  // desde julho. As outras duas variantes viram espécie nova.
  //
  // 🔴 **O `goblin_archer` NÃO entra aqui, e não é esquecimento:** as três
  // variantes do pack são corpo a corpo (dois punhais, espada, cajado). Pôr
  // qualquer uma nele daria um arqueiro sem arco, que é pior que bolha.
  'goblin/Goblin1': { tipo: 'goblin_warrior', escala: 1.5 },
  'goblin/Goblin2': { tipo: 'goblin_captain', escala: 1.5 },
  'goblin/Goblin3': { tipo: 'goblin_shaman', escala: 1.5 },
};

/** Animação do pack → arquivo do jogo. `Run` fica fora — ver o cabeçalho. */
const ANIMS = { Walk: 'walk', Idle: 'idle', Attack: 'attack', Hurt: 'hurt', Death: 'death' };

/**
 * 🔴 A âncora sai só de `walk` + `idle` — é o conserto do "golem flutuando".
 *
 * Medir a união das cinco folhas deixa o `attack` (um baque no chão) e o `death`
 * (o bicho deitado) esticarem a caixa, e aí o bicho PARADO sobe acima da própria
 * sombra. A história está inteira no `CREATURE_SHEETS`.
 */
const ANIMS_QUE_MEDEM = ['walk', 'idle'];

// --- PNG (mesmo codec de `animals2strip.mjs`) -------------------------------

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

// --- Conversão --------------------------------------------------------------

/** Linha de DESTINO → linha de ORIGEM. A troca do 2 com o 3 — ver o cabeçalho. */
const ORDEM = [0, 1, 3, 2];

function trocaLinhas(img, cell) {
  const out = Buffer.alloc(img.w * img.h * 4);
  const stride = img.w * 4;
  ORDEM.forEach((origem, destino) => {
    for (let y = 0; y < cell; y++) {
      const so = (origem * cell + y) * stride;
      const dofs = (destino * cell + y) * stride;
      img.px.copy(out, dofs, so, so + stride);
    }
  });
  return { w: img.w, h: img.h, px: out };
}

/**
 * Acumula a caixa de alpha em coordenada de CÉLULA, mais um HISTOGRAMA de
 * quantos pixels cada linha tem. O histograma é o que acha o pé.
 */
function mede(img, cell, acc) {
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.px[(y * img.w + x) * 4 + 3] <= 8) continue;
      const ly = y % cell, lx = x % cell;
      if (ly < acc.topo) acc.topo = ly;
      if (ly > acc.base) acc.base = ly;
      if (lx < acc.esq) acc.esq = lx;
      if (lx > acc.dir) acc.dir = lx;
      acc.linha[ly] = (acc.linha[ly] ?? 0) + 1;
    }
  }
}

/**
 * 🔴 **A LINHA DO PÉ NÃO É O PIXEL MAIS BAIXO — e confundir os dois faz o bicho
 * FLUTUAR.** Foi o defeito que o dono viu em 01/09: *"goblins parecem estar
 * flutuando, ratos também, os demônios também"*.
 *
 * A causa é o que pendura abaixo dos pés. Nesta projeção, "mais baixo no
 * desenho" quer dizer "mais ao sul no chão": o RABO do rato, os PUNHAIS do
 * goblin e o tridente do demônio são desenhados abaixo do corpo, mas encostam
 * no chão atrás dele. Ancorando no pixel mais baixo, quem ia para o tile do
 * jogador era a ponta do rabo — e o corpo subia.
 *
 * Medido, o que descia: demônios **18 px**, ratos 12–15, goblins 10,5.
 *
 * ⚠️ A separação é por MASSA, não por altura. Somando os pixels de cada linha
 * em todos os quadros e direções, o corpo faz um platô e a ponta pendurada faz
 * uma cauda fininha — e a queda entre os dois é um penhasco:
 *
 *   goblin   y39 = 25 % do pico  ->  y40 = 5 %
 *   rato     y71 = 24 %          ->  y77 = 3 %
 *   demônio  y76 = 36 %          ->  y77 = 8 %
 *
 * 🔴 **10 % do pico** fica com folga dentro de todos esses penhascos. Quem tem
 * pé de verdade quase não se mexe (vampiro 0 px, cogumelo e diabrete 1,5).
 *
 * ⚠️ Isto vale só para os packs deste conversor. `animals2strip.mjs` e
 * `golem2strip.mjs` continuam medindo pelo pixel mais baixo — a conta mostra
 * que ganhariam 1 a 2 px, o que não paga mexer em arte que o dono já aprovou.
 */
const FRACAO_DO_PE = 0.10;

function linhaDoPe(acc, cell) {
  const pico = Math.max(...Object.values(acc.linha));
  let pe = acc.topo;
  for (let ly = acc.topo; ly <= acc.base; ly++) {
    if ((acc.linha[ly] ?? 0) >= pico * FRACAO_DO_PE) pe = ly;
  }
  return pe;
}

const linhasCfg = [];
let convertidos = 0;

for (const [chave, { tipo, escala }] of Object.entries(TIPOS)) {
  const [pack, variante] = chave.split('/');
  const dirSrc = `${SRC}/${pack}/${variante}`;
  if (!existsSync(dirSrc)) { console.error(`⚠️  ${dirSrc} não existe — ${tipo} pulado.`); continue; }

  const dirOut = `${OUT}/${tipo}`;
  mkdirSync(dirOut, { recursive: true });

  const acc = { topo: 1e9, base: -1, esq: 1e9, dir: -1, linha: {} };
  let cell = 0;
  const feitos = [];

  for (const [animPack, animJogo] of Object.entries(ANIMS)) {
    /*
     * 🔴 **O nome do arquivo muda de pack para pack, e casar "por continha"
     * escolhe o arquivo errado em silêncio.** Três variações já apareceram:
     *
     *   `Rat2_Walk_without_shadow.png`   prefixo da variante
     *   `Walk0_without_shadow.png`       sem prefixo, com número (goblins)
     *   `Imp2_Hurt__without_shadow.png`  underscore a mais
     *
     * ⚠️ E o pack dos goblins traz `Walk_attack_` e `Run_Attack0_` — animações
     * de golpear andando, que o jogo não tem. Uma busca por "contém Attack"
     * pegaria `Run_Attack0` no lugar do `Attack0`, e o bicho atacaria correndo
     * parado no lugar. Por isso a âncora é o NOME INTEIRO, do começo ao fim.
     */
    // O prefixo aceita `Gnoll1_` e `Gnoll_` — o pack dos gnolls exporta a morte
    // sem o número da variante. É uma lista FECHADA de propósito: um prefixo
    // livre (`[A-Za-z]+_`) casaria `Run_Attack0_` quando o pedido é `Attack0_`.
    const base = variante.replace(/\d+$/, '');
    const prefixo = `(?:(?:${variante}|${base})_)?`;
    const re = new RegExp(`^${prefixo}${animPack}\\d*_+without_shadow\\.png$`);
    const arquivo = readdirSync(dirSrc).find((f) => re.test(f));
    if (!arquivo) { console.error(`⚠️  ${tipo}: sem ${animPack}`); continue; }

    const img = decode(`${dirSrc}/${arquivo}`);
    cell = img.h / 4;
    /*
     * 🔴 Travas de formato. O pack é de terceiro e pode vir reexportado com
     * outro layout numa versão futura; falhar alto aqui é muito melhor que
     * gerar uma folha em que o norte virou o leste e ninguém percebe até jogar.
     */
    if (!Number.isInteger(cell)) throw new Error(`${tipo}/${animPack}: altura ${img.h} não divide por 4`);
    if (!Number.isInteger(img.w / cell)) throw new Error(`${tipo}/${animPack}: largura ${img.w} não divide pela célula ${cell}`);

    const virado = trocaLinhas(img, cell);
    writeFileSync(`${dirOut}/${animJogo}.png`, encode(virado.w, virado.h, virado.px));
    if (ANIMS_QUE_MEDEM.includes(animJogo)) mede(virado, cell, acc);
    feitos.push(`${animJogo}(${img.w / cell}q)`);
  }

  // 🔴 O pé sai da MASSA por linha, não do pixel mais baixo — ver `linhaDoPe`.
  const pe = linhaDoPe(acc, cell);
  const altura = pe - acc.topo + 1;
  const largura = acc.dir - acc.esq + 1;
  const anchorY = (pe + 1) / cell;
  const pendurado = acc.base - pe;
  const anchorX = (acc.esq + acc.dir + 1) / 2 / cell;
  const labelTop = -(altura * escala) - 6;

  linhasCfg.push(
    `  ${tipo}: { cell: ${cell}, scale: ${escala}, anchorX: ${anchorX}, anchorY: ${anchorY}, labelTop: ${labelTop} },`
    + ` // ${altura}px -> ${altura * escala}px`,
  );
  console.log(
    `✅ ${tipo.padEnd(20)} cell=${String(cell).padStart(3)}  ${feitos.join(' ')}  `
    + `corpo ${largura}x${altura}  ${escala}× -> ${altura * escala}px`
    + (pendurado > 0 ? `  (${pendurado}px pendurados abaixo do pé, ignorados)` : ''),
  );
  convertidos++;
}

console.log(`\n${convertidos} criaturas convertidas.`);
console.log('\n--- cole em CREATURE_SHEETS (client/src/miniworld.ts) ---');
console.log(linhasCfg.join('\n'));
