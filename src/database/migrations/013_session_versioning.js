module.exports = {
    name: '013_session_versioning',
    up: async ({ query, run }) => {
        const users = await query('PRAGMA table_info(users)');
        if (!users.some(c => c.name === 'session_version')) {
            await run("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0");
        }
        const customers = await query('PRAGMA table_info(customers)');
        if (!customers.some(c => c.name === 'session_version')) {
            await run("ALTER TABLE customers ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0");
        }
    }
};
