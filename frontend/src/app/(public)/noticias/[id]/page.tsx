'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ArrowLeft, Share2, BookOpen, Clock } from 'lucide-react';

interface Article {
    id: string;
    title: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED';
    createdAt: string;
}

const ARTICLES_KEY = 'trento_blog_articles';

// Simple markdown parser component
const MarkdownContent = ({ content }: { content: string }) => {
    const parseMarkdown = (text: string) => {
        const lines = text.split('\n');
        const elements: JSX.Element[] = [];
        let currentList: string[] = [];
        let listKey = 0;

        const flushList = () => {
            if (currentList.length > 0) {
                elements.push(
                    <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-2 mb-6 text-gray-300">
                        {currentList.map((item, i) => (
                            <li key={i}>{parseInline(item)}</li>
                        ))}
                    </ul>
                );
                currentList = [];
            }
        };

        const parseInline = (text: string): React.ReactNode => {
            // Bold text **text**
            const parts = text.split(/(\*\*[^*]+\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-amber-400 font-semibold">{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // Empty line
            if (!trimmedLine) {
                flushList();
                return;
            }

            // H1 - # Title (skip as we have the title in header)
            if (trimmedLine.startsWith('# ') && index === 0) {
                flushList();
                // Skip article title, we already show it
                return;
            }

            // H1 - # Title (not first line)
            if (trimmedLine.startsWith('# ')) {
                flushList();
                elements.push(
                    <h2 key={index} className="text-2xl font-bold text-white mt-8 mb-4">
                        {trimmedLine.slice(2)}
                    </h2>
                );
                return;
            }

            // H2 - ## Title
            if (trimmedLine.startsWith('## ')) {
                flushList();
                elements.push(
                    <h2 key={index} className="text-2xl font-bold text-white mt-8 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
                        {trimmedLine.slice(3)}
                    </h2>
                );
                return;
            }

            // H3 - ### Title
            if (trimmedLine.startsWith('### ')) {
                flushList();
                elements.push(
                    <h3 key={index} className="text-xl font-semibold text-amber-400 mt-6 mb-3">
                        {trimmedLine.slice(4)}
                    </h3>
                );
                return;
            }

            // H4 - #### Title
            if (trimmedLine.startsWith('#### ')) {
                flushList();
                elements.push(
                    <h4 key={index} className="text-lg font-semibold text-white mt-4 mb-2">
                        {trimmedLine.slice(5)}
                    </h4>
                );
                return;
            }

            // List item - starts with -
            if (trimmedLine.startsWith('- ')) {
                currentList.push(trimmedLine.slice(2));
                return;
            }

            // Numbered list - starts with number.
            if (/^\d+\.\s/.test(trimmedLine)) {
                flushList();
                const match = trimmedLine.match(/^(\d+)\.\s(.+)/);
                if (match) {
                    elements.push(
                        <div key={index} className="flex gap-4 mb-4">
                            <span className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {match[1]}
                            </span>
                            <p className="text-gray-300 leading-relaxed">{parseInline(match[2])}</p>
                        </div>
                    );
                }
                return;
            }

            // Regular paragraph
            flushList();
            elements.push(
                <p key={index} className="text-gray-300 leading-relaxed mb-4">
                    {parseInline(trimmedLine)}
                </p>
            );
        });

        flushList();
        return elements;
    };

    return <div className="space-y-2">{parseMarkdown(content)}</div>;
};

export default function ArticlePage() {
    const params = useParams();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

    useEffect(() => {
        const savedArticles = localStorage.getItem(ARTICLES_KEY);
        if (savedArticles) {
            try {
                const articles: Article[] = JSON.parse(savedArticles);
                const found = articles.find(a => a.id === params.id && a.status === 'PUBLISHED');
                setArticle(found || null);

                const related = articles
                    .filter(a => a.status === 'PUBLISHED' && a.id !== params.id)
                    .slice(0, 3);
                setRelatedArticles(related);
            } catch (e) {
                console.error('Error loading article:', e);
            }
        }
        setLoading(false);
    }, [params.id]);

    const handleShare = async () => {
        if (navigator.share && article) {
            try {
                await navigator.share({
                    title: article.title,
                    text: article.content.substring(0, 100) + '...',
                    url: window.location.href,
                });
            } catch {
                // User cancelled
            }
        }
    };

    const readingTime = article ? Math.max(1, Math.ceil(article.content.split(' ').length / 200)) : 0;

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

    if (!article) {
        return (
            <div className="min-h-screen bg-neutral-950 pt-24 pb-16">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-3xl font-bold text-white mb-4">Artículo no encontrado</h1>
                    <p className="text-gray-400 mb-8">El artículo que buscás no existe o no está publicado.</p>
                    <Link href="/noticias" className="inline-flex items-center gap-2 bg-amber-500 text-black px-6 py-3 rounded-xl font-bold">
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
                <Link href="/noticias" className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-500 mb-8 transition-colors">
                    <ArrowLeft size={18} />
                    Volver a Noticias
                </Link>

                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(article.createdAt).toLocaleDateString('es-AR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                        <span className="flex items-center gap-2">
                            <Clock size={14} />
                            {readingTime} min de lectura
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                        {article.title}
                    </h1>
                </header>

                {/* Content with markdown parsing */}
                <div className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
                    <MarkdownContent content={article.content} />
                </div>

                {/* Share */}
                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400">¿Te gustó este artículo?</p>
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl font-bold transition-all"
                        >
                            <Share2 size={18} />
                            Compartir
                        </button>
                    </div>
                </div>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-2xl font-bold text-white mb-6">Más Artículos</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {relatedArticles.map(related => (
                                <Link
                                    key={related.id}
                                    href={`/noticias/${related.id}`}
                                    className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-amber-500/30 transition-all group"
                                >
                                    <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                                        {related.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm line-clamp-2">
                                        {related.content.replace(/[#*\-]/g, '').substring(0, 100)}...
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="mt-16 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-8 border border-amber-500/20 text-center">
                    <BookOpen size={32} className="mx-auto text-amber-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Explorá más contenido</h3>
                    <p className="text-gray-400 mb-4">Descubrí recetas, tips y novedades del mundo de las bebidas</p>
                    <Link href="/noticias" className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-all">
                        Ver todas las noticias
                    </Link>
                </div>
            </article>
        </div>
    );
}
