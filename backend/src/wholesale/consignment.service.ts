import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateConsignmentDto {
    customerId: string;
    quotationId?: string;  // Opcional: desde presupuesto
    items: {
        productId: string;
        quantity: number;
        unitPrice?: number;  // Si no se provee, se obtiene del producto/lista
    }[];
    notes?: string;
}

export interface ProcessReturnDto {
    items: {
        productId: string;
        quantity: number;
        condition: 'GOOD' | 'DAMAGED';
    }[];
    reason?: string;
    receivedBy?: string;
}

@Injectable()
export class ConsignmentService {
    constructor(private prisma: PrismaService) { }

    /**
     * Generate next consignment code: CONS-2024-00001
     */
    private async generateCode(): Promise<string> {
        const year = new Date().getFullYear();

        const sequence = await this.prisma.consignmentSequence.upsert({
            where: { year },
            update: { lastNumber: { increment: 1 } },
            create: { year, lastNumber: 1 }
        });

        const paddedNumber = String(sequence.lastNumber).padStart(5, '0');
        return `CONS-${year}-${paddedNumber}`;
    }

    /**
     * Generate return code: DEV-2024-00001
     */
    private async generateReturnCode(): Promise<string> {
        const year = new Date().getFullYear();

        const sequence = await this.prisma.returnSequence.upsert({
            where: { year },
            update: { lastNumber: { increment: 1 } },
            create: { year, lastNumber: 1 }
        });

        const paddedNumber = String(sequence.lastNumber).padStart(5, '0');
        return `DEV-${year}-${paddedNumber}`;
    }

    /**
     * Create a new consignment (delivers stock to customer)
     */
    async create(dto: CreateConsignmentDto, userId?: string) {
        // Validate customer
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
            include: { priceList: { include: { items: true } } }
        });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        // Get product details, calculate prices, and check stock
        const items = [];
        let totalValue = 0;

        for (const item of dto.items) {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                throw new BadRequestException(`Producto ${item.productId} no encontrado`);
            }

            // Check available stock
            const stockResult = await this.prisma.inventoryItem.aggregate({
                where: { productId: item.productId },
                _sum: { quantity: true }
            });

            const availableStock = stockResult._sum.quantity || 0;
            if (availableStock < item.quantity) {
                throw new BadRequestException(
                    `Stock insuficiente para ${product.name}. Disponible: ${availableStock}, Solicitado: ${item.quantity}`
                );
            }

            // Determine unit price
            let unitPrice = item.unitPrice;
            if (!unitPrice) {
                const priceListItem = customer.priceList?.items.find(
                    p => p.productId === item.productId
                );
                unitPrice = priceListItem
                    ? Number(priceListItem.price)
                    : Number(product.basePrice);
            }

            const lineTotal = unitPrice * item.quantity;
            totalValue += lineTotal;

            items.push({
                productId: item.productId,
                productName: product.name,
                productSku: product.sku,
                quantityDelivered: item.quantity,
                quantityReturned: 0,
                quantityInvoiced: 0,
                unitPrice: new Prisma.Decimal(unitPrice),
            });
        }

        const code = await this.generateCode();

        // Create consignment and deduct stock in transaction
        const consignment = await this.prisma.$transaction(async (tx) => {
            // Create consignment
            const cons = await tx.consignmentSale.create({
                data: {
                    code,
                    customerId: dto.customerId,
                    quotationId: dto.quotationId,
                    status: 'ACTIVE',
                    totalValue: new Prisma.Decimal(totalValue),
                    notes: dto.notes,
                    createdBy: userId,
                    items: { create: items }
                },
                include: {
                    items: true,
                    customer: { select: { id: true, name: true, businessName: true } }
                }
            });

            // Deduct stock for each item
            for (const item of dto.items) {
                // Record inventory transaction
                await tx.inventoryTransaction.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.quantity,
                        type: 'SALE', // Using SALE type for consignment deduction
                        referenceId: cons.id,
                        userId
                    }
                });

                // Deduct from first available inventory location
                const inventoryItems = await tx.inventoryItem.findMany({
                    where: { productId: item.productId, quantity: { gt: 0 } },
                    orderBy: { expirationDate: 'asc' } // FEFO
                });

                let remaining = item.quantity;
                for (const inv of inventoryItems) {
                    if (remaining <= 0) break;

                    const deduct = Math.min(remaining, inv.quantity);
                    await tx.inventoryItem.update({
                        where: { id: inv.id },
                        data: { quantity: { decrement: deduct } }
                    });
                    remaining -= deduct;
                }
            }

            // If from quotation, mark quotation as converted
            if (dto.quotationId) {
                await tx.quotation.update({
                    where: { id: dto.quotationId },
                    data: {
                        status: 'CONVERTED',
                        convertedToConsignmentId: cons.id
                    }
                });
            }

            return cons;
        });

        return consignment;
    }

    /**
     * Get all consignments with optional filters
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

        return this.prisma.consignmentSale.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, businessName: true } },
                items: true,
                _count: { select: { items: true, returns: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Get single consignment with full details
     */
    async findOne(id: string) {
        const consignment = await this.prisma.consignmentSale.findUnique({
            where: { id },
            include: {
                items: true,
                customer: true,
                returns: { include: { items: true } }
            }
        });

        if (!consignment) {
            throw new NotFoundException('Consignación no encontrada');
        }

        return consignment;
    }

    /**
     * Get available items to invoice (delivered - returned - invoiced)
     */
    async getAvailableToInvoice(id: string) {
        const consignment = await this.findOne(id);

        return consignment.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            unitPrice: Number(item.unitPrice),
            quantityDelivered: item.quantityDelivered,
            quantityReturned: item.quantityReturned,
            quantityInvoiced: item.quantityInvoiced,
            quantityAvailable: item.quantityDelivered - item.quantityReturned - item.quantityInvoiced
        })).filter(item => item.quantityAvailable > 0);
    }

    /**
     * Process a return from consignment
     */
    async processReturn(id: string, dto: ProcessReturnDto, userId?: string) {
        const consignment = await this.findOne(id);

        if (consignment.status === 'CLOSED') {
            throw new BadRequestException('Esta consignación ya está cerrada');
        }

        // Validate quantities
        for (const returnItem of dto.items) {
            const consItem = consignment.items.find(i => i.productId === returnItem.productId);
            if (!consItem) {
                throw new BadRequestException(`Producto ${returnItem.productId} no está en esta consignación`);
            }

            const available = consItem.quantityDelivered - consItem.quantityReturned - consItem.quantityInvoiced;
            if (returnItem.quantity > available) {
                throw new BadRequestException(
                    `No se pueden devolver ${returnItem.quantity} unidades de ${consItem.productName}. Disponibles: ${available}`
                );
            }
        }

        const code = await this.generateReturnCode();
        let totalValue = 0;

        // Create return and update stock in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            const returnItems = [];

            for (const returnItem of dto.items) {
                const consItem = consignment.items.find(i => i.productId === returnItem.productId)!;
                const lineValue = Number(consItem.unitPrice) * returnItem.quantity;
                totalValue += lineValue;

                returnItems.push({
                    productId: returnItem.productId,
                    productName: consItem.productName,
                    quantity: returnItem.quantity,
                    unitPrice: consItem.unitPrice,
                    condition: returnItem.condition
                });

                // Update consignment item quantities
                await tx.consignmentItem.update({
                    where: { id: consItem.id },
                    data: { quantityReturned: { increment: returnItem.quantity } }
                });

                // If GOOD condition, return to stock
                if (returnItem.condition === 'GOOD') {
                    // Find or create inventory item
                    const invItem = await tx.inventoryItem.findFirst({
                        where: { productId: returnItem.productId }
                    });

                    if (invItem) {
                        await tx.inventoryItem.update({
                            where: { id: invItem.id },
                            data: { quantity: { increment: returnItem.quantity } }
                        });
                    }

                    // Record inventory transaction
                    await tx.inventoryTransaction.create({
                        data: {
                            productId: returnItem.productId,
                            quantity: returnItem.quantity,
                            type: 'RETURN',
                            referenceId: id,
                            userId
                        }
                    });
                } else {
                    // DAMAGED - Record as loss (negative adjustment)
                    await tx.inventoryTransaction.create({
                        data: {
                            productId: returnItem.productId,
                            quantity: 0, // No stock change
                            type: 'ADJUSTMENT',
                            referenceId: id,
                            userId
                        }
                    });
                }
            }

            // Create return record
            const returnRecord = await tx.consignmentReturn.create({
                data: {
                    code,
                    consignmentId: id,
                    totalValue: new Prisma.Decimal(totalValue),
                    reason: dto.reason,
                    receivedBy: dto.receivedBy,
                    createdBy: userId,
                    items: { create: returnItems }
                },
                include: { items: true }
            });

            // Update consignment values and status
            await tx.consignmentSale.update({
                where: { id },
                data: {
                    returnedValue: { increment: totalValue },
                    status: 'PARTIALLY_RETURNED'
                }
            });

            return returnRecord;
        });

        // Check if consignment should be closed
        await this.checkAndCloseConsignment(id);

        return result;
    }

    /**
     * Check if consignment is fully processed and close it
     */
    private async checkAndCloseConsignment(id: string) {
        const consignment = await this.findOne(id);

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
     * Get open consignments for a customer
     */
    async getOpenByCustomer(customerId: string) {
        return this.prisma.consignmentSale.findMany({
            where: {
                customerId,
                status: { not: 'CLOSED' }
            },
            include: {
                items: true,
                _count: { select: { returns: true } }
            },
            orderBy: { deliveredAt: 'desc' }
        });
    }

    /**
     * Get consignment statistics
     */
    async getStats() {
        const [total, byStatus, oldestOpen] = await Promise.all([
            this.prisma.consignmentSale.count(),
            this.prisma.consignmentSale.groupBy({
                by: ['status'],
                _count: true,
                _sum: { totalValue: true, invoicedValue: true, returnedValue: true }
            }),
            this.prisma.consignmentSale.findFirst({
                where: { status: { not: 'CLOSED' } },
                orderBy: { deliveredAt: 'asc' },
                select: { id: true, code: true, deliveredAt: true, customer: { select: { name: true } } }
            })
        ]);

        return {
            total,
            byStatus: byStatus.map(s => ({
                status: s.status,
                count: s._count,
                totalValue: Number(s._sum.totalValue || 0),
                invoicedValue: Number(s._sum.invoicedValue || 0),
                returnedValue: Number(s._sum.returnedValue || 0)
            })),
            oldestOpen
        };
    }

    /**
     * Get stale consignments (no activity for X days)
     */
    async getStaleConsignments(days: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return this.prisma.consignmentSale.findMany({
            where: {
                status: { not: 'CLOSED' },
                updatedAt: { lt: cutoffDate }
            },
            include: {
                customer: { select: { id: true, name: true, businessName: true, phone: true } },
                items: true
            },
            orderBy: { deliveredAt: 'asc' }
        });
    }
}
