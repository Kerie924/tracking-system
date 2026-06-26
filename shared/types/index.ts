export type MaterialType = 'CARTON' | 'POLIETILENO' | 'TARIMAS' | 'BASURA';

export type DepartureStatus =
  | 'registered'
  | 'in_transit'
  | 'at_plant'
  | 'weighed'
  | 'reconciled';

export type UserRole = 'admin' | 'plant_manager' | 'site_leader' | 'viewer';

export interface Departure {
  id: string;
  folio: string;
  siteId: string;
  siteName: string;
  materialType: MaterialType;
  transportUnit: string;
  driverName: string;
  ramp: string;
  estimatedQuantity: number;
  sealNumber: string;
  departureTime: number;
  createdAt: number;
  createdBy: string;
  status: DepartureStatus;
  actualWeight?: number;
  ocrImageUrl?: string;
  ocrConfidence?: number;
  notes?: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
  rampCount: number;
  active: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  siteId?: string;
  active: boolean;
}

export interface MaterialTypeInfo {
  id: MaterialType;
  name: string;
  color: string;
  unit: string;
}

export interface DashboardStats {
  totalDepartures: number;
  todayDepartures: number;
  totalEstimatedWeight: number;
  totalActualWeight: number;
  activeSites: number;
  inTransit: number;
  byMaterial: Record<MaterialType, number>;
  byStatus: Record<DepartureStatus, number>;
  bySite: Record<string, number>;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  siteId: string;
  checkInTime: number;
  checkOutTime?: number;
  latitude?: number;
  longitude?: number;
}

export const MATERIAL_TYPES: MaterialTypeInfo[] = [
  { id: 'CARTON', name: 'Cartón', color: '#f59e0b', unit: 'kg' },
  { id: 'POLIETILENO', name: 'Polietileno', color: '#3b82f6', unit: 'kg' },
  { id: 'TARIMAS', name: 'Tarimas de Madera', color: '#92400e', unit: 'pzas' },
  { id: 'BASURA', name: 'Basura', color: '#6b7280', unit: 'kg' },
];

export const DEPARTURE_STATUSES: { id: DepartureStatus; label: string; color: string }[] = [
  { id: 'registered', label: 'Registrado', color: '#6366f1' },
  { id: 'in_transit', label: 'En tránsito', color: '#f59e0b' },
  { id: 'at_plant', label: 'En planta', color: '#3b82f6' },
  { id: 'weighed', label: 'Pesado', color: '#8b5cf6' },
  { id: 'reconciled', label: 'Conciliado', color: '#10b981' },
];

export const USER_ROLES: { id: UserRole; label: string }[] = [
  { id: 'admin', label: 'Administrador' },
  { id: 'plant_manager', label: 'Gerente de Planta' },
  { id: 'site_leader', label: 'Líder de Sitio' },
  { id: 'viewer', label: 'Visualizador' },
];
