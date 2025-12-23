import { Module } from '@nestjs/common';
import { RemitController } from './remit.controller';
import { RemitService } from './remit.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [RemitController],
    providers: [RemitService, PrismaService],
    exports: [RemitService],
})
export class RemitModule { }
