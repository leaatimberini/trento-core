const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
    console.log('--- Checking for admin@trento.com ---');

    const user = await prisma.user.findUnique({ where: { email: 'admin@trento.com' } });
    console.log(`User Table (Admin): ${user ? 'FOUND' : 'NOT FOUND'}`);

    const customer = await prisma.customer.findUnique({ where: { email: 'admin@trento.com' } });
    console.log(`Customer Table: ${customer ? 'FOUND' : 'NOT FOUND'}`);
}

checkUser()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
