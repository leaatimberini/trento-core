import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { BlogService } from './blog.service';
import { RecipeService } from './recipe.service';
import { NewsletterService } from './newsletter.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BlogStatus, ContentType } from '@prisma/client';

@Controller('blog')
export class BlogController {
    constructor(private readonly blogService: BlogService) { }

    // ==================== CATEGORIES ====================

    @Get('categories')
    getCategories() {
        return this.blogService.getCategories();
    }

    @Post('categories')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    createCategory(@Body() body: { name: string; description?: string; parentId?: string }) {
        return this.blogService.createCategory(body);
    }

    // ==================== POSTS ====================

    @Get('posts')
    getPosts(
        @Query('status') status?: BlogStatus,
        @Query('type') contentType?: ContentType,
        @Query('categoryId') categoryId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ) {
        return this.blogService.getPosts({
            status,
            contentType,
            categoryId,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });
    }

    @Get('posts/:slug')
    getPost(@Param('slug') slug: string) {
        return this.blogService.getPost(slug);
    }

    @Post('posts')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    createPost(@Body() body: {
        title: string;
        content: string;
        excerpt?: string;
        contentType?: ContentType;
        categoryId?: string;
        productIds?: string[];
    }) {
        return this.blogService.createPost(body);
    }

    @Put('posts/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    updatePost(
        @Param('id') id: string,
        @Body() body: { title?: string; content?: string; status?: BlogStatus; categoryId?: string }
    ) {
        return this.blogService.updatePost(id, body);
    }

    @Post('posts/:id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    publishPost(@Param('id') id: string) {
        return this.blogService.publishPost(id);
    }

    // ==================== AI GENERATION ====================

    @Post('generate/product/:productId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    generateProductArticle(@Param('productId') productId: string) {
        return this.blogService.generateProductArticle(productId);
    }

    @Post('generate/recipe/:recipeId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    generateRecipeArticle(@Param('recipeId') recipeId: string) {
        return this.blogService.generateRecipeArticle(recipeId);
    }

    @Post('generate/culture')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    generateCultureArticle(@Body() body: { topic: string }) {
        return this.blogService.generateCultureArticle(body.topic);
    }

    // ==================== SEO ====================

    @Post('posts/:id/schema')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    generateSchema(@Param('id') id: string) {
        return this.blogService.generateSchemaMarkup(id);
    }

    @Get('sitemap')
    getSitemap() {
        return this.blogService.getSitemap();
    }
}

@Controller('recipes')
export class RecipeController {
    constructor(private readonly recipeService: RecipeService) { }

    @Get()
    getRecipes(
        @Query('category') category?: string,
        @Query('difficulty') difficulty?: string,
        @Query('published') published?: string,
        @Query('limit') limit?: string
    ) {
        return this.recipeService.getRecipes({
            category,
            difficulty,
            isPublished: published === 'true' ? true : undefined,
            limit: limit ? parseInt(limit) : undefined
        });
    }

    @Get('categories')
    getCategories() {
        return this.recipeService.getCategories();
    }

    @Get('popular')
    getPopular(@Query('limit') limit?: string) {
        return this.recipeService.getPopularRecipes(limit ? parseInt(limit) : 10);
    }

    @Get('search')
    search(@Query('q') query: string) {
        return this.recipeService.searchRecipes(query);
    }

    @Get('product/:productId')
    getByProduct(@Param('productId') productId: string) {
        return this.recipeService.getRecipesByProduct(productId);
    }

    @Get(':slug')
    getRecipe(@Param('slug') slug: string) {
        return this.recipeService.getRecipe(slug);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    createRecipe(@Body() body: {
        name: string;
        description?: string;
        difficulty?: string;
        prepTime?: number;
        servings?: number;
        ingredients: any[];
        steps: any[];
        category?: string;
        tags?: string[];
    }) {
        return this.recipeService.createRecipe(body);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    updateRecipe(
        @Param('id') id: string,
        @Body() body: any
    ) {
        return this.recipeService.updateRecipe(id, body);
    }

    @Post(':id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    publishRecipe(@Param('id') id: string) {
        return this.recipeService.publishRecipe(id);
    }

    @Post(':id/like')
    likeRecipe(@Param('id') id: string) {
        return this.recipeService.likeRecipe(id);
    }
}

@Controller('newsletter')
export class NewsletterController {
    constructor(private readonly newsletterService: NewsletterService) { }

    @Post('subscribe')
    subscribe(@Body() body: { email: string; name?: string; interests?: string[] }) {
        return this.newsletterService.subscribe(body);
    }

    @Post('unsubscribe')
    unsubscribe(@Body() body: { email: string }) {
        return this.newsletterService.unsubscribe(body.email);
    }

    @Get('subscribers')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    getSubscribers(
        @Query('active') active?: string,
        @Query('interest') interest?: string
    ) {
        return this.newsletterService.getSubscribers({
            isActive: active === 'true' ? true : active === 'false' ? false : undefined,
            interest
        });
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    getStats() {
        return this.newsletterService.getStats();
    }

    @Post('content')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    generateContent(@Body() body: {
        type: 'WEEKLY' | 'MONTHLY' | 'PROMO';
        includeProducts?: boolean;
        includeRecipes?: boolean;
    }) {
        return this.newsletterService.generateNewsletterContent(body);
    }

    // ==================== SOCIAL POSTS ====================

    @Get('social')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    getSocialPosts(
        @Query('platform') platform?: string,
        @Query('status') status?: string
    ) {
        return this.newsletterService.getSocialPosts({ platform, status });
    }

    @Post('social/generate/:postId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    generateSocial(@Param('postId') postId: string) {
        return this.newsletterService.generateSocialPosts(postId);
    }

    @Post('social/:id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    approveSocial(@Param('id') id: string) {
        return this.newsletterService.approveSocialPost(id);
    }

    @Post('social/:id/posted')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    markPosted(@Param('id') id: string) {
        return this.newsletterService.markAsPosted(id);
    }
}
