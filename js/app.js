/* /js/app.js －－ 直接整檔覆蓋 */

(function () {
  // 依頁面位置推測 items.json 路徑
  const DATA_URL = (location.pathname.includes('/games/') || location.pathname.includes('/products/'))
    ? '../data/items.json'
    : 'data/items.json';

  let ALL_ITEMS = [];
  let CUR_CATEGORY = 'all';
  let CUR_QUERY = '';

  // 頁面常用節點（容忍不存在）
  const elCards   = document.getElementById('cards');
  const elSearch  = document.getElementById('searchInput');
  const elClear   = document.getElementById('clearBtn');
  const elMeta    = document.getElementById('resultMeta');

  // 只抓一次資料
  async function fetchItemsOnce() {
    if (ALL_ITEMS.length) return ALL_ITEMS;
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`載入失敗：${DATA_URL} (${res.status})`);
    ALL_ITEMS = await res.json();
    return ALL_ITEMS;
  }

  // 工具：在 /games 或 /products 頁時自動補 ../ 前綴
  function prefix(p) {
    if (!p) return '';
    const needUp = location.pathname.includes('/games/') || location.pathname.includes('/products/');
    return needUp ? `../${p}` : p;
  }

  // 工具：HTML escape
  function h(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // 工具：Debounce
  function debounce(fn, wait){ let t=null; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); }; }

  // 共有的渲染器（依目前分類＋搜尋字串）
  async function renderNow(containerId = 'cards') {
    const mount = document.getElementById(containerId) || elCards;
    if (!mount) return;

    const items = await fetchItemsOnce();

    // 分類（'all'、空字串、null 都視為全部）
    const cat = (CUR_CATEGORY || 'all').toString().trim();
    let list = (cat === 'all') ? items : items.filter(i => (i.category || '').trim() === cat);

    // 搜尋字串（多關鍵字 AND）
    const q = (CUR_QUERY || '').trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter(it => {
        const hay = [
          it.id,
          it.title,
          it.category,
          String(it.price ?? ''),
          it.description ?? ''
        ].join(' ').toLowerCase();
        return tokens.every(t => hay.includes(t));
      });
    }

    // 寫進畫面
    mount.innerHTML = list.map(it => `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <a href="${prefix(it.link) || '#'}" class="text-decoration-none">
            <img src="${prefix(it.thumbnail)}" class="card-img-top"
                 alt="${h(it.title)}"
                 style="aspect-ratio:16/9;object-fit:cover"
                 onerror="this.src='${prefix('assets/images/placeholder.jpg')}'">
          </a>
          <div class="card-body d-flex flex-column">
            <h6 class="text-muted mb-1">${h(it.id)} · ${h(it.category)}</h6>
            <h5 class="card-title">${h(it.title)}</h5>
            <p class="card-text small text-secondary flex-grow-1">${h(it.description || '')}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <span class="fw-bold text-primary">NT$ ${it.price}</span>
              <a href="${prefix(it.link) || '#'}" class="btn btn-sm btn-outline-primary">查看詳情</a>
            </div>
          </div>
        </div>
      </div>
    `).join('') || `
      <div class="col-12">
        <div class="alert alert-light border text-center">沒有符合條件的項目。</div>
      </div>
    `;

    // 統計描述
    if (elMeta) {
      const parts = [];
      const showCat = (cat && cat !== 'all') ? `分類：<span class="badge bg-secondary">${h(cat)}</span>` : '';
      const showQ   = q ? `關鍵字：<span class="badge bg-info text-dark">${h(q)}</span>` : '';
      if (showCat) parts.push(showCat);
      if (showQ) parts.push(showQ);
      elMeta.innerHTML = `共 <strong>${list.length}</strong> 筆${parts.length ? '　' + parts.join('　') : ''}`;
    }
  }

  // --- 對外 API：首頁 / 分類頁 ---
  window.renderAll = async function (containerId = 'cards') {
    CUR_CATEGORY = 'all';
    // 若搜尋框存在，沿用目前輸入
    CUR_QUERY = (elSearch?.value || '').trim();
    await renderNow(containerId);
  };

  window.renderCategory = async function (category, containerId = 'cards') {
    CUR_CATEGORY = (category || 'all').toString().trim();
    CUR_QUERY = (elSearch?.value || '').trim();
    await renderNow(containerId);
  };

  // --- 對外 API：首頁/分類頁 綁搜尋 ---
  window.bindSearch = function (initialCategory = 'all', containerId = 'cards', inputId = 'searchInput', metaId = 'resultMeta') {
    const input = document.getElementById(inputId) || elSearch;
    const clear = elClear;

    // 若網址有 ?q= 先帶入
    const urlQ = new URLSearchParams(location.search).get('q');
    if (urlQ && input) input.value = urlQ;

    // 初次渲染
    CUR_CATEGORY = (initialCategory || 'all').toString().trim();
    CUR_QUERY = (input?.value || '').trim();
    renderNow(containerId);

    // 綁 input
    if (input) {
      const run = debounce(() => {
        CUR_QUERY = (input.value || '').trim();
        // 同步網址 ?q=
        const u = new URL(location.href);
        if (CUR_QUERY) u.searchParams.set('q', CUR_QUERY);
        else u.searchParams.delete('q');
        history.replaceState({}, '', u);
        renderNow(containerId);
      }, 200);
      input.addEventListener('input', run);
    }

    // 綁清除
    clear?.addEventListener('click', () => {
      if (!input) return;
      input.value = '';
      CUR_QUERY = '';
      const u = new URL(location.href);
      u.searchParams.delete('q');
      history.replaceState({}, '', u);
      renderNow(containerId);
      input.focus();
    });
  };

  // --- 商品詳情頁：主圖 + 縮圖可切換 ---
  window.renderProduct = async function (containerId = 'productContainer') {
    const el = document.getElementById(containerId);
    if (!el) return;

    const id = new URL(location.href).searchParams.get('id');
    if (!id) { el.innerHTML = `<div class="alert alert-warning">缺少 id 參數。</div>`; return; }

    try {
      const items = await fetchItemsOnce();
      const item = items.find(x => x.id === id);
      if (!item) { el.innerHTML = `<div class="alert alert-warning">找不到商品：${h(id)}</div>`; return; }

      const gallery = Array.isArray(item.gallery) ? item.gallery : [];
      const mainSrc = gallery.length ? gallery[0] : (item.thumbnail || '');

      el.innerHTML = `
        <div class="row g-4">
          <div class="col-lg-7">
            <img id="mainImg" src="${prefix(mainSrc)}" class="w-100 rounded shadow-sm object-contain"
                 alt="${h(item.title)}" onerror="this.src='${prefix('assets/images/placeholder.jpg')}'">
            <div class="d-flex flex-wrap gap-2 mt-3">
              ${[mainSrc, ...gallery.filter(g => g !== mainSrc)]
                .map((src, i) => `
                  <img src="${prefix(src)}" class="thumb rounded ${i===0?'thumb-active':''}"
                       alt="thumb" style="width:90px;height:90px;object-fit:cover;cursor:pointer;"
                       onerror="this.src='${prefix('assets/images/placeholder.jpg')}'">
                `).join('')}
            </div>
          </div>
          <div class="col-lg-5">
            <h2 class="h4 mb-1">${h(item.id)}｜${h(item.title)}</h2>
            <div class="text-primary fw-bold fs-4 mb-3">NT$ ${item.price}</div>
            <p class="text-muted">${h(item.description || '')}</p>
            <div class="small text-secondary">分類：${h(item.category)}</div>
            <div class="mt-4">
              <a class="btn btn-outline-secondary" href="javascript:history.back()">← 返回上一頁</a>
            </div>
          </div>
        </div>
      `;

      const main = document.getElementById('mainImg');
      el.querySelectorAll('.thumb').forEach(t => {
        t.addEventListener('click', () => {
          main.src = t.src;
          el.querySelectorAll('.thumb').forEach(x => x.classList.remove('thumb-active'));
          t.classList.add('thumb-active');
        });
      });

      // 鍵盤左右切換
      document.addEventListener('keydown', (e) => {
        const thumbs = Array.from(el.querySelectorAll('.thumb'));
        if (!thumbs.length) return;
        let idx = thumbs.findIndex(x => x.classList.contains('thumb-active'));
        if (e.key === 'ArrowRight') idx = (idx + 1) % thumbs.length;
        if (e.key === 'ArrowLeft')  idx = (idx - 1 + thumbs.length) % thumbs.length;
        thumbs[idx]?.click();
      });

    } catch (err) {
      console.error(err);
      el.innerHTML = `<div class="alert alert-danger">讀取商品失敗：${h(err.message)}</div>`;
    }
  };

  // ---- 頁面自動初始化（若頁面有放搜尋欄，就自動綁好） ----
  document.addEventListener('DOMContentLoaded', () => {
    // 在首頁（非 /games/ 與 /products/），預設載入全部並綁搜尋
    const isHome = !(location.pathname.includes('/games/') || location.pathname.includes('/products/'));
    if (isHome && elCards) {
      bindSearch('all', 'cards', 'searchInput', 'resultMeta');
    }
  });
})();
