// File: app/api/v1/assets/activities/route.ts
// Versi dengan logika untuk mencocokkan peminjaman dan pengembalian

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MaintenanceStatus } from "@prisma/client";

export async function GET() {
  try {
    const [maintenances, assetLogs] = await Promise.all([
      prisma.maintenance.findMany({
        include: {
          asset: {
            select: { productName: true, branch: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Ambil SEMUA log yang relevan, baik peminjaman maupun pengembalian
      prisma.assetLog.findMany({
          where: {
              activity: {
                  in: ["Aset Dipinjam (Antar Cabang)", "Aset Dikembalikan"]
              }
          },
          include: {
              asset: {
                  select: { productName: true, branch: { select: { name: true } } }
              }
          },
          orderBy: { createdAt: 'desc' }
      })
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maintenanceActivities = maintenances.map(m => {
        let effectiveStatus = m.status;
        if (m.status === MaintenanceStatus.SCHEDULED && m.scheduledDate) {
            const scheduledDate = new Date(m.scheduledDate);
            scheduledDate.setHours(0, 0, 0, 0);
            if (scheduledDate <= today) {
                effectiveStatus = MaintenanceStatus.IN_PROGRESS;
            }
        }
        return {
            id: m.id,
            type: 'MAINTENANCE' as const,
            assetName: m.asset.productName,
            branchName: m.asset.branch.name,
            description: m.description,
            status: effectiveStatus,
            date: m.scheduledDate,
            originalData: m,
        };
    });
    
    // --- LOGIKA BARU UNTUK MEMPROSES PEMINJAMAN & PENGEMBALIAN ---
    const returnedAssetIds = new Set(
        assetLogs.filter(log => log.activity === "Aset Dikembalikan").map(log => log.assetId)
    );

    const borrowActivities = assetLogs
        .filter(log => log.activity === "Aset Dipinjam (Antar Cabang)")
        .map(log => {
            const hasBeenReturned = returnedAssetIds.has(log.assetId);
            
            // Ekstrak tanggal kembali dari deskripsi
            const returnDateMatch = log.description.match(/Estimasi kembali: (.*)\./);
            // Konversi format tanggal '19 Oktober 2025' menjadi objek Date yang valid
            let returnDate: Date | null = null;
            if (returnDateMatch && returnDateMatch[1]) {
                const dateParts = returnDateMatch[1].split(' ');
                const day = dateParts[0];
                const month = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].indexOf(dateParts[1]);
                const year = dateParts[2];
                if (day && month > -1 && year) {
                    returnDate = new Date(`${year}-${month + 1}-${day}`);
                }
            }
            
            return {
                id: log.id,
                type: 'PEMINJAMAN' as const,
                assetName: log.asset.productName,
                // Saat dipinjam, branchName adalah cabang tujuan
                branchName: log.asset.branch.name,
                description: log.description,
                // Statusnya dinamis: jika sudah ada log 'Dikembalikan', ubah statusnya
                status: hasBeenReturned ? 'DIKEMBALIKAN' : 'DIPINJAM',
                date: returnDate || log.createdAt,
                originalData: log,
            }
        });

    // Gabungkan semua aktivitas dan urutkan
    const allActivities = [...maintenanceActivities, ...borrowActivities].sort(
        (a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()
    );

    return NextResponse.json(allActivities);

  } catch (error) {
    console.error("Gagal mengambil data aktivitas:", error);
    return NextResponse.json({ message: "Gagal mengambil data aktivitas" }, { status: 500 });
  }
}