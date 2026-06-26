export type MaterialType =
  | 'PLAYO'
  | 'CARTON'
  | 'RSU'
  | 'TARIMAS'
  | 'TUBO_CARTON';

export type UserRole = 'admin' | 'user';

export type Language = 'en' | 'es';

export interface ServiceSheetMaterial {
  materialType: MaterialType | string;
  quantity: number;
  unit?: string;
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
] as const;

/** Maps legacy / OCR material keys to the 5 standard types */
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
  POLIETILENO: 'PLAYO',
  BASURA: 'RSU',
};

export const USER_ROLES: UserRole[] = ['admin', 'user'];

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
    unit: extractMaterialUnit(raw),
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
  unit?: string;
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
    const unit = extractMaterialUnit(m);
    if (unit && !map[key].units.includes(unit)) {
      map[key].units.push(unit);
      map[key].unit = map[key].unit ?? unit;
    }
  }

  return map;
}

function extractMaterialUnit(m: ServiceSheetMaterial | Record<string, unknown>): string | undefined {
  const raw = m as Record<string, unknown>;
  const value =
    raw.unit ??
    raw.unidad ??
    raw.unitOfMeasure ??
    raw.measureUnit ??
    raw.unitMeasure ??
    raw.unidadMedida ??
    raw.measure ??
    raw.unitType;

  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(raw.units)) {
    const first = raw.units.find((u) => typeof u === 'string' && u.trim());
    if (typeof first === 'string') return first.trim();
  }
  return undefined;
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

  const tolvaCompact = label.match(/^tolva(\d+)m?3?$/);
  if (tolvaCompact) return `tolva${tolvaCompact[1]}m3`;

  const tolvaSpaced = label.match(/^tolva\s*(\d+)\s*m?3?$/);
  if (tolvaSpaced) return `tolva${tolvaSpaced[1]}m3`;

  const pieceLabels = new Set(['pz', 'pzas', 'pieza', 'piezas', 'pza']);
  if (pieceLabels.has(label)) return 'pz';

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

export const SERVICE_SHEET_MATERIAL_ROWS: {
  id: MaterialType;
  index: number;
  units: string[];
}[] = [
  {
    id: 'PLAYO',
    index: 1,
    units: ['Caja seca', 'Pacas', 'Tolva 30m³', "Gaylord's", 'Barcinas', 'Cartucho', 'Otro'],
  },
  {
    id: 'CARTON',
    index: 2,
    units: ['Caja seca', 'Remolque', "Gaylord's", 'Otro'],
  },
  {
    id: 'RSU',
    index: 3,
    units: ['Tolva 30m³', 'Tolva 7m³', 'Otro'],
  },
  {
    id: 'TARIMAS',
    index: 4,
    units: ['Pz', 'Otro'],
  },
  {
    id: 'TUBO_CARTON',
    index: 5,
    units: ['Pz', 'Otro'],
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
    pz: 'pz',
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
    materials: [],
  };
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
  const materials = [...sheet.materials];
  const index = materials.findIndex(
    (m) => normalizeMaterialType(String(m.materialType)) === materialType
  );
  if (index === -1) {
    materials.push({ materialType, quantity });
  } else {
    materials[index] = { ...materials[index], quantity };
  }
  return { ...sheet, materials };
}

export function updateSheetMaterialUnit(
  sheet: ServiceSheet,
  materialType: MaterialType,
  unitOption: string
): ServiceSheet {
  const unit = unitOptionToFirestoreCode(unitOption);
  const materials = [...sheet.materials];
  const index = materials.findIndex(
    (m) => normalizeMaterialType(String(m.materialType)) === materialType
  );
  if (index === -1) {
    materials.push({ materialType, quantity: 0, unit });
  } else {
    materials[index] = { ...materials[index], unit };
  }
  return { ...sheet, materials };
}
