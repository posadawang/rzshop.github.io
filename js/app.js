/* js/app.js */

const PATHS = [
  // 在 /games 或 /products 頁面時會用到
  '../data/items.json',
  // 在根目錄頁（index.html）
  './data/items.json',
  // 絕對路徑（GitHub Pages 容錯）
  '/data/items.json'
];

async function fetchItems() {
  for (const p of PATHS) {
    try {
      const r = await fetch(p, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch (e) {}
  }
  throw new Error('items.json 無法載入，請檢查路徑或 JSON 格式。');
}

function nt(num) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(num);
}

/** 渲染某個分類的商品清單到指定容器 */
async function renderCategory(category, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  try {
    const items = await fetchItems();
    const list = items.filter(x => x.category === category);
    if (!list.length) {
      el.innerHTML = `<div class="text-muted">目前沒有商品。</div>`;
      return;
    }

    el.innerHTML = list.map(item => `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <img src="../${item.thumbnail}" class="card-img-top ratio-16x9 object-cover" alt="${item.title}" onerror="this.src='../assets/images/placeholder.jpg'">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${item.id}｜${item.title}</h5>
            <p class="card-text text-muted small flex-grow-1">${item.description ?? ''}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <span class="fw-bold text-primary">${nt(item.price)}</span>
              <a href="../${item.link}" class="btn btn-sm btn-outline-primary">查看詳情</a>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="alert alert-danger">讀取商品失敗。${err.message}</div>`;
  }
}

/** 讀詳情頁（依 ?id=XXX）並渲染主圖 + 縮圖可切換 */
async function renderProduct(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const url = new URL(location.href);
  const id = url.searchParams.get('id');
  if (!id) { el.innerHTML = `<div class="alert alert-warning">缺少 id。</div>`; return; }

  try {
    const items = await fetchItems();
    const item = items.find(x => x.id === id);
    if (!item) { el.innerHTML = `<div class="alert alert-warning">找不到商品：${id}</div>`; return; }

    const gallery = item.gallery ?? [];
    const main = gallery.length ? gallery[0] : item.thumbnail;

    el.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-7">
          <img id="mainImg" src="../${main}" class="w-100 rounded shadow-sm object-contain" alt="${item.title}"
               onerror="this.src='../assets/images/placeholder.jpg'">
          <div class="d-flex flex-wrap gap-2 mt-3">
            ${[main, ...gallery.filter(g => g !== main)]
              .map((src, i) => `
                <img src="../${src}" class="thumb rounded ${i===0?'thumb-active':''}" alt="thumb"
                     style="width:90px;height:90px;object-fit:cover;cursor:pointer;"
                     onerror="this.src='../assets/images/placeholder.jpg'">
              `).join('')}
          </div>
        </div>

        <div class="col-lg-5">
          <h2 class="h4 mb-1">${item.id}｜${item.title}</h2>
          <div class="text-primary fw-bold fs-4 mb-3">${nt(item.price)}</div>
          <p class="text-muted">${item.description ?? ''}</p>
          <div class="small text-secondary">分類：${item.category}</div>

          <div class="mt-4">
            <a class="btn btn-outline-secondary" href="javascript:history.back()">← 返回上一頁</a>
          </div>
        </div>
      </div>
    `;

    // 縮圖點擊切換主圖 + 高亮
    const mainImg = document.getElementById('mainImg');
    el.querySelectorAll('.thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        mainImg.src = thumb.src;
        el.querySelectorAll('.thumb').forEach(t => t.classList.remove('thumb-active'));
        thumb.classList.add('thumb-active');
      });
    });

  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="alert alert-danger">讀取商品失敗。${err.message}</div>`;
  }
}
