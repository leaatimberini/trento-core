import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CashShiftService } from './cash-shift.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('finance/shift')
export class CashShiftController {
    constructor(private readonly shiftService: CashShiftService) { }

    @UseGuards(JwtAuthGuard)
    @Get('active')
    async getActiveShift(@Request() req) {
        return this.shiftService.getActiveShift(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('open')
    async openShift(@Request() req, @Body() body: { initialCash: number }) {
        return this.shiftService.openShift(req.user.userId, body.initialCash);
    }

    @UseGuards(JwtAuthGuard)
    @Get('summary')
    async getShiftSummary(@Request() req) {
        return this.shiftService.getShiftSummary(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('close')
    async closeShift(@Request() req, @Body() body: { finalCash: number }) {
        return this.shiftService.closeShift(req.user.userId, body.finalCash);
    }
}
