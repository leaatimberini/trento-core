"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Wine } from 'lucide-react';

export default function AgeVerificationModal() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const verified = localStorage.getItem('trento_age_verified');
        if (!verified) {
            setShow(true);
        }
    }, []);

    const handleConfirm = () => {
        localStorage.setItem('trento_age_verified', 'true');
        setShow(false);
    };

    const handleDeny = () => {
        // Redirect to Google or somewhere safe
        window.location.href = 'https://www.google.com';
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
            <div className="max-w-md w-full bg-neutral-900 border border-amber-500/30 rounded-3xl p-8 text-center">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wine className="text-amber-500" size={40} />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                    Verificación de Edad
                </h2>

                <p className="text-gray-400 mb-6">
                    Este sitio contiene información sobre bebidas alcohólicas.
                    La venta de alcohol a menores de 18 años está prohibida.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-amber-400">
                        <AlertTriangle size={18} />
                        <span className="font-bold text-sm">BEBER CON MODERACIÓN</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Prohibida su venta a menores de 18 años. Ley Nacional de Lucha contra el Alcoholismo.
                    </p>
                </div>

                <p className="text-lg text-white font-bold mb-6">
                    ¿Sos mayor de 18 años?
                </p>

                <div className="flex gap-4">
                    <button
                        onClick={handleDeny}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all"
                    >
                        No, soy menor
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl transition-all"
                    >
                        Sí, soy mayor
                    </button>
                </div>

                <p className="text-xs text-gray-600 mt-6">
                    Al confirmar, aceptás que sos mayor de 18 años y podés acceder al contenido.
                </p>
            </div>
        </div>
    );
}
