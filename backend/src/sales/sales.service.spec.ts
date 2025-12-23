
import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { FiscalService } from '../fiscal/fiscal.service';
import { PromotionService } from './promotion.service';
import { MercadoPagoService } from '../integrations/payments/mercadopago.service';
import { PriceListService } from '../pricing/price-list.service';
import { PdfGeneratorService } from '../wholesale/pdf-generator.service';
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
            findMany: jest.fn(),
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

    const mockFiscalService = {
        createInvoice: jest.fn(),
        getNextInvoiceNumber: jest.fn(),
    };

    const mockPromotionService = {
        applyPromotions: jest.fn().mockReturnValue({ discount: 0, appliedPromotions: [] }),
        getActivePromotions: jest.fn().mockReturnValue([]),
    };

    const mockMercadoPagoService = {
        createPreference: jest.fn(),
        processPayment: jest.fn(),
    };

    const mockPriceListService = {
        getPriceForCustomer: jest.fn(),
        getActiveList: jest.fn(),
    };

    const mockPdfGeneratorService = {
        generateSalePdf: jest.fn(),
        generateInvoicePdf: jest.fn(),
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
                {
                    provide: FiscalService,
                    useValue: mockFiscalService,
                },
                {
                    provide: PromotionService,
                    useValue: mockPromotionService,
                },
                {
                    provide: MercadoPagoService,
                    useValue: mockMercadoPagoService,
                },
                {
                    provide: PriceListService,
                    useValue: mockPriceListService,
                },
                {
                    provide: PdfGeneratorService,
                    useValue: mockPdfGeneratorService,
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

            const product = {
                id: 'p1',
                basePrice: 100,
                wholesalePrice: 80
            };
            mockPrisma.product.findUnique.mockResolvedValue(product);
            mockPrisma.product.findMany.mockResolvedValue([product]);
            mockPrisma.sale.create.mockResolvedValue({ id: 's1', code: 'SALE-123' });

            await service.createTransaction(dto as any);

            expect(mockPrisma.sale.create).toHaveBeenCalled();
            expect(inventoryService.deductStock).toHaveBeenCalledWith('p1', 2, undefined, mockPrisma);
        });

        it('should use wholesale price if customer is WHOLESALE', async () => {
            const dto = {
                items: [{ productId: 'p1', quantity: 10 }],
                paymentMethod: 'CASH',
                customerId: 'c1'
            };

            const product = {
                id: 'p1',
                basePrice: 100,
                wholesalePrice: 80
            };
            mockPrisma.customer.findUnique.mockResolvedValue({
                id: 'c1',
                type: 'WHOLESALE'
            });
            mockPrisma.product.findUnique.mockResolvedValue(product);
            mockPrisma.product.findMany.mockResolvedValue([product]);

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
                data: { status: 'CANCELLED' }
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
