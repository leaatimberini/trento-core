import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import {
    WholesaleInvoiceService,
    InvoiceFromQuotationDto,
    InvoiceFromConsignmentDto
} from './wholesale-invoice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('wholesale/invoicing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WholesaleInvoiceController {
    constructor(private readonly invoiceService: WholesaleInvoiceService) { }

    /**
     * Invoice from accepted quotation (ADMIN only)
     */
    @Post('quotation')
    @Roles('ADMIN')
    invoiceFromQuotation(@Body() dto: InvoiceFromQuotationDto, @Request() req: any) {
        return this.invoiceService.invoiceFromQuotation(dto, req.user?.id);
    }

    /**
     * Invoice from consignment (partial invoicing, ADMIN only)
     */
    @Post('consignment')
    @Roles('ADMIN')
    invoiceFromConsignment(@Body() dto: InvoiceFromConsignmentDto, @Request() req: any) {
        return this.invoiceService.invoiceFromConsignment(dto, req.user?.id);
    }

    /**
     * Get quotations pending invoicing
     */
    @Get('pending/quotations')
    @Roles('ADMIN', 'SELLER')
    getPendingQuotations() {
        return this.invoiceService.getPendingQuotations();
    }

    /**
     * Get consignments pending invoicing
     */
    @Get('pending/consignments')
    @Roles('ADMIN', 'SELLER')
    getPendingConsignments() {
        return this.invoiceService.getPendingConsignments();
    }
}
