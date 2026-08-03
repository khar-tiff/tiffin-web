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
   use to log into your private admin page (see step 8 for the link).
4. To onboard a customer who called or walked in instead of registering
   themselves online, add their account here too the same way, then fill
   in their details from the admin page's customer list.

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
customer, then open `staff-portal-9f3k.html` in another tab and log in
with your admin account — you should see the registration appear
instantly, and you can click any row to open the full profile, see any
extra info they've sent, and chat with them live.

## 5. Real-time notifications — two options

**A. Built-in (free, no extra signup):** Keep the admin page open in a
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


## 8. Your admin page is not publicly linked (but isn't secret either)

The admin page lives at a hard-to-guess filename —
`staff-portal-9f3k.html` — instead of the obvious `admin.html`, and nothing on the
public site links to it, so casual visitors won't stumble onto it, and
`robots.txt` tells search engines not to index it. That said, treat the
filename as "unlisted," not as your real security — anyone who did find
the URL still cannot get in without your admin email and password. If
you want to rename it to something else, just rename the file (keep the
`.html` extension) and update the URL you use to reach it; nothing else
in the code needs to change.

Your live admin URL will be:
`https://<your-username>.github.io/tiffin-web/staff-portal-9f3k.html`

## 9. What each dashboard now does (all real, live data)

- **Customer registration** — creates their login and saves their order
  to Firestore, plan pre-filled if they clicked "Choose Plan" on pricing.
- **Customer dashboard** — shows their live approval status (Pending →
  Confirmed → Active, set by you from the admin page), a recap of what
  they submitted, a box to send you extra info or address changes
  anytime, and a live chat with your support.
- **Admin page** — a live table of every registration; click any row for
  the full profile, their extra info, and a two-way chat thread; change
  their status from a dropdown, which instantly updates their dashboard.
- **Newsletter box** — anyone can submit email + WhatsApp number without
  logging in; it's saved to a `subscribers` collection in Firestore,
  visible to you in the Firebase Console under Firestore Database.


## 10. How the new approval flow works

1. A visitor fills the Register form. This does **not** create a login --
   it saves an application to Firestore for you to review. They see a
   "your application is under review" message, nothing more yet.
2. You get notified in the admin page (New Applications tab, live, with
   a sound + browser notification if enabled).
3. Click **Approve** on their row. Set a password (or click Generate for
   a random strong one) and click **Approve & Create Login**. This
   creates their real account and their dashboard record.
4. The page shows you the email + password to send them -- do this
   yourself over WhatsApp/SMS/call, since there's no automated SMS on
   the free tier. Once you send it, they can log in immediately.
5. If it's not a fit, click **Reject** instead -- nothing is created.

## 11. New admin portal tabs

- **New Applications** -- pending sign-ups, with Approve/Reject
- **Customers** -- every approved customer, searchable by name/phone/area,
  filterable by status; click a row for their full profile (which you can
  edit directly), their chat, and extra info they've sent
- **Open Cases** -- customers who've sent extra info/requests, for a
  quick "what needs my attention" view
- **Extra Orders** -- every extra dish order across all customers, with a
  Mark Paid button once you've checked the UPI payment came through
- A stats bar up top: new applications, total customers, active plans,
  unpaid orders

## 12. Address autocomplete (free, no API key)

The address field on the Register form uses OpenStreetMap's free
Nominatim service to suggest real addresses as you type -- no signup,
no API key, no cost. It's rate-limited for fair use (fine for a small
business's traffic); if you ever outgrow it, Google Places Autocomplete
is the paid upgrade path.

## 13. Extra dish ordering + payment

Customers can order extra Punjabi dishes from their dashboard. Since a
full payment gateway needs business KYC/bank verification and is beyond
a free/no-code setup, this uses the common small-business approach in
India: the order is logged, the customer is shown your UPI ID to pay
directly (GPay/PhonePe/any UPI app), and you mark it "Paid" in the
Extra Orders tab once you've checked it landed. Update the dish list and
your UPI ID in `js/app.js` near the top (`UPI_ID` and `EXTRA_DISHES`).

## 14. Profile photo uploads (optional)

Customers can upload a profile photo from their dashboard. Since
Firebase Storage now requires the paid Blaze plan, this uses Cloudinary
instead (free tier, no backend needed):
1. Sign up free at https://cloudinary.com
2. Console -> Settings -> Upload -> Add upload preset -> Signing Mode:
   **Unsigned** -> Save, note the preset name
3. In `js/app.js`, fill in `CLOUDINARY_CLOUD_NAME` (shown on your
   Cloudinary dashboard) and `CLOUDINARY_UPLOAD_PRESET` (the preset name)

Until you set these, the photo uploader is disabled with a note --
everything else works fine without it.

## 15. If the admin page shows no data, or the form seems stuck

Both of these almost always trace back to one of:
- `js/firebase-config.js` still has a `PASTE_YOUR_...` placeholder instead
  of your real project values
- Firestore rules weren't actually published yet, or still have
  `PASTE_YOUR_ADMIN_UID_HERE` instead of your real UID
- Authentication -> Sign-in method -> Email/Password isn't enabled

To check: open the live site, press **F12** -> **Console** tab, and
look for red errors. `permission-denied` means the rules aren't
published correctly with your UID; `auth/...` errors mean
Authentication isn't set up; a generic network error usually means the
config values are still placeholders. The submit button now also shows
a real error message on screen (not just "Submitting...") if something
fails, and times out after 15 seconds instead of hanging forever.

## 16. Photos/videos not showing up after uploading to GitHub

Check, in this exact order:
1. **Filename matches exactly**, including case -- `hero-photo.jpg` is
   not the same as `Hero-Photo.JPG` on GitHub Pages (unlike on Windows).
2. The file is actually **inside** the `images` or `videos` folder on
   GitHub, not sitting loose in the root.
3. Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R) -- GitHub Pages
   caches files for a few minutes after a change.
4. For the hero photo and the two comparison sections: if no matching
   file is found, the page silently falls back to the original
   illustration/placeholder instead of showing a broken image icon --
   so "it still looks like before" usually means the filename doesn't
   match, not that nothing happened.

## What's real now

- Customer applies via the Register form -> saved as an application, no login yet
- Admin reviews and Approves in the admin page -> creates the customer's real login
- Customer logs in only after approval, sees their live dashboard
- Security rules: customers see only their own data; only admin can approve/edit/see all
- Plan pre-selection from the pricing section, shown as a banner on the form
- Live status timeline (Pending / Confirmed / Active), fully admin-controlled
- Customer can send extra info, request pause/resume, upload a profile photo (optional setup)
- Customer can order extra dishes with UPI payment, tracked per order
- Live two-way chat between customer and admin
- Admin page: Applications / Customers / Open Cases / Extra Orders tabs, search & filter,
  full profile editing, live stats, real-time notifications (sound + browser)
- Newsletter/WhatsApp signup saved to Firestore
- Address autocomplete via free OpenStreetMap search

Nothing on the dashboard is fake/demo data anymore — every number and
status shown reflects real Firestore data.
