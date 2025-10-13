const state={items:[],filtered:[],page:1,perPage:12,filterGame:'all',query:'',sort:'default'};
const elCards=document.getElementById('cards'),elSearch=document.getElementById('searchInput'),elClear=document.getElementById('clearBtn'),
elResultMeta=document.getElementById('resultMeta'),elLoadMore=document.getElementById('loadMoreBtn'),elSort=document.getElementById('sortSelect');
document.getElementById('year').textContent=new Date().getFullYear();
async function load(){const r=await fetch('data/items.json');const j=await r.json();state.items=j.items;applyFilters();}
function applyFilters(){const q=state.query.toLowerCase();state.filtered=state.items.filter(it=>{const match=state.filterGame==='all'||it.game===state.filterGame;const text=[it.id,it.game,it.title,it.desc,...(it.tags||[])].join(' ').toLowerCase();return match&&(!q||text.includes(q));});
switch(state.sort){case'priceAsc':state.filtered.sort((a,b)=>(a.price??999)-(b.price??999));break;case'priceDesc':state.filtered.sort((a,b)=>(b.price??-1)-(a.price??-1));break;case'titleAsc':state.filtered.sort((a,b)=>(a.title||'').localeCompare(b.title||'', 'zh-Hant'));break;}
state.page=1;render();}
function render(){elCards.innerHTML='';const end=state.page*state.perPage;state.filtered.slice(0,end).forEach(renderCard);
elResultMeta.textContent=`共 ${state.filtered.length} 筆，顯示 ${Math.min(end,state.filtered.length)} 筆`;elLoadMore.style.display=state.filtered.length>end?'inline-block':'none';}
function renderCard(it){const col=document.createElement('div');col.className='col-12 col-sm-6 col-lg-4 col-xl-3';const img=it.images?.[0]||'assets/images/placeholder.jpg';
col.innerHTML=`<div class='card h-100 shadow-sm'><img src='${img}' class='card-img-top'><div class='card-body d-flex flex-column'><div class='small text-secondary mb-1'>${it.game}</div><h3 class='h6 card-title mb-1'>${it.id}｜${it.title}</h3><p class='card-text small flex-grow-1'>${it.desc}</p><div class='d-flex justify-content-between align-items-center mt-2'><div class='fw-semibold'>NT$ ${it.price}</div><div>${(it.tags||[]).map(t=>`<span class='badge rounded-pill text-dark badge-tag me-1'>${t}</span>`).join(' ')}</div></div></div></div>`;elCards.appendChild(col);}
document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',e=>{document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));e.target.classList.add('active');state.filterGame=e.target.dataset.filter;applyFilters();}));
elSearch.addEventListener('input',e=>{state.query=e.target.value.trim();applyFilters();});elClear.addEventListener('click',()=>{elSearch.value='';state.query='';applyFilters();});
elSort.addEventListener('change',e=>{state.sort=e.target.value;applyFilters();});elLoadMore.addEventListener('click',()=>{state.page++;render();});load();
