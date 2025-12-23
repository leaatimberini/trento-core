
export class CreateSaleItemDto {
    productId: string;
    quantity: number;
}

export class PaymentDto {
    method: string; // CASH, CARD, ACCOUNT, QR
    amount: number;
}

export class CreateSaleDto {
    items: CreateSaleItemDto[];
    paymentMethod?: string; // Legacy
    payments?: PaymentDto[]; // New Multi-payment
    customerId?: string;
    warehouseId?: string; // Phase 34
    deliveryMethod?: 'PICKUP' | 'SHIPPING'; // Phase 36
    discount?: number;
    documentType?: 'SALE' | 'BUDGET' | 'CONSIGNMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
    shippingFee?: number;
}
