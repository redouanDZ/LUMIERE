const fs = require('fs');
const path = require('path');
const { query, run } = require('./db');

const runMigrations = async () => {
    // Create migrations tracking table
    await run(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const executedRows = await query('SELECT name FROM _migrations');
    const executedSet = new Set(executedRows.map(r => r.name));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.js'))
        .sort();

    let count = 0;
    for (const file of files) {
        const migration = require(path.join(migrationsDir, file));
        const migName = migration.name || file;

        if (!executedSet.has(migName)) {
            console.log(`  > Applying database migration: ${migName}...`);
            await migration.up({ query, run });
            await run('INSERT INTO _migrations (name) VALUES (?)', [migName]);
            executedSet.add(migName);
            count++;
        }
    }

    if (count > 0) {
        console.log(`✓ Successfully executed ${count} pending migration(s).`);
    } else {
        console.log('✓ Database schema is up to date (no pending migrations).');
    }
};

module.exports = { runMigrations };
