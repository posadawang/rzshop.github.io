/* ===== /js/cart.js ===== */
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
