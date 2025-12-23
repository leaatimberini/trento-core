
// Core Data Models

export interface Product {
    id: string;
    sku: string;
    ean?: string;
    name: string;
    slug?: string;  // SEO-friendly URL
    costPrice?: string | number;
    basePrice: string | number;
    displayPrice?: number;  // Price from price list
    hasListPrice?: boolean; // Whether product has price in list
    category?: string;
    brand?: string;
    currentStock?: number;
    imageUrl?: string;
    minStock?: number;
    wholesalePrice?: string | number;
    description?: string;
    // Unit fields
    baseUnit?: string;       // UNIDAD, CAJA, LITRO, KG
    unitsPerCase?: number;   // Units per case
    volumePerUnit?: number;  // Liters per unit
    // Shipping dimensions
    weight?: number;  // grams
    height?: number;  // cm
    width?: number;   // cm
    depth?: number;   // cm
}

export interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'USER';
    name?: string;
    createdAt?: string;
    customerType?: 'RETAIL' | 'WHOLESALE';
    type?: 'CUSTOMER' | 'USER';
}

export interface Supplier {
    id: string;
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
}

export interface PurchaseOrder {
    id: string;
    supplierId?: string;
    supplier?: Supplier;
    status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
    totalAmount: number;
    items: PurchaseOrderItem[];
    createdAt: string;
}

export interface PurchaseOrderItem {
    id: string;
    productId: string;
    product?: Product;
    quantity: number;
    costPrice: number;
}

export interface Sale {
    id: string;
    code: string;
    totalAmount: number; // or string if coming raw from DB via JSON
    discountAmount?: number;
    status: 'COMPLETED' | 'REFUNDED';
    createdAt: string;
    items?: SaleItem[];
}

export interface SaleItem {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product?: Product;
}

// DTOs (Data Transfer Objects)

export interface CreateSaleItemDto {
    productId: string;
    quantity: number;
}

export interface PaymentDto {
    method: string;
    amount: number;
}

export interface CreateSaleDto {
    items: CreateSaleItemDto[];
    paymentMethod: string;
    payments?: PaymentDto[];
    customerId?: string;
    warehouseId?: string;
    deliveryMethod?: 'PICKUP' | 'SHIPPING';
    discount?: number;
    documentType?: string;
    shippingFee?: number;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    user: User;
}

// Dashboard Stats

export interface FinanceStats {
    totalRevenue: number;
    transactionCount: number;
    transactions: Sale[];
    grossProfit?: number;
    totalCOGS?: number;
    estimatedCommissions?: number;
    totalNetProfit?: number;
    realMargin?: number;
}

export interface CreateProductDto {
    sku: string;
    ean?: string;
    name: string;
    description?: string;
    costPrice?: number;
    basePrice: number;
    taxRate?: number;
    category?: string;
    brand?: string;
    imageUrl?: string;
    minStock: number;
    stock?: number;
    wholesalePrice?: number;
    // Shipping dimensions
    weight?: number;
    height?: number;
    width?: number;
    depth?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> { }

export interface ReceiveStockDto {
    productId: string;
    quantity: number;
    batchNumber: string;
    locationZone: string;
    expirationDate?: string;
}
