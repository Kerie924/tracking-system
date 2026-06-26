export type MaterialType = 'CARTON' | 'POLIETILENO' | 'TARIMAS' | 'BASURA';
export type DepartureStatus = 'registered' | 'in_transit' | 'at_plant' | 'weighed' | 'reconciled';
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
export declare const MATERIAL_TYPES: MaterialTypeInfo[];
export declare const DEPARTURE_STATUSES: {
    id: DepartureStatus;
    label: string;
    color: string;
}[];
export declare const USER_ROLES: {
    id: UserRole;
    label: string;
}[];
