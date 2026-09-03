/**
 * Ícones das magias, desenhados por código num canvas (mesma abordagem dos
 * ícones de item/criatura). Sem assets externos: cada ícone é um data-URL
 * gerado uma vez e guardado em cache.
 */

import { SKILLS, type SkillId } from '@dominion/shared';

/** Resolução do ícone. A barra exibe menor, então fica nítido em telas HiDPI. */
const S = 48;

/**
 * Uma espada apontando para CIMA, com o punho na origem (0,0) e a ponta em
 * (0, -len). Quem chama posiciona/gira com translate+rotate.
 */
function sword(g: CanvasRenderingContext2D, len: number, blade: string, hilt: string): void {
  const w = Math.max(1.6, len * 0.13); // meia-largura da lâmina
  const guard = len * 0.3;

  // Lâmina: um losango alongado com a ponta chanfrada.
  g.beginPath();
  g.moveTo(0, -len);
  g.lineTo(w, -len + len * 0.18);
  g.lineTo(w, -len * 0.3);
  g.lineTo(-w, -len * 0.3);
  g.lineTo(-w, -len + len * 0.18);
  g.closePath();
  g.fillStyle = blade;
  g.fill();
  g.lineWidth = Math.max(0.8, len * 0.05);
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.stroke();

  // Sulco central (brilho) — dá o aspecto metálico.
  g.beginPath();
  g.moveTo(-w * 0.35, -len + len * 0.2);
  g.lineTo(w * 0.1, -len + len * 0.2);
  g.lineTo(w * 0.1, -len * 0.32);
  g.lineTo(-w * 0.35, -len * 0.32);
  g.closePath();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.fill();

  // Guarda + cabo + pomo.
  g.fillStyle = hilt;
  g.fillRect(-guard / 2, -len * 0.32, guard, Math.max(1.6, len * 0.09));
  g.fillRect(-w * 0.7, -len * 0.24, w * 1.4, len * 0.22);
  g.beginPath();
  g.arc(0, -len * 0.02, Math.max(1.4, len * 0.09), 0, Math.PI * 2);
  g.fill();
}

/** Moldura comum: fundo em gradiente, borda escura e brilho no topo. */
function frame(g: CanvasRenderingContext2D, inner: string, outer: string): void {
  const grad = g.createRadialGradient(S * 0.4, S * 0.32, 2, S / 2, S / 2, S * 0.72);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,255,255,0.13)';
  g.fillRect(0, 0, S, S * 0.14);
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.strokeRect(1, 1, S - 2, S - 2);
}

/** Golpe Poderoso: espada AMARELA sobre fundo VERMELHO, cortando na diagonal. */
function drawPowerStrike(g: CanvasRenderingContext2D): void {
  frame(g, '#d4453a', '#5e100c');

  // Rastro de velocidade atrás da lâmina (a investida vem de baixo-esquerda).
  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(Math.PI / 4);
  g.fillStyle = 'rgba(255, 226, 138, 0.28)';
  for (const [off, w] of [[-9, 3], [-3, 4.5], [4, 2.5]] as const) {
    g.fillRect(off, -1, w, S * 0.62);
  }
  g.restore();

  // A espada: inclinada 45°, apontando para o canto superior direito.
  g.save();
  g.translate(S * 0.34, S * 0.78);
  g.rotate(Math.PI / 4);
  sword(g, S * 0.72, '#ffd24a', '#8a5a1e');
  g.restore();

  // Faísca no impacto da ponta.
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc(S * 0.76, S * 0.24, 2.6, 0, Math.PI * 2);
  g.fill();
}

/** Bash: VÁRIAS espadinhas em círculo — o impacto que pega todos ao redor. */
function drawBash(g: CanvasRenderingContext2D): void {
  frame(g, '#5a6474', '#171b22');

  // Vórtice: dois anéis que sugerem o giro.
  g.strokeStyle = 'rgba(190, 214, 255, 0.32)';
  g.lineWidth = 2;
  for (const r of [S * 0.36, S * 0.24]) {
    g.beginPath();
    g.arc(S / 2, S / 2, r, 0.15 * Math.PI, 1.5 * Math.PI);
    g.stroke();
  }

  // Seis lâminas apontando para FORA, uma por direção — é o "pega todo mundo
  // em volta" desenhado literalmente.
  const n = 6;
  for (let i = 0; i < n; i++) {
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate((i / n) * Math.PI * 2 + 0.26);
    g.translate(0, -S * 0.1);
    sword(g, S * 0.36, i % 2 === 0 ? '#ffd24a' : '#dfe7f2', '#7a4f1c');
    g.restore();
  }

  // Núcleo brilhante no centro do giro.
  const core = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.13);
  core.addColorStop(0, 'rgba(255,246,214,0.95)');
  core.addColorStop(1, 'rgba(255,210,74,0)');
  g.fillStyle = core;
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.13, 0, Math.PI * 2);
  g.fill();
}

/** Investida: bota avançando com linhas de velocidade. */
function drawCharge(g: CanvasRenderingContext2D): void {
  frame(g, '#c06a2a', '#4a1d08');
  g.fillStyle = 'rgba(255, 226, 138, 0.35)';
  for (const [y, w] of [[16, 20], [24, 26], [32, 16]] as const) {
    g.fillRect(4, y, w, 3);
  }
  // Silhueta correndo para a direita: uma cunha inclinada.
  g.save();
  g.translate(S * 0.58, S / 2);
  g.rotate(0.5);
  sword(g, S * 0.62, '#ffe6a8', '#7a4f1c');
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath();
  g.moveTo(S - 10, S / 2 - 8);
  g.lineTo(S - 4, S / 2);
  g.lineTo(S - 10, S / 2 + 8);
  g.closePath();
  g.fill();
}

/** Ruptura: armadura rachada — a defesa aberta. */
function drawRupture(g: CanvasRenderingContext2D): void {
  frame(g, '#a03050', '#3a0a18');
  // Placa de armadura.
  g.fillStyle = '#b9c4d2';
  g.strokeStyle = '#2a3038';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(S / 2 - 13, 12);
  g.lineTo(S / 2 + 13, 12);
  g.lineTo(S / 2 + 10, S - 10);
  g.lineTo(S / 2 - 10, S - 10);
  g.closePath();
  g.fill();
  g.stroke();
  // A rachadura em ziguezague, vermelha por dentro.
  g.strokeStyle = '#ff3b30';
  g.lineWidth = 3.4;
  g.beginPath();
  g.moveTo(S / 2 - 7, 12);
  g.lineTo(S / 2 + 2, S / 2 - 5);
  g.lineTo(S / 2 - 5, S / 2 + 3);
  g.lineTo(S / 2 + 5, S - 10);
  g.stroke();
}

/** Execução: caveira sob a lâmina — o finalizador. */
function drawExecution(g: CanvasRenderingContext2D): void {
  frame(g, '#6a2a3a', '#180608');
  // Caveira simples.
  g.fillStyle = '#e8e2d4';
  g.beginPath();
  g.arc(S / 2, S * 0.56, 11, Math.PI, 0);
  g.rect(S / 2 - 11, S * 0.56, 22, 9);
  g.fill();
  g.fillStyle = '#180608';
  g.beginPath();
  g.arc(S / 2 - 4.5, S * 0.54, 3.2, 0, Math.PI * 2);
  g.arc(S / 2 + 4.5, S * 0.54, 3.2, 0, Math.PI * 2);
  g.fill();
  g.fillRect(S / 2 - 1.5, S * 0.62, 3, 5);
  // Lâmina descendo por cima.
  g.save();
  g.translate(S * 0.5, S * 0.34);
  g.rotate(Math.PI);
  sword(g, S * 0.42, '#ffd24a', '#8a5a1e');
  g.restore();
}

/** Provocar: grito — bocarra e ondas sonoras. */
function drawTaunt(g: CanvasRenderingContext2D): void {
  frame(g, '#c8a23a', '#4a3208');
  // Ondas de som saindo da esquerda para a direita.
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 2.6;
  for (const r of [10, 16, 22]) {
    g.beginPath();
    g.arc(S * 0.34, S / 2, r, -0.7, 0.7);
    g.stroke();
  }
  // Cabeça gritando (perfil).
  g.fillStyle = '#2a1c06';
  g.beginPath();
  g.arc(S * 0.3, S / 2, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffdf9a';
  g.beginPath();
  g.ellipse(S * 0.33, S / 2 + 1, 4, 5.5, 0, 0, Math.PI * 2);
  g.fill();
}

/** Postura Defensiva: escudo firme. */
function drawStance(g: CanvasRenderingContext2D): void {
  frame(g, '#4a6a8a', '#0e1a26');
  const cx = S / 2;
  g.fillStyle = '#9fb6cc';
  g.strokeStyle = '#1a2530';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(cx, 8);
  g.lineTo(S - 12, 13);
  g.lineTo(S - 13, S * 0.58);
  g.quadraticCurveTo(cx + 5, S - 7, cx, S - 6);
  g.quadraticCurveTo(cx - 5, S - 7, 13, S * 0.58);
  g.lineTo(12, 13);
  g.closePath();
  g.fill();
  g.stroke();
  // Cruz de reforço.
  g.strokeStyle = '#3f556a';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx, 12);
  g.lineTo(cx, S - 10);
  g.moveTo(14, S * 0.42);
  g.lineTo(S - 14, S * 0.42);
  g.stroke();
}

/** Fúria de Batalha: chamas subindo — poder com preço. */
function drawFury(g: CanvasRenderingContext2D): void {
  frame(g, '#e04a1a', '#3a0600');
  // Três línguas de fogo.
  const chama = (x: number, alt: number, cor: string): void => {
    g.fillStyle = cor;
    g.beginPath();
    g.moveTo(x, S - 8);
    g.quadraticCurveTo(x - 7, S - 8 - alt * 0.55, x, S - 8 - alt);
    g.quadraticCurveTo(x + 7, S - 8 - alt * 0.55, x, S - 8);
    g.closePath();
    g.fill();
  };
  chama(S / 2 - 11, 22, '#ff8a2a');
  chama(S / 2 + 11, 22, '#ff8a2a');
  chama(S / 2, 32, '#ffc74a');
  chama(S / 2, 18, '#fff3c8');
  // Gota de sangue: a Fúria custa vida.
  g.fillStyle = '#c0202a';
  g.beginPath();
  g.arc(S / 2, 12, 4.2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(S / 2 - 3.4, 10);
  g.lineTo(S / 2, 3);
  g.lineTo(S / 2 + 3.4, 10);
  g.closePath();
  g.fill();
}

// ---------------------------------------------------------------------------
// 🌿🔮 Os 41 ícones do Druida e do Feiticeiro
//
// ⚠️ **Estes NÃO são desenhados um a um, e é decisão, não preguiça.** As oito do
// Knight acima têm ~30 linhas cada porque são oito; repetir isso 41 vezes daria
// 1.200 linhas de canvas para um resultado pior — quarenta e um desenhos à mão
// ficam inconsistentes entre si, e o que o jogador precisa da barra é
// RECONHECER o slot em 200 ms, não admirar a ilustração.
//
// O que ele usa para reconhecer são duas coisas: a COR (que diz o ramo) e a
// SILHUETA (que diz a função). Então é isso que o construtor abaixo controla,
// e a arte definitiva pode substituí-lo sem tocar em mais nada.
// ---------------------------------------------------------------------------

/** Paleta de cada ramo: [interno, externo, símbolo, brilho]. */
type Paleta = [string, string, string, string];

const PALETAS: Record<string, Paleta> = {
  cura: ['#3fbf6a', '#0a2e18', '#d8ffe6', '#9fffc4'],
  buff: ['#4a9be0', '#08203a', '#dbeeff', '#a8d8ff'],
  debuff: ['#7a3fa0', '#1d0a2c', '#eddaff', '#c9a4ff'],
  natureza: ['#5aa02a', '#132a08', '#e6ffcf', '#b6f08a'],
  fogo: ['#e0561a', '#3a0c00', '#ffe0c0', '#ffb066'],
  gelo: ['#3aa8d8', '#04222f', '#dcf6ff', '#9fe4ff'],
  raio: ['#d8c02a', '#2f2600', '#fffbe0', '#ffe96a'],
  arcano: ['#8a5ad8', '#180a30', '#efe6ff', '#c4a8ff'],
  // 🗡️ Assassino. Aço frio nas lâminas, um vermelho seco no duelo de espada
  // curta, e verde-veneno no arremesso — que é o ramo da kunai envenenada.
  laminas: ['#5f6a78', '#101418', '#e8eef5', '#b8c6d6'],
  espada: ['#8a3a3a', '#240c0c', '#ffd8d8', '#ff9f9f'],
  arremesso: ['#4a7a52', '#0e1c11', '#dcf5e0', '#a0e0ac'],
  // 🏹 Arqueiro. Verde-mata nas maestrias, âmbar na mira (o olho que enxerga
  // longe), e um marrom de terra batida nas armadilhas — que ficam no chão.
  maestria: ['#3f6a3a', '#0c1a0b', '#dff0da', '#a8d8a0'],
  disparo: ['#6a8a3a', '#161f0a', '#eef7d8', '#c8e08a'],
  mira: ['#c08a2a', '#3a2606', '#fff0d0', '#ffd48a'],
  armadilha: ['#7a5a3a', '#1e1409', '#f0e0cc', '#d8b88a'],
};

/** As silhuetas. Cada uma diz uma FUNÇÃO, não uma magia específica. */
type Glifo =
  | 'cruz' | 'gota' | 'folha' | 'escudo' | 'seta' | 'caveira' | 'corrente'
  | 'espinho' | 'raio' | 'floco' | 'chama' | 'muralha' | 'estrela'
  | 'circulo' | 'olho' | 'nuvem';

/** Desenha o glifo centrado, na cor do símbolo. */
function glifo(g: CanvasRenderingContext2D, tipo: Glifo, cor: string, brilho: string): void {
  const cx = S / 2;
  const cy = S / 2;
  g.fillStyle = cor;
  g.strokeStyle = cor;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  switch (tipo) {
    case 'cruz': // cura direta
      g.fillRect(cx - 4, cy - 14, 8, 28);
      g.fillRect(cx - 14, cy - 4, 28, 8);
      break;
    case 'gota': // cura ao longo do tempo
      g.beginPath();
      g.moveTo(cx, cy - 15);
      g.bezierCurveTo(cx + 12, cy - 2, cx + 9, cy + 13, cx, cy + 13);
      g.bezierCurveTo(cx - 9, cy + 13, cx - 12, cy - 2, cx, cy - 15);
      g.closePath();
      g.fill();
      break;
    case 'folha':
      g.beginPath();
      g.moveTo(cx - 12, cy + 12);
      g.quadraticCurveTo(cx - 12, cy - 14, cx + 12, cy - 12);
      g.quadraticCurveTo(cx + 12, cy + 12, cx - 12, cy + 12);
      g.closePath();
      g.fill();
      g.strokeStyle = brilho;
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(cx - 10, cy + 10);
      g.lineTo(cx + 9, cy - 9);
      g.stroke();
      break;
    case 'escudo':
      g.beginPath();
      g.moveTo(cx, cy - 15);
      g.lineTo(cx + 12, cy - 9);
      g.lineTo(cx + 12, cy + 3);
      g.quadraticCurveTo(cx + 12, cy + 12, cx, cy + 16);
      g.quadraticCurveTo(cx - 12, cy + 12, cx - 12, cy + 3);
      g.lineTo(cx - 12, cy - 9);
      g.closePath();
      g.fill();
      break;
    case 'seta': // buff ofensivo: para cima
      g.beginPath();
      g.moveTo(cx, cy - 15);
      g.lineTo(cx + 11, cy - 1);
      g.lineTo(cx + 4.5, cy - 1);
      g.lineTo(cx + 4.5, cy + 15);
      g.lineTo(cx - 4.5, cy + 15);
      g.lineTo(cx - 4.5, cy - 1);
      g.lineTo(cx - 11, cy - 1);
      g.closePath();
      g.fill();
      break;
    case 'caveira': // debuff
      g.beginPath();
      g.arc(cx, cy - 3, 11, Math.PI, 0);
      g.lineTo(cx + 11, cy + 4);
      g.lineTo(cx - 11, cy + 4);
      g.closePath();
      g.fill();
      g.fillRect(cx - 8, cy + 5, 16, 7);
      g.fillStyle = brilho;
      g.beginPath();
      g.arc(cx - 4.5, cy - 3, 2.6, 0, Math.PI * 2);
      g.arc(cx + 4.5, cy - 3, 2.6, 0, Math.PI * 2);
      g.fill();
      break;
    case 'corrente': // lentidão / aprisionamento
      g.lineWidth = 3.4;
      for (const dx of [-7, 7]) {
        g.beginPath();
        g.ellipse(cx + dx, cy, 5, 9, 0, 0, Math.PI * 2);
        g.stroke();
      }
      break;
    case 'espinho':
      g.beginPath();
      g.moveTo(cx, cy - 16);
      g.lineTo(cx + 7, cy + 14);
      g.lineTo(cx, cy + 9);
      g.lineTo(cx - 7, cy + 14);
      g.closePath();
      g.fill();
      break;
    case 'raio':
      g.beginPath();
      g.moveTo(cx + 4, cy - 16);
      g.lineTo(cx - 10, cy + 2);
      g.lineTo(cx - 1, cy + 2);
      g.lineTo(cx - 5, cy + 16);
      g.lineTo(cx + 10, cy - 3);
      g.lineTo(cx + 1, cy - 3);
      g.closePath();
      g.fill();
      break;
    case 'floco':
      g.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15);
        g.stroke();
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(ang) * 9, cy + Math.sin(ang) * 9);
        g.lineTo(cx + Math.cos(ang + 0.6) * 13, cy + Math.sin(ang + 0.6) * 13);
        g.moveTo(cx + Math.cos(ang) * 9, cy + Math.sin(ang) * 9);
        g.lineTo(cx + Math.cos(ang - 0.6) * 13, cy + Math.sin(ang - 0.6) * 13);
        g.stroke();
        g.lineWidth = 3;
      }
      break;
    case 'chama':
      g.beginPath();
      g.moveTo(cx, cy + 15);
      g.quadraticCurveTo(cx - 13, cy + 2, cx - 4, cy - 16);
      g.quadraticCurveTo(cx - 1, cy - 6, cx + 4, cy - 12);
      g.quadraticCurveTo(cx + 13, cy + 1, cx, cy + 15);
      g.closePath();
      g.fill();
      g.fillStyle = brilho;
      g.beginPath();
      g.moveTo(cx, cy + 13);
      g.quadraticCurveTo(cx - 5, cy + 3, cx, cy - 6);
      g.quadraticCurveTo(cx + 5, cy + 3, cx, cy + 13);
      g.closePath();
      g.fill();
      break;
    case 'muralha':
      for (let linha = 0; linha < 3; linha++) {
        const y = cy - 12 + linha * 9;
        const off = linha % 2 === 0 ? 0 : 6;
        for (let bx = -14 + off; bx < 14; bx += 12) {
          g.fillRect(cx + bx, y, 10, 7);
        }
      }
      break;
    case 'estrela':
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 - Math.PI / 2;
        const r = i % 2 === 0 ? 16 : 6;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
      break;
    case 'circulo':
      g.lineWidth = 3.4;
      g.beginPath();
      g.arc(cx, cy, 14, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(cx, cy, 7, 0, Math.PI * 2);
      g.stroke();
      break;
    case 'olho':
      g.beginPath();
      g.moveTo(cx - 16, cy);
      g.quadraticCurveTo(cx, cy - 13, cx + 16, cy);
      g.quadraticCurveTo(cx, cy + 13, cx - 16, cy);
      g.closePath();
      g.fill();
      g.fillStyle = brilho;
      g.beginPath();
      g.arc(cx, cy, 5, 0, Math.PI * 2);
      g.fill();
      break;
    case 'nuvem': // área persistente (esporos, nevasca, praga)
      g.beginPath();
      g.arc(cx - 8, cy + 1, 8, 0, Math.PI * 2);
      g.arc(cx + 8, cy + 1, 8, 0, Math.PI * 2);
      g.arc(cx, cy - 6, 10, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = brilho;
      for (const [dx, dy] of [[-9, 12], [0, 14], [9, 12]] as const) {
        g.beginPath();
        g.arc(cx + dx, cy + dy, 2.4, 0, Math.PI * 2);
        g.fill();
      }
      break;
  }
}

/**
 * Ficha visual das 41: ramo (define a cor) e glifo (define a silhueta).
 *
 * Duas magias do mesmo ramo podem repetir o glifo quando fazem a mesma coisa —
 * as quatro bênçãos individuais, por exemplo, são o mesmo gesto com alvos
 * diferentes. O que nunca repete é o PAR dentro de um ramo.
 */
const GLIFOS: Record<string, Glifo> = {
  // 🌿 Druida — cura
  heal: 'cruz',
  regeneration: 'gota',
  area_heal: 'estrela',
  sanctuary: 'circulo',
  emergency_heal: 'chama',
  // 🌿 Druida — buff
  blessing_agility: 'seta',
  oak_skin: 'escudo',
  spirit_blessing: 'estrela',
  nature_strength: 'espinho',
  nature_blessing: 'folha',
  natural_harmony: 'circulo',
  // 🌿 Druida — debuff
  weaken: 'caveira',
  vulnerability: 'escudo',
  curse_slowness: 'corrente',
  curse_weakness: 'gota',
  silence: 'olho',
  nature_plague: 'nuvem',
  // 🌿 Druida — natureza
  earth_spike: 'espinho',
  binding_roots: 'corrente',
  wind_blades: 'seta',
  poison_spores: 'nuvem',
  nature_wrath: 'folha',
  nature_affinity: 'circulo',
  // 🔮 Feiticeiro — fogo
  fire_bolt: 'chama',
  fire_wall: 'muralha',
  meteor: 'espinho',
  meteor_storm: 'nuvem',
  // 🔮 Feiticeiro — gelo
  cold_bolt: 'espinho',
  ice_wall: 'muralha',
  glacial_burst: 'estrela',
  blizzard: 'floco',
  // 🔮 Feiticeiro — raio
  lightning_ball: 'circulo',
  electric_discharge: 'estrela',
  thor_wrath: 'raio',
  // 🔮 Feiticeiro — arcano
  magic_enhance: 'seta',
  magic_amplify: 'estrela',
  cast_mastery: 'raio',
  mana_regen: 'gota',
  magic_protection: 'escudo',
  revealing_flame: 'olho',
  arcane_circle: 'circulo',
  // 🗡️ Assassino — lâminas
  double_attack: 'corrente', // dois elos = dois golpes
  sonic_blow: 'estrela',
  envenom: 'gota',
  evasion: 'seta',
  hide: 'nuvem', // fumaça: some de vista
  // 🗡️ Assassino — espada curta
  cross_slash: 'espinho',
  deep_cut: 'gota',
  blade_dance: 'estrela',
  counter_attack: 'escudo',
  // 🗡️ Assassino — arremesso
  quick_throw: 'espinho',
  shuriken_storm: 'floco', // o shuriken é o floco de seis pontas do jogo
  poison_kunai: 'nuvem',
  phantom_throw: 'olho',
  hidden_strike: 'raio',
  // 🏹 Arqueiro
  bow_mastery: 'seta',
  crossbow_mastery: 'espinho',
  hunter_instinct: 'folha',
  double_shot: 'corrente', // dois elos = dois projéteis
  precise_shot: 'olho',
  piercing_shot: 'espinho',
  arrow_rain: 'nuvem',
  volley: 'estrela', // rajada que se abre; o floco lia como gelo
  eagle_eye: 'olho',
  concentration: 'estrela',
  hunting_trap: 'corrente',
  explosive_trap: 'chama',
};

/** Ícone genérico: moldura na cor do ramo + a silhueta da função. */
function drawGenerico(g: CanvasRenderingContext2D, id: SkillId): void {
  const ramo = SKILLS[id].branch ?? 'arcano';
  const [interno, externo, simbolo, brilho] = PALETAS[ramo] ?? PALETAS.arcano!;
  frame(g, interno, externo);
  // Sombra por baixo do glifo: sem ela a silhueta some no fundo claro do topo
  // da moldura, que é justamente onde o gradiente é mais forte.
  g.save();
  g.translate(0, 1.5);
  g.globalAlpha = 0.45;
  glifo(g, GLIFOS[id] ?? 'estrela', '#000000', '#000000');
  g.restore();
  glifo(g, GLIFOS[id] ?? 'estrela', simbolo, brilho);
  // Passiva ganha um anel: ela não se aperta, e o jogador precisa ver isso
  // ANTES de arrastar para a barra.
  if (SKILLS[id].kind === 'passive') {
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 2;
    g.setLineDash([3, 3]);
    g.strokeRect(3, 3, S - 6, S - 6);
    g.setLineDash([]);
  }
}

const cache = new Map<string, string>();

export function spellIconUrl(id: SkillId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  // As oito do Knight são desenhadas à mão; as 41 das classes mágicas saem do
  // construtor de glifos. Ver o comentário grande acima do `PALETAS`.
  const desenhos: Partial<Record<SkillId, (g: CanvasRenderingContext2D) => void>> = {
    power_strike: drawPowerStrike,
    bash: drawBash,
    charge: drawCharge,
    rupture: drawRupture,
    execution: drawExecution,
    taunt: drawTaunt,
    defensive_stance: drawStance,
    battle_fury: drawFury,
  };
  const mao = desenhos[id];
  if (mao) mao(g);
  else drawGenerico(g, id);
  const url = cv.toDataURL();
  cache.set(id, url);
  return url;
}
