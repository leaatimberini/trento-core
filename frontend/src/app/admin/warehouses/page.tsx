
"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";
import Link from "next/link";
import { Truck, MapPin, Plus, Edit, Trash, Store } from "lucide-react";

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ name: "", address: "", type: "MAIN" });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await api.getWarehouses();
            setWarehouses(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await api.createWarehouse(newItem);
            setIsModalOpen(false);
            setNewItem({ name: "", address: "", type: "MAIN" });
            loadData();
        } catch (e) {
            alert("Error creating warehouse");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar (Simplified) */}
            <aside className="w-64 bg-slate-900 text-white p-6 hidden md:block">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        TrentoERP
                    </h1>
                </div>
                <nav className="space-y-4">
                    <Link href="/dashboard" className="block text-gray-400 hover:text-white">Dashboard</Link>
                    <Link href="/inventory" className="block text-gray-400 hover:text-white">Inventario</Link>
                    <Link href="/finance" className="block text-gray-400 hover:text-white">Finanzas</Link>
                    <div className="pt-4 border-t border-gray-700">
                        <Link href="/admin/warehouses" className="block text-white font-bold bg-gray-800 p-2 rounded">Depósitos & Sucursales</Link>
                        <Link href="/admin/settings" className="block text-gray-400 hover:text-white mt-2">Configuración</Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Depósitos y Sucursales</h2>
                        <p className="text-gray-500">Gestión de ubicaciones de stock y flota</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30"
                    >
                        <Plus size={20} />
                        Nueva Ubicación
                    </button>
                </header>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Cargando ubicaciones...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {warehouses.map((w) => (
                            <div key={w.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-lg ${w.type === 'VEHICLE' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {w.type === 'VEHICLE' ? <Truck size={24} /> : <Store size={24} />}
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {w.isActive ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-1">{w.name}</h3>
                                {w.address && (
                                    <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                                        <MapPin size={14} />
                                        {w.address}
                                    </p>
                                )}

                                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end gap-2 text-gray-400">
                                    <button className="hover:text-blue-600"><Edit size={18} /></button>
                                    <button className="hover:text-red-600"><Trash size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">Nueva Ubicación</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    placeholder="Ej. Depósito Norte / Camión 01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select
                                    className="w-full border rounded-lg p-2"
                                    value={newItem.type}
                                    onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                >
                                    <option value="MAIN">Depósito Principal</option>
                                    <option value="SATELLITE">Sucursal / Satélite</option>
                                    <option value="VEHICLE">Vehículo (Reparto)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección / Patente</label>
                                <input
                                    className="w-full border rounded-lg p-2"
                                    value={newItem.address}
                                    onChange={e => setNewItem({ ...newItem, address: e.target.value })}
                                    placeholder="Calle 123 ó AA-000-BB"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 hover:bg-gray-100 rounded text-gray-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                            >
                                Crear Ubicación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
