
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PackagingService {
    constructor(private prisma: PrismaService) { }

    async getCustomerBalance(customerId: string) {
        return this.prisma.returnablePackaging.findMany({
            where: { customerId },
            orderBy: { type: 'asc' }
        });
    }

    async updateBalance(customerId: string, type: string, quantityChange: number) {
        // quantityChange: +1 means customer TOOK a bottle. -1 means customer RETURNED a bottle.
        return this.prisma.returnablePackaging.upsert({
            where: {
                customerId_type: { customerId, type: type.toUpperCase() }
            },
            update: {
                quantity: { increment: quantityChange }
            },
            create: {
                customerId,
                type: type.toUpperCase(),
                quantity: quantityChange
            }
        });
    }

    /**
     * Get all customers with high packaging balance (for alerts)
     */
    async getHighBalanceAlerts(threshold: number = 10) {
        return this.prisma.returnablePackaging.findMany({
            where: { quantity: { gte: threshold } },
            include: { customer: { select: { id: true, name: true, phone: true } } },
            orderBy: { quantity: 'desc' }
        });
    }

    /**
     * Get summary report of all packaging
     */
    async getPackagingSummary() {
        const allPackaging = await this.prisma.returnablePackaging.findMany({
            include: { customer: { select: { name: true } } }
        });

        // Group by type
        const byType: Record<string, { total: number; customers: number }> = {};

        for (const pkg of allPackaging) {
            if (!byType[pkg.type]) {
                byType[pkg.type] = { total: 0, customers: 0 };
            }
            byType[pkg.type].total += pkg.quantity;
            byType[pkg.type].customers++;
        }

        return {
            byType,
            totalItems: allPackaging.reduce((sum, p) => sum + p.quantity, 0),
            totalCustomers: new Set(allPackaging.map(p => p.customerId)).size
        };
    }

    /**
     * Available packaging types (for dropdown)
     */
    getPackagingTypes() {
        return [
            { code: 'BOTELLA_1L', name: 'Botella 1L' },
            { code: 'BOTELLA_2L', name: 'Botella 2L' },
            { code: 'CAJON_12', name: 'Cajón 12 unidades' },
            { code: 'CAJON_24', name: 'Cajón 24 unidades' },
            { code: 'BARRIL_30L', name: 'Barril 30L' },
            { code: 'BARRIL_50L', name: 'Barril 50L' }
        ];
    }
}

