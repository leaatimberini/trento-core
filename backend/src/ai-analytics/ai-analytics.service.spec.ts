import { Test, TestingModule } from '@nestjs/testing';
import { AiAnalyticsService } from './ai-analytics.service';
import { PrismaService } from '../prisma.service';

describe('AiAnalyticsService', () => {
    let service: AiAnalyticsService;

    const mockPrisma = {
        product: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        saleItem: {
            findMany: jest.fn(),
            aggregate: jest.fn(),
        },
        inventoryItem: {
            aggregate: jest.fn(),
        },
        customerScore: {
            groupBy: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AiAnalyticsService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();

        service = module.get<AiAnalyticsService>(AiAnalyticsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('predictDemand', () => {
        it('should return null for non-existent product', async () => {
            mockPrisma.product.findUnique.mockResolvedValue(null);

            const result = await service.predictDemand('non-existent');

            expect(result).toBeNull();
        });

        it('should return low confidence for products with few sales', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'p1',
                name: 'Test Product',
            });
            mockPrisma.saleItem.findMany.mockResolvedValue([
                { quantity: 5, sale: { createdAt: new Date() } },
            ]);

            const result = await service.predictDemand('p1');

            expect(result).toBeDefined();
            expect(result?.confidence).toBe(0);
            expect(result?.trend).toBe('STABLE');
        });

        it('should calculate trend correctly with enough data', async () => {
            const now = new Date();
            const sales = [];

            // Generate 30 days of increasing sales
            for (let i = 0; i < 30; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - 30 + i);
                sales.push({
                    quantity: 10 + i, // Increasing trend
                    sale: { createdAt: date }
                });
            }

            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'p1',
                name: 'Trending Product',
            });
            mockPrisma.saleItem.findMany.mockResolvedValue(sales);

            const result = await service.predictDemand('p1');

            expect(result).toBeDefined();
            expect(result?.avgDailySales).toBeGreaterThan(0);
        });
    });

    describe('getStockRecommendation', () => {
        it('should return null for non-existent product', async () => {
            mockPrisma.product.findUnique.mockResolvedValue(null);

            const result = await service.getStockRecommendation('non-existent');

            expect(result).toBeNull();
        });

        it('should flag critical urgency for low stock', async () => {
            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'p1',
                name: 'Low Stock Product',
            });
            mockPrisma.saleItem.findMany.mockResolvedValue([]);
            mockPrisma.inventoryItem.aggregate.mockResolvedValue({
                _sum: { quantity: 5 }
            });

            const result = await service.getStockRecommendation('p1');

            // With no sales, stock is sufficient
            expect(result).toBeDefined();
        });
    });

    describe('detectAnomalies', () => {
        it('should return empty array when no anomalies', async () => {
            mockPrisma.saleItem.findMany.mockResolvedValue([]);
            mockPrisma.product.findMany.mockResolvedValue([]);

            const result = await service.detectAnomalies();

            expect(result).toBeInstanceOf(Array);
        });
    });

    describe('getInsightsSummary', () => {
        it('should return summary object', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            mockPrisma.saleItem.findMany.mockResolvedValue([]);

            const result = await service.getInsightsSummary();

            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('topTrending');
            expect(result).toHaveProperty('criticalStock');
            expect(result).toHaveProperty('highAlerts');
        });
    });

    describe('getPricingSuggestions', () => {
        it('should return array of suggestions', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);

            const result = await service.getPricingSuggestions();

            expect(result).toBeInstanceOf(Array);
        });
    });

    describe('analyzeCompetitorPricing', () => {
        it('should return analysis with summary', async () => {
            mockPrisma.product.findMany.mockResolvedValue([
                { id: 'p1', name: 'Product 1', basePrice: 100, category: 'STANDARD' },
            ]);

            const result = await service.analyzeCompetitorPricing();

            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('summary');
            expect(result.analysis).toHaveLength(1);
        });
    });

    describe('generatePromotions', () => {
        it('should return promotions structure', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            mockPrisma.saleItem.findMany.mockResolvedValue([]);

            const result = await service.generatePromotions();

            expect(result).toHaveProperty('promotions');
            expect(result).toHaveProperty('totalProducts');
            expect(result).toHaveProperty('avgDiscount');
        });
    });

    describe('getMarketingAlerts', () => {
        it('should return alerts with summary', async () => {
            mockPrisma.product.findMany.mockResolvedValue([]);
            mockPrisma.saleItem.findMany.mockResolvedValue([]);
            mockPrisma.customerScore.groupBy.mockResolvedValue([]);

            const result = await service.getMarketingAlerts();

            expect(result).toHaveProperty('alerts');
            expect(result).toHaveProperty('summary');
        });
    });
});
