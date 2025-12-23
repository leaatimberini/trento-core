import { Module, forwardRef } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from '../prisma.service';

import { NotificationsModule } from '../notifications/notifications.module';

import { BotModule } from '../bot/bot.module';

@Module({
    imports: [NotificationsModule, forwardRef(() => BotModule)],
    controllers: [InventoryController],
    providers: [InventoryService, PrismaService],
    exports: [InventoryService]
})
export class InventoryModule { }
