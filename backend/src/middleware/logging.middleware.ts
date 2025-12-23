import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
    private logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl, ip } = req;
        const userAgent = req.get('user-agent') || '';
        const startTime = Date.now();

        res.on('finish', () => {
            const { statusCode } = res;
            const contentLength = res.get('content-length') || 0;
            const duration = Date.now() - startTime;

            const logMessage = `${method} ${originalUrl} ${statusCode} ${contentLength}B ${duration}ms`;

            if (statusCode >= 500) {
                this.logger.error(logMessage, { ip, userAgent });
            } else if (statusCode >= 400) {
                this.logger.warn(logMessage, { ip, userAgent });
            } else {
                this.logger.log(logMessage);
            }
        });

        next();
    }
}

// Request ID middleware for tracing
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const requestId = req.get('X-Request-ID') ||
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        req['requestId'] = requestId;
        res.set('X-Request-ID', requestId);
        next();
    }
}

// Performance monitoring
export interface RequestMetrics {
    totalRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    statusCodes: Record<string, number>;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
}

class MetricsCollector {
    private requests: Array<{ endpoint: string; duration: number; status: number; timestamp: number }> = [];
    private maxHistory = 10000;

    record(endpoint: string, duration: number, status: number) {
        this.requests.push({
            endpoint,
            duration,
            status,
            timestamp: Date.now(),
        });

        // Keep only recent requests
        if (this.requests.length > this.maxHistory) {
            this.requests = this.requests.slice(-this.maxHistory);
        }
    }

    getMetrics(): RequestMetrics {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentRequests = this.requests.filter(r => r.timestamp > oneMinuteAgo);

        const totalRequests = this.requests.length;
        const avgTime = recentRequests.length > 0
            ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
            : 0;

        const statusCodes = recentRequests.reduce((acc, r) => {
            const key = `${Math.floor(r.status / 100)}xx`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Group by endpoint
        const byEndpoint = recentRequests.reduce((acc, r) => {
            if (!acc[r.endpoint]) acc[r.endpoint] = [];
            acc[r.endpoint].push(r.duration);
            return acc;
        }, {} as Record<string, number[]>);

        const slowestEndpoints = Object.entries(byEndpoint)
            .map(([endpoint, durations]) => ({
                endpoint,
                avgTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, 10);

        return {
            totalRequests,
            averageResponseTime: Math.round(avgTime),
            requestsPerSecond: Math.round(recentRequests.length / 60 * 10) / 10,
            statusCodes,
            slowestEndpoints,
        };
    }
}

export const metricsCollector = new MetricsCollector();

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const startTime = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - startTime;
            metricsCollector.record(req.originalUrl, duration, res.statusCode);
        });

        next();
    }
}
