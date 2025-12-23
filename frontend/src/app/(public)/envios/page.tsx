'use client';

import { Truck, Clock, MapPin, Package, CreditCard, AlertTriangle } from 'lucide-react';

export default function EnviosPage() {
    return (
        <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-white mb-4">Información de Envíos</h1>
                    <p className="text-xl text-gray-400">Todo lo que necesitás saber sobre nuestras entregas</p>
                </div>

                <div className="space-y-8">
                    {/* Shipping Methods */}
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <Truck className="text-amber-400" size={28} />
                            Métodos de Envío
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white/5 rounded-xl p-6">
                                <h3 className="font-bold text-white mb-2">Envío a Domicilio</h3>
                                <p className="text-gray-400 text-sm mb-3">Entrega en la puerta de tu casa u oficina</p>
                                <ul className="space-y-2 text-sm text-gray-500">
                                    <li>• CABA: 24-48 hs hábiles</li>
                                    <li>• GBA: 48-72 hs hábiles</li>
                                    <li>• Interior: 3-7 días hábiles</li>
                                </ul>
                            </div>
                            <div className="bg-white/5 rounded-xl p-6">
                                <h3 className="font-bold text-white mb-2">Retiro en Depósito</h3>
                                <p className="text-gray-400 text-sm mb-3">Retirá tu pedido sin costo</p>
                                <ul className="space-y-2 text-sm text-gray-500">
                                    <li>• Sin costo de envío</li>
                                    <li>• Disponible en 24 hs</li>
                                    <li>• Horario: Lun-Vie 9-18hs</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Costs */}
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <CreditCard className="text-amber-400" size={28} />
                            Costos de Envío
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-3 text-gray-400 font-medium">Zona</th>
                                        <th className="py-3 text-gray-400 font-medium">Costo</th>
                                        <th className="py-3 text-gray-400 font-medium">Envío Gratis desde</th>
                                    </tr>
                                </thead>
                                <tbody className="text-white">
                                    <tr className="border-b border-white/5">
                                        <td className="py-3">CABA</td>
                                        <td className="py-3">$2.500</td>
                                        <td className="py-3 text-emerald-400">$25.000</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-3">GBA</td>
                                        <td className="py-3">$3.500</td>
                                        <td className="py-3 text-emerald-400">$35.000</td>
                                    </tr>
                                    <tr className="border-b border-white/5">
                                        <td className="py-3">Interior</td>
                                        <td className="py-3">A cotizar</td>
                                        <td className="py-3 text-gray-500">Consultar</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Packaging */}
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <Package className="text-amber-400" size={28} />
                            Embalaje
                        </h2>
                        <p className="text-gray-400 mb-4">
                            Todos nuestros productos son embalados de forma segura con materiales especiales
                            para evitar roturas durante el transporte:
                        </p>
                        <ul className="space-y-2 text-gray-400">
                            <li>• Cajas reforzadas de cartón corrugado</li>
                            <li>• Separadores individuales para cada botella</li>
                            <li>• Material de relleno absorbente</li>
                            <li>• Etiquetado de "Frágil" visible</li>
                        </ul>
                    </div>

                    {/* Important Note */}
                    <div className="bg-amber-500/10 rounded-2xl p-8 border border-amber-500/30">
                        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-3">
                            <AlertTriangle size={24} />
                            Información Importante
                        </h2>
                        <ul className="space-y-2 text-gray-300 text-sm">
                            <li>• El receptor debe ser mayor de 18 años y presentar DNI</li>
                            <li>• En caso de ausencia, se realizarán hasta 3 intentos de entrega</li>
                            <li>• Los tiempos de entrega pueden variar en días no hábiles y temporada alta</li>
                            <li>• Para pedidos mayoristas, consultar condiciones especiales</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
