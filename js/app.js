// 讀取 JSON（分類頁用相對路徑 ../data/items.json；首頁不會呼叫）
async function loadItems() {
  const urlGuess = (location.pathname.includes('/games/') || location.pathname.includes('/products/'))
    ? '../data/items.json' : 'data/items.json';
  const res = await fetch(urlGuess);
  return await res.json();
}

// 渲染分類頁卡片
async function renderCategory(category, containerId = 'cards') {
  const data = await loadItems();
  const list = data.filter(i => i.category === category);
  const el = document.getElementById(containerId);
  el.innerHTML = '';

  list.forEach(item => {
    el.insertAdjacentHTML('beforeend', `
      <div class="col-sm-6 col-lg-4">
        <a href="../products/product.html?id=${encodeURIComponent(item.id)}" class="text-decoration-none text-dark">
          <div class="card h-100 shadow-sm">
            <img src="../${item.thumbnail}" class="card-img-top" alt="${item.title}" onerror="this.src='https://via.placeholder.com/800x500?text=${item.id}'">
            <div class="card-body">
              <h5 class="card-title fw-bold">${item.title}</h5>
              <p class="text-muted small">${item.description}</p>
              <div class="price">NT$ ${item.price}</div>
            </div>
          </div>
        </a>
      </div>
    `);
  });
}

// 渲染商品詳情
async function renderProduct(detailContainerId = 'productContainer') {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;
  const data = await loadItems();
  const item = data.find(i => i.id === id);
  const el = document.getElementById(detailContainerId);
  if (!item) { el.innerHTML = `<div class="alert alert-warning">找不到該商品（${id}）。</div>`; return; }

  const galleryImgs = (item.gallery || []).map(src => `
    <img src="../${src}" class="img-thumbnail me-2 mb-2" style="width:140px;height:140px;object-fit:cover"
         onerror="this.src='https://via.placeholder.com/300x300?text=${item.id}'">
  `).join('');

  el.innerHTML = `
    <h2 class="fw-bold mb-2">${item.title}</h2>
    <div class="mb-3 text-primary fs-5">NT$ ${item.price}</div>
    <p class="text-muted">${item.description}</p>

    <div class="mb-3">
      <img src="../${item.thumbnail}" class="img-fluid rounded" alt="${item.title}"
           onerror="this.src='https://via.placeholder.com/800x500?text=${item.id}'">
    </div>

    <h6 class="mt-4 mb-2">更多圖片</h6>
    <div class="d-flex flex-wrap">${galleryImgs || '<span class="text-muted">（尚無更多圖片）</span>'}</div>

    <div class="mt-4">
      <a href="javascript:history.back()" class="btn btn-outline-secondary">← 返回</a>
    </div>
  `;
}
