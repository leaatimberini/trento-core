import { Module } from '@nestjs/common';
import { BlogController, RecipeController, NewsletterController } from './blog.controller';
import { BlogContentController } from './blog-content.controller';
import { BlogService } from './blog.service';
import { RecipeService } from './recipe.service';
import { NewsletterService } from './newsletter.service';
import { PrismaService } from '../prisma.service';
import { AiAnalyticsModule } from '../ai-analytics/ai-analytics.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiAnalyticsModule, AiModule],
    controllers: [BlogController, RecipeController, NewsletterController, BlogContentController],
    providers: [BlogService, RecipeService, NewsletterService, PrismaService],
    exports: [BlogService, RecipeService, NewsletterService],
})
export class BlogModule { }
