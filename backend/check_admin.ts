
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for admin user...');

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { email: 'admin@trento.local' }
    });

    if (!user) {
        console.log('❌ User admin@trento.local NOT FOUND.');
        return;
    }

    console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        role: user.role,
        passwordHash: user.password.substring(0, 10) + '...'
    });

    // Verify password
    const isMatch = await bcrypt.compare('admin123', user.password);
    console.log('Password "admin123" match:', isMatch ? '✅ YES' : '❌ NO');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
