// File: lib/data.ts

import prisma from './prisma'; // Pastikan kamu punya file prisma client di lib/prisma.ts

// Tipe data untuk log yang akan kita kirim ke frontend
export type AssetLogWithAsset = Awaited<ReturnType<typeof getLatestAssetLogs>>[0];

export const getLatestAssetLogs = async () => {
  try {
    const logs = await prisma.assetLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      // --- PERUBAHAN DI SINI ---
      // Properti 'take: 5' dihapus agar mengambil SEMUA log
      include: {
        asset: {
          select: {
            productName: true, // Ambil productName dari model Asset
          },
        },
      },
    });
    return logs;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Gagal mengambil data jurnal terakhir.');
  }
};
