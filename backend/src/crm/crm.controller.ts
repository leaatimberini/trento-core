import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ActivityType, CustomerLevel } from '@prisma/client';

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrmController {
    constructor(private readonly crmService: CrmService) { }

    // ==================== RFM ENDPOINTS ====================

    /**
     * Calculate RFM for a customer
     */
    @Post('customers/:id/rfm')
    @Roles('ADMIN')
    calculateRFM(@Param('id') id: string) {
        return this.crmService.calculateCustomerRFM(id);
    }

    /**
     * Get customers by segment
     */
    @Get('segments/:segment')
    @Roles('ADMIN')
    getBySegment(@Param('segment') segment: string) {
        return this.crmService.getCustomersBySegment(segment);
    }

    /**
     * Get segment summary
     */
    @Get('segments')
    @Roles('ADMIN')
    getSegmentSummary() {
        return this.crmService.getSegmentSummary();
    }

    // ==================== TIMELINE ENDPOINTS ====================

    /**
     * Get customer activity timeline
     */
    @Get('customers/:id/timeline')
    getTimeline(
        @Param('id') id: string,
        @Query('limit') limit?: string
    ) {
        return this.crmService.getCustomerTimeline(id, limit ? parseInt(limit) : 50);
    }

    /**
     * Record a manual activity
     */
    @Post('customers/:id/activity')
    @Roles('ADMIN')
    recordActivity(
        @Param('id') id: string,
        @Body() body: {
            type: ActivityType;
            title: string;
            description?: string;
            metadata?: any;
        }
    ) {
        return this.crmService.recordActivity({
            customerId: id,
            ...body
        });
    }

    // ==================== POINTS ENDPOINTS ====================

    /**
     * Get customer points balance
     */
    @Get('customers/:id/points')
    getPointsBalance(@Param('id') id: string) {
        return this.crmService.getPointsBalance(id);
    }

    /**
     * Get points history
     */
    @Get('customers/:id/points/history')
    getPointsHistory(
        @Param('id') id: string,
        @Query('limit') limit?: string
    ) {
        return this.crmService.getPointsHistory(id, limit ? parseInt(limit) : 50);
    }

    /**
     * Earn points (usually called after sale)
     */
    @Post('customers/:id/points/earn')
    @Roles('ADMIN')
    earnPoints(
        @Param('id') id: string,
        @Body() body: { saleId: string; amount: number }
    ) {
        return this.crmService.earnPoints(id, body.saleId, body.amount);
    }

    /**
     * Redeem points
     */
    @Post('customers/:id/points/redeem')
    @Roles('ADMIN')
    redeemPoints(
        @Param('id') id: string,
        @Body() body: { points: number; description: string }
    ) {
        return this.crmService.redeemPoints(id, body.points, body.description);
    }

    // ==================== LEVEL ENDPOINTS ====================

    /**
     * Get level benefits configuration
     */
    @Get('levels/:level/benefits')
    getLevelBenefits(@Param('level') level: CustomerLevel) {
        return this.crmService.getLevelBenefits(level);
    }

    /**
     * Check and update customer level
     */
    @Post('customers/:id/level/check')
    @Roles('ADMIN')
    checkLevel(@Param('id') id: string) {
        return this.crmService.checkLevelUpgrade(id);
    }

    // ==================== RECOMPRA ALERTS ====================

    /**
     * Get due recompra alerts
     */
    @Get('alerts/recompra')
    @Roles('ADMIN')
    getDueAlerts() {
        return this.crmService.getDueRecompraAlerts();
    }

    /**
     * Update recompra alert for a customer
     */
    @Post('customers/:id/recompra')
    @Roles('ADMIN')
    updateRecompra(@Param('id') id: string) {
        return this.crmService.updateRecompraAlerts(id);
    }

    /**
     * Mark alert as sent
     */
    @Post('alerts/recompra/:id/sent')
    @Roles('ADMIN')
    markAlertSent(@Param('id') id: string) {
        return this.crmService.markAlertSent(id);
    }
}
