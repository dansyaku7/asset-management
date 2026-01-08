import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth-helper";
import { MaintenanceStatus } from "@prisma/client";

export async function GET() {
    // ... (Bagian GET lo biarin aja, udah oke)
    // Copy paste logic GET lo yang tadi disini
    try {
        const maintenances = await prisma.maintenance.findMany({
            include: {
                asset: {
                    select: {
                        id: true,
                        productName: true,
                        barcode: true,
                        branch: { select: { name: true } }
                    }
                },
                recordedBy: { select: { fullName: true } }
            },
            orderBy: { createdAt: 'desc' },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formattedMaintenances = maintenances.map(m => {
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
                description: m.description,
                status: effectiveStatus,
                cost: m.cost,
                notes: m.notes,
                scheduledDate: m.scheduledDate,
                completionDate: m.completionDate,
                recordedBy: m.recordedBy?.fullName || 'Sistem',
                createdAt: m.createdAt,
                asset: {
                    id: m.asset.id,
                    name: m.asset.productName,
                    barcode: m.asset.barcode,
                    branchName: m.asset.branch.name,
                },
                originalMaintenance: m,
            };
        });

        return NextResponse.json(formattedMaintenances);
    } catch (error) {
        console.error("Gagal mengambil data maintenance:", error);
        return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken || !decodedToken.userId) {
        return NextResponse.json({ message: "Login required" }, { status: 401 });
    }
    
    try {
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.userId },
            include: { role: true },
        });

        if (!user || !["SUPER_ADMIN", "ASET_MANAJEMEN"].includes(user.role.name)) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }
        
        const body = await req.json();
        const { assetId, description, scheduledDate, cost, notes } = body;

        if (!assetId || !description || !scheduledDate) {
            return NextResponse.json({ message: "Data tidak lengkap" }, { status: 400 });
        }

        // --- SPAM PROTECTION (ANTI DOUBLE SUBMIT) ---
        // Cek apakah ada record identik yang dibuat dalam 5 detik terakhir
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
            console.warn("Spam click detected, ignoring duplicate request.");
            // Kita return 200 aja dengan data duplikatnya biar frontend gak error, 
            // ATAU return 429 (Too Many Requests) kalau mau strict.
            // Gua saranin return data yang udah ada biar user ngerasa sukses tapi gak double.
            return NextResponse.json(duplicateCheck, { status: 200 });
        }
        // -------------------------------------------

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
    
            await tx.assetLog.create({
                data: {
                    assetId: maintenance.assetId,
                    recordedById: decodedToken.userId, 
                    activity: "Maintenance Dijadwalkan",
                    description: `Maintenance "${maintenance.description}" dijadwalkan.`,
                },
            });
            
            return maintenance;
        });

        return NextResponse.json(newMaintenance, { status: 201 });
    } catch (error) {
        console.error("Gagal post maintenance:", error);
        return NextResponse.json({ message: "Server Error" }, { status: 500 });
    }
}