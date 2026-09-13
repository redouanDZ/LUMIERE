const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db, query, run } = require('../database/db');
const { validateOrderInput, sanitizeString } = require('../middleware/validator');
const { requireAdmin, getJwtSecret } = require('../middleware/auth');
const { authLimiter, orderLimiter, uploadLimiter } = require('../middleware/rateLimiter');
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
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[password-reset] No SMTP configured. Reset link for ${toEmail}: ${resetUrl}`);
        } else {
            console.warn('[password-reset] SMTP is not configured; reset email was not delivered.');
        }
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
        if (coupon.max_uses != null && Number(coupon.used_count || 0) >= Number(coupon.max_uses)) {
            return res.status(400).json({ success: false, message: 'رمز الخصم مستنفد الاستخدام' });
        }
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
const DUMMY_BCRYPT_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

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
                if (decoded?.id && decoded.role === 'customer') {
                    const sessionRows = await query('SELECT session_version FROM customers WHERE id = ?', [decoded.id]);
                    if (sessionRows.length && Number(decoded.sessionVersion || 0) === Number(sessionRows[0].session_version || 0)) {
                        customerId = decoded.id;
                    }
                }
            }
        } catch (_) {
            // Treat invalid customer cookies as guest checkout.
        }

        const rates = { SAR: 3.75, AED: 3.67, USD: 1, EUR: 0.92, KWD: 0.31, DZD: 220 };
        const rate = rates[currency];
        const currencyDecimals = currency === 'KWD' ? 3 : 2;

        // Validate pricing and reserve stock atomically. No price or stock value
        // from the browser is trusted.
        let totalUsd = 0;
        const processedItems = [];
        let appliedCoupon = null;

        const createOrder = db.transaction(() => {
            for (const item of items) {
                const prod = db.prepare(
                    'SELECT * FROM products WHERE id = ? AND is_active = 1'
                ).get(item.id);

                if (!prod) continue;

                const qty = item.qty;
                const reservation = db.prepare(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND is_active = 1 AND stock >= ?'
                ).run(qty, prod.id, qty);

                if (reservation.changes !== 1) {
                    const current = db.prepare('SELECT title_ar, stock FROM products WHERE id = ?').get(prod.id);
                    const available = current?.stock ?? 0;
                    const error = new Error(`STOCK_UNAVAILABLE:${prod.id}:${available}:${current?.title_ar || ''}`);
                    error.code = 'STOCK_UNAVAILABLE';
                    throw error;
                }

                totalUsd += Number(prod.price_usd) * qty;
                processedItems.push({
                    id: prod.id,
                    title: prod.title_ar,
                    priceUsd: Number(prod.price_usd),
                    qty
                });
            }

            if (processedItems.length === 0) {
                const error = new Error('NO_VALID_PRODUCTS');
                error.code = 'NO_VALID_PRODUCTS';
                throw error;
            }

            if (bundle) {
                const bundleIds = ['serum', 'cream', 'cleanser'];
                const requestedBundleIds = processedItems.map(item => item.id).sort();
                if (
                    processedItems.length !== 3 ||
                    requestedBundleIds.join(',') !== bundleIds.slice().sort().join(',') ||
                    processedItems.some(item => item.qty !== 1)
                ) {
                    const error = new Error('INVALID_BUNDLE');
                    error.code = 'INVALID_BUNDLE';
                    throw error;
                }
                totalUsd *= 0.7;
            }

            if (couponCode) {
                const c = db.prepare(
                    'SELECT * FROM coupons WHERE code = ? AND is_active = 1'
                ).get(couponCode);

                if (c) {
                    if (!Number.isInteger(c.discount_percent) || c.discount_percent < 0 || c.discount_percent > 100) {
                        const error = new Error('INVALID_COUPON_CONFIG');
                        error.code = 'INVALID_COUPON_CONFIG';
                        throw error;
                    }
                    const reservationCount = db.prepare(
                        "SELECT COUNT(*) AS count FROM coupon_reservations WHERE coupon_id = ? AND status IN ('reserved', 'consumed')"
                    ).get(c.id)?.count || 0;
                    const availableUses = c.max_uses == null ? Infinity : Number(c.max_uses) - Number(reservationCount);
                    if (availableUses <= 0) {
                        const error = new Error('COUPON_EXHAUSTED');
                        error.code = 'COUPON_EXHAUSTED';
                        throw error;
                    }
                    totalUsd *= 1 - (c.discount_percent / 100);
                    appliedCoupon = c;
                }
            }

            totalUsd = Math.round(totalUsd * 100) / 100;
            const totalLocal = Math.round(totalUsd * rate * 10 ** currencyDecimals) / 10 ** currencyDecimals;

            const randomSuffix = crypto.randomInt(1000, 10000);
            const orderNumber = `LUM-${Date.now().toString().slice(-6)}-${randomSuffix}`;

            const result = db.prepare(`
                INSERT INTO orders (
                    order_number, customer_id, customer_name, customer_phone, customer_country, customer_city,
                    customer_address, payment_method, currency, total_usd, total_local, items_json, coupon_code,
                    payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                orderNumber, customerId, name, phone, country, city, address, paymentMethod, currency,
                totalUsd, totalLocal, JSON.stringify(processedItems), appliedCoupon?.code || null,
                paymentMethod === 'cod' ? 'pending_cod' : 'pending_payment'
            );

            // Reserve the coupon for this order. For COD it is consumed immediately;
            // for card payments it remains reserved until a verified paid webhook.
            if (appliedCoupon) {
                const reservation = db.prepare(`
                    INSERT INTO coupon_reservations (order_id, coupon_id, status)
                    VALUES (?, ?, ?)
                `).run(result.lastInsertRowid, appliedCoupon.id, paymentMethod === 'cod' ? 'consumed' : 'reserved');

                if (reservation.changes !== 1) {
                    const error = new Error('COUPON_EXHAUSTED');
                    error.code = 'COUPON_EXHAUSTED';
                    throw error;
                }

                if (paymentMethod === 'cod') {
                    const consumed = db.prepare(
                        'UPDATE coupons SET used_count = used_count + 1 WHERE id = ? AND (max_uses IS NULL OR used_count < max_uses)'
                    ).run(appliedCoupon.id);
                    if (consumed.changes !== 1) {
                        const error = new Error('COUPON_EXHAUSTED');
                        error.code = 'COUPON_EXHAUSTED';
                        throw error;
                    }
                }
            }

            return { orderId: Number(result.lastInsertRowid), orderNumber, totalUsd, totalLocal };
        });

        let order;
        try {
            order = createOrder();
        } catch (err) {
            if (err.code === 'STOCK_UNAVAILABLE') {
                const [, , available, title] = err.message.split(':');
                return res.status(400).json({
                    success: false,
                    message: `عذراً، الكمية المطلوبة من [${title}] غير متوفرة حالياً (المتوفر بالمخزن: ${available} قطع)`
                });
            }
            if (err.code === 'NO_VALID_PRODUCTS') {
                return res.status(400).json({ success: false, message: 'سلة المشتريات لا تحتوي على منتجات صالحة' });
            }
            if (err.code === 'INVALID_BUNDLE') {
                return res.status(400).json({ success: false, message: 'تركيبة الباقة غير صالحة' });
            }
            if (err.code === 'COUPON_EXHAUSTED') {
                return res.status(400).json({ success: false, message: 'عذراً، لقد تم استنفاد الحد الأقصى لاستخدام رمز الخصم هذا' });
            }
            throw err;
        }

        // COD is finalized immediately. Registered customers receive points only
        // after a successfully created COD order.
        if (customerId && paymentMethod === 'cod') {
            await run('UPDATE customers SET reward_points = reward_points + 10 WHERE id = ?', [customerId]);
        }

        let paymentUrl = null;

        if (paymentMethod === 'card') {
            if (!process.env.PUBLIC_URL) {
                // Compensating transaction: release stock and delete the pending order.
                db.transaction(() => {
                    const current = db.prepare('SELECT items_json FROM orders WHERE id = ?').get(order.orderId);
                    let reservedItems = [];
                    try { reservedItems = JSON.parse(current?.items_json || '[]'); } catch (_) {}
                    for (const item of reservedItems) {
                        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.qty, item.id);
                    }
                    db.prepare('DELETE FROM coupon_reservations WHERE order_id = ?').run(order.orderId);
                    db.prepare('DELETE FROM orders WHERE id = ?').run(order.orderId);
                })();
                return res.status(503).json({ success: false, message: 'إعداد PUBLIC_URL مطلوب لتفعيل الدفع بالبطاقة في الإنتاج' });
            }

            try {
                const baseUrl = process.env.PUBLIC_URL.replace(/\/$/, '');
                const currencyMinorUnits = currency === 'KWD' ? 1000 : 100;
                const amountMinor = Math.round(order.totalLocal * currencyMinorUnits);

                const moyasarRes = await fetch('https://api.moyasar.com/v1/invoices', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + Buffer.from(process.env.MOYASAR_SECRET_KEY + ':').toString('base64')
                    },
                    body: JSON.stringify({
                        amount: amountMinor,
                        currency,
                        description: `LUMIÈRE Botanics — طلب ${order.orderNumber}`,
                        callback_url: `${baseUrl}/api/webhooks/moyasar`,
                        success_url: `${baseUrl}/order-confirmation.html?order=${encodeURIComponent(order.orderNumber)}`,
                        back_url: `${baseUrl}/`,
                        metadata: { order_number: order.orderNumber, order_id: String(order.orderId) }
                    })
                });

                const invoice = await moyasarRes.json();

                if (!moyasarRes.ok || !invoice.url || !invoice.id) {
                    throw new Error('MOYASAR_INVOICE_FAILED');
                }

                await run(
                    'UPDATE orders SET moyasar_invoice_id = ?, payment_status = ? WHERE id = ? AND payment_status = ?',
                    [invoice.id, 'pending_payment', order.orderId, 'pending_payment']
                );
                paymentUrl = invoice.url;
            } catch (payErr) {
                console.error('[Moyasar] Invoice creation failed:', payErr.message);

                // Release reserved stock and coupon reservation so a failed
                // payment initialization never strands inventory.
                db.transaction(() => {
                    const current = db.prepare('SELECT items_json FROM orders WHERE id = ?').get(order.orderId);
                    let reservedItems = [];
                    try { reservedItems = JSON.parse(current?.items_json || '[]'); } catch (_) {}
                    for (const item of reservedItems) {
                        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.qty, item.id);
                    }
                    db.prepare('DELETE FROM coupon_reservations WHERE order_id = ?').run(order.orderId);
                    db.prepare('DELETE FROM orders WHERE id = ?').run(order.orderId);
                })();

                return res.status(502).json({
                    success: false,
                    message: 'تعذر بدء عملية الدفع بالبطاقة، حاول لاحقاً أو اختر الدفع عند الاستلام'
                });
            }
        }

        res.status(201).json({
            success: true,
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            totalLocal: order.totalLocal,
            currency,
            paymentUrl,
            message: 'تم إنشاء الطلب بنجاح وتم حجز/خصم المخزون'
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
            { id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: Number(user.session_version || 0) },
            getJwtSecret(),
            { expiresIn: '7d' }
        );

        res.cookie('lumiere_admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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
        await run('UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?', [newHash, req.user.id]);

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
        if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
            console.warn('[password-reset] SMTP is required in production; refusing to create an undeliverable reset token.');
            return res.json(generic);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

        await run('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
            [tokenHash, expires, users[0].id]);

        const baseUrl = process.env.PUBLIC_URL
            ? process.env.PUBLIC_URL.replace(/\/$/, '')
            : (process.env.NODE_ENV === 'production' ? null : `${req.protocol}://${req.get('host')}`);
        if (!baseUrl) return res.json(generic);
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
        await run('UPDATE users SET password_hash = ?, session_version = session_version + 1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
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

        const dailySales = await query(`
            SELECT DATE(created_at) as date, SUM(total_local) as revenue
            FROM orders
            ${paidOrderFilter}
            AND created_at >= date('now', '-6 days')
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
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
            dailySales,
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

        const cleanId = String(id || 'prod_' + Date.now()).trim();
        const pUsd = Number(price_usd);
        const pStock = Number(stock);

        if (!/^[A-Za-z0-9_-]{1,64}$/.test(cleanId)) {
            return res.status(400).json({ success: false, message: 'معرّف المنتج غير صالح' });
        }
        if (!Number.isFinite(pUsd) || pUsd <= 0 || pUsd > 1000000) {
            return res.status(400).json({ success: false, message: 'سعر المنتج غير صالح' });
        }
        if (!Number.isInteger(pStock) || pStock < 0 || pStock > 10000000) {
            return res.status(400).json({ success: false, message: 'كمية المخزون غير صالحة' });
        }

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
            : 'images/serum.webp';

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
            pUsd, Math.round(pUsd * 1.3 * 100) / 100, pStock, cleanImage,
            cleanBadgeAr, cleanBadgeEn
        ]);

        res.status(201).json({ success: true, message: 'Product created successfully' });
    } catch (err) {
        safeError(res, err);
    }
});

// UPLOAD: Upload product image from mobile or desktop (Admin only)
router.post('/admin/upload-image', requireAdmin, uploadLimiter, async (req, res) => {
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

        // Validate image signatures instead of trusting the client MIME type.
        const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
        if (!isJpeg && !isPng && !isWebp) {
            return res.status(400).json({ success: false, message: 'محتوى الصورة غير صالح' });
        }

        // Enforce max 6MB binary size limit
        if (buffer.length > 6 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: 'حجم الصورة يتجاوز الحد المسموح (6 ميغابايت)' });
        }

        const uploadsDir = path.join(__dirname, '../../data/uploads');
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
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(req.params.id))) {
            return res.status(400).json({ success: false, message: 'معرّف المنتج غير صالح' });
        }
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
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(req.params.id))) {
            return res.status(400).json({ success: false, message: 'معرّف المنتج غير صالح' });
        }
        await run('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product archived successfully' });
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

        const orders = await query('SELECT id, status, payment_method, payment_status, items_json FROM orders WHERE id = ?', [req.params.id]);
        if (!orders.length) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        const order = orders[0];

        if (status === 'delivered' && order.payment_method === 'card' && order.payment_status !== 'paid') {
            return res.status(409).json({ success: false, message: 'لا يمكن تسليم طلب بطاقة غير مدفوع' });
        }
        if (status === 'shipped' && order.payment_method === 'card' && order.payment_status !== 'paid') {
            return res.status(409).json({ success: false, message: 'لا يمكن شحن طلب بطاقة غير مدفوع' });
        }
        if (order.status === 'cancelled' && status !== 'cancelled') {
            return res.status(409).json({ success: false, message: 'لا يمكن إعادة فتح طلب ملغى' });
        }
        if (status === 'cancelled' && order.payment_status === 'paid') {
            return res.status(409).json({ success: false, message: 'الطلب المدفوع يحتاج إلى معالجة استرداد قبل الإلغاء' });
        }
        if (status === 'cancelled' && order.payment_method === 'card' && order.payment_status === 'pending_payment') {
            return res.status(409).json({ success: false, message: 'انتظر نتيجة الدفع قبل إلغاء طلب البطاقة' });
        }

        if (status === 'cancelled' && order.status !== 'cancelled') {
            db.transaction(() => {
                db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
                if (order.payment_method === 'cod' && order.payment_status === 'pending_cod') {
                    let items = [];
                    try { items = JSON.parse(order.items_json || '[]'); } catch (_) {}
                    for (const item of items) {
                        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.qty, item.id);
                    }
                    const reservation = db.prepare(
                        "SELECT coupon_id FROM coupon_reservations WHERE order_id = ? AND status = 'consumed'"
                    ).get(req.params.id);
                    if (reservation) {
                        db.prepare('UPDATE coupons SET used_count = MAX(0, used_count - 1) WHERE id = ?').run(reservation.coupon_id);
                        db.prepare("UPDATE coupon_reservations SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'consumed'").run(req.params.id);
                    } else {
                        db.prepare("UPDATE coupon_reservations SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'reserved'").run(req.params.id);
                    }
                }
            })();
        } else {
            await run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        }
        res.json({ success: true, message: 'Order status updated' });
    } catch (err) {
        safeError(res, err);
    }
});

// Admin Delete Order
router.delete('/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
        return res.status(405).json({ success: false, message: 'حذف الطلبات المالية غير مسموح؛ استخدم الإلغاء والأرشفة' });
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
            { id: result.lastID, name: cleanName, email: cleanEmail, role: 'customer', sessionVersion: 0 },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        res.cookie('lumiere_customer_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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
            { id: cust.id, name: cust.name, email: cust.email, role: 'customer', sessionVersion: Number(cust.session_version || 0) },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        res.cookie('lumiere_customer_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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
        if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
            console.warn('[password-reset] SMTP is required in production; refusing to create an undeliverable reset token.');
            return res.json(generic);
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

        await run('UPDATE customers SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
            [tokenHash, expires, customers[0].id]);

        const baseUrl = process.env.PUBLIC_URL
            ? process.env.PUBLIC_URL.replace(/\/$/, '')
            : (process.env.NODE_ENV === 'production' ? null : `${req.protocol}://${req.get('host')}`);
        if (!baseUrl) return res.json(generic);
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
        await run('UPDATE customers SET password_hash = ?, session_version = session_version + 1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
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
            { id: customer.id, name: customer.name, email: customer.email, role: 'customer', sessionVersion: Number(customer.session_version || 0) },
            getJwtSecret(),
            { expiresIn: '30d' }
        );

        res.cookie('lumiere_customer_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
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
            : (invoice.status === 'failed' || invoice.status === 'canceled' || invoice.status === 'expired' || invoice.status === 'voided') ? 'payment_failed'
            : invoice.status === 'refunded' ? 'refunded'
            : 'pending_payment';

        const orders = await query(
            'SELECT id, customer_id, items_json, coupon_code, payment_status, payment_method, total_local, currency, status FROM orders WHERE moyasar_invoice_id = ?',
            [invoiceId]
        );
        if (orders.length === 0) {
            return res.status(200).json({ success: true, ignored: true });
        }

        const order = orders[0];

        // Never mark an order paid unless the verified invoice belongs to this
        // exact order and its amount/currency match our server-calculated total.
        const currencyMinorUnits = order.currency === 'KWD' ? 1000 : 100;
        const expectedAmount = Math.round(Number(order.total_local) * currencyMinorUnits);
        if (String(invoice.currency).toUpperCase() !== String(order.currency).toUpperCase() ||
            Number(invoice.amount) !== expectedAmount) {
            console.error('[Moyasar Webhook] Invoice amount/currency mismatch for order', order.id);
            return res.status(409).json({ success: false, message: 'Invoice verification failed' });
        }

        if (newStatus === 'paid') {
            const updated = await run(
                "UPDATE orders SET payment_status = 'paid' WHERE moyasar_invoice_id = ? AND payment_status != 'paid'",
                [invoiceId]
            );
            if (updated.changes > 0) {
                if (order.coupon_code) {
                    const reservation = await query(
                        "SELECT coupon_id FROM coupon_reservations WHERE order_id = ? AND status = 'reserved'",
                        [order.id]
                    );
                    if (reservation.length > 0) {
                        const consumed = await run(
                            "UPDATE coupons SET used_count = used_count + 1 WHERE id = ? AND is_active = 1 AND (max_uses IS NULL OR used_count < max_uses)",
                            [reservation[0].coupon_id]
                        );
                        if (consumed.changes !== 1) {
                            console.error('[Moyasar Webhook] Coupon could not be consumed for order', order.id);
                            return res.status(409).json({ success: false, message: 'Coupon reservation could not be consumed' });
                        }
                        await run(
                            "UPDATE coupon_reservations SET status = 'consumed', updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'reserved'",
                            [order.id]
                        );
                    }
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
                await run(
                    "UPDATE coupon_reservations SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'reserved'",
                    [order.id]
                );
            }
        } else if (newStatus === 'refunded') {
            await run(
                "UPDATE orders SET payment_status = 'refunded' WHERE moyasar_invoice_id = ? AND payment_status = 'paid'",
                [invoiceId]
            );
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
