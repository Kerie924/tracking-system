# Plastic Trade — Tracking System

The **dashboard** folder is the main deployable app. It includes the React UI, Firebase client config, Firestore rules, and type definitions.

## Quick start

```bash
cd dashboard
npm install
npm run dev
```

## Deploy

| Target | Root directory | Notes |
|--------|----------------|-------|
| **Vercel** | `dashboard` | Set root to `dashboard` in project settings |
| **Firestore rules** | `dashboard` | Run `npm run firebase:deploy:rules` from `dashboard/` |

See [dashboard/README.md](./dashboard/README.md) for full Vercel and Firebase steps.

## Repo layout

```
dashboard/          ← Deploy this to Vercel
  src/              ← React app
  firebase/         ← Firestore rules
  firebase.json
  shared/           ← Type docs (types in src/types/)
firebase/           ← Legacy copy (use dashboard/firebase instead)
shared/             ← Legacy copy (use dashboard/src/types instead)
```

The root `firebase.json` points to `dashboard/firebase/firestore.rules` if you run Firebase CLI from the repo root.
