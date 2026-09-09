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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { decode, encode } from './png.mjs';

const ORIGEM = 'arte-fonte/magias';
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
 * ⚠️ **Só os ramos mágicos.** Knight, Assassino e Arqueiro continuam com os
 * ícones desenhados por código: o pacote é de efeito mágico, e dar um vórtice
 * roxo para "Corte Cruzado" seria inventar um significado que o desenho não
 * tem. As passivas também ficam de fora — o ícone desenhado põe nelas um anel
 * tracejado, e esse anel é o único aviso de que aquilo não vai para a barra.
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
  lightning_ball: 13, //    esfera de raios, literal
  electric_discharge: 48, // anel elétrico que se abre em volta
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
  silence: 2, //          raio com anel escuro: o selo que cala
  nature_plague: 11, //   dardo verde-azulado doentio

  // 🌿 Natureza — verde e terra.
  earth_spike: 39, //   chão rachado: o espinho que sobe
  binding_roots: 40, // cipó verde brilhante: as raízes
  wind_blades: 50, //   garras verdes: as lâminas de vento
  poison_spores: 31, // brilho verde-amarelo doentio
  nature_wrath: 38, //  círculo de terra estourando
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
writeFileSync(MANIFESTO, `${JSON.stringify(ids, null, 2)}\n`);
console.log(`[magias] ${ids.length} ícones em ${DESTINO} (${LADO}px)`);
console.log(`[magias] manifesto em ${MANIFESTO}`);
