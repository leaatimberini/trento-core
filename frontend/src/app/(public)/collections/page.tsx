"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CollectionsPage() {
    const collections = [
        {
            id: 'wines',
            title: 'Vinos de Autor',
            description: 'Una selección curada de las mejores bodegas argentinas.',
            image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2070&auto=format&fit=crop', // Wine
            link: '/catalog?category=Vinos',
            color: 'from-red-900'
        },
        {
            id: 'spirits',
            title: 'Destilados Premium',
            description: 'Whiskies, Gins y Vodkas importados para exigentes.',
            image: 'https://images.unsplash.com/photo-1599309995543-9bfa0fa869f0?q=80&w=2070&auto=format&fit=crop', // Whiskey/Spirits
            link: '/catalog?category=Destilados',
            color: 'from-amber-900'
        },
        {
            id: 'beers',
            title: 'Cervezas Artesanales',
            description: 'Lo mejor de la producción local e internacional.',
            image: 'https://images.unsplash.com/photo-1575037614876-c38a4d44f5b8?q=80&w=2070&auto=format&fit=crop', // Beer
            link: '/catalog?category=Cervezas',
            color: 'from-orange-900'
        },
        {
            id: 'party',
            title: 'Para Celebrar',
            description: 'Espumantes y combos listos para tu próxima fiesta.',
            image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=1974&auto=format&fit=crop', // Champagne/Party
            link: '/catalog?category=Espumantes',
            color: 'from-purple-900'
        }
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-white font-sans pt-24 pb-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16 space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold tracking-widest uppercase border border-amber-500/20">
                        Nuestras Selecciones
                    </span>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                        Colecciones Exclusivas
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                        Explora bebidas agrupadas por ocasión, tipo y origen. Diseñadas para facilitar tu elección.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {collections.map((collection) => (
                        <Link
                            key={collection.id}
                            href={collection.link}
                            className="group relative h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:border-amber-500/30"
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0">
                                <img
                                    src={collection.image}
                                    alt={collection.title}
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className={`absolute inset-0 bg-gradient-to-t ${collection.color} via-neutral-950/50 to-neutral-950/20 opacity-80 group-hover:opacity-70 transition-opacity duration-500`}></div>
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                <div className="transform transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                                    <h2 className="text-3xl font-bold text-white mb-2">{collection.title}</h2>
                                    <p className="text-gray-300 mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                        {collection.description}
                                    </p>
                                    <span className="inline-flex items-center gap-2 text-amber-400 group-hover:text-amber-300 font-bold uppercase text-xs tracking-wider transition-colors">
                                        Explorar Colección <ArrowRight size={16} />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
