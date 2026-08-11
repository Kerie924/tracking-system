export type MaterialType =
  | 'PLAYO'
  | 'CARTON'
  | 'RSU'
  | 'TARIMAS'
  | 'TUBO_CARTON'
  | 'ORGANICOS'
  | 'CHATARRA'
  | 'OTRO';

export type UserRole =
  | 'elaboro'
  | 'supervisor'
  | 'meli'
  | 'operador'
  | 'cliente'
  | 'admin';

export type ServiceSheetStatus =
  | 'draft'
  | 'pending_supervisor'
  | 'pending_meli'
  | 'pending_process2'
  | 'pending_cliente'
  | 'completed'
  | 'approved'
  | 'rejected'
  /** @deprecated legacy dashboard statuses */
  | 'validated'
  | 'authorized';

export type RoleChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export type Language = 'en' | 'es';

export type SheetSource = 'manual' | 'ocr';

export interface FirmaEntry {
  filled?: boolean;
  value?: string | null;
  nombre?: string | null;
  nombre_probable?: string | null;
}

export type SheetFirmas = Record<string, FirmaEntry | undefined>;

export interface ServiceSheetMaterial {
  materialType: MaterialType | string;
  customMaterialName?: string;
  quantity: number;
  /** Unit of measure — stored in Firestore as `unit` (e.g. bulk) */
  unitOfMeasure?: string;
  /** @deprecated Prefer sheet.packagingType; kept for legacy docs */
  unit?: string;
  kilograms?: number;
  selected?: boolean;
}

export interface ServiceSheet {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  folio: string;
  codigo: string;
  fecha: string;
  createdAt: string;
  status?: ServiceSheetStatus;
  createdBy?: string;
  createdByName?: string;
  /** Container / vehicle packaging — Firestore `packagingType` (e.g. dryBox) */
  packagingType?: string;
  operatorId?: string;
  autoriza?: string;
  elaboro?: string;
  entrega?: string;
  recibe?: string;
  recibio?: string;
  responsableSup?: string;
  operatorName?: string;
  sealNumber?: string;
  siteId?: string;
  siteName?: string;
  source?: SheetSource | string;
  photoUri?: string;
  sheetJson?: Record<string, unknown>;
  firmas?: SheetFirmas;
  rejectionReason?: string;
  trailerPlates?: string;
  vehiclePlates?: string;
  latitude?: number;
  longitude?: number;
  siteEntryTime?: string;
  siteExitTime?: string;
  warehouseEntryTime?: string;
  warehouseExitTime?: string;
  elaboroSignedAt?: string;
  supervisorSignedAt?: string;
  supervisorUserId?: string;
  meliSignedAt?: string;
  meliUserId?: string;
  operadorSignedAt?: string;
  operadorUserId?: string;
  clienteSignedAt?: string;
  clienteUserId?: string;
  process2CompletedAt?: string;
  process2CompletedBy?: string;
  process2CompletedByName?: string;
  materials: ServiceSheetMaterial[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  language: Language;
  createdAt: string;
  assignedSiteIds?: string[];
  updatedAt?: string;
}

export interface RoleChangeRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  currentRole: UserRole | string;
  requestedRole: UserRole | string;
  status: RoleChangeRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  rejectionReason?: string;
}

export interface SiteChangeRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  currentSiteIds: string[];
  requestedSiteIds: string[];
  status: RoleChangeRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  rejectionReason?: string;
}

export interface CatalogSite {
  id: string;
  code: string;
  formCodigo?: string;
  name: string;
  labelEn?: string;
  labelEs?: string;
  sortOrder?: number;
  active?: boolean;
}

/** Fallback sites when Firestore catalog is empty. */
export const FALLBACK_SITES: CatalogSite[] = [
  {
    id: 'mxcd-13',
    code: 'MXCD-13',
    formCodigo: 'MXCD-13',
    name: 'MXCD-13',
    labelEs: 'MXCD-13',
    labelEn: 'MXCD-13',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'cedis-norte',
    code: 'CEDIS-NORTE',
    name: 'CEDIS Norte',
    labelEs: 'CEDIS Norte',
    labelEn: 'CEDIS Norte',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'cedis-centro',
    code: 'CEDIS-CENTRO',
    name: 'CEDIS Centro',
    labelEs: 'CEDIS Centro',
    labelEn: 'CEDIS Centro',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'cedis-sur',
    code: 'CEDIS-SUR',
    name: 'CEDIS Sur',
    labelEs: 'CEDIS Sur',
    labelEn: 'CEDIS Sur',
    sortOrder: 4,
    active: true,
  },
];

export function canRequestSiteAssignment(role: UserRole): boolean {
  return role === 'supervisor' || role === 'meli';
}

export function siteDisplayName(site: CatalogSite, lang: Language = 'es'): string {
  if (lang === 'en' && site.labelEn) return site.labelEn;
  if (lang === 'es' && site.labelEs) return site.labelEs;
  return site.name || site.code || site.id;
}

/** Match a catalog site from OCR / form codes like MXCD-13. */
export function matchCatalogSite(
  sites: CatalogSite[],
  codeOrId?: string | null
): CatalogSite | undefined {
  if (!codeOrId?.trim()) return undefined;
  const raw = codeOrId.trim();
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  const compact = upper.replace(/[^A-Z0-9]/g, '');
  return sites.find((s) => {
    const code = (s.code || '').toUpperCase();
    const form = (s.formCodigo || '').toUpperCase();
    return (
      s.id === raw ||
      s.id === lower ||
      code === upper ||
      form === upper ||
      code.replace(/[^A-Z0-9]/g, '') === compact ||
      form.replace(/[^A-Z0-9]/g, '') === compact
    );
  });
}

/**
 * Stamp signature / Process-2 metadata when advancing status.
 */
export function applyStatusTransition(
  sheet: ServiceSheet,
  nextStatus: ServiceSheetStatus,
  actor: { uid: string; name?: string; role: UserRole }
): ServiceSheet {
  const now = new Date().toISOString();
  const name = (actor.name || '').trim();
  const updated: ServiceSheet = { ...sheet, status: nextStatus };

  if (nextStatus === 'pending_supervisor') {
    updated.elaboroSignedAt = sheet.elaboroSignedAt ?? now;
    if (name) updated.elaboro = name;
  } else if (nextStatus === 'pending_meli') {
    updated.supervisorSignedAt = now;
    updated.supervisorUserId = actor.uid;
    if (name) updated.responsableSup = name;
  } else if (nextStatus === 'pending_process2') {
    updated.meliSignedAt = now;
    updated.meliUserId = actor.uid;
    if (name) updated.autoriza = name;
  } else if (nextStatus === 'pending_cliente') {
    updated.operadorSignedAt = now;
    updated.operadorUserId = actor.uid;
    if (name) {
      updated.recibio = name;
      updated.entrega = name;
    }
  } else if (nextStatus === 'completed') {
    updated.clienteSignedAt = now;
    updated.clienteUserId = actor.uid;
    updated.process2CompletedAt = now;
    updated.process2CompletedBy = actor.uid;
    if (name) {
      updated.recibe = name;
      updated.process2CompletedByName = name;
    }
  }

  return updated;
}

export interface DashboardStats {
  totalSheets: number;
  todaySheets: number;
  totalQuantity: number;
  /** Sum of material kilograms across sheets */
  totalKilograms: number;
  activeSites: number;
  activeUsers: number;
  byMaterial: Record<MaterialType, number>;
  /** Kilograms per material type */
  byMaterialKg: Record<MaterialType, number>;
  bySite: Record<string, number>;
}

export const MATERIAL_TYPES = [
  { id: 'PLAYO' as const, color: '#6366f1', unit: 'kg' },
  { id: 'CARTON' as const, color: '#f59e0b', unit: 'kg' },
  { id: 'RSU' as const, color: '#6b7280', unit: 'kg' },
  { id: 'TARIMAS' as const, color: '#92400e', unit: 'pzas' },
  { id: 'TUBO_CARTON' as const, color: '#d97706', unit: 'pzas' },
  { id: 'ORGANICOS' as const, color: '#16a34a', unit: 'kg' },
  { id: 'CHATARRA' as const, color: '#64748b', unit: 'kg' },
  { id: 'OTRO' as const, color: '#94a3b8', unit: 'kg' },
] as const;

/** Maps legacy / OCR material keys to the standard types */
const MATERIAL_ALIASES: Record<string, MaterialType> = {
  PLAYO: 'PLAYO',
  CARTON: 'CARTON',
  CARTÓN: 'CARTON',
  RSU: 'RSU',
  TARIMAS: 'TARIMAS',
  TARIMA: 'TARIMAS',
  TUBO_CARTON: 'TUBO_CARTON',
  'TUBO DE CARTON': 'TUBO_CARTON',
  'TUBO DE CARTÓN': 'TUBO_CARTON',
  ORGANICOS: 'ORGANICOS',
  ORGÁNICOS: 'ORGANICOS',
  ORGANICO: 'ORGANICOS',
  ORGÁNICO: 'ORGANICOS',
  CHATARRA: 'CHATARRA',
  OTRO: 'OTRO',
  OTHER: 'OTRO',
  POLIETILENO: 'PLAYO',
  BASURA: 'RSU',
};

export const USER_ROLES: UserRole[] = [
  'elaboro',
  'supervisor',
  'meli',
  'operador',
  'cliente',
  'admin',
];

export const REQUESTABLE_ROLES: UserRole[] = [
  'elaboro',
  'supervisor',
  'meli',
  'operador',
  'cliente',
];

export const SERVICE_SHEET_STATUSES: ServiceSheetStatus[] = [
  'draft',
  'pending_supervisor',
  'pending_meli',
  'pending_process2',
  'pending_cliente',
  'completed',
  'rejected',
];

const LEGACY_ROLES = new Set(['owner', 'user', 'customer', 'advisor']);

/** Maps Firestore / legacy roles onto the mobile role model. */
export function normalizeUserRole(role: unknown): UserRole {
  if (
    role === 'elaboro' ||
    role === 'supervisor' ||
    role === 'meli' ||
    role === 'operador' ||
    role === 'cliente' ||
    role === 'admin'
  ) {
    return role;
  }
  if (role === 'owner') return 'admin';
  if (role === 'advisor') return 'supervisor';
  if (role === 'customer' || role === 'user') return 'elaboro';
  if (role == null || role === '') return 'elaboro';
  return 'elaboro';
}

export function isLegacyRole(role: unknown): boolean {
  return typeof role === 'string' && LEGACY_ROLES.has(role);
}

export function normalizeSheetStatus(status: unknown): ServiceSheetStatus {
  if (status === 'approved') return 'completed';
  if (status === 'validated') return 'pending_supervisor';
  if (status === 'authorized') return 'pending_meli';
  if (
    status === 'draft' ||
    status === 'pending_supervisor' ||
    status === 'pending_meli' ||
    status === 'pending_process2' ||
    status === 'pending_cliente' ||
    status === 'completed' ||
    status === 'rejected'
  ) {
    return status;
  }
  return 'draft';
}

export function getSheetStatus(sheet: Pick<ServiceSheet, 'status'>): ServiceSheetStatus {
  return normalizeSheetStatus(sheet.status);
}

/** Owner of the sheet for access checks (createdBy preferred). */
export function getSheetOwnerId(sheet: Pick<ServiceSheet, 'userId' | 'createdBy'>): string {
  return sheet.createdBy || sheet.userId;
}

export function canViewAllSheets(_role: UserRole): boolean {
  return true;
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export function canReviewRoleRequests(role: UserRole): boolean {
  return role === 'admin';
}

export function canCreateServiceSheet(_role: UserRole): boolean {
  // MD §13: any signed-in user may create when createdBy == auth.uid.
  // Role still gates approval / Process 2 / admin queues.
  return true;
}

export function canEditSheet(
  role: UserRole,
  sheet: Pick<ServiceSheet, 'userId' | 'createdBy' | 'status'>,
  userId: string
): boolean {
  const status = getSheetStatus(sheet);
  const ownerId = getSheetOwnerId(sheet);
  if (role === 'admin') return status !== 'completed';
  if (role === 'elaboro') {
    return ownerId === userId && (status === 'draft' || status === 'rejected');
  }
  return false;
}

export function getNextSheetStatus(
  status: ServiceSheetStatus
): ServiceSheetStatus | null {
  const current = normalizeSheetStatus(status);
  if (current === 'draft' || current === 'rejected') return 'pending_supervisor';
  if (current === 'pending_supervisor') return 'pending_meli';
  if (current === 'pending_meli') return 'pending_process2';
  if (current === 'pending_process2') return 'pending_cliente';
  if (current === 'pending_cliente') return 'completed';
  return null;
}

export function canAccessSheetSite(
  role: UserRole,
  sheetOrSiteId:
    | string
    | undefined
    | Pick<ServiceSheet, 'siteId' | 'codigo' | 'siteName'>,
  assignedSiteIds: string[] = [],
  sites: CatalogSite[] = FALLBACK_SITES
): boolean {
  if (role !== 'supervisor' && role !== 'meli') return true;
  if (!assignedSiteIds.length) return false;

  const siteId =
    typeof sheetOrSiteId === 'string' || sheetOrSiteId == null
      ? sheetOrSiteId
      : sheetOrSiteId.siteId;
  const codigo =
    typeof sheetOrSiteId === 'object' && sheetOrSiteId
      ? sheetOrSiteId.codigo
      : undefined;
  const siteName =
    typeof sheetOrSiteId === 'object' && sheetOrSiteId
      ? sheetOrSiteId.siteName
      : undefined;

  if (!siteId && !codigo && !siteName) return false;

  const assignedKeys = new Set<string>();
  for (const id of assignedSiteIds) {
    const raw = id.trim();
    if (!raw) continue;
    assignedKeys.add(raw.toLowerCase());
    const site = matchCatalogSite(sites, raw);
    if (site) {
      assignedKeys.add(site.id.toLowerCase());
      if (site.code) assignedKeys.add(site.code.toLowerCase());
      if (site.formCodigo) assignedKeys.add(site.formCodigo.toLowerCase());
    }
  }

  const candidates = [siteId, codigo, siteName]
    .map((v) => v?.trim().toLowerCase())
    .filter((v): v is string => !!v);

  return candidates.some((c) => assignedKeys.has(c));
}

export function canAdvanceSheetStatus(
  role: UserRole,
  sheet: Pick<
    ServiceSheet,
    'userId' | 'createdBy' | 'status' | 'siteId' | 'codigo' | 'siteName'
  >,
  userId: string,
  nextStatus: ServiceSheetStatus,
  assignedSiteIds: string[] = [],
  sites: CatalogSite[] = FALLBACK_SITES
): boolean {
  const current = getSheetStatus(sheet);
  if (getNextSheetStatus(current) !== nextStatus) return false;
  if (role === 'admin') return true;

  if (nextStatus === 'pending_supervisor') {
    return (
      role === 'elaboro' &&
      getSheetOwnerId(sheet) === userId &&
      (current === 'draft' || current === 'rejected')
    );
  }
  if (nextStatus === 'pending_meli') {
    return (
      role === 'supervisor' &&
      current === 'pending_supervisor' &&
      canAccessSheetSite(role, sheet, assignedSiteIds, sites)
    );
  }
  if (nextStatus === 'pending_process2') {
    return (
      role === 'meli' &&
      current === 'pending_meli' &&
      canAccessSheetSite(role, sheet, assignedSiteIds, sites)
    );
  }
  if (nextStatus === 'pending_cliente') {
    return role === 'operador' && current === 'pending_process2';
  }
  if (nextStatus === 'completed') {
    return role === 'cliente' && current === 'pending_cliente';
  }
  return false;
}

export function canRejectSheet(
  role: UserRole,
  sheet: Pick<ServiceSheet, 'status' | 'siteId' | 'codigo' | 'siteName'>,
  assignedSiteIds: string[] = [],
  sites: CatalogSite[] = FALLBACK_SITES
): boolean {
  const status = getSheetStatus(sheet);
  if (role === 'admin') {
    return (
      status === 'pending_supervisor' ||
      status === 'pending_meli' ||
      status === 'pending_cliente'
    );
  }
  if (role === 'supervisor' && status === 'pending_supervisor') {
    return canAccessSheetSite(role, sheet, assignedSiteIds, sites);
  }
  if (role === 'meli' && status === 'pending_meli') {
    return canAccessSheetSite(role, sheet, assignedSiteIds, sites);
  }
  if (role === 'cliente' && status === 'pending_cliente') return true;
  return false;
}

export function firmaDisplayName(entry?: FirmaEntry | null): string | undefined {
  if (!entry) return undefined;
  const value = entry.value ?? entry.nombre ?? entry.nombre_probable;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

/**
 * First approval firma with filled !== true decides pending status.
 * Per WEB_DEVELOPER_WORKFLOW.md §8.
 */
export function resolveStatusFromFirmas(
  firmas?: SheetFirmas | null
): ServiceSheetStatus {
  if (!firmas || typeof firmas !== 'object') return 'pending_supervisor';

  const gates: { key: string; status: ServiceSheetStatus }[] = [
    { key: 'responsable_supervisor', status: 'pending_supervisor' },
    { key: 'autoriza_melii', status: 'pending_meli' },
    { key: 'recibio_y_entrego_operador', status: 'pending_process2' },
    { key: 'recibio_cliente', status: 'pending_cliente' },
  ];

  let sawBooleanFilled = false;
  for (const { key, status } of gates) {
    const entry = firmas[key];
    if (entry && typeof entry.filled === 'boolean') sawBooleanFilled = true;
    if (!entry || entry.filled !== true) return status;
  }

  return sawBooleanFilled ? 'completed' : 'pending_supervisor';
}

export function applyFirmasToSheet(
  sheet: ServiceSheet,
  firmas?: SheetFirmas | null
): ServiceSheet {
  if (!firmas) return sheet;
  const now = new Date().toISOString();
  const next: ServiceSheet = { ...sheet, firmas };

  const elaboro = firmaDisplayName(firmas.elaboro_plastict);
  if (elaboro) {
    next.elaboro = elaboro;
    next.elaboroSignedAt = next.elaboroSignedAt ?? now;
  }
  const sup = firmaDisplayName(firmas.responsable_supervisor);
  if (sup && firmas.responsable_supervisor?.filled === true) {
    next.responsableSup = sup;
    next.supervisorSignedAt = next.supervisorSignedAt ?? now;
  }
  const meli = firmaDisplayName(firmas.autoriza_melii);
  if (meli && firmas.autoriza_melii?.filled === true) {
    next.autoriza = meli;
    next.meliSignedAt = next.meliSignedAt ?? now;
  }
  const op = firmaDisplayName(firmas.recibio_y_entrego_operador);
  if (op && firmas.recibio_y_entrego_operador?.filled === true) {
    next.recibio = op;
    next.entrega = op;
    next.operadorSignedAt = next.operadorSignedAt ?? now;
  }
  const cliente = firmaDisplayName(firmas.recibio_cliente);
  if (cliente && firmas.recibio_cliente?.filled === true) {
    next.recibe = cliente;
    next.clienteSignedAt = next.clienteSignedAt ?? now;
  }
  return next;
}

export function validateSheetForStatus(
  sheet: ServiceSheet,
  status: ServiceSheetStatus
): string | null {
  const target = normalizeSheetStatus(status);
  if (
    target === 'pending_supervisor' ||
    target === 'pending_meli' ||
    target === 'draft'
  ) {
    if (!sheet.folio?.trim() && !sheet.codigo?.trim()) return 'folio';
  }
  if (target === 'pending_cliente') {
    if (!(sheet.recibio?.trim() || sheet.entrega?.trim())) return 'recibio';
  }
  if (target === 'completed') {
    if (!sheet.recibe?.trim() && !sheet.clienteSignedAt) return 'recibe';
  }
  return null;
}

export function normalizeMaterialType(type: string): MaterialType | null {
  const key = type.trim().toUpperCase();
  if (MATERIAL_TYPES.some((m) => m.id === key)) return key as MaterialType;
  return MATERIAL_ALIASES[key] ?? null;
}

function resolveMaterialTypeFromIndex(index: number): MaterialType | null {
  return MATERIAL_TYPES[index]?.id ?? null;
}

function parseMaterialRecord(
  raw: Record<string, unknown>,
  fallbackKey?: string,
  index?: number
): ServiceSheetMaterial | null {
  const typeCandidate = String(
    raw.materialType ??
      raw.type ??
      raw.name ??
      raw.material ??
      raw.id ??
      raw.key ??
      fallbackKey ??
      ''
  );

  let materialType = normalizeMaterialType(typeCandidate);
  if (!materialType && typeof raw.index === 'number') {
    materialType = resolveMaterialTypeFromIndex(raw.index - 1);
  }
  if (!materialType && index !== undefined) {
    materialType = resolveMaterialTypeFromIndex(index);
  }
  if (!materialType && fallbackKey) {
    materialType = normalizeMaterialType(fallbackKey);
  }
  if (!materialType) return null;

  const quantity = Number(
    raw.quantity ?? raw.qty ?? raw.amount ?? raw.value ?? raw.count ?? 0
  );

  const selectedFields = ['selected', 'checked', 'matched', 'isSelected', 'isChecked'] as const;
  let selected: boolean | undefined;
  for (const field of selectedFields) {
    if (typeof raw[field] === 'boolean') {
      selected = raw[field];
      break;
    }
  }

  return {
    materialType,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    ...resolveMaterialUnitFields(raw),
    selected,
  };
}

export function parseServiceSheetMaterials(raw: unknown): ServiceSheetMaterial[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item, index) =>
        item && typeof item === 'object'
          ? parseMaterialRecord(item as Record<string, unknown>, undefined, index)
          : null
      )
      .filter((item): item is ServiceSheetMaterial => item !== null);
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .map(([key, value]) => {
        if (value && typeof value === 'object') {
          return parseMaterialRecord(value as Record<string, unknown>, key);
        }
        if (typeof value === 'number') {
          const materialType = normalizeMaterialType(key);
          if (!materialType) return null;
          return { materialType, quantity: value };
        }
        return null;
      })
      .filter((item): item is ServiceSheetMaterial => item !== null);
  }

  return [];
}

export function createEmptyMaterialMap(): Record<MaterialType, number> {
  return {
    PLAYO: 0,
    CARTON: 0,
    RSU: 0,
    TARIMAS: 0,
    TUBO_CARTON: 0,
    ORGANICOS: 0,
    CHATARRA: 0,
    OTRO: 0,
  };
}

export function getMaterialQuantitiesMap(
  sheet: ServiceSheet
): Record<MaterialType, number> {
  const map = createEmptyMaterialMap();
  for (const m of sheet.materials ?? []) {
    const key = normalizeMaterialType(String(m.materialType));
    if (key) map[key] += m.quantity || 0;
  }
  return map;
}

export interface MaterialSheetEntry {
  matched: boolean;
  quantity: number;
  unitOfMeasure?: string;
  unit?: string;
  kilograms?: number;
  units: string[];
}

export function getMaterialDetailsMap(
  sheet: ServiceSheet
): Record<MaterialType, MaterialSheetEntry> {
  const map = MATERIAL_TYPES.reduce(
    (acc, m) => {
      acc[m.id] = { matched: false, quantity: 0, units: [] };
      return acc;
    },
    {} as Record<MaterialType, MaterialSheetEntry>
  );

  for (const m of sheet.materials ?? []) {
    const key = normalizeMaterialType(String(m.materialType));
    if (!key) continue;
    map[key].matched = true;
    map[key].quantity += m.quantity || 0;
    if (m.unitOfMeasure) {
      map[key].unitOfMeasure = map[key].unitOfMeasure ?? m.unitOfMeasure;
    }
    // Mobile stores measure in `unit`; legacy may still use unitOfMeasure
    if (!map[key].unitOfMeasure && m.unit) {
      if (matchesAnyUnitOption(m.unit, ALL_UNIT_OF_MEASURE_OPTIONS)) {
        map[key].unitOfMeasure = m.unit;
      }
    }
    const container = extractContainerUnit(m);
    if (
      container &&
      !matchesAnyUnitOption(container, ALL_UNIT_OF_MEASURE_OPTIONS) &&
      !map[key].units.includes(container)
    ) {
      map[key].units.push(container);
      map[key].unit = map[key].unit ?? container;
    }
    if (typeof m.kilograms === 'number' && Number.isFinite(m.kilograms)) {
      map[key].kilograms = (map[key].kilograms ?? 0) + m.kilograms;
    }
  }

  // Sheet-level packagingType (e.g. dryBox) applies to selected materials
  if (sheet.packagingType) {
    for (const key of Object.keys(map) as MaterialType[]) {
      if (!map[key].matched) continue;
      if (!map[key].units.includes(sheet.packagingType)) {
        map[key].units.push(sheet.packagingType);
      }
      map[key].unit = map[key].unit ?? sheet.packagingType;
    }
  }

  return map;
}

function firstStringField(
  raw: Record<string, unknown>,
  fields: string[]
): string | undefined {
  for (const field of fields) {
    const value = raw[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function extractKilograms(raw: Record<string, unknown>): number | undefined {
  const value = raw.kilograms ?? raw.kg ?? raw.weightKg ?? raw.peso ?? raw.weight;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** Container / vehicle unit (Unidad column) */
function extractContainerUnit(
  m: ServiceSheetMaterial | Record<string, unknown>
): string | undefined {
  const raw = m as Record<string, unknown>;
  return firstStringField(raw, [
    'unit',
    'unidad',
    'containerUnit',
    'unidadContenedor',
  ]);
}

/** Unit of measure (Unidad de medida column) */
function extractUnitOfMeasure(
  m: ServiceSheetMaterial | Record<string, unknown>
): string | undefined {
  const raw = m as Record<string, unknown>;
  return firstStringField(raw, [
    'unitOfMeasure',
    'measureUnit',
    'unitMeasure',
    'unidadMedida',
    'measure',
  ]);
}

function resolveMaterialUnitFields(
  raw: Record<string, unknown>
): Pick<ServiceSheetMaterial, 'unit' | 'unitOfMeasure' | 'kilograms'> {
  const explicitUnit = extractContainerUnit(raw);
  const explicitMeasure = extractUnitOfMeasure(raw);
  const legacyUnit = firstStringField(raw, [
    'unit',
    'unidad',
    'unitOfMeasure',
    'measureUnit',
    'unitMeasure',
    'unidadMedida',
    'measure',
    'unitType',
  ]);
  const kilograms = extractKilograms(raw);

  let unit = explicitUnit;
  let unitOfMeasure = explicitMeasure;

  // Legacy sheets stored both concepts in `unit` — route to the right field.
  if (!unit && !unitOfMeasure && legacyUnit) {
    if (matchesAnyUnitOption(legacyUnit, SERVICE_SHEET_UNIT_OPTIONS)) {
      unit = legacyUnit;
    } else if (matchesAnyUnitOption(legacyUnit, ALL_UNIT_OF_MEASURE_OPTIONS)) {
      unitOfMeasure = legacyUnit;
    } else {
      unit = legacyUnit;
    }
  } else if (unit && !unitOfMeasure && matchesAnyUnitOption(unit, ALL_UNIT_OF_MEASURE_OPTIONS)
    && !matchesAnyUnitOption(unit, SERVICE_SHEET_UNIT_OPTIONS)) {
    unitOfMeasure = unit;
    unit = undefined;
  }

  return {
    ...(unit ? { unit } : {}),
    ...(unitOfMeasure ? { unitOfMeasure } : {}),
    ...(kilograms !== undefined ? { kilograms } : {}),
  };
}

function matchesAnyUnitOption(stored: string, options: readonly string[]): boolean {
  return options.some((option) => matchesUnitOption(stored, option));
}

export function normalizeUnitLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, "'")
    .replace(/³/g, '3')
    .replace(/\u00b3/g, '3')
    .replace(/\s*m\s*3\b/g, 'm3')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9' ]/g, '');
}

/** Maps Firestore/mobile unit codes to a shared key for comparison */
export function canonicalUnitKey(value: string): string {
  const label = normalizeUnitLabel(value);
  if (!label) return '';

  if (['bales', 'bale', 'pacas', 'paca'].includes(label)) return 'pacas';
  if (
    label === 'cajaseca' ||
    label === 'caja seca' ||
    label === 'drybox' ||
    label === 'dry box'
  ) {
    return 'cajaseca';
  }
  if (label.includes('gaylord')) return 'gaylords';
  if (['remolque', 'trailer'].includes(label)) return 'remolque';
  if (['barcinas', 'barcina'].includes(label)) return 'barcinas';
  if (['cartucho', 'cartridge'].includes(label)) return 'cartucho';
  if (['otro', 'other'].includes(label)) return 'otro';
  if (['a granel', 'agranel', 'granel', 'bulk', 'a_granel'].includes(label)) {
    return 'agranel';
  }
  if (['torthon', 'torton'].includes(label)) return 'torthon';
  if (label === 'olla 17m3' || label === 'olla17m3') return 'olla17m3';
  if (['camioneta', 'pickup'].includes(label)) return 'camioneta';
  if (
    label.includes('contenedores cgr') ||
    label === 'contenedorescgr' ||
    label === 'cgr'
  ) {
    return 'contenedorescgr';
  }

  const tolvaCompact = label.match(/^tolva(\d+)m?3?$/);
  if (tolvaCompact) return `tolva${tolvaCompact[1]}m3`;

  const tolvaSpaced = label.match(/^tolva\s*(\d+)\s*m?3?$/);
  if (tolvaSpaced) return `tolva${tolvaSpaced[1]}m3`;

  const pieceLabels = new Set(['pz', 'pzas', 'pieza', 'piezas', 'pza']);
  if (pieceLabels.has(label)) return 'piezas';

  return label.replace(/\s/g, '');
}

export function matchesUnitOption(storedUnit: string | undefined, option: string): boolean {
  if (!storedUnit) return false;

  const storedKey = canonicalUnitKey(storedUnit);
  const optionKey = canonicalUnitKey(option);
  if (!storedKey || !optionKey) return false;
  if (storedKey === optionKey) return true;

  if (storedKey.includes(optionKey) || optionKey.includes(storedKey)) return true;

  return false;
}

/** Shared Unit (container) dropdown options for every material row */
export const SERVICE_SHEET_UNIT_OPTIONS = [
  'Caja seca',
  'Tolva 30m³',
  'Remolque',
  'Torthon',
  'Cartucho',
  'Olla 17m³',
  'Camioneta',
  'Tolva 7m³',
  'Contenedores CGR',
] as const;

export const OTHER_ROW_UNIT_OF_MEASURE = [
  'A granel',
  'Pacas',
  "Gaylord's",
  'Barcinas',
] as const;

const ALL_UNIT_OF_MEASURE_OPTIONS = [
  'A granel',
  'Pacas',
  "Gaylord's",
  'Barcinas',
  'Piezas',
  'Pz',
  'Otro',
] as const;

export const SERVICE_SHEET_MATERIAL_ROWS: {
  id: MaterialType;
  index: number;
  units: string[];
}[] = [
  {
    id: 'PLAYO',
    index: 1,
    units: ['A granel', 'Pacas', "Gaylord's", 'Barcinas'],
  },
  {
    id: 'CARTON',
    index: 2,
    units: ['A granel', "Gaylord's"],
  },
  {
    id: 'RSU',
    index: 3,
    units: ['A granel'],
  },
  {
    id: 'TARIMAS',
    index: 4,
    units: ['Piezas'],
  },
  {
    id: 'TUBO_CARTON',
    index: 5,
    units: ['Piezas'],
  },
  {
    id: 'ORGANICOS',
    index: 6,
    units: ['A granel'],
  },
  {
    id: 'CHATARRA',
    index: 7,
    units: ['A granel'],
  },
];

export function formatNumber(value: number, locale = 'es-MX'): string {
  return value.toLocaleString(locale);
}

export function getTotalQuantity(sheet: ServiceSheet): number {
  return Object.values(getMaterialQuantitiesMap(sheet)).reduce(
    (sum, qty) => sum + qty,
    0
  );
}

export function getPrimaryMaterial(sheet: ServiceSheet): string {
  const map = getMaterialQuantitiesMap(sheet);
  const top = MATERIAL_TYPES.map((m) => ({
    id: m.id,
    qty: map[m.id],
  })).sort((a, b) => b.qty - a.qty)[0];
  return top?.qty > 0 ? top.id : '—';
}

export function isKnownMaterialType(type: string): type is MaterialType {
  return normalizeMaterialType(type) !== null;
}

/** Unit-of-measure codes as stored by the mobile app (`materials[].unit`). */
export function unitOfMeasureToFirestoreCode(option: string): string {
  const key = canonicalUnitKey(option);
  const codes: Record<string, string> = {
    pacas: 'bales',
    gaylords: 'gaylords',
    barcinas: 'barcinas',
    otro: 'otro',
    piezas: 'pieces',
    agranel: 'bulk',
  };
  return codes[key] ?? key.replace(/\s/g, '');
}

/** Packaging / container codes as stored by the mobile app (`packagingType`). */
export function packagingOptionToFirestoreCode(option: string): string {
  const key = canonicalUnitKey(option);
  const codes: Record<string, string> = {
    cajaseca: 'dryBox',
    remolque: 'trailer',
    tolva30m3: 'tolva30',
    tolva7m3: 'tolva7',
    torthon: 'torthon',
    cartucho: 'cartucho',
    olla17m3: 'olla17',
    camioneta: 'camioneta',
    contenedorescgr: 'contenedoresCgr',
  };
  return codes[key] ?? key.replace(/\s/g, '');
}

/** @deprecated Prefer unitOfMeasureToFirestoreCode / packagingOptionToFirestoreCode */
export function unitOptionToFirestoreCode(option: string): string {
  const key = canonicalUnitKey(option);
  if (matchesAnyUnitOption(option, ALL_UNIT_OF_MEASURE_OPTIONS)) {
    return unitOfMeasureToFirestoreCode(option);
  }
  if (matchesAnyUnitOption(option, SERVICE_SHEET_UNIT_OPTIONS)) {
    return packagingOptionToFirestoreCode(option);
  }
  const codes: Record<string, string> = {
    pacas: 'bales',
    cajaseca: 'dryBox',
    gaylords: 'gaylords',
    remolque: 'trailer',
    barcinas: 'barcinas',
    cartucho: 'cartucho',
    otro: 'otro',
    tolva30m3: 'tolva30',
    tolva7m3: 'tolva7',
    piezas: 'pieces',
    agranel: 'bulk',
    torthon: 'torthon',
    olla17m3: 'olla17',
    camioneta: 'camioneta',
    contenedorescgr: 'contenedoresCgr',
  };
  return codes[key] ?? key.replace(/\s/g, '');
}

export function createEmptyServiceSheet(
  userId: string,
  userName?: string,
  userEmail?: string
): ServiceSheet {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  return {
    id: '',
    userId,
    userName,
    userEmail,
    createdBy: userId,
    createdByName: userName,
    folio: '',
    codigo: '',
    fecha: today,
    createdAt: now,
    status: 'draft',
    source: 'manual',
    materials: [],
  };
}

function upsertMaterial(
  sheet: ServiceSheet,
  materialType: MaterialType,
  patch: Partial<ServiceSheetMaterial>
): ServiceSheet {
  const materials = [...sheet.materials];
  const index = materials.findIndex(
    (m) => normalizeMaterialType(String(m.materialType)) === materialType
  );
  if (index === -1) {
    materials.push({ materialType, quantity: 0, ...patch });
  } else {
    materials[index] = { ...materials[index], ...patch };
  }
  return { ...sheet, materials };
}

export function toggleSheetMaterial(
  sheet: ServiceSheet,
  materialType: MaterialType,
  enabled: boolean
): ServiceSheet {
  const materials = sheet.materials.filter(
    (m) => normalizeMaterialType(String(m.materialType)) !== materialType
  );
  if (enabled) {
    materials.push({ materialType, quantity: 0 });
  }
  return { ...sheet, materials };
}

export function updateSheetMaterialQuantity(
  sheet: ServiceSheet,
  materialType: MaterialType,
  quantity: number
): ServiceSheet {
  return upsertMaterial(sheet, materialType, { quantity });
}

/** Updates unit of measure — stored on material as Firestore `unit`. */
export function updateSheetMaterialUnitOfMeasure(
  sheet: ServiceSheet,
  materialType: MaterialType,
  unitOption: string
): ServiceSheet {
  const code = unitOfMeasureToFirestoreCode(unitOption);
  return upsertMaterial(sheet, materialType, {
    unitOfMeasure: code,
    unit: code,
  });
}

/** Resolve Firestore measure unit code (e.g. bulk) back to a UI option label. */
export function resolveUnitOfMeasureOption(
  stored?: string,
  options: readonly string[] = ALL_UNIT_OF_MEASURE_OPTIONS
): string {
  if (!stored) return '';
  const match = options.find((option) => matchesUnitOption(stored, option));
  return match ?? '';
}

/** Resolve Firestore packagingType (e.g. dryBox) back to a UI option label. */
export function resolvePackagingOption(packagingType?: string): string {
  if (!packagingType) return '';
  const match = SERVICE_SHEET_UNIT_OPTIONS.find((option) =>
    matchesUnitOption(packagingType, option)
  );
  return match ?? '';
}

/** Updates sheet-level packagingType (Caja seca / dryBox, …). */
export function updateSheetPackagingType(
  sheet: ServiceSheet,
  unitOption: string
): ServiceSheet {
  return {
    ...sheet,
    packagingType: packagingOptionToFirestoreCode(unitOption),
  };
}

/** @deprecated Prefer updateSheetPackagingType — kept for call-site compat */
export function updateSheetMaterialUnit(
  sheet: ServiceSheet,
  materialType: MaterialType,
  unitOption: string
): ServiceSheet {
  void materialType;
  return updateSheetPackagingType(sheet, unitOption);
}

export function updateSheetMaterialKilograms(
  sheet: ServiceSheet,
  materialType: MaterialType,
  kilograms: number
): ServiceSheet {
  return upsertMaterial(sheet, materialType, { kilograms });
}
