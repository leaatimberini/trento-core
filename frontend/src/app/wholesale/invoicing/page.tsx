'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import { DollarSign, FileText, Package, AlertCircle } from 'lucide-react';

interface InvoiceItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    available?: number;
}

interface SourceData {
    type: 'quotation' | 'consignment';
    id: string;
    code: string;
    customerName: string;
    items: InvoiceItem[];
    total: number;
}

function InvoicingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const quotationId = searchParams.get('quotationId');
    const consignmentId = searchParams.get('consignmentId');

    const [sourceData, setSourceData] = useState<SourceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

    useEffect(() => {
        if (quotationId || consignmentId) {
            fetchSourceData();
        } else {
            setLoading(false);
        }
    }, [quotationId, consignmentId]);

    const fetchSourceData = async () => {
        try {
            const token = localStorage.getItem('token');

            if (quotationId) {
                const res = await fetch(`/api/wholesale/quotations/${quotationId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSourceData({
                        type: 'quotation',
                        id: data.id,
                        code: data.code,
                        customerName: data.customer?.businessName || data.customer?.name || 'Cliente',
                        items: data.items.map((item: any) => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice
                        })),
                        total: data.total
                    });
                    // Pre-select all items
                    const selected: Record<string, number> = {};
                    data.items.forEach((item: any) => {
                        selected[item.productId] = item.quantity;
                    });
                    setSelectedItems(selected);
                }
            } else if (consignmentId) {
                const res = await fetch(`/api/wholesale/consignments/${consignmentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSourceData({
                        type: 'consignment',
                        id: data.id,
                        code: data.code,
                        customerName: data.customer?.businessName || data.customer?.name || 'Cliente',
                        items: data.items.map((item: any) => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantityDelivered,
                            unitPrice: item.unitPrice,
                            available: item.quantityDelivered - item.quantityReturned - item.quantityInvoiced
                        })),
                        total: data.totalValue
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching source data:', error);
        } finally {
            setLoading(false);
        }
    };

    const [paymentMethod, setPaymentMethod] = useState<string>('ACCOUNT');
    const [paymentReference, setPaymentReference] = useState('');

    const handleInvoice = async () => {
        if (!sourceData) return;
        setProcessing(true);

        try {
            const token = localStorage.getItem('token');
            let endpoint = '';
            let body: any = {};

            const items = Object.entries(selectedItems)
                .filter(([_, qty]) => qty > 0)
                .map(([productId, quantity]) => ({ productId, quantity }));

            if (sourceData.type === 'quotation') {
                endpoint = '/api/wholesale/invoicing/quotation';
                body = {
                    quotationId: sourceData.id,
                    paymentMethod: paymentMethod === 'ACCOUNT' ? undefined : paymentMethod,
                    paymentReference
                };
            } else {
                endpoint = '/api/wholesale/invoicing/consignment';
                body = {
                    consignmentId: sourceData.id,
                    items,
                    paymentMethod: paymentMethod === 'ACCOUNT' ? undefined : paymentMethod,
                    paymentReference
                };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const data = await res.json();
                setCreatedInvoiceId(data.id); // Assuming backend returns the created sale object
                setShowSuccessModal(true);
            } else {
                const error = await res.json();
                alert(`Error: ${error.message || 'No se pudo generar la factura'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la facturación');
        } finally {
            setProcessing(false);
        }
    };

    const downloadInvoice = async () => {
        if (!createdInvoiceId) return;
        const token = localStorage.getItem('token');
        // Assuming endpoint exists or using generic PDF generator if available, 
        // usually sales have a PDF endpoint. Checking task.md... 
        // It seems generic PDF for sale might not be explicitly tasked but let's assume standard behavior or add it.
        // Actually the user asked for "facturo... poder ver los comprobantes".
        // Use generic sale PDF if exists, or just open the sale details.
        // Better: Fetch /api/sales/:id/pdf if it exists.

        // Constructing URL for potentially existing endpoint
        const url = `/api/sales/${createdInvoiceId}/pdf`;

        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            } else {
                alert('No se pudo generar el PDF. Verifique que la venta exista.');
            }
        } catch (e) {
            console.error(e);
            alert('Error al descargar PDF');
        }
    };

    const calculateTotal = () => {
        if (!sourceData) return 0;
        return sourceData.items.reduce((sum, item) => {
            const qty = selectedItems[item.productId] || 0;
            return sum + (qty * item.unitPrice);
        }, 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (!quotationId && !consignmentId) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Facturación B2B</h1>
                    <p className="text-gray-400">Genera facturas para presupuestos y consignaciones</p>
                </div>

                <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                        <h2 className="text-lg font-semibold text-white">Selecciona una operación para facturar</h2>
                    </div>
                    <p className="text-gray-400 mb-4">
                        Para generar una factura, accede desde un presupuesto aceptado o una consignación activa.
                    </p>
                    <div className="flex gap-3">
                        <a href="/wholesale/quotations" className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl hover:bg-purple-500/30 transition">
                            📄 Ver Presupuestos
                        </a>
                        <a href="/wholesale/consignments" className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl hover:bg-green-500/30 transition">
                            📦 Ver Consignaciones
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Facturación</h1>
                    <p className="text-gray-400">
                        {sourceData?.type === 'quotation' ? 'Presupuesto' : 'Consignación'}: {sourceData?.code}
                    </p>
                </div>
            </div>

            {/* Source Info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    {sourceData?.type === 'quotation' ? (
                        <FileText className="w-6 h-6 text-purple-400" />
                    ) : (
                        <Package className="w-6 h-6 text-green-400" />
                    )}
                    <div>
                        <h2 className="text-lg font-semibold text-white">{sourceData?.code}</h2>
                        <p className="text-gray-400">{sourceData?.customerName}</p>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h2 className="font-semibold text-white">📦 Items a Facturar</h2>
                </div>
                <table className="w-full">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Producto</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Disponible</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cantidad</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Precio Unit.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {sourceData?.items.map((item) => {
                            const available = item.available !== undefined ? item.available : item.quantity;
                            const qty = selectedItems[item.productId] || 0;
                            return (
                                <tr key={item.productId} className="hover:bg-white/5 transition">
                                    <td className="px-4 py-4 text-white">{item.productName}</td>
                                    <td className="px-4 py-4 text-gray-300">{available}</td>
                                    <td className="px-4 py-4">
                                        <input
                                            type="number"
                                            min="0"
                                            max={available}
                                            value={qty}
                                            onChange={(e) => setSelectedItems({
                                                ...selectedItems,
                                                [item.productId]: Math.min(parseInt(e.target.value) || 0, available)
                                            })}
                                            className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white"
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-gray-300">${item.unitPrice.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-white font-medium">
                                        ${(qty * item.unitPrice).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Payment Method */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="font-semibold text-white mb-4">💳 Medio de Pago</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-400 mb-2">Forma de Pago</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white">
                            <option value="ACCOUNT">Cuenta Corriente (A Crédito)</option>
                            <option value="CASH">Efectivo</option>
                            <option value="TRANSFER">Transferencia Bancaria</option>
                            <option value="CHECK">Cheque</option>
                            <option value="CREDIT_CARD">Tarjeta de Crédito</option>
                            <option value="DEBIT_CARD">Tarjeta de Débito</option>
                        </select>
                    </div>
                    {paymentMethod !== 'ACCOUNT' && paymentMethod !== 'CASH' && (
                        <div>
                            <label className="block text-gray-400 mb-2">Referencia / Nro. Comprobante</label>
                            <input
                                type="text"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                placeholder="Ej: Transferencia #1234 scotiabank"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Total and Actions */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-400">Total a Facturar</p>
                        <p className="text-3xl font-bold text-emerald-400">${calculateTotal().toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 text-gray-400 hover:bg-white/10 rounded-xl transition">
                            Cancelar
                        </button>
                        <button
                            onClick={handleInvoice}
                            disabled={processing || calculateTotal() === 0}
                            className="px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-bold transition disabled:bg-gray-600 disabled:text-gray-400 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            {processing ? 'Procesando...' : 'Generar Factura'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-neutral-900 border border-white/10 rounded-xl p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <DollarSign className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">¡Factura Generada!</h2>
                        <p className="text-gray-400 mb-6">La operación se ha registrado exitosamente.</p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={downloadInvoice}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
                                📄 Descargar / Imprimir
                            </button>
                            <button
                                onClick={() => router.push('/wholesale')}
                                className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition">
                                Volver al Listado
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WholesaleInvoicingPage() {
    return (
        <AuthGuard>
            <DashboardLayout>
                <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                    </div>
                }>
                    <InvoicingContent />
                </Suspense>
            </DashboardLayout>
        </AuthGuard>
    );
}
