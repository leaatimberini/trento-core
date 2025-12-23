'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../../../components/AuthGuard';
import DashboardLayout from '../../../../components/layouts/DashboardLayout';
import { Package, Search, Plus, Minus, Trash2, List } from 'lucide-react';

interface Customer {
    id: string;
    name: string;
    businessName?: string;
    cuit?: string;
    priceListId?: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    wholesalePrice?: number;
    stock: number;
    currentStock?: number;
}

interface PriceList {
    id: string;
    name: string;
    description?: string;
}

interface ConsignmentItem {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
}

export default function NewConsignmentPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedPriceListId, setSelectedPriceListId] = useState<string>('');
    const [productPrices, setProductPrices] = useState<Record<string, number>>({});
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [items, setItems] = useState<ConsignmentItem[]>([]);
    const [notes, setNotes] = useState('');
    const [includeIva, setIncludeIva] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Fetch prices when price list changes
    useEffect(() => {
        if (selectedPriceListId && products.length > 0) {
            fetchPricesForList(selectedPriceListId);
        }
    }, [selectedPriceListId, products]);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [custRes, prodRes, plRes] = await Promise.all([
                fetch('/api/wholesale/customers', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch('/api/products', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch('/api/pricing/lists', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (custRes.ok) setCustomers(await custRes.json());
            if (prodRes.ok) setProducts(await prodRes.json());
            if (plRes.ok) setPriceLists(await plRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPricesForList = async (priceListId: string) => {
        const token = localStorage.getItem('token');
        const productIds = products.map(p => p.id);
        const res = await fetch('/api/pricing/prices/batch', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productIds, priceListId })
        });
        if (res.ok) {
            const prices = await res.json();
            setProductPrices(prices);
        }
    };

    const getProductPrice = (product: Product): number => {
        if (selectedPriceListId && productPrices[product.id]) {
            return productPrices[product.id];
        }
        return product.wholesalePrice || product.basePrice;
    };

    const filteredCustomers = customers.filter(c =>
        customerSearch &&
        (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.businessName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.cuit?.includes(customerSearch))
    );

    const filteredProducts = products.filter(p =>
        productSearch &&
        (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    );

    const selectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setCustomerSearch('');
        if (customer.priceListId) {
            setSelectedPriceListId(customer.priceListId);
        }
    };

    const addProduct = (product: Product) => {
        const existing = items.find(i => i.productId === product.id);
        const price = getProductPrice(product);

        if (existing) {
            setItems(items.map(i =>
                i.productId === product.id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ));
        } else {
            setItems([...items, {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: 1,
                unitPrice: price
            }]);
        }
        setProductSearch('');
    };

    const updateQuantity = (productId: string, delta: number) => {
        setItems(items.map(i => {
            if (i.productId === productId) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId));
    };

    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const taxAmount = includeIva ? subtotal * 0.21 : 0;
    const totalValue = subtotal + taxAmount;

    const handleSubmit = async () => {
        if (!selectedCustomer) {
            alert('Selecciona un cliente');
            return;
        }
        if (items.length === 0) {
            alert('Agrega al menos un producto');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/wholesale/consignments', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    priceListId: selectedPriceListId || undefined,
                    items: items.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice
                    })),
                    notes
                })
            });

            if (res.ok) {
                router.push('/wholesale/consignments');
            } else {
                const error = await res.json();
                alert(`Error: ${error.message || 'No se pudo crear la consignación'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear la consignación');
        } finally {
            setSubmitting(false);
        }
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

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Nueva Consignación</h1>
                            <p className="text-gray-400">Crear una nueva consignación de mercadería</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Customer Selection */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">👤 Cliente</h2>

                                {selectedCustomer ? (
                                    <div className="flex items-center justify-between bg-green-500/20 border border-green-500/30 p-4 rounded-xl">
                                        <div>
                                            <div className="font-medium text-white">
                                                {selectedCustomer.businessName || selectedCustomer.name}
                                            </div>
                                            {selectedCustomer.cuit && (
                                                <div className="text-sm text-gray-400">CUIT: {selectedCustomer.cuit}</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setSelectedCustomer(null)}
                                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente por nombre, razón social o CUIT..."
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                                        />
                                        {filteredCustomers.length > 0 && (
                                            <div className="absolute z-10 w-full mt-2 bg-neutral-900 border border-white/10 rounded-xl max-h-60 overflow-auto">
                                                {filteredCustomers.slice(0, 5).map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => selectCustomer(c)}
                                                        className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0">
                                                        <div className="font-medium text-white">{c.businessName || c.name}</div>
                                                        {c.cuit && <div className="text-sm text-gray-400">{c.cuit}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Price List Selection */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <List className="w-5 h-5" /> Lista de Precios
                                </h2>
                                <select
                                    value={selectedPriceListId}
                                    onChange={(e) => setSelectedPriceListId(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500">
                                    <option value="" className="bg-neutral-900">Usar precios base</option>
                                    {(priceLists || []).map(pl => (
                                        <option key={pl.id} value={pl.id} className="bg-neutral-900">
                                            {pl.name} {pl.description ? `- ${pl.description}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedPriceListId && (
                                    <div className="mt-2 text-sm text-green-400">
                                        ✓ Usando precios de: {priceLists.find(pl => pl.id === selectedPriceListId)?.name}
                                    </div>
                                )}
                            </div>

                            {/* Products */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">📦 Productos</h2>

                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto por nombre o SKU..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500"
                                    />
                                    {filteredProducts.length > 0 && (
                                        <div className="absolute z-10 w-full mt-2 bg-neutral-900 border border-white/10 rounded-xl max-h-60 overflow-auto">
                                            {filteredProducts.slice(0, 5).map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => addProduct(p)}
                                                    className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-medium text-white">{p.name}</div>
                                                        <div className="text-sm text-gray-400">{p.sku}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-green-400 font-medium">
                                                            ${getProductPrice(p).toLocaleString()}
                                                        </div>
                                                        {selectedPriceListId && productPrices[p.id] && (
                                                            <div className="text-xs text-green-400">De lista</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Items List */}
                                {items.length > 0 ? (
                                    <div className="space-y-2">
                                        {items.map(item => (
                                            <div key={item.productId} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                                                <div className="flex-1">
                                                    <div className="font-medium text-white">{item.productName}</div>
                                                    <div className="text-sm text-gray-400">{item.productSku} • ${item.unitPrice.toLocaleString()}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.productId, -1)}
                                                        className="p-1 bg-white/10 hover:bg-white/20 rounded transition">
                                                        <Minus className="w-4 h-4 text-white" />
                                                    </button>
                                                    <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.productId, 1)}
                                                        className="p-1 bg-white/10 hover:bg-white/20 rounded transition">
                                                        <Plus className="w-4 h-4 text-white" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(item.productId)}
                                                        className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded ml-2 transition">
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
                                                <div className="ml-4 text-right">
                                                    <div className="text-white font-medium">
                                                        ${(item.quantity * item.unitPrice).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Busca y agrega productos para la consignación</p>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">📝 Notas</h2>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notas adicionales (opcional)..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 min-h-[100px]"
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-6">
                                <h2 className="text-lg font-semibold text-white mb-4">📋 Resumen</h2>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-gray-400">
                                        <span>Cliente</span>
                                        <span className="text-white">
                                            {selectedCustomer?.businessName || selectedCustomer?.name || '-'}
                                        </span>
                                    </div>
                                    {selectedPriceListId && (
                                        <div className="flex justify-between text-gray-400">
                                            <span>Lista</span>
                                            <span className="text-green-400">
                                                {priceLists.find(pl => pl.id === selectedPriceListId)?.name}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-gray-400">
                                        <span>Productos</span>
                                        <span className="text-white">{items.length}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-400">
                                        <span>Unidades</span>
                                        <span className="text-white">
                                            {items.reduce((sum, i) => sum + i.quantity, 0)}
                                        </span>
                                    </div>
                                    <hr className="border-white/10" />
                                    <div className="flex justify-between text-gray-400">
                                        <span>Subtotal</span>
                                        <span className="text-white">${subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={includeIva}
                                                onChange={(e) => setIncludeIva(e.target.checked)}
                                                className="w-4 h-4 rounded bg-white/10 border-white/20 text-green-500 focus:ring-green-500"
                                            />
                                            IVA (21%)
                                        </label>
                                        <span className={includeIva ? 'text-white' : 'text-gray-500'}>
                                            ${taxAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <hr className="border-white/10" />
                                    <div className="flex justify-between">
                                        <span className="text-white font-medium">Valor Total</span>
                                        <span className="text-2xl font-bold text-green-400">
                                            ${totalValue.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !selectedCustomer || items.length === 0}
                                    className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold transition disabled:bg-gray-600 disabled:text-gray-400">
                                    {submitting ? 'Creando...' : 'Crear Consignación'}
                                </button>

                                <button
                                    onClick={() => router.back()}
                                    className="w-full py-2 text-gray-400 hover:text-white mt-3 transition">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
