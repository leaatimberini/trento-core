
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../notifications/email.service';
import { BotService } from '../bot/bot.service';
import { BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
    let service: InventoryService;
    let prisma: PrismaService;
    let emailService: EmailService;

    const mockPrisma = {
        inventoryItem: {
            findMany: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            upsert: jest.fn(),
            findUnique: jest.fn(),
        },
        inventoryTransaction: {
            create: jest.fn(),
        },
        product: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        warehouse: {
            findFirst: jest.fn().mockResolvedValue({ id: 'warehouse-1', name: 'Main', type: 'DEPOT' }),
            create: jest.fn().mockResolvedValue({ id: 'warehouse-1', name: 'Depósito Central', type: 'DEPOT' }),
        },
        $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const mockEmailService = {
        sendLowStockAlert: jest.fn(),
    };

    const mockBotService = {
        sendAdminNotification: jest.fn(),
        sendAlert: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: BotService,
                    useValue: mockBotService,
                },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
        prisma = module.get<PrismaService>(PrismaService);
        emailService = module.get<EmailService>(EmailService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('deductStock', () => {
        it('should throw BadRequestException if insufficient stock', async () => {
            mockPrisma.inventoryItem.findMany.mockResolvedValue([
                { id: '1', quantity: 5, expirationDate: new Date() },
            ]);

            await expect(service.deductStock('prod1', 10)).rejects.toThrow(BadRequestException);
        });

        it('should deduct from multiple batches (FIFO/FEFO)', async () => {
            const batch1 = { id: '1', quantity: 5, expirationDate: new Date('2024-01-01') };
            const batch2 = { id: '2', quantity: 10, expirationDate: new Date('2024-02-01') };

            mockPrisma.inventoryItem.findMany.mockResolvedValue([batch1, batch2]);

            await service.deductStock('prod1', 8);

            // Should fully deplete batch1 (5) and take 3 from batch2
            expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { quantity: { decrement: 5 } },
            });
            expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
                where: { id: '2' },
                data: { quantity: { decrement: 3 } },
            });
        });

        it('should trigger low stock alert if threshold reached', async () => {
            const batch1 = { id: '1', quantity: 12, expirationDate: new Date() }; // Total 12
            mockPrisma.inventoryItem.findMany.mockResolvedValue([batch1]);
            mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod1', name: 'Test Product', sku: 'TP-01' });

            // Deduct 3, remaining 9 (< 10)
            await service.deductStock('prod1', 3);

            expect(emailService.sendLowStockAlert).toHaveBeenCalled();
        });
    });

    describe('receiveStock', () => {
        it('should upsert inventory item and create transaction', async () => {
            const dto = {
                productId: 'prod1',
                quantity: 100,
                batchNumber: 'BATCH-001',
                locationZone: 'A1',
                expirationDate: new Date().toISOString(),
            };

            await service.receiveStock(dto);

            expect(mockPrisma.inventoryItem.upsert).toHaveBeenCalled();
            expect(mockPrisma.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    type: 'PURCHASE_RECEIPT',
                    quantity: 100
                })
            }));
        });
    });
});
