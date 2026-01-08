import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";
import { verifyAuth } from "@/lib/auth-helper";

// FIX TIPE DATA: Params sekarang Promise di Next.js 15+
type Props = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, props: Props) {
  // 1. AWAIT PARAMS DULU! Jangan langsung akses.
  const params = await props.params;
  const maintenanceId = params.id;

  if (!maintenanceId) {
    return NextResponse.json({ message: "ID tidak valid" }, { status: 400 });
  }

  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const userId = Number(decodedToken.userId);
    if (isNaN(userId)) return NextResponse.json({ message: "Token Invalid" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });

    const allowedRoles = ["SUPER_ADMIN", "ASET_MANAJEMEN"];
    if (!allowedRoles.includes(user.role.name)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    
    const body = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      // Cek eksistensi data dulu
      const currentMaintenance = await tx.maintenance.findUnique({
        where: { id: maintenanceId }, // Sekarang maintenanceId udah pasti string, bukan undefined
      });

      if (!currentMaintenance) {
        throw new Error("Jadwal maintenance tidak ditemukan.");
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

      // Logic update status asset (Logic lo udah bener disini)
      if (body.status && body.status !== currentMaintenance.status && (body.status === MaintenanceStatus.COMPLETED || body.status === MaintenanceStatus.CANCELLED)) {
        let assetNewStatus = body.status === MaintenanceStatus.COMPLETED ? AssetStatus.BAIK : AssetStatus.RUSAK;
        let logDescription = body.status === MaintenanceStatus.COMPLETED
          ? `Maintenance "${currentMaintenance.description}" telah selesai. Status aset kembali Baik.`
          : `Maintenance "${currentMaintenance.description}" dibatalkan. Status aset diubah menjadi Rusak.`;

        await tx.asset.update({
          where: { id: currentMaintenance.assetId },
          data: { status: assetNewStatus },
        });

        await tx.assetLog.create({
          data: {
            assetId: currentMaintenance.assetId,
            recordedById: userId,
            activity: "Hasil Maintenance",
            description: logDescription,
          },
        });
      }

      return updatedMaintenance;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Gagal update:", error);
    // Return error message yang bersih biar frontend tau
    return NextResponse.json({ message: error.message || "Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: Props) {
  // FIX SAMA DI SINI: Await params
  const params = await props.params;
  const id = params.id;

  const decodedToken = await verifyAuth(req);
  if (!decodedToken || !decodedToken.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = Number(decodedToken.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !["SUPER_ADMIN", "ASET_MANAJEMEN"].includes(user.role.name)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.maintenance.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Berhasil dihapus" });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menghapus" }, { status: 500 });
  }
}