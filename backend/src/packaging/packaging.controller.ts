
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PackagingService } from './packaging.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('packaging')
@UseGuards(JwtAuthGuard)
export class PackagingController {
    constructor(private readonly packagingService: PackagingService) { }

    @Get('types')
    getTypes() {
        return this.packagingService.getPackagingTypes();
    }

    @Get('alerts')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    getAlerts(@Query('threshold') threshold?: string) {
        return this.packagingService.getHighBalanceAlerts(
            threshold ? parseInt(threshold) : 10
        );
    }

    @Get('summary')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    getSummary() {
        return this.packagingService.getPackagingSummary();
    }

    @Get('customer/:customerId')
    getBalance(@Param('customerId') customerId: string) {
        return this.packagingService.getCustomerBalance(customerId);
    }

    @Post('movement')
    registerMovement(@Body() body: { customerId: string; type: string; quantity: number }) {
        return this.packagingService.updateBalance(body.customerId, body.type, body.quantity);
    }
}

