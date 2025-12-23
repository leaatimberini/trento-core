
"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { CartProvider, useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import CartDrawer from "../../components/store/CartDrawer";
import AgeVerificationModal from "../../components/store/AgeVerificationModal";

function Navbar() {
    const { cart, toggleCart } = useCart();
    const { isCustomer, user } = useAuth();

    return (
        <nav className="fixed w-full z-50 transition-all duration-300 bg-black/50 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold tracking-tight text-white hover:text-amber-500 transition-colors">
                    Trento Bebidas
                </Link>

                <div className="flex items-center gap-8">
                    <div className="hidden md:flex gap-6 text-sm font-medium text-gray-300">
                        <Link href="/" className="hover:text-amber-400 transition-colors">Inicio</Link>
                        <Link href="/catalog" className="hover:text-amber-400 transition-colors">Catálogo</Link>
                        <Link href="/collections" className="hover:text-amber-400 transition-colors">Colecciones</Link>
                        <Link href="/noticias" className="hover:text-amber-400 transition-colors">Noticias</Link>
                    </div>

                    <button
                        onClick={toggleCart}
                        className="relative group flex items-center gap-2 text-white hover:text-amber-400 transition-colors"
                    >
                        <div className="relative">
                            <ShoppingCart size={22} />
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                                    {cart.length}
                                </span>
                            )}
                        </div>
                    </button>

                    {isCustomer ? (
                        <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/30 px-4 py-1.5 rounded-full hover:bg-amber-500/10">
                            {user?.name?.split(' ')[0] || 'Mi Perfil'}
                        </Link>
                    ) : (
                        <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors border border-white/10 px-4 py-1.5 rounded-full hover:border-white/30">
                            Acceso Clientes
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    return (
        <CartProvider>
            <div className="min-h-screen bg-neutral-950 text-gray-200">
                <AgeVerificationModal />
                <Navbar />
                <CartDrawer />
                {children}
            </div>
        </CartProvider>
    );
}
