/**
 * Cidades e vilarejos — o registro de pontos de renascimento.
 *
 * REGRA DO DONO (2026-07-28):
 *   o personagem NASCE num vilarejo ao redor de uma cidade principal, e só
 *   depois de IR FISICAMENTE à cidade grande pode defini-la como ponto de
 *   renascimento.
 *
 * Isso combina com `DD-MAP-010` / `40.21` do GDD: o mapa descoberto pertence à
 * CONTA, mas o ponto de respawn continua sendo progressão do PERSONAGEM.
 * Um Lv.300 pode ter revelado Asteria para a conta inteira — o Lv.15 recém-
 * criado ainda precisa caminhar até lá.
 *
 * ESTADO ATUAL: só Valoria existe no mapa. **Asteria (a cidade principal) é
 * conteúdo da etapa 16** e não foi inventada aqui — quando ela for desenhada,
 * entra como mais uma entrada nesta tabela e o resto do sistema já funciona.
 */

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
  valoria: {
    id: 'valoria',
    name: 'Valoria',
    kind: 'vilarejo',
    spawn: { x: 20, y: 20, floor: 0 },
    radius: 10,
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
