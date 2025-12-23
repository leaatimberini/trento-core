
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('expenses')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    @Roles('ADMIN')
    create(@Body() createExpenseDto: any) {
        return this.expensesService.create(createExpenseDto);
    }

    @Get()
    @Roles('ADMIN')
    findAll() {
        return this.expensesService.findAll();
    }

    @Get('summary')
    @Roles('ADMIN')
    getSummary(@Query('month') month?: string, @Query('year') year?: string) {
        return this.expensesService.getSummary(
            month ? parseInt(month) : undefined,
            year ? parseInt(year) : undefined
        );
    }

    @Put(':id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() updateExpenseDto: any) {
        return this.expensesService.update(id, updateExpenseDto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id') id: string) {
        return this.expensesService.remove(id);
    }
}
