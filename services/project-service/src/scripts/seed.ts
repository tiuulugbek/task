import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Starting project seed...');

  const workspaceResponse = await fetch(
    `${process.env.WORKSPACE_SERVICE_URL || 'http://workspace-service:3003'}/internal/workspaces/by-slug/acoustic`,
    {
      headers: {
        'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret',
      },
    }
  );

  if (!workspaceResponse.ok) {
    console.log('Workspace not found, skipping project seed');
    return;
  }

  const workspace = await workspaceResponse.json();
  const workspaceId = workspace.data.id;

  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      workspaceId,
      name: 'Sample Project',
      description: 'Welcome to Acoustic Task Manager!',
    },
  });

  const columns = [
    { name: 'To Do', order: 0 },
    { name: 'In Progress', order: 1 },
    { name: 'Review', order: 2 },
    { name: 'Done', order: 3 },
  ];

  for (const col of columns) {
    await prisma.boardColumn.upsert({
      where: { id: `col-${col.order}` },
      update: {},
      create: {
        id: `col-${col.order}`,
        projectId: project.id,
        name: col.name,
        order: col.order,
      },
    });
  }

  console.log('Project seed completed!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
