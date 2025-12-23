import { Module } from '@nestjs/common';
import { MercadoLibreService } from './mercadolibre.service';

@Module({
    providers: [MercadoLibreService],
    exports: [MercadoLibreService]
})
export class IntegrationModule { }
