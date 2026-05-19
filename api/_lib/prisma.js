// Prisma client singleton — serverless cold start'larda yeni connection açma riskini azaltır
import { PrismaClient } from '@prisma/client';

const g = globalThis;
export const prisma = g.__prisma__ || new PrismaClient({ log: ['error'] });
if (process.env.NODE_ENV !== 'production') g.__prisma__ = prisma;
