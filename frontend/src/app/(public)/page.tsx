
"use client";

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Product } from "../../types";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { ShoppingBag, Star, Search, Filter } from "lucide-react";
import Link from "next/link";

export default function StorePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const { addToCart } = useCart();
    const { isCustomer, user } = useAuth();



    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        // Fetch categories
        api.getCategories().then(cats => setCategories(['Todos', ...cats])).catch(console.error);

        // Use store endpoint for products with price list prices
        api.getStoreProducts().then(data => {
            setProducts(data);
            setFilteredProducts(data);
            setLoading(false);
        });
    }, []);

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

        setFilteredProducts(results);
    }, [searchTerm, products, selectedCategory]);

    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-amber-500 font-medium tracking-widest text-sm">CARGANDO EXPERIENCIA...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500/30">
            {/* Hero Section */}
            <div className="relative h-[60vh] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1543091055-637dc462b404?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent"></div>

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6">
                    <span className="inline-block py-1 px-3 border border-amber-500/50 rounded-full text-amber-400 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-md bg-black/30 mb-4">
                        Marketplace Exclusivo
                    </span>
                    <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 tracking-tight drop-shadow-2xl">
                        Trento Bebidas
                    </h1>
                    <p className="text-lg md:text-2xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
                        Descubre nuestra selección premium de bebidas importadas y nacionales.
                        Calidad garantizada para momentos inolvidables.
                    </p>
                </div>
            </div>

            {/* Catalog Section */}
            <div className="max-w-7xl mx-auto px-6 py-20">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6 sticky top-4 z-40 bg-neutral-950/80 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-2xl">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-amber-400 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar bebida favorita..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                        />
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap active:scale-95 ${selectedCategory === cat ? 'bg-amber-500 border-amber-500 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                        <p className="text-gray-400 text-lg">No encontramos lo que buscas.</p>
                        <button onClick={() => setSearchTerm('')} className="mt-4 text-amber-400 hover:text-amber-300 underline">Ver todo el catálogo</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="group relative bg-white/5 rounded-3xl overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-2">
                                {/* Image Area */}
                                <div className="aspect-[3/4] overflow-hidden relative bg-gradient-to-b from-white/5 to-transparent">
                                    <Link href={`/product/${product.slug || product.id}`} className="block h-full w-full">
                                        <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-white/10 flex items-center gap-1">
                                            <Star size={12} fill="currentColor" /> Premium
                                        </div>
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="h-full w-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-white/20 text-4xl font-serif italic">
                                                Trento
                                            </div>
                                        )}
                                    </Link>
                                    {/* Quick Add Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <button
                                            onClick={() => {
                                                // Use displayPrice (from price list) or fallback to basePrice
                                                const price = product.displayPrice ?? Number(product.basePrice);
                                                addToCart(product, 1, price);
                                            }}
                                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl flex items-center gap-2"
                                        >
                                            <ShoppingBag size={20} /> Agregar
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-amber-500/80 text-xs font-bold tracking-widest uppercase mb-1">{product.brand || 'Selección Trento'}</p>
                                            <Link href={`/product/${product.slug || product.id}`}><h3 className="text-xl font-bold text-white group-hover:text-amber-200 transition-colors leading-tight">{product.name}</h3></Link>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-end justify-between border-t border-white/5 pt-4">
                                        <div>
                                            <p className="text-gray-400 text-xs mb-1">Precio</p>
                                            <span className="text-2xl font-bold text-white">
                                                ${(product.displayPrice ?? Number(product.basePrice)).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-amber-500 group-hover:text-black transition-colors duration-300">
                                            <ShoppingBag size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        ))}
                    </div>
                )}
            </div>

            {/* Reseller CTA Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-y border-amber-500/20">
                <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                        <h3 className="text-xl font-bold text-white mb-1">¿Querés Revender?</h3>
                        <p className="text-gray-400 text-sm">Accedé a precios mayoristas y beneficios exclusivos</p>
                    </div>
                    <Link href="/resellers" className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-all whitespace-nowrap">
                        Quiero Ser Revendedor
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-black/60 border-t border-white/5 py-16 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-amber-500">Trento Bebidas</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Elevando el estándar en distribución de bebidas. Experiencia premium, entrega asegurada y la mejor selección del mercado.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Navegación</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><Link href="/catalog" className="hover:text-amber-500 transition-colors">Catálogo</Link></li>
                            <li><Link href="/ofertas" className="hover:text-amber-500 transition-colors">Ofertas</Link></li>
                            <li><Link href="/noticias" className="hover:text-amber-500 transition-colors">Noticias & Blog</Link></li>
                            <li><Link href="/collections" className="hover:text-amber-500 transition-colors">Colecciones</Link></li>
                            <li><Link href="/resellers" className="hover:text-amber-500 transition-colors">Quiero Revender</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Soporte</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><Link href="/contacto" className="hover:text-amber-500 transition-colors">Contacto</Link></li>
                            <li><Link href="/envios" className="hover:text-amber-500 transition-colors">Envíos</Link></li>
                            <li><Link href="/terms" className="hover:text-amber-500 transition-colors">Términos</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-white font-bold mb-4 uppercase text-sm tracking-wider">Newsletter</h3>
                        <div className="flex gap-2">
                            <input type="email" placeholder="Tu email..." className="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber-500/50" />
                            <button className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded text-sm font-bold">OK</button>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 text-center text-gray-500 text-xs">
                    &copy; 2025 Trento Bebidas. Diseñado por <a href="https://instagram.com/leaa.emanuel" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">LEAA</a>
                </div>
            </footer>
        </div >
    );
}
