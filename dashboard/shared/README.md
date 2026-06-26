# Shared types (reference)

The dashboard app uses TypeScript types in **`src/types/index.ts`**. That file is the source of truth for:

- Material types (`PLAYO`, `CARTON`, `RSU`, `TARIMAS`, `TUBO_CARTON`)
- Service sheet shape (`users/{userId}/serviceSheets/{sheetId}`)
- User roles and dashboard stats

The mobile app should align its Firestore payloads with those types. This folder exists so the dashboard repo is self-contained when deployed to Vercel without the old monorepo `shared/` package.

Legacy RTDB departure types from the original backend prototype are no longer used by the dashboard.
