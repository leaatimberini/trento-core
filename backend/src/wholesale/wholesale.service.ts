import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateWholesaleCustomerDto {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    businessName?: string;
    cuit?: string;
    taxCondition?: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'CONSUMIDOR_FINAL' | 'EXENTO' | 'NO_RESPONSABLE';
    creditLimit?: number;
    paymentTermDays?: number;
    discountPercent?: number;
    priceListId?: string;
    salesRepId?: string;
    notes?: string;
}

export interface UpdateWholesaleCustomerDto extends Partial<CreateWholesaleCustomerDto> {
    relationStatus?: 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'BLOCKED';
}

@Injectable()
export class WholesaleService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new wholesale customer
     */
    async createWholesaleCustomer(dto: CreateWholesaleCustomerDto) {
        // Validate CUIT if provided
        if (dto.cuit && !/^\d{2}-\d{8}-\d{1}$/.test(dto.cuit)) {
            throw new BadRequestException('CUIT debe tener formato XX-XXXXXXXX-X');
        }

        // Sanitize empty strings to undefined (Prisma expects enum values or undefined, not empty strings)
        const sanitizedDto = {
            name: dto.name,
            email: dto.email || undefined,
            phone: dto.phone || undefined,
            address: dto.address || undefined,
            city: dto.city || undefined,
            zipCode: dto.zipCode || undefined,
            businessName: dto.businessName || undefined,
            cuit: dto.cuit || undefined,
            taxCondition: dto.taxCondition || undefined,
            paymentTermDays: dto.paymentTermDays || undefined,
            priceListId: dto.priceListId || undefined,
            salesRepId: dto.salesRepId || undefined,
            notes: dto.notes || undefined,
        };

        return this.prisma.customer.create({
            data: {
                ...sanitizedDto,
                type: 'WHOLESALE',
                creditLimit: dto.creditLimit ? new Prisma.Decimal(dto.creditLimit) : null,
                discountPercent: dto.discountPercent ? new Prisma.Decimal(dto.discountPercent) : null,
            },
            include: {
                priceList: true,
            }
        });
    }


    /**
     * Get all wholesale customers with optional filters
     */
    async getWholesaleCustomers(filters?: {
        relationStatus?: string;
        search?: string;
        salesRepId?: string;
    }) {
        const where: any = {
            type: 'WHOLESALE',
        };

        if (filters?.relationStatus) {
            where.relationStatus = filters.relationStatus;
        }

        if (filters?.salesRepId) {
            where.salesRepId = filters.salesRepId;
        }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { businessName: { contains: filters.search, mode: 'insensitive' } },
                { cuit: { contains: filters.search } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.customer.findMany({
            where,
            include: {
                priceList: true,
                _count: {
                    select: { sales: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    /**
     * Get a single wholesale customer by ID
     */
    async getWholesaleCustomer(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                priceList: true,
                sales: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        code: true,
                        totalAmount: true,
                        status: true,
                        createdAt: true,
                    }
                },
                score: true,
            }
        });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        if (customer.type !== 'WHOLESALE') {
            throw new BadRequestException('Este cliente no es mayorista');
        }

        return customer;
    }

    /**
     * Update a wholesale customer
     */
    async updateWholesaleCustomer(id: string, dto: UpdateWholesaleCustomerDto) {
        const customer = await this.prisma.customer.findUnique({ where: { id } });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        // Validate CUIT if being updated
        if (dto.cuit && !/^\d{2}-\d{8}-\d{1}$/.test(dto.cuit)) {
            throw new BadRequestException('CUIT debe tener formato XX-XXXXXXXX-X');
        }

        const updateData: any = { ...dto };

        if (dto.creditLimit !== undefined) {
            updateData.creditLimit = new Prisma.Decimal(dto.creditLimit);
        }
        if (dto.discountPercent !== undefined) {
            updateData.discountPercent = new Prisma.Decimal(dto.discountPercent);
        }

        return this.prisma.customer.update({
            where: { id },
            data: updateData,
            include: { priceList: true }
        });
    }

    /**
     * Delete a wholesale customer
     */
    async deleteWholesaleCustomer(id: string) {
        const customer = await this.prisma.customer.findUnique({ where: { id } });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        // Check if customer has any sales or quotations
        const saleCount = await this.prisma.sale.count({ where: { customerId: id } });
        const quotationCount = await this.prisma.quotation.count({ where: { customerId: id } });

        if (saleCount > 0 || quotationCount > 0) {
            throw new BadRequestException(
                `No se puede eliminar: el cliente tiene ${saleCount} ventas y ${quotationCount} presupuestos asociados. Considere marcarlo como BLOQUEADO.`
            );
        }

        await this.prisma.customer.delete({ where: { id } });
        return { message: 'Cliente eliminado correctamente' };
    }

    /**
     * Update credit limit for a customer
     */
    async updateCreditLimit(id: string, limit: number) {
        return this.prisma.customer.update({
            where: { id },
            data: { creditLimit: new Prisma.Decimal(limit) }
        });
    }

    /**
     * Check available credit for a customer
     */
    async checkCreditAvailable(customerId: string, amount: number): Promise<{
        available: boolean;
        creditLimit: number;
        creditUsed: number;
        creditAvailable: number;
        requestedAmount: number;
    }> {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            select: { creditLimit: true, creditUsed: true }
        });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        const creditLimit = Number(customer.creditLimit || 0);
        const creditUsed = Number(customer.creditUsed || 0);
        const creditAvailable = creditLimit - creditUsed;

        return {
            available: amount <= creditAvailable,
            creditLimit,
            creditUsed,
            creditAvailable,
            requestedAmount: amount
        };
    }

    /**
     * Use credit (increase creditUsed)
     */
    async useCredit(customerId: string, amount: number) {
        const check = await this.checkCreditAvailable(customerId, amount);

        if (!check.available) {
            throw new BadRequestException(
                `Crédito insuficiente. Disponible: $${check.creditAvailable.toLocaleString()}, Solicitado: $${amount.toLocaleString()}`
            );
        }

        return this.prisma.customer.update({
            where: { id: customerId },
            data: {
                creditUsed: { increment: amount }
            }
        });
    }

    /**
     * Release credit (decrease creditUsed, e.g., after payment)
     */
    async releaseCredit(customerId: string, amount: number) {
        return this.prisma.customer.update({
            where: { id: customerId },
            data: {
                creditUsed: { decrement: amount }
            }
        });
    }

    /**
     * Update relation status (for AI risk detection)
     */
    async updateRelationStatus(id: string, status: 'ACTIVE' | 'AT_RISK' | 'INACTIVE' | 'BLOCKED') {
        return this.prisma.customer.update({
            where: { id },
            data: { relationStatus: status }
        });
    }

    /**
     * Get credit summary for all wholesale customers
     */
    async getCreditSummary() {
        const customers = await this.prisma.customer.findMany({
            where: {
                type: 'WHOLESALE',
                creditLimit: { not: null }
            },
            select: {
                id: true,
                name: true,
                businessName: true,
                creditLimit: true,
                creditUsed: true,
                relationStatus: true,
            }
        });

        return customers.map(c => ({
            ...c,
            creditLimit: Number(c.creditLimit),
            creditUsed: Number(c.creditUsed),
            creditAvailable: Number(c.creditLimit) - Number(c.creditUsed),
            utilizationPercent: c.creditLimit
                ? ((Number(c.creditUsed) / Number(c.creditLimit)) * 100).toFixed(1)
                : 0
        }));
    }

    /**
     * Get customers at risk (high credit usage or marked by AI)
     */
    async getAtRiskCustomers() {
        const customers = await this.prisma.customer.findMany({
            where: {
                type: 'WHOLESALE',
                OR: [
                    { relationStatus: 'AT_RISK' },
                    { relationStatus: 'BLOCKED' },
                ]
            },
            include: {
                _count: { select: { sales: true } }
            }
        });

        // Also check for high credit utilization
        const highCreditCustomers = await this.prisma.customer.findMany({
            where: {
                type: 'WHOLESALE',
                creditLimit: { not: null },
                relationStatus: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                businessName: true,
                creditLimit: true,
                creditUsed: true,
            }
        });

        const highUtilization = highCreditCustomers.filter(c => {
            const utilization = Number(c.creditUsed) / Number(c.creditLimit);
            return utilization >= 0.8; // 80% or more
        });

        return {
            atRisk: customers,
            highCreditUtilization: highUtilization
        };
    }

    /**
     * Get statistics for dashboard
     */
    async getStats(range: 'week' | 'month' | 'quarter' | 'year' = 'month') {
        const now = new Date();
        let startDate = new Date();

        switch (range) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                startDate.setDate(1); // Start of month, or rolling? Let's do rolling 30 days for simplicity or aligned to month?
                // Standard dashboard usually implies "This Month" vs "Last 30 Days".
                // Let's us "Start of current month" if the user expects "This Month", or rolling.
                // Given the labels "Este mes", let's use start of the current period.
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear(), 0, 1);
                break;
        }

        // 1. Total B2B Sales
        const sales = await this.prisma.sale.aggregate({
            where: {
                channel: 'B2B',
                createdAt: { gte: startDate },
                status: { not: 'CANCELLED' }
            },
            _sum: { totalAmount: true },
            _count: true
        });

        // 2. Quotations generated
        const quotations = await this.prisma.quotation.aggregate({
            where: {
                createdAt: { gte: startDate }
            },
            _count: true
        });

        // 3. Open Consignment Value (Total active consignments value)
        // This is a snapshot of CURRENT state, not necessarily filtered by range, 
        // OR it's the value of consignments created in that range.
        // Usually dashboards show "Current Active Consignments" regardless of date.
        const activeConsignments = await this.prisma.consignmentSale.findMany({
            where: {
                status: { in: ['ACTIVE', 'PARTIALLY_RETURNED', 'PARTIALLY_INVOICED'] }
            },
            select: { totalValue: true, invoicedValue: true, returnedValue: true }
        });

        const openConsignmentValue = activeConsignments.reduce((acc, c) => {
            const val = Number(c.totalValue) - Number(c.invoicedValue) - Number(c.returnedValue);
            return acc + val;
        }, 0);

        // 4. Active Customers
        const customers = await this.prisma.customer.count({
            where: {
                type: 'WHOLESALE',
                relationStatus: 'ACTIVE'
            }
        });

        // 5. Pending Balance (Credit Used)
        const creditStats = await this.prisma.customer.aggregate({
            where: { type: 'WHOLESALE' },
            _sum: { creditUsed: true }
        });

        return {
            monthlySales: {
                total: Number(sales._sum.totalAmount || 0),
                count: sales._count
            },
            quotations: {
                total: quotations._count
            },
            consignments: {
                openValue: openConsignmentValue
            },
            customers: {
                total: customers
            },
            pendingValue: Number(creditStats._sum.creditUsed || 0)
        };
    }
}

