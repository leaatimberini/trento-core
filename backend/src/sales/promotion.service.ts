import { Injectable } from '@nestjs/common';
import { CreateSaleItemDto } from '../sales/dto/create-sale.dto';

export interface Promotion {
    id: string;
    name: string;
    type: 'BOGO' | 'PERCENTAGE' | 'FIXED';
    rule: {
        minQty?: number;
        categoryId?: string;
        productId?: string;
        percentage?: number;
        buyQty?: number;
        getQty?: number;
    };
}

@Injectable()
export class PromotionService {
    // In-memory rules for V2 prototype (since DB migration is blocked)
    private promotions: Promotion[] = [
        {
            id: 'promo-1',
            name: '2x1 Bebidas',
            type: 'BOGO', // Buy One Get One (or Buy N Get M)
            rule: {
                categoryId: 'BEBIDAS', // Needs Category Logic
                buyQty: 2,
                getQty: 1
            }
        },
        {
            id: 'promo-2',
            name: '10% OFF Vinos',
            type: 'PERCENTAGE',
            rule: {
                categoryId: 'VINOS',
                percentage: 10
            }
        }
    ];

    async applyPromotions(items: { productId: string, quantity: number, unitPrice: number, product: { category: string | null } }[]): Promise<{ discount: number, appliedPromos: string[] }> {
        let totalDiscount = 0;
        const appliedPromos: string[] = [];

        for (const promo of this.promotions) {
            if (promo.type === 'PERCENTAGE' && promo.rule.categoryId && promo.rule.percentage) {
                // Apply Percentage Discount to Category items
                const categoryItems = items.filter(i => i.product.category === promo.rule.categoryId);
                if (categoryItems.length > 0) {
                    const subtotal = categoryItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
                    const discount = subtotal * (promo.rule.percentage / 100);
                    totalDiscount += discount;
                    appliedPromos.push(promo.name);
                }
            } else if (promo.type === 'BOGO' && promo.rule.categoryId && promo.rule.buyQty && promo.rule.getQty) {
                // Apply "Buy N Get M" (e.g., 3x2 -> Buy 2 Get 1? No 3x2 means pay 2 get 3. Usually expressed as Buy 3 Pay 2)
                // My rule definition: buyQty=2, getQty=1 (Total 3 items involved? Or Buy 2 AND Get 1 Free = 3 items?)
                // Let's interpret "3x2" as: Every 3 items, 1 is free.
                // So if rule says buyQty=3, payQty=2. 
                // Let's stick to existing struct: buyQty=2, getQty=1 => Total items = 3. 1 is free.
                const groupSize = promo.rule.buyQty! + promo.rule.getQty!;

                const categoryItems = items.filter(i => i.product.category === promo.rule.categoryId);

                for (const item of categoryItems) {
                    if (item.quantity >= groupSize) {
                        const freeSets = Math.floor(item.quantity / groupSize);
                        const discount = freeSets * promo.rule.getQty! * item.unitPrice;
                        totalDiscount += discount;
                        appliedPromos.push(promo.name);
                    }
                }
            }
        }

        return { discount: totalDiscount, appliedPromos };
    }

    calculateDiscount(item: any, product: any): number {
        return 0; // Deprecated by applyPromotions
    }
}
