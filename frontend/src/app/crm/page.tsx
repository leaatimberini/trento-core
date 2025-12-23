'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Heart, Users, Star, TrendingUp, Gift, Activity, Target, Megaphone, X, Search } from 'lucide-react';
import { api } from '../../services/api';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone?: string;
}

interface LoyaltyData {
    customerId: string;
    customer?: { name: string; email: string };
    currentPoints: number;
    lifetimePoints: number;
    level: string;
}

export default function CRMPage() {
    const [loyaltyData, setLoyaltyData] = useState<LoyaltyData[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('loyalty');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [points, setPoints] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch customers
            const customersRes = await fetch('/api/customers', { headers });
            if (customersRes.ok) {
                const customersData = await customersRes.json();
                setCustomers(customersData);
            }

            // Fetch loyalty data
            const loyaltyRes = await fetch('/api/crm/loyalty', { headers });
            if (loyaltyRes.ok) {
                const loyaltyDataResult = await loyaltyRes.json();
                setLoyaltyData(loyaltyDataResult);
            }
        } catch (error) {
            console.error('Error fetching CRM data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGrantPoints = async () => {
        if (!selectedCustomer || !points || parseInt(points) <= 0) {
            setMessage('Selecciona un cliente y cantidad de puntos válida');
            return;
        }

        setSubmitting(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/crm/loyalty/grant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    points: parseInt(points),
                    reason: reason || 'Puntos otorgados manualmente'
                })
            });

            if (res.ok) {
                setMessage('✅ Puntos otorgados exitosamente');
                setShowModal(false);
                setSelectedCustomer(null);
                setPoints('');
                setReason('');
                fetchData(); // Refresh data
            } else {
                const error = await res.json();
                setMessage(`Error: ${error.message || 'No se pudieron otorgar los puntos'}`);
            }
        } catch (error) {
            setMessage('Error de conexión al servidor');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { id: 'loyalty', label: 'Fidelización', icon: Gift },
        { id: 'activities', label: 'Actividades', icon: Activity },
        { id: 'segments', label: 'Segmentos', icon: Target },
        { id: 'campaigns', label: 'Campañas', icon: Megaphone },
    ];

    return (
        <AuthGuard>
            <DashboardLayout>
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-white">CRM & Fidelización</h1>
                    <p className="text-gray-400">Gestiona relaciones con clientes y programas de fidelidad</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                                <Users size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{customers.length}</p>
                        <p className="text-sm text-gray-400">Clientes Activos</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                                <Star size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-amber-400">
                            {loyaltyData.reduce((sum, l) => sum + (l.currentPoints || 0), 0)}
                        </p>
                        <p className="text-sm text-gray-400">Puntos Activos</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                <Heart size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-purple-400">
                            {loyaltyData.filter(l => l.level === 'VIP').length}
                        </p>
                        <p className="text-sm text-gray-400">Clientes VIP</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-400">
                            {customers.length > 0 ? Math.round((loyaltyData.length / customers.length) * 100) : 0}%
                        </p>
                        <p className="text-sm text-gray-400">Tasa Retención</p>
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
                        {activeTab === 'loyalty' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Programa de Puntos</h3>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                                    >
                                        + Otorgar Puntos
                                    </button>
                                </div>

                                {loyaltyData.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Gift size={40} className="text-amber-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">No hay datos de fidelización</p>
                                        <p className="text-gray-400 text-sm mb-4">Los puntos se asignan automáticamente con cada compra</p>
                                        {customers.length > 0 && (
                                            <button
                                                onClick={() => setShowModal(true)}
                                                className="bg-amber-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                                            >
                                                Otorgar Primeros Puntos
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {loyaltyData.map((item) => (
                                            <div key={item.customerId} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                                                        {item.customer?.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{item.customer?.name}</p>
                                                        <p className="text-sm text-gray-400">{item.customer?.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.level === 'VIP' ? 'bg-purple-500/20 text-purple-400' :
                                                            item.level === 'ORO' ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {item.level}
                                                    </span>
                                                    <span className="text-amber-400 font-bold">{item.currentPoints} pts</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'activities' && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Activity size={40} className="text-blue-400" />
                                </div>
                                <p className="text-white font-bold text-lg mb-2">Historial de Actividades</p>
                                <p className="text-gray-400 text-sm">Compras, visitas, interacciones</p>
                            </div>
                        )}

                        {activeTab === 'segments' && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Target size={40} className="text-purple-400" />
                                </div>
                                <p className="text-white font-bold text-lg mb-2">Segmentación RFM</p>
                                <p className="text-gray-400 text-sm">Recency, Frequency, Monetary</p>
                            </div>
                        )}

                        {activeTab === 'campaigns' && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Megaphone size={40} className="text-emerald-400" />
                                </div>
                                <p className="text-white font-bold text-lg mb-2">Campañas de Marketing</p>
                                <p className="text-gray-400 text-sm">WhatsApp, Email, Push</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Grant Points Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-900 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Gift className="text-amber-400" size={24} />
                                    Otorgar Puntos
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Customer Search */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Cliente</label>
                                    {selectedCustomer ? (
                                        <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                                                    {selectedCustomer.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{selectedCustomer.name}</p>
                                                    <p className="text-xs text-gray-400">{selectedCustomer.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedCustomer(null)}
                                                className="text-gray-400 hover:text-red-400"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    placeholder="Buscar cliente..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                                />
                                            </div>
                                            {searchTerm && filteredCustomers.length > 0 && (
                                                <div className="mt-2 bg-white/5 rounded-xl border border-white/10 max-h-40 overflow-y-auto">
                                                    {filteredCustomers.slice(0, 5).map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => {
                                                                setSelectedCustomer(c);
                                                                setSearchTerm('');
                                                            }}
                                                            className="w-full text-left p-3 hover:bg-white/10 transition-colors flex items-center gap-3"
                                                        >
                                                            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm">
                                                                {c.name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-medium">{c.name}</p>
                                                                <p className="text-xs text-gray-400">{c.email}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {customers.length === 0 && (
                                                <p className="text-sm text-gray-500 mt-2">No hay clientes registrados</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Points Amount */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Cantidad de Puntos</label>
                                    <input
                                        type="number"
                                        value={points}
                                        onChange={(e) => setPoints(e.target.value)}
                                        placeholder="100"
                                        min="1"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                {/* Reason */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Motivo (opcional)</label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Ej: Promoción especial, compensación..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                {message && (
                                    <p className={`text-sm ${message.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {message}
                                    </p>
                                )}
                            </div>

                            <div className="p-6 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGrantPoints}
                                    disabled={submitting || !selectedCustomer || !points}
                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Otorgando...' : 'Otorgar Puntos'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </AuthGuard>
    );
}
