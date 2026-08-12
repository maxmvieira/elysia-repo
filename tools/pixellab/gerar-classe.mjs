/**
 * Gerador de arte de classe pelo PixelLab.
 *
 * Produz, por classe, as 4 direcoes paradas e o 2o quadro da caminhada:
 *
 *   arte-fonte/pixellab/<classe>/{south,north,east,west}.png
 *   arte-fonte/pixellab/<classe>/{south,north,east,west}-passo.png
 *
 * 🔴 CADA OPCAO AQUI ESTA NO LUGAR POR CAUSA DE UM ERRO OBSERVADO. Sao 20
 * geracoes de tentativa (2026-08-10), documentadas em `docs/PIXELLAB-RECEITA.md`.
 * Leia antes de "simplificar" qualquer parametro.
 *
 * Custo: 6 geracoes por classe (oeste e ESPELHADO, nao gerado).
 *
 * Uso:
 *   PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs          # as 4
 *   PIXELLAB_TOKEN=xxxx node tools/pixellab/gerar-classe.mjs knight   # uma
 *
 * ⚠️ O token NUNCA entra no repositorio: vem do ambiente, e so.
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { join } from 'node:path';

const TOKEN = process.env.PIXELLAB_TOKEN;
if (!TOKEN) {
  console.error('Faltou PIXELLAB_TOKEN. Pegue em pixellab.ai/account, campo "Secret".');
  process.exit(1);
}

const API = 'https://api.pixellab.ai/v1';

/** 🔴 Fixo em 64: `animate-with-text` declara min E max iguais a 64. */
const CELL = 64;

/** Ordem das direcoes. A mesma do frames2strip.mjs e do loader. */
const DIRS = ['south', 'north', 'east', 'west'];

/** Descricoes: saem dos `blurb` de `shared/src/stats.ts` e das cores de `miniworld.ts`. */
const CLASSES = {
  knight:
    'knight in polished steel plate armor with a blue tabard and gold trim, ' +
    'closed helmet with visor, holding a longsword in the right hand and a large ' +
    'blue kite shield with a golden lion emblem in the left hand, full body, standing',
  sorcerer:
    'sorcerer in long flowing purple robes with gold trim and a wide hood, ' +
    'holding a tall wooden staff topped with a glowing violet crystal, ' +
    'slender frame, no armor, full body, standing',
  archer:
    'ranger in light green and brown leather armor with a hooded short cloak ' +
    'and a quiver of arrows on the back, holding a curved longbow in the left hand, ' +
    'lean athletic frame, full body, standing',
  assassin:
    'hooded assassin in dark crimson and black leather with cloth-wrapped forearms ' +
    'and a short torn cape, holding a dagger in each hand in a reverse grip, ' +
    'lean crouched frame, full body, standing',
};

/**
 * Faixa redesenhada no passo: [x0, x1, y0, y1] na celula de 64.
 *
 * 🔴 Ela comeca em y=50, ABAIXO de onde qualquer escudo, capa ou cajado chega.
 * Nao e folga: mascarar mais alto devolve o escudo a regiao redesenhada e ele se
 * perde — foi exatamente assim que a tentativa por esqueleto morreu. O que esta
 * fora da mascara NAO PODE ser perdido, e e essa garantia que faz o metodo valer.
 *
 * O preco e um passo curto, de pe e canela. Tibia classico anda assim.
 */
const FAIXA_PERNAS = [12, 52, 50, 63];

/**
 * Faixa redesenhada no GOLPE: o lado da arma, do topo da celula ate os pes.
 *
 * 🔴 Ela comeca em **y = 0**, e essa e a licao inteira deste passo: a mascara
 * tem que conter o DESTINO, nao so a origem. A primeira tentativa mascarou
 * y 18..58 — exatamente onde o braco ja estava — e a espada **nao subiu**, porque
 * nao havia mascara acima do ombro para ela ocupar. O modelo so desenha dentro
 * da mascara.
 *
 * ⚠️ E para em x=22 porque o elmo mora em x 22..32. Alargar para 26 fez a espada
 * sair **solta no ar, sem braco segurando**.
 *
 * 🔴 **O LADO E POR CLASSE, e supor um lado so ja custou 12 geracoes.** A
 * primeira versao mascarou a esquerda para todo mundo, porque o Knight segura a
 * espada ali. Deu certo NO KNIGHT e falhou nas outras tres: o cajado do
 * Feiticeiro fica na DIREITA da tela, e Arqueiro e Assassino usam os DOIS
 * bracos (arco puxado, adaga em cada mao). Golpe fora da mascara nao acontece.
 *
 * `ambos` deixa o miolo (x 23..40) intacto — e onde mora o elmo/capuz.
 */
const BANDAS = {
  esq: [[0, 22, 0, 58]],
  dir: [[41, 63, 0, 58]],
  ambos: [[0, 22, 0, 58], [41, 63, 0, 58]],
};

/** De que lado da TELA mora a arma de cada classe, na vista de frente. */
const LADO_ARMA = {
  knight: 'esq',      // espada na esquerda, escudo na direita
  sorcerer: 'dir',    // o cajado nasce na direita da tela
  archer: 'ambos',    // arco puxado ocupa os dois bracos
  assassin: 'ambos',  // uma adaga em cada mao
};

/** No NORTE (vista de costas) a arma troca de lado na tela. */
const ESPELHA_LADO = { esq: 'dir', dir: 'esq', ambos: 'ambos' };

/**
 * 🔴 BECO Nº 7 — ABRIR O TRONCO DESTROI O PERSONAGEM. Testado em 2026-08-11,
 * no Arqueiro, e custou 3 geracoes.
 *
 * O diagnostico estava certo: `ambos` preserva o miolo `x 23..40`, que e
 * exatamente onde puxar o arco acontece, e por isso o gesto saia curto — o
 * quadro de golpe media MAIS ESTREITO que o parado (32 -> 28 px). A conclusao
 * de abrir o miolo e que estava errada.
 *
 * A mascara testada foi `[[0,63,20,58], [0,22,0,19], [41,63,0,19]]`: tudo menos
 * a cabeca. O que voltou nao foi um arqueiro atirando — foi **outro
 * personagem**. Nas quatro direcoes o arco sumiu e apareceram capa esvoacante,
 * ornamentos dourados e uma ESPADA GRANDE brilhando. A cabeca preservada e o
 * `color_image` seguraram a paleta e o capuz, e nada mais.
 *
 * ⚠️ E o beco nº 1 de novo, por outra porta: **o que esta fora da mascara e a
 * unica coisa garantida.** Abrir o tronco e dizer ao modelo que o tronco pode
 * ser qualquer coisa — e ele aceita o convite.
 *
 * 🔴 **SEGUNDA TENTATIVA, tambem falhada, mais 3 geracoes.** A hipotese seguinte
 * era boa no papel: manter a mascara `ambos` e mover o GESTO para dentro dela,
 * copiando a forma do unico gesto que leu bem (o do Knight: "arma erguida acima
 * do ombro, braco estendido para cima"). Ficou
 * `'raising a longbow high above the shoulder to the upper left, bow arm
 * extended up, string drawn back, about to release'`.
 *
 * O resultado foi **visualmente identico ao anterior**. Os PNGs saem diferentes
 * byte a byte, mas a caixa de alpha nao muda um pixel em nenhuma das quatro
 * direcoes (sul 28, norte 31, leste 26, oeste 26 de largura, iguaizinhas), e as
 * poses lado a lado nao se distinguem. Ou seja: **o texto nao move o gesto**
 * quando a regiao aberta e so a lateral. Foi revertido.
 *
 * ⚠️ Nao vale a pena tentar de novo por texto. Sobra mexer em `seed` (hoje fixo
 * em 31) ou aceitar que arco e adaga nao rendem golpe forte por `inpaint`
 * lateral — e ai o caminho e outro endpoint, nao outro prompt.
 */

/**
 * O gesto de golpe de cada classe, e em que arquivo ele cai.
 *
 * 🔴 Toda classe grava tambem `attack_sword`, mesmo o Feiticeiro. Nao e
 * descuido: `attackPoseFallback` (em `shared/src/heropose.ts`) termina a cadeia
 * em `sword`, entao classe sem esse arquivo perde o golpe inteiro e volta ao
 * "pulinho" de investida do placeholder. O arquivo e o SLOT, nao a arma.
 */
const GOLPES = {
  knight: { pose: 'sword', gesto: 'swinging a longsword, sword raised high above the shoulder to the upper left, arm extended up, mid-swing' },
  sorcerer: { pose: 'staff', gesto: 'raising a wooden staff high above the shoulder to the upper left, crystal glowing bright, casting a spell' },
  archer: { pose: 'bow', gesto: 'drawing a longbow, bow raised and arm extended to the upper left, arrow nocked, about to release' },
  assassin: { pose: 'dagger', gesto: 'lunging with a dagger, arm thrust forward and up to the left, blade extended, mid-stab' },
};

// ---------------------------------------------------------------------------

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

// --- PNG minimo: decodifica RGBA, codifica RGBA e RGB ----------------------
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(ty, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); return Buffer.concat([l, b, c]); };

function encode(w, h, px, canais) {
  const s = w * canais; const raw = Buffer.alloc(h * (s + 1));
  for (let y = 0; y < h; y++) { raw[y * (s + 1)] = 0; px.copy(raw, y * (s + 1) + 1, y * s, (y + 1) * s); }
  const i = Buffer.alloc(13); i.writeUInt32BE(w, 0); i.writeUInt32BE(h, 4); i[8] = 8; i[9] = canais === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', i), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function decode(buf) {
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
  const canais = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * canais; const px = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const line = raw.subarray(q, q + stride); q += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= canais ? cur[x - canais] : 0, b = prev ? prev[x] : 0;
      const c = x >= canais && prev ? prev[x - canais] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[x] = v & 0xff;
    }
  }
  return { w, h, px, canais };
}

/** Espelha horizontalmente. E como o OESTE nasce do LESTE, sem gastar geracao. */
function espelha(buf) {
  const img = decode(buf);
  const out = Buffer.alloc(img.px.length);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const de = (y * img.w + x) * img.canais;
    const para = (y * img.w + (img.w - 1 - x)) * img.canais;
    img.px.copy(out, para, de, de + img.canais);
  }
  return encode(img.w, img.h, out, img.canais);
}

function mascara(bandas) {
  const m = Buffer.alloc(CELL * CELL * 3); // preto = preservar
  for (const [x0, x1, y0, y1] of bandas) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const o = (y * CELL + x) * 3; m[o] = m[o + 1] = m[o + 2] = 255; // branco = redesenhar
    }
  }
  return encode(CELL, CELL, m, 3);
}

// ---------------------------------------------------------------------------

const COMUM = {
  image_size: { width: CELL, height: CELL },
  view: 'high top-down',              // 🔴 o angulo do jogo; 'side' nao assenta em mapa top-down
  no_background: true,                // transparencia de verdade
  outline: 'single color black outline',
  detail: 'medium detail',
};


async function golpes(cls, dir, desc, poses) {
  // O GOLPE, mesmo truque do passo, mas na faixa da ARMA.
  const { pose, gesto } = GOLPES[cls];
  const lado = LADO_ARMA[cls];
  const mskArma = mascara(BANDAS[lado]);
  const mskArmaEsp = mascara(BANDAS[ESPELHA_LADO[lado]]);
  for (const d of ['south', 'north', 'east']) {
    console.log(`  ${cls}: golpe ${d}...`);
    const r = await call('inpaint', {
      ...COMUM,
      description: `${desc.split(',')[0]}, ${gesto}`,
      negative_description: 'shield, second weapon, extra arms',
      inpainting_image: paraB64(poses[d]),
      // norte e a vista de COSTAS: a arma troca de lado na tela
      mask_image: paraB64(d === 'north' ? mskArmaEsp : mskArma),
      color_image: paraB64(poses[d]),
      direction: d,
      text_guidance_scale: 7,
      seed: 31,
    });
    const golpe = daB64(r.image.base64);
    writeFileSync(join(dir, `${d}-golpe.png`), golpe);
    if (d === 'east') writeFileSync(join(dir, 'west-golpe.png'), espelha(golpe));
  }
  writeFileSync(join(dir, 'GOLPE.txt'), `${pose}\n`); // qual slot este golpe ocupa

  console.log(`  ${cls}: golpes ok`);
}

/**
 * A MORTE, por `animate-with-skeleton`: o corpo tomba girando em torno dos pes.
 *
 * 🔴 Aqui o esqueleto e a ferramenta CERTA, e e o unico lugar onde ele e. Ele
 * foi descartado na caminhada porque REGENERA O CORPO e some com o escudo — mas
 * na morte o corpo tem que mudar inteiro, e a animacao e TERMINAL: acaba num
 * monte no chao, congelado para sempre. Regenerar deixa de ser defeito.
 *
 * ⚠️ Pelo mesmo motivo, `inpaint` NAO serve aqui: nao existe regiao a preservar.
 * E o oposto exato do que faz o passo e o golpe funcionarem.
 */
async function mortes(cls, dir, poses) {
  for (const d of ['south', 'north', 'east']) {
    console.log(`  ${cls}: morte ${d}...`);
    const base = poses[d];
    const kp0 = (await call('estimate-skeleton', { image: paraB64(base) })).keypoints;

    const pes = kp0.filter((k) => k.label.endsWith(' LEG'));
    const px = pes.reduce((s, k) => s + k.x, 0) / pes.length;
    const py = pes.reduce((s, k) => s + k.y, 0) / pes.length;

    /**
     * Gira o esqueleto `t` radianos em torno dos pes, afunda `dz`, e RECENTRA.
     *
     * 🔴 O recentro nao e enfeite: sem ele o corpo caido SAI DO QUADRO pela
     * direita. Girar em torno dos pes desloca o tronco quase o comprimento do
     * corpo, e a celula so tem 64 px.
     */
    const tomba = (t, dz) => {
      const cos = Math.cos(t), sin = Math.sin(t);
      const p = kp0.map((k) => {
        const dx = k.x - px, dy = k.y - py;
        return { ...k, x: px + dx * cos - dy * sin, y: py + dx * sin + dy * cos + dz };
      });
      const xs = p.map((k) => k.x);
      const desloca = 0.5 - (Math.min(...xs) + Math.max(...xs)) / 2;
      return p.map((k) => ({
        ...k,
        x: Math.min(0.97, Math.max(0.03, k.x + desloca)),
        y: Math.min(0.97, Math.max(0.03, k.y)),
        // 🔴 `z_index` TEM que ser inteiro: a API responde 422 com fracao, e o
        // `estimate-skeleton` as vezes devolve -0.5 (aconteceu no Assassino).
        // Sem isto, a classe fica com morte pela metade, e o erro so aparece na
        // direcao em que o estimador resolveu usar meio nivel.
        z_index: Math.round(k.z_index),
      }));
    };

    // De pe -> joelhos cedendo -> caido. O ULTIMO e o cadaver.
    const r = await call('animate-with-skeleton', {
      image_size: { width: CELL, height: CELL },
      reference_image: paraB64(base),
      color_image: paraB64(base),
      skeleton_keypoints: [tomba(0, 0), tomba(0.55, 0.04), tomba(1.35, 0.06)],
      view: 'high top-down',
      direction: d,
      guidance_scale: 6,
      seed: 41,
    });

    r.images.forEach((im, i) => {
      const buf = daB64(im.base64);
      writeFileSync(join(dir, `${d}-morte${i}.png`), buf);
      if (d === 'east') writeFileSync(join(dir, `west-morte${i}.png`), espelha(buf));
    });
  }
}

async function gera(cls) {
  const desc = CLASSES[cls];
  if (!desc) throw new Error(`Classe desconhecida: ${cls}. Conhecidas: ${Object.keys(CLASSES).join(', ')}`);
  const dir = join('arte-fonte', 'pixellab', cls);
  mkdirSync(dir, { recursive: true });
  const poses = {};

  // SO_GOLPE=1 refaz apenas o golpe, reusando as poses ja aprovadas no disco.
  // Existe porque o lado da mascara e o que mais precisou de tentativa, e
  // regerar as poses junto arriscaria trocar arte boa por outra tirada no dado.
  if (process.env.SO_GOLPE || process.env.SO_MORTE) {
    for (const d of DIRS) poses[d] = readFileSync(join(dir, `${d}.png`));
    if (process.env.SO_GOLPE) await golpes(cls, dir, desc, poses);
    if (process.env.SO_MORTE) await mortes(cls, dir, poses);
    return;
  }

  // 1. SUL — a referencia de todas as outras.
  console.log(`  ${cls}: sul...`);
  poses.south = daB64((await call('generate-image-pixflux', {
    ...COMUM, description: desc, direction: 'south', seed: 1,
  })).image.base64);

  // 2. NORTE e LESTE — pelo /rotate.
  //
  // 🔴 `generate-image-pixflux` com `direction` NAO VIRA O PERSONAGEM. O campo e
  // documentado como "weakly guiding" e na pratica e ignorado: pedir `north` com
  // ou sem init_image devolve o mesmo sujeito de frente, com o escudo a mostra.
  // Foi o erro que fez a primeira versao deste gerador entregar quatro poses
  // bonitas e UMA direcao so. O /rotate e o unico que vira de verdade.
  //
  // ⚠️ Os numeros sao por tentativa: no leste, guidance 7.5 e o `direction_change:
  // 90` saem com A CABECA DUPLICADA (dois elmos). guidance 5 com seed 5 sai limpo.
  const giros = { north: { g: 7.5, s: 1 }, east: { g: 5, s: 5 } };
  for (const [d, { g, s }] of Object.entries(giros)) {
    console.log(`  ${cls}: ${d}...`);
    poses[d] = daB64((await call('rotate', {
      image_size: { width: CELL, height: CELL },
      from_image: paraB64(poses.south),
      from_direction: 'south', to_direction: d,
      from_view: 'high top-down', to_view: 'high top-down',
      image_guidance_scale: g, seed: s,
    })).image.base64);
  }

  // 3. OESTE = espelho do LESTE. Nao gasta geracao, e garante simetria.
  //    A `SPEC-SPRITES-CLASSES.md` ja autoriza entregar 3 linhas e espelhar.
  poses.west = espelha(poses.east);

  for (const [d, buf] of Object.entries(poses)) writeFileSync(join(dir, `${d}.png`), buf);

  // 4. O PASSO, por inpaint na faixa das pernas. Oeste espelha o leste de novo.
  const msk = mascara([FAIXA_PERNAS]);
  for (const d of ['south', 'north', 'east']) {
    console.log(`  ${cls}: passo ${d}...`);
    const r = await call('inpaint', {
      ...COMUM,
      description: `${desc.split(',')[0]}, legs mid-stride, one foot stepping forward`,
      negative_description: 'shield, weapon, extra limbs',
      inpainting_image: paraB64(poses[d]),
      mask_image: paraB64(msk),
      // 🔴 trava a paleta. Sem isto ela pula de ~70 para ~1500 cores.
      color_image: paraB64(poses[d]),
      direction: d,
      text_guidance_scale: 6,
      seed: 21,
    });
    const passo = daB64(r.image.base64);
    writeFileSync(join(dir, `${d}-passo.png`), passo);
    if (d === 'east') writeFileSync(join(dir, 'west-passo.png'), espelha(passo));
  }

  await golpes(cls, dir, desc, poses);
  await mortes(cls, dir, poses);

  console.log(`  ${cls}: ok — 13 arquivos, 9 geracoes`);
}

const alvo = process.argv[2];
for (const c of alvo ? [alvo] : Object.keys(CLASSES)) await gera(c);
