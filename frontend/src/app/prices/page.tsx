"use client";

import { useState, useEffect } from "react";
import { api } from "../../services/api";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import {
    Plus, DollarSign, Users, Package, Percent, Edit2, Trash2,
    Search, X, Check, ChevronRight, Calculator, Tag
} from "lucide-react";

interface PriceList {
    id: string;
    name: string;
    description?: string;
    markup?: number;
    isDefault: boolean;
    _count?: { items: number; customers: number };
}

interface PriceListItem {
    id: string;
    productId: string;
    price: number;
    product?: { id: string; name: string; sku: string; costPrice: number };
}

interface PriceListDetail extends PriceList {
    items: PriceListItem[];
    customers: { id: string; name: string }[];
}

// Use any[] for products to avoid type conflicts with global Product type
type ProductAny = any;

export default function PreciosPage() {
    const [lists, setLists] = useState<PriceList[]>([]);
    const [products, setProducts] = useState<ProductAny[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedList, setSelectedList] = useState<PriceListDetail | null>(null);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddProductsOpen, setIsAddProductsOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [listsData, productsData] = await Promise.all([
                api.getPriceLists(),
                api.getProducts()
            ]);
            setLists(listsData);
            setProducts(productsData);
        } catch (e) {
            console.error("Error loading price lists", e);
        } finally {
            setLoading(false);
        }
    };

    const loadListDetail = async (id: string) => {
        try {
            const detail = await api.getPriceListDetail(id);
            setSelectedList(detail);
        } catch (e) {
            console.error("Error loading list detail", e);
        }
    };

    const handleCreateList = async (data: { name: string; description?: string; markup?: number; isDefault?: boolean }) => {
        try {
            await api.createPriceList(data);
            setIsCreateModalOpen(false);
            loadData();
        } catch (e) {
            alert("Error creando lista");
        }
    };

    const handleDeleteList = async (id: string) => {
        if (!confirm("¿Eliminar esta lista de precios?")) return;
        try {
            await api.deletePriceList(id);
            setSelectedList(null);
            loadData();
        } catch (e) {
            alert("Error eliminando lista");
        }
    };

    const handleApplyMarkup = async (markupPercentage: number) => {
        if (!selectedList) return;
        try {
            await api.applyPriceListMarkup(selectedList.id, markupPercentage);
            loadListDetail(selectedList.id);
        } catch (e) {
            alert("Error aplicando markup");
        }
    };

    const handleUpdatePrice = async (productId: string, price: number) => {
        if (!selectedList) return;
        try {
            await api.updatePriceListItem(selectedList.id, productId, price);
            loadListDetail(selectedList.id);
        } catch (e) {
            alert("Error actualizando precio");
        }
    };

    const handleAddProducts = async (items: { productId: string; price: number }[]) => {
        if (!selectedList) return;
        try {
            await api.addPriceListItems(selectedList.id, items);
            setIsAddProductsOpen(false);
            loadListDetail(selectedList.id);
        } catch (e) {
            alert("Error agregando productos");
        }
    };

    if (loading) {
        return (
            <AuthGuard>
                <DashboardLayout>
                    <div className="flex h-full items-center justify-center text-amber-500">
                        Cargando listas de precios...
                    </div>
                </DashboardLayout>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                                <Tag className="text-amber-500" /> Listas de Precios
                            </h1>
                            <p className="text-gray-400 mt-1">
                                Gestiona los precios de venta para diferentes tipos de clientes
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-3 rounded-xl font-bold transition-all"
                        >
                            <Plus size={18} /> Nueva Lista
                        </button>
                    </div>

                    {/* Main Layout: Lists + Detail */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                        {/* Lists Column */}
                        <div className="lg:col-span-1 space-y-3 overflow-y-auto">
                            {lists.length === 0 ? (
                                <div className="bg-white/5 rounded-2xl p-8 text-center">
                                    <DollarSign className="mx-auto text-gray-600 mb-4" size={48} />
                                    <p className="text-gray-500">No hay listas de precios</p>
                                    <p className="text-gray-600 text-sm">Crea tu primera lista para comenzar</p>
                                </div>
                            ) : (
                                lists.map(list => (
                                    <div
                                        key={list.id}
                                        onClick={() => loadListDetail(list.id)}
                                        className={`bg-white/5 rounded-xl p-4 cursor-pointer transition-all border ${selectedList?.id === list.id
                                            ? 'border-amber-500'
                                            : 'border-white/5 hover:border-amber-500/30'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-white">{list.name}</h3>
                                                    {list.isDefault && (
                                                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                                            Por defecto
                                                        </span>
                                                    )}
                                                </div>
                                                {list.description && (
                                                    <p className="text-sm text-gray-500 mt-1">{list.description}</p>
                                                )}
                                            </div>
                                            <ChevronRight className="text-gray-600" size={18} />
                                        </div>
                                        <div className="flex gap-4 mt-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Package size={12} /> {list._count?.items || 0} productos
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={12} /> {list._count?.customers || 0} clientes
                                            </span>
                                            {list.markup && (
                                                <span className="flex items-center gap-1 text-amber-400">
                                                    <Percent size={12} /> {Number(list.markup)}% markup
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Detail Column */}
                        <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/5 overflow-hidden flex flex-col">
                            {!selectedList ? (
                                <div className="flex-1 flex items-center justify-center text-gray-500">
                                    Selecciona una lista para ver sus productos
                                </div>
                            ) : (
                                <>
                                    {/* Detail Header */}
                                    <div className="p-6 border-b border-white/10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-2xl font-bold text-white">{selectedList.name}</h2>
                                                {selectedList.description && (
                                                    <p className="text-gray-400 mt-1">{selectedList.description}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsAddProductsOpen(true)}
                                                    className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-2 rounded-lg text-sm font-bold"
                                                >
                                                    <Plus size={16} /> Agregar Productos
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteList(selectedList.id)}
                                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="flex gap-4 mt-4">
                                            <div className="bg-white/5 rounded-lg px-4 py-2">
                                                <p className="text-2xl font-bold text-white">{selectedList.items.length}</p>
                                                <p className="text-xs text-gray-500">Productos</p>
                                            </div>
                                            <div className="bg-white/5 rounded-lg px-4 py-2">
                                                <p className="text-2xl font-bold text-white">{selectedList.customers?.length || 0}</p>
                                                <p className="text-xs text-gray-500">Clientes</p>
                                            </div>

                                            {/* Markup Apply */}
                                            <div className="flex-1 flex items-center justify-end gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="% markup"
                                                    className="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                                    id="markupInput"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const input = document.getElementById('markupInput') as HTMLInputElement;
                                                        const val = parseFloat(input.value);
                                                        if (!isNaN(val)) handleApplyMarkup(val);
                                                    }}
                                                    className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-2 rounded-lg text-sm font-bold"
                                                >
                                                    <Calculator size={16} /> Aplicar a Todos
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Products Table */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {selectedList.items.length === 0 ? (
                                            <div className="text-center text-gray-500 py-12">
                                                <Package className="mx-auto mb-4" size={48} />
                                                <p>No hay productos en esta lista</p>
                                                <p className="text-sm">Usa "Agregar Productos" para añadir productos</p>
                                            </div>
                                        ) : (
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-xs text-gray-500 uppercase border-b border-white/5">
                                                        <th className="p-3 text-left">Producto</th>
                                                        <th className="p-3 text-right">Costo</th>
                                                        <th className="p-3 text-right">Precio Venta</th>
                                                        <th className="p-3 text-right">Margen</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {selectedList.items.map(item => {
                                                        const cost = Number(item.product?.costPrice || 0);
                                                        const price = Number(item.price);
                                                        const margin = cost > 0 ? ((price - cost) / cost * 100).toFixed(1) : "N/A";

                                                        return (
                                                            <tr key={item.id} className="text-white">
                                                                <td className="p-3">
                                                                    <p className="font-bold">{item.product?.name}</p>
                                                                    <p className="text-xs text-gray-500">SKU: {item.product?.sku}</p>
                                                                </td>
                                                                <td className="p-3 text-right text-gray-400">
                                                                    ${cost.toLocaleString()}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    <input
                                                                        type="number"
                                                                        className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1 text-right text-white"
                                                                        defaultValue={price}
                                                                        onBlur={(e) => {
                                                                            const newPrice = parseFloat(e.target.value);
                                                                            if (!isNaN(newPrice) && newPrice !== price) {
                                                                                handleUpdatePrice(item.productId, newPrice);
                                                                            }
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className={`p-3 text-right font-bold ${Number(margin) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                                    }`}>
                                                                    {margin}%
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Create List Modal */}
                    {isCreateModalOpen && (
                        <CreateListModal
                            onClose={() => setIsCreateModalOpen(false)}
                            onCreate={handleCreateList}
                        />
                    )}

                    {/* Add Products Modal */}
                    {isAddProductsOpen && selectedList && (
                        <AddProductsModal
                            products={products}
                            existingProductIds={selectedList.items.map(i => i.productId)}
                            onClose={() => setIsAddProductsOpen(false)}
                            onAdd={handleAddProducts}
                        />
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}

// ========== CREATE LIST MODAL ==========
function CreateListModal({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (data: { name: string; description?: string; markup?: number; isDefault?: boolean }) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [markup, setMarkup] = useState<number | undefined>();
    const [isDefault, setIsDefault] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return alert("Ingresa un nombre");
        onCreate({ name, description, markup, isDefault });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Nueva Lista de Precios</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Nombre *</label>
                        <input
                            type="text"
                            placeholder="Ej: Mayorista"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Descripción</label>
                        <textarea
                            rows={2}
                            placeholder="Descripción opcional..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white resize-none"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-1">Markup Predeterminado (%)</label>
                        <input
                            type="number"
                            placeholder="Ej: 30"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                            value={markup || ""}
                            onChange={e => setMarkup(parseFloat(e.target.value) || undefined)}
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            Se usa para calcular precios automáticamente sobre el costo
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsDefault(!isDefault)}
                            className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isDefault ? 'bg-amber-500 border-amber-500' : 'border-white/20'
                                }`}
                        >
                            {isDefault && <Check size={14} className="text-black" />}
                        </button>
                        <span className="text-gray-400">Usar como lista por defecto</span>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-bold"
                        >
                            Crear Lista
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ========== ADD PRODUCTS MODAL ==========
function AddProductsModal({ products, existingProductIds, onClose, onAdd }: {
    products: ProductAny[];
    existingProductIds: string[];
    onClose: () => void;
    onAdd: (items: { productId: string; price: number }[]) => void;
}) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Map<string, number>>(new Map());
    const [markup, setMarkup] = useState(30);

    const availableProducts = products.filter((p: ProductAny) =>
        !existingProductIds.includes(p.id) &&
        (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleProduct = (product: ProductAny) => {
        const newSelected = new Map(selected);
        if (newSelected.has(product.id)) {
            newSelected.delete(product.id);
        } else {
            // Calculate price with markup
            const cost = Number(product.costPrice) || 0;
            const price = cost * (1 + markup / 100);
            newSelected.set(product.id, Math.round(price * 100) / 100);
        }
        setSelected(newSelected);
    };

    const handleAdd = () => {
        const items = Array.from(selected.entries()).map(([productId, price]) => ({
            productId,
            price
        }));
        onAdd(items);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Agregar Productos</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm">Markup:</span>
                            <input
                                type="number"
                                className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-white text-center"
                                value={markup}
                                onChange={e => setMarkup(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-gray-500">%</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {availableProducts.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            No hay productos disponibles para agregar
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {availableProducts.map(product => {
                                const isSelected = selected.has(product.id);
                                const cost = Number(product.costPrice) || 0;
                                const price = isSelected ? selected.get(product.id)! : cost * (1 + markup / 100);

                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => toggleProduct(product)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all flex justify-between items-center ${isSelected
                                            ? 'bg-amber-500/20 border border-amber-500/50'
                                            : 'bg-white/5 border border-transparent hover:border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-white/20'
                                                }`}>
                                                {isSelected && <Check size={14} className="text-black" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{product.name}</p>
                                                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500 text-sm">Costo: ${cost.toLocaleString()}</p>
                                            <p className="text-amber-400 font-bold">Precio: ${price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-between items-center">
                    <span className="text-gray-400">
                        {selected.size} productos seleccionados
                    </span>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={selected.size === 0}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold disabled:opacity-50"
                        >
                            Agregar {selected.size > 0 && `(${selected.size})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
