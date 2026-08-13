/**
 * Texturas de PIXEL geradas em código — nenhuma é asset de terceiro.
 *
 * 🔴 POR QUE GERAR E NÃO BAIXAR: o repositório é público (verificado em 11/08),
 * e os packs que já estão nele têm restrição escrita — "não revender", "não
 * redistribuir". Textura desenhada aqui não tem dono, não tem crédito a
 * carregar e não vence licença nenhuma.
 *
 * ⚠️ E O `Walls.png` DO REPO NÃO SERVE PARA ISTO, o que não era óbvio: as peças
 * dele estão em projeção OBLÍQUA — cada muro já vem com o lado e o topo
 * pintados. Isso é arte 2.5D para jogo 2D; colada numa caixa 3D, ela briga com
 * a perspectiva real da cena. Do que existe no repositório, só os retalhos
 * sólidos do `Ground.png` funcionam como textura 3D.
 *
 * Todas saem em potência de dois, com filtro `nearest` e sem mipmap: pixel art
 * escalada com filtro suave vira mingau, e mipmap a apaga ao longe.
 */

import * as THREE from 'three';

const LADO = 64;

/** PRNG com semente: a textura tem que ser a MESMA a cada carga. */
function sorteador(semente: number): () => number {
  let v = semente >>> 0;
  return () => {
    v = (v + 0x6d2b79f5) >>> 0;
    let t = Math.imul(v ^ (v >>> 15), 1 | v);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tela(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = LADO;
  c.height = LADO;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('sem contexto 2D');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

export function textura(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Espalha pixels soltos de uma cor — é o que tira a chapa lisa. */
function granula(
  ctx: CanvasRenderingContext2D,
  rnd: () => number,
  cores: string[],
  quantos: number,
): void {
  for (let i = 0; i < quantos; i++) {
    ctx.fillStyle = cores[Math.floor(rnd() * cores.length)] ?? '#000';
    ctx.fillRect(Math.floor(rnd() * LADO), Math.floor(rnd() * LADO), 1, 1);
  }
}

/** Pedra: blocos irregulares com junta escura e desgaste. */
function fazPedra(): HTMLCanvasElement {
  const [c, ctx] = tela();
  const rnd = sorteador(11);
  ctx.fillStyle = '#3c4247';
  ctx.fillRect(0, 0, LADO, LADO);
  const alturaFiada = 16;
  for (let y = 0; y < LADO; y += alturaFiada) {
    // 🔴 Fiada alternada: sem o deslocamento a parede vira grade de xadrez, e
    // o olho lê "textura repetida" na hora.
    const desloc = (y / alturaFiada) % 2 === 0 ? 0 : 11;
    for (let x = -16; x < LADO; x += 21) {
      const px = x + desloc;
      const l = 20;
      const tom = 0.62 + rnd() * 0.38;
      const v = Math.floor(88 * tom);
      ctx.fillStyle = `rgb(${v + 12},${v + 10},${v + 6})`;
      ctx.fillRect(px + 1, y + 1, l - 2, alturaFiada - 2);
      // luz na aresta de cima, sombra embaixo
      ctx.fillStyle = `rgba(255,255,255,0.10)`;
      ctx.fillRect(px + 1, y + 1, l - 2, 1);
      ctx.fillStyle = `rgba(0,0,0,0.28)`;
      ctx.fillRect(px + 1, y + alturaFiada - 2, l - 2, 1);
    }
  }
  granula(ctx, rnd, ['#2e3336', '#5a6167', '#4a5055'], 260);
  return c;
}

/** Reboco: base clara e suja, com manchas e trincas. */
function fazReboco(): HTMLCanvasElement {
  const [c, ctx] = tela();
  const rnd = sorteador(23);
  ctx.fillStyle = '#a99a7e';
  ctx.fillRect(0, 0, LADO, LADO);
  for (let i = 0; i < 90; i++) {
    const v = 150 + Math.floor(rnd() * 40);
    ctx.fillStyle = `rgba(${v},${v - 12},${v - 34},0.30)`;
    ctx.fillRect(Math.floor(rnd() * LADO), Math.floor(rnd() * LADO), 2 + Math.floor(rnd() * 7), 2 + Math.floor(rnd() * 5));
  }
  // trincas: linhas escuras curtas e tortas
  for (let i = 0; i < 5; i++) {
    let x = Math.floor(rnd() * LADO);
    let y = Math.floor(rnd() * LADO);
    ctx.fillStyle = 'rgba(60,50,38,0.55)';
    for (let p = 0; p < 12 + rnd() * 14; p++) {
      ctx.fillRect(x, y, 1, 1);
      x += Math.floor(rnd() * 3) - 1;
      y += rnd() > 0.35 ? 1 : 0;
    }
  }
  granula(ctx, rnd, ['#8d7f66', '#bfb094', '#7a6d57'], 420);
  return c;
}

/** Madeira: tábuas verticais com veio. */
function fazMadeira(): HTMLCanvasElement {
  const [c, ctx] = tela();
  const rnd = sorteador(37);
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(0, 0, LADO, LADO);
  const larguraTabua = 16;
  for (let x = 0; x < LADO; x += larguraTabua) {
    const tom = 0.72 + rnd() * 0.34;
    const r = Math.floor(96 * tom);
    ctx.fillStyle = `rgb(${r},${Math.floor(r * 0.68)},${Math.floor(r * 0.44)})`;
    ctx.fillRect(x + 1, 0, larguraTabua - 2, LADO);
    // veio
    for (let i = 0; i < 5; i++) {
      const vx = x + 2 + Math.floor(rnd() * (larguraTabua - 4));
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(vx, Math.floor(rnd() * LADO), 1, 8 + Math.floor(rnd() * 22));
    }
    // sombra da junta
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, 0, 1, LADO);
  }
  granula(ctx, rnd, ['#5c4127', '#33241a'], 200);
  return c;
}

/** Telha: escamas sobrepostas, fiada por fiada. */
function fazTelha(): HTMLCanvasElement {
  const [c, ctx] = tela();
  const rnd = sorteador(53);
  ctx.fillStyle = '#43201a';
  ctx.fillRect(0, 0, LADO, LADO);
  const alt = 11;
  for (let y = 0; y < LADO + alt; y += alt) {
    const desloc = ((y / alt) % 2 === 0 ? 0 : 8);
    for (let x = -16; x < LADO; x += 16) {
      const px = x + desloc;
      const tom = 0.7 + rnd() * 0.36;
      ctx.fillStyle = `rgb(${Math.floor(150 * tom)},${Math.floor(72 * tom)},${Math.floor(54 * tom)})`;
      ctx.fillRect(px, y, 15, alt - 1);
      ctx.fillStyle = 'rgba(255,220,190,0.10)';
      ctx.fillRect(px, y, 15, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(px, y + alt - 2, 15, 2);
    }
  }
  granula(ctx, rnd, ['#2f1712', '#7a3a2c'], 220);
  return c;
}

/**
 * Grama.
 *
 * 🔴 ELA JÁ FOI ESCURA, E ISSO FOI UM ERRO CARO — vale a lição.
 *
 * Eu pintei a textura escura "porque a cena é noturna", escureci a luz pelo
 * mesmo motivo e ainda liguei tone mapping que comprime sombra. Os três se
 * MULTIPLICAM, e o resultado foi uma tela preta com uma fogueira no meio.
 *
 * ⚠️ A regra: **a textura guarda a cor do material, não a hora do dia.** Quem
 * escurece é a luz — só ela sabe se é dia ou noite, e só ela pode ser desfeita
 * sem repintar nada.
 */
function fazGrama(): HTMLCanvasElement {
  const [c, ctx] = tela();
  const rnd = sorteador(71);
  ctx.fillStyle = '#4e6b3c';
  ctx.fillRect(0, 0, LADO, LADO);
  for (let i = 0; i < 700; i++) {
    const v = rnd();
    const g = 96 + Math.floor(v * 62);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.62)},${g},${Math.floor(g * 0.46)})`;
    const x = Math.floor(rnd() * LADO);
    const y = Math.floor(rnd() * LADO);
    ctx.fillRect(x, y, 1, 1 + Math.floor(rnd() * 2));
  }
  granula(ctx, rnd, ['#3c5230', '#63834b'], 220);
  return c;
}

/** Terra batida do caminho: marrom com pedrinhas. */
function fazTerra(): HTMLCanvasElement {
  const [c, ctx] = tela();
  const rnd = sorteador(97);
  ctx.fillStyle = '#4a3a28';
  ctx.fillRect(0, 0, LADO, LADO);
  for (let i = 0; i < 520; i++) {
    const v = 62 + Math.floor(rnd() * 52);
    ctx.fillStyle = `rgb(${v + 20},${Math.floor(v * 0.82)},${Math.floor(v * 0.56)})`;
    ctx.fillRect(Math.floor(rnd() * LADO), Math.floor(rnd() * LADO), 1 + Math.floor(rnd() * 2), 1);
  }
  // pedrinhas
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = 'rgba(150,146,136,0.75)';
    ctx.fillRect(Math.floor(rnd() * LADO), Math.floor(rnd() * LADO), 2, 2);
  }
  return c;
}

export const texPedra = textura(fazPedra());
export const texReboco = textura(fazReboco());
export const texMadeira = textura(fazMadeira());
export const texTelha = textura(fazTelha());
export const texGrama = textura(fazGrama());
export const texTerra = textura(fazTerra());
