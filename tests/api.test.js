const request = require('supertest');
const app = require('../server');
const { initSchema, query, close } = require('../src/database/db');

beforeAll(async () => {
    // Ensure database is initialized before tests
    await initSchema();
});

afterAll(async () => {
    // Gracefully close database connection
    await close();
});

describe('LUMIÈRE Botanics Comprehensive Test Suite', () => {

    // 1. SECURITY & STATIC ASSET ACCESS CONTROL
    describe('Security & Sensitive Asset Isolation', () => {
        it('should block direct access to database file with 403', async () => {
            const res = await request(app).get('/data/lumiere.db');
            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should block access to package.json with 403', async () => {
            const res = await request(app).get('/package.json');
            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should block access to backend source code with 403', async () => {
            const res = await request(app).get('/src/routes/api.js');
            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should allow legitimate public frontend assets (root index.html)', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toBe(200);
            expect(res.text).toContain('LUMIÈRE');
        });
    });

    // 2. PRODUCTS API
    describe('GET /api/products', () => {
        it('should return a list of active products with status 200', async () => {
            const res = await request(app).get('/api/products');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.count).toBeGreaterThan(0);
        });

        it('should filter products by category', async () => {
            const res = await request(app).get('/api/products?category=serums');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            res.body.data.forEach(p => {
                expect(p.category_key).toBe('serums');
            });
        });

        it('should return 404 for a non-existent product ID', async () => {
            const res = await request(app).get('/api/products/non_existent_item_999');
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    // 3. COUPONS API
    describe('POST /api/coupons/validate', () => {
        it('should successfully validate an existing active coupon (GLOW10)', async () => {
            const res = await request(app)
                .post('/api/coupons/validate')
                .send({ code: 'GLOW10' });
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.code).toBe('GLOW10');
            expect(res.body.discountPercent).toBe(10);
        });

        it('should reject an invalid or non-existent coupon code', async () => {
            const res = await request(app)
                .post('/api/coupons/validate')
                .send({ code: 'INVALID_CODE_999' });
            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    // 4. ORDERS & INVENTORY MANAGEMENT API
    describe('POST /api/orders', () => {
        it('should successfully create an order, decrement stock, and return 201', async () => {
            // Check initial stock for 'serum'
            const initialProd = await query('SELECT stock FROM products WHERE id = ?', ['serum']);
            const initialStock = initialProd[0].stock;

            const orderPayload = {
                name: 'Fatima Al-Zahrani',
                phone: '+966559876543',
                country: 'Saudi Arabia',
                city: 'Jeddah',
                address: 'Al-Hamra District, Street 14',
                paymentMethod: 'cod',
                currency: 'SAR',
                couponCode: 'GLOW10',
                items: [
                    { id: 'serum', qty: 2 }
                ]
            };

            const res = await request(app)
                .post('/api/orders')
                .send(orderPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.orderNumber).toBeDefined();
            expect(res.body.currency).toBe('SAR');
            expect(res.body.totalLocal).toBeGreaterThan(0);

            // Verify stock was decremented by 2
            const updatedProd = await query('SELECT stock FROM products WHERE id = ?', ['serum']);
            expect(updatedProd[0].stock).toBe(initialStock - 2);
        });

        it('should reject an order when requested quantity exceeds available stock', async () => {
            const excessiveOrder = {
                name: 'Sara Ahmed',
                phone: '+966512345678',
                country: 'Saudi Arabia',
                city: 'Riyadh',
                address: 'Olaya St',
                items: [
                    { id: 'serum', qty: 20 }
                ]
            };

            // Set stock temporarily low
            await query('UPDATE products SET stock = 3 WHERE id = ?', ['serum']);

            const res = await request(app)
                .post('/api/orders')
                .send(excessiveOrder);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('غير متوفرة حالياً');

            // Restore stock
            await query('UPDATE products SET stock = 100 WHERE id = ?', ['serum']);
        });

        it('should reject an order with invalid phone or empty items', async () => {
            const invalidPayload = {
                name: 'Test',
                phone: '123', // invalid short phone
                country: 'KSA',
                city: 'Riyadh',
                address: 'Main',
                items: []
            };

            const res = await request(app)
                .post('/api/orders')
                .send(invalidPayload);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    // 5. ADMIN AUTH & PASSWORD CHANGE
    describe('Admin Authentication & Security', () => {
        it('should reject login with wrong credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'hacker@attacker.com',
                    password: 'wrong_password_123'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should authenticate admin and set httpOnly cookie', async () => {
            const adminEmail = process.env.ADMIN_EMAIL || (process.env.NODE_ENV === 'test' ? 'admin@test.local' : 'admin@domain.com');
            const adminPassword = process.env.ADMIN_PASSWORD || 'Test_Admin_2026!';

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: adminEmail,
                    password: adminPassword
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.role).toBe('admin');
            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies.some(c => c.includes('lumiere_admin_token'))).toBe(true);
        });

        it('should protect change-password without admin token', async () => {
            const res = await request(app)
                .post('/api/admin/change-password')
                .send({
                    currentPassword: 'any',
                    newPassword: 'NewPassword2026!'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should block mobile image upload without admin credentials', async () => {
            const res = await request(app)
                .post('/api/admin/upload-image')
                .send({
                    imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should successfully upload a product image and update product when authenticated as admin', async () => {
            const adminEmail = process.env.ADMIN_EMAIL || (process.env.NODE_ENV === 'test' ? 'admin@test.local' : 'admin@domain.com');
            const adminPassword = process.env.ADMIN_PASSWORD || 'Test_Admin_2026!';

            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: adminEmail, password: adminPassword });

            const adminCookie = loginRes.headers['set-cookie'];

            const uploadRes = await request(app)
                .post('/api/admin/upload-image')
                .set('Cookie', adminCookie)
                .send({
                    imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                });

            expect(uploadRes.statusCode).toBe(201);
            expect(uploadRes.body.success).toBe(true);
            expect(uploadRes.body.imageUrl).toMatch(/^images\/uploads\/prod_\d+_[a-z0-9]+\.png$/);

            // Verify PATCH product image with the newly uploaded image
            const patchRes = await request(app)
                .patch('/api/admin/products/serum')
                .set('Cookie', adminCookie)
                .send({
                    price_usd: 48,
                    stock: 50,
                    image: uploadRes.body.imageUrl
                });

            expect(patchRes.statusCode).toBe(200);
            expect(patchRes.body.success).toBe(true);
        });
    });

    // 6. CUSTOMER AUTH & PRIVILEGE CLUB
    describe('Customer Authentication & Portal', () => {
        const uniqueEmail = `test.customer.${Date.now()}@example.com`;

        it('should register a new customer and award 100 welcome points', async () => {
            const res = await request(app)
                .post('/api/customer/register')
                .send({
                    name: 'Noura Al-Otaibi',
                    email: uniqueEmail,
                    password: 'SecurePass2026!',
                    phone: '+966501112233',
                    country: 'Saudi Arabia',
                    city: 'Riyadh'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.customer.reward_points).toBe(100);
            expect(res.body.customer.email).toBe(uniqueEmail.toLowerCase());
        });

        it('should reject registration with an already existing email', async () => {
            const res = await request(app)
                .post('/api/customer/register')
                .send({
                    name: 'Duplicate Test',
                    email: uniqueEmail,
                    password: 'Password123!',
                    phone: '+966500000000'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should log in customer and return token cookie', async () => {
            const res = await request(app)
                .post('/api/customer/login')
                .send({
                    email: uniqueEmail,
                    password: 'SecurePass2026!'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.customer.email).toBe(uniqueEmail.toLowerCase());
            const cookies = res.headers['set-cookie'];
            expect(cookies.some(c => c.includes('lumiere_customer_token'))).toBe(true);
        });
    });

    // 7. CLOUD HEALTH CHECK API
    describe('GET /health', () => {
        it('should return health status 200', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('healthy');
            expect(res.body.uptime).toBeDefined();
        });
    });

});
