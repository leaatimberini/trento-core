import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { SalesModule } from './sales/sales.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { FinanceModule } from './finance/finance.module';
import { AuthModule } from './auth/auth.module';
import { CustomerAuthModule } from './auth/customer-auth.module';
import { UsersModule } from './users/users.module';
import { PrismaService } from './prisma.service';

import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';

import { ReportsModule } from './reports/reports.module';
import { CustomersModule } from './customers/customers.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AuditModule } from './audit/audit.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { NotificationsModule } from './notifications/notifications.module';
import { LogisticsModule } from './logistics/logistics.module';
import { IntegrationModule } from './integrations/ecommerce/integration.module';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AuditInterceptor } from './audit/audit.interceptor';

import { AiModule } from './ai/ai.module';

import { WarehouseModule } from './warehouse/warehouse.module';
import { PackagingModule } from './packaging/packaging.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MarketingModule } from './marketing/marketing.module';
import { OrdersModule } from './orders/orders.module';
import { PricingModule } from './pricing/pricing.module';
import { FiscalModule } from './fiscal/fiscal.module';
import { RemitModule } from './remit/remit.module';
import { CrmModule } from './crm/crm.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AiAnalyticsModule } from './ai-analytics/ai-analytics.module';
import { BlogModule } from './blog/blog.module';
import { LogisticsAdvancedModule } from './logistics/logistics-advanced.module';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { LoggingMiddleware, RequestIdMiddleware, MetricsMiddleware } from './middleware/logging.middleware';
import { UploadsModule } from './uploads/uploads.module';
import { CouponsModule } from './coupons/coupons.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { BotModule } from './bot/bot.module';
import { WholesaleModule } from './wholesale/wholesale.module';

@Module({
    imports: [
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100, // Increased rate limit
        }]),
        SalesModule, ProductsModule, InventoryModule, FinanceModule, AuthModule, CustomerAuthModule, UsersModule, SuppliersModule, PurchaseOrdersModule, ReportsModule, CustomersModule, ExpensesModule, AuditModule, NotificationsModule, LogisticsModule, IntegrationModule, AiModule, WarehouseModule, PackagingModule,
        IntegrationsModule, MarketingModule, OrdersModule, PricingModule, FiscalModule, RemitModule, CrmModule, WhatsappModule, AiAnalyticsModule, BlogModule, LogisticsAdvancedModule,
        UploadsModule,
        CouponsModule,
        BotModule,
        WholesaleModule,
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/api/uploads',
        }),
    ],
    controllers: [AppController, HealthController, MetricsController],
    providers: [
        PrismaService,
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditInterceptor,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    exports: [PrismaService]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestIdMiddleware, LoggingMiddleware, MetricsMiddleware)
            .forRoutes('*');
    }
}
