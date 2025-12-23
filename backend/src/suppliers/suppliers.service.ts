
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.supplier.findMany();
    }

    async create(data: any) {
        return this.prisma.supplier.create({ data });
    }

    async update(id: string, data: any) {
        return this.prisma.supplier.update({
            where: { id },
            data
        });
    }

    async remove(id: string) {
        return this.prisma.supplier.delete({ where: { id } });
    }
}
