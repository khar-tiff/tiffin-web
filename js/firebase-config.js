// ============================================================
// FIREBASE CONFIG — paste your own project's keys below.
// Get these from: Firebase Console → Project settings → General
// → "Your apps" → Web app (</>) → SDK setup and configuration
// These values are PUBLIC by design (they identify your project,
// they are not secrets) — real security comes from Firestore
// Security Rules (see firestore.rules), not from hiding this file.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDhHmOyn10MDRHX6g2P1nywH2rD8NCVDxQ",
  authDomain: "tiffinx-1a4ff.firebaseapp.com",
  projectId: "tiffinx-1a4ff",
  storageBucket: "tiffinx-1a4ff.firebasestorage.app",
  messagingSenderId: "544323087701",
  appId: "1:544323087701:web:d34d69a58d76d914bb93dc",
  measurementId: "G-TE809JPVLD"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
