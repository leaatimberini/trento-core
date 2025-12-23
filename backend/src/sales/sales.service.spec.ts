
import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SalesService', () => {
    let service: SalesService;
    let prisma: PrismaService;
    let inventoryService: InventoryService;

    const mockPrisma = {
        sale: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        product: {
            findUnique: jest.fn(),
        },
        customer: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const mockInventoryService = {
        deductStock: jest.fn(),
        restoreStock: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SalesService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: InventoryService,
                    useValue: mockInventoryService,
                },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
        prisma = module.get<PrismaService>(PrismaService);
        inventoryService = module.get<InventoryService>(InventoryService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTransaction', () => {
        it('should create a sale and deduct stock', async () => {
            const dto = {
                items: [{ productId: 'p1', quantity: 2 }],
                paymentMethod: 'CASH',
            };

            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'p1',
                basePrice: 100,
                wholesalePrice: 80
            });
            mockPrisma.sale.create.mockResolvedValue({ id: 's1', code: 'SALE-123' });

            await service.createTransaction(dto as any);

            expect(mockPrisma.sale.create).toHaveBeenCalled();
            expect(inventoryService.deductStock).toHaveBeenCalledWith('p1', 2, mockPrisma);
        });

        it('should use wholesale price if customer is WHOLESALE', async () => {
            const dto = {
                items: [{ productId: 'p1', quantity: 10 }],
                paymentMethod: 'CASH',
                customerId: 'c1'
            };

            mockPrisma.customer.findUnique.mockResolvedValue({
                id: 'c1',
                type: 'WHOLESALE'
            });
            mockPrisma.product.findUnique.mockResolvedValue({
                id: 'p1',
                basePrice: 100,
                wholesalePrice: 80
            });

            await service.createTransaction(dto as any);

            expect(mockPrisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    totalAmount: 800 // 80 * 10
                })
            }));
        });
    });

    describe('refundSale', () => {
        it('should refund sale and restore stock', async () => {
            mockPrisma.sale.findUnique.mockResolvedValue({
                id: 's1',
                status: 'COMPLETED',
                items: [{ productId: 'p1', quantity: 2 }]
            });

            await service.refundSale('s1');

            expect(inventoryService.restoreStock).toHaveBeenCalledWith('p1', 2);
            expect(mockPrisma.sale.update).toHaveBeenCalledWith({
                where: { id: 's1' },
                data: { status: 'REFUNDED' }
            });
        });

        it('should throw if sale already refunded', async () => {
            mockPrisma.sale.findUnique.mockResolvedValue({
                id: 's1',
                status: 'REFUNDED',
                items: []
            });

            await expect(service.refundSale('s1')).rejects.toThrow(BadRequestException);
        });
    });
});
