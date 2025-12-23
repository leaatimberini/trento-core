import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class IntegrationCredentialsService {
    constructor(private prisma: PrismaService) { }

    async getAll() {
        return this.prisma.integrationCredential.findMany({
            select: {
                id: true,
                provider: true,
                enabled: true,
                lastSync: true,
                lastError: true,
                accountId: true,
                expiresAt: true,
                createdAt: true,
                updatedAt: true,
                // Exclude sensitive fields
            }
        });
    }

    async getByProvider(provider: string) {
        return this.prisma.integrationCredential.findUnique({
            where: { provider }
        });
    }

    async getStatus(provider: string) {
        const credential = await this.prisma.integrationCredential.findUnique({
            where: { provider },
            select: {
                enabled: true,
                lastSync: true,
                lastError: true,
                accountId: true,
                expiresAt: true
            }
        });

        if (!credential) {
            return { connected: false, configured: false };
        }

        const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date();

        return {
            connected: credential.enabled && !isExpired && !credential.lastError,
            configured: true,
            lastSync: credential.lastSync,
            lastError: credential.lastError,
            accountId: credential.accountId
        };
    }

    async configure(provider: string, data: {
        clientId?: string;
        clientSecret?: string;
        accessToken?: string;
        refreshToken?: string;
        publicKey?: string;
        accountId?: string;
        expiresAt?: Date;
    }) {
        return this.prisma.integrationCredential.upsert({
            where: { provider },
            update: {
                ...data,
                enabled: true,
                lastError: null,
                updatedAt: new Date()
            },
            create: {
                provider,
                ...data,
                enabled: true
            }
        });
    }

    async updateLastSync(provider: string) {
        return this.prisma.integrationCredential.update({
            where: { provider },
            data: { lastSync: new Date() }
        });
    }

    async setError(provider: string, error: string) {
        return this.prisma.integrationCredential.update({
            where: { provider },
            data: { lastError: error, enabled: false }
        });
    }

    async disable(provider: string) {
        return this.prisma.integrationCredential.update({
            where: { provider },
            data: { enabled: false }
        });
    }

    async delete(provider: string) {
        return this.prisma.integrationCredential.delete({
            where: { provider }
        });
    }
}
