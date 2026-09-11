/**
 * Prepara os ÍCONES DE MAGIA a partir do pacote de efeitos, um por habilidade.
 *
 * 🔴 **Por que existe, se a folha do dono já tinha ícone de magia.** Tinha
 * treze, e o jogo tem 75 habilidades: o mapa precisava ser por RAMO, e dentro
 * de um ramo as magias dividiam o desenho — as cinco de cura mostravam a mesma
 * cruz verde. O pacote tem cinquenta efeitos avulsos, o que dá para **um ícone
 * por magia** nos ramos mágicos, que é o que a barra precisa: duas magias lado
 * a lado têm de ser diferentes sem passar o mouse.
 *
 * ⚠️ **A curadoria é o valor deste arquivo.** Cada linha da tabela é uma
 * escolha de que efeito combina com que magia, feita olhando os cinquenta. A
 * cor pesou tanto quanto a forma: o jogo já tem convenção de cor por ramo
 * (fogo laranja, gelo ciano, raio amarelo, cura verde, debuff roxo), e um
 * ícone fora dela mentiria sobre o elemento antes de o nome ser lido.
 *
 * ## Uso
 *
 *   node tools/hud/magias2png.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { decode, encode } from './png.mjs';

const ORIGEM = 'arte-fonte/magias';
const ORIGEM_HAB = 'arte-fonte/habilidades';
const DESTINO = 'client/public/assets/hud/magias';
const MANIFESTO = 'client/src/magias-arte.json';

/**
 * Lado do PNG final.
 *
 * ⚠️ O pacote vem em 512, e o maior lugar em que o ícone aparece é a lista de
 * habilidades, bem abaixo disso. 128 dá o dobro do maior uso — folga para tela
 * HiDPI sem carregar quatro vezes o peso em cada slot da barra.
 */
const LADO = 128;

/**
 * A magia e o número do arquivo no pacote.
 *
 * ⚠️ **Só os ramos mágicos**, porque o pacote é de efeito mágico e dar um
 * vórtice roxo para "Corte Cruzado" seria inventar um significado que o desenho
 * não tem. As três classes de arma saem da tabela `HABILIDADES`, mais abaixo.
 *
 * ⚠️ As passivas ficam de fora das DUAS tabelas — o ícone desenhado põe nelas um
 * anel tracejado, e esse anel é o único aviso de que aquilo não vai para a
 * barra. Um quadro ilustrado bonito apagaria o aviso.
 */
const MAGIAS = {
  // 🔥 Fogo — laranja.
  fire_bolt: 14, //  serpente de fogo com cabeça branca: o projétil que cai
  fire_wall: 47, //  labareda de pé, que é o desenho de uma muralha
  meteor: 41, //     estouro em estrela: o impacto de um só
  meteor_storm: 36, // três cometas: a chuva

  // ❄️ Gelo — ciano.
  cold_bolt: 6, //      vórtice com estrela branca no meio: o projétil
  ice_wall: 42, //      chamas azuis de pé, o par da muralha de fogo
  glacial_burst: 19, // estouro de bolhas geladas, do centro para fora
  blizzard: 26, //      garras de gelo cruzando: os estilhaços da nevasca

  // ⚡ Raio — amarelo e azul elétrico.
  electric_sphere: 13, //   esfera de raios, literal (id renomeado em 12/09)
  /*
   * ⛈️ **48 → 2, e a troca é com o Silêncio** (dono, 12/09: *"não tem um ícone
   * mais condizente para essa magia?"*).
   *
   * O 48 é um ORBE amarelo crepitando: o desenho de uma bola de eletricidade —
   * ou seja, da Esfera Elétrica, não desta. A Descarga virou um RAIO que desce
   * e bate num ponto, e o 2 é exatamente isso: um relâmpago ciano caindo num
   * clarão branco.
   *
   * ⚠️ **O Silêncio pagou a conta, e vale saber por quê.** Ele usava o 2 pelo
   * ANEL ESCURO no pé do raio (*"o selo que cala"*), e o raio era acessório. Só
   * que na barra o 2 lê como relâmpago, não como selo — e agora havia duas
   * magias elétricas disputando o mesmo desenho. As 36 artes do pacote estão
   * todas alocadas, uma por magia, então melhorar uma é necessariamente piorar
   * outra: o Silêncio ficou com o 48, que tem um miolo escuro e nenhum
   * significado próprio. É o elo mais fraco desta tabela hoje.
   */
  electric_discharge: 2, //  relâmpago que desce e estoura num ponto
  thor_wrath: 35, //        vários raios de uma vez

  // 🔮 Arcano — roxo.
  magic_amplify: 8, //    nova roxa: a magia crescendo
  magic_protection: 9, // pilar azul: a barreira de pé
  revealing_flame: 22, // sol laranja abrindo: a chama que revela
  arcane_circle: 43, //   órbita azul: o círculo desenhado no chão

  // 💚 Cura — verde, com o dourado do sagrado.
  heal: 4, //             espiral verde-amarela subindo
  regeneration: 16, //    vórtice verde contínuo: o que dura
  area_heal: 44, //       setas verdes subindo juntas: o grupo inteiro
  emergency_heal: 24, //  riscos verdes rápidos: a cura de emergência
  sanctuary: 20, //       orbe dourado: chão consagrado

  // 🙌 Buff.
  blessing_agility: 27, // seta verde: velocidade
  oak_skin: 34, //         estouro branco de núcleo escuro: a casca endurecendo
  spirit_blessing: 17, //  asa azul-rosada: espírito
  nature_strength: 10, //  raios dourados: força emprestada
  nature_blessing: 49, //  estrela branca e rosa: a bênção do grupo

  // 🟣 Debuff — roxo e magenta.
  weaken: 21, //          fumaça roxa que envolve
  vulnerability: 28, //   anel de buraco negro: a defesa que se abre
  curse_slowness: 45, //  vórtice magenta lento
  curse_weakness: 1, //   arco magenta que drena
  // ⚠️ Era o 2 (raio com anel escuro). Cedeu para a Descarga Elétrica em 12/09 —
  // ver a nota lá. O 48 fica pelo miolo escuro; é o elo fraco da tabela.
  silence: 48, //         orbe de miolo escuro: o selo que cala
  nature_plague: 11, //   dardo verde-azulado doentio

  // 🌿 Natureza — verde e terra.
  earth_spike: 39, //   chão rachado: o espinho que sobe
  binding_roots: 40, // cipó verde brilhante: as raízes
  wind_blades: 50, //   garras verdes: as lâminas de vento
  poison_spores: 31, // brilho verde-amarelo doentio
  nature_wrath: 38, //  círculo de terra estourando
};

/**
 * 🔴 **AS TRÊS CLASSES DE ARMA, em PIXEL ART** — e a mistura é de propósito.
 *
 * O pacote de efeitos cobriu os ramos mágicos e parou ali: ele é feito de
 * fogo, gelo e vórtice, e não tem espada, kunai nem flecha. Estes vêm de
 * pacotes de habilidade por classe, que são pixel art de paleta reduzida.
 *
 * ⚠️ **Duas linguagens no mesmo jogo, e nunca na mesma barra.** Habilidade é
 * POR CLASSE: quem joga de Knight vê oito ícones de pixel art e nenhum
 * ilustrado; quem joga de Feiticeiro vê o contrário. Os dois estilos só se
 * encontrariam numa tela que listasse as cinco classes juntas, e não existe
 * nenhuma.
 *
 * ⚠️ A paleta de cada meia-folha é o que dá identidade: o Guerreiro é vermelho,
 * o Caçador é verde e dourado, o Ladino é vermelho sobre azul-petróleo. Trocar
 * um ícone de meia-folha estraga isso mais do que parece.
 */
const HABILIDADES = {
  // ⚔️ Knight — metade "Warrior" da folha do Caçador/Guerreiro (51–100).
  power_strike: ['hw', 51], //     espada abrindo em estouro
  bash: ['hw', 56], //             a onda de choque, que é o formato da área
  charge: ['hw', 64], //           o guerreiro correndo com a lança à frente
  rupture: ['hw', 70], //          os três talhos
  execution: ['hw', 75], //        a espada com o clarão do golpe final
  taunt: ['hw', 68], //            a cabeça de touro: provocar
  defensive_stance: ['hw', 59], // o escudo de pé
  battle_fury: ['hw', 74], //      a figura urrando

  // 🏹 Arqueiro — metade "Hunter" da mesma folha (1–50).
  double_shot: ['hw', 1], //       as duas flechas cruzando
  precise_shot: ['hw', 50], //     a mira fechada no alvo
  piercing_shot: ['hw', 30], //    a flecha com rastro, atravessando
  arrow_rain: ['hw', 27], //       as flechas caindo
  volley: ['hw', 41], //           o punhado saindo junto
  eagle_eye: ['hw', 21], //        o olho
  concentration: ['hw', 15], //    o retículo
  hunting_trap: ['hw', 40], //     a boca de dentes
  explosive_trap: ['hw', 24], //   o chão rachado com o fogo saindo por baixo

  // 🗡️ Assassino — metade "Rogue" da folha do Ladino/Bruxo (1–50).
  sonic_blow: ['rw', 4], //        as adagas cruzando em rajada
  envenom: ['rw', 44], //          a caveira: veneno na lâmina
  hide: ['rw', 41], //             os olhos no escuro
  cross_slash: ['rw', 30], //      as duas lâminas em X
  deep_cut: ['rw', 34], //         a lâmina pingando
  blade_dance: ['rw', 38], //      a figura girando com o talho
  counter_attack: ['rw', 15], //   as lâminas travadas: a aparada
  quick_throw: ['rw', 48], //      a adaga voando com rastro
  shuriken_storm: ['rw', 12], //   a estrela
  poison_kunai: ['rw', 10], //     o frasco
  phantom_throw: ['rw', 24], //    a lâmina alada
  hidden_strike: ['rw', 35], //    a facada pelas costas
};

/**
 * Onde cada meia-folha mora e como os arquivos dela se chamam.
 *
 * ⚠️ O prefixo muda de pacote para pacote (`Ability_icons1_`, `Ability_icons3_`)
 * e o número NÃO é zero-preenchido acima de 99. É por isso que a montagem do
 * nome está aqui e não espalhada.
 */
const FOLHAS_HAB = {
  hw: { pasta: 'hunter-and-warrior-ability-icons-pixel-art', prefixo: 'Ability_icons1_' },
  rw: { pasta: 'rogue-and-warlock-ability-icons-pixel-art', prefixo: 'Ability_icons3_' },
};

/**
 * Reduz por MÉDIA de bloco, e não pegando um pixel a cada N.
 *
 * ⚠️ De 512 para 128 são dezesseis pixels virando um. Amostrar só um deles
 * (que é o que os outros conversores fazem, porque lá a redução é pequena)
 * serrilharia todo raio fino e toda faísca — e este pacote é feito de raio
 * fino e faísca.
 */
function reduz(img, lado) {
  const out = Buffer.alloc(lado * lado * 4);
  const escalaX = img.w / lado;
  const escalaY = img.h / lado;
  for (let y = 0; y < lado; y++) {
    const y0 = Math.floor(y * escalaY);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * escalaY));
    for (let x = 0; x < lado; x++) {
      const x0 = Math.floor(x * escalaX);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * escalaX));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * img.w + sx) * 4;
          /*
           * ⚠️ Média PONDERADA PELO ALFA nas cores: num pixel transparente a
           * cor guardada é lixo, e somá-la crua suja a borda com um halo da
           * cor errada.
           */
          const peso = img.px[o + 3] / 255;
          r += img.px[o] * peso; g += img.px[o + 1] * peso; b += img.px[o + 2] * peso;
          a += img.px[o + 3];
          n += peso;
        }
      }
      const total = (y1 - y0) * (x1 - x0);
      const d = (y * lado + x) * 4;
      out[d] = n ? Math.round(r / n) : 0;
      out[d + 1] = n ? Math.round(g / n) : 0;
      out[d + 2] = n ? Math.round(b / n) : 0;
      out[d + 3] = Math.round(a / total);
    }
  }
  return out;
}

/*
 * Preparação das habilidades: uma vez, com os pacotes em mãos.
 *
 * 🔴 **Passa pelo ffmpeg porque estes PNG são INDEXADOS** (cor tipo 3, com
 * paleta e `tRNS`). O `png.mjs` lê RGBA direto; num indexado ele não erra, só
 * devolve lixo — a mesma armadilha silenciosa do pacote entrelaçado.
 *
 * ⚠️ Sobe de 32 para 128 com vizinho-mais-próximo, que é multiplicação exata
 * por 4: qualquer filtro suave aqui borraria a arte que existe justamente por
 * ser de pixel. E 128 é o mesmo lado dos ícones ilustrados, para os dois
 * conjuntos serem intercambiáveis no jogo.
 */
const iFonte = process.argv.indexOf('--fonte');
if (iFonte >= 0) {
  const base = process.argv[iFonte + 1];
  if (!base) { console.error('uso: --fonte <pasta-com-os-packs>'); process.exit(1); }
  mkdirSync(ORIGEM_HAB, { recursive: true });
  for (const [id, [folha, n]] of Object.entries(HABILIDADES)) {
    const f = FOLHAS_HAB[folha];
    const de = join(base, f.pasta, 'Icons', `${f.prefixo}${String(n).padStart(2, '0')}.png`);
    /*
     * ⚠️ `-pix_fmt rgba` porque o ffmpeg PRESERVA o indexado se deixarem: a
     * saída sairia em cor tipo 3 como a entrada, e aí a pasta teria dois
     * formatos e o `png.mjs` — que só lê RGBA — engasgaria em metade dela.
     */
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', de,
      '-vf', `scale=${LADO}:${LADO}:flags=neighbor`, '-pix_fmt', 'rgba',
      join(ORIGEM_HAB, `${id}.png`)],
    { stdio: 'inherit' });
  }
  console.log(`[magias] fonte de habilidades: ${Object.keys(HABILIDADES).length} em ${ORIGEM_HAB}`);
  process.exit(0);
}

mkdirSync(DESTINO, { recursive: true });
const ids = Object.keys(MAGIAS).sort();
for (const id of ids) {
  const img = decode(join(ORIGEM, `${MAGIAS[id]}.png`));
  writeFileSync(join(DESTINO, `${id}.png`), encode(LADO, LADO, reduz(img, LADO)));
}

/*
 * 🔴 O manifesto existe para a lista NÃO ser escrita duas vezes.
 *
 * O cliente precisa saber quais magias têm arte, e a curadoria mora aqui. Uma
 * cópia da lista em `spellicons.ts` seria duas listas para manter em pé: bastava
 * acrescentar uma magia aqui e esquecer lá para o ícone existir no disco e
 * nunca aparecer no jogo — ou o contrário, e virar imagem quebrada.
 */
/*
 * ⚠️ As habilidades entram no MESMO destino e no MESMO manifesto das magias.
 * O cliente pergunta uma coisa só — "esta habilidade tem arte?" —, e dois
 * caminhos para responder seria a primeira coisa a sair de sincronia.
 */
const idsHab = [];
for (const id of Object.keys(HABILIDADES).sort()) {
  const de = join(ORIGEM_HAB, `${id}.png`);
  if (!existsSync(de)) continue;
  copyFileSync(de, join(DESTINO, `${id}.png`));
  idsHab.push(id);
}
if (idsHab.length) console.log(`[magias] + ${idsHab.length} habilidades de pixel art`);
else console.log('[magias] habilidades sem fonte preparada (rode com --fonte)');

writeFileSync(MANIFESTO, `${JSON.stringify([...ids, ...idsHab].sort(), null, 2)}\n`);
console.log(`[magias] ${ids.length} ícones ilustrados em ${DESTINO} (${LADO}px)`);
console.log(`[magias] manifesto em ${MANIFESTO}`);
