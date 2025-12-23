
import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { FinanceModule } from '../finance/finance.module';
import { PrismaService } from '../prisma.service';

@Module({
    imports: [
        ProductsModule,
        forwardRef(() => InventoryModule),
        forwardRef(() => FinanceModule)
    ],
    controllers: [AiController],
    providers: [AiService, PrismaService],
    exports: [AiService],
})
export class AiModule { }
