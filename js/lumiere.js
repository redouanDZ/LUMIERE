/**
 * LUMIÈRE BOTANICS — International Luxury Skincare Engine
 * Supports Multi-Currency, Instant Arabic/English Translation, Cart Drawer & 1-Click Fast Checkout
 */

const CURRENCIES = {
    SAR: { rate: 3.75, symbol: 'ر.س', prefix: false },
    AED: { rate: 3.67, symbol: 'د.إ', prefix: false },
    USD: { rate: 1.0, symbol: '$', prefix: true },
    EUR: { rate: 0.92, symbol: '€', prefix: true },
    KWD: { rate: 0.31, symbol: 'د.ك', prefix: false },
    DZD: { rate: 220, symbol: 'د.ج', prefix: false }
};

const PRODUCTS = [
    {
        id: 'serum',
        title: {
            ar: 'سيروم إكسير النضارة الفائق',
            en: 'Radiance Elixir Vitamin C & HA Serum'
        },
        category: {
            ar: 'عناية مركزة وإشراقة',
            en: 'Radiance & Brightening'
        },
        desc: {
            ar: 'تركيبة نقية تجمع بين فيتامين C الثابت وحمض الهيالورونيك الثلاثي ومستخلصات الورد العضوي لإشراقة فورية وتوحيد لون البشرة.',
            en: 'Pure botanical formula combining stabilized Vitamin C, Triple Hyaluronic Acid, and organic rose extracts for immediate luminous radiance.'
        },
        basePriceUsd: 48,
        originalPriceUsd: 65,
        rating: '4.9',
        reviews: 312,
        image: 'images/serum.jpg',
        badge: { ar: 'الأكثر مبيعاً', en: 'Best Seller' }
    },
    {
        id: 'cream',
        title: {
            ar: 'كريم الببتيدات لتجديد وترميم البشرة',
            en: 'Peptide Rejuvenating Night Cream'
        },
        category: {
            ar: 'ترميم ومقاومة علامات التقدم',
            en: 'Anti-Aging & Restoration'
        },
        desc: {
            ar: 'كريم ليلي مخملي غني بالببتيدات المعززة للكولاجين وزهر الياسمين لشد البشرة ومحاربة الخطوط الدقيقة أثناء النوم.',
            en: 'Velvety night cream powered by collagen-boosting peptides and jasmine essence to firm, plump, and smooth fine lines overnight.'
        },
        basePriceUsd: 54,
        originalPriceUsd: 72,
        rating: '4.95',
        reviews: 248,
        image: 'images/cream.jpg',
        badge: { ar: 'جائزة النقاء 2026', en: 'Award Winner' }
    },
    {
        id: 'cleanser',
        title: {
            ar: 'غسول الوجه النباتي المهدئ والمنقي',
            en: 'Gentle Botanical Purifying Cleanser'
        },
        category: {
            ar: 'تنظيف عميق وترطيب',
            en: 'Hydrating Cleanser'
        },
        desc: {
            ar: 'مستحضر رغوي لطيف بخلاصة الصبار الطبيعي والشاي الأخضر وزيت شجرة الشاي لإزالة الشوائب وتنظيف المسام دون تجريد البشرة من زيوتها الطبيعية.',
            en: 'Gentle foaming cleanser with organic aloe vera, green tea, and calming chamomile that dissolves impurities without stripping moisture.'
        },
        basePriceUsd: 36,
        originalPriceUsd: 45,
        rating: '4.88',
        reviews: 194,
        image: 'images/cleanser.jpg',
        badge: { ar: 'طبيعي 100%', en: '100% Organic' }
    }
];

const TRANSLATIONS = {
    ar: {
        announcement: '✨ عرض حصري: شحن سريع مجاني لجميع دول الخليج والعالم للطلبات فوق 200 ريال',
        navSerum: 'السيروم',
        navCream: 'كريم الببتيدات',
        navCleanser: 'الغسول النباتي',
        navBundle: 'مجموعة النضارة',
        heroTag: 'العناية الباريسية الفاخرة',
        heroTitle: 'سر النضارة والإشراقة الخالدة لبشرتك',
        heroDesc: 'مستحضرات عناية طبيعية 100% مصممة بأعلى معايير النقاء السريري لتمنح بشرتك حيوية متجددة وملمساً ناعماً كالحرير.',
        btnDiscover: 'اكتشف المجموعة',
        btnBuyNow: 'تسوق الآن',
        trust1Title: 'عضوي ونباتي 100%',
        trust1Desc: 'مكونات نقية معتمدة دولياً',
        trust2Title: 'شحن خليجي سريع',
        trust2Desc: 'توصيل لباب المنزل خلال 48 ساعة',
        trust3Title: 'دفع آمن أو عند الاستلام',
        trust3Desc: 'Apple Pay، مدى، فيزا، والدفع عند الاستلام',
        trust4Title: 'مضمون طبياً وجلدياً',
        trust4Desc: 'مختبر سريرياً ومناسب للبشرة الحساسة',
        productsTag: 'المجموعة الحصرية',
        productsTitle: 'مستحضرات النضارة الأكثر طلباً',
        btnAddCart: 'أضف للسلة',
        btnFastBuy: 'شراء سريع',
        bundleTag: 'عرض التوفير الأكبر',
        bundleTitle: 'مجموعة طقوس الإشراقة الكاملة (The Glow Ritual Set)',
        bundleDesc: 'احصلي على الثلاثي المتكامل: الغسول المنقي + سيروم النضارة + كريم الببتيدات الليلي بخصم استثنائي 30% مع شحن مجاني وحقيبة قطنية فاخرة.',
        bundleFeat1: 'توفير 30% مقارنة بشراء كل منتج منفرداً',
        bundleFeat2: 'روتين صباحي ومسائي متكامل للوجه والعنق',
        bundleFeat3: 'نتائج ملحوظة ونضارة مضاعفة خلال 7 أيام',
        bundleBuy: 'اطلب المجموعة كاملة الآن بخصم 30%',
        cartTitle: 'حقيبة التسوق',
        cartEmpty: 'حقيبة التسوق فارغة حالياً.',
        cartTotal: 'المجموع الإجمالي:',
        btnCheckout: 'إتمام الطلب السريع ⚡',
        checkoutTitle: 'إتمام الطلب والشحن السريع',
        lblFullName: 'الاسم الكامل *',
        lblPhone: 'رقم الجوال (مع مفتاح الدولة) *',
        lblCountry: 'الدولة وموقع التوصيل *',
        lblCity: 'المدينة / المنطقة *',
        lblAddress: 'العنوان بالتفصيل *',
        lblPayment: 'طريقة الدفع المفضلة *',
        payCod: 'الدفع عند الاستلام (COD)',
        payCard: 'بطاقة بنكية / مدى / Apple Pay',
        btnConfirmOrder: 'تأكيد الطلب وشحن المنتجات فوراً 🛍️',
        btnWhatsAppOrder: 'تأكيد الطلب السريع عبر WhatsApp 💬',
        orderSuccess: 'تهانينا! تم استلام طلبك بنجاح وسيتواصل معك فريق الشحن خلال لحظات.'
    },
    en: {
        announcement: '✨ Exclusive: Free Express Shipping to Gulf & Worldwide on orders over $50',
        navSerum: 'Elixir Serum',
        navCream: 'Peptide Cream',
        navCleanser: 'Botanical Cleanser',
        navBundle: 'The Ritual Set',
        heroTag: 'Parisian Clean Luxury',
        heroTitle: 'Timeless Radiance & Natural Skin Glow',
        heroDesc: 'Ultra-pure, dermatologist-backed botanical skincare formulated to deeply nourish, rejuvenate, and deliver glowing silk-soft skin.',
        btnDiscover: 'Explore Collection',
        btnBuyNow: 'Shop Now',
        trust1Title: '100% Vegan & Organic',
        trust1Desc: 'Certified pure botanical actives',
        trust2Title: 'Express 48h Delivery',
        trust2Desc: 'Direct to your doorstep',
        trust3Title: 'Cash on Delivery & Cards',
        trust3Desc: 'Apple Pay, Visa, Mastercard, COD',
        trust4Title: 'Dermatologist Approved',
        trust4Desc: 'Safe for sensitive skin types',
        productsTag: 'Curated Essentials',
        productsTitle: 'Our Signature Skincare Icons',
        btnAddCart: 'Add to Bag',
        btnFastBuy: 'Quick Buy',
        bundleTag: 'Signature Value Offer',
        bundleTitle: 'The Complete Glow Ritual Set',
        bundleDesc: 'Experience the ultimate transformation with our 3-step ritual: Purifying Cleanser + Radiance Elixir Serum + Rejuvenating Night Cream at an exclusive 30% OFF with complimentary gift bag.',
        bundleFeat1: 'Save 30% compared to purchasing individually',
        bundleFeat2: 'Complete morning & evening regenerative ritual',
        bundleFeat3: 'Clinically visible glow & hydration in 7 days',
        bundleBuy: 'Order The Complete Set at 30% OFF',
        cartTitle: 'Your Shopping Bag',
        cartEmpty: 'Your shopping bag is currently empty.',
        cartTotal: 'Subtotal:',
        btnCheckout: 'Proceed to Fast Checkout ⚡',
        checkoutTitle: 'Express Checkout & Delivery',
        lblFullName: 'Full Name *',
        lblPhone: 'Mobile Phone Number *',
        lblCountry: 'Country / Delivery Region *',
        lblCity: 'City / Province *',
        lblAddress: 'Street Address *',
        lblPayment: 'Payment Method *',
        payCod: 'Cash on Delivery (COD)',
        payCard: 'Credit Card / Apple Pay / Mada',
        btnConfirmOrder: 'Confirm Order & Ship Now 🛍️',
        btnWhatsAppOrder: 'Quick Confirm via WhatsApp 💬',
        orderSuccess: 'Congratulations! Your order has been placed. Our concierge team will contact you shortly.'
    }
};

let currentLang = 'ar';
let currentCurrency = 'SAR';
let cart = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCart();
    renderProducts();
    updateTranslations();
    setupEventListeners();
});

function formatPrice(usdPrice) {
    const cur = CURRENCIES[currentCurrency];
    const converted = Math.round(usdPrice * cur.rate);
    if (cur.prefix) {
        return `${cur.symbol}${converted}`;
    }
    return `${converted} ${cur.symbol}`;
}

function renderProducts() {
    const container = document.getElementById('lumiereProductsGrid');
    if (!container) return;

    container.innerHTML = PRODUCTS.map(p => `
        <article class="product-card">
            <span class="badge-pill">${p.badge[currentLang]}</span>
            <div class="product-image-box">
                <img src="${p.image}" alt="${p.title[currentLang]}" loading="lazy">
            </div>
            <span class="product-category">${p.category[currentLang]}</span>
            <h3 class="product-title">${p.title[currentLang]}</h3>
            <div class="product-rating">
                ★★★★★ <span>${p.rating}</span>
                <span class="review-count">(${p.reviews})</span>
            </div>
            <p class="product-desc">${p.desc[currentLang]}</p>
            <div class="product-price-row">
                <div>
                    <span class="price-current">${formatPrice(p.basePriceUsd)}</span>
                    <span class="price-original">${formatPrice(p.originalPriceUsd)}</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-add-cart" onclick="addToCart('${p.id}')">
                    ${TRANSLATIONS[currentLang].btnAddCart}
                </button>
                <button class="btn-buy-fast" onclick="quickBuy('${p.id}')">
                    ${TRANSLATIONS[currentLang].btnFastBuy}
                </button>
            </div>
        </article>
    `).join('');

    // Update Bundle Price
    const bundleCurrent = document.getElementById('bundlePriceCurrent');
    const bundleOriginal = document.getElementById('bundlePriceOriginal');
    if (bundleCurrent && bundleOriginal) {
        bundleCurrent.textContent = formatPrice(98); // 30% off (regular 138)
        bundleOriginal.textContent = formatPrice(138);
    }
}

function addToCart(productId) {
    const prod = PRODUCTS.find(p => p.id === productId);
    if (!prod) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...prod, qty: 1 });
    }
    saveCart();
    renderCart();
    openCartDrawer();
}

function quickBuy(productId) {
    addToCart(productId);
    closeCartDrawer();
    openCheckoutModal();
}

function quickBuyBundle() {
    // Add all 3 products with bundle discount
    cart = [
        { ...PRODUCTS[0], qty: 1, basePriceUsd: 34 },
        { ...PRODUCTS[1], qty: 1, basePriceUsd: 38 },
        { ...PRODUCTS[2], qty: 1, basePriceUsd: 26 }
    ];
    saveCart();
    renderCart();
    openCheckoutModal();
}

function renderCart() {
    const countEl = document.getElementById('cartBadgeCount');
    const itemsContainer = document.getElementById('cartDrawerItems');
    const totalEl = document.getElementById('cartDrawerTotal');

    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) countEl.textContent = totalCount;

    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `<div style="text-align:center; padding: 40px 10px; color: var(--text-muted);">${TRANSLATIONS[currentLang].cartEmpty}</div>`;
        if (totalEl) totalEl.textContent = formatPrice(0);
        return;
    }

    const subtotalUsd = cart.reduce((sum, item) => sum + (item.basePriceUsd * item.qty), 0);
    if (totalEl) totalEl.textContent = formatPrice(subtotalUsd);

    itemsContainer.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.title[currentLang]}">
            <div class="cart-item-info" style="flex-grow: 1;">
                <h4>${item.title[currentLang]}</h4>
                <div class="cart-item-price">${formatPrice(item.basePriceUsd)} × ${item.qty}</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button onclick="changeQty(${idx}, -1)" style="border: 1px solid #ddd; background: #fff; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;">-</button>
                <span style="font-weight: 600;">${item.qty}</span>
                <button onclick="changeQty(${idx}, 1)" style="border: 1px solid #ddd; background: #fff; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;">+</button>
                <button onclick="removeFromCart(${idx})" style="border: none; background: transparent; color: #ef4444; font-size: 1.1rem; cursor: pointer; margin-inline-start: 6px;">✕</button>
            </div>
        </div>
    `).join('');
}

function changeQty(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) {
        cart.splice(idx, 1);
    }
    saveCart();
    renderCart();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    saveCart();
    renderCart();
}

function saveCart() {
    try {
        localStorage.setItem('lumiere_cart', JSON.stringify(cart));
    } catch (e) {
        console.warn(e);
    }
}

function initCart() {
    try {
        const saved = localStorage.getItem('lumiere_cart');
        if (saved) cart = JSON.parse(saved);
    } catch (e) {
        cart = [];
    }
    renderCart();
}

// Drawers & Modals
function openCartDrawer() {
    document.getElementById('cartDrawerOverlay')?.classList.add('active');
    document.getElementById('cartDrawer')?.classList.add('active');
}

function closeCartDrawer() {
    document.getElementById('cartDrawerOverlay')?.classList.remove('active');
    document.getElementById('cartDrawer')?.classList.remove('active');
}

function openCheckoutModal() {
    document.getElementById('checkoutModalOverlay')?.classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModalOverlay')?.classList.remove('active');
}

// Language and Currency Switching
function switchLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    updateTranslations();
    renderProducts();
    renderCart();
}

function switchCurrency(cur) {
    if (CURRENCIES[cur]) {
        currentCurrency = cur;
        renderProducts();
        renderCart();
    }
}

function updateTranslations() {
    const t = TRANSLATIONS[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
}

function setupEventListeners() {
    // Currency Switcher
    const currencySelect = document.getElementById('currencySelector');
    if (currencySelect) {
        currencySelect.value = currentCurrency;
        currencySelect.addEventListener('change', (e) => switchCurrency(e.target.value));
    }

    // Language Switcher
    const langSelect = document.getElementById('langSelector');
    if (langSelect) {
        langSelect.value = currentLang;
        langSelect.addEventListener('change', (e) => switchLanguage(e.target.value));
    }

    // Checkout Form Submit
    const form = document.getElementById('lumiereCheckoutForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('customerName')?.value || '';
            const phone = document.getElementById('customerPhone')?.value || '';
            const country = document.getElementById('customerCountry')?.value || '';
            const city = document.getElementById('customerCity')?.value || '';
            const address = document.getElementById('customerAddress')?.value || '';

            const subtotal = cart.reduce((sum, item) => sum + (item.basePriceUsd * item.qty), 0);
            const formattedTotal = formatPrice(subtotal);

            const msgBox = document.getElementById('orderConfirmationNotice');
            if (msgBox) {
                msgBox.style.display = 'block';
                msgBox.innerHTML = `
                    <div style="background: #ECFDF5; border: 1px solid #10B981; color: #065F46; padding: 16px; border-radius: 12px; margin-top: 16px; text-align: center;">
                        <h4 style="font-size: 1.1rem; margin-bottom: 6px;">${TRANSLATIONS[currentLang].orderSuccess}</h4>
                        <p style="font-size: 0.9rem;">${name} | ${phone} | ${country} (${city})</p>
                        <p style="font-weight: 700; margin-top: 6px;">${TRANSLATIONS[currentLang].cartTotal} ${formattedTotal}</p>
                    </div>
                `;
            }

            // WhatsApp Direct Action
            const itemsSummary = cart.map(i => `${i.title[currentLang]} (×${i.qty})`).join(', ');
            const waText = encodeURIComponent(`مرحباً LUMIÈRE، أود تأكيد طلبي:\nالاسم: ${name}\nالهاتف: ${phone}\nالدولة/المدينة: ${country} - ${city}\nالعنوان: ${address}\nالمنتجات: ${itemsSummary}\nالمجموع: ${formattedTotal}`);
            
            const waBtn = document.getElementById('btnWhatsAppCheckout');
            if (waBtn) {
                waBtn.href = `https://wa.me/213669754875?text=${waText}`;
                waBtn.style.display = 'inline-flex';
            }

            // Clear Cart
            cart = [];
            saveCart();
            renderCart();
        });
    }
}
