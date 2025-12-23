
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('suppliers')
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Get()
    findAll() {
        return this.suppliersService.findAll();
    }

    @Post()
    @Roles('ADMIN')
    create(@Body() body: any) {
        return this.suppliersService.create(body);
    }

    @Put(':id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() body: any) {
        return this.suppliersService.update(id, body);
    }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id') id: string) {
        return this.suppliersService.remove(id);
    }
}
