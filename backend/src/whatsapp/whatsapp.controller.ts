import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) { }

    /**
     * Get WhatsApp connection status
     */
    @Get('status')
    @Roles('ADMIN')
    getStatus() {
        return this.whatsappService.getStatus();
    }

    /**
     * Get available message templates
     */
    @Get('templates')
    @Roles('ADMIN')
    getTemplates() {
        return this.whatsappService.getTemplates();
    }

    /**
     * Send a custom message
     */
    @Post('send')
    @Roles('ADMIN')
    sendMessage(@Body() body: { phone: string; message: string }) {
        return this.whatsappService.sendCustom(body.phone, body.message);
    }

    /**
     * Send welcome message
     */
    @Post('send/welcome')
    @Roles('ADMIN')
    sendWelcome(@Body() body: { phone: string; customerName: string }) {
        return this.whatsappService.sendWelcome(body.phone, body.customerName);
    }

    /**
     * Send order confirmation
     */
    @Post('send/order-confirmed')
    @Roles('ADMIN')
    sendOrderConfirmed(@Body() body: { phone: string; customerName: string; orderCode: string }) {
        return this.whatsappService.sendOrderConfirmed(body.phone, body.customerName, body.orderCode);
    }

    /**
     * Send order ready notification
     */
    @Post('send/order-ready')
    @Roles('ADMIN')
    sendOrderReady(@Body() body: { phone: string; customerName: string; orderCode: string }) {
        return this.whatsappService.sendOrderReady(body.phone, body.customerName, body.orderCode);
    }

    /**
     * Send payment received
     */
    @Post('send/payment-received')
    @Roles('ADMIN')
    sendPaymentReceived(@Body() body: { phone: string; customerName: string; amount: number }) {
        return this.whatsappService.sendPaymentReceived(body.phone, body.customerName, body.amount);
    }

    /**
     * Send payment reminder
     */
    @Post('send/payment-reminder')
    @Roles('ADMIN')
    sendPaymentReminder(@Body() body: { phone: string; customerName: string; amount: number; dueDate: string }) {
        return this.whatsappService.sendPaymentReminder(body.phone, body.customerName, body.amount, body.dueDate);
    }

    /**
     * Send recompra reminder
     */
    @Post('send/recompra')
    @Roles('ADMIN')
    sendRecompra(@Body() body: { phone: string; customerName: string; product: string }) {
        return this.whatsappService.sendRecompraReminder(body.phone, body.customerName, body.product);
    }

    /**
     * Send level up notification
     */
    @Post('send/level-up')
    @Roles('ADMIN')
    sendLevelUp(@Body() body: { phone: string; customerName: string; newLevel: string }) {
        return this.whatsappService.sendLevelUp(body.phone, body.customerName, body.newLevel);
    }

    /**
     * Send points notification
     */
    @Post('send/points')
    @Roles('ADMIN')
    sendPoints(@Body() body: { phone: string; customerName: string; points: number; balance: number }) {
        return this.whatsappService.sendPointsEarned(body.phone, body.customerName, body.points, body.balance);
    }

    /**
     * Send promo message
     */
    @Post('send/promo')
    @Roles('ADMIN')
    sendPromo(@Body() body: { phone: string; customerName: string; promo: string }) {
        return this.whatsappService.sendPromo(body.phone, body.customerName, body.promo);
    }

    /**
     * Send bulk message
     */
    @Post('send/bulk')
    @Roles('ADMIN')
    sendBulk(@Body() body: { phones: string[]; message: string }) {
        return this.whatsappService.sendBulk(body.phones, body.message);
    }

    /**
     * Send message to segment
     */
    @Post('send/segment/:segment')
    @Roles('ADMIN')
    sendToSegment(
        @Param('segment') segment: string,
        @Body() body: { message: string }
    ) {
        return this.whatsappService.sendToSegment(segment, body.message);
    }
}
