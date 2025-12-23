import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PriceListService } from './price-list.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('pricing')
export class PriceListController {
    constructor(private readonly priceListService: PriceListService) { }

    // ============ PRICE LISTS ============

    @Post('lists')
    @Roles('ADMIN')
    create(@Body() body: { name: string; description?: string; markup?: number; isDefault?: boolean }) {
        return this.priceListService.create(body);
    }

    @Get('lists')
    @Roles('ADMIN', 'SELLER')
    findAll() {
        return this.priceListService.findAll();
    }

    @Get('lists/default')
    @Roles('ADMIN', 'SELLER')
    getDefault() {
        return this.priceListService.getDefault();
    }

    @Get('lists/:id')
    @Roles('ADMIN', 'SELLER')
    findOne(@Param('id') id: string) {
        return this.priceListService.findOne(id);
    }

    @Put('lists/:id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() body: { name?: string; description?: string; markup?: number; isDefault?: boolean }) {
        return this.priceListService.update(id, body);
    }

    @Delete('lists/:id')
    @Roles('ADMIN')
    delete(@Param('id') id: string) {
        return this.priceListService.delete(id);
    }

    // ============ ITEMS ============

    @Post('lists/:id/items')
    @Roles('ADMIN')
    addItem(
        @Param('id') priceListId: string,
        @Body() body: { productId: string; price: number }
    ) {
        return this.priceListService.addItem(priceListId, body.productId, body.price);
    }

    @Post('lists/:id/items/bulk')
    @Roles('ADMIN')
    addItems(
        @Param('id') priceListId: string,
        @Body() body: { items: { productId: string; price: number }[] }
    ) {
        return this.priceListService.addItems(priceListId, body.items);
    }

    @Put('lists/:id/items/:productId')
    @Roles('ADMIN')
    updateItemPrice(
        @Param('id') priceListId: string,
        @Param('productId') productId: string,
        @Body() body: { price: number }
    ) {
        return this.priceListService.updateItemPrice(priceListId, productId, body.price);
    }

    @Delete('lists/:id/items/:productId')
    @Roles('ADMIN')
    removeItem(
        @Param('id') priceListId: string,
        @Param('productId') productId: string
    ) {
        return this.priceListService.removeItem(priceListId, productId);
    }

    // ============ BULK OPERATIONS ============

    @Post('lists/:id/markup')
    @Roles('ADMIN')
    applyMarkup(
        @Param('id') priceListId: string,
        @Body() body: { markupPercentage: number }
    ) {
        return this.priceListService.applyMarkupToAll(priceListId, body.markupPercentage);
    }

    // ============ PRICE LOOKUP ============

    @Get('price/:productId')
    @Roles('ADMIN', 'SELLER')
    getPrice(
        @Param('productId') productId: string,
        @Query('customerId') customerId?: string
    ) {
        return this.priceListService.getPrice(productId, customerId);
    }

    @Post('prices/batch')
    @Roles('ADMIN', 'SELLER')
    getPrices(
        @Body() body: { productIds: string[]; customerId?: string }
    ) {
        return this.priceListService.getPricesForProducts(body.productIds, body.customerId)
            .then(map => Object.fromEntries(map));
    }
}
