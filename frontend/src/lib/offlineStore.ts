// IndexedDB Store for Offline POS
// This module provides offline storage for products, customers, and pending sales

const DB_NAME = 'trento_pos_offline';
const DB_VERSION = 2;

interface OfflineSale {
    id: string;
    data: any;
    createdAt: Date;
    synced: number; // 0 = false, 1 = true
}

class OfflineStore {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Products store
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' });
                    productStore.createIndex('sku', 'sku', { unique: true });
                    productStore.createIndex('ean', 'ean', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                }

                // Customers store
                if (!db.objectStoreNames.contains('customers')) {
                    const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
                    customerStore.createIndex('name', 'name', { unique: false });
                    customerStore.createIndex('taxId', 'taxId', { unique: false });
                }

                // Pending sales queue
                if (!db.objectStoreNames.contains('pendingSales')) {
                    const salesStore = db.createObjectStore('pendingSales', { keyPath: 'id' });
                    salesStore.createIndex('synced', 'synced', { unique: false });
                    salesStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Cache metadata
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    // Products
    async saveProducts(products: any[]): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction('products', 'readwrite');
        const store = tx.objectStore('products');

        // Clear existing and add new
        await new Promise<void>((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        });

        for (const product of products) {
            store.put(product);
        }

        // Update metadata
        const metaTx = this.db!.transaction('metadata', 'readwrite');
        metaTx.objectStore('metadata').put({
            key: 'products_last_sync',
            value: new Date().toISOString()
        });
    }

    async getProducts(): Promise<any[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('products', 'readonly');
            const request = tx.objectStore('products').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchProducts(query: string): Promise<any[]> {
        const products = await this.getProducts();
        const q = query.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.ean && p.ean.includes(q))
        );
    }

    // Customers
    async saveCustomers(customers: any[]): Promise<void> {
        if (!this.db) await this.init();

        const tx = this.db!.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        await new Promise<void>((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        });

        for (const customer of customers) {
            store.put(customer);
        }
    }

    async getCustomers(): Promise<any[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('customers', 'readonly');
            const request = tx.objectStore('customers').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Pending Sales Queue
    async queueSale(saleData: any): Promise<string> {
        if (!this.db) await this.init();

        const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sale: OfflineSale = {
            id,
            data: saleData,
            createdAt: new Date(),
            synced: 0 // false
        };

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('pendingSales', 'readwrite');
            const request = tx.objectStore('pendingSales').add(sale);
            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    async getPendingSales(): Promise<OfflineSale[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('pendingSales', 'readonly');
            const index = tx.objectStore('pendingSales').index('synced');
            const request = index.getAll(IDBKeyRange.only(0)); // Get unsynced (0)
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async markSaleSynced(id: string): Promise<void> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('pendingSales', 'readwrite');
            const store = tx.objectStore('pendingSales');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const sale = getRequest.result;
                if (sale) {
                    sale.synced = 1; // true
                    const updateRequest = store.put(sale);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteSyncedSales(): Promise<void> {
        if (!this.db) await this.init();

        const synced = await new Promise<OfflineSale[]>((resolve, reject) => {
            const tx = this.db!.transaction('pendingSales', 'readonly');
            const index = tx.objectStore('pendingSales').index('synced');
            const request = index.getAll(IDBKeyRange.only(1)); // Get synced (1)
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const tx = this.db!.transaction('pendingSales', 'readwrite');
        const store = tx.objectStore('pendingSales');
        for (const sale of synced) {
            store.delete(sale.id);
        }
    }

    async getPendingSalesCount(): Promise<number> {
        const pending = await this.getPendingSales();
        return pending.length;
    }
}

export const offlineStore = new OfflineStore();
