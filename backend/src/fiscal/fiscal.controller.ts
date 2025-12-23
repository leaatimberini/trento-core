import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FiscalService, CreateInvoiceDto } from './fiscal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InvoiceType } from '@prisma/client';

@Controller('fiscal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FiscalController {
    constructor(private readonly fiscalService: FiscalService) { }

    /**
     * Create a new invoice (draft)
     */
    @Post('invoices')
    @Roles('ADMIN')
    createInvoice(@Body() dto: CreateInvoiceDto) {
        return this.fiscalService.createInvoice(dto);
    }

    /**
     * Request CAE for an invoice
     */
    @Post('invoices/:id/cae')
    @Roles('ADMIN')
    requestCAE(@Param('id') id: string) {
        return this.fiscalService.requestCAE(id);
    }

    /**
     * Get invoice by ID
     */
    @Get('invoices/:id')
    getInvoice(@Param('id') id: string) {
        return this.fiscalService.getInvoice(id);
    }

    /**
     * Get invoices by date range
     */
    @Get('invoices')
    getInvoices(
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('type') type?: InvoiceType
    ) {
        return this.fiscalService.getInvoices(
            new Date(from),
            new Date(to),
            type
        );
    }

    /**
     * Get IVA book for a month
     */
    @Get('libro-iva')
    @Roles('ADMIN')
    getLibroIVA(
        @Query('month') month: string,
        @Query('year') year: string
    ) {
        return this.fiscalService.getLibroIVA(
            parseInt(month),
            parseInt(year)
        );
    }

    /**
     * Get invoice type codes reference
     */
    @Get('types')
    getInvoiceTypes() {
        return {
            types: [
                { code: 'FACTURA_A', afipCode: 1, description: 'Factura A - RI a RI' },
                { code: 'FACTURA_B', afipCode: 6, description: 'Factura B - RI a CF/Exento' },
                { code: 'FACTURA_C', afipCode: 11, description: 'Factura C - Monotributo' },
                { code: 'FACTURA_M', afipCode: 51, description: 'Factura M - Control reforzado' },
                { code: 'FACTURA_E', afipCode: 19, description: 'Factura E - Exportación' },
                { code: 'NOTA_CREDITO_A', afipCode: 3, description: 'Nota Crédito A' },
                { code: 'NOTA_CREDITO_B', afipCode: 8, description: 'Nota Crédito B' },
                { code: 'NOTA_CREDITO_C', afipCode: 13, description: 'Nota Crédito C' },
                { code: 'NOTA_DEBITO_A', afipCode: 2, description: 'Nota Débito A' },
                { code: 'NOTA_DEBITO_B', afipCode: 7, description: 'Nota Débito B' },
                { code: 'NOTA_DEBITO_C', afipCode: 12, description: 'Nota Débito C' },
            ],
            taxConditions: [
                { code: 'RESPONSABLE_INSCRIPTO', description: 'Responsable Inscripto' },
                { code: 'MONOTRIBUTISTA', description: 'Monotributista' },
                { code: 'CONSUMIDOR_FINAL', description: 'Consumidor Final' },
                { code: 'EXENTO', description: 'Exento' },
                { code: 'NO_RESPONSABLE', description: 'No Responsable' },
            ]
        };
    }

    /**
     * Create invoice from existing sale (auto-determines type and requests CAE)
     */
    @Post('sales/:saleId/invoice')
    @Roles('ADMIN')
    createInvoiceFromSale(
        @Param('saleId') saleId: string,
        @Body() body?: { pointOfSale?: number }
    ) {
        return this.fiscalService.createInvoiceFromSale(saleId, body?.pointOfSale || 1);
    }

    /**
     * Create credit note for an invoice
     */
    @Post('invoices/:id/credit-note')
    @Roles('ADMIN')
    createCreditNote(
        @Param('id') id: string,
        @Body() body: { reason: string; amount?: number }
    ) {
        return this.fiscalService.createCreditNote(id, body.reason, body.amount);
    }

    /**
     * Get invoice statistics for a date range
     */
    @Get('stats')
    @Roles('ADMIN')
    getStats(
        @Query('from') from: string,
        @Query('to') to: string
    ) {
        return this.fiscalService.getInvoiceStats(
            new Date(from),
            new Date(to)
        );
    }

    // ==================== IIBB Endpoints ====================

    /**
     * Get IIBB configurations
     */
    @Get('iibb/config')
    @Roles('ADMIN')
    getIIBBConfigs(@Query('jurisdiction') jurisdiction?: string) {
        return this.fiscalService.getIIBBConfigs(jurisdiction);
    }

    /**
     * Create or update IIBB configuration
     */
    @Post('iibb/config')
    @Roles('ADMIN')
    upsertIIBBConfig(@Body() body: {
        jurisdiction: string;
        jurisdictionName: string;
        perceptionRate: number;
        perceptionMinimum?: number;
        retentionRate?: number;
        activityCode?: string;
    }) {
        return this.fiscalService.upsertIIBBConfig(body);
    }

    /**
     * Calculate and apply IIBB to an invoice
     */
    @Post('invoices/:id/iibb')
    @Roles('ADMIN')
    calculateIIBB(
        @Param('id') id: string,
        @Body() body: { jurisdiction: string }
    ) {
        return this.fiscalService.calculateIIBB(id, body.jurisdiction);
    }

    /**
     * Get IIBB report for a month
     */
    @Get('iibb/report')
    @Roles('ADMIN')
    getIIBBReport(
        @Query('month') month: string,
        @Query('year') year: string
    ) {
        return this.fiscalService.getIIBBReport(
            parseInt(month),
            parseInt(year)
        );
    }

    // ==================== Libro IVA Export ====================

    /**
     * Export Libro IVA in CITI format (AFIP RG 3685)
     */
    @Get('libro-iva/export')
    @Roles('ADMIN')
    exportLibroIVA(
        @Query('month') month: string,
        @Query('year') year: string
    ) {
        return this.fiscalService.exportLibroIVACITI(
            parseInt(month),
            parseInt(year)
        );
    }
}
