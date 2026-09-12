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
  | 'ward'
  /**
   * 🪤 Armadilha do Arqueiro: fica ARMADA e só age quando alguém pisa nela.
   *
   * 🔴 Diferente de `damage` em duas coisas que o doc exige: não pulsa (dispara
   * **uma vez** e some), e é **oculta ao inimigo, visível à party** — por isso
   * o servidor filtra por destinatário na hora de mandar a área para o cliente.
   */
  | 'trap';

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
  /**
   * 🔥 **Raio POR EIXO, para as áreas que não são quadradas.**
   *
   * A Muralha de Fogo é uma linha de 1×3: `raioX: 0, raioY: 1` deitada de pé,
   * `raioX: 1, raioY: 0` atravessada. Ausentes, valem `radius` nos dois eixos —
   * que é o que toda área era antes de 13/09.
   *
   * ⚠️ **É raio, não largura**, como o `radius`: 1 significa três células.
   */
  raioX?: number;
  raioY?: number;
  expiresAt: number;
  /** Próximo tique. Ausente em `wall` (parede não pulsa). */
  nextTickAt: number;
  tickMs: number;
  /** Dano ou cura por tique, já resolvido do nível da habilidade. */
  power: number;
  damageType?: DamageType;
  /*
   * 🌬️❄️ **`empurraPorPulso`, `congelaEmAcertos`, `acertos` e `congelados`
   * SAÍRAM DAQUI em 11/09.** Os quatro existiam para a Nevasca, e ela deixou de
   * ser área de chão: viraram campos que nenhuma ficha preenchia e que nenhum
   * caminho lia. Hoje o estado equivalente é `Tempestade`, na fila de quedas do
   * servidor. Ver a nota em `golpeDeArea`.
   */
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
  /**
   * 🔥 **QUANTOS CONTATOS cada alvo aguenta desta barreira**, e o estado de cada
   * um. Ausente = a área pulsa em todo mundo para sempre, que é o comportamento
   * das outras seis.
   *
   * 🔴 **O contador é POR ALVO, e isso é a regra, não um detalhe.** A ficha do
   * dono (13/09) é explícita: *"Monster A 3/5, Monster B 1/5, Monster C 0/5 —
   * não compartilhar esse contador entre inimigos"*. Uma barreira com contador
   * único viraria uma parede que o primeiro monstro gasta sozinho.
   *
   * ⚠️ **`ultimo` existe por causa de quem NÃO é empurrado.** O alvo normal toma
   * um contato e é jogado para fora; um chefe imune a empurrão fica em pé dentro
   * do fogo, e sem um intervalo mínimo ele queimaria a cada tique — os doze
   * contatos do Lv.10 acabariam em dois segundos.
   */
  contatos?: Record<string, { n: number; ultimo: number }>;
  maxContatos?: number;
  /** Intervalo mínimo entre dois contatos do MESMO alvo. */
  contatoMs?: number;
  /** Quantos tiles o contato arremessa. Ausente = não empurra. */
  empurraTiles?: number;
  /**
   * 🪤 Já disparou? Só as armadilhas usam.
   *
   * Existe em vez de simplesmente remover a área na hora porque o tique que
   * dispara também precisa avisar o cliente, e um objeto marcado é mais fácil
   * de varrer do que uma remoção no meio de um laço sobre a mesma lista.
   */
  triggered?: boolean;
  /** Nome do efeito visual no cliente. */
  fx: string;
}

/** Quantas áreas simultâneas o mundo aguenta antes de recusar novas. */
export const MAX_GROUND_AREAS = 200;

/**
 * O tile (x,y) está dentro da área?
 *
 * ⚠️ **Por EIXO, e não por Chebyshev**, desde que existem áreas não quadradas
 * (ver `raioX`). Para as quadradas o resultado é idêntico ao de antes — Chebyshev
 * É a comparação eixo a eixo com o mesmo raio nos dois.
 */
export function areaCovers(a: GroundArea, x: number, y: number, floor: number): boolean {
  if (a.floor !== floor) return false;
  return Math.abs(a.x - x) <= (a.raioX ?? a.radius)
    && Math.abs(a.y - y) <= (a.raioY ?? a.radius);
}

/**
 * 🔥 **Este alvo ainda pode ser ferido por esta barreira?**
 *
 * Duas perguntas numa: ele já gastou os contatos dele, e já passou o intervalo
 * desde o último? Separadas, as duas viravam `if`s repetidos nos dois caminhos
 * que machucam (criatura e jogador) — e é assim que um deles fica sem a guarda.
 */
export function podeContato(a: GroundArea, alvoId: string, now: number): boolean {
  if (a.maxContatos === undefined) return true;
  const c = a.contatos?.[alvoId];
  if (!c) return true;
  if (c.n >= a.maxContatos) return false;
  return now - c.ultimo >= (a.contatoMs ?? 0);
}

/** Registra o contato deste alvo. Chamar DEPOIS de aplicar o dano. */
export function marcaContato(a: GroundArea, alvoId: string, now: number): void {
  if (a.maxContatos === undefined) return;
  if (!a.contatos) a.contatos = {};
  const c = a.contatos[alvoId];
  if (c) { c.n += 1; c.ultimo = now; } else a.contatos[alvoId] = { n: 1, ultimo: now };
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
/**
 * 🪤 Quem pode VER esta área.
 *
 * `DD-ARC-016`: as armadilhas do Arqueiro são *"**ocultas** ao inimigo,
 * visíveis à party"*. Todo o resto é visível para todo mundo — uma muralha de
 * fogo secreta não faria sentido nem seria justa.
 *
 * ⚠️ O filtro é do SERVIDOR, e tem de ser. Mandar a armadilha para todos e
 * esconder no cliente deixaria a posição no tráfego, e qualquer cliente
 * modificado a leria.
 */
export function areaVisibleTo(
  a: GroundArea,
  espectadorId: string,
  mesmaParty: boolean,
): boolean {
  if (a.kind !== 'trap') return true;
  return a.ownerId === espectadorId || mesmaParty;
}

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
