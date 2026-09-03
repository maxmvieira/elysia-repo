/**
 * Áreas persistentes no chão — a magia que fica depois que o conjurador
 * terminou de conjurar.
 *
 * 🔴 **Por que isto virou sistema em vez de sete casos especiais.** Sete
 * habilidades das duas classes mágicas são, mecanicamente, a MESMA coisa: um
 * retângulo de chão que faz algo a cada X ms por Y segundos. Fire Wall, Ice
 * Wall, Nevasca e Círculo Arcano no Feiticeiro; Esporos Venenosos, Santuário e
 * Ira da Natureza no Druida.
 *
 * E uma delas é a IDENTIDADE de uma classe inteira: `71.x` diz que a Ira da
 * Natureza *"ataca a região em ciclos **enquanto o Druida continua curando e
 * debuffando**"*. Se a magia fosse um `for` dentro do `castSpell`, o Druida
 * ficaria parado esperando ela acabar — exatamente o contrário do que o
 * documento descreve. A área precisa viver **fora** do turno de quem lançou.
 *
 * ## O que uma área NÃO faz
 *
 * ⚠️ Ela não tem dono vivo. Se o Druida morre, a Ira continua até o tempo
 * acabar — a magia já saiu. Guardamos `ownerId` só para o XP e para a regra de
 * quem apanha (ver `hitsPlayers`/`hitsCreatures`), não para cancelar.
 */

import type { DamageType } from './elements.js';
import type { ConditionId } from './conditions.js';

/** O que a área faz a cada tique. */
export type AreaKind =
  /** Dano em quem está dentro. Fire Wall, Nevasca, Esporos, Ira da Natureza. */
  | 'damage'
  /** Cura quem está dentro. Santuário. */
  | 'heal'
  /** Só existe para bloquear passagem. Ice Wall. */
  | 'wall'
  /** Protege quem está dentro (o efeito real mora nos modificadores). */
  | 'ward';

export interface GroundArea {
  /** Id único desta instância no mundo. */
  id: string;
  /** Habilidade que a criou — o cliente desenha por aqui. */
  skillId: string;
  /** Quem conjurou. Para XP e para não acertar o próprio grupo. */
  ownerId: string;
  kind: AreaKind;
  x: number;
  y: number;
  floor: number;
  /** Raio em tiles. 0 = só o tile central. */
  radius: number;
  expiresAt: number;
  /** Próximo tique. Ausente em `wall` (parede não pulsa). */
  nextTickAt: number;
  tickMs: number;
  /** Dano ou cura por tique, já resolvido do nível da habilidade. */
  power: number;
  damageType?: DamageType;
  /**
   * Condição que cada tique tenta aplicar (a Nevasca congela, a Ira petrifica).
   *
   * ⚠️ **`power` não é opcional por acaso quando a condição é DoT.**
   * `tickConditions` só causa dano se a parcela vier preenchida — sem ela, os
   * Esporos aplicariam "Veneno" que não tira um ponto de vida, e a habilidade
   * pareceria funcionar. Quem cria a área tem de copiar o `power` da ficha.
   */
  condition?: { id: ConditionId; chance: number; durationMs: number; power?: number };
  /** Atinge jogadores? (Nevasca em PvP sim; Santuário cura, então também.) */
  hitsPlayers: boolean;
  /** Atinge criaturas? */
  hitsCreatures: boolean;
  /** Impede quem tentar entrar. Só a Ice Wall. */
  blocks: boolean;
  /** Nome do efeito visual no cliente. */
  fx: string;
}

/** Quantas áreas simultâneas o mundo aguenta antes de recusar novas. */
export const MAX_GROUND_AREAS = 200;

/** O tile (x,y) está dentro da área? Usa Chebyshev, como o resto do combate. */
export function areaCovers(a: GroundArea, x: number, y: number, floor: number): boolean {
  if (a.floor !== floor) return false;
  return Math.max(Math.abs(a.x - x), Math.abs(a.y - y)) <= a.radius;
}

/** Alguma área BLOQUEANTE ocupa este tile? (Ice Wall.) */
export function areaBlocks(
  areas: Iterable<GroundArea>,
  x: number,
  y: number,
  floor: number,
): boolean {
  for (const a of areas) {
    if (a.blocks && areaCovers(a, x, y, floor)) return true;
  }
  return false;
}

/**
 * Remove as áreas vencidas. Devolve a lista nova e as que caíram — o servidor
 * precisa das que caíram para avisar o cliente de que pode apagar o desenho.
 */
export function expireAreas(
  areas: GroundArea[],
  now: number,
): { areas: GroundArea[]; expired: GroundArea[] } {
  const expired = areas.filter((a) => a.expiresAt <= now);
  if (expired.length === 0) return { areas, expired };
  return { areas: areas.filter((a) => a.expiresAt > now), expired };
}

/**
 * Quantas áreas DESTA habilidade este conjurador ainda tem no mundo.
 *
 * Existe por causa da Ice Wall, que o doc limita explicitamente a *"1→3
 * paredes simultâneas"* conforme o nível. Sem a contagem, o Feiticeiro
 * muraria o mapa inteiro.
 */
export function countAreasOf(areas: Iterable<GroundArea>, ownerId: string, skillId: string): number {
  let n = 0;
  for (const a of areas) if (a.ownerId === ownerId && a.skillId === skillId) n++;
  return n;
}

/**
 * Descarta a área mais ANTIGA de um conjurador para dar lugar à nova.
 *
 * `DD-ARC-xxx` pede exatamente isto para as armadilhas do Archer (*"a 4ª apaga
 * a mais antiga"*), e a mesma cortesia serve à Ice Wall: recusar em silêncio é
 * pior do que substituir.
 */
export function dropOldestOf(
  areas: GroundArea[],
  ownerId: string,
  skillId: string,
): GroundArea | null {
  let mais: GroundArea | null = null;
  for (const a of areas) {
    if (a.ownerId !== ownerId || a.skillId !== skillId) continue;
    if (!mais || a.expiresAt < mais.expiresAt) mais = a;
  }
  return mais;
}
