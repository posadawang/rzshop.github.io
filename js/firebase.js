// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBv5PzqosNfgYXZSUzr2H04h4thsrbyGUg",
  authDomain: "rzshop-auth.firebaseapp.com",
  projectId: "rzshop-auth",
  storageBucket: "rzshop-auth.appspot.com",
  messagingSenderId: "453837592251",
  appId: "1:453837592251:web:6bee6e1eaa5a779989bb9e",
  measurementId: "G-XGP9E993P3"
};

const ROOT = window.location.pathname.startsWith('/rzshop.github.io') ? '/rzshop.github.io' : '';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

function goHome() {
  window.location.href = ROOT ? `${ROOT}/` : '/';
}

export async function registerUser(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
  alert("註冊成功，已自動登入");
  goHome();
}

export async function loginUser(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  alert("登入成功！");
  goHome();
}

export async function logout(event) {
  if (event) event.preventDefault();
  try {
    await signOut(auth);
    alert("已登出");
  } catch (error) {
    console.error('Sign out failed', error);
    alert("登出時發生錯誤，請稍後再試。");
  } finally {
    goHome();
  }
}

onAuthStateChanged(auth, user => {
  if (typeof window !== 'undefined') {
    window.__rzAuthUser = user ?? null;
    document.dispatchEvent(new CustomEvent('rzshop:auth-changed', { detail: { user: user ?? null } }));
  }

  const status = document.getElementById("userStatus");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!status || !loginBtn || !logoutBtn) return;
  if (user) {
    status.textContent = `👤 ${user.email}`;
    loginBtn.classList.add('d-none');
    logoutBtn.classList.remove('d-none');
  } else {
    status.textContent = "未登入";
    loginBtn.classList.remove('d-none');
    logoutBtn.classList.add('d-none');
  }
});
