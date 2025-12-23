
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../services/api";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await api.login({ email, password });
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("user", JSON.stringify(data.user));
            router.push("/dashboard");
        } catch (err) {
            setError("Credenciales inválidas");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1543091055-637dc462b404?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent"></div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <span className="text-amber-500 text-xs font-bold tracking-[0.2em] uppercase mb-2 block">Acceso Personal Interno</span>
                        <h1 className="text-3xl font-extrabold text-white">Trento ERP</h1>
                        <p className="text-gray-400 text-sm mt-2">Gestión Integral de Bebidas Premium</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 text-red-200 p-3 rounded-lg mb-6 text-sm text-center border border-red-500/20 backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Email Corporativo</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                placeholder="usuario@trento.com"
                                required
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
                            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 transform hover:-translate-y-0.5"
                        >
                            Iniciar Sesión
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-600">&copy; 2025 Trento Bebidas. Diseñado por <a href="https://instagram.com/leaa.emanuel" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">LEAA</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
