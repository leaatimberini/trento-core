
"use client";

import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { isAdmin } from "../../utils/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import Link from "next/link";
import { User } from "../../types";
import { Plus, UserPlus } from "lucide-react";
import DashboardLayout from "../../components/layouts/DashboardLayout";

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!isAdmin()) {
            router.replace("/pos");
            return;
        }
        loadUsers();
    }, [router]);

    const loadUsers = async () => {
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            alert("Error al cargar usuarios");
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            await api.createUser(data);
            alert("Usuario creado correctamente");
            setIsModalOpen(false);
            loadUsers();
        } catch (err) {
            alert("Error al crear usuario");
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold transition-colors"
                            >
                                <UserPlus size={20} /> <span>Nuevo Usuario</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-700 text-gray-300">
                                <tr>
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Rol</th>
                                    <th className="p-4">Creado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-750 transition-colors">
                                        <td className="p-4 font-medium">{u.name || "N/A"}</td>
                                        <td className="p-4 text-gray-400">{u.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-900 text-purple-200' : 'bg-gray-700 text-gray-200'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">{new Date(u.createdAt || "").toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                            <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
                                <h2 className="text-xl font-bold mb-4">Crear Nuevo Usuario</h2>
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <input name="name" placeholder="Nombre Completo" required className="w-full bg-gray-700 rounded p-2 text-white border border-gray-600 focus:border-blue-500 outline-none" />
                                    <input name="email" type="email" placeholder="Email" required className="w-full bg-gray-700 rounded p-2 text-white border border-gray-600 focus:border-blue-500 outline-none" />
                                    <input name="password" type="password" placeholder="Contraseña" required className="w-full bg-gray-700 rounded p-2 text-white border border-gray-600 focus:border-blue-500 outline-none" />
                                    <select name="role" className="w-full bg-gray-700 rounded p-2 text-white border border-gray-600 focus:border-blue-500 outline-none">
                                        <option value="USER">Cajero (User)</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                    <div className="flex justify-end space-x-2 pt-4">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white font-bold transition-colors">Crear</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </AuthGuard>
    );
}
