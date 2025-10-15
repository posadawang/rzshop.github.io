const ROOT = location.pathname.startsWith('/rzshop.github.io') ? '/rzshop.github.io' : '';
const DATA_URL = `${ROOT}/data/items.json`;
const CART_KEY = 'rzshop_cart';

let itemsCache = null;

function loadItems() {
  if (!itemsCache) {
    itemsCache = fetch(`${DATA_URL}?v=20240530`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`items.json 載入失敗 (${res.status})`);
        }
        return res.json();
      })
      .then((data) => Array.isArray(data) ? data : []);
  }
  return itemsCache.then((items) => items.map((item) => ({ ...item, id: String(item.id) })));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('zh-Hant-TW');
}

const Cart = {
  get() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('購物車資料解析失敗：', err);
      return [];
    }
  },
  set(list) {
    localStorage.setItem(CART_KEY, JSON.stringify(list || []));
    Cart.updateBadge();
  },
  add(rawItem) {
    if (!rawItem) return;
    const item = {
      id: String(rawItem.id),
      title: rawItem.title,
      price: Number(rawItem.price) || 0,
      thumbnail: rawItem.thumbnail || 'assets/images/logo.svg',
      qty: 1,
    };
    const cart = Cart.get();
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push(item);
    }
    Cart.set(cart);
    alert(`✅ 已加入購物車：${item.title}`);
    Cart.render();
  },
  remove(id) {
    Cart.set(Cart.get().filter((item) => item.id !== id));
    Cart.render();
  },
  updateQty(id, value) {
    const qty = Math.max(1, Number(value) || 1);
    const list = Cart.get();
    const target = list.find((item) => item.id === id);
    if (target) {
      target.qty = qty;
      Cart.set(list);
      Cart.render();
    }
  },
  clear() {
    Cart.set([]);
    Cart.render();
  },
  total() {
    return Cart.get().reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
  },
  updateBadge() {
    const totalQty = Cart.get().reduce((sum, item) => sum + (item.qty || 0), 0);
    document.querySelectorAll('[data-cart-badge]').forEach((el) => {
      el.textContent = totalQty;
    });
  },
  render() {
    const mount = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!mount) return;

    const list = Cart.get();
    if (!list.length) {
      mount.innerHTML = '<p class="text-center text-muted py-5">購物車是空的</p>';
      if (totalEl) totalEl.textContent = '0';
      return;
    }

    mount.innerHTML = list.map((item) => `
      <div class="cart-item row align-items-center gy-3 py-3 border-bottom">
        <div class="col-12 col-lg">
          <div class="d-flex align-items-center gap-3">
            <img src="${ROOT}/${item.thumbnail}" alt="${item.title}" class="rounded" style="width:72px;height:72px;object-fit:cover;" onerror="this.src='${ROOT}/assets/images/logo.svg'">
            <div>
              <div class="fw-semibold">${item.title}</div>
              <div class="text-muted small">單價 NT$ ${formatCurrency(item.price)}</div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-auto ms-lg-auto">
          <div class="cart-item-actions d-flex flex-wrap align-items-center gap-2">
            <label class="small text-muted mb-0" for="qty-${item.id}">數量</label>
            <input type="number" min="1" id="qty-${item.id}" class="form-control form-control-sm cart-qty-input" value="${item.qty}" data-id="${item.id}">
            <button type="button" class="btn btn-outline-danger btn-sm cart-remove" data-id="${item.id}">刪除</button>
            <div class="fw-semibold ms-lg-auto">小計 NT$ ${formatCurrency(item.price * item.qty)}</div>
          </div>
        </div>
      </div>
    `).join('');

    mount.querySelectorAll('.cart-qty-input').forEach((input) => {
      input.addEventListener('change', (event) => {
        Cart.updateQty(event.target.dataset.id, event.target.value);
      });
    });

    mount.querySelectorAll('.cart-remove').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        Cart.remove(event.target.dataset.id);
      });
    });

    if (totalEl) totalEl.textContent = formatCurrency(Cart.total());
  },
};

function createCardHtml(item) {
  const detailHref = `${ROOT}/product.html?id=${encodeURIComponent(item.id)}`;
  const thumb = `${ROOT}/${item.thumbnail}`;
  const description = item.description ? item.description : '';
  return `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <img src="${thumb}" class="card-img-top" alt="${item.title}" onerror="this.src='${ROOT}/assets/images/logo.svg'">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-1">${item.title}</h5>
          <p class="text-muted small flex-grow-1">${description}</p>
          <div class="mt-3 d-flex flex-column gap-2">
            <div class="fw-bold text-primary">NT$ ${formatCurrency(item.price)}</div>
            <div class="d-flex flex-wrap gap-2">
              <a href="${detailHref}" class="btn btn-outline-dark btn-sm">查看詳情</a>
              <button type="button" class="btn btn-primary btn-sm btn-add-cart" data-product-id="${item.id}">加入購物車</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function wireInlineButtons(mount, list) {
  if (!mount) return;
  const map = new Map(list.map((item) => [String(item.id), item]));
  mount.querySelectorAll('.btn-add-cart').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (event) => {
      const id = event.currentTarget.dataset.productId;
      const item = map.get(id);
      if (item) {
        Cart.add(item);
      }
    });
  });
}

function mountCards(list, mount, meta) {
  if (!mount) return;
  if (!Array.isArray(list) || !list.length) {
    mount.innerHTML = '<div class="col-12"><div class="alert alert-warning">目前沒有符合條件的商品。</div></div>';
  } else {
    mount.innerHTML = list.map(createCardHtml).join('');
  }
  if (meta) {
    meta.textContent = `共 ${list.length} 筆結果`;
  }
  wireInlineButtons(mount, list);
}

function renderCategory(category = 'all', mountId = 'cards', metaId = 'resultMeta') {
  const mount = document.getElementById(mountId);
  const meta = metaId ? document.getElementById(metaId) : null;
  loadItems()
    .then((items) => {
      const filtered = category && category !== 'all'
        ? items.filter((item) => item.category === category)
        : items;
      mountCards(filtered, mount, meta);
    })
    .catch((err) => {
      console.error(err);
      if (mount) {
        mount.innerHTML = '<div class="col-12"><div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div></div>';
      }
    });
}

function bindSearch(category = 'all', mountId = 'cards', inputId = 'searchInput', metaId = 'resultMeta') {
  const input = document.getElementById(inputId);
  const mount = document.getElementById(mountId);
  const meta = metaId ? document.getElementById(metaId) : null;
  if (!input || !mount) return null;

  let currentCategory = category || 'all';
  let source = [];
  let base = [];

  function applyFilters() {
    const tokens = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let filtered = base;
    if (tokens.length) {
      filtered = base.filter((item) => {
        const haystack = [
          item.id,
          item.title,
          item.category,
          String(item.price),
          item.description || '',
        ].join(' ').toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });
    }
    mountCards(filtered, mount, meta);
  }

  loadItems()
    .then((items) => {
      source = items;
      base = currentCategory !== 'all'
        ? source.filter((item) => item.category === currentCategory)
        : source;
      applyFilters();
    })
    .catch((err) => {
      console.error(err);
      if (mount) {
        mount.innerHTML = '<div class="col-12"><div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div></div>';
      }
    });

  input.addEventListener('input', applyFilters);

  return {
    updateCategory(nextCategory = 'all') {
      currentCategory = nextCategory;
      base = currentCategory !== 'all'
        ? source.filter((item) => item.category === currentCategory)
        : source;
      applyFilters();
    },
  };
}

function renderAll(mountId = 'cards', metaId = 'resultMeta') {
  renderCategory('all', mountId, metaId);
}

async function renderProduct(containerId = 'productContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const productId = params.get('id');
  if (!productId) {
    container.innerHTML = '<div class="alert alert-warning">找不到商品代號。</div>';
    return;
  }

  try {
    const items = await loadItems();
    const item = items.find((p) => p.id === productId);
    if (!item) {
      container.innerHTML = '<div class="alert alert-danger">找不到此商品。</div>';
      return;
    }

    const gallery = Array.isArray(item.gallery) && item.gallery.length ? item.gallery : [item.thumbnail];
    container.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6 text-center">
          <img src="${ROOT}/${item.thumbnail}" alt="${item.title}" class="img-fluid rounded shadow-sm mb-3" onerror="this.src='${ROOT}/assets/images/logo.svg'">
          <div class="d-flex flex-wrap justify-content-center gap-2">
            ${gallery.map((src) => `<img src="${ROOT}/${src}" alt="${item.title}" class="thumb" style="width:80px;height:80px;object-fit:cover;" onerror="this.src='${ROOT}/assets/images/logo.svg'">`).join('')}
          </div>
        </div>
        <div class="col-md-6">
          <h3>${item.title}</h3>
          <p class="text-muted">${item.category || ''}</p>
          <p>${item.description || '無詳細介紹'}</p>
          <div class="h4 text-primary mb-3">NT$ ${formatCurrency(item.price)}</div>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-success" id="addToCart">加入購物車</button>
            <a href="${ROOT}/checkout.html" class="btn btn-outline-dark">前往結帳</a>
          </div>
        </div>
      </div>
    `;

    const addBtn = document.getElementById('addToCart');
    if (addBtn) {
      addBtn.addEventListener('click', () => Cart.add(item));
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div>';
  }
}

function renderCheckout() {
  Cart.render();
  if (typeof paypal !== 'undefined' && paypal?.Buttons) {
    paypal.Buttons({
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{ amount: { value: Cart.total().toFixed(2) } }],
      }),
      onApprove: (data, actions) => actions.order.capture().then(() => {
        alert('✅ 付款成功');
        Cart.clear();
        location.href = `${ROOT}/thankyou.html`;
      }),
    }).render('#paypal-button-container');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
  Cart.updateBadge();
});

window.Cart = Cart;
window.renderAll = renderAll;
window.renderCategory = renderCategory;
window.bindSearch = bindSearch;
window.renderProduct = renderProduct;
window.renderCheckout = renderCheckout;
