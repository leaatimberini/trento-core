import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';

@Injectable()
export class WarehouseService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateWarehouseDto) {
        return this.prisma.warehouse.create({ data });
    }

    async findAll() {
        return this.prisma.warehouse.findMany();
    }

    async findOne(id: string) {
        return this.prisma.warehouse.findUnique({ where: { id } });
    }
}
