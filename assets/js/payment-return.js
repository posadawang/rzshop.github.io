// 藍新金流付款回調處理
document.addEventListener('DOMContentLoaded', function() {
    handlePaymentReturn();
});

// 處理付款回調
function handlePaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('Status');
    const message = urlParams.get('Message');
    const tradeInfo = urlParams.get('TradeInfo');
    
    const resultContainer = document.getElementById('paymentResult');
    
    if (status === 'SUCCESS') {
        // 付款成功
        resultContainer.innerHTML = `
            <div class="text-success mb-4">
                <i class="fas fa-check-circle" style="font-size: 4rem;"></i>
            </div>
            <h3 class="text-success mb-3">付款成功！</h3>
            <p class="text-muted">您的付款已完成，我們將盡快處理您的訂單</p>
            <div class="mt-4">
                <a href="order-complete.html" class="btn btn-primary">
                    <i class="fas fa-receipt me-2"></i>查看訂單
                </a>
            </div>
        `;
        
        // 更新訂單狀態
        updateOrderStatus('paid');
        
    } else {
        // 付款失敗
        resultContainer.innerHTML = `
            <div class="text-danger mb-4">
                <i class="fas fa-times-circle" style="font-size: 4rem;"></i>
            </div>
            <h3 class="text-danger mb-3">付款失敗</h3>
            <p class="text-muted">${message || '付款過程中發生錯誤，請重試'}</p>
            <div class="mt-4">
                <a href="checkout.html" class="btn btn-primary">
                    <i class="fas fa-redo me-2"></i>重新付款
                </a>
                <a href="index.html" class="btn btn-outline-secondary ms-2">
                    <i class="fas fa-home me-2"></i>回到首頁
                </a>
            </div>
        `;
    }
}

// 更新訂單狀態
function updateOrderStatus(status) {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const lastOrder = orders[orders.length - 1];
    
    if (lastOrder) {
        lastOrder.status = status;
        lastOrder.paymentTime = new Date().toISOString();
        localStorage.setItem('orders', JSON.stringify(orders));
    }
}
