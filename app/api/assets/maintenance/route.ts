// app/api/assets/maintenance/route.ts

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { MaintenanceStatus } from "@prisma/client";
import { verifyAuth } from "@/lib/auth-helper";

// Fungsi GET tidak diubah
export async function GET() {
  // ... (Tidak ada perubahan di fungsi GET, biarkan seperti semula)
  try {
    const maintenances = await prisma.maintenance.findMany({
      include: {
        asset: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const smartMaintenances = maintenances.map(maint => {
        let effectiveStatus = maint.status;
        if (maint.status === MaintenanceStatus.SCHEDULED && maint.scheduledDate) {
            const scheduledDate = new Date(maint.scheduledDate);
            scheduledDate.setHours(0, 0, 0, 0);
            if (scheduledDate <= today) {
                effectiveStatus = MaintenanceStatus.IN_PROGRESS;
            }
        }
        return {
            ...maint,
            status: effectiveStatus,
        };
    });
    
    return NextResponse.json(smartMaintenances);
  } catch (error) {
    return NextResponse.json({ message: "Gagal mengambil data maintenance" }, { status: 500 });
  }
}

// --- FUNGSI POST DIPERBAIKI TOTAL ---
export async function POST(req: NextRequest) {
  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Anda harus login terlebih dahulu" }, { status: 401 });
  }
  
  try {
    // 1. Ambil data user beserta rolenya
    const user = await prisma.user.findUnique({
        where: { id: decodedToken.userId },
        include: { role: true },
    });

    if (!user) {
        return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    }

    // 2. Definisikan role apa saja yang boleh melakukan aksi ini
    const allowedRoles = ["SUPER_ADMIN", "ASET_MANAJEMEN"];

    // 3. Cek apakah role user saat ini termasuk dalam daftar yang diizinkan
    if (!allowedRoles.includes(user.role.name)) {
        return NextResponse.json({ message: "Akses ditolak: Anda tidak memiliki izin untuk menambah jadwal." }, { status: 403 });
    }
    
    // --- Jika lolos pengecekan, baru lanjutkan ---
    const body = await req.json();
    const { assetId, description, scheduledDate, cost, notes } = body;

    if (!assetId || !description) {
      return NextResponse.json({ message: "Aset dan deskripsi wajib diisi" }, { status: 400 });
    }

    const newMaintenance = await prisma.$transaction(async (tx) => {
        const maintenance = await tx.maintenance.create({
          data: {
            assetId,
            description,
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
            cost: cost ? parseFloat(cost) : null,
            notes,
            recordedById: decodedToken.userId,
          },
          include: { asset: true },
        });

        await tx.assetLog.create({
            data: {
                assetId: maintenance.assetId,
                recordedById: decodedToken.userId, 
                activity: "Maintenance Dijadwalkan",
                description: `Maintenance "${maintenance.description}" untuk aset "${maintenance.asset.productName}" telah dijadwalkan.`,
            },
        });
        
        return maintenance;
    });

    return NextResponse.json(newMaintenance, { status: 201 });
  } catch (error) {
    console.error("Gagal membuat jadwal maintenance:", error);
    return NextResponse.json({ message: "Gagal membuat jadwal maintenance" }, { status: 500 });
  }
}

