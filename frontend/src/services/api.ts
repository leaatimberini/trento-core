import { Product, CreateSaleDto, FinanceStats, AuthResponse, LoginDto, Sale, CreateProductDto, UpdateProductDto, ReceiveStockDto } from "../types";

// Helper to handle 401 Unauthorized - redirect to login
// Set redirectOnUnauthorized=false for public endpoints that might 401 but shouldn't redirect
const handleResponse = async (res: Response, errorMessage: string, redirectOnUnauthorized = true) => {
    if (res.status === 401 && redirectOnUnauthorized) {
        // Token expired or invalid - redirect to login
        // Only redirect if user was previously logged in
        const hadToken = typeof window !== 'undefined' && localStorage.getItem('token');
        if (hadToken) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
    }
    if (!res.ok) throw new Error(errorMessage);
    return res.json();
};

export const api = {
    // Public endpoints - don't redirect on 401
    getProducts: async (): Promise<Product[]> => {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    },

    // Products with prices from default price list (for storefront)
    getStoreProducts: async (priceListId?: string): Promise<Product[]> => {
        const url = priceListId
            ? `/api/products/store?priceListId=${priceListId}`
            : '/api/products/store';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    },

    getProduct: async (id: string): Promise<Product> => {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error('Failed to fetch product');
        return res.json();
    },

    // SEO-friendly: Get product by URL slug (searches by name match)
    getProductBySlug: async (slug: string): Promise<Product> => {
        // First try to get all products and find by slug
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');
        const products: Product[] = await res.json();

        // Generate slug from product name and match
        const generateSlug = (name: string): string => {
            return name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
        };

        const product = products.find(p => generateSlug(p.name) === slug || p.id === slug);
        if (!product) throw new Error('Product not found');
        return product;
    },

    getCategories: async (): Promise<string[]> => {
        const res = await fetch('/api/products/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    },

    createSale: async (data: CreateSaleDto): Promise<Sale> => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to create sale');
        }
        return res.json();
    },

    getDailyStats: async (): Promise<FinanceStats> => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    },

    getProfitability: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/stats/profitability', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return handleResponse(res, 'Failed to fetch profitability');
    },

    getBreakEven: async (month?: number, year?: number) => {
        const token = localStorage.getItem("token");
        const q = [];
        if (month) q.push(`month=${month}`);
        if (year) q.push(`year=${year}`);
        const qs = q.length ? `?${q.join('&')}` : '';

        const res = await fetch(`/api/finance/analysis/breakeven${qs}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch breakeven analysis');
        return res.json();
    },



    getTopCustomers: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/customers/top', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return handleResponse(res, 'Failed to fetch top customers');
    },

    getDeadStockReport: async (days: number = 90) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/finance/reports/dead-stock?days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch dead stock');
        return res.json();
    },

    getTopCategories: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/reports/categories', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch top categories');
        return res.json();
    },

    simulateBankStatement: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/reconcile/simulate', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch simulation');
        return res.json();
    },

    reconcileTransactions: async (transactions: any[]) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ transactions }),
        });
        if (!res.ok) throw new Error('Failed to reconcile');
        return res.json();
    },

    // Logistics
    getDeliveries: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/logistics/deliveries', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch deliveries');
        return res.json();
    },

    optimizeRoute: async (orders: any[]) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/logistics/routes/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ orders }),
        });
        if (!res.ok) throw new Error('Failed to optimize route');
        return res.json();
    },

    getManifest: async (saleId: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/logistics/manifest/${saleId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch manifest');
        return res.text(); // Returns text string
    },

    login: async (credentials: LoginDto): Promise<AuthResponse> => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Login failed');
        }
        return res.json();
    },

    customerLogin: async (credentials: LoginDto): Promise<AuthResponse> => {
        const res = await fetch('/api/auth/customer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Customer login failed');
        }
        return res.json();
    },

    customerRegister: async (data: any): Promise<any> => {
        const res = await fetch('/api/auth/customer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Customer registration failed');
        }
        return res.json();
    },

    refundSale: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/sales/${id}/refund`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        if (!res.ok) throw new Error('Refund failed');
        return res.json();
    },

    voidSale: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/sales/${id}/void`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        if (!res.ok) throw new Error('Void failed');
        return res.json();
    },

    deleteSale: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/sales/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Delete failed');
        }
        return res.json();
    },


    createProduct: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create product');
        return res.json();
    },

    updateProduct: async (id: string, data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update product');
        return res.json();
    },

    deleteProduct: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete product');
        return res.ok;
    },

    uploadImage: async (file: File) => {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/uploads', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    },

    transferStock: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/inventory/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to transfer stock');
        return res.json();
    },

    getProductStockDetails: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/inventory/product/${id}/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch details');
        return res.json();
    },

    receiveStock: async (data: ReceiveStockDto) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/inventory/receive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to receive stock');
        return res.json();
    },

    adjustStock: async (data: { productId: string; quantity: number; reason: string; notes?: string; warehouseId?: string; batchNumber?: string }) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/inventory/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: 'Failed to adjust stock' }));
            throw new Error(error.message || 'Failed to adjust stock');
        }
        return res.json();
    },

    getAdjustmentHistory: async (productId?: string) => {
        const token = localStorage.getItem("token");
        const url = productId
            ? `/api/inventory/adjustments?productId=${productId}`
            : '/api/inventory/adjustments';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch adjustment history');
        return res.json();
    },


    createEcommerceSale: async (data: any) => {
        // Public endpoint, no token needed
        const res = await fetch('/api/sales/ecommerce', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create order');
        return res.json();
    },

    getUsers: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    // Sales
    getSales: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/sales', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch sales');
        return res.json();
    },

    createUser: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create user');
        return res.json();
    },

    async getLowStockAlerts(): Promise<Product[]> {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/inventory/alerts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch alerts');
        return res.json();
    },

    async getExpiringStock(days?: number): Promise<any[]> {
        const token = localStorage.getItem("token");
        const url = days
            ? `/api/inventory/alerts/expiring?days=${days}`
            : '/api/inventory/alerts/expiring';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch expiring items');
        return res.json();
    },

    async getExpiredStock(): Promise<any[]> {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/inventory/alerts/expired', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch expired items');
        return res.json();
    },

    async getExpirationSummary(): Promise<any> {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/inventory/alerts/expiration-summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch expiration summary');
        return res.json();
    },

    async checkProductExpired(productId: string): Promise<boolean> {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/inventory/product/${productId}/expired-check`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to check product expiration');
        return res.json();
    },


    // Suppliers
    getSuppliers: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/suppliers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch suppliers');
        return res.json();
    },

    createSupplier: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create supplier');
        return res.json();
    },

    deleteSupplier: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/suppliers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete supplier');
        return res.json();
    },

    // Purchase Orders
    getPurchaseOrders: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/purchase-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch purchase orders');
        return res.json();
    },

    createPurchaseOrder: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/purchase-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create purchase order');
        return res.json();
    },

    receivePurchaseOrder: async (id: string, data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/purchase-orders/${id}/receive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to receive purchase order');
        return res.json();
    },

    // Reports
    downloadSalesCsv: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/reports/sales/csv', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to download report');
        return res.blob();
    },

    downloadInventoryCsv: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/reports/inventory/csv', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to download report');
        return res.blob();
    },

    // Customers
    getCustomers: async (query?: string) => {
        const token = localStorage.getItem("token");
        const q = query ? `?q=${query}` : '';
        const res = await fetch(`/api/customers${q}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch customers');
        return res.json();
    },

    createCustomer: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create customer');
        return res.json();
    },

    updateCustomer: async (id: string, data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/customers/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update customer');
        return res.json();
    },

    getCustomerHistory: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/customers/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch customer history');
        return res.json(); // returns customer with sales included
    },

    // Customer Profile (Self)
    getMyProfile: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
    },

    updateMyProfile: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update profile');
        return res.json();
    },

    getMyOrders: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/profile/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
    },

    // Expenses
    getExpenses: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/expenses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch expenses');
        return res.json();
    },

    getMonthlyStats: async (month?: number, year?: number): Promise<FinanceStats> => {
        const token = localStorage.getItem("token");
        const query = new URLSearchParams();
        if (month) query.append('month', month.toString());
        if (year) query.append('year', year.toString());

        const res = await fetch(`/api/finance/stats/monthly?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch monthly stats');
        return res.json();
    },

    getExpenseSummary: async (month?: number, year?: number) => {
        const token = localStorage.getItem("token");
        const query = new URLSearchParams();
        if (month) query.append('month', month.toString());
        if (year) query.append('year', year.toString());

        const res = await fetch(`/api/expenses/summary?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch expense summary');
        return res.json();
    },

    createExpense: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create expense');
        return res.json();
    },

    updateExpense: async (id: string, data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update expense');
        return res.json();
    },

    deleteExpense: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete expense');
        return res.json();
    },

    // Audit
    getAuditLogs: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/audit', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        return res.json();
    },

    // Cash Shifts
    getActiveShift: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/shift/active', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 404) return null;

        // Handle empty body (200 OK but no content means no active shift)
        const text = await res.text();
        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON response');
        }
    },

    getShiftSummary: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/shift/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return handleResponse(res, 'Failed to fetch shift summary');
    },

    openShift: async (initialCash: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/shift/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ initialCash }),
        });
        return handleResponse(res, 'Failed to open shift');
    },

    closeShift: async (finalCash: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/shift/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ finalCash }),
        });
        return handleResponse(res, 'Failed to close shift');
    },

    // AI Features
    generateAiDescription: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/ai/generate-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to generate description');
        return res.json();
    },

    suggestDimensions: async (productName: string, category?: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/products/suggest-dimensions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productName, category }),
        });
        if (!res.ok) throw new Error('Failed to suggest dimensions');
        return res.json();
    },

    aiChat: async (message: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message }),
        });
        if (!res.ok) throw new Error('Failed to chat');
        return res.json();
    },

    getAiForecast: async (productId: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/ai/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productId }),
        });
        if (!res.ok) throw new Error('Failed to get forecast');
        return res.json();
    },

    getRecommendations: async (productId: string) => {
        // Public endpoint
        const res = await fetch(`/api/ai/recommendations/${productId}`);
        if (!res.ok) throw new Error('Failed to get recommendations');
        return res.json();
    },

    // Warehouses
    getWarehouses: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/warehouses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch warehouses');
        return res.json();
    },

    createWarehouse: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/warehouses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create warehouse');
        return res.json();
    },

    // Packaging
    getPackagingBalance: async (customerId: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/packaging/customer/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch packaging balance');
        return res.json();
    },

    evaluateDiscount: async (data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/evaluate-discount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to evaluate discount');
        return res.json();
    },

    getPackagingTypes: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/packaging/types', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch packaging types');
        return res.json();
    },

    getPackagingAlerts: async (threshold?: number) => {
        const token = localStorage.getItem("token");
        const url = threshold ? `/api/packaging/alerts?threshold=${threshold}` : '/api/packaging/alerts';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch packaging alerts');
        return res.json();
    },

    exportInventory: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/inventory/export', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
    },

    importInventory: async (file: File) => {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/inventory/import', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error('Import failed');
        return res.json();
    },

    getPackagingSummary: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/packaging/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch packaging summary');
        return res.json();
    },

    registerPackagingMovement: async (customerId: string, type: string, quantity: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/packaging/movement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ customerId, type, quantity })
        });
        if (!res.ok) throw new Error('Failed to register packaging movement');
        return res.json();
    },


    // Integrations
    quoteShipping: async (zip: string, weight: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/integrations/logistics/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ zip, weight }),
        });
        if (!res.ok) throw new Error('Failed to quote shipping');
        return res.json();
    },

    authorizeInvoice: async (saleId: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/integrations/fiscal/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ saleId }),
        });
        if (!res.ok) throw new Error('Failed to authorize invoice');
        return res.json();
    },

    // Marketing
    sendCampaign: async (segment: string, subject: string, content: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/marketing/campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ segment, subject, content }),
        });
        if (!res.ok) throw new Error('Failed to send campaign');
        return res.json();
    },

    getCampaigns: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/marketing/campaigns', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch campaigns');
        return res.json();
    },

    getTopProducts: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/stats/top-products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch top products');
        return res.json();
    },

    // Integrations
    getIntegrationStatuses: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/integrations/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch integration statuses');
        return res.json();
    },

    configureIntegration: async (provider: string, data: any) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/integrations/configure/${provider}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to configure integration');
        return res.json();
    },

    disconnectIntegration: async (provider: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/integrations/disconnect/${provider}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to disconnect');
        return res.json();
    },

    testIntegration: async (provider: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/integrations/${provider}/test`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to test connection');
        return res.json();
    },

    // === GANAR A LA COMPRA ===
    getPurchaseSavings: async (start?: string, end?: string) => {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (start) params.set('start', start);
        if (end) params.set('end', end);
        const res = await fetch(`/api/finance/purchase-savings?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch savings');
        return res.json();
    },

    getTopSavingsProducts: async (limit?: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/finance/purchase-savings/products?limit=${limit || 10}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch top savings products');
        return res.json();
    },

    getTopSupplierSavings: async (limit?: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/finance/purchase-savings/suppliers?limit=${limit || 10}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch supplier savings');
        return res.json();
    },

    getMonthlySavings: async (months?: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/finance/purchase-savings/monthly?months=${months || 12}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch monthly savings');
        return res.json();
    },

    calculatePurchaseSaving: async (productId: string, paidCost: number, quantity: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/finance/purchase-savings/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productId, paidCost, quantity }),
        });
        if (!res.ok) throw new Error('Failed to calculate saving');
        return res.json();
    },

    // === PEDIDOS ENTRANTES ===
    getIncomingOrders: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/orders/incoming', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch incoming orders');
        return res.json();
    },

    updateOrderStatus: async (orderId: string, status: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/orders/incoming/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error('Failed to update order status');
        return res.json();
    },

    // === LISTAS DE PRECIOS ===
    getPriceLists: async () => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/pricing/lists', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch price lists');
        return res.json();
    },

    getPriceListDetail: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/pricing/lists/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch price list detail');
        return res.json();
    },

    createPriceList: async (data: { name: string; description?: string; markup?: number; isDefault?: boolean }) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/pricing/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create price list');
        return res.json();
    },

    updatePriceList: async (id: string, data: { name?: string; description?: string; markup?: number; isDefault?: boolean }) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/pricing/lists/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update price list');
        return res.json();
    },

    deletePriceList: async (id: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/pricing/lists/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete price list');
        return res.json();
    },

    addPriceListItems: async (listId: string, items: { productId: string; price: number }[]) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/pricing/lists/${listId}/items/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error('Failed to add items');
        return res.json();
    },

    updatePriceListItem: async (listId: string, productId: string, price: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/pricing/lists/${listId}/items/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ price }),
        });
        if (!res.ok) throw new Error('Failed to update item price');
        return res.json();
    },

    applyPriceListMarkup: async (listId: string, markupPercentage: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/pricing/lists/${listId}/apply-markup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ markupPercentage }),
        });
        if (!res.ok) throw new Error('Failed to apply markup');
        return res.json();
    },

    getProductPrice: async (productId: string, customerId?: string) => {
        const token = localStorage.getItem("token");
        const url = customerId
            ? `/api/pricing/price/${productId}?customerId=${customerId}`
            : `/api/pricing/price/${productId}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to get price');
        return res.json();
    },

    getProductConversions: async (productId: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/products/${productId}/conversions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return res.json();
    },

    addProductConversion: async (productId: string, fromUnit: string, factor: number) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/products/${productId}/conversions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ fromUnit, factor })
        });
        if (!res.ok) throw new Error('Failed to add conversion');
        return res.json();
    },

    generateBlogContent: async (topic: string) => {
        const token = localStorage.getItem("token");
        const res = await fetch('/api/blog/generate/culture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ topic })
        });
        if (!res.ok) throw new Error('Failed to generate content');
        return res.json();
    }
};

