
import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { AiService, ProductData } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('generate-description')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async generateDescription(@Body() data: ProductData) {
        return this.aiService.generateDescription(data);
    }

    @Post('chat')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async chat(@Body() body: { message: string }) {
        return this.aiService.processQuery(body.message);
    }

    @Post('forecast')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async forecast(@Body() body: { productId: string }) {
        return this.aiService.predictDemand(body.productId);
    }

    @Get('recommendations/:productId')
    async recommendations(@Param('productId') productId: string) {
        return this.aiService.getRecommendations(productId);
    }

    @Get('insights')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async getInsights() {
        return this.aiService.getInsights();
    }

    @Get('predictions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async getPredictions() {
        return this.aiService.getPredictions();
    }

    @Get('stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async getStockRecommendations() {
        return this.aiService.getStockRecommendations();
    }

    @Get('anomalies')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async getAnomalies() {
        return this.aiService.getAnomalies();
    }

    @Get('pricing')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async getPricing() {
        return this.aiService.getPricingSuggestions();
    }
}
