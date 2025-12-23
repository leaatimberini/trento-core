import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ZoneService {
    private readonly logger = new Logger(ZoneService.name);

    constructor(private prisma: PrismaService) { }

    // ==================== CRUD ====================

    async createZone(data: {
        name: string;
        code: string;
        description?: string;
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
        polygon?: any;
        deliveryDays?: string[];
        deliveryFee?: number;
        minOrderValue?: number;
    }) {
        return this.prisma.deliveryZone.create({
            data: {
                name: data.name,
                code: data.code.toUpperCase(),
                description: data.description,
                minLat: data.minLat,
                maxLat: data.maxLat,
                minLng: data.minLng,
                maxLng: data.maxLng,
                polygon: data.polygon,
                deliveryDays: data.deliveryDays || ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'],
                deliveryFee: data.deliveryFee,
                minOrderValue: data.minOrderValue
            }
        });
    }

    async getZone(id: string) {
        return this.prisma.deliveryZone.findUnique({
            where: { id }
        });
    }

    async getZones(options: { isActive?: boolean } = {}) {
        const where: any = {};
        if (options.isActive !== undefined) where.isActive = options.isActive;

        return this.prisma.deliveryZone.findMany({
            where,
            orderBy: { name: 'asc' }
        });
    }

    async updateZone(id: string, data: Partial<{
        name: string;
        description: string;
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
        polygon: any;
        deliveryDays: string[];
        deliveryFee: number;
        minOrderValue: number;
        isActive: boolean;
    }>) {
        return this.prisma.deliveryZone.update({
            where: { id },
            data
        });
    }

    // ==================== ZONE LOOKUP ====================

    async findZoneByCoordinates(lat: number, lng: number) {
        // First check bounding boxes
        const zones = await this.prisma.deliveryZone.findMany({
            where: {
                isActive: true,
                minLat: { lte: lat },
                maxLat: { gte: lat },
                minLng: { lte: lng },
                maxLng: { gte: lng }
            }
        });

        if (zones.length === 0) return null;
        if (zones.length === 1) return zones[0];

        // If multiple zones match bbox, check polygon if available
        for (const zone of zones) {
            if (zone.polygon) {
                if (this.pointInPolygon(lat, lng, zone.polygon)) {
                    return zone;
                }
            }
        }

        // Return first match if no polygon
        return zones[0];
    }

    private pointInPolygon(lat: number, lng: number, polygon: any): boolean {
        // Simple ray casting algorithm for GeoJSON polygon
        if (!polygon.coordinates || !polygon.coordinates[0]) return false;

        const ring = polygon.coordinates[0];
        let inside = false;

        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][1], yi = ring[i][0]; // GeoJSON is [lng, lat]
            const xj = ring[j][1], yj = ring[j][0];

            if (((yi > lng) !== (yj > lng)) &&
                (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    async getDeliveryInfo(lat: number, lng: number) {
        const zone = await this.findZoneByCoordinates(lat, lng);

        if (!zone) {
            return {
                available: false,
                message: 'Lo sentimos, no realizamos entregas en esta zona'
            };
        }

        const today = new Date();
        const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
        const todayName = dayNames[today.getDay()];
        const deliversTday = zone.deliveryDays.includes(todayName);

        // Find next delivery day
        let nextDeliveryDay = todayName;
        if (!deliversTday) {
            for (let i = 1; i <= 7; i++) {
                const futureDay = dayNames[(today.getDay() + i) % 7];
                if (zone.deliveryDays.includes(futureDay)) {
                    nextDeliveryDay = futureDay;
                    break;
                }
            }
        }

        return {
            available: true,
            zone: {
                name: zone.name,
                code: zone.code
            },
            deliveryFee: zone.deliveryFee,
            minOrderValue: zone.minOrderValue,
            deliveryDays: zone.deliveryDays,
            deliversToday: deliversTday,
            nextDeliveryDay
        };
    }

    // ==================== COVERAGE MAP ====================

    async getCoverageMap() {
        const zones = await this.prisma.deliveryZone.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                code: true,
                minLat: true,
                maxLat: true,
                minLng: true,
                maxLng: true,
                polygon: true,
                deliveryDays: true
            }
        });

        return {
            type: 'FeatureCollection',
            features: zones.map(zone => ({
                type: 'Feature',
                properties: {
                    id: zone.id,
                    name: zone.name,
                    code: zone.code,
                    deliveryDays: zone.deliveryDays
                },
                geometry: zone.polygon || {
                    type: 'Polygon',
                    coordinates: [[
                        [Number(zone.minLng), Number(zone.minLat)],
                        [Number(zone.maxLng), Number(zone.minLat)],
                        [Number(zone.maxLng), Number(zone.maxLat)],
                        [Number(zone.minLng), Number(zone.maxLat)],
                        [Number(zone.minLng), Number(zone.minLat)]
                    ]]
                }
            }))
        };
    }
}
