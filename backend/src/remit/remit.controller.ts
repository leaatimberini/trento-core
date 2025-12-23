import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RemitService, CreateRemitDto } from './remit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RemitStatus } from '@prisma/client';

@Controller('remits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemitController {
    constructor(private readonly remitService: RemitService) { }

    /**
     * Create a new remit
     */
    @Post()
    @Roles('ADMIN')
    createRemit(@Body() dto: CreateRemitDto) {
        return this.remitService.createRemit(dto);
    }

    /**
     * Get remit by ID
     */
    @Get(':id')
    getRemit(@Param('id') id: string) {
        return this.remitService.getRemit(id);
    }

    /**
     * Get remit data formatted for PDF
     */
    @Get(':id/pdf')
    getRemitForPDF(@Param('id') id: string) {
        return this.remitService.getRemitForPDF(id);
    }

    /**
     * List remits by date range
     */
    @Get()
    getRemits(
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('status') status?: RemitStatus
    ) {
        return this.remitService.getRemits(
            new Date(from),
            new Date(to),
            status
        );
    }

    /**
     * Get pending remits for delivery
     */
    @Get('pending/list')
    getPendingRemits() {
        return this.remitService.getPendingRemits();
    }

    /**
     * Create remit from sale
     */
    @Post('from-sale/:saleId')
    @Roles('ADMIN')
    createRemitFromSale(
        @Param('saleId') saleId: string,
        @Body() body: { pointOfSale: number; originAddress: string }
    ) {
        return this.remitService.createRemitFromSale(
            saleId,
            body.pointOfSale,
            body.originAddress
        );
    }

    /**
     * Update remit status
     */
    @Put(':id/status')
    @Roles('ADMIN')
    updateStatus(
        @Param('id') id: string,
        @Body() body: { status: RemitStatus }
    ) {
        return this.remitService.updateRemitStatus(id, body.status);
    }

    /**
     * Mark remit as delivered
     */
    @Post(':id/deliver')
    @Roles('ADMIN')
    markDelivered(
        @Param('id') id: string,
        @Body() body: { receiverName: string; receiverDNI?: string; signature?: string }
    ) {
        return this.remitService.markDelivered(id, body);
    }
}
