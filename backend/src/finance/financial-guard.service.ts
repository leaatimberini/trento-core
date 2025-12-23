
import { Injectable } from '@nestjs/common';
import { BotService } from '../bot/bot.service';

export interface DiscountEvaluationDto {
    productCost: number;
    salesPrice: number;
    discountPercent: number; // 0 to 1 (e.g. 0.1 for 10%)
    paymentMethodCommission: number; // 0 to 1 (e.g. 0.05 for 5%)
    taxPercent: number; // 0 to 1 (e.g. 0.21 for 21%)
    operationalCosts: number; // Fixed amount
    minAcceptableMargin?: number; // percentage, default 10
}

export interface EvaluationResult {
    status: 'APPROVED' | 'RISKY' | 'BLOCKED';
    alerts: string[];
    metrics: {
        finalPrice: number;
        totalCommission: number;
        totalRealCost: number;
        netProfit: number;
        realMarginPercent: number;
    };
    recommendations: {
        maxSafeDiscountPercent: number;
        minSafePrice: number;
        alternatives: string[];
    };
}

@Injectable()
export class FinancialGuardService {
    constructor(private readonly botService: BotService) { }

    evaluateDiscount(dto: DiscountEvaluationDto): EvaluationResult {
        const {
            productCost,
            salesPrice,
            discountPercent,
            paymentMethodCommission,
            taxPercent,
            operationalCosts,
            minAcceptableMargin = 10,
        } = dto;

        // 1. Calculate final price with discount
        const finalPrice = salesPrice * (1 - discountPercent);

        // 2. Calculate costs
        // Commission is often on the final transaction amount
        const totalCommission = finalPrice * paymentMethodCommission;

        // Taxes might be on price or profit, assuming VAT-style on final price for simplicity unless specified
        // (Adjust logic based on specific tax regime if needed, here assuming tax is part of cost structure passed in or calculated on revenue)
        // Usually, internal calculations might treat tax as a pass-through, but user asked for "impuestos" as an input.
        // If taxPercent is e.g. IIBB or other revenue taxes:
        const totalTax = finalPrice * taxPercent;

        const totalRealCost = productCost + totalCommission + totalTax + operationalCosts;

        // 3. Profit & Margin
        const netProfit = finalPrice - totalRealCost;
        const realMarginPercent = (netProfit / productCost) * 100;

        // 4. Analysis
        const alerts: string[] = [];
        let status: 'APPROVED' | 'RISKY' | 'BLOCKED' = 'APPROVED';

        // Original Margin (for comparison)
        const originalProfit = salesPrice - (productCost + (salesPrice * paymentMethodCommission) + (salesPrice * taxPercent) + operationalCosts);

        // CONDICIONES DE ALERTA
        // FATAL: Venta a pérdida (Net Profit < 0) -> BLOCKED
        if (netProfit < 0) {
            status = 'BLOCKED';
            const msg = 'Venta a pérdida: La operación genera déficit.';
            alerts.push(msg);
            this.botService.sendAlert(`⛔ **VENTA BLOQUEADA**\nMotivo: ${msg}\nProfit: $${netProfit.toFixed(2)}`);
        }
        // WARNING: Margen bajo -> RISKY
        else if (realMarginPercent < minAcceptableMargin) {
            status = 'RISKY';
            const msg = `Margen insuficiente: ${realMarginPercent.toFixed(2)}% es menor al mínimo aceptable (${minAcceptableMargin}%).`;
            alerts.push(msg);
            this.botService.sendAlert(`⚠️ **VENTA RIESGOSA**\nMotivo: ${msg}`);
        }

        // "Descuento agresivo" logic
        // If discount consumes more than 50% of the original profit margin potential
        const profitLossDueToDiscount = salesPrice * discountPercent;
        if (originalProfit > 0 && profitLossDueToDiscount > (originalProfit * 0.5)) {
            if (status !== 'BLOCKED') alerts.push('Descuento agresivo: Consume más del 50% del margen original.');
        }

        // 5. Recommendations
        // Max safe discount = Discount that makes Net Profit = 0
        // Profit = Price*(1-d) - (Cost + Price*(1-d)*Comm + Price*(1-d)*Tax + Ops) = 0
        // Price*(1-d) * (1 - Comm - Tax) = Cost + Ops
        // (1-d) = (Cost + Ops) / (Price * (1 - Comm - Tax))
        // d = 1 - [ (Cost + Ops) / (Price * (1 - Comm - Tax)) ]

        const denominator = salesPrice * (1 - paymentMethodCommission - taxPercent);
        let maxSafeDiscountPercent = 0;

        if (denominator > 0) {
            maxSafeDiscountPercent = 1 - ((productCost + operationalCosts) / denominator);
        }
        // Clamp
        if (maxSafeDiscountPercent < 0) maxSafeDiscountPercent = 0;

        // Min Safe Price (Price that gives 0 profit with 0 discount, or simply the breakeven point)
        // Breakeven Price P: P - P*Comm - P*Tax = Cost + Ops
        // P * (1 - Comm - Tax) = Cost + Ops
        const minSafePrice = (productCost + operationalCosts) / (1 - paymentMethodCommission - taxPercent);

        return {
            status,
            alerts,
            metrics: {
                finalPrice,
                totalCommission,
                totalRealCost,
                netProfit,
                realMarginPercent
            },
            recommendations: {
                maxSafeDiscountPercent: parseFloat(maxSafeDiscountPercent.toFixed(4)),
                minSafePrice: parseFloat(minSafePrice.toFixed(2)),
                alternatives: [
                    'Ofrecer 3 cuotas sin interés en lugar de descuento directo.',
                    'Bonificar el envío en compras superiores a cierto monto.',
                    'Aplicar descuento solo en efectivo/transferencia (sin comisión POS).'
                ]
            }
        };
    }
}
