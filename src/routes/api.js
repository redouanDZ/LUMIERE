const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { query, run } = require('../database/db');
const { validateOrderInput, sanitizeString } = require('../middleware/validator');
const { requireAdmin, getJwtSecret } = require('../middleware/auth');
const { authLimiter, orderLimiter } = require('../middleware/rateLimiter');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper for safe error response
const safeError = (res, err, defaultMsg) => {
    console.error('[Route Error]:', err);
    const msg = process.env.NODE_ENV === 'production' ? (defaultMsg || 'حدث خطأ في الخادم') : err.message;
    return res.status(500).json({ success: false, message: msg });
};

// ==========================================
// PUBLIC STORE APIS
// ==========================================

// GET Products

// Public: Get Public Store Configuration & Branding
router.get('/config', (req, res) => {
    try {
        const { getStoreConfig } = require('../config/store');
        const config = getStoreConfig(req.headers['x-tenant-id'] || null);
        res.json({ success: true, data: config });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load configuration' });
    }
});

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
        safeError(res, err);
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
        safeError(res, err);
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
        safeError(res, err);
    }
});

// Constant-time dummy hash to mitigate timing attacks on invalid account lookups
const DUMMY_BCRYPT_HASH = '$2a$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuuabcdefghijk';

// Create Order
router.post('/orders', orderLimiter, validateOrderInput, async (req, res) => {
    try {
        const { name, phone, country, city, address, paymentMethod, currency, items } = req.sanitizedOrder;
        const couponCode = sanitizeString(req.body.couponCode || '').toUpperCase();

        let customerId = null;
        try {
            const customerToken = req.cookies?.lumiere_customer_token || req.headers['authorization']?.split(' ')[1];
            if (customerToken) {
                const decoded = jwt.verify(customerToken, getJwtSecret());
                if (decoded && decoded.id && decoded.role === 'customer') {
                    customerId = decoded.id;
                }
            }
        } catch (e) {
            // Guest order or invalid token
        }

        let totalUsd = 0;
        const processedItems = [];

        // Validate stock and calculate pricing
        for (const item of items) {
            const dbProd = await query('SELECT * FROM products WHERE id = ? AND is_active = 1', [item.id]);
            if (dbProd.length > 0) {
                const prod = dbProd[0];
                const qty = Math.min(20, Math.max(1, parseInt(item.qty, 10) || 1));

                // Verify stock availability
                if (prod.stock < qty) {
                    return res.status(400).json({
                        success: false,
                        message: `عذراً، الكمية المطلوبة من [${prod.title_ar}] غير متوفرة حالياً (المتوفر بالمخزن: ${prod.stock} قطع)`
                    });
                }

                totalUsd += prod.price_usd * qty;
                processedItems.push({
                    id: prod.id,
                    title: prod.title_ar,
                    priceUsd: prod.price_usd,
                    qty
                });
            }
        }

        if (processedItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'سلة المشتريات لا تحتوي على منتجات صالحة'
            });
        }

        let discount = 0;
        let appliedCouponId = null;
        if (couponCode) {
            const coup = await query('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [couponCode]);
            if (coup.length > 0) {
                const c = coup[0];
                if (c.max_uses && c.used_count >= c.max_uses) {
                    return res.status(400).json({
                        success: false,
                        message: 'عذراً، لقد تم استنفاد الحد الأقصى لاستخدام رمز الخصم هذا'
                    });
                }
                discount = c.discount_percent;
                totalUsd = totalUsd * (1 - (discount / 100));
                appliedCouponId = c.id;
            }
        }

        const rates = { SAR: 3.75, AED: 3.67, USD: 1.0, EUR: 0.92, KWD: 0.31, DZD: 220 };
        const rate = rates[currency] || 3.75;
        const totalLocal = Math.round(totalUsd * rate);

        let result = null;
        let orderNumber = '';
        const maxRetries = 5;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                orderNumber = `LUM-${Date.now().toString().slice(-6)}-${randomSuffix}`;

                result = await run(`
                    INSERT INTO orders (
                        order_number, customer_id, customer_name, customer_phone, customer_country, customer_city,
                        customer_address, payment_method, currency, total_usd, total_local, items_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    orderNumber, customerId, name, phone, country, city, address, paymentMethod, currency,
                    totalUsd.toFixed(2), totalLocal, JSON.stringify(processedItems)
                ]);
                break;
            } catch (insertErr) {
                if (insertErr.message && insertErr.message.includes('UNIQUE') && attempt < maxRetries - 1) {
                    continue;
                }
                throw insertErr;
            }
        }

        // Deduct stock for all ordered products
        for (const item of processedItems) {
            await run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [item.qty, item.id]);
        }

        // Increment coupon use count if applied
        if (appliedCouponId) {
            await run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [appliedCouponId]);
        }

        // Award reward points if registered customer
        if (customerId) {
            await run('UPDATE customers SET reward_points = reward_points + 10 WHERE id = ?', [customerId]);
        }

        res.status(201).json({
            success: true,
            orderId: result.lastID,
            orderNumber,
            totalLocal,
            currency,
            message: 'تم إنشاء الطلب بنجاح وتم خصم المخزون'
        });
    } catch (err) {
        safeError(res, err);
    }
});

// Admin Auth: Login with strict input validation, timing attack defense, and rate-limiting
router.post('/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان بصيغة صحيحة' });
        }

        if (password.length > 128) {
            return res.status(400).json({ success: false, message: 'كلمة المرور تتجاوز الحد المسموح' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const users = await query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

        if (users.length === 0) {
            // Constant-time execution to prevent email enumeration via timing attacks
            await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
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
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        safeError(res, err);
    }
});

// Admin Auth: Change Password
router.post('/admin/change-password', requireAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
        }

        if (newPassword.length < 8 || newPassword.length > 128) {
            return res.status(400).json({ success: false, message: 'كلمة المرور الجديدة يجب أن تتراوح بين 8 و 128 حرفاً' });
        }

        const users = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        const user = users[0];
        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) {
            return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

        res.json({ success: true, message: 'تم تحديث كلمة مرور المدير بنجاح' });
    } catch (err) {
        safeError(res, err);
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
        safeError(res, err);
    }
});

// 2. COUPONS CRUD
// READ: Get all coupons
router.get('/admin/coupons', requireAdmin, async (req, res) => {
    try {
        const coupons = await query('SELECT * FROM coupons ORDER BY id DESC');
        res.json({ success: true, data: coupons });
    } catch (err) {
        safeError(res, err);
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
        safeError(res, err);
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
        safeError(res, err);
    }
});

// DELETE: Delete coupon permanently
router.delete('/admin/coupons/:id', requireAdmin, async (req, res) => {
    try {
        await run('DELETE FROM coupons WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Coupon deleted permanently' });
    } catch (err) {
        safeError(res, err);
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
        safeError(res, err);
    }
});

// UPLOAD: Upload product image from mobile or desktop (Admin only)
router.post('/admin/upload-image', requireAdmin, async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            return res.status(400).json({ success: false, message: 'بيانات الصورة مطلوبة' });
        }

        // Validate base64 data URI format (png, jpeg, jpg, webp) using safe header slicing
        const commaIdx = imageBase64.indexOf(',');
        if (commaIdx === -1) {
            return res.status(400).json({ success: false, message: 'صيغة بيانات الصورة غير صالحة' });
        }

        const header = imageBase64.slice(0, commaIdx);
        const base64Data = imageBase64.slice(commaIdx + 1);

        const mimeMatch = header.match(/^data:image\/(png|jpeg|jpg|webp);base64$/i);
        if (!mimeMatch) {
            return res.status(400).json({ success: false, message: 'صيغة الصورة غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP' });
        }

        const rawExt = mimeMatch[1].toLowerCase();
        const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
        const buffer = Buffer.from(base64Data, 'base64');

        // Enforce max 6MB binary size limit
        if (buffer.length > 6 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: 'حجم الصورة يتجاوز الحد المسموح (6 ميغابايت)' });
        }

        const uploadsDir = path.join(__dirname, '../../images/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const safeFilename = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = path.join(uploadsDir, safeFilename);

        fs.writeFileSync(filePath, buffer);

        const relativeUrl = `images/uploads/${safeFilename}`;
        res.status(201).json({
            success: true,
            imageUrl: relativeUrl,
            message: 'تم رفع صورة المنتج بنجاح'
        });
    } catch (err) {
        safeError(res, err, 'فشل حفظ الصورة على الخادم');
    }
});

// UPDATE: Update Product (Price, Stock & optionally Image)
router.patch('/admin/products/:id', requireAdmin, async (req, res) => {
    try {
        const { price_usd, stock, image } = req.body;
        if (image && typeof image === 'string' && image.trim().length > 0) {
            await run('UPDATE products SET price_usd = ?, stock = ?, image = ? WHERE id = ?', [
                parseFloat(price_usd),
                parseInt(stock),
                image.trim(),
                req.params.id
            ]);
        } else {
            await run('UPDATE products SET price_usd = ?, stock = ? WHERE id = ?', [
                parseFloat(price_usd),
                parseInt(stock),
                req.params.id
            ]);
        }
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (err) {
        safeError(res, err);
    }
});

// DELETE: Delete product
router.delete('/admin/products/:id', requireAdmin, async (req, res) => {
    try {
        await run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted permanently' });
    } catch (err) {
        safeError(res, err);
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
        safeError(res, err);
    }
});

// DELETE: Delete order (e.g. test or fake orders)
router.delete('/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
        await run('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err) {
        safeError(res, err);
    }
});


// ==========================================
// CUSTOMER AUTH & PORTAL APIS
// ==========================================

// Email validation regex (standard RFC 5322 compatible format)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Customer Register
router.post('/customer/register', authLimiter, async (req, res) => {
    try {
        let { name, email, password, phone, country, city, address } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'الاسم الكامل مطلوب (حرفين على الأقل)' });
        }

        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'يرجى إدخال بريد إلكتروني صالح' });
        }

        if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
            return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تتراوح بين 6 و 128 حرفاً' });
        }

        const cleanName = sanitizeString(name);
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = sanitizeString(phone || '');
        const cleanCountry = sanitizeString(country || 'Saudi Arabia');
        const cleanCity = sanitizeString(city || 'Riyadh');
        const cleanAddress = sanitizeString(address || '');

        const existing = await query('SELECT id FROM customers WHERE LOWER(email) = ?', [cleanEmail]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const result = await run(`
            INSERT INTO customers (name, email, password_hash, phone, country, city, address, reward_points)
            VALUES (?, ?, ?, ?, ?, ?, ?, 100)
        `, [cleanName, cleanEmail, password_hash, cleanPhone, cleanCountry, cleanCity, cleanAddress]);

        const token = jwt.sign(
            { id: result.lastID, name: cleanName, email: cleanEmail, role: 'customer' },
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
            customer: { id: result.lastID, name: cleanName, email: cleanEmail, phone: cleanPhone, country: cleanCountry, city: cleanCity, address: cleanAddress, reward_points: 100 },
            message: 'تم إنشاء الحساب بنجاح وتمت إضافة 100 نقطة ترحيبية 🎁'
        });
    } catch (err) {
        safeError(res, err);
    }
});

// Customer Login
router.post('/customer/login', authLimiter, async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'البريد أو كلمة المرور غير صحيحة' });
        }

        if (password.length > 128) {
            return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const customers = await query('SELECT * FROM customers WHERE LOWER(email) = ?', [cleanEmail]);

        if (customers.length === 0) {
            // Constant-time execution to prevent timing attack enumeration
            await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
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
            }
        });
    } catch (err) {
        safeError(res, err);
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
        if (!token) return res.status(200).json({ success: false, authenticated: false, message: 'غير مسجل الدخول' });

        const decoded = jwt.verify(token, getJwtSecret());
        if (!decoded || decoded.role !== 'customer') {
            return res.status(200).json({ success: false, authenticated: false, message: 'غير مسجل الدخول' });
        }

        const customers = await query('SELECT id, name, email, phone, country, city, address, reward_points FROM customers WHERE id = ?', [decoded.id]);
        if (customers.length === 0) return res.status(200).json({ success: false, authenticated: false, message: 'العميل غير موجود' });

        const cust = customers[0];

        // Fetch their orders by customer_id match exclusively
        const orders = await query('SELECT * FROM orders WHERE customer_id = ? ORDER BY id DESC', [cust.id]);

        res.json({
            success: true,
            authenticated: true,
            customer: cust,
            orders: orders.map(o => ({
                ...o,
                items: JSON.parse(o.items_json || '[]')
            }))
        });
    } catch (err) {
        res.status(200).json({ success: false, authenticated: false, message: 'جلسة منتهية الصلاحية' });
    }
});

// Customer Update Profile
router.put('/customer/me', async (req, res) => {
    try {
        const token = req.cookies?.lumiere_customer_token || req.headers['authorization']?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'غير مسجل الدخول' });

        const decoded = jwt.verify(token, getJwtSecret());
        if (!decoded || decoded.role !== 'customer') {
            return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
        }

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
        safeError(res, err);
    }
});

module.exports = router;
