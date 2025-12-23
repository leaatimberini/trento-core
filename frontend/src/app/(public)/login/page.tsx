
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../services/api";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";

export default function StoreLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await api.customerLogin({ email, password });
            login(data.access_token, {
                ...data.user,
                type: 'CUSTOMER'
            }); // Update AuthContext
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Credenciales inválidas");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 pt-24 px-6 flex items-center justify-center">
            <div className="w-full max-w-md">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">Bienvenido</h1>
                        <p className="text-gray-400 text-sm mt-2">Accede a tu cuenta de cliente</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 text-red-200 p-3 rounded-lg mb-6 text-sm text-center border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
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
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Contraseña</label>
                            </div>
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
                            {loading ? "Iniciando..." : "Ingresar"}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-400">
                        ¿No tienes una cuenta?{" "}
                        <Link href="/register" className="text-amber-500 hover:text-amber-400 font-medium">
                            Regístrate
                        </Link>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 text-center">
                        <Link href="/admin-login" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                            Acceso Personal Administrativo
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
