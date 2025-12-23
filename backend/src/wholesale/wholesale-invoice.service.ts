import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, TaxCondition, InvoiceType } from '@prisma/client';

export interface InvoiceFromQuotationDto {
    quotationId: string;
    pointOfSale?: number;
    paymentMethod?: string;
    paymentReference?: string;
}

export interface InvoiceFromConsignmentDto {
    consignmentId: string;
    items: {
        productId: string;
        quantity: number;
    }[];
    pointOfSale?: number;
    paymentMethod?: string;
    paymentReference?: string;
}

@Injectable()
export class WholesaleInvoiceService {
    constructor(private prisma: PrismaService) { }

    /**
     * Determine invoice type based on customer tax condition
     */
    private determineInvoiceType(
        sellerCondition: TaxCondition,
        buyerCondition: TaxCondition
    ): InvoiceType {
        if (sellerCondition === 'RESPONSABLE_INSCRIPTO') {
            if (buyerCondition === 'RESPONSABLE_INSCRIPTO') {
                return 'FACTURA_A';
            }
            return 'FACTURA_B';
        }
        if (sellerCondition === 'MONOTRIBUTISTA') {
            return 'FACTURA_C';
        }
        return 'FACTURA_X';
    }

    /**
     * Validate margins before invoicing
     */
    private async validateMargins(items: { productId: string; unitPrice: number; quantity: number }[]): Promise<{
        valid: boolean;
        warnings: string[];
        totalMargin: number;
    }> {
        const warnings: string[] = [];
        let totalRevenue = 0;
        let totalCost = 0;

        for (const item of items) {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: { name: true, costPrice: true }
            });

            if (product) {
                const cost = Number(product.costPrice) * item.quantity;
                const revenue = item.unitPrice * item.quantity;
                totalCost += cost;
                totalRevenue += revenue;

                const margin = revenue - cost;
                const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

                if (marginPercent < 0) {
                    warnings.push(`⚠️ ${product.name}: Margen negativo (${marginPercent.toFixed(1)}%)`);
                } else if (marginPercent < 10) {
                    warnings.push(`⚠️ ${product.name}: Margen bajo (${marginPercent.toFixed(1)}%)`);
                }
            }
        }

        const totalMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

        return {
            valid: totalMargin >= 0,
            warnings,
            totalMargin
        };
    }

    /**
     * Create invoice from accepted quotation
     */
    async invoiceFromQuotation(dto: InvoiceFromQuotationDto, userId?: string) {
        const quotation = await this.prisma.quotation.findUnique({
            where: { id: dto.quotationId },
            include: {
                items: true,
                customer: true
            }
        });

        if (!quotation) {
            throw new NotFoundException('Presupuesto no encontrado');
        }

        if (quotation.status !== 'ACCEPTED') {
            throw new BadRequestException('Solo se pueden facturar presupuestos aceptados');
        }

        if (new Date() > quotation.validUntil) {
            throw new BadRequestException('Este presupuesto ha expirado');
        }

        // Validate margins
        const marginCheck = await this.validateMargins(
            quotation.items.map(i => ({
                productId: i.productId,
                unitPrice: Number(i.unitPrice),
                quantity: i.quantity
            }))
        );

        if (!marginCheck.valid) {
            throw new BadRequestException(
                `Facturación bloqueada: margen total negativo (${marginCheck.totalMargin.toFixed(1)}%)`
            );
        }

        const pointOfSale = dto.pointOfSale || 1;
        const sellerCondition: TaxCondition = 'RESPONSABLE_INSCRIPTO';
        const buyerCondition = quotation.customer.taxCondition || 'CONSUMIDOR_FINAL';
        const invoiceType = this.determineInvoiceType(sellerCondition, buyerCondition);

        // Get next invoice number
        const sequence = await this.prisma.invoiceSequence.upsert({
            where: { pointOfSale_invoiceType: { pointOfSale, invoiceType } },
            update: { lastNumber: { increment: 1 } },
            create: { pointOfSale, invoiceType, lastNumber: 1 }
        });

        // Create sale and invoice in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create sale from quotation
            const sale = await tx.sale.create({
                data: {
                    code: `VTA-${Date.now()}`,
                    channel: 'B2B',
                    status: 'COMPLETED',
                    documentType: 'SALE',
                    totalAmount: quotation.total,
                    discountAmount: quotation.discountAmount,
                    taxAmount: quotation.taxAmount,
                    customerId: quotation.customerId,
                    userId,
                    items: {
                        create: quotation.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice
                        }))
                    }
                }
            });

            // Create invoice
            const invoice = await tx.invoice.create({
                data: {
                    saleId: sale.id,
                    type: invoiceType,
                    status: 'AUTHORIZED', // For now, simulate CAE
                    pointOfSale,
                    number: sequence.lastNumber,
                    customerName: quotation.customer.businessName || quotation.customer.name,
                    customerTaxId: quotation.customer.cuit || quotation.customer.taxId,
                    customerTaxCondition: buyerCondition,
                    customerAddress: quotation.customer.address,
                    subtotal: quotation.subtotal,
                    taxAmount: quotation.taxAmount,
                    total: quotation.total,
                    cae: this.generateMockCAE(),
                    caeExpiration: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
                }
            });

            // Update quotation status
            await tx.quotation.update({
                where: { id: dto.quotationId },
                data: {
                    status: 'INVOICED',
                    convertedToSaleId: sale.id
                }
            });

            // Deduct stock for each item
            for (const item of quotation.items) {
                await tx.inventoryTransaction.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.quantity,
                        type: 'SALE',
                        referenceId: sale.id,
                        userId
                    }
                });

                // Deduct from inventory
                const invItem = await tx.inventoryItem.findFirst({
                    where: { productId: item.productId, quantity: { gt: 0 } }
                });
                if (invItem) {
                    await tx.inventoryItem.update({
                        where: { id: invItem.id },
                        data: { quantity: { decrement: item.quantity } }
                    });
                }
            }

            return { sale, invoice, marginCheck };
        });

        // Register Payment if provided (outside transaction for simplicity, or could be inside?)
        // Let's do it outside since we returned the sale
        if (dto.paymentMethod && result.sale) {
            await this.prisma.payment.create({
                data: {
                    saleId: result.sale.id,
                    method: dto.paymentMethod,
                    amount: result.sale.totalAmount
                }
            });

            if (dto.paymentReference) {
                await this.prisma.sale.update({
                    where: { id: result.sale.id },
                    data: {
                        status: 'PAID',
                        observations: `Ref Pago: ${dto.paymentReference}`
                    }
                });
            } else {
                await this.prisma.sale.update({
                    where: { id: result.sale.id },
                    data: { status: 'PAID' }
                });
            }
        }

        return result;
    }

    /**
     * Create invoice from consignment (partial invoicing)
     */
    async invoiceFromConsignment(dto: InvoiceFromConsignmentDto, userId?: string) {
        const consignment = await this.prisma.consignmentSale.findUnique({
            where: { id: dto.consignmentId },
            include: {
                items: true,
                customer: true
            }
        });

        if (!consignment) {
            throw new NotFoundException('Consignación no encontrada');
        }

        if (consignment.status === 'CLOSED') {
            throw new BadRequestException('Esta consignación ya está cerrada');
        }

        // Validate quantities
        const invoiceItems = [];
        let subtotal = 0;
        let taxAmount = 0;

        for (const reqItem of dto.items) {
            const consItem = consignment.items.find(i => i.productId === reqItem.productId);
            if (!consItem) {
                throw new BadRequestException(`Producto ${reqItem.productId} no está en esta consignación`);
            }

            const available = consItem.quantityDelivered - consItem.quantityReturned - consItem.quantityInvoiced;
            if (reqItem.quantity > available) {
                throw new BadRequestException(
                    `No se pueden facturar ${reqItem.quantity} unidades de ${consItem.productName}. Disponibles: ${available}`
                );
            }

            const product = await this.prisma.product.findUnique({
                where: { id: reqItem.productId },
                select: { taxRate: true }
            });

            const lineTotal = Number(consItem.unitPrice) * reqItem.quantity;
            const lineTax = lineTotal * (Number(product?.taxRate || 21) / 100);

            subtotal += lineTotal;
            taxAmount += lineTax;

            invoiceItems.push({
                productId: reqItem.productId,
                productName: consItem.productName,
                quantity: reqItem.quantity,
                unitPrice: consItem.unitPrice,
                totalPrice: new Prisma.Decimal(lineTotal)
            });
        }

        const total = subtotal + taxAmount;

        // Validate margins
        const marginCheck = await this.validateMargins(
            invoiceItems.map(i => ({
                productId: i.productId,
                unitPrice: Number(i.unitPrice),
                quantity: i.quantity
            }))
        );

        if (!marginCheck.valid) {
            throw new BadRequestException(
                `Facturación bloqueada: margen total negativo (${marginCheck.totalMargin.toFixed(1)}%)`
            );
        }

        const pointOfSale = dto.pointOfSale || 1;
        const sellerCondition: TaxCondition = 'RESPONSABLE_INSCRIPTO';
        const buyerCondition = consignment.customer.taxCondition || 'CONSUMIDOR_FINAL';
        const invoiceType = this.determineInvoiceType(sellerCondition, buyerCondition);

        // Get next invoice number
        const sequence = await this.prisma.invoiceSequence.upsert({
            where: { pointOfSale_invoiceType: { pointOfSale, invoiceType } },
            update: { lastNumber: { increment: 1 } },
            create: { pointOfSale, invoiceType, lastNumber: 1 }
        });

        // Create sale and invoice in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create sale from consignment items
            const sale = await tx.sale.create({
                data: {
                    code: `VTA-CONS-${Date.now()}`,
                    channel: 'B2B',
                    status: 'COMPLETED',
                    documentType: 'SALE',
                    totalAmount: new Prisma.Decimal(total),
                    discountAmount: new Prisma.Decimal(0),
                    taxAmount: new Prisma.Decimal(taxAmount),
                    customerId: consignment.customerId,
                    userId,
                    items: {
                        create: invoiceItems.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice
                        }))
                    }
                }
            });

            // Create invoice
            const invoice = await tx.invoice.create({
                data: {
                    saleId: sale.id,
                    type: invoiceType,
                    status: 'AUTHORIZED',
                    pointOfSale,
                    number: sequence.lastNumber,
                    customerName: consignment.customer.businessName || consignment.customer.name,
                    customerTaxId: consignment.customer.cuit || consignment.customer.taxId,
                    customerTaxCondition: buyerCondition,
                    customerAddress: consignment.customer.address,
                    subtotal: new Prisma.Decimal(subtotal),
                    taxAmount: new Prisma.Decimal(taxAmount),
                    total: new Prisma.Decimal(total),
                    cae: this.generateMockCAE(),
                    caeExpiration: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                }
            });

            // Update consignment items (mark as invoiced)
            for (const reqItem of dto.items) {
                const consItem = consignment.items.find(i => i.productId === reqItem.productId)!;
                await tx.consignmentItem.update({
                    where: { id: consItem.id },
                    data: { quantityInvoiced: { increment: reqItem.quantity } }
                });
            }

            // Update consignment totals and status
            await tx.consignmentSale.update({
                where: { id: dto.consignmentId },
                data: {
                    invoicedValue: { increment: total },
                    status: 'PARTIALLY_INVOICED'
                }
            });

            return { sale, invoice, marginCheck };
        });

        // Register Payment if provided
        if (dto.paymentMethod && result.sale) {
            await this.prisma.payment.create({
                data: {
                    saleId: result.sale.id,
                    method: dto.paymentMethod,
                    amount: result.sale.totalAmount
                }
            });

            if (dto.paymentReference) {
                await this.prisma.sale.update({
                    where: { id: result.sale.id },
                    data: {
                        status: 'PAID',
                        observations: `Ref Pago: ${dto.paymentReference}`
                    }
                });
            } else {
                await this.prisma.sale.update({
                    where: { id: result.sale.id },
                    data: { status: 'PAID' }
                });
            }
        }

        // Check if consignment should be closed
        await this.checkAndCloseConsignment(dto.consignmentId);

        return result;
    }

    /**
     * Check if consignment is fully processed and close it
     */
    private async checkAndCloseConsignment(id: string) {
        const consignment = await this.prisma.consignmentSale.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!consignment) return;

        const allProcessed = consignment.items.every(item => {
            const processed = item.quantityReturned + item.quantityInvoiced;
            return processed >= item.quantityDelivered;
        });

        if (allProcessed) {
            await this.prisma.consignmentSale.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    closedAt: new Date()
                }
            });
        }
    }

    /**
     * Generate mock CAE for testing
     */
    private generateMockCAE(): string {
        return Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
    }

    /**
     * Get pending quotations ready for invoicing
     */
    async getPendingQuotations() {
        return this.prisma.quotation.findMany({
            where: {
                status: 'ACCEPTED',
                validUntil: { gte: new Date() }
            },
            include: {
                customer: { select: { id: true, name: true, businessName: true } },
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get consignments ready for invoicing (with available items)
     */
    async getPendingConsignments() {
        const consignments = await this.prisma.consignmentSale.findMany({
            where: {
                status: { not: 'CLOSED' }
            },
            include: {
                customer: { select: { id: true, name: true, businessName: true } },
                items: true
            },
            orderBy: { deliveredAt: 'desc' }
        });

        // Filter to only those with available items
        return consignments.filter(c =>
            c.items.some(i =>
                i.quantityDelivered - i.quantityReturned - i.quantityInvoiced > 0
            )
        ).map(c => ({
            ...c,
            availableItems: c.items.filter(i =>
                i.quantityDelivered - i.quantityReturned - i.quantityInvoiced > 0
            ).map(i => ({
                ...i,
                quantityAvailable: i.quantityDelivered - i.quantityReturned - i.quantityInvoiced
            }))
        }));
    }
}
