import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/**
 * Script de Seed — Datos iniciales obligatorios del sistema.
 *
 * Pobla las tablas de catálogo que deben existir ANTES de que cualquier
 * usuario pueda registrarse. Usa `upsert` para ser idempotente:
 * se puede ejecutar varias veces sin duplicar datos.
 *
 * Ejecución: npx ts-node prisma/seed.ts
 */

const pool = new Pool({ connectionString: process.env.SUPABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando seed de la base de datos...\n');

  // ── Roles del sistema ────────────────────────────────────────────────────────
  const roles = [
    { nom: 'Alumno',       desc: 'Estudiante participante en el proyecto' },
    { nom: 'Docente',      desc: 'Profesor supervisor del proyecto' },
    { nom: 'Scrum Master', desc: 'Líder del equipo de desarrollo Scrum' },
  ];

  for (const rol of roles) {
    const created = await prisma.rolUsuario.upsert({
      where:  { rolUsuNom: rol.nom },
      update: { rolUsuDesc: rol.desc },   // actualiza descripción si ya existe
      create: { rolUsuNom: rol.nom, rolUsuDesc: rol.desc },
    });
    console.log(`  Rol "${created.rolUsuNom}" creado → ID: ${created.rolUsuId}`);
  }

  // ── Roles de equipo (si aplica) ──────────────────────────────────────────────
  const rolesEquipo = [
    { nom: 'Scrum Master', desc: 'Líder del sprint en el equipo' },
    { nom: 'Developer',    desc: 'Desarrollador del equipo' },
    { nom: 'QA',           desc: 'Aseguramiento de calidad' },
  ];

  console.log('\n  Roles de equipo:');
  for (const rol of rolesEquipo) {
    const created = await prisma.rolEquipo.upsert({
      where:  { rolEqNom: rol.nom },
      update: { rolEqDesc: rol.desc },
      create: { rolEqNom: rol.nom, rolEqDesc: rol.desc },
    });
    console.log(`  Rol equipo "${created.rolEqNom}" creado → ID: ${created.rolEqId}`);
  }

  console.log('\nSeed completado exitosamente.');
  console.log('\nUsa estos IDs en POST /auth/register:');
  console.log('   rolId: 1 → Alumno');
  console.log('   rolId: 2 → Docente');
  console.log('   rolId: 3 → Scrum Master');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
