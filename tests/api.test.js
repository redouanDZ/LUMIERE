const request = require('supertest');
const app = require('../server');
const { initSchema } = require('../src/database/db');

beforeAll(async () => {
    // Ensure database is initialized before tests
    await initSchema();
});

describe('LUMIÈRE Botanics API Test Suite', () => {

    // 1. PRODUCTS API
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

    // 2. COUPONS API
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

    // 3. ORDERS API
    describe('POST /api/orders', () => {
        it('should successfully create an order with valid customer and cart items', async () => {
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
                    { id: 'serum', qty: 1 }
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

    // 4. AUTH LOGIN API
    describe('POST /api/auth/login', () => {
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
    });

    // 5. CLOUD HEALTH CHECK API
    describe('GET /health', () => {
        it('should return health status 200', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('healthy');
        });
    });

});
