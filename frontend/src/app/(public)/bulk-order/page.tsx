"use client";

import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { Product } from "../../../types";
import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../context/AuthContext";
import { ShoppingCart, Search, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BulkOrderPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const { addToCart } = useCart();
    const { isCustomer, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Optional: Redirect if not wholesale? For now, open to all but optimized for B2B
        // if (!isCustomer || user?.customerType !== 'WHOLESALE') {
        //    router.replace('/'); 
        // }

        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Error loading products", error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (productId: string, val: string) => {
        const qty = parseInt(val) || 0;
        setQuantities(prev => ({
            ...prev,
            [productId]: qty
        }));
    };

    const handleAddAllToCart = () => {
        let addedCount = 0;
        Object.entries(quantities).forEach(([productId, qty]) => {
            if (qty > 0) {
                const product = products.find(p => p.id === productId);
                if (product) {
                    // Loop not needed anymore, context supports quantity
                    const price = isWholesale && product.wholesalePrice
                        ? Number(product.wholesalePrice)
                        : Number(product.basePrice);

                    addToCart(product, qty, price);
                    addedCount += qty;
                }
            }
        });

        if (addedCount > 0) {
            setQuantities({});
            alert(`Se agregaron ${addedCount} productos al carrito.`);
        }
    };

    const isWholesale = isCustomer && user?.customerType === 'WHOLESALE';

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-12 text-center text-white">Cargando catálogo...</div>;

    return (
        <div className="min-h-screen bg-neutral-950 text-white pt-24 px-6 pb-20">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-amber-500 mb-2">Pedido Mayorista Rápido</h1>
                        <p className="text-gray-400 text-sm">Ingrese cantidades y agregue al carrito en lote.</p>
                    </div>
                    {Object.values(quantities).reduce((a, b) => a + b, 0) > 0 && (
                        <button
                            onClick={handleAddAllToCart}
                            className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20 animate-bounce"
                        >
                            <ShoppingCart size={20} />
                            Agregar al Carrito
                        </button>
                    )}
                </div>

                <div className="bg-gray-900/50 rounded-xl border border-white/5 p-4 mb-6 sticky top-20 z-10 backdrop-blur-md">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, SKU o marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-12 text-white focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                </div>

                <div className="bg-gray-900/30 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                                <th className="p-4">Producto</th>
                                <th className="p-4">SKU</th>
                                <th className="p-4 text-right">Precio</th>
                                <th className="p-4 text-center w-32">Cantidad</th>
                                <th className="p-4 text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map(product => {
                                const price = isWholesale && product.wholesalePrice ? Number(product.wholesalePrice) : Number(product.basePrice);
                                const qty = quantities[product.id] || 0;

                                return (
                                    <tr key={product.id} className={`hover:bg-white/5 transition-colors ${qty > 0 ? 'bg-amber-500/5' : ''}`}>
                                        <td className="p-4">
                                            <div className="font-bold text-white">{product.name}</div>
                                            <div className="text-xs text-gray-500">{product.brand}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400 font-mono">{product.sku}</td>
                                        <td className="p-4 text-right font-mono">
                                            {isWholesale && product.wholesalePrice ? (
                                                <div>
                                                    <span className="text-amber-500 font-bold">${price.toFixed(2)}</span>
                                                    <div className="text-xs text-gray-600 line-through">${Number(product.basePrice).toFixed(2)}</div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">${price.toFixed(2)}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number"
                                                min="0"
                                                value={quantities[product.id] || ''}
                                                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                                className={`w-full bg-black/40 border rounded py-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-amber-500 ${qty > 0 ? 'border-amber-500/50 bg-amber-500/10' : 'border-white/10'}`}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="p-4 text-right font-mono text-gray-300">
                                            {qty > 0 ? (
                                                <span className="text-amber-400 font-bold">${(price * qty).toFixed(2)}</span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
