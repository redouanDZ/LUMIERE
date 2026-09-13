// NOTE: this page is a UX convenience only. The Moyasar webhook
        // (server-to-server, signature-verified) is the sole source of
        // truth for whether an order is actually paid — this page just
        // polls our own /status endpoint to reflect that truth to the user.
        async function checkStatus() {
            const params = new URLSearchParams(window.location.search);
            const orderNumber = params.get('order');
            const iconEl = document.getElementById('statusIcon');
            const titleEl = document.getElementById('statusTitle');
            const descEl = document.getElementById('statusDesc');

            if (!orderNumber) {
                iconEl.textContent = '⚠️';
                titleEl.textContent = 'رقم طلب غير موجود';
                return;
            }

            for (let attempt = 0; attempt < 8; attempt++) {
                try {
                    const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/status`);
                    const data = await res.json();
                    if (data.success) {
                        const ps = data.data.payment_status;
                        if (ps === 'paid') {
                            iconEl.textContent = '🎉';
                            titleEl.textContent = 'تم الدفع بنجاح!';
                            descEl.textContent = `رقم طلبك ${data.data.order_number} — سيتم التواصل معك قريباً لترتيب الشحن.`;
                            return;
                        } else if (ps === 'payment_failed') {
                            iconEl.textContent = '❌';
                            titleEl.textContent = 'فشلت عملية الدفع';
                            descEl.textContent = 'لم تكتمل عملية الدفع. يمكنك المحاولة مجدداً أو التواصل معنا.';
                            return;
                        }
                    }
                } catch (e) { /* retry */ }
                await new Promise(r => setTimeout(r, 2000)); // webhook may arrive a couple seconds after redirect
            }

            iconEl.textContent = '⏳';
            titleEl.textContent = 'الدفع قيد المعالجة';
            descEl.textContent = 'قد يستغرق تأكيد الدفع بضع لحظات إضافية. سنرسل لك تأكيداً فور اكتماله.';
        }
        checkStatus();
