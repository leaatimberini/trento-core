
import { Controller, Post, Body, Get, Param, BadRequestException, UseGuards, Query } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('marketing')
export class MarketingController {
    constructor(private marketing: MarketingService) { }

    // ==================== AI-POWERED ENDPOINTS ====================

    /**
     * Get AI-generated campaign suggestions based on business data
     */
    @Get('suggestions')
    @UseGuards(JwtAuthGuard)
    async getCampaignSuggestions() {
        return this.marketing.generateCampaignSuggestions();
    }

    /**
     * Generate email content with AI
     */
    @Post('generate-email')
    @UseGuards(JwtAuthGuard)
    async generateEmailContent(@Body() body: {
        campaignType: 'PROMO' | 'STOCK_CLEARANCE' | 'NEW_PRODUCTS' | 'SEASONAL' | 'CUSTOM';
        segment: string;
        productIds?: string[];
        customPrompt?: string;
        discountPercent?: number;
    }) {
        if (!body.campaignType || !body.segment) {
            throw new BadRequestException('campaignType and segment are required');
        }
        return this.marketing.generateEmailContent(body);
    }

    /**
     * Preview generated email (returns HTML)
     */
    @Post('preview-email')
    @UseGuards(JwtAuthGuard)
    async previewEmail(@Body() body: {
        campaignType: 'PROMO' | 'STOCK_CLEARANCE' | 'NEW_PRODUCTS' | 'SEASONAL' | 'CUSTOM';
        segment: string;
        productIds?: string[];
        discountPercent?: number;
    }) {
        const content = await this.marketing.generateEmailContent(body);
        return { html: content.htmlContent };
    }

    // ==================== ORIGINAL ENDPOINTS ====================

    @Post('campaign')
    @UseGuards(JwtAuthGuard)
    async sendCampaign(@Body() body: { segment: string, subject: string, content: string }) {
        if (!body.segment || !body.subject) throw new BadRequestException('Segment and Subject required');
        return this.marketing.sendCampaign(body.segment, body.subject, body.content);
    }

    @Get('segments')
    async getSegments() {
        return [
            { id: 'ALL', name: 'Todos los clientes', icon: '👥' },
            { id: 'VIP', name: 'Clientes VIP / Mayoristas', icon: '⭐' },
            { id: 'INACTIVE', name: 'Clientes Inactivos (+30 días)', icon: '😴' },
            { id: 'NEW', name: 'Clientes Nuevos (últimos 7 días)', icon: '🆕' }
        ];
    }

    @Get('campaigns')
    @UseGuards(JwtAuthGuard)
    async getCampaigns() {
        return this.marketing.getCampaigns();
    }
}
