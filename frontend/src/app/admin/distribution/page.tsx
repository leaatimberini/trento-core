"use client";

import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import AuthGuard from "../../../components/AuthGuard";
import { Truck, MapPin, FileText, CheckCircle, Navigation } from "lucide-react";

export default function DistributionPage() {
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [optimized, setOptimized] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getDeliveries();
            setDeliveries(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOptimize = async () => {
        setLoading(true);
        try {
            const sorted = await api.optimizeRoute(deliveries);
            setDeliveries(sorted);
            setOptimized(true);
        } catch (error) {
            alert("Error optimizando ruta");
        } finally {
            setLoading(false);
        }
    };

    const handlePrintManifest = async (saleId: string) => {
        try {
            const text = await api.getManifest(saleId);
            // Open in new window for printing
            const win = window.open('', '_blank');
            win?.document.write(`<pre style="font-family: monospace; font-size: 14px;">${text}</pre>`);
            win?.print();
        } catch (error) {
            alert("Error al generar remito");
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-neutral-950 text-gray-200 p-8 font-sans">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                                <Truck className="text-blue-500" size={32} />
                                Logística y Distribución
                            </h1>
                            <p className="text-gray-500 mt-1">Gestión de envíos y hojas de ruta</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleOptimize}
                                disabled={loading || deliveries.length === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${optimized
                                        ? "bg-green-600/20 text-green-400 border border-green-500/50"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                                    }`}
                            >
                                {optimized ? <CheckCircle size={20} /> : <Navigation size={20} />}
                                {optimized ? "Ruta Optimizada" : "Optimizar Recorrido"}
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-neutral-900 p-6 rounded-2xl border border-white/5">
                            <h3 className="text-gray-500 text-xs font-bold uppercase">Envíos Pendientes</h3>
                            <p className="text-3xl font-bold text-white mt-2">{deliveries.length}</p>
                        </div>
                        <div className="bg-neutral-900 p-6 rounded-2xl border border-white/5">
                            <h3 className="text-gray-500 text-xs font-bold uppercase">Zona Principal</h3>
                            <p className="text-3xl font-bold text-blue-400 mt-2">Centro</p>
                        </div>
                        <div className="bg-neutral-900 p-6 rounded-2xl border border-white/5">
                            <h3 className="text-gray-500 text-xs font-bold uppercase">Camiones Disponibles</h3>
                            <p className="text-3xl font-bold text-green-400 mt-2">2</p>
                        </div>
                    </div>

                    {/* Deliveries List */}
                    <div className="space-y-4">
                        {loading && <p className="text-center text-gray-500">Cargando envíos...</p>}

                        {!loading && deliveries.length === 0 && (
                            <div className="text-center py-20 bg-neutral-900/50 rounded-3xl border border-white/5 border-dashed">
                                <Truck size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
                                <p className="text-gray-500">No hay envíos pendientes para hoy.</p>
                            </div>
                        )}

                        {deliveries.map((delivery, index) => (
                            <div key={delivery.id} className="bg-neutral-900 p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                {/* Order Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            #{index + 1}
                                        </span>
                                        <h3 className="text-lg font-bold text-white">
                                            {delivery.customer?.name || "Cliente Mostrador"}
                                        </h3>
                                        <span className="text-gray-500 text-sm">Ref: {delivery.code}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <MapPin size={16} className="text-amber-500" />
                                        {delivery.customer?.address || "Sin dirección registrada"}
                                    </div>
                                </div>

                                {/* Items Summary */}
                                <div className="hidden md:block flex-1">
                                    <div className="flex gap-2 flex-wrap">
                                        {delivery.items.slice(0, 3).map((item: any) => (
                                            <span key={item.id} className="text-xs bg-black/50 border border-white/10 px-2 py-1 rounded text-gray-300">
                                                {item.quantity}x {item.product.name}
                                            </span>
                                        ))}
                                        {delivery.items.length > 3 && (
                                            <span className="text-xs text-gray-500">+{delivery.items.length - 3} más</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => handlePrintManifest(delivery.id)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-white transition-colors"
                                    >
                                        <FileText size={16} /> Remito
                                    </button>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.customer?.address || '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-white transition-colors"
                                    >
                                        <MapPin size={16} /> Mapa
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
