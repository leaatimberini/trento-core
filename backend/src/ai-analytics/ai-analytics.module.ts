import { Module } from '@nestjs/common';
import { AiAnalyticsController } from './ai-analytics.controller';
import { AiAnalyticsService } from './ai-analytics.service';
import { OllamaChatController } from './ollama-chat.controller';
import { OllamaChatService } from './ollama-chat.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [AiAnalyticsController, OllamaChatController],
    providers: [AiAnalyticsService, OllamaChatService, PrismaService],
    exports: [AiAnalyticsService, OllamaChatService],
})
export class AiAnalyticsModule { }
