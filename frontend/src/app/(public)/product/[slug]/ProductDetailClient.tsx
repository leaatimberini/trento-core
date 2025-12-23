"use client";

import { useState } from "react";
import { Product } from "../../../../types";
import { useCart } from "../../../../context/CartContext";
import { useAuth } from "../../../../context/AuthContext";
import { ShoppingBag, Star, ArrowLeft, Plus, Minus, Share2 } from "lucide-react";
import Link from "next/link";

interface ProductDetailClientProps {
    product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useCart();
    const { isCustomer, user } = useAuth();

    const handleAddToCart = () => {
        if (product) {
            const effectivePrice = isCustomer && user?.customerType === 'WHOLESALE' && product.wholesalePrice
                ? Number(product.wholesalePrice)
                : Number(product.basePrice);

            addToCart(product, quantity, effectivePrice);
        }
    };

    const handleShare = async () => {
        if (navigator.share && product) {
            try {
                await navigator.share({
                    title: product.name,
                    text: product.description || `Descubre ${product.name} en Trento`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500/30 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                {/* Breadcrumb */}
                <nav className="mb-6 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center gap-2 text-gray-400">
                        <li><Link href="/" className="hover:text-amber-500">Inicio</Link></li>
                        <li>/</li>
                        <li><Link href={`/catalog?category=${product.category}`} className="hover:text-amber-500">{product.category || 'Productos'}</Link></li>
                        <li>/</li>
                        <li className="text-amber-500">{product.name}</li>
                    </ol>
                </nav>

                <div className="flex justify-between items-center mb-4">
                    <Link href="/" className="inline-flex items-center text-gray-400 hover:text-amber-500 transition-colors">
                        <ArrowLeft size={20} className="mr-2" /> Volver al catálogo
                    </Link>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-gray-400 hover:text-amber-500 transition-colors"
                    >
                        <Share2 size={20} /> Compartir
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                    {/* Image Section */}
                    <div className="relative group">
                        <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-white/5 border border-white/5 relative">
                            <div className="absolute top-6 right-6 z-20 bg-black/60 backdrop-blur-md text-amber-400 text-sm font-bold px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                                <Star size={14} fill="currentColor" /> Premium
                            </div>
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white/20 text-6xl font-serif italic">
                                    Trento
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="flex flex-col justify-center space-y-8">
                        <div>
                            <p className="text-amber-500 font-bold tracking-[0.2em] uppercase text-sm mb-3">{product.brand || 'Selección Trento'}</p>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">{product.name}</h1>
                            <div className="flex items-center gap-4 mb-6">
                                {isCustomer && user?.customerType === 'WHOLESALE' && product.wholesalePrice ? (
                                    <div className="flex flex-col">
                                        <span className="text-amber-500 font-bold text-xs uppercase tracking-widest mb-1">Precio Mayorista</span>
                                        <div className="flex items-baseline gap-4">
                                            <span className="text-3xl md:text-4xl font-bold text-amber-500">${Number(product.wholesalePrice).toFixed(2)}</span>
                                            <span className="text-xl text-gray-500 line-through decoration-gray-600">${Number(product.basePrice).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-3xl md:text-4xl font-bold text-white">${Number(product.basePrice).toFixed(2)}</span>
                                )}
                                <span className="bg-white/10 text-gray-300 px-3 py-1 rounded text-sm h-fit self-center">Disponibles: {product.currentStock}</span>
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed border-l-2 border-amber-500/30 pl-6">
                                {product.description || "Una elección excepcional para los paladares más exigentes."}
                            </p>
                        </div>

                        {/* Controls */}
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-300 font-medium">Cantidad</span>
                                <div className="flex items-center gap-4 bg-neutral-900 rounded-lg p-1 border border-white/10">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="p-2 hover:bg-white/10 rounded-md transition-colors text-white disabled:opacity-50"
                                        disabled={quantity <= 1}
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(product.currentStock || 99, quantity + 1))}
                                        className="p-2 hover:bg-white/10 rounded-md transition-colors text-white disabled:opacity-50"
                                        disabled={quantity >= (product.currentStock || 99)}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 transform active:scale-95 transition-all shadow-xl shadow-amber-900/20 text-lg"
                            >
                                <ShoppingBag size={24} /> Agregar al Carrito
                            </button>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 pt-4 border-t border-white/5">
                            <div>
                                <span className="block text-gray-400 font-bold mb-1">SKU</span>
                                {product.sku}
                            </div>
                            <div>
                                <span className="block text-gray-400 font-bold mb-1">Categoría</span>
                                {product.category || 'General'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
