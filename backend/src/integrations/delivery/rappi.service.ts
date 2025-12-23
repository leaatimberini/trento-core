
import { Injectable } from '@nestjs/common';
import { ECommerceIntegration } from '../ecommerce/integration.interface';

@Injectable()
export class RappiService implements ECommerceIntegration {
    name = 'Rappi';

    async auth() {
        console.log('[Rappi] Authenticating...');
    }

    async syncProducts(products: any[]) {
        console.log(`[Rappi] Syncing ${products.length} products...`);
        return { success: products.length, failed: 0 };
    }

    async fetchOrders(since?: Date) {
        // Mock Orders
        return [
            {
                externalId: `RAP-${Math.floor(Math.random() * 10000)}`,
                platform: 'Rappi',
                items: [
                    { sku: 'BEB-001', quantity: 2, price: 1500 },
                    { sku: 'SNK-002', quantity: 1, price: 800 }
                ],
                total: 3800,
                status: 'PENDING',
                customer: { name: 'Usuario Rappi', address: 'Calle Falsa 123' }
            }
        ];
    }

    async updateStock(sku: string, quantity: number) {
        console.log(`[Rappi] Updated stock for ${sku}: ${quantity}`);
        return true;
    }
}
