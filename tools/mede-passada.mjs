/**
 * Mede EM QUE QUADRO o pé toca o chão, em cada direção de uma folha de andar.
 *
 * 🔴 **Por que isto existe.** O jogo prende o ciclo de passos ao CHÃO: cada tile
 * atravessado consome meio ciclo, para o pé plantar junto com a chegada ao tile.
 * Isso só funciona se o quadro de CONTATO da arte estiver no lugar certo do
 * meio-ciclo — e na folha universal ele não está igual nas oito direções. De
 * lado o contato cai no quadro 7 (a fronteira do tile); de frente, no 4 (o meio
 * do tile). Meia passada de diferença, e é ela que faz andar para baixo parecer
 * salto em vez de passo.
 *
 * ✅ A saída daqui alimenta `CONTATO_NO_QUADRO` em `client/src/main.ts`. Arte
 * nova = rodar isto de novo e atualizar a tabela.
 *
 * ⚠️ A medida é a ABERTURA DAS PERNAS: a largura do quarto de baixo do
 * personagem, quadro a quadro. Ela é máxima no contato (pernas afastadas) e
 * mínima na passagem (pernas juntas). É o único sinal que não depende de saber
 * desenhar.
 *
 * ## Uso
 *
 *   node tools/mede-passada.mjs client/public/assets/classes-universal/male/walk.png 80
 */

import { decode } from './hud/png.mjs';

const [arq, celula] = process.argv.slice(2);
if (!arq) {
  console.error('uso: node tools/mede-passada.mjs <walk.png> [lado-da-celula]');
  process.exit(1);
}
const img = decode(arq);
const CELL = Number(celula) || 80, COLS = img.w/CELL, ROWS = img.h/CELL;
const N = ['down','up','right','left','up_right','up_left','down_right','down_left'];
for (let r = 0; r < ROWS; r++) {
  let chao = 0;
  for (let y=0;y<CELL;y++) for (let x=0;x<img.w;x++){const o=((r*CELL+y)*img.w+x)*4; if(img.px[o+3]>32&&y>chao)chao=y;}
  const larg=[];
  for (let c=0;c<COLS;c++){
    let mn=1e9,mx=-1;
    for(let y=chao-11;y<=chao;y++) for(let x=0;x<CELL;x++){const o=((r*CELL+y)*img.w+c*CELL+x)*4; if(img.px[o+3]>32){if(x<mn)mn=x;if(x>mx)mx=x;}}
    larg.push(mx<0?0:mx-mn+1);
  }
  // CONTATO = maior abertura de pernas dentro da PRIMEIRA metade (8 quadros)
  const meia = larg.slice(0, COLS/2);
  const contato = meia.indexOf(Math.max(...meia));
  const passagem = meia.indexOf(Math.min(...meia));
  const metade = COLS / 2;
  console.log(`${N[r].padEnd(11)} contato=q${contato}  passagem=q${passagem}  `
    + `deslocamento=${(metade - contato) % metade}`);
}
