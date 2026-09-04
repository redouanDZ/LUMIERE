module.exports = {
    name: '007_orders_customer_id',
    up: async ({ query, run }) => {
        // Add customer_id column to orders table if it doesn't already exist
        const cols = await query("PRAGMA table_info(orders)");
        const hasCol = cols.some(c => c.name === 'customer_id');
        if (!hasCol) {
            await run('ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES customers(id)');
        }
        await run('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)');
        await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number_unique ON orders(order_number)');
    }
};
