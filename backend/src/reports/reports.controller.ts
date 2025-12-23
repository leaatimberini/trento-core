
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('sales/csv')
    @Roles('ADMIN')
    async downloadSalesCsv(@Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
        const csv = await this.reportsService.getSalesCsv(from, to);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="sales_report.csv"');
        res.send(csv);
    }

    @Get('inventory/csv')
    @Roles('ADMIN')
    async downloadInventoryCsv(@Res() res: Response) {
        const csv = await this.reportsService.getInventoryCsv();
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="inventory_report.csv"');
        res.send(csv);
    }

    @Get('inventory/dead-stock')
    @Roles('ADMIN')
    async downloadDeadStockCsv(@Res() res: Response, @Query('days') days?: string) {
        const csv = await this.reportsService.getDeadStockCsv(days ? Number(days) : 30);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="dead_stock_report.csv"');
        res.send(csv);
    }
}
