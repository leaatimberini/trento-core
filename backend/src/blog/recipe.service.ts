import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface Ingredient {
    productId?: string;
    name: string;
    quantity: string;
    unit: string;
}

interface Step {
    order: number;
    instruction: string;
    tip?: string;
}

const seoUtils = {
    generateSlug: (title: string): string => {
        return title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
};

@Injectable()
export class RecipeService {
    private readonly logger = new Logger(RecipeService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== CRUD ====================

    async createRecipe(data: {
        name: string;
        description?: string;
        difficulty?: string;
        prepTime?: number;
        servings?: number;
        ingredients: Ingredient[];
        steps: Step[];
        category?: string;
        tags?: string[];
        imageUrl?: string;
    }) {
        const slug = seoUtils.generateSlug(data.name);
        const metaDescription = data.description?.substring(0, 155) || `Receta de ${data.name}`;

        return this.prisma.recipe.create({
            data: {
                name: data.name,
                slug,
                description: data.description,
                difficulty: data.difficulty || 'FACIL',
                prepTime: data.prepTime,
                servings: data.servings,
                ingredients: data.ingredients as any,
                steps: data.steps as any,
                category: data.category,
                tags: data.tags || [],
                imageUrl: data.imageUrl,
                metaTitle: `${data.name} - Receta de Trago`,
                metaDescription
            }
        });
    }

    async getRecipe(slug: string) {
        const recipe = await this.prisma.recipe.findUnique({
            where: { slug }
        });

        if (recipe) {
            await this.prisma.recipe.update({
                where: { id: recipe.id },
                data: { views: { increment: 1 } }
            });
        }

        return recipe;
    }

    async getRecipes(options: {
        category?: string;
        difficulty?: string;
        isPublished?: boolean;
        limit?: number;
        offset?: number;
    } = {}) {
        const where: any = {};
        if (options.category) where.category = options.category;
        if (options.difficulty) where.difficulty = options.difficulty;
        if (options.isPublished !== undefined) where.isPublished = options.isPublished;

        return this.prisma.recipe.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options.limit || 20,
            skip: options.offset || 0
        });
    }

    async updateRecipe(id: string, data: Partial<{
        name: string;
        description: string;
        ingredients: Ingredient[];
        steps: Step[];
        difficulty: string;
        category: string;
        isPublished: boolean;
    }>) {
        const updateData: any = { ...data };

        if (data.name) {
            updateData.slug = seoUtils.generateSlug(data.name);
            updateData.metaTitle = `${data.name} - Receta de Trago`;
        }

        if (data.ingredients) {
            updateData.ingredients = data.ingredients as any;
        }

        if (data.steps) {
            updateData.steps = data.steps as any;
        }

        return this.prisma.recipe.update({
            where: { id },
            data: updateData
        });
    }

    async publishRecipe(id: string) {
        return this.prisma.recipe.update({
            where: { id },
            data: { isPublished: true }
        });
    }

    async likeRecipe(id: string) {
        return this.prisma.recipe.update({
            where: { id },
            data: { likes: { increment: 1 } }
        });
    }

    // ==================== SPECIAL QUERIES ====================

    async getPopularRecipes(limit: number = 10) {
        return this.prisma.recipe.findMany({
            where: { isPublished: true },
            orderBy: { views: 'desc' },
            take: limit
        });
    }

    async getRecipesByProduct(productId: string) {
        // Find recipes that include this product in ingredients
        const recipes = await this.prisma.recipe.findMany({
            where: { isPublished: true }
        });

        return recipes.filter(recipe => {
            const ingredients = recipe.ingredients as unknown as Ingredient[];
            return ingredients.some(ing => ing.productId === productId);
        });
    }

    async getCategories() {
        const recipes = await this.prisma.recipe.findMany({
            where: { isPublished: true },
            select: { category: true }
        });

        const categories = [...new Set(recipes.map(r => r.category).filter(Boolean))];

        const counts = await Promise.all(
            categories.map(async (cat) => ({
                category: cat,
                count: await this.prisma.recipe.count({
                    where: { category: cat, isPublished: true }
                })
            }))
        );

        return counts;
    }

    // ==================== SEARCH ====================

    async searchRecipes(query: string) {
        return this.prisma.recipe.findMany({
            where: {
                isPublished: true,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query.toLowerCase() } }
                ]
            },
            take: 20
        });
    }
}
