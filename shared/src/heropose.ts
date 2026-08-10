/**
 * Qual animação de ataque o herói toca, dada a arma na mão.
 *
 * Os packs de arte de classe (`arte-fonte/classes/`) trazem uma animação de
 * ataque por FAMÍLIA de arma — golpe de espada, estocada de lança, disparo de
 * arco, conjuração de cajado e, só no Assassino, a estocada de adaga. O jogo tem
 * **oito** tipos de arma (`WeaponType`), então alguém tem que dizer qual cai em
 * qual.
 *
 * Isto mora em `shared/` e não no cliente por um motivo só: é lógica pura, e é
 * onde os testes rodam. O teste de exaustividade abaixo é o valor real do
 * arquivo — quando alguém adicionar um nono tipo de arma, ele quebra na hora, em
 * vez de o personagem simplesmente parar de animar o golpe em silêncio.
 */

import type { WeaponType } from './weapons.js';

/** As poses de ataque que a arte entrega. */
export type AttackPose = 'sword' | 'dagger' | 'spear' | 'bow' | 'staff';

export const ATTACK_POSES: AttackPose[] = ['sword', 'dagger', 'spear', 'bow', 'staff'];

/**
 * Arma -> pose. As escolhas que não são óbvias:
 *
 * - **Machado e maça caem no golpe de espada.** Não há arte própria para eles, e
 *   os três são o mesmo gesto: um golpe descendente de cima para baixo. Fingir
 *   que machado é lança seria pior.
 * - **Besta cai no arco.** Mesma postura de tiro; o que muda é a arma desenhada
 *   na mão, e a arma não é desenhada separada do corpo neste estilo de arte.
 * - **Adaga tem pose própria**, mas só o Assassino tem a folha. Quem não tem cai
 *   no golpe de espada pelo `attackPoseFallback` — ver abaixo.
 */
const POR_ARMA: Record<WeaponType, AttackPose> = {
  sword: 'sword',
  axe: 'sword',
  mace: 'sword',
  dagger: 'dagger',
  spear: 'spear',
  bow: 'bow',
  crossbow: 'bow',
  staff: 'staff',
};

/**
 * A pose de quem está com `weapon` na mão. Sem arma (ou arma desconhecida vinda
 * de um cliente desatualizado) o herói dá o golpe de espada, que é o gesto
 * genérico de bater — e é o que o punho cerrado mais se parece.
 */
export function attackPoseFor(weapon?: WeaponType): AttackPose {
  return (weapon && POR_ARMA[weapon]) || 'sword';
}

/**
 * A pose que substitui uma que a classe não tem.
 *
 * Nem todo pack traz as cinco: só o Assassino tem adaga, e ele não tem lança.
 * A cadeia termina em `sword`, que os cinco packs têm — então sempre existe
 * alguma coisa para tocar, e o golpe nunca some.
 *
 * 🔴 Devolver `undefined` aqui seria pior do que parece: sem animação de ataque
 * o `makeMiniActor` cai no "pulinho" de investida do placeholder, e um herói HD
 * dando pulinho ao lado de um que golpeia de verdade é mais estranho do que o
 * herói golpear com a arma errada na mão.
 */
export function attackPoseFallback(pose: AttackPose): AttackPose[] {
  switch (pose) {
    case 'dagger': return ['dagger', 'sword'];
    case 'spear': return ['spear', 'sword'];
    case 'bow': return ['bow', 'sword'];
    case 'staff': return ['staff', 'sword'];
    case 'sword': return ['sword'];
  }
}
