
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        try {
            return await this.prisma.customer.create({ data });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException('El email ya está registrado');
            }
            throw error;
        }
    }

    async update(id: string, data: any) {
        // Remove sensitive or immutable fields if necessary, handled by controller usually
        return this.prisma.customer.update({
            where: { id },
            data
        });
    }

    async findAll() {
        return this.prisma.customer.findMany({
            include: {
                priceList: true,
                loyalty: true,
                score: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.customer.findUnique({
            where: { id },
            include: { sales: true }
        });
    }

    async findByEmail(email: string) {
        return this.prisma.customer.findUnique({
            where: { email }
        });
    }

    async search(query: string) {
        return this.prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } }
                ]
            }
        });
    }
}
