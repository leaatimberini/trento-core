import { Module } from '@nestjs/common';
import { IncomingOrdersService } from './incoming-orders.service';
import { IncomingOrdersController } from './incoming-orders.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [IncomingOrdersController],
    providers: [IncomingOrdersService, PrismaService],
    exports: [IncomingOrdersService]
})
export class OrdersModule { }
