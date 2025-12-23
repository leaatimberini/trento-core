import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CouponsService {
    private readonly logger = new Logger(CouponsService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== CRUD ====================

    async createCoupon(data: {
        code: string;
        name: string;
        description?: string;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discountValue: number;
        minOrderValue?: number;
        maxDiscount?: number;
        usageLimit?: number;
        perCustomerLimit?: number;
        validFrom?: Date;
        validUntil?: Date;
        applicableCategories?: string[];
        applicableProducts?: string[];
    }) {
        const existingCoupon = await this.prisma.coupon.findUnique({
            where: { code: data.code.toUpperCase() }
        });

        if (existingCoupon) {
            throw new BadRequestException('Ya existe un cupón con ese código');
        }

        return this.prisma.coupon.create({
            data: {
                code: data.code.toUpperCase(),
                name: data.name,
                description: data.description,
                discountType: data.discountType,
                discountValue: data.discountValue,
                minOrderValue: data.minOrderValue,
                maxDiscount: data.maxDiscount,
                usageLimit: data.usageLimit,
                perCustomerLimit: data.perCustomerLimit,
                validFrom: data.validFrom || new Date(),
                validUntil: data.validUntil,
                applicableCategories: data.applicableCategories || [],
                applicableProducts: data.applicableProducts || []
            }
        });
    }

    async getCoupons(activeOnly = false) {
        const where = activeOnly ? { isActive: true } : {};
        return this.prisma.coupon.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getCoupon(id: string) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { id },
            include: {
                usages: {
                    take: 10,
                    orderBy: { usedAt: 'desc' }
                }
            }
        });

        if (!coupon) throw new NotFoundException('Cupón no encontrado');
        return coupon;
    }

    async updateCoupon(id: string, data: Partial<{
        name: string;
        description: string;
        discountValue: number;
        minOrderValue: number;
        maxDiscount: number;
        usageLimit: number;
        perCustomerLimit: number;
        validUntil: Date;
        isActive: boolean;
    }>) {
        return this.prisma.coupon.update({
            where: { id },
            data
        });
    }

    async deleteCoupon(id: string) {
        return this.prisma.coupon.delete({ where: { id } });
    }

    // ==================== VALIDATION & APPLICATION ====================

    async validateCoupon(code: string, orderTotal: number, customerId?: string) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!coupon) {
            return { valid: false, error: 'Cupón no válido', coupon: null };
        }

        // Check if active
        if (!coupon.isActive) {
            return { valid: false, error: 'Este cupón ya no está activo', coupon: null };
        }

        // Check date validity
        const now = new Date();
        if (coupon.validFrom > now) {
            return { valid: false, error: 'Este cupón aún no está activo', coupon: null };
        }
        if (coupon.validUntil && coupon.validUntil < now) {
            return { valid: false, error: 'Este cupón ha expirado', coupon: null };
        }

        // Check usage limit
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return { valid: false, error: 'Este cupón ha alcanzado su límite de uso', coupon: null };
        }

        // Check per-customer limit
        if (customerId && coupon.perCustomerLimit) {
            const customerUsages = await this.prisma.couponUsage.count({
                where: { couponId: coupon.id, customerId }
            });
            if (customerUsages >= coupon.perCustomerLimit) {
                return { valid: false, error: 'Ya usaste este cupón el máximo permitido', coupon: null };
            }
        }

        // Check minimum order value
        if (coupon.minOrderValue && orderTotal < Number(coupon.minOrderValue)) {
            return {
                valid: false,
                error: `El pedido mínimo para este cupón es $${Number(coupon.minOrderValue).toLocaleString()}`,
                coupon: null
            };
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discount = orderTotal * (Number(coupon.discountValue) / 100);
            // Apply max discount cap
            if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
                discount = Number(coupon.maxDiscount);
            }
        } else {
            discount = Number(coupon.discountValue);
        }

        return {
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                name: coupon.name,
                discountType: coupon.discountType,
                discountValue: Number(coupon.discountValue)
            },
            discount: Math.round(discount * 100) / 100,
            newTotal: Math.round((orderTotal - discount) * 100) / 100
        };
    }

    async applyCoupon(couponId: string, saleId: string, customerId: string | null, discountApplied: number) {
        // Create usage record
        await this.prisma.couponUsage.create({
            data: {
                couponId,
                saleId,
                customerId,
                discountApplied
            }
        });

        // Increment usage count
        await this.prisma.coupon.update({
            where: { id: couponId },
            data: { usageCount: { increment: 1 } }
        });
    }

    // ==================== MARKETING INTEGRATION ====================

    async createMarketingCoupon(type: 'VUELVE' | 'BIENVENIDO' | 'PROMO', discountPercent: number = 15) {
        const codePrefix = {
            'VUELVE': 'VUELVE',
            'BIENVENIDO': 'BIENVENIDO',
            'PROMO': 'PROMO'
        };

        const namePrefix = {
            'VUELVE': 'Cupón de Reactivación',
            'BIENVENIDO': 'Cupón de Bienvenida',
            'PROMO': 'Cupón Promocional'
        };

        const code = `${codePrefix[type]}${discountPercent}`;

        // Check if already exists
        const existing = await this.prisma.coupon.findUnique({ where: { code } });
        if (existing) {
            return existing;
        }

        // Create coupon valid for 7 days
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 7);

        return this.prisma.coupon.create({
            data: {
                code,
                name: `${namePrefix[type]} ${discountPercent}%`,
                description: `Descuento del ${discountPercent}% generado por campaña de marketing`,
                discountType: 'PERCENTAGE',
                discountValue: discountPercent,
                validUntil,
                usageLimit: 100,
                perCustomerLimit: 1
            }
        });
    }
}
