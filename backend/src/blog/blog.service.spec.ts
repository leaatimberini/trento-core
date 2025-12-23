import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma.service';
import { OllamaChatService } from '../ai-analytics/ollama-chat.service';

describe('BlogService', () => {
    let service: BlogService;

    const mockPrisma = {
        blogCategory: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        blogPost: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        product: {
            findUnique: jest.fn(),
        },
        recipe: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    };

    const mockOllamaChat = {
        chat: jest.fn().mockResolvedValue({ response: 'AI generated content' }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BlogService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: OllamaChatService,
                    useValue: mockOllamaChat,
                },
            ],
        }).compile();

        service = module.get<BlogService>(BlogService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createCategory', () => {
        it('should create a category with slug', async () => {
            mockPrisma.blogCategory.create.mockResolvedValue({
                id: 'cat1',
                name: 'Test Category',
                slug: 'test-category',
            });

            const result = await service.createCategory({ name: 'Test Category' });

            expect(mockPrisma.blogCategory.create).toHaveBeenCalled();
            expect(result.slug).toBe('test-category');
        });
    });

    describe('createPost', () => {
        it('should create a post with auto-generated SEO', async () => {
            mockPrisma.blogPost.create.mockResolvedValue({
                id: 'post1',
                title: 'Test Post',
                slug: 'test-post',
                metaTitle: 'Test Post',
            });

            const result = await service.createPost({
                title: 'Test Post',
                content: 'This is test content for the blog post.',
            });

            expect(mockPrisma.blogPost.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        slug: 'test-post',
                        metaTitle: 'Test Post',
                    }),
                })
            );
        });
    });

    describe('getPost', () => {
        it('should increment views when getting post', async () => {
            mockPrisma.blogPost.findUnique.mockResolvedValue({
                id: 'post1',
                slug: 'test-post',
                views: 10,
            });
            mockPrisma.blogPost.update.mockResolvedValue({ views: 11 });

            await service.getPost('test-post');

            expect(mockPrisma.blogPost.update).toHaveBeenCalledWith({
                where: { id: 'post1' },
                data: { views: { increment: 1 } },
            });
        });

        it('should return null for non-existent post', async () => {
            mockPrisma.blogPost.findUnique.mockResolvedValue(null);

            const result = await service.getPost('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('generateProductArticle', () => {
        it('should throw for non-existent product', async () => {
            mockPrisma.product.findUnique.mockResolvedValue(null);

            await expect(service.generateProductArticle('non-existent'))
                .rejects.toThrow('Product not found');
        });

        it('should generate article using AI', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'p1',
                name: 'Test Product',
            });
            mockPrisma.blogPost.create.mockResolvedValue({
                id: 'post1',
                title: 'Conocé Test Product: Guía Completa',
            });

            const result = await service.generateProductArticle('p1');

            expect(mockOllamaChat.chat).toHaveBeenCalled();
            expect(mockPrisma.blogPost.create).toHaveBeenCalled();
        });
    });

    describe('getSitemap', () => {
        it('should return posts and recipes', async () => {
            mockPrisma.blogPost.findMany.mockResolvedValue([
                { slug: 'post-1', updatedAt: new Date() },
            ]);
            mockPrisma.recipe.findMany.mockResolvedValue([
                { slug: 'recipe-1', updatedAt: new Date() },
            ]);

            const result = await service.getSitemap();

            expect(result.posts).toHaveLength(1);
            expect(result.recipes).toHaveLength(1);
        });
    });
});
