import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertUser(params: {
  email?: string;
  phoneNumber?: string;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);

  if (params.email) {
    await prisma.user.upsert({
      where: { email: params.email },
      create: {
        email: params.email,
        phoneNumber: params.phoneNumber,
        passwordHash,
        role: params.role,
      },
      update: {
        phoneNumber: params.phoneNumber,
        passwordHash,
        role: params.role,
        isActive: true,
      },
    });
    return;
  }

  if (params.phoneNumber) {
    await prisma.user.upsert({
      where: { phoneNumber: params.phoneNumber },
      create: {
        email: params.email,
        phoneNumber: params.phoneNumber,
        passwordHash,
        role: params.role,
      },
      update: {
        email: params.email,
        passwordHash,
        role: params.role,
        isActive: true,
      },
    });
  }
}

async function main() {
  await upsertUser({
    email: 'admin@nexusflow.dev',
    password: 'admin123',
    role: UserRole.ADMIN,
  });

  await upsertUser({
    email: 'user@nexusflow.dev',
    phoneNumber: '+15555550123',
    password: 'user1234',
    role: UserRole.USER,
  });

  console.log('Seed completed: admin and user accounts are ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
