import { Module } from '@nestjs/common';
import { PriceListService } from './price-list.service';
import { PriceListController } from './price-list.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [PriceListController],
    providers: [PriceListService, PrismaService],
    exports: [PriceListService]
})
export class PricingModule { }
