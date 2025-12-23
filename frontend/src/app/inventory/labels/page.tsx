
"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "../../../services/api";
import { Product } from "../../../types";
import AuthGuard from "../../../components/AuthGuard";
import { Printer } from "lucide-react";
import JsBarcode from "jsbarcode";

export default function LabelsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getProducts().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    const toggleSelect = (id: string) => {
        setSelectedProducts(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handlePrint = () => {
        window.print();
    };

    // Render barcodes when selection changes
    useEffect(() => {
        selectedProducts.forEach(id => {
            const product = products.find(p => p.id === id);
            if (product) {
                try {
                    JsBarcode(`#barcode-${id}`, product.ean || product.sku, {
                        format: (product.ean && product.ean.length === 13) ? "EAN13" : "CODE128",
                        lineColor: "#000",
                        width: 2,
                        height: 40,
                        displayValue: true
                    });
                } catch (e) {
                    console.error("Barcode error", e);
                }
            }
        });
    }, [selectedProducts, products]);

    return (
        <AuthGuard>
            <div className="min-h-screen bg-gray-900 text-white p-8 font-sans print:bg-white print:text-black print:p-0">
                <div className="flex justify-between items-center mb-8 print:hidden">
                    <h1 className="text-3xl font-bold text-brand-500">Generador de Etiquetas</h1>
                    <button
                        onClick={handlePrint}
                        disabled={selectedProducts.length === 0}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold disabled:opacity-50"
                    >
                        <Printer size={20} /> <span>Imprimir Selección</span>
                    </button>
                </div>

                {/* Selection Area (Hidden when printing) */}
                <div className="bg-gray-800 rounded-xl p-6 mb-8 print:hidden max-h-96 overflow-y-auto border border-gray-700">
                    <h2 className="text-xl font-bold mb-4">Seleccionar Productos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(p => (
                            <label key={p.id} className="flex items-center space-x-3 bg-gray-700 p-3 rounded cursor-pointer hover:bg-gray-600">
                                <input
                                    type="checkbox"
                                    checked={selectedProducts.includes(p.id)}
                                    onChange={() => toggleSelect(p.id)}
                                    className="w-5 h-5"
                                />
                                <div>
                                    <p className="font-bold">{p.name}</p>
                                    <p className="text-sm text-gray-400 font-mono">{p.sku}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Printable Area - Grid of Labels */}
                <div className="grid grid-cols-3 gap-4 p-4 print:block print:w-full">
                    {selectedProducts.map(id => {
                        const product = products.find(p => p.id === id);
                        if (!product) return null;
                        return (
                            <div key={id} className="border-2 border-dashed border-gray-600 bg-white text-black p-4 rounded flex flex-col items-center justify-center text-center w-full print:border-none print:break-inside-avoid print:mb-8 print:w-[30%] print:inline-block print:mx-[1.5%]">
                                <h3 className="text-lg font-bold mb-1 truncate w-full">{product.name}</h3>
                                <p className="text-xl font-extrabold mb-2">${Number(product.basePrice).toFixed(2)}</p>
                                <svg id={`barcode-${id}`}></svg>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AuthGuard>
    );
}
