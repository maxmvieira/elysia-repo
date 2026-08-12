/**
 * COMO o herói segura o que está equipado — e, por consequência, qual corpo
 * desenhar e o que sobrepor nele.
 *
 * 🔴 **Isto existe porque a arma saiu do corpo e virou CAMADA.** Enquanto a arma
 * estava pintada no sprite, cada combinação classe×arma precisava da folha
 * inteira dela: o pack de hoje tem 7 animações de ataque onde caberiam 20, e é
 * por isso que o Knight faz o mesmo gesto com lança, arco e cajado. Com a arma
 * por cima, o que o corpo precisa saber encolhe para TRÊS posturas — uma mão,
 * duas mãos, e duas armas — e a arma desenhada passa a ser dado, não arte nova.
 *
 * As regras são do dono, ditas em 2026-08-12:
 *
 *  - o **escudo só aparece se estiver equipado** (o slot `shield` já existia e
 *    já era separado; quem não o respeitava era a arte);
 *  - **arma de duas mãos não usa escudo** — regra que já estava escrita em
 *    `weapons.ts` e nunca tinha tido efeito;
 *  - **só a adaga pode ser dupla**, uma em cada mão.
 *
 * Mora em `shared/` pelo mesmo motivo que `heropose.ts`: é lógica pura, e é onde
 * os testes rodam. O servidor decide, o cliente desenha, e os dois concordam
 * porque leem a mesma função.
 */

import type { WeaponType } from './weapons.js';
import { WEAPON_IDENTITY } from './weapons.js';

/** As três posturas que o CORPO precisa ter arte para fazer. */
export type Grip = 'one_hand' | 'two_hand' | 'dual';

export const GRIPS: Grip[] = ['one_hand', 'two_hand', 'dual'];

/**
 * O único tipo que pode ser empunhado em par.
 *
 * ⚠️ É uma lista, e não `=== 'dagger'`, para que ampliar (se o dono um dia
 * quiser espada curta dupla) seja acrescentar um item — e para que o teste de
 * exaustividade abaixo continue valendo sem reescrever a regra.
 */
export const DUAL_WIELD_TYPES: WeaponType[] = ['dagger'];

export function canDualWield(type: WeaponType): boolean {
  return DUAL_WIELD_TYPES.includes(type);
}

/** O que o personagem tem equipado, do ponto de vista de COMO ele segura. */
export interface Equipped {
  /** Arma da mão principal. Ausente = mãos vazias. */
  weapon?: WeaponType;
  /**
   * Quantas mãos a peça equipada ocupa (`ItemDef.hands`). Ausente = o padrão do
   * tipo. Ver o comentário do campo em `items.ts`.
   */
  hands?: 1 | 2;
  /** Escudo no slot `shield`. */
  shield?: boolean;
  /** Arma na outra mão. Só vira empunhadura dupla se as duas puderem. */
  offhand?: WeaponType;
}

export interface Hold {
  grip: Grip;
  /** Desenha o escudo? Falso quando não há escudo OU quando a arma é de duas mãos. */
  showShield: boolean;
  /** A arma da mão principal, ou `undefined` para punho. */
  main?: WeaponType;
  /** A segunda arma desenhada, só na empunhadura dupla. */
  off?: WeaponType;
}

/** Quantas mãos a arma equipada ocupa, com o item vencendo o tipo. */
export function handsOf(weapon: WeaponType | undefined, override?: 1 | 2): 1 | 2 {
  if (override) return override;
  return weapon ? WEAPON_IDENTITY[weapon].hands : 1;
}

/**
 * A postura e o que se desenha por cima dela.
 *
 * A ordem das perguntas importa e não é arbitrária:
 *
 *  1. **Duas mãos vence tudo.** Uma arma de duas mãos ocupa as duas, então não
 *     sobra mão para escudo nem para segunda arma — mesmo que estejam
 *     equipados. Não é erro do jogador ter um escudo na mochila com um montante
 *     na mão; é só que ele não aparece.
 *  2. **Depois a dupla**, que exige as duas armas serem do tipo que permite.
 *     Uma adaga com uma espada na outra mão NÃO é dupla — cai em uma mão, e a
 *     espada não é desenhada. Recusar a metade inválida é melhor que desenhar
 *     uma empunhadura que o jogo não modela.
 *  3. **Só então uma mão**, onde o escudo finalmente pode aparecer.
 */
export function resolveHold(e: Equipped): Hold {
  const hands = handsOf(e.weapon, e.hands);

  if (e.weapon && hands === 2) {
    return { grip: 'two_hand', showShield: false, main: e.weapon };
  }

  if (e.weapon && e.offhand && canDualWield(e.weapon) && canDualWield(e.offhand)) {
    return { grip: 'dual', showShield: false, main: e.weapon, off: e.offhand };
  }

  return {
    grip: 'one_hand',
    showShield: e.shield === true,
    ...(e.weapon ? { main: e.weapon } : {}),
  };
}
