import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Products
    const coca = await prisma.product.upsert({
        where: { sku: 'COCA-1.5' },
        update: {},
        create: {
            sku: 'COCA-1.5',
            name: 'Coca Cola 1.5L',
            basePrice: 1500.00,
            category: 'Gaseosas'
        },
    });

    const fernet = await prisma.product.upsert({
        where: { sku: 'FERNET-750' },
        update: {},
        create: {
            sku: 'FERNET-750',
            name: 'Fernet Branca 750ml',
            basePrice: 8500.00,
            category: 'Alcohol'
        },
    });

    // User
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@trento.local' },
        update: {},
        create: {
            email: 'admin@trento.local',
            name: 'Super Admin',
            password: password,
            role: 'ADMIN'
        }
    });

    console.log({ coca, fernet, admin });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
