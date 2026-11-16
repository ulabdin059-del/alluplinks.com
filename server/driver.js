// Database drivers. The app writes one SQL dialect (SQLite style) and calls the same helpers everywhere;
// this file runs it on one of:
//   • MySQL / MariaDB  — when DB_HOST (or DATABASE_URL=mysql://…) is set, e.g. Hostinger
//   • Turso (libSQL)   — when TURSO_DATABASE_URL is set
//   • a local SQLite file in DATA_DIR — development and tests
// For MySQL the few SQLite-only phrases are translated (see toMySQL) and the schema comes from MYSQL_SCHEMA in db.js.
import path from 'node:path';

const env = process.env;
const mysqlUrl = /^mysql:\/\//i.test(env.DATABASE_URL || '') ? env.DATABASE_URL : '';
export const DB_KIND = env.DB_HOST || mysqlUrl ? 'mysql' : env.TURSO_DATABASE_URL ? 'turso' : 'local';

const norm = (args) => args.map((a) => (a === undefined ? null : typeof a === 'boolean' ? (a ? 1 : 0) : a));

// ---------- MySQL dialect ----------
// Column names that are reserved words in MySQL (they are plain names in SQLite).
const RESERVED = /\b(key|read|condition)\b/g;
const translated = new Map();
export function toMySQL(sql) {
  let out = translated.get(sql);
  if (out) return out;
  // Only touch text outside quoted string literals.
  out = sql.split(/('(?:[^']|'')*')/).map((part, i) => (i % 2 ? part : part
    .replace(RESERVED, '`$1`')
    .replace(/\bINSERT OR REPLACE INTO\b/gi, 'REPLACE INTO')
    .replace(/\bON CONFLICT\s*\([^)]*\)\s*DO UPDATE SET\b/gi, 'ON DUPLICATE KEY UPDATE')
    .replace(/\bexcluded\.`?(\w+)`?/g, (_m, c) => `VALUES(${/^(key|read|condition)$/.test(c) ? '`' + c + '`' : c})`)
  )).join('');
  translated.set(sql, out);
  return out;
}

async function mysqlDriver() {
  const mysql = (await import('mysql2/promise')).default;
  const base = mysqlUrl ? { uri: mysqlUrl } : {
    host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME
  };
  const pool = mysql.createPool({
    ...base,
    connectionLimit: Number(env.DB_POOL || 5),
    charset: 'utf8mb4_unicode_ci',
    dateStrings: true, // timestamps come back as 'YYYY-MM-DD HH:MM:SS' text, exactly as with SQLite
    timezone: 'Z',
    flags: ['FOUND_ROWS'], // UPDATE reports matched rows (as SQLite does), not only changed rows
    enableKeepAlive: true,
    ssl: env.DB_SSL === 'true' ? {} : undefined
  });
  // Every connection stores and returns times in UTC, like SQLite's datetime('now').
  pool.pool.on('connection', (c) => { c.query("SET time_zone = '+00:00'"); });
  const q = async (conn, sql, args) => {
    const [rows] = await conn.query(toMySQL(sql), norm(args));
    return rows;
  };
  const result = (r) => ({ lastInsertRowid: r.insertId || null, changes: r.affectedRows });
  const ops = (conn) => ({
    all: async (sql, ...a) => (await q(conn, sql, a)).map((r) => ({ ...r })),
    get: async (sql, ...a) => { const r = (await q(conn, sql, a))[0]; return r ? { ...r } : undefined; },
    run: async (sql, ...a) => result(await q(conn, sql, a))
  });
  const tx = async (fn) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const out = await fn(ops(conn));
      await conn.commit();
      return out;
    } catch (e) { await conn.rollback().catch(() => {}); throw e; }
    finally { conn.release(); }
  };
  return {
    ...ops(pool),
    tx,
    batch: (stmts) => (stmts.length ? tx(async (t) => { for (const [sql, ...a] of stmts) await t.run(sql, ...a); }) : undefined),
    exec: async (statements) => { for (const s of statements) await pool.query(s); },
    columns: async (table) => (await pool.query('SELECT COLUMN_NAME name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]))[0].map((r) => r.name),
    // A database-wide lock, so "is this slot free → book it" and first-start setup also hold if the host runs several app processes.
    lock: async (name, fn, waitSeconds = 15) => {
      const conn = await pool.getConnection();
      try {
        const [[{ ok }]] = await conn.query('SELECT GET_LOCK(?, ?) ok', [name, waitSeconds]);
        if (ok !== 1) throw Object.assign(new Error('The system is busy. Please try again in a moment.'), { status: 503 });
        try { return await fn(); } finally { await conn.query('SELECT RELEASE_LOCK(?)', [name]).catch(() => {}); }
      } finally { conn.release(); }
    },
    close: () => pool.end()
  };
}

// ---------- libSQL (Turso or a local SQLite file) ----------
async function libsqlDriver(dataDir) {
  const { createClient } = await import('@libsql/client');
  const client = createClient(DB_KIND === 'turso'
    ? { url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN }
    : { url: 'file:' + (env.DB_PATH || path.join(dataDir, 'alluplinks.db')) });
  if (DB_KIND === 'local') await client.execute('PRAGMA journal_mode = WAL').catch(() => {});
  const plain = (rs) => rs.rows.map((r) => ({ ...r }));
  const ops = (c) => ({
    all: async (sql, ...a) => plain(await c.execute({ sql, args: norm(a) })),
    get: async (sql, ...a) => plain(await c.execute({ sql, args: norm(a) }))[0],
    run: async (sql, ...a) => {
      const r = await c.execute({ sql, args: norm(a) });
      return { lastInsertRowid: r.lastInsertRowid == null ? null : Number(r.lastInsertRowid), changes: r.rowsAffected };
    }
  });
  return {
    ...ops(client),
    tx: async (fn) => {
      const t = await client.transaction('write');
      try { const out = await fn(ops(t)); await t.commit(); return out; }
      catch (e) { await t.rollback().catch(() => {}); throw e; }
      finally { t.close(); }
    },
    // All statements atomically in one round trip (fast on a remote Turso database).
    batch: async (stmts) => { if (stmts.length) await client.batch(stmts.map(([sql, ...a]) => ({ sql, args: norm(a) })), 'write'); },
    exec: (sql) => client.executeMultiple(sql),
    columns: async (table) => plain(await client.execute(`PRAGMA table_info(${table})`)).map((c) => c.name),
    lock: (_name, fn) => fn(),
    close: () => client.close()
  };
}

export const openDriver = (dataDir) => (DB_KIND === 'mysql' ? mysqlDriver() : libsqlDriver(dataDir));
