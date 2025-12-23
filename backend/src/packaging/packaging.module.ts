
import { Module } from '@nestjs/common';
import { PackagingService } from './packaging.service';
import { PackagingController } from './packaging.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [PackagingController],
    providers: [PackagingService, PrismaService],
    exports: [PackagingService]
})
export class PackagingModule { }
