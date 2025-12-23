import { Module } from '@nestjs/common';
import { WholesaleService } from './wholesale.service';
import { WholesaleController } from './wholesale.controller';
import { QuotationService } from './quotation.service';
import { QuotationController } from './quotation.controller';
import { ConsignmentService } from './consignment.service';
import { ConsignmentController } from './consignment.controller';
import { WholesaleInvoiceService } from './wholesale-invoice.service';
import { WholesaleInvoiceController } from './wholesale-invoice.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfController } from './pdf.controller';
import { WholesaleAiService } from './wholesale-ai.service';
import { WholesaleAiController } from './wholesale-ai.controller';
import { WholesaleBotService } from './wholesale-bot.service';
import { WholesaleAuditService, WholesaleAuditInterceptor } from './wholesale-audit.service';
import { WholesaleAuditController } from './wholesale-audit.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [
        WholesaleController,
        QuotationController,
        ConsignmentController,
        WholesaleInvoiceController,
        PdfController,
        WholesaleAiController,
        WholesaleAuditController
    ],
    providers: [
        WholesaleService,
        QuotationService,
        ConsignmentService,
        WholesaleInvoiceService,
        PdfGeneratorService,
        WholesaleAiService,
        WholesaleBotService,
        WholesaleAuditService,
        WholesaleAuditInterceptor,
        PrismaService
    ],
    exports: [
        WholesaleService,
        QuotationService,
        ConsignmentService,
        WholesaleInvoiceService,
        PdfGeneratorService,
        WholesaleAiService,
        WholesaleBotService,
        WholesaleAuditService,
        WholesaleAuditInterceptor
    ],
})
export class WholesaleModule { }
