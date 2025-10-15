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
    mount.innerHTML = list

      .join('');
    if (totalEl) totalEl.textContent = formatCurrency(Cart.total());
  }
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('zh-TW');
}

async function getItems() {
  if (itemsCache) return itemsCache;
  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('資料格式錯誤');
    itemsCache = data;
    return data;
  } catch (err) {
    console.error('Failed to load items.json', err);
    throw err;
  }
}

function buildCard(item) {
  const link = `${ROOT}/product.html?id=${encodeURIComponent(item.id)}`;
  const price = formatCurrency(item.price);
  return `
    <div class="col-12 col-sm-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <img src="${ROOT}/${item.thumbnail}" class="card-img-top" alt="${item.title}">
        <div class="card-body">
          <h5 class="card-title mb-1">${item.id}｜${item.title}</h5>
          <div class="text-primary fw-bold mb-2">NT$ ${price}</div>
          <p class="card-text small text-muted mb-3">${item.description ?? ''}</p>

        </div>
      </div>
    </div>
  `;
}

function renderList(mount, list) {
  if (!mount) return;
  if (!Array.isArray(list) || !list.length) {
    mount.innerHTML = '<p class="text-center text-muted py-5">目前沒有商品</p>';
    return;
  }
  mount.innerHTML = list.map(buildCard).join('');
 main
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
    renderList(mount, list);
    return list;
  } catch (err) {
    mount.innerHTML = '<div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div>';
    return [];
  }
}

async function renderCategory(category = 'all', mountId = 'cards') {
  return renderProducts(mountId, category);
}

async function renderAll(mountId = 'cards') {
  return renderProducts(mountId, 'all');
}

async function bindSearch(category = 'all', mountId = 'cards', inputId = 'searchInput', metaId) {
  const input = document.getElementById(inputId);
  const mount = document.getElementById(mountId);
  const meta = metaId ? document.getElementById(metaId) : null;
  if (!input || !mount) {
    return {
      async setCategory() {}
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
      mount.innerHTML = '<div class="alert alert-danger">商品資料載入失敗，請稍後再試。</div>';
      state.base = [];
    }
    applyFilter();
  };

  await loadCategory(category);
 main
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
 main
});
