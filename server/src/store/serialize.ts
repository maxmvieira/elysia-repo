/**
 * Tradução entre o Player em memória (runtime) e a linha do banco.
 *
 * Fica separado de propósito: o `Player` do servidor carrega coisas que NÃO
 * devem ser persistidas (socket, cooldowns, alvo atual, fúria em andamento) e
 * o banco carrega coisas que o runtime não precisa (ids de linha). Misturar os
 * dois é como o save de um MMO começa a gravar lixo.
 *
 * O tipo `Persistable` é ESTRUTURAL: o `Player` de `index.ts` o satisfaz sem
 * precisar importar nada daqui, e este módulo não precisa conhecer o Player
 * inteiro.
 */

import type {
  Attributes, BestiaryState, EquipSlot, ItemStack, PlayerClass,
  Proficiencies, Professions, SkillLevels, SkillState,
} from '@dominion/shared';
import { EQUIP_SLOTS, sanitizeOutfit } from '@dominion/shared';
import type { StoredCharacter, StoredItem } from './store.js';

/** O recorte do Player que realmente vai para o banco. */
export interface Persistable {
  name: string;
  gender: string;
  attributes: Attributes;
  skill: SkillState;
  level: number;
  xp: number;
  /** Nível e XP de JOB (v11). Não concede Skill Point. */
  jobLevel: number;
  jobXp: number;
  unspentPoints: number;
  talentPoints: number;
  hp: number;
  mana: number;
  gold: number;
  /** Ouro no Banco (fora da mochila). */
  bankGold: number;
  backpack: (ItemStack | null)[];
  equipment: Partial<Record<EquipSlot, ItemStack>>;
  /**
   * 🏹 A ALJAVA. Entrou em 11/09.
   *
   * ⚠️ **Não precisou de migração**: `character_item.container` já era TEXT com
   * três valores (`backpack | depot | equipment`), e a aljava é o quarto. Foi
   * sorte do desenho de quem escreveu a tabela — a alternativa histórica, três
   * tabelas quase iguais, teria custado uma quarta.
   */
  quiver: (ItemStack | null)[];
  depot: (ItemStack | null)[];
  tileX: number;
  tileY: number;
  floor: number;
  skillPoints: number;
  skillLevels: SkillLevels;
  skillResets: number;
  proficiencies: Proficiencies;
  bestiary: BestiaryState;
  /**
   * Níveis de profissão (`DD-PROF-004`: sem limite de profissões, daí o mapa).
   *
   * A coluna existe no banco desde a migração v2, mas ficou **órfã** até agora —
   * nada lia nem gravava, então subir Ferreiro e relogar perdia tudo.
   */
  professions: Professions;
  /**
   * Cores do outfit (`docs/PLANO-OUTFITS.md`). `undefined` = arte original.
   *
   * ⚠️ COSMÉTICO — `13.10` do Doc 1: aparência **nunca** altera estatística.
   * Está no `Persistable` porque é do PERSONAGEM, não da conta: dois
   * personagens da mesma conta têm cores próprias.
   */
  outfit?: number[];
}

/** Achata mochila + depósito + equipamento numa lista de linhas. */
function itemsToRows(p: Persistable): StoredItem[] {
  const rows: StoredItem[] = [];
  p.backpack.forEach((it, slot) => {
    if (it) {
      rows.push({
        container: 'backpack', slot, equipSlot: null,
        kind: it.kind, amount: it.amount,
        roll: it.roll ? JSON.stringify(it.roll) : null,
      });
    }
  });
  p.quiver.forEach((it, slot) => {
    if (it) {
      rows.push({
        container: 'quiver', slot, equipSlot: null,
        kind: it.kind, amount: it.amount,
        roll: it.roll ? JSON.stringify(it.roll) : null,
      });
    }
  });
  p.depot.forEach((it, slot) => {
    if (it) {
      rows.push({
        container: 'depot', slot, equipSlot: null,
        kind: it.kind, amount: it.amount,
        roll: it.roll ? JSON.stringify(it.roll) : null,
      });
    }
  });
  for (const slot of EQUIP_SLOTS) {
    const it = p.equipment[slot];
    if (it) {
      rows.push({
        container: 'equipment', slot: -1, equipSlot: slot,
        kind: it.kind, amount: it.amount,
        roll: it.roll ? JSON.stringify(it.roll) : null,
      });
    }
  }
  return rows;
}

/** Remonta os QUATRO contêineres a partir das linhas. */
export function rowsToItems(
  rows: StoredItem[],
  backpackSize: number,
  depotSize: number,
  quiverSize: number,
): {
  backpack: (ItemStack | null)[];
  depot: (ItemStack | null)[];
  quiver: (ItemStack | null)[];
  equipment: Partial<Record<EquipSlot, ItemStack>>;
} {
  const backpack: (ItemStack | null)[] = Array(backpackSize).fill(null);
  const depot: (ItemStack | null)[] = Array(depotSize).fill(null);
  const quiver: (ItemStack | null)[] = Array(quiverSize).fill(null);
  const equipment: Partial<Record<EquipSlot, ItemStack>> = {};

  for (const r of rows) {
    const stack: ItemStack = {
      kind: r.kind,
      amount: r.amount,
      ...(r.roll ? { roll: JSON.parse(r.roll) } : {}),
    };
    if (r.container === 'backpack') {
      // Slot fora da faixa (mochila encolheu entre versões): joga no 1º livre,
      // em vez de perder o item calado.
      if (r.slot >= 0 && r.slot < backpack.length) backpack[r.slot] = stack;
      else {
        const livre = backpack.indexOf(null);
        if (livre >= 0) backpack[livre] = stack;
      }
    } else if (r.container === 'quiver') {
      /*
       * ⚠️ Munição que não cabe mais (o jogador desequipou a aljava entre uma
       * sessão e outra, ou trocou por uma menor) NÃO se perde em silêncio: vai
       * para o primeiro slot livre da mochila. Mesma regra da mochila que
       * encolheu, logo acima.
       */
      if (r.slot >= 0 && r.slot < quiver.length) quiver[r.slot] = stack;
      else {
        const livre = backpack.indexOf(null);
        if (livre >= 0) backpack[livre] = stack;
      }
    } else if (r.container === 'depot') {
      if (r.slot >= 0 && r.slot < depot.length) depot[r.slot] = stack;
      else {
        const livre = depot.indexOf(null);
        if (livre >= 0) depot[livre] = stack;
      }
    } else if (r.container === 'equipment' && r.equipSlot) {
      equipment[r.equipSlot as EquipSlot] = stack;
    }
  }
  return { backpack, depot, quiver, equipment };
}

/** Player em memória -> retrato para gravar. */
export function toStored(
  p: Persistable,
  id: number,
  accountId: number,
  cls: PlayerClass,
  respawnTown: string,
  visitedTowns: string[],
): StoredCharacter {
  return {
    id,
    accountId,
    name: p.name,
    cls,
    gender: p.gender,
    level: p.level,
    xp: p.xp,
    jobLevel: p.jobLevel,
    jobXp: p.jobXp,
    unspentPoints: p.unspentPoints,
    talentPoints: p.talentPoints,
    attributes: JSON.stringify(p.attributes),
    skillKind: p.skill.kind,
    skillLevel: p.skill.level,
    skillProgress: p.skill.progress,
    // HP/mana arredondados: gravar 143.7429 não ajuda ninguém e polui o diff.
    hp: Math.round(p.hp),
    mana: Math.round(p.mana),
    gold: p.gold,
    bankGold: p.bankGold,
    tileX: p.tileX,
    tileY: p.tileY,
    floor: p.floor,
    respawnTown,
    skillPoints: p.skillPoints,
    skillResets: p.skillResets,
    skillLevels: JSON.stringify(p.skillLevels),
    proficiencies: JSON.stringify(p.proficiencies),
    bestiary: JSON.stringify(p.bestiary),
    professions: JSON.stringify(p.professions),
    outfit: JSON.stringify(p.outfit ?? []),
    items: itemsToRows(p),
    visitedTowns,
  };
}

/** Campos soltos do banco, prontos para aplicar num Player. */
export function fromStored(c: StoredCharacter): {
  attributes: Attributes;
  skill: SkillState;
  skillLevels: SkillLevels;
  proficiencies: Proficiencies;
  bestiary: BestiaryState;
  professions: Professions;
  outfit: number[] | undefined;
} {
  return {
    attributes: JSON.parse(c.attributes) as Attributes,
    skill: {
      kind: c.skillKind as SkillState['kind'],
      level: c.skillLevel,
      progress: c.skillProgress,
    },
    skillLevels: JSON.parse(c.skillLevels) as SkillLevels,
    proficiencies: JSON.parse(c.proficiencies) as Proficiencies,
    bestiary: JSON.parse(c.bestiary) as BestiaryState,
    // Personagem criado antes da migração v2 tem a coluna com o DEFAULT '{}',
    // mas um save corrompido ou vazio não pode derrubar o login — daí o fallback.
    professions: JSON.parse(c.professions || '{}') as Professions,
    // 🔴 O outfit volta do banco pela MESMA peneira por onde entrou. Ele é a
    // única coisa aqui que veio do cliente, e uma linha antiga (ou editada à
    // mão) não pode virar cor inválida no snapshot. `sanitizeOutfit` é
    // idempotente, e há teste travando isso.
    outfit: sanitizeOutfit(parseOuVazio(c.outfit)),
  };
}

/** JSON que não parseia vira `[]` — save torto não pode derrubar o login. */
function parseOuVazio(bruto: string | undefined): unknown {
  try {
    return JSON.parse(bruto || '[]');
  } catch {
    return [];
  }
}
