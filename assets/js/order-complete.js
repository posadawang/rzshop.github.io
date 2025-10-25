// 訂單完成頁面功能
let orderData = null;

// 初始化訂單完成頁面
document.addEventListener('DOMContentLoaded', function() {
    initializeOrderComplete();
});

// 初始化訂單完成
function initializeOrderComplete() {
    // 從URL取得訂單編號
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    
    if (!orderId) {
        showAlert('找不到訂單資訊', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // 載入訂單資料
    loadOrderData(orderId);
}

// 載入訂單資料
function loadOrderData(orderId) {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    orderData = orders.find(order => order.orderId === orderId);
    
    if (!orderData) {
        showAlert('找不到訂單資料', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // 顯示訂單資訊
    displayOrderInfo();
    displayOrderItems();
    displayCustomerInfo();
}

// 顯示訂單資訊
function displayOrderInfo() {
    document.getElementById('orderId').textContent = orderData.orderId;
    document.getElementById('orderTime').textContent = new Date(orderData.timestamp).toLocaleString('zh-TW');
    document.getElementById('paymentMethod').textContent = getPaymentMethodText(orderData.paymentMethod);
    document.getElementById('orderTotal').textContent = `NT$ ${orderData.total}`;
}

// 顯示訂單商品
function displayOrderItems() {
    const container = document.getElementById('orderItems');
    
    container.innerHTML = orderData.items.map(item => `
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

// 顯示收件人資訊
function displayCustomerInfo() {
    const container = document.getElementById('customerInfo');
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>姓名：</strong>${orderData.customer.name}</p>
                <p><strong>電話：</strong>${orderData.customer.phone}</p>
            </div>
            <div class="col-md-6">
                <p><strong>電子郵件：</strong>${orderData.customer.email}</p>
            </div>
        </div>
        <div class="mt-3">
            <p><strong>收件地址：</strong></p>
            <p class="text-muted">${orderData.customer.address}</p>
        </div>
        ${orderData.customer.notes ? `
            <div class="mt-3">
                <p><strong>備註：</strong></p>
                <p class="text-muted">${orderData.customer.notes}</p>
            </div>
        ` : ''}
    `;
}

// 取得付款方式文字
function getPaymentMethodText(method) {
    switch (method) {
        case 'credit':
            return '信用卡';
        case 'atm':
            return 'ATM轉帳';
        default:
            return '未知';
    }
}

// 列印訂單
function printOrder() {
    const printWindow = window.open('', '_blank');
    const orderContent = generatePrintContent();
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>訂單 - ${orderData.orderId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .order-info { margin-bottom: 20px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .items-table th { background-color: #f2f2f2; }
                .total { text-align: right; font-weight: bold; }
            </style>
        </head>
        <body>
            ${orderContent}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// 產生列印內容
function generatePrintContent() {
    return `
        <div class="header">
            <h1>阿智小舖</h1>
            <h2>訂單收據</h2>
        </div>
        
        <div class="order-info">
            <p><strong>訂單編號：</strong>${orderData.orderId}</p>
            <p><strong>訂單時間：</strong>${new Date(orderData.timestamp).toLocaleString('zh-TW')}</p>
            <p><strong>付款方式：</strong>${getPaymentMethodText(orderData.paymentMethod)}</p>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>商品名稱</th>
                    <th>數量</th>
                    <th>單價</th>
                    <th>小計</th>
                </tr>
            </thead>
            <tbody>
                ${orderData.items.map(item => `
                    <tr>
                        <td>${item.title}</td>
                        <td>${item.quantity}</td>
                        <td>NT$ ${item.price}</td>
                        <td>NT$ ${item.price * item.quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="total">
            <p>總計：NT$ ${orderData.total}</p>
        </div>
        
        <div class="customer-info">
            <h3>收件人資訊</h3>
            <p><strong>姓名：</strong>${orderData.customer.name}</p>
            <p><strong>電話：</strong>${orderData.customer.phone}</p>
            <p><strong>電子郵件：</strong>${orderData.customer.email}</p>
            <p><strong>收件地址：</strong>${orderData.customer.address}</p>
            ${orderData.customer.notes ? `<p><strong>備註：</strong>${orderData.customer.notes}</p>` : ''}
        </div>
    `;
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
