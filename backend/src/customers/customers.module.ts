
import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerProfileController } from './customer-profile.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [CustomersController, CustomerProfileController],
    providers: [CustomersService, PrismaService],
    exports: [CustomersService],
})
export class CustomersModule { }
