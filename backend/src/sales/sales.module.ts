
import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PromotionService } from './promotion.service';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { PricingModule } from '../pricing/pricing.module';
import { WholesaleModule } from '../wholesale/wholesale.module';

@Module({
    imports: [InventoryModule, IntegrationsModule, FiscalModule, PricingModule, WholesaleModule],
    controllers: [SalesController],
    providers: [SalesService, PromotionService, PrismaService],
})
export class SalesModule { }
