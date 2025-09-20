// File: app/api/assets/activities/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MaintenanceStatus } from "@prisma/client";

export async function GET() {
  try {
    const maintenances = await prisma.maintenance.findMany({
      include: { asset: true },
      orderBy: { scheduledDate: 'desc' }
    });
    const borrowingLogs = await prisma.assetLog.findMany({
      where: {
        activity: { in: ['Peminjaman', 'Pengembalian', 'Perubahan Status'] }
      },
      include: { asset: true },
      orderBy: { createdAt: 'desc' }
    });

    const maintenanceActivities = maintenances.map(m => ({
      id: `maint-${m.id}`,
      type: 'MAINTENANCE',
      assetName: m.asset.productName,
      description: m.description,
      status: m.status,
      date: m.scheduledDate || m.createdAt,
      asset: m.asset,
      // --- TAMBAHAN: Sertakan objek maintenance original ---
      originalMaintenance: m, 
    }));

    const borrowingActivities = borrowingLogs
      .filter(log => log.description.includes('Dipinjam oleh') || log.description.includes('dikembalikan'))
      .map(log => ({
        id: `log-${log.id}`,
        type: 'PEMINJAMAN',
        assetName: log.asset.productName,
        description: log.description,
        status: log.asset.status === 'DIPINJAM' ? 'DIPINJAM' : MaintenanceStatus.COMPLETED,
        date: log.createdAt,
        asset: log.asset,
        originalMaintenance: null, // Peminjaman tidak punya objek ini
    }));

    const allActivities = [...maintenanceActivities, ...borrowingActivities];
    allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(allActivities);
  } catch (error) {
    console.error("Gagal mengambil data aktivitas:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}