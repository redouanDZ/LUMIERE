const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Resolve database path from one canonical environment variable.
// Tests use an isolated in-memory database unless explicitly overridden.
const getDbPath = () => {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH === ':memory:' ? ':memory:' : path.resolve(process.env.DB_PATH);
    }
    if (process.env.DATABASE_FILE) {
        return process.env.DATABASE_FILE === ':memory:' ? ':memory:' : path.resolve(process.env.DATABASE_FILE);
    }
    if (process.env.NODE_ENV === 'test') return ':memory:';
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
    try {
        if (Array.isArray(params)) {
            return stmt.all(...params);
        } else {
            return stmt.all(params);
        }
    } catch (err) {
        // If it's a non-SELECT statement that doesn't return data, .all() throws a TypeError.
        // Fallback to .run() in this case to simulate db.all returning an empty array.
        if (err.message && err.message.includes('does not return data')) {
            if (Array.isArray(params)) {
                stmt.run(...params);
            } else {
                stmt.run(params);
            }
            return [];
        }
        throw err;
    }
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
