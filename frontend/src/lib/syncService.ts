// Sync Service - Handles synchronization of offline sales when connection restored
import { offlineStore } from './offlineStore';
import { api } from '../services/api';

class SyncService {
    private isSyncing = false;
    private syncInterval: ReturnType<typeof setInterval> | null = null;

    async startAutoSync(intervalMs: number = 30000): Promise<void> {
        // Initial sync check
        await this.syncPendingSales();

        // Set up interval
        this.syncInterval = setInterval(() => {
            this.syncPendingSales();
        }, intervalMs);

        // Listen for online event
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[Sync] Connection restored, syncing...');
                this.syncPendingSales();
            });
        }
    }

    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    async syncPendingSales(): Promise<{ synced: number; failed: number }> {
        if (this.isSyncing) return { synced: 0, failed: 0 };
        if (!navigator.onLine) return { synced: 0, failed: 0 };

        this.isSyncing = true;
        let synced = 0;
        let failed = 0;

        try {
            const pendingSales = await offlineStore.getPendingSales();
            console.log(`[Sync] Found ${pendingSales.length} pending sales`);

            for (const sale of pendingSales) {
                try {
                    // Attempt to create sale on server
                    await api.createSale(sale.data);

                    // Mark as synced
                    await offlineStore.markSaleSynced(sale.id);
                    synced++;
                    console.log(`[Sync] Sale ${sale.id} synced successfully`);
                } catch (error) {
                    failed++;
                    console.error(`[Sync] Failed to sync sale ${sale.id}:`, error);
                }
            }

            // Clean up synced sales
            if (synced > 0) {
                await offlineStore.deleteSyncedSales();
            }

        } catch (error) {
            console.error('[Sync] Error during sync:', error);
        } finally {
            this.isSyncing = false;
        }

        return { synced, failed };
    }

    async refreshOfflineData(): Promise<void> {
        if (!navigator.onLine) {
            console.log('[Sync] Offline, skipping data refresh');
            return;
        }

        try {
            // Fetch and cache products
            const products = await api.getProducts();
            await offlineStore.saveProducts(products);
            console.log(`[Sync] Cached ${products.length} products`);

            // Fetch and cache customers
            const customers = await api.getCustomers();
            await offlineStore.saveCustomers(customers);
            console.log(`[Sync] Cached ${customers.length} customers`);

        } catch (error) {
            console.error('[Sync] Error refreshing offline data:', error);
        }
    }
}

export const syncService = new SyncService();
