/* ===== 阿智小舖統一購物車系統 (v2) ===== */
(function(){
  const CART_KEY = 'rzshop_cart';

  window.Cart = {
    key: CART_KEY,
    get(){
      try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
      catch(e){ return []; }
    },
    set(list){
      localStorage.setItem(CART_KEY, JSON.stringify(list||[]));
    },
    add(item){
      const cart = this.get();
      const idx = cart.findIndex(x => x.id === item.id);
      if(idx > -1){
        cart[idx].qty += (item.qty || 1);
      }else{
        cart.push({
          id: item.id,
          title: item.title,
          price: Number(item.price) || 0,
          qty: item.qty || 1,
          thumbnail: item.thumbnail || ''
        });
      }
      this.set(cart);
      return cart;
    },
    remove(id){
      this.set(this.get().filter(x => x.id !== id));
    },
    updateQty(id, qty){
      qty = Math.max(1, Number(qty)||1);
      const cart = this.get();
      const idx = cart.findIndex(x => x.id === id);
      if(idx>-1){ cart[idx].qty = qty; }
      this.set(cart);
    },
    clear(){ this.set([]); },
    total(){
      return this.get().reduce((sum, x) => sum + x.price * x.qty, 0);
    }
  };
})();

/* ===== 首頁 / 商品卡片生成與搜尋 ===== */
document.addEventListener('DOMContentLoaded', async () => {
  const cardsEl = document.getElementById('cards');
  if(!cardsEl) return; // 不在首頁就略過

  const res = await fetch('/rzshop.github.io/data/items.json?ts=' + Date.now());
  const items = await res.json();

  function money(n){ return '$' + (Number(n)||0).toFixed(2); }

  function render(list){
    cardsEl.innerHTML = list.map(p => `
      <div class="col-12 col-md-4 col-lg-3">
        <div class="card h-100 shadow-sm">
          <img src="/rzshop.github.io/${p.thumbnail}" class="card-img-top" alt="">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.title}</h5>
            <p class="card-text small text-muted mb-2">${p.category}</p>
            <div class="mt-auto">
              <div class="fw-bold mb-2 text-primary">${money(p.price)}</div>
              <div class="d-flex gap-2">
                <a href="/rzshop.github.io/${p.link}" class="btn btn-outline-secondary btn-sm flex-grow-1">查看</a>
                <button class="btn btn-primary btn-sm flex-grow-1"
                        onclick="Cart.add({id:'${p.id}', title:'${p.title}', price:${p.price}, thumbnail:'${p.thumbnail}', qty:1});alert('已加入購物車！');">
                  加入購物車
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  render(items);

  // 搜尋功能（若有 searchInput）
  const input = document.getElementById('searchInput');
  if(input){
    input.addEventListener('input', ()=>{
      const q = input.value.trim();
      if(!q){ render(items); return; }
      const qs = q.split(/\s+/);
      const result = items.filter(it=>{
        return qs.every(k =>
          (it.id && it.id.includes(k)) ||
          (it.title && it.title.includes(k)) ||
          (it.category && it.category.includes(k)) ||
          (it.description && it.description.includes(k)) ||
          String(it.price).includes(k)
        );
      });
      render(result);
    });
  }
});
