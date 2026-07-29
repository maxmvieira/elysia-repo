/**
 * Os SETE tipos de dano e o sistema de resistências (GDD cap. 32).
 *
 * `DD-ELM-002` fecha a lista em sete: Físico · Fogo · Gelo · Elétrico · Veneno ·
 * Sagrado · Sombrio. Foi decisão EXPLÍCITA não ter 15–25 elementos — a
 * profundidade vem de resistências, condições, cartas e builds, não da
 * quantidade de ícones.
 *
 * 🔴 **32.2 — Elemento ≠ Condição.** *Gelo* é elemento, *Congelamento* é
 * condição. Causar dano de gelo NÃO congela ninguém: quem aplica condição é a
 * habilidade, com chance própria, e passa pelas contramedidas de `conditions.ts`.
 * Este arquivo cuida só do DANO.
 */

export type DamageType =
  | 'physical'
  | 'fire'
  | 'ice'
  | 'electric'
  | 'poison'
  | 'holy'
  | 'dark';

/** Os sete, em ordem canônica (`DD-ELM-002`). Útil para UI e para varrer tudo. */
export const DAMAGE_TYPES: readonly DamageType[] = [
  'physical',
  'fire',
  'ice',
  'electric',
  'poison',
  'holy',
  'dark',
] as const;

export interface ElementInfo {
  name: string;
  /** Cor para números de dano e ícones no cliente. */
  color: number;
  blurb: string;
}

export const ELEMENT_INFO: Record<DamageType, ElementInfo> = {
  physical: {
    name: 'Físico',
    color: 0xffffff,
    blurb: 'Corte, perfuração e impacto. É o dano da maioria das armas.',
  },
  fire: {
    name: 'Fogo',
    color: 0xff6a2a,
    // O doc é enfático: fogo NÃO reduz mobilidade, NÃO congela e NÃO atordoa só
    // por ser fogo. É dano + Queimadura, nada mais.
    blurb: 'Dano direto e Queimadura. Não controla, não atordoa — só queima.',
  },
  ice: {
    name: 'Gelo',
    color: 0x6ad4ff,
    blurb: 'Dano frio. Congelamento é condição à parte, não vem de graça com o elemento.',
  },
  electric: {
    name: 'Elétrico',
    color: 0xffe14a,
    blurb: 'Dano que reage e se propaga. Base das habilidades de Raio.',
  },
  poison: {
    name: 'Veneno',
    color: 0x7ad13a,
    blurb: 'Dano ao longo do tempo. Mortos-vivos e construtos tendem a resistir.',
  },
  holy: {
    name: 'Sagrado',
    color: 0xfff3b0,
    // Cap. 9: morto-vivo é ALMA QUE NÃO CONSEGUIU VOLTAR AO HEART. Sagrado é
    // exatamente o que resolve isso — daí a fraqueza natural da família.
    blurb: 'Energia vital. Devastador contra mortos-vivos, vampiros e demônios.',
  },
  dark: {
    name: 'Sombrio',
    color: 0x9a5ad1,
    blurb: 'Corrupção e dreno. O oposto do Sagrado.',
  },
};

/**
 * Resistência por tipo, como FRAÇÃO do dano evitado.
 *
 * - `0.30` = recebe 30 % menos dano daquele tipo
 * - `-0.50` = **fraqueza**: recebe 50 % a mais (é assim que "fraco contra fogo"
 *   existe sem precisar de um segundo campo)
 *
 * Tipos ausentes valem 0. Deixar `Partial` é de propósito: a maioria das
 * criaturas só se importa com dois ou três tipos, e escrever sete zeros em cada
 * definição seria ruído.
 */
export type ResistanceProfile = Partial<Record<DamageType, number>>;

/**
 * ⚠️ **REFERÊNCIA, não número canônico.** `DD-ELM-003` fecha a REGRA —
 * "resistência ≠ imunidade: alta resistência a fogo não zera o dano de fogo, só
 * torna a escolha menos eficiente" — mas o doc **não fecha o teto**. 0,75 é um
 * ponto de partida para teste: mesmo o alvo mais resistente ainda come 25 %.
 *
 * O que NÃO pode mudar sem contrariar o doc é a existência do teto abaixo de 1.
 */
export const RESISTANCE_CAP = 0.75;

/**
 * Piso da fraqueza. Sem ele, uma soma infeliz de passivos poderia multiplicar o
 * dano por 5 e transformar qualquer erro de balanceamento em one-shot.
 * ⚠️ Também é REFERÊNCIA — o doc não fecha valor.
 */
export const WEAKNESS_FLOOR = -1.0;

/** Resistência efetiva contra um tipo, já limitada pelo teto e pelo piso. */
export function resistanceAgainst(profile: ResistanceProfile, type: DamageType): number {
  const raw = profile[type] ?? 0;
  return Math.max(WEAKNESS_FLOOR, Math.min(RESISTANCE_CAP, raw));
}

/**
 * Aplica a resistência a um dano já mitigado pelas camadas anteriores.
 *
 * Não arredonda nem impõe piso de 1: quem faz isso é o final do pipeline em
 * `defense.ts`. Manter esta função pura e sem piso é o que permite encadear as
 * camadas sem o piso de cada etapa inflar o resultado.
 */
export function applyResistance(
  amount: number,
  type: DamageType,
  profile: ResistanceProfile,
): number {
  return amount * (1 - resistanceAgainst(profile, type));
}

/**
 * Soma dois perfis de resistência (personagem + equipamento + carta + buff).
 *
 * Soma simples e depois o teto, em vez de multiplicar as sobras: multiplicar
 * daria retorno decrescente automático e tornaria impossível alcançar o teto,
 * o que esconderia do jogador o que ele está construindo.
 */
export function mergeResistances(...profiles: ResistanceProfile[]): ResistanceProfile {
  const out: ResistanceProfile = {};
  for (const p of profiles) {
    for (const type of DAMAGE_TYPES) {
      const v = p[type];
      if (v !== undefined) out[type] = (out[type] ?? 0) + v;
    }
  }
  return out;
}

/** É fraqueza (resistência negativa) contra este tipo? Usado pelo bestiário. */
export function isWeakTo(profile: ResistanceProfile, type: DamageType): boolean {
  return (profile[type] ?? 0) < 0;
}
