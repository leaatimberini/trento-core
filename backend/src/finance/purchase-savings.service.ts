import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface SavingsReport {
    totalSavings: number;
    totalPurchases: number;
    savingsPercentage: number;
    itemsWithSavings: number;
    itemsWithLoss: number;
}

export interface ProductSavings {
    productId: string;
    productName: string;
    totalSavings: number;
    totalQuantity: number;
    averageSavingPerUnit: number;
}

export interface SupplierSavings {
    supplierId: string;
    supplierName: string;
    totalSavings: number;
    ordersCount: number;
}

@Injectable()
export class PurchaseSavingsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calcula el ahorro potencial al momento de crear item de orden de compra
     */
    async calculateSaving(productId: string, paidCostPerUnit: number, quantity: number): Promise<{
        standardCost: number;
        paidCost: number;
        savingPerUnit: number;
        totalSaving: number;
        isWin: boolean;
    }> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { costPrice: true, name: true }
        });

        if (!product) {
            throw new Error('Producto no encontrado');
        }

        const standardCost = Number(product.costPrice);
        const savingPerUnit = standardCost - paidCostPerUnit;
        const totalSaving = savingPerUnit * quantity;

        return {
            standardCost,
            paidCost: paidCostPerUnit,
            savingPerUnit,
            totalSaving,
            isWin: totalSaving > 0
        };
    }

    /**
     * Obtiene resumen de ahorros para un período
     */
    async getSavingsReport(dateFrom?: Date, dateTo?: Date): Promise<SavingsReport> {
        const where: any = {};

        if (dateFrom || dateTo) {
            where.order = {
                createdAt: {
                    ...(dateFrom && { gte: dateFrom }),
                    ...(dateTo && { lte: dateTo })
                }
            };
        }

        const items = await this.prisma.purchaseItem.findMany({
            where,
            select: {
                costPrice: true,
                quantity: true,
                standardCost: true,
                purchaseSaving: true
            }
        });

        let totalSavings = 0;
        let totalPurchases = 0;
        let itemsWithSavings = 0;
        let itemsWithLoss = 0;

        for (const item of items) {
            const saving = Number(item.purchaseSaving || 0);
            const purchase = Number(item.costPrice) * item.quantity;

            totalSavings += saving;
            totalPurchases += purchase;

            if (saving > 0) itemsWithSavings++;
            else if (saving < 0) itemsWithLoss++;
        }

        return {
            totalSavings,
            totalPurchases,
            savingsPercentage: totalPurchases > 0 ? (totalSavings / totalPurchases) * 100 : 0,
            itemsWithSavings,
            itemsWithLoss
        };
    }

    /**
     * Top productos donde más se "gana a la compra"
     */
    async getTopSavingsProducts(limit: number = 10): Promise<ProductSavings[]> {
        const result = await this.prisma.purchaseItem.groupBy({
            by: ['productId'],
            _sum: {
                purchaseSaving: true,
                quantity: true
            },
            where: {
                purchaseSaving: { gt: 0 }
            },
            orderBy: {
                _sum: { purchaseSaving: 'desc' }
            },
            take: limit
        });

        const products = await this.prisma.product.findMany({
            where: { id: { in: result.map(r => r.productId) } },
            select: { id: true, name: true }
        });

        const productMap = new Map(products.map(p => [p.id, p.name]));

        return result.map(r => ({
            productId: r.productId,
            productName: productMap.get(r.productId) || 'Desconocido',
            totalSavings: Number(r._sum.purchaseSaving || 0),
            totalQuantity: r._sum.quantity || 0,
            averageSavingPerUnit: r._sum.quantity
                ? Number(r._sum.purchaseSaving || 0) / r._sum.quantity
                : 0
        }));
    }

    /**
     * Top proveedores que ofrecen mejores ofertas
     */
    async getTopSupplierSavings(limit: number = 10): Promise<SupplierSavings[]> {
        const orders = await this.prisma.purchaseOrder.findMany({
            include: {
                supplier: { select: { id: true, name: true } },
                items: { select: { purchaseSaving: true } }
            }
        });

        const supplierSavings = new Map<string, { name: string; savings: number; orders: number }>();

        for (const order of orders) {
            const orderSaving = order.items.reduce((sum, item) => sum + Number(item.purchaseSaving || 0), 0);
            const existing = supplierSavings.get(order.supplierId);

            if (existing) {
                existing.savings += orderSaving;
                existing.orders += 1;
            } else {
                supplierSavings.set(order.supplierId, {
                    name: order.supplier.name,
                    savings: orderSaving,
                    orders: 1
                });
            }
        }

        return Array.from(supplierSavings.entries())
            .map(([supplierId, data]) => ({
                supplierId,
                supplierName: data.name,
                totalSavings: data.savings,
                ordersCount: data.orders
            }))
            .filter(s => s.totalSavings > 0)
            .sort((a, b) => b.totalSavings - a.totalSavings)
            .slice(0, limit);
    }

    /**
     * Historial de ahorros mensual
     */
    async getMonthlySavings(months: number = 12): Promise<Array<{ month: string; savings: number; purchases: number }>> {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const items = await this.prisma.purchaseItem.findMany({
            where: {
                order: { createdAt: { gte: startDate } }
            },
            include: {
                order: { select: { createdAt: true } }
            }
        });

        const monthlyData = new Map<string, { savings: number; purchases: number }>();

        for (const item of items) {
            const monthKey = item.order.createdAt.toISOString().slice(0, 7); // YYYY-MM
            const existing = monthlyData.get(monthKey) || { savings: 0, purchases: 0 };

            existing.savings += Number(item.purchaseSaving || 0);
            existing.purchases += Number(item.costPrice) * item.quantity;

            monthlyData.set(monthKey, existing);
        }

        return Array.from(monthlyData.entries())
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    /**
     * Detalle de ítems con ahorro/pérdida
     */
    async getSavingsDetails(options: {
        page?: number;
        limit?: number;
        onlyWins?: boolean;
        onlyLosses?: boolean;
    } = {}): Promise<{ items: any[]; total: number }> {
        const { page = 1, limit = 20, onlyWins, onlyLosses } = options;

        const where: any = {};
        if (onlyWins) where.purchaseSaving = { gt: 0 };
        if (onlyLosses) where.purchaseSaving = { lt: 0 };

        const [items, total] = await Promise.all([
            this.prisma.purchaseItem.findMany({
                where,
                include: {
                    product: { select: { name: true, sku: true } },
                    order: { select: { createdAt: true, supplier: { select: { name: true } } } }
                },
                orderBy: { order: { createdAt: 'desc' } },
                skip: (page - 1) * limit,
                take: limit
            }),
            this.prisma.purchaseItem.count({ where })
        ]);

        return {
            items: items.map(item => ({
                id: item.id,
                productName: item.product.name,
                productSku: item.product.sku,
                supplierName: item.order.supplier.name,
                date: item.order.createdAt,
                quantity: item.quantity,
                standardCost: Number(item.standardCost || 0),
                paidCost: Number(item.costPrice),
                saving: Number(item.purchaseSaving || 0),
                isWin: Number(item.purchaseSaving || 0) > 0
            })),
            total
        };
    }
}
