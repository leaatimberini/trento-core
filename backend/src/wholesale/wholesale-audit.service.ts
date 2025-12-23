import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma.service';

export interface AuditLogEntry {
    action: string;
    resource: string;
    resourceId?: string;
    userId?: string;
    details?: any;
    ipAddress?: string;
    success: boolean;
    duration?: number;
}

@Injectable()
export class WholesaleAuditService {
    private readonly logger = new Logger('WholesaleAudit');

    constructor(private prisma: PrismaService) { }

    /**
     * Log a wholesale operation
     */
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            // Log to console with semantic formatting
            const emoji = entry.success ? '✅' : '❌';
            const logMessage = `${emoji} [${entry.action}] ${entry.resource}${entry.resourceId ? `:${entry.resourceId}` : ''} by ${entry.userId || 'system'} ${entry.duration ? `(${entry.duration}ms)` : ''}`;

            if (entry.success) {
                this.logger.log(logMessage);
            } else {
                this.logger.warn(logMessage);
            }

            // Persist to database
            await this.prisma.auditLog.create({
                data: {
                    action: entry.action,
                    resource: entry.resource,
                    userId: entry.userId,
                    details: JSON.stringify({
                        resourceId: entry.resourceId,
                        ...entry.details,
                        success: entry.success,
                        duration: entry.duration
                    }),
                    ipAddress: entry.ipAddress
                }
            });
        } catch (error) {
            this.logger.error(`Failed to log audit entry: ${error.message}`);
        }
    }

    /**
     * Log specific wholesale events
     */
    async logQuotationCreated(quotationId: string, userId: string, customerId: string, total: number) {
        await this.log({
            action: 'QUOTATION_CREATED',
            resource: 'Quotation',
            resourceId: quotationId,
            userId,
            details: { customerId, total },
            success: true
        });
    }

    async logQuotationStatusChange(quotationId: string, userId: string, oldStatus: string, newStatus: string) {
        await this.log({
            action: 'QUOTATION_STATUS_CHANGED',
            resource: 'Quotation',
            resourceId: quotationId,
            userId,
            details: { oldStatus, newStatus },
            success: true
        });
    }

    async logConsignmentCreated(consignmentId: string, userId: string, customerId: string, totalValue: number, itemCount: number) {
        await this.log({
            action: 'CONSIGNMENT_CREATED',
            resource: 'ConsignmentSale',
            resourceId: consignmentId,
            userId,
            details: { customerId, totalValue, itemCount },
            success: true
        });
    }

    async logConsignmentReturn(returnId: string, userId: string, consignmentId: string, returnedValue: number, itemCount: number) {
        await this.log({
            action: 'CONSIGNMENT_RETURN_PROCESSED',
            resource: 'ConsignmentReturn',
            resourceId: returnId,
            userId,
            details: { consignmentId, returnedValue, itemCount },
            success: true
        });
    }

    async logInvoiceFromQuotation(invoiceId: string, userId: string, quotationId: string, total: number) {
        await this.log({
            action: 'INVOICE_FROM_QUOTATION',
            resource: 'Invoice',
            resourceId: invoiceId,
            userId,
            details: { quotationId, total },
            success: true
        });
    }

    async logInvoiceFromConsignment(invoiceId: string, userId: string, consignmentId: string, total: number) {
        await this.log({
            action: 'INVOICE_FROM_CONSIGNMENT',
            resource: 'Invoice',
            resourceId: invoiceId,
            userId,
            details: { consignmentId, total },
            success: true
        });
    }

    async logCreditChange(customerId: string, userId: string, action: 'USE' | 'RELEASE' | 'LIMIT_CHANGE', amount: number, newBalance: number) {
        await this.log({
            action: `CREDIT_${action}`,
            resource: 'Customer',
            resourceId: customerId,
            userId,
            details: { amount, newBalance },
            success: true
        });
    }

    async logAccessDenied(userId: string, resource: string, action: string, ipAddress?: string) {
        await this.log({
            action: 'ACCESS_DENIED',
            resource,
            userId,
            details: { attemptedAction: action },
            ipAddress,
            success: false
        });
    }

    /**
     * Get audit logs with filters
     */
    async getLogs(filters?: {
        userId?: string;
        resource?: string;
        action?: string;
        from?: Date;
        to?: Date;
        limit?: number;
    }) {
        const where: any = {};

        if (filters?.userId) where.userId = filters.userId;
        if (filters?.resource) where.resource = filters.resource;
        if (filters?.action) where.action = { contains: filters.action };
        if (filters?.from || filters?.to) {
            where.createdAt = {};
            if (filters.from) where.createdAt.gte = filters.from;
            if (filters.to) where.createdAt.lte = filters.to;
        }

        return this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 100
        });
    }

    /**
     * Get activity summary for a user
     */
    async getUserActivity(userId: string, days: number = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const logs = await this.prisma.auditLog.findMany({
            where: {
                userId,
                createdAt: { gte: since }
            },
            orderBy: { createdAt: 'desc' }
        });

        const summary = {
            totalActions: logs.length,
            byAction: {} as Record<string, number>,
            byResource: {} as Record<string, number>,
            recentActions: logs.slice(0, 10)
        };

        for (const log of logs) {
            summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
            summary.byResource[log.resource] = (summary.byResource[log.resource] || 0) + 1;
        }

        return summary;
    }

    /**
     * Get wholesale activity dashboard
     */
    async getActivityDashboard(days: number = 7) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [logs, byUser, byResource] = await Promise.all([
            this.prisma.auditLog.findMany({
                where: {
                    resource: { in: ['Quotation', 'ConsignmentSale', 'ConsignmentReturn', 'Invoice', 'Customer'] },
                    createdAt: { gte: since }
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            this.prisma.auditLog.groupBy({
                by: ['userId'],
                where: { createdAt: { gte: since } },
                _count: true
            }),
            this.prisma.auditLog.groupBy({
                by: ['resource'],
                where: { createdAt: { gte: since } },
                _count: true
            })
        ]);

        return {
            recentActivity: logs,
            activeUsers: byUser.map(u => ({ userId: u.userId, actions: u._count })),
            resourceActivity: byResource.map(r => ({ resource: r.resource, actions: r._count })),
            totalActions: logs.length
        };
    }
}

/**
 * Interceptor to automatically log wholesale API calls
 */
@Injectable()
export class WholesaleAuditInterceptor implements NestInterceptor {
    constructor(private auditService: WholesaleAuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, user, ip } = request;
        const start = Date.now();

        // Only log wholesale endpoints
        if (!url.includes('/wholesale/')) {
            return next.handle();
        }

        const action = this.getActionFromMethod(method);
        const resource = this.getResourceFromUrl(url);

        return next.handle().pipe(
            tap({
                next: () => {
                    this.auditService.log({
                        action,
                        resource,
                        userId: user?.id,
                        ipAddress: ip,
                        success: true,
                        duration: Date.now() - start
                    });
                },
                error: (error) => {
                    this.auditService.log({
                        action,
                        resource,
                        userId: user?.id,
                        ipAddress: ip,
                        details: { error: error.message },
                        success: false,
                        duration: Date.now() - start
                    });
                }
            })
        );
    }

    private getActionFromMethod(method: string): string {
        switch (method) {
            case 'POST': return 'CREATE';
            case 'PUT':
            case 'PATCH': return 'UPDATE';
            case 'DELETE': return 'DELETE';
            default: return 'READ';
        }
    }

    private getResourceFromUrl(url: string): string {
        if (url.includes('/quotations')) return 'Quotation';
        if (url.includes('/consignments')) return 'ConsignmentSale';
        if (url.includes('/customers')) return 'Customer';
        if (url.includes('/invoicing')) return 'Invoice';
        if (url.includes('/pdf')) return 'PDF';
        if (url.includes('/ai')) return 'AI_Analytics';
        return 'Wholesale';
    }
}
