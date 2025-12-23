import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma.service';
import { AuditController } from './audit.controller';

@Global()
@Module({
    providers: [AuditService, PrismaService],
    controllers: [AuditController],
    exports: [AuditService]
})
export class AuditModule { }
