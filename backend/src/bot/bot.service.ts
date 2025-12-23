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

        // Default: AI Chat
        this.bot.on('text', async (ctx) => {
            const query = ctx.message.text;

            // Use existing AI Service
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
}
