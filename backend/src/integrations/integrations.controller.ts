
import { Controller, Post, Body, Get, Param, BadRequestException, Delete, UseGuards } from '@nestjs/common';
import { RappiService } from './delivery/rappi.service';
import { PedidosYaService } from './delivery/pedidosya.service';
import { AndreaniService } from './logistics/andreani.service';
import { ArcaService } from './fiscal/arca.service';
import { IntegrationCredentialsService } from './credentials/integration-credentials.service';
import { MercadoLibreService } from './marketplace/mercadolibre.service';
import { MercadoPagoService } from './payments/mercadopago.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('integrations')
export class IntegrationsController {
    constructor(
        private rappi: RappiService,
        private peya: PedidosYaService,
        private andreani: AndreaniService,
        private arca: ArcaService,
        private credentials: IntegrationCredentialsService,
        private mercadoLibre: MercadoLibreService,
        private mercadoPago: MercadoPagoService
    ) { }

    // ============ CREDENTIALS MANAGEMENT ============

    @Get('status')
    async getAllStatus() {
        const providers = ['mercadolibre', 'mercadopago', 'arca', 'andreani', 'rappi', 'pedidosya'];
        const statuses: Record<string, any> = {};

        for (const provider of providers) {
            statuses[provider] = await this.credentials.getStatus(provider);
        }

        return statuses;
    }

    @Get('status/:provider')
    async getProviderStatus(@Param('provider') provider: string) {
        return this.credentials.getStatus(provider);
    }

    @Post('configure/:provider')
    async configureProvider(
        @Param('provider') provider: string,
        @Body() body: {
            clientId?: string;
            clientSecret?: string;
            accessToken?: string;
            refreshToken?: string;
            publicKey?: string;
        }
    ) {
        return this.credentials.configure(provider, body);
    }

    @Delete('disconnect/:provider')
    async disconnectProvider(@Param('provider') provider: string) {
        return this.credentials.disable(provider);
    }

    // ============ MERCADO LIBRE ============

    @Get('mercadolibre/auth-url')
    async getMercadoLibreAuthUrl() {
        const redirectUri = process.env.ML_REDIRECT_URI || 'http://localhost:3000/api/integrations/mercadolibre/callback';
        return { url: this.mercadoLibre.getAuthorizationUrl(redirectUri) };
    }

    @Post('mercadolibre/callback')
    async mercadoLibreCallback(@Body() body: { code: string }) {
        const redirectUri = process.env.ML_REDIRECT_URI || 'http://localhost:3000/api/integrations/mercadolibre/callback';
        return this.mercadoLibre.exchangeCodeForToken(body.code, redirectUri);
    }

    @Get('mercadolibre/test')
    async testMercadoLibre() {
        return this.mercadoLibre.testConnection();
    }

    @Post('mercadolibre/sync-product')
    async syncProductToMercadoLibre(@Body() body: any) {
        return this.mercadoLibre.createListing(body);
    }

    @Post('mercadolibre/update-stock')
    async updateMercadoLibreStock(@Body() body: { mlItemId: string; quantity: number }) {
        return this.mercadoLibre.updateStock(body.mlItemId, body.quantity);
    }

    @Get('mercadolibre/orders')
    async getMercadoLibreOrders() {
        return this.mercadoLibre.getOrders();
    }

    // ============ MERCADO PAGO ============

    @Get('mercadopago/auth-url')
    async getMercadoPagoAuthUrl() {
        // En producción, usar variable de entorno. Para dev, localhost o dominio público temporal
        const redirectUri = process.env.MP_REDIRECT_URI || 'http://localhost:3000/api/integrations/mercadopago/callback'; // O URL del Frontend que luego llama al backend
        // Standard OAuth flow: Redirect to Frontend URL which captures code and sends to backend API
        // Let's assume MP_REDIRECT_URI points to Frontend Page: /admin/integrations/mercadopago/callback
        return { url: this.mercadoPago.getAuthorizationUrl(redirectUri) };
    }

    @Post('mercadopago/callback')
    async mercadoPagoCallback(@Body() body: { code: string; redirectUri?: string }) {
        const redirect = body.redirectUri || process.env.MP_REDIRECT_URI || 'http://localhost:3000/api/integrations/mercadopago/callback';
        const tokens = await this.mercadoPago.exchangeCodeForToken(body.code, redirect);

        await this.credentials.configure('mercadopago', {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            accountId: tokens.user_id?.toString(),
            publicKey: tokens.public_key,
            expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : undefined
        });

        return { success: true };
    }

    @Post('mercadopago/configure')
    async configureMercadoPago(@Body() body: { accessToken: string; publicKey: string }) {
        if (!body.accessToken || !body.publicKey) {
            throw new BadRequestException('accessToken and publicKey required');
        }
        return this.mercadoPago.configure(body.accessToken, body.publicKey);
    }

    @Get('mercadopago/test')
    async testMercadoPago() {
        return this.mercadoPago.testConnection();
    }

    @Get('mercadopago/public-key')
    async getMercadoPagoPublicKey() {
        const publicKey = await this.mercadoPago.getPublicKey();
        return { publicKey };
    }

    @Post('mercadopago/preference')
    async createMercadoPagoPreference(@Body() body: {
        items: Array<{ title: string; quantity: number; unit_price: number }>;
        externalReference: string;
        backUrls?: { success: string; failure: string; pending: string };
    }) {
        return this.mercadoPago.createPreference(body.items, body.externalReference, body.backUrls);
    }

    @Post('mercadopago/qr')
    async createMercadoPagoQR(@Body() body: { amount: number; description: string; externalReference: string }) {
        return this.mercadoPago.createQRCode(body);
    }

    @Get('mercadopago/payment/:id')
    async getMercadoPagoPayment(@Param('id') id: string) {
        return this.mercadoPago.getPayment(id);
    }

    @Post('mercadopago/webhook')
    async mercadoPagoWebhook(@Body() body: any) {
        // IPN notification
        if (body.type && body.data?.id) {
            return this.mercadoPago.processWebhook(body.type, body.data.id);
        }
        return { received: true };
    }

    // ============ EXISTING INTEGRATIONS ============

    // Delivery Webhooks
    @Post('delivery/:provider/orders')
    async receiveOrder(@Param('provider') provider: string, @Body() data: any) {
        console.log(`[Webhook] Received order from ${provider}`, data);
        return { status: 'ORDER_RECEIVED', id: Date.now() };
    }

    // Logistics Quote
    @Post('logistics/quote')
    async quoteShipping(@Body() body: { zip: string; weight: number }) {
        if (!body.zip || !body.weight) throw new BadRequestException('Zip and Weight required');
        return this.andreani.quoteShipping(body.zip, body.weight);
    }

    // Fiscal Authorize
    @Post('fiscal/authorize')
    async authorizeInvoice(@Body() body: { saleId: string }) {
        return this.arca.authorizeVoucher(body);
    }
}
