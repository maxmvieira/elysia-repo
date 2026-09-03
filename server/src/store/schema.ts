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

export const SCHEMA_VERSION = 10;

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

/**
 * v5 — Outfit: as cores escolhidas para o personagem.
 *
 * Uma coluna JSON, e não três colunas de cor, pelo mesmo motivo do `professions`
 * da v2: **o número de grupos coloríveis é por CLASSE e pode mudar** quando a
 * arte mudar. `OUTFIT_MAX_GRUPOS` é 3 hoje porque foi isso que a medição dos
 * quatro packs achou; virar 4 amanhã não deve exigir migração nova.
 *
 * 🔴 **`'[]'` é o padrão, e significa "cor original da arte"** — não "preto".
 * Personagem que já existe entra sem outfit e continua com a aparência de
 * sempre, que é a única migração honesta para quem nunca escolheu nada.
 *
 * ⚠️ É COSMÉTICO. `13.10` do Doc 1: aparência nunca altera estatística. Nada
 * que leia esta coluna pode entrar em cálculo de combate.
 */
export const SCHEMA_V5 = `
ALTER TABLE character ADD COLUMN outfit TEXT NOT NULL DEFAULT '[]';
`;

/**
 * v6 — Edições de mundo (o `/remove`, pedido do dono em 31/08).
 *
 * 🔴 **Por que no banco e não num JSON em `shared/data/`**, que seria o vizinho
 * natural do `farm.json`: aquele diretório está sob o observador do `tsx watch`
 * e do Vite. Foi visto em tela nesta sessão — regravar o `farm.json` derrubou e
 * subiu o servidor e recarregou a página. Com as edições lá, cada `/remove`
 * custaria um restart e a queda de quem estivesse online, num comando cujo
 * propósito é ajustar o cenário **enquanto se joga**.
 *
 * 🔴 **A tabela é do MUNDO, não da conta nem do personagem** — e é a primeira
 * assim. Apagar uma árvore apaga para todo mundo: é autoria de cenário, não
 * progresso de ninguém. Por isso não há `account_id` aqui, e por isso ela não
 * some quando a conta some.
 *
 * `tile_antes` é o que o `/restaura` devolve. Sem ela, desfazer exigiria
 * recalcular o `worldgen` para aquela célula — o que funciona hoje e deixaria de
 * funcionar no instante em que a geração mudasse, transformando um "desfazer" em
 * "trocar por outra coisa qualquer".
 */
export const SCHEMA_V6 = `
CREATE TABLE IF NOT EXISTS world_edit (
  floor      INTEGER NOT NULL,
  x          INTEGER NOT NULL,
  y          INTEGER NOT NULL,
  tile       INTEGER NOT NULL,
  tile_antes INTEGER NOT NULL,
  edited_at  INTEGER NOT NULL,
  edited_by  TEXT    NOT NULL,
  PRIMARY KEY (floor, x, y)
);
`;

/**
 * v7 — De qual célula a arte foi copiada (o `/paste`, pedido do dono em 31/08).
 *
 * Duas colunas anuláveis na tabela que a v6 criou. `NULL` quer dizer "célula
 * apagada" (o `/remove`); preenchidas, "célula que recebeu a arte daquela outra"
 * (o `/paste`).
 *
 * 🔴 **É a distinção que o `farmDesenhaCelula` consulta**, e ela precisa ser
 * PERSISTIDA e não inferida: sem estas colunas, ao reabrir o servidor toda
 * colagem viraria uma remoção — a fazenda pararia de desenhar as células coladas
 * e elas virariam buraco de grama. O bug só apareceria no restart seguinte, que
 * é o pior momento para descobrir.
 */
export const SCHEMA_V7 = `
ALTER TABLE world_edit ADD COLUMN arte_x INTEGER;
ALTER TABLE world_edit ADD COLUMN arte_y INTEGER;
`;

/**
 * v8 — Objetos posicionados pelo construtor de mapas (pedido do dono em 31/08).
 *
 * 🔴 **Tabela separada da `world_edit`, e a razão é a CHAVE.** Uma edição de tile
 * é única por célula: editar duas vezes o mesmo lugar é uma linha só, porque um
 * tile tem um tipo. Um decalque é o contrário — o valor dele é poder **empilhar**
 * (uma pedra sobre a grama, a hélice sobre a pedra). Chave por célula mataria
 * exatamente o que o comando existe para fazer, então aqui a chave é um id
 * próprio e a célula é só mais uma coluna.
 *
 * A ordem de desenho dentro de uma mesma célula e camada é a de INSERÇÃO
 * (`id` crescente): quem coloca depois fica por cima, que é o que a mão espera.
 *
 * ⚠️ `paleta` é um índice na folha `farm-paleta.png` — ver `WorldDecal`.
 */
export const SCHEMA_V8 = `
CREATE TABLE IF NOT EXISTS world_decal (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  floor     INTEGER NOT NULL,
  x         INTEGER NOT NULL,
  y         INTEGER NOT NULL,
  paleta    INTEGER NOT NULL,
  rot       INTEGER NOT NULL,
  camada    TEXT    NOT NULL,
  placed_at INTEGER NOT NULL,
  placed_by TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_decal_cel ON world_decal(floor, x, y);
`;

/**
 * v9 — O que o decalque faz com o passo (pedido do dono em 31/08).
 *
 * Uma coluna anulável. `NULL` ou `'nada'` = enfeite; `'bloqueia'` / `'livre'` = a
 * colocação também gravou uma `world_edit` naquela célula.
 *
 * 🔴 **A coluna existe para o `/undo`, não para desenhar.** Sem ela, desfazer o
 * decalque tiraria o desenho e deixaria a parede invisível para trás — o pior
 * resultado possível, porque nada em tela denuncia o que sobrou.
 */
export const SCHEMA_V9 = `
ALTER TABLE world_decal ADD COLUMN colisao TEXT;
`;

/**
 * v10 — EXCLUSÃO DE PERSONAGEM COM ARREPENDIMENTO.
 *
 * 🔴 `delete_at` é QUANDO o personagem morre de vez, não uma marca de
 * "apagado". Nulo = vivo. Preenchido = a conta pediu a exclusão e tem até
 * aquele instante para desistir.
 *
 * ⚠️ Guardar o INSTANTE, e não um sinalizador, é o que faz o prazo sobreviver a
 * reinício do servidor: o varredor compara com `Date.now()` e não depende de
 * nenhum temporizador ter ficado vivo.
 */
export const SCHEMA_V10 = `
ALTER TABLE character ADD COLUMN delete_at INTEGER;
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
