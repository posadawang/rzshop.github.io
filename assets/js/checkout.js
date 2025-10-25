// checkout.js - for GitHub front-end
// 結帳頁面功能（已調整：前端不做 TradeInfo 加密，改由後端處理）

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// API 與後端位置（請確認你的 InfinityFree 網址）
const API_BASE = 'https://rzshop.42web.io/api'; // <- 如果你的 InfinityFree 不同，請修改這裡

// 藍新金流設定（前端僅顯示用，實際加密 / TradeSha 由後端產生）
const NEWEBPAY_CONFIG = {
    MerchantID: 'MS1624139607', // 改成你的真實商店代碼
    // HashKey/HashIV 不應在前端公開，保留但不使用
    HashKey: 'b6LpV3yq5SZFi2QAqpJAvFiB729kIKf6',
    HashIV: 'PONYLln8z3fr2CkC',
    ReturnURL: window.location.origin + '/return.html',
    NotifyURL: window.location.origin + '/notify.html',
    CustomerURL: window.location.origin + '/customer.html'
};

// 將 cart 的 quantity 正規化為整數（避免小數）
function normalizeCart(c) {
    if (!Array.isArray(c)) return [];
    return c.map(it => {
        return {
            ...it,
            quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
            price: Number(it.price) || 0
        };
    });
}

cart = normalizeCart(cart);

document.addEventListener('DOMContentLoaded', function() {
    initializeCheckout();
});

// 初始化
function initializeCheckout() {
    // 檢查登入
    if (!currentUser) {
        showAlert('請先登入', 'warning');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    if (!cart.length) {
        showAlert('購物車是空的', 'warning');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    loadOrderItems();
    loadOrderSummary();
    setupEventListeners();
    fillUserData();
}

function setupEventListeners() {
    const submitBtn = document.getElementById('submitOrder');
    if (submitBtn) submitBtn.addEventListener('click', handleSubmitOrder);

    const form = document.getElementById('checkoutForm');
    if (form) form.addEventListener('input', validateForm);
}

function loadOrderItems() {
    const container = document.getElementById('orderItems');
    if (!container) return;

    container.innerHTML = cart.map(item => {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const subtotal = (Number(item.price) || 0) * qty;
        const thumb = item.thumbnail || 'https://via.placeholder.com/80x80?text=商品';
        return `
        <div class="d-flex align-items-center py-3 border-bottom">
            <img src="${thumb}" class="me-3" style="width: 80px; height: 80px; object-fit: cover; border-radius: 0.375rem;"
                 onerror="this.src='https://via.placeholder.com/80x80?text=商品'">
            <div class="flex-grow-1">
                <h6 class="mb-1">${escapeHtml(item.title || '')}</h6>
                <div class="text-muted small">數量: ${qty}</div>
            </div>
            <div class="text-end">
                <div class="fw-bold">NT$ ${Number(item.price).toLocaleString()}</div>
                <div class="text-muted small">小計: NT$ ${subtotal.toLocaleString()}</div>
            </div>
        </div>`;
    }).join('');
}

function loadOrderSummary() {
    const subtotal = cart.reduce((sum, it) => {
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        return sum + (Number(it.price) || 0) * qty;
    }, 0);
    const shipping = 0;
    const total = subtotal + shipping;

    const summaryEl = document.getElementById('orderSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="d-flex justify-content-between mb-2"><span>商品小計:</span><span>NT$ ${subtotal.toLocaleString()}</span></div>
            <div class="d-flex justify-content-between mb-2"><span>運費:</span><span class="text-success">免費</span></div>
        `;
    }

    const totalEl = document.getElementById('orderTotal');
    if (totalEl) totalEl.textContent = `NT$ ${total.toLocaleString()}`;
}

function fillUserData() {
    if (!currentUser) return;
    const nameEl = document.getElementById('customerName');
    const phoneEl = document.getElementById('customerPhone');
    const emailEl = document.getElementById('customerEmail');
    if (nameEl) nameEl.value = currentUser.name || '';
    if (phoneEl) phoneEl.value = currentUser.phone || '';
    if (emailEl) emailEl.value = currentUser.email || '';
}

function validateForm() {
    const form = document.getElementById('checkoutForm');
    const submitBtn = document.getElementById('submitOrder');
    if (!form || !submitBtn) return;
    submitBtn.disabled = !form.checkValidity();
}

async function handleSubmitOrder(evt) {
    evt && evt.preventDefault && evt.preventDefault();

    const form = document.getElementById('checkoutForm');
    if (!form) return;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const orderData = {
        customer: {
            name: document.getElementById('customerName').value.trim(),
            phone: document.getElementById('customerPhone').value.trim(),
            email: document.getElementById('customerEmail').value.trim(),
            address: document.getElementById('deliveryAddress').value.trim(),
            notes: document.getElementById('notes').value.trim()
        },
        items: normalizeCart(cart),
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        total: cart.reduce((sum, item) => sum + (Number(item.price) || 0) * Math.max(1, parseInt(item.quantity, 10) || 1), 0),
        orderId: generateOrderId(),
        timestamp: new Date().toISOString()
    };

    const submitBtn = document.getElementById('submitOrder');
    const originalHtml = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>處理中...';
        submitBtn.disabled = true;
    }

    try {
        // 本地儲存備份（非必要）
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(orders));

        // 清空購物車（在成功跳轉後也會清）
        // localStorage.removeItem('cart');

        if (orderData.paymentMethod === 'credit') {
            await processCreditCardPayment(orderData);
        } else {
            await processATMPayment(orderData);
        }

    } catch (err) {
        console.error('訂單處理失敗', err);
        showAlert('訂單處理失敗，請稍後再試', 'danger');
        if (submitBtn) {
            submitBtn.innerHTML = originalHtml || '<i class="fas fa-lock me-2"></i>確認訂單';
            submitBtn.disabled = false;
        }
    }
}

// --- 付款流程 --- //

async function processCreditCardPayment(orderData) {
    // 呼叫後端 createOrder.php，由後端產生 TradeInfo / TradeSha 並回傳 HTML 表單或 redirect 網頁
    try {
        const resp = await fetch(`${API_BASE}/createOrder.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: orderData.total,
                email: orderData.customer.email,
                itemDesc: `阿智小舖訂單 - ${orderData.items.length}項`,
                orderId: orderData.orderId,
                customer: orderData.customer
            }),
            // 若需要 CORS 或 cookie，視後端設定決定是否帶 credentials
            // credentials: 'include'
        });

        // 如果後端回 HTML（直接送出藍新表單），把 HTML 寫回 document 並自動送出
        const text = await resp.text();

        // 偵測是否是 JSON 錯誤回應（例如 { error: '...' }）
        try {
            const maybeJson = JSON.parse(text);
            if (maybeJson && maybeJson.error) {
                throw new Error(maybeJson.error);
            }
            // 如果不是錯誤（意外）就繼續寫入 html
        } catch (jsonErr) {
            // 若 JSON.parse 例外，代表回傳可能是 HTML（我們預期的情況）
        }

        // 把後端回傳的 html 放到頁面並執行，通常後端會回一個表單並 auto-submit
        document.open();
        document.write(text);
        document.close();

        // 若後端只是回一個 redirect url 的 JSON，可能要改成用 location.href 跳轉
        // (上面已處理普遍 HTML case)
    } catch (err) {
        console.error('信用卡付款發生錯誤:', err);
        showAlert('建立付款失敗，請稍後再試', 'danger');
        const submitBtn = document.getElementById('submitOrder');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-lock me-2"></i>確認訂單';
            submitBtn.disabled = false;
        }
        throw err;
    }
}

async function processATMPayment(orderData) {
    showAlert('ATM 付款資訊將以電子郵件寄出（此處為模擬）', 'success');
    // 真實情況你可以呼叫後端產生 ATM 指示再回應使用者
    setTimeout(() => {
        window.location.href = `order-complete.html?orderId=${orderData.orderId}`;
    }, 1500);
}

// --- 工具函式 --- //

function generateOrderId() {
    return `RZ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.parentNode.removeChild(alertDiv);
    }, 5000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
}
