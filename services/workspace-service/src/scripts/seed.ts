import { PrismaClient } from '@prisma/client';
import { WorkspaceRole } from '@acoustic/shared';

const prisma = new PrismaClient();

async function seed() {
  console.log('Starting seed...');

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'acoustic' },
    update: {},
    create: {
      name: 'Acoustic',
      slug: 'acoustic',
    },
  });

  console.log('Workspace created:', workspace.id);
  console.log('Seed completed!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
