import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDoEnZVcoeceqpJ9VLbLeoX_Rl56bk7urE',
  authDomain: 'tracking-system-d2b2b.firebaseapp.com',
  databaseURL: 'https://tracking-system-d2b2b-default-rtdb.firebaseio.com',
  projectId: 'tracking-system-d2b2b',
  storageBucket: 'tracking-system-d2b2b.firebasestorage.app',
  messagingSenderId: '730650777483',
  appId: '1:730650777483:web:7a32068083f633d8cf818e',
  measurementId: 'G-2D5WSW78Q9',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

/** Firestore collection names (must match mobile app) */
export const FIRESTORE_USERS_COLLECTION = 'users';
export const FIRESTORE_SERVICE_SHEETS_COLLECTION = 'serviceSheets';
export const FIRESTORE_CHECKINS_COLLECTION = 'checkins';

if (typeof window !== 'undefined') {
  import('firebase/analytics')
    .then(({ getAnalytics }) => getAnalytics(app))
    .catch(() => {});
}
