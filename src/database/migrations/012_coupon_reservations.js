module.exports = {
    name: '012_coupon_reservations',
    up: async ({ run }) => {
        await run(`
            CREATE TABLE IF NOT EXISTS coupon_reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL UNIQUE,
                coupon_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('reserved', 'consumed', 'released')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY(coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT
            )
        `);
        await run('CREATE INDEX IF NOT EXISTS idx_coupon_reservations_coupon ON coupon_reservations(coupon_id, status)');
        await run('CREATE INDEX IF NOT EXISTS idx_coupon_reservations_order ON coupon_reservations(order_id)');
    }
};
