import { Module } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';
import { PackagingService } from './packaging.service';
import { PackagingController } from './packaging.controller';
import { DistributionService } from './distribution.service';
import { PrismaService } from '../prisma.service';

import { DistributionController } from './distribution.controller';

@Module({
    controllers: [WarehouseController, PackagingController, DistributionController],
    providers: [WarehouseService, PackagingService, DistributionService, PrismaService],
    exports: [WarehouseService, PackagingService, DistributionService],
})
export class LogisticsModule { }
