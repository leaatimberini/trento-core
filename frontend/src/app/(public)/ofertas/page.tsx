'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Product } from '../../../types';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { ShoppingBag, Star, Tag, Percent, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function OfertasPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const { isCustomer, user } = useAuth();

    useEffect(() => {
        api.getProducts().then(data => {
            // Filter products with promotions or wholesale discounts
            const promoProducts = data.filter((p: Product) =>
                p.wholesalePrice && Number(p.wholesalePrice) < Number(p.basePrice)
            );
            setProducts(promoProducts);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 pt-24 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-amber-500 font-medium tracking-widest text-sm">CARGANDO OFERTAS...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <span className="inline-block py-1 px-3 border border-amber-500/50 rounded-full text-amber-400 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-md bg-black/30 mb-4">
                        <Percent size={14} className="inline mr-2" />
                        Descuentos Exclusivos
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Ofertas del Mes</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Aprovechá nuestros precios especiales y promociones por tiempo limitado
                    </p>
                </div>

                {/* CTA for Resellers */}
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-8 mb-12 border border-amber-500/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">¿Querés mejores precios?</h2>
                            <p className="text-gray-400">
                                Registrate como revendedor o comercio y accedé a descuentos de hasta 25%
                            </p>
                        </div>
                        <Link
                            href="/resellers"
                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all whitespace-nowrap"
                        >
                            Quiero Revender
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>

                {/* Products Grid */}
                {products.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                        <Tag size={48} className="mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400 text-lg mb-2">No hay ofertas disponibles en este momento</p>
                        <p className="text-gray-500 text-sm mb-6">Pero podés explorar nuestro catálogo completo</p>
                        <Link href="/catalog" className="text-amber-400 hover:text-amber-300 font-medium">
                            Ver todo el catálogo →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {products.map(product => {
                            const discount = Math.round(
                                ((Number(product.basePrice) - Number(product.wholesalePrice)) / Number(product.basePrice)) * 100
                            );

                            return (
                                <div key={product.id} className="group relative bg-white/5 rounded-3xl overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all duration-500">
                                    {/* Discount Badge */}
                                    <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        -{discount}%
                                    </div>

                                    {/* Image */}
                                    <div className="aspect-[3/4] overflow-hidden relative">
                                        <Link href={`/product/${product.slug || product.id}`} className="block h-full w-full">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-white/20 text-4xl font-serif italic bg-white/5">
                                                    Trento
                                                </div>
                                            )}
                                        </Link>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <p className="text-amber-500/80 text-xs font-bold tracking-widest uppercase mb-1">
                                            {product.brand || 'Selección Trento'}
                                        </p>
                                        <Link href={`/product/${product.slug || product.id}`}>
                                            <h3 className="text-xl font-bold text-white group-hover:text-amber-200 transition-colors">
                                                {product.name}
                                            </h3>
                                        </Link>

                                        <div className="mt-4 flex items-end justify-between border-t border-white/5 pt-4">
                                            <div>
                                                <p className="text-xs text-gray-500 line-through">
                                                    ${Number(product.basePrice).toFixed(2)}
                                                </p>
                                                <span className="text-2xl font-bold text-amber-400">
                                                    ${Number(product.wholesalePrice).toFixed(2)}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => addToCart(product, 1, Number(product.wholesalePrice))}
                                                className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-black hover:bg-amber-400 transition-colors"
                                            >
                                                <ShoppingBag size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
