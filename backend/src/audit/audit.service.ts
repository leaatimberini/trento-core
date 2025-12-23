import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(userId: string | null, action: string, resource: string, details?: any, ipAddress?: string) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    resource,
                    details: details ? JSON.stringify(details) : null,
                    ipAddress
                }
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Non-blocking, don't throw
        }
    }

    async findAll(limit = 100) {
        return this.prisma.auditLog.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }
}
