'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowLeft, Share2, Clock, Users, ChefHat } from 'lucide-react';

interface Recipe {
    id: string;
    name: string;
    ingredients: string[];
    instructions: string;
    createdAt: string;
}

const RECIPES_KEY = 'trento_blog_recipes';

// Parse instruction text into formatted elements
const InstructionsContent = ({ instructions }: { instructions: string }) => {
    // Clean up escaped newlines and split into lines
    const cleanedInstructions = instructions.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n');
    const lines = cleanedInstructions.split('\n').filter(line => line.trim());

    let stepNumber = 0;

    return (
        <div className="space-y-4">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();

                // Bold text / Tips - starts with **
                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                    return (
                        <div key={index} className="mt-6 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <p className="text-orange-400 font-semibold">
                                💡 {trimmedLine.replace(/\*\*/g, '')}
                            </p>
                        </div>
                    );
                }

                // Bold tip inline - contains **text**
                if (trimmedLine.includes('**')) {
                    const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g);
                    return (
                        <div key={index} className="mt-4 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <p className="text-orange-300">
                                {parts.map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={i} className="text-orange-400 font-semibold">{part.slice(2, -2)}</strong>;
                                    }
                                    return part;
                                })}
                            </p>
                        </div>
                    );
                }

                // Numbered step - starts with number.
                const stepMatch = trimmedLine.match(/^(\d+)\.\s*(.+)/);
                if (stepMatch) {
                    stepNumber++;
                    return (
                        <div key={index} className="flex gap-4 items-start">
                            <span className="w-10 h-10 bg-orange-500 text-black rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0">
                                {stepMatch[1]}
                            </span>
                            <p className="text-gray-300 text-lg leading-relaxed pt-2">{stepMatch[2]}</p>
                        </div>
                    );
                }

                // List item - starts with -
                if (trimmedLine.startsWith('- ')) {
                    return (
                        <div key={index} className="flex gap-3 items-start ml-4">
                            <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></span>
                            <p className="text-gray-300">{trimmedLine.slice(2)}</p>
                        </div>
                    );
                }

                // Regular paragraph
                return (
                    <p key={index} className="text-gray-300 text-lg leading-relaxed">
                        {trimmedLine}
                    </p>
                );
            })}
        </div>
    );
};

export default function RecipePage() {
    const params = useParams();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [relatedRecipes, setRelatedRecipes] = useState<Recipe[]>([]);

    useEffect(() => {
        const savedRecipes = localStorage.getItem(RECIPES_KEY);
        if (savedRecipes) {
            try {
                const recipes: Recipe[] = JSON.parse(savedRecipes);
                const found = recipes.find(r => r.id === params.id);
                setRecipe(found || null);

                const related = recipes
                    .filter(r => r.id !== params.id)
                    .slice(0, 3);
                setRelatedRecipes(related);
            } catch (e) {
                console.error('Error loading recipe:', e);
            }
        }
        setLoading(false);
    }, [params.id]);

    const handleShare = async () => {
        if (navigator.share && recipe) {
            try {
                await navigator.share({
                    title: recipe.name,
                    text: `Receta: ${recipe.name}`,
                    url: window.location.href,
                });
            } catch {
                // User cancelled
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 pt-24 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-orange-500 font-medium">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-3xl font-bold text-white mb-4">Receta no encontrada</h1>
                    <p className="text-gray-400 mb-8">La receta que buscás no existe.</p>
                    <Link href="/noticias" className="inline-flex items-center gap-2 bg-orange-500 text-black px-6 py-3 rounded-xl font-bold">
                        <ArrowLeft size={20} />
                        Volver a Noticias
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
            <article className="max-w-3xl mx-auto px-6">
                {/* Back button */}
                <Link href="/noticias" className="inline-flex items-center gap-2 text-gray-400 hover:text-orange-500 mb-8 transition-colors">
                    <ArrowLeft size={18} />
                    Volver a Recetas
                </Link>

                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <BookOpen className="text-white" size={32} />
                        </div>
                        <div>
                            <span className="text-orange-400 text-sm font-medium uppercase tracking-wider">Receta de Trago</span>
                            <h1 className="text-4xl font-extrabold text-white">{recipe.name}</h1>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="flex items-center gap-6 mt-6">
                        <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-gray-300">
                            <Clock size={18} className="text-orange-400" />
                            5 min
                        </span>
                        <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-gray-300">
                            <Users size={18} className="text-orange-400" />
                            1 porción
                        </span>
                        <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-gray-300">
                            <ChefHat size={18} className="text-orange-400" />
                            Fácil
                        </span>
                    </div>
                </header>

                {/* Ingredients */}
                <section className="mb-10">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                        <span className="w-10 h-10 bg-orange-500 text-black rounded-xl flex items-center justify-center text-xl font-bold">1</span>
                        Ingredientes
                    </h2>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <ul className="space-y-4">
                            {recipe.ingredients.map((ingredient, index) => (
                                <li key={index} className="flex items-center gap-4 text-gray-300">
                                    <span className="w-3 h-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex-shrink-0"></span>
                                    <span className="text-lg">{ingredient}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Preparation */}
                <section className="mb-10">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                        <span className="w-10 h-10 bg-orange-500 text-black rounded-xl flex items-center justify-center text-xl font-bold">2</span>
                        Preparación
                    </h2>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <InstructionsContent instructions={recipe.instructions} />
                    </div>
                </section>

                {/* Share */}
                <div className="mt-12 py-6 border-t border-b border-white/10 flex items-center justify-between">
                    <p className="text-gray-400">¡Compartí esta receta con tus amigos!</p>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        <Share2 size={18} />
                        Compartir
                    </button>
                </div>

                {/* Related Recipes */}
                {relatedRecipes.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-white mb-6">Más Recetas</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            {relatedRecipes.map(related => (
                                <Link
                                    key={related.id}
                                    href={`/noticias/receta/${related.id}`}
                                    className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-orange-500/30 transition-all group"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                            <BookOpen className="text-orange-400" size={18} />
                                        </div>
                                        <h3 className="font-bold text-white group-hover:text-orange-400 transition-colors">
                                            {related.name}
                                        </h3>
                                    </div>
                                    <p className="text-gray-500 text-sm">{related.ingredients.length} ingredientes</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="mt-16 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-2xl p-8 border border-orange-500/20 text-center">
                    <ChefHat size={40} className="mx-auto text-orange-400 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">¿Necesitás los ingredientes?</h3>
                    <p className="text-gray-400 mb-6">Encontrá todo lo que necesitás en nuestro catálogo con los mejores precios</p>
                    <Link href="/catalog" className="inline-block bg-orange-500 hover:bg-orange-400 text-black font-bold px-8 py-4 rounded-xl transition-all text-lg">
                        Ver Catálogo
                    </Link>
                </div>
            </article>
        </div>
    );
}
