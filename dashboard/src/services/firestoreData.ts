import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import {
  firestore,
  FIRESTORE_USERS_COLLECTION,
  FIRESTORE_SERVICE_SHEETS_COLLECTION,
} from '@/lib/firebase';
import { DEV_ALL_OWNER } from '@/lib/config';
import type { ServiceSheet, UserProfile, UserRole, Language, ServiceSheetStatus } from '@/types';
import {
  createEmptyMaterialMap,
  normalizeMaterialType,
  normalizeSheetStatus,
  normalizeUserRole,
  parseServiceSheetMaterials,
} from '@/types';

function parseServiceSheet(
  docId: string,
  data: DocumentData,
  userId: string,
  userName?: string,
  userEmail?: string
): ServiceSheet {
  return {
    id: docId,
    userId,
    userName,
    userEmail,
    folio: data.folio ?? '',
    codigo: data.codigo ?? '',
    fecha: data.fecha ?? '',
    createdAt: data.createdAt ?? '',
    status: normalizeSheetStatus(data.status),
    autoriza: data.autoriza,
    elaboro: data.elaboro,
    entrega: data.entrega,
    recibe: data.recibe,
    recibio: data.recibio,
    responsableSup: data.responsableSup,
    operatorName: data.operatorName,
    sealNumber: data.sealNumber,
    siteId: data.siteId,
    siteName: data.siteName,
    source: data.source,
    trailerPlates: data.trailerPlates,
    vehiclePlates: data.vehiclePlates,
    latitude: data.latitude,
    longitude: data.longitude,
    siteEntryTime: data.siteEntryTime,
    siteExitTime: data.siteExitTime,
    warehouseEntryTime: data.warehouseEntryTime,
    warehouseExitTime: data.warehouseExitTime,
    materials: parseServiceSheetMaterials(data.materials),
  };
}

function userDocRef(userId: string) {
  return doc(firestore, FIRESTORE_USERS_COLLECTION, userId);
}

function extractUserIdFromPath(path: string): string {
  const parts = path.split('/');
  const usersIndex = parts.indexOf(FIRESTORE_USERS_COLLECTION);
  return usersIndex >= 0 ? parts[usersIndex + 1] ?? '' : '';
}

export function subscribeToServiceSheetsCollection(
  options: {
    userId: string;
    canViewAllSheets: boolean;
    userName?: string;
    userEmail?: string;
  },
  onData: (sheets: ServiceSheet[]) => void,
  onError?: (error: Error) => void
) {
  if (options.canViewAllSheets || DEV_ALL_OWNER) {
    return subscribeToAllServiceSheets(onData, onError);
  }

  return subscribeToUserServiceSheets(
    options.userId,
    options.userName,
    options.userEmail,
    onData,
    onError
  );
}

/** @deprecated Use subscribeToServiceSheetsCollection */
export function subscribeToServiceSheets(
  options: Parameters<typeof subscribeToServiceSheetsCollection>[0],
  onData: (sheets: ServiceSheet[]) => void,
  onError?: (error: Error) => void
) {
  return subscribeToServiceSheetsCollection(options, onData, onError);
}

function subscribeToUserServiceSheets(
  userId: string,
  userName: string | undefined,
  userEmail: string | undefined,
  onData: (sheets: ServiceSheet[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(
      firestore,
      FIRESTORE_USERS_COLLECTION,
      userId,
      FIRESTORE_SERVICE_SHEETS_COLLECTION
    ),
    (snapshot) => {
      const sheets = snapshot.docs.map((d) =>
        parseServiceSheet(d.id, d.data(), userId, userName, userEmail)
      );
      sheets.sort(
        (a, b) =>
          new Date(b.createdAt || b.fecha).getTime() -
          new Date(a.createdAt || a.fecha).getTime()
      );
      onData(sheets);
    },
    (err) => onError?.(err)
  );
}

function subscribeToAllServiceSheets(
  onData: (sheets: ServiceSheet[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collectionGroup(firestore, FIRESTORE_SERVICE_SHEETS_COLLECTION),
    (snapshot) => {
      const sheets = snapshot.docs.map((d) => {
        const userId = extractUserIdFromPath(d.ref.path);
        return parseServiceSheet(d.id, d.data(), userId);
      });
      sheets.sort(
        (a, b) =>
          new Date(b.createdAt || b.fecha).getTime() -
          new Date(a.createdAt || a.fecha).getTime()
      );
      onData(sheets);
    },
    (err) => onError?.(err)
  );
}

export function subscribeToUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(firestore, FIRESTORE_USERS_COLLECTION),
    (snapshot) => {
      const users = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? data.email?.split('@')[0] ?? d.id.slice(0, 8),
          email: data.email ?? '',
          role: normalizeUserRole(data.role),
          language: (data.language ?? 'es') as Language,
          createdAt: data.createdAt ?? '',
        };
      });
      users.sort((a, b) => a.name.localeCompare(b.name));
      onData(users);
    },
    (err) => onError?.(err)
  );
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const role = normalizeUserRole(data.role);
  // Persist migrated role when legacy values are found
  if (data.role !== role) {
    await setDoc(userDocRef(uid), { role }, { merge: true });
  }
  return {
    id: snap.id,
    name: data.name ?? '',
    email: data.email ?? '',
    role,
    language: (data.language ?? 'es') as Language,
    createdAt: data.createdAt ?? '',
  };
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName?: string | null
): Promise<UserProfile> {
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const profile: Omit<UserProfile, 'id'> = {
      name: displayName || email.split('@')[0],
      email,
      role: 'customer',
      language: 'es',
      createdAt: new Date().toISOString(),
    };
    await setDoc(ref, profile);
    return { id: uid, ...profile };
  }

  const data = snap.data();
  const updates: Record<string, string> = {};
  const role = normalizeUserRole(data.role);
  if (data.role !== role) updates.role = role;
  if (!data.role) updates.role = role;
  if (!data.language) updates.language = 'es';
  if (!data.email) updates.email = email;
  if (!data.name && displayName) updates.name = displayName;
  if (Object.keys(updates).length > 0) {
    await setDoc(ref, updates, { merge: true });
  }

  return {
    id: uid,
    name: data.name ?? displayName ?? '',
    email: data.email ?? email,
    role: (updates.role as UserRole | undefined) ?? role,
    language: (updates.language ?? data.language ?? 'es') as Language,
    createdAt: data.createdAt ?? '',
  };
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'name' | 'language'>>
): Promise<void> {
  await updateDoc(userDocRef(uid), data);
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(userDocRef(uid), { role });
}

export function computeStatsFromSheets(sheets: ServiceSheet[]) {
  const today = new Date().toISOString().split('T')[0];
  const byMaterial = createEmptyMaterialMap();
  const bySite: Record<string, number> = {};
  const userIds = new Set<string>();
  const siteIds = new Set<string>();
  let totalQuantity = 0;

  for (const sheet of sheets) {
    userIds.add(sheet.userId);
    if (sheet.siteId) siteIds.add(sheet.siteId);
    if (sheet.siteName) bySite[sheet.siteName] = (bySite[sheet.siteName] || 0) + 1;

    for (const m of sheet.materials ?? []) {
      const key = normalizeMaterialType(String(m.materialType));
      if (key) {
        byMaterial[key] += m.quantity || 0;
        totalQuantity += m.quantity || 0;
      }
    }
  }

  return {
    totalSheets: sheets.length,
    todaySheets: sheets.filter(
      (s) => s.fecha === today || s.createdAt?.startsWith(today)
    ).length,
    totalQuantity,
    activeSites: siteIds.size || Object.keys(bySite).length,
    activeUsers: userIds.size,
    byMaterial,
    bySite,
  };
}

export function computeTrendsFromSheets(sheets: ServiceSheet[], days = 7) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const daySheets = sheets.filter(
      (s) => s.fecha === dateStr || s.createdAt?.startsWith(dateStr)
    );

    result.push({
      date: dateStr,
      count: daySheets.length,
      weight: daySheets.reduce(
        (sum, s) =>
          sum + (s.materials?.reduce((a, m) => a + (m.quantity || 0), 0) ?? 0),
        0
      ),
    });
  }
  return result;
}

export function computeMaterialTrendsFromSheets(sheets: ServiceSheet[], days = 7) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const daySheets = sheets.filter(
      (s) => s.fecha === dateStr || s.createdAt?.startsWith(dateStr)
    );

    const entry = createEmptyMaterialMap();

    for (const sheet of daySheets) {
      for (const m of sheet.materials ?? []) {
        const key = normalizeMaterialType(String(m.materialType));
        if (key) entry[key] += m.quantity || 0;
      }
    }
    result.push({ date: dateStr, ...entry });
  }
  return result;
}

function serviceSheetDocRef(userId: string, sheetId: string) {
  return doc(
    firestore,
    FIRESTORE_USERS_COLLECTION,
    userId,
    FIRESTORE_SERVICE_SHEETS_COLLECTION,
    sheetId
  );
}

function serviceSheetsCollectionRef(userId: string) {
  return collection(
    firestore,
    FIRESTORE_USERS_COLLECTION,
    userId,
    FIRESTORE_SERVICE_SHEETS_COLLECTION
  );
}

export function serviceSheetToFirestorePayload(
  sheet: ServiceSheet
): DocumentData {
  const payload: DocumentData = {
    folio: sheet.folio,
    codigo: sheet.codigo,
    fecha: sheet.fecha,
    createdAt: sheet.createdAt || new Date().toISOString(),
    status: (sheet.status ?? 'draft') as ServiceSheetStatus,
    materials: sheet.materials
      .map((m) => {
        const materialType = normalizeMaterialType(String(m.materialType));
        if (!materialType) return null;
        const entry: DocumentData = {
          materialType,
          quantity: m.quantity || 0,
        };
        if (m.unitOfMeasure) entry.unitOfMeasure = m.unitOfMeasure;
        if (m.unit) entry.unit = m.unit;
        if (m.kilograms != null && Number.isFinite(m.kilograms)) {
          entry.kilograms = m.kilograms;
        }
        return entry;
      })
      .filter(Boolean),
  };

  const optionalFields = [
    'autoriza',
    'elaboro',
    'entrega',
    'recibe',
    'recibio',
    'responsableSup',
    'operatorName',
    'sealNumber',
    'siteId',
    'siteName',
    'source',
    'trailerPlates',
    'vehiclePlates',
    'siteEntryTime',
    'siteExitTime',
    'warehouseEntryTime',
    'warehouseExitTime',
  ] as const;

  for (const field of optionalFields) {
    const value = sheet[field];
    if (value !== undefined && value !== '') {
      payload[field] = value;
    }
  }

  if (sheet.latitude != null) payload.latitude = sheet.latitude;
  if (sheet.longitude != null) payload.longitude = sheet.longitude;

  return payload;
}

export async function createServiceSheet(
  userId: string,
  sheet: ServiceSheet
): Promise<string> {
  const docRef = doc(serviceSheetsCollectionRef(userId));
  await setDoc(docRef, serviceSheetToFirestorePayload(sheet));
  return docRef.id;
}

export async function updateServiceSheet(
  userId: string,
  sheetId: string,
  sheet: ServiceSheet
): Promise<void> {
  await setDoc(
    serviceSheetDocRef(userId, sheetId),
    serviceSheetToFirestorePayload(sheet),
    { merge: true }
  );
}
