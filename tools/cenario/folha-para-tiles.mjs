/**
 * Reduz uma folha de texturas para uma TIRA de tiles de 32 px.
 *
 * Uso:  node tools/cenario/folha-para-tiles.mjs <folha.png> <saida.png> <colunas> <linhas>
 *
 * 🔴 A redução é por MÉDIA de bloco, não por amostragem. De 512 px para 32 é um
 * corte de 16×: pegar um pixel a cada 16 devolveria o veio da tábua serrilhado e
 * a argamassa piscando. A média é o que faz a textura continuar lendo como
 * material depois de encolher.
 *
 * ⚠️ Pedir 32×32 direto ao gerador não funciona — ele desenha um objetinho no
 * meio de um quadro vazio em vez de uma textura. Daí gerar grande e reduzir.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
const CRC=(()=>{const t=new Int32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
const crc32=(b)=>{let c=0xffffffff;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const b=Buffer.concat([Buffer.from(ty,'ascii'),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(b));return Buffer.concat([l,b,c]);};
function decode(path){const buf=readFileSync(path);let off=8,w=0,h=0,tp=6;const idat=[];while(off<buf.length){const len=buf.readUInt32BE(off);const t=buf.toString('ascii',off+4,off+8);const d=buf.subarray(off+8,off+8+len);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);tp=d[9];}else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;off+=12+len;}
const bpp=tp===6?4:3;const raw=inflateSync(Buffer.concat(idat));const st=w*bpp;const L=Buffer.alloc(h*st);let q=0;
for(let y=0;y<h;y++){const f=raw[q++];const line=raw.subarray(q,q+st);q+=st;const cur=L.subarray(y*st,(y+1)*st);const prev=y>0?L.subarray((y-1)*st,y*st):null;
for(let x=0;x<st;x++){const a=x>=bpp?cur[x-bpp]:0,b=prev?prev[x]:0;const c=x>=bpp&&prev?prev[x-bpp]:0;let v=line[x];if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}cur[x]=v&0xff;}}
const px=Buffer.alloc(w*h*4);for(let p=0;p<w*h;p++){px[p*4]=L[p*bpp];px[p*4+1]=L[p*bpp+1];px[p*4+2]=L[p*bpp+2];px[p*4+3]=bpp===4?L[p*bpp+3]:255;}return{w,h,px};}
function encode(w,h,px){const s=w*4;const raw=Buffer.alloc(h*(s+1));for(let y=0;y<h;y++){raw[y*(s+1)]=0;px.copy(raw,y*(s+1)+1,y*s,(y+1)*s);}const i=Buffer.alloc(13);i.writeUInt32BE(w,0);i.writeUInt32BE(h,4);i[8]=8;i[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',i),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

const [ent, sai, colsTxt, linsTxt] = process.argv.slice(2);
const COLS = Number(colsTxt), LINS = Number(linsTxt), T = 32;
const { w, h, px } = decode(ent);
const qw = w / COLS, qh = h / LINS;
const n = COLS * LINS;
const out = Buffer.alloc(n * T * T * 4);

let k = 0;
for (let ly = 0; ly < LINS; ly++) for (let lx = 0; lx < COLS; lx++, k++) {
  for (let ty = 0; ty < T; ty++) for (let tx = 0; tx < T; tx++) {
    // MÉDIA do bloco inteiro que vira este pixel — ver o cabeçalho.
    const x0 = Math.round(lx*qw + tx*qw/T), x1 = Math.round(lx*qw + (tx+1)*qw/T);
    const y0 = Math.round(ly*qh + ty*qh/T), y1 = Math.round(ly*qh + (ty+1)*qh/T);
    let r=0,g=0,b=0,a=0,c=0;
    for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++){
      const i=(y*w+x)*4; r+=px[i];g+=px[i+1];b+=px[i+2];a+=px[i+3];c++;
    }
    const i=((ty)*(n*T) + (k*T+tx))*4;
    out[i]=Math.round(r/c); out[i+1]=Math.round(g/c); out[i+2]=Math.round(b/c); out[i+3]=Math.round(a/c);
  }
}
writeFileSync(sai, encode(n*T, T, out));
console.log(`${n} tiles de ${T}px -> ${sai}  (tira ${n*T}x${T})`);
console.log('índices na tira, da esquerda para a direita:', [...Array(n).keys()].join(' '));
