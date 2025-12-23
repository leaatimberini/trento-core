import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('warehouses')
export class WarehouseController {
    constructor(private readonly warehouseService: WarehouseService) { }

    @Post()
    @Roles('ADMIN')
    create(@Body() dto: CreateWarehouseDto) {
        return this.warehouseService.create(dto);
    }

    @Get()
    findAll() {
        return this.warehouseService.findAll();
    }
}
