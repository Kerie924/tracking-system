# Plastic Trade Dashboard

Self-contained React dashboard for service sheet monitoring. Deploy this folder to **Vercel** — no other repo folders are required at runtime.

## What's included

| Path | Purpose |
|------|---------|
| `src/` | React app (Firestore, Auth, UI) |
| `firebase/` | Firestore rules + legacy RTDB reference files |
| `firebase.json` | Firebase CLI config (rules deploy) |
| `.firebaserc` | Firebase project ID |
| `shared/` | Type documentation (active types live in `src/types/`) |
| `vercel.json` | SPA routing for Vercel |

## Local development

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

## Deploy to Vercel

1. Import the repo in Vercel (or connect Git).
2. Set **Root Directory** to `dashboard`.
3. Build settings (defaults work):
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. In Firebase Console → Authentication → Authorized domains, add your Vercel domain (e.g. `your-app.vercel.app`).

The app talks to Firebase directly from the browser. No server-side API is required.

## Deploy Firestore rules

Rules are **not** deployed by Vercel. From this `dashboard/` folder:

```bash
npm install -g firebase-tools   # once
firebase login                # once
npm run firebase:deploy:rules
```

Rules file: `firebase/firestore.rules`

## Firestore structure

```
users/{userId}
  serviceSheets/{sheetId}
    - folio, codigo, fecha, materials[], operatorName, ...
  checkins/{id}
```

Collection names are defined in `src/lib/firebase.ts`.

## Build

```bash
npm run build
npm run preview
```
