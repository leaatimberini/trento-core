'use client';

import { FileText, ShieldCheck, AlertCircle } from 'lucide-react';

export default function TerminosPage() {
    return (
        <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white mb-4">Términos y Condiciones</h1>
                    <p className="text-gray-400">Última actualización: Diciembre 2024</p>
                </div>

                <div className="space-y-8 text-gray-300">
                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-amber-400" size={24} />
                            1. Condiciones Generales
                        </h2>
                        <p className="mb-4">
                            Al acceder y utilizar este sitio web, usted acepta estar sujeto a estos términos
                            y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos,
                            le rogamos que no utilice nuestro sitio.
                        </p>
                        <p>
                            Trento Bebidas se reserva el derecho de modificar estos términos en cualquier
                            momento sin previo aviso. Es responsabilidad del usuario revisar periódicamente
                            los cambios.
                        </p>
                    </section>

                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <ShieldCheck className="text-amber-400" size={24} />
                            2. Restricción de Edad
                        </h2>
                        <p className="mb-4">
                            La venta de bebidas alcohólicas está prohibida a menores de 18 años.
                            Al realizar una compra en nuestro sitio, usted declara ser mayor de edad
                            y estar legalmente autorizado para adquirir estos productos.
                        </p>
                        <p className="text-amber-400 font-medium">
                            BEBER CON MODERACIÓN. PROHIBIDA SU VENTA A MENORES DE 18 AÑOS.
                        </p>
                    </section>

                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">3. Precios y Pagos</h2>
                        <ul className="space-y-2">
                            <li>• Todos los precios están expresados en Pesos Argentinos (ARS) e incluyen IVA</li>
                            <li>• Los precios pueden variar sin previo aviso</li>
                            <li>• Los descuentos mayoristas aplican solo para clientes registrados y verificados</li>
                            <li>• Aceptamos: Tarjetas de crédito/débito, transferencia bancaria y Mercado Pago</li>
                        </ul>
                    </section>

                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">4. Envíos y Entregas</h2>
                        <ul className="space-y-2">
                            <li>• Los tiempos de entrega son estimados y pueden variar según la zona</li>
                            <li>• El receptor debe ser mayor de 18 años y presentar DNI</li>
                            <li>• En caso de productos dañados, contactar dentro de las 24hs de recibido</li>
                            <li>• No nos responsabilizamos por demoras causadas por factores externos</li>
                        </ul>
                    </section>

                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">5. Devoluciones</h2>
                        <ul className="space-y-2">
                            <li>• Las devoluciones se aceptan dentro de los 10 días de recibido el producto</li>
                            <li>• El producto debe estar sin abrir y en condiciones originales</li>
                            <li>• Los costos de devolución corren por cuenta del cliente</li>
                            <li>• El reembolso se procesará en un plazo de 5-10 días hábiles</li>
                        </ul>
                    </section>

                    <section className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-xl font-bold text-white mb-4">6. Privacidad de Datos</h2>
                        <p className="mb-4">
                            La información personal recopilada será utilizada únicamente para procesar
                            pedidos, mejorar el servicio y enviar comunicaciones comerciales (con su
                            consentimiento).
                        </p>
                        <p>
                            Nos comprometemos a no compartir sus datos personales con terceros sin
                            su autorización expresa, salvo requerimiento legal.
                        </p>
                    </section>

                    <section className="bg-amber-500/10 rounded-2xl p-8 border border-amber-500/30">
                        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                            <AlertCircle size={24} />
                            Contacto para Consultas
                        </h2>
                        <p className="text-gray-300">
                            Para cualquier consulta relacionada con estos términos, puede contactarnos a:
                        </p>
                        <p className="mt-2 text-white font-medium">
                            legal@trentobebidas.com | +54 11 1234-5678
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
