// 全域變數
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentCategory = 'all';
let searchQuery = '';

// 藍新金流設定
const NEWEBPAY_CONFIG = {
    MerchantID: 'MS123456789', // 您的商店代碼
    HashKey: 'b6LpV3yq5SZFi2QAqpJAvFiB729kIKf6',
    HashIV: 'PONYLln8z3fr2CkC',
    ReturnURL: window.location.origin + '/return.html',
    NotifyURL: window.location.origin + '/notify.html',
    CustomerURL: window.location.origin + '/customer.html'
};

// 初始化應用程式
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化應用程式
async function initializeApp() {
    try {
        await loadProducts();
        updateCartUI();
        updateUserUI();
        renderCategoryCards();
        renderFeaturedProducts();
        renderAllProducts();
        setupEventListeners();
    } catch (error) {
        console.error('初始化失敗:', error);
        showAlert('系統初始化失敗，請重新整理頁面', 'danger');
    }
}

// 載入商品資料
async function loadProducts() {
    try {
        const response = await fetch('assets/data/products.json');
        products = await response.json();
    } catch (error) {
        console.error('載入商品失敗:', error);
        throw error;
    }
}

// 設定事件監聽器
function setupEventListeners() {
    // 搜尋功能
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 分類篩選
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            currentCategory = this.dataset.category;
            renderAllProducts();
        });
    });

    // 排序功能
    document.getElementById('sortSelect').addEventListener('change', function() {
        renderAllProducts();
    });

    // 購物車按鈕
    document.getElementById('cartBtn').addEventListener('click', function() {
        const cartOffcanvas = new bootstrap.Offcanvas(document.getElementById('cartOffcanvas'));
        cartOffcanvas.show();
    });

    // 結帳按鈕
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);

    // 登入表單
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // 註冊表單
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

// 處理搜尋
function handleSearch() {
    searchQuery = document.getElementById('searchInput').value.trim();
    renderAllProducts();
}

// 渲染分類卡片
function renderCategoryCards() {
    const categories = ['部落衝突', '荒野亂鬥', '皇室戰爭', '其他遊戲'];
    const container = document.getElementById('categoryCards');
    
    container.innerHTML = categories.map(category => `
        <div class="col-12 col-md-6 col-lg-3">
            <div class="card category-card" onclick="filterByCategory('${category}')">
                <div class="card-img-top bg-primary d-flex align-items-center justify-content-center" style="height: 150px;">
                    <i class="fas fa-gamepad text-white" style="font-size: 3rem;"></i>
                </div>
                <div class="card-body text-center">
                    <h5 class="card-title">${category}</h5>
                </div>
            </div>
        </div>
    `).join('');
}

// 渲染熱門商品
function renderFeaturedProducts() {
    const featuredProducts = products.filter(product => product.featured);
    const container = document.getElementById('featuredProducts');
    
    container.innerHTML = featuredProducts.map(product => createProductCard(product)).join('');
}

// 渲染所有商品
function renderAllProducts() {
    let filteredProducts = products;

    // 分類篩選
    if (currentCategory !== 'all') {
        filteredProducts = filteredProducts.filter(product => product.category === currentCategory);
    }

    // 搜尋篩選
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(product => 
            product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // 排序
    const sortBy = document.getElementById('sortSelect').value;
    switch (sortBy) {
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    const container = document.getElementById('allProducts');
    container.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
}

// 建立商品卡片
function createProductCard(product) {
    const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    const stockStatus = getStockStatus(product.stock);
    
    return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card product-card h-100">
                <div class="position-relative">
                    <img src="${product.thumbnail}" class="card-img-top" alt="${product.title}" 
                         onerror="this.src='https://via.placeholder.com/300x200?text=商品圖片'">
                    ${discount > 0 ? `<span class="badge bg-danger position-absolute top-0 end-0 m-2">-${discount}%</span>` : ''}
                    ${stockStatus.class === 'stock-out' ? '<span class="badge bg-secondary position-absolute top-0 start-0 m-2">缺貨</span>' : ''}
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.title}</h5>
                    <p class="card-text text-muted small">${product.description}</p>
                    
                    <div class="product-tags">
                        ${product.tags.map(tag => `<span class="product-tag">${tag}</span>`).join('')}
                    </div>
                    
                    <div class="mt-auto">
                        <div class="d-flex align-items-center mb-2">
                            <div class="rating me-2">
                                ${generateStars(product.rating)}
                            </div>
                            <small class="text-muted">(${product.reviews})</small>
                        </div>
                        
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <div>
                                <span class="price-highlight">NT$ ${product.price}</span>
                                ${product.originalPrice ? `<small class="text-muted text-decoration-line-through ms-2">NT$ ${product.originalPrice}</small>` : ''}
                            </div>
                            <span class="stock-status ${stockStatus.class}">${stockStatus.text}</span>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary flex-fill" onclick="showProductDetail('${product.id}')">
                                <i class="fas fa-eye me-1"></i> 查看詳情
                            </button>
                            <button class="btn btn-primary" onclick="addToCart('${product.id}')" 
                                    ${product.stock === 0 ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 生成星級評分
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// 取得庫存狀態
function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'stock-out', text: '缺貨' };
    } else if (stock <= 3) {
        return { class: 'stock-low', text: '庫存不足' };
    } else {
        return { class: 'stock-in', text: '有庫存' };
    }
}

// 按分類篩選
function filterByCategory(category) {
    currentCategory = category;
    renderAllProducts();
}

// 顯示商品詳情
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    document.getElementById('productModalTitle').textContent = product.title;
    
    const galleryImages = product.gallery.map(img => 
        `<img src="${img}" class="img-thumbnail me-2 mb-2" style="width:100px;height:100px;object-fit:cover" 
              onerror="this.src='https://via.placeholder.com/100x100?text=圖片'">`
    ).join('');

    document.getElementById('productModalBody').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <img src="${product.thumbnail}" class="product-detail-img" alt="${product.title}"
                     onerror="this.src='https://via.placeholder.com/400x300?text=商品圖片'">
                <div class="product-gallery">
                    ${galleryImages}
                </div>
            </div>
            <div class="col-md-6">
                <div class="mb-3">
                    <div class="rating mb-2">
                        ${generateStars(product.rating)}
                        <span class="ms-2">${product.rating}/5 (${product.reviews} 評價)</span>
                    </div>
                </div>
                
                <div class="mb-3">
                    <h4 class="price-highlight">NT$ ${product.price}</h4>
                    ${product.originalPrice ? `<small class="text-muted text-decoration-line-through">原價 NT$ ${product.originalPrice}</small>` : ''}
                </div>
                
                <div class="mb-3">
                    <span class="stock-status ${getStockStatus(product.stock).class}">${getStockStatus(product.stock).text}</span>
                </div>
                
                <div class="mb-3">
                    <h6>商品描述</h6>
                    <p>${product.description}</p>
                </div>
                
                <div class="mb-3">
                    <h6>商品標籤</h6>
                    <div class="product-tags">
                        ${product.tags.map(tag => `<span class="product-tag">${tag}</span>`).join('')}
                    </div>
                </div>
                
                <div class="d-flex gap-2">
                    <button class="btn btn-primary flex-fill" onclick="addToCart('${product.id}')" 
                            ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus me-1"></i> 加入購物車
                    </button>
                    <button class="btn btn-outline-primary" onclick="addToCart('${product.id}'); bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();">
                        <i class="fas fa-shopping-cart me-1"></i> 立即購買
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.show();
}

// 加入購物車
function addToCart(productId) {
    if (!currentUser) {
        showAlert('請先登入', 'warning');
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock === 0) {
        showAlert('商品缺貨', 'danger');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showAlert('庫存不足', 'warning');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            id: productId,
            title: product.title,
            price: product.price,
            thumbnail: product.thumbnail,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    showAlert('已加入購物車', 'success');
}

// 從購物車移除商品
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    showAlert('已從購物車移除', 'info');
}

// 更新購物車數量
function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const product = products.find(p => p.id === productId);
    if (item.quantity > product.stock) {
        item.quantity = product.stock;
        showAlert('庫存不足', 'warning');
    }

    saveCart();
    updateCartUI();
}

// 儲存購物車
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// 更新購物車UI
function updateCartUI() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = cartCount;

    const cartItemsContainer = document.getElementById('cartItems');
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h4>購物車是空的</h4>
                <p>快去選購您喜歡的商品吧！</p>
            </div>
        `;
        document.getElementById('cartTotal').textContent = 'NT$ 0';
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = `NT$ ${total}`;

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item d-flex align-items-center">
            <img src="${item.thumbnail}" class="cart-item-img" alt="${item.title}"
                 onerror="this.src='https://via.placeholder.com/60x60?text=商品'">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-price">NT$ ${item.price}</div>
            </div>
            <div class="cart-item-controls">
                <button class="btn btn-sm btn-outline-secondary" onclick="updateCartQuantity('${item.id}', -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="mx-2">${item.quantity}</span>
                <button class="btn btn-sm btn-outline-secondary" onclick="updateCartQuantity('${item.id}', 1)">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-2" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 處理登入
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        // 模擬登入API
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            updateUserUI();
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            showAlert('登入成功', 'success');
        } else {
            throw new Error('登入失敗');
        }
    } catch (error) {
        // 模擬登入（開發用）
        currentUser = {
            id: 1,
            name: '測試用戶',
            email: email,
            phone: '0912345678'
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserUI();
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
        showAlert('登入成功', 'success');
    }
}

// 處理註冊
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const phone = document.getElementById('registerPhone').value;

    try {
        // 模擬註冊API
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, phone })
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            showAlert('註冊成功，請登入', 'success');
        } else {
            throw new Error('註冊失敗');
        }
    } catch (error) {
        // 模擬註冊成功（開發用）
        bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
        showAlert('註冊成功，請登入', 'success');
    }
}

// 更新用戶UI
function updateUserUI() {
    const userArea = document.getElementById('userArea');
    if (currentUser) {
        userArea.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="fas fa-user"></i> ${currentUser.name}
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="#" onclick="showUserProfile()">個人資料</a></li>
                    <li><a class="dropdown-item" href="#" onclick="showOrderHistory()">訂單記錄</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" onclick="logout()">登出</a></li>
                </ul>
            </div>
        `;
    } else {
        userArea.innerHTML = `
            <button class="btn btn-outline-light me-2" data-bs-toggle="modal" data-bs-target="#loginModal">
                <i class="fas fa-user"></i> 登入
            </button>
            <button class="btn btn-outline-light" data-bs-toggle="modal" data-bs-target="#registerModal">
                <i class="fas fa-user-plus"></i> 註冊
            </button>
        `;
    }
}

// 登出
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserUI();
    showAlert('已登出', 'info');
}

// 處理結帳
function handleCheckout() {
    if (!currentUser) {
        showAlert('請先登入', 'warning');
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
        return;
    }

    if (cart.length === 0) {
        showAlert('購物車是空的', 'warning');
        return;
    }

    // 跳轉到結帳頁面
    window.location.href = 'checkout.html';
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
    }, 3000);
}

// 顯示用戶資料
function showUserProfile() {
    showAlert('個人資料功能開發中', 'info');
}

// 顯示訂單記錄
function showOrderHistory() {
    showAlert('訂單記錄功能開發中', 'info');
}
