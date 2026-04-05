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

const ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;
const ADMIN_NAME = 'Admin';
const ORG_NAME = 'ContentAI';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Error: INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD environment variables are missing.');
  console.log('   Please set these in your .env file or environment before running this script.');
  process.exit(1);
}

async function main() {
  console.log('🌱 Procesando usuario admin...');

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);
  const slug = ORG_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Asegurar la organización
    let org = await tx.organization.findUnique({ where: { slug } });
    if (!org) {
      org = await tx.organization.create({
        data: { name: ORG_NAME, slug },
      });
    }

    // 2. Crear o actualizar el usuario
    const user = await tx.user.upsert({
      where: { email: ADMIN_EMAIL! },
      update: {
        passwordHash,
      },
      create: {
        orgId: org.id,
        email: ADMIN_EMAIL!,
        passwordHash,
        name: ADMIN_NAME,
        role: 'OWNER',
      },
    });

    return { org, user };
  });

  console.log('✅ Usuario admin procesado:');
  console.log(`   Email:    ${result.user.email}`);
  console.log(`   Acción:   Actualizado/Creado con nueva contraseña.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
