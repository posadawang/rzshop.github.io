import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// 初始化 Firebase
const firebaseConfig = {
  apiKey: "你的APIKEY",
  authDomain: "rzshop-auth.firebaseapp.com",
  projectId: "rzshop-auth",
  storageBucket: "rzshop-auth.appspot.com",
  messagingSenderId: "你的senderID",
  appId: "你的appID"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 購物車模組
const Cart = {
  key: "cart_items",
  get() {
    return JSON.parse(localStorage.getItem(this.key) || "[]");
  },
  save(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
  },
  clear() {
    localStorage.removeItem(this.key);
    location.reload();
  },
  total() {
    return this.get().reduce((t, i) => t + (i.price * i.qty), 0);
  }
};

// 載入購物車
function renderCart() {
  const cart = Cart.get();
  const container = document.getElementById("cartItems");
  const total = document.getElementById("cartTotal");
  if (cart.length === 0) {
    container.innerHTML = `<p class="text-center text-muted py-4">購物車是空的</p>`;
    total.textContent = "0";
    return;
  }

  container.innerHTML = cart.map((item, index) => `
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
  `).join("");

  total.textContent = Cart.total();
}

// 更新數量
window.updateQty = (index, val) => {
  const cart = Cart.get();
  const qty = Math.max(1, parseInt(val) || 1);
  cart[index].qty = qty;
  Cart.save(cart);
  renderCart();
};

// 移除項目
window.removeItem = (index) => {
  const cart = Cart.get();
  cart.splice(index, 1);
  Cart.save(cart);
  renderCart();
};

// 付款按鈕事件
document.getElementById("newebpay-button").addEventListener("click", async () => {
  const amount = Cart.total();
  const user = auth.currentUser;

  if (!user) {
    alert("請先登入才能結帳！");
    return;
  }

  // 從 Firebase 取使用者 Email（確保不是空的）
  const email = user.email || "test@example.com";

  const body = {
    amount,
    email,
    itemDesc: "阿智小舖商品"
  };

  console.log("送出訂單:", body);

  const res = await fetch("https://us-central1-rzshop-auth.cloudfunctions.net/api/createOrder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  document.open();
  document.write(text);
  document.close();
});

// 初始化
onAuthStateChanged(auth, (user) => {
  const status = document.getElementById("userStatus");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    status.textContent = user.email;
    loginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
  } else {
    status.textContent = "未登入";
    loginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
  }
});

renderCart();
