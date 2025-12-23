import { Injectable, Logger } from '@nestjs/common';
import { IntegrationCredentialsService } from '../credentials/integration-credentials.service';

// Mercado Pago API base URL
const MP_API_URL = 'https://api.mercadopago.com';

interface CreatePaymentDto {
    amount: number;
    description: string;
    payerEmail: string;
    externalReference?: string;
}

interface CreateQRDto {
    amount: number;
    description: string;
    externalReference: string;
}

@Injectable()
export class MercadoPagoService {
    private readonly logger = new Logger(MercadoPagoService.name);

    constructor(
        private credentialsService: IntegrationCredentialsService
    ) { }

    /**
     * Configure Mercado Pago with access token
     */
    async configure(accessToken: string, publicKey: string): Promise<any> {
        // Verify the token is valid
        const user = await this.getAccountInfo(accessToken);

        if (!user) {
            throw new Error('Invalid Mercado Pago access token');
        }

        await this.credentialsService.configure('mercadopago', {
            accessToken,
            publicKey,
            accountId: user.id?.toString()
        });

        return { success: true, userId: user.id };
    }

    /**
     * Get account info to verify token
     */
    private async getAccountInfo(accessToken: string): Promise<any> {
        try {
            const response = await fetch(`${MP_API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) return null;
            return response.json();
        } catch {
            return null;
        }
    }

    /**
     * Get Authorization URL for Marketplace linking
     */
    getAuthorizationUrl(redirectUri: string): string {
        const appId = process.env.MP_APP_ID;
        if (!appId) throw new Error('MP_APP_ID not configured');

        // Random state for security
        const state = Math.random().toString(36).substring(7);
        return `https://auth.mercadopago.com/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }

    /**
     * Exchange code for Access Token (OAuth)
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
        const appId = process.env.MP_APP_ID;
        const clientSecret = process.env.MP_CLIENT_SECRET;

        if (!appId || !clientSecret) throw new Error('MP App credentials not configured');

        const response = await fetch(`${MP_API_URL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: appId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`MP OAuth failed: ${error.message || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Create a payment preference (for checkout) with Marketplace Fee
     */
    async createPreference(items: Array<{
        title: string;
        quantity: number;
        unit_price: number;
    }>, externalReference: string, backUrls?: {
        success: string;
        failure: string;
        pending: string;
    }): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadopago');

        if (!credentials?.accessToken) {
            throw new Error('Mercado Pago not connected');
        }

        // Calculate 1% fee for the developer
        const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        const marketplaceFee = Number((totalAmount * 0.01).toFixed(2));

        const response = await fetch(`${MP_API_URL}/checkout/preferences`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items,
                marketplace_fee: marketplaceFee, // Fee charged by the developer
                external_reference: externalReference,
                back_urls: backUrls,
                auto_return: backUrls ? 'approved' : undefined,
                notification_url: process.env.MP_WEBHOOK_URL // Optional: central webhook
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`MP preference failed: ${error.message || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Create a payment directly
     */
    async createPayment(data: CreatePaymentDto): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadopago');

        if (!credentials?.accessToken) {
            throw new Error('Mercado Pago not connected');
        }

        const response = await fetch(`${MP_API_URL}/v1/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}`
            },
            body: JSON.stringify({
                transaction_amount: data.amount,
                description: data.description,
                payer: { email: data.payerEmail },
                external_reference: data.externalReference
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`MP payment failed: ${error.message || response.statusText}`);
        }

        await this.credentialsService.updateLastSync('mercadopago');
        return response.json();
    }

    /**
     * Get payment status
     */
    async getPayment(paymentId: string): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadopago');

        if (!credentials?.accessToken) {
            throw new Error('Mercado Pago not connected');
        }

        const response = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`MP get payment failed: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Create QR code for POS payment
     */
    async createQRCode(data: CreateQRDto): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadopago');

        if (!credentials?.accessToken || !credentials?.accountId) {
            throw new Error('Mercado Pago not connected');
        }

        // First, we need to get or create a POS
        // For simplicity, using a dynamic QR approach
        const response = await fetch(`${MP_API_URL}/instore/orders/qr/seller/collectors/${credentials.accountId}/pos/TRENTO_POS_001/qrs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${credentials.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                external_reference: data.externalReference,
                title: data.description,
                total_amount: data.amount,
                items: [{
                    title: data.description,
                    unit_price: data.amount,
                    quantity: 1,
                    unit_measure: 'unit',
                    total_amount: data.amount
                }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`MP QR failed: ${error.message || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Process IPN webhook notification
     */
    async processWebhook(topic: string, id: string): Promise<any> {
        const credentials = await this.credentialsService.getByProvider('mercadopago');

        if (!credentials?.accessToken) {
            throw new Error('Mercado Pago not connected');
        }

        if (topic === 'payment') {
            return this.getPayment(id);
        }

        // Handle other topics as needed
        return { topic, id, handled: false };
    }

    /**
     * Get public key for frontend SDK
     */
    async getPublicKey(): Promise<string | null> {
        const credentials = await this.credentialsService.getByProvider('mercadopago');
        return credentials?.publicKey || null;
    }

    /**
     * Test connection to Mercado Pago
     */
    async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
        const credentials = await this.credentialsService.getByProvider('mercadopago');

        if (!credentials?.accessToken) {
            return { success: false, error: 'No access token configured' };
        }

        try {
            const user = await this.getAccountInfo(credentials.accessToken);
            if (!user) {
                return { success: false, error: 'Invalid token' };
            }
            return { success: true, user };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
