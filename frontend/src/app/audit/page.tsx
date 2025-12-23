"use client";

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { isAdmin } from "../../utils/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Shield } from "lucide-react";

export default function AuditPage() {
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

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-white mb-2">Registro de Auditoría</h1>
                        <p className="text-gray-400">Historial de seguridad y operaciones críticas del sistema.</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-amber-500" size={24} />
                            <h2 className="text-lg font-bold text-white">Eventos Recientes</h2>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-amber-500">Cargando registros...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-500 uppercase bg-black/20">
                                        <tr>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Usuario</th>
                                            <th className="px-6 py-3">Acción</th>
                                            <th className="px-6 py-3">Recurso</th>
                                            <th className="px-6 py-3">Detalles</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    No hay registros de auditoría recientes.
                                                </td>
                                            </tr>
                                        ) : (
                                            auditLogs.map((log: any) => (
                                                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-white font-medium">
                                                        {log.userId || 'Sistema'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-white/10 px-2 py-1 rounded text-xs text-amber-200">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-300">
                                                        {log.resource}
                                                    </td>
                                                    <td className="px-6 py-4 max-w-xs truncate text-xs font-mono text-gray-500">
                                                        {log.details || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
