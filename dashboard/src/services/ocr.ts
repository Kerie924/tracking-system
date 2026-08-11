import { OCR_PROCESS_URL, OCR_TIMEOUT_MS } from '@/lib/config';
import { storage } from '@/lib/firebase';
import {
  FALLBACK_SITES,
  applyFirmasToSheet,
  createEmptyServiceSheet,
  matchCatalogSite,
  normalizeMaterialType,
  packagingOptionToFirestoreCode,
  resolveStatusFromFirmas,
  unitOfMeasureToFirestoreCode,
  type CatalogSite,
  type ServiceSheet,
  type ServiceSheetMaterial,
  type SheetFirmas,
} from '@/types';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export interface OcrProcessResult {
  sheet: ServiceSheet;
  sheetJson: Record<string, unknown>;
  previewUrl: string;
  imageBlob: Blob;
}

const OCR_SIBLING_KEYS = [
  'documento',
  'document',
  'materials',
  'materiales',
  'material_list',
  'operador',
  'operator',
  'cliente_de_servicio',
  'almacen_de_descarga',
  'firmas',
  'signatures',
  'selected_unidad',
  'selectedUnidad',
  'kilogramos',
  'kilograms',
  'pesos',
  'peso',
  'kilos',
] as const;

/** Prefer nested sheet payload when present (`data` / `sheet` / `result`). */
export function unwrapOcrPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  let obj = raw as Record<string, unknown>;

  // Some gateways double-encode the payload as a JSON string.
  for (const key of ['data', 'sheet', 'result', 'payload', 'output'] as const) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim().startsWith('{')) {
      try {
        obj = { ...obj, [key]: JSON.parse(value) };
      } catch {
        /* keep original */
      }
    }
  }

  const nested = obj.data ?? obj.sheet ?? obj.result ?? obj.payload ?? obj.output;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const n = nested as Record<string, unknown>;
    if (
      n.documento ||
      n.materials ||
      n.materiales ||
      n.operador ||
      n.firmas ||
      n.selected_unidad ||
      n.kilogramos ||
      n.kilograms
    ) {
      // Railway sometimes leaves kilogramos / firmas as siblings of `data`.
      const merged: Record<string, unknown> = { ...n };
      for (const key of OCR_SIBLING_KEYS) {
        if (merged[key] == null && obj[key] != null) merged[key] = obj[key];
      }
      return merged;
    }
  }

  return obj;
}

/** Case-insensitive field read (OCR keys vary: Kilogramos, kilos, …). */
function pickField(row: Record<string, unknown>, names: string[]): unknown {
  const lowerMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    lowerMap.set(key.toLowerCase(), value);
  }
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name) && row[name] != null) {
      return row[name];
    }
    const found = lowerMap.get(name.toLowerCase());
    if (found != null) return found;
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Strip OCR numbering prefixes like "2.- Cartón". */
function cleanMaterialLabel(name: string): string {
  return name
    .replace(/^\s*\d+\s*[\.\-–—:)\]\}]+\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLookupKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

export function padFolio(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.slice(-4).padStart(4, '0');
}

/**
 * Parse quantities / kilograms from OCR.
 * Accepts 1690, "1690", "1,690", "1.690", "1 690 kg",
 * and nested `{ value: 1690 }` / `{ kg: "1,690" }`.
 */
export function parseLooseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean' || value == null) return undefined;

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = parseLooseNumber(item);
        if (parsed != null) return parsed;
      }
      return undefined;
    }
    const row = value as Record<string, unknown>;
    return parseLooseNumber(
      pickField(row, [
        'kilograms',
        'kilogramos',
        'kg',
        'kilos',
        'peso',
        'value',
        'valor',
        'amount',
        'cantidad',
        'weight',
      ])
    );
  }

  if (typeof value !== 'string') return undefined;
  let s = value.trim();
  if (!s) return undefined;
  s = s.replace(/\s*(kg|kgs|kilogramos?)\s*$/i, '').trim();
  s = s.replace(/\s/g, '');
  if (!s) return undefined;

  // European thousands: 1.690 or 1.690,5 → strip dots if comma decimal
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    // US thousands: 1,690 or 1,690.5
    s = s.replace(/,/g, '');
  } else if (s.includes(',') && !s.includes('.')) {
    // Plain decimal comma: 12,5
    s = s.replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function extractKilogramosPayload(data: Record<string, unknown>): unknown {
  return (
    data.kilogramos ??
    data.kilograms ??
    data.pesos ??
    data.peso ??
    data.kilos ??
    data.weights ??
    data.peso_por_material ??
    data.pesos_por_material
  );
}

/** Returns YYYY-MM-DD from OCR fecha (supports DD/MM/YYYY and YYYY-MM-DD). */
export function parseFlexibleDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel-style serial not expected; ignore
    return undefined;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = trimmed.match(
    /^(\d{1,2})\s*[\/\-.\s]\s*(\d{1,2})\s*[\/\-.\s]\s*(\d{4})/
  );
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return undefined;
}

/**
 * Parse site/warehouse times from OCR into a local datetime string
 * (`YYYY-MM-DDTHH:mm:ss`) so `<input type="datetime-local">` shows the
 * handwritten wall-clock time without UTC shift.
 */
export function parseFlexibleDateTime(value: unknown): string | undefined {
  if (value == null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;

  // Already ISO with time
  const iso = raw.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (iso) {
    const hh = iso[2].padStart(2, '0');
    const ss = (iso[4] ?? '00').padStart(2, '0');
    return `${iso[1]}T${hh}:${iso[3]}:${ss}`;
  }

  // Date-only ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00:00`;

  // DD-MM-YYYY HH:mm[ hrs] / DD/MM/YYYY HH:mm
  const dmy = raw.match(
    /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})(?:\s+|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/i
  );
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    const yyyy = dmy[3];
    const hh = dmy[4].padStart(2, '0');
    const mi = dmy[5];
    const ss = (dmy[6] ?? '00').padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  // Date only DD/MM/YYYY
  const dateOnly = parseFlexibleDate(raw);
  if (dateOnly && !/\d{1,2}:\d{2}/.test(raw)) return `${dateOnly}T00:00:00`;

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return undefined;
}

export function mapMaterialName(name: string): string {
  const cleaned = cleanMaterialLabel(name);
  const key = cleaned.toUpperCase();
  const aliases: Record<string, string> = {
    CARTÓN: 'CARTON',
    CARTON: 'CARTON',
    PLAYO: 'PLAYO',
    'STRETCH FILM': 'PLAYO',
    'STRETCH FILM (PLAYO)': 'PLAYO',
    RSU: 'RSU',
    TARIMA: 'TARIMAS',
    TARIMAS: 'TARIMAS',
    PALLETS: 'TARIMAS',
    PALLET: 'TARIMAS',
    'TUBO DE CARTÓN': 'TUBO_CARTON',
    'TUBO DE CARTON': 'TUBO_CARTON',
    TUBO_CARTON: 'TUBO_CARTON',
    ORGÁNICOS: 'ORGANICOS',
    ORGANICOS: 'ORGANICOS',
    ORGÁNICO: 'ORGANICOS',
    ORGANICO: 'ORGANICOS',
    CHATARRA: 'CHATARRA',
    OTRO: 'OTRO',
    OTHER: 'OTRO',
  };
  return aliases[key] ?? normalizeMaterialType(key) ?? 'OTRO';
}

function buildKilogramLookup(kilogramos: unknown): {
  byKey: Map<string, number>;
  byIndex: number[];
  single?: number;
} {
  const byKey = new Map<string, number>();
  const byIndex: number[] = [];
  if (kilogramos == null) return { byKey, byIndex };

  const add = (label: string, value: unknown) => {
    const kg = parseLooseNumber(value);
    if (kg == null) return;
    const cleaned = cleanMaterialLabel(label);
    byKey.set(normalizeLookupKey(cleaned), kg);
    byKey.set(normalizeLookupKey(mapMaterialName(cleaned)), kg);
  };

  // Whole-sheet total: "1690" or 1690
  if (typeof kilogramos === 'number' || typeof kilogramos === 'string') {
    const single = parseLooseNumber(kilogramos);
    return { byKey, byIndex, ...(single != null ? { single } : {}) };
  }

  if (Array.isArray(kilogramos)) {
    for (const item of kilogramos) {
      if (typeof item === 'number' || typeof item === 'string') {
        const kg = parseLooseNumber(item);
        if (kg != null) byIndex.push(kg);
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const label = asText(
        pickField(row, ['material', 'materialType', 'name', 'key', 'tipo', 'label'])
      );
      const value = pickField(row, [
        'kilograms',
        'kilogramos',
        'kg',
        'kilos',
        'peso',
        'value',
        'valor',
        'amount',
        'cantidad',
        'weight',
      ]);
      if (label) add(label, value);
      else {
        const kg = parseLooseNumber(value ?? item);
        if (kg != null) byIndex.push(kg);
      }
    }
    return { byKey, byIndex };
  }

  if (typeof kilogramos === 'object') {
    for (const [key, value] of Object.entries(kilogramos as Record<string, unknown>)) {
      add(key, value);
    }
  }
  return { byKey, byIndex };
}

function lookupKilograms(
  kgLookup: ReturnType<typeof buildKilogramLookup>,
  label: string,
  materialType: string,
  row: Record<string, unknown>,
  index: number
): number | undefined {
  const fromRow = parseLooseNumber(
    pickField(row, [
      'kilograms',
      'kilogramos',
      'kg',
      'kilos',
      'peso',
      'peso_kg',
      'weight',
      'weightKg',
      'valor_kg',
    ])
  );
  if (fromRow != null) return fromRow;

  const keys = [
    normalizeLookupKey(label),
    normalizeLookupKey(cleanMaterialLabel(label)),
    normalizeLookupKey(materialType),
  ];
  for (const key of keys) {
    if (key && kgLookup.byKey.has(key)) return kgLookup.byKey.get(key);
  }

  // Fuzzy: any kilogramos key that maps to this material type
  for (const [key, kg] of kgLookup.byKey) {
    if (mapMaterialName(key) === materialType) return kg;
  }

  if (index >= 0 && index < kgLookup.byIndex.length) {
    return kgLookup.byIndex[index];
  }

  return undefined;
}

function materialsFromPayload(data: Record<string, unknown>): unknown {
  return (
    data.materials ??
    data.materiales ??
    data.material_list ??
    data.materiales_seleccionados
  );
}

export function mapOcrMaterials(
  materialsRaw: unknown,
  kilogramos: unknown
): ServiceSheetMaterial[] {
  const kgLookup = buildKilogramLookup(kilogramos);

  let rows: unknown[] = [];
  if (Array.isArray(materialsRaw)) {
    rows = materialsRaw;
  } else if (materialsRaw && typeof materialsRaw === 'object') {
    // { "Cartón": { cantidad: 1, unidad: "A granel" }, ... }
    rows = Object.entries(materialsRaw as Record<string, unknown>).map(
      ([key, value]) =>
        value && typeof value === 'object'
          ? { material: key, ...(value as object) }
          : { material: key, cantidad: value }
    );
  }

  const mapped = rows
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;

      // Skip unchecked rows when OCR includes a boolean flag.
      if (
        row.selected === false ||
        row.checked === false ||
        row.marcado === false ||
        row.isSelected === false
      ) {
        return null;
      }

      const label = cleanMaterialLabel(
        asText(
          pickField(row, ['material', 'materialType', 'name', 'tipo', 'label'])
        ) ?? ''
      );
      if (!label) return null;

      const materialType = mapMaterialName(label);
      const quantity =
        parseLooseNumber(
          pickField(row, ['cantidad', 'quantity', 'qty', 'cant', 'amount'])
        ) ?? 0;
      const measureRaw =
        asText(
          pickField(row, [
            'unidad_medida',
            'unidadMedida',
            'unitOfMeasure',
            'unidad',
            'unit',
            'measure',
          ])
        ) ?? 'A granel';
      const unit = unitOfMeasureToFirestoreCode(measureRaw);
      const kilograms = lookupKilograms(
        kgLookup,
        label,
        materialType,
        row,
        index
      );

      // Drop empty noise rows (unselected materials sometimes returned with zeros).
      if (quantity <= 0 && (kilograms == null || kilograms <= 0)) {
        return null;
      }

      const material: ServiceSheetMaterial = {
        materialType,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unit,
        unitOfMeasure: unit,
        selected: true,
        ...(kilograms != null ? { kilograms } : {}),
        ...(materialType === 'OTRO' && label
          ? { customMaterialName: label }
          : {}),
      };
      return material;
    })
    .filter((m): m is ServiceSheetMaterial => m !== null);

  // Second pass: attach any leftover kilogramos keys that did not match earlier.
  if (mapped.some((m) => m.kilograms == null) && kgLookup.byKey.size > 0) {
    for (const material of mapped) {
      if (material.kilograms != null) continue;
      for (const [key, kg] of kgLookup.byKey) {
        if (mapMaterialName(key) === material.materialType) {
          material.kilograms = kg;
          break;
        }
      }
    }
  }

  // Single total kg + one material line → apply total.
  if (
    kgLookup.single != null &&
    mapped.length === 1 &&
    mapped[0].kilograms == null
  ) {
    mapped[0].kilograms = kgLookup.single;
  }

  // If materials[] was empty but kilogramos has entries, synthesize material lines.
  if (mapped.length === 0 && kgLookup.byKey.size > 0) {
    const seen = new Set<string>();
    for (const [key, kilograms] of kgLookup.byKey) {
      const materialType = mapMaterialName(key);
      if (seen.has(materialType)) continue;
      seen.add(materialType);
      mapped.push({
        materialType,
        quantity: 1,
        unit: 'bulk',
        unitOfMeasure: 'bulk',
        kilograms,
        selected: true,
      });
    }
  }

  return mapped;
}

function resolveSiteFromOcr(
  siteCode: string,
  sites: CatalogSite[] = FALLBACK_SITES
): Partial<Pick<ServiceSheet, 'siteId' | 'siteName' | 'codigo'>> {
  if (!siteCode) return {};
  const match = matchCatalogSite(sites, siteCode);
  if (match) {
    return {
      siteId: match.id,
      siteName: match.name || match.code,
      codigo: match.formCodigo || match.code || siteCode,
    };
  }
  return {
    siteId: siteCode.toLowerCase().replace(/\s+/g, '-'),
    siteName: siteCode,
    codigo: siteCode,
  };
}

export function ocrResponseToServiceSheet(
  raw: unknown,
  userId: string,
  userName?: string,
  userEmail?: string,
  sites: CatalogSite[] = FALLBACK_SITES
): { sheet: ServiceSheet; sheetJson: Record<string, unknown> } {
  const data = unwrapOcrPayload(raw);
  const sheetJson = data;
  const documento = asRecord(data.documento ?? data.document);
  const operador = asRecord(data.operador ?? data.operator);
  const cliente = asRecord(
    data.cliente_de_servicio ?? data.clienteDeServicio ?? data.cliente
  );
  const almacen = asRecord(
    data.almacen_de_descarga ?? data.almacenDeDescarga ?? data.almacen
  );

  const firmas = (data.firmas ?? data.signatures ?? undefined) as
    | SheetFirmas
    | undefined;

  const siteCode =
    asText(documento.sitio ?? documento.codigo ?? documento.site ?? data.sitio) ??
    '';
  const fecha =
    parseFlexibleDate(documento.fecha ?? documento.date ?? data.fecha) ??
    new Date().toISOString().split('T')[0];

  const packagingRaw =
    asText(
      data.selected_unidad ??
        data.selectedUnidad ??
        data.unidad ??
        data.packagingType ??
        documento.unidad
    ) ?? undefined;

  const root = asRecord(raw);
  const materials = mapOcrMaterials(
    materialsFromPayload(data),
    extractKilogramosPayload(data) ?? extractKilogramosPayload(root)
  );

  let sheet = createEmptyServiceSheet(userId, userName, userEmail);
  sheet = {
    ...sheet,
    source: 'ocr',
    folio: padFolio(documento.folio ?? documento.folio_number ?? data.folio),
    fecha,
    ...resolveSiteFromOcr(siteCode, sites),
    packagingType: packagingRaw
      ? packagingOptionToFirestoreCode(packagingRaw)
      : undefined,
    operatorName: asText(operador.nombre ?? operador.name ?? operador.operatorName),
    operatorId: asText(
      operador.id_operador ?? operador.idOperador ?? operador.operatorId ?? operador.id
    ),
    vehiclePlates: asText(
      operador.placas_vehiculo ??
        operador.placasVehiculo ??
        operador.vehiclePlates ??
        operador.placas
    ),
    trailerPlates: asText(
      operador.placas_caja_remolque ??
        operador.placasCajaRemolque ??
        operador.trailerPlates ??
        operador.placas_remolque
    ),
    sealNumber: asText(
      operador.numero_marchamo ??
        operador.numeroMarchamo ??
        operador.sealNumber ??
        operador.marchamo
    ),
    siteEntryTime: parseFlexibleDateTime(
      cliente.fecha_hora_entrada_sitio ??
        cliente.entrada ??
        cliente.siteEntryTime
    ),
    siteExitTime: parseFlexibleDateTime(
      cliente.fecha_hora_salida_sitio ?? cliente.salida ?? cliente.siteExitTime
    ),
    warehouseEntryTime: parseFlexibleDateTime(
      almacen.fecha_hora_entrada_almacen ??
        almacen.entrada ??
        almacen.warehouseEntryTime
    ),
    warehouseExitTime: parseFlexibleDateTime(
      almacen.fecha_hora_salida_almacen ??
        almacen.salida ??
        almacen.warehouseExitTime
    ),
    materials,
    sheetJson,
    firmas,
  };

  sheet = applyFirmasToSheet(sheet, firmas);
  sheet.status = resolveStatusFromFirmas(firmas);
  return { sheet, sheetJson };
}

/** Compress image to JPEG (~1600px, quality 0.7) and return base64 without data: prefix. */
export async function fileToOcrPayload(file: File): Promise<{
  imageBase64: string;
  mimeType: string;
  blob: Blob;
  previewUrl: string;
}> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))),
      'image/jpeg',
      0.7
    );
  });

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const imageBase64 = btoa(binary);

  return {
    imageBase64,
    mimeType: 'image/jpeg',
    blob,
    previewUrl: URL.createObjectURL(blob),
  };
}

export async function processServiceSheetOcr(
  file: File,
  userId: string,
  userName?: string,
  userEmail?: string,
  sites?: CatalogSite[]
): Promise<OcrProcessResult> {
  const { imageBase64, mimeType, blob, previewUrl } = await fileToOcrPayload(file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OCR_PROCESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        image: imageBase64,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('OCR timed out. Try a clearer or smaller photo.');
    }
    const message = err instanceof Error ? err.message : 'Network error';
    throw new Error(
      `OCR request failed (${message}). If this persists locally, restart the Vite dev server so the /api/ocr proxy is active.`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OCR failed (${response.status}): ${text || response.statusText}`);
  }

  const json = await response.json();
  const { sheet, sheetJson } = ocrResponseToServiceSheet(
    json,
    userId,
    userName,
    userEmail,
    sites
  );

  return { sheet, sheetJson, previewUrl, imageBlob: blob };
}

export async function uploadSheetScan(
  sheetId: string,
  blob: Blob
): Promise<string> {
  const path = `serviceSheets/${sheetId}/scan.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
