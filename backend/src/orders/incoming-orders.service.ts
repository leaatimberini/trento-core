import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface IncomingOrder {
    id: string;
    source: 'rappi' | 'pedidosya' | 'ecommerce' | 'mercadolibre';
    externalId: string;
    status: string;
    customerName: string;
    customerPhone?: string;
    address?: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    total: number;
    createdAt: Date;
    notes?: string;
}

@Injectable()
export class IncomingOrdersService {
    constructor(private prisma: PrismaService) { }

    // In-memory orders from webhooks (Rappi, PedidosYa, etc)
    private externalOrders: IncomingOrder[] = [];

    async getIncomingOrders(): Promise<{
        delivery: IncomingOrder[];
        ecommerce: IncomingOrder[];
        marketplace: IncomingOrder[];
        summary: {
            totalPending: number;
            totalPreparing: number;
            totalReady: number;
        };
    }> {
        // Get ecommerce orders from database (Sales with channel=ECOMMERCE, status != COMPLETED or recent)
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7); // Last 7 days

        const dbSales = await this.prisma.sale.findMany({
            where: {
                channel: 'ECOMMERCE',
                createdAt: { gte: recentDate }
            },
            include: {
                customer: true,
                payments: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform Sales to IncomingOrder format
        const ecommerceFromDB: IncomingOrder[] = dbSales.map(sale => ({
            id: sale.id,
            source: 'ecommerce' as const,
            externalId: sale.code,
            status: this.mapSaleStatus(sale.status),
            customerName: sale.customer?.name || 'Cliente',
            customerPhone: sale.customer?.phone || undefined,
            customerEmail: sale.customer?.email || undefined,
            customerDni: sale.customer?.taxId || undefined,
            address: sale.customer?.address || undefined,
            deliveryMethod: sale.deliveryMethod as any,
            paymentMethod: sale.payments?.[0]?.method || 'MERCADOPAGO',
            shippingAddress: sale.customer ? {
                street: sale.customer.address?.split(' ').slice(0, -1).join(' ') || '',
                number: sale.customer.address?.split(' ').pop() || '',
                postalCode: sale.customer.zipCode || '',
                city: sale.customer.city || '',
                province: ''
            } : undefined,
            items: sale.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: Number(item.unitPrice)
            })),
            total: Number(sale.totalAmount),
            shippingFee: Number((sale as any).shippingFee) || 0,
            discountAmount: Number(sale.discountAmount) || 0,
            createdAt: sale.createdAt,
            notes: undefined
        }));

        // Combine with in-memory external orders
        const delivery = this.externalOrders.filter(o => o.source === 'rappi' || o.source === 'pedidosya');
        const ecommerce = [...ecommerceFromDB, ...this.externalOrders.filter(o => o.source === 'ecommerce')];
        const marketplace = this.externalOrders.filter(o => o.source === 'mercadolibre');

        const allOrders = [...delivery, ...ecommerce, ...marketplace];

        return {
            delivery,
            ecommerce,
            marketplace,
            summary: {
                totalPending: allOrders.filter(o => o.status === 'PENDING' || o.status === 'PAID').length,
                totalPreparing: allOrders.filter(o => o.status === 'PREPARING').length,
                totalReady: allOrders.filter(o => o.status === 'READY').length
            }
        };
    }

    private mapSaleStatus(saleStatus: string): string {
        // Map database Sale status to UI status
        switch (saleStatus) {
            case 'PENDING': return 'PENDING';
            case 'PAID': return 'PAID';
            case 'PROCESSING': return 'PREPARING';
            case 'SHIPPED': return 'SHIPPED';
            case 'COMPLETED': return 'SHIPPED'; // Completed orders show as shipped
            case 'CANCELLED': return 'CANCELLED';
            default: return saleStatus;
        }
    }

    async updateOrderStatus(orderId: string, status: string): Promise<IncomingOrder | null> {
        // First check if it's a database sale
        const sale = await this.prisma.sale.findUnique({
            where: { id: orderId },
            include: { customer: true, items: { include: { product: true } } }
        });

        if (sale) {
            // Map UI status back to database status
            const dbStatus = this.mapUiStatusToDb(status);
            const updated = await this.prisma.sale.update({
                where: { id: orderId },
                data: { status: dbStatus as any },
                include: { customer: true, items: { include: { product: true } } }
            });

            return {
                id: updated.id,
                source: 'ecommerce',
                externalId: updated.code,
                status: this.mapSaleStatus(updated.status),
                customerName: updated.customer?.name || 'Cliente',
                customerPhone: updated.customer?.phone || undefined,
                address: updated.customer?.address || undefined,
                items: updated.items.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: Number(item.unitPrice)
                })),
                total: Number(updated.totalAmount),
                createdAt: updated.createdAt
            };
        }

        // Check in-memory orders
        const order = this.externalOrders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            return order;
        }

        return null;
    }

    private mapUiStatusToDb(uiStatus: string): string {
        switch (uiStatus) {
            case 'PENDING': return 'PENDING';
            case 'PAID': return 'PAID';
            case 'PREPARING': return 'PROCESSING';
            case 'READY': return 'PROCESSING';
            case 'SHIPPED': return 'SHIPPED';
            default: return uiStatus;
        }
    }

    async getOrderById(orderId: string): Promise<IncomingOrder | null> {
        // First check database
        const sale = await this.prisma.sale.findUnique({
            where: { id: orderId },
            include: { customer: true, items: { include: { product: true } } }
        });

        if (sale) {
            return {
                id: sale.id,
                source: 'ecommerce',
                externalId: sale.code,
                status: this.mapSaleStatus(sale.status),
                customerName: sale.customer?.name || 'Cliente',
                customerPhone: sale.customer?.phone || undefined,
                address: sale.customer?.address || undefined,
                items: sale.items.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: Number(item.unitPrice)
                })),
                total: Number(sale.totalAmount),
                createdAt: sale.createdAt
            };
        }

        // Check in-memory orders
        return this.externalOrders.find(o => o.id === orderId) || null;
    }

    // Called by webhooks from delivery apps
    async addOrderFromWebhook(source: string, data: any): Promise<IncomingOrder> {
        const newOrder: IncomingOrder = {
            id: `order-${Date.now()}`,
            source: source as any,
            externalId: data.externalId,
            status: 'PENDING',
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            address: data.address,
            items: data.items || [],
            total: data.total || 0,
            createdAt: new Date(),
            notes: data.notes
        };

        this.externalOrders.unshift(newOrder);
        return newOrder;
    }
}
