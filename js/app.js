// === GitHub Pages base path ===
const ROOT = '/rzshop.github.io';
const DATA_URL = `${ROOT}/data/items.json`;
const CART_KEY = 'rzshop_cart_final';

// Cart
const Cart = {
  get(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||'[]'); }catch(e){ return []; } },
  set(c){ localStorage.setItem(CART_KEY, JSON.stringify(c||[])); Cart.updateBadge(); },
  add(item){
    const cart = Cart.get();
    const i = cart.findIndex(x=>x.id===item.id);
    if(i>-1) cart[i].qty += 1; else cart.push({...item, qty:1});
    Cart.set(cart);
    alert(`✅ 已加入購物車：${item.title}`);
  },
  updateQty(id, qty){
    qty = Math.max(1, Number(qty)||1);
    const cart = Cart.get();
    const it = cart.find(x=>x.id===id); if(it){ it.qty = qty; Cart.set(cart); Cart.render(); }
  },
  remove(id){ Cart.set(Cart.get().filter(x=>x.id!==id)); Cart.render(); },
  clear(){ localStorage.removeItem(CART_KEY); Cart.render(); Cart.updateBadge(); },
  total(){ return Cart.get().reduce((s,i)=>s + i.price * i.qty, 0); },
  updateBadge(){
    const b = document.getElementById('cartCount');
    if(!b) return;
    const n = Cart.get().reduce((s,i)=>s+i.qty,0);
    b.textContent = n;
  },
  render(){
    const c = document.getElementById('cartItems');
    const t = document.getElementById('cartTotal');
    if(!c) return;
    const cart = Cart.get();
    if(!cart.length){
      c.innerHTML = '<p class="text-center text-muted py-5">購物車是空的</p>';
      if(t) t.textContent = '0';
      return;
    }
    c.innerHTML = cart.map(x=>`
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <div><strong>${x.title}</strong><br>NT$${x.price}</div>
        <div class="d-flex align-items-center gap-2">
          <input type="number" min="1" value="${x.qty}" class="form-control form-control-sm w-auto" onchange="Cart.updateQty('${x.id}', this.value)">
          <button class="btn btn-sm btn-outline-danger" onclick="Cart.remove('${x.id}')">刪除</button>
        </div>
      </div>
    `).join('');
    if(t) t.textContent = Cart.total().toLocaleString();
  }
};

// Data
async function getItems(){
  const r = await fetch(`${DATA_URL}?t=${Date.now()}`);
  return await r.json();
}

// Index / category render
async function renderProducts(containerId, filter){
  const el = document.getElementById(containerId);
  if(!el) return;
  const items = await getItems();
  const list = filter && filter!=='all' ? items.filter(x=>x.category===filter) : items;
  el.innerHTML = list.map(p=>`
    <div class="col-md-4 mb-4">
      <div class="card h-100 shadow-sm">
        <img src="${ROOT}/${p.thumbnail}" class="card-img-top" alt="">
        <div class="card-body">
          <h5>${p.title}</h5>
          <p class="small text-muted">${p.description||''}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary">NT$${p.price}</span>
            <a href="${ROOT}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Search
async function bindSearch(){
  const input = document.getElementById('searchInput');
  const cards = document.getElementById('cards');
  if(!input || !cards) return;
  const items = await getItems();
  input.addEventListener('input', () => {
    const kw = input.value.trim();
    if(!kw){ renderProducts('cards'); return; }
    const keys = kw.split(/\s+/);
    const result = items.filter(i => keys.every(k =>
      (i.title && i.title.includes(k)) ||
      (i.id && i.id.includes(k)) ||
      (i.category && i.category.includes(k)) ||
      (i.description && i.description.includes(k)) ||
      (String(i.price).includes(k))
    ));
    cards.innerHTML = result.length ? result.map(p=>`
      <div class="col-md-4 mb-4">
        <div class="card h-100 shadow-sm">
          <img src="${ROOT}/${p.thumbnail}" class="card-img-top" alt="">
          <div class="card-body">
            <h5>${p.title}</h5>
            <p class="small text-muted">${p.description||''}</p>
            <div class="d-flex justify-content-between align-items-center">
              <span class="fw-bold text-primary">NT$${p.price}</span>
              <a href="${ROOT}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a>
            </div>
          </div>
        </div>
      </div>
    `).join('') : '<p class="text-center text-muted py-5">找不到符合的商品</p>';
  });
  const clearBtn = document.getElementById('clearBtn');
  if(clearBtn){
    clearBtn.addEventListener('click', ()=>{
      input.value='';
      renderProducts('cards');
      input.focus();
    });
  }
}

// Product page
async function renderProduct(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const id = new URLSearchParams(location.search).get('id');
  const data = await getItems();
  const item = data.find(x=>String(x.id)===String(id));
  if(!item){
    el.innerHTML = '<div class="alert alert-danger">找不到此商品</div>';
    return;
  }
  el.innerHTML = `
    <div class="row g-4">
      <div class="col-md-6 text-center">
        <img src="${ROOT}/${item.thumbnail}" class="img-fluid rounded shadow-sm mb-3" alt="">
        <div>${(item.gallery||[]).map(g=>`<img src="${ROOT}/${g}" class="img-thumbnail m-1" style="width:80px">`).join('')}</div>
      </div>
      <div class="col-md-6">
        <h3>${item.title}</h3>
        <p class="text-muted">${item.category||''}</p>
        <p>${item.description||''}</p>
        <p class="h5 text-primary">NT$${item.price}</p>
        <button class="btn btn-success btn-lg" onclick='Cart.add(${JSON.stringify(item)})'>加入購物車</button>
        <a href="${ROOT}/checkout.html" class="btn btn-outline-dark btn-lg ms-2">前往結帳</a>
      </div>
    </div>
  `;
}

// Checkout page
function renderCheckout(){
  Cart.render();
  const paypalEl = document.getElementById('paypal-button-container');
  if(!paypalEl) return;
  if(typeof paypal === 'undefined'){ console.warn('PayPal SDK not loaded'); return; }
  paypal.Buttons({
    createOrder: (data, actions) => {
      return actions.order.create({
        purchase_units: [{ amount: { value: Cart.total().toFixed(2) } }]
      });
    },
    onApprove: (data, actions) => {
      return actions.order.capture().then(() => {
        alert('✅ 付款成功，感謝您的購買！');
        Cart.clear();
        location.href = `${ROOT}/thankyou.html`;
      });
    },
    onError: (err) => {
      console.error(err);
      alert('付款失敗，請稍後再試');
    }
  }).render('#paypal-button-container');
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  Cart.updateBadge();
  bindSearch();
});
