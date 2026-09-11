module.exports = {
    name: '010_order_coupon',
    up: async ({ query, run }) => {
        const columns = await query('PRAGMA table_info(orders)');
        if (!columns.some(column => column.name === 'coupon_code')) {
            await run('ALTER TABLE orders ADD COLUMN coupon_code TEXT');
        }
    }
};
