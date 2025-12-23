
"use client";

export const dynamic = 'force-dynamic';

import { isAdmin } from "../../utils/auth";
import Link from "next/link";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { api } from "../../services/api";
import { Product, CreateSaleItemDto } from "../../types";
import { useScanDetection } from "../../hooks/useScanDetection";
import AuthGuard from "../../components/AuthGuard";
import ConnectionStatus from "../../components/ConnectionStatus";
import { offlineStore } from "../../lib/offlineStore";
import { syncService } from "../../lib/syncService";
import { useOnlineStatus } from "../../lib/useOnlineStatus";

// Extended CartItem with unit selection
type CartItem = Product & {
    quantity: number;
    effectivePrice: number;
    itemDiscount: number;
    selectedUnit: string;  // UNIDAD, CAJA, etc.
    unitFactor: number;    // 1 for UNIDAD, 12 for CAJA, etc.
    isGift?: boolean;
};

import { User as UserIcon, Truck, Package, Gift } from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";

function POSContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode') || 'sale';
    const isBudgetMode = mode === 'budget';
    const { isOnline } = useOnlineStatus();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState("");
    const [barcodeInput, setBarcodeInput] = useState("");
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    // Removed global isGift


    // Shift Management
    const [activeShift, setActiveShift] = useState<any>(null);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftMode, setShiftMode] = useState<'OPEN' | 'CLOSE'>('OPEN');
    const [shiftCash, setShiftCash] = useState("");
    const [shiftLoading, setShiftLoading] = useState(true);

    // AI Recommendations
    const [recommendations, setRecommendations] = useState<Product[]>([]);

    // Unit Selection Modal
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [unitModalProduct, setUnitModalProduct] = useState<Product | null>(null);
    const [availableUnits, setAvailableUnits] = useState<{ unit: string; factor: number; label: string }[]>([]);

    // Price Lists
    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [selectedPriceList, setSelectedPriceList] = useState<any>(null);

    useEffect(() => {
        loadData();
        // Start sync service for offline sales
        syncService.startAutoSync();
        return () => syncService.stopAutoSync();
    }, []);

    const loadData = async () => {
        try {
            if (navigator.onLine) {
                // Online: fetch from API and cache for offline
                const [prodData, custData, listsData] = await Promise.all([
                    api.getStoreProducts(), // Get default prices
                    api.getCustomers(),
                    api.getPriceLists()
                ]);

                setProducts(prodData);
                setCustomers(custData);
                setPriceLists(listsData);

                // Set default list
                const defaultList = listsData.find((l: any) => l.isDefault);
                if (defaultList) setSelectedPriceList(defaultList);

                // Cache for offline use
                await offlineStore.saveProducts(prodData);
                await offlineStore.saveCustomers(custData);

                // Check active shift
                const shift = await api.getActiveShift();
                if (shift) {
                    setActiveShift(shift);
                } else {
                    setShiftMode('OPEN');
                    setIsShiftModalOpen(true);
                }
            } else {
                // Offline: load from IndexedDB
                const [prodData, custData] = await Promise.all([
                    offlineStore.getProducts(),
                    offlineStore.getCustomers()
                ]);
                setProducts(prodData);
                setCustomers(custData);
                // In offline mode, assume shift is active
                setActiveShift({ id: 'offline', status: 'OPEN' });
            }
        } catch (e) {
            console.error(e);
            // Fallback to offline data
            try {
                const prodData = await offlineStore.getProducts();
                const custData = await offlineStore.getCustomers();
                if (prodData.length > 0) setProducts(prodData);
                if (custData.length > 0) setCustomers(custData);
            } catch (offlineError) {
                console.error('Offline fallback failed:', offlineError);
            }
        } finally {
            setLoading(false);
            setShiftLoading(false);
        }
    };

    const handleShiftSubmit = async () => {
        try {
            const amount = parseFloat(shiftCash || "0");
            if (isNaN(amount) || amount < 0) return alert("Monto inválido");

            if (shiftMode === 'OPEN') {
                await api.openShift(amount);
                const shift = await api.getActiveShift();
                setActiveShift(shift);
                setIsShiftModalOpen(false);
            } else {

                await api.closeShift(amount);
                setActiveShift(null);
                setIsShiftModalOpen(false);
                alert("Turno cerrado correctamente.");
                router.push('/');
            }
        } catch (e) {
            console.error(e);
            alert("Error al actualizar turno");
        }
    };
    const addToCart = useCallback(async (product: Product) => {
        // Use the price currently displayed on the product (which comes from the selected price list)
        // Fallback to basePrice if displayPrice is missing
        const price = product.displayPrice ?? Number(product.basePrice);

        setCart((prev: CartItem[]) => {
            const existing = prev.find((item) => item.id === product.id && item.selectedUnit === (product.baseUnit || 'UNIDAD'));
            if (existing) {
                return prev.map((item) =>
                    item.id === product.id && item.selectedUnit === existing.selectedUnit
                        ? { ...item, quantity: item.quantity + 1, effectivePrice: price }
                        : item
                );
            }
            return [...prev, {
                ...product,
                effectivePrice: price,
                quantity: 1,
                itemDiscount: 0,
                selectedUnit: product.baseUnit || 'UNIDAD',
                unitFactor: 1
            }];
        });

        // Trigger AI Recommendations
        try {
            const recs = await api.getRecommendations(product.id);
            if (recs && recs.length > 0) {
                setRecommendations(recs);
            }
        } catch (e) {
            console.error("Failed to load recommendations", e);
        }
    }, [selectedCustomer]);

    const onScan = useCallback((code: string) => {
        console.log("Scanned:", code);
        // Find product by SKU or EAN
        const product = products.find(p => p.sku === code || p.ean === code);
        if (product) {
            addToCart(product);
        } else {
            alert(`Producto no encontrado: ${code}`);
        }
    }, [products, addToCart]);

    // Init Hook
    useScanDetection({ onScan });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (e) {
            console.error(e);
            alert("Error al cargar productos");
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart((prev: CartItem[]) =>
            prev
                .map((item) =>
                    item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const applyItemDiscount = (id: string, discount: number) => {
        setCart((prev: CartItem[]) =>
            prev.map((item) =>
                item.id === id ? { ...item, itemDiscount: Math.max(0, discount) } : item
            )
        );
    };

    const toggleItemGift = (id: string) => {
        setCart((prev: CartItem[]) =>
            prev.map((item) =>
                item.id === id ? { ...item, isGift: !item.isGift, itemDiscount: 0 } : item
            )
        );
    };

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcodeInput.trim()) return;

        const product = products.find(p => p.sku === barcodeInput || p.ean === barcodeInput);
        if (product) {
            addToCart(product);
            setBarcodeInput("");
        } else {
            alert(`Producto no encontrado: ${barcodeInput}`);
        }
    };

    // Payment State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payments, setPayments] = useState<{ method: string, amount: number }[]>([]);

    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    const openPaymentModal = () => {
        if (cart.length === 0) return;
        setPayments([{ method: 'CASH', amount: total }]); // Default to full cash
        setIsPaymentModalOpen(true);
    };

    const addPaymentMethod = (method: string) => {
        const remaining = Math.max(0, total - paidAmount);
        setPayments([...payments, { method, amount: remaining > 0 ? remaining : 0 }]);
    };

    const updatePaymentAmount = (index: number, newAmount: number) => {
        const newPayments = [...payments];
        newPayments[index].amount = newAmount;
        setPayments(newPayments);
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };


    // Delivery Method
    const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'SHIPPING'>('PICKUP');

    const confirmSale = async () => {
        // --- FINANCIAL GUARD CHECK ---
        if (!isBudgetMode) { // Budgets don't need strict financial check yet, only realized sales
            const isSafe = await checkProfitability();
            if (!isSafe) return;
        }
        // -----------------------------

        try {
            const itemsDto: CreateSaleItemDto[] = cart.map(item => ({
                productId: item.id,
                quantity: item.quantity
            }));

            // Calculate Total List Price to determine total discount
            const totalListPrice = cart.reduce((acc, item) => acc + (item.displayPrice ?? Number(item.basePrice)) * item.quantity, 0);

            // Total Discount = Expected Revenue (List Price) - Actual Revenue (Total)
            // 'total' is what the customer pays
            const realDiscountAmount = totalListPrice - total;

            const hasGifts = cart.some(i => i.isGift);

            const sale = await api.createSale({
                items: itemsDto,
                paymentMethod: payments.length > 0 ? payments[0].method : 'CASH',
                payments: payments,
                customerId: selectedCustomer?.id,
                deliveryMethod: deliveryMethod,
                discount: realDiscountAmount, // Send full discount (Item + Global + Gift)
                documentType: isBudgetMode ? 'BUDGET' : (hasGifts ? 'GIFT' : 'SALE')
            });

            // Ask to print
            if (confirm(isBudgetMode ? "Presupuesto guardado. ¿Imprimir?" : "Venta finalizada con éxito. ¿Desea imprimir ticket?")) {
                printTicket(sale);
            }

            setCart([]);
            setIsPaymentModalOpen(false);
            setDeliveryMethod('PICKUP'); // Reset

            if (isBudgetMode) {
                router.push('/billing');
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Transacción Fallida");
        }
    };

    const printTicket = (sale: any) => {
        const win = window.open('', '', 'width=300,height=600');
        if (!win) return alert("Habilite popups para imprimir");

        const content = `
            <html>
                <head>
                    <style>
                        body { font-family: monospace; font-size: 12px; padding: 10px; }
                        .center { text-align: center; }
                        .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                        .flex { display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <div class="center">
                        <h2>TRENTO</h2>
                        <p>${isBudgetMode ? 'PRESUPUESTO' : 'TICKET DE VENTA'} #${sale.code}</p>
                        <p>${new Date().toLocaleString()}</p>
                    </div>
                    <div class="line"></div>
                    ${sale.items.map((i: any) => `
                        <div class="flex">
                            <span>${i.quantity}x ${i.product?.name || 'Item'}</span>
                            <span>$${(i.unitPrice * i.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div class="line"></div>
                    ${(sale.discountAmount && Number(sale.discountAmount) > 0) ? `
                        <div class="flex">
                            <span>Subtotal</span>
                            <span>$${(Number(sale.totalAmount) + Number(sale.discountAmount)).toLocaleString()}</span>
                        </div>
                        <div class="flex" style="font-weight:bold; color:black">
                            <span>Descuento</span>
                            <span>-$${Number(sale.discountAmount).toLocaleString()}</span>
                        </div>
                        <div class="line"></div>
                    ` : ''
            }
                    <div class="flex" style="font-weight:bold">
                        <span>TOTAL</span>
                        <span>$${Number(sale.totalAmount).toLocaleString()}</span>
                    </div>
                    <div class="center" style="margin-top:20px">
                        <p>¡Gracias por su compra!</p>
                    </div>
                    <script>
                        window.print();
                        window.onafterprint = function() { window.close(); }
                    </script>
                </body >
            </html >
        `;

        win.document.write(content);
        win.document.close();
    };

    // Switch price list when customer changes
    useEffect(() => {
        if (selectedCustomer?.priceListId) {
            // Find the customer's price list
            const customerList = priceLists.find(l => l.id === selectedCustomer.priceListId);
            if (customerList) {
                if (selectedPriceList?.id !== customerList.id) {
                    setSelectedPriceList(customerList);
                    // Confirm cart clear if items exist is handled in the effect below
                }
            }
        } else if (selectedCustomer === null) {
            // Reset to default list if customer cleared
            const defaultList = priceLists.find(l => l.isDefault);
            if (defaultList && selectedPriceList?.id !== defaultList.id) {
                setSelectedPriceList(defaultList);
            }
        }
    }, [selectedCustomer, priceLists]);

    // Reload products when price list changes
    useEffect(() => {
        const reloadPrices = async () => {
            if (!selectedPriceList) return;

            setLoading(true);
            try {
                const newProducts = await api.getStoreProducts(selectedPriceList.id);
                setProducts(newProducts);

                // If cart has items, warn user about price change need
                if (cart.length > 0) {
                    // Optionally update cart prices automatically or warn user
                    // For now we'll just update the effective price if the product is still in the new list
                    setCart(prev => prev.map(item => {
                        const newProduct = newProducts.find(p => p.id === item.id);
                        if (newProduct) {
                            return {
                                ...item,
                                effectivePrice: newProduct.displayPrice ?? Number(newProduct.basePrice),
                                displayPrice: newProduct.displayPrice
                            };
                        }
                        return item;
                    }));
                }
            } catch (err) {
                console.error("Error updating prices", err);
            } finally {
                setLoading(false);
            }
        };

        if (selectedPriceList) {
            reloadPrices();
        }
    }, [selectedPriceList]);

    const subtotal = cart.reduce((acc, item) => {
        if (item.isGift) return acc;
        const itemTotal = item.effectivePrice * item.quantity;
        const discount = item.itemDiscount || 0;
        return acc + (itemTotal - discount);
    }, 0);
    const globalDiscountAmount = subtotal * (globalDiscount / 100);
    const total = subtotal - globalDiscountAmount;

    // Financial Guard Check
    const checkProfitability = async (): Promise<boolean> => {
        try {
            // 1. Calculate Aggregates
            let totalCost = 0;
            let totalListPrice = 0;
            let totalGiftValue = 0;
            const hasGifts = cart.some(i => i.isGift);

            cart.forEach(item => {
                const cost = Number(item.costPrice) || 0;
                const listPrice = item.displayPrice ?? Number(item.basePrice);

                totalCost += cost * item.quantity;
                totalListPrice += listPrice * item.quantity;

                if (item.isGift) {
                    totalGiftValue += listPrice * item.quantity;
                }
            });

            if (totalListPrice === 0) return true;

            // Total Discount = (Sum of List Prices) - (Final Total to Pay)
            // Final Total to Pay is 'total' state
            // Total Discount = totalListPrice - total
            const totalDiscountAmount = totalListPrice - total;
            const effectiveDiscountPercent = totalDiscountAmount / totalListPrice;

            // Commission
            let commissionRate = 0;
            const pm = payments.length > 0 ? payments[0].method : 'CASH';
            if (pm === 'MERCADOPAGO' || pm === 'CREDIT_CARD') commissionRate = 0.06;
            if (pm === 'DEBIT_CARD') commissionRate = 0.03;

            const payload = {
                productCost: totalCost,
                salesPrice: totalListPrice,
                discountPercent: Math.max(0, effectiveDiscountPercent),
                paymentMethodCommission: commissionRate,
                taxPercent: 0.21,
                operationalCosts: 0,
                minAcceptableMargin: 10 // Dynamic configurable in future
            };

            const result = await api.evaluateDiscount(payload);

            if (result.status === 'BLOCKED') {
                if (hasGifts) {
                    // Allow override if gifts are present
                    return confirm(`⚠️ ALERT: Gifting Merchandise\n\nYou are gifting items worth $${totalGiftValue.toLocaleString()}.\nGlobal Net Profit: $${result.metrics.netProfit.toFixed(2)}.\n\nConfirm 'GIFT/PROMO' sale?`);
                }
                alert(`⛔ SALE BLOCKED: FINANCIAL LOSS\n\nCause: ${result.alerts.join('\n')}\n\nProjected Net Profit: $${result.metrics.netProfit.toFixed(2)}\n\nAction: Reduce discount or increase price.`);
                return false;
            }

            if (result.status === 'RISKY') {
                return confirm(`⚠️ MARGIN WARNING (LOW PROFIT)\n\nMargin: ${result.metrics.realMarginPercent.toFixed(1)}% (Target: 10%)\nSuggestion: ${result.alerts[0] || 'Check discounts'}.\n\nProceed anyway?`);
            }

            return true;

        } catch (e) {
            console.error("Financial Guard Error", e);
            return confirm("⚠️ No se pudo verificar la rentabilidad. ¿Continuar?");
        }
    };

    const filteredProducts = products.filter((p: Product) =>
        p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    );


    // Shipping State
    const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
    const [zipCode, setZipCode] = useState('');
    const [shippingQuote, setShippingQuote] = useState<any>(null);

    const handleQuoteShipping = async () => {
        if (!zipCode) return alert("Ingrese CP");
        try {
            // Estimate weight: 1kg per item for simplicity or sum items
            const weight = cart.reduce((acc, item) => acc + item.quantity, 0);
            const quote = await api.quoteShipping(zipCode, weight);
            setShippingQuote(quote);
        } catch (e) {
            console.error(e);
            alert("Error cotizando envío");
        }
    };

    const [shiftSummary, setShiftSummary] = useState<any>(null);

    useEffect(() => {
        if (shiftMode === 'CLOSE' && isShiftModalOpen) {
            api.getShiftSummary().then(setShiftSummary).catch(console.error);
        }
    }, [shiftMode, isShiftModalOpen]);

    if (isShiftModalOpen) {
        const difference = shiftCash ? Number(shiftCash) - (shiftSummary?.expectedCash || 0) : 0;

        return (
            <div className="fixed inset-0 bg-neutral-950 z-50 flex flex-col items-center justify-center text-white p-4">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
                    <h1 className="text-3xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                        {shiftMode === 'OPEN' ? 'Abrir Turno de Caja' : 'Cerrar Turno'}
                    </h1>

                    {shiftMode === 'CLOSE' && shiftSummary && (
                        <div className="bg-black/40 p-4 rounded-xl mb-6 text-sm space-y-2 border border-white/5">
                            <div className="flex justify-between text-gray-400">
                                <span>Fondo Inicial:</span>
                                <span>${shiftSummary.initialCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-green-400 font-bold">
                                <span>Ventas Efectivo:</span>
                                <span>+${shiftSummary.cashSales.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-blue-400">
                                <span>Tarjetas/QR:</span>
                                <span>${(shiftSummary.cardSales + shiftSummary.qrSales).toLocaleString()}</span>
                            </div>
                            <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-lg text-white">
                                <span>Esperado en Caja:</span>
                                <span>${shiftSummary.expectedCash.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    <p className="text-gray-400 text-center mb-6">
                        {shiftMode === 'OPEN' ? 'Ingrese el efectivo inicial en caja.' : 'Ingrese el recuento final de efectivo.'}
                    </p>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            {shiftMode === 'OPEN' ? 'Monto Inicial ($)' : 'Efectivo Real en Caja ($)'}
                        </label>
                        <input
                            type="number"
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-2xl font-mono focus:border-amber-500 outline-none transition-colors text-white"
                            value={shiftCash}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShiftCash(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    {shiftMode === 'CLOSE' && shiftCash && (
                        <div className={`mb - 6 p - 3 rounded - lg text - center font - bold ${difference === 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'} `}>
                            Diferencia: ${difference.toLocaleString()}
                        </div>
                    )}

                    <button
                        onClick={handleShiftSubmit}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95"
                    >
                        {shiftMode === 'OPEN' ? 'INICIAR TURNO' : 'CERRAR TURNO'}
                    </button>

                    {shiftMode === 'CLOSE' && (
                        <button onClick={() => setIsShiftModalOpen(false)} className="mt-4 w-full text-gray-500 hover:text-white">Cancelar</button>
                    )}
                </div>
            </div>
        )
    }

    if (isShippingModalOpen) {
        return (
            <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center text-white p-4">
                <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Truck className="text-yellow-400" /> Cotizar Envío
                    </h2>
                    <div className="mb-4">
                        <label className="text-sm text-gray-400">Código Postal</label>
                        <input
                            value={zipCode}
                            onChange={e => setZipCode(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1 text-white"
                            placeholder="Ej: 1414"
                        />
                    </div>
                    {shippingQuote && (
                        <div className="bg-gray-900 p-3 rounded mb-4 border border-blue-500/30">
                            <p className="text-blue-400 font-bold">{shippingQuote.provider} - {shippingQuote.service}</p>
                            <p className="text-2xl font-bold">${shippingQuote.price}</p>
                            <p className="text-sm text-gray-400">Llega en {shippingQuote.deliveryDays} días</p>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={handleQuoteShipping} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded">Cotizar</button>
                        <button onClick={() => setIsShippingModalOpen(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded">Cerrar</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AuthGuard>
            <ConnectionStatus />
            <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
                {/* LEFT: Product Grid */}
                <div className="w-2/3 flex flex-col border-r border-gray-700">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                        <div className="flex items-center space-x-4">

                            <h1 className="text-xl font-bold tracking-tight text-brand-500">
                                {isBudgetMode ? 'Trento: Nuevo Presupuesto' : 'TrentoPOS'}
                            </h1>
                            {isAdmin() && (
                                <Link href="/finance" className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300">
                                    Dashboard
                                </Link>
                            )}
                            <button
                                onClick={() => { setShiftMode('CLOSE'); setShiftCash(""); setIsShiftModalOpen(true); }}
                                className="text-xs bg-red-900/50 hover:bg-red-900 border border-red-700 text-red-200 px-2 py-1 rounded"
                            >
                                Cerrar Turno
                            </button>
                            <button
                                onClick={() => setIsCustomerModalOpen(true)}
                                className={`text-xs px-2 py-1 rounded border ${selectedCustomer ? 'bg-purple-900 border-purple-500 text-purple-200' : 'bg-gray-700 border-gray-600 text-gray-300'} `}
                            >
                                {selectedCustomer ? selectedCustomer.name : 'Seleccionar Cliente'}
                            </button>

                            {/* Price List Selector */}
                            <select
                                value={selectedPriceList?.id || ''}
                                onChange={(e) => {
                                    const list = priceLists.find(l => l.id === e.target.value);
                                    setSelectedPriceList(list);
                                }}
                                className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white focus:border-amber-500 outline-none"
                            >
                                {priceLists.map(list => (
                                    <option key={list.id} value={list.id}>
                                        {list.name} {list.isDefault ? '(Default)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar Producto / SKU..."
                            className="bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-1/3"
                            value={search}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                            autoFocus
                        />
                        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="📷 Código de barras..."
                                className="bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500 w-48"
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                            />
                            <button type="submit" className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded text-white font-bold text-sm">
                                +
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 overflow-auto p-4 bg-gray-900">
                        {loading ? (
                            <div className="text-center text-gray-500 mt-10">Cargando Productos...</div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4">
                                {filteredProducts.map((product: Product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex flex-col items-start justify-between h-32 transition-all border border-gray-700 hover:border-blue-500 shadow-lg"
                                    >
                                        <span className="font-semibold text-lg leading-tight text-left">{product.name}</span>
                                        <div className="mt-auto w-full flex justify-between items-end">
                                            <span className="text-gray-400 text-xs">{product.sku}</span>
                                            <div className="text-right">
                                                {product.hasListPrice && (
                                                    <div className="text-xs text-amber-500 font-bold mb-1">
                                                        {selectedPriceList?.name}
                                                    </div>
                                                )}
                                                <span className={`text-xl font-bold ${product.hasListPrice ? 'text-amber-400' : 'text-green-400'} `}>
                                                    ${(product.displayPrice ?? Number(product.basePrice)).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Cart */}
                <div className="w-1/3 flex flex-col bg-gray-800">
                    <div className="p-4 border-b border-gray-700 bg-gray-800">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Venta Actual</h2>
                            <div className="flex bg-gray-900 rounded p-1 gap-1">
                                <button
                                    onClick={() => setDeliveryMethod('PICKUP')}
                                    className={`px - 3 py - 1 text - xs rounded ${deliveryMethod === 'PICKUP' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'} `}
                                >
                                    Retiro
                                </button>
                                <button
                                    onClick={() => setDeliveryMethod('SHIPPING')}
                                    className={`px - 3 py - 1 text - xs rounded ${deliveryMethod === 'SHIPPING' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'} `}
                                >
                                    Envío
                                </button>
                            </div>
                        </div>
                        {deliveryMethod === 'SHIPPING' && (
                            <button onClick={() => setIsShippingModalOpen(true)} className="mt-2 w-full bg-blue-900/30 text-blue-300 py-1 rounded text-xs flex items-center justify-center gap-2 hover:bg-blue-900/50">
                                <Truck size={14} /> Cotizar Envío
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 italic">
                                Escanee o seleccione productos
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map((item: CartItem) => {
                                    const isGiftItem = item.isGift || false;
                                    const itemTotal = isGiftItem ? 0 : (item.effectivePrice * item.quantity);
                                    const finalItemTotal = isGiftItem ? 0 : (itemTotal - (item.itemDiscount || 0));

                                    return (
                                        <div key={item.id} className={`p-3 rounded border ${isGiftItem ? 'bg-pink-900/20 border-pink-500/50' : 'bg-gray-700 border-transparent'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{item.name}</span>
                                                        {isGiftItem && <span className="text-xs bg-pink-500 text-white px-1 rounded">REGALO</span>}
                                                    </div>
                                                    <div className={`text-sm ${isGiftItem ? 'text-gray-500 line-through' : 'text-gray-400'}`}>${item.effectivePrice} c/u</div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-red-900 text-red-200 rounded hover:bg-red-800">-</button>
                                                    <span className="w-6 text-center font-bold text-lg">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-green-900 text-green-200 rounded hover:bg-green-800">+</button>
                                                </div>
                                                <div className="w-24 text-right">
                                                    {(item.itemDiscount > 0 && !isGiftItem) && (
                                                        <div className="text-xs text-red-400 line-through">${itemTotal.toLocaleString()}</div>
                                                    )}
                                                    <div className={`font-bold text-lg ${isGiftItem ? 'text-pink-400' : ''}`}>
                                                        ${finalItemTotal.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Item Actions Row */}
                                            <div className="flex items-center justify-between gap-2 text-sm border-t border-gray-600/50 pt-2">
                                                <button
                                                    onClick={() => toggleItemGift(item.id)}
                                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${isGiftItem ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800'}`}
                                                >
                                                    <Gift size={14} />
                                                    {isGiftItem ? 'Es Regalo' : 'Regalar'}
                                                </button>

                                                {!isGiftItem && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400">Desc:</span>
                                                        <input
                                                            type="number"
                                                            className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-right text-white"
                                                            placeholder="$0"
                                                            value={item.itemDiscount || ""}
                                                            onChange={(e) => applyItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* AI Recommendations */}
                    {recommendations.length > 0 && cart.length > 0 && (
                        <div className="p-3 bg-purple-900/20 border-t border-purple-500/30">
                            <h3 className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                                ✨ Clientes también compran:
                            </h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600">
                                {recommendations.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => addToCart(p)}
                                        className="flex-shrink-0 bg-gray-800 border border-purple-500/30 rounded-lg p-2 w-32 hover:bg-gray-700 transition text-left"
                                    >
                                        <div className="text-xs font-medium truncate mb-1" title={p.name}>{p.name}</div>
                                        <div className="text-xs text-green-400 font-bold">${Number(p.basePrice).toFixed(0)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer actions */}
                    <div className="p-4 border-t border-gray-700 bg-gray-900">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center text-sm text-gray-400 mb-1">
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString()}</span>
                        </div>

                        {/* Global Discount */}
                        <div className="flex justify-between items-center text-sm mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400">Descuento:</span>
                                <input
                                    type="number"
                                    className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-right text-white text-sm"
                                    placeholder="%"
                                    value={globalDiscount || ""}
                                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-gray-500 text-xs">%</span>
                            </div>
                            {globalDiscountAmount > 0 && (
                                <span className="text-red-400">-${globalDiscountAmount.toLocaleString()}</span>
                            )}
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center mb-4 text-2xl font-bold">
                            <span>Total</span>
                            <span className="text-green-400">${total.toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setCart([]); setGlobalDiscount(0); }}
                                className="bg-red-900 text-red-200 py-4 rounded font-bold hover:bg-red-800 transition"
                            >
                                CANCELAR (ESC)
                            </button>
                            <button
                                className="bg-green-600 text-white py-4 rounded font-bold hover:bg-green-500 transition shadow-lg shadow-green-900/50"
                                onClick={openPaymentModal}
                            >
                                {isBudgetMode ? 'GUARDAR PRESUPUESTO' : 'PAGAR (ENT)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Payment Modal */}
            {
                isPaymentModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm font-sans">
                        <div className="bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-700 flex overflow-hidden h-[600px] text-white">
                            {/* Left: Methods */}
                            <div className="w-1/3 bg-gray-950/50 p-6 border-r border-gray-800 flex flex-col gap-3">
                                <h3 className="text-gray-400 font-bold mb-4 uppercase text-xs tracking-wider">Método de Pago</h3>
                                <button onClick={() => addPaymentMethod('CASH')} className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-all group">
                                    <div className="p-2 rounded bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01" /><path d="M18 12h.01" /></svg>
                                    </div>
                                    <span className="font-bold text-white">Efectivo</span>
                                </button>
                                <button onClick={() => addPaymentMethod('CARD')} className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-all group">
                                    <div className="p-2 rounded bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                                    </div>
                                    <span className="font-bold text-white">Tarjeta</span>
                                </button>
                                <button onClick={() => addPaymentMethod('QR')} className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-all group">
                                    <div className="p-2 rounded bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 7h.01" /><path d="M17 7h.01" /><path d="M7 17h.01" /><path d="M17 17h.01" /></svg>
                                    </div>
                                    <span className="font-bold text-white">QR / Billetera</span>
                                </button>
                                <button onClick={() => addPaymentMethod('ACCOUNT')} disabled={!selectedCustomer} className={`flex items - center gap - 3 p - 4 rounded - xl border transition - all group ${!selectedCustomer ? 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700 border-gray-700'} `}>
                                    <div className="p-2 rounded bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <span className="font-bold block text-white">Cuenta Cte.</span>
                                        {!selectedCustomer && <span className="text-[10px] text-gray-500 uppercase">Requiere Cliente</span>}
                                    </div>
                                </button>
                            </div>

                            {/* Right: Payment Details */}
                            <div className="w-2/3 p-8 flex flex-col bg-gray-900">
                                <h2 className="text-3xl font-bold mb-8 flex justify-between items-center text-white">
                                    Pago
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400 font-normal">Total a Pagar</div>
                                        <div className="text-4xl font-mono text-green-400 font-bold tracking-tight">${total.toLocaleString()}</div>
                                    </div>
                                </h2>

                                <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                                    {payments.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-md">
                                            <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center font-bold text-gray-400 text-xl font-mono">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xl font-bold text-white tracking-wide">{p.method}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500 text-2xl font-light">$</span>
                                                        <input
                                                            type="number"
                                                            value={p.amount}
                                                            onChange={(e) => updatePaymentAmount(idx, Number(e.target.value))}
                                                            className="bg-transparent text-right outline-none w-48 border-b-2 border-gray-600 focus:border-green-500 transition-colors text-white text-3xl font-bold font-mono placeholder-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => removePayment(idx)} className="text-gray-500 hover:text-red-400 p-3 hover:bg-gray-700/50 rounded-full transition-colors ml-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {payments.length === 0 && (
                                        <div className="text-center py-16 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/50">
                                            <p className="text-lg">Seleccione un método de pago a la izquierda</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto border-t border-gray-800 pt-6 space-y-4">
                                    <div className="flex justify-between text-xl">
                                        <span className="text-gray-400">Pagado:</span>
                                        <span className={`font - mono font - bold ${paidAmount >= total ? 'text-green-400' : 'text-yellow-400'} `}>
                                            ${paidAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xl">
                                        <span className="text-gray-400">Restante:</span>
                                        <span className="font-mono font-bold text-red-400">
                                            ${Math.max(0, total - paidAmount).toLocaleString()}
                                        </span>
                                    </div>
                                    {paidAmount > total && (
                                        <div className="flex justify-between text-xl">
                                            <span className="text-gray-400">Vuelto:</span>
                                            <span className="font-mono font-bold text-blue-400">
                                                ${(paidAmount - total).toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <button
                                            onClick={() => setIsPaymentModalOpen(false)}
                                            className="py-4 rounded-xl font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            disabled={paidAmount < total && !payments.some(p => p.method === 'ACCOUNT')}
                                            onClick={confirmSale}
                                            className={`py - 4 rounded - xl font - bold text - white shadow - lg transition transform active: scale - 95 ${paidAmount >= total ? 'bg-green-600 hover:bg-green-500 shadow-green-900/50' : 'bg-gray-800 cursor-not-allowed border border-gray-700 text-gray-500'} `}
                                        >
                                            CONFIRMAR PAGO
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Customer Modal ... existing code ... */}
            {
                isCustomerModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-700">
                            <h2 className="text-xl font-bold mb-4">Seleccionar Cliente</h2>
                            <button onClick={() => { setSelectedCustomer(null); setIsCustomerModalOpen(false); }} className="w-full text-left p-3 hover:bg-gray-700 rounded mb-2 border border-gray-600 text-gray-400">
                                Invitado (Consumidor Final)
                            </button>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {customers.map((c: any) => (
                                    <button
                                        key={c.id}
                                        onClick={() => { setSelectedCustomer(c); setIsCustomerModalOpen(false); }}
                                        className={`w - full text - left p - 3 rounded flex justify - between items - center ${selectedCustomer?.id === c.id ? 'bg-purple-900 border border-purple-500' : 'bg-gray-700 hover:bg-gray-600'} `}
                                    >
                                        <span>{c.name}</span>
                                        {c.type === 'WHOLESALE' && <span className="text-xs bg-purple-500 text-black px-1 rounded font-bold">B2B</span>}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setIsCustomerModalOpen(false)} className="mt-4 w-full py-2 text-gray-400">Cancelar</button>
                        </div>
                    </div>
                )
            }
        </AuthGuard >
    );
}



export default function POSPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900 text-white font-bold text-xl">Cargando Sistema de TPV...</div>}>
            <POSContent />
        </Suspense>
    );
}
