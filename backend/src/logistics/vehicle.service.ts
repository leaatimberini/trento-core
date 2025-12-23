import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VehicleStatus } from '@prisma/client';

@Injectable()
export class VehicleService {
    private readonly logger = new Logger(VehicleService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== CRUD ====================

    async createVehicle(data: {
        plate: string;
        name: string;
        type?: string;
        maxWeight?: number;
        maxVolume?: number;
        maxPackages?: number;
        driverName?: string;
        driverPhone?: string;
    }) {
        return this.prisma.vehicle.create({
            data: {
                plate: data.plate.toUpperCase(),
                name: data.name,
                type: data.type || 'CAMION',
                maxWeight: data.maxWeight,
                maxVolume: data.maxVolume,
                maxPackages: data.maxPackages,
                driverName: data.driverName,
                driverPhone: data.driverPhone
            }
        });
    }

    async getVehicle(id: string) {
        return this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                routes: {
                    take: 10,
                    orderBy: { routeDate: 'desc' }
                },
                locations: {
                    take: 1,
                    orderBy: { recordedAt: 'desc' }
                }
            }
        });
    }

    async getVehicles(options: {
        status?: VehicleStatus;
        type?: string;
    } = {}) {
        const where: any = {};
        if (options.status) where.status = options.status;
        if (options.type) where.type = options.type;

        return this.prisma.vehicle.findMany({
            where,
            orderBy: { name: 'asc' }
        });
    }

    async updateVehicle(id: string, data: Partial<{
        name: string;
        type: string;
        maxWeight: number;
        maxVolume: number;
        maxPackages: number;
        status: VehicleStatus;
        driverName: string;
        driverPhone: string;
    }>) {
        return this.prisma.vehicle.update({
            where: { id },
            data
        });
    }

    async setVehicleStatus(id: string, status: VehicleStatus) {
        return this.prisma.vehicle.update({
            where: { id },
            data: { status }
        });
    }

    // ==================== LOCATION ====================

    async updateLocation(vehicleId: string, data: {
        lat: number;
        lng: number;
        speed?: number;
        heading?: number;
        accuracy?: number;
        routeId?: string;
        eventType?: string;
    }) {
        // Update current position
        await this.prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                currentLat: data.lat,
                currentLng: data.lng,
                lastLocationAt: new Date()
            }
        });

        // Record in history
        return this.prisma.vehicleLocation.create({
            data: {
                vehicleId,
                lat: data.lat,
                lng: data.lng,
                speed: data.speed,
                heading: data.heading,
                accuracy: data.accuracy,
                routeId: data.routeId,
                eventType: data.eventType || 'TRACKING'
            }
        });
    }

    async getLocationHistory(vehicleId: string, options: {
        from?: Date;
        to?: Date;
        limit?: number;
    } = {}) {
        const where: any = { vehicleId };

        if (options.from || options.to) {
            where.recordedAt = {};
            if (options.from) where.recordedAt.gte = options.from;
            if (options.to) where.recordedAt.lte = options.to;
        }

        return this.prisma.vehicleLocation.findMany({
            where,
            orderBy: { recordedAt: 'desc' },
            take: options.limit || 100
        });
    }

    async getCurrentLocations() {
        return this.prisma.vehicle.findMany({
            where: {
                status: { in: ['AVAILABLE', 'IN_ROUTE'] },
                currentLat: { not: null }
            },
            select: {
                id: true,
                plate: true,
                name: true,
                status: true,
                currentLat: true,
                currentLng: true,
                lastLocationAt: true,
                driverName: true
            }
        });
    }

    // ==================== FLEET SUMMARY ====================

    async getFleetSummary() {
        const vehicles = await this.prisma.vehicle.findMany();

        const byStatus = vehicles.reduce((acc, v) => {
            acc[v.status] = (acc[v.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const byType = vehicles.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const todayRoutes = await this.prisma.deliveryRoute.count({
            where: {
                routeDate: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        return {
            total: vehicles.length,
            byStatus,
            byType,
            todayRoutes
        };
    }
}
