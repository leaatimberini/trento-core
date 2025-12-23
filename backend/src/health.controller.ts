import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    checks: {
        database: { status: string; latency?: number };
        memory: { used: number; total: number; percentage: number };
    };
}

@Controller('health')
export class HealthController {
    private startTime = Date.now();

    constructor(private prisma: PrismaService) { }

    @Get()
    async check(): Promise<HealthStatus> {
        const checks = {
            database: await this.checkDatabase(),
            memory: this.checkMemory(),
        };

        const isHealthy = checks.database.status === 'up' &&
            checks.memory.percentage < 90;

        return {
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            version: process.env.npm_package_version || '1.0.0',
            checks,
        };
    }

    @Get('live')
    liveness() {
        return { status: 'ok' };
    }

    @Get('ready')
    async readiness() {
        const dbCheck = await this.checkDatabase();
        if (dbCheck.status !== 'up') {
            return { status: 'not ready', reason: 'database unavailable' };
        }
        return { status: 'ready' };
    }

    private async checkDatabase() {
        try {
            const start = Date.now();
            await this.prisma.$queryRaw`SELECT 1`;
            const latency = Date.now() - start;
            return { status: 'up', latency };
        } catch (error) {
            return { status: 'down', error: String(error) };
        }
    }

    private checkMemory() {
        const used = process.memoryUsage();
        const total = used.heapTotal;
        const usedMem = used.heapUsed;
        return {
            used: Math.round(usedMem / 1024 / 1024),
            total: Math.round(total / 1024 / 1024),
            percentage: Math.round((usedMem / total) * 100),
        };
    }
}
