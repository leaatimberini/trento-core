import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Simple statistics helper
const stats = {
    mean: (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length,
    std: (arr: number[]): number => {
        const m = stats.mean(arr);
        return Math.sqrt(arr.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / arr.length);
    },
    zScore: (value: number, mean: number, std: number): number =>
        std === 0 ? 0 : (value - mean) / std,
    linearRegression: (x: number[], y: number[]) => {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return { slope, intercept };
    }
};

export interface DemandPrediction {
    productId: string;
    productName: string;
    avgDailySales: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    trendPercent: number;
    predictedNext7Days: number;
    predictedNext30Days: number;
    confidence: number;
}

export interface StockRecommendation {
    productId: string;
    productName: string;
    currentStock: number;
    avgDailySales: number;
    daysOfStock: number;
    reorderPoint: number;
    suggestedOrderQty: number;
    urgency: 'CRITICAL' | 'LOW' | 'OK' | 'OVERSTOCK';
}

export interface AnomalyAlert {
    type: 'MARGIN' | 'SALES_DROP' | 'SALES_SPIKE' | 'SLOW_MOVING' | 'DEADSTOCK';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    productId?: string;
    productName?: string;
    message: string;
    value: number;
    expectedValue?: number;
    zScore?: number;
}

@Injectable()
export class AiAnalyticsService {
    private readonly logger = new Logger(AiAnalyticsService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== DEMAND PREDICTION ====================

    /**
     * Predict demand for a product based on historical sales
     */
    async predictDemand(productId: string, days: number = 90): Promise<DemandPrediction | null> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) return null;

        // Get sales data
        const sales = await this.prisma.saleItem.findMany({
            where: {
                productId,
                sale: {
                    createdAt: { gte: startDate },
                    status: 'COMPLETED'
                }
            },
            include: { sale: true }
        });

        if (sales.length < 7) {
            return {
                productId,
                productName: product.name,
                avgDailySales: 0,
                trend: 'STABLE',
                trendPercent: 0,
                predictedNext7Days: 0,
                predictedNext30Days: 0,
                confidence: 0
            };
        }

        // Group by day
        const dailySales: Record<string, number> = {};
        sales.forEach(s => {
            const day = s.sale.createdAt.toISOString().split('T')[0];
            dailySales[day] = (dailySales[day] || 0) + s.quantity;
        });

        const sortedDays = Object.keys(dailySales).sort();
        const quantities = sortedDays.map(d => dailySales[d]);
        const dayIndices = sortedDays.map((_, i) => i);

        // Calculate average daily sales
        const avgDailySales = stats.mean(quantities);

        // Linear regression for trend
        const { slope } = stats.linearRegression(dayIndices, quantities);
        const trendPercent = avgDailySales > 0 ? (slope / avgDailySales) * 100 : 0;

        let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
        if (trendPercent > 5) trend = 'UP';
        else if (trendPercent < -5) trend = 'DOWN';

        // Simple prediction
        const predictedNext7Days = Math.max(0, Math.round(avgDailySales * 7 * (1 + trendPercent / 100)));
        const predictedNext30Days = Math.max(0, Math.round(avgDailySales * 30 * (1 + trendPercent / 100)));

        // Confidence based on data points and variance
        const confidence = Math.min(1, sales.length / 50) * (1 - Math.min(1, stats.std(quantities) / avgDailySales));

        return {
            productId,
            productName: product.name,
            avgDailySales: Math.round(avgDailySales * 100) / 100,
            trend,
            trendPercent: Math.round(trendPercent * 10) / 10,
            predictedNext7Days,
            predictedNext30Days,
            confidence: Math.round(confidence * 100) / 100
        };
    }

    /**
     * Get demand predictions for all products
     */
    async getAllPredictions(): Promise<DemandPrediction[]> {
        const products = await this.prisma.product.findMany({});

        const predictions: DemandPrediction[] = [];

        for (const product of products) {
            const prediction = await this.predictDemand(product.id);
            if (prediction && prediction.avgDailySales > 0) {
                predictions.push(prediction);
            }
        }

        return predictions.sort((a, b) => b.avgDailySales - a.avgDailySales);
    }

    // ==================== STOCK RECOMMENDATIONS ====================

    /**
     * Calculate reorder point and suggested order quantity
     */
    async getStockRecommendation(productId: string): Promise<StockRecommendation | null> {
        const prediction = await this.predictDemand(productId);
        if (!prediction) return null;

        // Get current stock
        const inventory = await this.prisma.inventoryItem.aggregate({
            where: { productId },
            _sum: { quantity: true }
        });

        const currentStock = inventory._sum.quantity || 0;
        const avgDailySales = prediction.avgDailySales;

        // Lead time assumption: 7 days
        const leadTime = 7;
        // Safety stock: 3 days
        const safetyDays = 3;

        const reorderPoint = Math.ceil(avgDailySales * (leadTime + safetyDays));
        const daysOfStock = avgDailySales > 0 ? currentStock / avgDailySales : 999;

        // Order quantity to cover 30 days
        const targetDays = 30;
        const suggestedOrderQty = Math.max(0, Math.ceil(avgDailySales * targetDays - currentStock));

        let urgency: 'CRITICAL' | 'LOW' | 'OK' | 'OVERSTOCK' = 'OK';
        if (daysOfStock <= leadTime) urgency = 'CRITICAL';
        else if (daysOfStock <= reorderPoint / avgDailySales) urgency = 'LOW';
        else if (daysOfStock > 90) urgency = 'OVERSTOCK';

        return {
            productId,
            productName: prediction.productName,
            currentStock,
            avgDailySales,
            daysOfStock: Math.round(daysOfStock),
            reorderPoint,
            suggestedOrderQty,
            urgency
        };
    }

    /**
     * Get all stock recommendations
     */
    async getAllStockRecommendations(): Promise<StockRecommendation[]> {
        const products = await this.prisma.product.findMany({});

        const recommendations: StockRecommendation[] = [];

        for (const product of products) {
            const rec = await this.getStockRecommendation(product.id);
            if (rec && rec.avgDailySales > 0) {
                recommendations.push(rec);
            }
        }

        return recommendations.sort((a, b) => {
            const urgencyOrder = { CRITICAL: 0, LOW: 1, OK: 2, OVERSTOCK: 3 };
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        });
    }

    // ==================== ANOMALY DETECTION ====================

    /**
     * Detect anomalies in sales and margins
     */
    async detectAnomalies(): Promise<AnomalyAlert[]> {
        const alerts: AnomalyAlert[] = [];

        // 1. Margin anomalies
        const marginAlerts = await this.detectMarginAnomalies();
        alerts.push(...marginAlerts);

        // 2. Sales anomalies
        const salesAlerts = await this.detectSalesAnomalies();
        alerts.push(...salesAlerts);

        // 3. Slow moving / deadstock
        const slowMovingAlerts = await this.detectSlowMoving();
        alerts.push(...slowMovingAlerts);

        return alerts.sort((a, b) => {
            const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    private async detectMarginAnomalies(): Promise<AnomalyAlert[]> {
        const alerts: AnomalyAlert[] = [];

        // Get recent sales with margins
        const recentSales = await this.prisma.saleItem.findMany({
            where: {
                sale: {
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            },
            include: { product: true }
        });

        // Calculate margins
        const margins: Array<{ productId: string; productName: string; margin: number }> = [];
        for (const item of recentSales) {
            if (item.product.costPrice) {
                const cost = Number(item.product.costPrice);
                const price = Number(item.unitPrice);
                const margin = ((price - cost) / price) * 100;
                margins.push({
                    productId: item.productId,
                    productName: item.product.name,
                    margin
                });
            }
        }

        if (margins.length < 10) return alerts;

        const allMargins = margins.map(m => m.margin);
        const mean = stats.mean(allMargins);
        const std = stats.std(allMargins);

        // Find outliers (z-score > 2)
        for (const m of margins) {
            const z = stats.zScore(m.margin, mean, std);
            if (z < -2) {
                alerts.push({
                    type: 'MARGIN',
                    severity: z < -3 ? 'HIGH' : 'MEDIUM',
                    productId: m.productId,
                    productName: m.productName,
                    message: `Margen anormalmente bajo: ${m.margin.toFixed(1)}%`,
                    value: m.margin,
                    expectedValue: mean,
                    zScore: z
                });
            }
        }

        return alerts;
    }

    private async detectSalesAnomalies(): Promise<AnomalyAlert[]> {
        const alerts: AnomalyAlert[] = [];

        // Compare this week vs last 4 weeks average
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - 7);

        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 35);

        const products = await this.prisma.product.findMany({});

        for (const product of products.slice(0, 50)) { // Limit for performance
            const thisWeekSales = await this.prisma.saleItem.aggregate({
                where: {
                    productId: product.id,
                    sale: { createdAt: { gte: thisWeekStart } }
                },
                _sum: { quantity: true }
            });

            const historicalSales = await this.prisma.saleItem.aggregate({
                where: {
                    productId: product.id,
                    sale: { createdAt: { gte: fourWeeksAgo, lt: thisWeekStart } }
                },
                _sum: { quantity: true }
            });

            const thisWeek = thisWeekSales._sum.quantity || 0;
            const histAvgWeek = (historicalSales._sum.quantity || 0) / 4;

            if (histAvgWeek > 5) { // Only for products with meaningful sales
                const changePercent = ((thisWeek - histAvgWeek) / histAvgWeek) * 100;

                if (changePercent < -50) {
                    alerts.push({
                        type: 'SALES_DROP',
                        severity: changePercent < -75 ? 'HIGH' : 'MEDIUM',
                        productId: product.id,
                        productName: product.name,
                        message: `Caída de ventas: ${changePercent.toFixed(0)}% vs promedio`,
                        value: thisWeek,
                        expectedValue: histAvgWeek
                    });
                } else if (changePercent > 100) {
                    alerts.push({
                        type: 'SALES_SPIKE',
                        severity: 'LOW',
                        productId: product.id,
                        productName: product.name,
                        message: `Pico de ventas: +${changePercent.toFixed(0)}% vs promedio`,
                        value: thisWeek,
                        expectedValue: histAvgWeek
                    });
                }
            }
        }

        return alerts;
    }

    private async detectSlowMoving(): Promise<AnomalyAlert[]> {
        const alerts: AnomalyAlert[] = [];

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Products with stock
        const productsWithInventory = await this.prisma.product.findMany({
            include: {
                inventoryItems: true,
                saleItems: {
                    where: {
                        sale: { createdAt: { gte: sixtyDaysAgo } }
                    }
                }
            }
        });

        for (const product of productsWithInventory) {
            const currentStock = product.inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
            const recentSales = product.saleItems.reduce((sum, i) => sum + i.quantity, 0);

            if (recentSales === 0 && currentStock > 0) {
                // Check if deadstock (no sales in 90 days)
                const olderSales = await this.prisma.saleItem.findMany({
                    where: {
                        productId: product.id,
                        sale: { createdAt: { gte: ninetyDaysAgo, lt: sixtyDaysAgo } }
                    }
                });

                const isDeadstock = olderSales.length === 0;

                alerts.push({
                    type: isDeadstock ? 'DEADSTOCK' : 'SLOW_MOVING',
                    severity: isDeadstock ? 'HIGH' : 'MEDIUM',
                    productId: product.id,
                    productName: product.name,
                    message: isDeadstock
                        ? `Sin ventas en 90+ días. Stock: ${currentStock}`
                        : `Sin ventas en 60 días. Stock: ${currentStock}`,
                    value: currentStock
                });
            }
        }

        return alerts;
    }

    // ==================== INSIGHTS DASHBOARD ====================

    /**
     * Get AI insights summary
     */
    async getInsightsSummary() {
        const predictions = await this.getAllPredictions();
        const stockRecs = await this.getAllStockRecommendations();
        const anomalies = await this.detectAnomalies();

        // Top trending products
        const topTrending = predictions
            .filter(p => p.trend === 'UP')
            .sort((a, b) => b.trendPercent - a.trendPercent)
            .slice(0, 5);

        // Critical stock
        const criticalStock = stockRecs.filter(r => r.urgency === 'CRITICAL');

        // High priority alerts
        const highAlerts = anomalies.filter(a => a.severity === 'HIGH');

        return {
            summary: {
                totalProducts: predictions.length,
                trendingUp: predictions.filter(p => p.trend === 'UP').length,
                trendingDown: predictions.filter(p => p.trend === 'DOWN').length,
                criticalStockItems: criticalStock.length,
                highPriorityAlerts: highAlerts.length
            },
            topTrending,
            criticalStock: criticalStock.slice(0, 10),
            highAlerts: highAlerts.slice(0, 10)
        };
    }

    // ==================== PRICING SUGGESTIONS ====================

    /**
     * Get pricing suggestions based on performance
     */
    async getPricingSuggestions() {
        const suggestions: Array<{
            productId: string;
            productName: string;
            currentPrice: number;
            suggestedPrice: number;
            reason: string;
            impact: string;
        }> = [];

        const products = await this.prisma.product.findMany({
            take: 50
        });

        for (const product of products) {
            const rec = await this.getStockRecommendation(product.id);
            if (!rec) continue;

            const currentPrice = Number(product.basePrice);
            const costPrice = product.costPrice ? Number(product.costPrice) : currentPrice * 0.6;
            const margin = ((currentPrice - costPrice) / currentPrice) * 100;

            // Overstock - suggest discount
            if (rec.urgency === 'OVERSTOCK' && rec.daysOfStock > 90) {
                const suggestedDiscount = Math.min(20, Math.floor((rec.daysOfStock - 90) / 30) * 5);
                suggestions.push({
                    productId: product.id,
                    productName: product.name,
                    currentPrice,
                    suggestedPrice: currentPrice * (1 - suggestedDiscount / 100),
                    reason: `Sobrestock: ${rec.daysOfStock} días de inventario`,
                    impact: `Reducir ${suggestedDiscount}% para acelerar rotación`
                });
            }

            // Low margin but high demand - can increase price
            if (margin < 20 && rec.avgDailySales > 5) {
                const suggestedIncrease = 5;
                suggestions.push({
                    productId: product.id,
                    productName: product.name,
                    currentPrice,
                    suggestedPrice: currentPrice * (1 + suggestedIncrease / 100),
                    reason: `Margen bajo (${margin.toFixed(0)}%) con alta demanda`,
                    impact: `Aumentar ${suggestedIncrease}% mantendría demanda`
                });
            }
        }

        return suggestions;
    }

    // ==================== COMPETITOR PRICING ANALYSIS ====================

    /**
     * Analyze pricing vs market (simulated competitor data)
     * In production, this would integrate with price scraping or API
     */
    async analyzeCompetitorPricing() {
        const products = await this.prisma.product.findMany({
            take: 30
        });

        const analysis: Array<{
            productId: string;
            productName: string;
            ourPrice: number;
            marketAvg: number;
            marketMin: number;
            marketMax: number;
            position: 'BELOW' | 'COMPETITIVE' | 'ABOVE';
            suggestion: string;
        }> = [];

        for (const product of products) {
            const ourPrice = Number(product.basePrice);

            // Simulated market data (in production, this comes from competitor APIs/scraping)
            // Using realistic variance based on product category
            const variance = product.category === 'PREMIUM' ? 0.15 : 0.25;
            const marketAvg = ourPrice * (0.95 + Math.random() * 0.1); // -5% to +5%
            const marketMin = marketAvg * (1 - variance);
            const marketMax = marketAvg * (1 + variance);

            let position: 'BELOW' | 'COMPETITIVE' | 'ABOVE';
            let suggestion: string;

            const diff = ((ourPrice - marketAvg) / marketAvg) * 100;

            if (diff < -10) {
                position = 'BELOW';
                suggestion = `Precio ${Math.abs(diff).toFixed(0)}% debajo del mercado. Oportunidad de subir.`;
            } else if (diff > 10) {
                position = 'ABOVE';
                suggestion = `Precio ${diff.toFixed(0)}% arriba del mercado. Evaluar competitividad.`;
            } else {
                position = 'COMPETITIVE';
                suggestion = 'Precio dentro del rango competitivo.';
            }

            analysis.push({
                productId: product.id,
                productName: product.name,
                ourPrice,
                marketAvg: Math.round(marketAvg * 100) / 100,
                marketMin: Math.round(marketMin * 100) / 100,
                marketMax: Math.round(marketMax * 100) / 100,
                position,
                suggestion
            });
        }

        return {
            analysis,
            summary: {
                belowMarket: analysis.filter(a => a.position === 'BELOW').length,
                competitive: analysis.filter(a => a.position === 'COMPETITIVE').length,
                aboveMarket: analysis.filter(a => a.position === 'ABOVE').length
            }
        };
    }

    /**
     * Get automatic price adjustment recommendations
     */
    async getAutomaticPriceAdjustments() {
        const adjustments: Array<{
            productId: string;
            productName: string;
            currentPrice: number;
            newPrice: number;
            changePercent: number;
            reason: string;
            autoApply: boolean;
        }> = [];

        // Get products with stock issues or margin problems
        const stockRecs = await this.getAllStockRecommendations();
        const competitorData = await this.analyzeCompetitorPricing();

        for (const rec of stockRecs) {
            const product = await this.prisma.product.findUnique({
                where: { id: rec.productId }
            });
            if (!product) continue;

            const currentPrice = Number(product.basePrice);
            let newPrice = currentPrice;
            let reason = '';
            let autoApply = false;

            // Critical stock - don't discount
            if (rec.urgency === 'CRITICAL') {
                continue; // Skip, don't want to increase demand for out-of-stock
            }

            // Overstock - automatic discount
            if (rec.urgency === 'OVERSTOCK' && rec.daysOfStock > 120) {
                const discountPercent = Math.min(25, Math.floor((rec.daysOfStock - 90) / 15) * 5);
                newPrice = currentPrice * (1 - discountPercent / 100);
                reason = `Sobrestock crítico (${rec.daysOfStock} días). Descuento automático.`;
                autoApply = true;
            }

            // Check competitor pricing
            const compData = competitorData.analysis.find(a => a.productId === rec.productId);
            if (compData && compData.position === 'BELOW' && rec.urgency !== 'OVERSTOCK') {
                const increasePercent = 5;
                newPrice = currentPrice * (1 + increasePercent / 100);
                reason = `Precio debajo del mercado. Ajuste automático +${increasePercent}%.`;
                autoApply = false; // Requires approval for increases
            }

            if (newPrice !== currentPrice) {
                adjustments.push({
                    productId: rec.productId,
                    productName: rec.productName,
                    currentPrice,
                    newPrice: Math.round(newPrice * 100) / 100,
                    changePercent: Math.round((newPrice / currentPrice - 1) * 100 * 10) / 10,
                    reason,
                    autoApply
                });
            }
        }

        return {
            adjustments,
            autoApplyCount: adjustments.filter(a => a.autoApply).length,
            pendingApprovalCount: adjustments.filter(a => !a.autoApply).length
        };
    }

    // ==================== AUTOMATIC PROMOTIONS ====================

    /**
     * Generate automatic promotions based on inventory and performance
     */
    async generatePromotions() {
        const promotions: Array<{
            type: 'DEADSTOCK_CLEARANCE' | 'SLOW_MOVER' | 'BUNDLE' | 'VOLUME_DISCOUNT';
            name: string;
            description: string;
            products: Array<{ productId: string; productName: string; currentStock: number }>;
            suggestedDiscount: number;
            estimatedImpact: string;
            startDate: Date;
            endDate: Date;
        }> = [];

        // Get anomalies for deadstock and slow-moving
        const anomalies = await this.detectAnomalies();
        const deadstockProducts = anomalies.filter(a => a.type === 'DEADSTOCK');
        const slowMovingProducts = anomalies.filter(a => a.type === 'SLOW_MOVING');

        // Deadstock clearance promo
        if (deadstockProducts.length > 0) {
            promotions.push({
                type: 'DEADSTOCK_CLEARANCE',
                name: 'Liquidación de Stock',
                description: 'Productos sin movimiento en 90+ días con descuentos especiales',
                products: deadstockProducts.map(p => ({
                    productId: p.productId!,
                    productName: p.productName!,
                    currentStock: p.value
                })),
                suggestedDiscount: 30,
                estimatedImpact: `Liberar $${(deadstockProducts.reduce((sum, p) => sum + p.value * 100, 0)).toLocaleString('es-AR')} en capital inmovilizado`,
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
            });
        }

        // Slow mover discounts
        if (slowMovingProducts.length >= 3) {
            promotions.push({
                type: 'SLOW_MOVER',
                name: 'Ofertas de Temporada',
                description: 'Productos seleccionados con rotación lenta',
                products: slowMovingProducts.slice(0, 10).map(p => ({
                    productId: p.productId!,
                    productName: p.productName!,
                    currentStock: p.value
                })),
                suggestedDiscount: 15,
                estimatedImpact: 'Acelerar rotación en 50%',
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });
        }

        // Bundle promotion (combine slow movers with fast movers)
        const predictions = await this.getAllPredictions();
        const fastMovers = predictions.filter(p => p.trend === 'UP').slice(0, 3);
        const slowToBundle = slowMovingProducts.slice(0, 3);

        if (fastMovers.length > 0 && slowToBundle.length > 0) {
            promotions.push({
                type: 'BUNDLE',
                name: 'Combos Especiales',
                description: 'Combina productos estrella con ofertas especiales',
                products: [
                    ...fastMovers.map(p => ({
                        productId: p.productId,
                        productName: p.productName,
                        currentStock: 0 // Will be filled
                    })),
                    ...slowToBundle.map(p => ({
                        productId: p.productId!,
                        productName: p.productName!,
                        currentStock: p.value
                    }))
                ],
                suggestedDiscount: 10,
                estimatedImpact: 'Aumentar ticket promedio 20%',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
        }

        // Volume discount for overstock
        const stockRecs = await this.getAllStockRecommendations();
        const overstockProducts = stockRecs.filter(r => r.urgency === 'OVERSTOCK').slice(0, 5);

        if (overstockProducts.length >= 2) {
            promotions.push({
                type: 'VOLUME_DISCOUNT',
                name: 'Descuento por Volumen',
                description: 'Compra más, ahorra más en productos seleccionados',
                products: overstockProducts.map(p => ({
                    productId: p.productId,
                    productName: p.productName,
                    currentStock: p.currentStock
                })),
                suggestedDiscount: 20,
                estimatedImpact: 'Reducir inventario en 40%',
                startDate: new Date(),
                endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 days
            });
        }

        return {
            promotions,
            totalProducts: promotions.reduce((sum, p) => sum + p.products.length, 0),
            avgDiscount: promotions.length > 0
                ? Math.round(promotions.reduce((sum, p) => sum + p.suggestedDiscount, 0) / promotions.length)
                : 0
        };
    }

    // ==================== MARKETING ALERTS ====================

    /**
     * Get marketing alerts for promotional opportunities
     */
    async getMarketingAlerts() {
        const alerts: Array<{
            type: 'OPPORTUNITY' | 'ACTION_REQUIRED' | 'INFO';
            priority: 'HIGH' | 'MEDIUM' | 'LOW';
            title: string;
            message: string;
            action?: string;
            data?: any;
        }> = [];

        // 1. Deadstock alert
        const anomalies = await this.detectAnomalies();
        const deadstockCount = anomalies.filter(a => a.type === 'DEADSTOCK').length;
        if (deadstockCount > 0) {
            alerts.push({
                type: 'ACTION_REQUIRED',
                priority: 'HIGH',
                title: '🚨 Productos Sin Movimiento',
                message: `${deadstockCount} productos sin ventas en 90+ días. Se recomienda campaña de liquidación.`,
                action: 'Crear promoción de liquidación',
                data: { count: deadstockCount }
            });
        }

        // 2. Trending products opportunity
        const predictions = await this.getAllPredictions();
        const trending = predictions.filter(p => p.trend === 'UP' && p.trendPercent > 20);
        if (trending.length > 0) {
            alerts.push({
                type: 'OPPORTUNITY',
                priority: 'MEDIUM',
                title: '📈 Productos en Tendencia',
                message: `${trending.length} productos con crecimiento >20%. Oportunidad para destacar en marketing.`,
                action: 'Crear campaña de productos estrella',
                data: { products: trending.slice(0, 5).map(p => p.productName) }
            });
        }

        // 3. Customer segments for targeting
        const segments = await this.prisma.customerScore.groupBy({
            by: ['segment'],
            _count: true
        });

        const atRiskCustomers = segments.find(s => s.segment === 'AT_RISK')?._count || 0;
        if (atRiskCustomers > 5) {
            alerts.push({
                type: 'ACTION_REQUIRED',
                priority: 'HIGH',
                title: '⚠️ Clientes en Riesgo',
                message: `${atRiskCustomers} clientes en riesgo de pérdida. Campaña de retención recomendada.`,
                action: 'Enviar campaña de reactivación',
                data: { count: atRiskCustomers }
            });
        }

        const championsCount = segments.find(s => s.segment === 'CHAMPIONS')?._count || 0;
        if (championsCount > 0) {
            alerts.push({
                type: 'OPPORTUNITY',
                priority: 'LOW',
                title: '🏆 Clientes VIP',
                message: `${championsCount} clientes campeones. Oportunidad para programa de referidos.`,
                action: 'Lanzar programa de referidos',
                data: { count: championsCount }
            });
        }

        // 4. Seasonal opportunity (simulated)
        const month = new Date().getMonth();
        if (month === 11 || month === 0) { // December or January
            alerts.push({
                type: 'INFO',
                priority: 'MEDIUM',
                title: '🎄 Temporada Alta',
                message: 'Temporada de fiestas. Preparar stock y promociones especiales.',
                action: 'Revisar inventario para fiestas'
            });
        }

        return {
            alerts: alerts.sort((a, b) => {
                const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }),
            summary: {
                actionRequired: alerts.filter(a => a.type === 'ACTION_REQUIRED').length,
                opportunities: alerts.filter(a => a.type === 'OPPORTUNITY').length,
                info: alerts.filter(a => a.type === 'INFO').length
            }
        };
    }
}
