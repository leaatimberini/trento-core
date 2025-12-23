import { Module, forwardRef } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { PrismaService } from '../prisma.service';

import { CashShiftService } from './cash-shift.service';
import { CashShiftController } from './cash-shift.controller';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { PurchaseSavingsService } from './purchase-savings.service';
import { FinancialGuardService } from './financial-guard.service';

import { BotModule } from '../bot/bot.module';

@Module({
    imports: [forwardRef(() => BotModule)],
    providers: [FinanceService, PrismaService, CashShiftService, ReconciliationService, PurchaseSavingsService, FinancialGuardService],
    controllers: [FinanceController, CashShiftController, ReconciliationController],
    exports: [FinanceService, CashShiftService, ReconciliationService, PurchaseSavingsService, FinancialGuardService]
})
export class FinanceModule { }
