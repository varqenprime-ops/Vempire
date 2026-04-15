import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAz4coRINN6JbCyDpNEIm0C_Rdyk6mE-qw",
    authDomain: "vempire-e74c8.firebaseapp.com",
    projectId: "vempire-e74c8",
    storageBucket: "vempire-e74c8.firebasestorage.app",
    messagingSenderId: "411369926533",
    appId: "1:411369926533:web:a1b2c3d4e5f6g7h8i9j0k1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(console.error);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Login OK.");
        // Remova o loading manualmente se necessário
        const loader = document.getElementById('loading-screen');
        if(loader) loader.classList.add('hidden');
        alert("Vwheel Online! O teu calendário está a carregar.");
    } else {
        console.log("A aguardar login...");
    }
});
