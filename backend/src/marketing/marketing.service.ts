
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CampaignSuggestion {
    type: 'PROMO' | 'STOCK_CLEARANCE' | 'NEW_PRODUCTS' | 'SEASONAL';
    targetSegment: string;
    suggestedSubject: string;
    suggestedContent: string;
    products: Array<{ id: string; name: string; price: number; reason: string }>;
    confidence: number;
}

export interface EmailContent {
    subject: string;
    preheader: string;
    htmlContent: string;
    plainText: string;
}

@Injectable()
export class MarketingService {
    private readonly logger = new Logger(MarketingService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== AI-POWERED CAMPAIGN GENERATION ====================

    /**
     * Analyzes business data and suggests optimal campaign strategies
     */
    async generateCampaignSuggestions(): Promise<CampaignSuggestion[]> {
        const suggestions: CampaignSuggestion[] = [];

        // 1. Check for low stock products that need promotion to clear
        const lowStockProducts = await this.getProductsForClearance();
        if (lowStockProducts.length > 0) {
            suggestions.push({
                type: 'STOCK_CLEARANCE',
                targetSegment: 'ALL',
                suggestedSubject: '🔥 ¡Últimas Unidades! Ofertas Imperdibles',
                suggestedContent: this.generateClearanceContent(lowStockProducts),
                products: lowStockProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.basePrice),
                    reason: 'Stock bajo - liquidación'
                })),
                confidence: 0.85
            });
        }

        // 2. Top selling products for VIP customers
        const topProducts = await this.getTopSellingProducts();
        if (topProducts.length > 0) {
            suggestions.push({
                type: 'PROMO',
                targetSegment: 'VIP',
                suggestedSubject: '⭐ Exclusivo VIP: Los Más Vendidos con Descuento',
                suggestedContent: this.generateVIPContent(topProducts),
                products: topProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.basePrice),
                    reason: 'Producto popular - alto volumen'
                })),
                confidence: 0.9
            });
        }

        // 3. New products for engagement
        const newProducts = await this.getNewProducts();
        if (newProducts.length > 0) {
            suggestions.push({
                type: 'NEW_PRODUCTS',
                targetSegment: 'ALL',
                suggestedSubject: '🆕 ¡Recién Llegados! Descubrí lo Nuevo',
                suggestedContent: this.generateNewProductsContent(newProducts),
                products: newProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.basePrice),
                    reason: 'Producto nuevo'
                })),
                confidence: 0.75
            });
        }

        // 4. Re-engagement for inactive customers
        suggestions.push({
            type: 'SEASONAL',
            targetSegment: 'INACTIVE',
            suggestedSubject: '😢 ¡Te Extrañamos! Volvé con 15% OFF',
            suggestedContent: this.generateReengagementContent(),
            products: [],
            confidence: 0.7
        });

        return suggestions;
    }

    /**
     * Generates complete email content with AI-powered copywriting
     */
    async generateEmailContent(params: {
        campaignType: 'PROMO' | 'STOCK_CLEARANCE' | 'NEW_PRODUCTS' | 'SEASONAL' | 'CUSTOM';
        segment: string;
        productIds?: string[];
        customPrompt?: string;
        discountPercent?: number;
    }): Promise<EmailContent> {
        const { campaignType, segment, productIds, discountPercent } = params;

        // Fetch products if specified
        let products: any[] = [];
        if (productIds && productIds.length > 0) {
            products = await this.prisma.product.findMany({
                where: { id: { in: productIds } }
            });
        }

        // Generate content based on type
        let subject = '';
        let preheader = '';
        let bodyContent = '';

        switch (campaignType) {
            case 'PROMO':
                subject = `🎉 ¡${discountPercent || 20}% OFF en tus favoritos!`;
                preheader = 'Aprovechá esta oferta exclusiva por tiempo limitado';
                bodyContent = this.buildPromoEmail(products, discountPercent || 20, segment);
                break;

            case 'STOCK_CLEARANCE':
                subject = '🔥 ¡Liquidación! Últimas unidades disponibles';
                preheader = 'Precios increíbles solo por esta semana';
                bodyContent = this.buildClearanceEmail(products);
                break;

            case 'NEW_PRODUCTS':
                subject = '🆕 ¡Mirá lo que llegó! Nuevos productos';
                preheader = 'Sé el primero en descubrir nuestras novedades';
                bodyContent = this.buildNewProductsEmail(products);
                break;

            case 'SEASONAL':
                subject = '🌟 ¡Te extrañamos! Volvé con descuento especial';
                preheader = 'Tenemos algo especial para vos';
                bodyContent = this.buildReengagementEmail(discountPercent || 15);
                break;

            default:
                subject = '📬 Novedades de Trento Bebidas';
                preheader = 'Descubrí las últimas ofertas';
                bodyContent = this.buildGenericEmail(products);
        }

        return {
            subject,
            preheader,
            htmlContent: this.wrapInEmailTemplate(bodyContent, subject),
            plainText: this.htmlToPlainText(bodyContent)
        };
    }

    // ==================== DATA FETCHERS ====================

    private async getProductsForClearance() {
        // Find products with low inventory that should be promoted
        const inventoryItems = await this.prisma.inventoryItem.findMany({
            where: {
                quantity: { gt: 0, lt: 20 } // Some stock but low
            },
            include: { product: true },
            orderBy: { quantity: 'asc' },
            take: 5
        });

        return inventoryItems.map(i => i.product);
    }

    private async getTopSellingProducts() {
        // Get best sellers from recent sales
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const topSales = await this.prisma.saleItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        if (topSales.length === 0) return [];

        const productIds = topSales.map(s => s.productId);
        return this.prisma.product.findMany({
            where: { id: { in: productIds } }
        });
    }

    private async getNewProducts() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return this.prisma.product.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
    }

    // ==================== CONTENT GENERATORS ====================

    private generateClearanceContent(products: any[]): string {
        const productList = products.slice(0, 3).map(p =>
            `• ${p.name} - $${Number(p.basePrice).toLocaleString()}`
        ).join('\n');

        return `¡Atención! Estamos liquidando stock y no queremos que te lo pierdas.

${productList}

⚡ Stock limitado - ¡Aprovechá ahora!

Estas ofertas son por tiempo limitado y hasta agotar stock.
¡No te quedes sin tu favorito!`;
    }

    private generateVIPContent(products: any[]): string {
        const productList = products.slice(0, 3).map(p =>
            `★ ${p.name} - $${Number(p.basePrice).toLocaleString()}`
        ).join('\n');

        return `Como cliente VIP, tenés acceso exclusivo a nuestras mejores ofertas.

Los productos más pedidos del mes:
${productList}

🎁 Comprá hoy y llevate un 10% extra de descuento
Usá el código: VIP10

¡Gracias por ser parte de nuestra familia!`;
    }

    private generateNewProductsContent(products: any[]): string {
        const productList = products.slice(0, 3).map(p =>
            `🆕 ${p.name}`
        ).join('\n');

        return `¡Mirá lo que acaba de llegar!

Nuevos productos disponibles:
${productList}

Sé el primero en probarlos. Stock limitado en lanzamiento.

¡Te esperamos!`;
    }

    private generateReengagementContent(): string {
        return `¡Hola! Hace tiempo que no nos visitás y te extrañamos.

Queremos que vuelvas, por eso te regalamos un 15% de descuento en tu próxima compra.

🎁 Código: VUELVE15
📅 Válido por 7 días

¿Qué esperás? Entrá y descubrí las novedades.

¡Te esperamos pronto!`;
    }

    // ==================== EMAIL BUILDERS ====================

    private buildPromoEmail(products: any[], discount: number, segment: string): string {
        const greeting = segment === 'VIP' ? '¡Hola Cliente VIP!' : '¡Hola!';
        const productSection = products.length > 0 ?
            `<h3 style="color: #f59e0b;">Productos en Oferta:</h3>
            <ul>
            ${products.map(p => `<li><strong>${p.name}</strong> - <s>$${Number(p.basePrice).toLocaleString()}</s> 
            <span style="color: #10b981; font-weight: bold;">$${Math.round(Number(p.basePrice) * (1 - discount / 100)).toLocaleString()}</span></li>`).join('')}
            </ul>` : '';

        return `
            <h2 style="color: #1f2937;">${greeting}</h2>
            <p>Tenemos una oferta especial para vos: <strong>${discount}% de descuento</strong> en productos seleccionados.</p>
            ${productSection}
            <p style="margin-top: 20px;">
                <a href="#" style="background: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Ver Ofertas →
                </a>
            </p>
        `;
    }

    private buildClearanceEmail(products: any[]): string {
        const productCards = products.map(p => `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 10px 0;">
                <strong>${p.name}</strong><br>
                <span style="color: #dc2626; font-weight: bold;">¡Últimas unidades!</span><br>
                <span style="font-size: 18px; color: #059669;">$${Number(p.basePrice).toLocaleString()}</span>
            </div>
        `).join('');

        return `
            <h2 style="color: #dc2626;">🔥 ¡Liquidación de Stock!</h2>
            <p>Estamos haciendo espacio para nuevos productos. ¡Aprovechá estos precios únicos!</p>
            ${productCards}
            <p style="margin-top: 20px; text-align: center;">
                <a href="#" style="background: #dc2626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Comprar Ahora
                </a>
            </p>
        `;
    }

    private buildNewProductsEmail(products: any[]): string {
        const productCards = products.map(p => `
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 10px 0;">
                <span style="background: #10b981; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">NUEVO</span><br>
                <strong style="font-size: 16px;">${p.name}</strong><br>
                <span style="color: #6b7280;">${p.category || 'Bebidas'}</span><br>
                <span style="font-size: 18px; font-weight: bold;">$${Number(p.basePrice).toLocaleString()}</span>
            </div>
        `).join('');

        return `
            <h2 style="color: #1f2937;">🆕 ¡Recién Llegados!</h2>
            <p>Descubrí los nuevos productos que tenemos para vos:</p>
            ${productCards}
            <p style="margin-top: 20px; text-align: center;">
                <a href="#" style="background: #10b981; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Ver Todos los Nuevos Productos
                </a>
            </p>
        `;
    }

    private buildReengagementEmail(discount: number): string {
        return `
            <h2 style="color: #1f2937;">😢 ¡Te Extrañamos!</h2>
            <p>Hace tiempo que no pasás por nuestra tienda y queremos que vuelvas.</p>
            <div style="background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0;">
                <p style="color: #000; margin: 0; font-size: 14px;">Tu descuento especial:</p>
                <p style="color: #000; font-size: 48px; font-weight: bold; margin: 10px 0;">${discount}% OFF</p>
                <p style="background: #000; color: #fbbf24; padding: 10px 20px; display: inline-block; border-radius: 6px; font-family: monospace; font-size: 20px;">VUELVE${discount}</p>
            </div>
            <p style="text-align: center; color: #6b7280; font-size: 14px;">Válido por 7 días. No acumulable con otras promociones.</p>
            <p style="margin-top: 20px; text-align: center;">
                <a href="#" style="background: #1f2937; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Volver a Comprar
                </a>
            </p>
        `;
    }

    private buildGenericEmail(products: any[]): string {
        return `
            <h2 style="color: #1f2937;">¡Hola!</h2>
            <p>Tenemos novedades que te van a interesar. Pasá por nuestra tienda y descubrí las últimas ofertas.</p>
            <p style="margin-top: 20px; text-align: center;">
                <a href="#" style="background: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Ver Catálogo
                </a>
            </p>
        `;
    }

    private wrapInEmailTemplate(content: string, title: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1f2937, #374151); padding: 30px; text-align: center;">
                            <h1 style="color: #fbbf24; margin: 0; font-size: 28px;">Trento Bebidas</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} Trento Bebidas. Todos los derechos reservados.<br>
                                <a href="#" style="color: #6b7280;">Desuscribirse</a> | <a href="#" style="color: #6b7280;">Preferencias</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    private htmlToPlainText(html: string): string {
        return html
            .replace(/<style[^>]*>.*<\/style>/gm, '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ==================== ORIGINAL METHODS ====================

    async sendCampaign(segment: string, subject: string, content: string) {
        const recipientCount = await this.getRecipientCount(segment);
        this.logger.log(`[Marketing] Sending campaign "${subject}" to ${recipientCount} users.`);

        return this.prisma.campaign.create({
            data: {
                segment,
                subject,
                content,
                recipientCount,
                status: 'COMPLETED'
            }
        });
    }

    async getCampaigns() {
        return this.prisma.campaign.findMany({
            orderBy: { sentAt: 'desc' }
        });
    }

    private async getRecipientCount(segment: string): Promise<number> {
        switch (segment) {
            case 'ALL':
                return this.prisma.customer.count();
            case 'VIP':
                return this.prisma.customer.count({ where: { type: 'WHOLESALE' } });
            case 'INACTIVE':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return this.prisma.customer.count({
                    where: {
                        sales: { none: { createdAt: { gte: thirtyDaysAgo } } }
                    }
                });
            case 'NEW':
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return this.prisma.customer.count({
                    where: { createdAt: { gte: sevenDaysAgo } }
                });
            default:
                return 0;
        }
    }
}
