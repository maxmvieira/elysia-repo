/**
 * Onde está a MÃO em cada quadro do corpo — o que faz a arma seguir o herói.
 *
 * 🔴 **Sem isto a arma em camada não anda.** Ela foi recortada da pose parada, e
 * cai certo só ali; no passo e no golpe a mão se move e a espada ficaria
 * flutuando parada ao lado do sujeito. O ponto de mão é o que liga as duas
 * coisas.
 *
 * 🔴 **A simplificação que faz tudo fechar:** como a arma foi recortada da pose
 * parada, o ponto de empunhadura dela **é**, por construção, a mão daquele
 * quadro. Então não há ponto de empunhadura a adivinhar: o deslocamento da arma
 * num quadro é `mão(quadro) − mão(pose)`, e a pose parada sai exata, com
 * deslocamento zero. Nenhum número afinado à mão.
 *
 * As mãos saem do `estimate-skeleton`, que é o mesmo endpoint que a morte já
 * usa. ⚠️ Ele devolve coordenadas NORMALIZADAS (0..1); aqui viram pixel da
 * célula de 64, que é o que o compositor precisa.
 *
 * ⚠️ **`RIGHT ARM` é a mão da arma e `LEFT ARM` a do escudo, no Knight** — e a
 * escolha é anatômica, não de tela. É a mesma razão pela qual o golpe por
 * esqueleto acertou o braço certo de costas: o rótulo acompanha o sujeito, e o
 * lado da tela não.
 *
 * Uso:  node tools/pixellab/maos.mjs knight
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://api.pixellab.ai/v1';
const TOKEN = process.env.PIXELLAB_TOKEN;
if (!TOKEN) throw new Error('PIXELLAB_TOKEN nao esta no ambiente. Carregue do .env no MESMO comando.');

const CELL = 64;

/** Qual braço segura a arma, e qual segura o escudo. Ver `BRACO_GOLPE`. */
const MAOS = {
  knight: { arma: 'RIGHT ARM', escudo: 'LEFT ARM' },
  sorcerer: { arma: 'LEFT ARM', escudo: 'RIGHT ARM' },
  archer: { arma: 'RIGHT ARM', escudo: 'LEFT ARM' },
  assassin: { arma: 'RIGHT ARM', escudo: 'LEFT ARM' },
};

/**
 * Os quadros que precisam de ponto de mão, e o sufixo de arquivo de cada um.
 *
 * ⚠️ A morte NÃO entra. Um corpo tombando gira em torno dos pés e acaba deitado;
 * a arma teria de girar junto, e girar pixel art de 20 px destrói o desenho. O
 * caminho certo lá é a arma **cair** — soltar do herói e virar item no chão, que
 * é o que Tibia faz — e isso é decisão de jogo, não de arte. Fica de fora até
 * alguém decidir.
 */
const QUADROS = ['', '-passo', '-passo2', '-golpe'];

const DIRS = ['south', 'north', 'east', 'west'];

async function esqueleto(caminho) {
  const buf = readFileSync(caminho);
  const r = await fetch(`${API}/estimate-skeleton`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ image: { type: 'base64', base64: buf.toString('base64') } }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`estimate-skeleton ${r.status}: ${txt.slice(0, 200)}`);
  return JSON.parse(txt).keypoints;
}

const cls = process.argv[2] || 'knight';
const dir = join('arte-fonte', 'pixellab', '_desarmado', cls);
const rotulos = MAOS[cls];
if (!rotulos) throw new Error(`Classe desconhecida: ${cls}`);

const saida = {};
for (const d of DIRS) {
  saida[d] = {};
  for (const q of QUADROS) {
    const caminho = join(dir, `${d}${q}.png`);
    if (!existsSync(caminho)) { console.log(`  ${d}${q || ' (pose)'} — sem arquivo, pulando`); continue; }
    const kp = await esqueleto(caminho);
    const pega = (label) => {
      const k = kp.find((p) => p.label === label);
      // arredonda para pixel: a celula e de 64 e nao existe meia coluna
      return k ? [Math.round(k.x * CELL), Math.round(k.y * CELL)] : null;
    };
    saida[d][q || 'pose'] = { arma: pega(rotulos.arma), escudo: pega(rotulos.escudo) };
    const m = saida[d][q || 'pose'];
    console.log(`  ${d.padEnd(6)} ${(q || 'pose').padEnd(7)} arma ${JSON.stringify(m.arma)}  escudo ${JSON.stringify(m.escudo)}`);
  }
}

const arquivo = join(dir, 'maos.json');
writeFileSync(arquivo, `${JSON.stringify(saida, null, 2)}\n`);
console.log(`\n  ${arquivo}`);
