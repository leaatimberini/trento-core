"use client"
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Product, CreateProductDto } from '../../types';
import { Plus, Search, Edit2, Trash2, Archive, ArrowRightLeft, TrendingUp, AlertTriangle, Upload, Download, X, Package, Sparkles, Loader2, Printer } from 'lucide-react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import AuthGuard from '../../components/AuthGuard';

// Helper for formatted currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Stock Modal specific state
    const [stockAction, setStockAction] = useState<'receive' | 'adjust' | 'transfer' | null>(null);
    const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
    const [stockQuantity, setStockQuantity] = useState(0);
    const [stockReason, setStockReason] = useState('');
    const [targetLocation, setTargetLocation] = useState('');

    // Form state for Create/Edit
    const [uploading, setUploading] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({
        name: "",
        sku: "",
        ean: "", // Barcode
        category: "",
        costPrice: 0,
        basePrice: 0,
        minStock: 0,
        currentStock: 0,
        imageUrl: "",
        weight: 0,
        height: 0,
        width: 0,
        depth: 0,
    });

    // AI Description Generator
    const generateAIDescription = async () => {
        if (!formData.name) {
            alert('Ingresá el nombre del producto primero');
            return;
        }

        setGeneratingAI(true);
        try {
            const res = await fetch('/api/products/ai/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    category: formData.category,
                    brand: formData.brand
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.description) {
                    setFormData(prev => ({ ...prev, description: data.description }));
                }
            }
        } catch (error) {
            console.error('AI generation error:', error);
        } finally {
            setGeneratingAI(false);
        }
    };

    // Auto-generate SKU
    const generateSKU = async () => {
        if (!formData.name) {
            alert('Ingresá el nombre del producto primero');
            return;
        }

        try {
            const res = await fetch('/api/products/ai/generate-sku', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    category: formData.category,
                    brand: formData.brand
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.sku) {
                    setFormData(prev => ({ ...prev, sku: data.sku }));
                }
            }
        } catch (error) {
            console.error('SKU generation error:', error);
        }
    };

    // Lookup dimensions with AI
    const [lookingUpDimensions, setLookingUpDimensions] = useState(false);
    const lookupDimensions = async () => {
        if (!formData.name) {
            alert('Ingresá el nombre del producto primero');
            return;
        }

        setLookingUpDimensions(true);
        try {
            const res = await fetch('/api/products/ai/lookup-dimensions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    category: formData.category,
                    brand: formData.brand
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setFormData(prev => ({
                        ...prev,
                        weight: data.weight || 0,
                        height: data.height || 0,
                        width: data.width || 0,
                        depth: data.depth || 0
                    }));
                }
            }
        } catch (error) {
            console.error('Dimension lookup error:', error);
        } finally {
            setLookingUpDimensions(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            const blob = await api.exportInventory();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) { alert('Error exportando inventario'); }
    };

    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const res = await api.importInventory(file);
            alert(`Importación: Total ${res.total}, Actualizados ${res.updated}, Errores ${res.errors}`);
            loadProducts();
        } catch (e) { alert('Error importando inventario'); }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        // Sort by Category then Name
        const catA = (a.category || '').toUpperCase();
        const catB = (b.category || '').toUpperCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return a.name.localeCompare(b.name);
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await api.uploadImage(file);
            setFormData(prev => ({ ...prev, imageUrl: res.url }));
        } catch (error) {
            alert("Error al subir imagen");
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await api.updateProduct(editingProduct.id, formData);
                alert('Producto actualizado');
            } else {
                await api.createProduct(formData as CreateProductDto);
                alert('Producto creado');
            }
            setIsCreateModalOpen(false);
            setEditingProduct(null);
            resetForm();
            loadProducts();
        } catch (error) {
            alert('Error al guardar producto');
            console.error(error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            ean: '',
            description: '',
            basePrice: 0,
            currentStock: 0,
            minStock: 5,
            category: '',
            brand: '',
            imageUrl: '',
            weight: 0, height: 0, width: 0, depth: 0
        });
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        resetForm();
        setIsCreateModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            ean: product.ean || '',
            description: product.description || '',
            basePrice: Number(product.basePrice), // ensure number
            currentStock: product.currentStock || 0,
            minStock: product.minStock || 0,
            category: product.category || '',
            brand: product.brand || '',
            imageUrl: product.imageUrl || '',
            weight: product.weight || 0,
            height: product.height || 0,
            width: product.width || 0,
            depth: product.depth || 0
        });
        setIsCreateModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await api.deleteProduct(confirmDeleteId);
            setConfirmDeleteId(null);
            loadProducts();
        } catch (error) {
            alert('Error al eliminar producto');
        }
    };

    const openStockModal = (product: Product, action: 'receive' | 'adjust' | 'transfer') => {
        setSelectedProductForStock(product);
        setStockAction(action);
        setStockQuantity(0);
        setStockReason('');
        setTargetLocation('');
        setIsStockModalOpen(true);
    };

    const handleStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductForStock || !stockAction) return;

        try {
            if (stockAction === 'receive') {
                await api.receiveStock({
                    productId: selectedProductForStock.id,
                    quantity: stockQuantity,
                    batchNumber: `BATCH-${Date.now()}`, // Auto-generate for now
                    locationZone: 'A-01-01', // Default
                });
            } else if (stockAction === 'adjust') {
                await api.adjustStock({
                    productId: selectedProductForStock.id,
                    quantity: stockQuantity,
                    reason: stockReason
                });
            } else if (stockAction === 'transfer') {
                await api.transferStock({
                    productId: selectedProductForStock.id,
                    quantity: stockQuantity,
                    fromLocation: 'Warehouse A', // Default for now
                    toLocation: targetLocation
                });
            }
            alert('Operación exitosa');
            setIsStockModalOpen(false);
            loadProducts();
        } catch (error) {
            alert('Error en operación de stock');
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Inventario (Categorizado)</h1>
                        <div className="flex gap-2">
                            <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept=".csv" />
                            <button
                                onClick={() => window.open('/inventory/labels', '_blank')}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                <Printer size={20} />
                                <span>Etiquetas</span>
                            </button>
                            <button
                                onClick={handleImportClick}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                <Upload size={20} />
                                Importar
                            </button>
                            <button
                                onClick={handleExport}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                <Download size={20} />
                                Exportar
                            </button>
                            <button
                                onClick={openCreateModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Nuevo Producto
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, SKU o categoría..."
                                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                                value={search}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-white text-center py-10">Cargando inventario...</div>
                    ) : (
                        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-700 text-gray-300">
                                        <tr>
                                            <th className="p-4">Producto</th>
                                            <th className="p-4">SKU</th>
                                            <th className="p-4">Categoría</th>
                                            <th className="p-4">Stock</th>
                                            <th className="p-4">Precio</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {filteredProducts.map(product => (
                                            <tr key={product.id} className="hover:bg-gray-750">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 border border-gray-600">
                                                            {product.imageUrl ? (
                                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                                    <Package size={20} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-white">{product.name}</div>
                                                            <div className="text-sm text-gray-400">{product.brand}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300">{product.sku}</td>
                                                <td className="p-4 text-gray-300">{product.category}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`font-medium ${(product.currentStock || 0) <= (product.minStock || 0) ? 'text-red-400' : 'text-green-400'}`}>
                                                            {product.currentStock || 0}
                                                        </div>
                                                        <button
                                                            onClick={() => openStockModal(product, 'adjust')}
                                                            className="text-gray-500 hover:text-white p-1 rounded hover:bg-gray-600"
                                                            title="Corregir Stock"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-white font-mono">
                                                    {formatCurrency(Number(product.basePrice))}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => openEditModal(product)}
                                                            className="p-2 bg-gray-700 hover:bg-blue-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openStockModal(product, 'receive')}
                                                            className="p-2 bg-gray-700 hover:bg-green-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                                                            title="Recibir Stock"
                                                        >
                                                            <Archive size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openStockModal(product, 'adjust')}
                                                            className="p-2 bg-gray-700 hover:bg-yellow-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                                                            title="Ajustar Stock"
                                                        >
                                                            <AlertTriangle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(product.id)}
                                                            className="p-2 bg-gray-700 hover:bg-red-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Create/Edit Modal */}
                    {isCreateModalOpen && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
                            <div className="bg-gray-800 rounded-xl max-w-2xl w-full border border-gray-700 shadow-2xl my-8">
                                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-850 rounded-t-xl">
                                    <h2 className="text-xl font-bold text-white">
                                        {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                                    </h2>
                                    <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmitProduct} className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-gray-400 text-sm mb-1">Nombre del Producto</label>
                                            <input required
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <div>
                                                <label className="block text-gray-400 mb-1">SKU (Código Interno)</label>
                                                <input
                                                    type="text"
                                                    value={formData.sku || ""}
                                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                                    className="w-full bg-gray-700 rounded p-2 text-white"
                                                    placeholder="Ej: BEB-001"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-gray-400 mb-1">Código de Barras (EAN)</label>
                                                <input
                                                    type="text"
                                                    value={formData.ean || ""}
                                                    onChange={e => setFormData({ ...formData, ean: e.target.value })}
                                                    className="w-full bg-gray-700 rounded p-2 text-white"
                                                    placeholder="Ej: 7791234567890"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-gray-400 text-sm">SKU</label>
                                                <button
                                                    type="button"
                                                    onClick={generateSKU}
                                                    disabled={!formData.name}
                                                    className="text-xs px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded transition-all disabled:opacity-50 border border-blue-500/30"
                                                >
                                                    Auto
                                                </button>
                                            </div>
                                            <input required
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none font-mono"
                                                value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                                placeholder="Auto-generado"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Categoría</label>
                                            <input
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                                value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Marca</label>
                                            <input
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                                value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Precio</label>
                                            <input type="number" required min="0"
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                                value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Stock Inicial</label>
                                            <input type="number" required min="0" disabled={!!editingProduct}
                                                className={`w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none ${editingProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                value={formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Stock Mínimo</label>
                                            <input type="number" required min="0"
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                                value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                                            />
                                        </div>

                                        {/* Dimensiones para Envío */}
                                        <div className="col-span-2 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                                                    📦 Dimensiones para Envío
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={lookupDimensions}
                                                    disabled={lookingUpDimensions || !formData.name}
                                                    className="flex items-center gap-1 text-xs px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-full transition-all disabled:opacity-50 border border-purple-500/30"
                                                >
                                                    {lookingUpDimensions ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={12} />
                                                    )}
                                                    {lookingUpDimensions ? 'Buscando...' : 'Buscar con IA'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-gray-500 text-xs mb-1">Peso (kg)</label>
                                                    <input type="number" step="0.01"
                                                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                                                        value={formData.weight} onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-500 text-xs mb-1">Alto (cm)</label>
                                                    <input type="number" step="0.1"
                                                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                                                        value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-500 text-xs mb-1">Ancho (cm)</label>
                                                    <input type="number" step="0.1"
                                                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                                                        value={formData.width} onChange={e => setFormData({ ...formData, width: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-500 text-xs mb-1">Prof. (cm)</label>
                                                    <input type="number" step="0.1"
                                                        className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                                                        value={formData.depth} onChange={e => setFormData({ ...formData, depth: Number(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Necesario para cálculo de envío (Andreani, Rappi, PedidosYa)
                                            </p>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-gray-400 text-sm mb-2">Imagen del Producto</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-24 h-24 bg-gray-700 rounded-lg overflow-hidden border border-gray-600 flex-shrink-0">
                                                    {formData.imageUrl ? (
                                                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                            <Upload size={24} />
                                                        </div>
                                                    )}
                                                    {uploading && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="block w-full text-sm text-gray-400
                                                        file:mr-4 file:py-2 file:px-4
                                                        file:rounded-full file:border-0
                                                        file:text-sm file:font-semibold
                                                        file:bg-blue-600 file:text-white
                                                        hover:file:bg-blue-700
                                                        cursor-pointer"
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP hasta 5MB</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-gray-400 text-sm">Descripción</label>
                                                <button
                                                    type="button"
                                                    onClick={generateAIDescription}
                                                    disabled={generatingAI || !formData.name}
                                                    className="flex items-center gap-1 text-xs px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-purple-500/30"
                                                >
                                                    {generatingAI ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={12} />
                                                    )}
                                                    {generatingAI ? 'Generando...' : 'Generar con IA'}
                                                </button>
                                            </div>
                                            <textarea
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none h-24 resize-none"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Descripción del producto para la tienda online..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={uploading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                                            {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Stock Operations Modal */}
                    {isStockModalOpen && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl">
                                <div className="p-6 border-b border-gray-700 bg-gray-850 rounded-t-xl">
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        {stockAction === 'receive' && 'Recibir Stock'}
                                        {stockAction === 'adjust' && 'Ajuste de Inventario'}
                                        {stockAction === 'transfer' && 'Transferir Stock'}
                                    </h2>
                                    <p className="text-sm text-gray-400">{selectedProductForStock?.name} ({selectedProductForStock?.sku})</p>
                                </div>
                                <form onSubmit={handleStockSubmit} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Cantidad</label>
                                        <input type="number" required min="1"
                                            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                            value={stockQuantity} onChange={e => setStockQuantity(Number(e.target.value))}
                                        />
                                    </div>
                                    {stockAction !== 'receive' && (
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Razón / Notas</label>
                                            <input required
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                                value={stockReason} onChange={e => setStockReason(e.target.value)}
                                                placeholder={stockAction === 'adjust' ? 'Ej: Daño, Pérdida, Conteo Cíclico' : 'Notas de transferencia'}
                                            />
                                        </div>
                                    )}
                                    {stockAction === 'transfer' && (
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Ubicación Destino</label>
                                            <input required
                                                className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                                value={targetLocation} onChange={e => setTargetLocation(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button type="button" onClick={() => setIsStockModalOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                                            Cancelar
                                        </button>
                                        <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">
                                            Confirmar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {confirmDeleteId && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                            <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-700 text-center">
                                <div className="text-red-500 mx-auto mb-4 bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar producto?</h3>
                                <p className="text-gray-400 mb-6">Esta acción no se puede deshacer. El producto será eliminado permanentemente.</p>
                                <div className="flex justify-center gap-3">
                                    <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                                        Cancelar
                                    </button>
                                    <button onClick={handleDelete} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                        Eliminar
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
