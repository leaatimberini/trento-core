
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ExpensesService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        return this.prisma.expense.create({
            data: {
                category: data.category,
                description: data.description,
                amount: data.amount,
                date: new Date(data.date),
                userId: data.userId || 'SYSTEM'
            }
        });
    }

    async findAll() {
        return this.prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });
    }

    async update(id: string, data: any) {
        return this.prisma.expense.update({
            where: { id },
            data: {
                category: data.category,
                description: data.description,
                amount: data.amount,
                date: data.date ? new Date(data.date) : undefined
            }
        });
    }

    async remove(id: string) {
        return this.prisma.expense.delete({
            where: { id }
        });
    }

    async getSummary(month?: number, year?: number) {
        let whereClause = {};

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            whereClause = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            };
        }

        const expenses = await this.prisma.expense.findMany({
            where: whereClause
        });

        const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Group by category
        const byCategory = expenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
            return acc;
        }, {});

        return { total, byCategory };
    }
}
