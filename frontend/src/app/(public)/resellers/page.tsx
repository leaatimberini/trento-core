'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Store, Users, Send, CheckCircle, ArrowLeft, Building2, Phone, Mail, MapPin } from 'lucide-react';

export default function RevendedoresPage() {
    const [formType, setFormType] = useState<'revendedor' | 'comercio' | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        business: '',
        city: '',
        message: '',
        type: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    ...formData,
                    type: formType === 'revendedor' ? 'RESELLER' : 'WHOLESALE',
                    source: 'WEBSITE'
                })
            });

            if (res.ok) {
                setSubmitted(true);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-neutral-950 pt-24 pb-16 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">¡Solicitud Enviada!</h1>
                    <p className="text-gray-400 mb-8">
                        Recibimos tu información. Nuestro equipo comercial se pondrá en contacto contigo
                        dentro de las próximas 24-48 horas hábiles.
                    </p>
                    <Link href="/" className="inline-flex items-center gap-2 bg-amber-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-amber-400 transition-all">
                        <ArrowLeft size={20} />
                        Volver a la Tienda
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <span className="inline-block py-1 px-3 border border-amber-500/50 rounded-full text-amber-400 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-md bg-black/30 mb-4">
                        Programa de Partners
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                        ¿Querés Revender?
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Sumate a nuestra red de distribución y accedé a precios preferenciales,
                        stock garantizado y soporte comercial personalizado.
                    </p>
                </div>

                {/* Type Selection */}
                {!formType ? (
                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        <button
                            onClick={() => setFormType('revendedor')}
                            className="group bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-amber-500/50 transition-all text-left hover:bg-white/10"
                        >
                            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500/30 transition-colors">
                                <Users size={32} className="text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Revendedor Particular</h2>
                            <p className="text-gray-400 mb-4">
                                ¿Vendes bebidas a amigos, eventos o por redes sociales?
                                Accedé a precios especiales para reventa.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    Descuentos de hasta 15%
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    Sin mínimo de compra inicial
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    Catálogo exclusivo mayorista
                                </li>
                            </ul>
                        </button>

                        <button
                            onClick={() => setFormType('comercio')}
                            className="group bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-amber-500/50 transition-all text-left hover:bg-white/10"
                        >
                            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors">
                                <Building2 size={32} className="text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Comercio o Negocio</h2>
                            <p className="text-gray-400 mb-4">
                                ¿Tenés kiosco, almacén, vinoteca o bar? Obtené precios
                                de comercio con condiciones exclusivas.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    Descuentos de hasta 25%
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    Crédito y cuenta corriente
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-emerald-400" />
                                    Entrega programada
                                </li>
                            </ul>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 max-w-xl mx-auto">
                        <button
                            onClick={() => setFormType(null)}
                            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                        >
                            <ArrowLeft size={18} />
                            Cambiar tipo de cuenta
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formType === 'revendedor' ? 'bg-amber-500/20' : 'bg-purple-500/20'
                                }`}>
                                {formType === 'revendedor' ? (
                                    <Users size={24} className="text-amber-400" />
                                ) : (
                                    <Building2 size={24} className="text-purple-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {formType === 'revendedor' ? 'Revendedor Particular' : 'Comercio o Negocio'}
                                </h2>
                                <p className="text-sm text-gray-400">Completá tus datos y te contactamos</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Nombre Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    placeholder="Juan Pérez"
                                />
                            </div>

                            {formType === 'comercio' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nombre del Negocio *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.business}
                                        onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                        placeholder="Kiosco La Esquina"
                                    />
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                        placeholder="tu@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Teléfono *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                        placeholder="+54 11 1234-5678"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Ciudad / Localidad *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    placeholder="Buenos Aires, CABA"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Mensaje (opcional)</label>
                                <textarea
                                    rows={3}
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                                    placeholder="Contanos un poco sobre tu negocio o cómo querés revender..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {submitting ? (
                                    'Enviando...'
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Enviar Solicitud
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* Benefits Section */}
                <div className="mt-16 text-center">
                    <h3 className="text-xl font-bold text-white mb-8">¿Por qué elegirnos?</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <Store className="text-amber-400 mx-auto mb-4" size={32} />
                            <h4 className="font-bold text-white mb-2">Stock Garantizado</h4>
                            <p className="text-sm text-gray-400">Depósito propio con productos siempre disponibles</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <Phone className="text-amber-400 mx-auto mb-4" size={32} />
                            <h4 className="font-bold text-white mb-2">Soporte Comercial</h4>
                            <p className="text-sm text-gray-400">Asesor dedicado para tu cuenta</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <MapPin className="text-amber-400 mx-auto mb-4" size={32} />
                            <h4 className="font-bold text-white mb-2">Envío a Todo el País</h4>
                            <p className="text-sm text-gray-400">Llegamos a donde estés</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
