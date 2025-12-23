
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductDimensionsController } from './product-dimensions.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [ProductsController, ProductDimensionsController],
    providers: [ProductsService, PrismaService],
    exports: [ProductsService]
})
export class ProductsModule { }
