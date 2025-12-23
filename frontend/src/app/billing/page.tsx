"use client";

import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { isAdmin } from "../../utils/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Receipt, FileCheck, AlertCircle, RefreshCw, ClipboardList, ShoppingCart, Trash2, Printer } from "lucide-react";

interface Sale {
    id: string;
    totalAmount: number;
    createdAt: string;
    customer?: { name: string; taxId?: string };
    invoice?: {
        id: string;
        invoiceNumber: string;
        cae: string;
        type: string;
        pointOfSale: number;
    };
    documentType: string;
    status: string;
}

export default function FacturacionPage() {
    const [pendingSales, setPendingSales] = useState<Sale[]>([]);
    const [invoicedSales, setInvoicedSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!isAdmin()) {
            router.replace("/pos");
            return;
        }
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const sales = await api.getSales();

            // Pending: No invoice associated, and not cancelled
            const pending = sales.filter((s: any) => !s.invoice && s.status !== 'CANCELLED' && s.documentType !== 'BUDGET');

            // Invoiced: Has an invoice object
            const invoiced = sales.filter((s: any) => s.invoice);

            const budgets = sales.filter((s: any) => s.documentType === 'BUDGET');

            setPendingSales(pending);
            setInvoicedSales(invoiced);
            setBudgets(budgets);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [budgets, setBudgets] = useState<Sale[]>([]);

    const handleInvoice = async (saleId: string) => {
        setProcessingId(saleId);
        try {
            const result = await api.authorizeInvoice(saleId);
            // Check if result has invoice data directly or if we need to reload
            alert(`Factura generada con éxito!\nCAE: ${result.cae || 'Generado'}`);
            loadData();
        } catch (error: any) {
            alert(`Error al facturar: ${error.message || "Error de conexión con ARCA"}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handlePrintInvoice = async (saleId: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/sales/${saleId}/pdf`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                alert('No se pudo descargar el comprobante');
            }
        } catch (e) {
            console.error(e);
            alert('Error al descargar');
        }
    };

    const handleDelete = async (saleId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta venta pendiente? Esta acción no se puede deshacer.')) return;

        setDeletingId(saleId);
        try {
            await api.deleteSale(saleId);
            loadData();
        } catch (error: any) {
            alert(`Error al eliminar: ${error.message || "Error desconocido"}`);
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) return (
        <AuthGuard>
            <DashboardLayout>
                <div className="flex h-full items-center justify-center text-amber-500">
                    Cargando Facturación...
                </div>
            </DashboardLayout>
        </AuthGuard>
    );

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    {/* Header */}
                    <div className="mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white mb-2">Comprobantes y Facturación</h1>
                            <p className="text-gray-400">Gestión de Presupuestos, Ventas y Facturación Electrónica (AFIP).</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push('/pos?mode=budget')}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                            >
                                <ClipboardList size={20} /> Nuevo Presupuesto
                            </button>
                            <button
                                onClick={() => router.push('/pos')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                            >
                                <ShoppingCart size={20} /> Nueva Venta
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="text-amber-500" size={24} />
                                <span className="text-gray-400 text-sm font-bold uppercase">Pendientes</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{pendingSales.length}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <FileCheck className="text-emerald-500" size={24} />
                                <span className="text-gray-400 text-sm font-bold uppercase">Facturadas</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{invoicedSales.length}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5 flex items-center justify-center">
                            <button
                                onClick={loadData}
                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <RefreshCw size={20} /> Actualizar Lista
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Budgets Section */}
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <ClipboardList className="text-purple-500" /> Presupuestos
                            </h2>
                            {budgets.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">No hay presupuestos activos.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="text-xs text-gray-500 uppercase bg-black/20">
                                            <tr>
                                                <th className="px-4 py-2">Fecha</th>
                                                <th className="px-4 py-2">Cliente</th>
                                                <th className="px-4 py-2">Total</th>
                                                <th className="px-4 py-2">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {budgets.map(sale => (
                                                <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3">{new Date(sale.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-white">{sale.customer?.name || "Consumidor Final"}</td>
                                                    <td className="px-4 py-3 font-bold text-purple-400">${Number(sale.totalAmount).toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <button className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded hover:bg-purple-900">
                                                            Convertir a Venta
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Pending Sales Section */}
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Receipt className="text-amber-500" /> Ventas Pendientes de Facturar
                            </h2>

                            {pendingSales.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    No hay ventas pendientes de facturación.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="text-xs text-gray-500 uppercase bg-black/20">
                                            <tr>
                                                <th className="px-4 py-2">Fecha</th>
                                                <th className="px-4 py-2">Cliente</th>
                                                <th className="px-4 py-2">Total</th>
                                                <th className="px-4 py-2">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingSales.map(sale => (
                                                <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3">{new Date(sale.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-white">{sale.customer?.name || "Consumidor Final"}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-400">${Number(sale.totalAmount).toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleInvoice(sale.id)}
                                                                disabled={processingId === sale.id || deletingId === sale.id}
                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {processingId === sale.id ? '...' : 'Facturar'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(sale.id)}
                                                                disabled={processingId === sale.id || deletingId === sale.id}
                                                                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Eliminar venta pendiente"
                                                            >
                                                                {deletingId === sale.id ? '...' : <Trash2 size={14} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Invoiced Sales */}
                    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <FileCheck className="text-emerald-500" /> Comprobantes Emitidos
                        </h2>

                        {invoicedSales.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                No hay comprobantes emitidos.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-500 uppercase bg-black/20">
                                        <tr>
                                            <th className="px-6 py-3">Nº Comprobante</th>
                                            <th className="px-6 py-3">CAE</th>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Cliente</th>
                                            <th className="px-6 py-3">Total</th>
                                            <th className="px-6 py-3">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoicedSales.map(sale => (
                                            <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="px-6 py-4 font-mono text-emerald-400">
                                                    {sale.invoice?.invoiceNumber || "-"}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{sale.invoice?.cae || "-"}</td>
                                                <td className="px-6 py-4">{new Date(sale.createdAt).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-white">{sale.customer?.name || "Consumidor Final"}</td>
                                                <td className="px-6 py-4 font-bold">${Number(sale.totalAmount).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handlePrintInvoice(sale.id)}
                                                        className="text-gray-400 hover:text-white transition-colors"
                                                        title="Imprimir Comprobante"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
