
export class ReceiveStockDto {
    productId: string;
    quantity: number;
    batchNumber: string;
    expirationDate?: string;
    locationZone: string;
    warehouseId?: string;
}
