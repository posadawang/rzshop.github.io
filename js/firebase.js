import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBv5PzqosNfgYXZSUzr2H04h4thsrbyGUg",
  authDomain: "rzshop-auth.firebaseapp.com",
  projectId: "rzshop-auth",
  storageBucket: "rzshop-auth.firebasestorage.app",
  messagingSenderId: "453837592251",
  appId: "1:453837592251:web:6bee6e1eaa5a779989bb9e",
  measurementId: "G-XGP9E993P3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const status = document.getElementById("userStatus");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (status && loginBtn && logoutBtn) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      status.textContent = `歡迎 ${user.email}`;
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
    } else {
      status.textContent = "未登入";
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
    }
  });
}

export function logout() {
  signOut(auth);
}

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };
