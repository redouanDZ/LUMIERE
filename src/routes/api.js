const express = require('express');
const router = express.Router();
const { query, run } = require('../database/db');
const { validateOrderInput, sanitizeString } = require('../middleware/validator');
const { requireAdmin, getJwtSecret } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// PUBLIC STORE APIS
// ==========================================

// GET Products
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

// GET Single Product
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

// Validate Coupon
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

// Create Order
router.post('/orders', validateOrderInput, async (req, res) => {
    try {
        const { name, phone, country, city, address, paymentMethod, currency, items } = req.sanitizedOrder;
        const couponCode = sanitizeString(req.body.couponCode || '').toUpperCase();

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

// Admin Auth
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
            getJwtSecret(),
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

router.post('/auth/logout', (req, res) => {
    res.clearCookie('lumiere_admin_token');
    res.json({ success: true, message: 'Logged out' });
});

// ==========================================
// ADMIN FULL CRUD OPERATIONS
// ==========================================

// 1. STATS & ANALYTICS
router.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const totalOrders = await query('SELECT COUNT(*) as count, SUM(total_usd) as totalRevenue FROM orders');
        const ordersList = await query('SELECT * FROM orders ORDER BY id DESC LIMIT 50');
        const productsCount = await query('SELECT COUNT(*) as count FROM products');
        const couponsCount = await query('SELECT COUNT(*) as count FROM coupons');

        const countryStats = await query(`
            SELECT customer_country as country, COUNT(*) as count, SUM(total_usd) as revenue
            FROM orders GROUP BY customer_country ORDER BY count DESC LIMIT 5
        `);

        const customersList = await query(`
            SELECT customer_name as name, customer_phone as phone, customer_city as city,
                   customer_country as country, COUNT(*) as total_orders, SUM(total_usd) as total_spent,
                   MAX(created_at) as last_order_date
            FROM orders GROUP BY customer_phone ORDER BY total_spent DESC LIMIT 20
        `);

        res.json({
            success: true,
            stats: {
                totalOrders: totalOrders[0].count || 0,
                totalRevenueUsd: Math.round(totalOrders[0].totalRevenue || 0),
                totalRevenueSar: Math.round((totalOrders[0].totalRevenue || 0) * 3.75),
                totalProducts: productsCount[0].count || 0,
                totalCoupons: couponsCount[0].count || 0
            },
            countryStats,
            customers: customersList,
            recentOrders: ordersList.map(o => ({
                ...o,
                items: JSON.parse(o.items_json || '[]')
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. COUPONS CRUD
// READ: Get all coupons
router.get('/admin/coupons', requireAdmin, async (req, res) => {
    try {
        const coupons = await query('SELECT * FROM coupons ORDER BY id DESC');
        res.json({ success: true, data: coupons });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// CREATE: Add new coupon
router.post('/admin/coupons', requireAdmin, async (req, res) => {
    try {
        const { code, discountPercent } = req.body;
        const cleanCode = sanitizeString(code).toUpperCase();
        const percent = Math.min(100, Math.max(1, parseInt(discountPercent) || 10));

        await run('INSERT INTO coupons (code, discount_percent) VALUES (?, ?)', [cleanCode, percent]);
        res.status(201).json({ success: true, message: 'Coupon created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// UPDATE: Toggle coupon status (active/inactive)
router.patch('/admin/coupons/:id/toggle', requireAdmin, async (req, res) => {
    try {
        const coup = await query('SELECT is_active FROM coupons WHERE id = ?', [req.params.id]);
        if (coup.length === 0) return res.status(404).json({ success: false, message: 'Coupon not found' });
        const newStatus = coup[0].is_active ? 0 : 1;
        await run('UPDATE coupons SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
        res.json({ success: true, is_active: newStatus, message: 'Coupon status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: Delete coupon permanently
router.delete('/admin/coupons/:id', requireAdmin, async (req, res) => {
    try {
        await run('DELETE FROM coupons WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Coupon deleted permanently' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. PRODUCTS CRUD
// CREATE: Add new product
router.post('/admin/products', requireAdmin, async (req, res) => {
    try {
        const {
            id, categoryKey, title_ar, title_en, category_ar, category_en,
            desc_ar, desc_en, benefits_ar, benefits_en, usage_ar, usage_en,
            ingredients, price_usd, stock, image, badge_ar, badge_en
        } = req.body;

        const cleanId = sanitizeString(id || 'prod_' + Date.now());
        const pUsd = parseFloat(price_usd) || 45;
        const pStock = parseInt(stock) || 50;

        await run(`
            INSERT INTO products (
                id, category_key, title_ar, title_en, category_ar, category_en,
                desc_ar, desc_en, benefits_ar, benefits_en, usage_ar, usage_en,
                ingredients, price_usd, original_price_usd, stock, image, badge_ar, badge_en
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            cleanId, categoryKey || 'serums', title_ar, title_en || title_ar,
            category_ar || 'عناية فاخرة', category_en || 'Luxury Care',
            desc_ar || '', desc_en || '', benefits_ar || '', benefits_en || '',
            usage_ar || '', usage_en || '', ingredients || '',
            pUsd, (pUsd * 1.3).toFixed(2), pStock, image || 'images/serum.jpg',
            badge_ar || 'جديد', badge_en || 'New'
        ]);

        res.status(201).json({ success: true, message: 'Product created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// UPDATE: Update Product (Price & Stock)
router.patch('/admin/products/:id', requireAdmin, async (req, res) => {
    try {
        const { price_usd, stock } = req.body;
        await run('UPDATE products SET price_usd = ?, stock = ? WHERE id = ?', [
            parseFloat(price_usd),
            parseInt(stock),
            req.params.id
        ]);
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: Delete product
router.delete('/admin/products/:id', requireAdmin, async (req, res) => {
    try {
        await run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted permanently' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. ORDERS CRUD
// UPDATE: Update status
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

// DELETE: Delete order (e.g. test or fake orders)
router.delete('/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
        await run('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// ==========================================
// CUSTOMER AUTH & PORTAL APIS
// ==========================================

// Customer Register
router.post('/customer/register', async (req, res) => {
    try {
        let { name, email, password, phone, country, city, address } = req.body;
        name = sanitizeString(name);
        email = sanitizeString(email).toLowerCase();
        phone = sanitizeString(phone);
        country = sanitizeString(country) || 'Saudi Arabia';
        city = sanitizeString(city) || 'Riyadh';
        address = sanitizeString(address) || '';

        if (!name || name.length < 2) return res.status(400).json({ success: false, message: 'الاسم مطلوب' });
        if (!email || !email.includes('@')) return res.status(400).json({ success: false, message: 'بريد إلكتروني غير صالح' });
        if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

        const existing = await query('SELECT id FROM customers WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const result = await run(`
            INSERT INTO customers (name, email, password_hash, phone, country, city, address, reward_points)
            VALUES (?, ?, ?, ?, ?, ?, ?, 100)
        `, [name, email, password_hash, phone, country, city, address]);

        const token = jwt.sign(
            { id: result.lastID, name, email, role: 'customer' },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        res.cookie('lumiere_customer_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            customer: { id: result.lastID, name, email, phone, country, city, address, reward_points: 100 },
            token,
            message: 'تم إنشاء الحساب بنجاح وتمت إضافة 100 نقطة ترحيبية 🎁'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Customer Login
router.post('/customer/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        email = sanitizeString(email).toLowerCase();

        const customers = await query('SELECT * FROM customers WHERE email = ?', [email]);
        if (customers.length === 0) {
            return res.status(401).json({ success: false, message: 'البريد أو كلمة المرور غير صحيحة' });
        }

        const cust = customers[0];
        const match = await bcrypt.compare(password, cust.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'البريد أو كلمة المرور غير صحيحة' });
        }

        const token = jwt.sign(
            { id: cust.id, name: cust.name, email: cust.email, role: 'customer' },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        res.cookie('lumiere_customer_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            customer: {
                id: cust.id,
                name: cust.name,
                email: cust.email,
                phone: cust.phone,
                country: cust.country,
                city: cust.city,
                address: cust.address,
                reward_points: cust.reward_points
            },
            token
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Customer Logout
router.post('/customer/logout', (req, res) => {
    res.clearCookie('lumiere_customer_token');
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// Customer Profile & Order History
router.get('/customer/me', async (req, res) => {
    try {
        const token = req.cookies?.lumiere_customer_token || req.headers['authorization']?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'غير مسجل الدخول' });

        const decoded = jwt.verify(token, getJwtSecret());
        const customers = await query('SELECT id, name, email, phone, country, city, address, reward_points FROM customers WHERE id = ?', [decoded.id]);
        if (customers.length === 0) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

        const cust = customers[0];

        // Fetch their orders by phone or customer email match
        const orders = await query('SELECT * FROM orders WHERE customer_phone = ? OR customer_name = ? ORDER BY id DESC', [cust.phone, cust.name]);

        res.json({
            success: true,
            customer: cust,
            orders: orders.map(o => ({
                ...o,
                items: JSON.parse(o.items_json || '[]')
            }))
        });
    } catch (err) {
        res.status(401).json({ success: false, message: 'جلسة منتهية الصلاحية' });
    }
});

// Customer Update Profile
router.put('/customer/me', async (req, res) => {
    try {
        const token = req.cookies?.lumiere_customer_token || req.headers['authorization']?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'غير مسجل الدخول' });

        const decoded = jwt.verify(token, getJwtSecret());
        let { name, phone, country, city, address } = req.body;

        name = sanitizeString(name);
        phone = sanitizeString(phone);
        country = sanitizeString(country);
        city = sanitizeString(city);
        address = sanitizeString(address);

        await run(`
            UPDATE customers SET name = ?, phone = ?, country = ?, city = ?, address = ?
            WHERE id = ?
        `, [name, phone, country, city, address, decoded.id]);

        res.json({ success: true, message: 'تم تحديث البيانات بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
