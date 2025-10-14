// 渲染商品詳情（替換整段）
async function renderProduct(detailContainerId = 'productContainer') {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;

  const data = await loadItems();
  const item = data.find(i => i.id === id);

  const el = document.getElementById(detailContainerId);
  if (!item) { 
    el.innerHTML = `<div class="alert alert-warning">找不到該商品（${id}）。</div>`; 
    return; 
  }

  // 產生縮圖 HTML，先不綁事件，稍後一次綁
  const galleryImgs = (item.gallery || []).map((src, idx) => `
    <img 
      src="../${src}" 
      data-full="../${src}"
      class="img-thumbnail me-2 mb-2 thumb ${idx===0 ? 'thumb-active' : ''}" 
      style="width:120px;height:120px;object-fit:cover;cursor:pointer"
      alt="${item.title} - 圖片${idx+1}"
      onerror="this.src='https://via.placeholder.com/300x300?text=${item.id}'">
  `).join('');

  // 主圖先用 thumbnail，若有 gallery 就預設用第一張
  const firstFull = (item.gallery && item.gallery.length) ? `../${item.gallery[0]}` : `../${item.thumbnail}`;

  el.innerHTML = `
    <h2 class="fw-bold mb-2">${item.title}</h2>
    <div class="mb-3 text-primary fs-5">NT$ ${item.price}</div>
    <p class="text-muted">${item.description}</p>

    <div class="mb-3">
      <img id="mainImage" src="${firstFull}" class="img-fluid rounded shadow-sm" alt="${item.title}"
           onerror="this.src='https://via.placeholder.com/800x500?text=${item.id}'">
    </div>

    <h6 class="mt-4 mb-2">更多圖片</h6>
    <div id="thumbBar" class="d-flex flex-wrap">${galleryImgs || '<span class="text-muted">（尚無更多圖片）</span>'}</div>

    <div class="mt-4">
      <a href="javascript:history.back()" class="btn btn-outline-secondary">← 返回</a>
    </div>
  `;

  // 綁定縮圖點擊 → 切換主圖、更新 active 樣式
  const mainImage = document.getElementById('mainImage');
  const thumbs = el.querySelectorAll('.thumb');

  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      const full = t.getAttribute('data-full') || t.src;
      mainImage.src = full;
      thumbs.forEach(x => x.classList.remove('thumb-active'));
      t.classList.add('thumb-active');
    });
  });

  // 額外：左右方向鍵切換
  document.addEventListener('keydown', (e) => {
    if (!thumbs.length) return;
    const arr = Array.from(thumbs);
    let idx = arr.findIndex(x => x.classList.contains('thumb-active'));
    if (e.key === 'ArrowRight') {
      idx = (idx + 1) % arr.length;
      arr[idx].click();
    } else if (e.key === 'ArrowLeft') {
      idx = (idx - 1 + arr.length) % arr.length;
      arr[idx].click();
    }
  });
}
