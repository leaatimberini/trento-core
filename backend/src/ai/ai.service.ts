
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { InventoryService } from '../inventory/inventory.service';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma.service';
import Groq from 'groq-sdk';

export interface ProductData {
    name: string;
    category: string;
    brand?: string;
    volume?: string;
    packaging?: string; // 'Retornable', 'Descartable'
}

@Injectable()
export class AiService {
    private groq: Groq;

    constructor(
        private readonly productsService: ProductsService,
        @Inject(forwardRef(() => InventoryService))
        private readonly inventoryService: InventoryService,
        @Inject(forwardRef(() => FinanceService))
        private readonly financeService: FinanceService,
        private readonly prisma: PrismaService
    ) {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY || ''
        });
    }

    /**
     * Process natural language query (Rule-Based V1)
     */
    /**
     * Process natural language query (Hybrid: Rule-Based for Data + Groq for Chat)
     */
    async processQuery(query: string) {
        const lower = query.toLowerCase();

        // 0. Intent: LOW STOCK (before generic stock search)
        if (lower.match(/stock\s+bajo|bajo\s+stock|sin\s+stock|productos?\s+(con\s+)?poco|falta(n)?\s+productos?|qu[eé]\s+(me\s+)?falta/)) {
            // Get products with their total inventory
            const productsWithStock = await this.prisma.$queryRaw<Array<{ name: string, total_stock: bigint }>>`
                SELECT p.name, COALESCE(SUM(i.quantity), 0) as total_stock
                FROM "Product" p
                LEFT JOIN "InventoryItem" i ON p.id = i."productId"
                GROUP BY p.id, p.name
                HAVING COALESCE(SUM(i.quantity), 0) <= 10
                ORDER BY total_stock ASC
                LIMIT 10
            `;

            if (productsWithStock.length === 0) {
                return { text: '✅ ¡Excelente! No tenés productos con stock bajo en este momento.' };
            }

            const responses = productsWithStock.map(p => {
                const stock = Number(p.total_stock);
                return `- **${p.name}**: ${stock} unidades ${stock === 0 ? '🔴' : '🟡'}`;
            });
            return {
                text: `📦 **Productos con Stock Bajo:**\n\n${responses.join('\n')}\n\n_Mostrando productos con 10 unidades o menos_`
            };
        }

        // 1. Intent: STOCK (High Precision Rule)
        if (lower.match(/stock|cantidad|cuant(o|a)s hay/)) {
            const term = this.extractTerm(lower, /stock|cantidad|cuant(o|a)s hay/g);
            if (!term) return { text: "Por favor, decime de qué producto querés saber el stock. Ej: 'stock de Coca Cola'." };

            const products = await this.productsService.findByName(term);
            if (products.length === 0) return { text: `No encontré productos que coincidan con "${term}".` };

            const responses = products.slice(0, 5).map(p => `- ${p.name}: **${p.currentStock || 0}** unidades`);
            return {
                text: `Encontré estos productos:\n${responses.join('\n')}${products.length > 5 ? '\n(y otros...)' : ''}`
            };
        }

        // 2. Intent: PRICE (High Precision Rule)
        if (lower.match(/precio|cuant(o|a) sale|costo/)) {
            const term = this.extractTerm(lower, /precio|cuant(o|a) sale|costo/g);
            if (!term) return { text: "Por favor, decime de qué producto querés saber el precio. Ej: 'precio de Fernet'." };

            const products = await this.productsService.findByName(term);
            if (products.length === 0) return { text: `No encontré productos que coincidan con "${term}".` };

            const responses = products.slice(0, 5).map(p => `- ${p.name}: **$${p.basePrice}**`);
            return {
                text: `Precios encontrados:\n${responses.join('\n')}`
            };
        }

        // 3. Intent: SALES (Finance)
        if (lower.match(/ventas|vendimos|ganancia|facturaci(o|ó)n/)) {
            // Determine period
            const today = new Date();
            let period = 'hoy';
            if (lower.includes('ayer')) period = 'ayer';
            if (lower.includes('mes')) period = 'mes';

            if (period === 'hoy') {
                const stats = await this.financeService.getDailyStats();
                return {
                    text: `📊 **Reporte de Hoy**\n\n💰 Ventas: $${stats.totalRevenue.toFixed(2)}\n📉 Costo (COGS): $${stats.totalCOGS.toFixed(2)}\n💵 Ganancia Neta: $${stats.totalNetProfit.toFixed(2)}\n📈 Margen Real: ${stats.realMargin.toFixed(1)}%\n🛒 Transacciones: ${stats.transactionCount}`
                };
            }
            else if (period === 'mes') {
                const stats = await this.financeService.getMonthlyStats();
                return {
                    text: `📅 **Reporte del Mes**\n\n💰 Ingresos: $${stats.totalRevenue.toFixed(2)}\n📉 Costos: $${stats.totalCOGS.toFixed(2)}\n💵 Ganancia Neta: $${(stats as any).totalNetProfit?.toFixed(2) || 'N/A'}\n📈 Margen Real: ${(stats as any).realMargin?.toFixed(1) || 'N/A'}%`
                };
            }
        }

        // 4. Fallback: Gemini AI (General Conversation)
        return this.processWithGemini(query);
    }

    private async processWithGemini(query: string) {
        try {
            const systemPrompt = `Sos Trento AI, un asistente útil para una distribuidora de bebidas llamada "Trento Core".
            Respondé en español argentino. Sé conciso, amigable y profesional.
            
            Contexto:
            - Podés ayudar con recetas de tragos/cócteles.
            - Podés dar consejos sobre maridaje de vinos.
            - Si preguntan por stock o precios, guialos a preguntar "stock de [producto]" o "precio de [producto]" para datos en tiempo real.
            - Si te piden crear un presupuesto, indicales que usen el comando /presupuestos en el menú /b2b o la web.`;

            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 500
            });

            const responseText = chatCompletion.choices[0]?.message?.content || '';
            return { text: responseText };
        } catch (error) {
            console.error('Groq Chat Error:', error);
            return { text: "Disculpá, tuve un error al procesar tu consulta. Por favor probá de nuevo." };
        }
    }

    private extractTerm(query: string, trigger: RegExp): string {
        return query
            .replace(trigger, '')
            .replace(/\b(de|del|la|las|los|el|en)\b/g, '') // Remove articles
            .replace(/\?/g, '') // Remove question marks
            .trim();
    }

    /**
     * Parse quotation request from natural language using Groq
     * Returns structured data for creating a quotation
     */
    async parseQuotationRequest(query: string): Promise<{
        success: boolean;
        customerName?: string;
        items?: { productName: string; quantity: number }[];
        error?: string;
    }> {
        try {
            const systemPrompt = `Sos un parser de pedidos para una distribuidora de bebidas.
Extraé el nombre del cliente y los productos con cantidades del mensaje del usuario.
Respondé SOLO con JSON válido, sin markdown ni explicaciones.

IMPORTANTE: Incluí el nombre COMPLETO del producto con sabor/variante si se menciona.
Por ejemplo:
- "vodka skyy raspberry" → "vodka skyy raspberry" (NO solo "vodka skyy")
- "fernet branca menta" → "fernet branca menta"
- "coca cola zero" → "coca cola zero"

Formato de respuesta:
{
  "customerName": "nombre del cliente",
  "items": [
    {"productName": "nombre completo del producto", "quantity": número}
  ]
}

Reglas de cantidad:
- "1 coca" o "coca x1" o "una coca" → quantity: 1
- "2 fernet" o "fernet x2" o "dos fernet" → quantity: 2
- Si no se especifica cantidad, usá 1

Si no podés identificar el cliente o productos, devolvé:
{"error": "No pude identificar [lo que falta]"}`;

            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.2,
                max_tokens: 500
            });

            const text = chatCompletion.choices[0]?.message?.content || '{}';
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(cleanText);

            if (parsed.error) {
                return { success: false, error: parsed.error };
            }

            if (!parsed.customerName || !parsed.items || parsed.items.length === 0) {
                return { success: false, error: 'No pude identificar cliente o productos' };
            }

            return {
                success: true,
                customerName: parsed.customerName,
                items: parsed.items
            };
        } catch (error) {
            console.error('Parse Quotation Error:', error);
            return { success: false, error: 'Error al procesar el pedido' };
        }
    }

    /**
     * Check if a query is a quotation creation request
     */
    isQuotationRequest(query: string): boolean {
        const lower = query.toLowerCase();
        return /crea(r|me)?(\s+un)?\s+(presupuesto|cotizaci[oó]n|pedido)/i.test(lower) ||
            /presupuesto\s+para/i.test(lower) ||
            /pedido\s+para/i.test(lower);
    }

    /**
     * Generates SEO-friendly product descriptions using a hybrid template engine.
     * Zero Cost - No external API required.
     */
    /**
     * Generates SEO-friendly product descriptions using Google Gemini Pro.
     */
    async generateDescription(data: ProductData) {
        const { name, category, brand, volume, packaging } = data;

        const prompt = `
        Act as an expert copywriter for an e-commerce beverage store (Trento Bebidas).
        Write a creative, persuasive, and SEO-optimized product description for the following item:
        
        Product: ${name}
        Category: ${category}
        Brand: ${brand || 'Unknown'}
        Volume: ${volume || 'Standard'}
        Packaging: ${packaging || 'Standard'}
        
        Output MUST be valid JSON with this structure:
        {
            "shortDescription": "One catchy sentence (max 150 chars)",
            "longDescription": "Two persuasive paragraphs highlighting flavor, occasion, and quality.",
            "seoTitle": "SEO optimized title (max 60 chars)",
            "tags": ["tag1", "tag2", "tag3", "tag4"]
        }
        Respond ONLY with the JSON.
        `;

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are an expert copywriter. Respond ONLY with valid JSON, no markdown.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 800
            });

            const text = chatCompletion.choices[0]?.message?.content || '{}';

            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (error) {
            console.error('Groq Error:', error);
            // Fallback to template if AI fails
            return this.generateDescriptionFallback(data);
        }
    }

    async generateContent(prompt: string): Promise<string> {
        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 1000
            });
            return chatCompletion.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('Groq Generate Content Error:', error);
            throw new Error('Failed to generate content');
        }
    }

    private generateDescriptionFallback(data: ProductData) {
        const { name } = data;
        return {
            shortDescription: `${name} disponible en Trento.`,
            longDescription: `Disfrutá de ${name}. Un producto de excelente calidad, ideal para compartir.`,
            seoTitle: `${name} - Trento Bebidas`,
            tags: ['bebidas', 'oferta']
        };
    }

    /**
     * Predicts demand for the next month based on sales history.
     * Uses Linear Regression (Zero Cost / pure JS).
     */
    async predictDemand(productId: string) {
        // 1. Fetch Sales History (Last 60 days)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 60);

        const sales = await this.prisma.saleItem.findMany({
            where: {
                productId: productId,
                sale: {
                    createdAt: { gte: startDate }
                }
            },
            include: { sale: true },
            orderBy: { sale: { createdAt: 'asc' } }
        });

        if (sales.length < 5) {
            return {
                predictedQuantity: 0,
                confidence: 0,
                trend: 'insufficient_data',
                reason: "Pocas ventas registradas en los últimos 60 días.",
                avgDailySales: 0,
                slope: 0
            };
        }

        // 2. Group by Day (Day 1, Day 2, ..., Day 60)
        const dailySales = new Map<number, number>();

        sales.forEach(item => {
            const dayDiff = Math.floor((item.sale.createdAt.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
            dailySales.set(dayDiff, (dailySales.get(dayDiff) || 0) + item.quantity);
        });

        // 3. Prepare Data for Linear Regression (y = mx + b)
        const xValues: number[] = [];
        const yValues: number[] = [];

        // Fill gaps with 0 for better accuracy
        for (let i = 0; i < 60; i++) {
            xValues.push(i);
            yValues.push(dailySales.get(i) || 0);
        }

        const { m, b } = this.linearRegression(xValues, yValues);

        // 4. Predict Next 30 Days (Future Demand)
        let predictedTotal = 0;
        for (let i = 60; i < 90; i++) {
            const dailyPrediction = m * i + b;
            predictedTotal += Math.max(0, dailyPrediction); // No negative sales
        }

        const trend = m > 0.05 ? 'up' : (m < -0.05 ? 'down' : 'stable');
        const confidence = Math.min(0.95, sales.length / 50); // Simple heuristic
        const avgDailySales = yValues.reduce((a, b) => a + b, 0) / 60;

        return {
            predictedQuantity: Math.round(predictedTotal),
            confidence: parseFloat(confidence.toFixed(2)),
            trend,
            details: `Tendencia ${trend === 'up' ? 'alcista 📈' : trend === 'down' ? 'bajista 📉' : 'estable ➡️'}. Ventas diarias promedio: ${avgDailySales.toFixed(1)}.`,
            avgDailySales,
            slope: m
        };
    }

    private linearRegression(x: number[], y: number[]) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return { m: 0, b: 0 };

        const m = (n * sumXY - sumX * sumY) / denominator;
        const b = (sumY - m * sumX) / n;

        return { m, b };
    }

    private async analyzeTrend(productName: string, trend: string, slope: number): Promise<string> {
        try {
            const direction = trend === 'up' ? 'increasing' : 'decreasing';
            const prompt = `
            Analyze the sales trend for the product "${productName}".
            The sales are ${direction} with a slope factor of ${slope.toFixed(2)}.
            
            Provide a SINGLE, short sentence (max 15 words) in Spanish explaining a POSSIBLE reason for this trend (e.g., seasonality, holidays, economic factors).
            Be speculative but logical based on the product type.
            Example: "Posible aumento debido al clima cálido y la temporada de verano."
            `;

            const chatCompletion = await this.groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 100
            });
            return chatCompletion.choices[0]?.message?.content?.trim() || '';
        } catch (error) {
            return ''; // Fail silently for analytics
        }
    }

    async getRecommendations(productId: string) {
        // 1. Find all sales containing this product
        const salesWithProduct = await this.prisma.saleItem.findMany({
            where: { productId },
            select: { saleId: true }
        });

        const saleIds = salesWithProduct.map(s => s.saleId);

        if (saleIds.length === 0) return [];

        // 2. Find other items in these sales
        const otherItems = await this.prisma.saleItem.findMany({
            where: {
                saleId: { in: saleIds },
                productId: { not: productId }
            },
            include: { product: true }
        });

        // 3. Count frequencies
        const frequency: Record<string, { count: number; product: any }> = {};
        for (const item of otherItems) {
            if (!frequency[item.productId]) {
                frequency[item.productId] = { count: 0, product: item.product };
            }
            frequency[item.productId].count++;
        }

        // 4. Sort and return top 3
        return Object.values(frequency)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(x => x.product);
    }

    // --- Analytics Methods ---

    async getInsights() {
        const predictions = await this.getPredictions();
        const trendUp = predictions.filter(p => p.trend === 'UP').length;
        const trendDown = predictions.filter(p => p.trend === 'DOWN').length;

        const stockrecs = await this.getStockRecommendations();
        const critical = stockrecs.filter(r => r.urgency === 'CRITICAL').length;

        const anomalies = await this.getAnomalies();
        const highAlerts = anomalies.filter(a => a.severity === 'HIGH').length;

        const totalProducts = await this.prisma.product.count();

        return {
            summary: {
                totalProducts,
                trendingUp: trendUp,
                trendingDown: trendDown,
                criticalStockItems: critical,
                highPriorityAlerts: highAlerts
            },
            topTrending: predictions.filter(p => p.trend === 'UP').slice(0, 5),
            criticalStock: stockrecs.filter(r => r.urgency === 'CRITICAL').slice(0, 5),
            highAlerts: anomalies.slice(0, 5)
        };
    }

    async getPredictions() {
        // Fetch products sold in last 30 days to limit analysis
        const recentSales = await this.prisma.saleItem.findMany({
            where: { sale: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            select: { productId: true },
            distinct: ['productId']
        });

        const productIds = recentSales.map(s => s.productId);
        // Include products even if not sold recently? Maybe top 50 active
        const products = await this.prisma.product.findMany({
            where: {
                id: { in: productIds }
            },
            take: 50 // Cap to prevent timeout on large catalog
        });

        const results = [];
        for (const p of products) {
            const pred = await this.predictDemand(p.id);
            if (pred.trend === 'insufficient_data') continue;

            const trendMap = pred.trend === 'up' ? 'UP' : pred.trend === 'down' ? 'DOWN' : 'STABLE';

            results.push({
                productId: p.id,
                productName: p.name,
                avgDailySales: Number(pred.avgDailySales.toFixed(2)),
                trend: trendMap,
                trendPercent: Math.min(100, Math.abs(Math.round(pred.slope * 100))),
                predictedNext7Days: Math.round(pred.predictedQuantity * 7 / 30),
                predictedNext30Days: pred.predictedQuantity,
                confidence: Math.round(pred.confidence * 100),
                slope: pred.slope // Keep strictly for internal sorting
            });
        }

        // Sort by magnitude of trend (most interesting first)
        const sortedResults = results.sort((a, b) => b.predictedNext30Days - a.predictedNext30Days);

        // Enhance Top 3 with AI insights
        for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
            const item = sortedResults[i];
            // Only explain if there is a significant trend
            if (item.trend !== 'STABLE') {
                (item as any).explanation = await this.analyzeTrend(item.productName, item.trend === 'UP' ? 'up' : 'down', item.slope);
            }
        }

        return sortedResults;
    }

    async getStockRecommendations() {
        // We need products with their stock.
        // Assuming Product model has a virtual 'currentStock' or we need to access via InventoryService if separate.
        // For now, assume Prisma Product model has 'currentStock' (common in this codebase).
        // OR fetch inventory items sum.
        // Let's rely on Prisma relation if inventoryItems exist.
        const products = await this.prisma.product.findMany({
            include: { inventoryItems: true },
            take: 100
        });

        const results = [];
        for (const p of products) {
            // Calc stock
            const stock = (p as any).inventoryItems ? (p as any).inventoryItems.reduce((acc, item) => acc + item.quantity, 0) : ((p as any).currentStock || 0);

            const pred = await this.predictDemand(p.id);

            if (pred.trend === 'insufficient_data' || pred.avgDailySales <= 0.1) continue;

            const daysOfStock = Math.round(stock / pred.avgDailySales);

            let urgency = 'OK';
            if (daysOfStock < 7) urgency = 'CRITICAL';
            else if (daysOfStock < 14) urgency = 'LOW';
            else if (daysOfStock > 60) urgency = 'OVERSTOCK';

            const reorderPoint = Math.ceil(pred.avgDailySales * 14); // 2 weeks safety
            const suggestedOrderQty = Math.max(0, reorderPoint * 2 - stock); // Target 4 weeks stock

            if (urgency !== 'OK') {
                results.push({
                    productId: p.id,
                    productName: p.name,
                    currentStock: stock,
                    avgDailySales: Number(pred.avgDailySales.toFixed(1)),
                    daysOfStock,
                    reorderPoint,
                    suggestedOrderQty,
                    urgency
                });
            }
        }
        return results.sort((a, b) => a.daysOfStock - b.daysOfStock);
    }


    async getAnomalies() {
        const anomalies = [];
        const products = await this.prisma.product.findMany({
            include: { inventoryItems: true },
            take: 50
        });

        for (const p of products) {
            const stock = (p as any).inventoryItems ? (p as any).inventoryItems.reduce((acc, item) => acc + item.quantity, 0) : ((p as any).currentStock || 0);

            if (stock < 0) {
                anomalies.push({
                    type: 'Error de Stock',
                    severity: 'HIGH',
                    productName: p.name,
                    message: `Stock negativo detectado (${stock} u.)`,
                    value: stock
                });
            }
        }
        return anomalies;
    }

    async getPricingSuggestions() {
        const stockRecs = await this.getStockRecommendations();

        const results = [];

        // 1. Overstock -> Discount
        const overstock = stockRecs.filter(r => r.urgency === 'OVERSTOCK');
        for (const r of overstock) {
            const p = await this.prisma.product.findUnique({ where: { id: r.productId } });
            if (!p) continue;

            const currentPrice = Number(p.basePrice || 0);
            if (currentPrice <= 0) continue;

            results.push({
                productId: p.id,
                productName: p.name,
                currentPrice,
                suggestedPrice: currentPrice * 0.9,
                reason: 'Exceso de Stock (> 60 días)',
                potentialImpact: 'Liberar capital y espacio'
            });
        }

        // 2. Critical Stock + High Trend -> slight increase
        // (Simplified logic)
        const critical = stockRecs.filter(r => r.urgency === 'CRITICAL');
        for (const r of critical) {
            const p = await this.prisma.product.findUnique({ where: { id: r.productId } });
            if (!p) continue;

            const currentPrice = Number(p.basePrice || 0);
            if (currentPrice <= 0) continue;

            results.push({
                productId: p.id,
                productName: p.name,
                currentPrice,
                suggestedPrice: currentPrice * 1.05,
                reason: 'Alta Demanda / Stock Crítico',
                potentialImpact: 'Mejorar margen +5%'
            });
        }

        return results;
    }
}
