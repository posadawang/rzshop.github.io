// /js/cart.js
const CART_KEY = 'rz_cart_v1';

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartBadge();
}

export function addToCart(item, qty = 1) {
  const cart = getCart();
  const idx = cart.findIndex(x => x.id === item.id);
  if (idx >= 0) cart[idx].qty += qty;
  else cart.push({ ...item, qty });
  saveCart(cart);
}

export function removeFromCart(id) {
  const cart = getCart().filter(x => x.id !== id);
  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}

export function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function renderCartBadge() {
  const el = document.querySelector('[data-cart-badge]');
  if (!el) return;
  const count = getCart().reduce((n, i)=>n+i.qty, 0);
  el.textContent = count;
}

document.addEventListener('DOMContentLoaded', renderCartBadge);

