import { PrismaClient } from '@prisma/client';

// Deklarasikan 'prisma' di scope global untuk mencegah duplikasi saat hot-reload
declare global {
  var prisma: PrismaClient | undefined;
}

// Gunakan instance yang sudah ada, atau buat baru jika belum ada.
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
