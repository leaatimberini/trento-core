import { Injectable, Logger } from '@nestjs/common';
import { IntegrationCredentialsService } from '../credentials/integration-credentials.service';

// Mercado Libre API base URLs
const ML_AUTH_URL = 'https://auth.mercadolibre.com.ar';
const ML_API_URL = 'https://api.mercadolibre.com';

interface MLProduct {
    title: string;
    category_id: string;
    price: number;
    currency_id: string;
    available_quantity: number;
    buying_mode: string;
    listing_type_id: string;
    condition: string;
    description: { plain_text: string };
    pictures?: { source: string }[];
}

@Injectable()
export class MercadoLibreService {
    private readonly logger = new Logger(MercadoLibreService.name);

    constructor(
        private credentialsService: IntegrationCredentialsService
    ) { }

    /**
     * Get OAuth authorization URL for user to grant access
     */
    getAuthorizationUrl(redirectUri: string): string {
        // This would be called from frontend to initiate OAuth flow
        return `${ML_AUTH_URL}/authorization?response_type=code&client_id=APP_ID&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadolibre');

        if (!credentials?.clientId || !credentials?.clientSecret) {
            throw new Error('Mercado Libre credentials not configured');
        }

        const response = await fetch(`${ML_API_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret,
                code,
                redirect_uri: redirectUri
            })
        });

        if (!response.ok) {
            throw new Error(`ML OAuth failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Save tokens
        await this.credentialsService.configure('mercadolibre', {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            accountId: data.user_id?.toString(),
            expiresAt: new Date(Date.now() + data.expires_in * 1000)
        });

        return { success: true, userId: data.user_id };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(): Promise<boolean> {
        const credentials = await this.credentialsService.getByProvider('mercadolibre');

        if (!credentials?.refreshToken) {
            return false;
        }

        try {
            const response = await fetch(`${ML_API_URL}/oauth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: credentials.clientId!,
                    client_secret: credentials.clientSecret!,
                    refresh_token: credentials.refreshToken
                })
            });

            if (!response.ok) return false;

            const data = await response.json();

            await this.credentialsService.configure('mercadolibre', {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(Date.now() + data.expires_in * 1000)
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to refresh ML token', error);
            return false;
        }
    }

    /**
     * Create a new listing on Mercado Libre
     */
    async createListing(product: MLProduct): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadolibre');

        if (!credentials?.accessToken) {
            throw new Error('Mercado Libre not connected');
        }

        const response = await fetch(`${ML_API_URL}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(product)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`ML listing failed: ${error.message || response.statusText}`);
        }

        await this.credentialsService.updateLastSync('mercadolibre');
        return response.json();
    }

    /**
     * Update stock for a listing
     */
    async updateStock(mlItemId: string, quantity: number): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadolibre');

        if (!credentials?.accessToken) {
            throw new Error('Mercado Libre not connected');
        }

        const response = await fetch(`${ML_API_URL}/items/${mlItemId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ available_quantity: quantity })
        });

        if (!response.ok) {
            throw new Error(`ML stock update failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get orders from Mercado Libre
     */
    async getOrders(status?: string): Promise<any[]> {
        const credentials = await this.credentialsService.getByProvider('mercadolibre');

        if (!credentials?.accessToken || !credentials?.accountId) {
            throw new Error('Mercado Libre not connected');
        }

        const url = new URL(`${ML_API_URL}/orders/search`);
        url.searchParams.set('seller', credentials.accountId);
        if (status) url.searchParams.set('order.status', status);

        const response = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`ML orders fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results || [];
    }

    /**
     * Test connection to Mercado Libre
     */
    async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
        const credentials = await this.credentialsService.getByProvider('mercadolibre');

        if (!credentials?.accessToken) {
            return { success: false, error: 'No access token configured' };
        }

        try {
            const response = await fetch(`${ML_API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
            });

            if (!response.ok) {
                return { success: false, error: `API returned ${response.status}` };
            }

            const user = await response.json();
            return { success: true, user };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
