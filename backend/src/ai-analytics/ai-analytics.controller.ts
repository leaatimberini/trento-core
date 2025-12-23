import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAnalyticsController {
    constructor(private readonly aiService: AiAnalyticsService) { }

    // ==================== DEMAND PREDICTIONS ====================

    /**
     * Get demand prediction for a specific product
     */
    @Get('predictions/:productId')
    @Roles('ADMIN')
    getProductPrediction(@Param('productId') productId: string) {
        return this.aiService.predictDemand(productId);
    }

    /**
     * Get all demand predictions
     */
    @Get('predictions')
    @Roles('ADMIN')
    getAllPredictions() {
        return this.aiService.getAllPredictions();
    }

    // ==================== STOCK RECOMMENDATIONS ====================

    /**
     * Get stock recommendation for a specific product
     */
    @Get('stock/:productId')
    @Roles('ADMIN')
    getStockRecommendation(@Param('productId') productId: string) {
        return this.aiService.getStockRecommendation(productId);
    }

    /**
     * Get all stock recommendations
     */
    @Get('stock')
    @Roles('ADMIN')
    getAllStockRecommendations() {
        return this.aiService.getAllStockRecommendations();
    }

    // ==================== ANOMALY DETECTION ====================

    /**
     * Get all current anomalies/alerts
     */
    @Get('anomalies')
    @Roles('ADMIN')
    getAnomalies() {
        return this.aiService.detectAnomalies();
    }

    // ==================== INSIGHTS DASHBOARD ====================

    /**
     * Get AI insights summary (dashboard)
     */
    @Get('insights')
    @Roles('ADMIN')
    getInsights() {
        return this.aiService.getInsightsSummary();
    }

    // ==================== PRICING ====================

    /**
     * Get pricing suggestions
     */
    @Get('pricing')
    @Roles('ADMIN')
    getPricingSuggestions() {
        return this.aiService.getPricingSuggestions();
    }

    /**
     * Analyze competitor pricing (simulated)
     */
    @Get('pricing/competitors')
    @Roles('ADMIN')
    getCompetitorPricing() {
        return this.aiService.analyzeCompetitorPricing();
    }

    /**
     * Get automatic price adjustments
     */
    @Get('pricing/adjustments')
    @Roles('ADMIN')
    getAutomaticAdjustments() {
        return this.aiService.getAutomaticPriceAdjustments();
    }

    // ==================== PROMOTIONS ====================

    /**
     * Generate automatic promotions
     */
    @Get('promotions')
    @Roles('ADMIN')
    getPromotions() {
        return this.aiService.generatePromotions();
    }

    // ==================== MARKETING ====================

    /**
     * Get marketing alerts
     */
    @Get('marketing/alerts')
    @Roles('ADMIN')
    getMarketingAlerts() {
        return this.aiService.getMarketingAlerts();
    }
}
