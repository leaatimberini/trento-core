
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('warehouses')
export class WarehouseController {
    constructor(private readonly warehouseService: WarehouseService) { }

    @Post()
    @Roles('ADMIN')
    create(@Body() createWarehouseDto: { name: string; address?: string; type?: string }) {
        return this.warehouseService.create(createWarehouseDto);
    }

    @Get()
    findAll() {
        return this.warehouseService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.warehouseService.findOne(id);
    }

    @Patch(':id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() updateWarehouseDto: { name?: string; address?: string; isActive?: boolean }) {
        return this.warehouseService.update(id, updateWarehouseDto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id') id: string) {
        return this.warehouseService.remove(id);
    }
}
