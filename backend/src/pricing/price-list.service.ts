import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PriceListService {
    constructor(private prisma: PrismaService) { }

    // ============ CRUD ============

    async create(data: { name: string; description?: string; markup?: number; isDefault?: boolean }) {
        // If setting as default, unset any existing default
        if (data.isDefault) {
            await this.prisma.priceList.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        return this.prisma.priceList.create({
            data: {
                name: data.name,
                description: data.description,
                markup: data.markup,
                isDefault: data.isDefault || false
            }
        });
    }

    async findAll() {
        return this.prisma.priceList.findMany({
            include: {
                _count: { select: { items: true, customers: true } }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        const list = await this.prisma.priceList.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        // We can't include product directly since it's not in the relation
                        // We'll fetch product info separately
                    }
                },
                customers: { select: { id: true, name: true } },
                _count: { select: { items: true, customers: true } }
            }
        });

        if (!list) throw new NotFoundException('Lista de precios no encontrada');

        // Fetch product info for items
        const productIds = list.items.map(i => i.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, costPrice: true, basePrice: true }
        });

        const productMap = new Map(products.map(p => {
            const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.basePrice);
            return [p.id, { ...p, costPrice: cost }];
        }));

        return {
            ...list,
            items: list.items.map(item => ({
                ...item,
                product: productMap.get(item.productId)
            }))
        };
    }

    async getDefault() {
        return this.prisma.priceList.findFirst({
            where: { isDefault: true }
        });
    }

    async update(id: string, data: { name?: string; description?: string; markup?: number; isDefault?: boolean }) {
        if (data.isDefault) {
            await this.prisma.priceList.updateMany({
                where: { isDefault: true, id: { not: id } },
                data: { isDefault: false }
            });
        }

        return this.prisma.priceList.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        // First remove items
        await this.prisma.priceListItem.deleteMany({ where: { priceListId: id } });
        // Remove list assignment from customers
        await this.prisma.customer.updateMany({
            where: { priceListId: id },
            data: { priceListId: null }
        });
        // Delete list
        return this.prisma.priceList.delete({ where: { id } });
    }

    // ============ ITEMS ============

    async addItem(priceListId: string, productId: string, price: number) {
        return this.prisma.priceListItem.upsert({
            where: {
                priceListId_productId: { priceListId, productId }
            },
            update: { price },
            create: { priceListId, productId, price }
        });
    }

    async addItems(priceListId: string, items: { productId: string; price: number }[]) {
        const results = await Promise.all(
            items.map(item => this.addItem(priceListId, item.productId, item.price))
        );
        return results;
    }

    async updateItemPrice(priceListId: string, productId: string, price: number) {
        return this.prisma.priceListItem.update({
            where: {
                priceListId_productId: { priceListId, productId }
            },
            data: { price }
        });
    }

    async removeItem(priceListId: string, productId: string) {
        return this.prisma.priceListItem.delete({
            where: {
                priceListId_productId: { priceListId, productId }
            }
        });
    }

    // ============ BULK OPERATIONS ============

    async applyMarkupToAll(priceListId: string, markupPercentage: number) {
        // Get all products with costPrice and basePrice
        const products = await this.prisma.product.findMany({
            select: { id: true, costPrice: true, basePrice: true }
        });

        const items = products.map(p => {
            const cost = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.basePrice);
            return {
                productId: p.id,
                price: cost * (1 + markupPercentage / 100)
            };
        });

        return this.addItems(priceListId, items);
    }

    // ============ PRICE LOOKUP ============

    async getPrice(productId: string, customerId?: string): Promise<number | null> {
        let priceListId: string | null = null;

        // If customer provided, get their price list
        if (customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: customerId },
                select: { priceListId: true }
            });
            priceListId = customer?.priceListId || null;
        }

        // If no customer price list, try default
        if (!priceListId) {
            const defaultList = await this.getDefault();
            priceListId = defaultList?.id || null;
        }

        if (!priceListId) return null;

        // Get price from list
        const item = await this.prisma.priceListItem.findUnique({
            where: {
                priceListId_productId: { priceListId, productId }
            }
        });

        return item ? Number(item.price) : null;
    }

    async getPricesForProducts(productIds: string[], customerId?: string): Promise<Map<string, number>> {
        let priceListId: string | null = null;

        if (customerId) {
            const customer = await this.prisma.customer.findUnique({
                where: { id: customerId },
                select: { priceListId: true }
            });
            priceListId = customer?.priceListId || null;
        }

        if (!priceListId) {
            const defaultList = await this.getDefault();
            priceListId = defaultList?.id || null;
        }

        if (!priceListId) return new Map();

        const items = await this.prisma.priceListItem.findMany({
            where: {
                priceListId,
                productId: { in: productIds }
            }
        });

        return new Map(items.map(i => [i.productId, Number(i.price)]));
    }
}
