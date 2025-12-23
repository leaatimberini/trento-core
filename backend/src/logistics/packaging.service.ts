import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PackagingService {
    constructor(private prisma: PrismaService) { }

    async loanPackaging(customerId: string, type: string, quantity: number) {
        return this.prisma.returnablePackaging.upsert({
            where: {
                customerId_type: {
                    customerId,
                    type
                }
            },
            update: { quantity: { increment: quantity } },
            create: {
                customerId,
                type,
                quantity
            }
        });
    }

    async returnPackaging(customerId: string, type: string, quantity: number) {
        return this.prisma.returnablePackaging.upsert({
            where: {
                customerId_type: {
                    customerId,
                    type
                }
            },
            update: { quantity: { decrement: quantity } },
            create: {
                customerId,
                type,
                quantity: -quantity // Should technically be 0 or throw if returning without loan, but allowing negative for flexibility
            }
        });
    }

    async getBalance(customerId: string) {
        return this.prisma.returnablePackaging.findMany({
            where: { customerId }
        });
    }
}
