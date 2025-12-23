import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('coupons')
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) { }

    // ==================== ADMIN ENDPOINTS ====================

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    createCoupon(@Body() body: {
        code: string;
        name: string;
        description?: string;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discountValue: number;
        minOrderValue?: number;
        maxDiscount?: number;
        usageLimit?: number;
        perCustomerLimit?: number;
        validFrom?: string;
        validUntil?: string;
        applicableCategories?: string[];
        applicableProducts?: string[];
    }) {
        return this.couponsService.createCoupon({
            ...body,
            validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
            validUntil: body.validUntil ? new Date(body.validUntil) : undefined
        });
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    getCoupons(@Query('activeOnly') activeOnly?: string) {
        return this.couponsService.getCoupons(activeOnly === 'true');
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    getCoupon(@Param('id') id: string) {
        return this.couponsService.getCoupon(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    updateCoupon(@Param('id') id: string, @Body() body: any) {
        return this.couponsService.updateCoupon(id, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    deleteCoupon(@Param('id') id: string) {
        return this.couponsService.deleteCoupon(id);
    }

    // ==================== PUBLIC ENDPOINTS (for store) ====================

    @Post('validate')
    async validateCoupon(@Body() body: {
        code: string;
        orderTotal: number;
        customerId?: string;
    }) {
        return this.couponsService.validateCoupon(body.code, body.orderTotal, body.customerId);
    }
}
