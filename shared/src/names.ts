/**
 * Validação do NOME DO PERSONAGEM.
 *
 * Regra do dono (2026-07-28): o jogador escolhe o nome, mas
 *  - só LETRAS (sem números, sem caractere especial);
 *  - sem palavrão nem nome abusivo;
 *  - único no servidor.
 *
 * Os documentos deixaram isso explicitamente pendente (`13.21`, PENDENTE 13 do
 * cap. 13), então as escolhas de FAIXA abaixo são nossas e estão isoladas nas
 * constantes — mexer nelas não exige mexer na lógica:
 *
 *  - 3 a 20 caracteres (o servidor já cortava em 20);
 *  - letras A–Z sem acento, como em Tibia. Acento sai da comparação de
 *    unicidade e abriria brecha para "José" e "Jose" coexistirem;
 *  - espaço simples entre palavras, no máximo 2 palavras. Nome composto é
 *    idiomático no gênero ("Bubble Gum") e espaço não é caractere especial.
 *
 * Vive no `shared` para o CLIENTE poder validar antes de enviar e mostrar o
 * erro na hora — mas o SERVIDOR revalida sempre, porque cliente mente.
 */

export const NAME_MIN = 3;
export const NAME_MAX = 20;
export const NAME_MAX_WORDS = 2;

export type NameRejection =
  | 'vazio'
  | 'curto'
  | 'longo'
  | 'caractere'
  | 'palavras'
  | 'espaco'
  | 'ofensivo'
  | 'reservado';

export interface NameCheck {
  ok: boolean;
  /** Nome já normalizado para gravar (espaços colapsados, Capitalizado). */
  name: string;
  reason?: NameRejection;
  /** Mensagem pronta para a interface. */
  message?: string;
}

/**
 * Termos bloqueados, em duas listas — e a divisão NÃO é por tamanho.
 *
 * O que decide é a AMBIGUIDADE do termo. "rola" e "pinto" têm 4+ letras, mas
 * são pedaço de "Rolando" e "Pintor"; "puta" é pedaço de "disputa". Bloquear
 * por substring aí rejeita nome legítimo — o clássico problema do Scunthorpe.
 */

/** Inequívocos: batem em QUALQUER posição, mesmo grudados (xXcaralhoXx). */
const BLOCKED_ANYWHERE = [
  // PT
  'caralho', 'buceta', 'boceta', 'xoxota', 'punheta', 'siririca', 'arrombado',
  'vagabunda', 'prostituta', 'estupro', 'estuprador', 'pedofilo', 'piroca',
  'boquete', 'cuzao', 'cuzinho', 'viadinho', 'putaria', 'fodase', 'desgraca',
  // EN
  'nigger', 'nigga', 'faggot', 'asshole', 'motherfuck', 'rapist',
];

/**
 * Ambíguos: só batem como PALAVRA INTEIRA. São ofensivos sozinhos, mas
 * aparecem dentro de nomes legítimos.
 */
const BLOCKED_WORD = [
  // PT — 'rola' (Rolando), 'pinto' (Pintor), 'puta' (disputa), 'preto' (Pretoria)
  'porra', 'foder', 'puta', 'viado', 'veado', 'bicha', 'corno', 'merda',
  'bosta', 'rola', 'pinto', 'macaco', 'preto', 'nazista', 'hitler', 'racista',
  // EN — 'rape' (grape), 'cock' (Cockburn), 'dick' (Dickens), 'pedo'
  'fuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'rape', 'pedo', 'nazi',
  'dick', 'cock', 'pussy',
];

/** Nomes que o jogo reserva para si — ninguém pode se passar por eles. */
const RESERVED = [
  'admin', 'administrador', 'gm', 'gamemaster', 'game master', 'mod', 'moderador',
  'staff', 'suporte', 'support', 'sistema', 'system', 'server', 'servidor',
  'elysia', 'npc', 'null', 'undefined',
];

const LETTERS_ONLY = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

/**
 * Tira acentos e baixa a caixa. Usado para COMPARAR (unicidade e palavrão),
 * nunca para exibir.
 */
/**
 * Faixa das marcas combinantes de acento (U+0300–U+036F). Montada a partir de
 * STRING escapada de propósito: escrever os acentos literalmente aqui já
 * corrompeu arquivo neste projeto antes (ver HISTORICO.md).
 */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chave de unicidade: sem acento, sem espaço, minúsculo. */
export function nameKey(raw: string): string {
  return normalizeName(raw).replace(/ /g, '');
}

/** `maria da silva` -> `Maria Da Silva`. */
function capitalize(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function hasBlockedTerm(flat: string): boolean {
  for (const term of BLOCKED_ANYWHERE) {
    if (flat.includes(term)) return true;
  }
  for (const term of BLOCKED_WORD) {
    if (new RegExp(`\\b${term}\\b`).test(flat)) return true;
  }
  return false;
}

/**
 * Valida e normaliza um nome de personagem.
 *
 * NÃO checa unicidade — isso depende do banco e é feito por quem chama
 * (o servidor consulta `nameKey` no store antes de criar).
 */
export function checkName(raw: string): NameCheck {
  const trimmed = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return { ok: false, name: '', reason: 'vazio', message: 'Escolha um nome.' };
  }
  if (/\d/.test(trimmed)) {
    return {
      ok: false, name: trimmed, reason: 'caractere',
      message: 'O nome não pode ter números.',
    };
  }
  if (!LETTERS_ONLY.test(trimmed)) {
    return {
      ok: false, name: trimmed, reason: 'caractere',
      message: 'Use apenas letras — sem acentos, números ou símbolos.',
    };
  }
  if (trimmed.length < NAME_MIN) {
    return {
      ok: false, name: trimmed, reason: 'curto',
      message: `O nome precisa de pelo menos ${NAME_MIN} letras.`,
    };
  }
  if (trimmed.length > NAME_MAX) {
    return {
      ok: false, name: trimmed, reason: 'longo',
      message: `O nome pode ter no máximo ${NAME_MAX} caracteres.`,
    };
  }
  const words = trimmed.split(' ');
  if (words.length > NAME_MAX_WORDS) {
    return {
      ok: false, name: trimmed, reason: 'palavras',
      message: `No máximo ${NAME_MAX_WORDS} palavras.`,
    };
  }
  if (words.some((w) => w.length < 2)) {
    return {
      ok: false, name: trimmed, reason: 'espaco',
      message: 'Cada palavra do nome precisa de pelo menos 2 letras.',
    };
  }

  const flat = normalizeName(trimmed);
  if (hasBlockedTerm(flat)) {
    return {
      ok: false, name: trimmed, reason: 'ofensivo',
      message: 'Esse nome não é permitido. Escolha outro.',
    };
  }
  if (RESERVED.includes(flat)) {
    return {
      ok: false, name: trimmed, reason: 'reservado',
      message: 'Esse nome é reservado pelo jogo.',
    };
  }

  return { ok: true, name: capitalize(trimmed.toLowerCase()) };
}
