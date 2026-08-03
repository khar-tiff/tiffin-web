// ============================================================
// TiffinX — real backend wiring (Firebase Auth + Firestore)
// Handles: registration/login, live dashboard, status timeline,
// customer-added extra info, live support chat, newsletter signup.
// ============================================================
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, setDoc, updateDoc, onSnapshot, serverTimestamp,
  collection, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---------- OPTIONAL: instant email notification on new registration ----------
// Free, no backend needed. Sign up at https://www.emailjs.com (free tier),
// create an email service + template, then fill these 3 values in.
// Leave PUBLIC_KEY as-is to skip this — everything else still works.
const EMAILJS_PUBLIC_KEY = "";
const EMAILJS_SERVICE_ID = "";
const EMAILJS_TEMPLATE_ID = "";

function notifyAdminByEmail(kind, data) {
  if (!EMAILJS_PUBLIC_KEY || !window.emailjs) return; // skipped if not configured
  window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    kind, ...data
  }, EMAILJS_PUBLIC_KEY).catch(err => console.error("EmailJS notify failed:", err));
}

// ---------- Plan pre-select: clicking "Choose Plan" opens the form, plan already picked ----------
window.selectPlan = function (planName) {
  showPortal('register');
  const sel = document.getElementById('regPlan');
  if (sel) sel.value = planName;
  document.getElementById('regName')?.focus();
};

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
    extraInfo: '',
    status: 'pending',       // admin moves this to confirmed / active / paused
    deliveryStage: 0,
    createdAt: serverTimestamp()
  };
  const password = document.getElementById('regPassword').value;

  btn.disabled = true;
  btn.textContent = 'Submitting...';
  try {
    const cred = await createUserWithEmailAndPassword(auth, data.email, password);
    await setDoc(doc(db, "registrations", cred.user.uid), data);
    notifyAdminByEmail('registration', data);

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

// ---------- Status badge + details recap ----------
const STATUS_LABEL = { pending: '⏳ Pending Approval', confirmed: '👍 Confirmed', active: '🍲 Active', paused: '⏸ Paused' };
const STATUS_STAGE = { pending: 0, confirmed: 1, active: 2, paused: 1 };

function renderStatusBadge(status) {
  const wrap = document.getElementById('statusBadgeWrap');
  if (!wrap) return;
  const label = STATUS_LABEL[status] || status;
  const colors = { pending: '#8a6d00', confirmed: '#1e7e34', active: '#1e7e34', paused: '#b3261e' };
  const bg = { pending: '#fff3cd', confirmed: '#d4edda', active: '#d4edda', paused: '#fdecea' };
  wrap.innerHTML = `<span style="display:inline-block; padding:5px 12px; border-radius:14px; font-size:13px; font-weight:600; background:${bg[status]||'#eee'}; color:${colors[status]||'#333'};">${label}</span>`;
}

function renderDetailsRecap(d) {
  const el = document.getElementById('detailsRecap');
  if (!el) return;
  const meals = [d.meals?.breakfast && 'Breakfast', d.meals?.lunch && 'Lunch', d.meals?.dinner && 'Dinner'].filter(Boolean).join(', ');
  el.innerHTML = `
    <b>Name:</b> ${d.name || '-'}<br>
    <b>Phone:</b> ${d.phone || '-'}<br>
    <b>Address:</b> ${d.address || '-'}<br>
    <b>Area:</b> ${d.area || '-'}<br>
    <b>Plan:</b> ${d.plan || '-'}<br>
    <b>Meals:</b> ${meals || '-'}<br>
    <b>Veg/Non-veg:</b> ${d.vegType || '-'}<br>
    <b>Delivery time:</b> ${d.deliveryTime || '-'}<br>
    <b>Notes:</b> ${d.notes || '-'}
    ${d.extraInfo ? `<br><b>Additional info sent:</b> ${d.extraInfo}` : ''}
  `;
}

window.submitExtraInfo = async function () {
  const user = auth.currentUser;
  if (!user) return;
  const text = document.getElementById('extraInfoInput').value.trim();
  const note = document.getElementById('extraInfoNote');
  if (!text) return;
  try {
    await updateDoc(doc(db, "registrations", user.uid), { extraInfo: text, extraInfoUpdatedAt: serverTimestamp() });
    document.getElementById('extraInfoInput').value = '';
    note.textContent = '✓ Sent — our team can see this now.';
    setTimeout(() => { note.textContent = ''; }, 4000);
  } catch (err) {
    note.style.color = '#b3261e';
    note.textContent = 'Could not send — please try again.';
  }
};

// ---------- Live support chat (customer <-> admin) ----------
let unsubscribeChat = null;

function listenToChat(uid) {
  if (unsubscribeChat) unsubscribeChat();
  const q = query(collection(db, "registrations", uid, "messages"), orderBy("createdAt", "asc"));
  unsubscribeChat = onSnapshot(q, (snap) => {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    box.innerHTML = '';
    snap.forEach(docSnap => {
      const m = docSnap.data();
      const mine = m.from === 'customer';
      const row = document.createElement('div');
      row.style.cssText = `margin:6px 0; display:flex; justify-content:${mine ? 'flex-end' : 'flex-start'};`;
      row.innerHTML = `<span style="max-width:75%; padding:8px 12px; border-radius:12px; font-size:13.5px; background:${mine ? 'var(--leaf, #5FA83D)' : '#eee'}; color:${mine ? '#fff' : '#222'};">${escapeHtml(m.text)}</span>`;
      box.appendChild(row);
    });
    box.scrollTop = box.scrollHeight;
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

window.sendChatMessage = async function () {
  const user = auth.currentUser;
  if (!user) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await addDoc(collection(db, "registrations", user.uid, "messages"), {
    from: 'customer', text, createdAt: serverTimestamp()
  });
};

// ---------- Newsletter / WhatsApp subscription (works for anyone, no login needed) ----------
window.subscribeNewsletter = async function (e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('input[type="email"]')?.value.trim();
  const phone = form.querySelector('input[type="tel"]')?.value.trim();
  const wantsWhatsapp = document.getElementById('nlWhatsappOptIn')?.checked ?? true;
  if (!email && !phone) return false;
  try {
    await addDoc(collection(db, "subscribers"), {
      email: email || '', phone: phone || '', wantsWhatsapp, createdAt: serverTimestamp()
    });
    toast('Subscribed — thanks for staying connected with TiffinX!');
    form.reset();
  } catch (err) {
    toast('Could not subscribe right now — please try again.');
  }
  return false;
};

// ---------- Live dashboard: reflects real Firestore data for the logged-in customer ----------
let unsubscribeDoc = null;

onAuthStateChanged(auth, (user) => {
  const loginBox = document.getElementById('loginBox');
  const dashContent = document.getElementById('dashContent');
  if (unsubscribeDoc) { unsubscribeDoc(); unsubscribeDoc = null; }
  if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }

  if (user) {
    loginBox.style.display = 'none';
    dashContent.style.display = 'block';
    listenToChat(user.uid);
    unsubscribeDoc = onSnapshot(doc(db, "registrations", user.uid), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      document.getElementById('welcomeNote').textContent = `Welcome back, ${d.name || 'there'}!`;
      renderStatusBadge(d.status || 'pending');
      renderDetailsRecap(d);
      const stage = typeof d.deliveryStage === 'number' ? d.deliveryStage : (STATUS_STAGE[d.status] ?? 0);
      if (typeof window.setDeliveryStage === 'function') window.setDeliveryStage(stage);
    });
  } else {
    loginBox.style.display = 'block';
    dashContent.style.display = 'none';
  }
});
