
export class CreateProductDto {
    sku: string;
    ean?: string;
    name: string;
    description?: string;
    basePrice: number;
    taxRate?: number;
    wholesalePrice?: number;
    category?: string;
    brand?: string;
    imageUrl?: string;
    costPrice?: number;
    minStock: number;
    stock?: number; // Initial stock
    // Shipping dimensions
    weight?: number;  // grams
    height?: number;  // cm
    width?: number;   // cm
    depth?: number;   // cm
}

export class UpdateProductDto {
    sku?: string;
    ean?: string;
    name?: string;
    description?: string;
    basePrice?: number;
    taxRate?: number;
    category?: string;
    brand?: string;
    imageUrl?: string;
    wholesalePrice?: number;
    costPrice?: number;
    minStock?: number;
    // Shipping dimensions
    weight?: number;  // grams
    height?: number;  // cm
    width?: number;   // cm
    depth?: number;   // cm
}
