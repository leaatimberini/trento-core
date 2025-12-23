import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Message Templates
const TEMPLATES = {
    WELCOME: {
        key: 'welcome',
        message: (name: string) =>
            `¡Hola ${name}! 👋 Bienvenido/a a nuestra familia. Gracias por registrarte. Estamos para ayudarte.`
    },
    ORDER_CONFIRMED: {
        key: 'order_confirmed',
        message: (name: string, orderCode: string) =>
            `¡Hola ${name}! ✅ Tu pedido *${orderCode}* ha sido confirmado. Te avisaremos cuando esté listo para entrega.`
    },
    ORDER_READY: {
        key: 'order_ready',
        message: (name: string, orderCode: string) =>
            `¡${name}! 📦 Tu pedido *${orderCode}* está listo para retiro/entrega. ¡Gracias por tu preferencia!`
    },
    ORDER_DELIVERED: {
        key: 'order_delivered',
        message: (name: string, orderCode: string) =>
            `¡${name}! ✅ Tu pedido *${orderCode}* ha sido entregado. Esperamos que lo disfrutes. ¡Gracias!`
    },
    PAYMENT_RECEIVED: {
        key: 'payment_received',
        message: (name: string, amount: string) =>
            `¡Gracias ${name}! 💰 Hemos recibido tu pago de *$${amount}*. Tu cuenta está al día.`
    },
    PAYMENT_REMINDER: {
        key: 'payment_reminder',
        message: (name: string, amount: string, dueDate: string) =>
            `Hola ${name}. 📅 Te recordamos que tienes un saldo pendiente de *$${amount}* con vencimiento ${dueDate}. ¿Podemos ayudarte?`
    },
    RECOMPRA: {
        key: 'recompra',
        message: (name: string, product: string) =>
            `¡Hola ${name}! 🔄 Notamos que hace tiempo no nos visitas. ¿Necesitas ${product}? Tenemos stock disponible.`
    },
    LEVEL_UP: {
        key: 'level_up',
        message: (name: string, newLevel: string) =>
            `¡Felicitaciones ${name}! 🏆 Subiste al nivel *${newLevel}*. Ahora tienes acceso a beneficios exclusivos.`
    },
    POINTS_EARNED: {
        key: 'points_earned',
        message: (name: string, points: number, balance: number) =>
            `¡${name}! ⭐ Ganaste *${points} puntos*. Tu saldo actual es *${balance} puntos*. ¡Seguí acumulando!`
    },
    PROMO: {
        key: 'promo',
        message: (name: string, promo: string) =>
            `¡${name}! 🎉 Tenemos una promo especial para vos: ${promo}. ¡No te la pierdas!`
    },
    BIRTHDAY: {
        key: 'birthday',
        message: (name: string) =>
            `¡Feliz cumpleaños ${name}! 🎂🎈 Te deseamos un día increíble. Tenemos un regalo especial esperándote.`
    }
};

export interface WhatsAppConfig {
    enabled: boolean;
    sessionPath: string;
    autoReconnect: boolean;
}

@Injectable()
export class WhatsappService implements OnModuleInit {
    private readonly logger = new Logger(WhatsappService.name);
    private isConnected = false;
    private socket: any = null;

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        // WhatsApp initialization is optional - only if enabled
        this.logger.log('WhatsApp service initialized (connection pending)');
    }

    /**
     * Check if WhatsApp is connected
     */
    isWhatsAppConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            message: this.isConnected ? 'WhatsApp conectado' : 'WhatsApp desconectado - escanear QR'
        };
    }

    /**
     * Format phone number for WhatsApp
     */
    private formatPhoneNumber(phone: string): string {
        // Remove all non-digits
        let cleaned = phone.replace(/\D/g, '');

        // Argentina specific: add country code if missing
        if (cleaned.startsWith('11') || cleaned.startsWith('15')) {
            cleaned = '549' + cleaned.replace(/^15/, '');
        } else if (!cleaned.startsWith('54')) {
            cleaned = '54' + cleaned;
        }

        // Ensure 9 for mobile (Argentina)
        if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
            cleaned = '549' + cleaned.substring(2);
        }

        return cleaned + '@s.whatsapp.net';
    }

    /**
     * Send a message (stub - requires Baileys connection)
     */
    async sendMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
        if (!this.isConnected) {
            this.logger.warn('WhatsApp not connected - message queued');

            // Queue message for later
            await this.queueMessage(phone, message);

            return { success: false, error: 'WhatsApp not connected - message queued' };
        }

        try {
            const jid = this.formatPhoneNumber(phone);

            // In production with Baileys:
            // await this.socket.sendMessage(jid, { text: message });

            this.logger.log(`Message sent to ${phone}`);

            // Log the message
            await this.logMessage(phone, message, 'SENT');

            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to send message: ${error}`);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    /**
     * Queue a message for later sending
     */
    private async queueMessage(phone: string, message: string) {
        // In a full implementation, this would save to a queue table
        this.logger.log(`Message queued for ${phone}`);
    }

    /**
     * Log sent/received message
     */
    private async logMessage(phone: string, message: string, direction: 'SENT' | 'RECEIVED') {
        // In a full implementation, save to message log table
        this.logger.debug(`[${direction}] ${phone}: ${message.substring(0, 50)}...`);
    }

    // ==================== TEMPLATE METHODS ====================

    /**
     * Send welcome message
     */
    async sendWelcome(phone: string, customerName: string) {
        const message = TEMPLATES.WELCOME.message(customerName);
        return this.sendMessage(phone, message);
    }

    /**
     * Send order confirmation
     */
    async sendOrderConfirmed(phone: string, customerName: string, orderCode: string) {
        const message = TEMPLATES.ORDER_CONFIRMED.message(customerName, orderCode);
        return this.sendMessage(phone, message);
    }

    /**
     * Send order ready notification
     */
    async sendOrderReady(phone: string, customerName: string, orderCode: string) {
        const message = TEMPLATES.ORDER_READY.message(customerName, orderCode);
        return this.sendMessage(phone, message);
    }

    /**
     * Send order delivered notification
     */
    async sendOrderDelivered(phone: string, customerName: string, orderCode: string) {
        const message = TEMPLATES.ORDER_DELIVERED.message(customerName, orderCode);
        return this.sendMessage(phone, message);
    }

    /**
     * Send payment received notification
     */
    async sendPaymentReceived(phone: string, customerName: string, amount: number) {
        const message = TEMPLATES.PAYMENT_RECEIVED.message(customerName, amount.toLocaleString('es-AR'));
        return this.sendMessage(phone, message);
    }

    /**
     * Send payment reminder
     */
    async sendPaymentReminder(phone: string, customerName: string, amount: number, dueDate: string) {
        const message = TEMPLATES.PAYMENT_REMINDER.message(customerName, amount.toLocaleString('es-AR'), dueDate);
        return this.sendMessage(phone, message);
    }

    /**
     * Send recompra reminder
     */
    async sendRecompraReminder(phone: string, customerName: string, product: string) {
        const message = TEMPLATES.RECOMPRA.message(customerName, product);
        return this.sendMessage(phone, message);
    }

    /**
     * Send level up notification
     */
    async sendLevelUp(phone: string, customerName: string, newLevel: string) {
        const message = TEMPLATES.LEVEL_UP.message(customerName, newLevel);
        return this.sendMessage(phone, message);
    }

    /**
     * Send points earned notification
     */
    async sendPointsEarned(phone: string, customerName: string, points: number, balance: number) {
        const message = TEMPLATES.POINTS_EARNED.message(customerName, points, balance);
        return this.sendMessage(phone, message);
    }

    /**
     * Send promotional message
     */
    async sendPromo(phone: string, customerName: string, promoText: string) {
        const message = TEMPLATES.PROMO.message(customerName, promoText);
        return this.sendMessage(phone, message);
    }

    /**
     * Send birthday message
     */
    async sendBirthday(phone: string, customerName: string) {
        const message = TEMPLATES.BIRTHDAY.message(customerName);
        return this.sendMessage(phone, message);
    }

    /**
     * Send custom message
     */
    async sendCustom(phone: string, message: string) {
        return this.sendMessage(phone, message);
    }

    // ==================== BULK MESSAGING ====================

    /**
     * Send message to multiple customers
     */
    async sendBulk(phones: string[], message: string, delayMs: number = 2000) {
        const results: Array<{ phone: string; success: boolean; error?: string }> = [];

        for (const phone of phones) {
            const result = await this.sendMessage(phone, message);
            results.push({ phone, ...result });

            // Delay between messages to avoid spam detection
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        return {
            total: phones.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    /**
     * Send message to customer segment
     */
    async sendToSegment(segment: string, messageTemplate: string) {
        const scores = await this.prisma.customerScore.findMany({
            where: { segment }
        });

        const customerIds = scores.map(s => s.customerId);

        const customers = await this.prisma.customer.findMany({
            where: {
                id: { in: customerIds },
                phone: { not: null }
            }
        });

        const results: Array<{ customerId: string; success: boolean }> = [];

        for (const customer of customers) {
            if (customer.phone) {
                const personalizedMessage = messageTemplate.replace('{name}', customer.name);
                const result = await this.sendMessage(customer.phone, personalizedMessage);
                results.push({ customerId: customer.id, success: result.success });

                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        return {
            segment,
            customersContacted: results.length,
            successful: results.filter(r => r.success).length
        };
    }

    /**
     * Get available templates
     */
    getTemplates() {
        return Object.entries(TEMPLATES).map(([key, value]) => {
            // Generate example based on template type
            let example: string;
            try {
                if (key === 'WELCOME' || key === 'BIRTHDAY') {
                    example = (value.message as (n: string) => string)('Juan');
                } else if (key === 'POINTS_EARNED') {
                    example = (value.message as (n: string, p: number, b: number) => string)('Juan', 100, 500);
                } else if (key === 'PAYMENT_REMINDER') {
                    example = (value.message as (n: string, a: string, d: string) => string)('Juan', '1.500', '15/01/2025');
                } else {
                    example = (value.message as (n: string, c: string) => string)('Juan', 'ABC-123');
                }
            } catch {
                example = 'Template disponible';
            }
            return { key, templateKey: value.key, example };
        });
    }
}

