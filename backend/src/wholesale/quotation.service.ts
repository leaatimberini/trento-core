import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateQuotationDto {
    customerId: string;
    validDays?: number;  // Días de validez (default 15)
    items: {
        productId: string;
        quantity: number;
        unitPrice?: number;  // Si no se provee, se obtiene del producto/lista de precios
        discount?: number;   // % descuento por ítem
    }[];
    notes?: string;
    termsAndConditions?: string;
}

export interface UpdateQuotationDto {
    validDays?: number;
    items?: {
        productId: string;
        quantity: number;
        unitPrice?: number;
        discount?: number;
    }[];
    notes?: string;
    termsAndConditions?: string;
}

@Injectable()
export class QuotationService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate next quotation code: PRES-2024-00001
     */
    private async generateCode(): Promise<string> {
        const year = new Date().getFullYear();

        const sequence = await this.prisma.quotationSequence.upsert({
            where: { year },
            update: { lastNumber: { increment: 1 } },
            create: { year, lastNumber: 1 }
        });

        const paddedNumber = String(sequence.lastNumber).padStart(5, '0');
        return `PRES-${year}-${paddedNumber}`;
    }

    /**
     * Create a new quotation
     */
    async create(dto: CreateQuotationDto, userId?: string) {
        // Validate customer exists and is wholesale
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
            include: { priceList: { include: { items: true } } }
        });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        // Get product details and calculate prices
        const items = [];
        let subtotal = 0;
        let taxAmount = 0;

        for (const item of dto.items) {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                throw new BadRequestException(`Producto ${item.productId} no encontrado`);
            }

            // Determine unit price
            let unitPrice = item.unitPrice;
            if (!unitPrice) {
                // Check price list first
                const priceListItem = customer.priceList?.items.find(
                    p => p.productId === item.productId
                );
                unitPrice = priceListItem
                    ? Number(priceListItem.price)
                    : Number(product.basePrice);
            }

            const discount = item.discount || 0;
            const discountedPrice = unitPrice * (1 - discount / 100);
            const lineTotal = discountedPrice * item.quantity;
            const lineTax = lineTotal * Number(product.taxRate) / 100;

            subtotal += lineTotal;
            taxAmount += lineTax;

            items.push({
                productId: item.productId,
                productName: product.name,
                productSku: product.sku,
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(unitPrice),
                discount: new Prisma.Decimal(discount),
                totalPrice: new Prisma.Decimal(lineTotal),
            });
        }

        const total = subtotal + taxAmount;
        const code = await this.generateCode();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + (dto.validDays || 15));

        return this.prisma.quotation.create({
            data: {
                code,
                customerId: dto.customerId,
                status: 'DRAFT',
                validUntil,
                subtotal: new Prisma.Decimal(subtotal),
                taxAmount: new Prisma.Decimal(taxAmount),
                total: new Prisma.Decimal(total),
                notes: dto.notes,
                termsAndConditions: dto.termsAndConditions,
                createdBy: userId,
                items: { create: items }
            },
            include: {
                items: true,
                customer: { select: { id: true, name: true, businessName: true, cuit: true } }
            }
        });
    }

    /**
     * Get all quotations with optional filters
     */
    async findAll(filters?: {
        customerId?: string;
        status?: string;
        search?: string;
    }) {
        const where: any = {};

        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.search) {
            where.OR = [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
                { customer: { businessName: { contains: filters.search, mode: 'insensitive' } } },
            ];
        }

        return this.prisma.quotation.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, businessName: true } },
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get single quotation with full details
     */
    async findOne(id: string) {
        const quotation = await this.prisma.quotation.findUnique({
            where: { id },
            include: {
                items: true,
                customer: true
            }
        });

        if (!quotation) {
            throw new NotFoundException('Presupuesto no encontrado');
        }

        // Check if expired
        if (quotation.status === 'DRAFT' || quotation.status === 'SENT') {
            if (new Date() > quotation.validUntil) {
                // Auto-expire
                await this.prisma.quotation.update({
                    where: { id },
                    data: { status: 'EXPIRED' }
                });
                quotation.status = 'EXPIRED';
            }
        }

        return quotation;
    }

    /**
     * Update quotation (only if DRAFT)
     */
    async update(id: string, dto: UpdateQuotationDto) {
        const quotation = await this.prisma.quotation.findUnique({
            where: { id },
            include: { customer: { include: { priceList: { include: { items: true } } } } }
        });

        if (!quotation) {
            throw new NotFoundException('Presupuesto no encontrado');
        }

        if (quotation.status !== 'DRAFT') {
            throw new BadRequestException('Solo se pueden editar presupuestos en borrador');
        }

        const updateData: any = {};

        if (dto.validDays) {
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + dto.validDays);
            updateData.validUntil = validUntil;
        }

        if (dto.notes !== undefined) updateData.notes = dto.notes;
        if (dto.termsAndConditions !== undefined) updateData.termsAndConditions = dto.termsAndConditions;

        // Recalculate items if provided
        if (dto.items) {
            // Delete existing items
            await this.prisma.quotationItem.deleteMany({ where: { quotationId: id } });

            const items = [];
            let subtotal = 0;
            let taxAmount = 0;

            for (const item of dto.items) {
                const product = await this.prisma.product.findUnique({
                    where: { id: item.productId }
                });

                if (!product) {
                    throw new BadRequestException(`Producto ${item.productId} no encontrado`);
                }

                let unitPrice = item.unitPrice;
                if (!unitPrice) {
                    const priceListItem = quotation.customer.priceList?.items.find(
                        p => p.productId === item.productId
                    );
                    unitPrice = priceListItem
                        ? Number(priceListItem.price)
                        : Number(product.basePrice);
                }

                const discount = item.discount || 0;
                const discountedPrice = unitPrice * (1 - discount / 100);
                const lineTotal = discountedPrice * item.quantity;
                const lineTax = lineTotal * Number(product.taxRate) / 100;

                subtotal += lineTotal;
                taxAmount += lineTax;

                items.push({
                    quotationId: id,
                    productId: item.productId,
                    productName: product.name,
                    productSku: product.sku,
                    quantity: item.quantity,
                    unitPrice: new Prisma.Decimal(unitPrice),
                    discount: new Prisma.Decimal(discount),
                    totalPrice: new Prisma.Decimal(lineTotal),
                });
            }

            await this.prisma.quotationItem.createMany({ data: items });

            updateData.subtotal = new Prisma.Decimal(subtotal);
            updateData.taxAmount = new Prisma.Decimal(taxAmount);
            updateData.total = new Prisma.Decimal(subtotal + taxAmount);
        }

        return this.prisma.quotation.update({
            where: { id },
            data: updateData,
            include: { items: true, customer: true }
        });
    }

    /**
     * Send quotation to customer (change status DRAFT -> SENT)
     */
    async send(id: string) {
        const quotation = await this.findOne(id);

        if (quotation.status !== 'DRAFT') {
            throw new BadRequestException('Solo se pueden enviar presupuestos en borrador');
        }

        return this.prisma.quotation.update({
            where: { id },
            data: { status: 'SENT' }
        });
    }

    /**
     * Accept quotation (SENT -> ACCEPTED)
     */
    async accept(id: string) {
        const quotation = await this.findOne(id);

        if (quotation.status !== 'SENT') {
            throw new BadRequestException('Solo se pueden aceptar presupuestos enviados');
        }

        if (new Date() > quotation.validUntil) {
            throw new BadRequestException('Este presupuesto ha expirado');
        }

        return this.prisma.quotation.update({
            where: { id },
            data: { status: 'ACCEPTED' }
        });
    }

    /**
     * Reject quotation
     */
    async reject(id: string, reason?: string) {
        const quotation = await this.findOne(id);

        if (!['DRAFT', 'SENT'].includes(quotation.status)) {
            throw new BadRequestException('Solo se pueden rechazar presupuestos en borrador o enviados');
        }

        const notes = reason
            ? `${quotation.notes || ''}\n\nRechazado: ${reason}`
            : quotation.notes;

        return this.prisma.quotation.update({
            where: { id },
            data: { status: 'REJECTED', notes }
        });
    }

    /**
     * Duplicate quotation (create new draft from existing)
     */
    async duplicate(id: string, userId?: string) {
        const original = await this.prisma.quotation.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!original) {
            throw new NotFoundException('Presupuesto no encontrado');
        }

        const code = await this.generateCode();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 15);

        return this.prisma.quotation.create({
            data: {
                code,
                customerId: original.customerId,
                status: 'DRAFT',
                validUntil,
                subtotal: original.subtotal,
                taxAmount: original.taxAmount,
                total: original.total,
                notes: `Duplicado de ${original.code}`,
                termsAndConditions: original.termsAndConditions,
                createdBy: userId,
                items: {
                    create: original.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        productSku: item.productSku,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                        totalPrice: item.totalPrice,
                    }))
                }
            },
            include: { items: true, customer: true }
        });
    }

    /**
     * Delete quotation (only DRAFT)
     */
    async delete(id: string) {
        const quotation = await this.findOne(id);

        if (quotation.status !== 'DRAFT') {
            throw new BadRequestException('Solo se pueden eliminar presupuestos en borrador');
        }

        await this.prisma.quotation.delete({ where: { id } });
        return { deleted: true };
    }

    /**
     * Get quotation statistics
     */
    async getStats() {
        const [total, byStatus] = await Promise.all([
            this.prisma.quotation.count(),
            this.prisma.quotation.groupBy({
                by: ['status'],
                _count: true,
                _sum: { total: true }
            })
        ]);

        return {
            total,
            byStatus: byStatus.map(s => ({
                status: s.status,
                count: s._count,
                totalValue: Number(s._sum.total || 0)
            }))
        };
    }

    /**
     * Check and expire old quotations (for cron job)
     */
    async expireOldQuotations() {
        const result = await this.prisma.quotation.updateMany({
            where: {
                status: { in: ['DRAFT', 'SENT'] },
                validUntil: { lt: new Date() }
            },
            data: { status: 'EXPIRED' }
        });

        return { expired: result.count };
    }
}
