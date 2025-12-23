"use client";

import { useState } from "react";
import { api } from "../../../services/api";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import AuthGuard from "../../../components/AuthGuard";

export default function ConciliationPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleReconcile = async () => {
        setLoading(true);
        try {
            // Mock bank statement with random discrepancies
            const mockStatement = Array.from({ length: 50 }, (_, i) => ({
                id: `txn-${i}`,
                amount: Math.floor(Math.random() * 10000),
                date: new Date().toISOString()
            }));


            const data = await api.reconcileTransactions(mockStatement);
            setResult(data);
        } catch (e) {
            alert("Error al conciliar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen bg-neutral-950 text-gray-200 p-8 font-sans">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/finance" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                            Conciliación Bancaria
                        </h1>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-xl bg-black/20 mb-8">
                            <FileText size={48} className="text-gray-500 mb-4" />
                            <p className="text-gray-400 mb-6">Simular carga de Extracto Bancario (50 movimientos)</p>
                            <button
                                onClick={handleReconcile}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                            >
                                {loading ? "Procesando..." : "Subir y Conciliar"}
                            </button>
                        </div>

                        {result && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-xl font-bold text-white mb-4">Resultados de Conciliación</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="text-green-500" size={20} />
                                            <span className="text-green-400 font-bold">Conciliados (Match)</span>
                                        </div>
                                        <p className="text-3xl font-bold text-green-500">{result.results?.matched}</p>
                                    </div>
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="text-amber-500" size={20} />
                                            <span className="text-amber-400 font-bold">No Conciliados</span>
                                        </div>
                                        <p className="text-3xl font-bold text-amber-500">{result.results?.unmatched}</p>
                                    </div>
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="text-blue-500" size={20} />
                                            <span className="text-blue-400 font-bold">Total Procesado</span>
                                        </div>
                                        <p className="text-3xl font-bold text-blue-500">{result.results?.totalEntries}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
