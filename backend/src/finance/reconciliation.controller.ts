import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('finance/reconciliation')
export class ReconciliationController {
    constructor(private readonly reconciliationService: ReconciliationService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    async reconcile(@Body() body: { statement: any[] }) {
        return this.reconciliationService.reconcile(body.statement || []);
    }
}
