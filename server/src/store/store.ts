/**
 * Camada de persistência (etapa 7).
 *
 * ESCOLHA DE BANCO — leia antes de mexer:
 * O roadmap dizia "PostgreSQL". A máquina de desenvolvimento não tem Postgres
 * nem Docker, e exigir um dos dois faria o servidor parar de subir — regressão
 * pior que a falta de persistência. O Node 24 traz `node:sqlite` EMBUTIDO, sem
 * dependência nenhuma, com arquivo único e persistência real.
 *
 * Então: SQLite agora, atrás da interface `Store`. Todo acesso a banco passa
 * por aqui — trocar para Postgres depois é escrever um segundo `Store`, sem
 * tocar no servidor. Quando o alvo de 500 jogadores/servidor se aproximar, a
 * troca vale a pena; hoje ela só adicionaria fricção.
 *
 * `DATABASE_PATH` muda o arquivo (padrão: `server/data/elysia.db`).
 */

import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { nameKey, type WorldEdit, type WorldDecal } from '@dominion/shared';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3, SCHEMA_V4, SCHEMA_V5, SCHEMA_V6, SCHEMA_V7, SCHEMA_V8, SCHEMA_V9, SCHEMA_VERSION } from './schema.js';

// --------------------------------------------------------------- Tipos ----

/** Item persistido, já achatado para uma linha. */
export interface StoredItem {
  container: 'backpack' | 'depot' | 'equipment';
  slot: number;
  equipSlot: string | null;
  kind: string;
  amount: number;
  /** JSON do ItemRoll, ou null. */
  roll: string | null;
}

/** Retrato completo de um personagem, do jeito que vai para o banco. */
export interface StoredCharacter {
  id: number;
  accountId: number;
  name: string;
  cls: string;
  gender: string;
  level: number;
  xp: number;
  unspentPoints: number;
  talentPoints: number;
  attributes: string;
  skillKind: string;
  skillLevel: number;
  skillProgress: number;
  hp: number;
  mana: number;
  gold: number;
  /** Ouro guardado no Banco. Só número: o Banco não guarda item. */
  bankGold: number;
  tileX: number;
  tileY: number;
  floor: number;
  respawnTown: string;
  skillPoints: number;
  skillResets: number;
  skillLevels: string;
  proficiencies: string;
  bestiary: string;
  /** JSON do mapa de profissões (`DD-PROF-004`). */
  professions: string;
  /**
   * JSON das cores do outfit — `'[]'` = arte com a cor original.
   *
   * ⚠️ **OPCIONAL de propósito.** Coluna nova (v5) não pode quebrar quem monta
   * um `StoredCharacter` sem saber dela: ausente vira `'[]'` no `INSERT`, que é
   * exatamente "sem outfit". Exigir o campo fez 15 testes caírem com
   * *"cannot be bound to SQLite parameter 28"* — e o erro estava em exigir, não
   * nos testes.
   *
   * ⚠️ COSMÉTICO (`13.10`): nunca entra em cálculo de nada.
   */
  outfit?: string;
  items: StoredItem[];
  visitedTowns: string[];
}

/** O que aparece na tela de seleção, antes de carregar o personagem inteiro. */
export interface CharacterSummary {
  id: number;
  name: string;
  cls: string;
  gender: string;
  level: number;
  lastPlayedAt: number;
}

export interface Account {
  id: number;
  username: string;
}

export type AuthResult =
  | { ok: true; account: Account }
  | { ok: false; reason: 'nao_existe' | 'senha' | 'ja_existe' | 'invalido'; message: string };

// ----------------------------------------------------------- Utilidades ----

const KEYLEN = 64;

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, KEYLEN).toString('hex');
}

function passwordMatches(password: string, salt: string, expected: string): boolean {
  const got = Buffer.from(hashPassword(password, salt), 'hex');
  const want = Buffer.from(expected, 'hex');
  // Comprimentos diferentes -> timingSafeEqual joga. Compara antes.
  if (got.length !== want.length) return false;
  return timingSafeEqual(got, want);
}

// --------------------------------------------------------------- Store ----

export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    const row = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
    const current = row?.user_version ?? 0;
    if (current < 1) {
      this.db.exec(SCHEMA_V1);
    }
    // ⚠️ **A v2 verifica a COLUNA, não o `user_version`.**
    //
    // Confiar só no número já falhou na prática: o banco ficou marcado como v2
    // sem a coluna existir, e aí todo `INSERT` quebraria em produção com
    // "no such column". Um `ALTER TABLE ADD COLUMN` não é transacional junto do
    // `PRAGMA`, então qualquer interrupção entre os dois (um reinício do
    // `tsx watch`, por exemplo) deixa o banco mentindo sobre o próprio estado.
    //
    // Checar o schema de verdade torna o passo idempotente e auto-corretivo:
    // roda quando falta, não roda quando já está lá, e conserta banco que ficou
    // no meio do caminho.
    if (!this.hasColumn('character', 'professions')) {
      this.db.exec(SCHEMA_V2);
    }
    // v3 pelo mesmo padrão auto-verificável, e pelo mesmo motivo: número de
    // versão sozinho mente (ver o comentário acima).
    if (!this.hasColumn('character', 'bank_gold')) {
      this.db.exec(SCHEMA_V3);
    }
    // v4 (amigos) é TABELA nova, não coluna — daí `hasTable`. O `CREATE TABLE IF
    // NOT EXISTS` já seria idempotente sozinho, mas passar pelo mesmo portão das
    // outras mantém uma regra só para todas as migrações: quem decide é o
    // schema, nunca o número de versão.
    if (!this.hasTable('account_friend')) {
      this.db.exec(SCHEMA_V4);
    }
    // v5 (outfit), mesmo portão: quem decide é o schema, nunca o número.
    if (!this.hasColumn('character', 'outfit')) {
      this.db.exec(SCHEMA_V5);
    }
    // v6 (edições de mundo): tabela nova, mesmo portão das outras.
    if (!this.hasTable('world_edit')) {
      this.db.exec(SCHEMA_V6);
    }
    // v7 (de onde a arte foi copiada): colunas novas, portão pelo schema.
    if (!this.hasColumn('world_edit', 'arte_x')) {
      this.db.exec(SCHEMA_V7);
    }
    // v8 (decalques do construtor de mapas): tabela nova, portão pelo schema.
    if (!this.hasTable('world_decal')) {
      this.db.exec(SCHEMA_V8);
    }
    // v9 (colisão do decalque): coluna nova, portão pelo schema.
    if (!this.hasColumn('world_decal', 'colisao')) {
      this.db.exec(SCHEMA_V9);
    }
    if (current !== SCHEMA_VERSION) {
      this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }
  }

  /**
   * Esta tabela tem esta coluna? Base das migrações auto-verificáveis.
   *
   * `PRAGMA table_info` não aceita parâmetro vinculado, daí a interpolação — os
   * argumentos aqui são sempre literais do próprio código, nunca entrada de
   * usuário.
   */
  private hasColumn(table: string, column: string): boolean {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some((r) => r.name === column);
  }

  /** Esta tabela existe? O `hasColumn` das migrações que criam tabela. */
  private hasTable(table: string): boolean {
    const row = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(table);
    return row !== undefined;
  }

  close(): void {
    this.db.close();
  }

  // ------------------------------------------------------------ Contas ----

  registerAccount(username: string, password: string): AuthResult {
    const user = (username ?? '').trim();
    if (user.length < 3 || user.length > 24) {
      return { ok: false, reason: 'invalido', message: 'O usuário precisa ter de 3 a 24 caracteres.' };
    }
    if (!/^[A-Za-z0-9_]+$/.test(user)) {
      return { ok: false, reason: 'invalido', message: 'Usuário: apenas letras, números e _.' };
    }
    if ((password ?? '').length < 6) {
      return { ok: false, reason: 'invalido', message: 'A senha precisa de pelo menos 6 caracteres.' };
    }
    const key = user.toLowerCase();
    const exists = this.db.prepare('SELECT id FROM account WHERE username_key = ?').get(key);
    if (exists) {
      return { ok: false, reason: 'ja_existe', message: 'Esse usuário já existe.' };
    }
    const salt = randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const now = Date.now();
    const info = this.db
      .prepare(
        `INSERT INTO account (username, username_key, pass_hash, pass_salt, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(user, key, hash, salt, now, now);
    return { ok: true, account: { id: Number(info.lastInsertRowid), username: user } };
  }

  login(username: string, password: string): AuthResult {
    const key = (username ?? '').trim().toLowerCase();
    const row = this.db
      .prepare('SELECT id, username, pass_hash, pass_salt FROM account WHERE username_key = ?')
      .get(key) as { id: number; username: string; pass_hash: string; pass_salt: string } | undefined;
    if (!row) {
      return { ok: false, reason: 'nao_existe', message: 'Usuário ou senha inválidos.' };
    }
    if (!passwordMatches(password ?? '', row.pass_salt, row.pass_hash)) {
      // Mensagem igual à de usuário inexistente: não entrega quais contas existem.
      return { ok: false, reason: 'senha', message: 'Usuário ou senha inválidos.' };
    }
    this.db.prepare('UPDATE account SET last_login_at = ? WHERE id = ?').run(Date.now(), row.id);
    return { ok: true, account: { id: row.id, username: row.username } };
  }

  /**
   * Conta pelo nome de usuário, **sem verificar senha**.
   *
   * 🔴 EXISTE PARA UMA COISA SÓ: o auto-login do servidor de desenvolvimento
   * (`ELYSIA_DEV=1`, `npm run dev:test`), que evita digitar senha a cada
   * recarga do Vite enquanto se testa a interface.
   *
   * ⚠️ **Nunca chame isto no caminho de autenticação de verdade.** É deliberado
   * que seja um método separado com nome feio, e não um parâmetro opcional de
   * `login()`: um `login(user, pass, { pularSenha: true })` seria uma linha de
   * distância de virar bypass em produção. Aqui, qualquer uso indevido salta aos
   * olhos em revisão.
   *
   * Quem protege o jogo é o chamador: o único é o `case 'auth'` do servidor,
   * atrás de `DEV_MODE`, que só é verdade quando `dev.ts` liga a flag.
   */
  contaSemSenhaParaDesenvolvimento(username: string): AuthResult {
    const key = (username ?? '').trim().toLowerCase();
    const row = this.db
      .prepare('SELECT id, username FROM account WHERE username_key = ?')
      .get(key) as { id: number; username: string } | undefined;
    if (!row) {
      return { ok: false, reason: 'nao_existe', message: 'Conta de desenvolvimento não existe.' };
    }
    this.db.prepare('UPDATE account SET last_login_at = ? WHERE id = ?').run(Date.now(), row.id);
    return { ok: true, account: { id: row.id, username: row.username } };
  }

  // ------------------------------------------------------- Personagens ----

  isNameTaken(name: string): boolean {
    const row = this.db.prepare('SELECT id FROM character WHERE name_key = ?').get(nameKey(name));
    return !!row;
  }

  listCharacters(accountId: number): CharacterSummary[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, class, gender, level, last_played_at
           FROM character WHERE account_id = ? ORDER BY last_played_at DESC`,
      )
      .all(accountId) as Array<{
        id: number; name: string; class: string; gender: string;
        level: number; last_played_at: number;
      }>;
    return rows.map((r) => ({
      id: r.id, name: r.name, cls: r.class, gender: r.gender,
      level: r.level, lastPlayedAt: r.last_played_at,
    }));
  }

  createCharacter(c: Omit<StoredCharacter, 'id'>): number {
    const now = Date.now();
    const info = this.db
      .prepare(
        `INSERT INTO character (
           account_id, name, name_key, class, gender,
           level, xp, unspent_points, talent_points, attributes,
           skill_kind, skill_level, skill_progress,
           hp, mana, gold, bank_gold, tile_x, tile_y, floor, respawn_town,
           skill_points, skill_resets, skill_levels, proficiencies, bestiary,
           professions, outfit,
           created_at, last_played_at
         ) VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?, ?,?,?,?,?,?,?,?, ?,?,?,?,?, ?,?, ?,?)`,
      )
      .run(
        c.accountId, c.name, nameKey(c.name), c.cls, c.gender,
        c.level, c.xp, c.unspentPoints, c.talentPoints, c.attributes,
        c.skillKind, c.skillLevel, c.skillProgress,
        c.hp, c.mana, c.gold, c.bankGold, c.tileX, c.tileY, c.floor, c.respawnTown,
        c.skillPoints, c.skillResets, c.skillLevels, c.proficiencies, c.bestiary,
        c.professions, c.outfit ?? '[]',
        now, now,
      );
    const id = Number(info.lastInsertRowid);
    this.replaceItems(id, c.items);
    for (const town of c.visitedTowns) this.markTownVisited(id, town);
    return id;
  }

  loadCharacter(id: number): StoredCharacter | null {
    const r = this.db.prepare('SELECT * FROM character WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    if (!r) return null;
    return {
      id: r.id as number,
      accountId: r.account_id as number,
      name: r.name as string,
      cls: r.class as string,
      gender: r.gender as string,
      level: r.level as number,
      xp: r.xp as number,
      unspentPoints: r.unspent_points as number,
      talentPoints: r.talent_points as number,
      attributes: r.attributes as string,
      skillKind: r.skill_kind as string,
      skillLevel: r.skill_level as number,
      skillProgress: r.skill_progress as number,
      hp: r.hp as number,
      mana: r.mana as number,
      gold: r.gold as number,
      // `?? 0` cobre a linha que existia antes da v3 e ainda não foi regravada.
      bankGold: (r.bank_gold as number) ?? 0,
      tileX: r.tile_x as number,
      tileY: r.tile_y as number,
      floor: r.floor as number,
      respawnTown: r.respawn_town as string,
      skillPoints: r.skill_points as number,
      skillResets: r.skill_resets as number,
      skillLevels: r.skill_levels as string,
      proficiencies: r.proficiencies as string,
      bestiary: r.bestiary as string,
      // Personagem criado antes da v2 tem o DEFAULT '{}'; o `?? '{}'` cobre o
      // caso de um banco onde a coluna foi adicionada sem default.
      professions: (r.professions as string) ?? '{}',
      // Personagem anterior à v5 tem o DEFAULT '[]' — sem outfit, cor original.
      outfit: (r.outfit as string) ?? '[]',
      items: this.loadItems(id),
      visitedTowns: this.visitedTowns(id),
    };
  }

  /** Grava o personagem inteiro. Itens são substituídos em bloco. */
  saveCharacter(c: StoredCharacter): void {
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `UPDATE character SET
             level=?, xp=?, unspent_points=?, talent_points=?, attributes=?,
             skill_kind=?, skill_level=?, skill_progress=?,
             hp=?, mana=?, gold=?, bank_gold=?, tile_x=?, tile_y=?, floor=?, respawn_town=?,
             skill_points=?, skill_resets=?, skill_levels=?, proficiencies=?, bestiary=?,
             professions=?,
             last_played_at=?
           WHERE id=?`,
        )
        .run(
          c.level, c.xp, c.unspentPoints, c.talentPoints, c.attributes,
          c.skillKind, c.skillLevel, c.skillProgress,
          c.hp, c.mana, c.gold, c.bankGold, c.tileX, c.tileY, c.floor, c.respawnTown,
          c.skillPoints, c.skillResets, c.skillLevels, c.proficiencies, c.bestiary,
          c.professions,
          Date.now(), c.id,
        );
      this.replaceItems(c.id, c.items);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  private replaceItems(characterId: number, items: StoredItem[]): void {
    this.db.prepare('DELETE FROM character_item WHERE character_id = ?').run(characterId);
    const ins = this.db.prepare(
      `INSERT INTO character_item (character_id, container, slot, equip_slot, item_kind, amount, roll)
       VALUES (?,?,?,?,?,?,?)`,
    );
    for (const it of items) {
      ins.run(characterId, it.container, it.slot, it.equipSlot, it.kind, it.amount, it.roll);
    }
  }

  private loadItems(characterId: number): StoredItem[] {
    const rows = this.db
      .prepare(
        `SELECT container, slot, equip_slot, item_kind, amount, roll
           FROM character_item WHERE character_id = ? ORDER BY container, slot`,
      )
      .all(characterId) as Array<{
        container: string; slot: number; equip_slot: string | null;
        item_kind: string; amount: number; roll: string | null;
      }>;
    return rows.map((r) => ({
      container: r.container as StoredItem['container'],
      slot: r.slot,
      equipSlot: r.equip_slot,
      kind: r.item_kind,
      amount: r.amount,
      roll: r.roll,
    }));
  }

  // ------------------------------------------------- Cidades visitadas ----

  /**
   * Marca que o personagem PISOU nesta cidade. É isto que desbloqueia usá-la
   * como ponto de renascimento — conhecer o mapa (conta) não basta (40.21).
   */
  markTownVisited(characterId: number, town: string): void {
    this.db
      .prepare('INSERT OR IGNORE INTO character_town (character_id, town, visited_at) VALUES (?,?,?)')
      .run(characterId, town, Date.now());
  }

  visitedTowns(characterId: number): string[] {
    const rows = this.db
      .prepare('SELECT town FROM character_town WHERE character_id = ? ORDER BY visited_at')
      .all(characterId) as Array<{ town: string }>;
    return rows.map((r) => r.town);
  }

  setRespawnTown(characterId: number, town: string): boolean {
    if (!this.visitedTowns(characterId).includes(town)) return false;
    this.db.prepare('UPDATE character SET respawn_town = ? WHERE id = ?').run(town, characterId);
    return true;
  }

  // ----------------------------------------------------------- Amigos ----
  // Escopo CONTA (decisão do dono, 2026-07-30). Ver o comentário do `SCHEMA_V4`
  // para por que a amizade aponta para a conta mas guarda o nome.

  /** Conta dona de um personagem, pelo nome. `undefined` se o nome não existe. */
  accountOfCharacter(name: string): { accountId: number; name: string } | undefined {
    const row = this.db
      .prepare('SELECT account_id, name FROM character WHERE name_key = ?')
      .get(nameKey(name)) as { account_id: number; name: string } | undefined;
    return row ? { accountId: row.account_id, name: row.name } : undefined;
  }

  listFriends(accountId: number): Array<{ accountId: number; name: string }> {
    const rows = this.db
      .prepare(
        `SELECT friend_account_id, added_name FROM account_friend
          WHERE account_id = ? ORDER BY added_name COLLATE NOCASE`,
      )
      .all(accountId) as Array<{ friend_account_id: number; added_name: string }>;
    return rows.map((r) => ({ accountId: r.friend_account_id, name: r.added_name }));
  }

  /**
   * Adiciona um amigo pelo NOME de um personagem dele.
   *
   * Devolve o motivo da recusa em vez de jogar, porque as três recusas viram
   * mensagens diferentes na tela e o chamador não deve ter de adivinhar qual foi.
   */
  addFriend(accountId: number, name: string): { ok: true } | { ok: false; reason: 'nao_existe' | 'voce_mesmo' | 'ja_tem' } {
    const alvo = this.accountOfCharacter(name);
    if (!alvo) return { ok: false, reason: 'nao_existe' };
    // 🔴 Compara CONTA, não personagem: adicionar o próprio alt não é fazer um
    // amigo, e a lista mostraria "online" para sempre.
    if (alvo.accountId === accountId) return { ok: false, reason: 'voce_mesmo' };
    const ja = this.db
      .prepare('SELECT 1 FROM account_friend WHERE account_id = ? AND friend_account_id = ?')
      .get(accountId, alvo.accountId);
    if (ja) return { ok: false, reason: 'ja_tem' };
    this.db
      .prepare(
        `INSERT INTO account_friend (account_id, friend_account_id, added_name, added_at)
         VALUES (?,?,?,?)`,
      )
      .run(accountId, alvo.accountId, alvo.name, Date.now());
    return { ok: true };
  }

  /** Remove pelo nome com que foi adicionado. `false` se não estava na lista. */
  removeFriend(accountId: number, name: string): boolean {
    const info = this.db
      .prepare('DELETE FROM account_friend WHERE account_id = ? AND added_name = ? COLLATE NOCASE')
      .run(accountId, name);
    return Number(info.changes) > 0;
  }

  // ----------------------------------------------------------- MUNDO -------
  //
  // 🔴 Os três métodos abaixo são os primeiros do banco que NÃO pendem de conta
  // nem de personagem. Ver o comentário da v6 no `schema.ts`: apagar uma árvore
  // apaga para todo mundo, porque é autoria de cenário e não progresso de
  // ninguém.

  /** Todas as edições de mundo, para o boot do servidor e o login do cliente. */
  listWorldEdits(): WorldEdit[] {
    const linhas = this.db
      .prepare('SELECT floor, x, y, tile, tile_antes, arte_x, arte_y FROM world_edit ORDER BY edited_at')
      .all() as Array<{
        floor: number; x: number; y: number; tile: number; tile_antes: number;
        arte_x: number | null; arte_y: number | null;
      }>;
    return linhas.map((l) => ({
      floor: l.floor, x: l.x, y: l.y, tile: l.tile, antes: l.tile_antes,
      ...(l.arte_x !== null && l.arte_y !== null ? { arte: { x: l.arte_x, y: l.arte_y } } : {}),
    }));
  }

  /**
   * Grava uma edição. `INSERT OR REPLACE` porque a chave é a célula: editar duas
   * vezes o mesmo tile é uma linha só.
   *
   * ⚠️ **O `tile_antes` do primeiro registro é o que fica.** Reeditar uma célula
   * já editada preserva o terreno ORIGINAL, senão o `/restaura` devolveria o
   * penúltimo estado — que também é uma edição — e desfazer nunca chegaria ao
   * mundo de verdade.
   */
  saveWorldEdit(e: WorldEdit & { antes: number }, porQuem: string): void {
    const jaTem = this.db
      .prepare('SELECT tile_antes FROM world_edit WHERE floor = ? AND x = ? AND y = ?')
      .get(e.floor, e.x, e.y) as { tile_antes: number } | undefined;
    this.db
      .prepare(`INSERT OR REPLACE INTO world_edit
                  (floor, x, y, tile, tile_antes, arte_x, arte_y, edited_at, edited_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        e.floor, e.x, e.y, e.tile, jaTem?.tile_antes ?? e.antes,
        e.arte?.x ?? null, e.arte?.y ?? null, Date.now(), porQuem,
      );
  }

  /** A edição mais recente, que é a que o `/restaura` desfaz. */
  lastWorldEdit(): (WorldEdit & { antes: number }) | undefined {
    const l = this.db
      .prepare('SELECT floor, x, y, tile, tile_antes FROM world_edit ORDER BY edited_at DESC, rowid DESC LIMIT 1')
      .get() as { floor: number; x: number; y: number; tile: number; tile_antes: number } | undefined;
    return l && { floor: l.floor, x: l.x, y: l.y, tile: l.tile, antes: l.tile_antes };
  }

  /** Todos os decalques, na ordem em que foram postos (quem veio depois desenha por cima). */
  listDecals(): WorldDecal[] {
    return this.db
      .prepare('SELECT id, floor, x, y, paleta, rot, camada, colisao FROM world_decal ORDER BY id')
      .all() as unknown as WorldDecal[];
  }

  /** Grava um decalque e devolve ele já com o id que o banco deu. */
  addDecal(d: Omit<WorldDecal, 'id'>, porQuem: string): WorldDecal {
    const info = this.db
      .prepare(`INSERT INTO world_decal (floor, x, y, paleta, rot, camada, colisao, placed_at, placed_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(d.floor, d.x, d.y, d.paleta, d.rot, d.camada, d.colisao ?? null, Date.now(), porQuem);
    return { ...d, id: Number(info.lastInsertRowid) };
  }

  /** O decalque mais recente — o que o `/undo` tira. */
  lastDecal(): (WorldDecal & { placedAt: number }) | undefined {
    const l = this.db
      .prepare('SELECT id, floor, x, y, paleta, rot, camada, colisao, placed_at FROM world_decal ORDER BY id DESC LIMIT 1')
      .get() as (WorldDecal & { placed_at: number }) | undefined;
    return l && { ...l, placedAt: l.placed_at };
  }

  /** Quando a última edição de TILE aconteceu — para o `/undo` escolher entre as duas pilhas. */
  lastWorldEditAt(): number | undefined {
    const l = this.db
      .prepare('SELECT edited_at FROM world_edit ORDER BY edited_at DESC, rowid DESC LIMIT 1')
      .get() as { edited_at: number } | undefined;
    return l?.edited_at;
  }

  deleteDecal(id: number): boolean {
    const info = this.db.prepare('DELETE FROM world_decal WHERE id = ?').run(id);
    return Number(info.changes) > 0;
  }

  deleteWorldEdit(floor: number, x: number, y: number): boolean {
    const info = this.db
      .prepare('DELETE FROM world_edit WHERE floor = ? AND x = ? AND y = ?')
      .run(floor, x, y);
    return Number(info.changes) > 0;
  }
}

/** Abre o banco no caminho padrão (ou o de `DATABASE_PATH`). */
export function openStore(): Store {
  const path = process.env.DATABASE_PATH ?? resolve(process.cwd(), 'data', 'elysia.db');
  return new Store(path);
}
