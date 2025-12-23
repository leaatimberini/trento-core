
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types';

interface CartItem extends Product {
    quantity: number;
    effectivePrice?: number;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number, priceOverride?: number) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    updateQuantity: (productId: string, quantity: number) => void;
    total: number;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('trento_cart');
        if (saved) setCart(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('trento_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product: Product, quantity = 1, priceOverride?: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            const effectivePrice = priceOverride !== undefined ? priceOverride : (existing?.effectivePrice || Number(product.basePrice));

            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity, effectivePrice } : item
                );
            }
            return [...prev, { ...product, quantity, effectivePrice }];
        });
        openCart(); // Auto open on add
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) return;
        setCart(prev => prev.map(item =>
            item.id === productId ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((sum, item) => sum + ((item.effectivePrice || Number(item.basePrice)) * item.quantity), 0);

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    const toggleCart = () => setIsCartOpen(prev => !prev);

    return (
        <CartContext.Provider value={{
            cart, addToCart, removeFromCart, clearCart, updateQuantity,
            total, isCartOpen, openCart, closeCart, toggleCart
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
