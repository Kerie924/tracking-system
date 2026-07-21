export type MaterialType =
  | 'PLAYO'
  | 'CARTON'
  | 'RSU'
  | 'TARIMAS'
  | 'TUBO_CARTON'
  | 'ORGANICOS'
  | 'CHATARRA';

export type UserRole = 'customer' | 'advisor' | 'owner';

export type ServiceSheetStatus =
  | 'draft'
  | 'validated'
  | 'authorized'
  | 'completed';

export type Language = 'en' | 'es';

export interface ServiceSheetMaterial {
  materialType: MaterialType | string;
  quantity: number;
  /** Unit of measure (A granel, Pacas, Piezas, …) */
  unitOfMeasure?: string;
  /** Container / vehicle unit (Caja seca, Tolva 30m³, …) */
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
  source?: string;
  trailerPlates?: string;
  vehiclePlates?: string;
  latitude?: number;
  longitude?: number;
  siteEntryTime?: string;
  siteExitTime?: string;
  warehouseEntryTime?: string;
  warehouseExitTime?: string;
  materials: ServiceSheetMaterial[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  language: Language;
  createdAt: string;
}

export interface DashboardStats {
  totalSheets: number;
  todaySheets: number;
  totalQuantity: number;
  activeSites: number;
  activeUsers: number;
  byMaterial: Record<MaterialType, number>;
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
  POLIETILENO: 'PLAYO',
  BASURA: 'RSU',
};

export const USER_ROLES: UserRole[] = ['customer', 'advisor', 'owner'];

export const SERVICE_SHEET_STATUSES: ServiceSheetStatus[] = [
  'draft',
  'validated',
  'authorized',
  'completed',
];

/** Migrates legacy admin/user (and null-as-admin) roles to the new model. */
export function normalizeUserRole(role: unknown): UserRole {
  if (role === 'owner' || role === 'advisor' || role === 'customer') return role;
  if (role === 'admin') return 'owner';
  if (role === 'user') return 'customer';
  // Legacy docs with missing role were treated as admin
  if (role == null || role === '') return 'owner';
  return 'customer';
}

export function normalizeSheetStatus(status: unknown): ServiceSheetStatus {
  if (
    status === 'draft' ||
    status === 'validated' ||
    status === 'authorized' ||
    status === 'completed'
  ) {
    return status;
  }
  return 'draft';
}

export function getSheetStatus(sheet: Pick<ServiceSheet, 'status'>): ServiceSheetStatus {
  return normalizeSheetStatus(sheet.status);
}

export function canViewAllSheets(role: UserRole): boolean {
  return role === 'advisor' || role === 'owner';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'owner';
}

export function canCreateServiceSheet(role: UserRole): boolean {
  return role === 'customer' || role === 'advisor' || role === 'owner';
}

export function canEditSheet(
  role: UserRole,
  sheet: Pick<ServiceSheet, 'userId' | 'status'>,
  userId: string
): boolean {
  const status = getSheetStatus(sheet);
  if (role === 'owner') return status !== 'completed';
  if (role === 'advisor') return status === 'draft' || status === 'validated';
  if (role === 'customer') {
    return sheet.userId === userId && status === 'draft';
  }
  return false;
}

export function getNextSheetStatus(
  status: ServiceSheetStatus
): ServiceSheetStatus | null {
  if (status === 'draft') return 'validated';
  if (status === 'validated') return 'authorized';
  if (status === 'authorized') return 'completed';
  return null;
}

export function canAdvanceSheetStatus(
  role: UserRole,
  sheet: Pick<ServiceSheet, 'userId' | 'status'>,
  _userId: string,
  nextStatus: ServiceSheetStatus
): boolean {
  const current = getSheetStatus(sheet);
  if (getNextSheetStatus(current) !== nextStatus) return false;

  if (nextStatus === 'validated') {
    return role === 'owner' || role === 'advisor';
  }
  if (nextStatus === 'authorized') {
    return role === 'owner';
  }
  if (nextStatus === 'completed') {
    return role === 'owner';
  }
  return false;
}

export function validateSheetForStatus(
  sheet: ServiceSheet,
  status: ServiceSheetStatus
): string | null {
  if (status === 'validated') {
    if (!sheet.operatorName?.trim()) return 'operatorName';
    if (!sheet.vehiclePlates?.trim()) return 'vehiclePlates';
    if (!sheet.sealNumber?.trim()) return 'sealNumber';
    if (!sheet.materials?.some((m) => (m.quantity ?? 0) > 0 || m.selected)) {
      return 'materials';
    }
  }
  if (status === 'authorized') {
    if (!sheet.elaboro?.trim()) return 'elaboro';
    if (!sheet.responsableSup?.trim()) return 'responsableSup';
    if (!sheet.autoriza?.trim()) return 'autoriza';
  }
  if (status === 'completed') {
    if (!(sheet.recibio?.trim() || sheet.recibe?.trim())) return 'recibio';
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
    const unit = extractContainerUnit(m);
    if (unit && !map[key].units.includes(unit)) {
      map[key].units.push(unit);
      map[key].unit = map[key].unit ?? unit;
    }
    if (typeof m.kilograms === 'number' && Number.isFinite(m.kilograms)) {
      map[key].kilograms = (map[key].kilograms ?? 0) + m.kilograms;
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
  if (label === 'cajaseca' || label === 'caja seca') return 'cajaseca';
  if (label.includes('gaylord')) return 'gaylords';
  if (['remolque', 'trailer'].includes(label)) return 'remolque';
  if (['barcinas', 'barcina'].includes(label)) return 'barcinas';
  if (['cartucho', 'cartridge'].includes(label)) return 'cartucho';
  if (['otro', 'other'].includes(label)) return 'otro';
  if (['a granel', 'agranel', 'granel', 'bulk'].includes(label)) return 'agranel';
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

export function unitOptionToFirestoreCode(option: string): string {
  const key = canonicalUnitKey(option);
  const codes: Record<string, string> = {
    pacas: 'bales',
    cajaseca: 'caja_seca',
    gaylords: 'gaylords',
    remolque: 'remolque',
    barcinas: 'barcinas',
    cartucho: 'cartucho',
    otro: 'otro',
    tolva30m3: 'tolva30',
    tolva7m3: 'tolva7',
    piezas: 'piezas',
    agranel: 'a_granel',
    torthon: 'torthon',
    olla17m3: 'olla17',
    camioneta: 'camioneta',
    contenedorescgr: 'contenedores_cgr',
  };
  return codes[key] ?? key.replace(/\s/g, '');
}

export function createEmptyServiceSheet(
  userId: string,
  userName?: string,
  userEmail?: string
): ServiceSheet {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: '',
    userId,
    userName,
    userEmail,
    folio: '',
    codigo: '',
    fecha: today,
    createdAt: new Date().toISOString(),
    status: 'draft',
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

/** Updates unit of measure (A granel, Pacas, Piezas, …) */
export function updateSheetMaterialUnitOfMeasure(
  sheet: ServiceSheet,
  materialType: MaterialType,
  unitOption: string
): ServiceSheet {
  return upsertMaterial(sheet, materialType, {
    unitOfMeasure: unitOptionToFirestoreCode(unitOption),
  });
}

/** Updates container / vehicle unit (Caja seca, Tolva, …) */
export function updateSheetMaterialUnit(
  sheet: ServiceSheet,
  materialType: MaterialType,
  unitOption: string
): ServiceSheet {
  return upsertMaterial(sheet, materialType, {
    unit: unitOptionToFirestoreCode(unitOption),
  });
}

export function updateSheetMaterialKilograms(
  sheet: ServiceSheet,
  materialType: MaterialType,
  kilograms: number
): ServiceSheet {
  return upsertMaterial(sheet, materialType, { kilograms });
}
