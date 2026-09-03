module.exports = {
    name: '001_initial_schema',
    up: async ({ run }) => {
        await run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                category_key TEXT NOT NULL,
                title_ar TEXT NOT NULL,
                title_en TEXT NOT NULL,
                category_ar TEXT NOT NULL,
                category_en TEXT NOT NULL,
                desc_ar TEXT NOT NULL,
                desc_en TEXT NOT NULL,
                benefits_ar TEXT,
                benefits_en TEXT,
                usage_ar TEXT,
                usage_en TEXT,
                ingredients TEXT,
                price_usd REAL NOT NULL,
                original_price_usd REAL NOT NULL,
                rating REAL DEFAULT 5.0,
                reviews_count INTEGER DEFAULT 0,
                stock INTEGER DEFAULT 100,
                image TEXT NOT NULL,
                badge_ar TEXT,
                badge_en TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                discount_percent INTEGER NOT NULL,
                max_uses INTEGER DEFAULT 1000,
                used_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                customer_country TEXT NOT NULL,
                customer_city TEXT NOT NULL,
                customer_address TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                currency TEXT NOT NULL,
                total_usd REAL NOT NULL,
                total_local REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                items_json TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                phone TEXT,
                country TEXT,
                city TEXT,
                address TEXT,
                reward_points INTEGER DEFAULT 100,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await run(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL,
                author_name TEXT NOT NULL,
                author_city TEXT NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT NOT NULL,
                is_verified INTEGER DEFAULT 1,
                is_approved INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
};
