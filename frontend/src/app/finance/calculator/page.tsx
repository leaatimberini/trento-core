"use client";

import { useState } from 'react';
import { api } from '../../../services/api';
import AuthGuard from '../../../components/AuthGuard';
import DashboardLayout from '../../../components/layouts/DashboardLayout';
import { Calculator, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DiscountCalculatorPage() {
    const [form, setForm] = useState({
        productCost: 1000,
        salesPrice: 2000,
        discountPercent: 10,
        paymentMethodCommission: 5,
        taxPercent: 21,
        operationalCosts: 200,
        minAcceptableMargin: 10
    });

    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const calculate = async () => {
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const payload = {
                productCost: Number(form.productCost),
                salesPrice: Number(form.salesPrice),
                discountPercent: Number(form.discountPercent) / 100,
                paymentMethodCommission: Number(form.paymentMethodCommission) / 100,
                taxPercent: Number(form.taxPercent) / 100,
                operationalCosts: Number(form.operationalCosts),
                minAcceptableMargin: Number(form.minAcceptableMargin)
            };

            const data = await api.evaluateDiscount(payload);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Error al calcular');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
                            <Shield className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">Calculadora de Rentabilidad</h1>
                            <p className="text-gray-400">Analiza la viabilidad de descuentos y promociones</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Formulario */}
                        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-gray-400" />
                                Parámetros de la Operación
                            </h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            Costo del Producto ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.productCost}
                                            onChange={e => setForm({ ...form, productCost: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            Precio de Venta ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.salesPrice}
                                            onChange={e => setForm({ ...form, salesPrice: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            Descuento (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.discountPercent}
                                            onChange={e => setForm({ ...form, discountPercent: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-semibold text-amber-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            Costos Operativos ($)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.operationalCosts}
                                            onChange={e => setForm({ ...form, operationalCosts: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            Comisión MP/POS (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.paymentMethodCommission}
                                            onChange={e => setForm({ ...form, paymentMethodCommission: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">
                                            Impuestos (%)
                                        </label>
                                        <input
                                            type="number"
                                            value={form.taxPercent}
                                            onChange={e => setForm({ ...form, taxPercent: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">
                                        Margen Mínimo Aceptable (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={form.minAcceptableMargin}
                                        onChange={e => setForm({ ...form, minAcceptableMargin: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                                    />
                                </div>

                                <button
                                    onClick={calculate}
                                    disabled={loading}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl transition-colors disabled:bg-gray-600 disabled:text-gray-400"
                                >
                                    {loading ? 'Analizando...' : 'Analizar Rentabilidad'}
                                </button>

                                {error && (
                                    <p className="text-red-400 text-sm text-center">{error}</p>
                                )}
                            </div>
                        </div>

                        {/* Resultados */}
                        <div>
                            {!result && (
                                <div className="h-full flex items-center justify-center bg-white/5 rounded-xl border-2 border-dashed border-white/10 text-gray-500 min-h-[400px]">
                                    <div className="text-center">
                                        <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                        <p>Ingresa los datos para ver el análisis</p>
                                    </div>
                                </div>
                            )}

                            {result && (
                                <div className={`p-6 rounded-xl border-2 ${result.status === 'BLOCKED' ? 'bg-red-500/20 border-red-500/50' :
                                    result.status === 'RISKY' ? 'bg-yellow-500/20 border-yellow-500/50' :
                                        'bg-green-500/20 border-green-500/50'
                                    }`}>
                                    {/* Estado */}
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            {result.status === 'BLOCKED' && <AlertTriangle className="w-8 h-8 text-red-400" />}
                                            {result.status === 'RISKY' && <AlertTriangle className="w-8 h-8 text-yellow-400" />}
                                            {result.status === 'APPROVED' && <CheckCircle className="w-8 h-8 text-green-400" />}
                                            <div>
                                                <h2 className="text-xl font-bold text-white">
                                                    {result.status === 'BLOCKED' ? 'Bloqueado' :
                                                        result.status === 'RISKY' ? 'Riesgo' : 'Aprobado'}
                                                </h2>
                                                <p className="text-sm text-gray-400">Resultado del análisis</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alertas */}
                                    {result.alerts?.length > 0 && (
                                        <div className="mb-6 space-y-2">
                                            {result.alerts.map((alert: string, i: number) => (
                                                <div key={i} className="bg-white/10 p-3 rounded-lg text-sm border-l-4 border-red-400 text-gray-300">
                                                    {alert}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Desglose Financiero */}
                                    <div className="bg-white/10 rounded-xl p-4 mb-6">
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                                            Desglose Financiero
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Precio Final (c/ desc):</span>
                                                <span className="font-semibold text-lg text-white">
                                                    ${result.metrics?.finalPrice?.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Costo Real Total:</span>
                                                <span className="font-semibold text-red-400">
                                                    -${result.metrics?.totalRealCost?.toFixed(2)}
                                                </span>
                                            </div>
                                            <hr className="border-white/10" />
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-white">Ganancia Neta:</span>
                                                <span className={`font-bold text-xl ${result.metrics?.netProfit < 0 ? 'text-red-400' : 'text-green-400'
                                                    }`}>
                                                    ${result.metrics?.netProfit?.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Margen Real:</span>
                                                <span className={`font-semibold ${result.metrics?.realMarginPercent < 10 ? 'text-yellow-400' : 'text-green-400'
                                                    }`}>
                                                    {result.metrics?.realMarginPercent?.toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recomendaciones */}
                                    <div className="bg-amber-500/20 rounded-xl p-4 border border-amber-500/30">
                                        <h3 className="text-sm font-semibold text-amber-400 uppercase mb-3">
                                            💡 Sugerencias Inteligentes
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <p className="flex justify-between">
                                                <span className="text-gray-400">Descuento Máximo Seguro:</span>
                                                <span className="font-semibold text-amber-400">
                                                    {(result.recommendations?.maxSafeDiscountPercent * 100)?.toFixed(2)}%
                                                </span>
                                            </p>
                                            <p className="flex justify-between">
                                                <span className="text-gray-400">Precio Mínimo (Breakeven):</span>
                                                <span className="font-semibold text-amber-400">
                                                    ${result.recommendations?.minSafePrice?.toFixed(2)}
                                                </span>
                                            </p>
                                        </div>

                                        {result.recommendations?.alternatives?.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-amber-500/30">
                                                <p className="text-xs text-gray-500 mb-2">Alternativas:</p>
                                                <ul className="list-disc pl-4 text-xs text-gray-400 space-y-1">
                                                    {result.recommendations.alternatives.map((alt: string, i: number) => (
                                                        <li key={i}>{alt}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
