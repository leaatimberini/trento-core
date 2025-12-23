'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../../components/AuthGuard';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import { FileText, TrendingUp, Users, Package, DollarSign, Calendar } from 'lucide-react';

interface ReportSummary {
    totalSales: number;
    totalQuotations: number;
    totalConsignments: number;
    activeCustomers: number;
    pendingValue: number;
}

export default function WholesaleReportsPage() {
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('month');

    useEffect(() => {
        fetchSummary();
    }, [dateRange]);

    const fetchSummary = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/wholesale/stats?range=${dateRange}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSummary({
                    totalSales: data.monthlySales?.total || 0,
                    totalQuotations: data.quotations?.total || 0,
                    totalConsignments: data.consignments?.openValue || 0,
                    activeCustomers: data.customers?.total || 0,
                    pendingValue: data.consignments?.openValue || 0
                });
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AuthGuard>
                <DashboardLayout>
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                    </div>
                </DashboardLayout>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Reportes B2B</h1>
                            <p className="text-gray-400">Análisis y métricas del canal mayorista</p>
                        </div>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white">
                            <option value="week" className="bg-neutral-900">Última semana</option>
                            <option value="month" className="bg-neutral-900">Este mes</option>
                            <option value="quarter" className="bg-neutral-900">Este trimestre</option>
                            <option value="year" className="bg-neutral-900">Este año</option>
                        </select>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-emerald-500/20 border border-emerald-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                <span className="text-gray-400 text-sm">Ventas B2B</span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-400">
                                ${(summary?.totalSales || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-purple-500/20 border border-purple-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-5 h-5 text-purple-400" />
                                <span className="text-gray-400 text-sm">Presupuestos</span>
                            </div>
                            <div className="text-2xl font-bold text-purple-400">
                                {summary?.totalQuotations || 0}
                            </div>
                        </div>
                        <div className="bg-green-500/20 border border-green-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <Package className="w-5 h-5 text-green-400" />
                                <span className="text-gray-400 text-sm">En Consignación</span>
                            </div>
                            <div className="text-2xl font-bold text-green-400">
                                ${(summary?.totalConsignments || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-blue-500/20 border border-blue-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-gray-400 text-sm">Clientes Activos</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-400">
                                {summary?.activeCustomers || 0}
                            </div>
                        </div>
                        <div className="bg-amber-500/20 border border-amber-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-amber-400" />
                                <span className="text-gray-400 text-sm">Pendiente</span>
                            </div>
                            <div className="text-2xl font-bold text-amber-400">
                                ${(summary?.pendingValue || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Available Reports */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">📊 Reportes Disponibles</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer">
                                <div className="text-2xl mb-2">📈</div>
                                <h3 className="font-medium text-white">Ventas por Cliente</h3>
                                <p className="text-sm text-gray-400">Ranking de clientes por volumen de ventas</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer">
                                <div className="text-2xl mb-2">📦</div>
                                <h3 className="font-medium text-white">Productos más Vendidos</h3>
                                <p className="text-sm text-gray-400">Top productos en el canal B2B</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer">
                                <div className="text-2xl mb-2">💰</div>
                                <h3 className="font-medium text-white">Estado de Cuenta</h3>
                                <p className="text-sm text-gray-400">Saldos pendientes por cliente</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer">
                                <div className="text-2xl mb-2">📅</div>
                                <h3 className="font-medium text-white">Tendencias Mensuales</h3>
                                <p className="text-sm text-gray-400">Evolución de ventas en el tiempo</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer">
                                <div className="text-2xl mb-2">⚠️</div>
                                <h3 className="font-medium text-white">Clientes en Riesgo</h3>
                                <p className="text-sm text-gray-400">Análisis de retención y churn</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition cursor-pointer">
                                <div className="text-2xl mb-2">🧾</div>
                                <h3 className="font-medium text-white">Facturación Pendiente</h3>
                                <p className="text-sm text-gray-400">Consignaciones sin facturar</p>
                            </div>
                        </div>
                    </div>

                    {/* Export Options */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">📥 Exportar Datos</h2>
                        <div className="flex flex-wrap gap-3">
                            <button className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl hover:bg-green-500/30 transition font-medium">
                                📊 Exportar a Excel
                            </button>
                            <button className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition font-medium">
                                📄 Exportar a PDF
                            </button>
                            <button className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/30 transition font-medium">
                                📧 Enviar por Email
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
