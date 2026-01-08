import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth-helper";
import { MaintenanceStatus } from "@prisma/client";

// ==================================================================================
// GET: Ambil Semua Data Maintenance
// ==================================================================================
export async function GET() {
  try {
    const maintenances = await prisma.maintenance.findMany({
      include: {
        asset: {
          select: {
            id: true,
            productName: true,
            barcode: true,
            branch: {
              select: { name: true }
            }
          }
        },
        recordedBy: {
          select: { fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    // Format data + logika status dinamis
    const formattedMaintenances = maintenances.map(m => {
        let effectiveStatus = m.status;
        
        // Logika: Kalau Scheduled tapi tanggal lewat -> In Progress
        if (m.status === MaintenanceStatus.SCHEDULED && m.scheduledDate) {
            const scheduledDate = new Date(m.scheduledDate);
            scheduledDate.setHours(0, 0, 0, 0);
            if (scheduledDate <= today) {
                effectiveStatus = MaintenanceStatus.IN_PROGRESS;
            }
        }

        return {
            id: m.id,
            description: m.description,
            status: effectiveStatus,
            cost: m.cost,
            notes: m.notes,
            scheduledDate: m.scheduledDate,
            completionDate: m.completionDate,
            recordedBy: m.recordedBy?.fullName || 'Sistem',
            createdAt: m.createdAt,
            // Data relasi flattened untuk frontend
            asset: {
                id: m.asset.id,
                name: m.asset.productName,
                barcode: m.asset.barcode,
                branchName: m.asset.branch.name,
            },
            // Objek original jika butuh edit
            originalMaintenance: m,
        };
    });

    return NextResponse.json(formattedMaintenances);

  } catch (error) {
    console.error("Gagal mengambil data maintenance:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

// ==================================================================================
// POST: Buat Jadwal Maintenance Baru (Dengan Anti-Spam / Double Submit)
// ==================================================================================
export async function POST(req: NextRequest) {
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
            return NextResponse.json({ message: "Akses ditolak: Anda tidak memiliki izin." }, { status: 403 });
        }
        
        const body = await req.json();
        const { assetId, description, scheduledDate, cost, notes } = body;

        // Validasi Input
        if (!assetId || !description || !scheduledDate) {
            return NextResponse.json({ message: "Aset, deskripsi, dan tanggal jadwal wajib diisi" }, { status: 400 });
        }

        // --- SPAM PROTECTION (ANTI DOUBLE SUBMIT) ---
        // Cek apakah ada record identik yang dibuat user ini dalam 5 detik terakhir
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        
        const duplicateCheck = await prisma.maintenance.findFirst({
            where: {
                assetId: assetId,
                description: description, // Cek deskripsi sama
                recordedById: decodedToken.userId, // Oleh user yang sama
                createdAt: {
                    gt: fiveSecondsAgo // Dibuat LEBIH BARU dari 5 detik lalu
                }
            }
        });

        if (duplicateCheck) {
            // Jika duplikat ditemukan, kita return data yang sudah ada (biar frontend sukses)
            // tapi kita skip proses pembuatan barunya.
            console.warn("Spam click detected on Maintenance POST. Returning existing record.");
            return NextResponse.json(duplicateCheck, { status: 200 });
        }
        // -------------------------------------------

        // Proses Create Data (Transaction)
        const newMaintenance = await prisma.$transaction(async (tx) => {
            const maintenance = await tx.maintenance.create({
              data: {
                assetId,
                description,
                scheduledDate: new Date(scheduledDate),
                cost: cost ? parseFloat(cost) : null,
                notes,
                recordedById: decodedToken.userId,
                status: MaintenanceStatus.SCHEDULED,
              },
              include: { asset: true },
            });
    
            // Log otomatis
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