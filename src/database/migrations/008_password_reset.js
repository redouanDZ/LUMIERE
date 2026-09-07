module.exports = {
    name: '008_password_reset',
    up: async ({ query, run }) => {
        // Add password-reset columns to admin users table
        const userCols = await query("PRAGMA table_info(users)");
        if (!userCols.some(c => c.name === 'reset_token_hash')) {
            await run('ALTER TABLE users ADD COLUMN reset_token_hash TEXT');
        }
        if (!userCols.some(c => c.name === 'reset_token_expires')) {
            await run('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME');
        }

        // Add the same columns + google_sub for Google Sign-In to customers table
        const custCols = await query("PRAGMA table_info(customers)");
        if (!custCols.some(c => c.name === 'reset_token_hash')) {
            await run('ALTER TABLE customers ADD COLUMN reset_token_hash TEXT');
        }
        if (!custCols.some(c => c.name === 'reset_token_expires')) {
            await run('ALTER TABLE customers ADD COLUMN reset_token_expires DATETIME');
        }
        if (!custCols.some(c => c.name === 'google_sub')) {
            await run('ALTER TABLE customers ADD COLUMN google_sub TEXT');
        }
        // password_hash must be nullable for Google-only accounts (no password set)
        // SQLite ALTER TABLE cannot easily change NOT NULL constraints; if the
        // original column is NOT NULL, Google-only signups store a random
        // unusable hash instead (handled in the route logic, not here).
    }
};
