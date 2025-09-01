// app/api/assets/maintenance/route.ts

import { NextResponse } from "next/server";
import { PrismaClient, MaintenanceStatus } from "@prisma/client"; // Import MaintenanceStatus

const prisma = new PrismaClient();

// GET: Mengambil semua jadwal maintenance
export async function GET() {
  try {
    const maintenances = await prisma.maintenance.findMany({
      include: {
        asset: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // --- LOGIKA BARU DI SINI ---
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Atur ke awal hari untuk perbandingan

    const smartMaintenances = maintenances.map(maint => {
        let effectiveStatus = maint.status;

        // Jika statusnya SCHEDULED dan tanggalnya adalah hari ini atau sudah lewat,
        // maka tampilkan sebagai IN_PROGRESS.
        if (maint.status === MaintenanceStatus.SCHEDULED && maint.scheduledDate) {
            const scheduledDate = new Date(maint.scheduledDate);
            scheduledDate.setHours(0, 0, 0, 0);
            if (scheduledDate <= today) {
                effectiveStatus = MaintenanceStatus.IN_PROGRESS;
            }
        }

        return {
            ...maint,
            status: effectiveStatus, // Kirim status yang sudah "pintar" ke frontend
        };
    });
    // --- AKHIR LOGIKA BARU ---

    return NextResponse.json(smartMaintenances);
  } catch (error) {
    return NextResponse.json({ message: "Gagal mengambil data maintenance" }, { status: 500 });
  }
}

// POST: Membuat jadwal maintenance baru (Tidak berubah)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assetId, description, scheduledDate, cost, notes } = body;

    if (!assetId || !description) {
      return NextResponse.json({ message: "Aset dan deskripsi wajib diisi" }, { status: 400 });
    }

    const newMaintenance = await prisma.maintenance.create({
      data: {
        assetId,
        description,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        cost: cost ? parseFloat(cost) : null,
        notes,
      },
    });
    return NextResponse.json(newMaintenance, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal membuat jadwal maintenance" }, { status: 500 });
  }
}