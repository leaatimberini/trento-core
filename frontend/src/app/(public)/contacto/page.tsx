'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function ContactoPage() {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // For now just show success - would integrate with API
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white mb-4">Contacto</h1>
                    <p className="text-xl text-gray-400">¿Tenés dudas? Estamos para ayudarte</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contact Info */}
                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                    <Mail className="text-amber-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Email</h3>
                                    <a href="mailto:ventas@trentobebidas.com" className="text-gray-400 hover:text-amber-400 transition-colors">
                                        ventas@trentobebidas.com
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                    <Phone className="text-emerald-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">WhatsApp</h3>
                                    <a href="https://wa.me/5491112345678" className="text-gray-400 hover:text-emerald-400 transition-colors">
                                        +54 11 1234-5678
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                    <MapPin className="text-purple-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Ubicación</h3>
                                    <p className="text-gray-400">Buenos Aires, Argentina</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <Clock className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Horario</h3>
                                    <p className="text-gray-400">Lun - Vie: 9:00 - 18:00</p>
                                    <p className="text-gray-400">Sáb: 9:00 - 13:00</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        {submitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="text-emerald-400" size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">¡Mensaje Enviado!</h3>
                                <p className="text-gray-400 mb-4">Te responderemos a la brevedad.</p>
                                <button onClick={() => setSubmitted(false)} className="text-amber-500 hover:underline">
                                    Enviar otro mensaje
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="text-xl font-bold text-white mb-4">Envianos un mensaje</h3>
                                <div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Tu nombre"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="tu@email.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        placeholder="Asunto"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <textarea
                                        rows={4}
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="Tu mensaje..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    <Send size={18} />
                                    Enviar Mensaje
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
