const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Creating Admin User...');
    const salt = await bcrypt.genSalt();
    const password = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@trento.local' },
        update: { password: password }, // Update password just in case
        create: {
            email: 'admin@trento.local',
            name: 'Super Admin',
            password: password,
            role: 'ADMIN'
        }
    });

    console.log('✅ Admin User Created/Updated:', admin.email);
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
