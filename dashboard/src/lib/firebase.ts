import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCPB0DVabvtqnCJCQVScR8NzWRpWaxXuHo',
  authDomain: 'plastictrade-8649c.firebaseapp.com',
  projectId: 'plastictrade-8649c',
  storageBucket: 'plastictrade-8649c.firebasestorage.app',
  messagingSenderId: '1087970867507',
  appId: '1:1087970867507:web:17e6e15b68e49bc6b0e646',
  measurementId: 'G-4BD4JVBJJF',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

/** Firestore collection names (must match mobile app) */
export const FIRESTORE_USERS_COLLECTION = 'users';
export const FIRESTORE_SERVICE_SHEETS_COLLECTION = 'serviceSheets';
export const FIRESTORE_CHECKINS_COLLECTION = 'checkins';
export const FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION = 'roleChangeRequests';
export const FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION = 'siteChangeRequests';
export const FIRESTORE_SITES_COLLECTION = 'sites';
export const FIRESTORE_MATERIALS_COLLECTION = 'materials';
export const FIRESTORE_MEASURE_UNITS_COLLECTION = 'measureUnits';
export const FIRESTORE_TRANSPORT_UNITS_COLLECTION = 'transportUnits';

if (typeof window !== 'undefined') {
  import('firebase/analytics')
    .then(({ getAnalytics }) => getAnalytics(app))
    .catch(() => {});
}
