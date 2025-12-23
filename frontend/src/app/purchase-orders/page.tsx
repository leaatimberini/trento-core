"use client";

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Product } from "../../types";
import AuthGuard from "../../components/AuthGuard";
import {
    Plus, PackageCheck, ClipboardList, CheckCircle, Truck, Calendar,
    DollarSign, Package, Search, Filter, MoreVertical, Eye, Printer,
    TrendingUp, AlertTriangle, Clock, X, Calculator
} from "lucide-react";
import DashboardLayout from "../../components/layouts/DashboardLayout";

interface Supplier {
    id: string;
    name: string;
    email: string;
    phone: string;
}

interface OrderItem {
    productId: string;
    quantity: number;
    costPrice: number;
    product?: Product;
}

interface PurchaseOrder {
    id: string;
    supplierId: string;
    supplier: Supplier;
    status: string;
    totalAmount: number;
    createdAt: string;
    expectedDate?: string;
    items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    DRAFT: { label: 'Borrador', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
    ORDERED: { label: 'Pendiente', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    RECEIVED: { label: 'Recibido', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
    CANCELLED: { label: 'Cancelado', color: 'text-red-400', bgColor: 'bg-red-500/20' }
};

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [ordersData, suppliersData, productsData] = await Promise.all([
                api.getPurchaseOrders(),
                api.getSuppliers(),
                api.getProducts()
            ]);
            setOrders(ordersData);
            setSuppliers(suppliersData);
            setProducts(productsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleReceive = async (id: string) => {
        if (!confirm("¿Confirmar recepción de mercadería?\n\nEsto sumará el stock al inventario.")) return;
        try {
            await api.receivePurchaseOrder(id, {
                locationZone: 'RECEPCION',
                batchNumber: `REC-${Date.now()}`
            });
            alert("✅ Orden recibida y stock actualizado.");
            loadData();
        } catch (e) {
            alert("❌ Error al recibir orden.");
        }
    };

    const viewOrderDetail = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    // Filter orders
    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
        const matchesSearch = searchQuery === '' ||
            order.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.includes(searchQuery);
        return matchesStatus && matchesSearch;
    });

    // Calculate KPIs
    const kpis = {
        totalPending: orders.filter(o => o.status === 'ORDERED').length,
        totalReceived: orders.filter(o => o.status === 'RECEIVED').length,
        totalValue: orders.filter(o => o.status === 'ORDERED').reduce((sum, o) => sum + Number(o.totalAmount), 0)
    };

    if (loading) {
        return (
            <AuthGuard>
                <DashboardLayout>
                    <div className="flex h-full items-center justify-center text-emerald-500">
                        Cargando órdenes de compra...
                    </div>
                </DashboardLayout>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                                <ClipboardList className="text-emerald-500" /> Órdenes de Compra
                            </h1>
                            <p className="text-gray-400 mt-1">Gestión de compras y reabastecimiento de inventario</p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Plus size={18} /> Nueva Orden de Compra
                        </button>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Órdenes Pendientes</p>
                                    <p className="text-3xl font-bold text-blue-400">{kpis.totalPending}</p>
                                </div>
                                <div className="p-4 bg-blue-500/20 rounded-xl">
                                    <Clock className="text-blue-400" size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Recibidas Este Mes</p>
                                    <p className="text-3xl font-bold text-emerald-400">{kpis.totalReceived}</p>
                                </div>
                                <div className="p-4 bg-emerald-500/20 rounded-xl">
                                    <PackageCheck className="text-emerald-400" size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm">Valor en Tránsito</p>
                                    <p className="text-3xl font-bold text-amber-400">${kpis.totalValue.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-amber-500/20 rounded-xl">
                                    <TrendingUp className="text-amber-400" size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por proveedor o número de orden..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['ALL', 'ORDERED', 'RECEIVED', 'DRAFT'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-xl font-bold transition-all ${statusFilter === status
                                        ? 'bg-emerald-500 text-black'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    {status === 'ALL' ? 'Todos' : STATUS_CONFIG[status]?.label || status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="space-y-4">
                        {filteredOrders.length === 0 ? (
                            <div className="bg-white/5 rounded-2xl p-12 text-center">
                                <Package className="mx-auto text-gray-600 mb-4" size={48} />
                                <p className="text-gray-500">No se encontraron órdenes de compra</p>
                            </div>
                        ) : (
                            filteredOrders.map(order => {
                                const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
                                const itemCount = order.items?.length || 0;
                                const totalUnits = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                                return (
                                    <div
                                        key={order.id}
                                        className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            {/* Left: Order Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-mono text-xs text-gray-500 bg-black/30 px-2 py-1 rounded border border-white/5">
                                                        #{order.id.substring(0, 8)}
                                                    </span>
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                                                        {statusConfig.label.toUpperCase()}
                                                    </span>
                                                    {order.expectedDate && (
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            Esperado: {new Date(order.expectedDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white/5 rounded-xl">
                                                        <Truck className="text-gray-400" size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white">{order.supplier?.name || 'Proveedor'}</h3>
                                                        <p className="text-sm text-gray-400">
                                                            {itemCount} productos • {totalUnits} unidades •
                                                            Creada el {new Date(order.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Amount & Actions */}
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        ${Number(order.totalAmount).toLocaleString()}
                                                    </p>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => viewOrderDetail(order)}
                                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                                        title="Ver Detalle"
                                                    >
                                                        <Eye size={18} className="text-gray-400" />
                                                    </button>

                                                    {order.status === 'ORDERED' && (
                                                        <button
                                                            onClick={() => handleReceive(order.id)}
                                                            className="px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/50 rounded-xl flex items-center gap-2 font-bold transition-all"
                                                        >
                                                            <PackageCheck size={18} /> Recibir
                                                        </button>
                                                    )}

                                                    {order.status === 'RECEIVED' && (
                                                        <div className="px-4 py-3 flex items-center gap-2 text-emerald-500 font-bold opacity-50">
                                                            <CheckCircle size={18} /> Completado
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items Preview */}
                                        {order.items && order.items.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <div className="flex flex-wrap gap-2">
                                                    {order.items.slice(0, 5).map((item, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-400"
                                                        >
                                                            {item.quantity}x {item.product?.name || 'Producto'}
                                                        </span>
                                                    ))}
                                                    {order.items.length > 5 && (
                                                        <span className="text-xs bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-400">
                                                            +{order.items.length - 5} más
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Create Order Modal */}
                    {isCreateModalOpen && (
                        <CreateOrderModal
                            suppliers={suppliers}
                            products={products}
                            onClose={() => setIsCreateModalOpen(false)}
                            onSuccess={() => { setIsCreateModalOpen(false); loadData(); }}
                        />
                    )}

                    {/* Detail Modal */}
                    {isDetailModalOpen && selectedOrder && (
                        <OrderDetailModal
                            order={selectedOrder}
                            onClose={() => setIsDetailModalOpen(false)}
                            onReceive={() => { handleReceive(selectedOrder.id); setIsDetailModalOpen(false); }}
                        />
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}

// ========== CREATE ORDER MODAL ==========
function CreateOrderModal({ suppliers, products, onClose, onSuccess }: {
    suppliers: Supplier[];
    products: Product[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [supplierId, setSupplierId] = useState("");
    const [expectedDate, setExpectedDate] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<{ productId: string; quantity: number; costPrice: number }[]>([]);
    const [searchProduct, setSearchProduct] = useState("");
    const [saving, setSaving] = useState(false);

    const addItem = (product: Product) => {
        if (items.find(i => i.productId === product.id)) {
            // Already in list, increment quantity
            setItems(items.map(i =>
                i.productId === product.id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ));
        } else {
            // costPrice may come from backend but isn't in the frontend Product type
            const productAny = product as any;
            setItems([...items, {
                productId: product.id,
                quantity: 1,
                costPrice: Number(productAny.costPrice) || Number(product.basePrice) || 0
            }]);
        }
        setSearchProduct("");
    };

    const updateItem = (productId: string, field: 'quantity' | 'costPrice', value: number) => {
        setItems(items.map(i =>
            i.productId === productId ? { ...i, [field]: value } : i
        ));
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId));
    };

    const getProduct = (productId: string) => products.find(p => p.id === productId);

    const subtotal = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

    const filteredProducts = products.filter(p =>
        searchProduct && (
            p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchProduct.toLowerCase())
        )
    ).slice(0, 8);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) return alert("Seleccione un proveedor");
        if (items.length === 0) return alert("Agregue al menos un producto");

        setSaving(true);
        try {
            await api.createPurchaseOrder({ supplierId, items, expectedDate, notes });
            onSuccess();
        } catch (err) {
            alert("Error creando orden");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Nueva Orden de Compra</h2>
                        <p className="text-gray-500 text-sm">Complete los datos para generar la orden</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X className="text-gray-400" size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Supplier & Date Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">
                                    Proveedor <span className="text-red-400">*</span>
                                </label>
                                <select
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                                    onChange={e => setSupplierId(e.target.value)}
                                    value={supplierId}
                                >
                                    <option value="">Seleccionar proveedor...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-600 mt-1">
                                    Elige el proveedor al que realizas el pedido
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">
                                    Fecha Esperada de Entrega
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                                    value={expectedDate}
                                    onChange={e => setExpectedDate(e.target.value)}
                                />
                                <p className="text-xs text-gray-600 mt-1">
                                    Opcional: cuándo esperas recibir la mercadería
                                </p>
                            </div>
                        </div>

                        {/* Add Products Section */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-400 mb-2">
                                Agregar Productos
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre o SKU..."
                                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                                    value={searchProduct}
                                    onChange={e => setSearchProduct(e.target.value)}
                                />

                                {/* Search Results Dropdown */}
                                {filteredProducts.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-white/10 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                                        {filteredProducts.map(product => (
                                            <button
                                                type="button"
                                                key={product.id}
                                                onClick={() => addItem(product)}
                                                className="w-full px-4 py-3 flex justify-between items-center hover:bg-white/5 transition-all text-left"
                                            >
                                                <div>
                                                    <p className="font-bold text-white">{product.name}</p>
                                                    <p className="text-xs text-gray-500">SKU: {product.sku} • Stock: {product.currentStock || 0}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-emerald-400 font-bold">${Number((product as any).costPrice || product.basePrice).toLocaleString()}</p>
                                                    <p className="text-xs text-gray-500">Costo actual</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-400">
                                    Productos en la Orden ({items.length})
                                </h3>
                            </div>

                            {items.length === 0 ? (
                                <div className="bg-white/5 rounded-xl p-8 text-center">
                                    <Package className="mx-auto text-gray-600 mb-2" size={32} />
                                    <p className="text-gray-500">Busca y agrega productos para la orden</p>
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-black/30">
                                            <tr className="text-xs text-gray-500 uppercase">
                                                <th className="p-3 text-left">Producto</th>
                                                <th className="p-3 text-center w-24">Cantidad</th>
                                                <th className="p-3 text-center w-32">Costo Unit.</th>
                                                <th className="p-3 text-right w-28">Subtotal</th>
                                                <th className="p-3 w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {items.map(item => {
                                                const product = getProduct(item.productId);
                                                const itemTotal = item.costPrice * item.quantity;
                                                return (
                                                    <tr key={item.productId} className="text-white">
                                                        <td className="p-3">
                                                            <p className="font-bold">{product?.name}</p>
                                                            <p className="text-xs text-gray-500">SKU: {product?.sku}</p>
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-center text-white focus:outline-none focus:border-emerald-500"
                                                                value={item.quantity}
                                                                onChange={e => updateItem(item.productId, 'quantity', Number(e.target.value))}
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-center text-white focus:outline-none focus:border-emerald-500"
                                                                    value={item.costPrice}
                                                                    onChange={e => updateItem(item.productId, 'costPrice', Number(e.target.value))}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-emerald-400">
                                                            ${itemTotal.toLocaleString()}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(item.productId)}
                                                                className="text-red-500 hover:text-red-400 p-1"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">
                                Notas / Instrucciones
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Ej: Entregar por depósito trasero, llamar al llegar..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Footer with Total */}
                    <div className="p-6 border-t border-white/10 bg-black/30">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-gray-400">
                                <p className="text-sm">Total de la Orden</p>
                                <p className="text-xs text-gray-600">{items.length} productos • {items.reduce((s, i) => s + i.quantity, 0)} unidades</p>
                            </div>
                            <p className="text-3xl font-bold text-white">
                                ${subtotal.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving || items.length === 0}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>Creando...</>
                                ) : (
                                    <><Plus size={18} /> Crear Orden de Compra</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ========== ORDER DETAIL MODAL ==========
function OrderDetailModal({ order, onClose, onReceive }: {
    order: PurchaseOrder;
    onClose: () => void;
    onReceive: () => void;
}) {
    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
    const totalUnits = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-white/10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm text-gray-500">#{order.id.substring(0, 8)}</span>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                                {statusConfig.label.toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">{order.supplier?.name}</h2>
                        <p className="text-gray-500 text-sm">Creada el {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X className="text-gray-400" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-white">{order.items?.length || 0}</p>
                            <p className="text-xs text-gray-500">Productos</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-white">{totalUnits}</p>
                            <p className="text-xs text-gray-500">Unidades</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-emerald-400">${Number(order.totalAmount).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Total</p>
                        </div>
                    </div>

                    {/* Items List */}
                    <h3 className="text-sm font-bold text-gray-400 mb-3">Detalle de Productos</h3>
                    <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="bg-white/5 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{item.product?.name || 'Producto'}</p>
                                    <p className="text-xs text-gray-500">Costo unitario: ${Number(item.costPrice).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white">{item.quantity} uds.</p>
                                    <p className="text-sm text-emerald-400">${(Number(item.costPrice) * item.quantity).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                    {order.status === 'ORDERED' && (
                        <button
                            onClick={onReceive}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <PackageCheck size={18} /> Confirmar Recepción
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
