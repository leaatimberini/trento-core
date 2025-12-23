
import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { ShippingController } from './logistics/shipping.controller';
import { RappiService } from './delivery/rappi.service';
import { PedidosYaService } from './delivery/pedidosya.service';
import { AndreaniService } from './logistics/andreani.service';
import { ArcaService } from './fiscal/arca.service';
import { IntegrationCredentialsService } from './credentials/integration-credentials.service';
import { MercadoLibreService } from './marketplace/mercadolibre.service';
import { MercadoPagoService } from './payments/mercadopago.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [IntegrationsController, ShippingController],
    providers: [
        PrismaService,
        IntegrationCredentialsService,
        MercadoLibreService,
        MercadoPagoService,
        RappiService,
        PedidosYaService,
        AndreaniService,
        ArcaService
    ],
    exports: [
        IntegrationCredentialsService,
        MercadoLibreService,
        MercadoPagoService,
        RappiService,
        PedidosYaService,
        AndreaniService,
        ArcaService
    ]
})
export class IntegrationsModule { }
