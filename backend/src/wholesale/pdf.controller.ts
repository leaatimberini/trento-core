import {
    Controller,
    Get,
    Param,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { PdfGeneratorService } from './pdf-generator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('wholesale/pdf')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PdfController {
    constructor(private readonly pdfService: PdfGeneratorService) { }

    /**
     * Generate/Download Quotation PDF
     */
    @Get('quotation/:id')
    @Roles('ADMIN', 'SELLER')
    async getQuotationPdf(@Param('id') id: string, @Res() res: Response) {
        return this.pdfService.generateQuotationPdf(id, res);
    }

    /**
     * Generate/Download Consignment Remit PDF
     */
    @Get('consignment/:id/remit')
    @Roles('ADMIN', 'SELLER')
    async getConsignmentRemitPdf(@Param('id') id: string, @Res() res: Response) {
        return this.pdfService.generateConsignmentRemitPdf(id, res);
    }

    /**
     * Generate/Download Invoice PDF
     */
    @Get('invoice/:id')
    @Roles('ADMIN', 'SELLER')
    async getInvoicePdf(@Param('id') id: string, @Res() res: Response) {
        return this.pdfService.generateInvoicePdf(id, res);
    }

    /**
     * Generate/Download Return PDF
     */
    @Get('return/:id')
    @Roles('ADMIN', 'SELLER')
    async getReturnPdf(@Param('id') id: string, @Res() res: Response) {
        return this.pdfService.generateReturnPdf(id, res);
    }
}
