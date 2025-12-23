export interface ECommerceIntegration {
    name: string;
    auth(): Promise<void>;
    syncProducts(products: any[]): Promise<{ success: number; failed: number }>;
    fetchOrders(since?: Date): Promise<any[]>;
    updateStock(sku: string, quantity: number): Promise<boolean>;
}
