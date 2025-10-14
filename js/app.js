
const ROOT = '/rzshop.github.io';
const DATA_URL = `${ROOT}/data/items.json`;
const CART_KEY = 'rzshop_cart';

const Cart = {
  get(){ try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch(e){ return []; } },
  set(c){ localStorage.setItem(CART_KEY, JSON.stringify(c||[])); Cart.updateBadge(); },
  add(item){ const cart = Cart.get(); const i = cart.findIndex(x=>x.id===item.id); if(i>-1) cart[i].qty+=1; else cart.push({...item, qty:1}); Cart.set(cart); alert(`✅ 已加入購物車：${item.title}`); },
  remove(id){ Cart.set(Cart.get().filter(x=>x.id!==id)); Cart.render(); },
  updateQty(id,val){ const c=Cart.get(); const f=c.find(x=>x.id===id); if(f){ f.qty=Math.max(1,Number(val)||1); Cart.set(c); Cart.render(); } },
  total(){ return Cart.get().reduce((s,i)=>s+i.price*i.qty,0); },
  updateBadge(){ const b=document.getElementById('cartCount'); if(b) b.textContent=Cart.get().reduce((s,i)=>s+i.qty,0); },
  render(){ const c=document.getElementById('cartItems'); const t=document.getElementById('cartTotal'); const list=Cart.get(); if(!c)return; if(!list.length){ c.innerHTML='<p class="text-center text-muted py-5">購物車是空的</p>'; if(t)t.textContent='0'; return;} c.innerHTML=list.map(i=>`<div class="d-flex justify-content-between align-items-center border-bottom py-2"><div><strong>${i.title}</strong><br>NT$${i.price}</div><div class="d-flex align-items-center gap-2"><input type="number" min="1" value="${i.qty}" class="form-control form-control-sm w-auto" onchange="Cart.updateQty('${i.id}',this.value)"><button class="btn btn-sm btn-outline-danger" onclick="Cart.remove('${i.id}')">刪除</button></div></div>`).join(''); if(t)t.textContent=Cart.total().toLocaleString(); }
};

async function getItems(){ const r=await fetch(`${DATA_URL}?v=${Date.now()}`); return await r.json(); }

async function renderProducts(id,cat){ const el=document.getElementById(id); if(!el)return; const data=await getItems(); const list=(cat&&cat!=='all')?data.filter(x=>x.category===cat):data; el.innerHTML=list.map(p=>`<div class="col-md-4"><div class="card h-100 shadow-sm"><img src="${ROOT}/${p.thumbnail}" class="card-img-top"><div class="card-body"><h5>${p.title}</h5><p class="text-muted small">${p.description}</p><div class="d-flex justify-content-between"><span class="fw-bold text-primary">NT$${p.price}</span><a href="${ROOT}/product.html?id=${p.id}" class="btn btn-sm btn-outline-dark">查看詳情</a></div></div></div></div>`).join(''); }

async function renderProduct(id){ const el=document.getElementById(id); if(!el)return; const pid=new URLSearchParams(location.search).get('id'); const data=await getItems(); const p=data.find(x=>x.id===pid); if(!p){el.innerHTML='<p>找不到商品</p>';return;} el.innerHTML=`<div class="row g-4"><div class="col-md-6 text-center"><img src="${ROOT}/${p.thumbnail}" class="img-fluid rounded shadow-sm mb-3"><div>${(p.gallery||[]).map(g=>`<img src="${ROOT}/${g}" class="img-thumbnail m-1" style="width:80px">`).join('')}</div></div><div class="col-md-6"><h3>${p.title}</h3><p>${p.description}</p><p class="h5 text-primary">NT$${p.price}</p><button class="btn btn-success btn-lg" onclick='Cart.add(${JSON.stringify(p)})'>加入購物車</button><a href="${ROOT}/checkout.html" class="btn btn-outline-dark btn-lg ms-2">前往結帳</a></div></div>`; }

function renderCheckout(){ Cart.render(); if(typeof paypal!=='undefined'){ paypal.Buttons({ createOrder:(d,a)=>a.order.create({purchase_units:[{amount:{value:Cart.total().toFixed(2)}}]}), onApprove:(d,a)=>a.order.capture().then(()=>{alert('✅ 付款成功');Cart.clear();location.href=`${ROOT}/thankyou.html`;}) }).render('#paypal-button-container'); } }

document.addEventListener('DOMContentLoaded',()=>{ Cart.updateBadge(); });
