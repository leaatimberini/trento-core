'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, BookOpen, Calendar, ArrowRight, Search } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED';
    createdAt: string;
}

interface Recipe {
    id: string;
    name: string;
    ingredients: string[];
    instructions: string;
    createdAt: string;
}

const ARTICLES_KEY = 'trento_blog_articles';
const RECIPES_KEY = 'trento_blog_recipes';

export default function NoticiasPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [activeTab, setActiveTab] = useState<'articulos' | 'recetas'>('articulos');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load published articles from localStorage
        const savedArticles = localStorage.getItem(ARTICLES_KEY);
        const savedRecipes = localStorage.getItem(RECIPES_KEY);

        if (savedArticles) {
            try {
                const parsed = JSON.parse(savedArticles);
                // Only show published articles
                setArticles(parsed.filter((a: Article) => a.status === 'PUBLISHED'));
            } catch (e) {
                console.error('Error loading articles:', e);
            }
        }

        if (savedRecipes) {
            try {
                setRecipes(JSON.parse(savedRecipes));
            } catch (e) {
                console.error('Error loading recipes:', e);
            }
        }

        setLoading(false);
    }, []);

    const filteredArticles = articles.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 pt-24 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-amber-500 font-medium">Cargando...</p>
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
                        Blog
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Noticias & Recetas</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Descubrí novedades, consejos de maridaje y recetas de tragos
                    </p>
                </div>

                {/* Search */}
                <div className="relative max-w-md mx-auto mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar artículos o recetas..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('articulos')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'articulos'
                            ? 'bg-amber-500 text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <FileText size={20} />
                        Artículos
                    </button>
                    <button
                        onClick={() => setActiveTab('recetas')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'recetas'
                            ? 'bg-orange-500 text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <BookOpen size={20} />
                        Recetas de Tragos
                    </button>
                </div>

                {/* Articles Tab */}
                {activeTab === 'articulos' && (
                    <div>
                        {filteredArticles.length === 0 ? (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                                <FileText size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400 text-lg mb-2">
                                    {searchTerm ? 'No se encontraron artículos' : 'Próximamente nuevos artículos'}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    Estamos preparando contenido increíble para vos
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filteredArticles.map(article => (
                                    <article
                                        key={article.id}
                                        className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-amber-500/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                                            <Calendar size={14} />
                                            {new Date(article.createdAt).toLocaleDateString('es-AR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-amber-400 transition-colors">
                                            {article.title}
                                        </h2>
                                        <p className="text-gray-400 mb-4 line-clamp-3">
                                            {article.content}
                                        </p>
                                        <Link href={`/noticias/${article.id}`} className="flex items-center gap-2 text-amber-500 font-medium hover:text-amber-400 transition-colors">
                                            Leer más
                                            <ArrowRight size={16} />
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Recipes Tab */}
                {activeTab === 'recetas' && (
                    <div>
                        {filteredRecipes.length === 0 ? (
                            <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                                <BookOpen size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400 text-lg mb-2">
                                    {searchTerm ? 'No se encontraron recetas' : 'Próximamente nuevas recetas'}
                                </p>
                                <p className="text-gray-500 text-sm">
                                    Pronto compartiremos recetas de los mejores tragos
                                </p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-6">
                                {filteredRecipes.map(recipe => (
                                    <article
                                        key={recipe.id}
                                        className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-orange-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                                <BookOpen className="text-orange-400" size={20} />
                                            </div>
                                            <h2 className="text-xl font-bold text-white">{recipe.name}</h2>
                                        </div>

                                        <div className="mb-4">
                                            <h3 className="text-sm font-medium text-gray-400 mb-2">Ingredientes:</h3>
                                            <ul className="text-gray-300 text-sm space-y-1">
                                                {recipe.ingredients.slice(0, 5).map((ing, i) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                                                        {ing}
                                                    </li>
                                                ))}
                                                {recipe.ingredients.length > 5 && (
                                                    <li className="text-gray-500">+{recipe.ingredients.length - 5} más</li>
                                                )}
                                            </ul>
                                        </div>

                                        {recipe.instructions && (
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-400 mb-2">Preparación:</h3>
                                                <p className="text-gray-400 text-sm line-clamp-3">{recipe.instructions}</p>
                                            </div>
                                        )}

                                        <Link
                                            href={`/noticias/receta/${recipe.id}`}
                                            className="mt-4 flex items-center gap-2 text-orange-500 font-medium hover:text-orange-400 transition-colors"
                                        >
                                            Ver Receta Completa
                                            <ArrowRight size={16} />
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-16 text-center bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-8 border border-amber-500/20">
                    <h3 className="text-xl font-bold text-white mb-2">¿Querés más contenido?</h3>
                    <p className="text-gray-400 mb-4">Suscribite a nuestro newsletter y recibí novedades</p>
                    <div className="flex max-w-md mx-auto gap-2">
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                        />
                        <button className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-all">
                            Suscribir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
