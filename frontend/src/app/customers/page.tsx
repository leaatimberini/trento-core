
"use client";

import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { User } from "../../types";
import { isAdmin } from "../../utils/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import Link from "next/link";
import { Plus, Search, User as UserIcon, ShoppingBag, Edit2 } from "lucide-react";

import DashboardLayout from "../../components/layouts/DashboardLayout";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    // Packaging state
    const [packagingBalance, setPackagingBalance] = useState<any[]>([]);
    const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);

    // Price Lists state
    const [priceLists, setPriceLists] = useState<any[]>([]);

    // Edit Customer state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [customersData, priceListsData] = await Promise.all([
                api.getCustomers(),
                api.getPriceLists().catch(() => [])
            ]);
            setCustomers(customersData);
            setPriceLists(priceListsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadCustomers = async () => {
        try {
            const data = await api.getCustomers();
            setCustomers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        try {
            await api.createCustomer({
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                phone: formData.get("phone") as string,
                type: formData.get("type") as string,
                priceListId: formData.get("priceListId") as string || undefined
            });
            setIsCreateModalOpen(false);
            loadData();
        } catch (e) {
            alert('Error al crear cliente');
        }
    };

    const openEditModal = (customer: any) => {
        setEditingCustomer(customer);
        setIsEditModalOpen(true);
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer) return;
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        try {
            await api.updateCustomer(editingCustomer.id, {
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                phone: formData.get("phone") as string,
                type: formData.get("type") as string,
                priceListId: formData.get("priceListId") as string || null
            });
            setIsEditModalOpen(false);
            setEditingCustomer(null);
            loadData();
        } catch (e) {
            alert('Error al actualizar cliente');
        }
    };

    const viewHistory = (customer: any) => {
        setSelectedCustomer(customer);
        setIsHistoryModalOpen(true);
    };

    const viewPackaging = async (customer: any) => {
        try {
            setSelectedCustomer(customer);
            const data = await api.getPackagingBalance(customer.id);
            setPackagingBalance(data);
            setIsPackagingModalOpen(true);
        } catch (e) {
            alert('Error al cargar balance de envases');
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    {/* ... Header and Search ... */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Clientes</h1>
                            <p className="text-gray-400 mt-1">Gestión de base de datos de clientes.</p>
                        </div>
                        <div className="flex space-x-4">
                            {isAdmin() && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all"
                                >
                                    <Plus size={20} /> <span>Nuevo Cliente</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 mb-6 relative">
                        <Search className="absolute left-6 top-6 text-gray-400" size={20} />
                        <input
                            className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Buscar por nombre, email o teléfono..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-700 text-gray-300">
                                <tr>
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Nivel / Puntos</th>
                                    <th className="p-4">Segmento</th>
                                    <th className="p-4">Lista de Precios</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {customers.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-750">
                                        <td className="p-4 font-medium flex items-center gap-2">
                                            <UserIcon size={16} className="text-gray-400" />
                                            {c.name}
                                        </td>
                                        <td className="p-4 text-gray-400">{c.email || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold px-2 py-1 rounded inline-block w-max mb-1 ${c.loyalty?.level === 'VIP' ? 'bg-purple-900 text-purple-200' :
                                                        c.loyalty?.level === 'ORO' ? 'bg-amber-900 text-amber-200' :
                                                            c.loyalty?.level === 'PLATA' ? 'bg-gray-600 text-gray-200' :
                                                                'bg-gray-800 text-gray-400 border border-gray-700'
                                                    }`}>
                                                    {c.loyalty?.level || 'BRONCE'}
                                                </span>
                                                <span className="text-amber-400 font-mono text-xs">
                                                    {c.loyalty?.currentPoints || 0} pts
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${c.score?.segment === 'CHAMPIONS' ? 'bg-emerald-900 text-emerald-200' :
                                                    c.score?.segment === 'AT_RISK' ? 'bg-red-900 text-red-200' :
                                                        c.score?.segment === 'LOST' ? 'bg-red-950 text-red-400' :
                                                            'bg-gray-700 text-gray-400'
                                                }`}>
                                                {c.score?.segment || 'NUEVO'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {c.priceList ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                                                    {c.priceList.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 text-sm">Por defecto</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button
                                                onClick={() => openEditModal(c)}
                                                className="text-green-400 hover:text-green-300 p-2 hover:bg-gray-700 rounded"
                                                title="Editar Cliente"
                                            >
                                                <Edit2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => viewHistory(c)}
                                                className="text-blue-400 hover:text-blue-300 p-2 hover:bg-gray-700 rounded"
                                                title="Ver Historial de Compras"
                                            >
                                                <ShoppingBag size={20} />
                                            </button>
                                            <button
                                                onClick={() => viewPackaging(c)}
                                                className="text-yellow-400 hover:text-yellow-300 p-2 hover:bg-gray-700 rounded"
                                                title="Ver Balance de Envases"
                                            >
                                                <div className="relative">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="m17 5-5-3-5 3" /><path d="m17 19-5 3-5-3" /><path d="M2 12h20" /><path d="M2 7h20" /><path d="M2 17h20" /></svg>
                                                </div>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {customers.length === 0 && !loading && (
                                    <tr><td colSpan={6} className="p-4 text-center text-gray-500">No se encontraron clientes</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {isCreateModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-700">
                                <h2 className="text-xl font-bold mb-4">Agregar Cliente</h2>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <input name="name" placeholder="Nombre" required className="w-full bg-gray-700 rounded p-2" />
                                    <input name="email" type="email" placeholder="Email" className="w-full bg-gray-700 rounded p-2" />
                                    <input name="phone" placeholder="Teléfono" className="w-full bg-gray-700 rounded p-2" />
                                    <select name="type" className="w-full bg-gray-700 rounded p-2 text-white">
                                        <option value="RETAIL">Cliente Minorista</option>
                                        <option value="WHOLESALE">Mayorista (B2B)</option>
                                    </select>

                                    {/* Price List Selector */}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Lista de Precios</label>
                                        <select name="priceListId" className="w-full bg-gray-700 rounded p-2 text-white">
                                            <option value="">-- Usar lista por defecto --</option>
                                            {priceLists.map(list => (
                                                <option key={list.id} value={list.id}>
                                                    {list.name} {list.isDefault && '(Default)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex justify-end space-x-2 pt-4">
                                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                                        <button type="submit" className="bg-blue-600 px-4 py-2 rounded text-white font-bold">Guardar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Edit Customer Modal */}
                    {isEditModalOpen && editingCustomer && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-700">
                                <h2 className="text-xl font-bold mb-4">Editar Cliente</h2>
                                <form onSubmit={handleEdit} className="space-y-4">
                                    <input name="name" placeholder="Nombre" required className="w-full bg-gray-700 rounded p-2" defaultValue={editingCustomer.name} />
                                    <input name="email" type="email" placeholder="Email" className="w-full bg-gray-700 rounded p-2" defaultValue={editingCustomer.email || ''} />
                                    <input name="phone" placeholder="Teléfono" className="w-full bg-gray-700 rounded p-2" defaultValue={editingCustomer.phone || ''} />
                                    <select name="type" className="w-full bg-gray-700 rounded p-2 text-white" defaultValue={editingCustomer.type || 'RETAIL'}>
                                        <option value="RETAIL">Cliente Minorista</option>
                                        <option value="WHOLESALE">Mayorista (B2B)</option>
                                    </select>

                                    {/* Price List Selector */}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Lista de Precios</label>
                                        <select name="priceListId" className="w-full bg-gray-700 rounded p-2 text-white" defaultValue={editingCustomer.priceListId || ''}>
                                            <option value="">-- Usar lista por defecto --</option>
                                            {priceLists.map(list => (
                                                <option key={list.id} value={list.id}>
                                                    {list.name} {list.isDefault && '(Default)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex justify-end space-x-2 pt-4">
                                        <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); }} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                                        <button type="submit" className="bg-green-600 px-4 py-2 rounded text-white font-bold">Actualizar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {isHistoryModalOpen && selectedCustomer && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 p-8 rounded-xl w-full max-w-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
                                <div className="flex justify-between mb-4">
                                    <h2 className="text-xl font-bold">Historial: {selectedCustomer.name}</h2>
                                    <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                                </div>

                                {selectedCustomer.sales && selectedCustomer.sales.length > 0 ? (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-700">
                                            <tr>
                                                <th className="p-2">Fecha</th>
                                                <th className="p-2">Comprobante</th>
                                                <th className="p-2 text-right">Monto</th>
                                                <th className="p-2">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {selectedCustomer.sales.map((s: any) => (
                                                <tr key={s.id}>
                                                    <td className="p-2">{new Date(s.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-2 font-mono text-gray-400">{s.code}</td>
                                                    <td className="p-2 text-right">${Number(s.totalAmount).toFixed(2)}</td>
                                                    <td className="p-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'COMPLETED' ? 'bg-green-900 text-green-200' : 'bg-gray-700'}`}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-gray-500">Sin historial de compras.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Packaging Modal */}
                    {isPackagingModalOpen && selectedCustomer && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-700">
                                <div className="flex justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-1">Envases Retornables</h2>
                                        <p className="text-gray-400 text-sm">Balance de: {selectedCustomer.name}</p>
                                    </div>
                                    <button onClick={() => setIsPackagingModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                                </div>

                                {packagingBalance.length > 0 ? (
                                    <div className="space-y-3">
                                        {packagingBalance.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-gray-700 p-4 rounded-lg">
                                                <span className="font-bold text-gray-200">{item.type}</span>
                                                <span className={`text-xl font-mono font-bold ${item.quantity > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {item.quantity > 0 ? `-${item.quantity} (Debe)` : `${Math.abs(item.quantity)} (A favor)`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 bg-gray-700/50 rounded-lg">
                                        <p>El cliente no tiene envases pendientes.</p>
                                        <p className="text-xs mt-2">Sin préstamos activos.</p>
                                    </div>
                                )}

                                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                                    <p>ℹ️ Un balance positivo significa que el cliente <strong>debe</strong> envases.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
