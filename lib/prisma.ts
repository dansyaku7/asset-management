// File: lib/prisma.ts

import { PrismaClient } from '@prisma/client';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    // Opsional: Baris ini akan menampilkan query SQL di terminal kamu,
    // sangat membantu untuk debugging. Bisa dihapus jika tidak perlu.
    log: ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;