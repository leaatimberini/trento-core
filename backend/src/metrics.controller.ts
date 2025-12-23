import { Controller, Get, UseGuards } from '@nestjs/common';
import { metricsCollector, RequestMetrics } from './middleware/logging.middleware';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { PrismaService } from './prisma.service';

@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MetricsController {
    constructor(private prisma: PrismaService) { }

    @Get()
    getMetrics(): RequestMetrics {
        return metricsCollector.getMetrics();
    }

    @Get('database')
    async getDatabaseMetrics() {
        const tables = [
            'Product', 'Sale', 'SaleItem', 'Customer', 'InventoryItem',
            'Invoice', 'BlogPost', 'Recipe', 'Vehicle', 'DeliveryRoute'
        ];

        const counts: Record<string, number> = {};

        for (const table of tables) {
            try {
                const model = (this.prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)];
                if (model?.count) {
                    counts[table] = await model.count();
                }
            } catch {
                counts[table] = -1;
            }
        }

        return {
            tableCounts: counts,
            timestamp: new Date().toISOString(),
        };
    }

    @Get('system')
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        return {
            memory: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024),
            },
            cpu: {
                user: cpuUsage.user / 1000,
                system: cpuUsage.system / 1000,
            },
            uptime: Math.floor(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
        };
    }

    @Get('summary')
    async getSummary() {
        const requestMetrics = metricsCollector.getMetrics();
        const memUsage = process.memoryUsage();

        return {
            requests: {
                total: requestMetrics.totalRequests,
                perSecond: requestMetrics.requestsPerSecond,
                avgResponseTime: requestMetrics.averageResponseTime,
            },
            errors: requestMetrics.statusCodes['5xx'] || 0,
            memory: {
                usedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
            },
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        };
    }
}
