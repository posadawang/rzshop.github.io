const ROOT = location.pathname.startsWith('/rzshop.github.io') ? '/rzshop.github.io' : '';
const DATA_URL = `${ROOT}/data/items.json`;
const CART_KEY = 'rzshop_cart';
let itemsCache = null;

const Cart = {
  normalize(raw) {
    if (!raw || raw.id === undefined || raw.id === null) return null;
    return {
      id: String(raw.id),
      title: (raw.title ?? '').toString(),
      price: Number(raw.price) || 0,
      qty: Math.max(1, Number(raw.qty) || 1),
      thumbnail: raw.thumbnail ?? ''
    };
  },
  get() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.map(Cart.normalize).filter(Boolean);
    } catch (err) {
      console.error('Cart data corrupted, resetting.', err);
      localStorage.removeItem(CART_KEY);
      return [];
    }
  },
  set(list) {
    const normalized = Array.isArray(list) ? list.map(Cart.normalize).filter(Boolean) : [];
    localStorage.setItem(CART_KEY, JSON.stringify(normalized));
    Cart.updateBadge();
    const total = normalized.reduce((sum, item) => sum + item.price * item.qty, 0);
    document.dispatchEvent(new CustomEvent('rzshop:cart-changed', {
      detail: { items: normalized, total }
    }));
    return normalized;
  },
  add(item) {
    const entry = Cart.normalize({ ...item, qty: 1 });
    if (!entry) return;
    const cart = Cart.get();
    const existing = cart.find(x => x.id === entry.id);
    if (existing) existing.qty += 1;
    else cart.push(entry);
    Cart.set(cart);
    Cart.render();
    alert(`✅ 已加入購物車：${entry.title || entry.id}`);
  },
  remove(id) {
    Cart.set(Cart.get().filter(x => x.id !== id));
    Cart.render();
  },
  updateQty(id, value) {
    const qty = Math.max(1, Number(value) || 1);
    const cart = Cart.get();
    const target = cart.find(x => x.id === id);
    if (target) {
      target.qty = qty;
      Cart.set(cart);
      Cart.render();
    }
  },
  clear() {
    Cart.set([]);
    Cart.render();
  },
  total() {
    return Cart.get().reduce((sum, item) => sum + item.price * item.qty, 0);
  },
  updateBadge() {
    const totalQty = Cart.get().reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = totalQty;
    document.querySelectorAll('[data-cart-badge]').forEach(el => {
      el.textContent = totalQty;
      el.classList.toggle('d-none', totalQty === 0 && el.dataset.hideOnEmpty === 'true');
    });
  },
  render() {
    const mount = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const list = Cart.get();
    if (!mount) return;
    if (!list.length) {
      mount.innerHTML = '<p class="text-center text-muted py-5">購物車是空的</p>';
      if (totalEl) totalEl.textContent = '0';
      return;
    }
    const map = new Map(list.map(item => [item.id, item]));
    mount.innerHTML = list.map(item => {
      const subtotal = formatCurrency(item.price * item.qty);
      const thumb = item.thumbnail ? `${ROOT}/${item.thumbnail.replace(/^\//, '')}` : '';
      const img = thumb || 'https://via.placeholder.com/120x90?text=No+Image';
      return `
        <div class="cart-item border-bottom pb-3 mb-3" data-id="${item.id}">
          <div class="d-flex flex-column flex-sm-row gap-3">
            <img src="${img}" alt="${item.title}" class="rounded" style="width:120px;height:90px;object-fit:cover;">
            <div class="flex-grow-1">
              <strong>${item.title || item.id}</strong>
              <div class="text-muted small mb-2">編號：${item.id}</div>
              <div class="cart-item-actions">
                <div class="cart-item-qty-group">
                  <label class="form-label" for="qty-${item.id}">數量</label>
                  <input id="qty-${item.id}" type="number" min="1" value="${item.qty}" class="form-control form-control-sm cart-item-qty" data-action="qty" data-id="${item.id}">
                </div>
                <div class="cart-item-subtotal">
                  <span class="small text-muted">小計</span>
                  <span class="fw-semibold text-primary">NT$ ${subtotal}</span>
                </div>
                <button class="btn btn-sm btn-outline-danger cart-item-remove" data-action="remove" data-id="${item.id}">移除</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    mount.querySelectorAll('[data-action="qty"]').forEach(input => {
      input.addEventListener('change', event => {
        const targetId = event.currentTarget.getAttribute('data-id');
        const value = event.currentTarget.value;
        if (map.has(targetId)) {
          Cart.updateQty(targetId, value);
        }
      });
    });

    mount.querySelectorAll('[data-action="remove"]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        const targetId = event.currentTarget.getAttribute('data-id');
        if (map.has(targetId)) {
          Cart.remove(targetId);
        }
      });
    });

    if (totalEl) totalEl.textContent = formatCurrency(Cart.total());
  }
};

// 確保 Cart 可供行內事件處理器使用
if (typeof window !== 'undefined') {
  window.Cart = Cart;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('zh-TW');
}

async function getItems() {
  if (itemsCache) return itemsCache;
  const response = await fetch(`${DATA_URL}?v=${Date.now()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('資料格式錯誤');
  itemsCache = data;
  return data;
}

function buildCard(item) {
  const link = `${ROOT}/product.html?id=${encodeURIComponent(item.id)}`;
  const price = formatCurrency(item.price);
  const thumb = item.thumbnail ? `${ROOT}/${item.thumbnail.replace(/^\//, '')}` : 'https://via.placeholder.com/600x400?text=No+Image';
  return `
    <div class="col-12 col-sm-6 col-lg-4">
      <div class="card h-100 shadow-sm game-tile">
        <a href="${link}" class="ratio ratio-16x9 bg-light d-block">
          <img src="${thumb}" class="w-100 h-100 object-cover rounded-top" alt="${item.title}">
        </a>
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-1">${item.id}｜${item.title}</h5>
          <div class="text-primary fw-bold mb-2">NT$ ${price}</div>
          <p class="card-text small text-muted mb-3 flex-grow-1">${item.description ?? ''}</p>
          <div class="d-grid gap-2 mt-auto">
            <a class="btn btn-outline-primary" href="${link}">查看詳情</a>
            <button class="btn btn-primary" type="button" data-add-to-cart data-id="${item.id}">加入購物車</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderList(mount, list) {
  if (!mount) return;
  if (!Array.isArray(list) || !list.length) {
    mount.innerHTML = '<p class="text-center text-muted py-5 w-100">目前沒有商品</p>';
    return;
  }
  mount.innerHTML = list.map(buildCard).join('');
  const map = new Map(list.map(item => [String(item.id), item]));
  mount.querySelectorAll('[data-add-to-cart]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      const item = map.get(id);
      if (item) {
        Cart.add(item);
      }
    });
  });
}

function filterByCategory(items, category) {
  if (!category || category === 'all') return [...items];
  return items.filter(item => item.category === category);
}

async function renderProducts(mountId, category = 'all') {
  const mount = document.getElementById(mountId);
  if (!mount) return [];
  try {
    const items = await getItems();
    const list = filterByCategory(items, category);
    mount.dataset.category = category;
    renderList(mount, list);
    return list;
  } catch (err) {
    console.error(err);
    mount.innerHTML = '<div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div>';
    return [];
  }
}

async function bindSearch(category = 'all', mountId = 'cards', inputId = 'searchInput', metaId) {
  const input = document.getElementById(inputId);
  const mount = document.getElementById(mountId);
  const meta = metaId ? document.getElementById(metaId) : null;
  if (!input || !mount) {
    return {
      async setCategory() {},
      clear() {},
      get category() {
        return 'all';
      }
    };
  }

  const state = {
    category,
    base: []
  };

  const updateMeta = count => {
    if (meta) meta.textContent = `共 ${count} 筆結果`;
  };

  const render = list => {
    renderList(mount, list);
    updateMeta(list.length);
  };

  const applyFilter = () => {
    const tokens = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      render(state.base);
      return;
    }
    const filtered = state.base.filter(item => {
      const haystack = [
        item.id,
        item.title,
        item.category,
        String(item.price),
        item.description ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return tokens.every(token => haystack.includes(token));
    });
    render(filtered);
  };

  input.addEventListener('input', applyFilter);

  const loadCategory = async cat => {
    state.category = cat;
    try {
      const items = await getItems();
      state.base = filterByCategory(items, cat);
    } catch (err) {
      console.error(err);
      mount.innerHTML = '<div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div>';
      state.base = [];
    }
    mount.dataset.category = cat;
    applyFilter();
  };

  await loadCategory(category);

  return {
    async setCategory(cat) {
      await loadCategory(cat);
    },
    clear() {
      input.value = '';
      applyFilter();
    },
    get category() {
      return state.category;
    }
  };
}

function initCategoryButtons(controller) {
  const buttons = document.querySelectorAll('.cat-btn');
  if (!buttons.length) return;
  buttons.forEach(button => {
    button.addEventListener('click', async () => {
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const cat = button.getAttribute('data-cat') || 'all';
      if (controller) {
        await controller.setCategory(cat);
      }
    });
  });
}

function initIndexPage() {
  const cards = document.getElementById('cards');
  if (!cards) return;
  cards.innerHTML = '<div class="text-center text-muted py-5 w-100">載入商品中...</div>';
  const initialCategory = cards.dataset.category || 'all';
  bindSearch(initialCategory, 'cards', 'searchInput', 'resultMeta').then(controller => {
    initCategoryButtons(controller);
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        controller.clear();
        const input = document.getElementById('searchInput');
        if (input) input.focus();
      });
    }
  });
}

function renderProductDetail(container, product) {
  if (!product) {
    container.innerHTML = '<div class="alert alert-warning">找不到對應的商品，請返回列表。</div>';
    return;
  }

  const gallery = Array.isArray(product.gallery) && product.gallery.length
    ? product.gallery
    : [product.thumbnail].filter(Boolean);
  const normalizedGallery = gallery.length ? gallery : [''];
  const mainImage = normalizedGallery[0]
    ? `${ROOT}/${normalizedGallery[0].replace(/^\//, '')}`
    : 'https://via.placeholder.com/800x600?text=No+Image';

  container.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-6">
        <div class="ratio ratio-16x9 bg-light rounded overflow-hidden">
          <img id="productMainImage" src="${mainImage}" alt="${product.title}" class="w-100 h-100 object-cover">
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          ${normalizedGallery.map((src, index) => {
            const image = src ? `${ROOT}/${src.replace(/^\//, '')}` : mainImage;
            return `
              <button type="button" class="btn p-0 border-0 bg-transparent thumb ${index === 0 ? 'thumb-active' : ''}" data-image="${image}" aria-label="預覽圖 ${index + 1}">
                <img src="${image}" alt="${product.title}" class="rounded" style="width:84px;height:84px;object-fit:cover;">
              </button>
            `;
          }).join('')}
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card shadow-sm">
          <div class="card-body">
            <h1 class="h4">${product.id}｜${product.title}</h1>
            <div class="text-muted mb-2">分類：${product.category || '未分類'}</div>
            <div class="display-6 text-primary mb-3">NT$ ${formatCurrency(product.price)}</div>
            <p class="mb-4">${product.description ?? ''}</p>
            <div class="d-grid gap-2">
              <button id="addToCartBtn" class="btn btn-primary btn-lg" type="button">加入購物車</button>
              <a class="btn btn-outline-secondary" href="${ROOT}/checkout.html">前往結帳</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const mainImageEl = document.getElementById('productMainImage');
  container.querySelectorAll('.thumb').forEach(button => {
    button.addEventListener('click', () => {
      container.querySelectorAll('.thumb').forEach(btn => btn.classList.remove('thumb-active'));
      button.classList.add('thumb-active');
      const image = button.getAttribute('data-image');
      if (image && mainImageEl) {
        mainImageEl.setAttribute('src', image);
      }
    });
  });

  const addToCartBtn = document.getElementById('addToCartBtn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      Cart.add(product);
    });
  }
}

function initProductPage() {
  const container = document.getElementById('productContainer');
  if (!container) return;
  container.innerHTML = '<div class="text-center text-muted py-5">載入商品資訊...</div>';
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    container.innerHTML = '<div class="alert alert-warning">缺少商品編號，請返回首頁。</div>';
    return;
  }

  getItems()
    .then(items => {
      const product = items.find(item => String(item.id) === String(id));
      if (!product) {
        container.innerHTML = '<div class="alert alert-warning">找不到對應的商品，請返回列表。</div>';
        return;
      }
      renderProductDetail(container, product);
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = '<div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div>';
    });
}

function initCheckoutPage() {
  const mount = document.getElementById('cartItems');
  if (!mount) return;
  Cart.render();
  updateNewebpayFormFields({ items: Cart.get(), total: Cart.total() });
  renderPayPalButtons(Cart.total());
  document.addEventListener('paypal:loaded', () => {
    renderPayPalButtons(Cart.total());
  });
  document.addEventListener('rzshop:cart-changed', event => {
    const detail = event.detail || {};
    updateNewebpayFormFields(detail);
    const total = detail.total ?? Cart.total();
    renderPayPalButtons(total);
  });
}

function renderPayPalButtons(total) {
  const container = document.getElementById('paypal-button-container');
  if (!container) return;
  container.innerHTML = '';

  if (total <= 0) {
    container.innerHTML = '<div class="text-muted small">購物車內沒有商品。</div>';
    return;
  }

  if (typeof window.paypal === 'undefined') {
    container.innerHTML = '<div class="text-muted small">正在載入 PayPal 付款模組...</div>';
    return;
  }

  const value = (Number(total) || 0).toFixed(2);
  window.paypal.Buttons({
    style: {
      shape: 'pill',
      color: 'gold',
      layout: 'vertical',
      label: 'paypal'
    },
    createOrder: (data, actions) => {
      return actions.order.create({
        purchase_units: [
          {
            amount: {
              currency_code: 'TWD',
              value: value
            },
            description: '阿智小舖商品購買'
          }
        ]
      });
    },
    onApprove: (data, actions) => {
      return actions.order.capture().then(() => {
        Cart.clear();
        window.location.href = `${ROOT}/thankyou.html`;
      });
    },
    onError: err => {
      console.error('PayPal error', err);
      alert('付款初始化失敗，請稍後再試。');
    }
  }).render('#paypal-button-container');
}

function updateNewebpayFormFields(detail = {}) {
  const newebpayBtn = document.getElementById('newebpayBtn');
  const hint = document.querySelector('[data-newebpay-hint]');
  const total = detail.total ?? Cart.total();
  const items = detail.items ?? Cart.get();

  if (!newebpayBtn) return;

  const rawTotal = Number(total) || 0;
  const amount = Math.round(rawTotal);
  const summary = Array.isArray(items)
    ? items.map(item => `${item.title || item.id}x${item.qty}`).join(', ')
    : '';

  let email = 'test@gmail.com';
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.email) {
      email = user.email;
    }
  } catch (err) {
    console.warn('Unable to parse user info from storage', err);
  }

  if (amount > 0) {
    newebpayBtn.disabled = false;
    newebpayBtn.dataset.amount = String(Math.max(1, amount));
    newebpayBtn.dataset.item = summary || '阿智小舖商品';
    newebpayBtn.dataset.email = email;
    if (hint) {
      hint.textContent = '點擊按鈕即可前往藍新金流完成付款。';
    }
  } else {
    newebpayBtn.disabled = true;
    delete newebpayBtn.dataset.amount;
    delete newebpayBtn.dataset.item;
    delete newebpayBtn.dataset.email;
    if (hint) {
      hint.textContent = '購物車目前沒有可結帳的商品。';
    }
  }
}

function initFooterYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', () => {
  initFooterYear();
  Cart.updateBadge();
  initIndexPage();
  initProductPage();
  initCheckoutPage();
});

// === 🧾 藍新金流付款整合區 ===
async function payWithNewebPay() {
  const total = Cart.total();
  if (total <= 0) {
    alert("購物車是空的，請先選購商品！");
    return;
  }

  const userEmail = JSON.parse(localStorage.getItem("user") || "{}").email || "test@example.com";

  try {
    // 呼叫 Firebase Function 建立訂單
    const response = await fetch("https://us-central1-rzshop-auth.cloudfunctions.net/api/createOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: total,
        email: userEmail,
        itemDesc: "阿智小舖商品"
      })
    });

    const html = await response.text();
    document.open();
    document.write(html);
    document.close();
  } catch (error) {
    console.error("NewebPay 錯誤：", error);
    alert("付款建立失敗，請稍後再試！");
  }
}

// 綁定付款按鈕
document.addEventListener("DOMContentLoaded", () => {
  const payButton = document.getElementById("newebpay-button");
  if (payButton) {
    payButton.addEventListener("click", payWithNewebPay);
  }
});
