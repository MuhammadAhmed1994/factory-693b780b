import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const fixtureAccounts = [
  {
    email: 'member@example.test',
    password: 'MemberFixturePass123!',
    role: UserRole.MEMBER,
  },
  {
    email: 'lead@example.test',
    password: 'LeadFixturePass123!',
    role: UserRole.LEAD,
  },
] as const;

async function seed(): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Fixture accounts must not be seeded in production.');
    }

    for (const fixture of fixtureAccounts) {
      const passwordHash = await bcrypt.hash(fixture.password, 12);

      await prisma.user.upsert({
        where: { email: fixture.email },
        create: {
          email: fixture.email,
          passwordHash,
          role: fixture.role,
        },
        update: {
          passwordHash,
          role: fixture.role,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((error: unknown) => {
  console.error('Unable to seed fixture accounts:', error);
  process.exitCode = 1;
});
