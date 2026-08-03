// ============================================================
// TiffinX — real backend wiring (Firebase Auth + Firestore)
// Flow: customer submits an APPLICATION (no login yet) -> admin
// reviews it in the staff portal -> admin approves & creates the
// customer's login -> customer can then log in to their dashboard.
// ============================================================
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, updateDoc, onSnapshot, serverTimestamp,
  collection, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---------- OPTIONAL: instant email notification on new application ----------
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

// ---------- OPTIONAL: profile photo hosting via Cloudinary (free, unsigned upload) ----------
// Sign up at https://cloudinary.com (free tier), create an UNSIGNED upload
// preset (Settings -> Upload -> Add upload preset -> Signing mode: Unsigned),
// then fill these two in. Leave blank to hide the profile-photo uploader.
const CLOUDINARY_CLOUD_NAME = "";
const CLOUDINARY_UPLOAD_PRESET = "";

// ---------- Plan pre-select: clicking "Choose Plan" opens the form, plan already picked ----------
window.selectPlan = function (planName) {
  showPortal('register');
  const sel = document.getElementById('regPlan');
  if (sel) sel.value = planName;
  const banner = document.getElementById('planBanner');
  if (banner) {
    banner.textContent = `✓ Selected plan: ${planName} — fill in your details below to apply.`;
    banner.style.display = 'block';
  }
  document.getElementById('regName')?.focus();
};

// ---------- Address autocomplete (free, via OpenStreetMap Nominatim) ----------
let addressDebounce = null;
window.onAddressInput = function (value) {
  clearTimeout(addressDebounce);
  const box = document.getElementById('addressSuggestions');
  if (!value || value.trim().length < 4) { box.style.display = 'none'; box.innerHTML = ''; return; }
  addressDebounce = setTimeout(async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&countrycodes=in&q=${encodeURIComponent(value)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const results = await res.json();
      if (!results.length) { box.style.display = 'none'; return; }
      box.innerHTML = results.map(r =>
        `<div class="addr-suggestion" style="padding:9px 12px; font-size:13px; cursor:pointer; border-bottom:1px solid #f0f0f0;" data-addr="${escapeAttr(r.display_name)}">${escapeHtml(r.display_name)}</div>`
      ).join('');
      box.style.display = 'block';
      box.querySelectorAll('.addr-suggestion').forEach(el => {
        el.addEventListener('mouseenter', () => el.style.background = '#f7f4ea');
        el.addEventListener('mouseleave', () => el.style.background = '#fff');
        el.addEventListener('click', () => {
          document.getElementById('regAddress').value = el.getAttribute('data-addr');
          box.style.display = 'none';
        });
      });
    } catch (err) {
      console.error('Address lookup failed:', err);
      box.style.display = 'none';
    }
  }, 450); // wait for typing to pause — keeps us within Nominatim's free-use rate limit
};
document.addEventListener('click', (e) => {
  const box = document.getElementById('addressSuggestions');
  if (box && !e.target.closest('#addressSuggestions') && e.target.id !== 'regAddress') box.style.display = 'none';
});

function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function escapeAttr(s) { return (s || '').replace(/"/g, '&quot;'); }

// small helper: reject a promise if it takes too long, so the submit button
// never gets stuck forever on "Submitting..." if Firebase can't be reached
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out — check your internet connection and your Firebase setup in js/firebase-config.js`)), ms))
  ]);
}

// ---------- Registration = submit an APPLICATION (no account yet) ----------
window.submitRegister = async function (e) {
  e.preventDefault();
  const btn = document.getElementById('regSubmitBtn');
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  const data = {
    name: document.getElementById('regName').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    address: document.getElementById('regAddress').value.trim(),
    area: document.getElementById('regArea').value,
    email: document.getElementById('regEmail').value.trim(),
    vegType: document.querySelector('input[name="vegtype"]:checked')?.value || 'veg',
    meals: {
      breakfast: document.getElementById('mealBreakfast').checked,
      lunch: document.getElementById('mealLunch').checked,
      dinner: document.getElementById('mealDinner').checked
    },
    plan: document.getElementById('regPlan').value,
    deliveryTime: document.getElementById('regTime').value,
    notes: document.getElementById('regNotes').value.trim(),
    applicationStatus: 'new',   // admin marks this reviewed / approved
    createdAt: serverTimestamp()
  };

  btn.disabled = true;
  const originalBtnText = btn.textContent;
  btn.textContent = 'Submitting...';
  try {
    await withTimeout(addDoc(collection(db, "applications"), data), 15000, 'Submitting your application');
    successBox.textContent = '✓ Application received! Our team will review it and email you a login within a few hours — meanwhile you can track nothing yet, but feel free to reach out on WhatsApp with any questions.';
    successBox.style.display = 'flex';
    notifyAdminByEmail('application', data);
    toast('Application submitted — we\'ll be in touch soon!');
    document.getElementById('registerForm').reset();
    const banner = document.getElementById('planBanner');
    if (banner) banner.style.display = 'none';
  } catch (err) {
    console.error('Registration submit failed:', err);
    errorBox.textContent = (err && err.message) ? err.message : 'Something went wrong submitting your application. Please try again or contact us on WhatsApp.';
    errorBox.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.textContent = originalBtnText;
  }
  return false;
};

// ---------- Login / Logout (only works after the admin has approved + created the account) ----------
window.doLogin = async function () {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginErrorBox');
  errBox.style.display = 'none';
  try {
    await withTimeout(signInWithEmailAndPassword(auth, email, password), 15000, 'Logging in');
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
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/invalid-credential': 'Incorrect email or password, or your account is not approved yet.',
    'auth/user-not-found': 'No account found — your application may still be under review.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts — please wait a bit and try again.'
  };
  return map[err.code] || (err.message || 'Something went wrong. Please try again.');
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
  const vegLabel = { veg: 'Veg', nonveg: 'Non-Veg', both: 'Veg & Non-Veg' }[d.vegType] || d.vegType || '-';
  el.innerHTML = `
    <b>Name:</b> ${escapeHtml(d.name)}<br>
    <b>Phone:</b> ${escapeHtml(d.phone)}<br>
    <b>Address:</b> ${escapeHtml(d.address)}<br>
    <b>Area:</b> ${escapeHtml(d.area)}<br>
    <b>Plan:</b> ${escapeHtml(d.plan)}<br>
    <b>Meals:</b> ${meals || '-'}<br>
    <b>Veg/Non-veg:</b> ${vegLabel}<br>
    <b>Delivery time:</b> ${escapeHtml(d.deliveryTime)}<br>
    <b>Notes:</b> ${escapeHtml(d.notes) || '-'}
    ${d.extraInfo ? `<br><b>Additional info sent:</b> ${escapeHtml(d.extraInfo)}` : ''}
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
    note.style.color = 'var(--leaf-dark)';
    note.textContent = '✓ Sent — our team can see this now.';
    setTimeout(() => { note.textContent = ''; }, 4000);
  } catch (err) {
    note.style.color = '#b3261e';
    note.textContent = 'Could not send — please try again.';
  }
};

// ---------- Pause / Resume subscription request ----------
function renderPauseResume(status) {
  const wrap = document.getElementById('pauseResumeWrap');
  if (!wrap) return;
  if (status === 'paused') {
    wrap.innerHTML = `<button class="btn small" onclick="requestResume()">▶ Request to Resume</button>`;
  } else if (status === 'active' || status === 'confirmed') {
    wrap.innerHTML = `<button class="btn small outline" onclick="requestPause()">⏸ Request to Pause</button>`;
  } else {
    wrap.innerHTML = '';
  }
}
window.requestPause = async function () {
  const user = auth.currentUser;
  if (!user) return;
  await updateDoc(doc(db, "registrations", user.uid), { extraInfo: 'Customer requested a PAUSE on their subscription.', extraInfoUpdatedAt: serverTimestamp() });
  toast('Pause request sent to our team.');
};
window.requestResume = async function () {
  const user = auth.currentUser;
  if (!user) return;
  await updateDoc(doc(db, "registrations", user.uid), { extraInfo: 'Customer requested to RESUME their subscription.', extraInfoUpdatedAt: serverTimestamp() });
  toast('Resume request sent to our team.');
};

// ---------- Simple real calendar (current month, marks today) ----------
function renderCalendar() {
  const grid = document.getElementById('calGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const today = now.getDate();
  ['S','M','T','W','T','F','S'].forEach(d => {
    const el = document.createElement('div'); el.className = 'd';
    el.style.cssText = 'background:transparent;border:none;color:var(--pencil);';
    el.textContent = d; grid.appendChild(el);
  });
  for (let i = 0; i < firstDow; i++) { const el = document.createElement('div'); el.className = 'd'; el.style.visibility = 'hidden'; grid.appendChild(el); }
  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    el.className = 'd' + (d === today ? ' today' : d < today ? ' done' : ' pending');
    el.textContent = d;
    grid.appendChild(el);
  }
}

// ---------- Profile photo upload (via Cloudinary unsigned upload, optional) ----------
function initProfilePicUpload() {
  const input = document.getElementById('profilePicInput');
  const note = document.getElementById('profilePicNote');
  if (!input) return;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    note.textContent = 'Photo upload not set up yet — see SETUP.md.';
    input.disabled = true;
    return;
  }
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const user = auth.currentUser;
    if (!user) return;
    note.textContent = 'Uploading...';
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.secure_url) throw new Error('Upload failed');
      await updateDoc(doc(db, "registrations", user.uid), { profilePicUrl: json.secure_url });
      note.textContent = '✓ Photo updated.';
    } catch (err) {
      console.error(err);
      note.textContent = 'Upload failed — please try again.';
    }
  });
}

function renderProfilePic(url) {
  const img = document.getElementById('profilePicPreview');
  const placeholder = document.getElementById('profilePicPlaceholder');
  if (!img) return;
  if (url) { img.src = url; img.style.display = 'block'; placeholder.style.display = 'none'; }
  else { img.style.display = 'none'; placeholder.style.display = 'flex'; }
}

// ---------- Extra dish ordering (with UPI payment note — no gateway needed) ----------
const UPI_ID = "yourupi@bank"; // <-- replace with your real UPI ID
const EXTRA_DISHES = [
  { name: 'Sarson da Saag + Makki Roti', price: 90 },
  { name: 'Paneer Butter Masala', price: 80 },
  { name: 'Amritsari Kulcha (2 pc)', price: 60 },
  { name: 'Chole Bhature', price: 70 },
  { name: 'Lassi (glass)', price: 40 }
];

function renderExtraDishList() {
  const wrap = document.getElementById('extraDishList');
  if (!wrap) return;
  wrap.innerHTML = EXTRA_DISHES.map((d, i) => `
    <div class="quick-dish">
      <span>${d.name} — ₹${d.price}</span>
      <button onclick="orderExtraDish(${i})">Order</button>
    </div>
  `).join('');
}

window.orderExtraDish = async function (i) {
  const user = auth.currentUser;
  if (!user) return;
  const dish = EXTRA_DISHES[i];
  await addDoc(collection(db, "registrations", user.uid, "extraOrders"), {
    dish: dish.name, price: dish.price, status: 'awaiting_payment', createdAt: serverTimestamp()
  });
  toast(`Added ${dish.name}. Pay ₹${dish.price} via UPI to ${UPI_ID} — mention your name, then let us know on chat.`);
};

let unsubOrders = null;
function listenToMyOrders(uid) {
  if (unsubOrders) unsubOrders();
  const q = query(collection(db, "registrations", uid, "extraOrders"), orderBy("createdAt", "desc"));
  unsubOrders = onSnapshot(q, (snap) => {
    const el = document.getElementById('myOrdersList');
    if (!el) return;
    if (snap.empty) { el.textContent = 'No extra dishes ordered yet today.'; return; }
    el.innerHTML = '';
    snap.forEach(d => {
      const o = d.data();
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f0f0f0;';
      row.innerHTML = `<span>${escapeHtml(o.dish)}</span><span>₹${o.price} · ${o.status === 'paid' ? '✓ Paid' : 'Awaiting payment'}</span>`;
      el.appendChild(row);
    });
  });
}

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
    await withTimeout(addDoc(collection(db, "subscribers"), {
      email: email || '', phone: phone || '', wantsWhatsapp, createdAt: serverTimestamp()
    }), 15000, 'Subscribing');
    toast('Subscribed — thanks for staying connected with TiffinX!');
    form.reset();
  } catch (err) {
    console.error(err);
    toast('Could not subscribe right now — please try again.');
  }
  return false;
};

// ---------- Live dashboard: reflects real Firestore data for the logged-in, approved customer ----------
let unsubscribeDoc = null;

onAuthStateChanged(auth, (user) => {
  const loginBox = document.getElementById('loginBox');
  const dashContent = document.getElementById('dashContent');
  if (unsubscribeDoc) { unsubscribeDoc(); unsubscribeDoc = null; }
  if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
  if (unsubOrders) { unsubOrders(); unsubOrders = null; }

  if (user) {
    loginBox.style.display = 'none';
    dashContent.style.display = 'block';
    listenToChat(user.uid);
    listenToMyOrders(user.uid);
    renderCalendar();
    renderExtraDishList();
    initProfilePicUpload();
    unsubscribeDoc = onSnapshot(doc(db, "registrations", user.uid), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      document.getElementById('welcomeNote').textContent = `Welcome back, ${d.name || 'there'}!`;
      renderStatusBadge(d.status || 'pending');
      renderDetailsRecap(d);
      renderPauseResume(d.status);
      renderProfilePic(d.profilePicUrl);
      const stage = typeof d.deliveryStage === 'number' ? d.deliveryStage : (STATUS_STAGE[d.status] ?? 0);
      if (typeof window.setDeliveryStage === 'function') window.setDeliveryStage(stage);
    });
  } else {
    loginBox.style.display = 'block';
    dashContent.style.display = 'none';
  }
});
