# TiffinX — Setup Guide (Firebase + GitHub, all free tier)

This wires your site to a **real backend** on Firebase's free "Spark" plan:
customer login, secure data storage, and a live admin dashboard with
real-time notifications. No credit card required for any step below.

---

## 1. Create your Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it
   `tiffinx` (or anything) → you can skip Google Analytics → **Create project**.
2. In the project, click the **web icon (`</>`)** to register a web app.
   Name it "TiffinX Website" → **Register app**.
3. Firebase shows you a `firebaseConfig` object. Copy the values into
   `js/firebase-config.js` in this folder (replace the `PASTE_...` placeholders).

## 2. Turn on Authentication (customer + admin login)

1. In the Firebase Console sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user** → create YOUR admin account
   (e.g. `admin@example.com` + a strong password). This is what you'll
   use to log into `admin.html`.

## 3. Turn on Firestore (the database)

1. Sidebar: **Build → Firestore Database → Create database**.
2. Choose **Production mode** → pick a location close to you (e.g.
   `asia-south1` for India) → **Enable**.
3. Go to **Authentication → Users**, find the admin account you created
   in step 2, and copy its **User UID** (a random string, not your email).
4. Go to the **Rules** tab, delete what's there, and paste in the contents
   of `firestore.rules` from this folder. **Before publishing**, replace
   `PASTE_YOUR_ADMIN_UID_HERE` in that file with the UID you just copied.
   Click **Publish**.

This is the part that "secures your data": customers can only ever read
or write their own record; only your admin account (identified by its
UID, never your email) can see everyone's. Nothing that identifies you
personally ever needs to appear in the public GitHub repo.

## 4. Test it locally

Open `index.html` in a browser (or use a local server like the VS Code
"Live Server" extension — Firebase Auth needs `http://` or `https://`,
not `file://`, so a simple local server is easiest). Register a test
customer, then open `admin.html` in another tab and log in with your
admin account — you should see the registration appear instantly.

## 5. Real-time notifications — two options

**A. Built-in (free, no extra signup):** Keep `admin.html` open in a
browser tab (desktop or Android Chrome). Click "🔔 Enable notifications"
once. Every new registration pops a browser notification + plays a beep,
live, without refreshing. Limitation: only works while that tab/browser
is open — it won't reach your phone if the browser is fully closed, and
iOS Safari doesn't support this well.

**B. Email straight to your phone (free, works anywhere):** Sign up at
https://www.emailjs.com (free tier = 200 emails/month), add an email
service (e.g. your Gmail) and a template, then in `js/app.js` fill in:
```js
const EMAILJS_PUBLIC_KEY = "...";
const EMAILJS_SERVICE_ID = "...";
const EMAILJS_TEMPLATE_ID = "...";
```
and add this script tag to `index.html`'s `<head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
```
Now every registration also emails you instantly — which shows up as a
push notification on your phone via the Gmail/Mail app, no extra cost.

**C. (Later, optional upgrade) Real push notifications via FCM:** For
notifications that arrive even with no browser open, you'd add a Cloud
Function that triggers on new Firestore documents and sends a Firebase
Cloud Messaging push. This requires upgrading Firebase to the **Blaze**
(pay-as-you-go) plan — usage still stays within the free quota for a
small tiffin business, but Google requires a card on file for Cloud
Functions. Not needed to get started; option B covers the same need for free.

## 6. Put it on GitHub

```bash
cd tiffinx-site
git init
git add .
git commit -m "Initial TiffinX website with Firebase backend"
git branch -M main
git remote add origin https://github.com/<your-username>/tiffinx-website.git
git push -u origin main
```

**Important:** `js/firebase-config.js` contains your Firebase project ID
and API key. These are safe to be public (Firebase is designed this way —
your Firestore Security Rules are what actually protect the data, not
secrecy of this file), so it's fine to commit it to a public repo.

## 7. Host it for free

- **GitHub Pages:** repo → Settings → Pages → Deploy from branch → `main`
  → `/ (root)` → Save. Your site goes live at
  `https://<your-username>.github.io/tiffinx-website/`.
- **Firebase Hosting** (alternative, keeps everything in one project):
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase init hosting     # select this folder as the public directory
  firebase deploy
  ```

## What's real now vs. still a demo

- ✅ Real: customer registration, login/logout, per-customer data in
  Firestore, security rules, admin login, live admin table, notifications.
- 🎨 Still illustrative: the delivery timeline's "Simulate: Advance
  Status" button, the calendar, and the billing numbers on the customer
  dashboard — those are cosmetic until you build a driver-facing page
  that updates `deliveryStage` and billing fields in Firestore. Happy to
  build that next if useful — it's the same pattern as `admin.html`.
