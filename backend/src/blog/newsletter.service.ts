import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OllamaChatService } from '../ai-analytics/ollama-chat.service';

@Injectable()
export class NewsletterService {
    private readonly logger = new Logger(NewsletterService.name);

    constructor(
        private prisma: PrismaService,
        private aiChat: OllamaChatService
    ) { }

    // ==================== SUBSCRIBERS ====================

    async subscribe(data: {
        email: string;
        name?: string;
        interests?: string[];
        customerId?: string;
    }) {
        const existing = await this.prisma.newsletterSubscriber.findUnique({
            where: { email: data.email }
        });

        if (existing) {
            // Reactivate if unsubscribed
            if (!existing.isActive) {
                return this.prisma.newsletterSubscriber.update({
                    where: { email: data.email },
                    data: {
                        isActive: true,
                        unsubscribedAt: null,
                        interests: data.interests || existing.interests
                    }
                });
            }
            return existing;
        }

        return this.prisma.newsletterSubscriber.create({
            data: {
                email: data.email,
                name: data.name,
                interests: data.interests || ['NOVEDADES'],
                customerId: data.customerId,
                confirmedAt: new Date() // Auto-confirm for now
            }
        });
    }

    async unsubscribe(email: string) {
        return this.prisma.newsletterSubscriber.update({
            where: { email },
            data: {
                isActive: false,
                unsubscribedAt: new Date()
            }
        });
    }

    async getSubscribers(options: {
        isActive?: boolean;
        interest?: string;
        limit?: number;
    } = {}) {
        const where: any = {};
        if (options.isActive !== undefined) where.isActive = options.isActive;
        if (options.interest) where.interests = { has: options.interest };

        return this.prisma.newsletterSubscriber.findMany({
            where,
            take: options.limit || 100,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getStats() {
        const total = await this.prisma.newsletterSubscriber.count();
        const active = await this.prisma.newsletterSubscriber.count({
            where: { isActive: true }
        });
        const thisMonth = await this.prisma.newsletterSubscriber.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        });

        return {
            total,
            active,
            inactive: total - active,
            thisMonth,
            activeRate: total > 0 ? Math.round((active / total) * 100) : 0
        };
    }

    // ==================== NEWSLETTER CONTENT ====================

    async generateNewsletterContent(options: {
        type: 'WEEKLY' | 'MONTHLY' | 'PROMO';
        includeProducts?: boolean;
        includeRecipes?: boolean;
    }) {
        const content: any = {
            type: options.type,
            generatedAt: new Date(),
            sections: []
        };

        // Get latest blog posts
        const latestPosts = await this.prisma.blogPost.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { publishedAt: 'desc' },
            take: 3
        });

        if (latestPosts.length > 0) {
            content.sections.push({
                title: 'Últimas Novedades',
                type: 'posts',
                items: latestPosts.map(p => ({
                    title: p.title,
                    excerpt: p.excerpt,
                    slug: p.slug
                }))
            });
        }

        // Get popular recipes
        if (options.includeRecipes) {
            const recipes = await this.prisma.recipe.findMany({
                where: { isPublished: true },
                orderBy: { views: 'desc' },
                take: 2
            });

            if (recipes.length > 0) {
                content.sections.push({
                    title: 'Recetas Destacadas',
                    type: 'recipes',
                    items: recipes.map(r => ({
                        name: r.name,
                        description: r.description,
                        slug: r.slug
                    }))
                });
            }
        }

        // Get featured products
        if (options.includeProducts) {
            const products = await this.prisma.product.findMany({
                take: 4,
                orderBy: { createdAt: 'desc' }
            });

            content.sections.push({
                title: 'Productos Destacados',
                type: 'products',
                items: products.map(p => ({
                    name: p.name,
                    price: p.basePrice
                }))
            });
        }

        return content;
    }

    // ==================== SOCIAL POSTS ====================

    async generateSocialPosts(blogPostId: string) {
        const post = await this.prisma.blogPost.findUnique({
            where: { id: blogPostId }
        });

        if (!post) throw new Error('Post not found');

        const platforms = ['INSTAGRAM', 'FACEBOOK', 'TWITTER'];
        const posts = [];

        for (const platform of platforms) {
            let content = '';
            let hashtags: string[] = [];

            switch (platform) {
                case 'INSTAGRAM':
                    content = `📝 ${post.title}\n\n${post.excerpt}\n\n🔗 Link en bio`;
                    hashtags = ['bebidas', 'argentina', 'tragos', 'cocteleria'];
                    break;
                case 'FACEBOOK':
                    content = `¡Nuevo artículo! 📖\n\n${post.title}\n\n${post.excerpt}\n\n👉 Leelo completo en nuestro blog`;
                    break;
                case 'TWITTER':
                    content = `${post.title.substring(0, 200)} 🍹\n\n#bebidas #argentina`;
                    hashtags = ['bebidas', 'argentina'];
                    break;
            }

            const socialPost = await this.prisma.socialPost.create({
                data: {
                    platform,
                    content,
                    hashtags,
                    blogPostId,
                    suggestedTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            });

            posts.push(socialPost);
        }

        return posts;
    }

    async getSocialPosts(options: {
        platform?: string;
        status?: string;
        limit?: number;
    } = {}) {
        const where: any = {};
        if (options.platform) where.platform = options.platform;
        if (options.status) where.status = options.status;

        return this.prisma.socialPost.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options.limit || 20
        });
    }

    async approveSocialPost(id: string) {
        return this.prisma.socialPost.update({
            where: { id },
            data: { status: 'APPROVED' }
        });
    }

    async markAsPosted(id: string) {
        return this.prisma.socialPost.update({
            where: { id },
            data: {
                status: 'POSTED',
                postedAt: new Date()
            }
        });
    }
}
