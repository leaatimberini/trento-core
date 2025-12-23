
import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post('receive')
    receiveStock(@Body() dto: ReceiveStockDto) {
        return this.inventoryService.receiveStock(dto);
    }

    @Post('adjust')
    @Roles('ADMIN')
    adjustStock(@Body() dto: AdjustStockDto, @Request() req) {
        return this.inventoryService.adjustStock(dto, req.user?.userId);
    }

    @Get('adjustments')
    @Roles('ADMIN')
    getAdjustmentHistory(@Query('productId') productId?: string) {
        return this.inventoryService.getAdjustmentHistory(productId);
    }

    @Get('product/:id')
    getStock(@Param('id') id: string) {
        return this.inventoryService.getProductStockDetails(id);
    }

    @Get('alerts')
    @Roles('ADMIN')
    getLowStock() {
        return this.inventoryService.getLowStock(10);
    }

    @Get('alerts/expiring')
    @Roles('ADMIN')
    getExpiringItems(@Query('days') days?: string) {
        return this.inventoryService.getExpiringItems(days ? parseInt(days) : 30);
    }

    @Get('alerts/expired')
    @Roles('ADMIN')
    getExpiredItems() {
        return this.inventoryService.getExpiredItems();
    }

    @Get('alerts/expiration-summary')
    @Roles('ADMIN')
    getExpirationSummary() {
        return this.inventoryService.getExpirationSummary();
    }

    @Get('product/:id/expired-check')
    checkProductExpired(@Param('id') id: string) {
        return this.inventoryService.isProductFullyExpired(id);
    }

    @Post('transfer')
    @Roles('ADMIN')
    transferStock(@Body() dto: any) {
        return this.inventoryService.transferStock(dto);
    }

    @Get('product/:id/details')
    @Roles('ADMIN')
    getProductStockDetails(@Param('id') id: string) {
        return this.inventoryService.getProductStockDetails(id);
    }

    @Get('export')
    @Roles('ADMIN')
    async exportInventory(@Res() res: Response) {
        const csv = await this.inventoryService.exportInventory();
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="inventory.csv"');
        res.send(csv);
    }

    @Post('import')
    @Roles('ADMIN')
    @UseInterceptors(FileInterceptor('file'))
    async importInventory(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File is required');
        return this.inventoryService.importInventory(file.buffer);
    }

    @Post('reorder')
    @Roles('ADMIN')
    triggerReorder() {
        return this.inventoryService.checkAndGenerateReorder();
    }
}


