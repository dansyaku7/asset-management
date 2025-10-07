// File: app/api/assets/maintenance/[id]/route.ts

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";
import { verifyAuth } from "@/lib/auth-helper";

// --- FUNGSI PUT DIPERBAIKI DENGAN PENGECEKAN ROLE ---
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Anda harus login terlebih dahulu" }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    }

    const allowedRoles = ["SUPER_ADMIN", "ASET_MANAJEMEN"];
    if (!allowedRoles.includes(user.role.name)) {
      return NextResponse.json({ message: "Akses ditolak: Anda tidak memiliki izin untuk mengubah data." }, { status: 403 });
    }
    
    // --- Lanjutkan proses jika diizinkan ---
    const maintenanceId = params.id;
    const body = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      const currentMaintenance = await tx.maintenance.findUnique({
        where: { id: maintenanceId },
      });

      if (!currentMaintenance) {
        throw new Error("Jadwal maintenance tidak ditemukan.");
      }

      if (body.status && (body.status === MaintenanceStatus.COMPLETED || body.status === MaintenanceStatus.CANCELLED)) {
        let assetNewStatus = body.status === MaintenanceStatus.COMPLETED ? AssetStatus.BAIK : AssetStatus.RUSAK;
        let logDescription = body.status === MaintenanceStatus.COMPLETED
          ? `Maintenance "${currentMaintenance.description}" telah selesai. Status aset kembali Baik.`
          : `Maintenance "${currentMaintenance.description}" gagal/dibatalkan. Status aset menjadi Rusak.`;

        await tx.asset.update({
          where: { id: currentMaintenance.assetId },
          data: { status: assetNewStatus },
        });

        await tx.assetLog.create({
          data: {
            assetId: currentMaintenance.assetId,
            recordedById: decodedToken.userId,
            activity: "Hasil Maintenance",
            description: logDescription,
          },
        });
      }
      
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

// --- FUNGSI DELETE DIPERBAIKI DENGAN PENGECEKAN ROLE ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Anda harus login terlebih dahulu" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    }

    const allowedRoles = ["SUPER_ADMIN", "ASET_MANAJEMEN"];
    if (!allowedRoles.includes(user.role.name)) {
      return NextResponse.json({ message: "Akses ditolak: Anda tidak memiliki izin untuk menghapus data." }, { status: 403 });
    }

    const id = params.id;
    await prisma.maintenance.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Data maintenance berhasil dihapus" });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menghapus data maintenance" }, { status: 500 });
  }
}

