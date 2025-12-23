"use client";

import { useCart } from "../../../context/CartContext";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../services/api";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, ShoppingBag, ArrowRight, Tag, X, Loader2, Percent, DollarSign, Truck, Store, MapPin, CreditCard, Banknote } from "lucide-react";
import Link from "next/link";

interface AppliedCoupon {
    id: string;
    code: string;
    name: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    discount: number;
}

interface ShippingQuote {
    provider: string;
    service: string;
    price: number;
    deliveryDays: number;
}

type DeliveryMethod = 'SHIPPING' | 'PICKUP';
type PaymentMethod = 'MERCADOPAGO' | 'CASH' | 'TRANSFER';

export default function CheckoutPage() {
    const { cart, total, clearCart } = useCart();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Delivery method
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('SHIPPING');

    // Payment method (CASH only available for PICKUP)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MERCADOPAGO');

    // Coupon state
    const [couponCode, setCouponCode] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

    // Shipping quote (dynamic from Andreani)
    const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
    const [shippingLoading, setShippingLoading] = useState(false);
    const [postalCode, setPostalCode] = useState("");

    const shippingFee = deliveryMethod === 'SHIPPING' ? (shippingQuote?.price || 0) : 0;
    const subtotal = total;
    const discount = appliedCoupon?.discount || 0;
    const finalTotal = subtotal - discount + shippingFee;

    // Fetch shipping quote when postal code changes
    const fetchShippingQuote = useCallback(async (cp: string) => {
        if (!cp || cp.length < 4 || deliveryMethod !== 'SHIPPING') return;

        setShippingLoading(true);
        try {
            // Calculate total weight from cart (estimate 0.5kg per item)
            const totalWeight = cart.reduce((sum, item) => sum + (item.quantity * 0.5), 0);

            const res = await fetch(`/api/shipping/quote?postalCode=${cp}&weight=${Math.max(1, totalWeight)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.quote) {
                    setShippingQuote(data.quote);
                }
            }
        } catch (e) {
            console.error('Error fetching shipping quote:', e);
        } finally {
            setShippingLoading(false);
        }
    }, [cart, deliveryMethod]);

    // Debounce postal code changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (postalCode.length >= 4) {
                fetchShippingQuote(postalCode);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [postalCode, fetchShippingQuote]);

    // When changing to PICKUP, reset shipping
    const handleDeliveryChange = (method: DeliveryMethod) => {
        setDeliveryMethod(method);
        if (method === 'PICKUP') {
            setShippingQuote(null);
        }
        if (method === 'SHIPPING' && paymentMethod === 'CASH') {
            setPaymentMethod('MERCADOPAGO');
        }
    };

    const validateCoupon = async () => {
        if (!couponCode.trim()) return;

        setCouponLoading(true);
        setCouponError("");

        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: couponCode.toUpperCase(),
                    orderTotal: total
                })
            });

            const data = await res.json();

            if (data.valid) {
                setAppliedCoupon({
                    id: data.coupon.id,
                    code: data.coupon.code,
                    name: data.coupon.name,
                    discountType: data.coupon.discountType,
                    discountValue: data.coupon.discountValue,
                    discount: data.discount
                });
                setCouponCode("");
            } else {
                setCouponError(data.error || "Cupón no válido");
            }
        } catch (e) {
            console.error(e);
            setCouponError("Error al validar cupón");
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setError("");

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        // Validate DNI
        const dni = formData.get("dni") as string;
        if (!dni || dni.length < 7) {
            setError("DNI inválido");
            setIsProcessing(false);
            return;
        }

        const payload = {
            items: cart.map(i => ({ productId: i.id, quantity: i.quantity })),
            customer: {
                name: formData.get("name"),
                email: formData.get("email"),
                phone: formData.get("phone"),
                dni: dni,
            },
            deliveryMethod,
            shippingAddress: deliveryMethod === 'SHIPPING' ? {
                street: formData.get("street"),
                number: formData.get("streetNumber"),
                postalCode: formData.get("postalCode"),
                city: formData.get("city"),
                province: formData.get("province"),
            } : null,
            paymentMethod,
            couponId: appliedCoupon?.id,
            discountAmount: discount,
            shippingFee
        };

        try {
            await api.createEcommerceSale(payload);
            clearCart();
            setSuccess(true);
            setTimeout(() => {
                router.push("/");
            }, 5000);
        } catch (err) {
            console.error(err);
            setError("No se pudo procesar tu pedido. Por favor intenta nuevamente.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (success) return (
        <div className="min-h-screen pt-24 px-6 flex items-center justify-center bg-neutral-950 text-white">
            <div className="max-w-md w-full bg-white/5 border border-amber-500/20 rounded-3xl p-8 text-center backdrop-blur-xl">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-green-500" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">¡Pedido Exitoso!</h2>
                <p className="text-gray-400 mb-4">Tu pedido ha sido procesado correctamente.</p>
                {deliveryMethod === 'PICKUP' ? (
                    <p className="text-amber-400 text-sm mb-4">
                        📍 Podés retirarlo en: Av. Corrientes 1234, CABA
                    </p>
                ) : (
                    <p className="text-blue-400 text-sm mb-4">
                        🚚 Te enviaremos el seguimiento por email
                    </p>
                )}
                {appliedCoupon && (
                    <p className="text-emerald-400 text-sm mb-4">
                        🎉 Ahorraste ${appliedCoupon.discount.toLocaleString()} con tu cupón!
                    </p>
                )}
                <Link href="/" className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-xl transition-colors">
                    Volver a la Tienda
                </Link>
            </div>
        </div>
    );

    if (cart.length === 0) return (
        <div className="min-h-screen pt-32 px-6 flex flex-col items-center justify-center text-center bg-neutral-950 text-white">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="text-gray-600" size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-400 mb-8 max-w-md">Parece que aún no has agregado productos.</p>
            <Link href="/" className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2 border border-white/5">
                Explorar Catálogo <ArrowRight size={18} />
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 bg-neutral-950 text-white">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Confirmar Pedido</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Order Summary */}
                    <div className="space-y-6">
                        <section className="bg-white/5 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <ShoppingBag className="text-amber-500" size={20} /> Resumen
                            </h2>
                            <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex gap-4 py-3 border-b border-white/5 last:border-0">
                                        <div className="h-16 w-16 rounded-xl bg-white/5 overflow-hidden flex-shrink-0">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">IMG</div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-white text-sm">{item.name}</h3>
                                            <p className="text-xs text-gray-400">x{item.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-amber-500">${((item.effectivePrice || Number(item.basePrice)) * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Coupon */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <Tag size={14} /> Cupón
                                </h3>

                                {appliedCoupon ? (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Percent size={16} className="text-emerald-400" />
                                            <span className="font-bold text-emerald-400">{appliedCoupon.code}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-400">-${appliedCoupon.discount.toLocaleString()}</span>
                                            <button onClick={removeCoupon} className="p-1 hover:bg-white/10 rounded">
                                                <X size={16} className="text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                            placeholder="Código"
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 font-mono uppercase text-sm"
                                        />
                                        <button
                                            onClick={validateCoupon}
                                            disabled={couponLoading || !couponCode.trim()}
                                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
                                        >
                                            {couponLoading ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                                        </button>
                                    </div>
                                )}
                                {couponError && <p className="text-red-400 text-xs mt-2">{couponError}</p>}
                            </div>

                            {/* Totals */}
                            <div className="mt-6 pt-6 border-t border-white/10 space-y-2 text-sm">
                                <div className="flex justify-between text-gray-400">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toLocaleString()}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-emerald-400">
                                        <span>Descuento</span>
                                        <span>-${discount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-400">
                                    <span className="flex items-center gap-1">
                                        Envío {shippingLoading && <Loader2 size={12} className="animate-spin" />}
                                    </span>
                                    <span>
                                        {deliveryMethod === 'PICKUP' ? 'Gratis (Retiro)' :
                                            shippingQuote ? `$${shippingQuote.price.toLocaleString()}` :
                                                'Ingresá el CP'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                    <span className="text-lg text-white">Total</span>
                                    <span className="text-2xl font-bold text-white">${finalTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Form */}
                    <div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Delivery Method */}
                            <section className="bg-white/5 border border-white/5 rounded-3xl p-6">
                                <h2 className="text-lg font-bold text-white mb-4">Método de Entrega</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleDeliveryChange('SHIPPING')}
                                        className={`p-4 rounded-xl border text-left transition-all ${deliveryMethod === 'SHIPPING'
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        <Truck size={24} className={deliveryMethod === 'SHIPPING' ? 'text-amber-500' : 'text-gray-400'} />
                                        <p className="font-bold text-white mt-2">Envío a domicilio</p>
                                        <p className="text-xs text-gray-400">
                                            {shippingLoading ? 'Calculando...' : shippingQuote ? `$${shippingQuote.price.toLocaleString()} (${shippingQuote.deliveryDays} días)` : 'Ingresá tu CP'}
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeliveryChange('PICKUP')}
                                        className={`p-4 rounded-xl border text-left transition-all ${deliveryMethod === 'PICKUP'
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        <Store size={24} className={deliveryMethod === 'PICKUP' ? 'text-amber-500' : 'text-gray-400'} />
                                        <p className="font-bold text-white mt-2">Retiro en local</p>
                                        <p className="text-xs text-gray-400">Gratis</p>
                                    </button>
                                </div>
                            </section>

                            {/* Customer Info */}
                            <section className="bg-white/5 border border-white/5 rounded-3xl p-6">
                                <h2 className="text-lg font-bold text-white mb-4">Datos Personales</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-gray-400 mb-1">Nombre Completo *</label>
                                        <input name="name" required className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Email *</label>
                                        <input name="email" type="email" required className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Teléfono *</label>
                                        <input name="phone" required className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">DNI *</label>
                                        <input name="dni" required minLength={7} maxLength={8} pattern="[0-9]+" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white" placeholder="12345678" />
                                    </div>
                                </div>
                            </section>

                            {/* Shipping Address (only if SHIPPING) */}
                            {deliveryMethod === 'SHIPPING' && (
                                <section className="bg-white/5 border border-white/5 rounded-3xl p-6">
                                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <MapPin size={18} className="text-amber-500" /> Dirección de Envío
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-gray-400 mb-1">Calle *</label>
                                            <input name="street" required className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white" placeholder="Av. Corrientes" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Altura *</label>
                                            <input name="streetNumber" required className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white" placeholder="1234" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Código Postal * {shippingLoading && <Loader2 size={10} className="inline animate-spin" />}</label>
                                            <input
                                                name="postalCode"
                                                required
                                                value={postalCode}
                                                onChange={(e) => setPostalCode(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white"
                                                placeholder="1414"
                                            />
                                            {shippingQuote && (
                                                <p className="text-xs text-emerald-400 mt-1">
                                                    📦 {shippingQuote.provider}: ${shippingQuote.price.toLocaleString()} ({shippingQuote.deliveryDays} días)
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Ciudad *</label>
                                            <input name="city" required className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white" placeholder="CABA" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Provincia *</label>
                                            <select name="province" required className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white">
                                                <option value="">Seleccionar</option>
                                                <option value="CABA">Ciudad Autónoma de Buenos Aires</option>
                                                <option value="Buenos Aires">Buenos Aires</option>
                                                <option value="Catamarca">Catamarca</option>
                                                <option value="Chaco">Chaco</option>
                                                <option value="Chubut">Chubut</option>
                                                <option value="Córdoba">Córdoba</option>
                                                <option value="Corrientes">Corrientes</option>
                                                <option value="Entre Ríos">Entre Ríos</option>
                                                <option value="Formosa">Formosa</option>
                                                <option value="Jujuy">Jujuy</option>
                                                <option value="La Pampa">La Pampa</option>
                                                <option value="La Rioja">La Rioja</option>
                                                <option value="Mendoza">Mendoza</option>
                                                <option value="Misiones">Misiones</option>
                                                <option value="Neuquén">Neuquén</option>
                                                <option value="Río Negro">Río Negro</option>
                                                <option value="Salta">Salta</option>
                                                <option value="San Juan">San Juan</option>
                                                <option value="San Luis">San Luis</option>
                                                <option value="Santa Cruz">Santa Cruz</option>
                                                <option value="Santa Fe">Santa Fe</option>
                                                <option value="Santiago del Estero">Santiago del Estero</option>
                                                <option value="Tierra del Fuego">Tierra del Fuego</option>
                                                <option value="Tucumán">Tucumán</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Payment Method */}
                            <section className="bg-white/5 border border-white/5 rounded-3xl p-6">
                                <h2 className="text-lg font-bold text-white mb-4">Método de Pago</h2>
                                <div className="space-y-3">
                                    <label className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'MERCADOPAGO' ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/30'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="payment"
                                            checked={paymentMethod === 'MERCADOPAGO'}
                                            onChange={() => setPaymentMethod('MERCADOPAGO')}
                                            className="hidden"
                                        />
                                        <CreditCard size={20} className={paymentMethod === 'MERCADOPAGO' ? 'text-amber-500' : 'text-gray-400'} />
                                        <div className="ml-3">
                                            <span className="font-medium text-white">Mercado Pago</span>
                                            <p className="text-xs text-gray-400">Tarjeta de crédito, débito o dinero en cuenta</p>
                                        </div>
                                    </label>

                                    {deliveryMethod === 'PICKUP' && (
                                        <label className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'CASH' ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/30'
                                            }`}>
                                            <input
                                                type="radio"
                                                name="payment"
                                                checked={paymentMethod === 'CASH'}
                                                onChange={() => setPaymentMethod('CASH')}
                                                className="hidden"
                                            />
                                            <Banknote size={20} className={paymentMethod === 'CASH' ? 'text-amber-500' : 'text-gray-400'} />
                                            <div className="ml-3">
                                                <span className="font-medium text-white">Efectivo al retirar</span>
                                                <p className="text-xs text-gray-400">Pagás cuando retires en el local</p>
                                            </div>
                                        </label>
                                    )}

                                    <label className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'TRANSFER' ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/30'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="payment"
                                            checked={paymentMethod === 'TRANSFER'}
                                            onChange={() => setPaymentMethod('TRANSFER')}
                                            className="hidden"
                                        />
                                        <DollarSign size={20} className={paymentMethod === 'TRANSFER' ? 'text-amber-500' : 'text-gray-400'} />
                                        <div className="ml-3">
                                            <span className="font-medium text-white">Transferencia Bancaria</span>
                                            <p className="text-xs text-gray-400">Te enviamos los datos por email</p>
                                        </div>
                                    </label>
                                </div>
                            </section>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                                    <AlertCircle size={20} />
                                    <p>{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>Confirmar Pedido • ${finalTotal.toLocaleString()}</>
                                )}
                            </button>

                            <p className="text-center text-xs text-gray-500">
                                🔒 Tus datos están protegidos. Prohibida la venta a menores de 18 años.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
