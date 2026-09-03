const express = require('express');
const router = express.Router();
const { query, run } = require('../database/db');
const { validateOrderInput, sanitizeString } = require('../middleware/validator');
const { requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Public: GET all products with filtering
router.get('/products', async (req, res) => {
    try {
        const { category } = req.query;
        let sql = 'SELECT * FROM products WHERE is_active = 1';
        const params = [];

        if (category && category !== 'all') {
            sql += ' AND category_key = ?';
            params.push(category);
        }

        const products = await query(sql, params);
        res.json({ success: true, count: products.length, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Public: GET single product
router.get('/products/:id', async (req, res) => {
    try {
        const product = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (product.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: product[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Public: Validate Coupon
router.post('/coupons/validate', async (req, res) => {
    try {
        const code = sanitizeString(req.body.code).toUpperCase();
        const coupons = await query('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code]);
        if (coupons.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
        }
        const coupon = coupons[0];
        res.json({
            success: true,
            code: coupon.code,
            discountPercent: coupon.discount_percent
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Public: Create Order with validation and stock calculation
router.post('/orders', validateOrderInput, async (req, res) => {
    try {
        const { name, phone, country, city, address, paymentMethod, currency, items } = req.sanitizedOrder;
        const couponCode = sanitizeString(req.body.couponCode || '').toUpperCase();

        // Calculate total from database to prevent price tampering
        let totalUsd = 0;
        const processedItems = [];

        for (const item of items) {
            const dbProd = await query('SELECT * FROM products WHERE id = ?', [item.id]);
            if (dbProd.length > 0) {
                const prod = dbProd[0];
                const qty = Math.max(1, parseInt(item.qty) || 1);
                totalUsd += prod.price_usd * qty;
                processedItems.push({
                    id: prod.id,
                    title: prod.title_ar,
                    priceUsd: prod.price_usd,
                    qty
                });
            }
        }

        // Apply coupon if valid
        let discount = 0;
        if (couponCode) {
            const coup = await query('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [couponCode]);
            if (coup.length > 0) {
                discount = coup[0].discount_percent;
                totalUsd = totalUsd * (1 - (discount / 100));
                await run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coup[0].id]);
            }
        }

        const rates = { SAR: 3.75, AED: 3.67, USD: 1.0, EUR: 0.92, KWD: 0.31, DZD: 220 };
        const rate = rates[currency] || 3.75;
        const totalLocal = Math.round(totalUsd * rate);

        const orderNumber = 'LUM-' + Date.now().toString().slice(-6);

        const result = await run(`
            INSERT INTO orders (
                order_number, customer_name, customer_phone, customer_country, customer_city,
                customer_address, payment_method, currency, total_usd, total_local, items_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orderNumber, name, phone, country, city, address, paymentMethod, currency,
            totalUsd.toFixed(2), totalLocal, JSON.stringify(processedItems)
        ]);

        res.status(201).json({
            success: true,
            orderId: result.lastID,
            orderNumber,
            totalLocal,
            currency,
            message: 'Order created successfully'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin Authentication: Login
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'lumiere_super_secret_jwt_key_2026_paris_luxury',
            { expiresIn: '7d' }
        );

        res.cookie('lumiere_admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Logout
router.post('/auth/logout', (req, res) => {
    res.clearCookie('lumiere_admin_token');
    res.json({ success: true, message: 'Logged out' });
});

// Protected Admin: Dashboard Stats & Recent Orders
router.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const totalOrders = await query('SELECT COUNT(*) as count, SUM(total_usd) as totalRevenue FROM orders');
        const ordersList = await query('SELECT * FROM orders ORDER BY id DESC LIMIT 20');
        const productsCount = await query('SELECT COUNT(*) as count FROM products');

        res.json({
            success: true,
            stats: {
                totalOrders: totalOrders[0].count || 0,
                totalRevenueUsd: Math.round(totalOrders[0].totalRevenue || 0),
                totalProducts: productsCount[0].count || 0
            },
            recentOrders: ordersList.map(o => ({
                ...o,
                items: JSON.parse(o.items_json || '[]')
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Protected Admin: Update Order Status
router.patch('/admin/orders/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        await run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true, message: 'Order status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
