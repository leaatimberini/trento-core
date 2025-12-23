"use client";

import { useState, useEffect } from "react";
import { api } from "../../services/api";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Truck, CreditCard, ShoppingBag, Globe, RefreshCw, CheckCircle, XCircle, Settings, X } from "lucide-react";

interface IntegrationStatus {
    connected: boolean;
    configured: boolean;
    lastSync?: string;
    lastError?: string;
    accountId?: string;
}

interface ConfigModalData {
    provider: string;
    title: string;
    fields: Array<{ name: string; label: string; type: string; placeholder: string }>;
}

export default function IntegracionesPage() {
    const [syncing, setSyncing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
    const [configModal, setConfigModal] = useState<ConfigModalData | null>(null);
    const [configValues, setConfigValues] = useState<Record<string, string>>({});

    useEffect(() => {
        loadStatuses();
    }, []);

    const loadStatuses = async () => {
        try {
            const data = await api.getIntegrationStatuses();
            setStatuses(data);
        } catch (error) {
            console.error("Failed to load integration statuses", error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigure = async () => {
        if (!configModal) return;
        setSyncing(configModal.provider);

        try {
            await api.configureIntegration(configModal.provider, configValues);
            await loadStatuses();
            setConfigModal(null);
            setConfigValues({});
            alert("Integración configurada correctamente");
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setSyncing(null);
        }
    };

    const handleDisconnect = async (provider: string) => {
        if (!confirm("¿Desconectar esta integración?")) return;
        try {
            await api.disconnectIntegration(provider);
            await loadStatuses();
        } catch (error) {
            alert("Error al desconectar");
        }
    };

    const handleTestConnection = async (provider: string) => {
        setSyncing(provider);
        try {
            const result = await api.testIntegration(provider);
            if (result.success) {
                alert("Conexión exitosa!");
            } else {
                alert(`Error: ${result.error}`);
            }
            await loadStatuses();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setSyncing(null);
        }
    };

    const integrations = [
        {
            name: "mercadolibre",
            title: "Mercado Libre",
            description: "Publicación de productos, sincronización de stock y recepción de pedidos.",
            icon: ShoppingBag,
            color: "text-yellow-500",
            bgColor: "bg-yellow-500/10",
            configFields: [
                { name: "clientId", label: "App ID", type: "text", placeholder: "123456789" },
                { name: "clientSecret", label: "Client Secret", type: "password", placeholder: "Tu client secret" }
            ]
        },
        {
            name: "mercadopago",
            title: "Mercado Pago",
            description: "Cobros online, checkout y QR para punto de venta.",
            icon: CreditCard,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            configFields: [
                { name: "accessToken", label: "Access Token", type: "password", placeholder: "APP_USR-..." },
                { name: "publicKey", label: "Public Key", type: "text", placeholder: "APP_USR-..." }
            ]
        },
        {
            name: "arca",
            title: "ARCA / AFIP",
            description: "Facturación electrónica y obtención de CAE.",
            icon: Globe,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            configFields: [
                { name: "clientId", label: "CUIT", type: "text", placeholder: "20-12345678-9" },
                { name: "accessToken", label: "Token AFIP", type: "password", placeholder: "Token de WebService" }
            ]
        },
        {
            name: "andreani",
            title: "Andreani Logística",
            description: "Cotización de envíos y generación de etiquetas.",
            icon: Truck,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            configFields: [
                { name: "accessToken", label: "API Token", type: "password", placeholder: "Token de API" },
                { name: "clientId", label: "Código de Contrato", type: "text", placeholder: "Contrato Andreani" }
            ]
        }
    ];

    if (loading) return (
        <AuthGuard>
            <DashboardLayout>
                <div className="flex h-full items-center justify-center text-amber-500">
                    Cargando integraciones...
                </div>
            </DashboardLayout>
        </AuthGuard>
    );

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-4xl mx-auto pt-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-white mb-2">Integraciones</h1>
                        <p className="text-gray-400">Conexiones con servicios externos: marketplace, pagos, logística y facturación.</p>
                    </div>

                    {/* Integration Cards */}
                    <div className="space-y-4">
                        {integrations.map(integration => {
                            const status = statuses[integration.name] || { connected: false, configured: false };
                            const Icon = integration.icon;

                            return (
                                <div
                                    key={integration.name}
                                    className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-4 ${integration.bgColor} ${integration.color} rounded-xl`}>
                                                <Icon size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">{integration.title}</h3>
                                                <p className="text-gray-400 text-sm">{integration.description}</p>
                                                {status.lastSync && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Última sincronización: {new Date(status.lastSync).toLocaleString()}
                                                    </p>
                                                )}
                                                {status.lastError && (
                                                    <p className="text-xs text-red-400 mt-1">
                                                        Error: {status.lastError}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Status Badge */}
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${status.connected
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}>
                                                {status.connected ? (
                                                    <>
                                                        <CheckCircle size={16} /> Conectado
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle size={16} /> Desconectado
                                                    </>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {status.connected ? (
                                                <>
                                                    <button
                                                        onClick={() => handleTestConnection(integration.name)}
                                                        disabled={syncing === integration.name}
                                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                                                    >
                                                        <RefreshCw
                                                            size={18}
                                                            className={syncing === integration.name ? "animate-spin" : ""}
                                                        />
                                                        Probar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDisconnect(integration.name)}
                                                        className="text-red-400 hover:text-red-300 p-2"
                                                        title="Desconectar"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setConfigModal({
                                                        provider: integration.name,
                                                        title: integration.title,
                                                        fields: integration.configFields
                                                    })}
                                                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl font-bold transition-all"
                                                >
                                                    <Settings size={18} />
                                                    Configurar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Info */}
                    <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                        <h3 className="font-bold text-blue-400 mb-2">¿Cómo obtener las credenciales?</h3>
                        <div className="space-y-2 text-sm text-gray-400">
                            <p><strong className="text-white">Mercado Libre:</strong> Crear app en <a href="https://developers.mercadolibre.com.ar" target="_blank" className="text-blue-400 hover:underline">developers.mercadolibre.com.ar</a></p>
                            <p><strong className="text-white">Mercado Pago:</strong> Obtener credenciales en <a href="https://www.mercadopago.com.ar/developers" target="_blank" className="text-blue-400 hover:underline">mercadopago.com.ar/developers</a></p>
                            <p><strong className="text-white">ARCA/AFIP:</strong> Solicitar certificado digital en AFIP y configurar WebService</p>
                            <p><strong className="text-white">Andreani:</strong> Contactar a Comercial Andreani para obtener credenciales de API</p>
                        </div>
                    </div>
                </div>

                {/* Config Modal */}
                {configModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md border border-gray-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">Configurar {configModal.title}</h2>
                                <button onClick={() => setConfigModal(null)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {configModal.fields.map(field => (
                                    <div key={field.name}>
                                        <label className="block text-sm font-bold text-gray-400 mb-2">{field.label}</label>
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={configValues[field.name] || ""}
                                            onChange={e => setConfigValues({ ...configValues, [field.name]: e.target.value })}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setConfigModal(null)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfigure}
                                    disabled={syncing !== null}
                                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2 rounded-xl disabled:opacity-50"
                                >
                                    {syncing ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </AuthGuard>
    );
}
