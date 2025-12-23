export enum AdjustmentReason {
    ROTURA = 'ROTURA',       // Breakage
    MERMA = 'MERMA',         // Shrinkage/loss
    VENCIDO = 'VENCIDO',     // Expired
    CONTEO = 'CONTEO',       // Physical count adjustment
    DEVOLUCION = 'DEVOLUCION', // Customer return
    OTRO = 'OTRO'            // Other
}

export class AdjustStockDto {
    productId: string;
    quantity: number; // Positive = add, Negative = subtract
    reason: AdjustmentReason;
    notes?: string;
    warehouseId?: string;
    batchNumber?: string;
}

