import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { QuotationService, CreateQuotationDto, UpdateQuotationDto } from './quotation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('wholesale/quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationController {
    constructor(private readonly quotationService: QuotationService) { }

    /**
     * Create a new quotation
     */
    @Post()
    @Roles('ADMIN', 'SELLER')
    create(@Body() dto: CreateQuotationDto, @Request() req: any) {
        return this.quotationService.create(dto, req.user?.id);
    }

    /**
     * Get all quotations with optional filters
     */
    @Get()
    @Roles('ADMIN', 'SELLER')
    findAll(
        @Query('customerId') customerId?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.quotationService.findAll({ customerId, status, search });
    }

    /**
     * Get quotation statistics
     */
    @Get('stats')
    @Roles('ADMIN')
    getStats() {
        return this.quotationService.getStats();
    }

    /**
     * Get single quotation
     */
    @Get(':id')
    @Roles('ADMIN', 'SELLER')
    findOne(@Param('id') id: string) {
        return this.quotationService.findOne(id);
    }

    /**
     * Update quotation (only DRAFT)
     */
    @Put(':id')
    @Roles('ADMIN', 'SELLER')
    update(@Param('id') id: string, @Body() dto: UpdateQuotationDto) {
        return this.quotationService.update(id, dto);
    }

    /**
     * Send quotation to customer
     */
    @Patch(':id/send')
    @Roles('ADMIN', 'SELLER')
    send(@Param('id') id: string) {
        return this.quotationService.send(id);
    }

    /**
     * Accept quotation
     */
    @Patch(':id/accept')
    @Roles('ADMIN', 'SELLER')
    accept(@Param('id') id: string) {
        return this.quotationService.accept(id);
    }

    /**
     * Reject quotation
     */
    @Patch(':id/reject')
    @Roles('ADMIN', 'SELLER')
    reject(@Param('id') id: string, @Body() body: { reason?: string }) {
        return this.quotationService.reject(id, body.reason);
    }

    /**
     * Duplicate quotation
     */
    @Post(':id/duplicate')
    @Roles('ADMIN', 'SELLER')
    duplicate(@Param('id') id: string, @Request() req: any) {
        return this.quotationService.duplicate(id, req.user?.id);
    }

    /**
     * Delete quotation (only DRAFT)
     */
    @Delete(':id')
    @Roles('ADMIN')
    delete(@Param('id') id: string) {
        return this.quotationService.delete(id);
    }

    /**
     * Manual trigger to expire old quotations (for admin testing)
     */
    @Post('expire-old')
    @Roles('ADMIN')
    expireOld() {
        return this.quotationService.expireOldQuotations();
    }
}
