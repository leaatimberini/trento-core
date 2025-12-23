
"use client";
import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, MessageSquare } from "lucide-react";
import { api } from "../services/api";

export default function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
        { role: 'bot', text: '¡Hola! Soy Trento AI. Preguntame por stock o precios.' }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput("");
        setLoading(true);

        try {
            const res = await api.aiChat(userMsg);
            setMessages(prev => [...prev, { role: 'bot', text: res.text }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: "Lo siento, tuve un error de conexión." }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 z-50 border-2 border-purple-400"
            >
                <Bot size={28} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 max-w-[90vw] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 h-[500px]">
            {/* Header */}
            <div className="bg-purple-700 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Bot size={20} />
                    <span className="font-bold">Trento Assistant</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-purple-600 p-1 rounded">
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-line ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-br-none'
                                    : 'bg-gray-700 text-gray-200 rounded-bl-none'
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 text-gray-400 p-3 rounded-2xl rounded-bl-none text-xs animate-pulse">
                            Escribiendo...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 bg-gray-900 border-t border-gray-700 flex gap-2">
                <input
                    className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Preguntame algo..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
