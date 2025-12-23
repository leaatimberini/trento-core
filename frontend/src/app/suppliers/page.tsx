"use client";

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import AuthGuard from "../../components/AuthGuard";
import { Plus, Building2, Phone, Mail, MapPin, Trash2, Edit, Truck } from "lucide-react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import Link from "next/link"; // Added Link import

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        try {
            const data = await api.getSuppliers();
            setSuppliers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este proveedor?")) return;
        try {
            await api.deleteSupplier(id);
            setSuppliers(suppliers.filter(s => s.id !== id));
        } catch (e) {
            alert("Error al eliminar");
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                                <Truck className="text-amber-500" /> Gestión de Proveedores
                            </h1>
                            <p className="text-gray-400 mt-1">Directorio de Abastecimiento</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-amber-600 hover:bg-amber-500 text-black px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-amber-500/20"
                            >
                                <Plus size={18} /> Nuevo Proveedor
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center text-amber-500">Cargando proveedores...</div>
                    ) : (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {suppliers.map(s => (
                                <div key={s.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:border-amber-500/30 transition-all group relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                                            <Truck size={24} />
                                        </div>
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            className="text-gray-600 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{s.name}</h3>
                                    <div className="space-y-2 text-sm text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 flex justify-center"><span className="text-xs font-bold text-gray-600">ID</span></div>
                                            <span>{s.taxId || "Sin CUIT/RUT"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 flex justify-center"><Phone size={14} /></div>
                                            <span>{s.phone || "---"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 flex justify-center"><Mail size={14} /></div>
                                            <span>{s.email || "---"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 flex justify-center"><MapPin size={14} /></div>
                                            <span>{s.address || "---"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isModalOpen && (
                        <SupplierModal
                            onClose={() => setIsModalOpen(false)}
                            onSuccess={() => { setIsModalOpen(false); loadSuppliers(); }}
                        />
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}

function SupplierModal({ onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        name: "",
        taxId: "",
        email: "",
        phone: "",
        address: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createSupplier(formData);
            onSuccess();
        } catch (err) {
            alert("Error al crear proveedor");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6">Nuevo Proveedor</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razón Social</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CUIT / Tax ID</label>
                        <input
                            type="text"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                            onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                            <input
                                type="text"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección</label>
                        <input
                            type="text"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                            className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 rounded-xl transition-all"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
