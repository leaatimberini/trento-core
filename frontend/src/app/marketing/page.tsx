"use client";

import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { isAdmin } from "../../utils/auth";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { Megaphone, Send, Users, MessageSquare, Wand2, Eye, Zap, Package, ArrowRight, X, Loader2 } from "lucide-react";

interface CampaignSuggestion {
    type: string;
    targetSegment: string;
    suggestedSubject: string;
    suggestedContent: string;
    products: Array<{ id: string; name: string; price: number; reason: string }>;
    confidence: number;
}

interface Segment {
    id: string;
    name: string;
    icon: string;
}

export default function MarketingPage() {
    const [segment, setSegment] = useState("ALL");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [campaigns, setCampaigns] = useState([]);
    const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Modal states
    const [showPreview, setShowPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");
    const [selectedSuggestion, setSelectedSuggestion] = useState<CampaignSuggestion | null>(null);

    const router = useRouter();

    useEffect(() => {
        if (!isAdmin()) {
            router.replace("/pos");
            return;
        }
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const [campaignsData, segmentsData] = await Promise.all([
                api.getCampaigns(),
                fetch('/api/marketing/segments').then(r => r.json())
            ]);
            setCampaigns(campaignsData || []);
            // Use segments from API or fallback
            const validSegments = Array.isArray(segmentsData) && segmentsData.length > 0 && segmentsData[0].name
                ? segmentsData
                : [
                    { id: 'ALL', name: 'Todos', icon: '👥' },
                    { id: 'VIP', name: 'VIP', icon: '⭐' },
                    { id: 'INACTIVE', name: 'Inactivos', icon: '😴' },
                    { id: 'NEW', name: 'Nuevos', icon: '🆕' }
                ];
            setSegments(validSegments);
        } catch (e) {
            console.error(e);
            // Fallback segments on error
            setSegments([
                { id: 'ALL', name: 'Todos', icon: '👥' },
                { id: 'VIP', name: 'VIP', icon: '⭐' },
                { id: 'INACTIVE', name: 'Inactivos', icon: '😴' },
                { id: 'NEW', name: 'Nuevos', icon: '🆕' }
            ]);
        }
    };

    const loadSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/marketing/suggestions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSuggestions(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const generateWithAI = async (campaignType: string = 'PROMO') => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/marketing/generate-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    campaignType,
                    segment,
                    discountPercent: 20
                })
            });
            const data = await res.json();
            setSubject(data.subject);
            setContent(data.plainText);
            setPreviewHtml(data.htmlContent);
        } catch (e) {
            console.error(e);
            alert('Error generando contenido');
        } finally {
            setGenerating(false);
        }
    };

    const applySuggestion = (suggestion: CampaignSuggestion) => {
        setSegment(suggestion.targetSegment);
        setSubject(suggestion.suggestedSubject);
        setContent(suggestion.suggestedContent);
        setSelectedSuggestion(null);
    };

    const previewEmail = async () => {
        if (!subject || !content) {
            alert('Completá el asunto y contenido primero');
            return;
        }
        setShowPreview(true);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.sendCampaign(segment, subject, content);
            setSubject("");
            setContent("");
            loadData();
            alert(`✅ Campaña enviada a ${res.recipientCount} usuarios.`);
        } catch (error) {
            alert("Error al enviar campaña");
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'PROMO': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'STOCK_CLEARANCE': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'NEW_PRODUCTS': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'SEASONAL': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'PROMO': return 'Promoción';
            case 'STOCK_CLEARANCE': return 'Liquidación';
            case 'NEW_PRODUCTS': return 'Nuevos Productos';
            case 'SEASONAL': return 'Re-engagement';
            default: return type;
        }
    };

    return (
        <AuthGuard>
            <DashboardLayout>
                <div className="max-w-7xl mx-auto pt-6">
                    {/* Header */}
                    <div className="mb-8 flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white">
                                Marketing & Campañas
                            </h1>
                            <p className="text-gray-400 mt-1">Crea campañas inteligentes con IA</p>
                        </div>
                        <button
                            onClick={loadSuggestions}
                            disabled={loadingSuggestions}
                            className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-xl font-bold hover:bg-purple-500/30 transition-all border border-purple-500/30"
                        >
                            {loadingSuggestions ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                            Sugerencias IA
                        </button>
                    </div>

                    {/* AI Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Zap className="text-amber-500" size={20} />
                                Sugerencias de Campaña (IA)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {suggestions.map((s, i) => (
                                    <div
                                        key={i}
                                        className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 hover:border-amber-500/50 transition-all cursor-pointer group"
                                        onClick={() => setSelectedSuggestion(s)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(s.type)}`}>
                                                {getTypeLabel(s.type)}
                                            </span>
                                            <span className="text-xs text-gray-500">{Math.round(s.confidence * 100)}% match</span>
                                        </div>
                                        <h4 className="font-bold text-white text-sm mb-2 line-clamp-2">{s.suggestedSubject}</h4>
                                        <p className="text-gray-400 text-xs line-clamp-2 mb-3">{s.suggestedContent.substring(0, 80)}...</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500">→ {s.targetSegment}</span>
                                            <ArrowRight size={16} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Campaign Form */}
                        <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Megaphone className="text-amber-500" size={20} /> Nueva Campaña
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => generateWithAI('PROMO')}
                                        disabled={generating}
                                        className="flex items-center gap-2 bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-purple-500/30 transition-all"
                                    >
                                        {generating ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                                        Generar con IA
                                    </button>
                                    <button
                                        onClick={previewEmail}
                                        className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-500/30 transition-all"
                                    >
                                        <Eye size={14} />
                                        Vista Previa
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleSend} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Segmento Objetivo</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {segments.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => setSegment(s.id)}
                                                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${segment === s.id
                                                    ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20'
                                                    : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/30'
                                                    }`}
                                            >
                                                <span className="mr-2">{s.icon || ''}</span>
                                                {(s.name || s.id || '').split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Asunto del Email</label>
                                    <div className="relative">
                                        <MessageSquare className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                                            placeholder="Ej. 🔥 ¡20% OFF en toda la tienda!"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contenido del Email</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-amber-500 transition-colors h-48 resize-none font-mono text-sm"
                                        placeholder="Escribe el contenido o generalo con IA..."
                                        required
                                    />
                                </div>

                                <div className="pt-4 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => generateWithAI('STOCK_CLEARANCE')}
                                            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                                        >
                                            🔥 Liquidación
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => generateWithAI('NEW_PRODUCTS')}
                                            className="text-xs text-gray-400 hover:text-emerald-400 transition-colors"
                                        >
                                            🆕 Nuevos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => generateWithAI('SEASONAL')}
                                            className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
                                        >
                                            😢 Re-engagement
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
                                    >
                                        {loading ? 'Enviando...' : (
                                            <>
                                                <Send size={18} /> Enviar Campaña
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Stats & History */}
                        <div className="space-y-6">
                            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">Métricas</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Users size={18} className="text-gray-400" />
                                            <span className="text-gray-400 text-sm">Total Suscriptores</span>
                                        </div>
                                        <span className="text-white font-bold">--</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <Megaphone size={18} className="text-gray-400" />
                                            <span className="text-gray-400 text-sm">Campañas Enviadas</span>
                                        </div>
                                        <span className="text-white font-bold">{campaigns.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/5 max-h-[400px] overflow-y-auto">
                                <h3 className="text-lg font-bold text-white mb-4">Historial</h3>
                                <div className="space-y-3">
                                    {campaigns.map((c: any) => (
                                        <div key={c.id} className="p-4 bg-black/20 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-white text-sm line-clamp-1">{c.subject}</h4>
                                                <span className="text-xs text-gray-500">{new Date(c.sentAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>→ {c.segment}</span>
                                                <span className="text-emerald-400 font-bold">{c.recipientCount} enviados</span>
                                            </div>
                                        </div>
                                    ))}
                                    {campaigns.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Sin historial.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Suggestion Detail Modal */}
                {selectedSuggestion && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-xl max-w-lg w-full border border-gray-700">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <div>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(selectedSuggestion.type)}`}>
                                        {getTypeLabel(selectedSuggestion.type)}
                                    </span>
                                    <h3 className="text-lg font-bold text-white mt-2">{selectedSuggestion.suggestedSubject}</h3>
                                </div>
                                <button onClick={() => setSelectedSuggestion(null)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-300 text-sm mb-4 whitespace-pre-line">{selectedSuggestion.suggestedContent}</p>

                                {selectedSuggestion.products.length > 0 && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-bold text-gray-400 mb-2">Productos Sugeridos:</h4>
                                        <div className="space-y-2">
                                            {selectedSuggestion.products.map((p, i) => (
                                                <div key={i} className="flex justify-between items-center p-2 bg-black/30 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <Package size={14} className="text-gray-500" />
                                                        <span className="text-white text-sm">{p.name}</span>
                                                    </div>
                                                    <span className="text-emerald-400 text-sm font-mono">${p.price.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                                    <span className="text-gray-500 text-sm">Segmento: {selectedSuggestion.targetSegment}</span>
                                    <button
                                        onClick={() => applySuggestion(selectedSuggestion)}
                                        className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-400 transition-all"
                                    >
                                        Usar Esta Sugerencia
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Modal */}
                {showPreview && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                            <div className="bg-gray-800 p-4 flex justify-between items-center">
                                <h3 className="text-white font-bold">Vista Previa del Email</h3>
                                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="overflow-auto max-h-[calc(80vh-60px)]" dangerouslySetInnerHTML={{
                                __html: previewHtml || `
                                <div style="padding: 40px; text-align: center; background: #f3f4f6;">
                                    <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; margin: 0 auto;">
                                        <h2 style="color: #1f2937;">${subject}</h2>
                                        <p style="color: #6b7280; white-space: pre-line;">${content}</p>
                                    </div>
                                </div>
                            ` }} />
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </AuthGuard>
    );
}
