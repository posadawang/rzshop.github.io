/* ============================
   阿智小舖主要功能腳本
   ============================ */

// ---- 全域變數 ----
const DATA_PATH = "/rzshop.github.io/data/items.json";
const IMG_PATH = "/rzshop.github.io/";
let allItems = [];

// ---- 載入全部商品 ----
async function loadItems() {
  if (allItems.length) return allItems;
  const res = await fetch(`${DATA_PATH}?t=${Date.now()}`);
  allItems = await res.json();
  return allItems;
}

// ---- 渲染全部商品 ----
async function renderAll() {
  const items = await loadItems();
  renderList(items, "cards");
  updateCartBadge();
}

// ---- 渲染指定分類 ----
async function renderCategory(category, targetId) {
  const items = await loadItems();
  const filtered = category === "all" ? items : items.filter(i => i.category === category);
  renderList(filtered, targetId);
  updateCartBadge();
}

// ---- 渲染商品列表 ----
function renderList(items, targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="text-center text-muted py-5">沒有符合條件的商品</div>';
    return;
  }
  el.innerHTML = items.map(i => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="card h-100 shadow-sm">
        <img src="${IMG_PATH}${i.thumbnail}" class="card-img-top" alt="${i.title}">
        <div class="card-body d-flex flex-column">
          <h6 class="card-title">${i.title}</h6>
          <p class="small text-muted mb-1">${i.category}</p>
          <div class="fw-bold text-primary mb-2">$${i.price}</div>
          <a href="${i.link}" class="btn btn-outline-primary btn-sm mt-auto">查看詳情</a>
        </div>
      </div>
    </div>
  `).join('');
}

// ---- 搜尋功能 ----
document.addEventListener("DOMContentLoaded", async () => {
  await loadItems();

  const input = document.getElementById("searchInput");
  const meta = document.getElementById("resultMeta");
  const cards = document.getElementById("cards");

  if (input) {
    input.addEventListener("input", e => {
      const kw = e.target.value.trim();
      const keywords = kw ? kw.split(/\s+/) : [];
      let result = allItems;

      if (keywords.length > 0) {
        result = allItems.filter(i =>
          keywords.some(k =>
            i.title.includes(k) ||
            i.id.includes(k) ||
            i.category.includes(k) ||
            i.description.includes(k) ||
            String(i.price).includes(k)
          )
        );
      }

      renderList(result, "cards");
      meta.textContent = kw ? 搜尋到 ${result.length} 筆結果 : "";
    });
  }
});

// ---- 購物車徽章更新 ----
function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  try {
    const list = JSON.parse(localStorage.getItem("rzshop_cart") || "[]");
    const total = list.reduce((s, i) => s + (i.qty || 0), 0);
    badge.textContent = total;
  } catch {
    badge.textContent = "0";
  }
}
