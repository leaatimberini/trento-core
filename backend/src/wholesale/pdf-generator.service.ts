import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Response } from 'express';

// Company configuration (should come from environment/settings)
const COMPANY_CONFIG = {
    name: 'TRENTO DISTRIBUIDORA',
    businessName: 'Trento Distribuidora S.R.L.',
    cuit: '30-71234567-8',
    taxCondition: 'IVA Responsable Inscripto',
    address: 'Av. Principal 1234, CABA',
    phone: '+54 11 1234-5678',
    email: 'ventas@trento.com.ar',
    website: 'www.trento.com.ar',
    logoUrl: '/logo.png',
    iibbNumber: '123-456789-0',
    activityStart: '01/01/2020'
};

@Injectable()
export class PdfGeneratorService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate Quotation PDF
     */
    async generateQuotationPdf(quotationId: string, res: Response) {
        const quotation = await this.prisma.quotation.findUnique({
            where: { id: quotationId },
            include: {
                items: true,
                customer: true
            }
        });

        if (!quotation) {
            throw new NotFoundException('Presupuesto no encontrado');
        }

        const html = this.generateQuotationHtml(quotation);
        return this.sendHtmlAsPdf(res, html, `Presupuesto_${quotation.code}.pdf`);
    }

    /**
     * Generate Consignment Return PDF
     */
    async generateReturnPdf(returnId: string, res: Response) {
        const returnRecord = await this.prisma.consignmentReturn.findUnique({
            where: { id: returnId },
            include: {
                items: true,
                consignment: {
                    include: { customer: true }
                }
            }
        });

        if (!returnRecord) {
            throw new NotFoundException('Devolución no encontrada');
        }

        const html = this.generateReturnHtml(returnRecord);
        return this.sendHtmlAsPdf(res, html, `Devolucion_${returnRecord.code}.pdf`);
    }

    /**
     * Generate Consignment Remit PDF
     */
    async generateConsignmentRemitPdf(consignmentId: string, res: Response) {
        const consignment = await this.prisma.consignmentSale.findUnique({
            where: { id: consignmentId },
            include: {
                items: true,
                customer: true
            }
        });

        if (!consignment) {
            throw new NotFoundException('Consignación no encontrada');
        }

        const html = this.generateConsignmentRemitHtml(consignment);
        return this.sendHtmlAsPdf(res, html, `Remito_${consignment.code}.pdf`);
    }

    /**
     * Generate Invoice PDF
     */
    async generateInvoicePdf(invoiceId: string, res: Response) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                sale: {
                    include: {
                        items: {
                            include: { product: true }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            throw new NotFoundException('Factura no encontrada');
        }

        const html = this.generateInvoiceHtml(invoice);
        return this.sendHtmlAsPdf(res, html, `Factura_${invoice.type}_${invoice.pointOfSale}-${invoice.number}.pdf`);
    }

    /**
     * Send HTML as downloadable PDF (using browser print)
     * In production, you would use puppeteer or similar
     */
    private sendHtmlAsPdf(res: Response, html: string, filename: string) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(html);
    }

    // =============================================
    // HTML TEMPLATES
    // =============================================

    private getBaseStyles(): string {
        return `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    font-size: 11px; 
                    line-height: 1.4;
                    color: #333;
                    padding: 20px;
                }
                .document { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    border: 2px solid #333;
                    padding: 20px;
                }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    border-bottom: 2px solid #333; 
                    padding-bottom: 15px; 
                    margin-bottom: 15px;
                }
                .company-info { flex: 1; }
                .company-name { font-size: 18px; font-weight: bold; color: #2c5282; }
                .company-details { font-size: 10px; color: #666; margin-top: 5px; }
                .doc-type { 
                    text-align: right; 
                    flex: 1;
                }
                .doc-type-label { 
                    font-size: 24px; 
                    font-weight: bold; 
                    color: #2c5282;
                    border: 3px solid #2c5282;
                    padding: 10px 20px;
                    display: inline-block;
                }
                .doc-number { font-size: 14px; margin-top: 10px; }
                .doc-date { font-size: 11px; color: #666; }
                
                .customer-section { 
                    background: #f7fafc; 
                    padding: 15px; 
                    margin-bottom: 20px;
                    border: 1px solid #e2e8f0;
                }
                .section-title { 
                    font-weight: bold; 
                    font-size: 12px; 
                    margin-bottom: 10px;
                    color: #2c5282;
                    border-bottom: 1px solid #2c5282;
                    padding-bottom: 5px;
                }
                .customer-row { display: flex; margin-bottom: 5px; }
                .customer-label { width: 120px; font-weight: bold; }
                .customer-value { flex: 1; }
                
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th { 
                    background: #2c5282; 
                    color: white; 
                    padding: 10px; 
                    text-align: left;
                    font-size: 11px;
                }
                .items-table td { 
                    padding: 8px 10px; 
                    border-bottom: 1px solid #e2e8f0;
                }
                .items-table tr:nth-child(even) { background: #f7fafc; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                
                .totals { 
                    margin-left: auto; 
                    width: 300px; 
                    margin-bottom: 20px;
                }
                .totals-row { 
                    display: flex; 
                    justify-content: space-between; 
                    padding: 5px 0;
                    border-bottom: 1px solid #e2e8f0;
                }
                .totals-row.total { 
                    font-weight: bold; 
                    font-size: 14px; 
                    background: #2c5282;
                    color: white;
                    padding: 10px;
                    margin-top: 5px;
                }
                
                .footer { 
                    margin-top: 30px; 
                    padding-top: 15px; 
                    border-top: 1px solid #e2e8f0;
                    font-size: 10px;
                    color: #666;
                }
                .terms { 
                    background: #fffbeb; 
                    padding: 10px; 
                    border: 1px solid #f59e0b;
                    margin-bottom: 15px;
                }
                .terms-title { font-weight: bold; color: #d97706; margin-bottom: 5px; }
                
                .validity { 
                    background: #fef2f2; 
                    padding: 10px; 
                    border: 1px solid #ef4444;
                    text-align: center;
                    font-weight: bold;
                    color: #dc2626;
                }
                
                .fiscal-info {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 20px;
                    font-size: 10px;
                }
                .cae-box {
                    border: 2px solid #333;
                    padding: 10px;
                    text-align: center;
                }
                .cae-label { font-weight: bold; }
                .cae-value { font-size: 14px; font-family: monospace; }
                
                @media print {
                    body { padding: 0; }
                    .document { border: none; }
                    @page { margin: 1cm; }
                }
            </style>
        `;
    }

    private formatCurrency(amount: any): string {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(Number(amount) || 0);
    }

    private formatDate(date: Date | null): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    private generateQuotationHtml(quotation: any): string {
        const itemsRows = quotation.items.map((item: any, index: number) => `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.productSku || '-'}</td>
                <td>${item.productName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
                <td class="text-center">${Number(item.discount) > 0 ? `${item.discount}%` : '-'}</td>
                <td class="text-right">${this.formatCurrency(item.totalPrice)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Presupuesto ${quotation.code}</title>
                ${this.getBaseStyles()}
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="company-info">
                            <div class="company-name">${COMPANY_CONFIG.name}</div>
                            <div class="company-details">
                                ${COMPANY_CONFIG.businessName}<br>
                                CUIT: ${COMPANY_CONFIG.cuit}<br>
                                ${COMPANY_CONFIG.taxCondition}<br>
                                ${COMPANY_CONFIG.address}<br>
                                Tel: ${COMPANY_CONFIG.phone} | ${COMPANY_CONFIG.email}
                            </div>
                        </div>
                        <div class="doc-type">
                            <div class="doc-type-label">PRESUPUESTO</div>
                            <div class="doc-number">N° ${quotation.code}</div>
                            <div class="doc-date">Fecha: ${this.formatDate(quotation.createdAt)}</div>
                        </div>
                    </div>
                    
                    <div class="customer-section">
                        <div class="section-title">DATOS DEL CLIENTE</div>
                        <div class="customer-row">
                            <span class="customer-label">Razón Social:</span>
                            <span class="customer-value">${quotation.customer.businessName || quotation.customer.name}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">CUIT:</span>
                            <span class="customer-value">${quotation.customer.cuit || quotation.customer.taxId || '-'}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">Dirección:</span>
                            <span class="customer-value">${quotation.customer.address || '-'}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">Condición IVA:</span>
                            <span class="customer-value">${quotation.customer.taxCondition || 'Consumidor Final'}</span>
                        </div>
                    </div>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width:40px">#</th>
                                <th style="width:80px">Código</th>
                                <th>Descripción</th>
                                <th style="width:60px" class="text-center">Cant.</th>
                                <th style="width:100px" class="text-right">P. Unit.</th>
                                <th style="width:60px" class="text-center">Dto.</th>
                                <th style="width:100px" class="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <div class="totals-row">
                            <span>Subtotal:</span>
                            <span>${this.formatCurrency(quotation.subtotal)}</span>
                        </div>
                        <div class="totals-row">
                            <span>Descuento:</span>
                            <span>- ${this.formatCurrency(quotation.discountAmount)}</span>
                        </div>
                        <div class="totals-row">
                            <span>IVA (21%):</span>
                            <span>${this.formatCurrency(quotation.taxAmount)}</span>
                        </div>
                        <div class="totals-row total">
                            <span>TOTAL:</span>
                            <span>${this.formatCurrency(quotation.total)}</span>
                        </div>
                    </div>
                    
                    <div class="validity">
                        ⚠️ PRESUPUESTO VÁLIDO HASTA: ${this.formatDate(quotation.validUntil)}
                    </div>
                    
                    ${quotation.termsAndConditions ? `
                        <div class="terms">
                            <div class="terms-title">TÉRMINOS Y CONDICIONES</div>
                            <div>${quotation.termsAndConditions}</div>
                        </div>
                    ` : ''}
                    
                    ${quotation.notes ? `
                        <div class="footer">
                            <strong>Observaciones:</strong> ${quotation.notes}
                        </div>
                    ` : ''}
                    
                    <div class="footer">
                        <p>Este documento no es válido como factura. Los precios pueden variar sin previo aviso.</p>
                        <p>Para confirmar el pedido, comuníquese con nuestro equipo comercial.</p>
                    </div>
                </div>
                
                <script>
                    // Auto-print when opened
                    // window.print();
                </script>
            </body>
            </html>
        `;
    }

    private generateConsignmentRemitHtml(consignment: any): string {
        const itemsRows = consignment.items.map((item: any, index: number) => `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.productSku || '-'}</td>
                <td>${item.productName}</td>
                <td class="text-center">${item.quantityDelivered}</td>
                <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${this.formatCurrency(Number(item.unitPrice) * item.quantityDelivered)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Remito ${consignment.code}</title>
                ${this.getBaseStyles()}
                <style>
                    .doc-type-label { background: #059669 !important; border-color: #059669 !important; color: white; }
                    .section-title { color: #059669; border-color: #059669; }
                    .items-table th { background: #059669; }
                    .totals-row.total { background: #059669; }
                    .consignment-note {
                        background: #ecfdf5;
                        border: 2px solid #059669;
                        padding: 15px;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                    .consignment-note strong { color: #059669; font-size: 14px; }
                    .signature-area {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 50px;
                        padding-top: 20px;
                    }
                    .signature-box {
                        width: 200px;
                        text-align: center;
                        border-top: 1px solid #333;
                        padding-top: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="company-info">
                            <div class="company-name">${COMPANY_CONFIG.name}</div>
                            <div class="company-details">
                                ${COMPANY_CONFIG.businessName}<br>
                                CUIT: ${COMPANY_CONFIG.cuit}<br>
                                ${COMPANY_CONFIG.address}<br>
                                Tel: ${COMPANY_CONFIG.phone}
                            </div>
                        </div>
                        <div class="doc-type">
                            <div class="doc-type-label">REMITO DE CONSIGNACIÓN</div>
                            <div class="doc-number">N° ${consignment.code}</div>
                            <div class="doc-date">Fecha: ${this.formatDate(consignment.deliveredAt)}</div>
                        </div>
                    </div>
                    
                    <div class="consignment-note">
                        <strong>MERCADERÍA EN CONSIGNACIÓN</strong><br>
                        La mercadería detallada se entrega en consignación. No constituye venta ni genera obligación de pago hasta su facturación.
                    </div>
                    
                    <div class="customer-section">
                        <div class="section-title">DATOS DEL CONSIGNATARIO</div>
                        <div class="customer-row">
                            <span class="customer-label">Razón Social:</span>
                            <span class="customer-value">${consignment.customer.businessName || consignment.customer.name}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">CUIT:</span>
                            <span class="customer-value">${consignment.customer.cuit || consignment.customer.taxId || '-'}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">Dirección:</span>
                            <span class="customer-value">${consignment.customer.address || '-'}</span>
                        </div>
                    </div>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width:40px">#</th>
                                <th style="width:80px">Código</th>
                                <th>Descripción</th>
                                <th style="width:80px" class="text-center">Cantidad</th>
                                <th style="width:100px" class="text-right">P. Unit. Ref.</th>
                                <th style="width:100px" class="text-right">Valor Ref.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <div class="totals-row total">
                            <span>VALOR TOTAL CONSIGNADO:</span>
                            <span>${this.formatCurrency(consignment.totalValue)}</span>
                        </div>
                    </div>
                    
                    ${consignment.notes ? `
                        <div class="terms">
                            <div class="terms-title">OBSERVACIONES</div>
                            <div>${consignment.notes}</div>
                        </div>
                    ` : ''}
                    
                    <div class="signature-area">
                        <div class="signature-box">
                            Entregué Conforme<br>
                            <small>${COMPANY_CONFIG.name}</small>
                        </div>
                        <div class="signature-box">
                            Recibí Conforme<br>
                            <small>Firma y Aclaración</small>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>IMPORTANTE:</strong> Este remito debe ser conservado para control de la mercadería consignada.</p>
                        <p>La devolución parcial o total debe realizarse con este documento.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private generateInvoiceHtml(invoice: any): string {
        const invoiceTypeLetter = invoice.type.includes('_A') ? 'A' :
            invoice.type.includes('_B') ? 'B' :
                invoice.type.includes('_C') ? 'C' : 'X';

        const itemsRows = invoice.sale?.items?.map((item: any, index: number) => `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.product?.sku || '-'}</td>
                <td>${item.product?.name || 'Producto'}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${this.formatCurrency(item.totalPrice)}</td>
            </tr>
        `).join('') || '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Factura ${invoice.type} ${invoice.pointOfSale}-${invoice.number}</title>
                ${this.getBaseStyles()}
                <style>
                    .invoice-letter {
                        width: 60px;
                        height: 60px;
                        border: 3px solid #333;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 36px;
                        font-weight: bold;
                        margin: 0 auto 10px;
                    }
                    .header-middle {
                        text-align: center;
                        padding: 0 20px;
                    }
                </style>
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="company-info">
                            <div class="company-name">${COMPANY_CONFIG.name}</div>
                            <div class="company-details">
                                ${COMPANY_CONFIG.businessName}<br>
                                CUIT: ${COMPANY_CONFIG.cuit}<br>
                                ${COMPANY_CONFIG.taxCondition}<br>
                                ${COMPANY_CONFIG.address}<br>
                                IIBB: ${COMPANY_CONFIG.iibbNumber}<br>
                                Inicio de Actividades: ${COMPANY_CONFIG.activityStart}
                            </div>
                        </div>
                        <div class="header-middle">
                            <div class="invoice-letter">${invoiceTypeLetter}</div>
                            <div style="font-size:10px">COD. ${invoiceTypeLetter === 'A' ? '01' : invoiceTypeLetter === 'B' ? '06' : '11'}</div>
                        </div>
                        <div class="doc-type">
                            <div class="doc-type-label">FACTURA</div>
                            <div class="doc-number">
                                Punto de Venta: ${String(invoice.pointOfSale).padStart(5, '0')}<br>
                                Comp. Nro: ${String(invoice.number).padStart(8, '0')}
                            </div>
                            <div class="doc-date">Fecha: ${this.formatDate(invoice.createdAt)}</div>
                        </div>
                    </div>
                    
                    <div class="customer-section">
                        <div class="section-title">DATOS DEL RECEPTOR</div>
                        <div class="customer-row">
                            <span class="customer-label">Razón Social:</span>
                            <span class="customer-value">${invoice.customerName}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">CUIT/CUIL/DNI:</span>
                            <span class="customer-value">${invoice.customerTaxId || '-'}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">Condición IVA:</span>
                            <span class="customer-value">${invoice.customerTaxCondition?.replace('_', ' ') || '-'}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">Domicilio:</span>
                            <span class="customer-value">${invoice.customerAddress || '-'}</span>
                        </div>
                    </div>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width:40px">#</th>
                                <th style="width:80px">Código</th>
                                <th>Descripción</th>
                                <th style="width:60px" class="text-center">Cant.</th>
                                <th style="width:100px" class="text-right">P. Unit.</th>
                                <th style="width:100px" class="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <div class="totals-row">
                            <span>Subtotal:</span>
                            <span>${this.formatCurrency(invoice.subtotal)}</span>
                        </div>
                        ${invoiceTypeLetter !== 'C' ? `
                            <div class="totals-row">
                                <span>IVA 21%:</span>
                                <span>${this.formatCurrency(invoice.taxAmount)}</span>
                            </div>
                        ` : ''}
                        ${invoice.otherTaxes ? `
                            <div class="totals-row">
                                <span>Otros Impuestos:</span>
                                <span>${this.formatCurrency(invoice.otherTaxes)}</span>
                            </div>
                        ` : ''}
                        <div class="totals-row total">
                            <span>TOTAL:</span>
                            <span>${this.formatCurrency(invoice.total)}</span>
                        </div>
                    </div>
                    
                    <div class="fiscal-info">
                        <div class="cae-box">
                            <div class="cae-label">CAE N°:</div>
                            <div class="cae-value">${invoice.cae || 'PENDIENTE'}</div>
                            <div style="margin-top:5px">
                                <span class="cae-label">Vto. CAE:</span>
                                ${this.formatDate(invoice.caeExpiration)}
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <p style="text-align:center;font-size:9px">
                            Esta factura fue autorizada por AFIP - Consulte su validez en www.afip.gob.ar
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Generate Consignment Return PDF
     */
    private generateReturnHtml(returnRecord: any): string {
        const itemsRows = returnRecord.items.map((item: any, index: number) => `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.productName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-center">${item.condition === 'GOOD' ? 'Buen Estado' : 'Dañado'}</td>
                <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${this.formatCurrency(Number(item.unitPrice) * item.quantity)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Devolución ${returnRecord.code}</title>
                ${this.getBaseStyles()}
                <style>
                    .doc-type-label { background: #d97706 !important; border-color: #d97706 !important; color: white; }
                    .section-title { color: #d97706; border-color: #d97706; }
                    .items-table th { background: #d97706; }
                    .totals-row.total { background: #d97706; }
                </style>
            </head>
            <body>
                <div class="document">
                    <div class="header">
                        <div class="company-info">
                            <div class="company-name">${COMPANY_CONFIG.name}</div>
                            <div class="company-details">
                                ${COMPANY_CONFIG.businessName}<br>
                                CUIT: ${COMPANY_CONFIG.cuit}<br>
                                ${COMPANY_CONFIG.address}<br>
                                Tel: ${COMPANY_CONFIG.phone}
                            </div>
                        </div>
                        <div class="doc-type">
                            <div class="doc-type-label">COMPROBANTE DE DEVOLUCIÓN</div>
                            <div class="doc-number">N° ${returnRecord.code}</div>
                            <div class="doc-date">Fecha: ${this.formatDate(returnRecord.createdAt)}</div>
                        </div>
                    </div>
                    
                    <div class="customer-section">
                        <div class="section-title">DATOS DEL CLIENTE</div>
                        <div class="customer-row">
                            <span class="customer-label">Razón Social:</span>
                            <span class="customer-value">${returnRecord.consignment.customer.businessName || returnRecord.consignment.customer.name}</span>
                        </div>
                        <div class="customer-row">
                            <span class="customer-label">Consignación Ref:</span>
                            <span class="customer-value">${returnRecord.consignment.code}</span>
                        </div>
                    </div>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width:40px">#</th>
                                <th>Producto</th>
                                <th style="width:80px" class="text-center">Cant.</th>
                                <th style="width:100px" class="text-center">Condición</th>
                                <th style="width:100px" class="text-right">P. Unit.</th>
                                <th style="width:100px" class="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <div class="totals-row total">
                            <span>TOTAL DEVUELTO:</span>
                            <span>${this.formatCurrency(returnRecord.totalValue)}</span>
                        </div>
                    </div>
                    
                    ${returnRecord.reason ? `
                        <div class="terms">
                            <div class="terms-title">MOTIVO DE DEVOLUCIÓN</div>
                            <div>${returnRecord.reason}</div>
                        </div>
                    ` : ''}

                    ${returnRecord.receivedBy ? `
                        <div class="customer-section" style="margin-top:20px">
                            <div class="customer-row">
                                <span class="customer-label">Recibido por:</span>
                                <span class="customer-value">${returnRecord.receivedBy}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="footer">
                        <p>Comprobante generado automáticamente por el sistema.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

