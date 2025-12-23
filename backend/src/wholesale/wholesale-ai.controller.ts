import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { WholesaleAiService } from './wholesale-ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('wholesale/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WholesaleAiController {
    constructor(private readonly aiService: WholesaleAiService) { }

    /**
     * Analyze risk for a specific customer
     */
    @Get('risk/:customerId')
    @Roles('ADMIN', 'SELLER')
    analyzeCustomerRisk(@Param('customerId') customerId: string) {
        return this.aiService.analyzeCustomerRisk(customerId);
    }

    /**
     * Get all customers at risk
     */
    @Get('risk')
    @Roles('ADMIN', 'SELLER')
    getAtRiskCustomers() {
        return this.aiService.getAtRiskCustomers();
    }

    /**
     * Get AI-powered recommendations for a customer
     */
    @Get('recommendations/:customerId')
    @Roles('ADMIN', 'SELLER')
    getRecommendations(@Param('customerId') customerId: string) {
        return this.aiService.generateRecommendations(customerId);
    }

    /**
     * Get stale consignments (no activity for X days)
     */
    @Get('stale-consignments')
    @Roles('ADMIN', 'SELLER')
    getStaleConsignments(@Query('days') days?: string) {
        return this.aiService.getStaleConsignments(days ? parseInt(days) : 30);
    }

    /**
     * Get wholesale dashboard insights and alerts
     */
    @Get('insights')
    @Roles('ADMIN', 'SELLER')
    getInsights() {
        return this.aiService.getWholesaleInsights();
    }

    /**
     * Get comprehensive wholesale statistics
     */
    @Get('stats')
    @Roles('ADMIN', 'SELLER')
    getStats() {
        return this.aiService.getWholesaleStats();
    }
}
