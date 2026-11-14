import { PrismaClient } from "@prisma/client";
import { cache } from "react";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

/** Carga em uso pela tela (a mais recente marcada como ativa). */
export const cargaAtiva = cache(async () =>
  prisma.carga.findFirst({ where: { ativa: true }, orderBy: { id: "desc" } }),
);
