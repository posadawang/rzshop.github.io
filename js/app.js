import { auth, logout, requireAuth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const CartStorageKey = "cart_items";

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
        .filter(item => item.name && item.price >= 0);
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

// 購物車模組
const Cart = {
  key: CartStorageKey,
  get() {
    return parseCartItems(localStorage.getItem(this.key));
  },
  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    updateCartBadge(items);
  },
  clear() {
    localStorage.removeItem(this.key);
    updateCartBadge([]);
    renderCart();
  },
  total(items = this.get()) {
    return items.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      return total + price * qty;
    }, 0);
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
        <div class="text-muted small">NT$${item.price}</div>
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
    totalElement.textContent = Cart.total(cart);
  }
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
    renderCart();
  };

  window.removeItem = (index) => {
    const cart = Cart.get();
    cart.splice(index, 1);
    Cart.save(cart);
    renderCart();
  };
}

updateCartBadge(Cart.get());
renderCart();
