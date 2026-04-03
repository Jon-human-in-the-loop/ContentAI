/**
 * Seed script: crea el usuario administrador inicial.
 * Uso: npx ts-node prisma/seed-admin.ts
 *
 * Variables de entorno necesarias (mismas que el backend):
 * DATABASE_URL=...
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@contentai.app';
const ADMIN_PASSWORD = 'ContentAI2025!';
const ADMIN_NAME = 'Admin';
const ORG_NAME = 'ContentAI';

async function main() {
  console.log('🌱 Creando usuario admin...');

  // Verificar si ya existe
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`⚠️  El usuario ${ADMIN_EMAIL} ya existe. Nada que hacer.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const slug = ORG_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: ORG_NAME, slug },
    });
    const user = await tx.user.create({
      data: {
        orgId: org.id,
        email: ADMIN_EMAIL,
        passwordHash,
        name: ADMIN_NAME,
        role: 'OWNER',
      },
    });
    return { org, user };
  });

  console.log('✅ Usuario admin creado:');
  console.log(`   Email:    ${result.user.email}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Org:      ${result.org.name} (${result.org.id})`);
  console.log(`   Role:     ${result.user.role}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
