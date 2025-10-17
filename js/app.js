// === GitHub Pages 自動路徑偵測 ===
const BASE_PATH = window.location.pathname.includes('/rzshop.github.io')
  ? '/rzshop.github.io'
  : '';

const DATA_URL = `${BASE_PATH}/data/items.json`;
const CART_KEY = 'rzshop_cart_v3';

// === 購物車邏輯 ===
const Cart = {
  get() { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); },
  set(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); Cart.updateBadge(); },
  add(item) {
    const cart = Cart.get();
    const exist = cart.find(x => x.id === item.id);
    if (exist) exist.qty++;
    else cart.push({...item, qty:1});
    Cart.set(cart);
    alert(`✅ 已加入購物車：${item.title}`);
  },
  updateQty(id, qty) {
    const cart = Cart.get();
    const item = cart.find(x => x.id === id);
    if (item) item.qty = Number(qty);
    Cart.set(cart); Cart.render();
  },
  remove(id) {
    Cart.set(Cart.get().filter(x => x.id !== id));
    Cart.render();
  },
  clear() { Cart.set([]); Cart.render(); },
  total() { return Cart.get().reduce((a,b)=>a+b.price*b.qty,0); },
  updateBadge() {
    const count = Cart.get().reduce((a,b)=>a+b.qty,0);
    const badge = document.getElementById('cartCount');
    if(badge) badge.textContent = count;
    document.querySelectorAll('[data-cart-badge]').forEach(el => {
      el.textContent = count;
    });
  },
  render() {
    const c=document.getElementById('cartItems'),t=document.getElementById('cartTotal');
    if(!c)return;
    const cart=Cart.get();
    if(!cart.length){
      c.innerHTML='<p class="text-center text-muted py-5">購物車是空的</p>';
      if(t)t.textContent='0';
      return;
    }
    c.innerHTML=cart.map(x=>`
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <div>
          <strong>${x.title}</strong><br>NT$${x.price}
        </div>
        <div class="d-flex align-items-center gap-2">
          <input type="number" min="1" value="${x.qty}" class="form-control form-control-sm w-auto" onchange="Cart.updateQty('${x.id}',this.value)">
          <button class="btn btn-sm btn-outline-danger" onclick="Cart.remove('${x.id}')">刪除</button>
        </div>
      </div>`).join('');
    if(t)t.textContent=Cart.total().toLocaleString();
  }
};

// === 商品讀取 ===
async function getItems() {
  try {
    const res = await fetch(DATA_URL+`?v=${Date.now()}`);
    return await res.json();
  } catch(e){
    console.error("❌ 無法載入商品資料",e);
    return [];
  }
}

// === 首頁商品展示 ===
async function renderAll() {
  const box=document.getElementById('cards');
  if(!box)return;
  const data=await getItems();
  box.innerHTML=data.map(p=>`
    <div class="col-md-4">
      <div class="card h-100 shadow-sm">
        <img src="${BASE_PATH}/${p.thumbnail}" class="card-img-top" alt="">
        <div class="card-body">
          <h5>${p.title}</h5>
          <p class="small text-muted">${p.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary">NT$${p.price}</span>
            <a href="${BASE_PATH}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a>
          </div>
        </div>
      </div>
    </div>`).join('');
}

// === 單一分類頁 ===
async function renderCategory(cat, el) {
  const box=document.getElementById(el);
  if(!box)return;
  const data=await getItems();
  const list=cat==='all'?data:data.filter(x=>x.category===cat);
  box.innerHTML=list.map(p=>`
    <div class="col-md-4">
      <div class="card h-100 shadow-sm">
        <img src="${BASE_PATH}/${p.thumbnail}" class="card-img-top" alt="">
        <div class="card-body">
          <h5>${p.title}</h5>
          <p class="small text-muted">${p.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary">NT$${p.price}</span>
            <a href="${BASE_PATH}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a>
          </div>
        </div>
      </div>
    </div>`).join('');
}

// === 搜尋系統 ===
async function searchProducts(keyword) {
  const box=document.getElementById('cards');
  if(!box)return;
  const data=await getItems();
  const list=data.filter(p=>
    p.title.includes(keyword)||p.description.includes(keyword)||p.id.includes(keyword)
  );
  if(!list.length){ box.innerHTML='<p class="text-center text-muted py-5">找不到相關商品</p>'; return; }
  box.innerHTML=list.map(p=>`
    <div class="col-md-4">
      <div class="card h-100 shadow-sm">
        <img src="${BASE_PATH}/${p.thumbnail}" class="card-img-top" alt="">
        <div class="card-body">
          <h5>${p.title}</h5>
          <p class="small text-muted">${p.description}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold text-primary">NT$${p.price}</span>
            <a href="${BASE_PATH}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a>
          </div>
        </div>
      </div>
    </div>`).join('');
}
document.addEventListener('DOMContentLoaded',()=>{
  const search=document.getElementById('searchInput');
  if(search)search.addEventListener('input',()=>searchProducts(search.value.trim()));
});

// === 商品詳情頁 ===
async function renderProduct(el) {
  const box=document.getElementById(el);
  if(!box)return;
  const id=new URLSearchParams(location.search).get('id');
  const data=await getItems();
  const item=data.find(x=>x.id===id);
  if(!item){ box.innerHTML='<p class="text-center text-danger">找不到商品</p>'; return; }
  box.innerHTML=`
    <div class="row g-4">
      <div class="col-md-6 text-center">
        <img src="${BASE_PATH}/${item.thumbnail}" class="img-fluid rounded shadow-sm mb-3">
      </div>
      <div class="col-md-6">
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <p class="h5 text-primary mb-3">NT$${item.price}</p>
        <button class="btn btn-success btn-lg" onclick='Cart.add(${JSON.stringify(item)})'>加入購物車</button>
        <a href="${BASE_PATH}/checkout.html" class="btn btn-outline-dark btn-lg ms-2">前往結帳</a>
      </div>
    </div>`;
}

// === 結帳頁 ===
function renderCheckout(){
  Cart.render();
  const paypalEl=document.getElementById('paypal-button-container');
  if(!paypalEl)return;
  paypal.Buttons({
    createOrder:(data,actions)=>{
      return actions.order.create({
        purchase_units:[{ amount:{ value: Cart.total().toFixed(2) } }]
      });
    },
    onApprove:(data,actions)=>{
      return actions.order.capture().then(()=>{
        alert('✅ 付款成功，感謝您的購買！');
        Cart.clear();
        location.href=`${BASE_PATH}/thankyou.html`;
      });
    },
    onError:(err)=>{console.error(err);alert('付款失敗，請稍後再試');}
  }).render('#paypal-button-container');
}

// === 初始化 ===
document.addEventListener('DOMContentLoaded',()=>Cart.updateBadge());


/* === NewebPay (藍新金流) integration === */
const NEWEBPAY_ENDPOINT = "https://us-central1-rzshop-auth.cloudfunctions.net/api/createOrder";

async function createNewebPayOrder(payload){
  // POST form-encoded because our function accepts urlencoded/json
  const res = await fetch(NEWEBPAY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if(!res.ok){
    throw new Error(text || ("HTTP "+res.status));
  }
  // The function returns an HTML form (mpg_gateway auto-submit)
  const win = window.open("", "_self");
  win.document.open();
  win.document.write(text);
  win.document.close();
}

function bindNewebPayButton(){
  const btn = document.getElementById("newebpay-button");
  if(!btn) return;
  btn.addEventListener("click", async () => {
    try{
      const items = Cart.get();
      const total = Cart.total();
      if(!items.length || total <= 0){
        alert("購物車是空的，請先加入商品");
        return;
      }
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const email = user.email || "";
      if(!email){
        alert("請先登入後再結帳（需要 email）");
        return;
      }
      const itemDesc = items.map(i => `${i.title||i.id}x${i.qty}`).join(", ").slice(0, 50) || "阿智小舖商品";
      await createNewebPayOrder({ amount: Math.round(total), email, itemDesc });
    }catch(err){
      console.error(err);
      alert("付款建立失敗，請稍後再試！");
    }
  });
}

document.addEventListener("DOMContentLoaded", bindNewebPayButton);
