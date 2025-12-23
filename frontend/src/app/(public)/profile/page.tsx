"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import { Package, User, MapPin, LogOut, Settings } from "lucide-react";

export default function ProfilePage() {
    const { user, logout, isCustomer } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
    const [loading, setLoading] = useState(true);

    // Data
    const [profile, setProfile] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zipCode: ''
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!isCustomer) {
            router.replace('/login');
            return;
        }
        loadData();
    }, [isCustomer, router]);

    const loadData = async () => {
        try {
            const [profileData, ordersData] = await Promise.all([
                api.getMyProfile(),
                api.getMyOrders()
            ]);
            setProfile(profileData);
            setOrders(ordersData);
            setFormData({
                name: profileData.name || '',
                email: profileData.email || '',
                phone: profileData.phone || '',
                address: profileData.address || '',
                city: profileData.city || '',
                zipCode: profileData.zipCode || ''
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        try {
            const updated = await api.updateMyProfile(formData);
            setProfile(updated);
            setMessage('Perfil actualizado correctamente');
        } catch (error) {
            setMessage('Error al actualizar perfil');
        }
    };

    if (loading) return <div className="min-h-screen pt-24 text-center text-white">Cargando...</div>;

    return (
        <div className="min-h-screen bg-neutral-950 pt-24 pb-12 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Mi Perfil</h1>
                        <p className="text-gray-400">Gestiona tu cuenta y pedidos</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar / Tabs */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-gray-900/50 rounded-xl p-2 space-y-1 sticky top-24">
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'orders'
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Package size={18} />
                                Mis Pedidos
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'settings'
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Settings size={18} />
                                Configuración
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {activeTab === 'orders' ? (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-white mb-4">Historial de Pedidos</h2>
                                {orders.length === 0 ? (
                                    <div className="bg-gray-900/30 rounded-xl p-8 text-center text-gray-500">
                                        No tienes pedidos recientes.
                                    </div>
                                ) : (
                                    orders.map((order: any) => (
                                        <div key={order.id} className="bg-gray-900/50 border border-white/5 rounded-xl p-6 hover:border-white/10 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-amber-500 font-mono text-sm mb-1">#{order.code}</div>
                                                    <div className="text-gray-400 text-xs">
                                                        {new Date(order.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                                                        order.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                                                            'bg-gray-500/10 text-gray-400'
                                                    }`}>
                                                    {order.status}
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                {order.items?.map((item: any) => (
                                                    <div key={item.id} className="flex justify-between text-sm">
                                                        <span className="text-gray-300">{item.product?.name} x{item.quantity}</span>
                                                        <span className="text-gray-500">${Number(item.totalPrice).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                                                <span className="text-sm text-gray-400">Total</span>
                                                <span className="text-lg font-bold text-white">${Number(order.totalAmount).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="max-w-2xl">
                                <h2 className="text-xl font-bold text-white mb-6">Información Personal</h2>
                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Nombre</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Email</label>
                                            <input
                                                type="email"
                                                disabled
                                                value={formData.email}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Teléfono</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <MapPin size={20} className="text-amber-500" />
                                            Dirección de Envío
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Calle y Altura</label>
                                                <input
                                                    type="text"
                                                    value={formData.address}
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 focus:outline-none"
                                                    placeholder="Av. Corrientes 1234"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Ciudad</label>
                                                <input
                                                    type="text"
                                                    value={formData.city}
                                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Código Postal</label>
                                                <input
                                                    type="text"
                                                    value={formData.zipCode}
                                                    onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500/50 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {message && (
                                        <div className={`p-3 rounded-lg text-sm text-center ${message.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {message}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="bg-amber-500 text-black font-bold px-6 py-3 rounded-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                                    >
                                        Guardar Cambios
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
