import { Test, TestingModule } from '@nestjs/testing';
import { RouteService } from './route.service';
import { PrismaService } from '../prisma.service';

describe('RouteService', () => {
    let service: RouteService;

    const mockPrisma = {
        deliveryRoute: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        deliveryStop: {
            create: jest.fn(),
            update: jest.fn(),
        },
        vehicle: {
            update: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RouteService,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();

        service = module.get<RouteService>(RouteService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createRoute', () => {
        it('should create a route with auto-generated code', async () => {
            mockPrisma.deliveryRoute.create.mockResolvedValue({
                id: 'r1',
                code: 'RUTA-2024-0001',
                routeDate: new Date(),
            });

            const result = await service.createRoute({
                routeDate: new Date(),
            });

            expect(mockPrisma.deliveryRoute.create).toHaveBeenCalled();
            expect(result.code).toMatch(/^RUTA-/);
        });
    });

    describe('addStop', () => {
        it('should add stop with correct sequence', async () => {
            mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
                id: 'r1',
                stops: [{ sequence: 2 }],
            });
            mockPrisma.deliveryStop.create.mockResolvedValue({
                id: 's1',
                sequence: 3,
            });
            mockPrisma.deliveryRoute.update.mockResolvedValue({});

            const result = await service.addStop('r1', {
                customerName: 'Test Customer',
                address: '123 Test St',
                lat: -34.6,
                lng: -58.4,
            });

            expect(result.sequence).toBe(3);
        });

        it('should start sequence at 1 for empty route', async () => {
            mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
                id: 'r1',
                stops: [],
            });
            mockPrisma.deliveryStop.create.mockResolvedValue({
                id: 's1',
                sequence: 1,
            });
            mockPrisma.deliveryRoute.update.mockResolvedValue({});

            const result = await service.addStop('r1', {
                customerName: 'First Customer',
                address: '456 First St',
                lat: -34.6,
                lng: -58.4,
            });

            expect(result.sequence).toBe(1);
        });
    });

    describe('optimizeRoute', () => {
        it('should return route if less than 2 stops', async () => {
            mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
                id: 'r1',
                stops: [{ id: 's1', lat: -34.6, lng: -58.4 }],
            });

            const result = await service.optimizeRoute('r1');

            expect(result?.stops).toHaveLength(1);
        });

        it('should optimize multi-stop route', async () => {
            mockPrisma.deliveryRoute.findUnique.mockResolvedValue({
                id: 'r1',
                stops: [
                    { id: 's1', lat: -34.6, lng: -58.4 },
                    { id: 's2', lat: -34.7, lng: -58.5 },
                    { id: 's3', lat: -34.65, lng: -58.45 },
                ],
            });
            mockPrisma.deliveryStop.update.mockResolvedValue({});
            mockPrisma.deliveryRoute.update.mockResolvedValue({
                id: 'r1',
                optimizedOrder: ['s1', 's3', 's2'],
            });

            const result = await service.optimizeRoute('r1');

            expect(mockPrisma.deliveryRoute.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        optimizedOrder: expect.any(Array),
                        totalDistance: expect.any(Number),
                    }),
                })
            );
        });
    });

    describe('startRoute', () => {
        it('should set route to IN_PROGRESS and vehicle to IN_ROUTE', async () => {
            mockPrisma.deliveryRoute.update.mockResolvedValue({
                id: 'r1',
                status: 'IN_PROGRESS',
                vehicleId: 'v1',
            });
            mockPrisma.vehicle.update.mockResolvedValue({});

            await service.startRoute('r1');

            expect(mockPrisma.deliveryRoute.update).toHaveBeenCalledWith({
                where: { id: 'r1' },
                data: expect.objectContaining({
                    status: 'IN_PROGRESS',
                }),
            });
            expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({
                where: { id: 'v1' },
                data: { status: 'IN_ROUTE' },
            });
        });
    });

    describe('recordDelivery', () => {
        it('should update stop with POD data', async () => {
            mockPrisma.deliveryStop.update.mockResolvedValue({
                id: 's1',
                status: 'DELIVERED',
                signature: 'base64...',
                receivedBy: 'John Doe',
            });
            mockPrisma.deliveryRoute.update.mockResolvedValue({});

            const result = await service.recordDelivery('s1', {
                signature: 'base64...',
                receivedBy: 'John Doe',
            });

            expect(result.status).toBe('DELIVERED');
            expect(result.receivedBy).toBe('John Doe');
        });
    });
});
