/**
 * Dados de mundo em ARQUIVO — `shared/data/world/*.json`.
 *
 * ## Por que isto não mora em código
 *
 * O **Elysia Map Editor** (passo 6 do plano de mundo) vai deixar o dono editar à
 * mão spawn de monstro, NPC e nó de coleta, vendo o mapa inteiro. Se essas três
 * coisas ficassem em TypeScript, a próxima geração do mundo — ou o próximo
 * agente reescrevendo um trecho — apagaria em silêncio o que ele posicionou.
 * Como arquivo de dados versionado, o que ele mudar aparece no diff e sobrevive.
 *
 * 🔴 **O TERRENO continua em código** (`worldgen.ts`), e não é incoerência: ele
 * é gerado deterministicamente pelos dois lados e **não trafega pela rede** — é
 * o que sustenta "nós de recurso são entidades, não tiles". Terreno em arquivo
 * viraria mais um par de coisas para manter iguais.
 *
 * ## Validação
 *
 * O JSON entra como `string`/`number` cru, e nada garante que "vendor" ainda é
 * um papel válido. Cada lista é conferida na carga e **um dado inválido derruba
 * o boot**, com o nome do arquivo e o índice do item. É de propósito: um NPC com
 * papel errado que passasse batido viraria um boneco mudo na praça, e ninguém
 * ligaria o defeito ao arquivo que o causou.
 *
 * ⚠️ O `type` das criaturas **não** é validado aqui — `CREATURES` mora em
 * `combat.ts`, que importa deste módulo pela cadeia do mapa. Quem valida é
 * `spawnInitialCreatures`, no servidor, que já tem a tabela em mãos.
 */

import type { NpcRole } from './tiles.js';
import type { NodeKind } from './gathering.js';

import npcsJson from '../data/world/npcs.json' with { type: 'json' };
import creaturesJson from '../data/world/creatures.json' with { type: 'json' };
import nodesJson from '../data/world/nodes.json' with { type: 'json' };

export interface WorldNpc {
  name: string;
  x: number;
  y: number;
  floor: number;
  role: NpcRole;
}

export interface WorldCreatureSpawn {
  type: string;
  x: number;
  y: number;
}

export interface WorldNodeSpot {
  kind: NodeKind;
  x: number;
  y: number;
}

const NPC_ROLES: readonly string[] = ['vendor', 'bank', 'blacksmith'];

/**
 * Famílias que podem ser postas à mão.
 *
 * 🔴 `wood` fica de fora: nó de madeira mora **em cima de um tile de árvore**, e
 * a árvore é decoração gerada. Escrever madeira aqui daria um machado fincado no
 * chão — e, pior, um nó que muda de sentido se a semente do mundo mudar.
 */
const NODE_KINDS_A_MAO: readonly string[] = ['ore', 'herb', 'mushroom', 'crystal'];

function erro(arquivo: string, i: number, msg: string): never {
  throw new Error(`shared/data/world/${arquivo}: item ${i} — ${msg}`);
}

function inteiro(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

export const WORLD_NPCS: WorldNpc[] = npcsJson.npcs.map((n, i) => {
  if (typeof n.name !== 'string' || !n.name) erro('npcs.json', i, 'nome vazio');
  if (!inteiro(n.x) || !inteiro(n.y) || !inteiro(n.floor)) {
    erro('npcs.json', i, `posição inválida (${n.x},${n.y},${n.floor})`);
  }
  if (!NPC_ROLES.includes(n.role)) {
    erro('npcs.json', i, `papel "${n.role}" não existe (válidos: ${NPC_ROLES.join(', ')})`);
  }
  return { name: n.name, x: n.x, y: n.y, floor: n.floor, role: n.role as NpcRole };
});

export const WORLD_CREATURE_SPAWNS: WorldCreatureSpawn[] = creaturesJson.spawns.map((s, i) => {
  if (typeof s.type !== 'string' || !s.type) erro('creatures.json', i, 'tipo vazio');
  if (!inteiro(s.x) || !inteiro(s.y)) erro('creatures.json', i, `posição inválida (${s.x},${s.y})`);
  return { type: s.type, x: s.x, y: s.y };
});

export const WORLD_NODES: WorldNodeSpot[] = nodesJson.nodes.map((n, i) => {
  if (!NODE_KINDS_A_MAO.includes(n.kind)) {
    erro('nodes.json', i, `família "${n.kind}" não pode ser posta à mão (válidas: ${NODE_KINDS_A_MAO.join(', ')})`);
  }
  if (!inteiro(n.x) || !inteiro(n.y)) erro('nodes.json', i, `posição inválida (${n.x},${n.y})`);
  return { kind: n.kind as NodeKind, x: n.x, y: n.y };
});
