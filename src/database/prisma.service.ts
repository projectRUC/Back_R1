import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/**
 * PrismaService — Integración de Prisma v7 con NestJS.
 *
 * Prisma v7 eliminó el engine binario en Rust y ahora requiere un "driver adapter"
 * explícito para conectarse a la base de datos.
 *
 * Patrón utilizado:
 *   pg.Pool  →  PrismaPg adapter  →  PrismaClient
 *
 * La URL de conexión (SUPABASE_URL) se lee del entorno en tiempo de ejecución.
 * Se conecta al iniciar el módulo NestJS y desconecta al destruirlo,
 * evitando fugas de conexiones de base de datos.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Crear el pool de conexiones de PostgreSQL con la URL de Supabase
    const pool = new Pool({
      connectionString: process.env.SUPABASE_URL,
    });

    // El adapter PrismaPg conecta el pool de pg con el cliente de Prisma v7
    const adapter = new PrismaPg(pool);

    // Pasar el adapter al constructor de PrismaClient (obligatorio en Prisma v7)
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
