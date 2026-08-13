import { PrismaClient, Role, LeadStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ELCHEENO CRM Database Seed...');

  // 1. Seed Admin User
  const adminEmail = 'admin@elcheeno.com';
  const rawPassword = '#Elcheeno123';
  const hashedPassword = bcrypt.hashSync(rawPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      isApproved: true,
    },
    create: {
      email: adminEmail,
      name: 'Admin ELCHEENO',
      password: hashedPassword,
      role: Role.ADMIN,
      isApproved: true,
    },
  });

  console.log('✅ Admin User Seeded:', adminUser.email);
  console.log('✨ Seed Completed (No dummy listings or dummy content created)!');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
