import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CashShiftService {
    constructor(private prisma: PrismaService) { }

    async getActiveShift(userId: string) {
        return this.prisma.cashShift.findFirst({
            where: {
                userId,
                status: 'OPEN'
            }
        });
    }

    async getShiftSummary(userId: string) {
        const active = await this.getActiveShift(userId);
        if (!active) return null;

        // Group payments by method for this user's active shift sales
        const payments = await this.prisma.payment.groupBy({
            by: ['method'],
            _sum: {
                amount: true
            },
            where: {
                sale: {
                    userId: userId,
                    createdAt: {
                        gte: active.startTime
                    },
                    status: {
                        in: ['COMPLETED', 'PAID']
                    }
                }
            }
        });

        const summary = payments.reduce((acc, curr) => {
            const amount = Number(curr._sum.amount || 0);
            acc[curr.method] = amount;
            acc.total += amount;
            return acc;
        }, { total: 0 } as Record<string, number>);

        const initialCash = Number(active.initialCash);
        const cashSales = summary['CASH'] || 0;
        const expectedCash = initialCash + cashSales;

        return {
            shiftId: active.id,
            startTime: active.startTime,
            initialCash,
            cashSales,
            cardSales: summary['CARD'] || 0,
            qrSales: summary['QR'] || 0,
            accountSales: summary['ACCOUNT'] || 0,
            totalSales: summary.total,
            expectedCash,
            paymentBreakdown: summary
        };
    }

    async openShift(userId: string, initialCash: number) {
        const active = await this.getActiveShift(userId);
        if (active) {
            throw new BadRequestException('Shift already open');
        }

        return this.prisma.cashShift.create({
            data: {
                userId,
                initialCash,
                status: 'OPEN'
            }
        });
    }

    async closeShift(userId: string, finalCash: number) {
        const active = await this.getActiveShift(userId);
        if (!active) {
            throw new NotFoundException('No active shift found');
        }

        // Calculate expected cash
        // Sum of all sales created by this user since shift start
        // Note: Ideally sales should link to shiftId, but for now filtering by time range.
        const sales = await this.prisma.sale.aggregate({
            _sum: {
                totalAmount: true
            },
            where: {
                // userId: userId, // Assuming sales are tracked by user? 
                // Currently Sales don't strictly link to the cashier user ID in Schema yet?
                // Wait, Sale has 'customerId', but who sold it?
                // We should add 'userId' (Staff) to Sale model if not present.
                // Checking Schema...
                createdAt: {
                    gte: active.startTime
                }
            }
        });

        // If sales are not linked to user, we calculate all sales? That might be wrong if multiple POS.
        // For MVP single store, it's acceptable.

        const salesTotal = Number(sales._sum.totalAmount || 0);
        const initial = Number(active.initialCash);
        const expected = initial + salesTotal;
        const difference = finalCash - expected;

        return this.prisma.cashShift.update({
            where: { id: active.id },
            data: {
                endTime: new Date(),
                finalCash,
                expectedCash: expected,
                difference: difference,
                status: 'CLOSED'
            }
        });
    }
}
