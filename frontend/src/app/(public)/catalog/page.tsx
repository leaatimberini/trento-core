"use client";

import { Suspense } from "react";

import { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { Product } from "../../../types";
import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../context/AuthContext";
import { ShoppingBag, Star, Search, Filter, SlidersHorizontal, ArrowDownAZ, ArrowUpAZ, ArrowDownUp } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function CatalogContent() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
    const [sortOrder, setSortOrder] = useState<string>("default");

    const { addToCart } = useCart();
    const { isCustomer, user } = useAuth();
    const searchParams = useSearchParams();

    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        api.getCategories().then(cats => setCategories(['Todos', ...cats])).catch(console.error);
    }, []);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await api.getProducts();
                setProducts(data);
                setFilteredProducts(data);

                // Pre-filter if URL has params
                const catParam = searchParams.get('category');
                if (catParam) setSelectedCategory(catParam);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [searchParams]);

    useEffect(() => {
        let results = products;

        // Category Filter
        if (selectedCategory !== "Todos") {
            results = results.filter(p => p.category === selectedCategory);
        }

        // Search Filter
        if (searchTerm) {
            results = results.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Price Filter (Simple implementation)
        results = results.filter(p => {
            const price = Number(isCustomer && user?.customerType === 'WHOLESALE' ? p.wholesalePrice : p.basePrice);
            return price >= priceRange[0] && price <= priceRange[1];
        });

        // Sort
        if (sortOrder === "price-asc") {
            results.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
        } else if (sortOrder === "price-desc") {
            results.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
        } else if (sortOrder === "name-asc") {
            results.sort((a, b) => a.name.localeCompare(b.name));
        }

        setFilteredProducts(results);
    }, [searchTerm, products, selectedCategory, priceRange, sortOrder, isCustomer, user]);

    const handleAddToCart = (product: Product) => {
        const price = isCustomer && user?.customerType === 'WHOLESALE' && product.wholesalePrice
            ? Number(product.wholesalePrice)
            : Number(product.basePrice);
        addToCart(product, 1, price);
    };

    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center pt-24">
            <div className="flex flex-col items-center">
                <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-amber-500 font-medium tracking-widest text-sm uppercase">Cargando Catálogo</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500/30 pt-24 px-6 pb-20">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4">
                        Nuestro Catálogo
                    </h1>
                    <p className="text-gray-400 max-w-2xl">
                        Explora nuestra colección completa de bebidas premium. Utiliza los filtros para encontrar exactamente lo que buscas.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Filters */}
                    <div className="space-y-8">
                        {/* Search */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                            />
                        </div>

                        {/* Categories */}
                        <div className="bg-white/5 border border-white/5 rounded-xl p-6">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <Filter size={16} className="text-amber-500" /> Categorías
                            </h3>
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat ? 'bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort */}
                        <div className="bg-white/5 border border-white/5 rounded-xl p-6">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <ArrowDownUp size={16} className="text-amber-500" /> Ordenar
                            </h3>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-500/50"
                            >
                                <option value="default">Relevancia</option>
                                <option value="price-asc">Menor Precio</option>
                                <option value="price-desc">Mayor Precio</option>
                                <option value="name-asc">Nombre (A-Z)</option>
                            </select>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="lg:col-span-3">
                        <div className="mb-6 flex justify-between items-center bg-white/5 border border-white/5 rounded-xl p-4">
                            <span className="text-gray-400 text-sm">Mostrando <b className="text-white">{filteredProducts.length}</b> productos</span>
                            <div className="flex gap-2">
                                {/* Optional: Grid/List Toggle View buttons here */}
                            </div>
                        </div>

                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                <p className="text-gray-400">No se encontraron productos con estos filtros.</p>
                                <button onClick={() => { setSelectedCategory('Todos'); setSearchTerm(''); }} className="mt-2 text-amber-500 text-sm hover:underline">Limpiar Filtros</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredProducts.map(product => (
                                    <div key={product.id} className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
                                        <div className="aspect-[3/4] overflow-hidden relative bg-black/40">
                                            <Link href={`/product/${product.slug || product.id}`} className="block h-full w-full">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-white/20 font-serif italic">Trento</div>
                                                )}
                                                {/* Premium Badge */}
                                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-amber-500 flex items-center gap-1">
                                                    <Star size={10} fill="currentColor" /> {product.brand || 'Premium'}
                                                </div>
                                            </Link>

                                            {/* Add Button Overlay */}
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="absolute bottom-4 right-4 bg-amber-500 hover:bg-amber-400 text-black p-3 rounded-full shadow-lg translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10"
                                            >
                                                <ShoppingBag size={20} />
                                            </button>
                                        </div>

                                        <div className="p-4">
                                            <p className="text-amber-500/70 text-[10px] font-bold tracking-wider uppercase mb-1">{product.category}</p>
                                            <Link href={`/product/${product.slug || product.id}`} className="block mb-2">
                                                <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">{product.name}</h3>
                                            </Link>

                                            <div className="flex justify-between items-baseline">
                                                {isCustomer && user?.customerType === 'WHOLESALE' && product.wholesalePrice ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-bold text-amber-400">${Number(product.wholesalePrice).toFixed(2)}</span>
                                                        <span className="text-xs text-gray-500 line-through">${Number(product.basePrice).toFixed(2)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-lg font-bold text-white">${Number(product.basePrice).toFixed(2)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CatalogPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-amber-500">Cargando...</div>}>
            <CatalogContent />
        </Suspense>
    );
}
