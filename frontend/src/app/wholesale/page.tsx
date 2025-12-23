'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '../../components/AuthGuard';
import DashboardLayout from '../../components/layouts/DashboardLayout';

interface WholesaleStats {
    customers: {
        total: number;
        byStatus: { status: string; count: number }[];
    };
    quotations: {
        total: number;
        byStatus: { status: string; count: number; totalValue: number }[];
    };
    consignments: {
        openValue: number;
        byStatus: { status: string; count: number; totalValue: number }[];
    };
    monthlySales: {
        count: number;
        total: number;
    };
}

interface RiskCustomer {
    customerId: string;
    customerName: string;
    businessName?: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number;
    alerts: string[];
    metrics: {
        daysSinceLastOrder: number;
        openConsignments: number;
        creditUsagePercent: number;
    };
}

interface Insight {
    type: 'warning' | 'opportunity' | 'info';
    title: string;
    description: string;
    actionRequired: boolean;
}

export default function WholesaleDashboard() {
    const [stats, setStats] = useState<WholesaleStats | null>(null);
    const [atRisk, setAtRisk] = useState<RiskCustomer[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [statsRes, riskRes, insightsRes] = await Promise.all([
                fetch('/api/wholesale/ai/stats', { headers }),
                fetch('/api/wholesale/ai/risk', { headers }),
                fetch('/api/wholesale/ai/insights', { headers })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (riskRes.ok) setAtRisk(await riskRes.json());
            if (insightsRes.ok) setInsights(await insightsRes.json());
        } catch (error) {
            console.error('Error fetching wholesale data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'bg-red-500';
            case 'HIGH': return 'bg-orange-500';
            case 'MEDIUM': return 'bg-yellow-500';
            default: return 'bg-green-500';
        }
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'opportunity': return '💡';
            default: return 'ℹ️';
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Módulo Mayorista B2B</h1>
                            <p className="text-gray-400">Panel de control para operaciones comerciales</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/wholesale/quotations/new"
                                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold transition">
                                + Nuevo Presupuesto
                            </Link>
                            <Link href="/wholesale/consignments/new"
                                className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 font-bold transition">
                                + Nueva Consignación
                            </Link>
                        </div>
                    </div>

                    {/* Alerts/Insights */}
                    {insights.filter(i => i.actionRequired).length > 0 && (
                        <div className="space-y-2">
                            {insights.filter(i => i.actionRequired).map((insight, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border-l-4 ${insight.type === 'warning' ? 'bg-red-500/20 border-red-500' : 'bg-yellow-500/20 border-yellow-500'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl">{getInsightIcon(insight.type)}</span>
                                        <div>
                                            <h3 className="font-semibold text-white">{insight.title}</h3>
                                            <p className="text-sm text-gray-400">{insight.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Link href="/wholesale/customers" className="bg-blue-500/20 border border-blue-500/30 p-6 rounded-xl hover:bg-blue-500/30 transition">
                            <div className="text-3xl font-bold text-blue-400">{stats?.customers.total || 0}</div>
                            <div className="text-gray-300">Clientes Mayoristas</div>
                            <div className="text-sm text-gray-500 mt-1">
                                {stats?.customers.byStatus.find(s => s.status === 'ACTIVE')?.count || 0} activos
                            </div>
                        </Link>

                        <Link href="/wholesale/quotations" className="bg-purple-500/20 border border-purple-500/30 p-6 rounded-xl hover:bg-purple-500/30 transition">
                            <div className="text-3xl font-bold text-purple-400">{stats?.quotations.total || 0}</div>
                            <div className="text-gray-300">Presupuestos</div>
                            <div className="text-sm text-gray-500 mt-1">
                                {stats?.quotations.byStatus.find(s => s.status === 'ACCEPTED')?.count || 0} aceptados
                            </div>
                        </Link>

                        <Link href="/wholesale/consignments" className="bg-green-500/20 border border-green-500/30 p-6 rounded-xl hover:bg-green-500/30 transition">
                            <div className="text-3xl font-bold text-green-400">
                                ${(stats?.consignments.openValue || 0).toLocaleString()}
                            </div>
                            <div className="text-gray-300">En Consignación</div>
                            <div className="text-sm text-gray-500 mt-1">
                                valor pendiente de facturar
                            </div>
                        </Link>

                        <div className="bg-emerald-500/20 border border-emerald-500/30 p-6 rounded-xl">
                            <div className="text-3xl font-bold text-emerald-400">
                                ${(stats?.monthlySales.total || 0).toLocaleString()}
                            </div>
                            <div className="text-gray-300">Ventas B2B del Mes</div>
                            <div className="text-sm text-gray-500 mt-1">
                                {stats?.monthlySales.count || 0} operaciones
                            </div>
                        </div>
                    </div>

                    {/* Two columns layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* At Risk Customers */}
                        <div className="bg-white/5 rounded-xl border border-white/10">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                <h2 className="font-semibold text-white">🚨 Clientes en Riesgo</h2>
                                <Link href="/wholesale/customers?filter=risk" className="text-amber-400 text-sm hover:underline">
                                    Ver todos
                                </Link>
                            </div>
                            <div className="p-4">
                                {atRisk.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        ✅ No hay clientes en riesgo
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {atRisk.slice(0, 5).map((customer) => (
                                            <Link key={customer.customerId}
                                                href={`/wholesale/customers/${customer.customerId}`}
                                                className="block p-3 rounded-lg hover:bg-white/5 transition border border-white/10">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-white">
                                                            {customer.businessName || customer.customerName}
                                                        </div>
                                                        <div className="text-sm text-gray-400">
                                                            {customer.metrics.daysSinceLastOrder} días sin pedido
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-white text-xs ${getRiskColor(customer.riskLevel)}`}>
                                                            {{ 'LOW': 'Bajo', 'MEDIUM': 'Medio', 'HIGH': 'Alto', 'CRITICAL': 'Crítico' }[customer.riskLevel] || customer.riskLevel}
                                                        </span>
                                                        <span className="text-gray-500">{customer.riskScore}pts</span>
                                                    </div>
                                                </div>
                                                {customer.alerts.length > 0 && (
                                                    <div className="mt-2 text-sm text-orange-400">
                                                        {customer.alerts[0]}
                                                    </div>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white/5 rounded-xl border border-white/10">
                            <div className="p-4 border-b border-white/10">
                                <h2 className="font-semibold text-white">⚡ Acciones Rápidas</h2>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                <Link href="/wholesale/quotations"
                                    className="p-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 transition text-center border border-purple-500/30">
                                    <div className="text-2xl mb-1">📄</div>
                                    <div className="font-medium text-purple-300">Presupuestos</div>
                                </Link>
                                <Link href="/wholesale/consignments"
                                    className="p-4 rounded-xl bg-green-500/20 hover:bg-green-500/30 transition text-center border border-green-500/30">
                                    <div className="text-2xl mb-1">📦</div>
                                    <div className="font-medium text-green-300">Consignaciones</div>
                                </Link>
                                <Link href="/wholesale/invoicing"
                                    className="p-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 transition text-center border border-blue-500/30">
                                    <div className="text-2xl mb-1">💰</div>
                                    <div className="font-medium text-blue-300">Facturar</div>
                                </Link>
                                <Link href="/wholesale/customers"
                                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition text-center border border-white/10">
                                    <div className="text-2xl mb-1">👥</div>
                                    <div className="font-medium text-gray-300">Clientes</div>
                                </Link>
                                <Link href="/wholesale/audit"
                                    className="p-4 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 transition text-center border border-orange-500/30">
                                    <div className="text-2xl mb-1">📊</div>
                                    <div className="font-medium text-orange-300">Auditoría</div>
                                </Link>
                                <Link href="/wholesale/reports"
                                    className="p-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 transition text-center border border-indigo-500/30">
                                    <div className="text-2xl mb-1">📈</div>
                                    <div className="font-medium text-indigo-300">Reportes</div>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Quotation Status Summary */}
                    <div className="bg-white/5 rounded-xl border border-white/10">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="font-semibold text-white">📄 Estado de Presupuestos</h2>
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-6 gap-4">
                            {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'INVOICED', 'CONVERTED'].map((status) => {
                                const data = stats?.quotations.byStatus.find(s => s.status === status);
                                const statusLabels: Record<string, string> = {
                                    'DRAFT': 'Borrador',
                                    'SENT': 'Enviado',
                                    'ACCEPTED': 'Aceptado',
                                    'REJECTED': 'Rechazado',
                                    'INVOICED': 'Facturado',
                                    'CONVERTED': 'Convertido'
                                };
                                return (
                                    <div key={status} className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="text-xl font-bold text-white">{data?.count || 0}</div>
                                        <div className="text-xs text-gray-400 uppercase">{statusLabels[status] || status}</div>
                                        {data?.totalValue && (
                                            <div className="text-xs text-gray-500">
                                                ${data.totalValue.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
