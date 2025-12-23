'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import DashboardLayout from '../../../components/layouts/DashboardLayout';

interface WholesaleCustomer {
    id: string;
    name: string;
    email: string;
    phone?: string;
    businessName?: string;
    cuit?: string;
    taxCondition?: string;
    creditLimit?: number;
    creditUsed: number;
    relationStatus: 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'BLOCKED';
    salesRepId?: string;
    priceListId?: string;
    priceList?: { id: string; name: string };
}

interface PriceList {
    id: string;
    name: string;
    description?: string;
}

interface RiskData {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number;
    daysSinceLastOrder: number;
}

export default function WholesaleCustomersPage() {
    const [customers, setCustomers] = useState<WholesaleCustomer[]>([]);
    const [riskData, setRiskData] = useState<Record<string, RiskData>>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);

    useEffect(() => {
        fetchCustomers();
        fetchRiskData();
        fetchPriceLists();
    }, []);

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/wholesale/customers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setCustomers(await res.json());
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRiskData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/wholesale/ai/risk', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const mapped: Record<string, RiskData> = {};
                data.forEach((r: any) => {
                    mapped[r.customerId] = {
                        riskLevel: r.riskLevel,
                        riskScore: r.riskScore,
                        daysSinceLastOrder: r.metrics?.daysSinceLastOrder || 0
                    };
                });
                setRiskData(mapped);
            }
        } catch (error) {
            console.error('Error fetching risk data:', error);
        }
    };

    const fetchPriceLists = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/pricing/lists', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setPriceLists(await res.json());
            }
        } catch (error) {
            console.error('Error fetching price lists:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'AT_RISK': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'INACTIVE': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case 'BLOCKED': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getRiskBadge = (customerId: string) => {
        const risk = riskData[customerId];
        if (!risk || risk.riskLevel === 'LOW') return null;

        const colors = {
            MEDIUM: 'bg-yellow-500',
            HIGH: 'bg-orange-500',
            CRITICAL: 'bg-red-500'
        };

        return (
            <span className={`ml-2 px-2 py-0.5 rounded text-white text-xs ${colors[risk.riskLevel]}`}>
                ⚠️ {risk.riskLevel}
            </span>
        );
    };

    const filteredCustomers = customers.filter(c => {
        const matchesFilter = filter === 'all' || c.relationStatus === filter;
        const matchesSearch = !search ||
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
            c.cuit?.includes(search);
        return matchesFilter && matchesSearch;
    });

    const getCreditUsagePercent = (c: WholesaleCustomer) => {
        if (!c.creditLimit) return 0;
        return Math.round((c.creditUsed / c.creditLimit) * 100);
    };

    if (loading) {
        return (
            <AuthGuard>
                <DashboardLayout>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                    </div>
                </DashboardLayout>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Clientes Mayoristas</h1>
                            <p className="text-gray-400">{customers.length} clientes registrados</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold transition">
                            + Nuevo Cliente
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, razón social o CUIT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                        />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 text-white">
                            <option value="all" className="bg-neutral-900">Todos los estados</option>
                            <option value="ACTIVE" className="bg-neutral-900">Activos</option>
                            <option value="AT_RISK" className="bg-neutral-900">En riesgo</option>
                            <option value="INACTIVE" className="bg-neutral-900">Inactivos</option>
                            <option value="BLOCKED" className="bg-neutral-900">Bloqueados</option>
                        </select>
                    </div>

                    {/* Customers Table */}
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">CUIT</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Condición IVA</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Crédito</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-white/5 transition">
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-white">
                                                {customer.businessName || customer.name}
                                                {getRiskBadge(customer.id)}
                                            </div>
                                            <div className="text-sm text-gray-400">{customer.email}</div>
                                            {customer.phone && (
                                                <div className="text-sm text-gray-500">{customer.phone}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-gray-300">
                                            {customer.cuit || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-gray-400 text-sm">
                                            {customer.taxCondition?.replace(/_/g, ' ') || '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            {customer.creditLimit ? (
                                                <div>
                                                    <div className="text-sm text-gray-300">
                                                        ${customer.creditUsed.toLocaleString()} / ${customer.creditLimit.toLocaleString()}
                                                    </div>
                                                    <div className="w-24 h-2 bg-white/10 rounded-full mt-1">
                                                        <div
                                                            className={`h-full rounded-full ${getCreditUsagePercent(customer) > 90 ? 'bg-red-500' :
                                                                getCreditUsagePercent(customer) > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                                                }`}
                                                            style={{ width: `${Math.min(100, getCreditUsagePercent(customer))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">Sin límite</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(customer.relationStatus)}`}>
                                                {customer.relationStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/wholesale/customers/${customer.id}`}
                                                    className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                                                    Ver
                                                </Link>
                                                <Link
                                                    href={`/wholesale/quotations/new?customerId=${customer.id}`}
                                                    className="px-3 py-1 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition">
                                                    Presupuesto
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredCustomers.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No se encontraron clientes con los filtros seleccionados
                            </div>
                        )}
                    </div>

                    {/* New Customer Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                            <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 w-full max-w-lg">
                                <h2 className="text-xl font-bold text-white mb-4">Nuevo Cliente Mayorista</h2>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const data = {
                                        name: (form.elements.namedItem('name') as HTMLInputElement).value,
                                        email: (form.elements.namedItem('email') as HTMLInputElement).value,
                                        phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
                                        businessName: (form.elements.namedItem('businessName') as HTMLInputElement).value,
                                        cuit: (form.elements.namedItem('cuit') as HTMLInputElement).value,
                                        taxCondition: (form.elements.namedItem('taxCondition') as HTMLSelectElement).value,
                                        creditLimit: parseFloat((form.elements.namedItem('creditLimit') as HTMLInputElement).value) || null,
                                        priceListId: (form.elements.namedItem('priceListId') as HTMLSelectElement).value || undefined
                                    };

                                    const token = localStorage.getItem('token');
                                    const res = await fetch('/api/wholesale/customers', {
                                        method: 'POST',
                                        headers: {
                                            Authorization: `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(data)
                                    });

                                    if (res.ok) {
                                        setShowModal(false);
                                        fetchCustomers();
                                    } else {
                                        alert('Error al crear cliente');
                                    }
                                }}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Contacto *</label>
                                            <input name="name" required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Razón Social</label>
                                            <input name="businessName" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                                                <input name="email" type="email" required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                                                <input name="phone" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">CUIT</label>
                                                <input name="cuit" placeholder="XX-XXXXXXXX-X" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Condición IVA</label>
                                                <select name="taxCondition" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                                                    <option value="" className="bg-neutral-900">Seleccionar</option>
                                                    <option value="RESPONSABLE_INSCRIPTO" className="bg-neutral-900">Resp. Inscripto</option>
                                                    <option value="MONOTRIBUTISTA" className="bg-neutral-900">Monotributista</option>
                                                    <option value="EXENTO" className="bg-neutral-900">Exento</option>
                                                    <option value="CONSUMIDOR_FINAL" className="bg-neutral-900">Cons. Final</option>
                                                    <option value="NO_RESPONSABLE" className="bg-neutral-900">No Responsable</option>
                                                </select>

                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Límite de Crédito</label>
                                                <input name="creditLimit" type="number" placeholder="0" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-1">Lista de Precios</label>
                                                <select name="priceListId" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                                                    <option value="" className="bg-neutral-900">Sin lista asignada</option>
                                                    {(priceLists || []).map(pl => (
                                                        <option key={pl.id} value={pl.id} className="bg-neutral-900">
                                                            {pl.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button type="button" onClick={() => setShowModal(false)}
                                            className="px-4 py-2 text-gray-400 hover:bg-white/10 rounded-lg transition">
                                            Cancelar
                                        </button>
                                        <button type="submit"
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition">
                                            Crear Cliente
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
