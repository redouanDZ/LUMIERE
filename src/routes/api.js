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
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = process.env.GOOGLE_CLIENT_ID
    ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    : null;

// --- Password reset helpers ---
// We never store the raw reset token anywhere — only its SHA-256 hash.
// The raw token exists solely inside the emailed/returned link, so a
// database read alone (e.g. via SQL injection elsewhere) cannot be used
// to forge a valid reset.
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sendResetEmail = async (toEmail, resetUrl) => {
    // No SMTP is configured for this project by default. In that case we
    // log the reset link server-side so the store owner can still test the
    // flow locally / during setup. Wire up a real transactional email
    // provider (SMTP env vars + nodemailer, SendGrid, etc.) before selling
    // this to a customer who needs real end-user emails delivered.
    if (!process.env.SMTP_HOST) {
        console.log(`[password-reset] No SMTP configured. Reset link for ${toEmail}: ${resetUrl}`);
        return { delivered: false };
    }
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: toEmail,
            subject: 'إعادة تعيين كلمة المرور — LUMIÈRE Botanics',
            html: `<p>لإعادة تعيين كلمة المرور، افتح الرابط التالي (صالح لمدة 30 دقيقة):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>إن لم تطلب هذا، تجاهل هذه الرسالة.</p>`
        });
        return { delivered: true };
    } catch (e) {
        console.error('[password-reset] Failed to send email:', e.message);
        console.log(`[password-reset] Reset link for ${toEmail}: ${resetUrl}`);
        return { delivered: false };
    }
};

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
router.get('/config', async (req, res) => {
    try {
        const { getStoreConfig } = require('../config/store');
        const config = await getStoreConfig(req.headers['x-tenant-id'] || null);
        res.json({ success: true, data: config });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load configuration' });
    }
});

// Admin: Store contact settings (public-facing values only; payment secrets stay in env).
router.get('/admin/settings', requireAdmin, async (req, res) => {
    try {
        const { getStoreConfig } = require('../config/store');
        const config = await getStoreConfig();
        res.json({ success: true, data: { contact: config.contact } });
    } catch (err) {
        safeError(res, err, 'تعذر تحميل إعدادات المتجر');
    }
});

router.patch('/admin/settings', requireAdmin, async (req, res) => {
    try {
        const email = sanitizeString(req.body.supportEmail || '').trim();
        const whatsapp = String(req.body.whatsappNumber || '').trim();
        const welcomeMessage = sanitizeString(req.body.whatsappWelcomeMsgAr || '').trim();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير صالح' });
        }
        if (!/^\+?[0-9\s()-]{8,24}$/.test(whatsapp)) {
            return res.status(400).json({ success: false, message: 'رقم واتساب غير صالح' });
        }
        if (!welcomeMessage || welcomeMessage.length > 240) {
            return res.status(400).json({ success: false, message: 'رسالة الترحيب مطلوبة وألا تتجاوز 240 حرفاً' });
        }

        const settings = [
            ['support_email', email],
            ['whatsapp_number', whatsapp],
            ['whatsapp_welcome_msg_ar', welcomeMessage]
        ];
        for (const [key, value] of settings) {
            await run(`
                INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            `, [key, value]);
        }

        res.json({ success: true, message: 'تم حفظ بيانات التواصل بنجاح' });
    } catch (err) {
        safeError(res, err, 'تعذر حفظ إعدادات المتجر');
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
        const { name, phone, country, city, address, paymentMethod, currency, items, bundle } = req.sanitizedOrder;
        const couponCode = sanitizeString(req.body.couponCode || '').toUpperCase();

        if (paymentMethod === 'card' && !process.env.MOYASAR_SECRET_KEY) {
            return res.status(503).json({
                success: false,
                message: 'الدفع بالبطاقة غير مُفعّل حالياً على هذا المتجر، الرجاء اختيار الدفع عند الاستلام'
            });
        }

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

        if (bundle) {
            const bundleIds = ['serum', 'cream', 'cleanser'];
            const requestedBundleIds = processedItems.map(item => item.id).sort();
            if (processedItems.length !== 3 || requestedBundleIds.join(',') !== bundleIds.slice().sort().join(',') || processedItems.some(item => item.qty !== 1)) {
                return res.status(400).json({ success: false, message: 'تركيبة الباقة غير صالحة' });
            }
            totalUsd *= 0.7;
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
                        customer_address, payment_method, currency, total_usd, total_local, items_json, coupon_code
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    orderNumber, customerId, name, phone, country, city, address, paymentMethod, currency,
                    totalUsd.toFixed(2), totalLocal, JSON.stringify(processedItems), couponCode || null
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

        // COD orders are final at creation time. Card orders reserve stock but
        // wait for the verified webhook before awarding benefits or consuming a coupon.
        if (appliedCouponId && paymentMethod === 'cod') {
            await run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [appliedCouponId]);
        }

        // Award reward points if registered customer
        if (customerId && paymentMethod === 'cod') {
            await run('UPDATE customers SET reward_points = reward_points + 10 WHERE id = ?', [customerId]);
        }

        // --- Card payment: create a Moyasar hosted-checkout invoice ---
        // Card details never touch our server (PCI scope stays with Moyasar).
        // Order is created first with payment_status='pending_payment'; the
        // webhook below is the single source of truth that marks it 'paid'.
        let paymentUrl = null;
        if (paymentMethod === 'card') {
            try {
                const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
                const moyasarRes = await fetch('https://api.moyasar.com/v1/invoices', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + Buffer.from(process.env.MOYASAR_SECRET_KEY + ':').toString('base64')
                    },
                    body: JSON.stringify({
                        amount: Math.round(totalLocal * 100), // Moyasar expects the smallest currency unit (halalas)
                        currency: currency || 'SAR',
                        description: `LUMIÈRE Botanics — طلب ${orderNumber}`,
                        callback_url: `${baseUrl}/order-confirmation.html?order=${orderNumber}`,
                        metadata: { order_number: orderNumber, order_id: result.lastID }
                    })
                });
                const invoice = await moyasarRes.json();
                if (!moyasarRes.ok || !invoice.url) {
                    console.error('[Moyasar] Invoice creation failed:', invoice);
                    return res.status(502).json({ success: false, message: 'تعذر بدء عملية الدفع بالبطاقة، حاول لاحقاً أو اختر الدفع عند الاستلام' });
                }
                await run('UPDATE orders SET payment_status = ?, moyasar_invoice_id = ? WHERE id = ?',
                    ['pending_payment', invoice.id, result.lastID]);
                paymentUrl = invoice.url;
            } catch (payErr) {
                console.error('[Moyasar] Invoice request error:', payErr.message);
                return res.status(502).json({ success: false, message: 'تعذر الاتصال ببوابة الدفع، حاول لاحقاً أو اختر الدفع عند الاستلام' });
            }
        }

        res.status(201).json({
            success: true,
            orderId: result.lastID,
            orderNumber,
            totalLocal,
            currency,
            paymentUrl, // non-null only for successful card-payment invoices; frontend redirects here
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

// Admin: Request Password Reset
router.post('/auth/forgot-password', authLimiter, async (req, res) => {
    try {
        const email = sanitizeString(req.body.email || '').toLowerCase();
        // Always respond with the same generic message whether or not the
        // email exists — prevents leaking which admin emails are registered.
        const generic = { success: true, message: 'إذا كان البريد مسجلاً، ستصلك رسالة تحتوي رابط إعادة التعيين.' };

        const users = await query('SELECT id, email FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.json(generic);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

        await run('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
            [tokenHash, expires, users[0].id]);

        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${baseUrl}/admin/index.html?resetToken=${rawToken}&type=admin`;
        await sendResetEmail(users[0].email, resetUrl);

        res.json(generic);
    } catch (err) {
        safeError(res, err);
    }
});

// Admin: Complete Password Reset
router.post('/auth/reset-password', authLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'رمز غير صالح أو كلمة مرور قصيرة جداً (8 أحرف على الأقل)' });
        }

        const tokenHash = hashResetToken(token);
        const users = await query(
            'SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > datetime("now")',
            [tokenHash]
        );
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        await run('UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
            [newHash, users[0].id]);

        res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول' });
    } catch (err) {
        safeError(res, err);
    }
});

// ==========================================
// ADMIN FULL CRUD OPERATIONS
// ==========================================

// 1. STATS & ANALYTICS
router.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const paidOrderFilter = "WHERE payment_status IN ('paid', 'pending_cod') AND status != 'cancelled'";
        const totalOrders = await query(`SELECT COUNT(*) as count, SUM(total_usd) as totalRevenue FROM orders ${paidOrderFilter}`);
        const ordersList = await query('SELECT * FROM orders ORDER BY id DESC LIMIT 50');
        const productsCount = await query('SELECT COUNT(*) as count FROM products');
        const couponsCount = await query('SELECT COUNT(*) as count FROM coupons');

        const countryStats = await query(`
            SELECT customer_country as country, COUNT(*) as count, SUM(total_usd) as revenue
            FROM orders ${paidOrderFilter} GROUP BY customer_country ORDER BY count DESC LIMIT 5
        `);

        const customersList = await query(`
            SELECT c.id, c.name, c.phone, c.city, c.country, 
                   COUNT(CASE WHEN o.payment_status IN ('paid', 'pending_cod') AND o.status != 'cancelled' THEN o.id END) as total_orders,
                   COALESCE(SUM(CASE WHEN o.payment_status IN ('paid', 'pending_cod') AND o.status != 'cancelled' THEN o.total_usd ELSE 0 END), 0) as total_spent,
                   MAX(o.created_at) as last_order_date
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id
            GROUP BY c.id
            ORDER BY c.id DESC LIMIT 50
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

        if (!title_ar || typeof title_ar !== 'string' || !title_ar.trim()) {
            return res.status(400).json({ success: false, message: 'عنوان المنتج (عربي) مطلوب' });
        }

        // Sanitize ALL user-supplied text fields before persisting — these are
        // rendered later via innerHTML on the public storefront (js/lumiere.js),
        // so unsanitized input here becomes stored XSS for every visitor.
        const cleanTitleAr = sanitizeString(title_ar);
        const cleanTitleEn = sanitizeString(title_en) || cleanTitleAr;
        const cleanCategoryAr = sanitizeString(category_ar) || 'عناية فاخرة';
        const cleanCategoryEn = sanitizeString(category_en) || 'Luxury Care';
        const cleanDescAr = sanitizeString(desc_ar);
        const cleanDescEn = sanitizeString(desc_en);
        const cleanBenefitsAr = sanitizeString(benefits_ar);
        const cleanBenefitsEn = sanitizeString(benefits_en);
        const cleanUsageAr = sanitizeString(usage_ar);
        const cleanUsageEn = sanitizeString(usage_en);
        const cleanIngredients = sanitizeString(ingredients);
        const cleanBadgeAr = sanitizeString(badge_ar) || 'جديد';
        const cleanBadgeEn = sanitizeString(badge_en) || 'New';
        // image is a path/filename, not free text — restrict to safe path characters
        const cleanImage = (typeof image === 'string' && /^[a-zA-Z0-9/_.-]+$/.test(image))
            ? image
            : 'images/serum.jpg';

        await run(`
            INSERT INTO products (
                id, category_key, title_ar, title_en, category_ar, category_en,
                desc_ar, desc_en, benefits_ar, benefits_en, usage_ar, usage_en,
                ingredients, price_usd, original_price_usd, stock, image, badge_ar, badge_en
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            cleanId, sanitizeString(categoryKey) || 'serums', cleanTitleAr, cleanTitleEn,
            cleanCategoryAr, cleanCategoryEn,
            cleanDescAr, cleanDescEn, cleanBenefitsAr, cleanBenefitsEn,
            cleanUsageAr, cleanUsageEn, cleanIngredients,
            pUsd, (pUsd * 1.3).toFixed(2), pStock, cleanImage,
            cleanBadgeAr, cleanBadgeEn
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
        const parsedPrice = Number(price_usd);
        const parsedStock = Number(stock);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedStock) || parsedStock < 0) {
            return res.status(400).json({ success: false, message: 'السعر والمخزون غير صالحين' });
        }
        if (image && (!/^images\/uploads\/[a-zA-Z0-9._-]+$/.test(image.trim()) || image.includes('..'))) {
            return res.status(400).json({ success: false, message: 'مسار صورة غير صالح' });
        }
        if (image && typeof image === 'string' && image.trim().length > 0) {
            await run('UPDATE products SET price_usd = ?, stock = ?, image = ? WHERE id = ?', [
                parsedPrice,
                parsedStock,
                image.trim(),
                req.params.id
            ]);
        } else {
            await run('UPDATE products SET price_usd = ?, stock = ? WHERE id = ?', [
                parsedPrice,
                parsedStock,
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

// Admin Delete Order
router.delete('/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
        await run('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم حذف الطلب' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'فشل الحذف' });
    }
});

// Admin Delete Customer
router.delete('/admin/customers/:id', requireAdmin, async (req, res) => {
    try {
        const customerId = req.params.id;
        const customers = await query('SELECT id FROM customers WHERE id = ?', [customerId]);
        if (customers.length === 0) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود' });
        }
        // Nullify customer_id in orders to keep financial records
        await run('UPDATE orders SET customer_id = NULL WHERE customer_id = ?', [customerId]);
        // Delete customer
        await run('DELETE FROM customers WHERE id = ?', [customerId]);
        res.json({ success: true, message: 'تم حذف حساب العميل بنجاح' });
    } catch (err) {
        console.error('Delete customer error:', err);
        res.status(500).json({ success: false, message: 'فشل الحذف' });
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

// Customer: Request Password Reset
router.post('/customer/forgot-password', authLimiter, async (req, res) => {
    try {
        const email = sanitizeString(req.body.email || '').toLowerCase();
        const generic = { success: true, message: 'إذا كان البريد مسجلاً، ستصلك رسالة تحتوي رابط إعادة التعيين.' };

        const customers = await query('SELECT id, email FROM customers WHERE email = ?', [email]);
        if (customers.length === 0) {
            return res.json(generic);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

        await run('UPDATE customers SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
            [tokenHash, expires, customers[0].id]);

        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
        const resetUrl = `${baseUrl}/index.html?resetToken=${rawToken}&type=customer`;
        await sendResetEmail(customers[0].email, resetUrl);

        res.json(generic);
    } catch (err) {
        safeError(res, err);
    }
});

// Customer: Complete Password Reset
router.post('/customer/reset-password', authLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'رمز غير صالح أو كلمة مرور قصيرة جداً (6 أحرف على الأقل)' });
        }

        const tokenHash = hashResetToken(token);
        const customers = await query(
            'SELECT id FROM customers WHERE reset_token_hash = ? AND reset_token_expires > datetime("now")',
            [tokenHash]
        );
        if (customers.length === 0) {
            return res.status(400).json({ success: false, message: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await run('UPDATE customers SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
            [newHash, customers[0].id]);

        res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول' });
    } catch (err) {
        safeError(res, err);
    }
});

// Customer: Google Sign-In
// SECURITY: unlike an earlier abandoned attempt at this feature, the ID
// token's cryptographic signature IS verified here against Google's public
// keys via google-auth-library — we never trust a client-decoded payload.
router.post('/customer/google-login', authLimiter, async (req, res) => {
    try {
        if (!googleClient) {
            return res.status(503).json({ success: false, message: 'تسجيل الدخول عبر Google غير مُفعّل على هذا الخادم (GOOGLE_CLIENT_ID غير مضبوط)' });
        }
        const { credential } = req.body;
        if (!credential || typeof credential !== 'string') {
            return res.status(400).json({ success: false, message: 'رمز Google مفقود' });
        }

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } catch (verifyErr) {
            return res.status(401).json({ success: false, message: 'رمز Google غير صالح' });
        }

        if (!payload || !payload.email || !payload.email_verified) {
            return res.status(401).json({ success: false, message: 'يجب أن يكون بريد Google موثقاً' });
        }

        const email = sanitizeString(payload.email).toLowerCase();
        const name = sanitizeString(payload.name || payload.given_name || 'عميلة Google');
        const googleSub = payload.sub;

        let customer;
        const existing = await query('SELECT * FROM customers WHERE email = ? OR google_sub = ?', [email, googleSub]);

        if (existing.length > 0) {
            customer = existing[0];
            if (!customer.google_sub) {
                await run('UPDATE customers SET google_sub = ? WHERE id = ?', [googleSub, customer.id]);
            }
        } else {
            // New account: password login is disabled by storing a random,
            // unusable bcrypt hash (satisfies the NOT NULL constraint only).
            const unusableHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
            const result = await run(`
                INSERT INTO customers (name, email, password_hash, phone, country, city, address, reward_points, google_sub)
                VALUES (?, ?, ?, '', 'Saudi Arabia', 'Riyadh', '', 100, ?)
            `, [name, email, unusableHash, googleSub]);
            customer = { id: result.lastID, name, email, phone: '', country: 'Saudi Arabia', city: 'Riyadh', address: '', reward_points: 100 };
        }

        const token = jwt.sign(
            { id: customer.id, name: customer.name, email: customer.email, role: 'customer' },
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
                id: customer.id, name: customer.name, email: customer.email,
                phone: customer.phone, country: customer.country, city: customer.city,
                address: customer.address, reward_points: customer.reward_points
            }
        });
    } catch (err) {
        safeError(res, err);
    }
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

// --- Moyasar Payment Webhook ---
// IMPORTANT: Moyasar does NOT sign webhooks with HMAC. It simply echoes a
// shared `secret_token` field inside the JSON body — a much weaker scheme
// than HMAC, since a leaked/guessed token alone (not a per-request
// signature) is enough to satisfy this check. To compensate, we treat the
// webhook body only as a trigger and NEVER trust its `status` field:
// instead we re-fetch the invoice directly from Moyasar's API using our
// own secret key, and only that server-to-server response decides whether
// an order is marked 'paid'. This makes body tampering irrelevant.
router.post('/webhooks/moyasar', async (req, res) => {
    try {
        if (!process.env.MOYASAR_WEBHOOK_SECRET || !process.env.MOYASAR_SECRET_KEY) {
            console.error('[Moyasar Webhook] MOYASAR_WEBHOOK_SECRET or MOYASAR_SECRET_KEY not configured — rejecting webhook');
            return res.status(503).json({ success: false });
        }

        const receivedToken = req.body?.secret_token;
        const expectedToken = process.env.MOYASAR_WEBHOOK_SECRET;
        const tokenBuf = Buffer.from(String(receivedToken || ''));
        const expectedBuf = Buffer.from(expectedToken);
        const validToken = receivedToken
            && tokenBuf.length === expectedBuf.length
            && crypto.timingSafeEqual(tokenBuf, expectedBuf);

        if (!validToken) {
            console.warn('[Moyasar Webhook] Invalid or missing secret_token — possible forged request');
            return res.status(401).json({ success: false, message: 'Invalid secret token' });
        }

        // The payment object nested in `data` references the invoice it paid.
        const payment = req.body?.data;
        const invoiceId = payment?.invoice_id;
        if (!invoiceId) {
            // Not every payment event is tied to an invoice (e.g. direct
            // card charges outside our checkout flow) — nothing to do here.
            return res.status(200).json({ success: true, ignored: true });
        }

        // Re-fetch the invoice from Moyasar directly — this is the actual
        // source of truth, not anything in the webhook body itself.
        const invoiceRes = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
            headers: { 'Authorization': 'Basic ' + Buffer.from(process.env.MOYASAR_SECRET_KEY + ':').toString('base64') }
        });
        if (!invoiceRes.ok) {
            console.error('[Moyasar Webhook] Failed to re-fetch invoice', invoiceId, invoiceRes.status);
            return res.status(502).json({ success: false });
        }
        const invoice = await invoiceRes.json();

        const newStatus = invoice.status === 'paid' ? 'paid'
            : (invoice.status === 'failed' || invoice.status === 'canceled' || invoice.status === 'expired') ? 'payment_failed'
            : 'pending_payment';

        const orders = await query(
            'SELECT id, customer_id, items_json, coupon_code, payment_status FROM orders WHERE moyasar_invoice_id = ?',
            [invoiceId]
        );
        if (orders.length === 0) {
            return res.status(200).json({ success: true, ignored: true });
        }

        const order = orders[0];
        if (newStatus === 'paid') {
            const updated = await run(
                "UPDATE orders SET payment_status = 'paid' WHERE moyasar_invoice_id = ? AND payment_status != 'paid'",
                [invoiceId]
            );
            if (updated.changes > 0) {
                if (order.coupon_code) {
                    await run('UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND is_active = 1', [order.coupon_code]);
                }
                if (order.customer_id) {
                    await run('UPDATE customers SET reward_points = reward_points + 10 WHERE id = ?', [order.customer_id]);
                }
            }
        } else if (newStatus === 'payment_failed') {
            const updated = await run(
                "UPDATE orders SET payment_status = 'payment_failed' WHERE moyasar_invoice_id = ? AND payment_status = 'pending_payment'",
                [invoiceId]
            );
            if (updated.changes > 0) {
                let reservedItems = [];
                try {
                    reservedItems = JSON.parse(order.items_json || '[]');
                } catch (parseErr) {
                    console.error('[Moyasar Webhook] Invalid order items JSON:', order.id);
                }
                for (const item of reservedItems) {
                    await run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.id]);
                }
            }
        } else {
            await run('UPDATE orders SET payment_status = ? WHERE moyasar_invoice_id = ?', [newStatus, invoiceId]);
        }

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[Moyasar Webhook] Processing error:', err.message);
        res.status(500).json({ success: false });
    }
});

// Public: Check payment status for the post-checkout confirmation page.
// Deliberately returns only non-sensitive status fields — no customer PII —
// since this endpoint is unauthenticated and reachable by anyone with the
// order number (which is not a secret, but shouldn't leak address/phone).
router.get('/orders/:orderNumber/status', async (req, res) => {
    try {
        const orderNumber = sanitizeString(req.params.orderNumber);
        const orders = await query(
            'SELECT order_number, status, payment_status, total_local, currency FROM orders WHERE order_number = ?',
            [orderNumber]
        );
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        }
        res.json({ success: true, data: orders[0] });
    } catch (err) {
        safeError(res, err);
    }
});

module.exports = router;
