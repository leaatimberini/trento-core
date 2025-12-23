import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CustomerLevel, ActivityType } from '@prisma/client';

// RFM Segment definitions
const RFM_SEGMENTS = {
    CHAMPIONS: { minScore: 12, label: 'Campeones', description: 'Compran frecuente, gastan mucho' },
    LOYAL: { minScore: 9, label: 'Leales', description: 'Clientes frecuentes y valiosos' },
    POTENTIAL: { minScore: 7, label: 'Potencial', description: 'Pueden convertirse en leales' },
    PROMISING: { minScore: 5, label: 'Prometedores', description: 'Nuevos con buen potencial' },
    AT_RISK: { minScore: 4, label: 'En Riesgo', description: 'Eran buenos, están desapareciendo' },
    CANT_LOSE: { minScore: 3, label: 'No Perder', description: 'Importantes pero inactivos' },
    HIBERNATING: { minScore: 2, label: 'Hibernando', description: 'Largo tiempo sin comprar' },
    LOST: { minScore: 0, label: 'Perdidos', description: 'Sin actividad reciente' },
};

// Points configuration
const POINTS_CONFIG = {
    pointsPerPeso: 1,        // 1 point per $1 spent
    minPurchaseForPoints: 100, // Minimum purchase to earn points
    pointsValue: 0.01,       // 1 point = $0.01 in discounts
};

// Level thresholds
const LEVEL_THRESHOLDS = {
    VIP: { minPoints: 10000, minPurchases: 50, minSpend: 500000 },
    ORO: { minPoints: 5000, minPurchases: 25, minSpend: 200000 },
    PLATA: { minPoints: 1000, minPurchases: 10, minSpend: 50000 },
    BRONCE: { minPoints: 0, minPurchases: 0, minSpend: 0 },
};

@Injectable()
export class CrmService {
    private readonly logger = new Logger(CrmService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== RFM SCORING ====================

    /**
     * Calculate RFM score for a customer
     */
    async calculateCustomerRFM(customerId: string, periodMonths: number = 12) {
        const periodEnd = new Date();
        const periodStart = new Date();
        periodStart.setMonth(periodStart.getMonth() - periodMonths);

        // Get customer sales in period
        const sales = await this.prisma.sale.findMany({
            where: {
                customerId,
                createdAt: { gte: periodStart, lte: periodEnd },
                status: 'COMPLETED'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (sales.length === 0) {
            // No purchases - return lowest scores
            return this.upsertCustomerScore(customerId, {
                recency: 999,
                frequency: 0,
                monetary: 0,
                recencyScore: 1,
                frequencyScore: 1,
                monetaryScore: 1,
                totalScore: 3,
                segment: 'NEW',
                level: CustomerLevel.BRONCE,
                periodStart,
                periodEnd
            });
        }

        // Calculate R - Recency (days since last purchase)
        const lastPurchase = sales[0].createdAt;
        const recency = Math.floor((periodEnd.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate F - Frequency (number of purchases)
        const frequency = sales.length;

        // Calculate M - Monetary (total spent)
        const monetary = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        // Calculate scores (1-5 scale)
        const recencyScore = this.calculateRecencyScore(recency);
        const frequencyScore = this.calculateFrequencyScore(frequency);
        const monetaryScore = this.calculateMonetaryScore(monetary);

        const totalScore = recencyScore + frequencyScore + monetaryScore;
        const segment = this.determineSegment(totalScore, recencyScore);
        const level = this.determineLevelFromScore(totalScore, frequency, monetary);

        return this.upsertCustomerScore(customerId, {
            recency,
            frequency,
            monetary,
            recencyScore,
            frequencyScore,
            monetaryScore,
            totalScore,
            segment,
            level,
            periodStart,
            periodEnd
        });
    }

    private calculateRecencyScore(days: number): number {
        if (days <= 7) return 5;
        if (days <= 30) return 4;
        if (days <= 90) return 3;
        if (days <= 180) return 2;
        return 1;
    }

    private calculateFrequencyScore(purchases: number): number {
        if (purchases >= 20) return 5;
        if (purchases >= 10) return 4;
        if (purchases >= 5) return 3;
        if (purchases >= 2) return 2;
        return 1;
    }

    private calculateMonetaryScore(amount: number): number {
        if (amount >= 100000) return 5;
        if (amount >= 50000) return 4;
        if (amount >= 20000) return 3;
        if (amount >= 5000) return 2;
        return 1;
    }

    private determineSegment(totalScore: number, recencyScore: number): string {
        if (totalScore >= 12) return 'CHAMPIONS';
        if (totalScore >= 9 && recencyScore >= 3) return 'LOYAL';
        if (totalScore >= 7) return 'POTENTIAL';
        if (totalScore >= 5 && recencyScore >= 3) return 'PROMISING';
        if (recencyScore <= 2 && totalScore >= 6) return 'AT_RISK';
        if (recencyScore <= 2 && totalScore >= 4) return 'CANT_LOSE';
        if (recencyScore <= 1) return 'LOST';
        return 'HIBERNATING';
    }

    private determineLevelFromScore(totalScore: number, frequency: number, monetary: number): CustomerLevel {
        if (totalScore >= 12 || (frequency >= 50 && monetary >= 500000)) return CustomerLevel.VIP;
        if (totalScore >= 9 || (frequency >= 25 && monetary >= 200000)) return CustomerLevel.ORO;
        if (totalScore >= 6 || (frequency >= 10 && monetary >= 50000)) return CustomerLevel.PLATA;
        return CustomerLevel.BRONCE;
    }

    private async upsertCustomerScore(customerId: string, data: any) {
        return this.prisma.customerScore.upsert({
            where: { customerId },
            create: { customerId, ...data },
            update: data
        });
    }

    /**
     * Get customers by segment
     */
    async getCustomersBySegment(segment: string) {
        return this.prisma.customerScore.findMany({
            where: { segment },
            orderBy: { totalScore: 'desc' }
        });
    }

    /**
     * Get segment summary
     */
    async getSegmentSummary() {
        const scores = await this.prisma.customerScore.findMany();

        const summary: Record<string, { count: number; avgScore: number }> = {};

        for (const score of scores) {
            if (!summary[score.segment]) {
                summary[score.segment] = { count: 0, avgScore: 0 };
            }
            summary[score.segment].count++;
            summary[score.segment].avgScore += score.totalScore;
        }

        // Calculate averages
        for (const seg of Object.keys(summary)) {
            summary[seg].avgScore = Math.round(summary[seg].avgScore / summary[seg].count * 10) / 10;
        }

        return {
            segments: summary,
            segmentDefinitions: RFM_SEGMENTS
        };
    }

    // ==================== ACTIVITY TIMELINE ====================

    /**
     * Record customer activity
     */
    async recordActivity(data: {
        customerId: string;
        type: ActivityType;
        title: string;
        description?: string;
        saleId?: string;
        invoiceId?: string;
        metadata?: any;
        pointsChange?: number;
        createdBy?: string;
    }) {
        return this.prisma.customerActivity.create({
            data: {
                customerId: data.customerId,
                type: data.type,
                title: data.title,
                description: data.description,
                saleId: data.saleId,
                invoiceId: data.invoiceId,
                metadata: data.metadata,
                pointsChange: data.pointsChange || 0,
                createdBy: data.createdBy
            }
        });
    }

    /**
     * Get customer timeline
     */
    async getCustomerTimeline(customerId: string, limit: number = 50) {
        return this.prisma.customerActivity.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    // ==================== LOYALTY POINTS ====================

    /**
     * Earn points from a purchase
     */
    async earnPoints(customerId: string, saleId: string, amount: number) {
        if (amount < POINTS_CONFIG.minPurchaseForPoints) {
            return null;
        }

        const pointsEarned = Math.floor(amount * POINTS_CONFIG.pointsPerPeso);

        // Get or create loyalty record
        let loyalty = await this.prisma.loyaltyPoints.findUnique({
            where: { customerId }
        });

        if (!loyalty) {
            loyalty = await this.prisma.loyaltyPoints.create({
                data: { customerId }
            });
        }

        // Update points
        const updated = await this.prisma.loyaltyPoints.update({
            where: { customerId },
            data: {
                currentPoints: { increment: pointsEarned },
                lifetimePoints: { increment: pointsEarned }
            }
        });

        // Record transaction
        await this.prisma.pointsTransaction.create({
            data: {
                customerId,
                type: 'EARN',
                points: pointsEarned,
                balance: updated.currentPoints,
                saleId,
                description: `Puntos por compra $${amount.toFixed(2)}`
            }
        });

        // Record activity
        await this.recordActivity({
            customerId,
            type: ActivityType.POINTS_EARNED,
            title: `+${pointsEarned} puntos`,
            saleId,
            pointsChange: pointsEarned,
            metadata: { amount, pointsEarned }
        });

        // Check for level upgrade
        await this.checkLevelUpgrade(customerId);

        return { pointsEarned, newBalance: updated.currentPoints };
    }

    /**
     * Redeem points
     */
    async redeemPoints(customerId: string, points: number, description: string) {
        const loyalty = await this.prisma.loyaltyPoints.findUnique({
            where: { customerId }
        });

        if (!loyalty || loyalty.currentPoints < points) {
            throw new Error('Insufficient points');
        }

        const updated = await this.prisma.loyaltyPoints.update({
            where: { customerId },
            data: {
                currentPoints: { decrement: points },
                redeemedPoints: { increment: points }
            }
        });

        await this.prisma.pointsTransaction.create({
            data: {
                customerId,
                type: 'REDEEM',
                points: -points,
                balance: updated.currentPoints,
                description
            }
        });

        await this.recordActivity({
            customerId,
            type: ActivityType.POINTS_REDEEMED,
            title: `-${points} puntos canjeados`,
            pointsChange: -points,
            metadata: { points, description }
        });

        const discountValue = points * POINTS_CONFIG.pointsValue;
        return { pointsRedeemed: points, discountValue, newBalance: updated.currentPoints };
    }

    /**
     * Get customer points balance
     */
    async getPointsBalance(customerId: string) {
        return this.prisma.loyaltyPoints.findUnique({
            where: { customerId }
        });
    }

    /**
     * Get points history
     */
    async getPointsHistory(customerId: string, limit: number = 50) {
        return this.prisma.pointsTransaction.findMany({
            where: { customerId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    // ==================== CUSTOMER LEVELS ====================

    /**
     * Check and apply level upgrade/downgrade
     */
    async checkLevelUpgrade(customerId: string) {
        const loyalty = await this.prisma.loyaltyPoints.findUnique({
            where: { customerId }
        });

        if (!loyalty) return null;

        const score = await this.prisma.customerScore.findUnique({
            where: { customerId }
        });

        // Determine new level based on lifetime points and RFM
        let newLevel: CustomerLevel = CustomerLevel.BRONCE;

        if (loyalty.lifetimePoints >= LEVEL_THRESHOLDS.VIP.minPoints) {
            newLevel = CustomerLevel.VIP;
        } else if (loyalty.lifetimePoints >= LEVEL_THRESHOLDS.ORO.minPoints) {
            newLevel = CustomerLevel.ORO;
        } else if (loyalty.lifetimePoints >= LEVEL_THRESHOLDS.PLATA.minPoints) {
            newLevel = CustomerLevel.PLATA;
        }

        if (newLevel !== loyalty.level) {
            await this.prisma.loyaltyPoints.update({
                where: { customerId },
                data: { level: newLevel, levelUpdatedAt: new Date() }
            });

            if (score) {
                await this.prisma.customerScore.update({
                    where: { customerId },
                    data: { level: newLevel }
                });
            }

            await this.recordActivity({
                customerId,
                type: ActivityType.LEVEL_CHANGE,
                title: `Nivel actualizado a ${newLevel}`,
                metadata: { oldLevel: loyalty.level, newLevel }
            });

            this.logger.log(`Customer ${customerId} upgraded to ${newLevel}`);
        }

        return newLevel;
    }

    /**
     * Get level benefits
     */
    async getLevelBenefits(level: CustomerLevel) {
        return this.prisma.levelBenefit.findUnique({
            where: { level }
        });
    }

    // ==================== RECOMPRA ALERTS ====================

    /**
     * Calculate and update recompra alerts
     */
    async updateRecompraAlerts(customerId: string) {
        // Get customer purchase history
        const sales = await this.prisma.sale.findMany({
            where: { customerId, status: 'COMPLETED' },
            orderBy: { createdAt: 'asc' }
        });

        if (sales.length < 2) return null;

        // Calculate average days between purchases
        let totalDays = 0;
        for (let i = 1; i < sales.length; i++) {
            const days = Math.floor(
                (sales[i].createdAt.getTime() - sales[i - 1].createdAt.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            totalDays += days;
        }
        const avgDaysBetween = Math.round(totalDays / (sales.length - 1));

        const lastPurchase = sales[sales.length - 1].createdAt;
        const nextExpected = new Date(lastPurchase);
        nextExpected.setDate(nextExpected.getDate() + avgDaysBetween);

        return this.prisma.recompraAlert.upsert({
            where: { id: customerId }, // Using customerId as id for simplicity
            create: {
                customerId,
                avgDaysBetween,
                lastPurchase,
                nextExpected
            },
            update: {
                avgDaysBetween,
                lastPurchase,
                nextExpected,
                alertSent: false
            }
        });
    }

    /**
     * Get due recompra alerts
     */
    async getDueRecompraAlerts() {
        const today = new Date();

        return this.prisma.recompraAlert.findMany({
            where: {
                nextExpected: { lte: today },
                alertSent: false
            },
            orderBy: { nextExpected: 'asc' }
        });
    }

    /**
     * Mark alert as sent
     */
    async markAlertSent(alertId: string) {
        return this.prisma.recompraAlert.update({
            where: { id: alertId },
            data: { alertSent: true, alertSentAt: new Date() }
        });
    }
}
