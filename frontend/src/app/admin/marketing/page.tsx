
"use client";

import React, { useState } from 'react';
import { api } from '@/services/api';
import { Mail, Send, Users, CheckCircle } from 'lucide-react';

export default function MarketingPage() {
    const [segment, setSegment] = useState('ALL');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSend = async () => {
        if (!subject || !content) return;
        setLoading(true);
        try {
            const res = await api.sendCampaign(segment, subject, content);
            setResult(res);
        } catch (e) {
            console.error(e);
            alert('Error sending campaign');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <Mail className="text-purple-600" /> Marketing Campaigns
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">New Campaign</h2>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Segment</label>
                        <select
                            value={segment}
                            onChange={(e) => setSegment(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                            <option value="ALL">All Customers</option>
                            <option value="VIP">VIP Members</option>
                            <option value="INACTIVE">Inactive Users</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full border p-2 rounded"
                            placeholder="Special Offer!"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full border p-2 rounded h-32"
                            placeholder="Hello, we have a great deal for you..."
                        />
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={loading}
                        className="w-full bg-purple-600 text-white p-3 rounded flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : <><Send size={18} /> Send Campaign</>}
                    </button>
                </div>

                {/* Results/Stats */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                            <Users size={18} /> Audience Reach
                        </h3>
                        <p className="text-gray-600">
                            Estimated Reach: <span className="font-bold text-2xl text-purple-600">
                                {segment === 'ALL' ? '1,250' : segment === 'VIP' ? '50' : '300'}
                            </span> Users
                        </p>
                    </div>

                    {result && (
                        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                                <CheckCircle /> Campaign Sent!
                            </h3>
                            <p className="text-green-700 mt-2">
                                Successfully sent to <strong>{result.sentCount}</strong> recipients.
                                <br />
                                Campaign ID: {result.campaignId}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
