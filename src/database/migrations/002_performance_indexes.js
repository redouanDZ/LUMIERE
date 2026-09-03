module.exports = {
    name: '002_performance_indexes',
    up: async ({ run }) => {
        // Fast category filtering & active status lookup
        await run(`
            CREATE INDEX IF NOT EXISTS idx_products_category_active 
            ON products(is_active, category_key)
        `);

        // Fast customer order history lookups
        await run(`
            CREATE INDEX IF NOT EXISTS idx_orders_customer_phone 
            ON orders(customer_phone)
        `);
        await run(`
            CREATE INDEX IF NOT EXISTS idx_orders_status 
            ON orders(status)
        `);
        await run(`
            CREATE INDEX IF NOT EXISTS idx_orders_created_at 
            ON orders(created_at DESC)
        `);

        // Instant coupon validation index
        await run(`
            CREATE INDEX IF NOT EXISTS idx_coupons_code_active 
            ON coupons(code, is_active)
        `);

        // Customer login & lookup indexes
        await run(`
            CREATE INDEX IF NOT EXISTS idx_customers_email 
            ON customers(email)
        `);
        await run(`
            CREATE INDEX IF NOT EXISTS idx_users_email 
            ON users(email)
        `);
    }
};
