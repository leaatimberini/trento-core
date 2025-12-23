import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RouteStatus, DeliveryStopStatus } from '@prisma/client';

interface Coordinates {
    lat: number;
    lng: number;
}

// Simple distance calculation (Haversine formula)
function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simple nearest neighbor route optimization
function optimizeRoute(stops: Array<{ id: string } & Coordinates>): string[] {
    if (stops.length <= 1) return stops.map(s => s.id);

    const optimized: string[] = [];
    const remaining = [...stops];
    let current = remaining.shift()!;
    optimized.push(current.id);

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversineDistance(current, remaining[i]);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        current = remaining.splice(nearestIdx, 1)[0];
        optimized.push(current.id);
    }

    return optimized;
}

@Injectable()
export class RouteService {
    private readonly logger = new Logger(RouteService.name);
    private routeCounter = 0;

    constructor(private prisma: PrismaService) { }

    // ==================== ROUTE CRUD ====================

    async createRoute(data: {
        routeDate: Date;
        vehicleId?: string;
        driverName?: string;
        plannedStart?: Date;
        plannedEnd?: Date;
    }) {
        this.routeCounter++;
        const code = `RUTA-${new Date().getFullYear()}-${String(this.routeCounter).padStart(4, '0')}`;

        return this.prisma.deliveryRoute.create({
            data: {
                code,
                routeDate: data.routeDate,
                vehicleId: data.vehicleId,
                driverName: data.driverName,
                plannedStart: data.plannedStart,
                plannedEnd: data.plannedEnd
            }
        });
    }

    async getRoute(id: string) {
        return this.prisma.deliveryRoute.findUnique({
            where: { id },
            include: {
                vehicle: true,
                stops: {
                    orderBy: { sequence: 'asc' }
                }
            }
        });
    }

    async getRoutes(options: {
        date?: Date;
        status?: RouteStatus;
        vehicleId?: string;
        limit?: number;
    } = {}) {
        const where: any = {};
        if (options.status) where.status = options.status;
        if (options.vehicleId) where.vehicleId = options.vehicleId;
        if (options.date) {
            const start = new Date(options.date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(options.date);
            end.setHours(23, 59, 59, 999);
            where.routeDate = { gte: start, lte: end };
        }

        return this.prisma.deliveryRoute.findMany({
            where,
            orderBy: { routeDate: 'desc' },
            take: options.limit || 50,
            include: {
                vehicle: true,
                _count: { select: { stops: true } }
            }
        });
    }

    async getTodayRoutes() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.getRoutes({ date: today });
    }

    // ==================== STOPS ====================

    async addStop(routeId: string, data: {
        saleId?: string;
        remitId?: string;
        customerId?: string;
        customerName: string;
        address: string;
        addressNotes?: string;
        phone?: string;
        lat: number;
        lng: number;
    }) {
        // Get current max sequence
        const route = await this.prisma.deliveryRoute.findUnique({
            where: { id: routeId },
            include: { stops: { orderBy: { sequence: 'desc' }, take: 1 } }
        });

        const sequence = route?.stops[0]?.sequence ? route.stops[0].sequence + 1 : 1;

        const stop = await this.prisma.deliveryStop.create({
            data: {
                routeId,
                saleId: data.saleId,
                remitId: data.remitId,
                customerId: data.customerId,
                customerName: data.customerName,
                address: data.address,
                addressNotes: data.addressNotes,
                phone: data.phone,
                lat: data.lat,
                lng: data.lng,
                sequence
            }
        });

        // Update route stats
        await this.prisma.deliveryRoute.update({
            where: { id: routeId },
            data: { totalStops: { increment: 1 } }
        });

        return stop;
    }

    async updateStopStatus(stopId: string, status: DeliveryStopStatus, data?: {
        signature?: string;
        photos?: string[];
        receivedBy?: string;
        deliveryNotes?: string;
        failureReason?: string;
    }) {
        const updateData: any = { status };

        if (status === DeliveryStopStatus.DELIVERED) {
            updateData.completedAt = new Date();
        }

        if (status === DeliveryStopStatus.IN_PROGRESS) {
            updateData.actualArrival = new Date();
        }

        if (data) {
            Object.assign(updateData, data);
        }

        const stop = await this.prisma.deliveryStop.update({
            where: { id: stopId },
            data: updateData
        });

        // Update route stats if delivered
        if (status === DeliveryStopStatus.DELIVERED) {
            await this.prisma.deliveryRoute.update({
                where: { id: stop.routeId },
                data: { completedStops: { increment: 1 } }
            });
        }

        return stop;
    }

    // ==================== ROUTE STATUS ====================

    async startRoute(routeId: string) {
        const route = await this.prisma.deliveryRoute.update({
            where: { id: routeId },
            data: {
                status: RouteStatus.IN_PROGRESS,
                actualStart: new Date()
            }
        });

        // Update vehicle status
        if (route.vehicleId) {
            await this.prisma.vehicle.update({
                where: { id: route.vehicleId },
                data: { status: 'IN_ROUTE' }
            });
        }

        return route;
    }

    async completeRoute(routeId: string) {
        const route = await this.prisma.deliveryRoute.update({
            where: { id: routeId },
            data: {
                status: RouteStatus.COMPLETED,
                actualEnd: new Date()
            }
        });

        // Update vehicle status
        if (route.vehicleId) {
            await this.prisma.vehicle.update({
                where: { id: route.vehicleId },
                data: { status: 'AVAILABLE' }
            });
        }

        return route;
    }

    // ==================== OPTIMIZATION ====================

    async optimizeRoute(routeId: string) {
        const route = await this.prisma.deliveryRoute.findUnique({
            where: { id: routeId },
            include: { stops: true }
        });

        if (!route || route.stops.length < 2) {
            return route;
        }

        const stopsWithCoords = route.stops.map(s => ({
            id: s.id,
            lat: Number(s.lat),
            lng: Number(s.lng)
        }));

        const optimizedOrder = optimizeRoute(stopsWithCoords);

        // Calculate total distance
        let totalDistance = 0;
        for (let i = 0; i < optimizedOrder.length - 1; i++) {
            const current = stopsWithCoords.find(s => s.id === optimizedOrder[i])!;
            const next = stopsWithCoords.find(s => s.id === optimizedOrder[i + 1])!;
            totalDistance += haversineDistance(current, next);
        }

        // Update stop sequences
        for (let i = 0; i < optimizedOrder.length; i++) {
            await this.prisma.deliveryStop.update({
                where: { id: optimizedOrder[i] },
                data: { sequence: i + 1 }
            });
        }

        // Update route
        return this.prisma.deliveryRoute.update({
            where: { id: routeId },
            data: {
                optimizedOrder,
                totalDistance,
                estimatedDuration: Math.round(totalDistance / 30 * 60) // Assume 30 km/h avg
            },
            include: { stops: { orderBy: { sequence: 'asc' } } }
        });
    }

    // ==================== PROOF OF DELIVERY ====================

    async recordDelivery(stopId: string, data: {
        signature: string;
        photos?: string[];
        receivedBy: string;
        notes?: string;
    }) {
        return this.updateStopStatus(stopId, DeliveryStopStatus.DELIVERED, {
            signature: data.signature,
            photos: data.photos,
            receivedBy: data.receivedBy,
            deliveryNotes: data.notes
        });
    }

    async recordFailure(stopId: string, reason: string) {
        return this.updateStopStatus(stopId, DeliveryStopStatus.FAILED, {
            failureReason: reason
        });
    }
}
