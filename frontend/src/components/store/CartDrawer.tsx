
"use client";

import { useCart } from "../../context/CartContext";
import { X, ShoppingBag, Plus, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CartDrawer() {
    const { cart, removeFromCart, clearCart, updateQuantity, total, isCartOpen, closeCart } = useCart();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isCartOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for transition
            document.body.style.overflow = 'auto';
            return () => clearTimeout(timer);
        }
    }, [isCartOpen]);

    if (!isVisible && !isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={closeCart}
            ></div>

            {/* Drawer */}
            <div className={`relative w-full max-w-md bg-neutral-900 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-neutral-900 z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShoppingBag className="text-amber-500" /> Tu Carrito
                        <span className="text-sm font-normal text-gray-500 ml-2">({cart.length} ítems)</span>
                    </h2>
                    <button onClick={closeCart} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4">
                            <ShoppingBag size={48} className="opacity-20" />
                            <p className="text-lg font-medium">Tu carrito está vacío</p>
                            <button onClick={closeCart} className="text-amber-500 hover:text-amber-400 font-bold text-sm uppercase tracking-wider">
                                Explorar Productos
                            </button>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex gap-4">
                                <div className="h-20 w-20 bg-white/5 rounded-lg flex-shrink-0 overflow-hidden border border-white/5">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-xs text-gray-600 italic">IMG</div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-white font-medium line-clamp-2 leading-tight">{item.name}</h3>
                                        <button onClick={() => removeFromCart(item.id!)} className="text-gray-600 hover:text-red-400 p-1 -mr-2">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-3 bg-white/5 rounded-full px-2 py-1 border border-white/5">
                                            <button
                                                onClick={() => updateQuantity(item.id!, item.quantity - 1)}
                                                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-sm font-bold text-white w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id!, item.quantity + 1)}
                                                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-amber-500">${((item.effectivePrice || Number(item.basePrice)) * item.quantity).toFixed(0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="p-6 bg-neutral-900 border-t border-white/5 space-y-4 z-10">
                        <div className="flex justify-between items-end">
                            <span className="text-gray-400 text-sm">Subtotal</span>
                            <span className="text-2xl font-bold text-white">${total.toFixed(0)}</span>
                        </div>
                        <p className="text-xs text-center text-gray-500">Envío e impuestos calculados en el checkout.</p>
                        <Link
                            href="/checkout"
                            onClick={closeCart}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-900/20"
                        >
                            Finalizar Compra <ArrowRight size={18} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
