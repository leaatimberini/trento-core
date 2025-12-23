
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PurchaseSavingsService } from './purchase-savings.service';
import { FinancialGuardService, DiscountEvaluationDto } from './financial-guard.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FinanceController {
    constructor(
        private readonly financeService: FinanceService,
        private readonly savingsService: PurchaseSavingsService,
        private readonly financialGuardService: FinancialGuardService
    ) { }

    @Get('stats')
    getStats() {
        return this.financeService.getDailyStats();
    }

    @Get('stats/monthly')
    getMonthlyStats(@Query('month') month?: string, @Query('year') year?: string) {
        return this.financeService.getMonthlyStats(
            month ? parseInt(month) : undefined,
            year ? parseInt(year) : undefined
        );
    }

    @Get('stats/profitability')
    getProfitability(@Query('start') start?: string, @Query('end') end?: string) {
        return this.financeService.getProfitabilityStats(start, end);
    }

    @Get('stats/top-products')
    getTopProducts() {
        return this.financeService.getTopProducts(5);
    }

    @Get('customers/top')
    getTopCustomers() {
        return this.financeService.getTopCustomers();
    }

    @Get('reports/dead-stock')
    getDeadStock() {
        return this.financeService.getDeadStockReport();
    }

    @Get('reports/categories')
    getTopCategories() {
        return this.financeService.getTopCategories();
    }

    @Get('analysis/breakeven')
    getBreakEven(
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        return this.financeService.getBreakEvenAnalysis(
            month ? parseInt(month) : undefined,
            year ? parseInt(year) : undefined
        );
    }

    @Get('reconcile/simulate')
    simulateBankStatement() {
        return this.financeService.simulateBankStatement();
    }

    @Post('reconcile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    reconcile(@Body() body: { transactions: any[] }) {
        return this.financeService.reconcileTransactions(body.transactions);
    }

    // ============ GANAR A LA COMPRA ============

    @Get('purchase-savings')
    getPurchaseSavings(@Query('start') start?: string, @Query('end') end?: string) {
        const dateFrom = start ? new Date(start) : undefined;
        const dateTo = end ? new Date(end) : undefined;
        return this.savingsService.getSavingsReport(dateFrom, dateTo);
    }

    @Get('purchase-savings/products')
    getTopSavingsProducts(@Query('limit') limit?: string) {
        return this.savingsService.getTopSavingsProducts(limit ? parseInt(limit) : 10);
    }

    @Get('purchase-savings/suppliers')
    getTopSupplierSavings(@Query('limit') limit?: string) {
        return this.savingsService.getTopSupplierSavings(limit ? parseInt(limit) : 10);
    }

    @Get('purchase-savings/monthly')
    getMonthlySavings(@Query('months') months?: string) {
        return this.savingsService.getMonthlySavings(months ? parseInt(months) : 12);
    }

    @Get('purchase-savings/details')
    getSavingsDetails(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('onlyWins') onlyWins?: string,
        @Query('onlyLosses') onlyLosses?: string
    ) {
        return this.savingsService.getSavingsDetails({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            onlyWins: onlyWins === 'true',
            onlyLosses: onlyLosses === 'true'
        });
    }

    @Post('purchase-savings/calculate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    calculateSaving(@Body() body: { productId: string; paidCost: number; quantity: number }) {
        return this.savingsService.calculateSaving(body.productId, body.paidCost, body.quantity);
    }

    // ============ FINANCIAL GUARD ============

    @Post('evaluate-discount')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    evaluateDiscount(@Body() body: DiscountEvaluationDto) {
        return this.financialGuardService.evaluateDiscount(body);
    }
}

