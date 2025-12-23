
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FinanceService {
    constructor(private prisma: PrismaService) { }

    async getDailyStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sales = await this.prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: today,
                },
                documentType: 'SALE',
                status: { notIn: ['CANCELLED', 'REFUNDED'] }
            },
            include: { items: { include: { product: true } } }
        });

        const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0);
        const transactionCount = sales.length;

        // Calculate Profit
        // Revenue - COGS
        let totalCOGS = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const cost = Number(item.product.costPrice) > 0
                    ? Number(item.product.costPrice)
                    : Number(item.product.basePrice || 0);
                totalCOGS += cost * item.quantity;
            });
        });

        const grossProfit = totalRevenue - totalCOGS;

        // Estimated Commissions (5%) + Shipping (Avg 0 for now as it passes through usually)
        const estimatedCommissions = totalRevenue * 0.05;
        const totalNetProfit = grossProfit - estimatedCommissions;
        const realMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

        return {
            date: today.toISOString(),
            totalRevenue,
            transactionCount,
            totalCOGS,
            grossProfit,
            estimatedCommissions,
            totalNetProfit,
            realMargin,
            transactions: sales
        };
    }

    async getMonthlyStats(month?: number, year?: number) {
        const date = new Date();
        const m = month || date.getMonth() + 1;
        const y = year || date.getFullYear();

        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);

        const sales = await this.prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                },
                documentType: 'SALE',
                status: { notIn: ['CANCELLED', 'REFUNDED'] }
            },
            include: { items: { include: { product: true } } }
        });

        const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0);
        const transactionCount = sales.length;

        let totalCOGS = 0;
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const cost = Number(item.product.costPrice) > 0
                    ? Number(item.product.costPrice)
                    : Number(item.product.basePrice || 0);
                totalCOGS += cost * item.quantity;
            });
        });

        const grossProfit = totalRevenue - totalCOGS;

        const estimatedCommissions = totalRevenue * 0.05;
        const totalNetProfit = grossProfit - estimatedCommissions;
        const realMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

        return {
            period: `${m}/${y}`,
            totalRevenue,
            transactionCount,
            totalCOGS,
            grossProfit,
            estimatedCommissions,
            totalNetProfit,
            realMargin,
            transactions: sales
        };
    }

    async getProfitabilityStats(startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(0); // Default all time
        const end = endDate ? new Date(endDate) : new Date();

        const sales = await this.prisma.sale.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                },
                documentType: 'SALE'
            },
            include: { items: { include: { product: true } } }
        });

        let totalRevenue = 0;
        let totalCOGS = 0;

        sales.forEach(sale => {
            totalRevenue += Number(sale.totalAmount);
            sale.items.forEach(item => {
                const cost = Number(item.product.costPrice) > 0
                    ? Number(item.product.costPrice)
                    : Number(item.product.basePrice || 0);
                totalCOGS += cost * item.quantity;
            });
        });

        const grossProfit = totalRevenue - totalCOGS;
        const estimatedCommissions = totalRevenue * 0.05;
        const totalNetProfit = grossProfit - estimatedCommissions;

        return {
            totalRevenue,
            totalCOGS,
            grossProfit,
            estimatedCommissions,
            totalNetProfit,
            margin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
            realMargin: totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0
        };
    }

    async getBreakEvenAnalysis(month?: number, year?: number) {
        const date = new Date();
        const m = month || date.getMonth() + 1;
        const y = year || date.getFullYear();

        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);

        // 1. Get Sales
        const sales = await this.prisma.sale.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: 'COMPLETED',
                documentType: 'SALE'
            },
            include: { items: { include: { product: true } } }
        });

        // 2. Calc Revenue and COGS
        let totalRevenue = 0;
        let totalCOGS = 0;

        sales.forEach(sale => {
            totalRevenue += Number(sale.totalAmount);
            sale.items.forEach(item => {
                const cost = Number(item.product.costPrice) > 0
                    ? Number(item.product.costPrice)
                    : Number(item.product.basePrice || 0);
                totalCOGS += cost * item.quantity;
            });
        });

        const grossProfit = totalRevenue - totalCOGS;
        const marginRate = totalRevenue > 0 ? grossProfit / totalRevenue : 0;

        // 3. Get Fixed Expenses
        const expenses = await this.prisma.expense.aggregate({
            where: {
                date: { gte: start, lte: end }
            },
            _sum: { amount: true }
        });

        const totalFixedCosts = Number(expenses._sum.amount || 0);

        // 4. Calculate Break Even Point (Sales needed)
        // BEP = Fixed Costs / Margin Rate
        const breakEvenSales = marginRate > 0 ? totalFixedCosts / marginRate : 0;

        // Net Profit (Real)
        const netProfit = grossProfit - totalFixedCosts;

        return {
            period: `${m}/${y}`,
            totalRevenue,
            totalCOGS,
            grossProfit,
            grossMargin: marginRate * 100,
            totalFixedCosts,
            netProfit,
            breakEvenSales,
            salesToBreakEven: Math.max(0, breakEvenSales - totalRevenue),
            isProfitable: netProfit > 0
        };
    }

    async getTopProducts(limit: number = 5) {
        const sales = await this.prisma.saleItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true, totalPrice: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: limit
        });

        // We need product names, so we fetch them
        const productIds = sales.map(s => s.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        return sales.map(s => {
            const product = products.find(p => p.id === s.productId);
            return {
                id: s.productId,
                name: product?.name || 'Unknown',
                quantity: s._sum.quantity,
                revenue: s._sum.totalPrice
            };
        });
    }

    async getTopCustomers() {
        // Aggregate sales by customer
        const sales = await this.prisma.sale.findMany({
            where: { customerId: { not: null } },
            include: { customer: true }
        });

        const customerStats = new Map<string, { name: string, total: number, count: number }>();

        sales.forEach(sale => {
            if (!sale.customer) return;
            const id = sale.customerId!;
            const current = customerStats.get(id) || { name: sale.customer.name, total: 0, count: 0 };

            current.total += Number(sale.totalAmount);
            current.count += 1;
            customerStats.set(id, current);
        });

        return Array.from(customerStats.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
    }

    async generateLibroIVA(month: number, year: number): Promise<string> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const sales = await this.prisma.sale.findMany({
            where: {
                status: 'COMPLETED',
                documentType: 'SALE',
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: { customer: true },
            orderBy: { createdAt: 'asc' }
        });

        const header = 'Fecha,Tipo Comp,Punto Venta,Nro Comp,Cliente,CUIT,Neto Gravado,IVA 21%,Total\n';
        const rows = sales.map(s => {
            const date = s.createdAt.toISOString().split('T')[0];
            const customerName = s.customer?.name || 'CONSUMIDOR FINAL';
            const customerTaxId = s.customer?.taxId || '00-00000000-0'; // Assuming taxId field exists or stub
            const net = (Number(s.totalAmount) / 1.21).toFixed(2);
            const vat = (Number(s.totalAmount) - Number(net)).toFixed(2);
            const total = Number(s.totalAmount).toFixed(2);

            // Stub Invoice Number format 0001-00001234
            const invoiceNum = s.fiscalNumber || `0001-${s.code.replace('SALE-', '').slice(0, 8)}`;

            return `${date},FC,0001,${invoiceNum},"${customerName}",${customerTaxId},${net},${vat},${total}`;
        }).join('\n');

        return header + rows;
    }

    async getDeadStockReport(days: number = 90) {
        // Find products with inventory but NO sales in last X days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // 1. Get IDs of products sold since cutoff
        const soldItems = await this.prisma.saleItem.findMany({
            where: {
                sale: {
                    createdAt: { gte: cutoffDate }
                }
            },
            select: { productId: true },
            distinct: ['productId']
        });

        const soldProductIds = soldItems.map(i => i.productId);

        // 2. Find products NOT in that list, but having stock > 0
        // We need to look at InventoryItems or Products with aggregated stock.
        // Assuming Product has `currentStock` (updated by logic? No, currentStock is in Product model but usually computed from InventoryItems. 
        // Let's use InventoryItem summation for accuracy or just checking existence if stock is spread.)

        // Let's look for InventoryItems with stock > 0, then filtered by product exclusion.
        const stockItems = await this.prisma.inventoryItem.findMany({
            where: {
                quantity: { gt: 0 },
                productId: { notIn: soldProductIds }
            },
            include: { product: true }
        });

        // Group by product to avoid duplicates if multiple batches exist
        const deadStockMap = new Map<string, { product: any, quantity: number }>();

        for (const item of stockItems) {
            const current = deadStockMap.get(item.productId) || { product: item.product, quantity: 0 };
            current.quantity += item.quantity;
            deadStockMap.set(item.productId, current);
        }

        return Array.from(deadStockMap.values());
    }

    async getTopCategories(startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();

        // Ensure we fetch sales in range
        const sales = await this.prisma.sale.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: 'COMPLETED',
                documentType: 'SALE'
            },
            include: { items: { include: { product: true } } }
        });

        const catStats = new Map<string, { name: string, revenue: number, count: number }>();

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const cat = item.product.category || 'Uncategorized';
                const current = catStats.get(cat) || { name: cat, revenue: 0, count: 0 };
                current.revenue += Number(item.totalPrice); // Use stored line total
                current.count += item.quantity;
                catStats.set(cat, current);
            });
        });

        return Array.from(catStats.values())
            .sort((a, b) => b.revenue - a.revenue);
    }


    async reconcileTransactions(bankTransactions: { date: string, amount: number, description: string }[]) {
        // Fetch recent sales (last 30 days covers mostly everything for this context)
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);

        const sales = await this.prisma.sale.findMany({
            where: {
                createdAt: { gte: dateLimit },
                status: 'COMPLETED'
            }
        });

        const matches = [];
        const missingInSystem = [];
        const missingInBank = [...sales]; // Start with all sales, remove matches

        for (const bt of bankTransactions) {
            const btDate = new Date(bt.date);
            const foundIndex = missingInBank.findIndex(s => {
                const sDate = new Date(s.createdAt);
                // Match criteria: Same day, Same Amount (approx)
                const isSameDay = btDate.getDate() === sDate.getDate() &&
                    btDate.getMonth() === sDate.getMonth() &&
                    btDate.getFullYear() === sDate.getFullYear();

                // Allow 1% tolerance or exact? Let's say exact for now + small float diff
                const diff = Math.abs(Number(s.totalAmount) - bt.amount);
                return isSameDay && diff < 0.1;
            });

            if (foundIndex >= 0) {
                const sale = missingInBank[foundIndex];
                matches.push({ sale, bankTransaction: bt });
                missingInBank.splice(foundIndex, 1);
            } else {
                missingInSystem.push(bt);
            }
        }

        return {
            matches,
            unmatchedSystem: missingInBank,
            unmatchedBank: missingInSystem
        };
    }

    async simulateBankStatement() {
        // Generate transactions based on recent sales, plus some errors
        const today = new Date();
        today.setDate(today.getDate() - 7); // Last 7 days

        const sales = await this.prisma.sale.findMany({
            where: { createdAt: { gte: today }, status: 'COMPLETED' },
            take: 20
        });

        const transactions = sales.map(s => ({
            date: s.createdAt.toISOString(),
            amount: Number(s.totalAmount),
            description: `SALE REF ${s.code}`
        }));

        // Add some noise (Missing in System / Extra in Bank)
        transactions.push({
            date: new Date().toISOString(),
            amount: 5000,
            description: "UNKNOWN CREDIT"
        });

        // Remove one to simulate "Missing in Bank" (Cash lost?)
        if (transactions.length > 2) transactions.pop();

        return transactions;
    }
}
