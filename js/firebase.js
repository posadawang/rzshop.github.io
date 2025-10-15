// js/firebase.js
// ✅ Firebase 初始化與登入狀態監聽

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// ✅ 你的 Firebase 專案設定
const firebaseConfig = {
  apiKey: "AIzaSyBv5PzqosNfgYXZSUzr2H04h4thsrbyGUg",
  authDomain: "rzshop-auth.firebaseapp.com",
  projectId: "rzshop-auth",
  storageBucket: "rzshop-auth.appspot.com", // ← 修正這裡
  messagingSenderId: "453837592251",
  appId: "1:453837592251:web:6bee6e1eaa5a779989bb9e",
  measurementId: "G-XGP9E993P3"
};

// ✅ 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ✅ 註冊帳號
export async function registerUser(email, password) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("註冊成功！");
    window.location.href = "../index.html"; // 註冊成功後跳回首頁
  } catch (error) {
    console.error(error);
    alert("註冊失敗：" + error.message);
  }
}

// ✅ 登入帳號
export async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("登入成功！");
    window.location.href = "../index.html"; // 登入後跳回首頁
  } catch (error) {
    console.error(error);
    alert("登入失敗：" + error.message);
  }
}

// ✅ 登出
export function logoutUser() {
  signOut(auth).then(() => {
    alert("已登出！");
    window.location.href = "../auth.html";
  });
}

// ✅ 自動監聽登入狀態（讓導覽列能顯示會員名稱）
onAuthStateChanged(auth, (user) => {
  const status = document.getElementById("userStatus");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!status || !loginBtn || !logoutBtn) return;

  if (user) {
    status.textContent = `👤 ${user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    status.textContent = "未登入";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});
