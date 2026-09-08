module.exports = {
    name: '009_payment_status',
    up: async ({ query, run }) => {
        const cols = await query("PRAGMA table_info(orders)");
        if (!cols.some(c => c.name === 'payment_status')) {
            // pending_cod | pending_payment | paid | payment_failed
            await run("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending_cod'");
        }
        if (!cols.some(c => c.name === 'moyasar_invoice_id')) {
            await run('ALTER TABLE orders ADD COLUMN moyasar_invoice_id TEXT');
        }
        await run('CREATE INDEX IF NOT EXISTS idx_orders_moyasar_invoice ON orders(moyasar_invoice_id)');
    }
};
