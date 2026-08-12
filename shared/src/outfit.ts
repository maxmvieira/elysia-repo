/**
 * Outfit: as cores que o jogador escolhe para o seu personagem.
 *
 * 🔴 **É COSMÉTICO, e o Doc 1 fecha isso com todas as letras** (`13.10`):
 * *"aparência não define poder — rosto, cabelo, barba, tom de pele, sexo e
 * cosméticos NUNCA alteram estatística"*. Nada que leia um outfit pode entrar em
 * cálculo de combate, de preço ou de progressão.
 *
 * ⚠️ **Os grupos são POR CLASSE.** O grupo 1 do Knight é a armadura; o do
 * Arqueiro é a túnica. Eles saem da paleta da própria arte, não de regiões
 * fixas do corpo — o modelo do Tibia (cabeça/tronco/pernas/pés) foi medido e
 * **não transfere**: o cinza da armadura do Knight cobre o corpo inteiro.
 * Ver `docs/PLANO-OUTFITS.md` e `tools/outfit-grupos.mjs`.
 *
 * Este arquivo mora em `shared/` porque a REGRA tem que ser a mesma dos dois
 * lados: o cliente monta a escolha, o servidor a valida, e uma divergência
 * entre as duas viraria personagem salvo com cor que o cliente não desenha.
 */

/**
 * Quantos grupos coloríveis uma classe pode ter.
 *
 * ⚠️ **REFERÊNCIA.** Nenhum documento fixa este número — o Doc 1 lista toda a
 * customização visual como PENDENTE (cap. 13). Saiu da medição dos quatro packs
 * em 2026-08-11, em que `tools/outfit-grupos.mjs` achou 3 grupos por classe.
 * Subir isto exige regerar os `grupos.json`; baixar deixa cor salva órfã.
 */
export const OUTFIT_MAX_GRUPOS = 3;

/** Maior valor de cor válido (`0xFFFFFF`). */
const COR_MAX = 0xffffff;

/**
 * Peneira um outfit vindo de fora — do cliente, ou de uma linha antiga do banco.
 *
 * 🔴 **O servidor NUNCA confia no que chega.** Um outfit é escolha do jogador,
 * então o cliente o envia; mas ele viaja pela rede como qualquer outra coisa, e
 * aqui só passa o que é cor de verdade. Devolve `undefined` quando não sobra
 * nada aproveitável — e `undefined` significa "arte com a cor original", que é
 * um estado válido e o padrão de quem nunca escolheu.
 *
 * ⚠️ Entrada parcialmente ruim é **aparada, não recusada**: um valor inválido no
 * meio do vetor vira "esse grupo fica na cor original", em vez de derrubar o
 * outfit inteiro. Perder uma cor é menos ruim que perder as três, e recusar o
 * personagem por causa de cosmético seria desproporcional.
 */
export function sanitizeOutfit(bruto: unknown): number[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const cores: number[] = [];
  let algumaValida = false;
  for (const v of bruto.slice(0, OUTFIT_MAX_GRUPOS)) {
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= COR_MAX) {
      cores.push(v);
      algumaValida = true;
    } else {
      // Buraco no meio: este grupo fica na cor original. `-1` é o "sem cor"
      // interno; ele não vai para a rede — `serializeOutfit` o remove do fim e
      // o cliente trata qualquer valor fora de 0..0xFFFFFF como "não pintar".
      cores.push(-1);
    }
  }
  if (!algumaValida) return undefined;
  // Grupo sem cor no FIM não precisa viajar: o cliente já não pinta o que não
  // recebe. Aparar encurta a mensagem sem mudar o desenho.
  while (cores.length > 0 && cores[cores.length - 1] === -1) cores.pop();
  return cores.length > 0 ? cores : undefined;
}

/** A cor do grupo `n` (1-based), ou `undefined` se ele fica na cor original. */
export function corDoGrupo(outfit: number[] | undefined, grupo: number): number | undefined {
  if (!outfit) return undefined;
  const v = outfit[grupo - 1];
  return typeof v === 'number' && v >= 0 && v <= COR_MAX ? v : undefined;
}
