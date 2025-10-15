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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function registerUser(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
  alert("註冊成功，已自動登入");
  window.location.href = "/rzshop.github.io/";
}

export async function loginUser(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  alert("登入成功！");
  window.location.href = "/rzshop.github.io/";
}

export function logoutUser(){
  signOut(auth).then(()=>{
    alert("已登出");
    window.location.href = "/rzshop.github.io/";
  });
}

onAuthStateChanged(auth, (user)=>{
  const status = document.getElementById("userStatus");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if(!status || !loginBtn || !logoutBtn) return;
  if(user){
    status.textContent = `👤 ${user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  }else{
    status.textContent = "未登入";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});
