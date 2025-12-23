import { Module } from '@nestjs/common';
import { VehicleController, RouteController, ZoneController } from './logistics.controller';
import { VehicleService } from './vehicle.service';
import { RouteService } from './route.service';
import { ZoneService } from './zone.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [VehicleController, RouteController, ZoneController],
    providers: [VehicleService, RouteService, ZoneService, PrismaService],
    exports: [VehicleService, RouteService, ZoneService],
})
export class LogisticsAdvancedModule { }
