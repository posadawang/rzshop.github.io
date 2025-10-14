// === 資料來源 ===
const DATA_URL = "data/items.json";

// === 共用購物車 ===
const KEY = "rzshop_cart";
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  },
  set(l) { localStorage.setItem(KEY, JSON.stringify(l || [])); },
  add(item) {
    const list = Cart.get();
    const i = list.findIndex(x => x.id === item.id);
    if (i > -1) list[i].qty += 1;
    else list.push({ ...item, qty: 1 });
    Cart.set(list);
  },
  totalQty() { return Cart.get().reduce((a, i) => a + i.qty, 0); }
};

// === 更新右上角購物車數量 ===
function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = Cart.totalQty();
}

// === 渲染商品卡 ===
async function renderAll() {
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    window.allItems = data;
    renderList(data);
  } catch (err) {
    document.getElementById("cards").innerHTML =
      `<div class="alert alert-danger text-center">❌ 無法載入商品資料</div>`;
  }
}

function renderList(list) {
  const cards = document.getElementById("cards");
  if (!cards) return;
  if (list.length === 0) {
    cards.innerHTML = `<div class="text-center opacity-75">沒有符合的商品。</div>`;
    return;
  }
  cards.innerHTML = list.map(i => `
    <div class="col-md-3 col-6">
      <div class="card h-100 shadow-sm">
        <img src="${i.thumbnail}" class="card-img-top" alt="${i.title}">
        <div class="card-body">
          <h6 class="card-title">${i.title}</h6>
          <p class="small text-muted mb-1">${i.category}</p>
          <div class="fw-bold text-primary">$${i.price}</div>
          <a href="${i.link}" class="btn btn-outline-dark btn-sm w-100 mt-2">查看詳情</a>
        </div>
      </div>
    </div>
  `).join("");
  updateCartBadge();
}

// === 分類 ===
function renderCategory(cat) {
  if (!window.allItems) return;
  if (cat === "all") renderList(window.allItems);
  else renderList(window.allItems.filter(i => i.category === cat));
}

// === 搜尋 ===
function bindSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    if (!val) return renderAll();
    const keys = val.split(" ");
    const filtered = window.allItems.filter(i =>
      keys.every(k =>
        i.title.toLowerCase().includes(k) ||
        i.category.toLowerCase().includes(k) ||
        i.id.toLowerCase().includes(k)
      )
    );
    renderList(filtered);
  });
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    input.value = "";
    renderAll();
  });
}

// === 加入購物車 ===
function addToCart(id, title, price, thumbnail) {
  Cart.add({ id, title, price, thumbnail });
  updateCartBadge();
  alert(`✅ 已將「${title}」加入購物車！`);
}

// === 初始載入 ===
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  if (document.getElementById("cards")) renderAll();
  bindSearch();
  updateCartBadge();

  // 分類按鈕綁定
  const btns = document.querySelectorAll(".cat-btn");
  btns.forEach(b => b.addEventListener("click", () => {
    btns.forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    renderCategory(b.getAttribute("data-cat"));
  }));
});
