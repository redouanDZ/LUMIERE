const bcrypt = require('bcryptjs');

module.exports = {
    name: '001_seed_admin',
    run: async ({ query, run }) => {
        const adminEmail = (process.env.ADMIN_EMAIL || (process.env.NODE_ENV === 'test' ? 'admin@test.local' : 'admin@domain.com')).trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;

        const existing = await query('SELECT * FROM users WHERE email = ?', [adminEmail]);
        if (existing.length === 0) {
            const initialPass = adminPassword || (process.env.NODE_ENV === 'test' ? 'Test_Admin_2026!' : 'Admin_' + Math.random().toString(36).slice(-8) + '!');
            const hashed = await bcrypt.hash(initialPass, 12);
            await run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
                'Executive Administrator',
                adminEmail,
                hashed,
                'admin'
            ]);
            console.log('  ✓ Seeded initial administrator: ' + adminEmail);
        }
    }
};
