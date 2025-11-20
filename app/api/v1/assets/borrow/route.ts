// File: app/api/v1/assets/borrow/route.ts
// Versi dengan logika peminjaman antar cabang

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { verifyAuth } from "@/lib/auth-helper";

export async function POST(req: NextRequest) {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken || !decodedToken.userId) {
        return NextResponse.json({ message: "Otentikasi gagal, silakan login kembali." }, { status: 401 });
    }

    try {
        const userId = Number(decodedToken.userId);
        const body = await req.json();
        // Tambahkan destinationBranchId dari body
        const { assetId, picName, picContact, reason, returnDate, giverName, destinationBranchId } = body;

        if (!assetId || !picName || !reason || !returnDate || !giverName || !destinationBranchId) {
            return NextResponse.json({ message: "Semua field, termasuk cabang tujuan, wajib diisi." }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const [assetToBorrow, destinationBranch] = await Promise.all([
                tx.asset.findUnique({
                    where: { id: assetId },
                    include: { branch: true } // Ambil info cabang asal
                }),
                tx.branch.findUnique({
                    where: { id: Number(destinationBranchId) }
                })
            ]);

            if (!assetToBorrow) throw new Error("Aset tidak ditemukan.");
            if (!destinationBranch) throw new Error("Cabang tujuan tidak ditemukan.");
            if (assetToBorrow.status !== AssetStatus.BAIK) {
                throw new Error(`Aset tidak dapat dipinjam karena statusnya saat ini: ${assetToBorrow.status}`);
            }

            // Update status, PIC, dan LOKASI (branchId) aset
            const updatedAsset = await tx.asset.update({
                where: { id: assetId },
                data: {
                    status: AssetStatus.DIPINJAM,
                    picName: picName,
                    picContact: picContact,
                    branchId: Number(destinationBranchId), // Pindahkan aset ke cabang tujuan
                },
            });

            // Buat log yang lebih deskriptif
            const formattedReturnDate = new Date(returnDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const description = `Dipinjam oleh ${picName} untuk cabang ${destinationBranch.name} dari cabang asal ${assetToBorrow.branch.name}. Diserahkan oleh ${giverName}. Alasan: ${reason}. Estimasi kembali: ${formattedReturnDate}.`;

            await tx.assetLog.create({
                data: {
                    assetId: assetId,
                    recordedById: userId,
                    activity: "Aset Dipinjam (Antar Cabang)",
                    description: description,
                },
            });

            return updatedAsset;
        });

        return NextResponse.json(result, { status: 200 });

    } catch (error: any) {
        console.error("Gagal memproses peminjaman:", error);
        return NextResponse.json({ message: error.message || "Terjadi kesalahan pada server." }, { status: 500 });
    }
}

