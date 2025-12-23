import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
    constructor(
        private prisma: PrismaService,
        private inventoryService: InventoryService
    ) { }

    async create(data: any) {
        // data.items = [{ productId, quantity, costPrice }]
        // Calculate Total
        const totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.quantity * (item.costPrice || 0)), 0);

        return this.prisma.purchaseOrder.create({
            data: {
                supplierId: data.supplierId,
                status: PurchaseStatus.ORDERED, // Skip DRAFT for now
                totalAmount: totalAmount,
                items: {
                    create: data.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        costPrice: item.costPrice || 0
                    }))
                }
            },
            include: { items: true, supplier: true }
        });
    }

    async findAll() {
        return this.prisma.purchaseOrder.findMany({
            include: { supplier: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async receiveOrder(id: string, receiveData: any) {
        // receiveData = { items: [ { productId, quantity, batchNumber, locationZone, expirationDate } ] }
        // For MVP, we might receive the whole order at once or item match.

        const order = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!order) throw new BadRequestException('Order not found');
        if (order.status === PurchaseStatus.RECEIVED) throw new BadRequestException('Order already processed');

        // Process Stock Receipt
        // We assume receiveData contains details for each item or we use defaults?
        // Let's iterate over order items and find matching receive details or default.
        // MVP: The user just clicks "Receive" and we put them in a "DEFAULT_RECEPTION" zone with a generated batch.

        const batchNumber = receiveData.batchNumber || `PO-${order.id.substring(0, 8)}`;
        const locationZone = receiveData.locationZone || 'RECEIVING-AREA';

        for (const item of order.items) {
            await this.inventoryService.receiveStock({
                productId: item.productId,
                quantity: item.quantity,
                batchNumber: batchNumber,
                locationZone: locationZone,
                expirationDate: receiveData.expirationDate
            });
        }

        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: PurchaseStatus.RECEIVED }
        });
    }
}
