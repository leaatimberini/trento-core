import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { BlogStatus, ContentType } from '@prisma/client';

// SEO utilities
const seoUtils = {
    generateSlug: (title: string): string => {
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    },

    generateMetaDescription: (content: string, maxLength: number = 155): string => {
        const cleaned = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (cleaned.length <= maxLength) return cleaned;
        return cleaned.substring(0, maxLength - 3) + '...';
    },

    generateKeywords: (title: string, content: string): string[] => {
        const text = `${title} ${content}`.toLowerCase();
        const words = text.split(/\s+/);
        const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'con', 'para', 'por', 'que', 'es', 'y', 'a'];
        const keywords = words
            .filter(w => w.length > 3 && !stopWords.includes(w))
            .reduce((acc, word) => {
                acc[word] = (acc[word] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        return Object.entries(keywords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
};

// Content templates
const CONTENT_TEMPLATES = {
    PRODUCT_ARTICLE: {
        prompt: (product: any) => `
Escribe un artículo SEO de 500 palabras sobre el producto "${product.name}".
Incluye:
- Descripción detallada del producto
- Características y beneficios
- Maridajes o usos recomendados
- Por qué elegir este producto
Usa un tono profesional pero accesible para Argentina.
`,
        structure: ['Introducción', 'Características', 'Beneficios', 'Maridajes', 'Conclusión']
    },
    RECIPE: {
        prompt: (recipe: any) => `
Escribe una receta de coctelería para "${recipe.name}".
Incluye una introducción atractiva, historia del trago si es clásico,
y tips de preparación. Usa medidas argentinas.
`,
        structure: ['Historia', 'Ingredientes', 'Preparación', 'Tips', 'Variaciones']
    },
    CULTURE: {
        prompt: (topic: string) => `
Escribe un artículo cultural sobre "${topic}" relacionado con el mundo de las bebidas.
Incluye historia, datos interesantes, y conexión con Argentina.
500-700 palabras, tono informativo y entretenido.
`,
        structure: ['Historia', 'Curiosidades', 'En Argentina', 'Conclusión']
    }
};

@Injectable()
export class BlogService {
    private readonly logger = new Logger(BlogService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService
    ) { }

    // ==================== CATEGORIES ====================

    async createCategory(data: { name: string; description?: string; parentId?: string }) {
        const slug = seoUtils.generateSlug(data.name);

        return this.prisma.blogCategory.create({
            data: {
                name: data.name,
                slug,
                description: data.description,
                parentId: data.parentId
            }
        });
    }

    async getCategories() {
        return this.prisma.blogCategory.findMany({
            where: { parentId: null },
            include: {
                children: true,
                _count: { select: { posts: true } }
            }
        });
    }

    // ==================== BLOG POSTS ====================

    async createPost(data: {
        title: string;
        content: string;
        excerpt?: string;
        contentType?: ContentType;
        categoryId?: string;
        authorId?: string;
        productIds?: string[];
    }) {
        const slug = seoUtils.generateSlug(data.title);
        const metaDescription = data.excerpt || seoUtils.generateMetaDescription(data.content);
        const metaKeywords = seoUtils.generateKeywords(data.title, data.content).join(', ');

        return this.prisma.blogPost.create({
            data: {
                title: data.title,
                slug,
                content: data.content,
                excerpt: data.excerpt || metaDescription,
                contentType: data.contentType || ContentType.PRODUCT_ARTICLE,
                metaTitle: data.title,
                metaDescription,
                metaKeywords,
                categoryId: data.categoryId,
                authorId: data.authorId,
                productIds: data.productIds || []
            }
        });
    }

    async getPost(slug: string) {
        const post = await this.prisma.blogPost.findUnique({
            where: { slug },
            include: { category: true }
        });

        if (post) {
            // Increment views
            await this.prisma.blogPost.update({
                where: { id: post.id },
                data: { views: { increment: 1 } }
            });
        }

        return post;
    }

    async getPosts(options: {
        status?: BlogStatus;
        contentType?: ContentType;
        categoryId?: string;
        limit?: number;
        offset?: number;
    } = {}) {
        const where: any = {};
        if (options.status) where.status = options.status;
        if (options.contentType) where.contentType = options.contentType;
        if (options.categoryId) where.categoryId = options.categoryId;

        return this.prisma.blogPost.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options.limit || 20,
            skip: options.offset || 0,
            include: { category: true }
        });
    }

    async updatePost(id: string, data: Partial<{
        title: string;
        content: string;
        excerpt: string;
        status: BlogStatus;
        categoryId: string;
    }>) {
        const updateData: any = { ...data };

        if (data.title) {
            updateData.slug = seoUtils.generateSlug(data.title);
            updateData.metaTitle = data.title;
        }

        if (data.content) {
            updateData.metaDescription = seoUtils.generateMetaDescription(data.content);
            updateData.metaKeywords = seoUtils.generateKeywords(data.title || '', data.content).join(', ');
        }

        return this.prisma.blogPost.update({
            where: { id },
            data: updateData
        });
    }

    async publishPost(id: string) {
        return this.prisma.blogPost.update({
            where: { id },
            data: {
                status: BlogStatus.PUBLISHED,
                publishedAt: new Date()
            }
        });
    }

    // ==================== AI CONTENT GENERATION ====================

    async generateProductArticle(productId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) throw new Error('Product not found');

        const prompt = CONTENT_TEMPLATES.PRODUCT_ARTICLE.prompt(product);
        const content = await this.aiService.generateContent(prompt);

        // Create draft post
        return this.createPost({
            title: `Conocé ${product.name}: Guía Completa`,
            content: content,
            contentType: ContentType.PRODUCT_ARTICLE,
            productIds: [productId]
        });
    }

    async generateRecipeArticle(recipeId: string) {
        const recipe = await this.prisma.recipe.findUnique({
            where: { id: recipeId }
        });

        if (!recipe) throw new Error('Recipe not found');

        const prompt = CONTENT_TEMPLATES.RECIPE.prompt(recipe);
        const content = await this.aiService.generateContent(prompt);

        return this.createPost({
            title: `Cómo preparar ${recipe.name} - Receta Completa`,
            content: content,
            contentType: ContentType.RECIPE
        });
    }

    async generateCultureArticle(topic: string) {
        const prompt = CONTENT_TEMPLATES.CULTURE.prompt(topic);
        const content = await this.aiService.generateContent(prompt);

        return this.createPost({
            title: topic,
            content: content,
            contentType: ContentType.CULTURE
        });
    }

    // ==================== SEO ====================

    async generateSchemaMarkup(postId: string) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: postId },
            include: { category: true }
        });

        if (!post) return null;

        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.metaDescription,
            image: post.featuredImage,
            author: {
                '@type': 'Organization',
                name: 'Trento Bebidas'
            },
            publisher: {
                '@type': 'Organization',
                name: 'Trento Bebidas'
            },
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.updatedAt.toISOString()
        };

        await this.prisma.blogPost.update({
            where: { id: postId },
            data: { schemaMarkup: schema }
        });

        return schema;
    }

    async getSitemap() {
        const posts = await this.prisma.blogPost.findMany({
            where: { status: BlogStatus.PUBLISHED },
            select: { slug: true, updatedAt: true }
        });

        const recipes = await this.prisma.recipe.findMany({
            where: { isPublished: true },
            select: { slug: true, updatedAt: true }
        });

        return {
            posts: posts.map(p => ({
                url: `/blog/${p.slug}`,
                lastmod: p.updatedAt.toISOString()
            })),
            recipes: recipes.map(r => ({
                url: `/recetas/${r.slug}`,
                lastmod: r.updatedAt.toISOString()
            }))
        };
    }
}
