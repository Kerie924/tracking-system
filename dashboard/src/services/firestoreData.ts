import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  firestore,
  FIRESTORE_USERS_COLLECTION,
  FIRESTORE_SERVICE_SHEETS_COLLECTION,
  FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION,
  FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION,
  FIRESTORE_SITES_COLLECTION,
} from '@/lib/firebase';
import type {
  ServiceSheet,
  UserProfile,
  UserRole,
  Language,
  ServiceSheetStatus,
  RoleChangeRequest,
  RoleChangeRequestStatus,
  SiteChangeRequest,
  CatalogSite,
  SheetFirmas,
  FirmaEntry,
  WeighbridgeTicket,
} from '@/types';
import {
  createEmptyMaterialMap,
  FALLBACK_SITES,
  normalizeMaterialType,
  normalizeSheetStatus,
  normalizeUserRole,
  parseServiceSheetMaterials,
  REQUESTABLE_ROLES,
  unitOfMeasureToFirestoreCode,
} from '@/types';

function parseFirmaEntry(raw: unknown): FirmaEntry | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const entry: FirmaEntry = {};
  if (typeof data.filled === 'boolean') entry.filled = data.filled;
  if (data.value === null || typeof data.value === 'string') {
    entry.value = data.value as string | null;
  }
  if (data.nombre === null || typeof data.nombre === 'string') {
    entry.nombre = data.nombre as string | null;
  }
  if (data.nombre_probable === null || typeof data.nombre_probable === 'string') {
    entry.nombre_probable = data.nombre_probable as string | null;
  }
  return entry;
}

function parseFirmas(raw: unknown): SheetFirmas | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const result: SheetFirmas = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    result[key] = parseFirmaEntry(value);
  }
  return result;
}

function parseAssignedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function parseTickets(raw: unknown): WeighbridgeTicket[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tickets: WeighbridgeTicket[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id =
      typeof row.id === 'string' && row.id
        ? row.id
        : `ticket-${tickets.length + 1}`;
    const ticket: WeighbridgeTicket = { id };
    if (typeof row.photoUri === 'string') ticket.photoUri = row.photoUri;
    if (typeof row.scaleFolio === 'string') ticket.scaleFolio = row.scaleFolio;
    if (typeof row.scaleDateTime === 'string') {
      ticket.scaleDateTime = row.scaleDateTime;
    }
    if (typeof row.tareWeight === 'number' && Number.isFinite(row.tareWeight)) {
      ticket.tareWeight = row.tareWeight;
    }
    if (typeof row.grossWeight === 'number' && Number.isFinite(row.grossWeight)) {
      ticket.grossWeight = row.grossWeight;
    }
    if (typeof row.netWeight === 'number' && Number.isFinite(row.netWeight)) {
      ticket.netWeight = row.netWeight;
    }
    if (
      typeof row.discountPercent === 'number' &&
      Number.isFinite(row.discountPercent)
    ) {
      ticket.discountPercent = row.discountPercent;
    }
    if (row.ticketJson && typeof row.ticketJson === 'object') {
      ticket.ticketJson = row.ticketJson as Record<string, unknown>;
    }
    tickets.push(ticket);
  }
  return tickets;
}

function parseUserProfile(docId: string, data: DocumentData): UserProfile {
  return {
    id: docId,
    name: data.name ?? data.email?.split('@')[0] ?? docId.slice(0, 8),
    email: data.email ?? '',
    role: normalizeUserRole(data.role),
    language: (data.language ?? 'es') as Language,
    createdAt: data.createdAt ?? '',
    assignedSiteIds: parseAssignedIds(data.assignedSiteIds),
    assignedLogisticsIds: parseAssignedIds(data.assignedLogisticsIds),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
}

function parseServiceSheet(
  docId: string,
  data: DocumentData,
  fallbackUserId = '',
  userName?: string,
  userEmail?: string
): ServiceSheet {
  const createdBy =
    typeof data.createdBy === 'string' && data.createdBy
      ? data.createdBy
      : fallbackUserId;
  const createdByName =
    typeof data.createdByName === 'string' ? data.createdByName : userName;

  const sheetJson =
    data.sheetJson && typeof data.sheetJson === 'object' && !Array.isArray(data.sheetJson)
      ? (data.sheetJson as Record<string, unknown>)
      : undefined;

  return {
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    userId: createdBy,
    userName: createdByName ?? userName,
    userEmail,
    folio: data.folio ?? '',
    codigo: data.codigo ?? '',
    fecha: data.fecha ?? '',
    createdAt: data.createdAt ?? '',
    status: normalizeSheetStatus(data.status),
    createdBy,
    createdByName,
    packagingType: data.packagingType,
    logisticsAccountId:
      typeof data.logisticsAccountId === 'string'
        ? data.logisticsAccountId
        : undefined,
    operatorId: data.operatorId,
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
    photoUri: typeof data.photoUri === 'string' ? data.photoUri : undefined,
    sheetJson,
    firmas: parseFirmas(data.firmas),
    rejectionReason:
      typeof data.rejectionReason === 'string' ? data.rejectionReason : undefined,
    trailerPlates: data.trailerPlates,
    vehiclePlates: data.vehiclePlates,
    latitude: data.latitude,
    longitude: data.longitude,
    siteEntryTime: data.siteEntryTime,
    siteExitTime: data.siteExitTime,
    warehouseEntryTime: data.warehouseEntryTime,
    warehouseExitTime: data.warehouseExitTime,
    elaboroSignedAt: data.elaboroSignedAt,
    supervisorSignedAt: data.supervisorSignedAt,
    supervisorUserId: data.supervisorUserId,
    meliSignedAt: data.meliSignedAt,
    meliUserId: data.meliUserId,
    operadorSignedAt: data.operadorSignedAt,
    operadorUserId: data.operadorUserId,
    clienteSignedAt: data.clienteSignedAt,
    clienteUserId: data.clienteUserId,
    process2CompletedAt: data.process2CompletedAt,
    process2CompletedBy: data.process2CompletedBy,
    process2CompletedByName: data.process2CompletedByName,
    materials: parseServiceSheetMaterials(data.materials),
    tickets: parseTickets(data.tickets),
  };
}

function userDocRef(userId: string) {
  return doc(firestore, FIRESTORE_USERS_COLLECTION, userId);
}

function serviceSheetDocRef(sheetId: string) {
  return doc(firestore, FIRESTORE_SERVICE_SHEETS_COLLECTION, sheetId);
}

function sortSheetsByNewest(sheets: ServiceSheet[]) {
  sheets.sort(
    (a, b) =>
      new Date(b.createdAt || b.fecha).getTime() -
      new Date(a.createdAt || a.fecha).getTime()
  );
  return sheets;
}

/**
 * Subscribe to top-level `serviceSheets`. Per WEB_DEVELOPER_WORKFLOW, every
 * signed-in user can view all sheets. Optional `createdBy` filter is available
 * for elaboro-scoped views but all sheets is preferred.
 */
export function subscribeToServiceSheetsCollection(
  options: {
    userId: string;
    /** Always treated as true — all signed-in users see the collection. */
    canViewAllSheets?: boolean;
    userName?: string;
    userEmail?: string;
    /** Optional: filter to sheets created by this uid (prefer all sheets). */
    createdBy?: string;
  },
  onData: (sheets: ServiceSheet[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const sheetsRef = collection(firestore, FIRESTORE_SERVICE_SHEETS_COLLECTION);
  const sheetsQuery = options.createdBy
    ? query(sheetsRef, where('createdBy', '==', options.createdBy))
    : sheetsRef;

  return onSnapshot(
    sheetsQuery,
    (snapshot) => {
      try {
        const sheets = sortSheetsByNewest(
          snapshot.docs.map((d) =>
            parseServiceSheet(
              d.id,
              d.data(),
              options.userId,
              options.userName,
              options.userEmail
            )
          )
        );
        onData(sheets);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => onError?.(err)
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

export function subscribeToUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(firestore, FIRESTORE_USERS_COLLECTION),
    (snapshot) => {
      const users = snapshot.docs.map((d) => parseUserProfile(d.id, d.data()));
      users.sort((a, b) => a.name.localeCompare(b.name));
      onData(users);
    },
    (err) => onError?.(err)
  );
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  return parseUserProfile(snap.id, snap.data());
}

/**
 * Ensure a users/{uid} doc exists. Does not write `role` or `assignedSiteIds`
 * on update — those are admin/Cloud Function fields under current rules.
 */
export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName?: string | null
): Promise<UserProfile> {
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const now = new Date().toISOString();
    const profile: Omit<UserProfile, 'id'> = {
      name: displayName || email.split('@')[0] || 'User',
      email,
      role: 'elaboro',
      language: 'es',
      createdAt: now,
      assignedSiteIds: [],
      assignedLogisticsIds: [],
      updatedAt: now,
    };
    await setDoc(ref, profile);
    return { id: uid, ...profile };
  }

  const data = snap.data();
  // Safe self-updates only (not role / assignedSiteIds).
  const updates: Record<string, unknown> = {};
  if (!data.language) updates.language = 'es';
  if (!data.email && email) updates.email = email;
  if (!data.name && displayName) updates.name = displayName;

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date().toISOString();
    try {
      await setDoc(ref, updates, { merge: true });
    } catch {
      // Profile still usable with in-memory defaults if merge is denied.
    }
  }

  return parseUserProfile(uid, { ...data, ...updates });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<
    Pick<UserProfile, 'name' | 'language' | 'assignedSiteIds' | 'assignedLogisticsIds'>
  >
): Promise<void> {
  await updateDoc(userDocRef(uid), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(userDocRef(uid), {
    role,
    updatedAt: new Date().toISOString(),
  });
}

export function computeStatsFromSheets(sheets: ServiceSheet[]) {
  const today = new Date().toISOString().split('T')[0];
  const byMaterial = createEmptyMaterialMap();
  const byMaterialKg = createEmptyMaterialMap();
  const bySite: Record<string, number> = {};
  const userIds = new Set<string>();
  const siteIds = new Set<string>();
  let totalQuantity = 0;
  let totalKilograms = 0;

  for (const sheet of sheets) {
    userIds.add(sheet.userId);
    if (sheet.siteId) siteIds.add(sheet.siteId);
    if (sheet.siteName) bySite[sheet.siteName] = (bySite[sheet.siteName] || 0) + 1;

    for (const m of sheet.materials ?? []) {
      const key = normalizeMaterialType(String(m.materialType));
      if (key) {
        byMaterial[key] += m.quantity || 0;
        totalQuantity += m.quantity || 0;
        const kg = typeof m.kilograms === 'number' && Number.isFinite(m.kilograms)
          ? m.kilograms
          : 0;
        byMaterialKg[key] += kg;
        totalKilograms += kg;
      }
    }
  }

  return {
    totalSheets: sheets.length,
    todaySheets: sheets.filter(
      (s) => s.fecha === today || s.createdAt?.startsWith(today)
    ).length,
    totalQuantity,
    totalKilograms,
    activeSites: siteIds.size || Object.keys(bySite).length,
    activeUsers: userIds.size,
    byMaterial,
    byMaterialKg,
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

export function serviceSheetToFirestorePayload(
  sheet: ServiceSheet
): DocumentData {
  const createdBy = sheet.createdBy || sheet.userId;
  const payload: DocumentData = {
    folio: sheet.folio,
    codigo: sheet.codigo,
    fecha: sheet.fecha,
    createdAt: sheet.createdAt || new Date().toISOString(),
    status: (sheet.status ?? 'draft') as ServiceSheetStatus,
    createdBy,
    materials: sheet.materials
      .map((m) => {
        const materialType = normalizeMaterialType(String(m.materialType));
        if (!materialType) return null;
        const measure =
          m.unitOfMeasure ||
          (m.unit ? unitOfMeasureToFirestoreCode(m.unit) : undefined);
        const entry: DocumentData = {
          materialType,
          quantity: m.quantity || 0,
        };
        // Mobile schema stores unit-of-measure in `unit`
        if (measure) entry.unit = measure;
        if (m.kilograms != null && Number.isFinite(m.kilograms)) {
          entry.kilograms = m.kilograms;
        }
        if (m.customMaterialName) entry.customMaterialName = m.customMaterialName;
        return entry;
      })
      .filter(Boolean),
  };

  if (sheet.id) payload.id = sheet.id;
  if (sheet.createdByName) payload.createdByName = sheet.createdByName;
  if (sheet.packagingType) payload.packagingType = sheet.packagingType;
  if (sheet.logisticsAccountId) payload.logisticsAccountId = sheet.logisticsAccountId;
  if (sheet.photoUri) payload.photoUri = sheet.photoUri;
  if (sheet.sheetJson) payload.sheetJson = sheet.sheetJson;
  if (sheet.firmas) payload.firmas = sheet.firmas;
  if (sheet.rejectionReason) payload.rejectionReason = sheet.rejectionReason;
  if (sheet.tickets?.length) {
    payload.tickets = sheet.tickets.map((t) => {
      const entry: DocumentData = { id: t.id };
      if (t.photoUri) entry.photoUri = t.photoUri;
      if (t.scaleFolio) entry.scaleFolio = t.scaleFolio;
      if (t.scaleDateTime) entry.scaleDateTime = t.scaleDateTime;
      if (t.tareWeight != null) entry.tareWeight = t.tareWeight;
      if (t.grossWeight != null) entry.grossWeight = t.grossWeight;
      if (t.netWeight != null) entry.netWeight = t.netWeight;
      if (t.discountPercent != null) entry.discountPercent = t.discountPercent;
      if (t.ticketJson) entry.ticketJson = t.ticketJson;
      return entry;
    });
  }

  const optionalFields = [
    'autoriza',
    'elaboro',
    'entrega',
    'recibe',
    'recibio',
    'responsableSup',
    'operatorName',
    'operatorId',
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
    'elaboroSignedAt',
    'supervisorSignedAt',
    'supervisorUserId',
    'meliSignedAt',
    'meliUserId',
    'operadorSignedAt',
    'operadorUserId',
    'clienteSignedAt',
    'clienteUserId',
    'process2CompletedAt',
    'process2CompletedBy',
    'process2CompletedByName',
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

export async function createServiceSheet(sheet: ServiceSheet): Promise<string> {
  const id = sheet.id?.startsWith('sheet-') ? sheet.id : `sheet-${Date.now()}`;
  const payload = serviceSheetToFirestorePayload({
    ...sheet,
    id,
    createdBy: sheet.createdBy || sheet.userId,
  });
  await setDoc(serviceSheetDocRef(id), payload);
  return id;
}

export async function updateServiceSheet(
  sheetId: string,
  sheet: ServiceSheet
): Promise<void> {
  await setDoc(
    serviceSheetDocRef(sheetId),
    serviceSheetToFirestorePayload({ ...sheet, id: sheetId }),
    { merge: true }
  );
}

function parseRoleChangeRequest(
  docId: string,
  data: DocumentData
): RoleChangeRequest {
  const status = data.status;
  const normalizedStatus: RoleChangeRequestStatus =
    status === 'approved' || status === 'rejected' || status === 'pending'
      ? status
      : 'pending';

  return {
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    userId: data.userId ?? '',
    userName: data.userName,
    userEmail: data.userEmail,
    currentRole: data.currentRole ?? '',
    requestedRole: data.requestedRole ?? '',
    status: normalizedStatus,
    createdAt: data.createdAt ?? '',
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy,
    reviewedByName: data.reviewedByName,
    rejectionReason:
      typeof data.rejectionReason === 'string' ? data.rejectionReason : undefined,
  };
}

export function subscribeToRoleChangeRequests(
  onData: (requests: RoleChangeRequest[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(firestore, FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION),
    (snapshot) => {
      const requests = snapshot.docs.map((d) =>
        parseRoleChangeRequest(d.id, d.data())
      );
      requests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onData(requests);
    },
    (err) => onError?.(err)
  );
}

export async function reviewRoleChangeRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewer: { uid: string; name?: string },
  rejectionReason?: string
): Promise<void> {
  const ref = doc(
    firestore,
    FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION,
    requestId
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Role change request not found');
  const data = snap.data();
  const now = new Date().toISOString();

  const update: DocumentData = {
    status: decision,
    reviewedAt: now,
    reviewedBy: reviewer.uid,
    reviewedByName: reviewer.name ?? '',
  };
  if (decision === 'rejected' && rejectionReason) {
    update.rejectionReason = rejectionReason;
  }

  await updateDoc(ref, update);

  if (decision === 'approved' && data.userId && data.requestedRole) {
    await updateUserRole(
      data.userId,
      normalizeUserRole(data.requestedRole)
    );
  }
}

export async function createRoleChangeRequest(input: {
  userId: string;
  userName?: string;
  userEmail?: string;
  currentRole: UserRole | string;
  requestedRole: UserRole | string;
}): Promise<string> {
  if (!REQUESTABLE_ROLES.includes(normalizeUserRole(input.requestedRole))) {
    throw new Error('Requested role is not allowed');
  }
  if (normalizeUserRole(input.requestedRole) === 'admin') {
    throw new Error('Admin role cannot be requested');
  }

  const pending = await getPendingRoleRequestForUser(input.userId);
  if (pending) {
    throw new Error('You already have a pending role request');
  }

  const id = `role-req-${Date.now()}`;
  const payload: DocumentData = {
    id,
    userId: input.userId,
    userName: input.userName ?? '',
    userEmail: input.userEmail ?? '',
    currentRole: input.currentRole,
    requestedRole: normalizeUserRole(input.requestedRole),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(firestore, FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION, id), payload);
  return id;
}

export async function getPendingRoleRequestForUser(
  userId: string
): Promise<RoleChangeRequest | null> {
  const snapshot = await getDocs(
    query(
      collection(firestore, FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION),
      where('userId', '==', userId)
    )
  );
  const pending = snapshot.docs
    .map((d) => parseRoleChangeRequest(d.id, d.data()))
    .find((r) => r.status === 'pending');
  return pending ?? null;
}

export function subscribeToMyRoleChangeRequests(
  userId: string,
  onData: (requests: RoleChangeRequest[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(
      collection(firestore, FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION),
      where('userId', '==', userId)
    ),
    (snapshot) => {
      const requests = snapshot.docs.map((d) =>
        parseRoleChangeRequest(d.id, d.data())
      );
      requests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onData(requests);
    },
    (err) => onError?.(err)
  );
}

export async function cancelRoleChangeRequest(
  requestId: string,
  userId: string
): Promise<void> {
  const ref = doc(firestore, FIRESTORE_ROLE_CHANGE_REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');
  const data = snap.data();
  if (data.userId !== userId) throw new Error('Not allowed');
  if (data.status !== 'pending') throw new Error('Only pending requests can be cancelled');
  await deleteDoc(ref);
}

function parseSiteChangeRequest(
  docId: string,
  data: DocumentData
): SiteChangeRequest {
  const status = data.status;
  const normalizedStatus: RoleChangeRequestStatus =
    status === 'approved' || status === 'rejected' || status === 'pending'
      ? status
      : 'pending';

  return {
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    userId: data.userId ?? '',
    userName: data.userName,
    userEmail: data.userEmail,
    currentSiteIds: Array.isArray(data.currentSiteIds)
      ? data.currentSiteIds.filter((x: unknown): x is string => typeof x === 'string')
      : [],
    requestedSiteIds: Array.isArray(data.requestedSiteIds)
      ? data.requestedSiteIds.filter((x: unknown): x is string => typeof x === 'string')
      : [],
    status: normalizedStatus,
    createdAt: data.createdAt ?? '',
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy,
    reviewedByName: data.reviewedByName,
    rejectionReason:
      typeof data.rejectionReason === 'string' ? data.rejectionReason : undefined,
  };
}

export function subscribeToSiteChangeRequests(
  onData: (requests: SiteChangeRequest[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(firestore, FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION),
    (snapshot) => {
      const requests = snapshot.docs.map((d) =>
        parseSiteChangeRequest(d.id, d.data())
      );
      requests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onData(requests);
    },
    (err) => onError?.(err)
  );
}

export function subscribeToMySiteChangeRequests(
  userId: string,
  onData: (requests: SiteChangeRequest[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    query(
      collection(firestore, FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION),
      where('userId', '==', userId)
    ),
    (snapshot) => {
      const requests = snapshot.docs.map((d) =>
        parseSiteChangeRequest(d.id, d.data())
      );
      requests.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onData(requests);
    },
    (err) => onError?.(err)
  );
}

export async function createSiteChangeRequest(input: {
  userId: string;
  userName?: string;
  userEmail?: string;
  currentSiteIds: string[];
  requestedSiteIds: string[];
}): Promise<string> {
  if (!Array.isArray(input.requestedSiteIds) || input.requestedSiteIds.length === 0) {
    throw new Error('Select at least one site');
  }

  const pendingSnap = await getDocs(
    query(
      collection(firestore, FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION),
      where('userId', '==', input.userId)
    )
  );
  const hasPending = pendingSnap.docs
    .map((d) => parseSiteChangeRequest(d.id, d.data()))
    .some((r) => r.status === 'pending');
  if (hasPending) throw new Error('You already have a pending site request');

  const id = `site-req-${Date.now()}`;
  const payload: DocumentData = {
    id,
    userId: input.userId,
    userName: input.userName ?? '',
    userEmail: input.userEmail ?? '',
    currentSiteIds: input.currentSiteIds,
    requestedSiteIds: input.requestedSiteIds,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(firestore, FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION, id), payload);
  return id;
}

export async function cancelSiteChangeRequest(
  requestId: string,
  userId: string
): Promise<void> {
  const ref = doc(firestore, FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');
  const data = snap.data();
  if (data.userId !== userId) throw new Error('Not allowed');
  if (data.status !== 'pending') throw new Error('Only pending requests can be cancelled');
  await deleteDoc(ref);
}

export async function reviewSiteChangeRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewer: { uid: string; name?: string },
  rejectionReason?: string
): Promise<void> {
  const ref = doc(firestore, FIRESTORE_SITE_CHANGE_REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Site change request not found');
  const data = snap.data();
  const now = new Date().toISOString();

  const update: DocumentData = {
    status: decision,
    reviewedAt: now,
    reviewedBy: reviewer.uid,
    reviewedByName: reviewer.name ?? '',
  };
  if (decision === 'rejected' && rejectionReason) {
    update.rejectionReason = rejectionReason;
  }
  await updateDoc(ref, update);

  if (decision === 'approved' && data.userId && Array.isArray(data.requestedSiteIds)) {
    await updateDoc(userDocRef(data.userId), {
      assignedSiteIds: data.requestedSiteIds,
      updatedAt: now,
    });
  }
}

/** Admin direct override of a user's assigned sites. */
export async function updateUserAssignedSites(
  userId: string,
  assignedSiteIds: string[]
): Promise<void> {
  await updateDoc(userDocRef(userId), {
    assignedSiteIds,
    updatedAt: new Date().toISOString(),
  });
}

/** Admin direct override of a logistics operador's accounts. */
export async function updateUserAssignedLogistics(
  userId: string,
  assignedLogisticsIds: string[]
): Promise<void> {
  await updateDoc(userDocRef(userId), {
    assignedLogisticsIds,
    updatedAt: new Date().toISOString(),
  });
}

function parseCatalogSite(docId: string, data: DocumentData): CatalogSite {
  const code =
    typeof data.code === 'string' && data.code
      ? data.code
      : typeof data.formCodigo === 'string'
        ? data.formCodigo
        : docId;
  const name =
    typeof data.name === 'string' && data.name
      ? data.name
      : typeof data.labelEs === 'string'
        ? data.labelEs
        : code;

  return {
    id: docId,
    code,
    formCodigo: typeof data.formCodigo === 'string' ? data.formCodigo : undefined,
    name,
    labelEn: typeof data.labelEn === 'string' ? data.labelEn : undefined,
    labelEs: typeof data.labelEs === 'string' ? data.labelEs : undefined,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    active: data.active !== false,
  };
}

export function subscribeToSites(
  onData: (sites: CatalogSite[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(firestore, FIRESTORE_SITES_COLLECTION),
    (snapshot) => {
      let sites = snapshot.docs
        .map((d) => parseCatalogSite(d.id, d.data()))
        .filter((s) => s.active !== false);
      if (sites.length === 0) {
        sites = [...FALLBACK_SITES];
      }
      sites.sort(
        (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
      );
      onData(sites);
    },
    (err) => {
      // Fall back so Profile/create still work offline of catalog rules.
      onData([...FALLBACK_SITES]);
      onError?.(err);
    }
  );
}

/** Admin: seed fallback sites into Firestore catalog if missing. */
export async function seedDefaultSites(): Promise<number> {
  let written = 0;
  for (const site of FALLBACK_SITES) {
    const ref = doc(firestore, FIRESTORE_SITES_COLLECTION, site.id);
    const snap = await getDoc(ref);
    if (snap.exists()) continue;
    await setDoc(ref, {
      code: site.code,
      formCodigo: site.formCodigo ?? site.code,
      name: site.name,
      labelEn: site.labelEn ?? site.name,
      labelEs: site.labelEs ?? site.name,
      sortOrder: site.sortOrder ?? 0,
      active: true,
    });
    written += 1;
  }
  return written;
}

export async function upsertCatalogSite(site: CatalogSite): Promise<void> {
  const id = site.id || site.code.toLowerCase().replace(/\s+/g, '-');
  await setDoc(
    doc(firestore, FIRESTORE_SITES_COLLECTION, id),
    {
      code: site.code,
      formCodigo: site.formCodigo ?? site.code,
      name: site.name,
      labelEn: site.labelEn ?? site.name,
      labelEs: site.labelEs ?? site.name,
      sortOrder: site.sortOrder ?? 0,
      active: site.active !== false,
    },
    { merge: true }
  );
}

