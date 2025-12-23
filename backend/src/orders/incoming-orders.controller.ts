import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { IncomingOrdersService } from './incoming-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('orders')
export class IncomingOrdersController {
    constructor(private ordersService: IncomingOrdersService) { }

    @Get('incoming')
    @Roles('ADMIN', 'SELLER')
    async getIncomingOrders() {
        return this.ordersService.getIncomingOrders();
    }

    @Get('incoming/:id')
    @Roles('ADMIN', 'SELLER')
    async getOrder(@Param('id') id: string) {
        return this.ordersService.getOrderById(id);
    }

    @Post('incoming/:id/status')
    @Roles('ADMIN', 'SELLER')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string }
    ) {
        return this.ordersService.updateOrderStatus(id, body.status);
    }

    // Webhook endpoints for receiving orders
    @Post('webhook/rappi')
    async rappiWebhook(@Body() data: any) {
        // Verify Rappi signature in production
        return this.ordersService.addOrderFromWebhook('rappi', data);
    }

    @Post('webhook/pedidosya')
    async pedidosYaWebhook(@Body() data: any) {
        // Verify PedidosYa signature in production
        return this.ordersService.addOrderFromWebhook('pedidosya', data);
    }

    @Post('webhook/ecommerce')
    async ecommerceWebhook(@Body() data: any) {
        return this.ordersService.addOrderFromWebhook('ecommerce', data);
    }
}
