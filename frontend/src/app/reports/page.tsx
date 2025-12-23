
"use client";

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { isAdmin } from "../../utils/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { FileText, Download, Shield } from "lucide-react";

export default function ReportsPage() {
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!isAdmin()) {
            router.replace("/pos");
            return;
        }
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const logs = await api.getAuditLogs();
            setAuditLogs(logs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSales = async () => {
        try {
            const blob = await api.downloadSalesCsv();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sales-report-${new Date().toISOString()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert("Error al descargar reporte de ventas");
        }
    };

    const handleDownloadInventory = async () => {
        try {
            const blob = await api.downloadInventoryCsv();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory-report-${new Date().toISOString()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert("Error al descargar reporte de inventario");
        }
    };

    if (loading) return (
        <div className="flex h-full items-center justify-center text-amber-500">
            Cargando Reportes...
        </div>
    );

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-white mb-2">
                            Reportes
                        </h1>
                        <p className="text-gray-400">Exportación de datos de ventas e inventario.</p>
                    </div>

                    {/* Download Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/5 hover:border-amber-500/50 transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-colors">
                                    <FileText size={28} />
                                </div>
                                <button
                                    onClick={handleDownloadSales}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Exportar CSV
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Reporte de Ventas</h3>
                            <p className="text-gray-400 text-sm">Descarga el historial completo de transacciones, incluyendo detalles de items, totales y métodos de pago.</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/5 hover:border-amber-500/50 transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:bg-purple-500 group-hover:text-black transition-colors">
                                    <FileText size={28} />
                                </div>
                                <button
                                    onClick={handleDownloadInventory}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Download size={16} /> Exportar CSV
                                </button>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Reporte de Inventario</h3>
                            <p className="text-gray-400 text-sm">Descarga el estado actual del stock, incluyendo costos, precios y niveles de alerta.</p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/5 hover:border-amber-500/50 transition-all group lg:col-span-2 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Shield className="text-red-500" /> Inventario Muerto (Dead Stock)
                                </h3>
                                <p className="text-gray-400 text-sm">Productos sin ventas en los últimos 90 días.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem("token");
                                        const r = await fetch(`/api/reports/inventory/dead-stock?days=90`, {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        const blob = await r.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = "dead_stock.csv";
                                        a.click();
                                    } catch (e) {
                                        alert("Error descarga");
                                    }
                                }}
                                className="px-6 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl font-bold flex items-center gap-2 transition-all border border-red-900/50"
                            >
                                <Download size={18} /> Descargar Reporte
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
