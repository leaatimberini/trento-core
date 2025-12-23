import { Controller, Post, Body, Get, Param, UseGuards, Request, Delete, Res } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('sales')
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createSaleDto: CreateSaleDto, @Request() req) {
        return this.salesService.createTransaction(createSaleDto, req.user.userId);
    }

    @Post('ecommerce')
    createEcommerce(@Body() dto: any) {
        return this.salesService.createEcommerceSale(dto);
    }

    @Get()
    findAll() {
        return this.salesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.salesService.findOne(id);
    }

    @Post(':id/refund')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    refundSale(@Param('id') id: string) {
        return this.salesService.refundSale(id);
    }

    @Post(':id/void')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    voidSale(@Param('id') id: string) {
        return this.salesService.voidSale(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    deleteSale(@Param('id') id: string) {
        return this.salesService.deleteSale(id);
    }

    @Post(':id/checkout')
    async checkout(@Param('id') id: string) {
        return this.salesService.generateCheckout(id);
    }

    @Get(':id/pdf')
    async getPdf(@Param('id') id: string, @Res() res: any) {
        return this.salesService.generatePdf(id, res);
    }
}

