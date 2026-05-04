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

    // 3. Crear cliente de prueba
    const client = await tx.client.upsert({
      where: { id: 'demo-client-id' }, // Stable ID for seeding
      update: {},
      create: {
        id: 'demo-client-id',
        orgId: org.id,
        name: 'Nike Argentina',
        industry: 'Deportes / Lifestyle',
        branding: {
          primaryColor: '#FF6600',
          toneOfVoice: 'Inspiracional, empoderador, activo y directo.',
          targetAudience: 'Atletas y jóvenes entusiastas del deporte en Argentina.',
        },
      },
    });

    // 4. Agregar notas al Brand Notebook
    const notebookCount = await tx.brandNotebookEntry.count({ where: { clientId: client.id } });
    if (notebookCount === 0) {
      await tx.brandNotebookEntry.createMany({
        data: [
          {
            clientId: client.id,
            orgId: org.id,
            title: 'Slogan Global',
            content: 'Just Do It. Siempre usar en mayúsculas al final de los captions.',
            category: 'GUIDELINE',
          },
          {
            clientId: client.id,
            orgId: org.id,
            title: 'Lanzamiento Air Max 2026',
            content: 'Enfoque en la tecnología de aire visible y materiales reciclados.',
            category: 'PRODUCT',
          },
        ],
      });
    }

    // 5. Crear una solicitud de contenido de prueba
    const request = await tx.contentRequest.create({
      data: {
        orgId: org.id,
        userId: user.id,
        clientId: client.id,
        brief: 'Lanzamiento de las nuevas Air Max para la temporada de invierno. Destacar comodidad y estilo urbano.',
        pieces: {
          create: [
            {
              orgId: org.id,
              clientId: client.id,
              type: 'POST',
              status: 'APPROVED',
              caption: 'El aire nunca se sintió tan ligero. Descubrí las nuevas Air Max Winter Edition. ❄️👟 #AirMax #Nike #JustDoIt',
              hook: 'El aire nunca se sintió tan ligero.',
              cta: 'Comprá ahora en el link de la bio.',
              scheduledAt: new Date(new Date().getTime() + 86400000), // Mañana
            },
            {
              orgId: org.id,
              clientId: client.id,
              type: 'STORY',
              status: 'DRAFT',
              caption: 'Coming soon... prepárate para el frío con lo último en tecnología Nike.',
            }
          ]
        }
      }
    });

    return { org, user, client, request };
  });

  console.log('✅ Entorno de prueba procesado:');
  console.log(`   Email:      ${result.user.email}`);
  console.log(`   Cliente:    ${result.client.name}`);
  console.log(`   Contenido:  ${result.request.pieces?.length || 2} piezas creadas.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
