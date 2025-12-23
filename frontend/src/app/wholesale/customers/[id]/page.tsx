'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '../../../../components/AuthGuard';
import DashboardLayout from '../../../../components/layouts/DashboardLayout';
import { User, Phone, Mail, Building2, CreditCard, FileText, Package, TrendingUp, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone?: string;
    businessName?: string;
    cuit?: string;
    taxCondition?: string;
    creditLimit?: number;
    creditUsed: number;
    relationStatus: string;
    discountPercent?: number;
    paymentTermDays?: number;
    notes?: string;
    createdAt: string;
    priceList?: { id: string; name: string };
    priceListId?: string;
}

interface Sale {
    id: string;
    code: string;
    totalAmount: number;
    status: string;
    createdAt: string;
}

interface PriceList {
    id: string;
    name: string;
}

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (customerId) {
            fetchCustomer();
            fetchPriceLists();
        }
    }, [customerId]);

    const fetchCustomer = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/wholesale/customers/${customerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomer(data);
                setSales(data.sales || []);
            } else {
                router.push('/wholesale/customers');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPriceLists = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/pricing/lists', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setPriceLists(await res.json());
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!customer) return;

        setSubmitting(true);
        try {
            const form = e.target as HTMLFormElement;
            const data = {
                name: (form.elements.namedItem('name') as HTMLInputElement).value,
                email: (form.elements.namedItem('email') as HTMLInputElement).value,
                phone: (form.elements.namedItem('phone') as HTMLInputElement).value || undefined,
                businessName: (form.elements.namedItem('businessName') as HTMLInputElement).value || undefined,
                cuit: (form.elements.namedItem('cuit') as HTMLInputElement).value || undefined,
                taxCondition: (form.elements.namedItem('taxCondition') as HTMLSelectElement).value || undefined,
                creditLimit: parseFloat((form.elements.namedItem('creditLimit') as HTMLInputElement).value) || undefined,
                discountPercent: parseFloat((form.elements.namedItem('discountPercent') as HTMLInputElement).value) || undefined,
                paymentTermDays: parseInt((form.elements.namedItem('paymentTermDays') as HTMLInputElement).value) || undefined,
                priceListId: (form.elements.namedItem('priceListId') as HTMLSelectElement).value || undefined,
                notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value || undefined,
            };

            const token = localStorage.getItem('token');
            const res = await fetch(`/api/wholesale/customers/${customerId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setShowEditModal(false);
                fetchCustomer();
            } else {
                const error = await res.json();
                alert(`Error: ${error.message || 'No se pudo actualizar'}`);
            }
        } catch (error) {
            alert('Error al actualizar cliente');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/wholesale/customers/${customerId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                router.push('/wholesale/customers');
            } else {
                const error = await res.json();
                alert(`Error: ${error.message || 'No se pudo eliminar'}`);
            }
        } catch (error) {
            alert('Error al eliminar cliente');
        } finally {
            setSubmitting(false);
            setShowDeleteModal(false);
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

    const getCreditUsagePercent = () => {
        if (!customer?.creditLimit) return 0;
        return Math.round((customer.creditUsed / customer.creditLimit) * 100);
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

    if (!customer) {
        return (
            <AuthGuard>
                <DashboardLayout>
                    <div className="text-center py-16 text-gray-500">
                        Cliente no encontrado
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
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-extrabold text-white">
                                    {customer.businessName || customer.name}
                                </h1>
                                <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(customer.relationStatus)}`}>
                                    {customer.relationStatus}
                                </span>
                            </div>
                            {customer.businessName && (
                                <p className="text-gray-400">Contacto: {customer.name}</p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold transition flex items-center gap-2">
                                <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 font-bold transition flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                            <Link
                                href={`/wholesale/quotations/new?customerId=${customer.id}`}
                                className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 font-bold transition">
                                + Presupuesto
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Contact Info */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" /> Información de Contacto
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-300">{customer.email}</span>
                                </div>
                                {customer.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-300">{customer.phone}</span>
                                    </div>
                                )}
                                {customer.cuit && (
                                    <div className="flex items-center gap-3">
                                        <Building2 className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-300">CUIT: {customer.cuit}</span>
                                    </div>
                                )}
                                {customer.taxCondition && (
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-300">{customer.taxCondition.replace(/_/g, ' ')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Credit Info */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5" /> Crédito
                            </h2>
                            {customer.creditLimit ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Límite:</span>
                                        <span className="text-white font-medium">${customer.creditLimit.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Utilizado:</span>
                                        <span className="text-white font-medium">${customer.creditUsed.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Disponible:</span>
                                        <span className="text-green-400 font-medium">
                                            ${(customer.creditLimit - customer.creditUsed).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-white/10 rounded-full">
                                        <div
                                            className={`h-full rounded-full transition ${getCreditUsagePercent() > 90 ? 'bg-red-500' :
                                                getCreditUsagePercent() > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${Math.min(100, getCreditUsagePercent())}%` }}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 text-center">{getCreditUsagePercent()}% utilizado</p>
                                </div>
                            ) : (
                                <p className="text-gray-500">Sin límite de crédito asignado</p>
                            )}
                        </div>

                        {/* Commercial Info */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" /> Condiciones Comerciales
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Descuento:</span>
                                    <span className="text-green-400 font-medium">
                                        {customer.discountPercent ? `${customer.discountPercent}%` : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Plazo de pago:</span>
                                    <span className="text-white font-medium">
                                        {customer.paymentTermDays ? `${customer.paymentTermDays} días` : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Cliente desde:</span>
                                    <span className="text-white font-medium">
                                        {new Date(customer.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Lista de precios:</span>
                                    <span className={`font-medium ${customer.priceList ? 'text-purple-400' : 'text-gray-500'}`}>
                                        {customer.priceList?.name || 'Sin asignar'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {customer.notes && (
                        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-amber-400 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Notas
                            </h2>
                            <p className="text-gray-300">{customer.notes}</p>
                        </div>
                    )}

                    {/* Recent Sales */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Package className="w-5 h-5" /> Últimas Operaciones
                            </h2>
                        </div>
                        {sales.length > 0 ? (
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Código</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-white/5 transition">
                                            <td className="px-4 py-4 text-amber-400 font-medium">{sale.code}</td>
                                            <td className="px-4 py-4 text-gray-300">
                                                {new Date(sale.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 text-white font-medium">
                                                ${Number(sale.totalAmount).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="px-2 py-1 rounded-full text-xs bg-white/10 text-gray-300">
                                                    {sale.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                No hay operaciones registradas
                            </div>
                        )}
                    </div>

                    {/* Back Button */}
                    <div className="flex justify-start">
                        <Link
                            href="/wholesale/customers"
                            className="px-4 py-2 text-gray-400 hover:text-white transition">
                            ← Volver a Clientes
                        </Link>
                    </div>
                </div>

                {/* Edit Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10">
                            <h2 className="text-xl font-bold text-white mb-4">Editar Cliente</h2>
                            <form onSubmit={handleUpdate}>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Contacto *</label>
                                            <input name="name" defaultValue={customer.name} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Razón Social</label>
                                            <input name="businessName" defaultValue={customer.businessName} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                                            <input name="email" type="email" defaultValue={customer.email} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                                            <input name="phone" defaultValue={customer.phone} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">CUIT</label>
                                            <input name="cuit" defaultValue={customer.cuit} placeholder="XX-XXXXXXXX-X" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Condición IVA</label>
                                            <select name="taxCondition" defaultValue={customer.taxCondition} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                                                <option value="" className="bg-neutral-900">Seleccionar</option>
                                                <option value="RESPONSABLE_INSCRIPTO" className="bg-neutral-900">Resp. Inscripto</option>
                                                <option value="MONOTRIBUTISTA" className="bg-neutral-900">Monotributista</option>
                                                <option value="EXENTO" className="bg-neutral-900">Exento</option>
                                                <option value="CONSUMIDOR_FINAL" className="bg-neutral-900">Cons. Final</option>
                                                <option value="NO_RESPONSABLE" className="bg-neutral-900">No Responsable</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Límite Crédito</label>
                                            <input name="creditLimit" type="number" defaultValue={customer.creditLimit} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Descuento %</label>
                                            <input name="discountPercent" type="number" defaultValue={customer.discountPercent} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Plazo días</label>
                                            <input name="paymentTermDays" type="number" defaultValue={customer.paymentTermDays} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Lista de Precios</label>
                                        <select name="priceListId" defaultValue={customer.priceListId || ''} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                                            <option value="" className="bg-neutral-900">Sin lista asignada</option>
                                            {(priceLists || []).map(pl => (
                                                <option key={pl.id} value={pl.id} className="bg-neutral-900">{pl.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Notas</label>
                                        <textarea name="notes" defaultValue={customer.notes} rows={3} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 text-gray-400 hover:bg-white/10 rounded-lg transition">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={submitting}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition disabled:opacity-50">
                                        {submitting ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-neutral-900 rounded-xl p-6 w-full max-w-md border border-red-500/30">
                            <h2 className="text-xl font-bold text-red-400 mb-4">⚠️ Eliminar Cliente</h2>
                            <p className="text-gray-300 mb-4">
                                ¿Estás seguro que deseas eliminar a <strong className="text-white">{customer.businessName || customer.name}</strong>?
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                Esta acción no se puede deshacer. Si el cliente tiene ventas o presupuestos asociados, no podrá ser eliminado.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowDeleteModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:bg-white/10 rounded-lg transition">
                                    Cancelar
                                </button>
                                <button onClick={handleDelete} disabled={submitting}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold transition disabled:opacity-50">
                                    {submitting ? 'Eliminando...' : 'Sí, Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </AuthGuard>
    );
}
