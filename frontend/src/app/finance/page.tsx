
"use client";

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { FinanceStats } from "../../types";
import Link from "next/link";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { isAdmin } from "../../utils/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Plus, DollarSign, TrendingUp, TrendingDown, PieChart as PieIcon } from "lucide-react";

export default function FinancePage() {
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [expenseSummary, setExpenseSummary] = useState<any>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [breakEvenData, setBreakEvenData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
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
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();

            const [salesData, expensesData, expensesList, breakEven] = await Promise.all([
                api.getMonthlyStats(currentMonth, currentYear),
                api.getExpenseSummary(currentMonth, currentYear),
                api.getExpenses(),
                api.getBreakEven()
            ]);
            setStats(salesData);
            setExpenseSummary(expensesData);
            setExpenses(expensesList);
            setBreakEvenData(breakEven);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
        try {
            await api.deleteExpense(id);
            loadData();
        } catch (error) {
            alert('Error al eliminar gasto');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-amber-500">
            Cargando Finanzas...
        </div>
    );

    // Fix: Net Profit should use Gross Profit (Revenue - COGS) - Expenses
    // Note: This matches Monthly Stats (Profit) vs Monthly Expenses
    const netProfit = (stats?.grossProfit || 0) - (expenseSummary?.total || 0);
    const profitMargin = stats?.totalRevenue ? ((netProfit / stats.totalRevenue) * 100).toFixed(1) : 0;

    const COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6'];

    const expenseChartData = expenseSummary?.byCategory
        ? Object.entries(expenseSummary.byCategory).map(([name, value]) => ({ name, value }))
        : [];

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white mb-2">
                                Gestión Financiera
                            </h1>
                            <p className="text-gray-400">Análisis de Rentabilidad y Gastos (Mensual)</p>
                        </div>
                        <div className="flex gap-4">
                            <Link href="/finance/conciliation" className="text-blue-400 hover:text-blue-300 transition-colors py-2 font-medium">
                                Conciliación
                            </Link>
                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-red-900/20"
                            >
                                <Plus size={18} /> Registrar Gasto
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                        {/* Revenue */}
                        <SummaryCard
                            title="Ingresos (Este Mes)"
                            value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
                            icon={TrendingUp}
                            color="text-emerald-400"
                            bgColor="bg-emerald-500/10"
                            borderColor="border-emerald-500/20"
                        />

                        {/* Expenses */}
                        <SummaryCard
                            title="Gastos Totales"
                            value={`$${expenseSummary?.total?.toLocaleString() || 0}`}
                            icon={TrendingDown}
                            color="text-red-400"
                            bgColor="bg-red-500/10"
                            borderColor="border-red-500/20"
                        />

                        {/* Net Profit */}
                        <SummaryCard
                            title="Utilidad Neta"
                            value={`$${netProfit.toLocaleString()}`}
                            icon={DollarSign}
                            color={netProfit >= 0 ? "text-amber-400" : "text-red-400"}
                            bgColor={netProfit >= 0 ? "bg-amber-500/10" : "bg-red-500/10"}
                            borderColor={netProfit >= 0 ? "border-amber-500/20" : "border-red-500/20"}
                        />

                        {/* Margin */}
                        <SummaryCard
                            title="Margen de Beneficio"
                            value={`${profitMargin}%`}
                            icon={PieIcon}
                            color="text-blue-400"
                            bgColor="bg-blue-500/10"
                            borderColor="border-blue-500/20"
                        />
                    </div>

                    {/* Break Even Analysis Section */}
                    {breakEvenData && (
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5 mb-8">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="text-amber-500" />
                                Análisis de Punto de Equilibrio (Mensual)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-5 bg-black/30 rounded-xl border border-white/5">
                                    <p className="text-gray-400 text-sm mb-1">Margen Bruto Promedio</p>
                                    <p className="text-3xl font-bold text-blue-400">{breakEvenData.grossMargin.toFixed(1)}%</p>
                                    <p className="text-xs text-gray-500 mt-2">Ganancia real por producto vendido</p>
                                </div>
                                <div className="p-5 bg-black/30 rounded-xl border border-white/5">
                                    <p className="text-gray-400 text-sm mb-1">Meta de Ventas (Punto de Equilibrio)</p>
                                    <p className="text-3xl font-bold text-amber-400">${Math.round(breakEvenData.breakEvenSales || 0).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-2">Necesario para cubrir Gastos Fijos (${Math.round(breakEvenData.totalFixedCosts || 0)})</p>
                                </div>
                                <div className="p-5 bg-black/30 rounded-xl border border-white/5">
                                    <p className="text-gray-400 text-sm mb-1">Progreso del Mes</p>
                                    <div className="flex items-end gap-3 justify-between">
                                        <div>
                                            <p className={`text-xl font-bold ${breakEvenData.isProfitable ? 'text-emerald-400' : 'text-gray-200'}`}>
                                                {breakEvenData.isProfitable ? '¡Objetivo Logrado!' : `$${breakEvenData.totalRevenue.toLocaleString()}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {!breakEvenData.isProfitable && (
                                                <span className="text-xs text-red-400 font-bold">Falta ${Math.round(breakEvenData.salesToBreakEven).toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full mt-3 overflow-hidden relative">
                                        <div
                                            className={`h-full transition-all duration-1000 ${breakEvenData.salesToBreakEven <= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${Math.min(100, (breakEvenData.totalRevenue / (breakEvenData.breakEvenSales || 1) * 100))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Sales Chart */}
                        <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-lg font-bold text-white mb-6">Tendencia de Ingresos</h2>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats?.transactions.map(t => ({
                                        time: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                        amount: Number(t.totalAmount)
                                    })).reverse()}>
                                        <XAxis dataKey="time" hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#10B981' }}
                                        />
                                        <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#fff' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Expenses Breakdown */}
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-lg font-bold text-white mb-6">Desglose de Gastos</h2>
                            {expenseChartData.length > 0 ? (
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expenseChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {expenseChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#171717', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
                                    No hay gastos registrados.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto mt-8">
                        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                            <h2 className="text-lg font-bold text-white mb-6">Gastos Recientes</h2>
                            <RecentExpensesTable
                                expenses={expenses}
                                onDelete={handleDelete}
                            />
                        </div>
                    </div>

                    {/* Expense Modal */}
                    {
                        isExpenseModalOpen && (
                            <ExpenseModal
                                onClose={() => setIsExpenseModalOpen(false)}
                                onSuccess={() => { setIsExpenseModalOpen(false); loadData(); }}
                            />
                        )
                    }
                </div >
            </DashboardLayout >
        </AuthGuard >
    );
}

function SummaryCard({ title, value, icon: Icon, color, bgColor, borderColor }: any) {
    return (
        <div className={`p-6 rounded-2xl border ${borderColor} ${bgColor} backdrop-blur-sm`}>
            <div className="flex justify-between items-start mb-2">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{title}</p>
                <div className={`p-2 rounded-lg ${color} bg-black/20`}>
                    <Icon size={18} />
                </div>
            </div>
            <h3 className={`text-3xl font-bold ${color}`}>{value}</h3>
        </div>
    );
}

function RecentExpensesTable({ expenses, onDelete }: any) {
    if (!expenses || expenses.length === 0) {
        return <div className="text-center text-gray-500 py-8">No hay gastos recientes.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-500 uppercase bg-black/20">
                    <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Categoría</th>
                        <th className="px-6 py-3">Descripción</th>
                        <th className="px-6 py-3 text-right">Monto</th>
                        <th className="px-6 py-3 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map((expense: any) => (
                        <tr key={expense.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                                <span className="bg-white/10 px-2 py-1 rounded text-xs text-white">{expense.category}</span>
                            </td>
                            <td className="px-6 py-4">{expense.description}</td>
                            <td className="px-6 py-4 text-right font-medium text-red-400">
                                -${Number(expense.amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button
                                    onClick={() => onDelete(expense.id)}
                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ExpenseModal({ onClose, onSuccess }: any) {
    const [category, setCategory] = useState("Alquiler");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createExpense({
                category,
                description,
                amount: Number(amount),
                date: new Date()
            });
            onSuccess();
        } catch (err) {
            alert("Error al registrar gasto");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6">Registrar Nuevo Gasto</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                        >
                            <option>Alquiler</option>
                            <option>Servicios (Luz/Agua)</option>
                            <option>Sueldos</option>
                            <option>Mantenimiento</option>
                            <option>Marketing</option>
                            <option>Otros</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                            placeholder="Ej. Pago de luz Marzo"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <div className="flex gap-4 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20"
                        >
                            Registrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
