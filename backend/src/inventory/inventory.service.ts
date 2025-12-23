
import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { AdjustStockDto, AdjustmentReason } from './dto/adjust-stock.dto';

import { EmailService } from '../notifications/email.service';

import { BotService } from '../bot/bot.service';

@Injectable()
export class InventoryService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
        @Inject(forwardRef(() => BotService))
        private botService: BotService
    ) { }

    /**
     * Adjust stock with reason tracking (for losses, breakage, counts, etc.)
     */
    async adjustStock(dto: AdjustStockDto, userId?: string) {
        const warehouseId = dto.warehouseId || (await this.getMainWarehouseId());

        return this.prisma.$transaction(async (tx) => {
            // Find existing inventory item or create one
            const whereClause = {
                productId: dto.productId,
                batchNumber: dto.batchNumber || 'DEFAULT',
                locationZone: 'AJUSTE',
                warehouseId: warehouseId
            };

            // If negative adjustment (loss), find stock to deduct from
            if (dto.quantity < 0) {
                // Find items with stock
                const items = await tx.inventoryItem.findMany({
                    where: {
                        productId: dto.productId,
                        quantity: { gt: 0 },
                        ...(dto.warehouseId ? { warehouseId: dto.warehouseId } : {}),
                        ...(dto.batchNumber ? { batchNumber: dto.batchNumber } : {})
                    },
                    orderBy: [
                        { expirationDate: 'asc' },
                        { createdAt: 'asc' }
                    ]
                });

                const totalAvailable = items.reduce((sum, item) => sum + item.quantity, 0);
                const absQuantity = Math.abs(dto.quantity);

                if (totalAvailable < absQuantity) {
                    throw new BadRequestException(
                        `Stock insuficiente. Disponible: ${totalAvailable}, Ajuste: ${absQuantity}`
                    );
                }

                // Deduct from available items (FEFO)
                let remaining = absQuantity;
                for (const item of items) {
                    if (remaining <= 0) break;
                    const deductAmount = Math.min(item.quantity, remaining);

                    await tx.inventoryItem.update({
                        where: { id: item.id },
                        data: { quantity: { decrement: deductAmount } }
                    });

                    remaining -= deductAmount;
                }
            } else if (dto.quantity > 0) {
                // Positive adjustment (found extra stock, count correction)
                await tx.inventoryItem.upsert({
                    where: {
                        productId_batchNumber_locationZone_warehouseId: whereClause
                    },
                    update: { quantity: { increment: dto.quantity } },
                    create: {
                        ...whereClause,
                        quantity: dto.quantity
                    }
                });
            }

            // Log the adjustment transaction
            const transaction = await tx.inventoryTransaction.create({
                data: {
                    productId: dto.productId,
                    quantity: dto.quantity,
                    type: 'ADJUSTMENT',
                    referenceId: `${dto.reason}${dto.notes ? ': ' + dto.notes : ''}`,
                    userId: userId || 'SYSTEM'
                }
            });

            // Get current total stock for response
            const currentStock = await tx.inventoryItem.aggregate({
                where: { productId: dto.productId },
                _sum: { quantity: true }
            });

            return {
                success: true,
                transactionId: transaction.id,
                adjustment: dto.quantity,
                reason: dto.reason,
                notes: dto.notes,
                currentStock: currentStock._sum.quantity || 0
            };
        });
    }

    /**
     * Get adjustment history for a product
     */
    async getAdjustmentHistory(productId?: string) {
        const where: any = { type: 'ADJUSTMENT' };
        if (productId) where.productId = productId;

        return this.prisma.inventoryTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }


    async deductStock(productId: string, quantity: number, warehouseId?: string, tx?: any) {
        const prisma = tx || this.prisma;

        const whereClause: any = {
            productId,
            quantity: { gt: 0 }
        };

        if (warehouseId) {
            whereClause.warehouseId = warehouseId;
        }

        // 1. Get all available stock sorted by Expiration (FEFO) or Created (FIFO)
        const items = await prisma.inventoryItem.findMany({
            where: whereClause,
            orderBy: [
                { expirationDate: 'asc' }, // FEFO preference
                { createdAt: 'asc' }       // Fallback to FIFO
            ]
        });

        const totalAvailable = items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalAvailable < quantity) {
            throw new BadRequestException(`Insufficient stock for product ${productId}. Available: ${totalAvailable}, Requested: ${quantity}`);
        }

        let remaining = quantity;

        // 2. Iterate and deduct
        for (const item of items) {
            if (remaining <= 0) break;

            const deductAmount = Math.min(item.quantity, remaining);

            await prisma.inventoryItem.update({
                where: { id: item.id },
                data: { quantity: { decrement: deductAmount } }
            });

            // Log per-batch deduction for detailed traceability
            await prisma.inventoryTransaction.create({
                data: {
                    productId,
                    quantity: -deductAmount, // Negative for OUT
                    type: 'SALE_DEDUCTION',
                    userId: 'SYSTEM', // TODO: Pass user context
                }
            });

            remaining -= deductAmount;
        }

        // Check for Low Stock Alert
        const newTotal = totalAvailable - quantity;
        if (newTotal < 10 && totalAvailable >= 10) {
            // Fetch product name for email
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (product) {
                this.emailService.sendLowStockAlert([{
                    name: product.name,
                    sku: product.sku,
                    quantity: newTotal
                }]);

                // Telegram Alert
                this.botService.sendAlert(
                    `📉 **STOCK BAJO**: ${product.name}\nSKU: ${product.sku}\nQuedan: ${newTotal} unidades.`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📝 Reponer (+50)', callback_data: `restock:${product.id}` }]
                            ]
                        }
                    }
                );
            }
        }
    }

    async receiveStock(dto: ReceiveStockDto) {
        // 1. Check if InventoryItem exists for this Batch/Location

        // Use provided warehouseId or find the MAIN one
        const warehouseId = dto.warehouseId || (await this.getMainWarehouseId());

        return this.prisma.$transaction(async (tx) => {
            // Upsert Inventory Item
            const item = await tx.inventoryItem.upsert({
                where: {
                    productId_batchNumber_locationZone_warehouseId: {
                        productId: dto.productId,
                        batchNumber: dto.batchNumber,
                        locationZone: dto.locationZone,
                        warehouseId: warehouseId
                    }
                },
                update: {
                    quantity: { increment: dto.quantity }
                },
                create: {
                    productId: dto.productId,
                    batchNumber: dto.batchNumber,
                    locationZone: dto.locationZone,
                    quantity: dto.quantity,
                    expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
                    warehouseId: warehouseId
                }
            });

            // Create Audit Log
            await tx.inventoryTransaction.create({
                data: {
                    productId: dto.productId,
                    quantity: dto.quantity,
                    type: 'PURCHASE_RECEIPT',
                    userId: 'SYSTEM',
                }
            });

            return item;
        });
    }

    async transferStock(dto: TransferStockDto) {
        return this.prisma.$transaction(async (tx) => {
            // Determine Warehouses (Intra-warehouse transfer default)
            const sourceWarehouseId = (dto as any).fromWarehouseId || (await this.getMainWarehouseId());
            const targetWarehouseId = (dto as any).toWarehouseId || sourceWarehouseId;

            // 1. Find Source Item
            const sourceItemExact = await tx.inventoryItem.findUnique({
                where: {
                    productId_batchNumber_locationZone_warehouseId: {
                        productId: dto.productId,
                        batchNumber: dto.batchNumber,
                        locationZone: dto.fromLocation,
                        warehouseId: sourceWarehouseId
                    }
                }
            });

            if (!sourceItemExact || sourceItemExact.quantity < dto.quantity) {
                throw new BadRequestException('Insufficient stock in source location');
            }

            // 2. Decrement Source
            await tx.inventoryItem.update({
                where: { id: sourceItemExact.id },
                data: { quantity: { decrement: dto.quantity } }
            });

            // 3. Increment/Create Destination
            await tx.inventoryItem.upsert({
                where: {
                    productId_batchNumber_locationZone_warehouseId: {
                        productId: dto.productId,
                        batchNumber: dto.batchNumber,
                        locationZone: dto.toLocation,
                        warehouseId: targetWarehouseId
                    }
                },
                update: { quantity: { increment: dto.quantity } },
                create: {
                    productId: dto.productId,
                    batchNumber: dto.batchNumber,
                    locationZone: dto.toLocation,
                    quantity: dto.quantity,
                    expirationDate: sourceItemExact.expirationDate,
                    warehouseId: targetWarehouseId
                }
            });

            // 4. Log Transaction
            await tx.inventoryTransaction.create({
                data: {
                    productId: dto.productId,
                    quantity: dto.quantity,
                    type: 'TRANSFER',
                    userId: 'SYSTEM',
                }
            });

            return { success: true };
        });
    }

    async getLowStock(threshold: number) {
        // Group by product and sum quantity
        const allItems = await this.prisma.inventoryItem.findMany();
        const productStock: Record<string, number> = {};

        for (const item of allItems) {
            productStock[item.productId] = (productStock[item.productId] || 0) + item.quantity;
        }

        const lowStockIds = Object.keys(productStock).filter(id => productStock[id] < threshold);

        return this.prisma.product.findMany({
            where: {
                id: { in: lowStockIds }
            }
        });
    }

    async restoreStock(productId: string, quantity: number) {
        // Simplest restoration: Add to a 'RETURNS' zone or default zone
        // Implementation similar to receiveStock but simplified
        const warehouseId = await this.getMainWarehouseId();

        await this.prisma.inventoryItem.upsert({
            where: {
                productId_batchNumber_locationZone_warehouseId: {
                    productId,
                    batchNumber: 'RETURN',
                    locationZone: 'RETURNS',
                    warehouseId
                }
            },
            update: { quantity: { increment: quantity } },
            create: {
                productId,
                batchNumber: 'RETURN',
                locationZone: 'RETURNS',
                quantity,
                warehouseId
            }
        });

        await this.prisma.inventoryTransaction.create({
            data: {
                productId,
                quantity: quantity,
                type: 'RETURN',
                userId: 'SYSTEM',
            }
        });
    }

    private async getMainWarehouseId(): Promise<string> {
        // Use DEPOT instead of MAIN which is invalid
        const main = await this.prisma.warehouse.findFirst({ where: { type: 'DEPOT' } });
        if (main) return main.id;

        const newMain = await this.prisma.warehouse.create({
            data: { name: 'Depósito Central', type: 'DEPOT' }
        });
        return newMain.id;
    }

    async getProductStockDetails(productId: string) {
        return this.prisma.inventoryItem.findMany({
            where: { productId },
            orderBy: { locationZone: 'asc' }
        });
    }

    async checkAndGenerateReorder() {
        const lowStockProducts = await this.getLowStock(10);
        const generatedOrders = [];

        for (const product of lowStockProducts) {
            const supplier = await this.prisma.supplier.findFirst();
            if (!supplier) continue;

            const order = await this.prisma.purchaseOrder.create({
                data: {
                    supplierId: supplier.id,
                    status: 'DRAFT',
                    totalAmount: 0,
                    items: {
                        create: {
                            productId: product.id,
                            quantity: 50,
                            costPrice: Number(product.basePrice) * 0.6
                        }
                    }
                }
            });
            generatedOrders.push(order);
        }
        return { generated: generatedOrders.length, orders: generatedOrders };
    }
    async getExpiringItems(days: number = 30) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + days);

        // Find items expiring before threshold and have quantity > 0
        const items = await this.prisma.inventoryItem.findMany({
            where: {
                expirationDate: {
                    lte: thresholdDate,
                    gte: new Date() // Not expired yet
                },
                quantity: { gt: 0 }
            },
            include: { product: true },
            orderBy: { expirationDate: 'asc' }
        });

        // Map to flat structure for reports
        return items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            batchNumber: item.batchNumber,
            expirationDate: item.expirationDate,
            daysUntilExpiry: item.expirationDate
                ? Math.ceil((item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null,
            quantity: item.quantity,
            location: item.locationZone
        }));
    }

    /**
     * Get already expired items (for writeoff/adjustment)
     */
    async getExpiredItems() {
        const items = await this.prisma.inventoryItem.findMany({
            where: {
                expirationDate: { lt: new Date() },
                quantity: { gt: 0 }
            },
            include: { product: true },
            orderBy: { expirationDate: 'asc' }
        });

        return items.map(item => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            batchNumber: item.batchNumber,
            expirationDate: item.expirationDate,
            daysExpired: item.expirationDate
                ? Math.ceil((Date.now() - item.expirationDate.getTime()) / (1000 * 60 * 60 * 24))
                : 0,
            quantity: item.quantity,
            location: item.locationZone
        }));
    }

    /**
     * Check if a product has any expired stock (for blocking sales)
     * Returns true if ALL stock is expired, false if there's valid stock
     */
    async isProductFullyExpired(productId: string): Promise<boolean> {
        const validStock = await this.prisma.inventoryItem.findFirst({
            where: {
                productId,
                quantity: { gt: 0 },
                OR: [
                    { expirationDate: null }, // No expiration
                    { expirationDate: { gte: new Date() } } // Not expired
                ]
            }
        });

        return validStock === null;
    }

    /**
     * Get expiration summary by urgency levels
     */
    async getExpirationSummary() {
        const today = new Date();
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);
        const in30Days = new Date(today);
        in30Days.setDate(in30Days.getDate() + 30);

        const [expired, critical, warning, ok] = await Promise.all([
            // Expired
            this.prisma.inventoryItem.count({
                where: {
                    expirationDate: { lt: today },
                    quantity: { gt: 0 }
                }
            }),
            // Critical: expires in 7 days
            this.prisma.inventoryItem.count({
                where: {
                    expirationDate: { gte: today, lt: in7Days },
                    quantity: { gt: 0 }
                }
            }),
            // Warning: expires in 30 days
            this.prisma.inventoryItem.count({
                where: {
                    expirationDate: { gte: in7Days, lt: in30Days },
                    quantity: { gt: 0 }
                }
            }),
            // OK: expires after 30 days or no expiration
            this.prisma.inventoryItem.count({
                where: {
                    quantity: { gt: 0 },
                    OR: [
                        { expirationDate: null },
                        { expirationDate: { gte: in30Days } }
                    ]
                }
            })
        ]);

        return {
            expired: { count: expired, label: 'Vencido', color: 'red' },
            critical: { count: critical, label: 'Crítico (7 días)', color: 'orange' },
            warning: { count: warning, label: 'Próximo (30 días)', color: 'yellow' },
            ok: { count: ok, label: 'OK', color: 'green' }
        };
    }
    async exportInventory() {
        // Fetch all products with their total stock
        const products = await this.prisma.product.findMany({
            include: { inventoryItems: true },
            orderBy: { name: 'asc' }
        });

        // Generate CSV string manually
        let csv = 'SKU,Name,Category,CurrentStock,CostPrice,BasePrice\n';

        for (const p of products) {
            const stock = p.inventoryItems.reduce((acc, item) => acc + item.quantity, 0);
            // Escape quotes in name
            const safeName = p.name ? `"${p.name.replace(/"/g, '""')}"` : '';
            const safeCategory = p.category ? `"${p.category.replace(/"/g, '""')}"` : '';
            const safeSku = p.sku ? `"${p.sku.replace(/"/g, '""')}"` : '';

            csv += `${safeSku},${safeName},${safeCategory},${stock},${p.costPrice || 0},${p.basePrice || 0}\n`;
        }

        return csv;
    }

    async importInventory(fileBuffer: Buffer) {
        const content = fileBuffer.toString('utf-8');
        const lines = content.split(/\r?\n/);

        const results = {
            total: 0,
            updated: 0,
            errors: 0,
            details: []
        };

        // Skip header
        const startIndex = lines[0].toLowerCase().startsWith('sku') ? 1 : 0;

        const warehouseId = await this.getMainWarehouseId();

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Regex to parse CSV
            const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!parts || parts.length < 4) continue;

            const sku = parts[0].replace(/"/g, '').trim();
            const stockStr = parts[3].replace(/"/g, '').trim();
            const quantity = parseInt(stockStr);

            if (!sku || isNaN(quantity)) {
                results.errors++;
                continue;
            }

            try {
                const product = await this.prisma.product.findUnique({ where: { sku } });
                if (!product) {
                    results.errors++;
                    results.details.push(`SKU not found: ${sku}`);
                    continue;
                }

                // Adjust Stock
                const currentItems = await this.prisma.inventoryItem.aggregate({
                    where: { productId: product.id },
                    _sum: { quantity: true }
                });
                const currentQty = currentItems._sum.quantity || 0;

                const difference = quantity - currentQty;

                if (difference !== 0) {
                    await this.adjustStock({
                        productId: product.id,
                        quantity: difference,
                        reason: AdjustmentReason.CONTEO,
                        notes: 'CSV Import',
                        warehouseId
                    }, 'SYSTEM');
                    results.updated++;
                }
                results.total++;

            } catch (e) {
                results.errors++;
                results.details.push(`Error on ${sku}: ${e.message}`);
            }
        }

        return results;
    }
}

