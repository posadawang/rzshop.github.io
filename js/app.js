// === 🔧 自動偵測 GitHub Pages 路徑 ===
const BASE_PATH = window.location.pathname.includes('/rzshop.github.io')
  ? '/rzshop.github.io'
  : '';

const ITEMS_URL = `${BASE_PATH}/data/items.json`;
const CART_KEY = 'rzshop_cart_v2';

// === 🛍 購物車核心 ===
const Cart = {
  get() {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  },
  set(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    Cart.updateBadge();
  },
  add(item) {
    const cart = Cart.get();
    const exist = cart.find(x => x.id === item.id);
    if (exist) exist.qty += 1;
    else cart.push({ ...item, qty: 1 });
    Cart.set(cart);
    alert(`✅ 已加入購物車：${item.title}`);
  },
  remove(id) {
    const cart = Cart.get().filter(x => x.id !== id);
    Cart.set(cart);
    Cart.render();
  },
  clear() {
    Cart.set([]);
    Cart.render();
  },
  updateQty(id, qty) {
    const cart = Cart.get();
    const item = cart.find(x => x.id === id);
    if (item) item.qty = qty;
    Cart.set(cart);
    Cart.render();
  },
  updateBadge() {
    const cart = Cart.get();
    const count = cart.reduce((a, b) => a + b.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = count;
  },
  total() {
    return Cart.get().reduce((a, b) => a + b.price * b.qty, 0);
  },
  render() {
    const c = document.getElementById('cartItems');
    const t = document.getElementById('cartTotal');
    if (!c) return;
    const cart = Cart.get();
    if (!cart.length) {
      c.innerHTML = '<p class="text-center text-muted py-5">購物車是空的</p>';
      if (t) t.textContent = '0';
      return;
    }
    c.innerHTML = cart.map(x => `
      <div class="d-flex align-items-center justify-content-between border-bottom py-2">
        <div>
          <strong>${x.title}</strong><br>
          NT$${x.price}
        </div>
        <div class="d-flex align-items-center gap-2">
          <input type="number" min="1" value="${x.qty}" class="form-control form-control-sm w-auto" onchange="Cart.updateQty('${x.id}', this.value)">
          <button class="btn btn-sm btn-outline-danger" onclick="Cart.remove('${x.id}')">刪除</button>
        </div>
      </div>
    `).join('');
    if (t) t.textContent = Cart.total().toLocaleString();
  }
};

// === 📦 商品資料 ===
async function getItems() {
  const res = await fetch(ITEMS_URL);
  return await res.json();
}

// === 🏠 首頁商品與搜尋 ===
async function renderAll() {
  const box = document.getElementById('cards');
  if (!box) return;
  const data = await getItems();
  box.innerHTML = data.map(p => `
    <div class="col-md-4">
      <div class="card h-100 shadow-sm">
        <img src="${BASE_PATH}/${p.thumbnail}" class="card-img-top" alt="">
        <div class="card-body">
          <h5 class="card-title">${p.title}</h5>
          <p class="card-text small text-muted">${p.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary">NT$${p.price}</span>
            <a href="${BASE_PATH}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// === 🎯 單一分類 ===
async function renderCategory(cat, el) {
  const box = document.getElementById(el);
  if (!box) return;
  const data = await getItems();
  const filtered = cat === 'all' ? data : data.filter(x => x.category === cat);
  box.innerHTML = filtered.map(p => `
    <div class="col-md-4">
      <div class="card h-100 shadow-sm">
        <img src="${BASE_PATH}/${p.thumbnail}" class="card-img-top" alt="">
        <div class="card-body">
          <h5 class="card-title">${p.title}</h5>
          <p class="card-text small text-muted">${p.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary">NT$${p.price}</span>
            <a href="${BASE_PATH}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// === 🧾 單一商品頁 ===
async function renderProduct(el) {
  const box = document.getElementById(el);
  if (!box) return;
  const url = new URL(window.location.href);
  const id = url.searchParams.get('id');
  const data = await getItems();
  const item = data.find(x => x.id === id);
  if (!item) {
    box.innerHTML = `<p class="text-center text-danger">找不到該商品</p>`;
    return;
  }

  box.innerHTML = `
    <div class="row g-4">
      <div class="col-md-6 text-center">
        <img src="${BASE_PATH}/${item.thumbnail}" class="img-fluid rounded shadow-sm mb-3">
        <div>${item.gallery.map(g => `<img src="${BASE_PATH}/${g}" class="img-thumbnail m-1" style="width:80px">`).join('')}</div>
      </div>
      <div class="col-md-6">
        <h3>${item.title}</h3>
        <p class="text-muted">${item.description}</p>
        <p class="h5 text-primary">NT$${item.price}</p>
        <button class="btn btn-success btn-lg mt-3" onclick='Cart.add(${JSON.stringify(item)})'>加入購物車</button>
        <a href="${BASE_PATH}/checkout.html" class="btn btn-outline-dark btn-lg mt-3 ms-2">前往結帳</a>
      </div>
    </div>
  `;
}

// === 💰 結帳頁 ===
function renderCheckout() {
  Cart.render();
  const paypalEl = document.getElementById('paypal-button-container');
  if (!paypalEl) return;

  paypal.Buttons({
    createOrder: (data, actions) => {
      return actions.order.create({
        purchase_units: [{
          amount: { value: Cart.total().toFixed(2) }
        }]
      });
    },
    onApprove: (data, actions) => {
      return actions.order.capture().then(() => {
        alert('✅ 付款成功，感謝您的購買！');
        Cart.clear();
        window.location.href = `${BASE_PATH}/thankyou.html`;
      });
    },
    onError: (err) => {
      console.error(err);
      alert('付款發生錯誤，請稍後再試');
    }
  }).render('#paypal-button-container');
}

// === 🚀 初始化 ===
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
});
