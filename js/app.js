// ============================================================
// TiffinX — real backend wiring (Firebase Auth + Firestore)
// This file REPLACES the demo-only submitRegister() from main.js
// with one that actually creates an account and saves data.
// ============================================================
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---------- OPTIONAL: instant email notification on new registration ----------
// Free, no backend needed. Sign up at https://www.emailjs.com (free tier),
// create an email service + template, then fill these 3 values in.
// Leave PUBLIC_KEY as-is to skip this — everything else still works.
const EMAILJS_PUBLIC_KEY = "";
const EMAILJS_SERVICE_ID = "";
const EMAILJS_TEMPLATE_ID = "";

function notifyAdminByEmail(data) {
  if (!EMAILJS_PUBLIC_KEY || !window.emailjs) return; // skipped if not configured
  window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    customer_name: data.name,
    customer_phone: data.phone,
    customer_area: data.area,
    plan: data.plan
  }, EMAILJS_PUBLIC_KEY).catch(err => console.error("EmailJS notify failed:", err));
}

// ---------- Registration (creates login + saves form to Firestore) ----------
window.submitRegister = async function (e) {
  e.preventDefault();
  const btn = document.getElementById('regSubmitBtn');
  const errorBox = document.getElementById('errorBox');
  errorBox.style.display = 'none';

  const data = {
    name: document.getElementById('regName').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    address: document.getElementById('regAddress').value.trim(),
    area: document.getElementById('regArea').value,
    email: document.getElementById('regEmail').value.trim(),
    vegType: document.querySelector('input[name="vegtype"]:checked')?.parentElement.classList.contains('veg-pill') ? 'veg' : 'nonveg',
    meals: {
      breakfast: document.getElementById('mealBreakfast').checked,
      lunch: document.getElementById('mealLunch').checked,
      dinner: document.getElementById('mealDinner').checked
    },
    plan: document.getElementById('regPlan').value,
    deliveryTime: document.getElementById('regTime').value,
    notes: document.getElementById('regNotes').value.trim(),
    status: 'pending',       // admin can move this to confirmed / active / paused
    deliveryStage: 0,
    createdAt: serverTimestamp()
  };
  const password = document.getElementById('regPassword').value;

  btn.disabled = true;
  btn.textContent = 'Submitting...';
  try {
    const cred = await createUserWithEmailAndPassword(auth, data.email, password);
    await setDoc(doc(db, "registrations", cred.user.uid), data);
    notifyAdminByEmail(data);

    document.getElementById('successBox').style.display = 'flex';
    toast('Registration received — welcome to TiffinX!');
    setTimeout(() => { showPortal('dashboard'); }, 1400);
  } catch (err) {
    errorBox.textContent = friendlyAuthError(err);
    errorBox.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Register with TiffinX ✎';
  }
  return false;
};

// ---------- Login / Logout ----------
window.doLogin = async function () {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginErrorBox');
  errBox.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    errBox.textContent = friendlyAuthError(err);
    errBox.style.display = 'flex';
  }
};

window.doLogout = function () {
  signOut(auth);
};

function friendlyAuthError(err) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered — try logging in instead.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'No account found with that email — register first.',
    'auth/wrong-password': 'Incorrect password.'
  };
  return map[err.code] || 'Something went wrong. Please try again.';
}

// ---------- Live dashboard: reflects real Firestore data for the logged-in customer ----------
let unsubscribeDoc = null;

onAuthStateChanged(auth, (user) => {
  const loginBox = document.getElementById('loginBox');
  const dashContent = document.getElementById('dashContent');
  if (unsubscribeDoc) { unsubscribeDoc(); unsubscribeDoc = null; }

  if (user) {
    loginBox.style.display = 'none';
    dashContent.style.display = 'block';
    unsubscribeDoc = onSnapshot(doc(db, "registrations", user.uid), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      document.getElementById('welcomeNote').textContent =
        `Welcome back, ${d.name || 'there'}! Plan: ${d.plan || '-'} · Status: ${d.status || 'pending'}`;
      // Advance the visual timeline to match the real delivery stage saved by admin/driver.
      if (typeof window.setDeliveryStage === 'function' && typeof d.deliveryStage === 'number') {
        window.setDeliveryStage(d.deliveryStage);
      }
    });
  } else {
    loginBox.style.display = 'block';
    dashContent.style.display = 'none';
  }
});
