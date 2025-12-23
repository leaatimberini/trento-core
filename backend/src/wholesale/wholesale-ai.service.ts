import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface CustomerRiskAnalysis {
    customerId: string;
    customerName: string;
    businessName?: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number; // 0-100
    alerts: string[];
    recommendations: string[];
    metrics: {
        daysSinceLastOrder: number;
        averageOrderFrequencyDays: number;
        frequencyChange: number; // % change from historical average
        totalOrders: number;
        totalSpent: number;
        openConsignments: number;
        openConsignmentDays: number;
        creditUsagePercent: number;
        returnRate: number;
    };
}

export interface WholesaleInsight {
    type: 'warning' | 'opportunity' | 'info';
    title: string;
    description: string;
    customerId?: string;
    actionRequired: boolean;
}

@Injectable()
export class WholesaleAiService {
    private readonly logger = new Logger(WholesaleAiService.name);
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private prisma: PrismaService) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        }
    }

    /**
     * Analyze risk for a specific wholesale customer
     */
    async analyzeCustomerRisk(customerId: string): Promise<CustomerRiskAnalysis> {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                sales: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    select: { id: true, totalAmount: true, createdAt: true }
                },
                consignments: {
                    where: { status: { not: 'CLOSED' } },
                    include: { items: true }
                }
            }
        });

        if (!customer) {
            throw new Error('Customer not found');
        }

        // Calculate metrics
        const now = new Date();
        const sales = customer.sales || [];

        // Days since last order
        const lastOrder = sales[0];
        const daysSinceLastOrder = lastOrder
            ? Math.floor((now.getTime() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        // Average order frequency
        let avgFrequency = 30; // default 30 days
        if (sales.length >= 2) {
            const intervals = [];
            for (let i = 1; i < sales.length; i++) {
                const diff = new Date(sales[i - 1].createdAt).getTime() - new Date(sales[i].createdAt).getTime();
                intervals.push(diff / (1000 * 60 * 60 * 24));
            }
            avgFrequency = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        }

        // Frequency change
        const frequencyChange = daysSinceLastOrder > avgFrequency
            ? ((daysSinceLastOrder - avgFrequency) / avgFrequency) * 100
            : 0;

        // Total spent
        const totalSpent = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        // Open consignments
        const openConsignments = customer.consignments?.length || 0;
        const oldestConsignment = customer.consignments?.[0];
        const openConsignmentDays = oldestConsignment
            ? Math.floor((now.getTime() - new Date(oldestConsignment.deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        // Credit usage
        const creditLimit = Number(customer.creditLimit || 0);
        const creditUsed = Number(customer.creditUsed || 0);
        const creditUsagePercent = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;

        // Calculate risk score and level
        let riskScore = 0;
        const alerts: string[] = [];
        const recommendations: string[] = [];

        // Factor: Days since last order vs average
        if (daysSinceLastOrder > avgFrequency * 2) {
            riskScore += 30;
            alerts.push(`⚠️ Sin pedidos hace ${daysSinceLastOrder} días (promedio: ${Math.round(avgFrequency)} días)`);
            recommendations.push('Contactar al cliente para conocer su situación');
        } else if (daysSinceLastOrder > avgFrequency * 1.5) {
            riskScore += 15;
            alerts.push(`📉 Actividad reducida: ${daysSinceLastOrder} días sin pedido`);
            recommendations.push('Enviar catálogo de novedades o promoción especial');
        }

        // Factor: Open consignments
        if (openConsignmentDays > 60) {
            riskScore += 25;
            alerts.push(`🚨 Consignación abierta hace ${openConsignmentDays} días sin movimiento`);
            recommendations.push('Revisar consignaciones pendientes y contactar para facturar o devolver');
        } else if (openConsignmentDays > 30) {
            riskScore += 10;
            alerts.push(`📦 ${openConsignments} consignación(es) abierta(s) hace más de 30 días`);
        }

        // Factor: Credit usage
        if (creditUsagePercent > 90) {
            riskScore += 20;
            alerts.push(`💳 Crédito al ${creditUsagePercent.toFixed(0)}% de utilización`);
            recommendations.push('Gestionar cobro de facturas pendientes');
        } else if (creditUsagePercent > 70) {
            riskScore += 10;
            alerts.push(`💵 Crédito utilizado: ${creditUsagePercent.toFixed(0)}%`);
        }

        // Factor: Order volume trend (if decreasing)
        if (sales.length >= 6) {
            const recentTotal = sales.slice(0, 3).reduce((s, o) => s + Number(o.totalAmount), 0);
            const previousTotal = sales.slice(3, 6).reduce((s, o) => s + Number(o.totalAmount), 0);
            if (previousTotal > 0 && recentTotal < previousTotal * 0.7) {
                riskScore += 15;
                alerts.push('📉 Volumen de compras en descenso (>30% menos)');
                recommendations.push('Evaluar si hay insatisfacción con productos o servicio');
            }
        }

        // Determine risk level
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (riskScore >= 60) {
            riskLevel = 'CRITICAL';
        } else if (riskScore >= 40) {
            riskLevel = 'HIGH';
        } else if (riskScore >= 20) {
            riskLevel = 'MEDIUM';
        } else {
            riskLevel = 'LOW';
        }

        // Add general recommendations based on level
        if (riskLevel === 'LOW' && totalSpent > 100000) {
            recommendations.push('Cliente valioso - considerar programa de fidelización VIP');
        }

        return {
            customerId: customer.id,
            customerName: customer.name,
            businessName: customer.businessName || undefined,
            riskLevel,
            riskScore: Math.min(100, riskScore),
            alerts,
            recommendations,
            metrics: {
                daysSinceLastOrder,
                averageOrderFrequencyDays: Math.round(avgFrequency),
                frequencyChange: Math.round(frequencyChange),
                totalOrders: sales.length,
                totalSpent,
                openConsignments,
                openConsignmentDays,
                creditUsagePercent: Math.round(creditUsagePercent),
                returnRate: 0 // TODO: calculate from returns
            }
        };
    }

    /**
     * Get all customers at risk
     */
    async getAtRiskCustomers(): Promise<CustomerRiskAnalysis[]> {
        const customers = await this.prisma.customer.findMany({
            where: { type: 'WHOLESALE' },
            select: { id: true }
        });

        const analyses: CustomerRiskAnalysis[] = [];

        for (const customer of customers) {
            try {
                const analysis = await this.analyzeCustomerRisk(customer.id);
                if (analysis.riskLevel !== 'LOW') {
                    analyses.push(analysis);
                }
            } catch (e) {
                this.logger.error(`Error analyzing customer ${customer.id}: ${e.message}`);
            }
        }

        // Sort by risk score descending
        return analyses.sort((a, b) => b.riskScore - a.riskScore);
    }

    /**
     * Get stale consignments (no activity for X days)
     */
    async getStaleConsignments(days: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.prisma.consignmentSale.findMany({
            where: {
                status: { not: 'CLOSED' },
                updatedAt: { lt: cutoffDate }
            },
            include: {
                customer: { select: { id: true, name: true, businessName: true, phone: true, email: true } },
                items: true
            },
            orderBy: { deliveredAt: 'asc' }
        });
    }

    /**
     * Generate AI-powered recommendations for a customer
     */
    async generateRecommendations(customerId: string): Promise<string[]> {
        const analysis = await this.analyzeCustomerRisk(customerId);

        // Get customer's purchase history
        const recentPurchases = await this.prisma.sale.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                items: { include: { product: { select: { name: true, category: true } } } }
            }
        });

        // Extract product categories purchased
        const categories = new Set<string>();
        recentPurchases.forEach(sale => {
            sale.items.forEach(item => {
                if (item.product?.category) categories.add(item.product.category);
            });
        });

        // If Gemini is available, get AI recommendations
        if (this.model && analysis.riskLevel !== 'LOW') {
            try {
                const prompt = `
                    Eres un asistente de ventas B2B para una distribuidora de yerba mate y productos regionales.
                    
                    Analiza este cliente mayorista:
                    - Nivel de riesgo: ${analysis.riskLevel}
                    - Días sin comprar: ${analysis.metrics.daysSinceLastOrder}
                    - Promedio de compra cada ${analysis.metrics.averageOrderFrequencyDays} días
                    - Consignaciones abiertas: ${analysis.metrics.openConsignments}
                    - Uso de crédito: ${analysis.metrics.creditUsagePercent}%
                    - Categorías que compra: ${Array.from(categories).join(', ') || 'No disponible'}
                    
                    Dame 3 recomendaciones comerciales específicas y accionables para retener a este cliente.
                    Formato: Lista simple, una por línea, sin números ni viñetas.
                `;

                const result = await this.model.generateContent(prompt);
                const text = result.response.text();
                const aiRecommendations = text.split('\n').filter((r: string) => r.trim().length > 10);

                return [...analysis.recommendations, ...aiRecommendations.slice(0, 3)];
            } catch (e) {
                this.logger.warn('Gemini unavailable, using rule-based recommendations');
            }
        }

        return analysis.recommendations;
    }

    /**
     * Get wholesale dashboard insights
     */
    async getWholesaleInsights(): Promise<WholesaleInsight[]> {
        const insights: WholesaleInsight[] = [];

        // Check for stale consignments
        const staleConsignments = await this.getStaleConsignments(30);
        if (staleConsignments.length > 0) {
            insights.push({
                type: 'warning',
                title: `${staleConsignments.length} consignación(es) sin actividad`,
                description: `Hay consignaciones abiertas hace más de 30 días sin facturar ni devolver.`,
                actionRequired: true
            });
        }

        // Check for high-risk customers
        const atRiskCustomers = await this.getAtRiskCustomers();
        const criticalCount = atRiskCustomers.filter(c => c.riskLevel === 'CRITICAL').length;
        const highCount = atRiskCustomers.filter(c => c.riskLevel === 'HIGH').length;

        if (criticalCount > 0) {
            insights.push({
                type: 'warning',
                title: `${criticalCount} cliente(s) en riesgo CRÍTICO`,
                description: 'Clientes con alta probabilidad de pérdida. Requieren atención inmediata.',
                actionRequired: true
            });
        }

        if (highCount > 0) {
            insights.push({
                type: 'warning',
                title: `${highCount} cliente(s) en riesgo ALTO`,
                description: 'Clientes con señales de alerta. Se recomienda contacto comercial.',
                actionRequired: true
            });
        }

        // Check for credit issues
        const highCreditCustomers = await this.prisma.customer.findMany({
            where: {
                type: 'WHOLESALE',
                creditLimit: { not: null }
            },
            select: { id: true, name: true, creditLimit: true, creditUsed: true }
        });

        const creditAlerts = highCreditCustomers.filter(c => {
            const usage = Number(c.creditUsed) / Number(c.creditLimit);
            return usage >= 0.9;
        });

        if (creditAlerts.length > 0) {
            insights.push({
                type: 'warning',
                title: `${creditAlerts.length} cliente(s) con crédito al límite`,
                description: 'Clientes con más del 90% del crédito utilizado.',
                actionRequired: true
            });
        }

        // Opportunities
        const activeCustomers = await this.prisma.customer.count({
            where: { type: 'WHOLESALE', relationStatus: 'ACTIVE' }
        });

        const thisMonthSales = await this.prisma.sale.aggregate({
            where: {
                channel: 'B2B',
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            },
            _sum: { totalAmount: true },
            _count: true
        });

        insights.push({
            type: 'info',
            title: 'Resumen del mes B2B',
            description: `${activeCustomers} clientes activos | ${thisMonthSales._count} ventas | $${Number(thisMonthSales._sum.totalAmount || 0).toLocaleString()}`,
            actionRequired: false
        });

        return insights;
    }

    /**
     * Get summary statistics for wholesale module
     */
    async getWholesaleStats() {
        const [
            customerCount,
            quotationStats,
            consignmentStats,
            monthlySales
        ] = await Promise.all([
            // Customer counts by status
            this.prisma.customer.groupBy({
                by: ['relationStatus'],
                where: { type: 'WHOLESALE' },
                _count: true
            }),
            // Quotation stats
            this.prisma.quotation.groupBy({
                by: ['status'],
                _count: true,
                _sum: { total: true }
            }),
            // Consignment stats
            this.prisma.consignmentSale.groupBy({
                by: ['status'],
                _count: true,
                _sum: { totalValue: true, invoicedValue: true }
            }),
            // Monthly B2B sales
            this.prisma.sale.aggregate({
                where: {
                    channel: 'B2B',
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                },
                _sum: { totalAmount: true },
                _count: true
            })
        ]);

        return {
            customers: {
                byStatus: customerCount.map(c => ({
                    status: c.relationStatus,
                    count: c._count
                })),
                total: customerCount.reduce((sum, c) => sum + c._count, 0)
            },
            quotations: {
                byStatus: quotationStats.map(q => ({
                    status: q.status,
                    count: q._count,
                    totalValue: Number(q._sum.total || 0)
                })),
                total: quotationStats.reduce((sum, q) => sum + q._count, 0)
            },
            consignments: {
                byStatus: consignmentStats.map(c => ({
                    status: c.status,
                    count: c._count,
                    totalValue: Number(c._sum.totalValue || 0),
                    invoicedValue: Number(c._sum.invoicedValue || 0)
                })),
                openValue: consignmentStats
                    .filter(c => c.status !== 'CLOSED')
                    .reduce((sum, c) => sum + Number(c._sum.totalValue || 0) - Number(c._sum.invoicedValue || 0), 0)
            },
            monthlySales: {
                count: monthlySales._count,
                total: Number(monthlySales._sum.totalAmount || 0)
            }
        };
    }
}
