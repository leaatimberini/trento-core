"use client";

import { useState } from "react";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Settings, CreditCard, Truck, Globe, Save } from "lucide-react";

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);

    // Mock State - In a real app this would come from an API
    const [config, setConfig] = useState({
        storeName: "Trento Bebidas",
        currency: "ARS",
        integrations: {
            mercadoPago: true,
            andreani: false,
            afip: true
        }
    });

    const handleToggle = (key: keyof typeof config.integrations) => {
        setConfig(prev => ({
            ...prev,
            integrations: {
                ...prev.integrations,
                [key]: !prev.integrations[key]
            }
        }));
    };

    const handleSave = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            alert("Configuración guardada correctamente");
        }, 1000);
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                {/* Page Content - No wrapper div needed with bg colors, handled by Layout */}
                <div className="max-w-4xl mx-auto pt-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-white mb-2">Configuración</h1>
                        <p className="text-gray-400">Gestiona las integraciones y preferencias del sistema.</p>
                    </div>

                    <div className="space-y-8">
                        {/* General Settings */}
                        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Settings className="text-amber-500" size={24} /> General
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Nombre de la Tienda</label>
                                    <input
                                        type="text"
                                        value={config.storeName}
                                        onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Moneda</label>
                                    <select
                                        value={config.currency}
                                        onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                                    >
                                        <option value="ARS">Peso Argentino (ARS)</option>
                                        <option value="USD">Dólar Estadounidense (USD)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Integrations */}
                        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Globe className="text-blue-500" size={24} /> Integraciones
                            </h2>

                            <div className="space-y-6">
                                {/* MercadoPago */}
                                <div className="flex flex-col gap-4 p-4 bg-black/20 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">Mercado Pago (Split Payments)</h3>
                                                <p className="text-sm text-gray-400">Procesamiento de pagos y vinculación de cuenta vendedor.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={config.integrations.mercadoPago} onChange={() => handleToggle('mercadoPago')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {config.integrations.mercadoPago && (
                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-sm">
                                            <div className="text-gray-400">
                                                <p>Vincula tu cuenta para recibir pagos.</p>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        // Direct fetch to avoid importing api service if not present in this file context conveniently, 
                                                        // but better use api service if possible. Assuming api is accessible or using window.location for simplicity with a direct backend call ?
                                                        // Let's use the standard api service pattern if I can import it.
                                                        // Since I cannot easily add imports at top without offset issues, I will use fetch for now or add import in a separate step?
                                                        // I will add import in a separate step or just use fetch here pointing to API_URL.
                                                        const token = localStorage.getItem('token');
                                                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/integrations/mercadopago/auth-url`, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                        });
                                                        const data = await response.json();
                                                        if (data.url) window.location.href = data.url;
                                                    } catch (e) {
                                                        alert('Error al iniciar vinculación');
                                                    }
                                                }}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs"
                                            >
                                                VINCULAR CUENTA AHORA
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Andreani */}
                                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-lg">
                                            <Truck size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">Andreani Logística</h3>
                                            <p className="text-sm text-gray-400">Cálculo de envíos y generación de etiquetas.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={config.integrations.andreani} onChange={() => handleToggle('andreani')} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>

                                {/* AFIP */}
                                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
                                            <Globe size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">AFIP Facturación</h3>
                                            <p className="text-sm text-gray-400">Factura electrónica automática (CAE via WebService).</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={config.integrations.afip} onChange={() => handleToggle('afip')} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pb-8">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={20} />
                                {loading ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
