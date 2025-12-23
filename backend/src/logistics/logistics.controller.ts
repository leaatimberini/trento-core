import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { RouteService } from './route.service';
import { ZoneService } from './zone.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VehicleStatus, RouteStatus, DeliveryStopStatus } from '@prisma/client';

// ==================== VEHICLES ====================
@Controller('logistics/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleController {
    constructor(private readonly vehicleService: VehicleService) { }

    @Post()
    @Roles('ADMIN')
    createVehicle(@Body() body: {
        plate: string;
        name: string;
        type?: string;
        maxWeight?: number;
        maxVolume?: number;
        maxPackages?: number;
        driverName?: string;
        driverPhone?: string;
    }) {
        return this.vehicleService.createVehicle(body);
    }

    @Get()
    @Roles('ADMIN')
    getVehicles(
        @Query('status') status?: VehicleStatus,
        @Query('type') type?: string
    ) {
        return this.vehicleService.getVehicles({ status, type });
    }

    @Get('summary')
    @Roles('ADMIN')
    getFleetSummary() {
        return this.vehicleService.getFleetSummary();
    }

    @Get('locations')
    @Roles('ADMIN')
    getCurrentLocations() {
        return this.vehicleService.getCurrentLocations();
    }

    @Get(':id')
    @Roles('ADMIN')
    getVehicle(@Param('id') id: string) {
        return this.vehicleService.getVehicle(id);
    }

    @Put(':id')
    @Roles('ADMIN')
    updateVehicle(@Param('id') id: string, @Body() body: any) {
        return this.vehicleService.updateVehicle(id, body);
    }

    @Post(':id/status')
    @Roles('ADMIN')
    setStatus(@Param('id') id: string, @Body() body: { status: VehicleStatus }) {
        return this.vehicleService.setVehicleStatus(id, body.status);
    }

    @Post(':id/location')
    updateLocation(
        @Param('id') id: string,
        @Body() body: {
            lat: number;
            lng: number;
            speed?: number;
            heading?: number;
            accuracy?: number;
            routeId?: string;
        }
    ) {
        return this.vehicleService.updateLocation(id, body);
    }

    @Get(':id/history')
    @Roles('ADMIN')
    getLocationHistory(
        @Param('id') id: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('limit') limit?: string
    ) {
        return this.vehicleService.getLocationHistory(id, {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            limit: limit ? parseInt(limit) : undefined
        });
    }
}

// ==================== ROUTES ====================
@Controller('logistics/routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RouteController {
    constructor(private readonly routeService: RouteService) { }

    @Post()
    @Roles('ADMIN')
    createRoute(@Body() body: {
        routeDate: string;
        vehicleId?: string;
        driverName?: string;
        plannedStart?: string;
        plannedEnd?: string;
    }) {
        return this.routeService.createRoute({
            routeDate: new Date(body.routeDate),
            vehicleId: body.vehicleId,
            driverName: body.driverName,
            plannedStart: body.plannedStart ? new Date(body.plannedStart) : undefined,
            plannedEnd: body.plannedEnd ? new Date(body.plannedEnd) : undefined
        });
    }

    @Get()
    @Roles('ADMIN')
    getRoutes(
        @Query('date') date?: string,
        @Query('status') status?: RouteStatus,
        @Query('vehicleId') vehicleId?: string
    ) {
        return this.routeService.getRoutes({
            date: date ? new Date(date) : undefined,
            status,
            vehicleId
        });
    }

    @Get('today')
    @Roles('ADMIN')
    getTodayRoutes() {
        return this.routeService.getTodayRoutes();
    }

    @Get(':id')
    @Roles('ADMIN')
    getRoute(@Param('id') id: string) {
        return this.routeService.getRoute(id);
    }

    @Post(':id/stops')
    @Roles('ADMIN')
    addStop(@Param('id') routeId: string, @Body() body: {
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
        return this.routeService.addStop(routeId, body);
    }

    @Post(':id/optimize')
    @Roles('ADMIN')
    optimizeRoute(@Param('id') id: string) {
        return this.routeService.optimizeRoute(id);
    }

    @Post(':id/start')
    @Roles('ADMIN')
    startRoute(@Param('id') id: string) {
        return this.routeService.startRoute(id);
    }

    @Post(':id/complete')
    @Roles('ADMIN')
    completeRoute(@Param('id') id: string) {
        return this.routeService.completeRoute(id);
    }

    // Stop status updates
    @Post('stops/:stopId/status')
    updateStopStatus(
        @Param('stopId') stopId: string,
        @Body() body: { status: DeliveryStopStatus }
    ) {
        return this.routeService.updateStopStatus(stopId, body.status);
    }

    @Post('stops/:stopId/deliver')
    recordDelivery(
        @Param('stopId') stopId: string,
        @Body() body: {
            signature: string;
            photos?: string[];
            receivedBy: string;
            notes?: string;
        }
    ) {
        return this.routeService.recordDelivery(stopId, body);
    }

    @Post('stops/:stopId/fail')
    recordFailure(
        @Param('stopId') stopId: string,
        @Body() body: { reason: string }
    ) {
        return this.routeService.recordFailure(stopId, body.reason);
    }
}

// ==================== ZONES ====================
@Controller('logistics/zones')
export class ZoneController {
    constructor(private readonly zoneService: ZoneService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    createZone(@Body() body: {
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
        return this.zoneService.createZone(body);
    }

    @Get()
    getZones(@Query('active') active?: string) {
        return this.zoneService.getZones({
            isActive: active === 'false' ? false : true
        });
    }

    @Get('coverage')
    getCoverageMap() {
        return this.zoneService.getCoverageMap();
    }

    @Get('check')
    checkDelivery(
        @Query('lat') lat: string,
        @Query('lng') lng: string
    ) {
        return this.zoneService.getDeliveryInfo(parseFloat(lat), parseFloat(lng));
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    getZone(@Param('id') id: string) {
        return this.zoneService.getZone(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    updateZone(@Param('id') id: string, @Body() body: any) {
        return this.zoneService.updateZone(id, body);
    }
}
