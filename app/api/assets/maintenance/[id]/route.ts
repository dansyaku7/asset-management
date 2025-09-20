// File: app/api/assets/maintenance/[id]/route.ts

import { NextResponse } from "next/server";
// --- PERUBAHAN 1: Gunakan prisma client dari lib dan import Status ---
import prisma from "@/lib/prisma";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";

// --- PERUBAHAN 2: Fungsi PUT dirombak total menjadi lebih pintar ---
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const maintenanceId = params.id;
    const body = await req.json();

    // Menggunakan transaksi untuk keamanan data
    const result = await prisma.$transaction(async (tx) => {
      // Cek dulu maintenance yang mau diupdate
      const currentMaintenance = await tx.maintenance.findUnique({
        where: { id: maintenanceId },
      });

      if (!currentMaintenance) {
        throw new Error("Jadwal maintenance tidak ditemukan.");
      }

      // Jika body berisi status 'COMPLETED' atau 'CANCELLED' (dari tombol Selesai/Gagal)
      if (body.status && (body.status === MaintenanceStatus.COMPLETED || body.status === MaintenanceStatus.CANCELLED)) {
        
        let assetNewStatus: AssetStatus;
        let logDescription = "";

        // Tentukan status aset dan deskripsi log
        if (body.status === MaintenanceStatus.COMPLETED) {
          assetNewStatus = AssetStatus.BAIK;
          logDescription = `Maintenance "${currentMaintenance.description}" telah selesai. Status aset kembali Baik.`;
        } else { // CANCELLED (Gagal)
          assetNewStatus = AssetStatus.RUSAK;
          logDescription = `Maintenance "${currentMaintenance.description}" gagal/dibatalkan. Status aset menjadi Rusak.`;
        }

        // Update status asetnya
        await tx.asset.update({
          where: { id: currentMaintenance.assetId },
          data: { status: assetNewStatus },
        });

        // Buat log untuk aktivitas ini
        await tx.assetLog.create({
          data: {
            assetId: currentMaintenance.assetId,
            activity: "Hasil Maintenance",
            description: logDescription,
          },
        });
      }
      
      // Update data maintenance dengan data dari body (untuk edit biasa atau update status)
      const updatedMaintenance = await tx.maintenance.update({
        where: { id: maintenanceId },
        data: {
            description: body.description,
            status: body.status,
            cost: body.cost ? parseFloat(body.cost) : undefined,
            notes: body.notes,
            scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
            completionDate: body.completionDate ? new Date(body.completionDate) : (body.status === 'COMPLETED' || body.status === 'CANCELLED' ? new Date() : undefined),
        },
      });

      return updatedMaintenance;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Gagal memperbarui maintenance:", error);
    return NextResponse.json({ message: error.message || "Gagal memperbarui data" }, { status: 500 });
  }
}


// --- PERUBAHAN 3: Fungsi DELETE juga menggunakan import prisma ---
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await prisma.maintenance.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Data maintenance berhasil dihapus" });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menghapus data maintenance" }, { status: 500 });
  }
}