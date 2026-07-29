/**
 * Ícones das magias, desenhados por código num canvas (mesma abordagem dos
 * ícones de item/criatura). Sem assets externos: cada ícone é um data-URL
 * gerado uma vez e guardado em cache.
 */

import type { SkillId } from '@dominion/shared';

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

const cache = new Map<string, string>();

export function spellIconUrl(id: SkillId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  const desenhos: Record<SkillId, (g: CanvasRenderingContext2D) => void> = {
    power_strike: drawPowerStrike,
    bash: drawBash,
    charge: drawCharge,
    rupture: drawRupture,
    execution: drawExecution,
    taunt: drawTaunt,
    defensive_stance: drawStance,
    battle_fury: drawFury,
  };
  desenhos[id](g);
  const url = cv.toDataURL();
  cache.set(id, url);
  return url;
}
