"use client";

import { useState, useEffect } from "react";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Plus, Edit2, Trash2, Star, Percent, Package, Check, X, RefreshCw, Search } from "lucide-react";

interface PriceList {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    markup?: number;
    items?: PriceListItem[];
    _count?: { items: number; customers: number };
}

interface PriceListItem {
    id: string;
    productId: string;
    price: number;
    product?: { name: string; sku: string; costPrice: number };
}

interface Product {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    basePrice: number;
    category?: string;
}

export default function PriceListsPage() {
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedList, setSelectedList] = useState<PriceList | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', markup: 0, isDefault: false });
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<{ productId: string; price: number } | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [listsRes, productsRes] = await Promise.all([
                fetch('/api/pricing/lists', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/products')
            ]);

            if (listsRes.ok) setPriceLists(await listsRes.json());
            if (productsRes.ok) setProducts(await productsRes.json());
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/pricing/lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                await loadData();
                setShowCreateModal(false);
                setFormData({ name: '', description: '', markup: 0, isDefault: false });
            }
        } catch (error) {
            console.error('Error creating list:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta lista de precios?')) return;

        try {
            await fetch(`/api/pricing/lists/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            await loadData();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const handleApplyMarkup = async (listId: string, markup: number) => {
        setSaving(true);
        try {
            await fetch(`/api/pricing/lists/${listId}/markup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ markupPercentage: markup })
            });
            await loadListDetails(listId);
        } catch (error) {
            console.error('Error applying markup:', error);
        } finally {
            setSaving(false);
        }
    };

    const loadListDetails = async (listId: string) => {
        try {
            const res = await fetch(`/api/pricing/lists/${listId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedList(data);
            }
        } catch (error) {
            console.error('Error loading list:', error);
        }
    };

    const handleUpdateItemPrice = async (productId: string, price: number) => {
        if (!selectedList) return;

        try {
            await fetch(`/api/pricing/lists/${selectedList.id}/items/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ price })
            });
            await loadListDetails(selectedList.id);
            setEditingItem(null);
        } catch (error) {
            console.error('Error updating price:', error);
        }
    };

    const handleAddItem = async (productId: string) => {
        if (!selectedList) return;

        const product = products.find(p => p.id === productId);
        if (!product) return;

        const cost = Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.basePrice);
        const suggestedPrice = cost * (1 + (selectedList.markup || 30) / 100);

        try {
            await fetch(`/api/pricing/lists/${selectedList.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ productId, price: Math.round(suggestedPrice) })
            });
            await loadListDetails(selectedList.id);
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleRemoveItem = async (productId: string) => {
        if (!selectedList) return;

        try {
            await fetch(`/api/pricing/lists/${selectedList.id}/items/${productId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            await loadListDetails(selectedList.id);
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const productsNotInList = selectedList
        ? filteredProducts.filter(p => !selectedList.items?.find(i => i.productId === p.id))
        : [];

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Listas de Precios</h1>
                            <p className="text-gray-400">Gestiona los precios de venta por lista</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl font-bold transition-all"
                        >
                            <Plus size={20} /> Nueva Lista
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <RefreshCw className="animate-spin text-amber-500" size={32} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Lists Column */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Package size={20} className="text-amber-500" />
                                    Listas Disponibles
                                </h2>

                                {priceLists.length === 0 ? (
                                    <div className="bg-white/5 rounded-xl p-8 text-center border border-dashed border-white/10">
                                        <p className="text-gray-400 mb-4">No hay listas de precios</p>
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="text-amber-500 hover:text-amber-400"
                                        >
                                            Crear primera lista
                                        </button>
                                    </div>
                                ) : (
                                    priceLists.map(list => (
                                        <div
                                            key={list.id}
                                            className={`bg-white/5 rounded-xl p-4 border transition-all cursor-pointer ${selectedList?.id === list.id
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-white/10 hover:border-white/20'
                                                }`}
                                            onClick={() => {
                                                loadListDetails(list.id);
                                                setShowItemsModal(true);
                                            }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-white">{list.name}</h3>
                                                        {list.isDefault && (
                                                            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Star size={10} fill="currentColor" /> Por defecto
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-400">{list.description || 'Sin descripción'}</p>
                                                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                                        <span>{list._count?.items || 0} productos</span>
                                                        <span>{list._count?.customers || 0} clientes</span>
                                                        {list.markup && <span className="text-emerald-400">+{list.markup}%</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(list.id);
                                                    }}
                                                    className="text-gray-500 hover:text-red-400 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Quick Info */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-6 border border-amber-500/30">
                                    <h3 className="text-lg font-bold text-white mb-4">💡 Cómo funcionan las Listas de Precios</h3>
                                    <ul className="space-y-2 text-gray-300 text-sm">
                                        <li>• Los productos tienen un <strong className="text-amber-400">Precio de Costo</strong> (lo que pagás)</li>
                                        <li>• Cada lista define <strong className="text-amber-400">Precios de Venta</strong> para cada producto</li>
                                        <li>• La lista <strong className="text-amber-400">Por Defecto</strong> se usa en la tienda online</li>
                                        <li>• Podés asignar listas específicas a <strong className="text-amber-400">Clientes</strong></li>
                                        <li>• En el <strong className="text-amber-400">POS</strong> podés elegir qué lista usar</li>
                                    </ul>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <div className="text-3xl font-bold text-white">{priceLists.length}</div>
                                        <div className="text-gray-400 text-sm">Listas activas</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <div className="text-3xl font-bold text-white">{products.length}</div>
                                        <div className="text-gray-400 text-sm">Productos totales</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create List Modal */}
                    {showCreateModal && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
                                <div className="p-6 border-b border-gray-700">
                                    <h2 className="text-xl font-bold text-white">Nueva Lista de Precios</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Nombre</label>
                                        <input
                                            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-amber-500 outline-none"
                                            placeholder="Ej: Minorista, Mayorista, VIP"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Descripción</label>
                                        <input
                                            className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-amber-500 outline-none"
                                            placeholder="Descripción opcional"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Margen por defecto (%)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-amber-500 outline-none pr-10"
                                                placeholder="30"
                                                value={formData.markup}
                                                onChange={e => setFormData({ ...formData, markup: Number(e.target.value) })}
                                            />
                                            <Percent size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Se aplicará sobre el costo al agregar productos</p>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isDefault}
                                            onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                            className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500"
                                        />
                                        <span className="text-white">Establecer como lista por defecto</span>
                                    </label>
                                </div>
                                <div className="p-6 border-t border-gray-700 flex gap-3">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateList}
                                        disabled={saving || !formData.name}
                                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-lg font-bold disabled:opacity-50"
                                    >
                                        {saving ? 'Guardando...' : 'Crear Lista'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Items Modal */}
                    {showItemsModal && selectedList && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 rounded-xl max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            {selectedList.name}
                                            {selectedList.isDefault && (
                                                <Star size={16} className="text-amber-500" fill="currentColor" />
                                            )}
                                        </h2>
                                        <p className="text-sm text-gray-400">{selectedList.items?.length || 0} productos con precio asignado</p>
                                    </div>
                                    <button onClick={() => setShowItemsModal(false)} className="text-gray-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-4 border-b border-gray-700 flex gap-4">
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            className="w-full bg-gray-700 text-white p-2 pl-10 rounded-lg border border-gray-600 focus:border-amber-500 outline-none"
                                            placeholder="Buscar producto..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleApplyMarkup(selectedList.id, selectedList.markup || 30)}
                                        disabled={saving}
                                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                                    >
                                        <Percent size={16} />
                                        Aplicar {selectedList.markup || 30}% a todos
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-4">
                                    {/* Products in list */}
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-white text-sm mb-2">EN ESTA LISTA</h3>
                                        {selectedList.items?.map(item => {
                                            const product = products.find(p => p.id === item.productId);
                                            const cost = Number(product?.costPrice) > 0 ? Number(product?.costPrice) : Number(product?.basePrice || 0);
                                            const margin = cost > 0 ? ((Number(item.price) - cost) / cost * 100).toFixed(0) : '-';

                                            return (
                                                <div key={item.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-bold text-white text-sm">{product?.name || 'Producto'}</p>
                                                            <p className="text-xs text-gray-500">{product?.sku}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveItem(item.productId)}
                                                            className="text-red-400 hover:text-red-300 p-1"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-gray-500">Costo: ${cost}</span>
                                                        <span className="text-xs text-emerald-400">+{margin}%</span>
                                                        {editingItem?.productId === item.productId ? (
                                                            <div className="flex items-center gap-1 ml-auto">
                                                                <input
                                                                    type="number"
                                                                    className="w-20 bg-gray-700 text-white p-1 rounded text-sm"
                                                                    value={editingItem.price}
                                                                    onChange={e => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdateItemPrice(item.productId, editingItem.price)}
                                                                    className="text-emerald-400 p-1"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingItem(null)}
                                                                    className="text-gray-400 p-1"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingItem({ productId: item.productId, price: Number(item.price) })}
                                                                className="ml-auto text-amber-400 font-bold flex items-center gap-1"
                                                            >
                                                                ${Number(item.price).toLocaleString()}
                                                                <Edit2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!selectedList.items || selectedList.items.length === 0) && (
                                            <p className="text-gray-500 text-sm text-center py-4">No hay productos en esta lista</p>
                                        )}
                                    </div>

                                    {/* Products not in list */}
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-white text-sm mb-2">AGREGAR PRODUCTOS</h3>
                                        {productsNotInList.slice(0, 20).map(product => (
                                            <div key={product.id} className="bg-white/5 rounded-lg p-3 border border-white/10 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-white text-sm">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.sku} • Costo: ${Number(product.costPrice) > 0 ? Number(product.costPrice) : Number(product.basePrice)}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddItem(product.id)}
                                                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1 rounded-lg text-sm font-bold"
                                                >
                                                    + Agregar
                                                </button>
                                            </div>
                                        ))}
                                        {productsNotInList.length === 0 && (
                                            <p className="text-gray-500 text-sm text-center py-4">Todos los productos están en la lista</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
