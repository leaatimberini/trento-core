
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
    constructor(private readonly poService: PurchaseOrdersService) { }

    @Get()
    @Roles('ADMIN')
    findAll() {
        return this.poService.findAll();
    }

    @Post()
    @Roles('ADMIN')
    create(@Body() body: any) {
        return this.poService.create(body);
    }

    @Post(':id/receive')
    @Roles('ADMIN')
    receive(@Param('id') id: string, @Body() body: any) {
        return this.poService.receiveOrder(id, body);
    }
}
