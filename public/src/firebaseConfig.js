// src/firebaseConfig.js
// Firebase CDN을 사용하여 Firebase 모듈을 가져옵니다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAZX7_fPX0B_-EA-OGvW6KmalFOGsQ3ZQU",
    authDomain: "snapshot-4ad8f.firebaseapp.com",
    projectId: "snapshot-4ad8f",
    storageBucket: "snapshot-4ad8f.appspot.com",
    messagingSenderId: "1004891389072",
    appId: "1:1004891389072:web:35514d2ddafce071a42c15",
    measurementId: "G-1CZJZJRGG3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };