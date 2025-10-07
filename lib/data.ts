// File: lib/data.ts

import prisma from './prisma';

// Tipe data untuk log yang akan kita kirim ke frontend
// Kita modifikasi sedikit agar TypeScript tahu ada data 'recordedBy'
export type AssetLogWithAsset = Awaited<ReturnType<typeof getLatestAssetLogs>>[0];

export const getLatestAssetLogs = async () => {
  try {
    const logs = await prisma.assetLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      // Properti 'take: 5' bisa ditambahkan lagi di sini jika hanya mau 5 log terbaru
      take: 5, 
      include: {
        asset: {
          select: {
            productName: true, // Ambil productName dari model Asset
          },
        },
        // --- INI TAMBAHANNYA ---
        // Kita ikut sertakan data user yang mencatat log
        recordedBy: {
          select: {
            // --- PERBAIKAN DI SINI ---
            fullName: true, // Diubah dari 'name' menjadi 'fullName' sesuai schema
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

