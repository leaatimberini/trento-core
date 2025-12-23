import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AndreaniService } from './andreani.service';

@Controller('shipping')
export class ShippingController {
    constructor(private readonly andreaniService: AndreaniService) { }

    /**
     * Public endpoint to get shipping quote
     */
    @Post('quote')
    async getShippingQuote(@Body() body: {
        postalCode: string;
        items: Array<{ productId: string; quantity: number; weight?: number }>;
    }) {
        // Calculate total weight (default 0.5kg per item if not specified)
        const totalWeight = body.items.reduce((sum, item) => {
            const weight = item.weight || 0.5; // Default 500g per item
            return sum + (weight * item.quantity);
        }, 0);

        const quote = await this.andreaniService.quoteShipping(body.postalCode, totalWeight);

        return {
            success: true,
            quote: {
                ...quote,
                totalWeight,
                postalCode: body.postalCode
            }
        };
    }

    /**
     * Quick quote by postal code (simpler endpoint)
     */
    @Get('quote')
    async getQuickQuote(
        @Query('postalCode') postalCode: string,
        @Query('weight') weight?: string
    ) {
        const weightKg = weight ? parseFloat(weight) : 1; // Default 1kg
        const quote = await this.andreaniService.quoteShipping(postalCode, weightKg);

        return {
            success: true,
            quote
        };
    }
}
