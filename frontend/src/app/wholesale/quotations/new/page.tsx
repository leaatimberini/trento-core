'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '../../../../components/AuthGuard';
import DashboardLayout from '../../../../components/layouts/DashboardLayout';
import { Search, Trash2, List } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string;
    basePrice: number;
    wholesalePrice?: number;
    currentStock: number;
    displayPrice?: number;
}

interface Customer {
    id: string;
    name: string;
    businessName?: string;
    discountPercent?: number;
    priceListId?: string;
    priceList?: { id: string; name: string };
}

interface PriceList {
    id: string;
    name: string;
    description?: string;
}

interface QuotationItem {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
}

function NewQuotationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedCustomerId = searchParams.get('customerId');

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedPriceListId, setSelectedPriceListId] = useState<string>('');
    const [productPrices, setProductPrices] = useState<Record<string, number>>({});
    const [items, setItems] = useState<QuotationItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [validDays, setValidDays] = useState(15);
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [loading, setLoading] = useState(false);
    const [includeIva, setIncludeIva] = useState(true);

    useEffect(() => {
        fetchCustomers();
        fetchProducts();
        fetchPriceLists();
    }, []);

    useEffect(() => {
        if (preselectedCustomerId && customers.length > 0) {
            const customer = customers.find(c => c.id === preselectedCustomerId);
            if (customer) {
                setSelectedCustomer(customer);
                if (customer.priceListId) {
                    setSelectedPriceListId(customer.priceListId);
                }
            }
        }
    }, [preselectedCustomerId, customers]);

    // Fetch prices when price list changes
    useEffect(() => {
        if (selectedPriceListId && products.length > 0) {
            fetchPricesForList(selectedPriceListId);
        }
    }, [selectedPriceListId, products]);

    const fetchCustomers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/wholesale/customers', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setCustomers(await res.json());
    };

    const fetchProducts = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/products', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setProducts(await res.json());
    };

    const fetchPriceLists = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/pricing/lists', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setPriceLists(await res.json());
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

    const handleCustomerChange = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        setSelectedCustomer(customer || null);
        if (customer?.priceListId) {
            setSelectedPriceListId(customer.priceListId);
        }
        // Update existing items with new customer discount
        if (customer?.discountPercent) {
            setItems(items.map(i => ({
                ...i,
                discount: customer.discountPercent || 0,
                totalPrice: i.quantity * i.unitPrice * (1 - (customer.discountPercent || 0) / 100)
            })));
        }
    };

    const addProduct = (product: Product) => {
        const existing = items.find(i => i.productId === product.id);
        const price = getProductPrice(product);

        if (existing) {
            setItems(items.map(i =>
                i.productId === product.id
                    ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice * (1 - i.discount / 100) }
                    : i
            ));
        } else {
            const discount = selectedCustomer?.discountPercent || 0;
            setItems([...items, {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: 1,
                unitPrice: price,
                discount,
                totalPrice: price * (1 - discount / 100)
            }]);
        }
        setProductSearch('');
    };

    const updateItem = (productId: string, field: 'quantity' | 'unitPrice' | 'discount', value: number) => {
        setItems(items.map(item => {
            if (item.productId !== productId) return item;
            const updated = { ...item, [field]: value };
            updated.totalPrice = updated.quantity * updated.unitPrice * (1 - updated.discount / 100);
            return updated;
        }));
    };

    const removeItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId));
    };

    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const discountAmount = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice * i.discount / 100), 0);
    const taxAmount = includeIva ? (subtotal - discountAmount) * 0.21 : 0;
    const total = subtotal - discountAmount + taxAmount;

    const handleSubmit = async () => {
        if (!selectedCustomer) {
            alert('Seleccione un cliente');
            return;
        }
        if (items.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/wholesale/quotations', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    priceListId: selectedPriceListId || undefined,
                    validDays,
                    items: items.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        discount: i.discount
                    })),
                    notes,
                    termsAndConditions: terms
                })
            });

            if (res.ok) {
                router.push('/wholesale/quotations');
            } else {
                const error = await res.json();
                alert(`Error: ${error.message || 'No se pudo crear el presupuesto'}`);
            }
        } catch (error) {
            alert('Error al crear el presupuesto');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        productSearch.length > 1 && (
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase())
        )
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-white">Nuevo Presupuesto</h1>
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
                    ← Volver
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Selection */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                        <h2 className="font-semibold text-white mb-4">👤 Cliente</h2>
                        <select
                            value={selectedCustomer?.id || ''}
                            onChange={(e) => handleCustomerChange(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-purple-500">
                            <option value="" className="bg-neutral-900">Seleccionar cliente...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id} className="bg-neutral-900">
                                    {c.businessName || c.name}
                                </option>
                            ))}
                        </select>
                        {selectedCustomer?.discountPercent && (
                            <div className="mt-2 text-sm text-green-400">
                                ✓ Descuento del cliente: {selectedCustomer.discountPercent}%
                            </div>
                        )}
                    </div>

                    {/* Price List Selection */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <List className="w-5 h-5" /> Lista de Precios
                        </h2>
                        <select
                            value={selectedPriceListId}
                            onChange={(e) => setSelectedPriceListId(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-purple-500">
                            <option value="" className="bg-neutral-900">Usar precios base</option>
                            {(priceLists || []).map(pl => (
                                <option key={pl.id} value={pl.id} className="bg-neutral-900">
                                    {pl.name} {pl.description ? `- ${pl.description}` : ''}
                                </option>
                            ))}
                        </select>
                        {selectedPriceListId && (
                            <div className="mt-2 text-sm text-purple-400">
                                ✓ Usando precios de: {priceLists.find(pl => pl.id === selectedPriceListId)?.name}
                            </div>
                        )}
                    </div>

                    {/* Product Search */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                        <h2 className="font-semibold text-white mb-4">📦 Agregar Productos</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar producto por nombre o SKU..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
                            />
                            {filteredProducts.length > 0 && (
                                <div className="absolute z-10 w-full bg-neutral-900 border border-white/10 rounded-xl mt-2 max-h-60 overflow-auto">
                                    {filteredProducts.slice(0, 10).map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => addProduct(product)}
                                            className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0">
                                            <div className="flex justify-between">
                                                <div>
                                                    <div className="font-medium text-white">{product.name}</div>
                                                    <div className="text-sm text-gray-500">{product.sku}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-green-400">
                                                        ${getProductPrice(product).toLocaleString()}
                                                    </div>
                                                    {selectedPriceListId && productPrices[product.id] && (
                                                        <div className="text-xs text-purple-400">De lista</div>
                                                    )}
                                                    <div className="text-xs text-gray-500">Stock: {product.currentStock}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Producto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-20">Cant.</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-28">Precio</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-20">Dto%</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-28">Subtotal</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {items.map((item) => (
                                    <tr key={item.productId} className="hover:bg-white/5 transition">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white text-sm">{item.productName}</div>
                                            <div className="text-xs text-gray-500">{item.productSku}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={item.discount}
                                                onChange={(e) => updateItem(item.productId, 'discount', parseFloat(e.target.value) || 0)}
                                                className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-sm text-white">
                                            ${item.totalPrice.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => removeItem(item.productId)}
                                                className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded transition">
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {items.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                Busque y agregue productos para crear el presupuesto
                            </div>
                        )}
                    </div>

                    {/* Notes & Terms */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Notas internas</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500"
                                rows={3}
                                placeholder="Notas visibles en el presupuesto..."
                            />
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Términos y condiciones</label>
                            <textarea
                                value={terms}
                                onChange={(e) => setTerms(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500"
                                rows={3}
                                placeholder="Condiciones de pago, entrega..."
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar - Summary */}
                <div className="space-y-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl sticky top-6">
                        <h2 className="font-semibold text-white mb-4">📋 Resumen</h2>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Items:</span>
                                <span className="text-white">{items.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Subtotal:</span>
                                <span className="text-white">${subtotal.toLocaleString()}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <span>Descuentos:</span>
                                    <span>-${discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeIva}
                                        onChange={(e) => setIncludeIva(e.target.checked)}
                                        className="w-4 h-4 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                                    />
                                    IVA (21%)
                                </label>
                                <span className={includeIva ? 'text-white' : 'text-gray-500'}>
                                    ${taxAmount.toLocaleString()}
                                </span>
                            </div>
                            <hr className="border-white/10" />
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-white">TOTAL:</span>
                                <span className="text-purple-400">${total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Válido por</label>
                            <select
                                value={validDays}
                                onChange={(e) => setValidDays(parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                                <option value="7" className="bg-neutral-900">7 días</option>
                                <option value="15" className="bg-neutral-900">15 días</option>
                                <option value="30" className="bg-neutral-900">30 días</option>
                                <option value="60" className="bg-neutral-900">60 días</option>
                            </select>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedCustomer || items.length === 0}
                            className="w-full mt-6 py-3 rounded-xl font-bold transition bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed">
                            {loading ? 'Creando...' : 'Crear Presupuesto'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NewQuotationPage() {
    return (
        <AuthGuard>
            <DashboardLayout>
                <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                    </div>
                }>
                    <NewQuotationForm />
                </Suspense>
            </DashboardLayout>
        </AuthGuard>
    );
}
