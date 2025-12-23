import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DistributionService {
    constructor(private prisma: PrismaService) { }

    async generatePackingSlip(saleId: string) {
        const sale = await this.prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: { include: { product: true } }, customer: true }
        });

        if (!sale) throw new Error('Sale not found');

        // Text-based Packing Slip generator (Mock for PDF)
        const slip = [
            `REMITO DE ENTREGA - TRENTO`,
            `---------------------------`,
            `Orden: ${sale.code}`,
            `Fecha: ${new Date().toLocaleDateString()}`,
            `Cliente: ${sale.customer?.name || 'Consumidor Final'}`,
            `Dirección: ${sale.customer?.address || 'Retiro en Tienda'}`,
            `---------------------------`,
            `ITEMS:`,
            ...sale.items.map(i => `- ${i.quantity} x ${i.product.name} (${i.product.sku})`),
            `---------------------------`,
            `Firma Recibido: ....................`
        ].join('\n');

        return slip;
    }

    async optimizeRoute(orders: any[]) {
        // Mock Optimization Logic
        // Sort by "Zone" or "ZipCode"
        // Since we don't have geo-coords, we mock it.
        return orders.sort((a, b) => (a.customer?.zipCode || '').localeCompare(b.customer?.zipCode || ''));
    }

    async getDeliveries() {
        // Fetch sales created today or recently that are COMPLETED
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.prisma.sale.findMany({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: today }
            },
            include: { customer: true, items: { include: { product: true } } }
        });
    }
}
