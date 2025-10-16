import { auth, logout, requireAuth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const CartStorageKey = "cart_items";
const dataUrl = new URL("../data/items.json", import.meta.url);
let catalogPromise;

function parseCartItems(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  try {
    const items = JSON.parse(raw);
    if (Array.isArray(items)) {
      return items
        .map(item => ({
          id: item?.id ?? "",
          name: item?.name ?? item?.title ?? "",
          price: Number.isFinite(Number(item?.price)) ? Number(item.price) : 0,
          qty: Math.max(1, Math.floor(Number(item?.qty ?? 1)))
        }))
        .filter(item => item.id && item.name && item.price >= 0);
    }
  } catch (err) {
    console.warn("Failed to parse cart items from localStorage", err);
  }
  return [];
}

function updateCartBadge(items = []) {
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  document.querySelectorAll("[data-cart-badge]").forEach(badge => {
    badge.textContent = totalQty;
    const hideOnEmpty = badge.dataset.hideOnEmpty !== undefined;
    if (totalQty > 0) {
      badge.classList.remove("d-none");
    } else if (hideOnEmpty) {
      badge.classList.add("d-none");
    }
  });
}

async function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(dataUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load catalog: ${response.status}`);
        }
        return response.json();
      })
      .then(items => {
        if (!Array.isArray(items)) {
          throw new Error("Catalog data is not an array");
        }
        return items.map(item => ({
          ...item,
          id: String(item.id || "").trim(),
          title: String(item.title || "").trim(),
          category: String(item.category || "未分類").trim(),
          price: Number(item.price) || 0,
          description: item.description ?? "",
          link: item.link || `product.html?id=${encodeURIComponent(item.id)}`
        }));
      })
      .catch(error => {
        console.error(error);
        alert("商品資料載入失敗，請稍後再試。");
        return [];
      });
  }
  return catalogPromise;
}

function normalize(str = "") {
  return String(str).toLowerCase();
}

function toTokens(query = "") {
  return query
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}

function formatPrice(value) {
  return new Intl.NumberFormat("zh-Hant-TW", { style: "currency", currency: "TWD", minimumFractionDigits: 0 }).format(value);
}

function populateYear() {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// 購物車模組
const Cart = {
  key: CartStorageKey,
  get() {
    return parseCartItems(localStorage.getItem(this.key));
  },
  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    updateCartBadge(items);
    renderCart();
  },
  clear() {
    this.save([]);
  },
  total(items = this.get()) {
    return items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      return total + price * qty;
    }, 0);
  },
  add(product, qty = 1) {
    if (!product || !product.id) return;
    const items = this.get();
    const existing = items.find(item => item.id === product.id);
    const quantity = Math.max(1, Math.floor(Number(qty) || 1));
    if (existing) {
      existing.qty = Math.max(1, Math.floor(Number(existing.qty) || 0)) + quantity;
      existing.price = Number(product.price) || existing.price || 0;
      existing.name = product.title || existing.name || product.name || product.id;
    } else {
      items.push({
        id: product.id,
        name: product.title || product.name || product.id,
        price: Number(product.price) || 0,
        qty: quantity
      });
    }
    this.save(items);
  }
};

if (typeof window !== "undefined") {
  window.Cart = Cart;
}

// 載入購物車
function renderCart() {
  const cart = Cart.get();
  const container = document.getElementById("cartItems");
  const totalElement = document.getElementById("cartTotal");

  if (container) {
    if (cart.length === 0) {
      container.innerHTML = `<p class="text-center text-muted py-4">購物車是空的</p>`;
    } else {
      container.innerHTML = cart
        .map((item, index) => `
    <div class="d-flex justify-content-between align-items-center border-bottom py-2">
      <div>
        <div class="fw-bold">${item.name}</div>
        <div class="text-muted small">${formatPrice(item.price)}</div>
      </div>
      <div class="d-flex align-items-center">
        <input type="number" class="form-control form-control-sm text-center"
          value="${Math.floor(item.qty)}" min="1" style="width:60px"
          onchange="updateQty(${index}, this.value)">
        <button class="btn btn-outline-danger btn-sm ms-2" onclick="removeItem(${index})">移除</button>
      </div>
    </div>
  `)
        .join("");
    }
  }

  if (totalElement) {
    totalElement.textContent = Cart.total(cart).toLocaleString("zh-Hant-TW");
  }
}

async function initCatalogPage() {
  const cardsContainer = document.getElementById("cards");
  if (!cardsContainer) return;

  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const resultMeta = document.getElementById("resultMeta");
  const categoryButtons = Array.from(document.querySelectorAll(".cat-btn"));

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";
  const initialCategory = params.get("cat") || cardsContainer.dataset.category || "all";

  if (searchInput && initialQuery) {
    searchInput.value = initialQuery;
  }

  let activeCategory = initialCategory;
  const allItems = await loadCatalog();

  function renderCards(items) {
    if (!items.length) {
      cardsContainer.innerHTML = `
        <div class="col-12">
          <div class="text-center text-muted py-5 border rounded-3">
            找不到符合條件的商品，請嘗試其他關鍵字。
          </div>
        </div>`;
      return;
    }

    cardsContainer.innerHTML = items
      .map(item => `
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card h-100 shadow-sm">
            <img src="${item.thumbnail}" class="card-img-top" alt="${item.title}">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="badge bg-secondary">${item.category}</span>
                <span class="fw-bold text-primary">${formatPrice(item.price)}</span>
              </div>
              <h2 class="h6 card-title">${item.title}</h2>
              <p class="card-text text-muted small flex-grow-1">${item.description}</p>
              <div class="d-grid gap-2 mt-3">
                <a class="btn btn-outline-primary" href="${item.link}">查看詳情</a>
                <button class="btn btn-primary" type="button" data-add-to-cart="${item.id}">加入購物車</button>
              </div>
            </div>
          </div>
        </div>
      `)
      .join("");
  }

  function applyFilters() {
    const tokens = toTokens(searchInput?.value || "");
    const filtered = allItems.filter(item => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }

      if (!tokens.length) return true;

      const haystack = [
        item.id,
        item.title,
        item.category,
        item.description,
        String(item.price)
      ]
        .map(value => normalize(value))
        .join(" ");

      return tokens.every(token => haystack.includes(normalize(token)));
    });

    renderCards(filtered);

    if (resultMeta) {
      const totalCount = filtered.length;
      const baseText = totalCount ? `共找到 ${totalCount} 筆商品` : "目前沒有符合條件的商品";
      if (tokens.length || activeCategory !== "all") {
        const tokenText = tokens.length ? `關鍵字：「${tokens.join("、")}"` : "";
        const categoryText = activeCategory !== "all" ? `分類：${activeCategory}` : "";
        resultMeta.textContent = [baseText, tokenText, categoryText].filter(Boolean).join(" ｜ ");
      } else {
        resultMeta.textContent = baseText;
      }
    }
  }

  cardsContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-add-to-cart]");
    if (!button) return;
    const id = button.getAttribute("data-add-to-cart");
    if (!id) return;
    loadCatalog().then(items => {
      const product = items.find(item => item.id === id);
      if (!product) {
        alert("找不到此商品");
        return;
      }
      Cart.add(product, 1);
      alert(`已將「${product.title}」加入購物車`);
    });
  });

  categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
      const category = button.dataset.cat || "all";
      activeCategory = category;
      categoryButtons.forEach(btn => btn.classList.toggle("active", btn === button));
      applyFilters();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
      }
      applyFilters();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyFilters();
    });
  }

  // Initialize
  categoryButtons.forEach(button => {
    const category = button.dataset.cat || "all";
    button.classList.toggle("active", category === activeCategory);
  });

  applyFilters();
}

async function initProductPage() {
  const container = document.getElementById("productContainer");
  if (!container) return;

  container.innerHTML = `<div class="text-center text-muted py-5">商品載入中...</div>`;

  const params = new URLSearchParams(window.location.search);
  const productId = (params.get("id") || "").trim();

  if (!productId) {
    container.innerHTML = `<div class="alert alert-warning">無法辨識商品編號。</div>`;
    return;
  }

  const items = await loadCatalog();
  const product = items.find(item => item.id === productId);

  if (!product) {
    container.innerHTML = `<div class="alert alert-danger">找不到對應的商品（${productId}）。</div>`;
    return;
  }

  document.title = `${product.title}｜阿智小舖`;

  const gallery = Array.isArray(product.gallery) && product.gallery.length > 0
    ? product.gallery
    : [product.thumbnail];

  container.innerHTML = `
    <div class="row g-4">
      <div class="col-md-6">
        <div class="ratio ratio-4x3 border rounded">
          <img src="${gallery[0]}" alt="${product.title}" class="img-fluid object-fit-cover rounded">
        </div>
        ${gallery.length > 1 ? `
          <div class="d-flex gap-2 mt-3 flex-wrap">
            ${gallery
              .map(image => `<img src="${image}" alt="${product.title}" class="img-thumbnail" style="width:90px;height:90px;object-fit:cover;">`)
              .join("")}
          </div>
        ` : ""}
      </div>
      <div class="col-md-6">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <span class="badge bg-secondary">${product.category}</span>
          <span class="fs-4 fw-bold text-primary">${formatPrice(product.price)}</span>
        </div>
        <h1 class="h4">${product.title}</h1>
        <p class="text-muted">${product.description || "此商品暫無詳細描述。"}</p>
        <div class="d-grid gap-2 mt-4">
          <button class="btn btn-primary" type="button" data-product-id="${product.id}">加入購物車</button>
          <a class="btn btn-outline-secondary" href="index.html">返回商品列表</a>
        </div>
      </div>
    </div>
  `;

  container.querySelector("[data-product-id]")?.addEventListener("click", () => {
    Cart.add(product, 1);
    alert(`已將「${product.title}」加入購物車`);
  });
}

// 付款按鈕事件
async function handleNewebpayCheckout(button) {
  const cartItems = Cart.get();
  const amount = Cart.total(cartItems);

  if (amount <= 0) {
    alert("購物車為空，無法結帳！");
    return;
  }

  const user = await requireAuth();
  if (!user) {
    return;
  }

  const email =
    user.email ||
    user.providerData?.find(profile => profile?.email)?.email ||
    "";

  if (!email) {
    alert("無法取得會員 Email，請確認帳號資訊。");
    return;
  }

  const payload = {
    amount,
    email,
    itemDesc: "阿智小舖商品",
    items: cartItems.map(item => ({
      id: item.id || "",
      title: item.name,
      price: item.price,
      qty: item.qty
    }))
  };

  try {
    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = "建立訂單中...";
    }

    const response = await fetch("https://us-central1-rzshop-auth.cloudfunctions.net/api/createOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("CreateOrder failed", { payload, responseText });
      alert("建立付款訂單失敗，請稍後再試。");
      return;
    }

    const popup = window.open("", "_blank");
    if (popup) {
      popup.document.write(responseText);
      popup.document.close();
    } else {
      document.open();
      document.write(responseText);
      document.close();
    }
  } catch (error) {
    console.error("CreateOrder error", error);
    alert("建立付款訂單時發生錯誤，請檢查網路後重試。");
  } finally {
    if (button) {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }
}

// 初始化
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}

onAuthStateChanged(auth, (user) => {
  const status = document.getElementById("userStatus");
  const loginBtn = document.getElementById("loginBtn");

  if (user) {
    if (status) status.textContent = user.email || "已登入";
    if (loginBtn) loginBtn.classList.add("d-none");
    if (logoutBtn) logoutBtn.classList.remove("d-none");
  } else {
    if (status) status.textContent = "未登入";
    if (loginBtn) loginBtn.classList.remove("d-none");
    if (logoutBtn) logoutBtn.classList.add("d-none");
  }
});

const newebpayButton = document.getElementById("newebpay-button");
if (newebpayButton) {
  newebpayButton.addEventListener("click", (event) => {
    event.preventDefault();
    handleNewebpayCheckout(newebpayButton);
  });
}

if (typeof window !== "undefined") {
  window.updateQty = (index, val) => {
    const cart = Cart.get();
    if (!cart[index]) return;
    const qty = Math.max(1, parseInt(val, 10) || 1);
    cart[index].qty = qty;
    Cart.save(cart);
  };

  window.removeItem = (index) => {
    const cart = Cart.get();
    cart.splice(index, 1);
    Cart.save(cart);
  };
}

updateCartBadge(Cart.get());
renderCart();
populateYear();
initCatalogPage();
initProductPage();
