/**
 * O vocabulário canônico de PROFICIÊNCIA (`DD-PROG-011`).
 *
 * 🔴 **`DD-PROG-011`: Magic Level é PROFICIÊNCIA, não é INT.** Dois Feiticeiros
 * com a mesma INT podem ter Magic Levels diferentes — um treinou, o outro não. É
 * a decisão que este arquivo existe para tornar possível: hoje o Cajado sobe uma
 * proficiência chamada `staff`, que é nome de arma, não de magia.
 *
 * Isto importa para uma decisão que já foi tomada por cima dele: quando o dono
 * fechou que **Varinha e Livro Arcano não viram `WeaponType` novo** (2026-07-30),
 * o argumento foi que a proficiência mágica deles já estava prevista aqui. Até
 * este arquivo existir, aquela decisão estava de pé sobre algo que não existia.
 *
 * ⚠️ **Camada de LEITURA, por enquanto.** Nada aqui muda o que é gravado em save:
 * `Proficiencies` continua indexada por `WeaponType`. Esta é a tradução para o
 * vocabulário do documento, e é o que permite a interface e as futuras exigências
 * de magia falarem a língua certa antes de a migração acontecer. Ligar de
 * verdade é mexer em estado persistido, e o padrão do projeto manda verificar o
 * SCHEMA, nunca o `user_version`.
 *
 * ## 🔴 Os dois documentos discordam, e a diferença é grande
 *
 * | Fonte | Lista |
 * |---|---|
 * | **Doc 1** (destilado, §61) | `1H` · `2H` · `Distance` · `Shield` · `Magic Level` |
 * | **Doc 4**, cap. 42 | `Sword` · `Axe` · `Club` · `Spear` · `Dagger` · `Distance` · `Fist` · `Magic Level` |
 *
 * Não é divergência de redação: são modelos diferentes de jogo. O Doc 1 agrupa
 * por **como se segura a arma** (uma mão, duas mãos), então treinar espada
 * treinaria machado junto. O Doc 4 mantém **uma proficiência por família**, que é
 * o que o código já faz.
 *
 * 🔴 **O dono decidiu em 2026-07-30: vale a lista do Doc 4.** *"quero modelo do
 * doc4 mesmo. nao precisa incluir o 1h/2h do doc1"*.
 *
 * Isto é **override explícito da regra de ouro** — pela hierarquia o Doc 1
 * venceria, e por isso a decisão fica escrita aqui em vez de virar só código.
 * Os dois motivos que a sustentam:
 *
 * 1. É a que **preserva o que já está em save de jogador**. As cinco famílias
 *    corpo a corpo continuam existindo com o mesmo nome; só arco e besta se
 *    juntam em `distance` e o cajado vira `magic`. Adotar o Doc 1 jogaria fora a
 *    proficiência de todo mundo e exigiria decidir se espada e machado passam a
 *    ser a mesma coisa.
 * 2. O próprio cap. 42 se apresenta como *"conforme o sistema já consolidado"* —
 *    ou seja, ele está **descrevendo** o que existe, não propondo mudança.
 *
 * ⚠️ **Não "conserte" isto de volta para o Doc 1.** O 1H/2H parece o modelo
 * canônico quando se lê só o destilado, e é exatamente por isso que a decisão
 * está registrada: quem chegar por aquele lado vai achar que o código diverge do
 * documento. Não diverge — foi decidido contra ele, de propósito. Há teste
 * travando a lista.
 */

import { WEAPON_IDENTITY, type WeaponType } from './weapons.js';

/**
 * As oito proficiências do cap. 42.
 *
 * `fist` e `magic` não correspondem a nenhum `WeaponType`: a primeira é lutar
 * **sem arma**, a segunda é conjurar. As duas existem no documento e não existiam
 * no código.
 */
export type ProficiencyKind =
  | 'sword' | 'axe' | 'club' | 'spear' | 'dagger'
  | 'distance' | 'fist' | 'magic';

export const PROFICIENCY_KINDS: ProficiencyKind[] = [
  'sword', 'axe', 'club', 'spear', 'dagger', 'distance', 'fist', 'magic',
];

/** Nome exibido de cada proficiência. */
export const PROFICIENCY_LABEL: Record<ProficiencyKind, string> = {
  sword: 'Espada',
  axe: 'Machado',
  club: 'Maça',
  spear: 'Lança',
  dagger: 'Adaga',
  distance: 'Distância',
  fist: 'Luta Desarmada',
  magic: 'Magic Level',
};

/**
 * Em que proficiência canônica cai cada tipo de arma.
 *
 * As duas fusões que o cap. 42 pede, e que o código não fazia:
 *
 * - **`bow` e `crossbow` → `distance`.** O documento não separa arco de besta;
 *   trata mirar à distância como uma habilidade só. A identidade das duas
 *   continua distinta onde importa de verdade — `WEAPON_IDENTITY` dá cadência,
 *   dano e alcance próprios a cada uma.
 * - **`staff` → `magic`.** É o `DD-PROG-011` em si. "Proficiência de cajado" era
 *   um nome errado para o que sempre foi conjuração: quem conjura melhor treinou
 *   magia, não madeira.
 *
 * `mace` vira `club` porque é o nome que o documento usa.
 */
export const WEAPON_PROFICIENCY: Record<WeaponType, ProficiencyKind> = {
  sword: 'sword',
  axe: 'axe',
  mace: 'club',
  spear: 'spear',
  dagger: 'dagger',
  bow: 'distance',
  crossbow: 'distance',
  staff: 'magic',
};

/**
 * A proficiência que este ataque treina. `undefined` = desarmado.
 *
 * 🔴 **Desarmado treina `fist`, e isso é o que faltava.** Hoje lutar sem arma não
 * sobe proficiência nenhuma — o jogador bate e não melhora, para sempre. O
 * documento prevê Fist justamente porque lutar sem arma é uma escolha válida, e
 * escolha válida que não progride não é escolha.
 */
export function proficiencyFor(weapon: WeaponType | undefined): ProficiencyKind {
  return weapon ? WEAPON_PROFICIENCY[weapon] : 'fist';
}

/** Os tipos de arma que treinam esta proficiência. Vazio para `fist`. */
export function weaponsOf(kind: ProficiencyKind): WeaponType[] {
  return (Object.keys(WEAPON_PROFICIENCY) as WeaponType[])
    .filter((w) => WEAPON_PROFICIENCY[w] === kind);
}

/**
 * Esta proficiência é a de conjuração?
 *
 * Existe como função e não como comparação solta porque é o gancho de
 * `DD-PROG-011`: *"requisito de magias é Magic Level"*. Quando as magias ganharem
 * exigência de nível, é por aqui que elas perguntam — e não por `INT`.
 */
export function isMagicProficiency(kind: ProficiencyKind): boolean {
  return kind === 'magic';
}

// ---------------------------------------------------------------------------
// O estado persistido
// ---------------------------------------------------------------------------

export interface ProficiencyProgress {
  level: number;
  progress: number;
}

/**
 * A maestria do personagem em cada proficiência.
 *
 * 🔴 **Chaveada por `ProficiencyKind`, não por `WeaponType`** — foi esta mudança
 * que fez o `DD-PROG-011` sair do papel. Antes, o Cajado subia uma entrada
 * chamada `staff`; agora sobe `magic`, e é dela que as magias vão exigir nível.
 */
export type Proficiencies = Partial<Record<ProficiencyKind, ProficiencyProgress>>;

export function proficiencyOf(profs: Proficiencies, kind: ProficiencyKind): number {
  return profs[kind]?.level ?? 0;
}

/** Magic Level do personagem. É o número que `DD-PROG-011` chama assim. */
export function magicLevelOf(profs: Proficiencies): number {
  return proficiencyOf(profs, 'magic');
}

/**
 * Converte a proficiência de um save ANTIGO (chaveada por `WeaponType`) para o
 * vocabulário canônico.
 *
 * 🔴 **Duas chaves antigas caem na mesma nova**: `bow` e `crossbow` viram
 * `distance`. Quando as duas existem, fica a de **maior nível** — somar seria
 * errado (nível não é aditivo, e somar dois níveis 10 daria um 20 que o jogador
 * nunca treinou) e ficar com a menor puniria quem treinou as duas.
 *
 * ⚠️ Chaves que já são canônicas passam direto, então rodar isto duas vezes no
 * mesmo dado é inofensivo — o que importa numa migração que roda no boot.
 */
export function migrateProficiencies(
  antigo: Record<string, ProficiencyProgress | undefined> | null | undefined,
): Proficiencies {
  const out: Proficiencies = {};
  if (!antigo) return out;
  for (const [chave, valor] of Object.entries(antigo)) {
    if (!valor) continue;
    // `bow`/`crossbow`/`staff`/`mace` são traduzidos; o resto (e as chaves que já
    // são canônicas, como `fist`) permanece.
    const nova = (WEAPON_PROFICIENCY as Record<string, ProficiencyKind | undefined>)[chave]
      ?? (PROFICIENCY_KINDS.includes(chave as ProficiencyKind) ? chave as ProficiencyKind : undefined);
    if (!nova) continue;
    const atual = out[nova];
    if (!atual || valor.level > atual.level) out[nova] = { ...valor };
  }
  return out;
}

/**
 * Confere que a identidade da arma concorda com a proficiência.
 *
 * Arma marcada `magic: true` em `WEAPON_IDENTITY` tem que cair em `magic`, e
 * arma de alcance longo em `distance`. As duas tabelas descrevem o mesmo mundo e
 * separar-se em silêncio é o tipo de erro que só aparece meses depois.
 */
export function proficiencyMatchesIdentity(weapon: WeaponType): boolean {
  const id = WEAPON_IDENTITY[weapon];
  const prof = WEAPON_PROFICIENCY[weapon];
  if (id.magic) return prof === 'magic';
  // Alcance > 1 sem ser mágico é arma de arremesso/tiro. A lança tem alcance 2 e
  // NÃO é distância: ela alcança dois tiles, não o outro lado da tela.
  if (id.range >= 4) return prof === 'distance';
  return prof !== 'distance' && prof !== 'magic';
}
