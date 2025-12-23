
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../services/api";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth(); // If response includes token, auto-login

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.customerRegister({ name, email, password, phone });
            // After register, auto-login
            const loginData = await api.customerLogin({ email, password });
            login(loginData.access_token, {
                ...loginData.user,
                type: 'CUSTOMER'
            });
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 pt-24 px-6 flex items-center justify-center">
            <div className="w-full max-w-md">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">Crear Cuenta</h1>
                        <p className="text-gray-400 text-sm mt-2">Únete a Trento Bebidas</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 text-red-200 p-3 rounded-lg mb-6 text-sm text-center border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Nombre Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                placeholder="Juan Pérez"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Teléfono (Opcional)</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                placeholder="+54 9 11 ..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? "Creando cuenta..." : "Registrarse"}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-400">
                        ¿Ya tienes una cuenta?{" "}
                        <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">
                            Ingresar
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
