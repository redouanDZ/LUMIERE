const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Resolve database path dynamically based on environment:
// 1. Explicit DB_PATH (e.g., data/test.db or :memory:)
// 2. Automated test environment (NODE_ENV=test) -> data/test.db
// 3. Default production / development database -> data/lumiere.db
const getDbPath = () => {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH === ':memory:' ? ':memory:' : path.resolve(process.env.DB_PATH);
    }
    if (process.env.NODE_ENV === 'test') {
        return path.resolve(__dirname, '../../data/test.db');
    }
    return path.resolve(__dirname, '../../data/lumiere.db');
};

const dbPath = getDbPath();

if (dbPath !== ':memory:') {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
}

let db;
try {
    db = new Database(dbPath);
    if (process.env.NODE_ENV !== 'test') {
        console.log('✓ Connected to SQLite database:', dbPath);
    }
} catch (err) {
    console.error('Failed to connect to SQLite:', err);
}

// Enable SQLite Write-Ahead Logging (WAL) for superior concurrency & performance (file-based dbs)
if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
}
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// Promisified helpers
const query = async (sql, params = []) => {
    const stmt = db.prepare(sql);
    // better-sqlite3 throws if .all() is called on a statement that doesn't return data
    if (!stmt.reader) {
        Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
        return [];
    }
    return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
};

const run = async (sql, params = []) => {
    const stmt = db.prepare(sql);
    const info = Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
    return { lastID: info.lastInsertRowid, changes: info.changes };
};

const initSchema = async () => {
    const { runMigrations } = require('./migrator');
    const { runSeeds } = require('./seeder');
    await runMigrations();
    await runSeeds();
};

const close = async () => {
    db.close();
};

module.exports = {
    db,
    dbPath,
    query,
    run,
    initSchema,
    close
};
