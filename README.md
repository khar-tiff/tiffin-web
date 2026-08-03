# TiffinX Website

Fresh. Healthy. Hygienic. — marketing site + customer registration/dashboard prototype for TiffinX, a tiffin/catering service serving Ludhiana, Jagraon, and Village Mallah.

## What's here

```
tiffinx-site/
├── index.html      → the whole site (structure)
├── css/style.css    → all styling (sketchbook / hand-drawn look)
├── js/main.js        → interactivity: form, dashboard demo, hand-drawn icons
├── images/logo.png   → your TiffinX logo (transparent background)
└── README.md
```

Open `index.html` directly in a browser to preview locally — no build step needed.

## What's real vs. demo right now

- The **registration form** and **customer dashboard** (delivery timeline, calendar, billing, extras) currently run entirely in the browser with sample/demo data. Nothing is saved anywhere yet.
- To make it a real product, you need a backend. Since you already have a Firebase account, the natural next step is:
  1. **Firebase Authentication** — customer sign-up/login (phone OTP is a good fit for India).
  2. **Firestore** — store customer profiles, subscriptions, daily delivery status, and billing.
  3. **Firebase Storage** — driver-uploaded delivery photos.
  4. **Cloud Functions** — send notifications ("on the way", "delivered") via FCM push or WhatsApp Business API.
  5. A simple **driver app/page** (can be a second lightweight page) where your delivery staff mark a tiffin as "picked up" / "delivered" and upload the photo.

## Publishing to GitHub

```bash
cd tiffinx-site
git init
git add .
git commit -m "Initial TiffinX website"
git branch -M main
git remote add origin https://github.com/<your-username>/tiffinx-website.git
git push -u origin main
```

### Free hosting options once it's on GitHub
- **GitHub Pages** — Settings → Pages → deploy from `main` branch. Free, instant.
- **Firebase Hosting** — since you already use Firebase: `firebase init hosting`, point it at this folder, then `firebase deploy`. This is the best option long-term since your backend (Auth/Firestore/Storage) will live in the same project.

## Editing content

- **Logo**: replace `images/logo.png` with a new file of the same name (transparent PNG works best).
- **Colors/fonts**: all defined at the top of `css/style.css` under `:root { ... }`.
- **Prices, plans, areas served, copy**: edit directly in `index.html` — it's plain HTML, no templating.

## Next steps

Ready to make the dashboard and registration real (not demo data)? That means wiring this front-end to your Firebase project — happy to help set up Auth, Firestore data models (customers, subscriptions, deliveries), and the driver-facing update flow.
