import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { WholesaleService, CreateWholesaleCustomerDto, UpdateWholesaleCustomerDto } from './wholesale.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('wholesale')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WholesaleController {
    constructor(private readonly wholesaleService: WholesaleService) { }

    // ==============================
    // CUSTOMERS
    // ==============================

    /**
     * Create a new wholesale customer
     */
    @Post('customers')
    @Roles('ADMIN', 'SELLER')
    createCustomer(@Body() dto: CreateWholesaleCustomerDto) {
        return this.wholesaleService.createWholesaleCustomer(dto);
    }

    /**
     * Get all wholesale customers with optional filters
     */
    @Get('customers')
    @Roles('ADMIN', 'SELLER')
    getCustomers(
        @Query('search') search?: string,
        @Query('relationStatus') relationStatus?: string,
        @Query('salesRepId') salesRepId?: string,
    ) {
        return this.wholesaleService.getWholesaleCustomers({
            search,
            relationStatus,
            salesRepId,
        });
    }

    /**
     * Get a single wholesale customer by ID
     */
    @Get('customers/:id')
    @Roles('ADMIN', 'SELLER')
    getCustomer(@Param('id') id: string) {
        return this.wholesaleService.getWholesaleCustomer(id);
    }

    /**
     * Update a wholesale customer
     */
    @Put('customers/:id')
    @Roles('ADMIN', 'SELLER')
    updateCustomer(
        @Param('id') id: string,
        @Body() dto: UpdateWholesaleCustomerDto,
    ) {
        return this.wholesaleService.updateWholesaleCustomer(id, dto);
    }

    /**
     * Delete a wholesale customer (ADMIN only)
     */
    @Delete('customers/:id')
    @Roles('ADMIN')
    deleteCustomer(@Param('id') id: string) {
        return this.wholesaleService.deleteWholesaleCustomer(id);
    }

    // ==============================
    // CREDIT MANAGEMENT
    // ==============================

    /**
     * Check available credit for a customer
     */
    @Get('customers/:id/credit')
    @Roles('ADMIN', 'SELLER')
    checkCredit(
        @Param('id') id: string,
        @Query('amount') amount?: string,
    ) {
        const amountValue = amount ? parseFloat(amount) : 0;
        return this.wholesaleService.checkCreditAvailable(id, amountValue);
    }

    /**
     * Update credit limit (ADMIN only)
     */
    @Patch('customers/:id/credit-limit')
    @Roles('ADMIN')
    updateCreditLimit(
        @Param('id') id: string,
        @Body() body: { limit: number },
    ) {
        return this.wholesaleService.updateCreditLimit(id, body.limit);
    }

    /**
     * Get credit summary for all wholesale customers
     */
    @Get('credit/summary')
    @Roles('ADMIN')
    getCreditSummary() {
        return this.wholesaleService.getCreditSummary();
    }

    // ==============================
    // RISK MANAGEMENT
    // ==============================

    /**
     * Get customers at risk
     */
    @Get('risk/customers')
    @Roles('ADMIN', 'SELLER')
    getAtRiskCustomers() {
        return this.wholesaleService.getAtRiskCustomers();
    }

    /**
     * Update relation status (ADMIN only)
     */
    @Patch('customers/:id/status')
    @Roles('ADMIN')
    updateRelationStatus(
        @Param('id') id: string,
        @Body() body: { status: 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'BLOCKED' },
    ) {
        return this.wholesaleService.updateRelationStatus(id, body.status);
    }

    // ==============================
    // STATS & REPORTS
    // ==============================

    /**
     * Get B2B Dashboard Stats
     */
    @Get('stats')
    @Roles('ADMIN', 'SELLER')
    getStats(@Query('range') range?: 'week' | 'month' | 'quarter' | 'year') {
        return this.wholesaleService.getStats(range);
    }
}

