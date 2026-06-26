"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_ROLES = exports.DEPARTURE_STATUSES = exports.MATERIAL_TYPES = void 0;
exports.MATERIAL_TYPES = [
    { id: 'CARTON', name: 'Cartón', color: '#f59e0b', unit: 'kg' },
    { id: 'POLIETILENO', name: 'Polietileno', color: '#3b82f6', unit: 'kg' },
    { id: 'TARIMAS', name: 'Tarimas de Madera', color: '#92400e', unit: 'pzas' },
    { id: 'BASURA', name: 'Basura', color: '#6b7280', unit: 'kg' },
];
exports.DEPARTURE_STATUSES = [
    { id: 'registered', label: 'Registrado', color: '#6366f1' },
    { id: 'in_transit', label: 'En tránsito', color: '#f59e0b' },
    { id: 'at_plant', label: 'En planta', color: '#3b82f6' },
    { id: 'weighed', label: 'Pesado', color: '#8b5cf6' },
    { id: 'reconciled', label: 'Conciliado', color: '#10b981' },
];
exports.USER_ROLES = [
    { id: 'admin', label: 'Administrador' },
    { id: 'plant_manager', label: 'Gerente de Planta' },
    { id: 'site_leader', label: 'Líder de Sitio' },
    { id: 'viewer', label: 'Visualizador' },
];
