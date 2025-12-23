import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ConsignmentService, CreateConsignmentDto, ProcessReturnDto } from './consignment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('wholesale/consignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsignmentController {
    constructor(private readonly consignmentService: ConsignmentService) { }

    /**
     * Create a new consignment (deliver stock to customer)
     */
    @Post()
    @Roles('ADMIN', 'SELLER')
    create(@Body() dto: CreateConsignmentDto, @Request() req: any) {
        return this.consignmentService.create(dto, req.user?.id);
    }

    /**
     * Get all consignments with optional filters
     */
    @Get()
    @Roles('ADMIN', 'SELLER')
    findAll(
        @Query('customerId') customerId?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.consignmentService.findAll({ customerId, status, search });
    }

    /**
     * Get consignment statistics
     */
    @Get('stats')
    @Roles('ADMIN')
    getStats() {
        return this.consignmentService.getStats();
    }

    /**
     * Get stale consignments (no activity for X days)
     */
    @Get('stale')
    @Roles('ADMIN', 'SELLER')
    getStale(@Query('days') days?: string) {
        return this.consignmentService.getStaleConsignments(days ? parseInt(days) : 30);
    }

    /**
     * Get open consignments for a customer
     */
    @Get('customer/:customerId')
    @Roles('ADMIN', 'SELLER')
    getByCustomer(@Param('customerId') customerId: string) {
        return this.consignmentService.getOpenByCustomer(customerId);
    }

    /**
     * Get single consignment with details
     */
    @Get(':id')
    @Roles('ADMIN', 'SELLER')
    findOne(@Param('id') id: string) {
        return this.consignmentService.findOne(id);
    }

    /**
     * Get available items to invoice
     */
    @Get(':id/available')
    @Roles('ADMIN', 'SELLER')
    getAvailable(@Param('id') id: string) {
        return this.consignmentService.getAvailableToInvoice(id);
    }

    /**
     * Process a return from consignment (ADMIN only)
     */
    @Post(':id/return')
    @Roles('ADMIN')
    processReturn(
        @Param('id') id: string,
        @Body() dto: ProcessReturnDto,
        @Request() req: any,
    ) {
        return this.consignmentService.processReturn(id, dto, req.user?.id);
    }
}
