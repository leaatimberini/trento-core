import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PackagingService } from './packaging.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logistics/packaging')
@UseGuards(JwtAuthGuard)
export class PackagingController {
    constructor(private service: PackagingService) { }

    @Post('loan')
    loan(@Body() dto: { customerId: string; type: string; quantity: number }) {
        return this.service.loanPackaging(dto.customerId, dto.type, dto.quantity);
    }

    @Post('return')
    returnItems(@Body() dto: { customerId: string; type: string; quantity: number }) {
        return this.service.returnPackaging(dto.customerId, dto.type, dto.quantity);
    }

    @Get(':customerId')
    getBalance(@Param('customerId') customerId: string) {
        return this.service.getBalance(customerId);
    }
}
