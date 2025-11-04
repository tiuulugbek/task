#!/bin/bash
set -e

echo "🌱 Seeding database..."

cd "$(dirname "$0")/../.."

# Seed workspace
docker-compose -f infra/docker-compose.yml exec -T workspace-service node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  prisma.workspace.upsert({
    where: { slug: 'acoustic' },
    update: {},
    create: {
      name: 'Acoustic',
      slug: 'acoustic',
    },
  }).then(() => {
    console.log('Workspace seeded');
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
" || echo "Workspace seed skipped"

# Seed project with columns
docker-compose -f infra/docker-compose.yml exec -T project-service node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  fetch('http://workspace-service:3003/internal/workspaces/by-slug/acoustic', {
    headers: { 'x-internal-secret': process.env.INTERNAL_SECRET || 'internal-secret' },
  })
  .then(r => r.json())
  .then(ws => {
    return prisma.project.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        workspaceId: ws.data.id,
        name: 'Sample Project',
        description: 'Welcome to Acoustic Task Manager!',
      },
    });
  })
  .then(project => {
    const columns = [
      { name: 'To Do', order: 0 },
      { name: 'In Progress', order: 1 },
      { name: 'Review', order: 2 },
      { name: 'Done', order: 3 },
    ];
    
    return Promise.all(columns.map(col =>
      prisma.boardColumn.upsert({
        where: { id: \`col-\${col.order}\` },
        update: {},
        create: {
          id: \`col-\${col.order}\`,
          projectId: project.id,
          name: col.name,
          order: col.order,
        },
      })
    ));
  })
  .then(() => {
    console.log('Project seeded');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
" || echo "Project seed skipped"

echo "✅ Seeding completed!"
