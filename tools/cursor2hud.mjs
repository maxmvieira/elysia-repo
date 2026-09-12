/**
 * 🖱️ Reduz as artes do PONTEIRO para o tamanho que um cursor CSS aceita, e põe
 * TODAS elas no mesmo enquadramento.
 *
 * 🔴 **Por que é um cortador próprio, e não mais um `*2fx`.** Os outros recortam
 * FOLHAS — grade, fileiras, âncora por quadro. Aqui é um desenho só, e o que
 * importa é outra coisa: o **ponto quente**, o pixel que o sistema operacional
 * considera "onde o mouse está". Errar isso não deixa o cursor feio, deixa o
 * jogo impreciso — o jogador clica num monstro e acerta o tile ao lado.
 *
 * 🔴 **E desde 12/09 são DOIS cursores — padrão e ataque — que TÊM de cair no
 * mesmo lugar.** A ficha do dono é explícita: mesma resolução, mesmo ponto
 * quente, mesmo alinhamento, *"isso evita que o cursor pule de posição ao trocar
 * de estado"*. Se cada arte fosse recortada pela própria caixa, o ponteiro
 * saltaria alguns pixels toda vez que o mouse encostasse num monstro — e num
 * jogo de clicar, ponteiro que pula é erro de mira.
 *
 * 🔴 **O alinhamento é pelo CORPO da seta, não pela caixa da imagem.** A arte de
 * ataque tem aura vermelha em volta: medida, a caixa dela é 678×918 contra
 * 489×671 da azul, mas o CORPO prateado é 597×836 contra 486×666. Alinhar pelas
 * caixas encolheria a seta vermelha para caber a aura; alinhando pelos corpos, a
 * seta é a mesma nas duas e a aura ganha margem no enquadramento comum.
 *
 * ⚠️ **O corpo é medido por "opaco e NÃO vermelho-dominante"**, porque é
 * exatamente isso que separa a seta da aura: a aura é vermelha e translúcida, o
 * metal é claro e opaco. Um limiar de alfa sozinho traria a aura junto.
 *
 * ⚠️ **A escala sai da ALTURA, e as duas artes não são o mesmo desenho.** Medidas
 * as razões, a largura dá 0,814 e a altura 0,797 — são duas gerações diferentes,
 * não um recorte da mesma. Casar a altura deixa a vermelha ~2 % mais larga, o que
 * a 30 px não se vê; casar as duas deformaria uma delas.
 *
 * ✅ **O ponto quente sai MEDIDO da arte de referência**: o pixel de corpo mais
 * alto e, na linha dele, o mais à esquerda — a ponta da flecha. E vale para as
 * duas, porque as duas foram postas no mesmo enquadramento.
 *
 * ⚠️ **A redução é por MÉDIA DE BLOCO PONDERADA PELO ALFA**, como nos cortadores
 * de FX: a arte vem a ~500×670 e a seta tem 36 px. Se a média somasse a cor de
 * pixel transparente, a borda sairia suja de preto.
 *
 * ⚠️ **`--altura` é o tamanho do CORPO, não o do quadro.** O quadro cresce
 * sozinho para caber a aura da variante mais espalhada. Foi o dono quem fixou 36
 * em tela (*"faça o cursor ser um pouco menor"*), e a 32 — o padrão do Windows —
 * a gema e o bisel viram borrão.
 *
 * ## Uso
 *
 *   node tools/cursor2hud.mjs <padrão.png> [variante.png ...] [--altura=36]
 *
 * A PRIMEIRA arte é a referência: é o corpo dela que define a escala de todas.
 * Cada saída herda o nome do arquivo de entrada.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import { decode, encode } from './hud/png.mjs';

const DESTINO = 'client/public/assets/hud';

const args = process.argv.slice(2);
const arquivos = args.filter((a) => !a.startsWith('--'));
const ALTURA = Number(
  (args.find((a) => a.startsWith('--altura=')) ?? '--altura=36').split('=')[1],
) || 36;

if (arquivos.length === 0) {
  console.error('uso: node tools/cursor2hud.mjs <padrão.png> [variante.png ...] [--altura=36]');
  process.exit(1);
}

/** Mede uma arte: caixa do CORPO, caixa com AURA e a ponta. */
function mede(arq) {
  const img = decode(arq);
  const A = img.px;
  const ehCorpo = (o) => A[o + 3] >= 200 && A[o] - Math.max(A[o + 1], A[o + 2]) < 45;
  const temTinta = (o) => A[o + 3] >= 20;
  const caixa = (teste) => {
    let x0 = Infinity; let x1 = -1; let y0 = Infinity; let y1 = -1;
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        if (!teste((y * img.w + x) * 4)) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  const corpo = caixa(ehCorpo);
  const aura = caixa(temTinta);
  let ponta = null;
  for (let y = corpo.y0; y <= corpo.y1 && !ponta; y++) {
    for (let x = corpo.x0; x <= corpo.x1; x++) {
      if (ehCorpo((y * img.w + x) * 4)) { ponta = { x, y }; break; }
    }
  }
  return { img, corpo, aura, ponta, arq, escala: 1 };
}

const artes = arquivos.map(mede);
const ref = artes[0];

/* Cada arte é levada à escala em que o CORPO dela mede o corpo da referência. */
for (const a of artes) a.escala = ref.corpo.h / a.corpo.h;

/*
 * As margens do quadro comum: quanto cada arte precisa ALÉM do corpo, em
 * unidades do corpo de referência. Vale a maior de cada lado — o quadro tem de
 * caber a variante mais espalhada, e a mais contida ganha margem transparente.
 */
const margem = { esq: 0, dir: 0, cima: 0, baixo: 0 };
for (const a of artes) {
  margem.esq = Math.max(margem.esq, (a.corpo.x0 - a.aura.x0) * a.escala);
  margem.dir = Math.max(margem.dir, (a.aura.x1 - a.corpo.x1) * a.escala);
  margem.cima = Math.max(margem.cima, (a.corpo.y0 - a.aura.y0) * a.escala);
  margem.baixo = Math.max(margem.baixo, (a.aura.y1 - a.corpo.y1) * a.escala);
}

/* O quadro comum, ainda em unidades do corpo de referência. */
const QW = margem.esq + ref.corpo.w + margem.dir;
const QH = margem.cima + ref.corpo.h + margem.baixo;
/* E a escala final: `ALTURA` é a altura do CORPO, não a do quadro. */
const K = ALTURA / ref.corpo.h;
const LARG = Math.max(1, Math.round(QW * K));
const ALT = Math.max(1, Math.round(QH * K));

const hotX = Math.round((margem.esq + (ref.ponta.x - ref.corpo.x0)) * K);
const hotY = Math.round((margem.cima + (ref.ponta.y - ref.corpo.y0)) * K);

mkdirSync(DESTINO, { recursive: true });
for (const a of artes) {
  const out = Buffer.alloc(LARG * ALT * 4);
  /*
   * Para cada pixel do destino, de onde ele vem NA FONTE desta arte: desfaz o
   * quadro comum, desfaz a margem, e aplica a escala própria da arte.
   */
  const fonteX = (x) => a.corpo.x0 + ((x / K) - margem.esq) / a.escala;
  const fonteY = (y) => a.corpo.y0 + ((y / K) - margem.cima) / a.escala;
  for (let y = 0; y < ALT; y++) {
    for (let x = 0; x < LARG; x++) {
      const sx0 = Math.floor(fonteX(x));
      const sx1 = Math.max(sx0 + 1, Math.floor(fonteX(x + 1)));
      const sy0 = Math.floor(fonteY(y));
      const sy1 = Math.max(sy0 + 1, Math.floor(fonteY(y + 1)));
      let r = 0; let g = 0; let b = 0; let al = 0; let peso = 0; let total = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          total += 1;
          if (sx < 0 || sy < 0 || sx >= a.img.w || sy >= a.img.h) continue;
          const o = (sy * a.img.w + sx) * 4;
          const p = a.img.px[o + 3] / 255;
          r += a.img.px[o] * p; g += a.img.px[o + 1] * p; b += a.img.px[o + 2] * p;
          al += a.img.px[o + 3]; peso += p;
        }
      }
      const d = (y * LARG + x) * 4;
      out[d] = peso > 0 ? Math.round(r / peso) : 0;
      out[d + 1] = peso > 0 ? Math.round(g / peso) : 0;
      out[d + 2] = peso > 0 ? Math.round(b / peso) : 0;
      out[d + 3] = Math.round(al / Math.max(1, total));
    }
  }
  const nome = basename(a.arq).replace(/\.png$/i, '');
  writeFileSync(join(DESTINO, `${nome}.png`), encode(LARG, ALT, out));
  console.log(`[cursor] ${nome}.png  ${LARG}x${ALT}`
    + `  (corpo ${a.corpo.w}x${a.corpo.h} → escala ${a.escala.toFixed(3)})`);
}
console.log(`[cursor] margens do quadro comum: esq ${margem.esq.toFixed(0)}`
  + ` dir ${margem.dir.toFixed(0)} cima ${margem.cima.toFixed(0)} baixo ${margem.baixo.toFixed(0)}`);
console.log(`[cursor] ponto quente ÚNICO: ${hotX} ${hotY}`
  + `  →  cursor: url(...) ${hotX} ${hotY}, default`);
