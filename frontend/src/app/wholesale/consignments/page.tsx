'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import DashboardLayout from '../../../components/layouts/DashboardLayout';

interface ConsignmentItem {
    id: string;
    productId: string;
    productName: string;
    productSku?: string;
    quantityDelivered: number;
    quantityReturned: number;
    quantityInvoiced: number;
    unitPrice: number;
}

interface ConsignmentReturn {
    id: string;
    code: string;
    createdAt: string;
    items: any[];
}

interface Consignment {
    id: string;
    code: string;
    status: 'ACTIVE' | 'PARTIALLY_INVOICED' | 'PARTIALLY_RETURNED' | 'CLOSED';
    totalValue: number;
    invoicedValue: number;
    returnedValue: number;
    deliveredAt: string;
    notes?: string;
    customer: {
        id: string;
        name: string;
        businessName?: string;
    };
    items: ConsignmentItem[];
    returns?: ConsignmentReturn[];
}

export default function ConsignmentsPage() {
    const [consignments, setConsignments] = useState<Consignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('open');
    const [search, setSearch] = useState('');
    const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    useEffect(() => {
        fetchConsignments();
    }, []);

    const fetchConsignments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/wholesale/consignments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConsignments(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching consignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadRemit = async (id: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/wholesale/pdf/consignment/${id}/remit`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const html = await res.text();
            const win = window.open('', '_blank');
            win?.document.write(html);
            win?.document.close();
        }
    };

    const handleViewHistory = async (id: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/wholesale/consignments/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedConsignment(data);
                setShowHistoryModal(true);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
        }
    };

    const downloadReturnReceipt = async (returnId: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/wholesale/pdf/return/${returnId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'PARTIALLY_INVOICED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'PARTIALLY_RETURNED': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'CLOSED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            ACTIVE: 'Activa',
            PARTIALLY_INVOICED: 'Parcial Facturada',
            PARTIALLY_RETURNED: 'Parcial Devuelta',
            CLOSED: 'Cerrada'
        };
        return labels[status] || status;
    };

    const getDaysOpen = (deliveredAt: string) => {
        return Math.floor((Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
    };

    const filteredConsignments = consignments.filter(c => {
        const matchesFilter =
            filter === 'all' ? true :
                filter === 'open' ? c.status !== 'CLOSED' :
                    c.status === filter;
        const matchesSearch = !search ||
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.customer.name.toLowerCase().includes(search.toLowerCase()) ||
            c.customer.businessName?.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const openValue = consignments
        .filter(c => c.status !== 'CLOSED')
        .reduce((sum, c) => sum + (c.totalValue - c.invoicedValue - c.returnedValue), 0);

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
                            <h1 className="text-3xl font-extrabold text-white">Consignaciones</h1>
                            <p className="text-gray-400">
                                {consignments.filter(c => c.status !== 'CLOSED').length} consignaciones abiertas •
                                ${openValue.toLocaleString()} pendiente
                            </p>
                        </div>
                        <Link href="/wholesale/consignments/new"
                            className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold transition">
                            + Nueva Consignación
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
                            <option value="open" className="bg-neutral-900">Abiertas</option>
                            <option value="all" className="bg-neutral-900">Todas</option>
                            <option value="ACTIVE" className="bg-neutral-900">Activas</option>
                            <option value="PARTIALLY_INVOICED" className="bg-neutral-900">Parcial Facturadas</option>
                            <option value="CLOSED" className="bg-neutral-900">Cerradas</option>
                        </select>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-500/20 border border-green-500/30 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-green-400">
                                {consignments.filter(c => c.status === 'ACTIVE').length}
                            </div>
                            <div className="text-sm text-gray-400">Activas</div>
                        </div>
                        <div className="bg-blue-500/20 border border-blue-500/30 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-blue-400">
                                {consignments.filter(c => c.status === 'PARTIALLY_INVOICED').length}
                            </div>
                            <div className="text-sm text-gray-400">Parcial Facturadas</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-gray-300">
                                {consignments.filter(c => c.status === 'CLOSED').length}
                            </div>
                            <div className="text-sm text-gray-400">Cerradas</div>
                        </div>
                        <div className="bg-orange-500/20 border border-orange-500/30 p-4 rounded-xl">
                            <div className="text-2xl font-bold text-orange-400">
                                {consignments.filter(c => getDaysOpen(c.deliveredAt) > 30 && c.status !== 'CLOSED').length}
                            </div>
                            <div className="text-sm text-gray-400">+30 días</div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Código</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Valor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Días</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredConsignments.map((c) => {
                                    const pendingValue = c.totalValue - c.invoicedValue - c.returnedValue;
                                    const daysOpen = getDaysOpen(c.deliveredAt);

                                    return (
                                        <tr key={c.id} className="hover:bg-white/5 transition">
                                            <td className="px-4 py-4">
                                                <div className="font-medium text-green-400">{c.code}</div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(c.deliveredAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-medium text-white">{c.customer.businessName || c.customer.name}</div>
                                                <div className="text-sm text-gray-500">{(c.items || []).length} items</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-semibold text-white">${c.totalValue.toLocaleString()}</div>
                                                <div className="text-xs">
                                                    <span className="text-green-400">${c.invoicedValue.toLocaleString()} fact.</span>
                                                    {c.returnedValue > 0 && (
                                                        <span className="text-orange-400 ml-2">${c.returnedValue.toLocaleString()} dev.</span>
                                                    )}
                                                </div>
                                                {pendingValue > 0 && c.status !== 'CLOSED' && (
                                                    <div className="text-xs text-blue-400 font-medium">
                                                        ${pendingValue.toLocaleString()} pendiente
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(c.status)}`}>
                                                    {getStatusLabel(c.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={daysOpen > 30 ? 'text-orange-400 font-medium' : 'text-gray-300'}>
                                                    {daysOpen} días
                                                </div>
                                                {daysOpen > 30 && c.status !== 'CLOSED' && (
                                                    <div className="text-xs text-orange-400">⚠️ Sin actividad</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    <button
                                                        onClick={() => downloadRemit(c.id)}
                                                        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                                                        📄 Remito
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewHistory(c.id)}
                                                        className="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition">
                                                        📜 Historial
                                                    </button>

                                                    {c.status !== 'CLOSED' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedConsignment(c);
                                                                    setShowReturnModal(true);
                                                                }}
                                                                className="px-2 py-1 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition">
                                                                ↩️ Devolución
                                                            </button>
                                                            <Link
                                                                href={`/wholesale/invoicing?consignmentId=${c.id}`}
                                                                className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition">
                                                                💰 Facturar
                                                            </Link>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredConsignments.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No hay consignaciones que mostrar
                            </div>
                        )}
                    </div>

                    {/* Return Modal */}
                    {showReturnModal && selectedConsignment && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                            <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
                                <h2 className="text-xl font-bold text-white mb-4">Procesar Devolución - {selectedConsignment.code}</h2>
                                <p className="text-gray-400 mb-4">Cliente: {selectedConsignment.customer.businessName || selectedConsignment.customer.name}</p>

                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const items = selectedConsignment.items
                                        .filter(item => {
                                            const available = item.quantityDelivered - item.quantityReturned - item.quantityInvoiced;
                                            const qty = parseInt((form.elements.namedItem(`qty_${item.id}`) as HTMLInputElement)?.value || '0');
                                            return qty > 0 && qty <= available;
                                        })
                                        .map(item => ({
                                            productId: item.productId,
                                            quantity: parseInt((form.elements.namedItem(`qty_${item.id}`) as HTMLInputElement).value),
                                            condition: (form.elements.namedItem(`cond_${item.id}`) as HTMLSelectElement).value
                                        }));

                                    if (items.length === 0) {
                                        alert('Seleccione al menos un item para devolver');
                                        return;
                                    }

                                    const data = {
                                        items,
                                        reason: (form.elements.namedItem('reason') as HTMLInputElement).value,
                                        receivedBy: (form.elements.namedItem('receivedBy') as HTMLInputElement).value
                                    };

                                    const token = localStorage.getItem('token');
                                    const res = await fetch(`/api/wholesale/consignments/${selectedConsignment.id}/return`, {
                                        method: 'POST',
                                        headers: {
                                            Authorization: `Bearer ${token}`,
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(data)
                                    });

                                    if (res.ok) {
                                        const returnData = await res.json();
                                        setShowReturnModal(false);
                                        setSelectedConsignment(null);
                                        fetchConsignments();

                                        // Offer PDF download
                                        if (confirm('✅ Devolución procesada. ¿Desea descargar el comprobante?')) {
                                            const token = localStorage.getItem('token');
                                            const pdfRes = await fetch(`/api/wholesale/pdf/return/${returnData.id}`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            if (pdfRes.ok) {
                                                const blob = await pdfRes.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                window.open(url, '_blank');
                                            }
                                        }
                                    } else {
                                        const error = await res.json();
                                        alert(`Error: ${error.message || 'No se pudo procesar la devolución'}`);
                                    }
                                }}>
                                    <table className="w-full mb-4">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs text-gray-400">Producto</th>
                                                <th className="px-3 py-2 text-left text-xs text-gray-400">Disponible</th>
                                                <th className="px-3 py-2 text-left text-xs text-gray-400">Devolver</th>
                                                <th className="px-3 py-2 text-left text-xs text-gray-400">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(selectedConsignment.items || []).map(item => {
                                                const available = item.quantityDelivered - item.quantityReturned - item.quantityInvoiced;
                                                return (
                                                    <tr key={item.id} className="border-b border-white/5">
                                                        <td className="px-3 py-2">
                                                            <div className="font-medium text-sm text-white">{item.productName}</div>
                                                            <div className="text-xs text-gray-500">{item.productSku}</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-sm text-gray-300">{available}</td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="number"
                                                                name={`qty_${item.id}`}
                                                                min="0"
                                                                max={available}
                                                                defaultValue="0"
                                                                className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
                                                                disabled={available === 0}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <select
                                                                name={`cond_${item.id}`}
                                                                className="px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
                                                                disabled={available === 0}>
                                                                <option value="GOOD" className="bg-neutral-900">Buen estado</option>
                                                                <option value="DAMAGED" className="bg-neutral-900">Dañado</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Motivo de devolución</label>
                                            <input name="reason" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Ej: Stock no vendido" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Recibido por</label>
                                            <input name="receivedBy" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Nombre del receptor" />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button type="button" onClick={() => setShowReturnModal(false)}
                                            className="px-4 py-2 text-gray-400 hover:bg-white/10 rounded-lg transition">
                                            Cancelar
                                        </button>
                                        <button type="submit"
                                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold transition">
                                            Procesar Devolución
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* History Modal */}
                    {showHistoryModal && selectedConsignment && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                            <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white">Historial de Devoluciones - {selectedConsignment.code}</h2>
                                    <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-white">✕</button>
                                </div>

                                <div className="space-y-4">
                                    {!selectedConsignment.returns || selectedConsignment.returns.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">No hay devoluciones registradas</p>
                                    ) : (
                                        selectedConsignment.returns.map((ret) => (
                                            <div key={ret.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-white">{ret.code}</div>
                                                    <div className="text-sm text-gray-400">{new Date(ret.createdAt).toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{ret.items?.length || 0} items devueltos</div>
                                                </div>
                                                <button
                                                    onClick={() => downloadReturnReceipt(ret.id)}
                                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition flex items-center gap-2">
                                                    📄 Imprimir
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={() => setShowHistoryModal(false)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
