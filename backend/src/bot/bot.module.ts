import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { AiModule } from '../ai/ai.module';
import { ProductsModule } from '../products/products.module';
import { WholesaleModule } from '../wholesale/wholesale.module';
import { PrismaService } from '../prisma.service';

@Module({
    imports: [forwardRef(() => AiModule), ProductsModule, WholesaleModule],
    providers: [BotService, PrismaService],
    exports: [BotService],
})
export class BotModule { }
