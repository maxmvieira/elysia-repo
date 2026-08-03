/**
 * Encaixe de coisas postas à mão no terreno gerado.
 *
 * Coordenada escrita à mão e terreno gerado por regra são duas fontes que
 * envelhecem em ritmos diferentes: mexer numa densidade de floresta pode plantar
 * uma árvore exatamente onde alguém tinha posto um nó de minério. Em vez de
 * exigir que as duas listas sejam revisadas juntas para sempre, o ponto pedido é
 * tratado como **intenção**, e o encaixe procura o tile válido mais próximo.
 *
 * 🔴 **O raio é curto de propósito.** Se nada serve a 3 tiles do ponto pedido, o
 * ponto está errado o bastante para merecer conserto à mão — empurrar 15 tiles
 * esconderia o problema e mudaria o desenho do mundo sem ninguém perceber.
 */

/**
 * O tile aceito mais próximo de `(x0,y0)`, procurando em anéis crescentes.
 *
 * Determinístico: mesma entrada, mesma saída, sempre — a varredura de cada anel
 * tem ordem fixa. Devolve `undefined` se nenhum anel até `raioMax` servir.
 */
export function tileValidoMaisProximo(
  aceita: (x: number, y: number) => boolean,
  x0: number,
  y0: number,
  raioMax = 3,
): { x: number; y: number } | undefined {
  for (let r = 0; r <= raioMax; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        // Só a casca do anel: o miolo já foi visto nos raios anteriores.
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = x0 + dx;
        const y = y0 + dy;
        if (aceita(x, y)) return { x, y };
      }
    }
  }
  return undefined;
}
