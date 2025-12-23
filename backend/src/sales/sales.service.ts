
import { Injectable, NotFoundException, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { InventoryService } from '../inventory/inventory.service';
import { FiscalService } from '../fiscal/fiscal.service';
import { PromotionService } from './promotion.service';
import { MercadoPagoService } from '../integrations/payments/mercadopago.service';
import { PriceListService } from '../pricing/price-list.service';
import { PdfGeneratorService } from '../wholesale/pdf-generator.service';

@Injectable()
export class SalesService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService,
        private fiscalService: FiscalService,
        private promotionService: PromotionService,
        private mercadoPago: MercadoPagoService,
        private priceListService: PriceListService,
        private pdfGenerator: PdfGeneratorService
    ) { }

    async createTransaction(createSaleDto: CreateSaleDto, userId?: string) {
        // 1. Calculate totals and validate products (Simplified for MVP)
        // 0. Fetch Customer if provided
        let customer = null;
        if (createSaleDto.customerId) {
            customer = await this.prisma.customer.findUnique({
                where: { id: createSaleDto.customerId }
            });
        }

        // 1. Calculate totals and validate products (Simplified for MVP)
        let totalAmount = 0;
        const saleItems = [];

        for (const item of createSaleDto.items) {
            const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
            if (!product) throw new Error(`Product ${item.productId} not found`);

            // Pricing Logic
            let unitPrice = Number(product.basePrice);
            if (customer && customer.type === 'WHOLESALE' && product.wholesalePrice) {
                unitPrice = Number(product.wholesalePrice);
            }

            const lineTotal = unitPrice * item.quantity;
            totalAmount += lineTotal;

            saleItems.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: lineTotal,
            });
        }

        // Apply Promotions (V2)
        // Re-construct items with product info for PromotionService (Inefficient to re-fetch? No, we fetched item.productId inside the loop but didn't save the full object list)
        // Wait, the loop above `for (const item of createSaleDto.items)` fetches `product` individually.
        // I should have saved them.
        // Let's assume I need to refetch OR I should have modified the loop above.
        // To strictly avoid functional changes to the loop structure (to limit diff size), I'll just map the existing saleItems but I lack 'category'.
        // Actually, I must fetch categories to run promotions.
        // Let's modify the loop above to collect `promoItems`.

        // REFACTORING LOOP to collect promoItems
        const promoItems = [];
        // (Resetting logic slightly to ensure we capture product data)
        // Since I can't easily jump back to line 31 in this replace block...
        // I will do a quick fetch here of all products involved.
        const productIds = createSaleDto.items.map(i => i.productId);
        const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
        const productMap = new Map(products.map(p => [p.id, p]));

        for (const item of saleItems) { // iteration over processed items
            const p = productMap.get(item.productId);
            if (p) {
                promoItems.push({ ...item, product: p });
            }
        }

        const promoResult = await this.promotionService.applyPromotions(promoItems);

        // Apply Promotions
        totalAmount = Math.max(0, totalAmount - promoResult.discount);
        let discountAmount = promoResult.discount;

        // Apply Manual Discount (if provided)
        if (createSaleDto.discount) {
            totalAmount = Math.max(0, totalAmount - createSaleDto.discount);
            discountAmount += createSaleDto.discount;
        }


        // 2. Validate Payments
        const paymentsToCreate = [];
        if (createSaleDto.payments && createSaleDto.payments.length > 0) {
            const totalPayment = createSaleDto.payments.reduce((sum, p) => sum + p.amount, 0);
            if (totalPayment < totalAmount) {
                // Allow small floating point differences? For now exact or more.
                // Or maybe partial payments allowed? No, completed sale requires full payment.
                if (Math.abs(totalPayment - totalAmount) > 0.01) {
                    throw new BadRequestException(`Insufficient payment. Total: ${totalAmount}, Paid: ${totalPayment}`);
                }
            }
            paymentsToCreate.push(...createSaleDto.payments);
        } else if (createSaleDto.paymentMethod) {
            paymentsToCreate.push({
                method: createSaleDto.paymentMethod,
                amount: totalAmount
            });
        } else {
            // Default to CASH if nothing specified (Legacy fallback)
            paymentsToCreate.push({
                method: 'CASH',
                amount: totalAmount
            });
        }
        return this.prisma.$transaction(async (tx) => {
            // Create the Sale record
            const sale = await tx.sale.create({
                data: {
                    code: `SALE-${Date.now()}`,
                    channel: 'POS',
                    status: 'COMPLETED',
                    totalAmount: totalAmount,
                    discountAmount: discountAmount || 0,
                    taxAmount: totalAmount * 0.21,
                    deliveryMethod: (createSaleDto.deliveryMethod as any) || 'PICKUP',
                    customerId: customer ? customer.id : undefined,
                    userId: userId,
                    items: {
                        create: saleItems,
                    },
                    payments: {
                        create: paymentsToCreate.map(p => ({
                            method: p.method,
                            amount: p.amount
                        }))
                    }
                },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    },
                },
            });

            // Deduct Stock for each item
            for (const item of createSaleDto.items) {
                // Pass warehouseId if present in DTO
                await this.inventoryService.deductStock(item.productId, item.quantity, createSaleDto.warehouseId, tx);
            }

            return sale;
        });
    }

    async createEcommerceSale(dto: any) {
        // 1. Find or Create Customer
        let customer = await this.prisma.customer.findUnique({
            where: { email: dto.customer.email }
        });

        if (!customer) {
            customer = await this.prisma.customer.create({
                data: {
                    name: dto.customer.name,
                    email: dto.customer.email,
                    phone: dto.customer.phone,
                    taxId: dto.customer.dni || null, // Store DNI in taxId field
                    address: dto.shippingAddress ?
                        `${dto.shippingAddress.street} ${dto.shippingAddress.number}, ${dto.shippingAddress.city}, ${dto.shippingAddress.province} (${dto.shippingAddress.postalCode})`
                        : null
                }
            });
        } else if (dto.customer.dni || dto.shippingAddress) {
            // Update customer with new info
            customer = await this.prisma.customer.update({
                where: { id: customer.id },
                data: {
                    taxId: dto.customer.dni || customer.taxId,
                    address: dto.shippingAddress ?
                        `${dto.shippingAddress.street} ${dto.shippingAddress.number}, ${dto.shippingAddress.city}, ${dto.shippingAddress.province} (${dto.shippingAddress.postalCode})`
                        : customer.address
                }
            });
        }

        // 2. Calculate Totals
        let totalAmount = 0;
        const saleItems = [];

        for (const item of dto.items) {
            const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
            if (!product) throw new Error(`Product ${item.productId} not found`);

            // 1. First try to get price from price list (default or customer-assigned)
            let price = await this.priceListService.getPrice(item.productId, customer?.id);

            // 2. If no price list price, fall back to product prices
            if (!price) {
                price = (customer.type === 'WHOLESALE' && product.wholesalePrice)
                    ? Number(product.wholesalePrice)
                    : Number(product.basePrice);
            }

            const lineTotal = price * item.quantity;
            totalAmount += lineTotal;

            saleItems.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: price,
                totalPrice: lineTotal,
            });
        }

        // 3. Apply discount from coupon
        const discountAmount = dto.discountAmount || 0;
        const subtotal = totalAmount;
        totalAmount = Math.max(0, totalAmount - discountAmount);

        // 4. Add shipping fee
        const shippingFee = dto.shippingFee || 0;
        totalAmount += shippingFee;

        // 5. Determine initial status based on payment method
        let initialStatus = 'PENDING';
        if (dto.paymentMethod === 'MERCADOPAGO') {
            // Would integrate with MercadoPago here, for now assume pending
            initialStatus = 'PENDING';
        } else if (dto.paymentMethod === 'CASH') {
            // Cash at pickup - stays pending until pickup
            initialStatus = 'PENDING';
        } else if (dto.paymentMethod === 'TRANSFER') {
            initialStatus = 'PENDING';
        }

        // 6. Create Sale
        return this.prisma.$transaction(async (tx) => {
            const sale = await tx.sale.create({
                data: {
                    code: `WEB-${Date.now()}`,
                    channel: 'ECOMMERCE',
                    status: initialStatus as any,
                    documentType: (dto.documentType as any) || 'SALE',
                    totalAmount: totalAmount,
                    deliveryMethod: dto.deliveryMethod || 'SHIPPING',
                    discountAmount: discountAmount,
                    shippingFee: shippingFee,
                    taxAmount: subtotal * 0.21,
                    customerId: customer.id,
                    items: {
                        create: saleItems,
                    },
                    payments: {
                        create: [{
                            method: dto.paymentMethod || 'MERCADOPAGO',
                            amount: totalAmount
                        }]
                    }
                },
                include: { items: true, customer: true }
            });

            // 7. Apply coupon usage if provided
            if (dto.couponId && discountAmount > 0) {
                try {
                    await tx.couponUsage.create({
                        data: {
                            couponId: dto.couponId,
                            customerId: customer.id,
                            saleId: sale.id,
                            discountApplied: discountAmount
                        }
                    });
                    await tx.coupon.update({
                        where: { id: dto.couponId },
                        data: { usageCount: { increment: 1 } }
                    });
                } catch (e) {
                    // Coupon tracking failed, but sale should still proceed
                    console.error('Coupon usage tracking failed:', e);
                }
            }

            // 8. Update Inventory (Only if not a Budget)
            if (dto.documentType !== 'BUDGET') {
                for (const item of dto.items) {
                    await this.inventoryService.deductStock(item.productId, item.quantity, undefined, tx);
                }
            }

            return sale;
        });
    }

    async findAll() {
        return this.prisma.sale.findMany({
            include: {
                items: {
                    include: { product: true }
                },
                invoice: true,
                customer: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: true }
                },
                customer: true,
                payments: true,
                invoice: true
            }
        });

        if (!sale) {
            throw new NotFoundException('Venta no encontrada');
        }

        return sale;
    }

    async refundSale(id: string) {
        return this.voidSale(id, 'Refund requested');
    }

    async voidSale(id: string, reason: string = 'Voided by Admin') {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: { items: true, invoice: true }
        });

        if (!sale) throw new NotFoundException('Sale not found');
        if (sale.status === 'REFUNDED' || sale.status === 'CANCELLED') {
            throw new BadRequestException('Sale already voided/refunded');
        }

        // 1. Restore Stock
        for (const item of sale.items) {
            await this.inventoryService.restoreStock(item.productId, item.quantity);
        }

        // 2. Handle Fiscal / Invoice
        // If there is an invoice...
        if (sale.invoice) {
            if (sale.invoice.status === 'AUTHORIZED') {
                // Generate Credit Note
                try {
                    await this.fiscalService.createCreditNote(sale.invoice.id, reason);
                } catch (e) {
                    console.error('Failed to create Credit Note for voided sale', e);
                    // We continue to void the sale locally even if AFIP fails, 
                    // but ideally we should alert or handle this better.
                }
            } else if (sale.invoice.status === 'DRAFT' || sale.invoice.status === 'PENDING_CAE') {
                // Just cancel the invoice locally
                await this.prisma.invoice.update({
                    where: { id: sale.invoice.id },
                    data: { status: 'CANCELLED' }
                });
            }
        }

        // 3. Update Sale Status
        return this.prisma.sale.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
    }

    async generateCheckout(saleId: string) {
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: { include: { product: true } } }
        });

        if (!sale) throw new NotFoundException('Sale not found');

        const items = sale.items.map(item => ({
            title: item.product.name,
            quantity: item.quantity,
            unit_price: Number(item.unitPrice) // Use stored unit price
        }));

        // Add shipping if any
        if (sale.shippingFee && Number(sale.shippingFee) > 0) {
            items.push({
                title: 'Costo de Envío',
                quantity: 1,
                unit_price: Number(sale.shippingFee)
            });
        }

        const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        return this.mercadoPago.createPreference(
            items,
            sale.code,
            {
                success: `${frontUrl}/purchase/success?saleId=${sale.id}&status=approved`,
                failure: `${frontUrl}/purchase/failure`,
                pending: `${frontUrl}/purchase/pending`
            }
        );
    }

    /**
     * Permanently delete a sale (only allowed for pending/uninvoiced sales)
     */
    async deleteSale(id: string) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: { invoice: true }
        });

        if (!sale) throw new NotFoundException('Sale not found');

        // Prevent deletion of invoiced sales (with CAE)
        if (sale.invoice?.cae) {
            throw new BadRequestException('No se puede eliminar una venta ya facturada con CAE. Use anulación con nota de crédito.');
        }

        // Cascade delete in order
        // 1. Delete payments
        await this.prisma.payment.deleteMany({ where: { saleId: id } });

        // 2. Delete sale items
        await this.prisma.saleItem.deleteMany({ where: { saleId: id } });

        // 3. Delete related invoice (if any, but without CAE)
        if (sale.invoice) {
            await this.prisma.invoice.delete({ where: { id: sale.invoice.id } });
        }

        // 4. Delete the sale
        await this.prisma.sale.delete({ where: { id } });

        return { message: 'Venta eliminada correctamente', id };
    }

    async generatePdf(id: string, @Res() res: Response) {
        const sale = await this.prisma.sale.findUnique({
            where: { id },
            include: { invoice: true }
        });

        if (!sale) throw new NotFoundException('Venta no encontrada');

        if (sale.invoice) {
            return this.pdfGenerator.generateInvoicePdf(sale.invoice.id, res);
        }

        // TODO: Generate Ticket PDF for non-invoiced sales if needed
        // For now, return 404 or a simple message
        throw new NotFoundException('Esta venta no tiene una factura asociada para imprimir.');
    }
}

