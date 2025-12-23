import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WholesaleAiService } from './wholesale-ai.service';
import { Telegraf, Context, Markup } from 'telegraf';

@Injectable()
export class WholesaleBotService {
    constructor(
        private prisma: PrismaService,
        private aiService: WholesaleAiService,
    ) { }

    /**
     * Register wholesale-specific commands on the bot
     */
    registerCommands(bot: Telegraf<Context>) {
        // Command: /b2b - Show B2B menu
        bot.command('b2b', async (ctx) => {
            await ctx.reply(
                '🏢 *Menú B2B Mayorista*\n\n' +
                '📊 /clientes - Ver clientes en riesgo\n' +
                '📦 /consignaciones - Consignaciones abiertas\n' +
                '💰 /presupuestos - Presupuestos pendientes\n' +
                '📈 /statsb2b - Estadísticas mayorista\n' +
                '🔍 /cliente [nombre] - Buscar cliente',
                { parse_mode: 'Markdown' }
            );
        });

        // Command: /clientes - At-risk customers
        bot.command('clientes', async (ctx) => {
            try {
                const atRisk = await this.aiService.getAtRiskCustomers();

                if (atRisk.length === 0) {
                    return ctx.reply('✅ No hay clientes en riesgo actualmente.');
                }

                let message = '🚨 *Clientes en Riesgo*\n\n';

                for (const customer of atRisk.slice(0, 5)) {
                    const emoji = customer.riskLevel === 'CRITICAL' ? '🔴' :
                        customer.riskLevel === 'HIGH' ? '🟠' : '🟡';

                    message += `${emoji} *${customer.customerName}*\n`;
                    message += `   Riesgo: ${customer.riskLevel} (${customer.riskScore}pts)\n`;
                    message += `   📅 ${customer.metrics.daysSinceLastOrder} días sin pedido\n`;
                    if (customer.metrics.openConsignments > 0) {
                        message += `   📦 ${customer.metrics.openConsignments} consignación(es) abierta(s)\n`;
                    }
                    message += '\n';
                }

                if (atRisk.length > 5) {
                    message += `_...y ${atRisk.length - 5} cliente(s) más_`;
                }

                await ctx.replyWithMarkdown(message);
            } catch (error) {
                await ctx.reply('❌ Error al obtener clientes en riesgo.');
            }
        });

        // Command: /consignaciones - Open consignments
        bot.command('consignaciones', async (ctx) => {
            try {
                const consignments = await this.prisma.consignmentSale.findMany({
                    where: { status: { not: 'CLOSED' } },
                    include: {
                        customer: { select: { name: true, businessName: true } },
                        _count: { select: { items: true } }
                    },
                    orderBy: { deliveredAt: 'asc' },
                    take: 10
                });

                if (consignments.length === 0) {
                    return ctx.reply('✅ No hay consignaciones abiertas.');
                }

                let message = '📦 *Consignaciones Abiertas*\n\n';

                for (const cons of consignments) {
                    const days = Math.floor(
                        (Date.now() - new Date(cons.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const stale = days > 30 ? '⚠️' : '';

                    message += `${stale}*${cons.code}*\n`;
                    message += `   Cliente: ${cons.customer.businessName || cons.customer.name}\n`;
                    message += `   Días: ${days} | Items: ${cons._count.items}\n`;
                    message += `   Valor: $${Number(cons.totalValue).toLocaleString()}\n\n`;
                }

                await ctx.replyWithMarkdown(message);
            } catch (error) {
                await ctx.reply('❌ Error al obtener consignaciones.');
            }
        });

        // Command: /presupuestos - Pending quotations
        bot.command('presupuestos', async (ctx) => {
            try {
                const quotations = await this.prisma.quotation.findMany({
                    where: {
                        status: { in: ['DRAFT', 'SENT', 'ACCEPTED'] },
                        validUntil: { gte: new Date() }
                    },
                    include: {
                        customer: { select: { name: true, businessName: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                });

                if (quotations.length === 0) {
                    return ctx.reply('📋 No hay presupuestos pendientes.');
                }

                let message = '📄 *Presupuestos Pendientes*\n\n';

                for (const q of quotations) {
                    const statusEmoji = q.status === 'ACCEPTED' ? '✅' :
                        q.status === 'SENT' ? '📤' : '📝';
                    const daysToExpire = Math.floor(
                        (new Date(q.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );

                    message += `${statusEmoji} *${q.code}*\n`;
                    message += `   Cliente: ${q.customer.businessName || q.customer.name}\n`;
                    message += `   Total: $${Number(q.total).toLocaleString()}\n`;
                    message += `   Estado: ${q.status} | Vence en ${daysToExpire} días\n\n`;
                }

                await ctx.replyWithMarkdown(message);
            } catch (error) {
                await ctx.reply('❌ Error al obtener presupuestos.');
            }
        });

        // Command: /statsb2b - B2B Statistics
        bot.command('statsb2b', async (ctx) => {
            try {
                const stats = await this.aiService.getWholesaleStats();

                let message = '📊 *Estadísticas B2B del Mes*\n\n';
                message += `👥 *Clientes*: ${stats.customers.total}\n`;
                message += `📄 *Presupuestos*: ${stats.quotations.total}\n`;
                message += `📦 *Consignaciones Abiertas*: $${stats.consignments.openValue.toLocaleString()}\n`;
                message += `💰 *Ventas B2B*: ${stats.monthlySales.count} | $${stats.monthlySales.total.toLocaleString()}\n`;

                await ctx.replyWithMarkdown(message);
            } catch (error) {
                await ctx.reply('❌ Error al obtener estadísticas.');
            }
        });

        // Command: /cliente [nombre] - Search customer
        bot.command('cliente', async (ctx) => {
            const query = ctx.message.text.split(' ').slice(1).join(' ');
            if (!query) {
                return ctx.reply('⚠️ Indicá el nombre del cliente. Ej: /cliente Distribuidora');
            }

            try {
                const customers = await this.prisma.customer.findMany({
                    where: {
                        type: 'WHOLESALE',
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { businessName: { contains: query, mode: 'insensitive' } }
                        ]
                    },
                    take: 3
                });

                if (customers.length === 0) {
                    return ctx.reply('🔍 No encontré clientes con ese nombre.');
                }

                for (const c of customers) {
                    const analysis = await this.aiService.analyzeCustomerRisk(c.id);

                    const emoji = analysis.riskLevel === 'CRITICAL' ? '🔴' :
                        analysis.riskLevel === 'HIGH' ? '🟠' :
                            analysis.riskLevel === 'MEDIUM' ? '🟡' : '🟢';

                    let message = `${emoji} *${c.businessName || c.name}*\n\n`;
                    message += `📍 ${c.address || 'Sin dirección'}\n`;
                    message += `📞 ${c.phone || 'Sin teléfono'}\n`;
                    message += `📧 ${c.email || 'Sin email'}\n\n`;
                    message += `📊 *Análisis de Riesgo*: ${analysis.riskLevel} (${analysis.riskScore}pts)\n`;
                    message += `📅 Último pedido: hace ${analysis.metrics.daysSinceLastOrder} días\n`;
                    message += `💳 Crédito usado: ${analysis.metrics.creditUsagePercent}%\n`;

                    if (analysis.alerts.length > 0) {
                        message += `\n⚠️ *Alertas:*\n`;
                        for (const alert of analysis.alerts.slice(0, 3)) {
                            message += `   ${alert}\n`;
                        }
                    }

                    await ctx.replyWithMarkdown(message,
                        Markup.inlineKeyboard([
                            [Markup.button.callback('📞 Contactar', `contact:${c.id}`)],
                            [Markup.button.callback('📊 Ver más', `detail:${c.id}`)]
                        ])
                    );
                }
            } catch (error) {
                await ctx.reply('❌ Error al buscar cliente.');
            }
        });

        // Action: Contact customer (placeholder)
        bot.action(/^contact:(.+)$/, async (ctx) => {
            const customerId = ctx.match[1];
            const customer = await this.prisma.customer.findUnique({
                where: { id: customerId }
            });

            if (customer) {
                await ctx.reply(`📞 *Datos de Contacto*\n\n📱 ${customer.phone || 'Sin teléfono'}\n📧 ${customer.email || 'Sin email'}`,
                    { parse_mode: 'Markdown' }
                );
            }
            await ctx.answerCbQuery();
        });

        // Action: Detail customer
        bot.action(/^detail:(.+)$/, async (ctx) => {
            const customerId = ctx.match[1];

            try {
                const recommendations = await this.aiService.generateRecommendations(customerId);

                let message = '💡 *Recomendaciones*\n\n';
                for (const rec of recommendations.slice(0, 3)) {
                    message += `• ${rec}\n`;
                }

                await ctx.reply(message, { parse_mode: 'Markdown' });
            } catch (error) {
                await ctx.reply('❌ Error al obtener recomendaciones.');
            }
            await ctx.answerCbQuery();
        });
    }

    /**
     * Send B2B alert to admins
     */
    async sendB2BAlert(bot: Telegraf<Context>, message: string) {
        try {
            const admins = await this.prisma.user.findMany({
                where: {
                    role: 'ADMIN',
                    telegramId: { not: null }
                }
            });

            for (const admin of admins) {
                if (admin.telegramId) {
                    await bot.telegram.sendMessage(
                        admin.telegramId,
                        `🏢 *ALERTA B2B*\n${message}`,
                        { parse_mode: 'Markdown' }
                    ).catch(e => console.error(`Failed to send B2B alert`, e));
                }
            }
        } catch (error) {
            console.error('Error sending B2B alert', error);
        }
    }

    /**
     * Check for issues and send automatic alerts
     */
    async checkAndSendAlerts(bot: Telegraf<Context>) {
        // Check for critical risk customers
        const atRisk = await this.aiService.getAtRiskCustomers();
        const critical = atRisk.filter(c => c.riskLevel === 'CRITICAL');

        if (critical.length > 0) {
            await this.sendB2BAlert(bot,
                `🔴 ${critical.length} cliente(s) en riesgo CRÍTICO requieren atención inmediata.`
            );
        }

        // Check for stale consignments
        const stale = await this.aiService.getStaleConsignments(45);
        if (stale.length > 0) {
            await this.sendB2BAlert(bot,
                `📦 ${stale.length} consignación(es) sin actividad por más de 45 días.`
            );
        }
    }
}
