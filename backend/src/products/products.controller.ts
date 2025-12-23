
import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    /**
     * Get all unique product categories
     */
    @Get('categories')
    getCategories() {
        return this.productsService.getCategories();
    }

    /**
     * Get products with prices from a specific price list (for storefronts/POS)
     */
    @Get('store')
    async findAllForStore(@Query('priceListId') priceListId?: string) {
        return this.productsService.findAllWithPriceList(priceListId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    create(@Body() dto: CreateProductDto) {
        return this.productsService.create(dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.productsService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    delete(@Param('id') id: string) {
        return this.productsService.delete(id);
    }

    // Unit Conversions
    @Get(':id/conversions')
    getConversions(@Param('id') id: string) {
        return this.productsService.getUnitConversions(id);
    }

    @Post(':id/conversions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    addConversion(
        @Param('id') id: string,
        @Body() dto: { fromUnit: string; factor: number }
    ) {
        return this.productsService.addUnitConversion(id, dto.fromUnit, dto.factor);
    }

    @Delete(':id/conversions/:fromUnit')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    removeConversion(
        @Param('id') id: string,
        @Param('fromUnit') fromUnit: string
    ) {
        return this.productsService.removeUnitConversion(id, fromUnit);
    }

    /**
     * Generate AI description for a product
     */
    @Post('ai/generate-description')
    async generateDescription(
        @Body() body: {
            name: string;
            category?: string;
            brand?: string;
        }
    ) {
        return this.productsService.generateAIDescription(body);
    }

    /**
     * Auto-generate SKU from product name
     */
    @Post('ai/generate-sku')
    async generateSKU(
        @Body() body: {
            name: string;
            category?: string;
            brand?: string;
        }
    ) {
        return this.productsService.generateSKU(body);
    }

    /**
     * Lookup product dimensions using AI (for shipping/logistics)
     */
    @Post('ai/lookup-dimensions')
    async lookupDimensions(
        @Body() body: {
            name: string;
            brand?: string;
            category?: string;
        }
    ) {
        return this.productsService.lookupProductDimensions(body);
    }
}

