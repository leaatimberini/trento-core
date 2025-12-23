
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

import { WarehouseType } from '@prisma/client';

@Injectable()
export class WarehouseService {
    constructor(private prisma: PrismaService) { }

    create(data: { name: string; address?: string; type?: string }) {
        return this.prisma.warehouse.create({
            data: {
                ...data,
                type: data.type as WarehouseType || 'DEPOT'
            }
        });
    }

    findAll() {
        return this.prisma.warehouse.findMany({
            orderBy: { createdAt: 'asc' }
        });
    }

    findOne(id: string) {
        return this.prisma.warehouse.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });
    }

    update(id: string, data: { name?: string; address?: string; isActive?: boolean }) {
        return this.prisma.warehouse.update({
            where: { id },
            data
        });
    }

    remove(id: string) {
        return this.prisma.warehouse.delete({
            where: { id }
        });
    }
}
