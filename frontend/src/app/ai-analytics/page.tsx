'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, DollarSign, MessageSquare, Package, Zap, Send, Loader2, ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Target, ShoppingCart, Tag } from 'lucide-react';

interface DemandPrediction {
    productId: string;
    productName: string;
    avgDailySales: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    trendPercent: number;
    predictedNext7Days: number;
    predictedNext30Days: number;
    confidence: number;
}

interface StockRecommendation {
    productId: string;
    productName: string;
    currentStock: number;
    avgDailySales: number;
    daysOfStock: number;
    reorderPoint: number;
    suggestedOrderQty: number;
    urgency: 'CRITICAL' | 'LOW' | 'OK' | 'OVERSTOCK';
}

interface AnomalyAlert {
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    productName?: string;
    message: string;
    value: number;
}

interface PricingSuggestion {
    productId: string;
    productName: string;
    currentPrice: number;
    suggestedPrice: number;
    reason: string;
    potentialImpact: string;
}

interface InsightsSummary {
    summary: {
        totalProducts: number;
        trendingUp: number;
        trendingDown: number;
        criticalStockItems: number;
        highPriorityAlerts: number;
    };
    topTrending: DemandPrediction[];
    criticalStock: StockRecommendation[];
    highAlerts: AnomalyAlert[];
}

export default function AIAnalyticsPage() {
    const [activeTab, setActiveTab] = useState('predictions');
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    // Data
    const [insights, setInsights] = useState<InsightsSummary | null>(null);
    const [predictions, setPredictions] = useState<DemandPrediction[]>([]);
    const [stockRecommendations, setStockRecommendations] = useState<StockRecommendation[]>([]);
    const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
    const [pricingSuggestions, setPricingSuggestions] = useState<PricingSuggestion[]>([]);

    const tabs = [
        { id: 'predictions', label: 'Predicciones', icon: TrendingUp },
        { id: 'stock', label: 'Stock', icon: Package },
        { id: 'anomalies', label: 'Anomalías', icon: AlertTriangle },
        { id: 'pricing', label: 'Pricing', icon: DollarSign },
        { id: 'chat', label: 'Asistente IA', icon: MessageSquare },
    ];

    useEffect(() => {
        loadInsights();
    }, []);

    useEffect(() => {
        if (activeTab === 'predictions' && predictions.length === 0) loadPredictions();
        if (activeTab === 'stock' && stockRecommendations.length === 0) loadStockRecommendations();
        if (activeTab === 'anomalies' && anomalies.length === 0) loadAnomalies();
        if (activeTab === 'pricing' && pricingSuggestions.length === 0) loadPricing();
    }, [activeTab]);

    const getToken = () => localStorage.getItem('token');

    const loadInsights = async () => {
        try {
            const token = getToken();
            const res = await fetch('/api/ai/insights', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInsights(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadPredictions = async () => {
        setLoadingData(true);
        try {
            const token = getToken();
            const res = await fetch('/api/ai/predictions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPredictions(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false);
        }
    };

    const loadStockRecommendations = async () => {
        setLoadingData(true);
        try {
            const token = getToken();
            const res = await fetch('/api/ai/stock', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStockRecommendations(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false);
        }
    };

    const loadAnomalies = async () => {
        setLoadingData(true);
        try {
            const token = getToken();
            const res = await fetch('/api/ai/anomalies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAnomalies(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false);
        }
    };

    const loadPricing = async () => {
        setLoadingData(true);
        try {
            const token = getToken();
            const res = await fetch('/api/ai/pricing', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPricingSuggestions(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingData(false);
        }
    };

    const handleChat = async () => {
        if (!chatMessage.trim()) return;

        setChatHistory([...chatHistory, { role: 'user', content: chatMessage }]);
        setLoading(true);

        try {
            const token = getToken();
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: chatMessage })
            });

            const data = await res.json();
            setChatHistory(prev => [...prev, { role: 'assistant', content: data.response || data.text || 'No hubo respuesta' }]);
        } catch {
            setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el asistente' }]);
        }

        setChatMessage('');
        setLoading(false);
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'UP': return <ArrowUpRight className="text-emerald-400" size={16} />;
            case 'DOWN': return <ArrowDownRight className="text-red-400" size={16} />;
            default: return <Minus className="text-gray-400" size={16} />;
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'UP': return 'text-emerald-400 bg-emerald-500/20';
            case 'DOWN': return 'text-red-400 bg-red-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'CRITICAL': return 'text-red-400 bg-red-500/20 border-red-500/30';
            case 'LOW': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
            case 'OVERSTOCK': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
            default: return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'HIGH': return 'text-red-400 bg-red-500/20';
            case 'MEDIUM': return 'text-amber-400 bg-amber-500/20';
            default: return 'text-blue-400 bg-blue-500/20';
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">IA Analytics</h1>
                        <p className="text-gray-400">Predicciones, recomendaciones y análisis inteligente</p>
                    </div>
                    <button
                        onClick={() => { loadInsights(); loadPredictions(); loadStockRecommendations(); loadAnomalies(); loadPricing(); }}
                        className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-xl font-bold hover:bg-purple-500/30 transition-all"
                    >
                        <RefreshCw size={18} />
                        Actualizar
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                                <TrendingUp size={24} />
                            </div>
                            {insights?.summary?.trendingUp && (
                                <span className="text-xs text-emerald-400">↑ {insights.summary.trendingUp}</span>
                            )}
                        </div>
                        <p className="text-3xl font-bold text-white">{insights?.summary?.totalProducts || 0}</p>
                        <p className="text-sm text-gray-400">Predicciones</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
                                <AlertTriangle size={24} />
                            </div>
                            {insights?.summary?.highPriorityAlerts && insights.summary.highPriorityAlerts > 0 && (
                                <span className="text-xs text-red-400 animate-pulse">! {insights.summary.highPriorityAlerts}</span>
                            )}
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {insights?.highAlerts?.length || 0}
                        </p>
                        <p className="text-sm text-gray-400">Anomalías</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                                <Zap size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{pricingSuggestions.length}</p>
                        <p className="text-sm text-gray-400">Sugerencias Precio</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                <Brain size={24} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {predictions.length > 0 ? Math.round(predictions.reduce((a, p) => a + p.confidence, 0) / predictions.length) : '--'}%
                        </p>
                        <p className="text-sm text-gray-400">Precisión IA</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5">
                    <div className="border-b border-white/10 overflow-x-auto">
                        <nav className="flex space-x-4 px-6" aria-label="Tabs">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                                            ? 'border-amber-500 text-amber-400'
                                            : 'border-transparent text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* PREDICTIONS TAB */}
                        {activeTab === 'predictions' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Predicción de Demanda</h3>
                                    {loadingData && <Loader2 className="animate-spin text-amber-500" size={20} />}
                                </div>

                                {predictions.length === 0 && !loadingData ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <TrendingUp size={40} className="text-blue-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">Sin datos suficientes</p>
                                        <p className="text-gray-400 text-sm">Las predicciones se generan con historial de ventas</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {predictions.map((p) => (
                                            <div key={p.productId} className="bg-black/20 rounded-xl p-4 border border-white/10 hover:border-blue-500/30 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="font-bold text-white text-sm line-clamp-2">{p.productName}</h4>
                                                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getTrendColor(p.trend)}`}>
                                                        {getTrendIcon(p.trend)}
                                                        {p.trendPercent > 0 ? '+' : ''}{p.trendPercent.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between text-gray-400">
                                                        <span>Promedio diario:</span>
                                                        <span className="text-white">{p.avgDailySales.toFixed(1)} u.</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-400">
                                                        <span>Próx. 7 días:</span>
                                                        <span className="text-emerald-400 font-bold">{p.predictedNext7Days} u.</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-400">
                                                        <span>Próx. 30 días:</span>
                                                        <span className="text-blue-400 font-bold">{p.predictedNext30Days} u.</span>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500">Confianza</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-amber-500 rounded-full"
                                                                    style={{ width: `${p.confidence}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-amber-400">{p.confidence}%</span>
                                                        </div>
                                                    </div>
                                                    {(p as any).explanation && (
                                                        <div className="mt-3 p-2 bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg border border-purple-500/20">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <Brain size={12} className="text-purple-300" />
                                                                <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Insight AI</span>
                                                            </div>
                                                            <p className="text-xs text-gray-300 italic">"{(p as any).explanation}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STOCK TAB */}
                        {activeTab === 'stock' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Recomendaciones de Stock</h3>
                                    {loadingData && <Loader2 className="animate-spin text-amber-500" size={20} />}
                                </div>

                                {stockRecommendations.length === 0 && !loadingData ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package size={40} className="text-emerald-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">Sin recomendaciones</p>
                                        <p className="text-gray-400 text-sm">Se necesitan productos con historial de ventas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {stockRecommendations.map((r) => (
                                            <div key={r.productId} className={`bg-black/20 rounded-xl p-4 border ${getUrgencyColor(r.urgency)} transition-all`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="font-bold text-white">{r.productName}</h4>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getUrgencyColor(r.urgency)}`}>
                                                                {r.urgency === 'CRITICAL' ? '⚠️ Crítico' :
                                                                    r.urgency === 'LOW' ? '⚡ Bajo' :
                                                                        r.urgency === 'OVERSTOCK' ? '📦 Exceso' : '✅ OK'}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-gray-500 text-xs">Stock Actual</span>
                                                                <p className="text-white font-bold">{r.currentStock} u.</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 text-xs">Días de Stock</span>
                                                                <p className={`font-bold ${r.daysOfStock < 7 ? 'text-red-400' : r.daysOfStock > 60 ? 'text-purple-400' : 'text-white'}`}>
                                                                    {r.daysOfStock} días
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 text-xs">Punto Reorden</span>
                                                                <p className="text-amber-400">{r.reorderPoint} u.</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 text-xs">Sugerido Pedir</span>
                                                                <p className="text-emerald-400 font-bold">{r.suggestedOrderQty} u.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {(r.urgency === 'CRITICAL' || r.urgency === 'LOW') && (
                                                        <button className="bg-amber-500 text-black px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-amber-400 flex items-center gap-1">
                                                            <ShoppingCart size={14} />
                                                            Pedir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ANOMALIES TAB */}
                        {activeTab === 'anomalies' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Anomalías Detectadas</h3>
                                    {loadingData && <Loader2 className="animate-spin text-amber-500" size={20} />}
                                </div>

                                {anomalies.length === 0 && !loadingData ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle size={40} className="text-emerald-400" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2">Sin Anomalías Detectadas ✅</p>
                                        <p className="text-gray-400 text-sm">El sistema monitorea márgenes, ventas y stock</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {anomalies.map((a, i) => (
                                            <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/10 hover:border-red-500/30 transition-all">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-2 rounded-lg ${getSeverityColor(a.severity)}`}>
                                                        <AlertTriangle size={20} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(a.severity)}`}>
                                                                {a.severity}
                                                            </span>
                                                            <span className="text-xs text-gray-500">{a.type}</span>
                                                        </div>
                                                        <p className="text-white">{a.message}</p>
                                                        {a.productName && (
                                                            <p className="text-sm text-gray-400 mt-1">Producto: {a.productName}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-white">{typeof a.value === 'number' ? a.value.toFixed(1) : a.value}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PRICING TAB */}
                        {activeTab === 'pricing' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Sugerencias de Precio</h3>
                                    {loadingData && <Loader2 className="animate-spin text-amber-500" size={20} />}
                                </div>

                                {pricingSuggestions.length === 0 && !loadingData ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-amber-500/30 transition-all">
                                            <div className="flex items-center gap-3 mb-2">
                                                <DollarSign className="text-amber-400" size={24} />
                                                <h4 className="font-bold text-white">Análisis de Competencia</h4>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">Compara precios con el mercado</p>
                                            <button
                                                onClick={loadPricing}
                                                className="text-amber-400 text-sm font-bold hover:underline"
                                            >
                                                Generar análisis →
                                            </button>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-amber-500/30 transition-all">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Zap className="text-blue-400" size={24} />
                                                <h4 className="font-bold text-white">Ajustes Automáticos</h4>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">Precios dinámicos por demanda</p>
                                            <button className="text-amber-400 text-sm font-bold hover:underline">Configurar →</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pricingSuggestions.map((p) => (
                                            <div key={p.productId} className="bg-black/20 rounded-xl p-4 border border-white/10 hover:border-emerald-500/30 transition-all">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="font-bold text-white">{p.productName}</h4>
                                                        <p className="text-sm text-gray-400">{p.reason}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-3">
                                                            <div>
                                                                <span className="text-xs text-gray-500">Actual</span>
                                                                <p className="text-white font-mono">${p.currentPrice?.toLocaleString()}</p>
                                                            </div>
                                                            <span className="text-gray-500">→</span>
                                                            <div>
                                                                <span className="text-xs text-gray-500">Sugerido</span>
                                                                <p className="text-emerald-400 font-bold font-mono">${p.suggestedPrice?.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-amber-400 mt-1">{p.potentialImpact}</p>
                                                    </div>
                                                    <button className="ml-4 bg-emerald-500/20 text-emerald-400 p-2 rounded-lg hover:bg-emerald-500/30">
                                                        <Tag size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CHAT TAB */}
                        {activeTab === 'chat' && (
                            <div>
                                <div className="bg-white/5 rounded-xl border border-white/10 h-96 flex flex-col">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {chatHistory.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Brain size={32} className="text-purple-400" />
                                                </div>
                                                <p className="text-white font-bold mb-1">¡Hola! Soy tu asistente de negocios</p>
                                                <p className="text-gray-400 text-sm mb-4">Preguntame sobre ventas, stock, clientes...</p>
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    {['¿Cuál es mi stock bajo?', '¿Productos más vendidos?', '¿Clientes VIP?'].map((q) => (
                                                        <button
                                                            key={q}
                                                            onClick={() => setChatMessage(q)}
                                                            className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full hover:bg-purple-500/30"
                                                        >
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            chatHistory.map((msg, i) => (
                                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.role === 'user'
                                                        ? 'bg-amber-500 text-black'
                                                        : 'bg-white/10 text-white'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {loading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/10 text-white px-4 py-2 rounded-2xl flex items-center gap-2">
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Pensando...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-white/10 p-4 flex gap-2">
                                        <input
                                            type="text"
                                            value={chatMessage}
                                            onChange={(e) => setChatMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                                            placeholder="Escribe tu pregunta..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                        />
                                        <button
                                            onClick={handleChat}
                                            disabled={loading}
                                            className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold hover:bg-amber-400 disabled:opacity-50 transition-all"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            </DashboardLayout >
        </AuthGuard >
    );
}
