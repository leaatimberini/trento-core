
"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    BarChart3,
    Users,
    Printer,
    Globe,
    AlertTriangle,
    TrendingUp,
    ArrowRight,
    Truck,
    Brain
} from "lucide-react";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export default function Home() {
    const [stats, setStats] = useState({
        todaySales: 0,
        lowStockCount: 0,
        activeCustomers: 0,
        totalProducts: 0,
        topProducts: [] as any[],
        realMargin: 0,
        totalNetProfit: 0
    });
    const [purchaseSavings, setPurchaseSavings] = useState<{
        totalSavings: number;
        totalPurchases: number;
        savingsPercentage: number;
        itemsWithSavings: number;
        itemsWithLoss: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    // Chart data starts empty - will be populated with real data from API
    const [chartData, setChartData] = useState([
        { name: '00:00', sales: 0 },
        { name: '04:00', sales: 0 },
        { name: '08:00', sales: 0 },
        { name: '12:00', sales: 0 },
        { name: '16:00', sales: 0 },
        { name: '20:00', sales: 0 },
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [products, lowStock, customers, dailyStats, topProducts] = await Promise.all([
                    api.getProducts(),
                    api.getLowStockAlerts(),
                    api.getCustomers(),
                    api.getDailyStats(),
                    api.getTopProducts()
                ]);

                // Fetch purchase savings (Ganar a la Compra)
                try {
                    const savings = await api.getPurchaseSavings();
                    setPurchaseSavings(savings);
                } catch (e) {
                    console.log('Savings data not available');
                }

                setStats({
                    todaySales: dailyStats.totalRevenue || 0,
                    lowStockCount: lowStock.length || 0,
                    activeCustomers: customers.length || 0,
                    totalProducts: products.length || 0,
                    topProducts: topProducts || [],
                    realMargin: dailyStats.realMargin || 0,
                    totalNetProfit: dailyStats.totalNetProfit || 0
                });

                // Transform transactions for chart (4-hour buckets covering 24h)
                const buckets = [
                    { name: '00:00', sales: 0 },
                    { name: '04:00', sales: 0 },
                    { name: '08:00', sales: 0 },
                    { name: '12:00', sales: 0 },
                    { name: '16:00', sales: 0 },
                    { name: '20:00', sales: 0 },
                ];

                if (dailyStats.transactions && dailyStats.transactions.length > 0) {
                    dailyStats.transactions.forEach((t: any) => {
                        const date = new Date(t.createdAt);
                        // Adjust to Argentina time (UTC-3)
                        const argHour = (date.getUTCHours() - 3 + 24) % 24;
                        const bucketIndex = Math.floor(argHour / 4);
                        if (bucketIndex >= 0 && bucketIndex < buckets.length) {
                            buckets[bucketIndex].sales += Number(t.totalAmount) || 0;
                        }
                    });
                }

                setChartData(buckets);
            } catch (e) {
                console.error("Dashboard data error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const QuickAction = ({ href, icon: Icon, title, desc, color }: any) => (
        <Link
            href={href}
            className="group relative overflow-hidden bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-amber-500/30 hover:bg-white/10 transition-all duration-300"
        >
            <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-20 blur-xl rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150`} />
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
                    <Icon size={24} />
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-amber-400 transition-colors" size={20} />
            </div>
            <h3 className="font-bold text-white text-lg mb-1 relative z-10">{title}</h3>
            <p className="text-sm text-gray-400 relative z-10">{desc}</p>
        </Link>
    );

    const StatCard = ({ title, value, icon: Icon, trend }: any) => (
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wide">{title}</p>
                    <h3 className="text-3xl font-bold text-white">{value}</h3>
                </div>
                <div className="p-2 bg-white/10 rounded-lg text-amber-400">
                    <Icon size={20} />
                </div>
            </div>
            {trend && (
                <div className="flex items-center text-sm font-medium text-emerald-400">
                    <TrendingUp size={16} className="mr-1" />
                    <span>{trend}</span>
                </div>
            )}
        </div>
    );

    return (
        <AuthGuard>
            <DashboardLayout>
                {/* Header Section Removed (Now in Sidebar/Layout) */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Centro de Comando</h1>
                    <p className="text-gray-400">Visión general del estado del sistema.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
                    <StatCard
                        title="Ingresos Hoy"
                        value={`$${stats.todaySales.toLocaleString()}`}
                        icon={TrendingUp}
                    />
                    <StatCard
                        title="Alertas Stock"
                        value={stats.lowStockCount}
                        icon={AlertTriangle}
                        trend={stats.lowStockCount > 0 ? "Requiere Atención" : "Todo Orden"}
                    />
                    <StatCard
                        title="Productos"
                        value={stats.totalProducts}
                        icon={Package}
                    />
                    <StatCard
                        title="Clientes Activos"
                        value={stats.activeCustomers}
                        icon={Users}
                    />
                    {/* Ganar a la Compra KPI */}
                    <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border transition-all ${purchaseSavings && purchaseSavings.totalSavings > 0
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : purchaseSavings && purchaseSavings.totalSavings < 0
                            ? 'border-red-500/30 hover:border-red-500/50'
                            : 'border-white/5 hover:border-amber-500/30'
                        }`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">Ganado en Compras</p>
                                <p className={`text-2xl font-bold ${purchaseSavings && purchaseSavings.totalSavings > 0
                                    ? 'text-emerald-400'
                                    : purchaseSavings && purchaseSavings.totalSavings < 0
                                        ? 'text-red-400'
                                        : 'text-white'
                                    }`}>
                                    {purchaseSavings
                                        ? `$${purchaseSavings.totalSavings.toLocaleString()}`
                                        : '$0'
                                    }
                                </p>
                            </div>
                            <div className={`p-3 rounded-xl ${purchaseSavings && purchaseSavings.totalSavings > 0
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : purchaseSavings && purchaseSavings.totalSavings < 0
                                    ? 'bg-red-500/20 text-red-500'
                                    : 'bg-gray-500/20 text-gray-500'
                                }`}>
                                💰
                            </div>
                        </div>
                    </div>

                    {/* Net Profit & Real Margin from AI Updates */}
                    <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border transition-all ${Number(stats.realMargin) >= 10
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : Number(stats.realMargin) > 0
                            ? 'border-amber-500/30 hover:border-amber-500/50'
                            : 'border-red-500/30 hover:border-red-500/50'
                        }`}>
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">Margen Real</p>
                                <h3 className={`text-3xl font-bold ${Number(stats.realMargin) >= 0 ? 'text-white' : 'text-red-400'}`}>
                                    {Number(stats.realMargin).toFixed(1)}%
                                </h3>
                            </div>
                            <div className="p-2 bg-white/10 rounded-lg text-amber-400">
                                <BarChart3 size={20} />
                            </div>
                        </div>
                        <div className="text-sm font-medium text-gray-400">
                            Ganancia: <span className={Number(stats.totalNetProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                ${stats.totalNetProfit?.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Activity / Chart Section */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Chart */}
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6">Actividad de Ventas (Vivo)</h2>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1F2937', borderRadius: '8px', border: '1px solid #374151', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fff' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Package className="text-amber-500" size={20} /> Productos Más Vendidos
                            </h2>
                            <div className="space-y-4">
                                {stats.topProducts?.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center bg-amber-500 text-black font-bold rounded-lg">{i + 1}</div>
                                            <div>
                                                <p className="font-bold text-white">{p.name}</p>
                                                <p className="text-sm text-gray-500">{p.quantity} unidades sold</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-emerald-400">${p.revenue.toLocaleString()}</p>
                                    </div>
                                ))}
                                {!stats.topProducts?.length && <p className="text-gray-500">No hay datos suficientes aún.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Quick Access to POS/Store (Legacy) or Alerts */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-800 p-6 rounded-2xl shadow-lg text-white border border-white/10">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-lg font-bold">Trento AI</h2>
                                <Brain className="text-purple-200" size={24} />
                            </div>
                            <p className="text-purple-100 text-sm mb-4">Predicciones y análisis comercial.</p>
                            <Link href="/ai-analytics" className="block w-full text-center bg-white text-purple-700 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">
                                Ver Insights
                            </Link>
                        </div>
                        <div className="bg-gradient-to-br from-amber-600 to-amber-800 p-6 rounded-2xl shadow-lg text-white border border-white/10">
                            <h2 className="text-lg font-bold mb-2">Punto de Venta</h2>
                            <p className="text-amber-100 text-sm mb-4">Acceso rápido para cajeros.</p>
                            <Link href="/pos" className="block w-full text-center bg-white text-amber-700 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">
                                Abrir POS
                            </Link>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-lg font-bold text-white mb-4">Estado del Sistema</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-sm font-medium text-gray-300">Base de Datos</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/20">Conectado</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <span className="text-sm font-medium text-gray-300">API Gateway</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/20">Online</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
