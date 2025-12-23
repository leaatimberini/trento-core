
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getSalesCsv(from?: string, to?: string): Promise<string> {
        const where: any = { status: 'COMPLETED' };

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(new Date(to).setHours(23, 59, 59, 999));
        }

        const sales = await this.prisma.sale.findMany({
            where,
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const header = 'Receipt ID,Date,Total,Channel,Items\n';
        const rows = sales.map(sale => {
            const date = sale.createdAt.toISOString();
            const items = sale.items.map(i => `${i.product.name} (x${i.quantity})`).join('; ');
            // Escape double quotes
            const safeItems = `"${items.replace(/"/g, '""')}"`;
            return `${sale.code || sale.id},${date},${sale.totalAmount},${sale.channel},${safeItems}`;
        }).join('\n');

        return header + rows;
    }

    async getInventoryCsv(): Promise<string> {
        const products = await this.prisma.product.findMany({
            include: { inventoryItems: true }
        });

        const header = 'SKU,Name,Category,Brand,Price,Current Stock,Value\n';
        const rows = products.map(p => {
            const stock = p.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
            const value = (Number(p.basePrice) * stock).toFixed(2);
            return `${p.sku},"${p.name.replace(/"/g, '""')}",${p.category || ''},${p.brand || ''},${p.basePrice},${stock},${value}`;
        }).join('\n');

        return header + rows;
    }
    async getDeadStockCsv(days: number = 30): Promise<string> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);

        // This is a heavy query, optimal for V2 would be to have 'lastSoldAt' on Product model
        const products = await this.prisma.product.findMany({
            include: {
                inventoryItems: true,
                saleItems: {
                    take: 1,
                    orderBy: { sale: { createdAt: 'desc' } },
                    include: { sale: true }
                }
            }
        });

        const deadStock = products.filter(p => {
            const stock = p.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
            if (stock === 0) return false; // Not dead stock if no stock

            const lastSale = p.saleItems[0]?.sale.createdAt;
            if (!lastSale) return true; // Never sold

            return lastSale < thresholdDate;
        });

        const header = 'SKU,Name,Current Stock,Value,Last Sold\n';
        const rows = deadStock.map(p => {
            const stock = p.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
            const value = (Number(p.basePrice) * stock).toFixed(2);
            const lastSold = p.saleItems[0]?.sale.createdAt.toISOString().split('T')[0] || 'NEVER';
            return `${p.sku},"${p.name.replace(/"/g, '""')}",${stock},${value},${lastSold}`;
        }).join('\n');

        return header + rows;
    }
}
