const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../data/lumiere.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Failed to connect to SQLite:', err);
    else console.log('✓ Connected to SQLite database:', dbPath);
});

// Enable SQLite Write-Ahead Logging (WAL) for superior concurrency & performance
db.run('PRAGMA journal_mode = WAL;');
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

module.exports = {
    db,
    query,
    run,
    initSchema
};
