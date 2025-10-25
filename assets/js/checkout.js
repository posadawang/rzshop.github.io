// 結帳頁面功能
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// 藍新金流設定
const NEWEBPAY_CONFIG = {
    MerchantID: 'MS123456789', // 您的商店代碼
    HashKey: 'b6LpV3yq5SZFi2QAqpJAvFiB729kIKf6',
    HashIV: 'PONYLln8z3fr2CkC',
    ReturnURL: window.location.origin + '/return.html',
    NotifyURL: window.location.origin + '/notify.html',
    CustomerURL: window.location.origin + '/customer.html'
};

// 初始化結帳頁面
document.addEventListener('DOMContentLoaded', function() {
    initializeCheckout();
});

// 初始化結帳
function initializeCheckout() {
    // 檢查用戶是否登入
    if (!currentUser) {
        showAlert('請先登入', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // 檢查購物車是否為空
    if (cart.length === 0) {
        showAlert('購物車是空的', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // 載入訂單資訊
    loadOrderItems();
    loadOrderSummary();
    setupEventListeners();
    
    // 預填用戶資料
    fillUserData();
}

// 設定事件監聽器
function setupEventListeners() {
    // 提交訂單
    document.getElementById('submitOrder').addEventListener('click', handleSubmitOrder);
    
    // 表單驗證
    document.getElementById('checkoutForm').addEventListener('input', validateForm);
}

// 載入訂單商品
function loadOrderItems() {
    const container = document.getElementById('orderItems');
    
    container.innerHTML = cart.map(item => `
        <div class="d-flex align-items-center py-3 border-bottom">
            <img src="${item.thumbnail}" class="me-3" style="width: 80px; height: 80px; object-fit: cover; border-radius: 0.375rem;"
                 onerror="this.src='https://via.placeholder.com/80x80?text=商品'">
            <div class="flex-grow-1">
                <h6 class="mb-1">${item.title}</h6>
                <div class="text-muted small">數量: ${item.quantity}</div>
            </div>
            <div class="text-end">
                <div class="fw-bold">NT$ ${item.price}</div>
                <div class="text-muted small">小計: NT$ ${item.price * item.quantity}</div>
            </div>
        </div>
    `).join('');
}

// 載入訂單摘要
function loadOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 0; // 免運費
    const total = subtotal + shipping;
    
    document.getElementById('orderSummary').innerHTML = `
        <div class="d-flex justify-content-between mb-2">
            <span>商品小計:</span>
            <span>NT$ ${subtotal}</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
            <span>運費:</span>
            <span class="text-success">免費</span>
        </div>
    `;
    
    document.getElementById('orderTotal').textContent = `NT$ ${total}`;
}

// 預填用戶資料
function fillUserData() {
    if (currentUser) {
        document.getElementById('customerName').value = currentUser.name || '';
        document.getElementById('customerPhone').value = currentUser.phone || '';
        document.getElementById('customerEmail').value = currentUser.email || '';
    }
}

// 表單驗證
function validateForm() {
    const form = document.getElementById('checkoutForm');
    const submitBtn = document.getElementById('submitOrder');
    const isValid = form.checkValidity();
    
    submitBtn.disabled = !isValid;
}

// 處理提交訂單
async function handleSubmitOrder() {
    const form = document.getElementById('checkoutForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // 收集訂單資料
    const orderData = {
        customer: {
            name: document.getElementById('customerName').value,
            phone: document.getElementById('customerPhone').value,
            email: document.getElementById('customerEmail').value,
            address: document.getElementById('deliveryAddress').value,
            notes: document.getElementById('notes').value
        },
        items: cart,
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        orderId: generateOrderId(),
        timestamp: new Date().toISOString()
    };

    try {
        // 顯示載入狀態
        const submitBtn = document.getElementById('submitOrder');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>處理中...';
        submitBtn.disabled = true;

        // 儲存訂單到本地儲存
        const orders = JSON.parse(localStorage.getItem('orders')) || [];
        orders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(orders));

        // 清空購物車
        localStorage.removeItem('cart');
        cart = [];

        // 根據付款方式處理
        if (orderData.paymentMethod === 'credit') {
            await processCreditCardPayment(orderData);
        } else if (orderData.paymentMethod === 'atm') {
            await processATMPayment(orderData);
        }

    } catch (error) {
        console.error('訂單處理失敗:', error);
        showAlert('訂單處理失敗，請重試', 'danger');
        
        // 恢復按鈕狀態
        const submitBtn = document.getElementById('submitOrder');
        submitBtn.innerHTML = '<i class="fas fa-lock me-2"></i>確認訂單';
        submitBtn.disabled = false;
    }
}

// 處理信用卡付款
async function processCreditCardPayment(orderData) {
    try {
        // 建立藍新金流付款表單
        const paymentForm = createNewebPayForm(orderData);
        
        // 提交到藍新金流
        document.body.appendChild(paymentForm);
        paymentForm.submit();
        
    } catch (error) {
        console.error('信用卡付款失敗:', error);
        throw error;
    }
}

// 處理ATM轉帳
async function processATMPayment(orderData) {
    // 模擬ATM轉帳處理
    showAlert('ATM轉帳資訊已發送至您的信箱', 'success');
    
    // 跳轉到完成頁面
    setTimeout(() => {
        window.location.href = `order-complete.html?orderId=${orderData.orderId}`;
    }, 2000);
}

// 建立藍新金流付款表單
function createNewebPayForm(orderData) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://ccore.newebpay.com/MPG/mpg_gateway';
    form.style.display = 'none';

    // 基本參數
    const params = {
        MerchantID: NEWEBPAY_CONFIG.MerchantID,
        TradeInfo: encryptTradeInfo(orderData),
        TradeSha: generateTradeSha(orderData),
        Version: '2.0'
    };

    // 建立表單欄位
    Object.keys(params).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = params[key];
        form.appendChild(input);
    });

    return form;
}

// 加密交易資訊
function encryptTradeInfo(orderData) {
    const tradeInfo = {
        MerchantID: NEWEBPAY_CONFIG.MerchantID,
        RespondType: 'JSON',
        TimeStamp: Math.floor(Date.now() / 1000),
        Version: '2.0',
        MerchantOrderNo: orderData.orderId,
        Amt: orderData.total,
        ItemDesc: `阿智小舖訂單 - ${orderData.items.length}項商品`,
        ReturnURL: NEWEBPAY_CONFIG.ReturnURL,
        NotifyURL: NEWEBPAY_CONFIG.NotifyURL,
        CustomerURL: NEWEBPAY_CONFIG.CustomerURL,
        Email: orderData.customer.email,
        LoginType: 0
    };

    // 使用AES加密
    const tradeInfoString = JSON.stringify(tradeInfo);
    return encryptAES(tradeInfoString, NEWEBPAY_CONFIG.HashKey, NEWEBPAY_CONFIG.HashIV);
}

// 產生交易驗證碼
function generateTradeSha(orderData) {
    const tradeInfo = encryptTradeInfo(orderData);
    const hashString = `HashKey=${NEWEBPAY_CONFIG.HashKey}&${tradeInfo}&HashIV=${NEWEBPAY_CONFIG.HashIV}`;
    return sha256(hashString).toUpperCase();
}

// AES加密（簡化版）
function encryptAES(data, key, iv) {
    // 這裡應該使用真正的AES加密
    // 為了演示，我們使用簡單的Base64編碼
    return btoa(data);
}

// SHA256雜湊（簡化版）
function sha256(str) {
    // 這裡應該使用真正的SHA256
    // 為了演示，我們使用簡單的字串處理
    return str.split('').reverse().join('');
}

// 產生訂單編號
function generateOrderId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `RZ${timestamp}${random}`;
}

// 顯示提示訊息
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}
