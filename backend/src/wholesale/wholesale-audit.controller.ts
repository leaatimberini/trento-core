import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
} from '@nestjs/common';
import { WholesaleAuditService } from './wholesale-audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('wholesale/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WholesaleAuditController {
    constructor(private readonly auditService: WholesaleAuditService) { }

    /**
     * Get audit logs with filters (ADMIN only)
     */
    @Get('logs')
    @Roles('ADMIN')
    getLogs(
        @Query('userId') userId?: string,
        @Query('resource') resource?: string,
        @Query('action') action?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditService.getLogs({
            userId,
            resource,
            action,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            limit: limit ? parseInt(limit) : 100
        });
    }

    /**
     * Get activity dashboard (ADMIN only)
     */
    @Get('dashboard')
    @Roles('ADMIN')
    getDashboard(@Query('days') days?: string) {
        return this.auditService.getActivityDashboard(days ? parseInt(days) : 7);
    }

    /**
     * Get user activity summary (ADMIN only)
     */
    @Get('user/:userId')
    @Roles('ADMIN')
    getUserActivity(
        @Param('userId') userId: string,
        @Query('days') days?: string,
    ) {
        return this.auditService.getUserActivity(userId, days ? parseInt(days) : 7);
    }
}
