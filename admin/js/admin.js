let cachedData = null;
let revenueChart = null;
let countryChart = null;

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) targetTab.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    const tabMap = { 'overview': 0, 'orders': 1, 'products': 2, 'coupons': 3, 'customers': 4 };
    if (navItems[tabMap[tabId]]) navItems[tabMap[tabId]].classList.add('active');

    const titles = {
        'overview': { h: 'نظرة عامة والتحليلات الحية', sub: 'مؤشرات الأداء، التدفق المالي الخليجي والدولي، وحركة الطلبيات' },
        'orders': { h: 'إدارة وتتبع الطلبيات والشحن', sub: 'تحديث حالات الطلبيات والتواصل مع العميلات وتصدير البيانات' },
        'products': { h: 'كتالوج المستحضرات والأسعار', sub: 'إضافة وتعديل وحذف المنتجات في قاعدة البيانات' },
        'coupons': { h: 'إدارة قسائم الخصم والعروض (CRUD)', sub: 'إنشاء وتفعيل وتعطيل وحذف الكوبونات نهائياً' },
        'customers': { h: 'قاعدة بيانات العميلات (CRM)', sub: 'سجل العميلات الأكثر ولاءً ومشترياتهن وتفاصيل التواصل' }
    };

    if (titles[tabId]) {
        document.getElementById('tabHeading').textContent = titles[tabId].h;
        document.getElementById('tabSubHeading').textContent = titles[tabId].sub;
    }
}

// Login & Auth
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('loginScreen').style.display = 'none';
            initDashboard();
        } else {
            document.getElementById('loginMsg').textContent = data.message || 'بيانات الدخول غير صحيحة';
        }
    } catch (err) {
        document.getElementById('loginMsg').textContent = 'تعذر الاتصال بالخادم';
    }
});

async function logoutAdmin() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.reload();
}

async function initDashboard() {
    await loadAllData();
    loadProducts();
    loadCoupons();
}

async function loadAllData() {
    try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (data.success) {
            document.getElementById('loginScreen').style.display = 'none';
            cachedData = data;
            renderOverview(data);
            renderOrders(data.recentOrders);
            renderCustomers(data.customers);
            initCharts(data);
        } else if (res.status === 401 || res.status === 403) {
            document.getElementById('loginScreen').style.display = 'flex';
        }
    } catch (err) {
        console.error('Stats error:', err);
    }
}

function renderOverview(data) {
    document.getElementById('metricRevenueSar').textContent = data.stats.totalRevenueSar.toLocaleString() + ' ر.س';
    document.getElementById('metricRevenueUsd').textContent = 'يعادل $' + data.stats.totalRevenueUsd.toLocaleString() + ' USD';
    document.getElementById('metricOrders').textContent = data.stats.totalOrders;
    document.getElementById('metricProducts').textContent = data.stats.totalProducts;
    document.getElementById('metricCoupons').textContent = data.stats.totalCoupons;

    const tbody = document.getElementById('overviewOrdersBody');
    if (data.recentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">لا توجد طلبات بعد</td></tr>';
        return;
    }

    tbody.innerHTML = data.recentOrders.slice(0, 5).map(o => `
        <tr>
            <td style="font-weight:700; color:var(--gold-light);">${o.order_number}</td>
            <td>${o.customer_name}</td>
            <td>${o.customer_country} - ${o.customer_city}</td>
            <td style="font-weight:700;">${o.total_local} ${o.currency}</td>
            <td>${o.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'بطاقة بنكية'}</td>
            <td><span class="badge badge-${o.status}">${getStatusLabel(o.status)}</span></td>
        </tr>
    `).join('');
}

function renderOrders(orders) {
    const tbody = document.getElementById('allOrdersBody');
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 30px;">لا توجد طلبات مسجلة بعد</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(o => {
        const cleanPhone = o.customer_phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('مرحباً ' + o.customer_name + ' 🌸 بخصوص طلبك رقم ' + o.order_number + ' من متجر LUMIÈRE')}`;
        const itemsList = o.items.map(i => `${i.title} (x${i.qty})`).join(', ');

        return `
            <tr>
                <td style="font-weight:700; color:var(--gold-light);">${o.order_number}</td>
                <td>${o.customer_name}</td>
                <td style="direction:ltr; text-align:right;">${o.customer_phone}</td>
                <td>${o.customer_country}، ${o.customer_city}</td>
                <td style="font-size:0.82rem; color:var(--text-secondary); max-width: 220px;">${itemsList}</td>
                <td style="font-weight:700; color:var(--gold-light);">${o.total_local} ${o.currency}</td>
                <td>
                    <select class="status-select" onchange="updateOrderStatus(${o.id}, this.value)">
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>قيد التجهيز</option>
                        <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>تم الشحن ✈️</option>
                        <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>تم التسليم ✓</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>ملغي ✕</option>
                    </select>
                </td>
                <td>
                    <a href="${whatsappUrl}" target="_blank" class="btn-outline-gold" style="padding: 4px 10px; font-size: 0.8rem; text-decoration:none;">
                        واتساب 💬
                    </a>
                </td>
                <td>
                    <button onclick="deleteOrder(${o.id})" class="btn-delete" title="حذف الطلب">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteOrder(orderId) {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً من السجلات؟')) return;
    try {
        const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadAllData();
        }
    } catch (err) {
        alert('فشل حذف الطلب');
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        loadAllData();
    } catch (err) {
        alert('فشل تحديث الحالة');
    }
}

// ==========================================
// PRODUCTS CRUD
// ==========================================
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
            const tbody = document.getElementById('productsTableBody');
            tbody.innerHTML = data.data.map(p => `
                <tr>
                    <td style="display:flex; align-items:center; gap:12px;">
                        <img src="../${p.image}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid var(--gold-border);">
                        <div>
                            <div style="font-weight:700;">${p.title_ar}</div>
                            <div style="font-size:0.75rem; color:var(--text-secondary);">${p.title_en}</div>
                        </div>
                    </td>
                    <td>${p.category_ar}</td>
                    <td style="font-weight:700;">$${p.price_usd}</td>
                    <td style="color:var(--gold-light);">${Math.round(p.price_usd * 3.75)} SAR</td>
                    <td><span class="badge" style="background:rgba(16,185,129,0.15); color:#34D399;">${p.stock} قطعة</span></td>
                    <td>⭐ ${p.rating} (${p.reviews_count})</td>
                    <td style="display:flex; gap:8px;">
                        <button onclick="handleEditProductClick(this)" data-id="${p.id}" data-title="${encodeURIComponent(p.title_ar)}" data-price="${p.price_usd}" data-stock="${p.stock}" data-image="${encodeURIComponent(p.image || '')}" class="btn-outline-gold" style="padding:4px 10px; font-size:0.8rem;">تعديل</button>
                        <button onclick="deleteProduct('${p.id}')" class="btn-delete" title="حذف المستحضر">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

function handleEditProductClick(btn) {
    openProductModal(
        btn.getAttribute('data-id'),
        decodeURIComponent(btn.getAttribute('data-title')),
        parseFloat(btn.getAttribute('data-price')),
        parseInt(btn.getAttribute('data-stock'), 10),
        decodeURIComponent(btn.getAttribute('data-image') || '')
    );
}

async function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً من المتجر وقاعدة البيانات؟')) return;
    try {
        const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadProducts();
            loadAllData();
        }
    } catch (err) {
        alert('فشل حذف المنتج');
    }
}

function openNewProductModal() {
    const fileInput = document.getElementById('npImageFile');
    if (fileInput) fileInput.value = '';
    const imgUrlInput = document.getElementById('npImageUrl');
    if (imgUrlInput) imgUrlInput.value = '';
    const previewBox = document.getElementById('npImagePreviewBox');
    if (previewBox) previewBox.style.display = 'none';
    const statusEl = document.getElementById('npImageStatus');
    if (statusEl) {
        statusEl.textContent = 'اختياري (سيتم استخدام صورة افتراضية إن لم يتم الرفع)';
        statusEl.style.color = 'var(--text-secondary)';
    }
    document.getElementById('newProductModal').classList.add('active');
}
function closeNewProductModal() { document.getElementById('newProductModal').classList.remove('active'); }

// Handle mobile image file selection for new product
document.getElementById('npImageFile')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleMobileImageUpload(
            e.target.files[0],
            document.getElementById('npImageStatus'),
            document.getElementById('npImagePreview'),
            document.getElementById('npImagePreviewBox'),
            document.getElementById('npImageUrl')
        );
    }
});

// Handle mobile image file selection for editing product
document.getElementById('editImageFile')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleMobileImageUpload(
            e.target.files[0],
            document.getElementById('editImageStatus'),
            document.getElementById('editImagePreview'),
            document.getElementById('editImagePreviewBox'),
            document.getElementById('editProductImageUrl')
        );
    }
});

document.getElementById('newProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title_ar = document.getElementById('npTitleAr').value;
    const categoryKey = document.getElementById('npCategoryKey').value;
    const price_usd = document.getElementById('npPriceUsd').value;
    const stock = document.getElementById('npStock').value;
    const desc_ar = document.getElementById('npDescAr').value;
    const image = document.getElementById('npImageUrl').value || 'images/serum.jpg';

    const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title_ar,
            title_en: title_ar,
            categoryKey,
            price_usd,
            stock,
            desc_ar,
            image,
            category_ar: categoryKey === 'serums' ? 'سيرومات' : categoryKey === 'creams' ? 'كريمات' : 'تنظيف وأقنعة'
        })
    });
    const data = await res.json();
    if (data.success) {
        closeNewProductModal();
        loadProducts();
        loadAllData();
    }
});

// ==========================================
// COUPONS CRUD (CREATE, READ, TOGGLE, DELETE)
// ==========================================
async function loadCoupons() {
    try {
        const res = await fetch('/api/admin/coupons');
        const data = await res.json();
        if (data.success) {
            const tbody = document.getElementById('couponsTableBody');
            tbody.innerHTML = data.data.map(c => `
                <tr>
                    <td style="font-weight:700; color:var(--gold-light); font-family:'Outfit'; font-size:1.1rem;">${c.code}</td>
                    <td><span class="badge" style="background:rgba(197,160,89,0.15); color:var(--gold-light);">خصم ${c.discount_percent}%</span></td>
                    <td>${c.used_count || 0} استخدام</td>
                    <td>
                        <span class="badge ${c.is_active ? 'badge-delivered' : 'badge-cancelled'}">
                            ${c.is_active ? 'نشط ومفعل ✓' : 'معطل ✕'}
                        </span>
                    </td>
                    <td>
                        <button onclick="toggleCoupon(${c.id})" class="${c.is_active ? 'btn-toggle-inactive' : 'btn-toggle-active'}">
                            ${c.is_active ? 'تعطيل ⏸️' : 'تفعيل ▶️'}
                        </button>
                    </td>
                    <td>
                        <button onclick="handleDeleteCouponClick(this)" data-id="${c.id}" data-code="${encodeURIComponent(c.code)}" class="btn-delete" title="حذف الكوبون نهائياً">
                            حذف 🗑️
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

function handleDeleteCouponClick(btn) {
    const id = btn.getAttribute('data-id');
    const code = decodeURIComponent(btn.getAttribute('data-code'));
    deleteCoupon(id, code);
}

// DELETE COUPON
async function deleteCoupon(couponId, code) {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الكوبون [${code}] نهائياً؟ لن يتمكن أي عميل من استخدامه بعد الآن.`)) return;

    try {
        const res = await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            loadCoupons();
            loadAllData();
        } else {
            alert(data.message || 'فشل حذف الكوبون');
        }
    } catch (err) {
        alert('حدث خطأ أثناء الاتصال بالخادم');
    }
}

// TOGGLE COUPON
async function toggleCoupon(couponId) {
    try {
        const res = await fetch(`/api/admin/coupons/${couponId}/toggle`, { method: 'PATCH' });
        const data = await res.json();
        if (data.success) {
            loadCoupons();
        }
    } catch (err) {
        alert('فشل تعديل حالة الكوبون');
    }
}

function openNewCouponModal() { document.getElementById('couponModal').classList.add('active'); }
function closeNewCouponModal() { document.getElementById('couponModal').classList.remove('active'); }

document.getElementById('newCouponForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('couponCodeInput').value;
    const discountPercent = document.getElementById('couponPercentInput').value;

    const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discountPercent })
    });
    const data = await res.json();
    if (data.success) {
        closeNewCouponModal();
        loadCoupons();
        loadAllData();
    }
});

// Image Compression and Upload Utility (Supports Mobile Camera & Gallery)
function compressImage(file, maxDimension = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/jpeg', quality);
                resolve(base64);
            };
            img.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('فشل تحميل الصورة من الجهاز'));
        reader.readAsDataURL(file);
    });
}

async function handleMobileImageUpload(file, statusEl, previewImg, previewBox, hiddenUrlInput) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
        return;
    }

    if (statusEl) {
        statusEl.style.color = 'var(--gold-light)';
        statusEl.textContent = 'جاري ضغط ورفع الصورة من الهاتف... ⏳';
    }

    try {
        const imageBase64 = await compressImage(file);

        // Upload to server
        const res = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 })
        });
        const data = await res.json();

        if (data.success && data.imageUrl) {
            if (hiddenUrlInput) hiddenUrlInput.value = data.imageUrl;
            if (previewImg) previewImg.src = '../' + data.imageUrl;
            if (previewBox) previewBox.style.display = 'flex';
            if (statusEl) {
                statusEl.style.color = '#10B981';
                statusEl.textContent = '✓ تم رفع الصورة بنجاح';
            }
        } else {
            throw new Error(data.message || 'فشل رفع الصورة');
        }
    } catch (err) {
        console.error(err);
        if (statusEl) {
            statusEl.style.color = '#EF4444';
            statusEl.textContent = '✕ ' + (err.message || 'فشل رفع الصورة');
        }
        alert(err.message || 'حدث خطأ أثناء رفع الصورة');
    }
}

// Edit Product Modal
function openProductModal(id, title, price, stock, image) {
    document.getElementById('editProductId').value = id;
    document.getElementById('editProductTitle').value = title;
    document.getElementById('editProductPrice').value = price;
    document.getElementById('editProductStock').value = stock;
    document.getElementById('editProductImageUrl').value = image || '';

    const previewImg = document.getElementById('editImagePreview');
    if (previewImg) {
        previewImg.src = image ? (image.startsWith('http') ? image : '../' + image) : '../images/serum.jpg';
    }
    const editNotice = document.getElementById('editImageNotice');
    if (editNotice) editNotice.textContent = 'الصورة الحالية المعتمدة للمستحضر';
    const statusEl = document.getElementById('editImageStatus');
    if (statusEl) statusEl.textContent = '';
    const fileInput = document.getElementById('editImageFile');
    if (fileInput) fileInput.value = '';

    document.getElementById('productModal').classList.add('active');
}
function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }

document.getElementById('editProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const price_usd = document.getElementById('editProductPrice').value;
    const stock = document.getElementById('editProductStock').value;
    const image = document.getElementById('editProductImageUrl').value;

    const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_usd, stock, image })
    });
    const data = await res.json();
    if (data.success) {
        closeProductModal();
        loadProducts();
        loadAllData();
    } else {
        alert(data.message || 'فشل تعديل المستحضر');
    }
});

function renderCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px;">لا توجد بيانات عملاء بعد</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td style="font-weight:700;">${c.name}</td>
            <td style="direction:ltr; text-align:right;">${c.phone}</td>
            <td>${c.country} - ${c.city}</td>
            <td>${c.total_orders} طلبات</td>
            <td style="font-weight:700; color:var(--gold-light);">${Math.round(c.total_spent * 3.75)} SAR</td>
            <td style="font-size:0.8rem; color:var(--text-secondary);">${new Date(c.last_order_date).toLocaleDateString('ar-SA')}</td>
        </tr>
    `).join('');
}

function initCharts(data) {
    if (revenueChart) revenueChart.destroy();
    if (countryChart) countryChart.destroy();

    const revCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChart = new Chart(revCtx, {
        type: 'line',
        data: {
            labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'الإيرادات اليومية (SAR)',
                data: [1200, 1950, 2400, 1800, 3100, 4200, 3800],
                borderColor: '#C5A059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
            }
        }
    });

    const cntCtx = document.getElementById('countryChart').getContext('2d');
    countryChart = new Chart(cntCtx, {
        type: 'doughnut',
        data: {
            labels: ['السعودية 🇸🇦', 'الإمارات 🇦🇪', 'الكويت 🇰🇼', 'قطر 🇶🇦', 'أخرى 🌍'],
            datasets: [{
                data: [55, 25, 10, 6, 4],
                backgroundColor: ['#C5A059', '#E8CF96', '#967027', '#6B501B', '#3E3422'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#A8A29E', font: { size: 11 } } }
            }
        }
    });
}

function getStatusLabel(s) {
    const map = {
        'pending': 'قيد التجهيز',
        'processing': 'جاري التحضير',
        'shipped': 'تم الشحن ✈️',
        'delivered': 'تم التسليم ✓',
        'cancelled': 'ملغي ✕'
    };
    return map[s] || s;
}

function exportOrdersCSV() {
    if (!cachedData || !cachedData.recentOrders) return alert('لا توجد بيانات للتصدير');
    let csv = 'OrderNumber,CustomerName,Phone,Country,City,Address,TotalUSD,TotalLocal,Currency,Status\n';
    cachedData.recentOrders.forEach(o => {
        csv += `"${o.order_number}","${o.customer_name}","${o.customer_phone}","${o.customer_country}","${o.customer_city}","${o.customer_address}",${o.total_usd},${o.total_local},"${o.currency}","${o.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'LUMIERE_Orders_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
}

// Change Password Handling
function openChangePasswordModal() {
    const msg = document.getElementById('changePassMsg');
    if (msg) msg.textContent = '';
    const form = document.getElementById('changePasswordForm');
    if (form) form.reset();
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.add('active');
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.remove('active');
}

document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassInput').value;
    const newPassword = document.getElementById('newPassInput').value;
    const msg = document.getElementById('changePassMsg');

    try {
        const res = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
            msg.style.color = '#34D399';
            msg.textContent = data.message;
            setTimeout(() => {
                closeChangePasswordModal();
            }, 1800);
        } else {
            msg.style.color = '#F87171';
            msg.textContent = data.message || 'فشل تحديث كلمة المرور';
        }
    } catch (err) {
        msg.style.color = '#F87171';
        msg.textContent = 'حدث خطأ أثناء الاتصال بالخادم';
    }
});

initDashboard();
