'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Truck, MapPin, Navigation, Clock, Plus, Car, CheckCircle, X, Loader2, Route, Package, AlertCircle, Play, Square } from 'lucide-react';

interface Vehicle {
    id: string;
    plate: string;
    name: string;
    type: string;
    status: string;
    driverName?: string;
    driverPhone?: string;
    maxWeight?: number;
    maxVolume?: number;
}

interface DeliveryRoute {
    id: string;
    routeDate: string;
    status: string;
    driverName?: string;
    vehicle?: Vehicle;
    totalStops: number;
    completedStops: number;
    totalDistance?: number;
    stops?: DeliveryStop[];
}

interface DeliveryStop {
    id: string;
    customerName: string;
    address: string;
    status: string;
    sequence: number;
    phone?: string;
}

interface Zone {
    id: string;
    name: string;
    code: string;
    description?: string;
    deliveryDays: string[];
    deliveryFee?: number;
    minOrderValue?: number;
    isActive: boolean;
}

export default function LogisticsPage() {
    const [activeTab, setActiveTab] = useState('routes');
    const [loading, setLoading] = useState(false);

    // Data
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [stats, setStats] = useState({ vehicles: 0, routesToday: 0, deliveries: 0, zones: 0 });

    // Modals
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [showZoneModal, setShowZoneModal] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<DeliveryRoute | null>(null);

    // Forms
    const [vehicleForm, setVehicleForm] = useState({ plate: '', name: '', type: 'VAN', driverName: '', driverPhone: '', maxWeight: 1000 });
    const [routeForm, setRouteForm] = useState({ routeDate: new Date().toISOString().split('T')[0], vehicleId: '', driverName: '' });
    const [zoneForm, setZoneForm] = useState({ name: '', code: '', description: '', deliveryFee: 0, minOrderValue: 0, minLat: -34.7, maxLat: -34.5, minLng: -58.6, maxLng: -58.3, deliveryDays: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'] });

    const tabs = [
        { id: 'routes', label: 'Rutas', icon: Navigation },
        { id: 'vehicles', label: 'Flota', icon: Car },
        { id: 'zones', label: 'Zonas', icon: MapPin },
        { id: 'tracking', label: 'Tracking', icon: Truck },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const getToken = () => localStorage.getItem('token');

    const loadData = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const [vehiclesRes, routesRes, zonesRes] = await Promise.all([
                fetch('/api/logistics/vehicles', { headers }).then(r => r.ok ? r.json() : []),
                fetch('/api/logistics/routes/today', { headers }).then(r => r.ok ? r.json() : []),
                fetch('/api/logistics/zones').then(r => r.json())
            ]);

            setVehicles(vehiclesRes);
            setRoutes(routesRes);
            setZones(zonesRes);

            // Calculate stats
            const completedDeliveries = routesRes.reduce((acc: number, r: DeliveryRoute) => acc + (r.completedStops || 0), 0);
            setStats({
                vehicles: vehiclesRes.length,
                routesToday: routesRes.length,
                deliveries: completedDeliveries,
                zones: zonesRes.length
            });
        } catch (e) {
            console.error('Error loading logistics data:', e);
        } finally {
            setLoading(false);
        }
    };

    // ==================== VEHICLE ACTIONS ====================
    const createVehicle = async () => {
        try {
            const token = getToken();
            const res = await fetch('/api/logistics/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(vehicleForm)
            });
            if (res.ok) {
                setShowVehicleModal(false);
                setVehicleForm({ plate: '', name: '', type: 'VAN', driverName: '', driverPhone: '', maxWeight: 1000 });
                loadData();
            } else {
                alert('Error creando vehículo');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    };

    const updateVehicleStatus = async (vehicleId: string, status: string) => {
        try {
            const token = getToken();
            await fetch(`/api/logistics/vehicles/${vehicleId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    // ==================== ROUTE ACTIONS ====================
    const createRoute = async () => {
        try {
            const token = getToken();
            const res = await fetch('/api/logistics/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(routeForm)
            });
            if (res.ok) {
                setShowRouteModal(false);
                setRouteForm({ routeDate: new Date().toISOString().split('T')[0], vehicleId: '', driverName: '' });
                loadData();
            } else {
                alert('Error creando ruta');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    };

    const startRoute = async (routeId: string) => {
        try {
            const token = getToken();
            await fetch(`/api/logistics/routes/${routeId}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const completeRoute = async (routeId: string) => {
        try {
            const token = getToken();
            await fetch(`/api/logistics/routes/${routeId}/complete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const optimizeRoute = async (routeId: string) => {
        try {
            const token = getToken();
            const res = await fetch(`/api/logistics/routes/${routeId}/optimize`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('✅ Ruta optimizada');
                loadData();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // ==================== ZONE ACTIONS ====================
    const createZone = async () => {
        try {
            const token = getToken();
            const res = await fetch('/api/logistics/zones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(zoneForm)
            });
            if (res.ok) {
                setShowZoneModal(false);
                setZoneForm({ name: '', code: '', description: '', deliveryFee: 0, minOrderValue: 0, minLat: -34.7, maxLat: -34.5, minLng: -58.6, maxLng: -58.3, deliveryDays: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'] });
                loadData();
            } else {
                alert('Error creando zona');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': case 'COMPLETED': return 'text-emerald-400 bg-emerald-500/20';
            case 'ON_ROUTE': case 'IN_PROGRESS': return 'text-blue-400 bg-blue-500/20';
            case 'MAINTENANCE': case 'PENDING': return 'text-amber-400 bg-amber-500/20';
            case 'INACTIVE': case 'CANCELLED': return 'text-red-400 bg-red-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'AVAILABLE': 'Disponible', 'ON_ROUTE': 'En Ruta', 'MAINTENANCE': 'Mantenimiento',
            'INACTIVE': 'Inactivo', 'PENDING': 'Pendiente', 'IN_PROGRESS': 'En Progreso',
            'COMPLETED': 'Completada', 'CANCELLED': 'Cancelada'
        };
        return labels[status] || status;
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Logística</h1>
                        <p className="text-gray-400">Rutas, tracking y gestión de entregas</p>
                    </div>
                    <button
                        onClick={() => setShowRouteModal(true)}
                        className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                    >
                        <Plus size={20} />
                        Nueva Ruta
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                                <Car size={24} />
                            </div>
                            {loading && <Loader2 className="animate-spin text-gray-500" size={16} />}
                        </div>
                        <p className="text-3xl font-bold text-white">{stats.vehicles}</p>
                        <p className="text-sm text-gray-400">Vehículos</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                                <Navigation size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-amber-400">{stats.routesToday}</p>
                        <p className="text-sm text-gray-400">Rutas Hoy</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <CheckCircle size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-400">{stats.deliveries}</p>
                        <p className="text-sm text-gray-400">Entregas</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                <MapPin size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-purple-400">{stats.zones}</p>
                        <p className="text-sm text-gray-400">Zonas</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5">
                    <div className="border-b border-white/10">
                        <nav className="flex space-x-4 px-6" aria-label="Tabs">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm transition-all ${activeTab === tab.id
                                            ? 'border-amber-500 text-amber-400'
                                            : 'border-transparent text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* ROUTES TAB */}
                        {activeTab === 'routes' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Rutas de Entrega</h3>
                                    <button
                                        onClick={() => routes[0] && optimizeRoute(routes[0].id)}
                                        className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl font-bold hover:bg-emerald-500/30 transition-all"
                                    >
                                        🔄 Optimizar Rutas
                                    </button>
                                </div>

                                {routes.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Navigation size={40} className="text-amber-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">No hay rutas programadas</p>
                                        <p className="text-gray-400 text-sm mb-4">Crea rutas y asignales paradas de entrega</p>
                                        <button
                                            onClick={() => setShowRouteModal(true)}
                                            className="bg-amber-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                                        >
                                            Crear Primera Ruta
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {routes.map((route) => (
                                            <div key={route.id} className="bg-black/20 rounded-xl p-4 border border-white/10 hover:border-amber-500/30 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Route size={16} className="text-amber-500" />
                                                            <span className="font-bold text-white">Ruta #{route.id.slice(-6)}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(route.status)}`}>
                                                                {getStatusLabel(route.status)}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-400 text-sm">
                                                            {route.driverName || 'Sin conductor'} • {new Date(route.routeDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {route.status === 'PENDING' && (
                                                            <button
                                                                onClick={() => startRoute(route.id)}
                                                                className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                                                            >
                                                                <Play size={16} />
                                                            </button>
                                                        )}
                                                        {route.status === 'IN_PROGRESS' && (
                                                            <button
                                                                onClick={() => completeRoute(route.id)}
                                                                className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                                            >
                                                                <Square size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-4 text-sm">
                                                    <span className="text-gray-400">
                                                        <Package size={14} className="inline mr-1" />
                                                        {route.completedStops || 0}/{route.totalStops || 0} paradas
                                                    </span>
                                                    {route.vehicle && (
                                                        <span className="text-gray-400">
                                                            <Car size={14} className="inline mr-1" />
                                                            {route.vehicle.plate}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VEHICLES TAB */}
                        {activeTab === 'vehicles' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Flota de Vehículos</h3>
                                    <button
                                        onClick={() => setShowVehicleModal(true)}
                                        className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                                    >
                                        + Agregar Vehículo
                                    </button>
                                </div>

                                {vehicles.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Car size={40} className="text-blue-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">No hay vehículos registrados</p>
                                        <p className="text-gray-400 text-sm">Agrega tu flota para gestionar entregas</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {vehicles.map((vehicle) => (
                                            <div key={vehicle.id} className="bg-black/20 rounded-xl p-4 border border-white/10 hover:border-blue-500/30 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="font-bold text-white">{vehicle.name}</p>
                                                        <p className="text-gray-400 text-sm">{vehicle.plate}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(vehicle.status)}`}>
                                                        {getStatusLabel(vehicle.status)}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-400 space-y-1">
                                                    <p>Tipo: {vehicle.type}</p>
                                                    {vehicle.driverName && <p>Conductor: {vehicle.driverName}</p>}
                                                    {vehicle.maxWeight && <p>Carga máx: {vehicle.maxWeight}kg</p>}
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => updateVehicleStatus(vehicle.id, vehicle.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE')}
                                                        className="text-xs text-gray-400 hover:text-white"
                                                    >
                                                        Cambiar Estado
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ZONES TAB */}
                        {activeTab === 'zones' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Zonas de Entrega</h3>
                                    <button
                                        onClick={() => setShowZoneModal(true)}
                                        className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                                    >
                                        + Nueva Zona
                                    </button>
                                </div>

                                {zones.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MapPin size={40} className="text-purple-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">No hay zonas configuradas</p>
                                        <p className="text-gray-400 text-sm">Define zonas geográficas con costos de envío</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {zones.map((zone) => (
                                            <div key={zone.id} className="bg-black/20 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="font-bold text-white">{zone.name}</p>
                                                        <p className="text-gray-400 text-sm">Código: {zone.code}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${zone.isActive ? 'text-emerald-400 bg-emerald-500/20' : 'text-red-400 bg-red-500/20'}`}>
                                                        {zone.isActive ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-400 space-y-1">
                                                    {zone.deliveryFee && <p>Costo envío: ${zone.deliveryFee}</p>}
                                                    {zone.minOrderValue && <p>Mínimo: ${zone.minOrderValue}</p>}
                                                    <p>Días: {zone.deliveryDays.join(', ')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TRACKING TAB */}
                        {activeTab === 'tracking' && (
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Tracking en Vivo</h3>
                                <div className="bg-white/5 rounded-xl h-96 flex items-center justify-center border border-white/10">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Truck size={40} className="text-emerald-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">Mapa de Tracking</p>
                                        <p className="text-gray-400 text-sm mb-4">Visualiza vehículos en tiempo real</p>
                                        <p className="text-amber-400 text-sm">Integración con Google Maps próximamente</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Vehicle Modal */}
                {showVehicleModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Agregar Vehículo</h3>
                                <button onClick={() => setShowVehicleModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Patente *</label>
                                    <input
                                        type="text"
                                        value={vehicleForm.plate}
                                        onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="ABC123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Nombre *</label>
                                    <input
                                        type="text"
                                        value={vehicleForm.name}
                                        onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="Ej: Fiorino 1"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                                        <select
                                            value={vehicleForm.type}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            <option value="VAN">Furgoneta</option>
                                            <option value="TRUCK">Camión</option>
                                            <option value="MOTORCYCLE">Moto</option>
                                            <option value="CAR">Auto</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Carga Máx (kg)</label>
                                        <input
                                            type="number"
                                            value={vehicleForm.maxWeight}
                                            onChange={(e) => setVehicleForm({ ...vehicleForm, maxWeight: parseInt(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Conductor</label>
                                    <input
                                        type="text"
                                        value={vehicleForm.driverName}
                                        onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="Nombre del conductor"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={vehicleForm.driverPhone}
                                        onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="+54 11 1234-5678"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                                <button onClick={() => setShowVehicleModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                                    Cancelar
                                </button>
                                <button onClick={createVehicle} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-400">
                                    Agregar Vehículo
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Route Modal */}
                {showRouteModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Nueva Ruta</h3>
                                <button onClick={() => setShowRouteModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Fecha de Ruta *</label>
                                    <input
                                        type="date"
                                        value={routeForm.routeDate}
                                        onChange={(e) => setRouteForm({ ...routeForm, routeDate: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Vehículo</label>
                                    <select
                                        value={routeForm.vehicleId}
                                        onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    >
                                        <option value="">Seleccionar vehículo...</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Conductor</label>
                                    <input
                                        type="text"
                                        value={routeForm.driverName}
                                        onChange={(e) => setRouteForm({ ...routeForm, driverName: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="Nombre del conductor"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                                <button onClick={() => setShowRouteModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                                    Cancelar
                                </button>
                                <button onClick={createRoute} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-400">
                                    Crear Ruta
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Zone Modal */}
                {showZoneModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-xl max-w-lg w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
                                <h3 className="text-lg font-bold text-white">Nueva Zona de Entrega</h3>
                                <button onClick={() => setShowZoneModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nombre *</label>
                                        <input
                                            type="text"
                                            value={zoneForm.name}
                                            onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="Ej: Zona Norte"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Código *</label>
                                        <input
                                            type="text"
                                            value={zoneForm.code}
                                            onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="Ej: ZN01"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        value={zoneForm.description}
                                        onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="Descripción de la zona"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Costo de Envío</label>
                                        <input
                                            type="number"
                                            value={zoneForm.deliveryFee}
                                            onChange={(e) => setZoneForm({ ...zoneForm, deliveryFee: parseFloat(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Pedido Mínimo</label>
                                        <input
                                            type="number"
                                            value={zoneForm.minOrderValue}
                                            onChange={(e) => setZoneForm({ ...zoneForm, minOrderValue: parseFloat(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Días de Entrega</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(day => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                    const days = zoneForm.deliveryDays.includes(day)
                                                        ? zoneForm.deliveryDays.filter(d => d !== day)
                                                        : [...zoneForm.deliveryDays, day];
                                                    setZoneForm({ ...zoneForm, deliveryDays: days });
                                                }}
                                                className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${zoneForm.deliveryDays.includes(day)
                                                        ? 'bg-amber-500 text-black'
                                                        : 'bg-black/30 text-gray-400 border border-gray-600'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-lg p-4 border border-gray-600">
                                    <p className="text-sm text-gray-400 mb-3">Coordenadas del Área (Bounding Box)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Lat Mínima</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={zoneForm.minLat}
                                                onChange={(e) => setZoneForm({ ...zoneForm, minLat: parseFloat(e.target.value) })}
                                                className="w-full bg-black/30 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Lat Máxima</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={zoneForm.maxLat}
                                                onChange={(e) => setZoneForm({ ...zoneForm, maxLat: parseFloat(e.target.value) })}
                                                className="w-full bg-black/30 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Lng Mínima</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={zoneForm.minLng}
                                                onChange={(e) => setZoneForm({ ...zoneForm, minLng: parseFloat(e.target.value) })}
                                                className="w-full bg-black/30 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Lng Máxima</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={zoneForm.maxLng}
                                                onChange={(e) => setZoneForm({ ...zoneForm, maxLng: parseFloat(e.target.value) })}
                                                className="w-full bg-black/30 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-gray-800">
                                <button onClick={() => setShowZoneModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                                    Cancelar
                                </button>
                                <button onClick={createZone} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-400">
                                    Crear Zona
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </AuthGuard>
    );
}
