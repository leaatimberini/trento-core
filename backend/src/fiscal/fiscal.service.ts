import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InvoiceType, InvoiceStatus, TaxCondition } from '@prisma/client';
import * as crypto from 'crypto';

// AFIP WSFE Invoice Type Codes
const INVOICE_TYPE_CODES: Record<InvoiceType, number> = {
    FACTURA_A: 1,
    FACTURA_B: 6,
    FACTURA_C: 11,
    FACTURA_M: 51,
    FACTURA_E: 19,
    NOTA_CREDITO_A: 3,
    NOTA_CREDITO_B: 8,
    NOTA_CREDITO_C: 13,
    NOTA_DEBITO_A: 2,
    NOTA_DEBITO_B: 7,
    NOTA_DEBITO_C: 12,
    RECIBO_X: 0,
    FACTURA_X: 0,
};

// AFIP Document Type Codes
const DOC_TYPE_CODES = {
    CUIT: 80,
    CUIL: 86,
    DNI: 96,
    PASAPORTE: 94,
    CONSUMIDOR_FINAL: 99,
};

export interface CreateInvoiceDto {
    saleId?: string;
    type: InvoiceType;
    pointOfSale: number;
    customerName: string;
    customerTaxId?: string;
    customerTaxCondition: TaxCondition;
    customerAddress?: string;
    subtotal: number;
    taxAmount: number;
    otherTaxes?: number;
    total: number;
    relatedInvoiceId?: string; // For NC/ND
}

@Injectable()
export class FiscalService {
    private readonly logger = new Logger(FiscalService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get next invoice number for a point of sale and type
     */
    async getNextInvoiceNumber(pointOfSale: number, type: InvoiceType): Promise<number> {
        const sequence = await this.prisma.invoiceSequence.upsert({
            where: {
                pointOfSale_invoiceType: { pointOfSale, invoiceType: type }
            },
            create: {
                pointOfSale,
                invoiceType: type,
                lastNumber: 1
            },
            update: {
                lastNumber: { increment: 1 }
            }
        });

        return sequence.lastNumber;
    }

    /**
     * Create invoice (draft)
     */
    async createInvoice(dto: CreateInvoiceDto) {
        const number = await this.getNextInvoiceNumber(dto.pointOfSale, dto.type);

        return this.prisma.invoice.create({
            data: {
                saleId: dto.saleId,
                type: dto.type,
                status: InvoiceStatus.DRAFT,
                pointOfSale: dto.pointOfSale,
                number,
                customerName: dto.customerName,
                customerTaxId: dto.customerTaxId,
                customerTaxCondition: dto.customerTaxCondition,
                customerAddress: dto.customerAddress,
                subtotal: dto.subtotal,
                taxAmount: dto.taxAmount,
                otherTaxes: dto.otherTaxes || 0,
                total: dto.total,
                relatedInvoiceId: dto.relatedInvoiceId,
            }
        });
    }

    /**
     * Request CAE from AFIP (stub - placeholder for real implementation)
     * In production, this would call WSFE webservice
     */
    async requestCAE(invoiceId: string): Promise<{ success: boolean; cae?: string; error?: string }> {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }

        // Mark as pending
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: InvoiceStatus.PENDING_CAE }
        });

        try {
            // TODO: Implement real AFIP WSFE call here
            // For now, simulate a successful response

            // Generate mock CAE (14 digits)
            const mockCAE = this.generateMockCAE();
            const caeExpiration = new Date();
            caeExpiration.setDate(caeExpiration.getDate() + 10); // CAE expires in 10 days

            await this.prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    status: InvoiceStatus.AUTHORIZED,
                    cae: mockCAE,
                    caeExpiration,
                    afipResult: 'A', // Approved
                    afipMessage: 'Comprobante autorizado'
                }
            });

            this.logger.log(`CAE generated for invoice ${invoice.pointOfSale}-${invoice.number}: ${mockCAE}`);

            return {
                success: true,
                cae: mockCAE
            };

        } catch (error) {
            await this.prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    status: InvoiceStatus.REJECTED,
                    afipResult: 'R',
                    afipMessage: error instanceof Error ? error.message : 'Unknown error'
                }
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate mock CAE for testing
     */
    private generateMockCAE(): string {
        // 14 digit number
        return Date.now().toString().slice(0, 14).padEnd(14, '0');
    }

    /**
     * Get invoice by ID
     */
    async getInvoice(id: string) {
        return this.prisma.invoice.findUnique({
            where: { id },
            include: { relatedInvoice: true }
        });
    }

    /**
     * Get invoices by date range
     */
    async getInvoices(from: Date, to: Date, type?: InvoiceType) {
        return this.prisma.invoice.findMany({
            where: {
                invoiceDate: {
                    gte: from,
                    lte: to
                },
                ...(type && { type })
            },
            orderBy: { invoiceDate: 'desc' }
        });
    }

    /**
     * Get IVA book data for a period
     */
    async getLibroIVA(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const invoices = await this.prisma.invoice.findMany({
            where: {
                invoiceDate: {
                    gte: startDate,
                    lte: endDate
                },
                status: InvoiceStatus.AUTHORIZED
            },
            orderBy: { invoiceDate: 'asc' }
        });

        // Calculate totals by type
        const summary: Record<string, { count: number; subtotal: number; iva: number; total: number }> = {};

        for (const inv of invoices) {
            const typeKey = inv.type;
            if (!summary[typeKey]) {
                summary[typeKey] = { count: 0, subtotal: 0, iva: 0, total: 0 };
            }
            summary[typeKey].count++;
            summary[typeKey].subtotal += Number(inv.subtotal);
            summary[typeKey].iva += Number(inv.taxAmount);
            summary[typeKey].total += Number(inv.total);
        }

        return {
            period: `${month.toString().padStart(2, '0')}/${year}`,
            invoices,
            summary,
            totalDebito: Object.entries(summary)
                .filter(([k]) => !k.includes('CREDITO'))
                .reduce((sum, [, v]) => sum + v.iva, 0),
            totalCredito: Object.entries(summary)
                .filter(([k]) => k.includes('CREDITO'))
                .reduce((sum, [, v]) => sum + v.iva, 0),
        };
    }

    /**
     * Determine invoice type based on seller and buyer conditions
     */
    determineInvoiceType(
        sellerCondition: TaxCondition,
        buyerCondition: TaxCondition
    ): InvoiceType {
        if (sellerCondition === TaxCondition.MONOTRIBUTISTA) {
            return InvoiceType.FACTURA_C;
        }

        if (sellerCondition === TaxCondition.RESPONSABLE_INSCRIPTO) {
            if (buyerCondition === TaxCondition.RESPONSABLE_INSCRIPTO) {
                return InvoiceType.FACTURA_A;
            }
            return InvoiceType.FACTURA_B;
        }

        return InvoiceType.FACTURA_B;
    }

    /**
     * Create invoice from a sale with automatic type determination
     */
    async createInvoiceFromSale(
        saleId: string,
        pointOfSale: number = 1,
        sellerCondition: TaxCondition = TaxCondition.RESPONSABLE_INSCRIPTO
    ) {
        // Get sale with customer
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                customer: true,
                items: { include: { product: true } }
            }
        });

        if (!sale) {
            throw new Error('Sale not found');
        }

        // Check if sale already has invoice
        const existingInvoice = await this.prisma.invoice.findUnique({
            where: { saleId }
        });

        if (existingInvoice) {
            return existingInvoice;
        }

        // Determine customer tax condition
        const buyerCondition = this.inferTaxCondition(sale.customer);

        // Determine invoice type
        const invoiceType = this.determineInvoiceType(sellerCondition, buyerCondition);

        // Calculate IVA (21% standard rate)
        const saleTotal = Number(sale.totalAmount);
        const ivaRate = 0.21;
        const taxAmount = invoiceType === InvoiceType.FACTURA_C
            ? 0 // Monotributo doesn't discriminate IVA
            : saleTotal * ivaRate / (1 + ivaRate); // Extract IVA from total

        const netSubtotal = saleTotal - taxAmount;

        // Create invoice
        const invoice = await this.createInvoice({
            saleId,
            type: invoiceType,
            pointOfSale,
            customerName: sale.customer?.name || 'Consumidor Final',
            customerTaxId: sale.customer?.taxId || undefined,
            customerTaxCondition: buyerCondition,
            customerAddress: sale.customer?.address || undefined,
            subtotal: netSubtotal,
            taxAmount,
            total: saleTotal,
        });

        // Request CAE immediately
        const caeResult = await this.requestCAE(invoice.id);

        return {
            invoice: await this.getInvoice(invoice.id),
            caeResult
        };
    }

    /**
     * Create credit note for a sale/invoice
     */
    async createCreditNote(
        originalInvoiceId: string,
        reason: string,
        amount?: number // Partial credit, null = full amount
    ) {
        const originalInvoice = await this.prisma.invoice.findUnique({
            where: { id: originalInvoiceId }
        });

        if (!originalInvoice) {
            throw new Error('Original invoice not found');
        }

        // Determine NC type based on original invoice
        let ncType: InvoiceType;
        switch (originalInvoice.type) {
            case InvoiceType.FACTURA_A:
                ncType = InvoiceType.NOTA_CREDITO_A;
                break;
            case InvoiceType.FACTURA_B:
                ncType = InvoiceType.NOTA_CREDITO_B;
                break;
            case InvoiceType.FACTURA_C:
                ncType = InvoiceType.NOTA_CREDITO_C;
                break;
            default:
                ncType = InvoiceType.NOTA_CREDITO_B;
        }

        // Calculate amounts
        const creditTotal = amount || Number(originalInvoice.total);
        const creditRatio = creditTotal / Number(originalInvoice.total);
        const creditSubtotal = Number(originalInvoice.subtotal) * creditRatio;
        const creditTax = Number(originalInvoice.taxAmount) * creditRatio;

        const nc = await this.createInvoice({
            type: ncType,
            pointOfSale: originalInvoice.pointOfSale,
            customerName: originalInvoice.customerName,
            customerTaxId: originalInvoice.customerTaxId || undefined,
            customerTaxCondition: originalInvoice.customerTaxCondition,
            customerAddress: originalInvoice.customerAddress || undefined,
            subtotal: creditSubtotal,
            taxAmount: creditTax,
            total: creditTotal,
            relatedInvoiceId: originalInvoiceId,
        });

        // Request CAE for NC
        await this.requestCAE(nc.id);

        this.logger.log(`Credit note ${nc.pointOfSale}-${nc.number} created for invoice ${originalInvoice.pointOfSale}-${originalInvoice.number}. Reason: ${reason}`);

        return this.getInvoice(nc.id);
    }

    /**
     * Infer tax condition from customer data
     */
    private inferTaxCondition(customer: any): TaxCondition {
        if (!customer) {
            return TaxCondition.CONSUMIDOR_FINAL;
        }

        // If customer has CUIT, likely RI or Monotributo
        if (customer.taxId) {
            const taxId = customer.taxId.replace(/\D/g, '');
            // CUIT starts with 30, 33, 34 for companies (usually RI)
            if (taxId.startsWith('30') || taxId.startsWith('33') || taxId.startsWith('34')) {
                return TaxCondition.RESPONSABLE_INSCRIPTO;
            }
            // CUIT starts with 20, 23, 24, 27 for individuals
            if (taxId.length === 11) {
                // Could be RI or Monotributo - default to RI for B2B
                return customer.type === 'WHOLESALE'
                    ? TaxCondition.RESPONSABLE_INSCRIPTO
                    : TaxCondition.CONSUMIDOR_FINAL;
            }
        }

        return TaxCondition.CONSUMIDOR_FINAL;
    }

    /**
     * Get invoice statistics
     */
    async getInvoiceStats(from: Date, to: Date) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                invoiceDate: { gte: from, lte: to },
                status: InvoiceStatus.AUTHORIZED
            }
        });

        const stats = {
            totalInvoices: invoices.length,
            byType: {} as Record<string, { count: number; total: number }>,
            totalFacturado: 0,
            totalNC: 0,
            totalND: 0,
        };

        for (const inv of invoices) {
            const typeStr = inv.type.toString();
            if (!stats.byType[typeStr]) {
                stats.byType[typeStr] = { count: 0, total: 0 };
            }
            stats.byType[typeStr].count++;
            stats.byType[typeStr].total += Number(inv.total);

            if (typeStr.includes('CREDITO')) {
                stats.totalNC += Number(inv.total);
            } else if (typeStr.includes('DEBITO')) {
                stats.totalND += Number(inv.total);
            } else {
                stats.totalFacturado += Number(inv.total);
            }
        }

        return {
            ...stats,
            neto: stats.totalFacturado - stats.totalNC + stats.totalND
        };
    }

    // ==================== IIBB Methods ====================

    /**
     * Get IIBB configurations
     */
    async getIIBBConfigs(jurisdiction?: string) {
        return this.prisma.iIBBConfig.findMany({
            where: {
                isActive: true,
                ...(jurisdiction && { jurisdiction })
            },
            orderBy: { jurisdiction: 'asc' }
        });
    }

    /**
     * Create or update IIBB configuration
     */
    async upsertIIBBConfig(data: {
        jurisdiction: string;
        jurisdictionName: string;
        perceptionRate: number;
        perceptionMinimum?: number;
        retentionRate?: number;
        activityCode?: string;
    }) {
        return this.prisma.iIBBConfig.upsert({
            where: {
                jurisdiction_activityCode: {
                    jurisdiction: data.jurisdiction,
                    activityCode: data.activityCode || null
                }
            },
            create: {
                jurisdiction: data.jurisdiction,
                jurisdictionName: data.jurisdictionName,
                perceptionRate: data.perceptionRate,
                perceptionMinimum: data.perceptionMinimum || 0,
                retentionRate: data.retentionRate || 0,
                activityCode: data.activityCode,
            },
            update: {
                jurisdictionName: data.jurisdictionName,
                perceptionRate: data.perceptionRate,
                perceptionMinimum: data.perceptionMinimum || 0,
                retentionRate: data.retentionRate || 0,
            }
        });
    }

    /**
     * Calculate IIBB perception for an invoice
     */
    async calculateIIBB(invoiceId: string, customerJurisdiction: string): Promise<number> {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) return 0;

        const config = await this.prisma.iIBBConfig.findFirst({
            where: {
                jurisdiction: customerJurisdiction,
                isActive: true
            }
        });

        if (!config) return 0;

        const baseAmount = Number(invoice.total);

        if (baseAmount < Number(config.perceptionMinimum)) {
            return 0;
        }

        const perceptionAmount = baseAmount * Number(config.perceptionRate);

        // Record the transaction
        await this.prisma.iIBBTransaction.create({
            data: {
                invoiceId,
                jurisdiction: customerJurisdiction,
                baseAmount,
                rate: config.perceptionRate,
                amount: perceptionAmount,
                type: 'PERCEPTION'
            }
        });

        // Update invoice otherTaxes
        await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                otherTaxes: { increment: perceptionAmount }
            }
        });

        this.logger.log(`IIBB perception calculated: ${customerJurisdiction} - $${perceptionAmount.toFixed(2)}`);

        return perceptionAmount;
    }

    /**
     * Get IIBB report for a period
     */
    async getIIBBReport(month: number, year: number) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = await this.prisma.iIBBTransaction.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Summary by jurisdiction
        const byJurisdiction: Record<string, { count: number; base: number; amount: number }> = {};

        for (const tx of transactions) {
            if (!byJurisdiction[tx.jurisdiction]) {
                byJurisdiction[tx.jurisdiction] = { count: 0, base: 0, amount: 0 };
            }
            byJurisdiction[tx.jurisdiction].count++;
            byJurisdiction[tx.jurisdiction].base += Number(tx.baseAmount);
            byJurisdiction[tx.jurisdiction].amount += Number(tx.amount);
        }

        return {
            period: `${month.toString().padStart(2, '0')}/${year}`,
            transactions,
            byJurisdiction,
            totalPerceptions: transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)
        };
    }

    // ==================== Libro IVA CITI Export ====================

    /**
     * Export Libro IVA Ventas in CITI format (AFIP RG 3685)
     */
    async exportLibroIVACITI(month: number, year: number) {
        const libroIVA = await this.getLibroIVA(month, year);

        // CITI Ventas format (fixed-width text file)
        const lines: string[] = [];

        for (const inv of libroIVA.invoices) {
            // Format according to RG 3685
            const line = [
                this.formatDate(inv.invoiceDate),                    // Fecha (8)
                this.getAFIPInvoiceTypeCode(inv.type).toString().padStart(3, '0'), // Tipo (3)
                inv.pointOfSale.toString().padStart(5, '0'),         // Punto Venta (5)
                inv.number.toString().padStart(20, '0'),             // Número (20)
                inv.number.toString().padStart(20, '0'),             // Número Hasta (20)
                this.getDocTypeCode(inv.customerTaxId).toString().padStart(2, '0'), // Tipo Doc (2)
                (inv.customerTaxId || '0').replace(/\D/g, '').padStart(20, '0'), // Nro Doc (20)
                inv.customerName.substring(0, 30).padEnd(30, ' '),   // Denominación (30)
                this.formatAmount(inv.total),                        // Importe Total (15)
                this.formatAmount(inv.subtotal),                     // Importe Neto (15)
                '0'.padStart(15, '0'),                               // No Gravado (15)
                '0'.padStart(15, '0'),                               // Exento (15)
                this.formatAmount(inv.otherTaxes),                   // Percepciones (15)
                this.formatAmount(inv.taxAmount),                    // IVA (15)
                '0'.padStart(15, '0'),                               // IIBB (15) 
                '0'.padStart(15, '0'),                               // Municipales (15)
                '0'.padStart(15, '0'),                               // Internos (15)
                'PES',                                               // Moneda (3)
                '0001000000',                                        // Tipo Cambio (10)
                (inv.cae || '').padStart(14, '0'),                   // CAE (14)
                this.formatDate(inv.caeExpiration),                  // Vto CAE (8)
            ].join('');

            lines.push(line);
        }

        return {
            filename: `LIBRO_IVA_VENTAS_${year}${month.toString().padStart(2, '0')}.txt`,
            content: lines.join('\r\n'),
            recordCount: lines.length,
            summary: libroIVA.summary
        };
    }

    private formatDate(date: Date | null): string {
        if (!date) return '00000000';
        const d = new Date(date);
        return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    }

    private formatAmount(amount: any): string {
        const num = Math.round(Number(amount || 0) * 100);
        return num.toString().padStart(15, '0');
    }

    private getDocTypeCode(taxId: string | null): number {
        if (!taxId) return 99; // Consumidor Final
        const cleaned = taxId.replace(/\D/g, '');
        if (cleaned.length === 11) return 80; // CUIT
        if (cleaned.length === 8) return 96;  // DNI
        return 99;
    }

    private getAFIPInvoiceTypeCode(type: InvoiceType): number {
        const codes: Record<InvoiceType, number> = {
            FACTURA_A: 1,
            FACTURA_B: 6,
            FACTURA_C: 11,
            FACTURA_M: 51,
            FACTURA_E: 19,
            NOTA_CREDITO_A: 3,
            NOTA_CREDITO_B: 8,
            NOTA_CREDITO_C: 13,
            NOTA_DEBITO_A: 2,
            NOTA_DEBITO_B: 7,
            NOTA_DEBITO_C: 12,
            RECIBO_X: 0,
            FACTURA_X: 0,
        };
        return codes[type] || 0;
    }
}
