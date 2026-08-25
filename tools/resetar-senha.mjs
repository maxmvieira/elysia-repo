/**
 * Reseta a senha de UMA conta no banco local de desenvolvimento.
 *
 * 🔴 A senha vem de VOCÊ, no argumento — ela não é gerada nem guardada por
 * ninguém aqui. O que entra no banco é `scryptSync(senha, salt, 64)` em hex,
 * exatamente o mesmo que o `hashPassword` do `server/src/store/store.ts` faz no
 * registro. Se a conta fosse hasheada de outro jeito, o login recusaria.
 *
 *   node resetar-senha.mjs <usuario> <novaSenha> [caminho-do-banco]
 *
 * ⚠️ PARE o servidor (`npm run dev`) antes. SQLite em WAL aceita um escritor
 * só, e o servidor lê a conta no login — reiniciar garante que ele veja o hash
 * novo.
 */
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';

const [usuario, senha, caminho = 'server/data/elysia.db'] = process.argv.slice(2);

if (!usuario || !senha) {
  console.error('uso: node resetar-senha.mjs <usuario> <novaSenha> [banco]');
  process.exit(1);
}
// A mesma regra do registro (`store.ts`): senha curta o servidor recusaria.
if (senha.length < 6) {
  console.error('A senha precisa de pelo menos 6 caracteres — é a regra do próprio servidor.');
  process.exit(1);
}
if (!existsSync(caminho)) {
  console.error(`banco não encontrado: ${caminho} (rode da raiz do repo)`);
  process.exit(1);
}

const db = new DatabaseSync(caminho);
const conta = db.prepare('SELECT id, username FROM account WHERE username_key = ?')
  .get(usuario.toLowerCase());

if (!conta) {
  const todas = db.prepare('SELECT username FROM account ORDER BY id').all().map((c) => c.username);
  console.error(`conta "${usuario}" não existe. As que existem: ${todas.join(', ')}`);
  process.exit(1);
}

/*
 * Backup por VACUUM INTO, e não por cópia de arquivo: em WAL o `.db` sozinho
 * está desatualizado (o que vale está no `-wal`), então copiar o arquivo dá um
 * backup silenciosamente velho. O VACUUM escreve um banco consistente.
 */
// Carimbo no padrão que server/data/ já usa: elysia-backup-20260814-0023.db
const d = new Date();
const dois = (n) => String(n).padStart(2, '0');
const carimbo = `${d.getFullYear()}${dois(d.getMonth() + 1)}${dois(d.getDate())}-${dois(d.getHours())}${dois(d.getMinutes())}`;
const backup = caminho.replace(/\.db$/, `-backup-${carimbo}.db`);
if (existsSync(backup)) rmSync(backup);
db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(senha, salt, 64).toString('hex');
db.prepare('UPDATE account SET pass_hash = ?, pass_salt = ? WHERE id = ?').run(hash, salt, conta.id);

const chars = db.prepare('SELECT name, level FROM character WHERE account_id = ? ORDER BY last_played_at DESC')
  .all(conta.id);
db.close();

console.log(`senha trocada para a conta "${conta.username}" (id ${conta.id})`);
console.log(`backup do banco anterior: ${backup}`);
console.log(`personagens: ${chars.map((c) => `${c.name} (nv ${c.level})`).join(', ')}`);
