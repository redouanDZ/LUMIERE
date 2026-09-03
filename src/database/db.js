const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../../data/lumiere.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Failed to connect to SQLite:', err);
    else console.log('✓ Connected to SQLite database:', dbPath);
});

// Promisified helpers
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const initSchema = async () => {
    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            category_key TEXT NOT NULL,
            title_ar TEXT NOT NULL,
            title_en TEXT NOT NULL,
            category_ar TEXT NOT NULL,
            category_en TEXT NOT NULL,
            desc_ar TEXT NOT NULL,
            desc_en TEXT NOT NULL,
            benefits_ar TEXT,
            benefits_en TEXT,
            usage_ar TEXT,
            usage_en TEXT,
            ingredients TEXT,
            price_usd REAL NOT NULL,
            original_price_usd REAL NOT NULL,
            rating REAL DEFAULT 5.0,
            reviews_count INTEGER DEFAULT 0,
            stock INTEGER DEFAULT 100,
            image TEXT NOT NULL,
            badge_ar TEXT,
            badge_en TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discount_percent INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 1000,
            used_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_country TEXT NOT NULL,
            customer_city TEXT NOT NULL,
            customer_address TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            currency TEXT NOT NULL,
            total_usd REAL NOT NULL,
            total_local REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            items_json TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_city TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL,
            is_verified INTEGER DEFAULT 1,
            is_approved INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Seed default admin
    const adminExists = await query('SELECT * FROM users WHERE email = ?', ['admin@lumiere-botanics.com']);
    if (adminExists.length === 0) {
        const hashed = await bcrypt.hash('lumiere2026!', 10);
        await run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
            'LUMIÈRE Director',
            'admin@lumiere-botanics.com',
            hashed,
            'admin'
        ]);
        console.log('✓ Seeded default Admin user: admin@lumiere-botanics.com');
    }

    // Seed default coupons
    await run('INSERT OR IGNORE INTO coupons (code, discount_percent) VALUES (?, ?)', ['GLOW10', 10]);
    await run('INSERT OR IGNORE INTO coupons (code, discount_percent) VALUES (?, ?)', ['PARIS20', 20]);

    // Seed default products if empty
    const prodCount = await query('SELECT COUNT(*) as count FROM products');
    if (prodCount[0].count === 0) {
        const initialProducts = [
            {
                id: 'serum',
                categoryKey: 'serums',
                title_ar: 'سيروم إكسير النضارة الفائق',
                title_en: 'Radiance Elixir Vitamin C & HA Serum',
                category_ar: 'عناية مركزة وإشراقة',
                category_en: 'Radiance & Brightening',
                desc_ar: 'تركيبة نقية تجمع بين فيتامين C الثابت وحمض الهيالورونيك الثلاثي ومستخلصات الورد العضوي لإشراقة فورية وتوحيد لون البشرة.',
                desc_en: 'Pure botanical formula combining stabilized Vitamin C, Triple Hyaluronic Acid, and organic rose extracts for immediate luminous radiance.',
                benefits_ar: '• يقلل التصبغات والبقع الداكنة بنسبة 45%\n• يعزز إشراقة ونضارة البشرة خلال 7 أيام',
                benefits_en: '• Reduces dark spots and pigmentation by 45%\n• Restores radiant, healthy glow in 7 days',
                usage_ar: 'ضعي 3-4 قطرات صباحاً ومساءً على بشرة نظيفة قبل المرطب.',
                usage_en: 'Apply 3-4 drops morning and night to cleansed skin.',
                ingredients: '15% Stabilized Vitamin C, Triple Hyaluronic Acid, Organic Damask Rose Water, Botanical Squalane.',
                price_usd: 48,
                original_price_usd: 65,
                rating: 4.95,
                reviews_count: 342,
                image: 'images/serum.jpg',
                badge_ar: 'الأكثر مبيعاً',
                badge_en: 'Best Seller'
            },
            {
                id: 'cream',
                categoryKey: 'creams',
                title_ar: 'كريم الببتيدات لتجديد وترميم البشرة',
                title_en: 'Peptide Rejuvenating Night Cream',
                category_ar: 'ترميم ومقاومة علامات التقدم',
                category_en: 'Anti-Aging & Restoration',
                desc_ar: 'كريم ليلي مخملي غني بالببتيدات المعززة للكولاجين وزهر الياسمين لشد البشرة ومحاربة الخطوط الدقيقة أثناء النوم.',
                desc_en: 'Velvety night cream powered by collagen-boosting peptides and jasmine essence to firm, plump, and smooth fine lines overnight.',
                benefits_ar: '• يحفز إنتاج الكولاجين الطبيعي بنسبة 60%\n• يمنح مرونة وملمساً حريرياً فائق النعومة',
                benefits_en: '• Boosts natural collagen synthesis by up to 60%\n• Delivers supreme elasticity and velvet-soft texture',
                usage_ar: 'يدلك بلطف على الوجه والرقبة كل ليلة.',
                usage_en: 'Gently massage onto face and neck every night.',
                ingredients: 'Hexapeptide Complex, Organic Jasmine Flower Extract, Shea Butter, Ceramides NP.',
                price_usd: 54,
                original_price_usd: 72,
                rating: 4.92,
                reviews_count: 284,
                image: 'images/cream.jpg',
                badge_ar: 'جائزة النقاء 2026',
                badge_en: 'Award Winner'
            },
            {
                id: 'eye_cream',
                categoryKey: 'creams',
                title_ar: 'كريم محيط العين بالببتيدات والكافيين',
                title_en: 'Eye Contour Peptide Firming Cream',
                category_ar: 'عناية فائقة بمحيط العين',
                category_en: 'Eye & Lip Care',
                desc_ar: 'تركيبة متقدمة تستهدف الهالات السوداء والانتفاخات وتشد الجفون العلوية بمزيج الكافيين المركز ومستخلص الشاي الأبيض.',
                desc_en: 'Targeted luxury treatment designed to visibly diminish dark circles, deflate puffiness, and smooth delicate eye contours.',
                benefits_ar: '• تفتيح فوري لمنطقة تحت العين بنسبة 35%\n• إزالة الانتفاخ والإجهاد الصباحي بفضل الكافيين',
                benefits_en: '• Instantly brightens under-eye shadows by 35%\n• Depuffs morning tiredness with bio-caffeine',
                usage_ar: 'يطبق بلطف بطرف الإصبع بحركات نقر خفيفة حول عظم العين صباحاً ومساءً.',
                usage_en: 'Pat gently around orbital bone morning and evening.',
                ingredients: 'Green Tea Caffeine, Matrixyl 3000, Vitamin K, White Peony Extract.',
                price_usd: 42,
                original_price_usd: 58,
                rating: 4.89,
                reviews_count: 219,
                image: 'images/eye_cream.jpg',
                badge_ar: 'مفضل الخبراء',
                badge_en: 'Dermatologist Pick'
            },
            {
                id: 'cleanser',
                categoryKey: 'cleansers',
                title_ar: 'غسول الوجه النباتي المهدئ والمنقي',
                title_en: 'Gentle Botanical Purifying Cleanser',
                category_ar: 'تنظيف عميق وترطيب',
                category_en: 'Hydrating Cleanser',
                desc_ar: 'مستحضر رغوي لطيف بخلاصة الصبار الطبيعي والشاي الأخضر وزيت شجرة الشاي لإزالة الشوائب دون تجريد البشرة.',
                desc_en: 'Gentle foaming cleanser with organic aloe vera, green tea, and calming chamomile that dissolves impurities effortlessly.',
                benefits_ar: '• يزيل 99% من الأوساخ وبقايا المكياج\n• يحافظ على درجة حموضة متوازنة pH 5.5',
                benefits_en: '• Removes 99% of impurities and makeup\n• Balances skin microbiome at optimal pH 5.5',
                usage_ar: 'يدلك على بشرة مبللة لمدة 60 ثانية ثم يشطف بالماء الفاتر.',
                usage_en: 'Massage onto damp skin for 60 seconds, then rinse.',
                ingredients: 'Aloe Barbadensis Leaf Juice, Green Tea, Chamomile Extract, Coconut Amino Acids.',
                price_usd: 36,
                original_price_usd: 45,
                rating: 4.88,
                reviews_count: 194,
                image: 'images/cleanser.jpg',
                badge_ar: 'طبيعي 100%',
                badge_en: '100% Organic'
            },
            {
                id: 'toner',
                categoryKey: 'cleansers',
                title_ar: 'تونر ماء الورد والنياسيناميد لشد المسام',
                title_en: 'Rosewater & Niacinamide Hydrating Toner',
                category_ar: 'توحيد لون وشد المسام',
                category_en: 'Toner & Essence',
                desc_ar: 'إكسير منعش يجمع بين مقطر الورد الدمشقي العضوي و 5% نياسيناميد لتضييق المسام الواسعة واستعادة الإشراقة الفورية.',
                desc_en: 'Refreshing clarifying essence mist infused with pure organic rose floral water and 5% Niacinamide to tighten pores and revive dull skin.',
                benefits_ar: '• يقلل مظهر المسام الواسعة بنسبة 50%\n• يوازن إفراز الدهون ويمنح انتعاشاً يدوم طوال اليوم',
                benefits_en: '• Minimizes enlarged pores by 50%\n• Balances oiliness while quenching deep dehydration',
                usage_ar: 'يرش مباشرة على الوجه بعد الغسول.',
                usage_en: 'Mist directly over face after cleansing.',
                ingredients: '100% Organic Rosa Damascena Hydrosol, 5% Niacinamide, Glycerin, Witch Hazel.',
                price_usd: 34,
                original_price_usd: 46,
                rating: 4.91,
                reviews_count: 168,
                image: 'images/toner.jpg',
                badge_ar: 'جديد ومميز',
                badge_en: 'New Arrival'
            },
            {
                id: 'mask',
                categoryKey: 'cleansers',
                title_ar: 'قناع الطمي الوردي الفرنسي للتنقية والديتوكس',
                title_en: 'French Pink Clay Pore Detox Mask',
                category_ar: 'ديتوكس وتنقية عميقة',
                category_en: 'Detox & Spa Mask',
                desc_ar: 'قناع السبا الفاخر من الطمي الوردي الفرنسي واللافندر وزيت الورد لتنقية المسام من الأعماق وتقشير الخلايا الميتة بلطف.',
                desc_en: 'Luxurious spa clay treatment crafted with authentic French pink montmorillonite clay to detoxify pores and unveil a glowing complexion.',
                benefits_ar: '• يسحب السموم والدهون الزائدة بدون تجفيف\n• يمنح ملمساً حريرياً موحداً ولوناً وردياً جذاباً',
                benefits_en: '• Draws out micro-pollutants and impurities\n• Leaves skin radiant, ultra-soft and gently refined',
                usage_ar: 'يوزع بطبقة متساوية، يترك لمدة 10-12 دقيقة، ثم يشطف بالماء.',
                usage_en: 'Apply an even layer, leave for 10-12 minutes, then rinse.',
                ingredients: 'French Pink Kaolin Clay, Rose Petal Powder, Lavender Flower Oil, Jojoba Esters.',
                price_usd: 39,
                original_price_usd: 52,
                rating: 4.94,
                reviews_count: 227,
                image: 'images/mask.jpg',
                badge_ar: 'أعلى تقييم',
                badge_en: 'Top Rated'
            }
        ];

        for (const p of initialProducts) {
            await run(`
                INSERT INTO products (
                    id, category_key, title_ar, title_en, category_ar, category_en,
                    desc_ar, desc_en, benefits_ar, benefits_en, usage_ar, usage_en,
                    ingredients, price_usd, original_price_usd, rating, reviews_count,
                    image, badge_ar, badge_en
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                p.id, p.categoryKey, p.title_ar, p.title_en, p.category_ar, p.category_en,
                p.desc_ar, p.desc_en, p.benefits_ar, p.benefits_en, p.usage_ar, p.usage_en,
                p.ingredients, p.price_usd, p.original_price_usd, p.rating, p.reviews_count,
                p.image, p.badge_ar, p.badge_en
            ]);
        }
        console.log('✓ Seeded 6 luxury products into SQLite');
    }
};

module.exports = {
    db,
    query,
    run,
    initSchema
};
