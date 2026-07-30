/**
 * Schema do banco (etapa 7 — persistência e contas).
 *
 * A DECISÃO ESTRUTURAL desta etapa é a separação CONTA × PERSONAGEM, que vem
 * direto do cap. 40 do GDD (`DD-MAP-009` / `DD-MAP-010`):
 *
 *   CONTA      -> geografia descoberta, marcadores, anotações
 *   PERSONAGEM -> nível, quest, chave, item, PONTO DE RESPAWN
 *
 * É por isso que `account_discovery` pende da conta e `character_town` pende do
 * personagem: um Lv.300 revela o mapa para a conta inteira, mas o Lv.15 que ele
 * criar depois ainda precisa ANDAR até a cidade para poder renascer lá
 * (regra do dono, 2026-07-28 + `40.21`).
 *
 * Migrações: `user_version` do SQLite. Cada versão é um passo idempotente.
 */

export const SCHEMA_VERSION = 4;

/**
 * v2 — Profissões (`DD-PROF-023`).
 *
 * Uma coluna JSON em vez de tabela própria: `DD-PROF-004` fecha que **não há
 * limite de profissões** por personagem, então a forma final é um mapa
 * `profissão -> { level, xp }` que cresce sem migração nova a cada ofício.
 *
 * `ALTER TABLE ... ADD COLUMN` com DEFAULT é idempotente na prática porque o
 * passo só roda quando `user_version` está abaixo de 2 — personagens que já
 * existem entram com o mapa vazio, ou seja, nenhuma profissão iniciada.
 */
export const SCHEMA_V2 = `
ALTER TABLE character ADD COLUMN professions TEXT NOT NULL DEFAULT '{}';
`;

/**
 * v3 — Banco (pedido do dono, 2026-07-30).
 *
 * Uma coluna, não uma tabela: o banco guarda **só ouro**, um número por
 * personagem. Tabela própria só se um dia ele guardar itens — e aí seria outro
 * sistema, mais próximo do Depósito (`DD` do cap. 19: *"CASA ≠ BANCO"*).
 *
 * DEFAULT 0 resolve os personagens que já existem: entram com o banco vazio.
 */
export const SCHEMA_V3 = `
ALTER TABLE character ADD COLUMN bank_gold INTEGER NOT NULL DEFAULT 0;
`;

/**
 * v4 — Lista de amigos (pedido do dono, 2026-07-30).
 *
 * ⚠️ **Sistema sem respaldo documental.** Não aparece em nenhum dos quatro
 * documentos. O dono decidiu o escopo: **da CONTA**, o mesmo de
 * `account_discovery` e `account_marker` — e é por isso que a tabela pende de
 * `account`, não de `character`.
 *
 * 🔴 **A amizade aponta para a CONTA, mas guarda o NOME com que foi feita.**
 * As duas colunas parecem redundantes e não são: `friend_account_id` é o que
 * decide "está online?" (vale para qualquer personagem daquela conta);
 * `added_name` é o que a lista mostra, porque o jogador adicionou *o Thorgar*, e
 * ver a lista virar outro nome quando o amigo troca de personagem seria perder
 * a única referência que ele tem.
 *
 * Não-recíproca de propósito: A ter B na lista não põe A na lista de B. Amizade
 * mútua exigiria aceite, e aceite é notificação, fila e recusa — sistema inteiro
 * que ninguém pediu. Aqui é marcador pessoal, como o `account_marker`.
 *
 * `ON DELETE CASCADE` nos dois lados: apagar qualquer uma das contas leva a
 * linha junto, senão a lista mostraria amigo que não existe mais.
 */
export const SCHEMA_V4 = `
CREATE TABLE IF NOT EXISTS account_friend (
  account_id        INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  friend_account_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  added_name        TEXT    NOT NULL,
  added_at          INTEGER NOT NULL,
  PRIMARY KEY (account_id, friend_account_id)
);
CREATE INDEX IF NOT EXISTS ix_friend_account ON account_friend(account_id);
`;

export const SCHEMA_V1 = `
-- ---------------------------------------------------------------- CONTA ----
CREATE TABLE IF NOT EXISTS account (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL,
  username_key  TEXT    NOT NULL UNIQUE,   -- minúsculo, para login case-insensitive
  pass_hash     TEXT    NOT NULL,
  pass_salt     TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

-- Geografia descoberta. PERTENCE À CONTA (DD-MAP-009).
-- Um registro por (andar, chunk); "bits" é um bitmap dos tiles revelados.
CREATE TABLE IF NOT EXISTS account_discovery (
  account_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  floor      INTEGER NOT NULL,
  chunk_x    INTEGER NOT NULL,
  chunk_y    INTEGER NOT NULL,
  bits       BLOB    NOT NULL,
  PRIMARY KEY (account_id, floor, chunk_x, chunk_y)
);

-- Marcadores pessoais. Também da CONTA (DD-MAP-014) — e NÃO acompanham
-- mapas vendidos a outro jogador (DD-MAP-015).
CREATE TABLE IF NOT EXISTS account_marker (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  floor      INTEGER NOT NULL,
  x          INTEGER NOT NULL,
  y          INTEGER NOT NULL,
  icon       TEXT    NOT NULL,   -- perigo | hunt | dungeon | minerio | mvp
  note       TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_marker_account ON account_marker(account_id);

-- ----------------------------------------------------------- PERSONAGEM ----
CREATE TABLE IF NOT EXISTS character (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id     INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  name_key       TEXT    NOT NULL UNIQUE,  -- sem acento/espaço/caixa: unicidade
  class          TEXT    NOT NULL,
  gender         TEXT    NOT NULL,

  level          INTEGER NOT NULL,
  xp             INTEGER NOT NULL,
  unspent_points INTEGER NOT NULL,
  talent_points  INTEGER NOT NULL,
  attributes     TEXT    NOT NULL,         -- JSON {str,vit,agi,dex,int,wis,luk}

  skill_kind     TEXT    NOT NULL,
  skill_level    INTEGER NOT NULL,
  skill_progress INTEGER NOT NULL,

  hp             REAL    NOT NULL,
  mana           REAL    NOT NULL,
  gold           INTEGER NOT NULL,

  tile_x         INTEGER NOT NULL,
  tile_y         INTEGER NOT NULL,
  floor          INTEGER NOT NULL,

  -- Ponto de renascimento ATUAL. Começa no vilarejo; só vira a cidade grande
  -- depois de o personagem visitá-la fisicamente (regra do dono).
  respawn_town   TEXT    NOT NULL,

  skill_points   INTEGER NOT NULL,
  skill_resets   INTEGER NOT NULL,
  skill_levels   TEXT    NOT NULL,         -- JSON
  proficiencies  TEXT    NOT NULL,         -- JSON
  bestiary       TEXT    NOT NULL,         -- JSON

  created_at     INTEGER NOT NULL,
  last_played_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_character_account ON character(account_id);

-- Itens: mochila, depósito e equipamento na MESMA tabela, separados pela
-- coluna "container". Evita três tabelas quase idênticas.
--   backpack/depot -> slot = índice numérico
--   equipment      -> slot = -1 e a coluna "equip_slot" diz qual peça
CREATE TABLE IF NOT EXISTS character_item (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  container    TEXT    NOT NULL,           -- backpack | depot | equipment
  slot         INTEGER NOT NULL,
  equip_slot   TEXT,
  item_kind    TEXT    NOT NULL,
  amount       INTEGER NOT NULL,
  roll         TEXT                        -- JSON do ItemRoll (raridade/passivos)
);
CREATE INDEX IF NOT EXISTS ix_item_character ON character_item(character_id);

-- Cidades/vilarejos que ESTE personagem já visitou fisicamente. É o que
-- desbloqueia o respawn (progressão do personagem, não da conta — 40.21).
CREATE TABLE IF NOT EXISTS character_town (
  character_id INTEGER NOT NULL REFERENCES character(id) ON DELETE CASCADE,
  town         TEXT    NOT NULL,
  visited_at   INTEGER NOT NULL,
  PRIMARY KEY (character_id, town)
);
`;
