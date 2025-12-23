'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../../components/AuthGuard';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingDown } from 'lucide-react';

interface AuditEntry {
    id: string;
    type: 'QUOTATION' | 'CONSIGNMENT' | 'INVOICE' | 'RETURN' | 'CREDIT';
    action: string;
    details: string;
    amount?: number;
    customerId: string;
    customerName: string;
    userId: string;
    userName: string;
    createdAt: string;
}

interface RiskCustomer {
    customerId: string;
    customerName: string;
    businessName?: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number;
    daysSinceLastOrder: number;
    alerts: string[];
}

export default function WholesaleAuditPage() {
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [riskCustomers, setRiskCustomers] = useState<RiskCustomer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditData();
    }, []);

    const fetchAuditData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch risk data
            const riskRes = await fetch('/api/wholesale/ai/risk', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (riskRes.ok) {
                setRiskCustomers(await riskRes.json());
            }

            // Mock audit log for now - in production this would come from API
            setAuditLog([]);
        } catch (error) {
            console.error('Error fetching audit data:', error);
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

    const criticalCount = riskCustomers.filter(c => c.riskLevel === 'CRITICAL').length;
    const highCount = riskCustomers.filter(c => c.riskLevel === 'HIGH').length;

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Auditoría B2B</h1>
                            <p className="text-gray-400">Control de riesgos y seguimiento de operaciones</p>
                        </div>
                    </div>

                    {/* Risk Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-red-500/20 border border-red-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <span className="text-gray-400 text-sm">Riesgo Crítico</span>
                            </div>
                            <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
                            <p className="text-xs text-gray-500">Clientes requieren atención inmediata</p>
                        </div>
                        <div className="bg-orange-500/20 border border-orange-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingDown className="w-5 h-5 text-orange-400" />
                                <span className="text-gray-400 text-sm">Riesgo Alto</span>
                            </div>
                            <div className="text-2xl font-bold text-orange-400">{highCount}</div>
                            <p className="text-xs text-gray-500">Clientes con señales de alerta</p>
                        </div>
                        <div className="bg-green-500/20 border border-green-500/30 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-gray-400 text-sm">Sin Riesgo</span>
                            </div>
                            <div className="text-2xl font-bold text-green-400">
                                {riskCustomers.filter(c => c.riskLevel === 'LOW').length}
                            </div>
                            <p className="text-xs text-gray-500">Clientes saludables</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-400 text-sm">Total Analizado</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{riskCustomers.length}</div>
                            <p className="text-xs text-gray-500">Clientes en seguimiento</p>
                        </div>
                    </div>

                    {/* Risk Customers Table */}
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="font-semibold text-white">🚨 Clientes en Riesgo</h2>
                        </div>
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nivel</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Score</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Días sin Pedido</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Alertas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {riskCustomers
                                    .filter(c => c.riskLevel !== 'LOW')
                                    .sort((a, b) => b.riskScore - a.riskScore)
                                    .map((customer) => (
                                        <tr key={customer.customerId} className="hover:bg-white/5 transition">
                                            <td className="px-4 py-4">
                                                <div className="font-medium text-white">
                                                    {customer.businessName || customer.customerName}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded text-white text-xs ${getRiskColor(customer.riskLevel)}`}>
                                                    {customer.riskLevel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-gray-300">
                                                {customer.riskScore} pts
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={customer.daysSinceLastOrder > 30 ? 'text-orange-400' : 'text-gray-300'}>
                                                    {customer.daysSinceLastOrder} días
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {customer.alerts.length > 0 ? (
                                                    <div className="text-sm text-orange-400">
                                                        {customer.alerts[0]}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        {riskCustomers.filter(c => c.riskLevel !== 'LOW').length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                ✅ No hay clientes en riesgo
                            </div>
                        )}
                    </div>

                    {/* Audit Log */}
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="font-semibold text-white">📋 Registro de Auditoría</h2>
                        </div>
                        <div className="p-8 text-center text-gray-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                            <p>El registro de auditoría se mostrará aquí una vez que haya operaciones registradas</p>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
