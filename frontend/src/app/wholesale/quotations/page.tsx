'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import DashboardLayout from '../../../components/layouts/DashboardLayout';

interface Quotation {
    id: string;
    code: string;
    status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'INVOICED' | 'CONVERTED';
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    validUntil: string;
    createdAt: string;
    notes?: string;
    customer: {
        id: string;
        name: string;
        businessName?: string;
    };
    items: Array<{
        id: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
}

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/wholesale/quotations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setQuotations(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching quotations:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, action: 'send' | 'accept' | 'reject') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/wholesale/quotations/${id}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                fetchQuotations();
            } else {
                alert('Error al actualizar el presupuesto');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const downloadPdf = async (id: string, code: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/wholesale/pdf/quotation/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const html = await res.text();
            const win = window.open('', '_blank');
            win?.document.write(html);
            win?.document.close();
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case 'SENT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'ACCEPTED': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'REJECTED': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'EXPIRED': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'INVOICED': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'CONVERTED': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            DRAFT: 'Borrador',
            SENT: 'Enviado',
            ACCEPTED: 'Aceptado',
            REJECTED: 'Rechazado',
            EXPIRED: 'Expirado',
            INVOICED: 'Facturado',
            CONVERTED: 'Convertido'
        };
        return labels[status] || status;
    };

    const isExpiringSoon = (validUntil: string) => {
        const days = Math.floor((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days <= 3 && days >= 0;
    };

    const filteredQuotations = quotations.filter(q => {
        const matchesFilter = filter === 'all' || q.status === filter;
        const matchesSearch = !search ||
            q.code.toLowerCase().includes(search.toLowerCase()) ||
            q.customer.name.toLowerCase().includes(search.toLowerCase()) ||
            q.customer.businessName?.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

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
                            <h1 className="text-3xl font-extrabold text-white">Presupuestos</h1>
                            <p className="text-gray-400">{quotations.length} presupuestos</p>
                        </div>
                        <Link href="/wholesale/quotations/new"
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold transition">
                            + Nuevo Presupuesto
                        </Link>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Buscar por código o cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                        />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 text-white">
                            <option value="all" className="bg-neutral-900">Todos los estados</option>
                            <option value="DRAFT" className="bg-neutral-900">Borradores</option>
                            <option value="SENT" className="bg-neutral-900">Enviados</option>
                            <option value="ACCEPTED" className="bg-neutral-900">Aceptados</option>
                            <option value="REJECTED" className="bg-neutral-900">Rechazados</option>
                            <option value="INVOICED" className="bg-neutral-900">Facturados</option>
                        </select>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {['DRAFT', 'SENT', 'ACCEPTED', 'INVOICED', 'REJECTED'].map(status => {
                            const count = quotations.filter(q => q.status === status).length;
                            const total = quotations.filter(q => q.status === status)
                                .reduce((sum, q) => sum + q.total, 0);
                            return (
                                <div key={status}
                                    onClick={() => setFilter(status)}
                                    className={`p-4 rounded-xl cursor-pointer transition border ${filter === status ? 'ring-2 ring-amber-500' : ''
                                        } ${getStatusColor(status)}`}>
                                    <div className="text-2xl font-bold">{count}</div>
                                    <div className="text-sm">{getStatusLabel(status)}</div>
                                    <div className="text-xs opacity-70">${total.toLocaleString()}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Table */}
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Código</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Vencimiento</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredQuotations.map((q) => (
                                    <tr key={q.id} className="hover:bg-white/5 transition">
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-amber-400">{q.code}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(q.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-white">{q.customer.businessName || q.customer.name}</div>
                                            <div className="text-sm text-gray-500">{(q.items || []).length} items</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-white">${q.total.toLocaleString()}</div>
                                            {q.discountAmount > 0 && (
                                                <div className="text-xs text-green-400">-${q.discountAmount.toLocaleString()}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(q.status)}`}>
                                                {getStatusLabel(q.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className={isExpiringSoon(q.validUntil) ? 'text-orange-400 font-medium' : 'text-gray-300'}>
                                                {new Date(q.validUntil).toLocaleDateString()}
                                            </div>
                                            {isExpiringSoon(q.validUntil) && (
                                                <div className="text-xs text-orange-400">⚠️ Próximo a vencer</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    onClick={() => downloadPdf(q.id, q.code)}
                                                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                                                    📄 PDF
                                                </button>

                                                {q.status === 'DRAFT' && (
                                                    <button
                                                        onClick={() => updateStatus(q.id, 'send')}
                                                        className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition">
                                                        📤 Enviar
                                                    </button>
                                                )}

                                                {q.status === 'SENT' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateStatus(q.id, 'accept')}
                                                            className="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition">
                                                            ✓ Aceptar
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(q.id, 'reject')}
                                                            className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition">
                                                            ✗ Rechazar
                                                        </button>
                                                    </>
                                                )}

                                                {q.status === 'ACCEPTED' && (
                                                    <Link
                                                        href={`/wholesale/invoicing?quotationId=${q.id}`}
                                                        className="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition">
                                                        💰 Facturar
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredQuotations.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No hay presupuestos que mostrar
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
