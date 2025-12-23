
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DistributionService } from './distribution.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('logistics')
export class DistributionController {
    constructor(private readonly distributionService: DistributionService) { }

    @Get('deliveries')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'DRIVER')
    getDeliveries() {
        return this.distributionService.getDeliveries();
    }

    @Post('routes/optimize')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'DRIVER')
    optimizeRoute(@Body() body: { orders: any[] }) {
        return this.distributionService.optimizeRoute(body.orders);
    }

    @Get('manifest/:saleId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'DRIVER')
    getManifest(@Param('saleId') saleId: string) {
        return this.distributionService.generatePackingSlip(saleId);
    }
}
