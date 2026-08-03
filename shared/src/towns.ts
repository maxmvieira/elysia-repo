/**
 * Cidades e vilarejos — o registro de pontos de renascimento.
 *
 * REGRA DO DONO (2026-07-28):
 *   o personagem NASCE num vilarejo ao redor de uma cidade principal, e só
 *   depois de IR FISICAMENTE à cidade grande pode defini-la como ponto de
 *   renascimento.
 *
 * O ponto de respawn é progressão do PERSONAGEM: um Lv.300 pode conhecer o mundo
 * inteiro — o Lv.15 recém-criado ainda precisa caminhar até a cidade grande.
 *
 * ⚠️ A outra metade da regra antiga (*"o mapa descoberto pertence à CONTA"*,
 * `DD-MAP-009/010`) foi **REVOGADA pelo dono em 2026-08-02**: o mundo é
 * inteiramente visível desde o início, e não há mais descoberta para persistir.
 *
 * ## ESTADO ATUAL: só Lumindale
 *
 * 🔴 As outras 10 cidades de `regions.ts` **não entram aqui ainda**, e a razão é
 * o que `townAt` faz: pisar dentro do raio de uma cidade **libera renascer nela**.
 * Arcadia hoje é praça de pedra e muralha, sem NPC nem serviço — libertar
 * respawn nela mandaria o jogador morto para um cenário vazio, longe de qualquer
 * loja. Cada cidade entra nesta tabela quando for desenhada de verdade.
 */

import { WORLD_SPAWN } from './regions.js';

export type TownKind = 'vilarejo' | 'cidade';

export interface TownDef {
  id: string;
  name: string;
  kind: TownKind;
  /** Onde o personagem reaparece ao renascer aqui. */
  spawn: { x: number; y: number; floor: number };
  /**
   * Raio (Chebyshev) em volta do spawn que conta como "estar na cidade".
   * Pisar dentro disso marca a visita e libera o respawn.
   */
  radius: number;
  /** Vilarejo inicial: onde personagens novos nascem. */
  starter?: boolean;
}

export const TOWNS: Record<string, TownDef> = {
  lumindale: {
    id: 'lumindale',
    name: 'Lumindale',
    kind: 'vilarejo',
    spawn: { ...WORLD_SPAWN },
    // A paliçada vai de (138,146) a (162,172): 12 tiles do centro até o muro
    // mais distante, e 13 para pegar a faixa de fora do portão.
    radius: 13,
    starter: true,
  },
};

/** Vilarejo onde nascem os personagens novos. */
export function starterTown(): TownDef {
  const found = Object.values(TOWNS).find((t) => t.starter);
  if (!found) throw new Error('Nenhum vilarejo inicial definido em TOWNS.');
  return found;
}

export function getTown(id: string): TownDef | undefined {
  return TOWNS[id];
}

/** Em qual cidade/vilarejo esta posição está, se em alguma. */
export function townAt(x: number, y: number, floor: number): TownDef | undefined {
  for (const t of Object.values(TOWNS)) {
    if (t.spawn.floor !== floor) continue;
    const dist = Math.max(Math.abs(x - t.spawn.x), Math.abs(y - t.spawn.y));
    if (dist <= t.radius) return t;
  }
  return undefined;
}
