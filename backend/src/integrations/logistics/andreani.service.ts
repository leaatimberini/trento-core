import { Injectable, Logger } from '@nestjs/common';

interface AndreaniCredentials {
    username: string;
    password: string;
    clientId: string; // Número de contrato/cliente
}

export interface ShippingQuote {
    provider: string;
    service: string;
    price: number;
    deliveryDays: number;
    trackingAvailable: boolean;
}

@Injectable()
export class AndreaniService {
    private readonly logger = new Logger(AndreaniService.name);
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    // API URLs
    private readonly API_URL_PROD = 'https://apis.andreani.com';
    private readonly API_URL_QA = 'https://apisqa.andreani.com';

    private get credentials(): AndreaniCredentials {
        return {
            username: process.env.ANDREANI_USERNAME || '',
            password: process.env.ANDREANI_PASSWORD || '',
            clientId: process.env.ANDREANI_CLIENT_ID || ''
        };
    }

    private get apiUrl(): string {
        const isProd = process.env.NODE_ENV === 'production';
        return isProd ? this.API_URL_PROD : this.API_URL_QA;
    }

    private get isConfigured(): boolean {
        const creds = this.credentials;
        return !!(creds.username && creds.password && creds.clientId);
    }

    /**
     * Authenticate with Andreani API
     */
    private async authenticate(): Promise<string | null> {
        if (!this.isConfigured) {
            this.logger.warn('Andreani credentials not configured, using mock');
            return null;
        }

        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
            return this.accessToken;
        }

        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(
                        `${this.credentials.username}:${this.credentials.password}`
                    ).toString('base64')
                }
            });

            if (!response.ok) {
                this.logger.error(`Andreani auth failed: ${response.status}`);
                return null;
            }

            const data = await response.json();
            this.accessToken = data.token;
            // Token expires in 1 hour, refresh at 50 mins
            this.tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);

            this.logger.log('Andreani authentication successful');
            return this.accessToken;
        } catch (error) {
            this.logger.error('Andreani auth error:', error);
            return null;
        }
    }

    /**
     * Cotiza costo de envío
     */
    async quoteShipping(
        postalCode: string,
        weightKg: number,
        options?: {
            volume?: number; // cm3
            declaredValue?: number;
            contrato?: string;
        }
    ): Promise<ShippingQuote> {
        // Try real API first
        const token = await this.authenticate();

        if (token) {
            return this.quoteShippingReal(postalCode, weightKg, token, options);
        }

        // Fallback to mock
        return this.quoteShippingMock(postalCode, weightKg);
    }

    /**
     * Real Andreani API quote
     */
    private async quoteShippingReal(
        cpDestino: string,
        pesoKg: number,
        token: string,
        options?: { volume?: number; declaredValue?: number; contrato?: string }
    ): Promise<ShippingQuote> {
        try {
            // API endpoint for home delivery quote
            const response = await fetch(`${this.apiUrl}/v1/tarifas`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-authorization-token': token,
                    'Content-Type': 'application/json'
                },
                // Query params for tariff calculation
                // cpDestino, contrato, peso, volumen, valorDeclarado
            });

            if (!response.ok) {
                this.logger.warn(`Andreani quote failed: ${response.status}, falling back to mock`);
                return this.quoteShippingMock(cpDestino, pesoKg);
            }

            const data = await response.json();

            // Parse Andreani response
            const tarifa = data.tarifas?.[0] || data;

            return {
                provider: 'Andreani',
                service: tarifa.servicio || 'Estándar',
                price: Math.round(tarifa.precio || tarifa.tarifaTotal || 0),
                deliveryDays: tarifa.plazoEntrega || 3,
                trackingAvailable: true
            };
        } catch (error) {
            this.logger.error('Andreani quote error:', error);
            return this.quoteShippingMock(cpDestino, pesoKg);
        }
    }

    /**
     * Mock quote for development/testing
     */
    private quoteShippingMock(zipCode: string, weightKg: number): ShippingQuote {
        // Zone multiplier based on postal code
        let zoneMultiplier = 1;
        let deliveryDays = 2;

        if (zipCode.startsWith('1')) {
            zoneMultiplier = 1.0; // CABA
            deliveryDays = 2;
        } else if (zipCode.startsWith('2') || zipCode.startsWith('3')) {
            zoneMultiplier = 1.3; // Santa Fe / Córdoba
            deliveryDays = 3;
        } else if (zipCode.startsWith('4') || zipCode.startsWith('5')) {
            zoneMultiplier = 1.5; // Interior cercano
            deliveryDays = 4;
        } else {
            zoneMultiplier = 2.0; // Interior lejano / Patagonia
            deliveryDays = 5;
        }

        // Base price + weight price
        const basePrice = 3500;
        const pricePerKg = 800;
        const price = (basePrice + (weightKg * pricePerKg)) * zoneMultiplier;

        return {
            provider: 'Andreani',
            service: 'Estándar (demo)',
            price: Math.round(price),
            deliveryDays,
            trackingAvailable: true
        };
    }

    /**
     * Genera etiqueta de envío
     */
    async generateLabel(
        orderId: string,
        senderData: {
            name: string;
            address: string;
            postalCode: string;
            phone: string;
        },
        recipientData: {
            name: string;
            address: string;
            postalCode: string;
            city: string;
            province: string;
            phone: string;
            dni: string;
        },
        packageData: {
            weight: number;
            description: string;
            declaredValue?: number;
        }
    ): Promise<{ trackingNumber: string; labelUrl: string; success: boolean }> {
        const token = await this.authenticate();

        if (token) {
            return this.generateLabelReal(orderId, senderData, recipientData, packageData, token);
        }

        // Mock response
        return {
            trackingNumber: `AND-${Date.now().toString().slice(-8)}`,
            labelUrl: `/api/shipping/label/${orderId}/mock.pdf`,
            success: true
        };
    }

    private async generateLabelReal(
        orderId: string,
        sender: any,
        recipient: any,
        packageData: any,
        token: string
    ): Promise<{ trackingNumber: string; labelUrl: string; success: boolean }> {
        try {
            // Create shipment in Andreani
            const response = await fetch(`${this.apiUrl}/v2/ordenes-de-envio`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-authorization-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contrato: this.credentials.clientId,
                    origen: {
                        postal: { codigoPostal: sender.postalCode },
                        nombre: sender.name,
                        telefono: sender.phone
                    },
                    destino: {
                        postal: {
                            codigoPostal: recipient.postalCode,
                            localidad: recipient.city,
                            provincia: recipient.province,
                            calle: recipient.address
                        },
                        nombre: recipient.name,
                        telefono: recipient.phone,
                        documento: { tipo: 'DNI', numero: recipient.dni }
                    },
                    bultos: [{
                        valorDeclarado: packageData.declaredValue || 0,
                        peso: packageData.weight,
                        referencias: [{ meta: 'orden', valor: orderId }]
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`Andreani create shipment failed: ${error}`);
                throw new Error('Failed to create shipment');
            }

            const data = await response.json();

            return {
                trackingNumber: data.numeroAndreani || data.tracking,
                labelUrl: data.urlEtiqueta || `${this.apiUrl}/v2/ordenes-de-envio/${data.numeroAndreani}/etiqueta`,
                success: true
            };
        } catch (error) {
            this.logger.error('Andreani label generation error:', error);
            return {
                trackingNumber: `ERR-${orderId}`,
                labelUrl: '',
                success: false
            };
        }
    }

    /**
     * Seguimiento de envío
     */
    async trackShipment(trackingNumber: string): Promise<{
        status: string;
        location: string;
        history: Array<{ date: string; status: string; location: string }>;
    }> {
        const token = await this.authenticate();

        if (!token) {
            return {
                status: 'DEMO_MODE',
                location: 'Buenos Aires',
                history: [
                    { date: new Date().toISOString(), status: 'En tránsito', location: 'Buenos Aires' }
                ]
            };
        }

        try {
            const response = await fetch(`${this.apiUrl}/v1/envios/${trackingNumber}/trazas`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-authorization-token': token
                }
            });

            if (!response.ok) {
                throw new Error('Tracking not found');
            }

            const data = await response.json();
            const events = data.eventos || [];

            return {
                status: events[0]?.estado || 'Desconocido',
                location: events[0]?.sucursal || 'N/A',
                history: events.map((e: any) => ({
                    date: e.fecha,
                    status: e.estado,
                    location: e.sucursal || e.localidad
                }))
            };
        } catch (error) {
            this.logger.error('Tracking error:', error);
            return {
                status: 'Error',
                location: 'N/A',
                history: []
            };
        }
    }
}
