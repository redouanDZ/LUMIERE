const sqlite3 = require('sqlite3').verbose();
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

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to SQLite:', err);
    } else if (process.env.NODE_ENV !== 'test') {
        console.log('✓ Connected to SQLite database:', dbPath);
    }
});

// Enable SQLite Write-Ahead Logging (WAL) for superior concurrency & performance (file-based dbs)
if (dbPath !== ':memory:') {
    db.run('PRAGMA journal_mode = WAL;');
}
db.run('PRAGMA synchronous = NORMAL;');
db.run('PRAGMA foreign_keys = ON;');

// Promisified helpers
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const initSchema = async () => {
    const { runMigrations } = require('./migrator');
    const { runSeeds } = require('./seeder');
    await runMigrations();
    await runSeeds();
};

const close = () => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

module.exports = {
    db,
    dbPath,
    query,
    run,
    initSchema,
    close
};
