import { Injectable, OnModuleInit, Inject, forwardRef, Optional } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { AiService } from '../ai/ai.service';
import { ProductsService } from '../products/products.service';
import { PrismaService } from '../prisma.service';
import { WholesaleBotService } from '../wholesale/wholesale-bot.service';

@Injectable()
export class BotService implements OnModuleInit {
    private bot: Telegraf;

    constructor(
        @Inject(forwardRef(() => AiService))
        private readonly aiService: AiService,
        private readonly productsService: ProductsService,
        private readonly prisma: PrismaService,
        @Optional() private readonly wholesaleBotService?: WholesaleBotService,
    ) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token) {
            this.bot = new Telegraf(token);
            this.initializeBot();

            // Register wholesale commands if service available
            if (this.wholesaleBotService) {
                this.wholesaleBotService.registerCommands(this.bot);
            }
        } else {
            console.warn('TELEGRAM_BOT_TOKEN not found. Bot service disabled.');
        }
    }

    onModuleInit() {
        if (this.bot) {
            this.bot.launch().then(() => {
                console.log('Telegram Bot launched');

                // Schedule periodic B2B alerts (every 6 hours)
                if (this.wholesaleBotService) {
                    setInterval(() => {
                        this.wholesaleBotService?.checkAndSendAlerts(this.bot);
                    }, 6 * 60 * 60 * 1000);
                }
            }).catch((err) => {
                console.error('Failed to launch Telegram Bot', err);
            });
        }
    }


    private initializeBot() {
        // Middleware: Auth Check
        this.bot.use(async (ctx, next) => {
            if (!ctx.from) return;

            const user = await this.prisma.user.findUnique({
                where: { telegramId: ctx.from.id.toString() }
            });

            if (!user) {
                await ctx.reply(`⛔ Unauthorized. Your ID is: ${ctx.from.id}\nSend this ID to the system administrator to link your account.`);
                return;
            }

            return next();
        });

        // Command: /start
        this.bot.start((ctx) => ctx.reply(`👋 Hola! Soy Trento Bot.\nEstoy conectado al sistema ERP.\n\nComandos:\n/stock [producto] - Consultar stock\n/sales - Ventas de hoy\n\nO preguntame lo que quieras con lenguaje natural.`));

        // Command: /stock
        this.bot.command('stock', async (ctx) => {
            const query = ctx.message.text.split(' ').slice(1).join(' ');
            if (!query) return ctx.reply('⚠️ Por favor indicá un producto. Ej: /stock coca');

            const products = await this.productsService.findByName(query);
            if (products.length === 0) return ctx.reply('No encontré productos.');

            const response = products.slice(0, 5).map(p =>
                `📦 *${p.name}*\nStock: ${p.currentStock} u.\nPrecio: $${p.basePrice}`
            ).join('\n\n');

            ctx.replyWithMarkdown(response);
        });

        // Command: /sales (Mockup for now, real implementation would inject SalesService)
        this.bot.command('sales', async (ctx) => {
            // In a real scenario, inject SalesService and call getDailyStats()
            // For now, we'll just check today's sales count via Prisma directly for speed
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const count = await this.prisma.sale.count({
                where: { createdAt: { gte: startOfDay } }
            });

            ctx.reply(`💰 *Ventas de Hoy*\nCantidad de Oros: ${count}\n(Detalle completo próximamente)`);
        });

        // Default: AI Chat (with quotation creation detection)
        this.bot.on('text', async (ctx) => {
            const query = ctx.message.text;

            // Check if this is a quotation creation request
            if (this.aiService.isQuotationRequest(query)) {
                await this.handleQuotationCreation(ctx, query);
                return;
            }

            // Use existing AI Service for general chat
            const aiResponse = await this.aiService.processQuery(query);

            if (aiResponse.text) {
                ctx.replyWithMarkdown(aiResponse.text);
            } else {
                ctx.reply("🤔 No estoy seguro de cómo responder a eso.");
            }
        });

        // Action: Restock
        this.bot.action(/^restock:(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            // Here we would call PurchaseService.createDraft({ productId, quantity: 50 })
            // For now, mockup:
            const product = await this.productsService.findById(productId);
            if (product) {
                await ctx.reply(`📝 **Orden de Compra Borrador Creada**\nProducto: ${product.name}\nCantidad: 50 u.\nProveedor: (Default)`);
                await ctx.answerCbQuery("Orden creada ✅");
            } else {
                await ctx.reply("❌ Producto no encontrado.");
                await ctx.answerCbQuery("Error ❌");
            }
        });

        // Error Handling
        this.bot.catch((err, ctx) => {
            console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
        });
    }
    async sendAlert(message: string, options?: any) {
        if (!this.bot) return;

        try {
            // Find all admins with telegram ID
            const admins = await this.prisma.user.findMany({
                where: {
                    role: 'ADMIN',
                    telegramId: { not: null }
                }
            });

            for (const admin of admins) {
                if (admin.telegramId) {
                    await this.bot.telegram.sendMessage(admin.telegramId, `🚨 *ALERTA TRENTO*\n${message}`, {
                        parse_mode: 'Markdown',
                        ...options
                    }).catch(e => console.error(`Failed to send alert to ${admin.telegramId}`, e));
                }
            }
        } catch (error) {
            console.error('Error sending alert broadcast', error);
        }
    }

    /**
     * Handle quotation creation from natural language
     */
    private async handleQuotationCreation(ctx: Context, query: string) {
        try {
            await ctx.reply('⏳ Procesando tu pedido...');

            // 1. Parse the request using AI
            const parsed = await this.aiService.parseQuotationRequest(query);

            if (!parsed.success || !parsed.customerName || !parsed.items) {
                await ctx.reply(`❌ ${parsed.error || 'No pude interpretar el pedido'}.\n\nEjemplo: "Crea presupuesto para SUCHT: 1 coca cola, 2 fernet branca"`);
                return;
            }

            // 2. Find the customer
            const customer = await this.prisma.customer.findFirst({
                where: {
                    OR: [
                        { name: { contains: parsed.customerName, mode: 'insensitive' } },
                        { businessName: { contains: parsed.customerName, mode: 'insensitive' } }
                    ]
                }
            });

            if (!customer) {
                await ctx.reply(`❌ No encontré un cliente con nombre "${parsed.customerName}".\n\nVerificá el nombre e intentá de nuevo.`);
                return;
            }

            // 3. Find products and build items
            const quotationItems: { productId: string; quantity: number; unitPrice: number; productName: string }[] = [];
            const notFound: string[] = [];
            const ambiguous: { searchTerm: string; options: string[] }[] = [];

            for (const item of parsed.items) {
                const products = await this.productsService.findByName(item.productName);

                if (products.length === 0) {
                    notFound.push(item.productName);
                    continue;
                }

                // Check for exact match first (case insensitive)
                const exactMatch = products.find(p =>
                    p.name.toLowerCase() === item.productName.toLowerCase()
                );

                if (exactMatch) {
                    quotationItems.push({
                        productId: exactMatch.id,
                        quantity: item.quantity || 1,
                        unitPrice: Number(exactMatch.basePrice),
                        productName: exactMatch.name
                    });
                    continue;
                }

                // If multiple similar products, check if one is clearly the best match
                if (products.length === 1) {
                    quotationItems.push({
                        productId: products[0].id,
                        quantity: item.quantity || 1,
                        unitPrice: Number(products[0].basePrice),
                        productName: products[0].name
                    });
                } else if (products.length <= 5) {
                    // Multiple options - add to ambiguous list
                    ambiguous.push({
                        searchTerm: item.productName,
                        options: products.slice(0, 5).map(p => p.name)
                    });
                    // Still add the first one as best guess
                    quotationItems.push({
                        productId: products[0].id,
                        quantity: item.quantity || 1,
                        unitPrice: Number(products[0].basePrice),
                        productName: products[0].name
                    });
                } else {
                    // Too many matches, take first
                    quotationItems.push({
                        productId: products[0].id,
                        quantity: item.quantity || 1,
                        unitPrice: Number(products[0].basePrice),
                        productName: products[0].name
                    });
                }
            }

            if (quotationItems.length === 0) {
                await ctx.reply(`❌ No encontré ningún producto.\n\nProductos buscados: ${parsed.items.map(i => i.productName).join(', ')}`);
                return;
            }

            // 4. Create the quotation
            const code = await this.generateQuotationCode();
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 15);

            const subtotal = quotationItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
            const taxAmount = 0; // Sin IVA por defecto
            const total = subtotal; // Total = subtotal (sin IVA)

            const quotation = await this.prisma.quotation.create({
                data: {
                    code,
                    customerId: customer.id,
                    status: 'DRAFT',
                    validUntil,
                    subtotal,
                    taxAmount,
                    total,
                    items: {
                        create: quotationItems.map(item => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: 0,
                            totalPrice: item.unitPrice * item.quantity
                        }))
                    }
                }
            });

            // 5. Build response message
            let message = `✅ *Presupuesto ${code} creado*\n\n`;
            message += `👤 Cliente: *${customer.businessName || customer.name}*\n\n`;
            message += `📦 *Items:*\n`;

            for (const item of quotationItems) {
                message += `  • ${item.quantity}x ${item.productName}: $${(item.unitPrice * item.quantity).toLocaleString()}\n`;
            }

            message += `\n💰 *Total:* $${total.toLocaleString()}\n`;
            message += `_(Sin IVA - agregar si corresponde)_\n`;

            if (notFound.length > 0) {
                message += `\n⚠️ No encontré: ${notFound.join(', ')}`;
            }

            if (ambiguous.length > 0) {
                message += `\n\n💡 *Nota:* Encontré varios productos similares.\nUsé el primero, pero podés ser más específico:\n`;
                for (const amb of ambiguous) {
                    message += `  "${amb.searchTerm}" → Opciones: ${amb.options.join(', ')}\n`;
                }
            }

            // Get the base URL from environment or use default
            const baseUrl = process.env.APP_URL || 'http://54.233.198.194';
            message += `\n\n📄 [Descargar PDF](${baseUrl}/api/wholesale/pdf/quotation/${quotation.id}/download)`;

            await ctx.replyWithMarkdown(message);

        } catch (error) {
            console.error('Quotation Creation Error:', error);
            await ctx.reply('❌ Hubo un error al crear el presupuesto. Por favor intentá de nuevo.');
        }
    }

    /**
     * Generate next quotation code
     */
    private async generateQuotationCode(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `PRES-${year}-`;

        const last = await this.prisma.quotation.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' }
        });

        let nextNum = 1;
        if (last?.code) {
            const match = last.code.match(/(\d+)$/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }

        return `${prefix}${nextNum.toString().padStart(5, '0')}`;
    }
}
