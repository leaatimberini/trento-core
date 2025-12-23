'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Tag, Plus, Trash2, Edit2, X, Loader2, Percent, DollarSign, Calendar, Users, CheckCircle, XCircle } from 'lucide-react';

interface Coupon {
    id: string;
    code: string;
    name: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    minOrderValue?: number;
    maxDiscount?: number;
    usageLimit?: number;
    usageCount: number;
    perCustomerLimit?: number;
    validFrom: string;
    validUntil?: string;
    isActive: boolean;
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    const [form, setForm] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
        discountValue: 10,
        minOrderValue: 0,
        maxDiscount: 0,
        usageLimit: 0,
        perCustomerLimit: 1,
        validUntil: ''
    });

    useEffect(() => {
        loadCoupons();
    }, []);

    const getToken = () => localStorage.getItem('token');

    const loadCoupons = async () => {
        try {
            const token = getToken();
            const res = await fetch('/api/coupons', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setCoupons(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const saveCoupon = async () => {
        try {
            const token = getToken();
            const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
            const method = editingCoupon ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    minOrderValue: form.minOrderValue || null,
                    maxDiscount: form.maxDiscount || null,
                    usageLimit: form.usageLimit || null,
                    perCustomerLimit: form.perCustomerLimit || null,
                    validUntil: form.validUntil || null
                })
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                loadCoupons();
            } else {
                const data = await res.json();
                alert(data.message || 'Error al guardar');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        }
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm('¿Seguro que querés eliminar este cupón?')) return;
        try {
            const token = getToken();
            await fetch(`/api/coupons/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadCoupons();
        } catch (e) {
            console.error(e);
        }
    };

    const toggleActive = async (coupon: Coupon) => {
        try {
            const token = getToken();
            await fetch(`/api/coupons/${coupon.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ isActive: !coupon.isActive })
            });
            loadCoupons();
        } catch (e) {
            console.error(e);
        }
    };

    const openEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setForm({
            code: coupon.code,
            name: coupon.name,
            description: coupon.description || '',
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minOrderValue: coupon.minOrderValue || 0,
            maxDiscount: coupon.maxDiscount || 0,
            usageLimit: coupon.usageLimit || 0,
            perCustomerLimit: coupon.perCustomerLimit || 1,
            validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : ''
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingCoupon(null);
        setForm({
            code: '',
            name: '',
            description: '',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minOrderValue: 0,
            maxDiscount: 0,
            usageLimit: 0,
            perCustomerLimit: 1,
            validUntil: ''
        });
    };

    const isExpired = (coupon: Coupon) => {
        if (!coupon.validUntil) return false;
        return new Date(coupon.validUntil) < new Date();
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Cupones de Descuento</h1>
                        <p className="text-gray-400">Gestioná códigos promocionales</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 transition-all"
                    >
                        <Plus size={20} />
                        Nuevo Cupón
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                                <Tag size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{coupons.length}</p>
                        <p className="text-sm text-gray-400">Total Cupones</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <CheckCircle size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-emerald-400">
                            {coupons.filter(c => c.isActive && !isExpired(c)).length}
                        </p>
                        <p className="text-sm text-gray-400">Activos</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                                <Users size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-blue-400">
                            {coupons.reduce((sum, c) => sum + c.usageCount, 0)}
                        </p>
                        <p className="text-sm text-gray-400">Usos Totales</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                                <XCircle size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-red-400">
                            {coupons.filter(c => isExpired(c)).length}
                        </p>
                        <p className="text-sm text-gray-400">Expirados</p>
                    </div>
                </div>

                {/* Coupons List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-amber-500" size={40} />
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Tag size={40} className="text-amber-400" />
                        </div>
                        <p className="text-white font-bold text-lg mb-2">No hay cupones creados</p>
                        <p className="text-gray-400 text-sm">Creá tu primer código promocional</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className={`bg-white/5 backdrop-blur-sm rounded-2xl p-5 border transition-all ${coupon.isActive && !isExpired(coupon) ? 'border-white/10 hover:border-amber-500/50' : 'border-red-500/20 opacity-60'
                                }`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <code className="text-2xl font-bold text-amber-400">{coupon.code}</code>
                                        <p className="text-white text-sm mt-1">{coupon.name}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => toggleActive(coupon)}
                                            className={`p-1.5 rounded-lg ${coupon.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                                        >
                                            {coupon.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                        </button>
                                        <button
                                            onClick={() => openEdit(coupon)}
                                            className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => deleteCoupon(coupon.id)}
                                            className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold ${coupon.discountType === 'PERCENTAGE' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {coupon.discountType === 'PERCENTAGE' ? <Percent size={14} /> : <DollarSign size={14} />}
                                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                                    </span>
                                    {isExpired(coupon) && (
                                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-lg">Expirado</span>
                                    )}
                                </div>

                                <div className="text-sm text-gray-400 space-y-1">
                                    {coupon.minOrderValue && coupon.minOrderValue > 0 && (
                                        <p>Mínimo: ${Number(coupon.minOrderValue).toLocaleString()}</p>
                                    )}
                                    <p>Usos: {coupon.usageCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}</p>
                                    {coupon.validUntil && (
                                        <p className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            Hasta: {new Date(coupon.validUntil).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-xl max-w-lg w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
                                <h3 className="text-lg font-bold text-white">
                                    {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Código *</label>
                                        <input
                                            type="text"
                                            value={form.code}
                                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono"
                                            placeholder="VUELVE15"
                                            disabled={!!editingCoupon}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nombre *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="Cupón de bienvenida"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="Descripción opcional"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Tipo de Descuento</label>
                                        <select
                                            value={form.discountType}
                                            onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            <option value="PERCENTAGE">Porcentaje (%)</option>
                                            <option value="FIXED_AMOUNT">Monto Fijo ($)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">
                                            Valor {form.discountType === 'PERCENTAGE' ? '(%)' : '($)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={form.discountValue}
                                            onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Pedido Mínimo ($)</label>
                                        <input
                                            type="number"
                                            value={form.minOrderValue}
                                            onChange={(e) => setForm({ ...form, minOrderValue: parseFloat(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="0 = sin mínimo"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Descuento Máximo ($)</label>
                                        <input
                                            type="number"
                                            value={form.maxDiscount}
                                            onChange={(e) => setForm({ ...form, maxDiscount: parseFloat(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="0 = sin límite"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Límite de Usos Total</label>
                                        <input
                                            type="number"
                                            value={form.usageLimit}
                                            onChange={(e) => setForm({ ...form, usageLimit: parseInt(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="0 = ilimitado"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Usos por Cliente</label>
                                        <input
                                            type="number"
                                            value={form.perCustomerLimit}
                                            onChange={(e) => setForm({ ...form, perCustomerLimit: parseInt(e.target.value) })}
                                            className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Válido Hasta</label>
                                    <input
                                        type="date"
                                        value={form.validUntil}
                                        onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-gray-800">
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveCoupon}
                                    className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-400"
                                >
                                    {editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </AuthGuard>
    );
}
