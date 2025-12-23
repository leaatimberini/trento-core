
"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { DollarSign, FileText, CheckCircle, AlertCircle, Printer } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

export default function AdminSalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [authorizing, setAuthorizing] = useState<string | null>(null);

    useEffect(() => {
        loadSales();
    }, []);

    const loadSales = async () => {
        try {
            const data = await api.getSales();
            setSales(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorize = async (sale: any) => {
        if (!confirm('¿Solicitar CAE a ARCA?')) return;
        setAuthorizing(sale.id);
        try {
            const res = await api.authorizeInvoice(sale.id);
            alert(`Factura Autorizada! CAE: ${res.cae}`);
            loadSales(); // Reload to show status (mock update, in real world backend updates Sales table)
        } catch (e) {
            console.error(e);
            alert('Error al autorizar');
        } finally {
            setAuthorizing(null);
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

    return (
        <AuthGuard>
            <div className="p-8 bg-gray-50 min-h-screen">
                <h1 className="text-3xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                    <DollarSign className="text-green-600" /> Historial de Ventas
                </h1>

                {loading ? (
                    <div>Cargando...</div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-100 border-b">
                                <tr>
                                    <th className="p-4 text-left font-semibold text-gray-600">Fecha</th>
                                    <th className="p-4 text-left font-semibold text-gray-600">Código</th>
                                    <th className="p-4 text-left font-semibold text-gray-600">Cliente</th>
                                    <th className="p-4 text-right font-semibold text-gray-600">Total</th>
                                    <th className="p-4 text-center font-semibold text-gray-600">Estado</th>
                                    <th className="p-4 text-right font-semibold text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale: any) => (
                                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 text-gray-700">
                                            {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString()}
                                        </td>
                                        <td className="p-4 text-gray-700 font-mono">{sale.code}</td>
                                        <td className="p-4 text-gray-700">
                                            {sale.customer ? sale.customer.name : <span className="text-gray-400 italic">Consumidor Final</span>}
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-800">
                                            ${Number(sale.total).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                                                COMPLETADO
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {/* Mock logic: if sale has invoice data, show CAE. Else show button */}
                                            {sale.cae ? (
                                                <div className="text-xs text-green-600 flex items-center justify-end gap-1">
                                                    <CheckCircle size={14} /> CAE: {sale.cae}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleAuthorize(sale)}
                                                    disabled={authorizing === sale.id}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center gap-2 ml-auto disabled:opacity-50"
                                                >
                                                    {authorizing === sale.id ? '...' : <><FileText size={14} /> Facturar (ARCA)</>}
                                                </button>
                                            )}

                                            {/* Print Button if Invoice exists (either CAE or just local invoice record for now) */}
                                            {/* Note: backend findAll now returns invoice relation */}
                                            {sale.invoice && (
                                                <button
                                                    onClick={() => handlePrintInvoice(sale.id)}
                                                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm flex items-center gap-2 ml-2"
                                                    title="Imprimir Comprobante">
                                                    <Printer size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {sales.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-gray-500">
                                            No hay ventas registradas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AuthGuard >
    );
}
